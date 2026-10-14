import { NextRequest, NextResponse } from "next/server";
import { supabaseServer, createSupabaseServerClient } from "@/shared/utils/supabaseServer";
import { maskUpiId, isValidUpiFormat, verifyUpiWithProvider, maskBeneficiaryName } from "@/shared/services/razorpayPayoutService";
import { encryptSensitiveData, createDeterministicFingerprint } from "@/shared/services/bankSecurityService";

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
 * ZebAlpha Production UPI Verification & Payout Account Engine.
 * Saves seller verified UPI ID as the settlement destination in seller_payout_accounts.
 * Strictly verifies beneficiary name against registered legal/business name.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized access" }, { status: 401 });
    }

    // Resolve seller ID and candidate registered names
    const { data: seller } = await supabaseServer
      .from("sellers")
      .select("id, owner_name, full_name, business_name")
      .eq("user_id", user.id)
      .maybeSingle();

    const { data: profile } = await supabaseServer
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle();

    const sellerId = seller?.id || user.id;
    const candidateNames = Array.from(new Set([
      seller?.owner_name,
      seller?.full_name,
      profile?.full_name,
      seller?.business_name
    ].map(n => String(n || "").trim()).filter(Boolean)));
    const sellerLegalName = candidateNames[0] || seller?.business_name || "";

    const forwarded = req.headers.get("x-forwarded-for");
    const ip = (forwarded ? forwarded.split(",")[0] : req.headers.get("x-real-ip")) || "unknown-ip";
    const userAgent = req.headers.get("user-agent") || "unknown-agent";

    const body = await req.json();
    const vpa = String(body.vpa || body.upiId || body.upi_id || "").trim().toLowerCase();

    if (!vpa) {
      return NextResponse.json({
        success: false,
        error: "UPI ID is required."
      }, { status: 400 });
    }

    if (!isValidUpiFormat(vpa)) {
      return NextResponse.json({
        success: false,
        error: "Invalid UPI ID format. Format should be username@bank (e.g., yourname@okhdfcbank)."
      }, { status: 400 });
    }

    // Real-time verification with NPCI banking network and conservative name matching
    const verifyRes = await verifyUpiWithProvider(vpa, candidateNames.length > 0 ? candidateNames : sellerLegalName);
    const masked = maskUpiId(vpa);
    const verifiedBeneficiaryName = verifyRes.verifiedName || null;
    const maskedBeneficiary = maskBeneficiaryName(verifiedBeneficiaryName || "");
    const verificationStatus = verifyRes.verificationStatus || (verifyRes.verified ? 'verified' : 'failed');

    if (!verifyRes.success || !verifyRes.verified) {
      return NextResponse.json({
        success: false,
        verified: false,
        verificationStatus,
        beneficiaryNameMasked: maskedBeneficiary,
        registeredSellerName: sellerLegalName,
        matchResult: verifyRes.matchResult,
        error: verifyRes.error || "Unable to verify this UPI ID with the banking network."
      }, { status: 400 });
    }

    // Encrypt UPI ID for zero-plaintext vault storage
    const encryptedVpa = encryptSensitiveData(vpa);
    const vpaFingerprint = createDeterministicFingerprint(vpa);

    // Check for duplicate active UPI across other sellers
    const { data: duplicateAccount } = await supabaseServer
      .from("seller_payout_accounts")
      .select("id, seller_id")
      .eq("upi_id_fingerprint", vpaFingerprint)
      .eq("is_active", true)
      .maybeSingle();

    if (duplicateAccount && duplicateAccount.seller_id !== sellerId) {
      return NextResponse.json({
        success: false,
        error: "This UPI ID is already registered and active on another seller account. Please use your own registered UPI ID."
      }, { status: 409 });
    }

    // Deactivate previous active payout accounts for this seller
    await supabaseServer
      .from("seller_payout_accounts")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("seller_id", sellerId)
      .eq("is_active", true);

    // Insert active record in seller_payout_accounts
    const { data: savedPayoutAccount, error: accInsertErr } = await supabaseServer
      .from("seller_payout_accounts")
      .insert([{
        seller_id: sellerId,
        account_type: "upi",
        upi_id_encrypted: encryptedVpa,
        upi_id_fingerprint: vpaFingerprint,
        masked_upi_id: masked,
        provider: "razorpayx",
        beneficiary_name: verifiedBeneficiaryName,
        verification_status: "verified",
        verification_reason: "Beneficiary name matched registered seller name",
        verified_at: new Date().toISOString(),
        last_validation_id: verifyRes.providerReference || null,
        is_active: true,
        metadata: {
          ip,
          userAgent,
          score: verifyRes.matchResult?.score ?? null,
          matchReason: verifyRes.matchResult?.reason ?? null,
          registeredSellerName: sellerLegalName
        }
      }])
      .select()
      .single();

    if (accInsertErr) {
      console.error("[Payout Account Insert Error]:", accInsertErr);
    }

    // Record verification attempt
    if (savedPayoutAccount) {
      await supabaseServer.from("seller_payout_verifications").insert([{
        seller_id: sellerId,
        payout_account_id: savedPayoutAccount.id,
        provider_validation_id: verifyRes.providerReference || null,
        status: "verified",
        provider_account_status: "active",
        beneficiary_match_result: "matched",
        completed_at: new Date().toISOString(),
        metadata: {
          score: verifyRes.matchResult?.score
        }
      }]);
    }

    // Reset previous default methods in seller_settlement_methods
    await supabaseServer
      .from("seller_settlement_methods")
      .update({ is_default: false })
      .eq("seller_id", sellerId);

    // Insert new verified UPI settlement method (with masked destination)
    const { data: methodRecord, error: methodErr } = await supabaseServer
      .from("seller_settlement_methods")
      .insert([{
        seller_id: sellerId,
        method_type: "UPI",
        upi_id: masked, // Store masked in display table
        destination_raw: masked,
        masked_destination: masked,
        verified_name: verifiedBeneficiaryName,
        provider: "RAZORPAYX",
        provider_reference: verifyRes.providerReference || null,
        is_verified: true,
        is_default: true,
        status: "VERIFIED",
        metadata: {
          maskedVpa: masked,
          ip,
          userAgent,
          verifiedAt: new Date().toISOString()
        }
      }])
      .select()
      .single();

    // Sync masked UPI to seller profile table
    await supabaseServer
      .from("sellers")
      .update({ 
        phonepay_number: masked, 
        phonepay_no: masked,
        upi_id: masked,
        route_settlement_method: "UPI",
        route_upi_id: masked,
        route_onboarding_status: "ACTIVE",
        route_verification_status: "VERIFIED",
        auto_settlement_enabled: true,
        updated_at: new Date().toISOString()
      })
      .eq("id", sellerId);

    return NextResponse.json({
      success: true,
      message: "Verified UPI settlement method saved and activated successfully.",
      settlementMethod: {
        id: methodRecord?.id || savedPayoutAccount?.id,
        method_type: "UPI",
        masked_destination: masked,
        verified_name: verifiedBeneficiaryName,
        beneficiary_name_masked: maskedBeneficiary,
        is_verified: true,
        is_default: true,
        status: "VERIFIED",
        verification_status: "verified",
        created_at: methodRecord?.created_at || new Date().toISOString()
      }
    });
  } catch (err: any) {
    console.error("[Save Settlement Method Route Exception]:", err);
    return NextResponse.json({
      success: false,
      error: err?.message || "Internal server error"
    }, { status: 500 });
  }
}

