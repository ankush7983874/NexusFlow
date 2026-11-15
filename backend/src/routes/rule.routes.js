import { Router } from 'express';
import { RuleController } from '../controllers/rule.controller.js';

const router = Router();

router.get('/', RuleController.getRules);
router.post('/', RuleController.createRule);
router.get('/:id', RuleController.getRuleById);
router.put('/:id', RuleController.updateRule);
router.delete('/:id', RuleController.deleteRule);
router.patch('/:id/toggle', RuleController.toggleRule);
router.post('/validate', RuleController.validateGraph);

export default router;
