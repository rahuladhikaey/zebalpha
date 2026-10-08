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

export interface SellerBankAccount {
  id: string;
  seller_id: string;
  account_holder_name: string;
  bank_name: string;
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
