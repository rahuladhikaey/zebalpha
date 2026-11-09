import { Router } from 'express';
import { getBootstrapStatus, bootstrapFounder } from '../controllers/founderBootstrapController.js';
import { authenticateJWT } from '../middleware/auth.js';

const router = Router();

// Public/Safe endpoint to inspect if Founder Vault is initialized/sealed
router.get('/status', getBootstrapStatus);

// Protected endpoint: Caller must be authenticated via Supabase JWT
router.post('/bootstrap', authenticateJWT, bootstrapFounder);

export default router;

