/**
 * ZebAlpha Indian GST, PAN, Enrolment ID & Notification No. 34/2023-Central Tax
 * Server-Side Validation, State Normalization & PII Redaction Engine.
 *
 * CRITICAL COMPLIANCE INVARIANT:
 * - Format validation NEVER equals GSTN verification.
 * - Turnover thresholds are NEVER hardcoded here; callers pass configurable
 *   rules loaded from public.gst_compliance_rules.
 */

import type {
  GstComplianceRule,
  SellerGstCategory,
  SellerStateComplianceCheck,
} from "../types/sellerCompliance";

export interface IndianStateInfo {
  code: string;
  name: string;
  aliases: string[];
  pinPrefixes: string[];
}

/**
 * Official 36 Indian States & Union Territories with GST State Codes (01-38)
 * and India Post 2-digit / 3-digit PIN prefix routing ranges.
 */
export const INDIAN_STATES: IndianStateInfo[] = [
  { code: "01", name: "Jammu and Kashmir", aliases: ["jk", "j&k", "jammu & kashmir", "jammu kashmir"], pinPrefixes: ["18", "19"] },
  { code: "02", name: "Himachal Pradesh", aliases: ["hp", "himachal"], pinPrefixes: ["17"] },
  { code: "03", name: "Punjab", aliases: ["pb", "punjab"], pinPrefixes: ["14", "15", "16"] },
  { code: "04", name: "Chandigarh", aliases: ["ch", "chandigarh"], pinPrefixes: ["160"] },
  { code: "05", name: "Uttarakhand", aliases: ["uk", "ua", "uttaranchal"], pinPrefixes: ["24", "26"] },
  { code: "06", name: "Haryana", aliases: ["hr", "haryana"], pinPrefixes: ["12", "13"] },
  { code: "07", name: "Delhi", aliases: ["dl", "new delhi", "nct of delhi", "nct delhi"], pinPrefixes: ["11"] },
  { code: "08", name: "Rajasthan", aliases: ["rj", "rajasthan"], pinPrefixes: ["30", "31", "32", "33", "34"] },
  { code: "09", name: "Uttar Pradesh", aliases: ["up", "uttar pradesh"], pinPrefixes: ["20", "21", "22", "23", "25", "27", "28"] },
  { code: "10", name: "Bihar", aliases: ["br", "bihar"], pinPrefixes: ["80", "81", "82", "84", "85"] },
  { code: "11", name: "Sikkim", aliases: ["sk", "sikkim"], pinPrefixes: ["737"] },
  { code: "12", name: "Arunachal Pradesh", aliases: ["ar", "arunachal"], pinPrefixes: ["790", "791", "792"] },
  { code: "13", name: "Nagaland", aliases: ["nl", "nagaland"], pinPrefixes: ["797", "798"] },
  { code: "14", name: "Manipur", aliases: ["mn", "manipur"], pinPrefixes: ["795"] },
  { code: "15", name: "Mizoram", aliases: ["mz", "mizoram"], pinPrefixes: ["796"] },
  { code: "16", name: "Tripura", aliases: ["tr", "tripura"], pinPrefixes: ["799"] },
  { code: "17", name: "Meghalaya", aliases: ["ml", "meghalaya"], pinPrefixes: ["793", "794"] },
  { code: "18", name: "Assam", aliases: ["as", "assam"], pinPrefixes: ["78"] },
  { code: "19", name: "West Bengal", aliases: ["wb", "west bengal", "westbengal", "bengal"], pinPrefixes: ["70", "71", "72", "73", "74"] },
  { code: "20", name: "Jharkhand", aliases: ["jh", "jharkhand"], pinPrefixes: ["814", "815", "816", "825", "826", "827", "828", "829", "83"] },
  { code: "21", name: "Odisha", aliases: ["od", "or", "orissa", "odisha"], pinPrefixes: ["75", "76", "77"] },
  { code: "22", name: "Chhattisgarh", aliases: ["cg", "ct", "chattisgarh", "chhattisgarh"], pinPrefixes: ["49"] },
  { code: "23", name: "Madhya Pradesh", aliases: ["mp", "madhya pradesh"], pinPrefixes: ["45", "46", "47", "48"] },
  { code: "24", name: "Gujarat", aliases: ["gj", "gujarat"], pinPrefixes: ["36", "37", "38", "39"] },
  { code: "26", name: "Dadra and Nagar Haveli and Daman and Diu", aliases: ["dn", "dd", "dnhdd", "daman and diu", "dadra and nagar haveli"], pinPrefixes: ["396"] },
  { code: "27", name: "Maharashtra", aliases: ["mh", "maharashtra"], pinPrefixes: ["40", "41", "42", "43", "44"] },
  { code: "29", name: "Karnataka", aliases: ["ka", "karnataka"], pinPrefixes: ["56", "57", "58", "59"] },
  { code: "30", name: "Goa", aliases: ["ga", "goa"], pinPrefixes: ["403"] },
  { code: "31", name: "Lakshadweep", aliases: ["ld", "lakshadweep"], pinPrefixes: ["682"] },
  { code: "32", name: "Kerala", aliases: ["kl", "kerala"], pinPrefixes: ["67", "68", "69"] },
  { code: "33", name: "Tamil Nadu", aliases: ["tn", "tamil nadu", "tamilnadu"], pinPrefixes: ["60", "61", "62", "63", "64"] },
  { code: "34", name: "Puducherry", aliases: ["py", "pondicherry", "puducherry"], pinPrefixes: ["605", "609", "673"] },
  { code: "35", name: "Andaman and Nicobar Islands", aliases: ["an", "andaman", "andaman & nicobar"], pinPrefixes: ["744"] },
  { code: "36", name: "Telangana", aliases: ["ts", "tg", "telangana"], pinPrefixes: ["50"] },
  { code: "37", name: "Andhra Pradesh", aliases: ["ap", "andhra pradesh", "andhra"], pinPrefixes: ["51", "52", "53"] },
  { code: "38", name: "Ladakh", aliases: ["la", "ladakh"], pinPrefixes: ["194"] },
];

