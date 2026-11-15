import { Subject, merge } from 'rxjs';
import { filter, map, scan, concatMap, tap, catchError } from 'rxjs/operators';
import { broadcastNodeExecution, broadcastAlert } from '../sockets/socketManager.js';
import { NotificationService } from './notification.service.js';
import { Alert } from '../models/alert.model.js';
import { Rule } from '../models/rule.model.js';

export class StreamCompiler {
  /**
   * Validates graph structure before compilation
   */
  static validateGraph(graph) {
    const errors = [];
    const warnings = [];

    if (!graph || typeof graph !== 'object') {
      return { valid: false, errors: ['Graph data must be a valid JSON object.'] };
    }

    const nodes = Array.isArray(graph.nodes) ? graph.nodes : [];
    const edges = Array.isArray(graph.edges) ? graph.edges : [];

    if (nodes.length === 0) {
      errors.push('Graph must contain at least one node.');
    }

    const nodeIds = new Set(nodes.map(n => n.id));
    const sourceTypes = ['tempSensor', 'humiditySensor', 'turbineSensor', 'sensorNode'];
    const actionTypes = ['smsAlert', 'webhook', 'actionNode'];

    const sourceNodes = nodes.filter(n => sourceTypes.includes(n.type));
    const actionNodes = nodes.filter(n => actionTypes.includes(n.type));

    if (sourceNodes.length === 0) {
      errors.push('Graph must contain at least one Sensor/Source node.');
    }

    if (actionNodes.length === 0) {
      warnings.push('Graph contains no Action/Alert nodes; rules will process data but trigger no output actions.');
    }

    // Check edges
    for (const edge of edges) {
      if (!nodeIds.has(edge.source)) {
        errors.push(`Edge ${edge.id} references non-existent source node: ${edge.source}`);
      }
      if (!nodeIds.has(edge.target)) {
        errors.push(`Edge ${edge.id} references non-existent target node: ${edge.target}`);
      }
    }

    // Check for isolated nodes
    const connectedNodeIds = new Set();
    edges.forEach(e => {
      connectedNodeIds.add(e.source);
      connectedNodeIds.add(e.target);
    });

    for (const node of nodes) {
      if (!connectedNodeIds.has(node.id) && nodes.length > 1) {
        warnings.push(`Node "${node.data?.label || node.id}" is disconnected from the workflow.`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Compiles graph JSON into an active RxJS pipeline
   */
  static compileGraph(ruleDocument, telemetrySubject$) {
    const validation = this.validateGraph(ruleDocument.graph);
    if (!validation.valid) {
      throw new Error(`Graph validation failed: ${validation.errors.join('; ')}`);
    }

    const { nodes, edges } = ruleDocument.graph;
    const ruleId = ruleDocument._id.toString();
    const ruleName = ruleDocument.name;

    // Build Adjacency lists
    const inEdges = new Map(); // target -> [sourceNodeIds]
    const outEdges = new Map(); // source -> [targetNodeIds]

    nodes.forEach(n => {
      inEdges.set(n.id, []);
      outEdges.set(n.id, []);
    });

    edges.forEach(e => {
      if (inEdges.has(e.target)) inEdges.get(e.target).push(e.source);
      if (outEdges.has(e.source)) outEdges.get(e.source).push(e.target);
    });

    // Observables map per node
    const nodeObservables = new Map();

    // 1. Compile Source Nodes
    const sourceTypes = ['tempSensor', 'humiditySensor', 'turbineSensor', 'sensorNode'];
    const sourceNodes = nodes.filter(n => sourceTypes.includes(n.type));

    sourceNodes.forEach(sourceNode => {
      const config = sourceNode.data || {};
      const targetDevice = config.deviceId || '*';
      const metricType = sourceNode.type === 'humiditySensor'
        ? 'humidity'
        : sourceNode.type === 'turbineSensor'
          ? (config.metric || 'vibration')
          : 'temperature';

      const source$ = telemetrySubject$.pipe(
        // Filter by deviceId if specified
        filter(telemetry => {
          const deviceId = telemetry.metadata?.deviceId || telemetry.deviceId;
          if (targetDevice !== '*' && deviceId !== targetDevice) return false;
          return telemetry[metricType] !== undefined && telemetry[metricType] !== null;
        }),
        map(telemetry => {
          const rawVal = Number(telemetry[metricType]);
          return {
            ruleId,
            ruleName,
            nodeId: sourceNode.id,
            metric: metricType,
            value: rawVal,
            originalValue: rawVal,
            deviceId: telemetry.metadata?.deviceId || telemetry.deviceId,
            timestamp: telemetry.timestamp || new Date(),
            history: [sourceNode.id]
          };
        }),
        tap(event => {
          broadcastNodeExecution({
            ruleId,
            nodeId: sourceNode.id,
            value: event.value,
            metric: event.metric,
            deviceId: event.deviceId,
            timestamp: event.timestamp
          });
        })
      );

      nodeObservables.set(sourceNode.id, source$);
    });

    // 2. Compile Remaining Nodes in Topological / Dependency Order
    const compiled = new Set(sourceNodes.map(n => n.id));
    let progress = true;

    while (compiled.size < nodes.length && progress) {
      progress = false;

      for (const node of nodes) {
        if (compiled.has(node.id)) continue;

        const incoming = inEdges.get(node.id) || [];
        // If node has no incoming edges and is not a source, skip or mark compiled
        if (incoming.length === 0) {
          compiled.add(node.id);
          progress = true;
          continue;
        }

        // Check if all parent inputs are compiled
        const allParentsCompiled = incoming.every(parentId => nodeObservables.has(parentId));
        if (!allParentsCompiled) continue;

        // Merge inputs from parent streams
        const parentStreams = incoming.map(parentId => nodeObservables.get(parentId));
        const mergedInput$ = parentStreams.length === 1 ? parentStreams[0] : merge(...parentStreams);

        // Apply node-specific transformation
        const node$ = this.createNodePipeline(node, mergedInput$, ruleId, ruleName);
        nodeObservables.set(node.id, node$);
        compiled.add(node.id);
        progress = true;
      }
    }

    // 3. Subscribe to all leaf / action nodes to keep pipeline alive
    const sinkNodes = nodes.filter(n => (outEdges.get(n.id) || []).length === 0 && nodeObservables.has(n.id));
    const activeSinks$ = sinkNodes.length > 0 
      ? merge(...sinkNodes.map(n => nodeObservables.get(n.id)))
      : merge(...Array.from(nodeObservables.values()));

    const subscription = activeSinks$.pipe(
      catchError((err, caught) => {
        console.error(`[StreamCompiler] Runtime error in rule "${ruleName}":`, err.message);
        Rule.findByIdAndUpdate(ruleId, {
          'metrics.lastError': err.message,
          'metrics.lastEvaluatedAt': new Date()
        }).exec();
        return caught;
      })
    ).subscribe({
      next: (item) => {
        Rule.findByIdAndUpdate(ruleId, {
          $inc: { 'metrics.totalEvaluations': 1 },
          'metrics.lastEvaluatedAt': new Date()
        }).exec();
      },
      error: (err) => {
        console.error(`[StreamCompiler] Stream terminated for rule ${ruleName}:`, err);
      }
    });

    return subscription;
  }

  /**
   * Helper to create node-specific RxJS transformations
   */
  static createNodePipeline(node, input$, ruleId, ruleName) {
    const config = node.data || {};

    switch (node.type) {
      case 'movingAverage': {
        const windowSize = Math.max(1, Number(config.windowSize) || 5);
        return input$.pipe(
          scan((acc, curr) => {
            const buffer = [...acc.buffer, curr.value];
            if (buffer.length > windowSize) buffer.shift();
            const sum = buffer.reduce((a, b) => a + b, 0);
            const avg = Number((sum / buffer.length).toFixed(2));
            return {
              ...curr,
              nodeId: node.id,
              value: avg,
              movingAverage: avg,
              buffer,
              history: [...(curr.history || []), node.id]
            };
          }, { buffer: [] }),
          tap(event => {
            broadcastNodeExecution({
              ruleId,
              nodeId: node.id,
              value: event.value,
              metric: event.metric,
              deviceId: event.deviceId,
              timestamp: event.timestamp
            });
          })
        );
      }

      case 'mathOp': {
        const operation = config.operation || 'multiply';
        const operand = Number(config.operand !== undefined ? config.operand : 1);

        return input$.pipe(
          map(curr => {
            let res = curr.value;
            if (operation === 'add') res += operand;
            else if (operation === 'subtract') res -= operand;
            else if (operation === 'multiply') res *= operand;
            else if (operation === 'divide') res = operand !== 0 ? res / operand : res;

            return {
              ...curr,
              nodeId: node.id,
              value: Number(res.toFixed(2)),
              history: [...(curr.history || []), node.id]
            };
          }),
          tap(event => {
            broadcastNodeExecution({
              ruleId,
              nodeId: node.id,
              value: event.value,
              metric: event.metric,
              deviceId: event.deviceId,
              timestamp: event.timestamp
            });
          })
        );
      }

      case 'threshold': {
        const operator = config.operator || '>';
        const thresholdVal = Number(config.threshold !== undefined ? config.threshold : 80);

        return input$.pipe(
          filter(curr => {
            const v = curr.value;
            let conditionMet = false;
            if (operator === '>') conditionMet = v > thresholdVal;
            else if (operator === '<') conditionMet = v < thresholdVal;
            else if (operator === '>=') conditionMet = v >= thresholdVal;
            else if (operator === '<=') conditionMet = v <= thresholdVal;
            else if (operator === '==') conditionMet = v === thresholdVal;
            else if (operator === '!=') conditionMet = v !== thresholdVal;
            return conditionMet;
          }),
          map(curr => ({
            ...curr,
            nodeId: node.id,
            triggeredThreshold: thresholdVal,
            operator,
            history: [...(curr.history || []), node.id]
          })),
          tap(event => {
            broadcastNodeExecution({
              ruleId,
              nodeId: node.id,
              value: event.value,
              threshold: thresholdVal,
              operator,
              triggered: true,
              deviceId: event.deviceId,
              timestamp: event.timestamp
            });
          })
        );
      }

      case 'smsAlert': {
        const recipient = config.recipient || '+1 (555) 019-2834';
        const messageTemplate = config.message || `Threshold crossed: {{metric}} = {{value}} on {{deviceId}}`;

        return input$.pipe(
          concatMap(async (curr) => {
            const renderedMessage = messageTemplate
              .replace(/{{metric}}/g, curr.metric)
              .replace(/{{value}}/g, curr.value)
              .replace(/{{deviceId}}/g, curr.deviceId);

            const smsResult = await NotificationService.sendMockSMS({
              recipient,
              message: renderedMessage,
              ruleName,
              deviceId: curr.deviceId,
              value: curr.value
            });

            // Save Alert to Database
            const alertDoc = await Alert.create({
              ruleId,
              ruleName,
              deviceId: curr.deviceId,
              severity: curr.value > 100 ? 'critical' : 'warning',
              message: renderedMessage,
              payload: {
                metric: curr.metric,
                value: curr.value,
                threshold: curr.triggeredThreshold,
                operator: curr.operator
              },
              deliveryStatus: {
                sms: {
                  sent: smsResult.sent,
                  recipient: smsResult.recipient,
                  timestamp: smsResult.timestamp,
                  mock: true
                }
              }
            });

            // Update Rule Metrics
            await Rule.findByIdAndUpdate(ruleId, {
              $inc: { 'metrics.totalTriggers': 1 },
              'metrics.lastTriggeredAt': new Date()
            }).exec();

            // Broadcast real-time alert via WebSockets
            broadcastAlert(alertDoc);

            broadcastNodeExecution({
              ruleId,
              nodeId: node.id,
              value: curr.value,
              action: 'sms_dispatched',
              recipient,
              timestamp: new Date()
            });

            return { ...curr, alertId: alertDoc._id };
          })
        );
      }

      case 'webhook': {
        const webhookUrl = config.url || '';
        const httpMethod = config.method || 'POST';

        return input$.pipe(
          concatMap(async (curr) => {
            const webhookResult = await NotificationService.triggerWebhook({
              url: webhookUrl,
              method: httpMethod,
              payload: {
                ruleId,
                ruleName,
                deviceId: curr.deviceId,
                metric: curr.metric,
                value: curr.value,
                timestamp: curr.timestamp
              }
            });

            const alertDoc = await Alert.create({
              ruleId,
              ruleName,
              deviceId: curr.deviceId,
              severity: 'warning',
              message: `Webhook alert dispatched to ${webhookUrl}`,
              payload: {
                metric: curr.metric,
                value: curr.value,
                threshold: curr.triggeredThreshold
              },
              deliveryStatus: {
                webhook: {
                  sent: webhookResult.sent,
                  url: webhookResult.url,
                  statusCode: webhookResult.statusCode,
                  timestamp: webhookResult.timestamp
                }
              }
            });

            await Rule.findByIdAndUpdate(ruleId, {
              $inc: { 'metrics.totalTriggers': 1 },
              'metrics.lastTriggeredAt': new Date()
            }).exec();

            broadcastAlert(alertDoc);

            broadcastNodeExecution({
              ruleId,
              nodeId: node.id,
              value: curr.value,
              action: 'webhook_dispatched',
              url: webhookUrl,
              timestamp: new Date()
            });

            return { ...curr, alertId: alertDoc._id };
          })
        );
      }

      default:
        // Pass-through for unrecognized node types
        return input$.pipe(
          map(curr => ({
            ...curr,
            nodeId: node.id,
            history: [...(curr.history || []), node.id]
          }))
        );
    }
  }
}
