import Razorpay from 'razorpay';
import { config } from '../config/index.js';

/**
 * Returns an initialized Razorpay instance
 */
const getRazorpayInstance = () => {
  const keyId = (config.razorpay?.keyId || process.env.RAZORPAY_KEY_ID || '').trim();
  const keySecret = (config.razorpay?.keySecret || process.env.RAZORPAY_KEY_SECRET || '').trim();
  
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
export const initiateRazorpayRefund = async ({ paymentId, amountInRupees, notes = {}, idempotencyKey = null }) => {
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

    const safeReceipt = idempotencyKey || `RET-REF-${paymentId.slice(0, 16)}-${Date.now()}`;
    console.log(`[Razorpay Refund] Initiating refund of ₹${amountInRupees} (${amountInPaise} paise) for payment ${paymentId} (receipt: ${safeReceipt})...`);

    const refund = await instance.payments.refund(paymentId, {
      amount: amountInPaise,
      speed: 'normal',
      receipt: safeReceipt,
      notes: {
        ...notes,
        idempotency_key: safeReceipt,
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
    const errorDesc = error?.error?.description || error?.message || '';
    console.error('[Razorpay Refund Error]:', errorDesc);

    // Idempotent recovery: If Razorpay says payment already refunded or full refund processed, fetch existing refund
    if (errorDesc.toLowerCase().includes('already refunded') || errorDesc.toLowerCase().includes('fully refunded')) {
      try {
        const instance = getRazorpayInstance();
        if (instance) {
          const refundsList = await instance.payments.refunds(paymentId);
          if (refundsList && refundsList.items && refundsList.items.length > 0) {
            const existingRefund = refundsList.items[0];
            console.log(`[Razorpay Refund Reconciled] Found existing refund ${existingRefund.id} for payment ${paymentId}`);
            return {
              success: true,
              refundId: existingRefund.id,
              status: existingRefund.status || 'processed',
              data: existingRefund,
              reconciled: true
            };
          }
        }
      } catch (fetchErr) {
        console.warn('[Razorpay Fetch Refunds Warning]:', fetchErr.message);
      }
    }

    return {
      success: false,
      error: errorDesc || 'Failed to process Razorpay refund'
    };
  }
};
