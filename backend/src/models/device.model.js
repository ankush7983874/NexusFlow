import mongoose from 'mongoose';

const DeviceSchema = new mongoose.Schema(
  {
    deviceId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    type: {
      type: String,
      enum: ['turbine', 'temperature', 'humidity', 'multisensor', 'hvac', 'generator'],
      default: 'multisensor'
    },
    location: { type: String, default: 'Zone A - Main Floor' },
    status: {
      type: String,
      enum: ['online', 'offline', 'warning', 'error'],
      default: 'online'
    },
    lastSeen: { type: Date, default: Date.now },
    samplingRate: { type: Number, default: 1000 },
    metadata: {
      firmwareVersion: { type: String, default: 'v1.4.2' },
      ipAddress: { type: String, default: '192.168.1.100' }
    }
  },
  { timestamps: true }
);

export const Device = mongoose.model('Device', DeviceSchema);
