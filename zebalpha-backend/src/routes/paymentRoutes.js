import { Router } from 'express';
import { createRazorpayOrder, verifyRazorpayPayment, handleRazorpayWebhook } from '../controllers/paymentController.js';

const router = Router();

router.post('/create-order', createRazorpayOrder);
router.post('/verify-payment', verifyRazorpayPayment);
router.post('/webhook', handleRazorpayWebhook);

export default router;
