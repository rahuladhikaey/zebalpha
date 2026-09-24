import Razorpay from 'razorpay';
import { config } from '../config/index.js';

/**
 * Returns an initialized Razorpay instance
 */
const getRazorpayInstance = () => {
  const keyId = (config.razorpay?.keyId || process.env.RAZORPAY_KEY_ID || 'rzp_test_ShRpqbs6hVT6Ie').trim();
  const keySecret = (config.razorpay?.keySecret || process.env.RAZORPAY_KEY_SECRET || '5LUjZ94LMDnjwlLyB9cUU5cb').trim();
  
  if (!keyId || !keySecret) {
    console.warn('[Razorpay Refund Service]: Missing RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET');
    return null;
  }
  
  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret
  });
};

/**
 * Initiates an automated refund back to the customer's original payment source (Razorpay)
 * Used for Prepaid & Pre-Order cancellations (within 2h) and returns.
 * 
 * @param {Object} params
 * @param {string} params.paymentId - Razorpay Payment ID (e.g., pay_XXXXX)
 * @param {number} params.amountInRupees - Amount to refund in INR
 * @param {Object} [params.notes] - Key-value metadata for Razorpay dashboard
 * @returns {Promise<{ success: boolean, refundId?: string, error?: string, data?: any }>}
 */
export const initiateRazorpayRefund = async ({ paymentId, amountInRupees, notes = {} }) => {
  try {
    if (!paymentId) {
      return { success: false, error: 'Payment ID (razorpay_payment_id) is required for refund' };
    }

    const instance = getRazorpayInstance();
    if (!instance) {
      return { success: false, error: 'Razorpay client is not initialized' };
    }

    const amountInPaise = Math.round(Number(amountInRupees) * 100);
    if (!amountInPaise || amountInPaise <= 0) {
      return { success: false, error: 'Invalid refund amount' };
    }

    console.log(`[Razorpay Refund] Initiating refund of ₹${amountInRupees} (${amountInPaise} paise) for payment ${paymentId}...`);

    const refund = await instance.payments.refund(paymentId, {
      amount: amountInPaise,
      speed: 'normal',
      notes: {
        ...notes,
        system: 'ZebAlpha Refund Engine',
        timestamp: new Date().toISOString()
      }
    });

    console.log(`[Razorpay Refund Success] Refund ID: ${refund.id}, Status: ${refund.status}, Amount: ₹${amountInRupees}`);

    return {
      success: true,
      refundId: refund.id,
      status: refund.status || 'processed',
      data: refund
    };
  } catch (error) {
    console.error('[Razorpay Refund Error]:', error?.error?.description || error?.message || error);
    return {
      success: false,
      error: error?.error?.description || error?.message || 'Failed to process Razorpay refund'
    };
  }
};
