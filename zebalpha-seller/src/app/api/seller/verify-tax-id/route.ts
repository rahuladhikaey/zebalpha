import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/shared/utils/supabaseServer";
import { checkRateLimit } from "@/shared/services/securityTokenService";
import { GstnGspVerificationService } from "@/shared/services/gstnGspService";
import {
  DUPLICATE_IDENTITY_SUPPORT_MESSAGE,
  validateEnrolmentIdFormat,
  validateGstinFormat,
} from "@/shared/utils/indianGstCompliance";

export const dynamic = "force-dynamic";

/**
 * POST /api/seller/verify-tax-id
 * Meesho-style PAN-less GSTIN / Enrolment ID Verifier for /register.
 * - Validates 15-char GSTIN (format + Mod-36 checksum) OR 15-char GST Enrolment ID format.
 * - Checks existing public.sellers for duplicate GSTIN / Enrolment ID (never leaks other seller PII).
 * - Verifies real/fake & active status via GSTN/GSP adapter, and checks Enrolment ID ownership
 *   against the seller's Mobile & Email (NO PAN, NO Bank Account, NO Aadhaar needed!).
 */
export async function POST(req: NextRequest) {
  try {
    const clientIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown-ip";

    if (!checkRateLimit(`preverify_tax_${clientIp}`, 12, 10 * 60 * 1000)) {
      return NextResponse.json(
        { success: false, error: "Too many verification attempts. Please wait a few minutes." },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const mode = String(body.mode || "ENROLMENT_ID").toUpperCase() === "GSTIN" ? "GSTIN" : "ENROLMENT_ID";
    const taxId = String(body.taxId || body.gstin || body.enrolmentId || "").trim().toUpperCase();
    const mobile = String(body.mobile || "").replace(/\D/g, "").slice(-10);
    const email = String(body.email || "").trim().toLowerCase();
    const businessName = String(body.businessName || "").trim();

    if (!taxId) {
      return NextResponse.json(
        {
          success: false,
          error:
            mode === "GSTIN"
              ? "Please enter a 15-character GSTIN."
              : "Please enter a 15-character GST Enrolment ID.",
        },
        { status: 400 }
      );
    }

    // 1. Format & checksum validation
    const fmt = mode === "GSTIN" ? validateGstinFormat(taxId) : validateEnrolmentIdFormat(taxId);
    if (!fmt.valid) {
      return NextResponse.json(
        { success: false, formatValid: false, verified: false, error: fmt.error },
        { status: 400 }
      );
    }

    // 2. Duplicate check against existing sellers.gstin column (zero PII leakage)
    const { data: existingSeller } = await supabaseServer
      .from("sellers")
      .select("id")
      .ilike("gstin", fmt.normalized)
      .limit(1)
      .maybeSingle();

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

    // 3. Authoritative GSP / GSTN verification (WITHOUT asking seller for PAN!)
    const gsp = new GstnGspVerificationService();

    if (mode === "GSTIN") {
      const res = await gsp.verifyGstin({
        gstin: fmt.normalized,
        submittedBusinessName: businessName || undefined,
        rateLimitKey: `pre_${clientIp}`,
      });

      return NextResponse.json(
        {
          success: res.verified,
          formatValid: true,
          verified: res.verified,
          outcome: res.outcome,
          manualReviewRequired: res.manualReviewRequired,
          stateName: res.record?.stateName || fmt.stateName,
          legalName: res.record?.legalName || null,
          tradeName: res.record?.tradeName || null,
          registrationStatus: res.record?.registrationStatus || null,
          message: res.verified
            ? `Verified Active GSTIN (${res.record?.legalName} • ${res.record?.stateName})`
            : res.manualReviewRequired
            ? `Valid GSTIN format & checksum (${fmt.stateName}) • Unique on ZebAlpha. Ready for registration!`
            : res.message,
        },
        { status: res.verified ? 200 : res.manualReviewRequired ? 202 : 422 }
      );
    }

    // Enrolment ID: Real/Fake + Mobile & Email ownership check (WITHOUT PAN!)
    const enrRes = await gsp.verifyEnrolmentId({
      enrolmentId: fmt.normalized,
      rateLimitKey: `pre_${clientIp}`,
    });

    if (!enrRes.verified) {
      return NextResponse.json(
        {
          success: false,
          formatValid: true,
          verified: false,
          outcome: enrRes.outcome,
          manualReviewRequired: enrRes.manualReviewRequired,
          stateName: fmt.stateName,
          message: enrRes.manualReviewRequired
            ? `Valid Enrolment ID format (${fmt.stateName}) • Unique on ZebAlpha. Ready for registration!`
            : enrRes.message,
        },
        { status: enrRes.manualReviewRequired ? 202 : 422 }
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
          : contactRes?.message || "Enrolment ID did not match your Mobile/Email registered on GST Portal.",
      },
      { status: fullyOk ? 200 : 422 }
    );
  } catch (err: any) {
    console.error("[POST /api/seller/verify-tax-id Error]:", err?.message);
    return NextResponse.json(
      { success: false, error: "Tax ID verification service error." },
      { status: 500 }
    );
  }
}
