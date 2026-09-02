import { Router } from 'express';
import { login, register, refreshToken, getProfile } from '../controllers/authController.js';
import { authenticateJWT } from '../middleware/auth.js';

const router = Router();

router.post('/login', login);
router.post('/register', register);
router.post('/refresh', refreshToken);
router.get('/me', authenticateJWT, getProfile);

export default router;
