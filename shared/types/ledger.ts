export type LedgerTransactionType = 
  | 'SALE'
  | 'SALE_CREDIT'
  | 'COMMISSION'
  | 'COMMISSION_DEDUCTION'
  | 'FIXED_FEE'
  | 'SHIPPING_FEE'
  | 'COLLECTION_FEE'
  | 'RETURN_FEE'
  | 'RTO_FEE'
  | 'RETURN_ADJUSTMENT'
  | 'REFUND'
  | 'REFUND_ADJUSTMENT'
  | 'PARTIAL_REFUND'
  | 'CANCELLATION'
  | 'ADJUSTMENT_CREDIT'
  | 'ADJUSTMENT_DEBIT'
  | 'TAX'
  | 'CHARGEBACK'
  | 'SETTLEMENT'
  | 'SETTLEMENT_REVERSAL'
  | 'WITHDRAWAL_REQUESTED'
  | 'WITHDRAWAL_PROCESSING'
  | 'WITHDRAWAL_SUCCESS'
  | 'WITHDRAWAL_FAILED'
  | 'WITHDRAWAL_REVERSED'
  | 'PENALTY'
  | 'PROMOTIONAL_ADJUSTMENT';

export type LedgerEntryType = 'CREDIT' | 'DEBIT';

export type LedgerTransactionStatus = 'PENDING' | 'COMPLETED' | 'HELD' | 'REVERSED';

export interface LedgerTransaction {
  id: string;
  seller_id: string;
  order_id?: string;
  order_item_id?: string;
  settlement_id?: string;
  transaction_type: LedgerTransactionType;
  entry_type: LedgerEntryType;
  amount: number;
  currency: string;
  balance_after: number;
  status: LedgerTransactionStatus;
  description: string;
  reference_id?: string;
  idempotency_key?: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface SellerLedgerBalances {
  gross_sales: number;
  commission: number;
  shipping_fees: number;
  fixed_fees: number;
  collection_fees: number;
  returns_and_refunds: number;
  total_platform_fees: number;
  net_seller_earnings: number;
  total_settled: number;
  available_balance: number;
  reserved_balance: number;
  pending_settlement: number;
  on_hold_balance: number;
}

export interface MarketplaceFinancialRules {
  commission_percentage: number;
  fixed_fee_per_order: number;
  payment_collection_fee_pct: number;
  cod_handling_fee: number;
  standard_shipping_fee: number;
  reverse_shipping_fee: number;
  rto_charge: number;
  gst_on_platform_fees_pct: number;
  settlement_delay_days: number;
  customer_return_window_days: number;
  tiers?: {
    standard: {
      commission_pct: number;
      settlement_delay_days: number;
    };
    premium: {
      commission_pct: number;
      settlement_delay_days: number;
    };
  };
}

export interface SellerBankAccount {
  id: string;
  seller_id: string;
  account_holder_name: string;
  bank_name: string;
  account_number?: string;
  masked_account_number: string;
  encrypted_account_number?: string;
  account_number_hash?: string;
  ifsc_code: string;
  upi_id?: string | null;
  is_verified: boolean;
  status: 'ACTIVE' | 'BANK_CHANGE_PENDING' | 'REJECTED';
  change_requested_at?: string;
  last_payout_hold_until?: string;
  verified_at?: string;
  verified_by?: string;
  notes?: string;
  created_at: string;
  updated_at?: string;
}

export interface ReturnQCDetails {
  received: boolean;
  packaging_ok: boolean;
  product_used: boolean;
  product_damaged: boolean;
  wrong_product: boolean;
  accessories_missing: boolean;
  result: 'PENDING' | 'PASS' | 'FAIL' | 'PARTIAL' | 'DISPUTED';
  notes?: string;
  images?: string[];
  completed_at?: string;
}

export interface DetailedSettlementRecord {
  id: string;
  settlement_number: string;
  seller_id: string;
  week_number: number;
  start_date: string;
  end_date: string;
  total_orders: number;
  gross_sales: number;
  commission_deducted: number;
  platform_fees?: number;
  fixed_fees?: number;
  collection_fees?: number;
  shipping_fees?: number;
  return_charges?: number;
  refund_adjustments?: number;
  other_adjustments?: number;
  taxes: number;
  net_amount: number;
  status: 'PENDING' | 'ELIGIBLE' | 'PROCESSING' | 'PROCESSED' | 'PAID' | 'FAILED' | 'ON_HOLD' | 'REVERSED';
  payout_status?: string;
  transaction_id?: string;
  utr_number?: string;
  bank_name?: string;
  account_masked?: string;
  ifsc_code?: string;
  payment_date?: string;
  processed_at?: string;
  receipt_number?: string;
  receipt_pdf_url?: string;
  created_at: string;
  orders?: any[];
}
