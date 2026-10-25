import { Router } from 'express';
import {
  registerSeller,
  getPickupLocations,
  createSupportTicket,
  updateSellerInventory,
  requestAccountDeletion,
  restoreAccount,
  purgeExpiredDeletions,
  getSellerMetrics
} from '../controllers/sellerController.js';
import {
  submitCategoryRequest,
  getSellerCategoryRequests
} from '../controllers/categoryRequestController.js';
import { authenticateJWT, requireRole } from '../middleware/auth.js';
import { ROLES } from '../constants/index.js';

const router = Router();

router.post('/register', authenticateJWT, registerSeller);
router.get('/pickup-locations/:sellerId', authenticateJWT, getPickupLocations);
router.post('/support-tickets', authenticateJWT, requireRole([ROLES.SELLER]), createSupportTicket);
router.post('/inventory', authenticateJWT, requireRole([ROLES.SELLER]), updateSellerInventory);

// Seller Subcategory Request & Proposal Engine
router.post('/category-requests', authenticateJWT, requireRole([ROLES.SELLER]), submitCategoryRequest);
router.get('/category-requests', authenticateJWT, requireRole([ROLES.SELLER]), getSellerCategoryRequests);

// Canonical Seller Analytics & Financial Metrics
router.get('/metrics', authenticateJWT, requireRole([ROLES.SELLER, ROLES.SUPER_ADMIN]), getSellerMetrics);
router.get('/metrics/:sellerId', authenticateJWT, requireRole([ROLES.SELLER, ROLES.SUPER_ADMIN]), getSellerMetrics);

// Seller 15-Day Account Deletion Lifecycle Routes
router.post('/request-deletion', authenticateJWT, requireRole([ROLES.SELLER]), requestAccountDeletion);
router.post('/restore-account', authenticateJWT, requireRole([ROLES.SELLER]), restoreAccount);
router.post('/purge-expired', authenticateJWT, requireRole([ROLES.SUPER_ADMIN]), purgeExpiredDeletions);

export default router;
