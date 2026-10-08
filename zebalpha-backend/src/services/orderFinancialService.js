import { supabaseA, supabaseB } from '../lib/supabase.js';
import { calculateOrderItemFee, DEFAULT_FINANCIAL_RULES } from '../utils/financialRules.js';

/**
 * Centrally records immutable order financial ledger entries for an order upon payment capture.
 * Evaluates server-side database items and calculates exact minor units (paise).
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

    const items = order.items || order.product_details || [];
    if (!Array.isArray(items) || items.length === 0) {
      console.warn(`[Order Financial Notice] Order ${orderId} has no items.`);
      return { success: false, error: 'No items in order' };
    }

    // Group items by seller_id
    const sellerItemsMap = {};

    for (const item of items) {
      let sId = item.seller_id;
      if (!sId && item.product_id) {
        // Query product
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

    for (const [sellerId, sellerItems] of Object.entries(sellerItemsMap)) {
      let grossMinor = 0;
      let commMinor = 0;
      let fixedMinor = 0;
      let shipMinor = 0;
      let taxMinor = 0;

      for (const item of sellerItems) {
        const price = Number(item.price) || 0;
        const qty = Number(item.quantity) || 1;
        const itemGross = price * qty;
        grossMinor += Math.round(itemGross * 100);

        // Calculate marketplace deductions
        const commPct = item.is_premium ? (DEFAULT_FINANCIAL_RULES.tiers?.premium?.commission_pct ?? 3.5) : (DEFAULT_FINANCIAL_RULES.commission_percentage || 5.0);
        const itemComm = (itemGross * commPct) / 100;
        commMinor += Math.round(itemComm * 100);

        const itemFixed = (DEFAULT_FINANCIAL_RULES.fixed_fee_per_order || 15) / sellerItems.length;
        fixedMinor += Math.round(itemFixed * 100);

        const itemShip = (DEFAULT_FINANCIAL_RULES.standard_shipping_fee || 60) / sellerItems.length;
        shipMinor += Math.round(itemShip * 100);

        const taxableServiceFees = itemComm + itemFixed;
        const itemTax = (taxableServiceFees * (DEFAULT_FINANCIAL_RULES.gst_on_platform_fees_pct || 18)) / 100;
        taxMinor += Math.round(itemTax * 100);
      }

      const totalDeductionsMinor = commMinor + fixedMinor + shipMinor + taxMinor;
      const netPayableMinor = Math.max(0, grossMinor - totalDeductionsMinor);

      const { data: rpcRes, error: rpcErr } = await supabaseA.rpc('record_order_financial_payable', {
        p_order_id: order.id,
        p_seller_id: sellerId,
        p_order_number: order.order_number || `ORD-${order.id.slice(0, 8)}`,
        p_gross_amount_minor: grossMinor,
        p_commission_minor: commMinor,
        p_platform_fee_minor: fixedMinor,
        p_shipping_fee_minor: shipMinor,
        p_tax_on_fees_minor: taxMinor,
        p_net_payable_minor: netPayableMinor,
        p_currency: 'INR',
        p_items_breakdown: sellerItems
      });

      if (rpcErr) {
        console.error(`[Record Financial Payable Error] Order ${order.id}, Seller ${sellerId}:`, rpcErr.message);
        results.push({ sellerId, success: false, error: rpcErr.message });
      } else {
        console.log(`✓ [Financial Payable Recorded] Order ${order.order_number || order.id}: Seller ${sellerId} net payable ₹${(netPayableMinor / 100).toFixed(2)} (${netPayableMinor} paise)`);
        results.push({ sellerId, success: true, netPayableMinor });
      }
    }

    return { success: true, results };
  } catch (err) {
    console.error('[Record Financial Ledger For Order Exception]:', err);
    return { success: false, error: err.message };
  }
}
