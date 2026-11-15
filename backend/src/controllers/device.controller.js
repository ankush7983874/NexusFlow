import { Device } from '../models/device.model.js';
import { Telemetry } from '../models/telemetry.model.js';

export class DeviceController {
  static async listDevices(req, res, next) {
    try {
      const devices = await Device.find().sort({ updatedAt: -1 }).lean();
      res.status(200).json({
        success: true,
        data: devices
      });
    } catch (error) {
      next(error);
    }
  }

  static async getDeviceById(req, res, next) {
    try {
      const device = await Device.findOne({ deviceId: req.params.deviceId }).lean();
      if (!device) {
        return res.status(404).json({ success: false, message: 'Device not found' });
      }

      const recentTelemetry = await Telemetry.find({ 'metadata.deviceId': req.params.deviceId })
        .sort({ timestamp: -1 })
        .limit(50)
        .lean();

      res.status(200).json({
        success: true,
        data: {
          ...device,
          recentTelemetry
        }
      });
    } catch (error) {
      next(error);
    }
  }

  static async createDevice(req, res, next) {
    try {
      const { deviceId, name, type, location, samplingRate } = req.body;
      const existing = await Device.findOne({ deviceId });
      if (existing) {
        return res.status(400).json({ success: false, message: 'DeviceId already registered' });
      }

      const device = await Device.create({
        deviceId,
        name: name || deviceId,
        type: type || 'multisensor',
        location: location || 'Zone A - Main Floor',
        samplingRate: samplingRate || 1000
      });

      res.status(201).json({
        success: true,
        message: 'Device registered successfully',
        data: device
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateDevice(req, res, next) {
    try {
      const device = await Device.findOneAndUpdate(
        { deviceId: req.params.deviceId },
        req.body,
        { new: true }
      );
      if (!device) {
        return res.status(404).json({ success: false, message: 'Device not found' });
      }

      res.status(200).json({
        success: true,
        message: 'Device updated successfully',
        data: device
      });
    } catch (error) {
      next(error);
    }
  }

  static async deleteDevice(req, res, next) {
    try {
      const device = await Device.findOneAndDelete({ deviceId: req.params.deviceId });
      if (!device) {
        return res.status(404).json({ success: false, message: 'Device not found' });
      }

      res.status(200).json({
        success: true,
        message: 'Device removed successfully'
      });
    } catch (error) {
      next(error);
    }
  }
}
