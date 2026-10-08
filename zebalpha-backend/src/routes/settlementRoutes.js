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
  getRevenueSummary,
  sellerRouteOnboard,
  getSellerRouteSummary,
  getSellerRouteBatches,
  getSellerRouteLedger,
  getRouteBatches,
  adminHoldSettlementBatch,
  adminReleaseSettlementBatch,
  adminReconcileSettlementBatch,
  adminTriggerSettlementSweep
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
// RAZORPAY ROUTE MARKETPLACE SETTLEMENT ROUTES
// ==============================================================================

// Seller Route Onboarding (UPI / Bank Account)
router.post('/route/onboard', authenticateJWT, requireRole([ROLES.SELLER]), sellerRouteOnboard);
router.post('/seller/onboarding', authenticateJWT, requireRole([ROLES.SELLER]), sellerRouteOnboard);

// Seller Financial Overview & Real-Time Minor Units Summary
router.get('/route/summary', authenticateJWT, requireRole([ROLES.SUPER_ADMIN, ROLES.SELLER]), getSellerRouteSummary);
router.get('/seller/summary', authenticateJWT, requireRole([ROLES.SUPER_ADMIN, ROLES.SELLER]), getSellerRouteSummary);

// Seller Route Settlement Batches History
router.get('/route/batches', authenticateJWT, requireRole([ROLES.SUPER_ADMIN, ROLES.SELLER]), getSellerRouteBatches);
router.get('/seller/batches', authenticateJWT, requireRole([ROLES.SUPER_ADMIN, ROLES.SELLER]), getSellerRouteBatches);

// Seller Double-Entry Financial Ledger
router.get('/route/ledger', authenticateJWT, requireRole([ROLES.SUPER_ADMIN, ROLES.SELLER]), getSellerRouteLedger);
router.get('/seller/ledger', authenticateJWT, requireRole([ROLES.SUPER_ADMIN, ROLES.SELLER]), getSellerRouteLedger);

// Super Admin Route Settlement Batches Management
router.get('/batches', authenticateJWT, requireRole([ROLES.SUPER_ADMIN]), getRouteBatches);
router.post('/batches/:id/hold', authenticateJWT, requireRole([ROLES.SUPER_ADMIN]), adminHoldSettlementBatch);
router.post('/batches/:id/release', authenticateJWT, requireRole([ROLES.SUPER_ADMIN]), adminReleaseSettlementBatch);
router.post('/batches/:id/reconcile', authenticateJWT, requireRole([ROLES.SUPER_ADMIN]), adminReconcileSettlementBatch);
router.post('/sweep/trigger', authenticateJWT, requireRole([ROLES.SUPER_ADMIN]), adminTriggerSettlementSweep);

// ==============================================================================
// LEGACY WEEKLY SETTLEMENTS & REVENUE SUMMARY
// ==============================================================================
router.get('/', authenticateJWT, requireRole([ROLES.SUPER_ADMIN]), getSettlements);
router.get('/seller/:sellerId', authenticateJWT, requireRole([ROLES.SUPER_ADMIN, ROLES.SELLER]), getSellerSettlements);
router.get('/details/:id', authenticateJWT, requireRole([ROLES.SUPER_ADMIN, ROLES.SELLER]), getSettlementDetails);
router.post('/:id/pay', authenticateJWT, requireRole([ROLES.SUPER_ADMIN]), paySettlement);
router.get('/revenue/summary', authenticateJWT, getRevenueSummary);

export default router;

