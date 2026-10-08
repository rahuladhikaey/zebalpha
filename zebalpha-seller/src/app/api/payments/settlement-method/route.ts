import { NextRequest, NextResponse } from "next/server";
import { supabaseServer, createSupabaseServerClient } from "@/shared/utils/supabaseServer";
import { maskUpiId, isValidUpiFormat, verifyUpiWithProvider } from "@/shared/services/razorpayPayoutService";

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
 * ZebAlpha UPI-Only Settlement Account Saver.
 * Saves seller verified UPI ID as the settlement destination.
 * Bank accounts are strictly not collected or stored.
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
    const vpa = String(body.vpa || body.upiId || body.upi_id || "").trim().toLowerCase();
    let verifiedName = body.verifiedName || body.verified_name ? String(body.verifiedName || body.verified_name).trim() : null;
    const providerReference = body.providerReference || body.provider_reference || null;

    if (!vpa) {
      return NextResponse.json({
        success: false,
        error: "UPI ID is required."
      }, { status: 400 });
    }

    if (!isValidUpiFormat(vpa)) {
      return NextResponse.json({
        success: false,
        error: "Invalid UPI ID format. Format should be username@bank."
      }, { status: 400 });
    }

    // If verifiedName is missing, verify with Razorpay
    if (!verifiedName) {
      const verifyRes = await verifyUpiWithProvider(vpa);
      if (!verifyRes.success || !verifyRes.verified) {
        return NextResponse.json({
          success: false,
          error: verifyRes.error || "Unable to verify this UPI ID with the banking network."
        }, { status: 400 });
      }
      verifiedName = verifyRes.verifiedName || seller?.business_name || "Verified Merchant";
    }

    const masked = maskUpiId(vpa);

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
        upi_id: vpa,
        destination_raw: vpa,
        masked_destination: masked,
        verified_name: verifiedName,
        provider: "RAZORPAY",
        provider_reference: providerReference,
        is_verified: true,
        is_default: true,
        status: "VERIFIED",
        metadata: {
          vpa,
          maskedVpa: masked,
          ip,
          userAgent,
          verifiedAt: new Date().toISOString()
        }
      }])
      .select()
      .single();

    if (methodErr) {
      console.error("[Settlement Method Insert Error]:", methodErr);
      return NextResponse.json({ success: false, error: methodErr.message }, { status: 500 });
    }

    // Sync UPI to seller profile table for quick referencing & Razorpay Route settlement
    await supabaseServer
      .from("sellers")
      .update({ 
        phonepay_number: vpa, 
        phonepay_no: vpa,
        upi_id: vpa,
        route_settlement_method: "UPI",
        route_upi_id: vpa,
        route_onboarding_status: "ACTIVE",
        route_verification_status: "VERIFIED",
        auto_settlement_enabled: true,
        updated_at: new Date().toISOString()
      })
      .eq("id", sellerId);

    return NextResponse.json({
      success: true,
      message: "Verified UPI settlement method saved successfully.",
      settlementMethod: {
        id: methodRecord.id,
        method_type: "UPI",
        upi_id: vpa,
        masked_destination: methodRecord.masked_destination,
        verified_name: methodRecord.verified_name,
        is_verified: true,
        is_default: true,
        status: "VERIFIED",
        created_at: methodRecord.created_at
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
