import { Router } from 'express';
import { PayPalWebhookController } from '../controllers/paypalWebhookController.js';

const router = Router();

// Public PayPal webhook receiver endpoint
router.post('/paypal', PayPalWebhookController.handleWebhook);

export default router;
