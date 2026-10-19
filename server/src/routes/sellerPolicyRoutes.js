import { Router } from 'express';
import { SellerPolicyController } from '../controllers/sellerPolicyController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authenticate);

router.get('/me', SellerPolicyController.getMyPolicy);
router.put('/me', SellerPolicyController.updatePolicy);
router.post('/evaluate-offer', SellerPolicyController.evaluateOffer);

export default router;
