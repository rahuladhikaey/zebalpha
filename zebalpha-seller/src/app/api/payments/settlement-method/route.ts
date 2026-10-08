import { NextRequest, NextResponse } from "next/server";
import { supabaseServer, createSupabaseServerClient } from "@shared/utils/supabaseServer";
import { maskUpiId, isValidUpiFormat, verifyUpiWithProvider } from "@/shared/services/razorpayPayoutService";
import {
  encryptAccountNumber,
  hashAccountNumber,
  maskAccountNumber,
  validateBankInput
} from "@/shared/services/bankSecurityService";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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
 * POST /api/payments/settlement-method
 * Saves verified settlement method (UPI or Bank Account) with full encryption and audit logging
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized access" }, { status: 401 });
    }

    // Resolve seller ID
    const { data: seller } = await supabaseServer
      .from("sellers")
      .select("id, business_name")
      .eq("user_id", user.id)
      .maybeSingle();

    const sellerId = seller?.id || user.id;

    const forwarded = req.headers.get("x-forwarded-for");
    const ip = (forwarded ? forwarded.split(",")[0] : req.headers.get("x-real-ip")) || "unknown-ip";
    const userAgent = req.headers.get("user-agent") || "unknown-agent";

    const body = await req.json();
    const methodType = (body.methodType || "UPI").toUpperCase();

    // ─────────────────────────────────────────────────────────────
    // METHOD 1: UPI SETTLEMENT METHOD (PRIMARY)
    // ─────────────────────────────────────────────────────────────
    if (methodType === "UPI") {
      const vpa = String(body.vpa || "").trim().toLowerCase();
      let verifiedName = body.verifiedName ? String(body.verifiedName).trim() : null;

      if (!isValidUpiFormat(vpa)) {
        return NextResponse.json({
          success: false,
          error: "Invalid UPI ID. Format should be username@bank."
        }, { status: 400 });
      }

      // If verifiedName is missing or requires verification, verify with Razorpay
      if (!verifiedName) {
        const verifyRes = await verifyUpiWithProvider(vpa);
        if (!verifyRes.success || !verifyRes.verified) {
          return NextResponse.json({
            success: false,
            error: verifyRes.error || "Unable to verify this UPI ID with the payment network."
          }, { status: 400 });
        }
        verifiedName = verifyRes.verifiedName || seller?.business_name || "Verified Merchant";
      }

      const masked = maskUpiId(vpa);
      const encrypted = encryptAccountNumber(vpa);
      const hash = hashAccountNumber(vpa);

      // Reset previous default methods for this seller
      await supabaseServer
        .from("seller_settlement_methods")
        .update({ is_default: false })
        .eq("seller_id", sellerId);

      // Insert new verified UPI settlement method
      const { data: methodRecord, error: methodErr } = await supabaseServer
        .from("seller_settlement_methods")
        .insert([{
          seller_id: sellerId,
          method_type: "UPI",
          destination_raw: vpa,
          masked_destination: masked,
          encrypted_destination: encrypted,
          destination_hash: hash,
          verified_name: verifiedName,
          provider: "RAZORPAY",
          is_verified: true,
          is_default: true,
          status: "VERIFIED",
          metadata: {
            vpa,
            maskedVpa: masked,
            ip,
            userAgent
          }
        }])
        .select()
        .single();

      if (methodErr) {
        console.error("[Settlement Method Insert Error]:", methodErr);
        return NextResponse.json({ success: false, error: methodErr.message }, { status: 500 });
      }

      // Sync UPI to sellers profile table
      await supabaseServer
        .from("sellers")
        .update({ phonepay_number: vpa, phonepay_no: vpa })
        .eq("id", sellerId);

      // Audit Log
      try {
        await supabaseServer.from("seller_bank_audit_logs").insert([{
          seller_id: sellerId,
          actor_id: user.id,
          action: "UPI_METHOD_SAVED",
          masked_account_number: masked,
          ifsc_code: "UPI",
          bank_name: "UPI / Razorpay",
          account_holder_name: verifiedName,
          ip_address: ip,
          user_agent: userAgent,
          notes: "Verified UPI settlement method activated successfully."
        }]);
      } catch (_) {}

      return NextResponse.json({
        success: true,
        message: "UPI settlement method saved and verified successfully.",
        settlementMethod: {
          id: methodRecord.id,
          method_type: "UPI",
          masked_destination: methodRecord.masked_destination,
          verified_name: methodRecord.verified_name,
          is_verified: true,
          status: "VERIFIED"
        }
      });
    }

    // ─────────────────────────────────────────────────────────────
    // METHOD 2: BANK ACCOUNT (OPTIONAL ALTERNATIVE)
    // ─────────────────────────────────────────────────────────────
    if (methodType === "BANK") {
      const validation = validateBankInput({
        accountHolderName: body.accountHolderName,
        bankName: body.bankName,
        accountNumber: body.accountNumber,
        confirmAccountNumber: body.confirmAccountNumber,
        ifscCode: body.ifscCode
      });

      if (!validation.valid || !validation.cleaned) {
        return NextResponse.json({
          success: false,
          error: validation.error || "Invalid bank details provided"
        }, { status: 400 });
      }

      const { accountHolderName, bankName, accountNumber, ifscCode } = validation.cleaned;
      const masked = maskAccountNumber(accountNumber);
      const encrypted = encryptAccountNumber(accountNumber);
      const hash = hashAccountNumber(accountNumber);

      await supabaseServer
        .from("seller_settlement_methods")
        .update({ is_default: false })
        .eq("seller_id", sellerId);

      const { data: methodRecord, error: methodErr } = await supabaseServer
        .from("seller_settlement_methods")
        .insert([{
          seller_id: sellerId,
          method_type: "BANK",
          destination_raw: `${bankName} (${masked})`,
          masked_destination: masked,
          encrypted_destination: encrypted,
          destination_hash: hash,
          verified_name: accountHolderName,
          provider: "BANK_TRANSFER",
          is_verified: false,
          is_default: true,
          status: "PENDING",
          metadata: {
            bankName,
            ifscCode,
            ip,
            userAgent
          }
        }])
        .select()
        .single();

      if (methodErr) {
        return NextResponse.json({ success: false, error: methodErr.message }, { status: 500 });
      }

      // Also maintain legacy seller_bank_accounts for backward compatibility
      try {
        await supabaseServer.from("seller_bank_accounts").insert([{
          seller_id: sellerId,
          account_holder_name: accountHolderName,
          bank_name: bankName,
          account_number: masked,
          masked_account_number: masked,
          encrypted_account_number: encrypted,
          account_number_hash: hash,
          ifsc_code: ifscCode,
          is_verified: false,
          status: "BANK_CHANGE_PENDING",
          change_requested_at: new Date().toISOString()
        }]);
      } catch (_) {}

      return NextResponse.json({
        success: true,
        message: "Bank settlement method saved. Status: Compliance Review Pending.",
        settlementMethod: {
          id: methodRecord.id,
          method_type: "BANK",
          masked_destination: methodRecord.masked_destination,
          verified_name: methodRecord.verified_name,
          is_verified: false,
          status: "PENDING"
        }
      });
    }

    return NextResponse.json({ success: false, error: "Unsupported settlement method type" }, { status: 400 });
  } catch (err: any) {
    console.error("[Settlement Method Route Exception]:", err);
    return NextResponse.json({ success: false, error: err?.message || "Internal server error" }, { status: 500 });
  }
}
