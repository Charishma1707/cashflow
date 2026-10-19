import express from 'express';
import { submitMilestoneDeliverable, getMilestones } from '../controllers/milestoneController.js';

const router = express.Router({ mergeParams: true });

router.get('/', getMilestones);
router.post('/:milestoneIndex/submit', submitMilestoneDeliverable);

export default router;