const GST_CHECKSUM_CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export function normalizeIndianState(rawState?: string | null): IndianStateInfo | null {
  if (!rawState || typeof rawState !== "string") return null;
  const cleaned = rawState
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9&\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return null;

  // Match by 2-digit GST state code
  if (/^\d{2}$/.test(cleaned)) {
    return INDIAN_STATES.find((s) => s.code === cleaned) || null;
  }

  for (const state of INDIAN_STATES) {
    if (state.name.toLowerCase() === cleaned) return state;
    if (state.aliases.includes(cleaned)) return state;
  }

  // Substring fallback for full address strings containing state name
  for (const state of INDIAN_STATES) {
    if (cleaned.includes(state.name.toLowerCase())) return state;
  }

  return null;
}

export function resolveStateFromPincode(rawPincode?: string | null): IndianStateInfo | null {
  const pin = String(rawPincode || "").replace(/\D/g, "");
  if (pin.length !== 6) return null;

  // Check more specific 3-digit prefixes first (e.g. 744 Andaman, 737 Sikkim, 403 Goa, 160 Chandigarh, 194 Ladakh)
  const p3 = pin.slice(0, 3);
  for (const state of INDIAN_STATES) {
    if (state.pinPrefixes.includes(p3)) return state;
  }

  const p2 = pin.slice(0, 2);
  for (const state of INDIAN_STATES) {
    if (state.pinPrefixes.includes(p2)) return state;
  }

  return null;
}

export function resolveStateFromAddressOrPin(input: {
  state?: string | null;
  pincode?: string | null;
  addressText?: string | null;
}): IndianStateInfo | null {
  const fromExplicitState = normalizeIndianState(input.state);
  if (fromExplicitState) return fromExplicitState;

  // Extract 6-digit PIN from address text if not provided separately
  let pin = String(input.pincode || "").replace(/\D/g, "");
  if (pin.length !== 6 && input.addressText) {
    const match =
      input.addressText.match(/(?:pin|pincode|postal)?\s*[:\-]?\s*(\d{6})\b/i) ||
      input.addressText.match(/\b(\d{6})\b/);
    if (match) pin = match[1];
  }

  const fromPin = resolveStateFromPincode(pin);
  if (fromPin) return fromPin;

  if (input.addressText) {
    return normalizeIndianState(input.addressText);
  }

  return null;
}

/**
 * Computes the official 15th GSTIN check character (Mod-36 algorithm per GSTN specification).
 */
export function computeGstinChecksum(gstin14: string): string {
  const clean = gstin14.trim().toUpperCase();
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    const charVal = GST_CHECKSUM_CHARS.indexOf(clean[i]);
    if (charVal < 0) return "";
    const factor = i % 2 === 0 ? 1 : 2;
    const product = charVal * factor;
    const quotient = Math.floor(product / 36);
    const remainder = product % 36;
    sum += quotient + remainder;
  }
  const checkCodePoint = (36 - (sum % 36)) % 36;
  return GST_CHECKSUM_CHARS[checkCodePoint];
}

