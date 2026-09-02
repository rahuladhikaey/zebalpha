import { Router } from 'express';
import {
  getUploadParams,
  uploadSellerProductImage,
  deleteSellerProductImage,
  uploadAdminBrandingAsset,
  deleteAdminBrandingAsset
} from '../controllers/uploadController.js';
import { authenticateJWT, requireRole } from '../middleware/auth.js';
import { ROLES } from '../constants/index.js';

const router = Router();

router.get('/params', getUploadParams);
router.post('/seller-product-image', authenticateJWT, requireRole([ROLES.SELLER]), uploadSellerProductImage);
router.delete('/seller-product-image', authenticateJWT, requireRole([ROLES.SELLER]), deleteSellerProductImage);

router.post('/admin-branding-asset', authenticateJWT, requireRole([ROLES.SUPER_ADMIN, ROLES.ADMIN]), uploadAdminBrandingAsset);
router.delete('/admin-branding-asset', authenticateJWT, requireRole([ROLES.SUPER_ADMIN, ROLES.ADMIN]), deleteAdminBrandingAsset);

export default router;
