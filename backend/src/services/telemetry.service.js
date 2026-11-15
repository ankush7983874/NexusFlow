import { Telemetry } from '../models/telemetry.model.js';
import { Device } from '../models/device.model.js';
import { ruleEngine } from './ruleEngine.service.js';
import { broadcastTelemetry } from '../sockets/socketManager.js';

export class TelemetryService {
  /**
   * Ingest a single telemetry reading
   */
  static async ingestSingle(payload) {
    const doc = {
      timestamp: payload.timestamp ? new Date(payload.timestamp) : new Date(),
      metadata: {
        deviceId: payload.deviceId,
        sensorType: payload.sensorType || 'multisensor',
        location: payload.location || 'Factory Floor 1',
        unit: payload.unit || 'metric'
      },
      temperature: payload.temperature !== undefined ? Number(payload.temperature) : undefined,
      humidity: payload.humidity !== undefined ? Number(payload.humidity) : undefined,
      vibration: payload.vibration !== undefined ? Number(payload.vibration) : undefined,
      pressure: payload.pressure !== undefined ? Number(payload.pressure) : undefined,
      voltage: payload.voltage !== undefined ? Number(payload.voltage) : undefined,
      status: payload.status || 'nominal'
    };

    const saved = await Telemetry.create(doc);

    // Update Device lastSeen & status
    await Device.findOneAndUpdate(
      { deviceId: doc.metadata.deviceId },
      {
        lastSeen: doc.timestamp,
        status: doc.status === 'nominal' ? 'online' : doc.status
      },
      { upsert: true }
    );

    // Feed to live rule engine & broadcast to WebSockets
    ruleEngine.feedTelemetry(saved.toObject());
    broadcastTelemetry(saved.toObject());

    return saved;
  }

  /**
   * High-throughput Batch Ingestion
   */
  static async ingestBatch(records) {
    if (!Array.isArray(records) || records.length === 0) {
      return { insertedCount: 0, timeTakenMs: 0 };
    }

    const startTime = performance.now();
    const formattedDocs = records.map(r => ({
      timestamp: r.timestamp ? new Date(r.timestamp) : new Date(),
      metadata: {
        deviceId: r.deviceId || (r.metadata && r.metadata.deviceId) || 'DEVICE-UNKNOWN',
        sensorType: r.sensorType || (r.metadata && r.metadata.sensorType) || 'multisensor',
        location: r.location || (r.metadata && r.metadata.location) || 'Main Factory',
        unit: r.unit || (r.metadata && r.metadata.unit) || 'metric'
      },
      temperature: r.temperature !== undefined ? Number(r.temperature) : undefined,
      humidity: r.humidity !== undefined ? Number(r.humidity) : undefined,
      vibration: r.vibration !== undefined ? Number(r.vibration) : undefined,
      pressure: r.pressure !== undefined ? Number(r.pressure) : undefined,
      voltage: r.voltage !== undefined ? Number(r.voltage) : undefined,
      status: r.status || 'nominal'
    }));

    // Perform direct MongoDB bulk/insertMany with ordered: false for maximum throughput
    const result = await Telemetry.insertMany(formattedDocs, { ordered: false });
    const duration = performance.now() - startTime;

    // Stream records into rule engine and broadcast sample for UI responsiveness
    // For large batches, process rules for each and throttle UI socket broadcasts
    const sampleRecord = formattedDocs[formattedDocs.length - 1];
    broadcastTelemetry(sampleRecord);

    for (const doc of formattedDocs) {
      ruleEngine.feedTelemetry(doc);
    }

    // Update distinct devices
    const deviceIds = [...new Set(formattedDocs.map(d => d.metadata.deviceId))];
    const now = new Date();
    await Device.updateMany(
      { deviceId: { $in: deviceIds } },
      { $set: { lastSeen: now, status: 'online' } }
    );

    return {
      insertedCount: result.length,
      timeTakenMs: Math.round(duration),
      throughputPerSec: Math.round((result.length / (duration / 1000)) || 0)
    };
  }

  /**
   * Query telemetry history with optional filters and time-series aggregation
   */
  static async queryHistory({ deviceId, sensorType, startDate, endDate, limit = 100, page = 1 }) {
    const filter = {};
    if (deviceId && deviceId !== 'all') {
      filter['metadata.deviceId'] = deviceId;
    }
    if (sensorType && sensorType !== 'all') {
      filter['metadata.sensorType'] = sensorType;
    }
    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.$gte = new Date(startDate);
      if (endDate) filter.timestamp.$lte = new Date(endDate);
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [data, totalCount] = await Promise.all([
      Telemetry.find(filter)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Telemetry.countDocuments(filter)
    ]);

    return {
      data,
      totalCount,
      page: Number(page),
      totalPages: Math.ceil(totalCount / limit)
    };
  }

  /**
   * Aggregates telemetry data into time buckets (e.g. 5m, 1h)
   */
  static async getAggregations({ deviceId, hours = 24 }) {
    const since = new Date(Date.now() - hours * 3600 * 1000);
    const match = { timestamp: { $gte: since } };
    if (deviceId && deviceId !== 'all') {
      match['metadata.deviceId'] = deviceId;
    }

    const stats = await Telemetry.aggregate([
      { $match: match },
      {
        $group: {
          _id: {
            year: { $year: '$timestamp' },
            month: { $month: '$timestamp' },
            day: { $dayOfMonth: '$timestamp' },
            hour: { $hour: '$timestamp' }
          },
          avgTemp: { $avg: '$temperature' },
          maxTemp: { $max: '$temperature' },
          minTemp: { $min: '$temperature' },
          avgHumidity: { $avg: '$humidity' },
          avgVibration: { $avg: '$vibration' },
          count: { $sum: 1 },
          timestamp: { $first: '$timestamp' }
        }
      },
      { $sort: { timestamp: 1 } },
      { $limit: 100 }
    ]);

    return stats;
  }
}
