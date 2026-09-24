import { Router } from 'express';
import { webhookHandler } from '../controllers/shippingController.js';
import { handleRazorpayWebhook } from '../controllers/paymentController.js';

const router = Router();

// Shiprocket Webhook Endpoint: POST /api/webhooks/shiprocket
router.post('/shiprocket', webhookHandler);

// Razorpay Webhook Endpoint: POST /api/webhooks/razorpay
router.post('/razorpay', handleRazorpayWebhook);

export default router;
