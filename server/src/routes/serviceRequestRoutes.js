import express from 'express';
import { ServiceRequestController } from '../controllers/serviceRequestController.js';

const router = express.Router();

router.get('/', ServiceRequestController.getAll);
router.get('/:id', ServiceRequestController.getById);
router.post('/', ServiceRequestController.create);
router.patch('/:id/status', ServiceRequestController.updateStatus);
router.post('/:id/convert-to-invoice', ServiceRequestController.convertToInvoice);

export default router;
