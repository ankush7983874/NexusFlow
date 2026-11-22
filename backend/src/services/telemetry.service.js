import { Telemetry } from '../models/telemetry.model.js';
import { Device } from '../models/device.model.js';
import { ruleEngine } from './ruleEngine.service.js';
import { broadcastTelemetry } from '../sockets/socketManager.js';

export class TelemetryService {
  /**
   * Ingest a single telemetry reading
   */
  static async ingestSingle(payload) {
    const targetDeviceId = String(payload.deviceId || '').trim().toUpperCase();
    if (!targetDeviceId) {
      const err = new Error('deviceId is required and cannot be empty');
      err.statusCode = 400;
      throw err;
    }

    // Validate that device exists in the system
    const device = await Device.findOne({ deviceId: targetDeviceId });
    if (!device) {
      const err = new Error(`Device '${targetDeviceId}' is not registered. Please register the device before ingesting telemetry.`);
      err.statusCode = 404;
      throw err;
    }

    let parsedTimestamp = new Date();
    if (payload.timestamp) {
      parsedTimestamp = new Date(payload.timestamp);
      if (isNaN(parsedTimestamp.getTime())) {
        const err = new Error('Malformed timestamp. Expected valid ISO date format.');
        err.statusCode = 400;
        throw err;
      }
    }

    const isSimulated = Boolean(
      payload.isSimulated ||
      (payload.metadata && payload.metadata.isSimulated) ||
      payload.simulated
    );

    const doc = {
      timestamp: parsedTimestamp,
      metadata: {
        deviceId: device.deviceId,
        sensorType: payload.sensorType || (payload.metadata && payload.metadata.sensorType) || device.type,
        location: payload.location || (payload.metadata && payload.metadata.location) || device.location,
        unit: payload.unit || (payload.metadata && payload.metadata.unit) || 'metric',
        isSimulated
      },
      temperature: payload.temperature !== undefined && payload.temperature !== null ? Number(payload.temperature) : undefined,
      humidity: payload.humidity !== undefined && payload.humidity !== null ? Number(payload.humidity) : undefined,
      vibration: payload.vibration !== undefined && payload.vibration !== null ? Number(payload.vibration) : undefined,
      pressure: payload.pressure !== undefined && payload.pressure !== null ? Number(payload.pressure) : undefined,
      voltage: payload.voltage !== undefined && payload.voltage !== null ? Number(payload.voltage) : undefined,
      status: payload.status || 'nominal'
    };

    const saved = await Telemetry.create(doc);

    // Update Device lastSeen & status
    await Device.updateOne(
      { deviceId: device.deviceId },
      {
        $set: {
          lastSeen: doc.timestamp,
          status: doc.status === 'nominal' ? 'online' : doc.status
        }
      }
    );

    // Feed to live rule engine & broadcast to WebSockets
    const savedObj = saved.toObject();
    ruleEngine.feedTelemetry(savedObj);
    broadcastTelemetry(savedObj);

    return savedObj;
  }

  /**
   * High-throughput Batch Ingestion
   */
  static async ingestBatch(rawInput) {
    const records = Array.isArray(rawInput) ? rawInput : (rawInput && rawInput.records);

    if (!Array.isArray(records) || records.length === 0) {
      const err = new Error('Batch payload must contain a non-empty array of telemetry readings.');
      err.statusCode = 400;
      throw err;
    }

    // Verify all referenced deviceIds
    const requestedDeviceIds = [...new Set(records.map(r => String(r.deviceId || (r.metadata && r.metadata.deviceId) || '').trim().toUpperCase()))];
    const registeredDevices = await Device.find({ deviceId: { $in: requestedDeviceIds } }).lean();
    const registeredMap = new Map(registeredDevices.map(d => [d.deviceId, d]));

    const unregistered = requestedDeviceIds.filter(id => !registeredMap.has(id));
    if (unregistered.length > 0) {
      const err = new Error(`Batch contains unregistered device(s): ${unregistered.join(', ')}. Register devices first.`);
      err.statusCode = 404;
      throw err;
    }

    const startTime = performance.now();
    const formattedDocs = records.map((r, idx) => {
      const dId = String(r.deviceId || (r.metadata && r.metadata.deviceId)).trim().toUpperCase();
      const dev = registeredMap.get(dId);

      let parsedTime = new Date();
      if (r.timestamp) {
        parsedTime = new Date(r.timestamp);
        if (isNaN(parsedTime.getTime())) {
          throw new Error(`Record at index ${idx} contains an invalid timestamp.`);
        }
      }

      const isSimulated = Boolean(
        r.isSimulated ||
        (r.metadata && r.metadata.isSimulated) ||
        r.simulated
      );

      return {
        timestamp: parsedTime,
        metadata: {
          deviceId: dId,
          sensorType: r.sensorType || (r.metadata && r.metadata.sensorType) || dev.type,
          location: r.location || (r.metadata && r.metadata.location) || dev.location,
          unit: r.unit || (r.metadata && r.metadata.unit) || 'metric',
          isSimulated
        },
        temperature: r.temperature !== undefined && r.temperature !== null ? Number(r.temperature) : undefined,
        humidity: r.humidity !== undefined && r.humidity !== null ? Number(r.humidity) : undefined,
        vibration: r.vibration !== undefined && r.vibration !== null ? Number(r.vibration) : undefined,
        pressure: r.pressure !== undefined && r.pressure !== null ? Number(r.pressure) : undefined,
        voltage: r.voltage !== undefined && r.voltage !== null ? Number(r.voltage) : undefined,
        status: r.status || 'nominal'
      };
    });

    // Bulk insert into native MongoDB Time-Series collection
    const result = await Telemetry.insertMany(formattedDocs, { ordered: false });
    const duration = performance.now() - startTime;

    // Broadcast latest sample for UI responsiveness and feed to rule engine
    const sampleRecord = formattedDocs[formattedDocs.length - 1];
    broadcastTelemetry(sampleRecord);

    for (const doc of formattedDocs) {
      ruleEngine.feedTelemetry(doc);
    }

    // Update registered devices status & lastSeen
    const now = new Date();
    await Device.updateMany(
      { deviceId: { $in: requestedDeviceIds } },
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
      filter['metadata.deviceId'] = deviceId.toUpperCase();
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
      match['metadata.deviceId'] = deviceId.toUpperCase();
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
