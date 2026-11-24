import { Router } from 'express';
import { 
  DeviceController, 
  createDeviceSchema, 
  updateDeviceSchema 
} from '../controllers/device.controller.js';
import { TelemetryController } from '../controllers/telemetry.controller.js';
import { validateBody } from '../middleware/validate.middleware.js';

const router = Router();

router.get('/', DeviceController.listDevices);
router.post('/', validateBody(createDeviceSchema), DeviceController.createDevice);
router.get('/:deviceId', DeviceController.getDeviceById);
router.get('/:deviceId/telemetry', TelemetryController.getHistory);
router.put('/:deviceId', validateBody(updateDeviceSchema), DeviceController.updateDevice);
router.delete('/:deviceId', DeviceController.deleteDevice);

export default router;
