import { supabaseA } from '../lib/supabase.js';

let cachedActiveConfig = null;
let cacheExpiry = 0;
const CACHE_TTL_MS = 60 * 1000; // 60 seconds cache

/**
 * Server-side validation of platform finance configuration parameters
 */
export function validateConfig(data) {
  const errors = [];

  const comm = Number(data.commission_percentage);
  if (isNaN(comm) || comm < 0 || comm > 50) {
    errors.push('Commission percentage must be between 0% and 50%.');
  }

  const fixed = Number(data.fixed_fee_per_order);
  if (isNaN(fixed) || fixed < 0 || fixed > 10000) {
    errors.push('Fixed fee per order must be between ₹0 and ₹10,000.');
  }

  const pgFee = Number(data.payment_collection_fee_pct);
  if (isNaN(pgFee) || pgFee < 0 || pgFee > 20) {
    errors.push('Payment collection fee % must be between 0% and 20%.');
  }

  const cod = Number(data.cod_handling_fee);
  if (isNaN(cod) || cod < 0 || cod > 1000) {
    errors.push('COD handling fee must be between ₹0 and ₹1,000.');
  }

  const ship = Number(data.standard_shipping_fee);
  if (isNaN(ship) || ship < 0 || ship > 5000) {
    errors.push('Standard shipping fee must be between ₹0 and ₹5,000.');
  }

  const revShip = Number(data.reverse_shipping_fee);
  if (isNaN(revShip) || revShip < 0 || revShip > 5000) {
    errors.push('Reverse shipping fee must be between ₹0 and ₹5,000.');
  }

  const rto = Number(data.rto_charge);
  if (isNaN(rto) || rto < 0 || rto > 5000) {
    errors.push('RTO charge must be between ₹0 and ₹5,000.');
  }

  const gst = Number(data.gst_on_platform_fees_pct);
  if (isNaN(gst) || gst < 0 || gst > 50) {
    errors.push('GST on platform fees % must be between 0% and 50%.');
  }

  const delay = parseInt(data.settlement_delay_days, 10);
  if (isNaN(delay) || delay < 0 || delay > 90) {
    errors.push('Settlement delay must be between 0 and 90 days.');
  }

  const validShippingModes = ['CUSTOMER', 'SELLER', 'ZEBALPHA', 'SHARED'];
  if (data.shipping_paid_by && !validShippingModes.includes(data.shipping_paid_by)) {
    errors.push(`Shipping paid by must be one of: ${validShippingModes.join(', ')}.`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Returns the currently active platform finance configuration (with caching)
 */
export async function getActiveFinanceConfig(forceFresh = false) {
  const now = Date.now();
  if (!forceFresh && cachedActiveConfig && now < cacheExpiry) {
    return cachedActiveConfig;
  }

  try {
    const { data, error } = await supabaseA.rpc('get_active_finance_config');
    if (!error && data) {
      cachedActiveConfig = {
        id: data.id,
        version: Number(data.version) || 1,
        commission_percentage: Number(data.commission_percentage) || 5.0,
        fixed_fee_per_order: Number(data.fixed_fee_per_order) || 15.0,
        payment_collection_fee_pct: Number(data.payment_collection_fee_pct) || 2.0,
        cod_handling_fee: Number(data.cod_handling_fee) || 25.0,
        standard_shipping_fee: Number(data.standard_shipping_fee) || 60.0,
        reverse_shipping_fee: Number(data.reverse_shipping_fee) || 70.0,
        rto_charge: Number(data.rto_charge) || 50.0,
        gst_on_platform_fees_pct: Number(data.gst_on_platform_fees_pct) || 18.0,
        settlement_delay_days: Number(data.settlement_delay_days) || 7,
        shipping_paid_by: data.shipping_paid_by || 'CUSTOMER',
        status: data.status || 'ACTIVE',
        effective_from: data.effective_from,
        effective_to: data.effective_to
      };
      cacheExpiry = now + CACHE_TTL_MS;
      return cachedActiveConfig;
    }
  } catch (err) {
    console.error('[Finance Config Service Warning]:', err.message);
  }

  // Safe fallback default configuration
  return {
    version: 1,
    commission_percentage: 5.0,
    fixed_fee_per_order: 15.0,
    payment_collection_fee_pct: 2.0,
    cod_handling_fee: 25.0,
    standard_shipping_fee: 60.0,
    reverse_shipping_fee: 70.0,
    rto_charge: 50.0,
    gst_on_platform_fees_pct: 18.0,
    settlement_delay_days: 7,
    shipping_paid_by: 'CUSTOMER',
    status: 'ACTIVE'
  };
}

/**
 * List all configuration versions
 */
export async function listFinanceConfigs() {
  const { data, error } = await supabaseA
    .from('platform_finance_configs')
    .select('*')
    .order('version', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Get a specific configuration by version
 */
export async function getFinanceConfigByVersion(version) {
  const { data, error } = await supabaseA
    .from('platform_finance_configs')
    .select('*')
    .eq('version', parseInt(version, 10))
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * Create a new draft configuration
 */
export async function createDraftConfig(input, adminUser = 'Super Admin') {
  const validation = validateConfig(input);
  if (!validation.isValid) {
    throw new Error(validation.errors.join(' '));
  }

  // Get max version
  const { data: maxRow } = await supabaseA
    .from('platform_finance_configs')
    .select('version')
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextVersion = (maxRow?.version || 0) + 1;

  const payload = {
    version: nextVersion,
    commission_percentage: Number(input.commission_percentage),
    fixed_fee_per_order: Number(input.fixed_fee_per_order),
    payment_collection_fee_pct: Number(input.payment_collection_fee_pct),
    cod_handling_fee: Number(input.cod_handling_fee),
    standard_shipping_fee: Number(input.standard_shipping_fee),
    reverse_shipping_fee: Number(input.reverse_shipping_fee),
    rto_charge: Number(input.rto_charge),
    gst_on_platform_fees_pct: Number(input.gst_on_platform_fees_pct),
    settlement_delay_days: parseInt(input.settlement_delay_days, 10),
    shipping_paid_by: input.shipping_paid_by || 'CUSTOMER',
    status: input.status === 'SCHEDULED' ? 'SCHEDULED' : 'DRAFT',
    effective_from: input.effective_from || new Date().toISOString(),
    change_reason: input.change_reason || 'Draft commercial rule modification',
    created_by: adminUser
  };

  const { data, error } = await supabaseA
    .from('platform_finance_configs')
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Publish or Schedule a configuration version
 */
export async function publishConfig(id, adminUser = 'Super Admin', scheduleDate = null) {
  const { data: target, error: tErr } = await supabaseA
    .from('platform_finance_configs')
    .select('*')
    .eq('id', id)
    .single();

  if (tErr || !target) throw new Error('Target configuration not found.');

  const effectiveFrom = scheduleDate ? new Date(scheduleDate).toISOString() : new Date().toISOString();
  const newStatus = scheduleDate && new Date(scheduleDate) > new Date() ? 'SCHEDULED' : 'ACTIVE';

  if (newStatus === 'ACTIVE') {
    // Expire currently active configs
    await supabaseA
      .from('platform_finance_configs')
      .update({
        status: 'EXPIRED',
        effective_to: effectiveFrom,
        updated_at: new Date().toISOString()
      })
      .eq('status', 'ACTIVE');
  }

  // Update target to ACTIVE / SCHEDULED
  const { data: updated, error: uErr } = await supabaseA
    .from('platform_finance_configs')
    .update({
      status: newStatus,
      effective_from: effectiveFrom,
      effective_to: null,
      published_by: adminUser,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();

  if (uErr) throw uErr;

  // Clear cache immediately
  cachedActiveConfig = null;
  cacheExpiry = 0;

  return updated;
}

/**
 * Safe Rollback: Creates a new corrective configuration version based on a historical version
 * Never overwrites or mutates past configuration rows.
 */
export async function rollbackToVersion(targetVersion, reason, adminUser = 'Super Admin') {
  const historical = await getFinanceConfigByVersion(targetVersion);
  if (!historical) {
    throw new Error(`Configuration version ${targetVersion} not found.`);
  }

  const { data: maxRow } = await supabaseA
    .from('platform_finance_configs')
    .select('version')
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextVersion = (maxRow?.version || 0) + 1;
  const nowIso = new Date().toISOString();

  // Expire current active
  await supabaseA
    .from('platform_finance_configs')
    .update({
      status: 'EXPIRED',
      effective_to: nowIso,
      updated_at: nowIso
    })
    .eq('status', 'ACTIVE');

  // Insert new version with historical values
  const payload = {
    version: nextVersion,
    commission_percentage: historical.commission_percentage,
    fixed_fee_per_order: historical.fixed_fee_per_order,
    payment_collection_fee_pct: historical.payment_collection_fee_pct,
    cod_handling_fee: historical.cod_handling_fee,
    standard_shipping_fee: historical.standard_shipping_fee,
    reverse_shipping_fee: historical.reverse_shipping_fee,
    rto_charge: historical.rto_charge,
    gst_on_platform_fees_pct: historical.gst_on_platform_fees_pct,
    settlement_delay_days: historical.settlement_delay_days,
    shipping_paid_by: historical.shipping_paid_by,
    status: 'ACTIVE',
    effective_from: nowIso,
    effective_to: null,
    change_reason: `Rollback: Cloned parameters from Version ${targetVersion}. Reason: ${reason || 'Administrative policy restoration'}`,
    created_by: adminUser,
    published_by: adminUser
  };

  const { data: rolledBack, error: rErr } = await supabaseA
    .from('platform_finance_configs')
    .insert(payload)
    .select()
    .single();

  if (rErr) throw rErr;

  cachedActiveConfig = null;
  cacheExpiry = 0;

  return rolledBack;
}

/**
 * Preview financial impact for a hypothetical order without modifying database
 */
export function previewFinancialImpact({
  price = 1000,
  quantity = 1,
  paymentMethod = 'PREPAID',
  config = null
}) {
  const active = config || {
    commission_percentage: 5.0,
    fixed_fee_per_order: 15.0,
    payment_collection_fee_pct: 2.0,
    cod_handling_fee: 25.0,
    standard_shipping_fee: 60.0,
    reverse_shipping_fee: 70.0,
    rto_charge: 50.0,
    gst_on_platform_fees_pct: 18.0,
    settlement_delay_days: 7,
    shipping_paid_by: 'CUSTOMER'
  };

  const grossMinor = Math.round(Number(price) * Number(quantity) * 100);
  const commMinor = Math.round((grossMinor * Number(active.commission_percentage)) / 100);
  const fixedMinor = Math.round(Number(active.fixed_fee_per_order) * 100);

  const isCod = String(paymentMethod).toUpperCase() === 'COD';
  const collectionMinor = !isCod 
    ? Math.round((grossMinor * Number(active.payment_collection_fee_pct)) / 100) 
    : 0;
  const codMinor = isCod 
    ? Math.round(Number(active.cod_handling_fee) * 100) 
    : 0;

  const standardShipMinor = Math.round(Number(active.standard_shipping_fee) * 100);
  let sellerShippingDeductionMinor = 0;
  if (active.shipping_paid_by === 'SELLER') {
    sellerShippingDeductionMinor = standardShipMinor;
  } else if (active.shipping_paid_by === 'SHARED') {
    sellerShippingDeductionMinor = Math.round(standardShipMinor / 2);
  }

  // GST / Tax is applied on platform service fees (Commission + Fixed Fee + Payment/COD handling)
  const taxableFeesMinor = commMinor + fixedMinor + collectionMinor + codMinor;
  const taxMinor = Math.round((taxableFeesMinor * Number(active.gst_on_platform_fees_pct)) / 100);

  const totalPlatformFeesMinor = taxableFeesMinor + taxMinor + sellerShippingDeductionMinor;
  const netSellerPayableMinor = Math.max(0, grossMinor - totalPlatformFeesMinor);

  return {
    gross: Number((grossMinor / 100).toFixed(2)),
    grossMinor,
    commission: Number((commMinor / 100).toFixed(2)),
    commissionMinor: commMinor,
    fixedFee: Number((fixedMinor / 100).toFixed(2)),
    fixedFeeMinor: fixedMinor,
    paymentCollectionFee: Number((collectionMinor / 100).toFixed(2)),
    paymentCollectionFeeMinor: collectionMinor,
    codHandlingFee: Number((codMinor / 100).toFixed(2)),
    codHandlingFeeMinor: codMinor,
    shippingFee: Number((sellerShippingDeductionMinor / 100).toFixed(2)),
    shippingFeeMinor: sellerShippingDeductionMinor,
    shippingPaidBy: active.shipping_paid_by,
    taxOnFees: Number((taxMinor / 100).toFixed(2)),
    taxOnFeesMinor: taxMinor,
    totalPlatformFees: Number((totalPlatformFeesMinor / 100).toFixed(2)),
    totalPlatformFeesMinor,
    estimatedSellerPayable: Number((netSellerPayableMinor / 100).toFixed(2)),
    netSellerPayableMinor,
    settlementDelayDays: active.settlement_delay_days,
    paymentMethod: isCod ? 'COD' : 'PREPAID'
  };
}
