import { Router } from 'express';
import { webhookHandler } from '../controllers/shippingController.js';

const router = Router();

// Shiprocket Webhook Endpoint: POST /api/webhooks/shiprocket
router.post('/shiprocket', webhookHandler);

export default router;
