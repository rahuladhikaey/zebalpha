/**
 * ZEBALPHA — SELLER PAYOUT ACCOUNT & RAZORPAYX ROUTES
 */

import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  saveUpiPayoutAccount,
  reverifyUpiPayoutAccount,
  getPayoutAccount,
  executeSellerPayout,
  adminReviewPayoutAccount
} from '../controllers/payoutAccountController.js';
import { authenticateJWT, requireRole } from '../middleware/auth.js';
import { ROLES } from '../constants/index.js';
import { createResilientRateLimitStore } from '../services/rateLimiter/redisStore.js';

const router = Router();

// Rate limiter for verification attempts (prevents UPI enumeration / harvesting)
const upiVerificationLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 10, // Max 10 attempts per 10 minutes
  standardHeaders: true,
  legacyHeaders: false,
  store: createResilientRateLimitStore({ windowMs: 10 * 60 * 1000, prefix: 'rl:upi-verify:' }),
  message: {
    success: false,
    message: 'Too many UPI verification attempts. Please wait 10 minutes before retrying.'
  }
});

// Rate limiter for payout execution
const payoutExecutionLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  store: createResilientRateLimitStore({ windowMs: 10 * 60 * 1000, prefix: 'rl:payout-exec:' }),
  message: {
    success: false,
    message: 'Payout request limit reached. Please wait 10 minutes before requesting another payout.'
  }
});

// ==============================================================================
// SELLER UPI PAYOUT ACCOUNT ROUTES
// ==============================================================================

// 1. Get current active UPI payout account & status
router.get(
  '/',
  authenticateJWT,
  requireRole([ROLES.SELLER, ROLES.SUPER_ADMIN, 'admin']),
  getPayoutAccount
);

// 2. Add or update UPI ID
router.post(
  '/upi',
  authenticateJWT,
  requireRole([ROLES.SELLER, ROLES.SUPER_ADMIN, 'admin']),
  upiVerificationLimiter,
  saveUpiPayoutAccount
);

// 3. Re-verify active UPI account
router.post(
  '/upi/verify',
  authenticateJWT,
  requireRole([ROLES.SELLER, ROLES.SUPER_ADMIN, 'admin']),
  upiVerificationLimiter,
  reverifyUpiPayoutAccount
);

// 4. Execute on-demand or automated payout to verified UPI
router.post(
  '/execute-payout',
  authenticateJWT,
  requireRole([ROLES.SELLER, ROLES.SUPER_ADMIN, 'admin']),
  payoutExecutionLimiter,
  executeSellerPayout
);

// ==============================================================================
// ADMIN REVIEW ROUTES
// ==============================================================================

// 5. Admin manual override/review for name mismatches
router.post(
  '/admin/review/:sellerId',
  authenticateJWT,
  requireRole([ROLES.SUPER_ADMIN, 'admin']),
  adminReviewPayoutAccount
);

export default router;
