import { Router } from 'express';
import {
  checkServiceabilityHandler,
  getDeliveryEstimateHandler,
  pushOrderHandler,
  webhookHandler,
  trackShipmentHandler,
} from '../controllers/shippingController.js';

const router = Router();

// 1. Serviceability & Shipping Rate Check API
// GET & POST /api/shipping/check-serviceability
router.get('/check-serviceability', checkServiceabilityHandler);
router.post('/check-serviceability', checkServiceabilityHandler);

// 1b. Real Dynamic Delivery Estimation API (Zero Hardcoded Data)
// GET & POST /api/shipping/estimate-delivery
router.get('/estimate-delivery', getDeliveryEstimateHandler);
router.post('/estimate-delivery', getDeliveryEstimateHandler);

// 2. Order Push API
// POST /api/shipping/create-order & POST /api/shipping/push-order
router.post('/create-order', pushOrderHandler);
router.post('/push-order', pushOrderHandler);

// 3. Webhook Route
// POST /api/shipping/webhook
router.post('/webhook', webhookHandler);

// 4. Live Tracking API
// GET /api/shipping/track/:orderId
router.get('/track/:orderId', trackShipmentHandler);

export default router;
