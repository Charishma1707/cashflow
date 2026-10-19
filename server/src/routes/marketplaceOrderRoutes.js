import { Router } from 'express';
import { MarketplaceOrderController } from '../controllers/marketplaceOrderController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/', MarketplaceOrderController.getOrders);
router.post('/', MarketplaceOrderController.createMarketplaceOrder);
router.patch('/:id/transition', authenticate, MarketplaceOrderController.transitionOrderStatus);

export default router;
