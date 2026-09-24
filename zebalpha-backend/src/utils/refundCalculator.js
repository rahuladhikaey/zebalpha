/**
 * Centralized Authoritative Refund Calculation Service
 * Section 8: Zero-Trust Server-Side Calculation
 */

/**
 * @typedef {Object} RefundCalculationParams
 * @property {number} [orderTotal]
 * @property {string} [paymentMethod]
 * @property {string} [paymentStatus]
 * @property {Array<{ id?: string, product_id?: string, price?: number, subtotal?: number, quantity?: number, name?: string }>} [items]
 * @property {Array<{ id?: string, product_id?: string, price?: number, subtotal?: number, quantity?: number }>} [returnItems]
 * @property {number} [alreadyRefundedAmount]
 * @property {string} [returnReason]
 * @property {number} [couponDiscount]
 * @property {number} [shippingFee]
 * @property {boolean} [isShippingRefundable]
 */

/**
 * Calculates authoritative refund amount securely on the backend.
 * @param {RefundCalculationParams} params
 */
export const calculateAuthoritativeRefund = (params = {}) => {
  const {
    orderTotal = 0,
    paymentMethod = 'COD',
    paymentStatus = 'PENDING',
    items = [],
    returnItems = [],
    alreadyRefundedAmount = 0,
    returnReason = '',
    couponDiscount = 0,
    shippingFee = 0,
    isShippingRefundable = false,
  } = params;

  // 1. If order is COD and payment was never collected, eligible refund is 0.
  const isCod = String(paymentMethod).toUpperCase() === 'COD';
  const isPaid = String(paymentStatus).toUpperCase() === 'PAID' || String(paymentStatus).toUpperCase() === 'COMPLETE';
  
  if (isCod && !isPaid) {
    return {
      eligible: false,
      refundAmount: 0,
      reason: 'No payment was collected for this Cash On Delivery order.',
      breakdown: { itemsTotal: 0, discountDeduction: 0, shippingRefund: 0, maxAllowed: 0 }
    };
  }

  // 2. Calculate sum of items being returned
  const itemsToProcess = returnItems.length > 0 ? returnItems : items;
  let itemsSubtotal = 0;

  for (const it of itemsToProcess) {
    const qty = Math.max(1, Number(it.quantity) || 1);
    const itemPrice = Number(it.subtotal ? (Number(it.subtotal) / qty) : (Number(it.price) || 0));
    itemsSubtotal += (itemPrice * qty);
  }

  // Fallback to order total if single-item or no item breakdown
  if (itemsSubtotal <= 0) {
    itemsSubtotal = Number(orderTotal) || 0;
  }

  // 3. Proportionate discount adjustment
  let discountDeduction = 0;
  if (couponDiscount > 0 && orderTotal > 0) {
    const ratio = Math.min(1, itemsSubtotal / orderTotal);
    discountDeduction = Math.round(couponDiscount * ratio * 100) / 100;
  }

  // 4. Shipping refund policy (Full refund on Defective / Wrong item, or if configured)
  const isMerchantFault = /damaged|defective|wrong|missing/i.test(returnReason);
  const includeShipping = isShippingRefundable || isMerchantFault;
  const shippingRefund = includeShipping ? Number(shippingFee || 0) : 0;

  // 5. Raw calculated refund
  let calculatedAmount = itemsSubtotal - discountDeduction + shippingRefund;

  // 6. Enforce Cap: Total refunds cannot exceed remaining refundable balance
  const remainingRefundableBalance = Math.max(0, Number(orderTotal) - Number(alreadyRefundedAmount));
  calculatedAmount = Math.min(calculatedAmount, remainingRefundableBalance);
  calculatedAmount = Math.max(0, Math.round(calculatedAmount * 100) / 100);

  return {
    eligible: calculatedAmount > 0,
    refundAmount: calculatedAmount,
    reason: calculatedAmount > 0 ? 'Eligible for refund' : 'No refundable balance remaining',
    breakdown: {
      itemsSubtotal,
      discountDeduction,
      shippingRefund,
      remainingRefundableBalance,
      finalRefundAmount: calculatedAmount
    }
  };
};
