import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/shared/utils/supabaseServer";
import { checkRateLimit } from "@/shared/services/securityTokenService";
import { GstnGspVerificationService } from "@/shared/services/gstnGspService";
import {
  DUPLICATE_IDENTITY_SUPPORT_MESSAGE,
  validateEnrolmentIdFormat,
} from "@/shared/utils/indianGstCompliance";

export const dynamic = "force-dynamic";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * POST /api/seller/verify-tax-id
 * Enrolment ID-Only Verifier for /register and /dashboard/settings.
 * - Validates 15-character Indian Enrolment ID format + State code (blocks regular GSTINs).
 * - Checks existing public.sellers for duplicate Enrolment ID (never leaks other seller PII).
 * - Supports live GSP adapter verification if configured, otherwise returns clean
 *   Format + Duplicate check confirmation for smooth onboarding.
 */
export async function POST(req: NextRequest) {
  try {
    const clientIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown-ip";

    if (!checkRateLimit(`preverify_enrolment_${clientIp}`, 12, 10 * 60 * 1000)) {
      return NextResponse.json(
        { success: false, error: "Too many verification attempts. Please wait a few minutes." },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const enrolmentId = String(body.enrolmentId || body.taxId || "").trim().toUpperCase();
    const mobile = String(body.mobile || "").replace(/\D/g, "").slice(-10);
    const email = String(body.email || "").trim().toLowerCase();
    const excludeSellerId =
      typeof body.excludeSellerId === "string" && UUID_REGEX.test(body.excludeSellerId.trim())
        ? body.excludeSellerId.trim()
        : null;

    if (!enrolmentId) {
      return NextResponse.json(
        {
          success: false,
          error: "Please enter a 15-character Enrolment ID.",
        },
        { status: 400 }
      );
    }

    // 1. Strict Enrolment ID format & State code validation (blocks regular GSTINs too)
    const fmt = validateEnrolmentIdFormat(enrolmentId);
    if (!fmt.valid) {
      return NextResponse.json(
        { success: false, formatValid: false, verified: false, error: fmt.error },
        { status: 400 }
      );
    }

    // 2. Duplicate check against existing sellers.gstin column (zero PII leakage)
    let dupQuery = supabaseServer
      .from("sellers")
      .select("id")
      .ilike("gstin", fmt.normalized)
      .limit(1);

    if (excludeSellerId) {
      dupQuery = dupQuery.neq("id", excludeSellerId);
    }

    const { data: existingSeller } = await dupQuery.maybeSingle();

    if (existingSeller) {
      return NextResponse.json(
        {
          success: false,
          formatValid: true,
          duplicate: true,
          verified: false,
          error: DUPLICATE_IDENTITY_SUPPORT_MESSAGE,
        },
        { status: 409 }
      );
    }

    // 3. Optional live GSP verification (falls back cleanly to Format + Duplicate Check mode)
    const gsp = new GstnGspVerificationService();
    const enrRes = await gsp.verifyEnrolmentId({
      enrolmentId: fmt.normalized,
      rateLimitKey: `pre_${clientIp}`,
    });

    if (!enrRes.verified) {
      return NextResponse.json(
        {
          success: enrRes.manualReviewRequired,
          formatValid: true,
          verified: false,
          formatVerifiedOnly: enrRes.manualReviewRequired,
          outcome: enrRes.outcome,
          manualReviewRequired: enrRes.manualReviewRequired,
          stateName: fmt.stateName,
          message: enrRes.manualReviewRequired
            ? `Valid Enrolment ID format (${fmt.stateName}) • Unique on ZebAlpha. Ready for registration!`
            : enrRes.message,
        },
        { status: enrRes.manualReviewRequired ? 200 : 422 }
      );
    }

    let contactRes = null;
    if (mobile.length === 10 && email.includes("@")) {
      contactRes = await gsp.validateEnrolmentContact({
        enrolmentId: fmt.normalized,
        mobile,
        email,
        rateLimitKey: `pre_c_${clientIp}`,
      });
    }

    const fullyOk = !contactRes || contactRes.verified;
    return NextResponse.json(
      {
        success: fullyOk,
        formatValid: true,
        verified: fullyOk,
        outcome: fullyOk ? "verified" : contactRes?.outcome || "mismatch",
        manualReviewRequired: Boolean(contactRes?.manualReviewRequired),
        stateName: enrRes.record?.registeredStateName || fmt.stateName,
        legalName: enrRes.record?.legalName || null,
        mobileMatched: contactRes?.mobileMatched,
        emailMatched: contactRes?.emailMatched,
        message: fullyOk
          ? `Verified Active Enrolment ID (${enrRes.record?.legalName} • ${enrRes.record?.registeredStateName})`
          : contactRes?.message || "Enrolment ID did not match your registered Mobile/Email.",
      },
      { status: fullyOk ? 200 : 422 }
    );
  } catch (err: any) {
    console.error("[POST /api/seller/verify-tax-id Error]:", err?.message);
    return NextResponse.json(
      { success: false, error: "Enrolment ID verification service error." },
      { status: 500 }
    );
  }
}
