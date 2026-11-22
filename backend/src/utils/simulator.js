import { TelemetryService } from '../services/telemetry.service.js';

let simulatorInterval = null;
let currentTempTrend = 72;
let currentHumidityTrend = 50;

export class TelemetrySimulator {
  static isRunning() {
    return simulatorInterval !== null;
  }

  static start(intervalMs = 2500) {
    if (simulatorInterval) return;

    console.log(`[Simulator] Starting controlled IoT Telemetry generation loop (${intervalMs}ms)...`);
    const devices = [
      { id: 'TURBINE-001', type: 'turbine', baseTemp: 74, baseHumidity: 45, loc: 'Turbine Hall' },
      { id: 'TURBINE-002', type: 'turbine', baseTemp: 68, baseHumidity: 48, loc: 'Sector 2' },
      { id: 'TEMP-SENSOR-01', type: 'temperature', baseTemp: 55, baseHumidity: 40, loc: 'Boiler Room' },
      { id: 'HVAC-UNIT-04', type: 'hvac', baseTemp: 22, baseHumidity: 55, loc: 'Cleanroom 302' }
    ];

    simulatorInterval = setInterval(async () => {
      // Natural slight drift
      currentTempTrend += (Math.random() - 0.49) * 2;
      if (currentTempTrend < 60) currentTempTrend = 62;
      if (currentTempTrend > 95) currentTempTrend = 85;

      currentHumidityTrend += (Math.random() - 0.49) * 2;
      if (currentHumidityTrend < 30) currentHumidityTrend = 35;
      if (currentHumidityTrend > 80) currentHumidityTrend = 65;

      const dev = devices[Math.floor(Math.random() * devices.length)];
      const temp = Number((dev.baseTemp + (Math.random() * 4 - 2)).toFixed(1));
      const humidity = Number((dev.baseHumidity + (Math.random() * 6 - 3)).toFixed(1));
      const vibration = Number((2.1 + Math.random() * 1.5).toFixed(2));

      try {
        await TelemetryService.ingestSingle({
          deviceId: dev.id,
          sensorType: dev.type,
          location: dev.loc,
          temperature: dev.id === 'TURBINE-001' ? Number(currentTempTrend.toFixed(1)) : temp,
          humidity: dev.id === 'TURBINE-001' ? Number(currentHumidityTrend.toFixed(1)) : humidity,
          vibration,
          pressure: Number((101.3 + Math.random() * 1.2).toFixed(1)),
          voltage: Number((220 + Math.random() * 3).toFixed(1)),
          status: 'nominal',
          isSimulated: true, // Explicitly identified as simulated data
          metadata: {
            isSimulated: true,
            simulated: true,
            generator: 'NexusFlow Demo Sensor Simulator'
          }
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

  static async triggerSpike(deviceId = 'TURBINE-001', temp = 88.5, humidity = 42.0) {
    console.log(`[Simulator] Triggering intentional simulated overheat spike for ${deviceId} (${temp}°C)...`);
    return await TelemetryService.ingestSingle({
      deviceId,
      sensorType: 'turbine',
      location: 'Turbine Hall',
      temperature: temp,
      humidity: humidity,
      vibration: 5.8,
      pressure: 104.2,
      voltage: 224,
      status: 'warning',
      isSimulated: true,
      metadata: {
        isSimulated: true,
        generator: 'Manual Overheat Spike Injector'
      }
    });
  }
}
