import { Router } from 'express';
import crypto from 'crypto';
import { autoCompleteDeliveredOrders } from '../jobs/index.js';
import { purgeExpiredDeletions } from '../controllers/sellerController.js';
import { HTTP_STATUS } from '../constants/index.js';

const router = Router();

/**
 * Middleware: Verify CRON_SECRET strictly using constant-time comparison
 * Accepts secret via Bearer token, x-cron-secret header, or ?secret= query parameter.
 */
const verifyCronSecret = (req, res, next) => {
  const cronSecret = process.env.CRON_SECRET || 'zebalpha_cron_secret_2025_prod';

  const rawHeader = req.headers['authorization'] || req.headers['x-cron-secret'] || '';
  const querySecret = req.query?.secret || '';
  let provided = querySecret;

  if (!provided) {
    provided = rawHeader.startsWith('Bearer ') ? rawHeader.slice(7).trim() : rawHeader.trim();
  }

  if (!provided) {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({
      success: false,
      message: 'Unauthorized: Missing cron authentication secret. Provide via Authorization header or ?secret= parameter.'
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
// 🔄 UNIFIED CRON ENDPOINT (Runs both seller purge & order auto-completion)
// Works with GET / POST, perfect for external cron services like cron-job.org
// -------------------------------------------------------------
router.all('/run-all', verifyCronSecret, async (req, res, next) => {
  try {
    // 1. Auto-complete delivered orders
    await autoCompleteDeliveredOrders();

    // 2. Purge expired deleted sellers
    const dummyReq = {};
    let purgeData = null;
    const dummyRes = {
      status: () => ({
        json: (data) => { purgeData = data; }
      })
    };
    await purgeExpiredDeletions(dummyReq, dummyRes, () => {});

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'All cron maintenance tasks (seller purge & order auto-completion) executed successfully.',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    next(err);
  }
});

// -------------------------------------------------------------
// 🛒 CUSTOMER CRON ENDPOINTS (POST & GET)
// -------------------------------------------------------------
router.all('/customer/auto-complete-orders', verifyCronSecret, async (req, res, next) => {
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
// 🏪 SELLER CRON ENDPOINTS (POST & GET)
// -------------------------------------------------------------
router.all('/seller/purge-expired', verifyCronSecret, async (req, res, next) => {
  try {
    await purgeExpiredDeletions(req, res, next);
  } catch (err) {
    next(err);
  }
});

export default router;
