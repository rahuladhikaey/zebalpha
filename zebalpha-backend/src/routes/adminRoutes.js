import { Router } from 'express';
import { 
  getStoreSettings, 
  updateStoreSetting, 
  getNotifyRequests,
  suspendSeller,
  reactivateSeller,
  softDeleteSeller,
  permanentDeleteSeller
} from '../controllers/adminController.js';
import { authenticateJWT, requireRole } from '../middleware/auth.js';
import { ROLES } from '../constants/index.js';

const router = Router();

router.get('/store-settings', getStoreSettings);
router.post('/store-settings', authenticateJWT, requireRole([ROLES.SUPER_ADMIN]), updateStoreSetting);
router.get('/notify-requests', authenticateJWT, requireRole([ROLES.SUPER_ADMIN]), getNotifyRequests);

// Seller Account Controls
router.post('/sellers/:id/suspend', authenticateJWT, requireRole([ROLES.SUPER_ADMIN]), suspendSeller);
router.post('/sellers/:id/reactivate', authenticateJWT, requireRole([ROLES.SUPER_ADMIN]), reactivateSeller);
router.post('/sellers/:id/soft-delete', authenticateJWT, requireRole([ROLES.SUPER_ADMIN]), softDeleteSeller);
router.post('/sellers/:id/permanent-delete', authenticateJWT, requireRole([ROLES.SUPER_ADMIN]), permanentDeleteSeller);

export default router;
