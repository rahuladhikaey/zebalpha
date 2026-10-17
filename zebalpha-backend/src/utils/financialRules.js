/**
 * ZebAlpha Marketplace Financial Rules & Deductions
 */
export const DEFAULT_FINANCIAL_RULES = {
  commission_percentage: 0.0,
  fixed_fee_per_order: 0.0,
  payment_collection_fee_pct: 0.0,
  cod_handling_fee: 0.0,
  standard_shipping_fee: 0.0,
  reverse_shipping_fee: 0.0,
  rto_charge: 50.0,
  gst_on_platform_fees_pct: 3.0,
  settlement_delay_days: 7,
  customer_return_window_days: 5,
  tiers: {
    standard: {
      commission_pct: 0.0,
      settlement_delay_days: 7
    },
    premium: {
      commission_pct: 0.0,
      settlement_delay_days: 4
    }
  }
};

export function calculateOrderItemFee(
  price, 
  quantity = 1, 
  rules = DEFAULT_FINANCIAL_RULES, 
  tier = 'standard', 
  isPremium = false,
  paymentMethod = 'PREPAID'
) {
  const getNumeric = (val, fallback = 0) => {
    if (val !== undefined && val !== null && val !== "" && !isNaN(Number(val))) {
      return Number(val);
    }
    return fallback;
  };

  const gross = Math.max(0, Number(price) * Number(quantity));
  let commPct = getNumeric(rules.commission_percentage, 0);
  if (isPremium || tier === 'premium') {
    if (rules.tiers?.premium?.commission_pct !== undefined && rules.tiers?.premium?.commission_pct !== null) {
      commPct = Number(rules.tiers.premium.commission_pct);
    } else {
      commPct = Math.max(0, commPct - 2.5);
    }
  }
  const commission = Number(((gross * commPct) / 100).toFixed(2));
  const fixed = Number(getNumeric(rules.fixed_fee_per_order, 0).toFixed(2));

  const isCod = String(paymentMethod).toUpperCase() === 'COD';
  const paymentCollectionFee = !isCod 
    ? Number(((gross * getNumeric(rules.payment_collection_fee_pct, 0)) / 100).toFixed(2))
    : 0;
  const codFee = isCod ? Number(getNumeric(rules.cod_handling_fee, 0).toFixed(2)) : 0;

  // Shipping fee is only deducted from seller if rules specify SELLER or SHARED
  let shipping = 0;
  if (rules.shipping_paid_by === 'SELLER') {
    shipping = Number(getNumeric(rules.standard_shipping_fee, 0).toFixed(2));
  } else if (rules.shipping_paid_by === 'SHARED') {
    shipping = Number((getNumeric(rules.standard_shipping_fee, 0) / 2).toFixed(2));
  }

  const taxable = commission + fixed + paymentCollectionFee + codFee;
  const gstPct = getNumeric(rules.gst_on_platform_fees_pct, 3);
  const tax = Number(((taxable * gstPct) / 100).toFixed(2));
  const totalDeductions = Number((taxable + tax + shipping).toFixed(2));
  const netEarnings = Number(Math.max(0, gross - totalDeductions).toFixed(2));

  return {
    gross,
    commission,
    fixed,
    paymentCollectionFee,
    codFee,
    shipping,
    tax,
    totalDeductions,
    netEarnings
  };
}
