import mongoose from 'mongoose';

const RuleSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    active: { type: Boolean, default: true },
    ruleType: {
      type: String,
      enum: ['threshold', 'graph'],
      default: 'threshold'
    },
    // Direct Threshold Rule Configurations
    deviceId: { type: String, default: 'ALL', uppercase: true, trim: true },
    metric: { type: String, trim: true }, // e.g. 'temperature', 'humidity', 'vibration', etc.
    operator: {
      type: String,
      enum: ['>', '<', '==', 'between', 'greater than', 'less than', 'equal to'],
      default: '>'
    },
    threshold: { type: Number },
    minThreshold: { type: Number },
    maxThreshold: { type: Number },
    severity: {
      type: String,
      enum: ['warning', 'critical'],
      default: 'warning'
    },
    // Graph Rule Configurations (for visual rule builder)
    graph: {
      nodes: { type: Array, default: [] },
      edges: { type: Array, default: [] },
      viewport: { type: Object, default: { x: 0, y: 0, zoom: 1 } }
    },
    metrics: {
      totalEvaluations: { type: Number, default: 0 },
      totalTriggers: { type: Number, default: 0 },
      lastTriggeredAt: { type: Date },
      lastEvaluatedAt: { type: Date },
      lastError: { type: String, default: null }
    }
  },
  { timestamps: true }
);

RuleSchema.index({ active: 1, deviceId: 1 });

export const Rule = mongoose.model('Rule', RuleSchema);
