import { Router } from 'express';
import {
  registerSeller,
  getPickupLocations,
  createSupportTicket,
  updateSellerInventory,
  requestAccountDeletion,
  restoreAccount,
  purgeExpiredDeletions
} from '../controllers/sellerController.js';
import { authenticateJWT, requireRole } from '../middleware/auth.js';
import { ROLES } from '../constants/index.js';

const router = Router();

router.post('/register', authenticateJWT, registerSeller);
router.get('/pickup-locations/:sellerId', authenticateJWT, getPickupLocations);
router.post('/support-tickets', authenticateJWT, requireRole([ROLES.SELLER]), createSupportTicket);
router.post('/inventory', authenticateJWT, requireRole([ROLES.SELLER]), updateSellerInventory);

// Seller 15-Day Account Deletion Lifecycle Routes
router.post('/request-deletion', authenticateJWT, requireRole([ROLES.SELLER]), requestAccountDeletion);
router.post('/restore-account', authenticateJWT, restoreAccount);
router.get('/purge-expired', purgeExpiredDeletions);
router.post('/purge-expired', purgeExpiredDeletions);

export default router;
