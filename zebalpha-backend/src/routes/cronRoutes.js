import { Router } from 'express';
import crypto from 'crypto';
import { autoCompleteDeliveredOrders } from '../jobs/index.js';
import { purgeExpiredDeletions } from '../controllers/sellerController.js';
import { HTTP_STATUS } from '../constants/index.js';

const router = Router();

/**
 * Middleware: Verify CRON_SECRET strictly using constant-time comparison
 */
const verifyCronSecret = (req, res, next) => {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Server error: CRON_SECRET is not configured on the server.'
    });
  }

  const rawHeader = req.headers['authorization'] || req.headers['x-cron-secret'] || '';
  const provided = rawHeader.startsWith('Bearer ') ? rawHeader.slice(7).trim() : rawHeader.trim();

  if (!provided) {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({
      success: false,
      message: 'Unauthorized: Missing cron authentication secret.'
    });
  }

  const expectedBuf = Buffer.from(cronSecret);
  const providedBuf = Buffer.from(provided);

  if (expectedBuf.length !== providedBuf.length || !crypto.timingSafeEqual(expectedBuf, providedBuf)) {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({
      success: false,
      message: 'Unauthorized: Invalid cron authentication secret.'
    });
  }

  next();
};

// -------------------------------------------------------------
// 🛒 CUSTOMER CRON ENDPOINTS (POST only to prevent crawler execution)
// -------------------------------------------------------------
router.post('/customer/auto-complete-orders', verifyCronSecret, async (req, res, next) => {
  try {
    await autoCompleteDeliveredOrders();
    res.status(HTTP_STATUS.OK).json({
      success: true,
      role: 'customer',
      message: 'Customer delivered orders auto-completion executed successfully.'
    });
  } catch (err) {
    next(err);
  }
});

// -------------------------------------------------------------
// 🏪 SELLER CRON ENDPOINTS (POST only)
// -------------------------------------------------------------
router.post('/seller/purge-expired', verifyCronSecret, async (req, res, next) => {
  try {
    await purgeExpiredDeletions(req, res, next);
  } catch (err) {
    next(err);
  }
});

export default router;
