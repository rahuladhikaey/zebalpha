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

// Return & Cancellation Endpoints
router.post('/:id/cancel', cancelOrder);
router.post('/cancel', (req, res, next) => {
  req.params.id = req.body.orderId || req.body.id || req.body.order_number;
  return cancelOrder(req, res, next);
});

router.post('/:id/return', requestReturn);
router.post('/return', (req, res, next) => {
  req.params.id = req.body.orderId || req.body.id || req.body.order_number;
  return requestReturn(req, res, next);
});

router.get('/returns', getOrderReturns);
router.get('/returns/:id', getReturnDetails);
router.get('/:id/return-details', getReturnDetails);

router.patch('/returns/:id/status', updateReturnStatus);
router.put('/returns/:id/status', updateReturnStatus);
router.post('/returns/:id/refund', processOrderRefund);
router.post('/:id/refund', processOrderRefund);

export default router;

