import { Router } from 'express';
import { DisputeController } from '../controllers/disputeController.js';

const router = Router();

router.get('/:orderId', DisputeController.getOrderDispute);
router.post('/:orderId/mediate', DisputeController.mediateOrderDispute);

export default router;
