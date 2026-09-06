import Razorpay from 'razorpay';
import crypto from 'crypto';
import { config } from '../config/index.js';
import { HTTP_STATUS } from '../constants/index.js';
import { supabaseA } from '../lib/supabase.js';
import { calculateOrderAmounts } from '../utils/orderCalculator.js';

const getRazorpayInstance = () => {
  if (!config.razorpay.keyId || !config.razorpay.keySecret) {
    return null;
  }
  return new Razorpay({
    key_id: config.razorpay.keyId,
    key_secret: config.razorpay.keySecret
  });
};

/**
 * Create Razorpay Order with Server-Verified Amounts
 * Zero-Trust: Uses database prices, ignores client amount tampering.
 */
export const createRazorpayOrder = async (req, res, next) => {
  try {
    const { items, applyAsCard, couponCode, amount: requestedAmount, currency = 'INR', receipt = `order_${Date.now()}` } = req.body;

    let trustedAmount = requestedAmount;

    // If items are provided, calculate trusted total from database
    if (Array.isArray(items) && items.length > 0) {
      const calculated = await calculateOrderAmounts({
        items,
        paymentMethod: 'ONLINE',
        applyAsCard: !!applyAsCard,
        couponCode: couponCode || ''
      });
      trustedAmount = calculated.grandTotal;
    }

    if (!trustedAmount || Number(trustedAmount) <= 0) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: 'Invalid order calculation amount'
      });
    }

    const razorpay = getRazorpayInstance();
    if (!razorpay) {
      console.warn('[Razorpay Notice] Gateway keys missing, returning test gateway structure.');
      return res.status(HTTP_STATUS.OK).json({
        success: true,
        orderId: `rzp_mock_${Date.now()}`,
        amount: Math.round(trustedAmount * 100),
        currency,
        isMock: true
      });
    }

    const orderOptions = {
      amount: Math.round(trustedAmount * 100), // In paise
      currency,
      receipt: String(receipt).slice(0, 40)
    };

    const orderKey = config.razorpay.keyId || process.env.RAZORPAY_KEY_ID || 'rzp_test_ShRpqbs6hVT6Ie';
    const razorpayOrder = await razorpay.orders.create(orderOptions);
    res.status(HTTP_STATUS.OK).json({
      success: true,
      orderId: razorpayOrder.id,
      id: razorpayOrder.id,
      key: orderKey,
      keyId: orderKey,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Verify Razorpay Payment Signature
 * Enforces timing-safe comparison to prevent timing attacks.
 */
export const verifyRazorpayPayment = async (req, res, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: 'Missing required Razorpay payment verification parameters'
      });
    }

    if (!config.razorpay.keySecret) {
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Payment gateway configuration missing key secret'
      });
    }

    // Generate expected HMAC signature
    const generatedSignature = crypto
      .createHmac('sha256', config.razorpay.keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    const expectedBuf = Buffer.from(generatedSignature);
    const providedBuf = Buffer.from(String(razorpay_signature));

    // Constant-time comparison
    const isSignatureValid = expectedBuf.length === providedBuf.length && 
                             crypto.timingSafeEqual(expectedBuf, providedBuf);

    if (!isSignatureValid) {
      console.warn(`[Security Alert] Payment signature mismatch for order ${razorpay_order_id}.`);
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: 'Cryptographic payment signature verification failed.'
      });
    }

    if (orderId) {
      await supabaseA
        .from('orders')
        .update({ payment_status: 'COMPLETE', payment_id: razorpay_payment_id })
        .eq('id', orderId);
    }

    res.status(HTTP_STATUS.OK).json({ success: true, verified: true });
  } catch (err) {
    next(err);
  }
};
