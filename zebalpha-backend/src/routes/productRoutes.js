import { Router } from 'express';
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory
} from '../controllers/productController.js';
import { authenticateJWT, requireRole } from '../middleware/auth.js';
import { ROLES } from '../constants/index.js';

const router = Router();

// Public Product & Category routes
router.get('/', getProducts);
router.get('/categories', getCategories);
router.get('/:id', getProductById);

// Admin / Seller protected routes
router.post('/', authenticateJWT, requireRole([ROLES.SUPER_ADMIN, ROLES.SELLER]), createProduct);
router.put('/:id', authenticateJWT, requireRole([ROLES.SUPER_ADMIN, ROLES.SELLER]), updateProduct);
router.delete('/:id', authenticateJWT, requireRole([ROLES.SUPER_ADMIN, ROLES.SELLER]), deleteProduct);

router.post('/categories', authenticateJWT, requireRole([ROLES.SUPER_ADMIN]), createCategory);
router.put('/categories/:id', authenticateJWT, requireRole([ROLES.SUPER_ADMIN]), updateCategory);
router.delete('/categories/:id', authenticateJWT, requireRole([ROLES.SUPER_ADMIN]), deleteCategory);

export default router;
