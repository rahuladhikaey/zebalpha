export interface SellerSettlement {
  id: string;
  seller_id: string;
  seller_name?: string;
  seller_email?: string;
  amount: number;
  upi_id: string;
  payment_method: 'PhonePe' | 'UPI' | 'GPay' | 'Bank Transfer';
  utr_number?: string;
  status: 'PENDING' | 'PAID' | 'REJECTED';
  paid_at?: string;
  created_at: string;
  notes?: string;
}

export interface SellerPaymentDetails {
  upi_id: string;
  payment_method: 'PhonePe' | 'UPI' | 'GPay' | 'Bank Transfer';
  account_name?: string;
  phone_number?: string;
  updated_at?: string;
}

export interface SellerSettlementMethod {
  id: string;
  seller_id: string;
  method_type: 'UPI' | 'BANK';
  upi_id?: string;
  destination_raw?: string;
  masked_destination: string;
  verified_name?: string;
  is_verified: boolean;
  is_default: boolean;
  status: 'PENDING' | 'VERIFIED' | 'FAILED' | 'REJECTED';
  provider?: string;
  provider_reference?: string;
  failure_reason?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at?: string;
}

export interface SellerPayoutRequest {
  id: string;
  payout_number: string;
  seller_id?: string;
  seller_name?: string;
  seller_business_name?: string;
  seller_email?: string;
  settlement_method_id?: string;
  method_type: 'UPI' | 'BANK';
  destination_masked: string;
  destination_upi?: string;
  beneficiary_name?: string;
  amount: number;
  currency?: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'SUCCESS' | 'FAILED' | 'CANCELLED' | 'REVERSED' | 'RECONCILIATION_REQUIRED';
  provider?: string;
  provider_payout_id?: string;
  provider_status?: string;
  utr_number?: string;
  failure_reason?: string;
  idempotency_key?: string;
  notes?: string;
  retry_count?: number;
  last_reconciled_at?: string;
  stuck_flag?: boolean;
  reconciliation_notes?: string;
  initiated_at: string;
  processed_at?: string;
  created_at: string;
  updated_at?: string;
  sellers?: {
    id?: string;
    business_name?: string;
    owner_name?: string;
    email?: string;
    mobile_number?: string;
  };
}

export interface AdminSettlementOverview {
  total_seller_earnings: number;
  total_pending_balance: number;
  total_available_balance: number;
  total_reserved_balance: number;
  total_withdrawn: number;
  total_withdrawals_count: number;
  total_processing_payouts: number;
  total_processing_amount: number;
  total_successful_payouts: number;
  total_successful_amount: number;
  total_failed_payouts: number;
  total_failed_amount: number;
  total_reversed_payouts: number;
  total_reversed_amount: number;
  reconciliation_issues_count: number;
  stuck_payouts_count: number;
}

export interface AdminAuditLog {
  id: string;
  admin_id: string;
  admin_email?: string;
  action: string;
  target_seller_id?: string;
  payout_request_id?: string;
  previous_state?: Record<string, any>;
  new_state?: Record<string, any>;
  reason: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}
