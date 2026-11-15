import { Subject } from 'rxjs';
import { StreamCompiler } from './compiler.service.js';
import { Rule } from '../models/rule.model.js';

class RuleEngineService {
  constructor() {
    this.telemetrySubject$ = new Subject();
    this.activeSubscriptions = new Map(); // ruleId -> RxJS Subscription
    this.isInitialized = false;
  }

  /**
   * Initializes the engine by loading all active rules from DB
   */
  async init() {
    console.log('[RuleEngine] Initializing rules from database...');
    try {
      const activeRules = await Rule.find({ active: true });
      for (const rule of activeRules) {
        try {
          this.startRule(rule);
        } catch (err) {
          console.error(`[RuleEngine] Failed to start rule ${rule.name} (${rule._id}):`, err.message);
        }
      }
      this.isInitialized = true;
      console.log(`[RuleEngine] Initialized with ${this.activeSubscriptions.size} active rule pipelines.`);
    } catch (error) {
      console.error('[RuleEngine] Initialization error:', error.message);
    }
  }

  /**
   * Feeds ingested telemetry into the dynamic stream
   */
  feedTelemetry(telemetry) {
    if (!telemetry) return;
    this.telemetrySubject$.next(telemetry);
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