export interface FormatValidationResult {
  valid: boolean;
  normalized: string;
  stateCode?: string;
  stateName?: string;
  embeddedPan?: string;
  error?: string;
}

/**
 * Validates Indian PAN format: 5 letters + 4 digits + 1 letter.
 * 4th character denotes holder type (P, C, H, F, A, T, B, L, J, G).
 */
export function validatePanFormat(rawPan: string): FormatValidationResult {
  const normalized = String(rawPan || "").replace(/\s+/g, "").toUpperCase();
  const panRegex = /^[A-Z]{3}[ABCFGHLJPTF][A-Z][0-9]{4}[A-Z]$/;
  if (!panRegex.test(normalized)) {
    return {
      valid: false,
      normalized,
      error: "Invalid PAN format. Expected 10-character Indian PAN (e.g., ABCDE1234F).",
    };
  }
  return { valid: true, normalized };
}

/**
 * Validates Indian 15-character GSTIN format, State code, embedded PAN, and Mod-36 checksum.
 * NOTE: Format validity ONLY checks structure; authoritative verification MUST call GSP/GSTN API.
 */
export function validateGstinFormat(rawGstin: string): FormatValidationResult {
  const normalized = String(rawGstin || "").replace(/\s+/g, "").toUpperCase();
  const gstinRegex = /^([0-9]{2})([A-Z]{5}[0-9]{4}[A-Z])[1-9A-Z]Z[0-9A-Z]$/;
  const match = normalized.match(gstinRegex);
  if (!match) {
    return {
      valid: false,
      normalized,
      error: "Invalid GSTIN format. GSTIN must be a valid 15-character code (2-digit State + 10-char PAN + Entity + Z + Checksum).",
    };
  }

  const stateCode = match[1];
  const embeddedPan = match[2];
  const stateInfo = INDIAN_STATES.find((s) => s.code === stateCode);
  if (!stateInfo) {
    return {
      valid: false,
      normalized,
      error: `Invalid GST State code "${stateCode}" in GSTIN.`,
    };
  }

  const expectedCheck = computeGstinChecksum(normalized.slice(0, 14));
  if (normalized[14] !== expectedCheck) {
    return {
      valid: false,
      normalized,
      stateCode,
      stateName: stateInfo.name,
      embeddedPan,
      error: "Invalid GSTIN checksum digit. Please double-check the 15-character GSTIN.",
    };
  }

  return {
    valid: true,
    normalized,
    stateCode,
    stateName: stateInfo.name,
    embeddedPan,
  };
}

/**
 * Validates GST Common Portal Enrolment ID format for unregistered e-commerce suppliers
 * (Notification No. 34/2023-Central Tax — 15-character alphanumeric identifier starting
 * with 2-digit Indian State/UT code, distinct from a regular GSTIN).
 */
export function validateEnrolmentIdFormat(rawEnrolmentId: string): FormatValidationResult {
  const normalized = String(rawEnrolmentId || "").replace(/\s+/g, "").toUpperCase();

  if (normalized.length !== 15 || !/^[0-9]{2}[A-Z0-9]{13}$/.test(normalized)) {
    return {
      valid: false,
      normalized,
      error: "Invalid Enrolment ID format. Enrolment ID must be 15 alphanumeric characters starting with a valid 2-digit Indian State code.",
    };
  }

  // Ensure a regular GSTIN is not entered in the Enrolment ID field
  if (/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(normalized)) {
    return {
      valid: false,
      normalized,
      error: "Please enter a valid 15-character Enrolment ID (regular business tax numbers are not accepted during onboarding).",
    };
  }

  const stateCode = normalized.slice(0, 2);
  const stateInfo = INDIAN_STATES.find((s) => s.code === stateCode);
  if (!stateInfo) {
    return {
      valid: false,
      normalized,
      error: `Invalid State code "${stateCode}" in Enrolment ID.`,
    };
  }

  return {
    valid: true,
    normalized,
    stateCode,
    stateName: stateInfo.name,
  };
}

/**
 * Evaluates legal eligibility under Notification No. 34/2023-Central Tax
 * using admin-configured State rules (NO hardcoded thresholds!).
 */
