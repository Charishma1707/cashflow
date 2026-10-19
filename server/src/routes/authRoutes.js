import { Router } from 'express';
import { AuthController } from '../controllers/authController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = Router();

router.post('/register/customer', AuthController.registerCustomer);
router.post('/register/business', AuthController.registerBusiness);
router.post('/login', AuthController.login);
router.get('/me', authenticate, AuthController.getMe);
router.get('/users', AuthController.listUsers);

export default router;
