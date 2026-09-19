import { Router } from 'express';
import {
  getSellerAddresses,
  createSellerAddress,
  updateSellerAddress,
  setDefaultAddress,
  getAllAdminPickupAddresses,
  approvePickupAddress,
  rejectPickupAddress,
  retryShiprocketSync
} from '../controllers/pickupAddressController.js';
import { authenticateJWT, requireRole } from '../middleware/auth.js';
import { ROLES } from '../constants/index.js';

const router = Router();

// Seller Pickup Address Endpoints
router.get('/seller/:sellerId', authenticateJWT, getSellerAddresses);
router.post('/seller/:sellerId', authenticateJWT, createSellerAddress);
router.put('/:id', authenticateJWT, updateSellerAddress);
router.patch('/seller/:sellerId/:id/default', authenticateJWT, setDefaultAddress);

// SuperAdmin Pickup Approval & Sync Endpoints
router.get('/admin/all', authenticateJWT, requireRole([ROLES.SUPER_ADMIN]), getAllAdminPickupAddresses);
router.post('/admin/:id/approve', authenticateJWT, requireRole([ROLES.SUPER_ADMIN]), approvePickupAddress);
router.post('/admin/:id/reject', authenticateJWT, requireRole([ROLES.SUPER_ADMIN]), rejectPickupAddress);
router.post('/:id/sync-shiprocket', authenticateJWT, retryShiprocketSync);

export default router;
