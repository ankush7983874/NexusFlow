import { TelemetryService } from '../services/telemetry.service.js';

let simulatorInterval = null;
let currentTempTrend = 72;

export class TelemetrySimulator {
  static isRunning() {
    return simulatorInterval !== null;
  }

  static start(intervalMs = 2500) {
    if (simulatorInterval) return;

    console.log(`[Simulator] Starting IoT Telemetry generation loop (${intervalMs}ms)...`);
    const devices = [
      { id: 'TURBINE-001', type: 'turbine', baseTemp: 74, loc: 'Turbine Hall' },
      { id: 'TURBINE-002', type: 'turbine', baseTemp: 68, loc: 'Sector 2' },
      { id: 'TEMP-SENSOR-01', type: 'temperature', baseTemp: 55, loc: 'Boiler Room' },
      { id: 'HVAC-UNIT-04', type: 'hvac', baseTemp: 22, loc: 'Cleanroom 302' }
    ];

    simulatorInterval = setInterval(async () => {
      // Natural slight drift
      currentTempTrend += (Math.random() - 0.49) * 2;
      if (currentTempTrend < 60) currentTempTrend = 62;
      if (currentTempTrend > 95) currentTempTrend = 85;

      const dev = devices[Math.floor(Math.random() * devices.length)];
      const temp = Number((dev.baseTemp + (Math.random() * 6 - 3)).toFixed(1));
      const humidity = Number((48 + (Math.random() * 8 - 4)).toFixed(1));
      const vibration = Number((2.1 + Math.random() * 1.8).toFixed(2));

      try {
        await TelemetryService.ingestSingle({
          deviceId: dev.id,
          sensorType: dev.type,
          location: dev.loc,
          temperature: dev.id === 'TURBINE-001' ? Number(currentTempTrend.toFixed(1)) : temp,
          humidity,
          vibration,
          pressure: 101.4,
          voltage: 220 + Math.random() * 2,
          status: 'nominal'
        });
      } catch (err) {
        console.error('[Simulator] Ingestion tick error:', err.message);
      }
    }, intervalMs);
  }

  static stop() {
    if (simulatorInterval) {
      clearInterval(simulatorInterval);
      simulatorInterval = null;
      console.log('[Simulator] Stopped IoT Telemetry simulator.');
    }
  }

  static async triggerSpike(deviceId = 'TURBINE-001', temp = 88.5) {
    console.log(`[Simulator] Triggering intentional overheat spike for ${deviceId} (${temp}°C)...`);
    return await TelemetryService.ingestSingle({
      deviceId,
      sensorType: 'turbine',
      location: 'Turbine Hall',
      temperature: temp,
      humidity: 42,
      vibration: 5.8,
      pressure: 104.2,
      voltage: 224,
      status: 'warning'
    });
  }
}
