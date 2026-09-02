import { supabaseA } from '../lib/supabase.js';

const defaultRules = {
  deliveryCharge: 40,
  freeShippingThreshold: 999,
  appCharge: 5,
  globalCommissionPct: 10,
  defaultShippingCost: 50,
  codEnabled: true,
  packagingCharge: 10,
  platformCharge: 5,
  codCharge: 15
};

/**
 * Centrally calculates order amounts, commissions, earnings and shipping fees.
 * Never calculate values independently on frontends.
 * @param {Object} params
 * @param {Array} params.items - Cart items
 * @param {string} params.paymentMethod - 'COD' or 'ONLINE'
 * @param {boolean} params.applyAsCard - Whether membership card is applied
 * @param {string} params.couponCode - Applied coupon code
 * @returns {Promise<Object>} Calculated amounts
 */
export async function calculateOrderAmounts({ items = [], paymentMethod = 'COD', applyAsCard = false, couponCode = '' }) {
  // 1. Load active pricing rules set by Admin from store_settings
  let rules = defaultRules;
  try {
    const { data } = await supabaseA
      .from('store_settings')
      .select('value')
      .eq('key', 'marketplace_rules')
      .maybeSingle();
    if (data?.value) {
      rules = { ...defaultRules, ...data.value };
    }
  } catch (err) {
    console.warn('[Pricing Engine Warning] Failed to load store settings, using defaults:', err.message);
  }

  // Parse rules values to numbers
  const deliveryCharge = Number(rules.deliveryCharge || 0);
  const freeShippingThreshold = Number(rules.freeShippingThreshold || 0);
  const appCharge = Number(rules.appCharge || 0);
  const commissionPct = Number(rules.globalCommissionPct || 0);
  const shippingCharge = Number(rules.defaultShippingCost || 0);
  const packagingCharge = Number(rules.packagingCharge || 0);
  const platformCharge = Number(rules.platformCharge || 0);
  const codCharge = Number(rules.codCharge || 0);

  // 2. Subtotal & Product Discount calculations
  let subtotal = 0;
  let productDiscount = 0;

  items.forEach(item => {
    const qty = Number(item.quantity || item.units || 1);
    const price = Number(item.price || 0);
    const mrp = Number(item.mrp || price);
    
    subtotal += price * qty;
    if (mrp > price) {
      productDiscount += (mrp - price) * qty;
    }
  });

  // 3. AS Card & Coupon Discounts
  let asCardDiscount = 0;
  if (applyAsCard) {
    // Silver/Gold Privilege membership gives flat 5% discount
    asCardDiscount = Math.round(subtotal * 0.05 * 100) / 100;
  }

  let couponDiscount = 0;
  if (couponCode) {
    const upperCode = couponCode.trim().toUpperCase();
    if (upperCode === 'WELCOME10') {
      couponDiscount = Math.round((subtotal - asCardDiscount) * 0.10 * 100) / 100;
    }
  }

  // 4. Fees & Charges
  const netSubtotal = subtotal - asCardDiscount - couponDiscount;
  const deliveryCharges = (netSubtotal >= freeShippingThreshold) ? 0 : deliveryCharge;
  const shippingCharges = (netSubtotal >= freeShippingThreshold) ? 0 : shippingCharge;
  
  const actualCodCharge = (paymentMethod === 'COD') ? codCharge : 0;

  // 5. Taxes (GST) - 5% on Groceries default
  const gst = Math.round(netSubtotal * 0.05 * 100) / 100;

  // 6. Grand Total
  const grandTotal = Math.round(
    (netSubtotal + 
     deliveryCharges + 
     appCharge + 
     platformCharge + 
     packagingCharge + 
     actualCodCharge + 
     gst) * 100
  ) / 100;

  // 7. Marketplace Commission & Seller Earnings
  const commissionRatio = commissionPct / 100;
  const marketplaceCommission = Math.round((subtotal * commissionRatio) * 100) / 100;
  const netSellerEarnings = Math.max(0, Math.round((grandTotal - marketplaceCommission - shippingCharges) * 100) / 100);

  return {
    subtotal,
    productDiscount,
    asCardDiscount,
    couponDiscount,
    deliveryCharges,
    shippingCharges,
    appCharges: appCharge,
    platformCharges: platformCharge,
    packagingCharges: packagingCharge,
    codCharges: actualCodCharge,
    gst,
    grandTotal,
    marketplaceCommission,
    netSellerEarnings,
    settlementAmount: netSellerEarnings
  };
}
