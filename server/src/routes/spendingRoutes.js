import { Router } from 'express';
import { SpendingController } from '../controllers/spendingController.js';

const router = Router();

router.get('/', SpendingController.getSpending);
router.put('/settings', SpendingController.updateSpendingSettings);
router.post('/top-up', SpendingController.topUpAllowance);

export default router;
