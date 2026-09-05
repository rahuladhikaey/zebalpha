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
 * ZERO-TRUST ENFORCEMENT:
 * Product prices are strictly resolved from the PostgreSQL/Supabase database.
 * Any client-submitted prices are completely disregarded to prevent price tampering.
 *
 * @param {Object} params
 * @param {Array} params.items - Cart items
 * @param {string} params.paymentMethod - 'COD' or 'ONLINE'
 * @param {boolean} params.applyAsCard - Whether membership card is applied
 * @param {string} params.couponCode - Applied coupon code
 * @returns {Promise<Object>} Calculated amounts and verified items
 */
export async function calculateOrderAmounts({ items = [], paymentMethod = 'COD', applyAsCard = false, couponCode = '' }) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('Cannot calculate order amounts for an empty item list.');
  }

  // 1. Fetch live products from database to get trusted prices
  const productIds = items.map(item => item.product_id || item.id).filter(Boolean);
  const dbProductsMap = new Map();

  if (productIds.length > 0) {
    const { data: dbProducts, error } = await supabaseA
      .from('products')
      .select('id, name, price, mrp, is_active, is_approved, stock, seller_id')
      .in('id', productIds);

    if (error) {
      console.error('[Pricing Engine Error] Failed to fetch product catalog prices:', error.message);
      throw new Error('Failed to verify product prices against database.');
    }

    if (dbProducts) {
      dbProducts.forEach(p => dbProductsMap.set(String(p.id), p));
    }
  }

  // 2. Load active pricing rules set by Admin from store_settings
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

  const deliveryCharge = Number(rules.deliveryCharge || 0);
  const freeShippingThreshold = Number(rules.freeShippingThreshold || 0);
  const appCharge = Number(rules.appCharge || 0);
  const commissionPct = Number(rules.globalCommissionPct || 0);
  const shippingCharge = Number(rules.defaultShippingCost || 0);
  const packagingCharge = Number(rules.packagingCharge || 0);
  const platformCharge = Number(rules.platformCharge || 0);
  const codCharge = Number(rules.codCharge || 0);

  // 3. Calculate Subtotal & Product Discount using TRUSTED database prices
  let subtotal = 0;
  let productDiscount = 0;
  const verifiedItems = [];

  for (const item of items) {
    const pId = String(item.product_id || item.id || '');
    const dbProduct = dbProductsMap.get(pId);

    if (!dbProduct) {
      throw new Error(`Product ${item.name || pId} not found in verified database catalog.`);
    }

    if (dbProduct.is_active === false) {
      throw new Error(`Product ${dbProduct.name} is currently unavailable for purchase.`);
    }

    const qty = Math.max(1, parseInt(item.quantity || item.units, 10) || 1);
    // TRUSTED DATABASE VALUES ONLY
    const trustedPrice = Number(dbProduct.price || 0);
    const trustedMrp = Number(dbProduct.mrp || trustedPrice);

    subtotal += trustedPrice * qty;
    if (trustedMrp > trustedPrice) {
      productDiscount += (trustedMrp - trustedPrice) * qty;
    }

    verifiedItems.push({
      ...item,
      product_id: dbProduct.id,
      id: dbProduct.id,
      name: dbProduct.name,
      price: trustedPrice,
      mrp: trustedMrp,
      quantity: qty,
      seller_id: dbProduct.seller_id,
      subtotal: trustedPrice * qty
    });
  }

  // 4. AS Card & Coupon Discounts
  let asCardDiscount = 0;
  if (applyAsCard) {
    asCardDiscount = Math.round(subtotal * 0.05 * 100) / 100;
  }

  let couponDiscount = 0;
  if (couponCode) {
    const upperCode = couponCode.trim().toUpperCase();
    if (upperCode === 'WELCOME10') {
      couponDiscount = Math.round((subtotal - asCardDiscount) * 0.10 * 100) / 100;
    }
  }

  // 5. Fees & Charges
  const netSubtotal = Math.max(0, subtotal - asCardDiscount - couponDiscount);
  const deliveryCharges = (netSubtotal >= freeShippingThreshold) ? 0 : deliveryCharge;
  const shippingCharges = (netSubtotal >= freeShippingThreshold) ? 0 : shippingCharge;
  
  const actualCodCharge = (paymentMethod === 'COD') ? codCharge : 0;

  // 6. Taxes (GST)
  const gst = Math.round(netSubtotal * 0.05 * 100) / 100;

  // 7. Grand Total
  const grandTotal = Math.round(
    (netSubtotal + 
     deliveryCharges + 
     appCharge + 
     platformCharge + 
     packagingCharge + 
     actualCodCharge + 
     gst) * 100
  ) / 100;

  // 8. Marketplace Commission & Seller Earnings
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
    settlementAmount: netSellerEarnings,
    verifiedItems
  };
}
