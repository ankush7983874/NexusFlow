import { Router } from 'express';
import { AlertController } from '../controllers/alert.controller.js';

const router = Router();

router.get('/', AlertController.listAlerts);
router.get('/stats', AlertController.getAlertStats);
router.patch('/:id/acknowledge', AlertController.acknowledgeAlert);
router.delete('/', AlertController.clearAlerts);

export default router;
