import mongoose from 'mongoose';

const TelemetrySchema = new mongoose.Schema(
  {
    timestamp: {
      type: Date,
      required: true,
      default: Date.now
    },
    metadata: {
      deviceId: { type: String, required: true, index: true },
      sensorType: { type: String, default: 'multi-sensor' },
      location: { type: String, default: 'Factory Floor 1' },
      unit: { type: String, default: 'metric' },
      isSimulated: { type: Boolean, default: false }
    },
    temperature: { type: Number },
    humidity: { type: Number },
    vibration: { type: Number },
    pressure: { type: Number },
    voltage: { type: Number },
    status: { type: String, default: 'nominal' }
  },
  {
    timeseries: {
      timeField: 'timestamp',
      metaField: 'metadata',
      granularity: 'seconds'
    },
    autoCreate: false,
    versionKey: false
  }
);

export const Telemetry = mongoose.model('Telemetry', TelemetrySchema, 'telemetries');
