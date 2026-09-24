import { Router } from 'express';
import { 
  getOrders, 
  createOrder, 
  updateOrderStatus, 
  deleteOrder,
  cancelOrder,
  requestReturn,
  getOrderReturns,
  getReturnDetails,
  updateReturnStatus,
  processOrderRefund
} from '../controllers/orderController.js';
import { authenticateJWT, requireRole } from '../middleware/auth.js';
import { ROLES } from '../constants/index.js';

const router = Router();

router.get('/', authenticateJWT, getOrders);
// NOTE: Order creation MUST go through /api/checkout/cod or /api/checkout/verify-payment.
// This raw endpoint is kept for internal/admin use only and requires authentication.
router.post('/', authenticateJWT, requireRole([ROLES.SUPER_ADMIN]), createOrder);
router.put('/:id', authenticateJWT, requireRole([ROLES.SUPER_ADMIN, ROLES.SELLER]), updateOrderStatus);
router.delete('/:id', authenticateJWT, requireRole([ROLES.SUPER_ADMIN]), deleteOrder);

// Return & Cancellation Endpoints (Require JWT & Ownership Enforcement)
router.post('/:id/cancel', authenticateJWT, cancelOrder);
router.post('/cancel', authenticateJWT, (req, res, next) => {
  req.params.id = req.body.orderId || req.body.id || req.body.order_number;
  return cancelOrder(req, res, next);
});

router.post('/:id/return', authenticateJWT, requestReturn);
router.post('/return', authenticateJWT, (req, res, next) => {
  req.params.id = req.body.orderId || req.body.id || req.body.order_number;
  return requestReturn(req, res, next);
});

router.get('/returns', authenticateJWT, getOrderReturns);
router.get('/returns/:id', authenticateJWT, getReturnDetails);
router.get('/:id/return-details', authenticateJWT, getReturnDetails);

// Super Admin Only: Approve/Reject Returns & Execute Monetary Refunds
router.patch('/returns/:id/status', authenticateJWT, requireRole([ROLES.SUPER_ADMIN]), updateReturnStatus);
router.put('/returns/:id/status', authenticateJWT, requireRole([ROLES.SUPER_ADMIN]), updateReturnStatus);
router.post('/returns/:id/refund', authenticateJWT, requireRole([ROLES.SUPER_ADMIN]), processOrderRefund);
router.post('/:id/refund', authenticateJWT, requireRole([ROLES.SUPER_ADMIN]), processOrderRefund);

export default router;

