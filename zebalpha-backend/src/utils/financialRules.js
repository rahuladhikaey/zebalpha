/**
 * ZebAlpha Marketplace Financial Rules & Deductions
 */
export const DEFAULT_FINANCIAL_RULES = {
  commission_percentage: 5.0,
  fixed_fee_per_order: 15.0,
  payment_collection_fee_pct: 2.0,
  cod_handling_fee: 25.0,
  standard_shipping_fee: 60.0,
  reverse_shipping_fee: 70.0,
  rto_charge: 50.0,
  gst_on_platform_fees_pct: 18.0,
  settlement_delay_days: 7,
  customer_return_window_days: 7,
  tiers: {
    standard: {
      commission_pct: 5.0,
      settlement_delay_days: 7
    },
    premium: {
      commission_pct: 3.5,
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
  const gross = Math.max(0, Number(price) * Number(quantity));
  const commPct = isPremium || tier === 'premium' ? (rules.tiers?.premium?.commission_pct ?? 3.5) : (rules.commission_percentage || 5.0);
  const commission = Number(((gross * commPct) / 100).toFixed(2));
  const fixed = Number((rules.fixed_fee_per_order || 15).toFixed(2));

  const isCod = String(paymentMethod).toUpperCase() === 'COD';
  const paymentCollectionFee = !isCod 
    ? Number(((gross * (rules.payment_collection_fee_pct || 2.0)) / 100).toFixed(2))
    : 0;
  const codFee = isCod ? Number((rules.cod_handling_fee || 25.0).toFixed(2)) : 0;

  // Shipping fee is only deducted from seller if rules specify SELLER or SHARED
  let shipping = 0;
  if (rules.shipping_paid_by === 'SELLER') {
    shipping = Number((rules.standard_shipping_fee || 60).toFixed(2));
  } else if (rules.shipping_paid_by === 'SHARED') {
    shipping = Number(((rules.standard_shipping_fee || 60) / 2).toFixed(2));
  }

  const taxable = commission + fixed + paymentCollectionFee + codFee;
  const tax = Number(((taxable * (rules.gst_on_platform_fees_pct || 18)) / 100).toFixed(2));
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
