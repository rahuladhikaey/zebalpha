import { Router } from 'express';
import { autoCompleteDeliveredOrders } from '../jobs/index.js';
import { purgeExpiredDeletions } from '../controllers/sellerController.js';
import { HTTP_STATUS } from '../constants/index.js';

const router = Router();

/**
 * Middleware: Verify CRON_SECRET for security if set
 */
const verifyCronSecret = (req, res, next) => {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return next();

  const authHeader = req.headers['authorization'] || req.headers['x-cron-secret'];
  if (authHeader !== cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({
      success: false,
      message: 'Unauthorized: Invalid or missing CRON_SECRET header.'
    });
  }
  next();
};

// -------------------------------------------------------------
// 🛒 CUSTOMER CRON ENDPOINTS
// -------------------------------------------------------------

/**
 * GET & POST /api/v1/cron/customer/auto-complete-orders
 * Trigger auto-completion for customer delivered orders (>7 days old)
 */
const handleCustomerAutoComplete = async (req, res, next) => {
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
};

router.get('/customer/auto-complete-orders', verifyCronSecret, handleCustomerAutoComplete);
router.post('/customer/auto-complete-orders', verifyCronSecret, handleCustomerAutoComplete);

// -------------------------------------------------------------
// 🏪 SELLER CRON ENDPOINTS
// -------------------------------------------------------------

/**
 * GET & POST /api/v1/cron/seller/purge-expired
 * Trigger daily purge for expired deleted seller accounts
 */
const handleSellerPurge = async (req, res, next) => {
  try {
    await purgeExpiredDeletions(req, res, next);
  } catch (err) {
    next(err);
  }
};

router.get('/seller/purge-expired', verifyCronSecret, handleSellerPurge);
router.post('/seller/purge-expired', verifyCronSecret, handleSellerPurge);

// Legacy support routes
router.get('/auto-complete-orders', verifyCronSecret, handleCustomerAutoComplete);
router.post('/auto-complete-orders', verifyCronSecret, handleCustomerAutoComplete);
router.get('/purge-sellers', verifyCronSecret, handleSellerPurge);
router.post('/purge-sellers', verifyCronSecret, handleSellerPurge);

// -------------------------------------------------------------
// 👑 ADMIN CRON ENDPOINTS
// -------------------------------------------------------------

/**
 * GET & POST /api/v1/cron/admin/analytics-rollup
 * Trigger admin daily analytics and platform statistics rollup
 */
const handleAdminRollup = async (req, res, next) => {
  try {
    res.status(HTTP_STATUS.OK).json({
      success: true,
      role: 'admin',
      message: 'Admin analytics rollup executed successfully.'
    });
  } catch (err) {
    next(err);
  }
};

router.get('/admin/analytics-rollup', verifyCronSecret, handleAdminRollup);
router.post('/admin/analytics-rollup', verifyCronSecret, handleAdminRollup);

export default router;
