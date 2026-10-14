import { NextRequest, NextResponse } from "next/server";
import { supabaseServer, createSupabaseServerClient } from "@/shared/utils/supabaseServer";
import { verifyUpiWithProvider } from "@/shared/services/razorpayPayoutService";
import { checkBankRateLimit } from "@/shared/services/bankSecurityService";

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

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized access" }, { status: 401 });
    }

    const forwarded = req.headers.get("x-forwarded-for");
    const ip = (forwarded ? forwarded.split(",")[0] : req.headers.get("x-real-ip")) || "unknown-ip";

    // Rate Limit: Max 6 verification attempts per 10 minutes
    const rateCheck = checkBankRateLimit(`upi_verify:${user.id}:${ip}`, 6, 10 * 60 * 1000);
    if (!rateCheck.allowed) {
      return NextResponse.json({
        success: false,
        error: `Too many verification requests. Please wait ${rateCheck.retryAfterSeconds} seconds before trying again.`
      }, { status: 429 });
    }

    const { vpa } = await req.json();

    if (!vpa || typeof vpa !== "string") {
      return NextResponse.json({ success: false, error: "UPI ID is required" }, { status: 400 });
    }

    // Resolve seller's registered legal/business name
    const { data: seller } = await supabaseServer
      .from("sellers")
      .select("owner_name, full_name, business_name")
      .eq("user_id", user.id)
      .maybeSingle();

    const sellerName = seller?.owner_name || seller?.full_name || seller?.business_name || "";

    const result = await verifyUpiWithProvider(vpa, sellerName);

    if (!result.success || !result.verified) {
      return NextResponse.json({
        success: false,
        verified: false,
        verificationStatus: result.verificationStatus || 'failed',
        beneficiaryNameMasked: result.beneficiaryNameMasked,
        verifiedName: result.verifiedName,
        registeredSellerName: sellerName,
        matchResult: result.matchResult,
        error: result.error || "Unable to verify this UPI ID with the banking network."
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      verified: true,
      verificationStatus: 'verified',
      vpa: result.vpa,
      maskedVpa: result.maskedVpa,
      verifiedName: result.verifiedName,
      beneficiaryNameMasked: result.beneficiaryNameMasked,
      registeredSellerName: sellerName,
      matchResult: result.matchResult,
      providerReference: result.providerReference
    });
  } catch (err: any) {
    console.error("[Verify UPI Route Exception]:", err);
    return NextResponse.json({
      success: false,
      error: err?.message || "Internal server error during UPI verification"
    }, { status: 500 });
  }
}
