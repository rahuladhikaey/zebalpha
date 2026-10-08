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
  masked_destination: string;
  verified_name?: string;
  is_verified: boolean;
  is_default: boolean;
  status: 'PENDING' | 'VERIFIED' | 'FAILED' | 'REJECTED';
  provider_verification_id?: string;
  failure_reason?: string;
  created_at: string;
  updated_at?: string;
}

export interface SellerPayoutRequest {
  id: string;
  payout_number: string;
  seller_id?: string;
  method_type: 'UPI' | 'BANK';
  destination_masked: string;
  destination_upi?: string;
  beneficiary_name?: string;
  amount: number;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'SUCCESS' | 'FAILED' | 'CANCELLED' | 'REVERSED';
  utr_number?: string;
  provider_payout_id?: string;
  failure_reason?: string;
  idempotency_key?: string;
  initiated_at: string;
  processed_at?: string;
  created_at: string;
}
