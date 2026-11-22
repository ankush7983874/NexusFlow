import { Router } from 'express';
import {
  TelemetryController,
  singleTelemetrySchema,
  batchTelemetrySchema
} from '../controllers/telemetry.controller.js';
import { validateBody } from '../middleware/validate.middleware.js';

const router = Router();

// Ingestion endpoints
router.post('/', validateBody(singleTelemetrySchema), TelemetryController.ingestSingle);
router.post('/batch', validateBody(batchTelemetrySchema), TelemetryController.ingestBatch);

// Query endpoints
router.get('/history', TelemetryController.getHistory);
router.get('/aggregations', TelemetryController.getAggregations);
router.get('/stats', TelemetryController.getOverviewStats);

export default router;
