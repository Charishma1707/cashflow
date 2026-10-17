import express from 'express';
import { BusinessController } from '../controllers/businessController.js';

const router = express.Router();

router.get('/', BusinessController.getSettings);
router.put('/settings', BusinessController.updateSettings);

export default router;