export function evaluateEnrolmentEligibility(params: {
  pan?: string | null;
  supplyType: string;
  registeredStateCode: string;
  declaredAnnualTurnoverInr?: number | null;
  hasOtherStateHubs?: boolean;
  rule: GstComplianceRule | null;
}): { eligible: boolean; reasons: string[] } {
  const reasons: string[] = [];

  // PAN is already verified by GSTN when issuing the Enrolment ID on gst.gov.in;
  // only validate PAN format if explicitly provided by caller (Meesho-style PAN-less onboarding).
  if (params.pan && String(params.pan).trim() && !validatePanFormat(params.pan).valid) {
    reasons.push("Provided PAN format is invalid. Expected 10-character Indian PAN.");
  }

  if (!params.rule) {
    reasons.push("Compliance configuration for your registered State/UT could not be loaded. Manual compliance review is required.");
    return { eligible: false, reasons };
  }

  if (!params.rule.enrolment_exemption_enabled) {
    reasons.push(`Enrolment ID exemption is currently disabled for ${params.rule.state_name}. Regular GSTIN is required.`);
  }

  const normalizedSupply = String(params.supplyType || "").toLowerCase().trim();
  if (normalizedSupply !== "goods" && !params.rule.allow_services_under_enrolment) {
    reasons.push("Notification No. 34/2023-Central Tax applies to intra-state supply of GOODS only. Service sellers cannot use Enrolment ID exemption.");
  }

  if (params.hasOtherStateHubs && !params.rule.allow_multi_state_hubs_under_enrolment) {
    reasons.push("Unregistered suppliers under Enrolment ID cannot maintain supply/pickup hubs in multiple States/UTs.");
  }

  if (
    params.declaredAnnualTurnoverInr !== undefined &&
    params.declaredAnnualTurnoverInr !== null &&
    Number(params.declaredAnnualTurnoverInr) > Number(params.rule.goods_turnover_threshold_inr)
  ) {
    reasons.push(
      `Declared aggregate turnover exceeds the configured threshold (₹${Number(params.rule.goods_turnover_threshold_inr).toLocaleString("en-IN")}) for ${params.rule.state_name}. Regular GSTIN registration is mandatory.`
    );
  }

  return { eligible: reasons.length === 0, reasons };
}

/**
 * Authoritative Backend State-Based Selling Restriction Validator (Part 10).
 * Called during checkout (COD & Online), order routing, shipping label generation,
 * and pickup hub registration.
 */
export function validateSellerStateCompliance(params: {
  sellerStatus?: string | null;
  onboardingStatus?: string | null;
  gstCategory?: SellerGstCategory | string | null;
  intraStateOnly?: boolean | null;
  sellerRegisteredState?: string | null;
  permittedStates?: string[] | null;
  dispatchState?: string | null;
  deliveryState?: string | null;
  deliveryPincode?: string | null;
  deliveryAddressText?: string | null;
  supplyType?: string | null;
}): SellerStateComplianceCheck {
  const effectiveStatus = String(params.onboardingStatus || params.sellerStatus || "").toLowerCase();
  if (effectiveStatus && effectiveStatus !== "approved" && effectiveStatus !== "active") {
    return {
      allowed: false,
      code: "SELLER_NOT_APPROVED",
      message: "Seller account is not approved for order fulfillment or shipping.",
    };
  }

  const gstCat = String(params.gstCategory || "UNSET").toUpperCase() as SellerGstCategory;
  const requiresIntraState = gstCat === "ENROLMENT_ID" || Boolean(params.intraStateOnly);

  if (!requiresIntraState) {
    return {
      allowed: true,
      code: gstCat === "GSTIN" ? "ALLOWED_GSTIN" : "ALLOWED_LEGACY",
      message: "Seller is authorized for Pan-India supply.",
      gstCategory: gstCat,
    };
  }

  if (String(params.supplyType || "goods").toLowerCase() !== "goods") {
    return {
      allowed: false,
      code: "SERVICE_SUPPLY_NOT_EXEMPT",
      message: "Enrolment ID exemption applies to goods only.",
      gstCategory: gstCat,
    };
  }

  const sellerStateInfo = normalizeIndianState(params.sellerRegisteredState);
  const permittedList = (params.permittedStates || [])
    .map((s) => normalizeIndianState(s)?.name)
    .filter(Boolean) as string[];

  const allowedStateName = sellerStateInfo?.name || permittedList[0];

  if (!allowedStateName) {
    return {
      allowed: false,
      code: "DISPATCH_STATE_MISMATCH_ENROLMENT",
      message: "Enrolment ID seller is missing a validated registered State. Inter-state dispatch is blocked.",
      gstCategory: gstCat,
    };
  }

  // Check dispatch/pickup hub state against seller's registered state
  if (params.dispatchState) {
    const dispatchInfo = normalizeIndianState(params.dispatchState);
    if (!dispatchInfo || dispatchInfo.name !== allowedStateName) {
      return {
        allowed: false,
        code: "DISPATCH_STATE_MISMATCH_ENROLMENT",
        message: `Enrolment ID sellers registered in ${allowedStateName} cannot dispatch from another State (${params.dispatchState}).`,
        sellerState: allowedStateName,
        gstCategory: gstCat,
      };
    }
  }

  // Check customer delivery state
  const deliveryInfo = resolveStateFromAddressOrPin({
    state: params.deliveryState,
    pincode: params.deliveryPincode,
    addressText: params.deliveryAddressText,
  });

  if (!deliveryInfo) {
    return {
      allowed: false,
      code: "MISSING_DELIVERY_STATE",
      message: `Unable to determine customer delivery State/PIN code for intra-state GST verification (Seller permitted State: ${allowedStateName}).`,
      sellerState: allowedStateName,
      gstCategory: gstCat,
    };
  }

  if (deliveryInfo.name !== allowedStateName) {
    return {
      allowed: false,
      code: "INTERSTATE_BLOCKED_ENROLMENT_EXEMPTION",
      message: `This item is supplied by an Enrolment ID seller authorized for intra-state delivery within ${allowedStateName} only and cannot be shipped to ${deliveryInfo.name}.`,
      sellerState: allowedStateName,
      deliveryState: deliveryInfo.name,
      gstCategory: gstCat,
    };
  }

  return {
    allowed: true,
    code: "ALLOWED_INTRA_STATE",
    message: `Authorized intra-state supply within ${allowedStateName}.`,
    sellerState: allowedStateName,
    deliveryState: deliveryInfo.name,
    gstCategory: gstCat,
  };
}

