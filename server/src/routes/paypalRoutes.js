import express from 'express';
import { PayPalController } from '../controllers/paypalController.js';

const router = express.Router();

router.get('/status', PayPalController.getStatus);
router.post('/create-order', PayPalController.createOrder);
router.post('/capture-order', PayPalController.captureOrder);

// Subscriptions & Operational Expenses (Canva, Figma, AWS, etc.)
router.post('/create-expense-order', PayPalController.createExpenseOrder);
router.post('/capture-expense-order', PayPalController.captureExpenseOrder);

// Client Service Requests / Orders
router.post('/create-service-order', PayPalController.createServiceOrder);
router.post('/capture-service-order', PayPalController.captureServiceOrder);

export default router;
