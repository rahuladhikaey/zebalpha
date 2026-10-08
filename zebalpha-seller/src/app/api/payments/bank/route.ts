import { NextRequest, NextResponse } from "next/server";
import { supabaseServer, createSupabaseServerClient } from "@shared/utils/supabaseServer";
import {
  encryptAccountNumber,
  hashAccountNumber,
  maskAccountNumber,
  validateBankInput,
  checkBankRateLimit
} from "@/shared/services/bankSecurityService";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Helper to authenticate seller session from cookies or Authorization Bearer header
 */
async function getAuthenticatedUser(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) return user;
  } catch (_) {}

  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    const { data: tokenUser } = await supabaseServer.auth.getUser(token);
    if (tokenUser?.user) return tokenUser.user;
  }

  return null;
}

/**
 * POST /api/payments/bank
 * Secure Bank Vault Endpoint
 * Encrypts bank account number with AES-256-GCM, stores HMAC blind index, 
 * enforces rate limiting, logs audit trails, and activates anti-fraud payout hold.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized access. Please log in." }, { status: 401 });
    }

    // Extract client IP and User-Agent for audit & anti-fraud tracking
    const forwarded = req.headers.get("x-forwarded-for");
    const ip = (forwarded ? forwarded.split(",")[0] : req.headers.get("x-real-ip")) || "unknown-ip";
    const userAgent = req.headers.get("user-agent") || "unknown-agent";

    // Rate Limiting: Max 3 bank update attempts per 30 minutes
    const rateCheck = checkBankRateLimit(`${user.id}:${ip}`);
    if (!rateCheck.allowed) {
      return NextResponse.json({
        success: false,
        error: `Too many bank update attempts. For security reasons, please retry in ${rateCheck.retryAfterSeconds} seconds.`
      }, { status: 429 });
    }

    const body = await req.json();
    const { accountHolderName, bankName, accountNumber, confirmAccountNumber, ifscCode, upiId } = body;

    // Strict multi-layer validation
    const validation = validateBankInput({
      accountHolderName,
      bankName,
      accountNumber,
      confirmAccountNumber,
      ifscCode,
      upiId
    });

    if (!validation.valid || !validation.cleaned) {
      return NextResponse.json({
        success: false,
        error: validation.error || "Invalid bank details provided"
      }, { status: 400 });
    }

    const {
      accountHolderName: cleanHolder,
      bankName: cleanBank,
      accountNumber: cleanAcc,
      ifscCode: cleanIfsc,
      upiId: cleanUpi
    } = validation.cleaned;

    // Resolve seller ID strictly tied to authenticated user ID
    const { data: seller } = await supabaseServer
      .from("sellers")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    const sellerId = seller?.id || user.id;

    // Cryptographic Vault Operations
    const encryptedAccount = encryptAccountNumber(cleanAcc);
    const accountHash = hashAccountNumber(cleanAcc);
    const maskedAccount = maskAccountNumber(cleanAcc);

    // 48-Hour Anti-Takeover Security Hold
    const holdUntil = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

    // Insert bank record: account_number column receives ONLY masked string to eliminate plaintext exposure
    const { data: newBank, error: bankErr } = await supabaseServer
      .from("seller_bank_accounts")
      .insert([{
        seller_id: sellerId,
        account_holder_name: cleanHolder,
        bank_name: cleanBank,
        account_number: maskedAccount, // legacy column populated with masked string
        masked_account_number: maskedAccount,
        encrypted_account_number: encryptedAccount,
        account_number_hash: accountHash,
        ifsc_code: cleanIfsc,
        upi_id: cleanUpi,
        is_verified: false,
        status: "BANK_CHANGE_PENDING",
        change_requested_at: new Date().toISOString(),
        last_payout_hold_until: holdUntil,
        change_ip_address: ip,
        change_user_agent: userAgent,
        notes: "Bank credentials encrypted via AES-256-GCM. 48-hour security payout hold active."
      }])
      .select()
      .single();

    if (bankErr) {
      console.error("[Bank Vault Error]:", bankErr);
      return NextResponse.json({ success: false, error: bankErr.message }, { status: 500 });
    }

    // Record immutable audit entry
    try {
      await supabaseServer
        .from("seller_bank_audit_logs")
        .insert([{
          seller_id: sellerId,
          actor_id: user.id,
          action: "MODIFIED",
          masked_account_number: maskedAccount,
          ifsc_code: cleanIfsc,
          bank_name: cleanBank,
          account_holder_name: cleanHolder,
          ip_address: ip,
          user_agent: userAgent,
          notes: "Bank update secured via AES-256-GCM. Payouts locked for 48-hour compliance review."
        }]);
    } catch (auditErr) {
      // Non-blocking if table migration is pending
      console.warn("[Bank Audit Warning]:", auditErr);
    }

    // Mirror UPI to sellers table if provided
    if (cleanUpi) {
      await supabaseServer
        .from("sellers")
        .update({ phonepay_number: cleanUpi, phonepay_no: cleanUpi })
        .eq("id", sellerId);
    }

    // Safe Response: Return strictly masked details, never plaintext or ciphertext
    return NextResponse.json({
      success: true,
      message: "Bank details encrypted and submitted successfully. A 48-hour security hold is active for fraud protection.",
      bankAccount: {
        id: newBank.id,
        bank_name: newBank.bank_name,
        account_holder_name: newBank.account_holder_name,
        masked_account_number: newBank.masked_account_number,
        ifsc_code: newBank.ifsc_code,
        upi_id: newBank.upi_id,
        is_verified: false,
        status: "BANK_CHANGE_PENDING",
        last_payout_hold_until: holdUntil
      }
    });
  } catch (err: any) {
    console.error("[Bank API Exception]:", err);
    return NextResponse.json({ success: false, error: err?.message || "Internal server error" }, { status: 500 });
  }
}
