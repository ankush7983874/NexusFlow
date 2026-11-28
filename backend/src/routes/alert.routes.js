import { Router } from 'express';
import { AlertController } from '../controllers/alert.controller.js';

const router = Router();

router.get('/', AlertController.listAlerts);
router.get('/stats', AlertController.getAlertStats);
router.get('/:id', AlertController.getAlertById);
router.patch('/:id/acknowledge', AlertController.acknowledgeAlert);
router.patch('/:id/resolve', AlertController.resolveAlert);
router.delete('/', AlertController.clearAlerts);

export default router;
