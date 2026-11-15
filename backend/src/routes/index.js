import { Router } from 'express';
import telemetryRoutes from './telemetry.routes.js';
import ruleRoutes from './rule.routes.js';
import deviceRoutes from './device.routes.js';
import alertRoutes from './alert.routes.js';
import simulatorRoutes from './simulator.routes.js';

const router = Router();

router.use('/telemetry', telemetryRoutes);
router.use('/rules', ruleRoutes);
router.use('/devices', deviceRoutes);
router.use('/alerts', alertRoutes);
router.use('/simulator', simulatorRoutes);

router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'NexusFlow Engine'
  });
});

export default router;
