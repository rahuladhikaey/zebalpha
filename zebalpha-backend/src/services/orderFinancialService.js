import { supabaseA } from '../lib/supabase.js';
import { getActiveFinanceConfig } from './financeConfigService.js';

/**
 * Centrally records immutable order financial snapshot and double-entry ledger entries upon payment capture.
 * Evaluates dynamic server-side active platform finance configuration, distinguishes payment methods (Prepaid vs COD),
 * shipping responsibility (Customer vs Seller vs ZebAlpha), and calculates exact minor units (paise).
 */
export async function recordFinancialLedgerForOrder(orderId) {
  try {
    const { data: order, error } = await supabaseA
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .maybeSingle();

    if (error || !order) {
      console.warn(`[Order Financial Notice] Order ${orderId} not found for financial ledger recording.`);
      return { success: false, error: 'Order not found' };
    }

    let items = (Array.isArray(order.items) && order.items.length > 0) 
      ? order.items 
      : (Array.isArray(order.product_details) && order.product_details.length > 0) 
      ? order.product_details 
      : [];

    // Fallback if item array is empty but order has total_amount and seller_id
    if (items.length === 0 && order.total_amount && order.seller_id) {
      items = [{
        price: Number(order.total_amount),
        quantity: 1,
        seller_id: order.seller_id
      }];
    }

    if (items.length === 0) {
      console.warn(`[Order Financial Notice] Order ${orderId} has no items.`);
      return { success: false, error: 'No items in order' };
    }

    // 1. Fetch active versioned platform finance configuration
    const config = await getActiveFinanceConfig();
    const isCod = (order.payment_method || '').toUpperCase() === 'COD';

    // 2. Group items by seller_id
    const sellerItemsMap = {};

    for (const item of items) {
      let sId = item.seller_id;
      if (!sId && item.product_id) {
        const { data: p } = await supabaseA.from('products').select('seller_id').eq('id', item.product_id).maybeSingle();
        sId = p?.seller_id;
      }
      if (!sId) {
        sId = order.seller_id;
      }
      if (sId) {
        if (!sellerItemsMap[sId]) sellerItemsMap[sId] = [];
        sellerItemsMap[sId].push(item);
      }
    }

    const results = [];

    // 3. Process calculations per seller
    for (const [sellerId, sellerItems] of Object.entries(sellerItemsMap)) {
      let grossMinor = 0;
      let commMinor = 0;

      for (const item of sellerItems) {
        const price = Number(item.price) || 0;
        const qty = Number(item.quantity) || 1;
        const itemGross = price * qty;
        const itemGrossMinor = Math.round(itemGross * 100);
        grossMinor += itemGrossMinor;

        // Tier / Premium commission override if applicable
        const commPct = item.is_premium ? 3.5 : Number(config.commission_percentage);
        const itemCommMinor = Math.round((itemGrossMinor * commPct) / 100);
        commMinor += itemCommMinor;
      }

      // Fixed order processing fee
      const fixedMinor = Math.round(Number(config.fixed_fee_per_order) * 100);

      // Payment collection fee (Only for online payments / Prepaid)
      const paymentCollectionMinor = !isCod 
        ? Math.round((grossMinor * Number(config.payment_collection_fee_pct)) / 100) 
        : 0;

      // COD Handling fee (Only for COD orders)
      const codHandlingMinor = isCod 
        ? Math.round(Number(config.cod_handling_fee) * 100) 
        : 0;

      // Shipping fee responsibility check
      const standardShippingMinor = Math.round(Number(config.standard_shipping_fee) * 100);
      let sellerShippingMinor = 0;
      if (config.shipping_paid_by === 'SELLER') {
        sellerShippingMinor = standardShippingMinor;
      } else if (config.shipping_paid_by === 'SHARED') {
        sellerShippingMinor = Math.round(standardShippingMinor / 2);
      }

      // Tax / GST on platform services (Commission + Fixed + Collection / COD fees)
      const taxablePlatformFeesMinor = commMinor + fixedMinor + paymentCollectionMinor + codHandlingMinor;
      const taxMinor = Math.round((taxablePlatformFeesMinor * Number(config.gst_on_platform_fees_pct)) / 100);

      const totalPlatformDeductionsMinor = taxablePlatformFeesMinor + taxMinor + sellerShippingMinor;
      const netPayableMinor = Math.max(0, grossMinor - totalPlatformDeductionsMinor);

      // 4. Record Snapshot & Ledger Entries Atomically via Database RPC
      const { data: rpcRes, error: rpcErr } = await supabaseA.rpc('record_order_financial_snapshot_and_payable', {
        p_order_id: order.id,
        p_seller_id: sellerId,
        p_order_number: order.order_number || `ORD-${order.id.slice(0, 8)}`,
        p_config_version: config.version,
        p_config_id: config.id || null,
        p_payment_method: isCod ? 'COD' : 'PREPAID',
        p_gross_amount_minor: grossMinor,
        p_commission_minor: commMinor,
        p_fixed_fee_minor: fixedMinor,
        p_payment_collection_fee_minor: paymentCollectionMinor,
        p_cod_handling_fee_minor: codHandlingMinor,
        p_shipping_fee_minor: sellerShippingMinor,
        p_shipping_paid_by: config.shipping_paid_by,
        p_tax_on_fees_minor: taxMinor,
        p_net_payable_minor: netPayableMinor,
        p_settlement_delay_days: config.settlement_delay_days,
        p_currency: 'INR',
        p_items_breakdown: sellerItems
      });

      if (rpcErr) {
        console.error(`[Record Financial Snapshot Error] Order ${order.id}, Seller ${sellerId}:`, rpcErr.message);
        results.push({ sellerId, success: false, error: rpcErr.message });
      } else {
        console.log(`✓ [Financial Snapshot & Payable Stored] Order ${order.order_number || order.id}: Seller ${sellerId} net payable ₹${(netPayableMinor / 100).toFixed(2)} (${netPayableMinor} paise) [Config v${config.version}]`);
        results.push({ 
          sellerId, 
          success: true, 
          configVersion: config.version, 
          netPayableMinor 
        });
      }
    }

    return { success: true, results };
  } catch (err) {
    console.error('[Record Financial Ledger For Order Exception]:', err);
    return { success: false, error: err.message };
  }
}
