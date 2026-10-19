import { Router } from 'express';
import { OrderController } from '../controllers/orderController.js';

const router = Router();

router.get('/', OrderController.getOrders);
router.get('/:id', OrderController.getOrderById);
router.post('/', OrderController.createOrder);
router.post('/:id/complete', OrderController.completeOrderPayment);
router.patch('/:id/fulfillment', OrderController.updateFulfillmentStatus);

export default router;
