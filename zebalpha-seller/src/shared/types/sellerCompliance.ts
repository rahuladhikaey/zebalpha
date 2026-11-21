/**
 * ZebAlpha Production Seller Ecosystem — Canonical Compliance & Verification Types
 */

export const SELLER_LIFECYCLE_STATUSES = [
  "draft",
  "registration_pending",
  "otp_pending",
  "gst_verification_pending",
  "kyc_pending",
  "manual_review",
  "approved",
  "rejected",
  "suspended",
  "reverification_required",
] as const;

export type SellerLifecycleStatus = (typeof SELLER_LIFECYCLE_STATUSES)[number];

export const SELLER_BUSINESS_TYPES = [
  "individual_proprietor",
  "partnership",
  "llp",
  "private_limited",
  "public_limited",
  "opc",
  "huf",
  "other",
] as const;

export type SellerBusinessType = (typeof SELLER_BUSINESS_TYPES)[number];

export type SellerGstCategory =
  | "UNSET"
  | "GSTIN"
  | "ENROLMENT_ID"
  | "LEGACY_GRANDFATHERED";

export type VerificationOutcome =
  | "verified"
  | "mismatch"
  | "invalid"
  | "cancelled"
  | "suspended"
  | "duplicate"
  | "timeout"
  | "unavailable"
  | "token_expired"
  | "rate_limited"
  | "invalid_response"
  | "manual_review"
  | "error";

export interface GstComplianceRule {
  state_code: string;
  state_name: string;
  goods_turnover_threshold_inr: number;
  enrolment_exemption_enabled: boolean;
  allow_services_under_enrolment: boolean;
  allow_interstate_under_enrolment: boolean;
  allow_multi_state_hubs_under_enrolment: boolean;
  notification_ref: string;
  effective_from: string;
}

export interface GstinAuthoritativeRecord {
  gstin: string;
  legalName: string;
  tradeName: string | null;
  registrationStatus: "Active" | "Cancelled" | "Suspended" | "Inactive" | "Unknown";
  constitutionOfBusiness: string | null;
  taxpayerType: string | null;
  stateCode: string;
  stateName: string;
  jurisdiction: string | null;
  principalPlaceOfBusiness: string | null;
  registrationDate: string | null;
  cancellationDate: string | null;
  source: string;
  environment: "sandbox" | "production";
  verifiedAt: string;
  rawEncodedPayload?: string;
}

export interface EnrolmentAuthoritativeRecord {
  enrolmentId: string;
  legalName: string;
  panMasked: string;
  panVerified: boolean;
  registeredStateCode: string;
  registeredStateName: string;
  businessAddress: string | null;
  enrolmentStatus: "Active" | "Cancelled" | "Invalidated" | "Unknown";
  mobileRegisteredMatch?: boolean;
  emailRegisteredMatch?: boolean;
  source: string;
  environment: "sandbox" | "production";
  verifiedAt: string;
  rawEncodedPayload?: string;
}

export interface SellerStateComplianceCheck {
  allowed: boolean;
  code:
    | "ALLOWED_GSTIN"
    | "ALLOWED_INTRA_STATE"
    | "ALLOWED_LEGACY"
    | "INTERSTATE_BLOCKED_ENROLMENT_EXEMPTION"
    | "DISPATCH_STATE_MISMATCH_ENROLMENT"
    | "MISSING_DELIVERY_STATE"
    | "SELLER_NOT_APPROVED"
    | "SERVICE_SUPPLY_NOT_EXEMPT";
  message: string;
  sellerState?: string;
  deliveryState?: string;
  gstCategory?: SellerGstCategory;
}
