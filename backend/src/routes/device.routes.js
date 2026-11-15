import { Router } from 'express';
import { DeviceController } from '../controllers/device.controller.js';

const router = Router();

router.get('/', DeviceController.listDevices);
router.post('/', DeviceController.createDevice);
router.get('/:deviceId', DeviceController.getDeviceById);
router.put('/:deviceId', DeviceController.updateDevice);
router.delete('/:deviceId', DeviceController.deleteDevice);

export default router;
