import { Router } from 'express';
import { 
  getActiveConfig, 
  listVersions, 
  getVersionDetails, 
  createDraft, 
  publishVersion, 
  rollbackVersion, 
  previewImpact,
  getOrderSnapshot
} from '../controllers/financeConfigController.js';
import { authenticateJWT, requireRole } from '../middleware/auth.js';
import { ROLES } from '../constants/index.js';

const router = Router();

// Public / Internal authenticated read of active config
router.get('/config/active', getActiveConfig);

// Superadmin platform finance configuration management
router.get('/config/versions', authenticateJWT, requireRole([ROLES.SUPER_ADMIN]), listVersions);
router.get('/config/versions/:version', authenticateJWT, requireRole([ROLES.SUPER_ADMIN]), getVersionDetails);
router.post('/config/draft', authenticateJWT, requireRole([ROLES.SUPER_ADMIN]), createDraft);
router.post('/config/:id/publish', authenticateJWT, requireRole([ROLES.SUPER_ADMIN]), publishVersion);
router.post('/config/rollback', authenticateJWT, requireRole([ROLES.SUPER_ADMIN]), rollbackVersion);
router.post('/config/preview', authenticateJWT, requireRole([ROLES.SUPER_ADMIN]), previewImpact);

// Order snapshot inspection
router.get('/snapshots/order/:orderId', authenticateJWT, requireRole([ROLES.SUPER_ADMIN, ROLES.SELLER]), getOrderSnapshot);

export default router;
