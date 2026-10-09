import {
  MarketplaceFinancialRules,
  LedgerTransaction,
  SellerLedgerBalances
} from '../types/ledger';

export const DEFAULT_FINANCIAL_RULES: MarketplaceFinancialRules = {
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

export interface OrderItemFeeBreakdown {
  gross_amount: number;
  commission_fee: number;
  fixed_fee: number;
  collection_fee: number;
  shipping_fee: number;
  tax_on_fees: number;
  total_deductions: number;
  net_seller_earnings: number;
  effective_commission_pct: number;
}

/**
 * Calculates marketplace fee deductions for a specific order item.
 * Pure function, 100% server and client reproducible.
 */
export function calculateOrderItemFee(
  price: number,
  quantity: number = 1,
  rules: MarketplaceFinancialRules = DEFAULT_FINANCIAL_RULES,
  tier: string = 'standard',
  paymentMethod: string = 'PREPAID',
  isPremiumProduct: boolean = false
): OrderItemFeeBreakdown {
  const gross = Math.max(0, Number(price) * Number(quantity));

  // 1. Commission
  let commPct = rules.commission_percentage;
  if (tier === 'premium' || isPremiumProduct) {
    commPct = rules.tiers?.premium?.commission_pct ?? 3.5;
  }
  const commissionFee = Number(((gross * commPct) / 100).toFixed(2));

  // 2. Fixed platform fee
  const fixedFee = Number((rules.fixed_fee_per_order || 15).toFixed(2));

  // 3. Collection fee
  let collectionFee = 0;
  if ((paymentMethod || '').toUpperCase() === 'COD') {
    collectionFee = Number((rules.cod_handling_fee || 25).toFixed(2));
  } else {
    collectionFee = Number(((gross * (rules.payment_collection_fee_pct || 2)) / 100).toFixed(2));
  }

  // 4. Shipping fee allocated to order item
  const shippingFee = Number((rules.standard_shipping_fee || 60).toFixed(2));

  // 5. Taxes (GST 18%) on marketplace service fees (Commission + Fixed + Collection)
  const taxableServiceFees = commissionFee + fixedFee + collectionFee;
  const taxOnFees = Number(((taxableServiceFees * (rules.gst_on_platform_fees_pct || 18)) / 100).toFixed(2));

  const totalDeductions = Number((commissionFee + fixedFee + collectionFee + shippingFee + taxOnFees).toFixed(2));
  const netSellerEarnings = Number(Math.max(0, gross - totalDeductions).toFixed(2));

  return {
    gross_amount: gross,
    commission_fee: commissionFee,
    fixed_fee: fixedFee,
    collection_fee: collectionFee,
    shipping_fee: shippingFee,
    tax_on_fees: taxOnFees,
    total_deductions: totalDeductions,
    net_seller_earnings: netSellerEarnings,
    effective_commission_pct: commPct
  };
}

/**
 * Computes live balances directly from immutable ledger transactions.
 */
export function computeLedgerBalances(
  transactions: LedgerTransaction[]
): SellerLedgerBalances {
  let grossSales = 0;
  let commission = 0;
  let shippingFees = 0;
  let fixedFees = 0;
  let collectionFees = 0;
  let returnsAndRefunds = 0;
  let totalSettled = 0;
  let pendingSettlement = 0;
  let onHoldBalance = 0;

  for (const tx of transactions) {
    const amt = Number(tx.amount) || 0;

    if (tx.status === 'HELD') {
      onHoldBalance += amt;
      continue;
    }

    if (tx.status === 'PENDING') {
      pendingSettlement += amt;
      continue;
    }

    if (tx.status === 'COMPLETED') {
      switch (tx.transaction_type) {
        case 'SALE':
        case 'SALE_CREDIT':
          grossSales += amt;
          break;
        case 'COMMISSION':
        case 'COMMISSION_DEDUCTION':
          commission += amt;
          break;
        case 'SHIPPING_FEE':
          shippingFees += amt;
          break;
        case 'FIXED_FEE':
          fixedFees += amt;
          break;
        case 'COLLECTION_FEE':
          collectionFees += amt;
          break;
        case 'REFUND':
        case 'REFUND_ADJUSTMENT':
        case 'PARTIAL_REFUND':
        case 'RETURN_FEE':
        case 'RETURN_ADJUSTMENT':
        case 'RTO_FEE':
          returnsAndRefunds += amt;
          break;
        case 'SETTLEMENT':
        case 'WITHDRAWAL_SUCCESS':
          totalSettled += amt;
          pendingSettlement = Math.max(0, pendingSettlement - amt);
          break;
        case 'WITHDRAWAL_FAILED':
        case 'WITHDRAWAL_CANCELLED':
          pendingSettlement = Math.max(0, pendingSettlement - amt);
          break;
        case 'SETTLEMENT_REVERSAL':
        case 'WITHDRAWAL_REVERSED':
          totalSettled = Math.max(0, totalSettled - amt);
          break;
        case 'WITHDRAWAL_REQUESTED':
        case 'WITHDRAWAL_PROCESSING':
          pendingSettlement += amt;
          break;
        default:
          break;
      }
    }
  }

  const totalPlatformFees = Number((commission + fixedFees + collectionFees).toFixed(2));
  const netSellerEarnings = Number((grossSales - (totalPlatformFees + shippingFees + returnsAndRefunds)).toFixed(2));
  const availableBalance = Number(Math.max(0, netSellerEarnings - totalSettled - pendingSettlement).toFixed(2));

  return {
    gross_sales: Number(grossSales.toFixed(2)),
    commission: Number(commission.toFixed(2)),
    shipping_fees: Number(shippingFees.toFixed(2)),
    fixed_fees: Number(fixedFees.toFixed(2)),
    collection_fees: Number(collectionFees.toFixed(2)),
    returns_and_refunds: Number(returnsAndRefunds.toFixed(2)),
    total_platform_fees: totalPlatformFees,
    net_seller_earnings: netSellerEarnings,
    total_settled: Number(totalSettled.toFixed(2)),
    available_balance: availableBalance,
    reserved_balance: 0,
    pending_settlement: Number(pendingSettlement.toFixed(2)),
    on_hold_balance: Number(onHoldBalance.toFixed(2))
  };
}

/**
 * Creates immutable ledger entries for an order delivery event.
 * Uses deterministic idempotency keys to guarantee no duplicate ledger entries can ever be recorded.
 */
export function generateDeliveryLedgerEntries(params: {
  sellerId: string;
  orderId: string;
  orderNumber: string;
  items: Array<{
    id?: string;
    product_id?: string;
    price?: number;
    subtotal?: number;
    quantity?: number;
    name?: string;
    variant?: string;
    is_premium?: boolean;
  }>;
  paymentMethod?: string;
  sellerTier?: string;
  rules?: MarketplaceFinancialRules;
}) {
  const { sellerId, orderId, orderNumber, items, paymentMethod = 'PREPAID', sellerTier = 'standard', rules = DEFAULT_FINANCIAL_RULES } = params;
  const entries: any[] = [];

  items.forEach((item, idx) => {
    const itemId = item.id || `${orderId}-item-${idx}`;
    const price = Number(item.price) || 0;
    const qty = Number(item.quantity) || 1;
    const breakdown = calculateOrderItemFee(
      price,
      qty,
      rules,
      sellerTier,
      paymentMethod,
      item.is_premium || false
    );

    // 1. Gross Sale (CREDIT, marked PENDING during return window)
    entries.push({
      seller_id: sellerId,
      order_id: orderId,
      order_number: orderNumber,
      order_item_id: itemId,
      entry_type: 'SALE',
      direction: 'CREDIT',
      amount: breakdown.gross_amount,
      status: 'PENDING',
      idempotency_key: `LEDGER_SALE_${orderId}_${itemId}`,
      title: `Gross Item Sale: ${item.name || 'Apparel Item'}`,
      description: `Customer order fulfilled. Escrow held until return window completes.`,
      metadata: { item_name: item.name, qty, unit_price: price }
    });

    // 2. Commission Fee (DEBIT)
    if (breakdown.commission_fee > 0) {
      entries.push({
        seller_id: sellerId,
        order_id: orderId,
        order_number: orderNumber,
        order_item_id: itemId,
        entry_type: 'COMMISSION',
        direction: 'DEBIT',
        amount: breakdown.commission_fee,
        status: 'COMPLETED',
        idempotency_key: `LEDGER_COMM_${orderId}_${itemId}`,
        title: `Platform Commission (${breakdown.effective_commission_pct}%)`,
        description: `Marketplace commission deducted for ${item.name || 'product'}.`,
        metadata: { commission_pct: breakdown.effective_commission_pct }
      });
    }

    // 3. Fixed Fee (DEBIT)
    if (breakdown.fixed_fee > 0) {
      entries.push({
        seller_id: sellerId,
        order_id: orderId,
        order_number: orderNumber,
        order_item_id: itemId,
        entry_type: 'FIXED_FEE',
        direction: 'DEBIT',
        amount: breakdown.fixed_fee,
        status: 'COMPLETED',
        idempotency_key: `LEDGER_FIXED_${orderId}_${itemId}`,
        title: `Marketplace Fixed Closing Fee`,
        description: `Per-order item platform closing charge.`,
        metadata: {}
      });
    }

    // 4. Collection Fee (DEBIT)
    if (breakdown.collection_fee > 0) {
      entries.push({
        seller_id: sellerId,
        order_id: orderId,
        order_number: orderNumber,
        order_item_id: itemId,
        entry_type: 'COLLECTION_FEE',
        direction: 'DEBIT',
        amount: breakdown.collection_fee,
        status: 'COMPLETED',
        idempotency_key: `LEDGER_COLL_${orderId}_${itemId}`,
        title: paymentMethod === 'COD' ? `COD Handling Charge` : `Payment Gateway Collection Fee`,
        description: `Payment processing fee for mode: ${paymentMethod}.`,
        metadata: { payment_method: paymentMethod }
      });
    }

    // 5. Shipping Fee (DEBIT)
    if (breakdown.shipping_fee > 0) {
      entries.push({
        seller_id: sellerId,
        order_id: orderId,
        order_number: orderNumber,
        order_item_id: itemId,
        entry_type: 'SHIPPING_FEE',
        direction: 'DEBIT',
        amount: breakdown.shipping_fee,
        status: 'COMPLETED',
        idempotency_key: `LEDGER_SHIP_${orderId}_${itemId}`,
        title: `Forward Logistics Shipping Fee`,
        description: `Courier dispatch and delivery logistics charge.`,
        metadata: {}
      });
    }

    // 6. Tax / GST on Service Fees (DEBIT)
    if (breakdown.tax_on_fees > 0) {
      entries.push({
        seller_id: sellerId,
        order_id: orderId,
        order_number: orderNumber,
        order_item_id: itemId,
        entry_type: 'TAX',
        direction: 'DEBIT',
        amount: breakdown.tax_on_fees,
        status: 'COMPLETED',
        idempotency_key: `LEDGER_TAX_${orderId}_${itemId}`,
        title: `GST on Marketplace Service Fees (18%)`,
        description: `Statutory GST on platform commission, fixed fee, and collection fee.`,
        metadata: { gst_rate: 18 }
      });
    }
  });

  return entries;
}

/**
 * Creates immutable ledger entries for an approved Return & Refund event.
 */
export function generateReturnRefundLedgerEntries(params: {
  sellerId: string;
  orderId: string;
  orderNumber: string;
  returnId: string;
  refundAmount: number;
  isSellerFault?: boolean;
  rules?: MarketplaceFinancialRules;
}) {
  const { sellerId, orderId, orderNumber, returnId, refundAmount, isSellerFault = false, rules = DEFAULT_FINANCIAL_RULES } = params;
  const entries: any[] = [];

  // 1. Customer Refund debit
  entries.push({
    seller_id: sellerId,
    order_id: orderId,
    order_number: orderNumber,
    entry_type: 'REFUND',
    direction: 'DEBIT',
    amount: Math.max(0, refundAmount),
    status: 'COMPLETED',
    idempotency_key: `LEDGER_REFUND_${orderId}_${returnId}`,
    title: `Customer Return Refund Deduction`,
    description: `Product returned and refund approved following QC inspection.`,
    metadata: { return_id: returnId }
  });

  // 2. Reverse Shipping (if policy or seller fault)
  if (isSellerFault && rules.reverse_shipping_fee) {
    entries.push({
      seller_id: sellerId,
      order_id: orderId,
      order_number: orderNumber,
      entry_type: 'RETURN_FEE',
      direction: 'DEBIT',
      amount: rules.reverse_shipping_fee,
      status: 'COMPLETED',
      idempotency_key: `LEDGER_REV_SHIP_${orderId}_${returnId}`,
      title: `Reverse Logistics Courier Fee`,
      description: `Courier charge for return pickup from customer.`,
      metadata: { return_id: returnId }
    });
  }

  return entries;
}

/**
 * Creates immutable ledger entries for an RTO (Return To Origin) event.
 */
export function generateRtoLedgerEntries(params: {
  sellerId: string;
  orderId: string;
  orderNumber: string;
  rules?: MarketplaceFinancialRules;
}) {
  const { sellerId, orderId, orderNumber, rules = DEFAULT_FINANCIAL_RULES } = params;
  const rtoFee = rules.rto_charge || 50;

  return [{
    seller_id: sellerId,
    order_id: orderId,
    order_number: orderNumber,
    entry_type: 'RTO_FEE',
    direction: 'DEBIT',
    amount: rtoFee,
    status: 'COMPLETED',
    idempotency_key: `LEDGER_RTO_${orderId}`,
    title: `Courier RTO Handling Charge`,
    description: `Undelivered shipment returned to origin by courier partner.`,
    metadata: { rto_fee: rtoFee }
  }];
}


