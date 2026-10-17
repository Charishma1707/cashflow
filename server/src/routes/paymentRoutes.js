import express from 'express';
import { PaymentController } from '../controllers/paymentController.js';

const router = express.Router();

router.get('/', PaymentController.getPayments);

export default router;
