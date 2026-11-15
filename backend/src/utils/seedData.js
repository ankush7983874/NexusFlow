import { Device } from '../models/device.model.js';
import { Rule } from '../models/rule.model.js';
import { Telemetry } from '../models/telemetry.model.js';

export const seedInitialData = async () => {
  try {
    const deviceCount = await Device.countDocuments();
    if (deviceCount === 0) {
      console.log('[Seed] Seeding sample IoT hardware devices...');
      await Device.insertMany([
        {
          deviceId: 'TURBINE-001',
          name: 'Main Generator Turbine 1',
          type: 'turbine',
          location: 'Power Station - Turbine Hall',
          status: 'online',
          samplingRate: 1000,
          metadata: { firmwareVersion: 'v2.1.0', ipAddress: '10.0.4.12' }
        },
        {
          deviceId: 'TURBINE-002',
          name: 'Auxiliary Turbine 2',
          type: 'turbine',
          location: 'Power Station - Sector 2',
          status: 'online',
          samplingRate: 1000,
          metadata: { firmwareVersion: 'v2.1.0', ipAddress: '10.0.4.13' }
        },
        {
          deviceId: 'TEMP-SENSOR-01',
          name: 'Boiler Chamber Temp Monitor',
          type: 'temperature',
          location: 'Boiler Room - Zone B',
          status: 'online',
          samplingRate: 1000,
          metadata: { firmwareVersion: 'v1.8.4', ipAddress: '10.0.5.20' }
        },
        {
          deviceId: 'HVAC-UNIT-04',
          name: 'Cleanroom HVAC System',
          type: 'hvac',
          location: 'Cleanroom 302',
          status: 'online',
          samplingRate: 2000,
          metadata: { firmwareVersion: 'v3.0.1', ipAddress: '10.0.6.15' }
        }
      ]);
      console.log('[Seed] Devices seeded successfully.');
    }

    const ruleCount = await Rule.countDocuments();
    if (ruleCount === 0) {
      console.log('[Seed] Seeding default visual rule (Turbine -> Moving Average -> Threshold -> SMS Alert)...');
      await Rule.create({
        name: 'Turbine Overheat & Vibration Guard',
        description: 'Monitors Turbine-001 with 5-point moving average filter and triggers SMS alert when temperature > 80°C.',
        active: true,
        graph: {
          nodes: [
            {
              id: 'node-1',
              type: 'turbineSensor',
              position: { x: 50, y: 180 },
              data: {
                label: 'Turbine Sensor',
                deviceId: 'TURBINE-001',
                metric: 'temperature',
                status: 'active'
              }
            },
            {
              id: 'node-2',
              type: 'movingAverage',
              position: { x: 340, y: 180 },
              data: {
                label: '5-Sample Moving Average',
                windowSize: 5
              }
            },
            {
              id: 'node-3',
              type: 'threshold',
              position: { x: 630, y: 180 },
              data: {
                label: 'Threshold > 80°C',
                operator: '>',
                threshold: 80
              }
            },
            {
              id: 'node-4',
              type: 'smsAlert',
              position: { x: 920, y: 180 },
              data: {
                label: 'Factory Floor SMS Alert',
                recipient: '+1 (555) 902-1844',
                message: 'URGENT: Turbine-001 temperature exceeded threshold! Current: {{value}}°C'
              }
            }
          ],
          edges: [
            { id: 'e1-2', source: 'node-1', target: 'node-2', animated: true },
            { id: 'e2-3', source: 'node-2', target: 'node-3', animated: true },
            { id: 'e3-4', source: 'node-3', target: 'node-4', animated: true }
          ],
          viewport: { x: 20, y: 40, zoom: 0.95 }
        }
      });
      console.log('[Seed] Default visual rule created.');
    }

    // Seed some initial telemetry data if collection is empty
    const telemetryCount = await Telemetry.countDocuments();
    if (telemetryCount === 0) {
      console.log('[Seed] Generating initial historical telemetry in native Time-Series collection...');
      const samplePoints = [];
      const now = Date.now();
      const devices = ['TURBINE-001', 'TURBINE-002', 'TEMP-SENSOR-01', 'HVAC-UNIT-04'];

      // Generate 200 data points across the past 2 hours
      for (let i = 200; i >= 0; i--) {
        const time = new Date(now - i * 36000); // 36s intervals
        const devId = devices[i % devices.length];
        samplePoints.push({
          timestamp: time,
          metadata: {
            deviceId: devId,
            sensorType: devId.startsWith('TURBINE') ? 'turbine' : 'multisensor',
            location: 'Factory Floor 1',
            unit: 'metric'
          },
          temperature: Number((65 + Math.sin(i / 10) * 18 + (Math.random() * 6 - 3)).toFixed(1)),
          humidity: Number((45 + Math.cos(i / 8) * 12 + (Math.random() * 4 - 2)).toFixed(1)),
          vibration: Number((2.2 + Math.random() * 1.5).toFixed(2)),
          pressure: Number((101.3 + Math.random() * 2).toFixed(1)),
          voltage: Number((220 + Math.random() * 5).toFixed(1)),
          status: 'nominal'
        });
      }

      await Telemetry.insertMany(samplePoints, { ordered: false });
      console.log(`[Seed] Seeded ${samplePoints.length} time-series records.`);
    }
  } catch (error) {
    console.error('[Seed] Error during seeding:', error.message);
  }
};
