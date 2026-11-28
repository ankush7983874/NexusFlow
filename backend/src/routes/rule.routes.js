import { Router } from 'express';
import { RuleController, thresholdRuleSchema } from '../controllers/rule.controller.js';
import { validateBody } from '../middleware/validate.middleware.js';

const router = Router();

router.get('/', RuleController.getRules);
router.post('/threshold', validateBody(thresholdRuleSchema), RuleController.createThresholdRule);
router.put('/:id/threshold', validateBody(thresholdRuleSchema), RuleController.updateThresholdRule);
router.post('/', RuleController.createRule);
router.get('/:id', RuleController.getRuleById);
router.put('/:id', RuleController.updateRule);
router.delete('/:id', RuleController.deleteRule);
router.patch('/:id/toggle', RuleController.toggleRule);
router.post('/validate', RuleController.validateGraph);

export default router;
