import { z } from 'zod';
import { Device } from '../models/device.model.js';
import { Telemetry } from '../models/telemetry.model.js';
import { broadcastDeviceUpdate } from '../sockets/socketManager.js';

export const createDeviceSchema = z.object({
  deviceId: z
    .string({ required_error: 'deviceId is required' })
    .trim()
    .min(2, 'Device ID must be at least 2 characters')
    .regex(/^[A-Za-z0-9_-]+$/, 'Device ID must contain only alphanumeric characters, hyphens, or underscores'),
  name: z
    .string({ required_error: 'name is required' })
    .trim()
    .min(2, 'Device name must be at least 2 characters'),
  type: z
    .enum(['turbine', 'temperature', 'humidity', 'multisensor', 'hvac', 'generator'])
    .optional()
    .default('multisensor'),
  location: z.string().trim().optional().default('Zone A - Main Floor'),
  status: z
    .enum(['online', 'offline', 'warning', 'error'])
    .optional()
    .default('online'),
  samplingRate: z
    .number()
    .int('Sampling rate must be an integer')
    .positive('Sampling rate must be positive in milliseconds')
    .optional()
    .default(1000),
  metadata: z.record(z.any()).optional()
});

export const updateDeviceSchema = z.object({
  name: z.string().trim().min(2, 'Device name must be at least 2 characters').optional(),
  type: z.enum(['turbine', 'temperature', 'humidity', 'multisensor', 'hvac', 'generator']).optional(),
  location: z.string().trim().optional(),
  status: z.enum(['online', 'offline', 'warning', 'error']).optional(),
  samplingRate: z.number().int().positive('Sampling rate must be positive in milliseconds').optional(),
  metadata: z.record(z.any()).optional()
});

export class DeviceController {
  static async listDevices(req, res, next) {
    try {
      const { search, status, type } = req.query;
      const query = {};

      if (status && status !== 'all') {
        query.status = status;
      }
      if (type && type !== 'all') {
        query.type = type;
      }
      if (search && search.trim()) {
        const regex = new RegExp(search.trim(), 'i');
        query.$or = [
          { deviceId: regex },
          { name: regex },
          { location: regex }
        ];
      }

      const devices = await Device.find(query).sort({ updatedAt: -1 }).lean();
      res.status(200).json({
        success: true,
        count: devices.length,
        data: devices
      });
    } catch (error) {
      next(error);
    }
  }

  static async getDeviceById(req, res, next) {
    try {
      const deviceId = req.params.deviceId.toUpperCase();
      const device = await Device.findOne({ deviceId }).lean();
      if (!device) {
        return res.status(404).json({ success: false, message: `Device '${deviceId}' not found` });
      }

      const recentTelemetry = await Telemetry.find({ 'metadata.deviceId': deviceId })
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
      const { deviceId, name, type, location, status, samplingRate, metadata } = req.body;
      const formattedId = deviceId.toUpperCase();

      const existing = await Device.findOne({ deviceId: formattedId });
      if (existing) {
        return res.status(409).json({
          success: false,
          message: `Device with ID '${formattedId}' is already registered.`
        });
      }

      const device = await Device.create({
        deviceId: formattedId,
        name,
        type: type || 'multisensor',
        location: location || 'Zone A - Main Floor',
        status: status || 'online',
        samplingRate: samplingRate || 1000,
        metadata: metadata || { firmwareVersion: 'v1.4.2' }
      });

      broadcastDeviceUpdate({ action: 'create', device });

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
      const deviceId = req.params.deviceId.toUpperCase();
      const updated = await Device.findOneAndUpdate(
        { deviceId },
        { ...req.body, updatedAt: new Date() },
        { new: true, runValidators: true }
      );

      if (!updated) {
        return res.status(404).json({
          success: false,
          message: `Device '${deviceId}' not found`
        });
      }

      broadcastDeviceUpdate({ action: 'update', device: updated });

      res.status(200).json({
        success: true,
        message: 'Device updated successfully',
        data: updated
      });
    } catch (error) {
      next(error);
    }
  }

  static async deleteDevice(req, res, next) {
    try {
      const deviceId = req.params.deviceId.toUpperCase();
      const device = await Device.findOneAndDelete({ deviceId });
      if (!device) {
        return res.status(404).json({
          success: false,
          message: `Device '${deviceId}' not found`
        });
      }

      broadcastDeviceUpdate({ action: 'delete', deviceId });

      res.status(200).json({
        success: true,
        message: `Device '${deviceId}' removed successfully`
      });
    } catch (error) {
      next(error);
    }
  }
}
