import mongoose from 'mongoose';

const RuleSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String, default: '' },
    active: { type: Boolean, default: true },
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

export const Rule = mongoose.model('Rule', RuleSchema);