// ==============================================================================
// PII MASKING & LOG REDACTION HELPERS (DPDPA + GSTN SECURITY COMPLIANCE)
// ==============================================================================

export function maskPan(pan?: string | null): string {
  const clean = String(pan || "").replace(/\s+/g, "").toUpperCase();
  if (clean.length !== 10) return "••••••••••";
  return `${clean.slice(0, 2)}•••••${clean.slice(7)}`;
}

export function maskGstin(gstin?: string | null): string {
  const clean = String(gstin || "").replace(/\s+/g, "").toUpperCase();
  if (clean.length !== 15) return "•••••••••••••••";
  return `${clean.slice(0, 2)}${clean.slice(2, 4)}•••••${clean.slice(9, 12)}${clean.slice(12)}`;
}

export function maskMobile(mobile?: string | null): string {
  const digits = String(mobile || "").replace(/\D/g, "").slice(-10);
  if (digits.length < 4) return "••••••••••";
  return `••••••${digits.slice(-4)}`;
}

export function maskEmail(email?: string | null): string {
  const clean = String(email || "").trim().toLowerCase();
  const [user, domain] = clean.split("@");
  if (!user || !domain) return "•••@•••";
  const visible = user.length <= 2 ? user[0] : `${user[0]}•••${user[user.length - 1]}`;
  return `${visible}@${domain}`;
}

/**
 * Strips sensitive fields (PAN, raw mobile, raw email, decoded GSTN payloads,
 * bank account numbers, OTP codes) before emitting application logs.
 */
export function redactPiiForLogs<T extends Record<string, any>>(input: T): Record<string, any> {
  const sensitiveKeys = new Set([
    "pan",
    "pan_number",
    "pan_encrypted",
    "mobile",
    "mobile_number",
    "phone",
    "phone_number",
    "email",
    "otp",
    "password",
    "account_number",
    "accountNumber",
    "upi_id",
    "vpa",
    "raw_response",
    "decoded_payload",
    "provider_response",
    "business_address",
    "principal_place_of_business",
  ]);

  const output: Record<string, any> = {};
  for (const [key, val] of Object.entries(input || {})) {
    if (sensitiveKeys.has(key) || key.toLowerCase().includes("secret") || key.toLowerCase().includes("token")) {
      output[key] = "[REDACTED]";
    } else if (val && typeof val === "object" && !Array.isArray(val)) {
      output[key] = redactPiiForLogs(val);
    } else {
      output[key] = val;
    }
  }
  return output;
}

export const DUPLICATE_IDENTITY_SUPPORT_MESSAGE =
  "This business identity is already associated with another ZebAlpha seller account. Please contact Seller Support if you believe this is an error.";
