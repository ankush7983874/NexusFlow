import { Router } from 'express';
import { TelemetrySimulator } from '../utils/simulator.js';

const router = Router();

router.get('/status', (req, res) => {
  res.status(200).json({
    success: true,
    running: TelemetrySimulator.isRunning()
  });
});

router.post('/start', (req, res) => {
  const { interval } = req.body;
  TelemetrySimulator.start(interval ? Number(interval) : 2500);
  res.status(200).json({
    success: true,
    message: 'Telemetry simulator started',
    running: true
  });
});

router.post('/stop', (req, res) => {
  TelemetrySimulator.stop();
  res.status(200).json({
    success: true,
    message: 'Telemetry simulator stopped',
    running: false
  });
});

router.post('/spike', async (req, res, next) => {
  try {
    const { deviceId, temperature } = req.body;
    const result = await TelemetrySimulator.triggerSpike(
      deviceId || 'TURBINE-001',
      temperature ? Number(temperature) : 88.5
    );
    res.status(200).json({
      success: true,
      message: `Overheat spike triggered for ${deviceId || 'TURBINE-001'}`,
      data: result
    });
  } catch (error) {
    next(error);
  }
});

export default router;
