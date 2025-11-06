/**
 * 🔐 Auth Routes
 */

import { Router } from 'express';
import * as authController from '../controllers/authController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/verify', authController.verifyToken);
router.get('/me', authenticate, authController.getCurrentUser);

export default router;
