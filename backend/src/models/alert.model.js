import mongoose from 'mongoose';

const AlertSchema = new mongoose.Schema(
  {
    ruleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Rule' },
    ruleName: { type: String, required: true },
    deviceId: { type: String, required: true },
    severity: {
      type: String,
      enum: ['info', 'warning', 'critical'],
      default: 'warning'
    },
    message: { type: String, required: true },
    payload: {
      metric: String,
      value: Number,
      threshold: Number,
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
    acknowledged: { type: Boolean, default: false }
  },
  { timestamps: true }
);

export const Alert = mongoose.model('Alert', AlertSchema);
