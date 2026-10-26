import { Router } from 'express';
import {
  getPublishedSpotlightCampaigns,
  getAdminCampaigns,
  createAdminCampaign,
  uploadEditorialImage,
} from '../controllers/spotlightController.js';
import { authenticateJWT, requireRole } from '../middleware/auth.js';
import { ROLES } from '../constants/index.js';

const router = Router();

// Public Customer & Android Endpoint
router.get('/campaigns', getPublishedSpotlightCampaigns);

// Super Admin Endpoints
router.get('/admin/campaigns', authenticateJWT, requireRole([ROLES.SUPER_ADMIN, ROLES.ADMIN]), getAdminCampaigns);
router.post('/admin/campaigns', authenticateJWT, requireRole([ROLES.SUPER_ADMIN, ROLES.ADMIN]), createAdminCampaign);
router.post('/admin/upload-image', authenticateJWT, requireRole([ROLES.SUPER_ADMIN, ROLES.ADMIN]), uploadEditorialImage);

export default router;
