import mongoose from 'mongoose';

const AlertSchema = new mongoose.Schema(
  {
    title: { type: String, default: '' },
    ruleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Rule' },
    ruleName: { type: String, required: true },
    deviceId: { type: String, required: true, uppercase: true, trim: true },
    deviceName: { type: String, default: '' },
    severity: {
      type: String,
      enum: ['info', 'warning', 'critical'],
      default: 'warning'
    },
    status: {
      type: String,
      enum: ['active', 'acknowledged', 'resolved'],
      default: 'active'
    },
    message: { type: String, required: true },
    metric: { type: String, default: '' },
    reading: { type: Number },
    threshold: { type: String, default: '' },
    payload: {
      metric: String,
      value: Number,
      threshold: mongoose.Schema.Types.Mixed,
      minThreshold: Number,
      maxThreshold: Number,
      operator: String,
      data: mongoose.Schema.Types.Mixed
    },
    deliveryStatus: {
      sms: {
        sent: { type: Boolean, default: false },
        recipient: String,
        timestamp: Date,
        mock: { type: Boolean, default: true }
      },
      webhook: {
        sent: { type: Boolean, default: false },
        url: String,
        statusCode: Number,
        timestamp: Date
      }
    },
    consecutiveBreaches: { type: Number, default: 1 },
    acknowledged: { type: Boolean, default: false },
    acknowledgedAt: { type: Date },
    resolvedAt: { type: Date }
  },
  { timestamps: true }
);

AlertSchema.index({ status: 1, createdAt: -1 });
AlertSchema.index({ deviceId: 1, status: 1, createdAt: -1 });
AlertSchema.index({ ruleId: 1, deviceId: 1, status: 1 });

export const Alert = mongoose.model('Alert', AlertSchema);
