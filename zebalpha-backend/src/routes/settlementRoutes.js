import { Router } from 'express';
import { 
  getSettlementOverview,
  getPayoutRequests,
  getPayoutDetails,
  getSellerFinancialDetails,
  reconcileSinglePayout,
  reconcileAllPayouts,
  getAdminAuditLogs,
  triggerPayoutWorker,
  getSettlements, 
  getSellerSettlements, 
  getSettlementDetails, 
  paySettlement, 
  getRevenueSummary 
} from '../controllers/settlementController.js';
import { authenticateJWT, requireRole } from '../middleware/auth.js';
import { ROLES } from '../constants/index.js';

const router = Router();

// ==============================================================================
// ADMIN SETTLEMENT & PAYOUT VISIBILITY & RECONCILIATION ROUTES
// ==============================================================================

// 1. Overall Settlement Overview (KPIs & Metrics)
router.get('/overview', authenticateJWT, requireRole([ROLES.SUPER_ADMIN]), getSettlementOverview);

// 2. Filterable List of All Payout Requests
router.get('/payouts', authenticateJWT, requireRole([ROLES.SUPER_ADMIN, ROLES.SELLER]), getPayoutRequests);

// 3. Detailed Payout Timeline & Metadata
router.get('/payouts/:id', authenticateJWT, requireRole([ROLES.SUPER_ADMIN, ROLES.SELLER]), getPayoutDetails);

// 4. Detailed Comprehensive Seller Financials
router.get('/seller-financials/:sellerId', authenticateJWT, requireRole([ROLES.SUPER_ADMIN, ROLES.SELLER]), getSellerFinancialDetails);

// 5. Admin-Triggered Reconciliation against Razorpay API
router.post('/reconcile/:id', authenticateJWT, requireRole([ROLES.SUPER_ADMIN]), reconcileSinglePayout);
router.post('/reconcile-all', authenticateJWT, requireRole([ROLES.SUPER_ADMIN]), reconcileAllPayouts);

// 6. Admin Audit Logs
router.get('/audit-logs', authenticateJWT, requireRole([ROLES.SUPER_ADMIN]), getAdminAuditLogs);

// 7. Manual Payout Worker Trigger
router.post('/worker/trigger', authenticateJWT, requireRole([ROLES.SUPER_ADMIN]), triggerPayoutWorker);

// ==============================================================================
// LEGACY WEEKLY SETTLEMENTS & REVENUE SUMMARY
// ==============================================================================
router.get('/', authenticateJWT, requireRole([ROLES.SUPER_ADMIN]), getSettlements);
router.get('/seller/:sellerId', authenticateJWT, requireRole([ROLES.SUPER_ADMIN, ROLES.SELLER]), getSellerSettlements);
router.get('/details/:id', authenticateJWT, requireRole([ROLES.SUPER_ADMIN, ROLES.SELLER]), getSettlementDetails);
router.post('/:id/pay', authenticateJWT, requireRole([ROLES.SUPER_ADMIN]), paySettlement);
router.get('/revenue/summary', authenticateJWT, getRevenueSummary);

export default router;
