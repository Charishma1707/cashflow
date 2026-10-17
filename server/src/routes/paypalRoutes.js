import express from 'express';
import { PayPalController } from '../controllers/paypalController.js';

const router = express.Router();

router.get('/status', PayPalController.getStatus);
router.post('/create-order', PayPalController.createOrder);
router.post('/capture-order', PayPalController.captureOrder);

export default router;
