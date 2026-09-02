import { Router } from 'express';
import { getOrders, createOrder, updateOrderStatus, deleteOrder } from '../controllers/orderController.js';
import { authenticateJWT, requireRole } from '../middleware/auth.js';
import { ROLES } from '../constants/index.js';

const router = Router();

router.get('/', authenticateJWT, getOrders);
// NOTE: Order creation MUST go through /api/checkout/cod or /api/checkout/verify-payment.
// This raw endpoint is kept for internal/admin use only and requires authentication.
router.post('/', authenticateJWT, createOrder);
router.put('/:id', authenticateJWT, updateOrderStatus);
router.delete('/:id', authenticateJWT, requireRole([ROLES.SUPER_ADMIN, ROLES.SELLER]), deleteOrder);

export default router;
