import { z } from 'zod';
import { TelemetryService } from '../services/telemetry.service.js';
import { Telemetry } from '../models/telemetry.model.js';
import { Device } from '../models/device.model.js';
import { Rule } from '../models/rule.model.js';
import { Alert } from '../models/alert.model.js';

export const singleTelemetrySchema = z.object({
  deviceId: z
    .string({ required_error: 'deviceId is required' })
    .trim()
    .min(1, 'deviceId cannot be empty'),
  sensorType: z.string().trim().optional(),
  location: z.string().trim().optional(),
  unit: z.string().trim().optional(),
  temperature: z
    .number({ invalid_type_error: 'temperature must be a valid number' })
    .min(-100, 'temperature cannot be less than -100°C')
    .max(1500, 'temperature cannot exceed 1500°C')
    .optional(),
  humidity: z
    .number({ invalid_type_error: 'humidity must be a valid number' })
    .min(0, 'humidity cannot be less than 0%')
    .max(100, 'humidity cannot exceed 100%')
    .optional(),
  vibration: z.number({ invalid_type_error: 'vibration must be a number' }).optional(),
  pressure: z.number({ invalid_type_error: 'pressure must be a number' }).optional(),
  voltage: z.number({ invalid_type_error: 'voltage must be a number' }).optional(),
  status: z.string().trim().optional(),
  timestamp: z.string().or(z.date()).optional(),
  isSimulated: z.boolean().optional(),
  metadata: z.record(z.any()).optional()
});

export const batchTelemetrySchema = z.union([
  z.object({
    records: z.array(singleTelemetrySchema).min(1, 'records array cannot be empty')
  }),
  z.array(singleTelemetrySchema).min(1, 'telemetry array cannot be empty')
]);

export class TelemetryController {
  static async ingestSingle(req, res, next) {
    try {
      const saved = await TelemetryService.ingestSingle(req.body);
      res.status(201).json({
        success: true,
        message: 'Telemetry reading ingested successfully',
        data: saved
      });
    } catch (error) {
      next(error);
    }
  }

  static async ingestBatch(req, res, next) {
    try {
      const rawRecords = Array.isArray(req.body) ? req.body : req.body.records;
      const result = await TelemetryService.ingestBatch(rawRecords);
      res.status(201).json({
        success: true,
        message: `Successfully ingested batch of ${result.insertedCount} telemetry data points`,
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
      const [totalTelemetry, totalDevices, activeRules, recentAlerts, totalAlerts] = await Promise.all([
        Telemetry.countDocuments(),
        Device.countDocuments(),
        Rule.countDocuments({ active: true }),
        Alert.find().sort({ createdAt: -1 }).limit(10).lean(),
        Alert.countDocuments()
      ]);

      const onlineDevices = await Device.countDocuments({ status: 'online' });

      res.status(200).json({
        success: true,
        data: {
          totalTelemetry,
          totalDevices,
          onlineDevices,
          activeRules,
          recentAlerts,
          totalAlerts
        }
      });
    } catch (error) {
      next(error);
    }
  }
}
