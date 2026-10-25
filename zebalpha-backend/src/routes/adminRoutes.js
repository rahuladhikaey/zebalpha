import { Router } from 'express';
import { 
  getStoreSettings, 
  updateStoreSetting, 
  getNotifyRequests,
  suspendSeller,
  reactivateSeller,
  softDeleteSeller,
  permanentDeleteSeller,
  getAdminCacheMetrics,
  adminTargetedInvalidate
} from '../controllers/adminController.js';
import {
  getAdminCategoryRequests,
  approveCategoryRequest,
  rejectCategoryRequest
} from '../controllers/categoryRequestController.js';
import { authenticateJWT, requireRole } from '../middleware/auth.js';
import { ROLES } from '../constants/index.js';

const router = Router();

router.get('/store-settings', getStoreSettings);
router.post('/store-settings', authenticateJWT, requireRole([ROLES.SUPER_ADMIN]), updateStoreSetting);
router.get('/notify-requests', authenticateJWT, requireRole([ROLES.SUPER_ADMIN]), getNotifyRequests);

// Subcategory Requests Review Engine (Super Admin)
router.get('/category-requests', authenticateJWT, requireRole([ROLES.SUPER_ADMIN]), getAdminCategoryRequests);
router.post('/category-requests/:id/approve', authenticateJWT, requireRole([ROLES.SUPER_ADMIN]), approveCategoryRequest);
router.post('/category-requests/:id/reject', authenticateJWT, requireRole([ROLES.SUPER_ADMIN]), rejectCategoryRequest);

// Cache Monitoring and Targeted Invalidation (Section 26)
router.get('/cache/metrics', authenticateJWT, requireRole([ROLES.SUPER_ADMIN]), getAdminCacheMetrics);
router.post('/cache/invalidate', authenticateJWT, requireRole([ROLES.SUPER_ADMIN]), adminTargetedInvalidate);

// Seller Account Controls
router.post('/sellers/:id/suspend', authenticateJWT, requireRole([ROLES.SUPER_ADMIN]), suspendSeller);
router.post('/sellers/:id/reactivate', authenticateJWT, requireRole([ROLES.SUPER_ADMIN]), reactivateSeller);
router.post('/sellers/:id/soft-delete', authenticateJWT, requireRole([ROLES.SUPER_ADMIN]), softDeleteSeller);
router.post('/sellers/:id/permanent-delete', authenticateJWT, requireRole([ROLES.SUPER_ADMIN]), permanentDeleteSeller);

export default router;
