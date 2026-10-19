import { Router } from 'express';
import { SpendingPolicyController } from '../controllers/spendingPolicyController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authenticate);

// Policy config & status
router.get('/me', SpendingPolicyController.getMyPolicy);
router.put('/me', SpendingPolicyController.updatePolicy);
router.patch('/emergency-stop', SpendingPolicyController.toggleEmergencyStop);

// Intent evaluation
router.post('/evaluate', SpendingPolicyController.evaluateIntent);

// Approvals queue
router.get('/approvals', SpendingPolicyController.listApprovals);
router.post('/approvals/:id/decide', SpendingPolicyController.decideApproval);
router.post('/approvals/:id/execute', SpendingPolicyController.executeApproval);

export default router;
