import { Router } from 'express';
import { createRazorpayOrder, verifyRazorpayPayment } from '../controllers/paymentController.js';

const router = Router();

router.post('/create-order', createRazorpayOrder);
router.post('/verify-payment', verifyRazorpayPayment);

export default router;
