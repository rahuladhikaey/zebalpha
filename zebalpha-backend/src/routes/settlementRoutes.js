import { Router } from 'express';
import { 
  getSettlements, 
  getSellerSettlements, 
  getSettlementDetails, 
  paySettlement, 
  getRevenueSummary 
} from '../controllers/settlementController.js';
import { authenticateJWT, requireRole } from '../middleware/auth.js';
import { ROLES } from '../constants/index.js';

const router = Router();

// Settlements Management
router.get('/', authenticateJWT, requireRole([ROLES.SUPER_ADMIN]), getSettlements);
router.get('/seller/:sellerId', authenticateJWT, requireRole([ROLES.SUPER_ADMIN, ROLES.SELLER]), getSellerSettlements);
router.get('/details/:id', authenticateJWT, requireRole([ROLES.SUPER_ADMIN, ROLES.SELLER]), getSettlementDetails);
router.post('/:id/pay', authenticateJWT, requireRole([ROLES.SUPER_ADMIN]), paySettlement);

// Revenue Analytics Summary
router.get('/revenue/summary', authenticateJWT, getRevenueSummary);

export default router;
