import { Subject } from 'rxjs';
import { StreamCompiler } from './compiler.service.js';
import { Rule } from '../models/rule.model.js';
import { Alert } from '../models/alert.model.js';
import { Device } from '../models/device.model.js';
import { broadcastAlert } from '../sockets/socketManager.js';

class RuleEngineService {
  constructor() {
    this.telemetrySubject$ = new Subject();
    this.activeSubscriptions = new Map(); // ruleId -> RxJS Subscription
    this.activeThresholdRules = [];
    this.activeAbnormalTracker = new Map(); // `${ruleId}_${deviceId}` -> alertId
    this.isInitialized = false;
  }

  /**
   * Initializes the engine by loading all active rules from DB
   */
  async init() {
    console.log('[RuleEngine] Initializing rules from database...');
    try {
      await this.loadThresholdRules();

      const activeRules = await Rule.find({ active: true, 'graph.nodes.0': { $exists: true } });
      for (const rule of activeRules) {
        try {
          this.startRule(rule);
        } catch (err) {
          console.error(`[RuleEngine] Failed to start rule ${rule.name} (${rule._id}):`, err.message);
        }
      }
      this.isInitialized = true;
      console.log(`[RuleEngine] Initialized with ${this.activeSubscriptions.size} active graph pipelines and ${this.activeThresholdRules.length} threshold rules.`);
    } catch (error) {
      console.error('[RuleEngine] Initialization error:', error.message);
    }
  }

  /**
   * Loads all active threshold rules into memory cache
   */
  async loadThresholdRules() {
    try {
      this.activeThresholdRules = await Rule.find({
        active: true,
        $or: [
          { ruleType: 'threshold' },
          { metric: { $exists: true, $ne: null } }
        ]
      }).lean();
    } catch (err) {
      console.error('[RuleEngine] Error loading threshold rules:', err.message);
    }
  }

  /**
   * Clears an alert tracker key when an alert is resolved
   */
  clearAlertTracker(ruleId, deviceId) {
    if (!ruleId || !deviceId) return;
    const key = `${ruleId.toString()}_${deviceId.toString().toUpperCase()}`;
    this.activeAbnormalTracker.delete(key);
  }

  /**
   * Feeds ingested telemetry into both the graph pipeline and threshold rules
   */
  feedTelemetry(telemetry) {
    if (!telemetry) return;
    this.telemetrySubject$.next(telemetry);
    this.evaluateThresholdRules(telemetry).catch(err => {
      console.error('[RuleEngine] Error evaluating threshold rules:', err.message);
    });
  }

