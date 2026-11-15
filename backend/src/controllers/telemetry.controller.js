import { z } from 'zod';
import { TelemetryService } from '../services/telemetry.service.js';
import { Telemetry } from '../models/telemetry.model.js';
import { Device } from '../models/device.model.js';
import { Rule } from '../models/rule.model.js';
import { Alert } from '../models/alert.model.js';

export const singleTelemetrySchema = z.object({
  deviceId: z.string().min(1, 'deviceId is required'),
  sensorType: z.string().optional(),
  location: z.string().optional(),
  unit: z.string().optional(),
  temperature: z.number().optional(),
  humidity: z.number().optional(),
  vibration: z.number().optional(),
  pressure: z.number().optional(),
  voltage: z.number().optional(),
  status: z.string().optional(),
  timestamp: z.string().or(z.date()).optional()
});

export const batchTelemetrySchema = z.object({
  records: z.array(singleTelemetrySchema).min(1, 'records array cannot be empty')
});

export class TelemetryController {
  static async ingestSingle(req, res, next) {
    try {
      const saved = await TelemetryService.ingestSingle(req.body);
      res.status(201).json({
        success: true,
        message: 'Telemetry ingested successfully',
        data: saved
      });
    } catch (error) {
      next(error);
    }
  }

  static async ingestBatch(req, res, next) {
    try {
      const records = req.body.records || req.body;
      const result = await TelemetryService.ingestBatch(records);
      res.status(201).json({
        success: true,
        message: `Successfully ingested ${result.insertedCount} telemetry data points`,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  static async getHistory(req, res, next) {
    try {
      const { deviceId, sensorType, startDate, endDate, limit, page } = req.query;
      const result = await TelemetryService.queryHistory({
        deviceId,
        sensorType,
        startDate,
        endDate,
        limit,
        page
      });
      res.status(200).json({
        success: true,
        ...result
      });
    } catch (error) {
      next(error);
    }
  }

  static async getAggregations(req, res, next) {
    try {
      const { deviceId, hours } = req.query;
      const data = await TelemetryService.getAggregations({
        deviceId,
        hours: hours ? Number(hours) : 24
      });
      res.status(200).json({
        success: true,
        data
      });
    } catch (error) {
      next(error);
    }
  }

  static async getOverviewStats(req, res, next) {
    try {
      const [totalTelemetry, totalDevices, activeRules, recentAlerts] = await Promise.all([
        Telemetry.countDocuments(),
        Device.countDocuments(),
        Rule.countDocuments({ active: true }),
        Alert.find().sort({ createdAt: -1 }).limit(10).lean()
      ]);

      const onlineDevices = await Device.countDocuments({ status: 'online' });

      res.status(200).json({
        success: true,
        data: {
          totalTelemetry,
          totalDevices,
          onlineDevices,
          activeRules,
          recentAlerts
        }
      });
    } catch (error) {
      next(error);
    }
  }
}
