import express from 'express';
import { InvoiceController } from '../controllers/invoiceController.js';

const router = express.Router();

router.get('/', InvoiceController.getInvoices);
router.get('/:id', InvoiceController.getInvoiceById);
router.post('/', InvoiceController.createInvoice);
router.put('/:id/status', InvoiceController.updateInvoiceStatus);

export default router;