  /**
   * Evaluates incoming telemetry against all enabled threshold rules
   */
  async evaluateThresholdRules(telemetry) {
    if (!telemetry || !this.activeThresholdRules || this.activeThresholdRules.length === 0) return;
    const targetDeviceId = String(telemetry.metadata?.deviceId || telemetry.deviceId || '').trim().toUpperCase();
    if (!targetDeviceId) return;

    for (const rule of this.activeThresholdRules) {
      // Check device scope
      const ruleDev = String(rule.deviceId || 'ALL').trim().toUpperCase();
      if (ruleDev !== 'ALL' && ruleDev !== targetDeviceId) {
        continue;
      }

      // Check if metric exists on telemetry payload
      const metricKey = rule.metric;
      if (!metricKey || telemetry[metricKey] === undefined || typeof telemetry[metricKey] !== 'number' || isNaN(telemetry[metricKey])) {
        continue;
      }

      const val = Number(telemetry[metricKey]);
      const op = String(rule.operator || '>').toLowerCase();
      let conditionMet = false;

      if (op === '>' || op === 'greater than') {
        conditionMet = val > Number(rule.threshold);
      } else if (op === '<' || op === 'less than') {
        conditionMet = val < Number(rule.threshold);
      } else if (op === '==' || op === 'equal to') {
        conditionMet = Math.abs(val - Number(rule.threshold)) < 0.0001;
      } else if (op === 'between') {
        const min = Number(rule.minThreshold);
        const max = Number(rule.maxThreshold);
        conditionMet = val >= min && val <= max;
      }

      const dedupeKey = `${rule._id.toString()}_${targetDeviceId}`;

      if (conditionMet) {
        // Continuous abnormal reading: check if active or acknowledged alert already exists
        const trackerAlertId = this.activeAbnormalTracker.get(dedupeKey);
        if (trackerAlertId) {
          // Already tracking an ongoing alert for this breach!
          Alert.findByIdAndUpdate(trackerAlertId, {
            $inc: { consecutiveBreaches: 1 },
            reading: val
          }).exec().catch(() => {});
          continue;
        }

        // Also check DB for un-resolved alerts (e.g. from previous run)
        const existingUnresolved = await Alert.findOne({
          ruleId: rule._id,
          deviceId: targetDeviceId,
          status: { $in: ['active', 'acknowledged'] }
        });

        if (existingUnresolved) {
          this.activeAbnormalTracker.set(dedupeKey, existingUnresolved._id.toString());
          Alert.findByIdAndUpdate(existingUnresolved._id, {
            $inc: { consecutiveBreaches: 1 },
            reading: val
          }).exec().catch(() => {});
          continue;
        }

        // No active alert exists! Create a new alert
        let deviceName = targetDeviceId;
        try {
          const dev = await Device.findOne({ deviceId: targetDeviceId }).lean();
          if (dev && dev.name) deviceName = dev.name;
        } catch (e) {}

        const thresholdDesc = op === 'between'
          ? `Between ${rule.minThreshold} and ${rule.maxThreshold}`
          : `${rule.operator || '>'} ${rule.threshold}`;

        const alertTitle = `Threshold Breached: ${rule.name}`;
        const alertMessage = `Device ${deviceName} (${targetDeviceId}) reported ${metricKey} = ${val}, exceeding threshold condition (${thresholdDesc}).`;

        try {
          const newAlert = await Alert.create({
            title: alertTitle,
            ruleId: rule._id,
            ruleName: rule.name,
            deviceId: targetDeviceId,
            deviceName,
            severity: rule.severity || (val > 100 ? 'critical' : 'warning'),
            status: 'active',
            message: alertMessage,
            metric: metricKey,
            reading: val,
            threshold: thresholdDesc,
            payload: {
              metric: metricKey,
              value: val,
              threshold: rule.threshold,
              minThreshold: rule.minThreshold,
              maxThreshold: rule.maxThreshold,
              operator: rule.operator
            },
            consecutiveBreaches: 1,
            acknowledged: false
          });

          this.activeAbnormalTracker.set(dedupeKey, newAlert._id.toString());

          // Broadcast new alert to connected clients
          const alertObj = newAlert.toObject();
          broadcastAlert(alertObj);

          // Update rule metrics
          Rule.findByIdAndUpdate(rule._id, {
            $inc: { 'metrics.totalTriggers': 1, 'metrics.totalEvaluations': 1 },
            'metrics.lastTriggeredAt': new Date(),
            'metrics.lastEvaluatedAt': new Date()
          }).exec().catch(() => {});
        } catch (createErr) {
          console.error('[RuleEngine] Failed to create alert:', createErr.message);
        }
      } else {
        // Condition is normal!
        // Clear from active tracker so if it goes abnormal again, a new alert is generated
        if (this.activeAbnormalTracker.has(dedupeKey)) {
          this.activeAbnormalTracker.delete(dedupeKey);
        }
        Rule.findByIdAndUpdate(rule._id, {
          $inc: { 'metrics.totalEvaluations': 1 },
          'metrics.lastEvaluatedAt': new Date()
        }).exec().catch(() => {});
      }
    }
  }

  /**
   * Starts an individual rule pipeline
   */
  startRule(rule) {
    const ruleId = rule._id.toString();

    // Stop existing subscription if running
    this.stopRule(ruleId);

    const validation = StreamCompiler.validateGraph(rule.graph);
    if (!validation.valid) {
      console.warn(`[RuleEngine] Rule "${rule.name}" has invalid graph structure: ${validation.errors.join(', ')}`);
      return false;
    }

    try {
      const subscription = StreamCompiler.compileGraph(rule, this.telemetrySubject$);
      this.activeSubscriptions.set(ruleId, subscription);
      console.log(`[RuleEngine] Rule "${rule.name}" (${ruleId}) compiled & started successfully.`);
      return true;
    } catch (err) {
      console.error(`[RuleEngine] Compilation failed for rule "${rule.name}":`, err.message);
      return false;
    }
  }

  /**
   * Stops an individual rule pipeline
   */
  stopRule(ruleId) {
    if (this.activeSubscriptions.has(ruleId)) {
      const sub = this.activeSubscriptions.get(ruleId);
      if (sub && typeof sub.unsubscribe === 'function') {
        sub.unsubscribe();
      }
      this.activeSubscriptions.delete(ruleId);
      console.log(`[RuleEngine] Rule ${ruleId} stopped and unsubscribed.`);
      return true;
    }
    return false;
  }

  /**
   * Reloads a rule (e.g. after editing on the visual builder)
   */
  async reloadRule(ruleId) {
    const rule = await Rule.findById(ruleId);
    if (!rule) {
      this.stopRule(ruleId);
      return false;
    }

    if (rule.active) {
      return this.startRule(rule);
    } else {
      this.stopRule(ruleId);
      return true;
    }
  }

  /**
   * Returns active rule count
   */
  getActiveCount() {
    return this.activeSubscriptions.size;
  }

  /**
   * Returns whether a rule is running
   */
  isRuleRunning(ruleId) {
    return this.activeSubscriptions.has(ruleId);
  }
}

export const ruleEngine = new RuleEngineService();
