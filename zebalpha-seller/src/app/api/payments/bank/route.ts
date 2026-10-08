import { NextResponse } from "next/server";
import { supabaseServer } from "@shared/utils/supabaseServer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * POST /api/payments/bank
 * Saves or updates seller bank account with masking and change-protection status.
 */
export async function POST(req: Request) {
  try {
    const { data: { user } } = await supabaseServer.auth.getUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { accountHolderName, bankName, accountNumber, ifscCode, upiId } = await req.json();

    if (!accountHolderName || !bankName || !accountNumber || !ifscCode) {
      return NextResponse.json({
        success: false,
        error: "Account Holder Name, Bank Name, Account Number, and IFSC are required"
      }, { status: 400 });
    }

    // Resolve seller ID
    const { data: seller } = await supabaseServer
      .from("sellers")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    const sellerId = seller?.id || user.id;

    // Mask account number: e.g. "•••• •••• 1234"
    const cleanAcc = String(accountNumber).trim();
    const last4 = cleanAcc.slice(-4);
    const maskedAccountNumber = `•••• •••• ${last4}`;

    // Insert new bank record with status 'BANK_CHANGE_PENDING' for fraud protection
    const { data: newBank, error: bankErr } = await supabaseServer
      .from("seller_bank_accounts")
      .insert([{
        seller_id: sellerId,
        account_holder_name: accountHolderName.trim(),
        bank_name: bankName.trim(),
        account_number: cleanAcc,
        masked_account_number: maskedAccountNumber,
        ifsc_code: ifscCode.trim().toUpperCase(),
        upi_id: upiId ? upiId.trim() : null,
        is_verified: false,
        status: "BANK_CHANGE_PENDING",
        change_requested_at: new Date().toISOString(),
        notes: "Bank details updated by seller. Awaiting admin review."
      }])
      .select()
      .single();

    if (bankErr) {
      console.error("[Bank Update Error]:", bankErr);
      return NextResponse.json({ success: false, error: bankErr.message }, { status: 500 });
    }

    // Also mirror UPI to sellers table if provided
    if (upiId) {
      await supabaseServer
        .from("sellers")
        .update({ phonepay_number: upiId.trim(), phonepay_no: upiId.trim() })
        .eq("id", sellerId);
    }

    return NextResponse.json({
      success: true,
      message: "Bank details submitted successfully. Verification status: Review Pending.",
      bankAccount: {
        id: newBank.id,
        bank_name: newBank.bank_name,
        account_holder_name: newBank.account_holder_name,
        masked_account_number: newBank.masked_account_number,
        ifsc_code: newBank.ifsc_code,
        upi_id: newBank.upi_id,
        is_verified: false,
        status: "BANK_CHANGE_PENDING"
      }
    });
  } catch (err: any) {
    console.error("[Bank API Exception]:", err);
    return NextResponse.json({ success: false, error: err?.message || "Internal server error" }, { status: 500 });
  }
}
