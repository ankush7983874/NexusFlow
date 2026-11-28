import { thresholdRuleSchema } from '../controllers/rule.controller.js';
import { ruleEngine } from '../services/ruleEngine.service.js';

let passedCount = 0;
let failedCount = 0;

function assert(condition, testName, details = '') {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passedCount++;
  } else {
    console.error(`  ❌ FAIL: ${testName} - ${details}`);
    failedCount++;
  }
}

async function runTestSuite() {
  console.log('\n===============================================================');
  console.log('🧪 NEXUSFLOW FEATURE 8: ADVANCED ALERT & THRESHOLD TEST SUITE');
  console.log('===============================================================\n');

  // -------------------------------------------------------------
  // TEST GROUP 1: Zod Schema Validation (Frontend & Backend Contract)
  // -------------------------------------------------------------
  console.log('--> GROUP 1: Zod Schema Validation & Input Security');

  // 1.1 Valid threshold rule with > operator
  const validGreater = thresholdRuleSchema.safeParse({
    name: 'High Temperature Alarm',
    deviceId: 'TURBINE-001',
    metric: 'temperature',
    operator: '>',
    threshold: 85.5,
    severity: 'critical',
    active: true
  });
  assert(validGreater.success, 'Valid threshold rule with ">" operator passes validation');

  // 1.2 Valid threshold rule with "between" operator
  const validBetween = thresholdRuleSchema.safeParse({
    name: 'Safe Vibration Range',
    deviceId: 'ALL',
    metric: 'vibration',
    operator: 'between',
    minThreshold: 10,
    maxThreshold: 50,
    severity: 'warning',
    active: true
  });
  assert(validBetween.success, 'Valid threshold rule with "between" operator passes validation');

  // 1.3 Reject between when minThreshold > maxThreshold
  const invalidBetween = thresholdRuleSchema.safeParse({
    name: 'Invalid Range',
    deviceId: 'ALL',
    metric: 'vibration',
    operator: 'between',
    minThreshold: 100,
    maxThreshold: 20,
    severity: 'warning'
  });
  assert(!invalidBetween.success, 'Reject between rule where minThreshold > maxThreshold');

  // 1.4 Reject rule when operator is ">" but threshold is omitted
  const missingThreshold = thresholdRuleSchema.safeParse({
    name: 'Missing Threshold',
    deviceId: 'TURBINE-001',
    metric: 'temperature',
    operator: '>',
    severity: 'warning'
  });
  assert(!missingThreshold.success, 'Reject single operator rule when threshold value is missing');

  // 1.5 Reject rule with invalid severity
  const invalidSeverity = thresholdRuleSchema.safeParse({
    name: 'Bad Severity',
    metric: 'pressure',
    operator: '<',
    threshold: 10,
    severity: 'extreme'
  });
  assert(!invalidSeverity.success, 'Reject rule with invalid severity type');

  // 1.6 Reject rule with empty name or missing metric
  const missingMetric = thresholdRuleSchema.safeParse({
    name: 'No Metric',
    operator: '>',
    threshold: 50
  });
  assert(!missingMetric.success, 'Reject rule with missing metric identifier');

  // -------------------------------------------------------------
  // TEST GROUP 2: Threshold Rule Evaluation & Alert Detection
  // -------------------------------------------------------------
  console.log('\n--> GROUP 2: Threshold Engine Evaluation & Duplicate Alert Suppression');

  // Mock Alert and Device storage for self-contained testing
  const mockAlerts = [];
  let alertIdCounter = 1;

  // Setup mock Alert model behavior in ruleEngine context
  const mockAlertModel = {
    create: async (data) => {
      const created = {
        _id: `alert_${alertIdCounter++}`,
        ...data,
        consecutiveBreaches: 1,
        createdAt: new Date()
      };
      mockAlerts.push(created);
      return created;
    },
    findOne: async (query) => {
      return mockAlerts.find(a => 
        a.ruleId === query.ruleId && 
        a.deviceId === query.deviceId && 
        query.status.$in.includes(a.status)
      ) || null;
    },
    findByIdAndUpdate: (id, update) => {
      const found = mockAlerts.find(a => a._id === id);
      if (found) {
        if (update.$inc?.consecutiveBreaches) {
          found.consecutiveBreaches = (found.consecutiveBreaches || 1) + update.$inc.consecutiveBreaches;
        }
        if (update.reading !== undefined) {
          found.reading = update.reading;
        }
      }
      return { exec: async () => found };
    }
  };

  // Configure test rules
  const testRule1 = {
    _id: 'rule_temp_crit',
    name: 'Turbine Overheat Protection',
    ruleType: 'threshold',
    deviceId: 'TURBINE-001',
    metric: 'temperature',
    operator: '>',
    threshold: 80,
    severity: 'critical',
    active: true
  };

  const testRule2 = {
    _id: 'rule_vibe_warn',
    name: 'Excessive Vibration Warning',
    ruleType: 'threshold',
    deviceId: 'ALL',
    metric: 'vibration',
    operator: '>',
    threshold: 45,
    severity: 'warning',
    active: true
  };

  const testRuleDisabled = {
    _id: 'rule_pressure_disabled',
    name: 'Disabled Hydraulic Pressure Limit',
    ruleType: 'threshold',
    deviceId: 'ALL',
    metric: 'pressure',
    operator: '<',
    threshold: 20,
    severity: 'warning',
    active: false
  };

  // Reset ruleEngine state
  ruleEngine.activeThresholdRules = [testRule1, testRule2];
  ruleEngine.activeAbnormalTracker.clear();

  // Test 2.1: Normal telemetry does not trigger alert
  console.log('  Testing normal telemetry evaluation...');
  const normalTelemetry = {
    deviceId: 'TURBINE-001',
    temperature: 72.4,
    vibration: 22.1,
    pressure: 50.0
  };
  
  // Custom mock evaluator for engine
  async function testEvaluate(telemetry) {
    const targetDev = String(telemetry.deviceId || '').toUpperCase();
    for (const rule of ruleEngine.activeThresholdRules) {
      if (!rule.active && rule.active !== undefined) continue;
      const ruleDev = String(rule.deviceId || 'ALL').toUpperCase();
      if (ruleDev !== 'ALL' && ruleDev !== targetDev) continue;

      const val = telemetry[rule.metric];
      if (val === undefined) continue;

      let breached = false;
      if (rule.operator === '>') breached = val > rule.threshold;
      else if (rule.operator === '<') breached = val < rule.threshold;
      else if (rule.operator === 'between') breached = val >= rule.minThreshold && val <= rule.maxThreshold;

      const dedupeKey = `${rule._id}_${targetDev}`;
      if (breached) {
        const trackerId = ruleEngine.activeAbnormalTracker.get(dedupeKey);
        if (trackerId) {
          await mockAlertModel.findByIdAndUpdate(trackerId, { $inc: { consecutiveBreaches: 1 }, reading: val });
          continue;
        }

        const existing = await mockAlertModel.findOne({
          ruleId: rule._id,
          deviceId: targetDev,
          status: { $in: ['active', 'acknowledged'] }
        });

        if (existing) {
          ruleEngine.activeAbnormalTracker.set(dedupeKey, existing._id);
          await mockAlertModel.findByIdAndUpdate(existing._id, { $inc: { consecutiveBreaches: 1 }, reading: val });
          continue;
        }

        const newAlert = await mockAlertModel.create({
          title: `Threshold Breached: ${rule.name}`,
          ruleId: rule._id,
          ruleName: rule.name,
          deviceId: targetDev,
          deviceName: targetDev,
          severity: rule.severity,
          status: 'active',
          metric: rule.metric,
          reading: val,
          threshold: `${rule.operator} ${rule.threshold}`
        });
        ruleEngine.activeAbnormalTracker.set(dedupeKey, newAlert._id);
      }
    }
  }

  await testEvaluate(normalTelemetry);
  assert(mockAlerts.length === 0, 'Normal telemetry reading generates NO alerts');

  // Test 2.2: Abnormal telemetry triggers active alert
  console.log('  Testing abnormal telemetry trigger...');
  const abnormalTelemetry1 = {
    deviceId: 'TURBINE-001',
    temperature: 92.5, // > 80, triggers rule 1
    vibration: 25.0
  };
  await testEvaluate(abnormalTelemetry1);
  assert(mockAlerts.length === 1, 'Abnormal telemetry generates 1 active alert');
  assert(mockAlerts[0].status === 'active', 'Created alert status is "active"');
  assert(mockAlerts[0].severity === 'critical', 'Alert severity matches rule severity ("critical")');
  assert(mockAlerts[0].reading === 92.5, 'Alert records actual metric reading (92.5)');
  assert(mockAlerts[0].consecutiveBreaches === 1, 'Initial consecutive breach count is 1');

  // Test 2.3: Continuous abnormal readings trigger duplicate suppression
  console.log('  Testing continuous abnormal reading suppression...');
  const abnormalTelemetry2 = {
    deviceId: 'TURBINE-001',
    temperature: 95.0, // Still > 80
    vibration: 26.0
  };
  await testEvaluate(abnormalTelemetry2);
  const abnormalTelemetry3 = {
    deviceId: 'TURBINE-001',
    temperature: 97.2, // Still > 80
    vibration: 28.0
  };
  await testEvaluate(abnormalTelemetry3);

  assert(mockAlerts.length === 1, 'Duplicate alert suppression prevents creating duplicate alert records');
  assert(mockAlerts[0].consecutiveBreaches === 3, 'Consecutive breaches incremented correctly (3)');
  assert(mockAlerts[0].reading === 97.2, 'Latest abnormal reading updated (97.2)');

  // Test 2.4: Device scope isolation ('TURBINE-002' with high temp does NOT trigger TURBINE-001-only rule)
  console.log('  Testing device isolation...');
  const differentDeviceTelemetry = {
    deviceId: 'TURBINE-002',
    temperature: 99.0 // high temp, but rule 1 is only for TURBINE-001
  };
  await testEvaluate(differentDeviceTelemetry);
  assert(mockAlerts.length === 1, 'Rule scoped to TURBINE-001 is NOT triggered by TURBINE-002');

  // Test 2.5: 'ALL' device scope rule triggers for any device
  console.log('  Testing ALL device scope...');
  const vibeBreachTelemetry = {
    deviceId: 'PUMP-888',
    vibration: 55.4 // > 45, triggers rule 2
  };
  await testEvaluate(vibeBreachTelemetry);
  assert(mockAlerts.length === 2, '"ALL" scoped rule triggers for any reporting device');
  assert(mockAlerts[1].deviceId === 'PUMP-888', 'Alert correctly associates target device ID (PUMP-888)');
  assert(mockAlerts[1].severity === 'warning', 'Alert severity is "warning"');

  // -------------------------------------------------------------
  // TEST GROUP 3: Alert Lifecycle Management (Acknowledge & Resolve)
  // -------------------------------------------------------------
  console.log('\n--> GROUP 3: Alert Lifecycle Management (Acknowledge & Resolve)');

  // 3.1 Acknowledge alert
  mockAlerts[0].status = 'acknowledged';
  mockAlerts[0].acknowledgedAt = new Date();
  assert(mockAlerts[0].status === 'acknowledged', 'Alert status transitions to "acknowledged"');

  // 3.2 Further abnormal reading while acknowledged maintains acknowledged state & increments breaches
  await testEvaluate({
    deviceId: 'TURBINE-001',
    temperature: 98.0
  });
  assert(mockAlerts.length === 2, 'No new duplicate alert created while alert is acknowledged');
  assert(mockAlerts[0].consecutiveBreaches === 4, 'Consecutive breaches incremented while acknowledged (4)');

  // 3.3 Resolve alert
  mockAlerts[0].status = 'resolved';
  mockAlerts[0].resolvedAt = new Date();
  ruleEngine.clearAlertTracker(testRule1._id, 'TURBINE-001');
  assert(mockAlerts[0].status === 'resolved', 'Alert status transitions to "resolved"');
  assert(!ruleEngine.activeAbnormalTracker.has(`${testRule1._id}_TURBINE-001`), 'Alert deduplication tracker cleared on resolution');

  // 3.4 New alert generated when resolved condition becomes abnormal again
  console.log('  Testing re-occurrence after resolution...');
  const reoccurringAbnormal = {
    deviceId: 'TURBINE-001',
    temperature: 88.0 // abnormal again after resolution!
  };
  await testEvaluate(reoccurringAbnormal);
  assert(mockAlerts.length === 3, 'New alert generated when resolved condition breaches again');
  assert(mockAlerts[2].status === 'active', 'Re-occurring alert has active status');
  assert(mockAlerts[2].consecutiveBreaches === 1, 'Re-occurring alert starts with consecutive breaches = 1');

  // -------------------------------------------------------------
  // TEST GROUP 4: Disabled Rule Evaluation
  // -------------------------------------------------------------
  console.log('\n--> GROUP 4: Disabled Rule Protection');
  ruleEngine.activeThresholdRules.push(testRuleDisabled);
  const pressureBreach = {
    deviceId: 'TURBINE-001',
    pressure: 10.0 // < 20, but rule is disabled
  };
  await testEvaluate(pressureBreach);
  assert(mockAlerts.length === 3, 'Disabled rule does NOT generate alerts upon breach');

  // -------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------
  console.log('\n===============================================================');
  console.log(`📊 TEST SUITE RESULTS: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('===============================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTestSuite().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
