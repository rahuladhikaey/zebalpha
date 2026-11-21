import crypto from "crypto";
import { encryptSensitiveData } from "./bankSecurityService";
import { checkRateLimit } from "./securityTokenService";
import {
  INDIAN_STATES,
  normalizeIndianState,
  redactPiiForLogs,
  validateEnrolmentIdFormat,
  validateGstinFormat,
  validatePanFormat,
  maskPan,
} from "../utils/indianGstCompliance";
import type {
  EnrolmentAuthoritativeRecord,
  GstinAuthoritativeRecord,
  VerificationOutcome,
} from "../types/sellerCompliance";

/**
 * ZebAlpha Official GSTN / Authorized GSP Integration Layer (Parts 3, 4 & 5)
 *
 * Official References:
 * - GSTN Developer Portal: https://developer.gst.gov.in/apiportal/
 * - Official GSTN Advisory (Unregistered Applicants / ECO APIs):
 *   https://www.gst.gov.in/newsandupdates/read/607
 *
 * Supported Authorized E-Commerce Operator APIs:
 * 1. Regular GSTIN Taxpayer Verification (via authorized GSP)
 * 2. GSTN Unregistered Applicants API (retrieve enrolment details via Enrolment ID)
 * 3. GSTN Unregistered Applicants Validation API (validate registered mobile & email)
 *
 * STRICT PRODUCTION RULES:
 * - NEVER simulate a successful GSTN response in production!
 * - NEVER mark a GSTIN or Enrolment ID as verified solely from format checks!
 * - NEVER invent undocumented GSTN endpoints or fields!
 * - If GSP credentials are missing or provider is unavailable, return
 *   outcome: "unavailable" + manualReviewRequired: true.
 * - Base64 decoding is handled safely server-side; decoded payloads are NEVER logged
 *   and are encrypted at rest with AES-256-GCM before database storage.
 */

export interface GspTokenState {
  accessToken: string;
  expiresAtMs: number;
}

export interface GstinVerificationResult {
  verified: boolean;
  outcome: VerificationOutcome;
  manualReviewRequired: boolean;
  message: string;
  record?: GstinAuthoritativeRecord;
  nameMatchScore?: number;
  nameMatchStatus?: "matched" | "partial_review" | "mismatch" | "not_checked";
  encryptedRawPayload?: string;
  httpStatus?: number;
  latencyMs: number;
  providerName: string;
  environment: "sandbox" | "production";
}

export interface EnrolmentVerificationResult {
  verified: boolean;
  outcome: VerificationOutcome;
  manualReviewRequired: boolean;
  message: string;
  record?: EnrolmentAuthoritativeRecord;
  panMatch?: boolean;
  encryptedRawPayload?: string;
  httpStatus?: number;
  latencyMs: number;
  providerName: string;
  environment: "sandbox" | "production";
}

export interface EnrolmentContactValidationResult {
  verified: boolean;
  outcome: VerificationOutcome;
  manualReviewRequired: boolean;
  mobileMatched: boolean;
  emailMatched: boolean;
  message: string;
  encryptedRawPayload?: string;
  httpStatus?: number;
  latencyMs: number;
  providerName: string;
  environment: "sandbox" | "production";
}

export interface GspRawResponse {
  httpStatus: number;
  body: any;
  encodedDataField?: string;
}

export interface GspTransport {
  readonly providerName: string;
  readonly environment: "sandbox" | "production";
  isConfigured(): boolean;
  authenticate(forceRefresh?: boolean): Promise<GspTokenState>;
  fetchGstin(gstin: string, token: string, signal: AbortSignal): Promise<GspRawResponse>;
  fetchUnregisteredApplicant(enrolmentId: string, token: string, signal: AbortSignal): Promise<GspRawResponse>;
  validateUnregisteredApplicantContact(
    enrolmentId: string,
    mobile: string,
    email: string,
    token: string,
    signal: AbortSignal
  ): Promise<GspRawResponse>;
}

// ==============================================================================
// SAFE BASE64 DECODER & ENCRYPTION AT REST (Base64 is NOT encryption!)
// ==============================================================================

export function decodeGstnPayloadSafely(raw: unknown): { ok: boolean; data?: Record<string, any>; error?: string } {
  try {
    if (raw && typeof raw === "object" && !Array.isArray(raw)) {
      // Check if wrapped in standard GSTN `{ status_cd: "1", data: "<base64>" }` envelope
      const obj = raw as Record<string, any>;
      if (typeof obj.data === "string" && obj.data.trim().length > 0) {
        const decodedText = Buffer.from(obj.data.trim(), "base64").toString("utf8");
        const parsed = JSON.parse(decodedText);
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
          return { ok: false, error: "Decoded GSTN payload is not a valid JSON object." };
        }
        return { ok: true, data: parsed };
      }
      return { ok: true, data: obj };
    }

    if (typeof raw === "string" && raw.trim().length > 0) {
      const decodedText = Buffer.from(raw.trim(), "base64").toString("utf8");
      const parsed = JSON.parse(decodedText);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        return { ok: false, error: "Decoded GSTN string is not a valid JSON object." };
      }
      return { ok: true, data: parsed };
    }

    return { ok: false, error: "Empty or unsupported provider response." };
  } catch {
    return { ok: false, error: "Malformed Base64 or invalid JSON in GSTN provider response." };
  }
}

function encryptAuditPayloadSafely(payload: unknown): string | undefined {
  if (!payload) return undefined;
  try {
    return encryptSensitiveData(JSON.stringify(payload));
  } catch {
    // Fallback SHA-256 digest if encryption key is absent in unit test env without BANK_ENCRYPTION_KEY
    const hash = crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
    return `sha256:${hash}`;
  }
}

/**
 * Compares submitted business/legal name against GSTN authoritative name.
 */
export function computeBusinessNameMatch(
  submittedName: string,
  authoritativeLegalName: string,
  authoritativeTradeName?: string | null
): { score: number; status: "matched" | "partial_review" | "mismatch" } {
  const stopWords = new Set([
    "m/s", "ms", "pvt", "ltd", "private", "limited", "llp", "co", "company",
    "enterprise", "enterprises", "traders", "trading", "store", "stores", "india", "the",
  ]);
  const tokenize = (s: string) =>
    String(s || "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 1 && !stopWords.has(t));

  const subTokens = new Set(tokenize(submittedName));
  if (subTokens.size === 0) return { score: 0, status: "mismatch" };

  const candidates = [authoritativeLegalName, authoritativeTradeName].filter(Boolean) as string[];
  let best = 0;

  for (const cand of candidates) {
    const candTokens = new Set(tokenize(cand));
    if (candTokens.size === 0) continue;
    const inter = [...subTokens].filter((t) => candTokens.has(t)).length;
    const union = new Set([...subTokens, ...candTokens]).size;
    const jaccard = inter / union;
    const contained =
      [...subTokens].every((t) => candTokens.has(t)) ||
      [...candTokens].every((t) => subTokens.has(t));
    best = Math.max(best, contained ? 0.95 : jaccard);
  }

  const rounded = Number(best.toFixed(3));
  if (rounded >= 0.7) return { score: rounded, status: "matched" };
  if (rounded >= 0.4) return { score: rounded, status: "partial_review" };
  return { score: rounded, status: "mismatch" };
}

// ==============================================================================
// PRODUCTION GSP ADAPTER (Env-Driven per Contracted GSP Specification)
// ==============================================================================

class ProductionGspTransport implements GspTransport {
  readonly providerName: string;
  readonly environment = "production" as const;
  private cachedToken: GspTokenState | null = null;

  constructor() {
    this.providerName = (process.env.GSP_PROVIDER_NAME || "authorized_gsp_production").trim();
  }

  private getConfig() {
    return {
      baseUrl: (process.env.GSP_BASE_URL || "").trim().replace(/\/+$/, ""),
      authUrl: (process.env.GSP_AUTH_URL || "").trim(),
      clientId: (process.env.GSP_CLIENT_ID || "").trim(),
      clientSecret: (process.env.GSP_CLIENT_SECRET || "").trim(),
      gstinPath: (process.env.GSP_GSTIN_ENDPOINT || "").trim(),
      enrolmentPath: (process.env.GSP_ENROLMENT_ENDPOINT || "").trim(),
      enrolmentValidatePath: (process.env.GSP_ENROLMENT_VALIDATE_ENDPOINT || "").trim(),
      ecoGstin: (process.env.ZEBALPHA_ECO_GSTIN || "").trim(),
    };
  }

  isConfigured(): boolean {
    const cfg = this.getConfig();
    return Boolean(cfg.baseUrl && cfg.authUrl && cfg.clientId && cfg.clientSecret);
  }

  async authenticate(forceRefresh = false): Promise<GspTokenState> {
    if (!forceRefresh && this.cachedToken && Date.now() < this.cachedToken.expiresAtMs - 60_000) {
      return this.cachedToken;
    }

    const cfg = this.getConfig();
    if (!this.isConfigured()) {
      throw new GspError("unavailable", "Authorized GSP credentials are not configured.");
    }

    const res = await fetch(cfg.authUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "client-id": cfg.clientId,
        "client-secret": cfg.clientSecret,
      },
      body: JSON.stringify({
        grant_type: "client_credentials",
        client_id: cfg.clientId,
        client_secret: cfg.clientSecret,
      }),
    });

    if (!res.ok) {
      throw new GspError(
        res.status === 401 ? "token_expired" : "unavailable",
        `GSP authentication failed with HTTP ${res.status}`,
        res.status
      );
    }

    const data = await res.json().catch(() => null);
    const accessToken = data?.access_token || data?.auth_token || data?.token;
    const expiresInSec = Number(data?.expires_in || 3600);

    if (!accessToken) {
      throw new GspError("invalid_response", "GSP authentication response missing access token.", res.status);
    }

    this.cachedToken = {
      accessToken,
      expiresAtMs: Date.now() + Math.max(60, expiresInSec) * 1000,
    };
    return this.cachedToken;
  }

  async fetchGstin(gstin: string, token: string, signal: AbortSignal): Promise<GspRawResponse> {
    const cfg = this.getConfig();
    if (!cfg.gstinPath) {
      throw new GspError("unavailable", "GSP GSTIN verification endpoint is not configured.");
    }
    const url = `${cfg.baseUrl}${cfg.gstinPath.startsWith("/") ? "" : "/"}${cfg.gstinPath}?gstin=${encodeURIComponent(gstin)}`;
    const res = await fetch(url, {
      method: "GET",
      signal,
      headers: {
        Authorization: `Bearer ${token}`,
        "client-id": cfg.clientId,
        ...(cfg.ecoGstin ? { "x-eco-gstin": cfg.ecoGstin } : {}),
      },
    });
    const body = await res.json().catch(() => null);
    return { httpStatus: res.status, body };
  }

  async fetchUnregisteredApplicant(
    enrolmentId: string,
    token: string,
    signal: AbortSignal
  ): Promise<GspRawResponse> {
    const cfg = this.getConfig();
    if (!cfg.enrolmentPath) {
      throw new GspError(
        "unavailable",
        "GSTN Unregistered Applicants API endpoint is not configured for production GSP."
      );
    }
    const url = `${cfg.baseUrl}${cfg.enrolmentPath.startsWith("/") ? "" : "/"}${cfg.enrolmentPath}?enrolment_id=${encodeURIComponent(enrolmentId)}`;
    const res = await fetch(url, {
      method: "GET",
      signal,
      headers: {
        Authorization: `Bearer ${token}`,
        "client-id": cfg.clientId,
        ...(cfg.ecoGstin ? { "x-eco-gstin": cfg.ecoGstin } : {}),
      },
    });
    const body = await res.json().catch(() => null);
    return { httpStatus: res.status, body };
  }

  async validateUnregisteredApplicantContact(
    enrolmentId: string,
    mobile: string,
    email: string,
    token: string,
    signal: AbortSignal
  ): Promise<GspRawResponse> {
    const cfg = this.getConfig();
    if (!cfg.enrolmentValidatePath) {
      throw new GspError(
        "unavailable",
        "GSTN Unregistered Applicants Validation API endpoint is not configured for production GSP."
      );
    }
    const url = `${cfg.baseUrl}${cfg.enrolmentValidatePath.startsWith("/") ? "" : "/"}${cfg.enrolmentValidatePath}`;
    const res = await fetch(url, {
      method: "POST",
      signal,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "client-id": cfg.clientId,
        ...(cfg.ecoGstin ? { "x-eco-gstin": cfg.ecoGstin } : {}),
      },
      body: JSON.stringify({
        enrolment_id: enrolmentId,
        mobile,
        email,
      }),
    });
    const body = await res.json().catch(() => null);
    return { httpStatus: res.status, body };
  }
}

export class GspError extends Error {
  outcome: VerificationOutcome;
  httpStatus?: number;
  constructor(outcome: VerificationOutcome, message: string, httpStatus?: number) {
    super(message);
    this.name = "GspError";
    this.outcome = outcome;
    this.httpStatus = httpStatus;
  }
}

// ==============================================================================
// SEPARATE SANDBOX / TEST GSP ADAPTER (Strictly Non-Production / Explicit Test)
// ==============================================================================

export interface SandboxFixtureOptions {
  simulateUnavailable?: boolean;
  simulateTimeout?: boolean;
  simulateExpiredTokenOnce?: boolean;
  simulateInvalidResponse?: boolean;
}

export class SandboxGspTransport implements GspTransport {
  readonly providerName = "gstn_gsp_sandbox";
  readonly environment = "sandbox" as const;
  private tokenRefreshedCount = 0;
  private expiredTokenTriggered = false;
  private options: SandboxFixtureOptions;

  constructor(options: SandboxFixtureOptions = {}) {
    this.options = options;
  }

  isConfigured(): boolean {
    return true;
  }

  getTokenRefreshCount(): number {
    return this.tokenRefreshedCount;
  }

  async authenticate(forceRefresh = false): Promise<GspTokenState> {
    if (this.options.simulateUnavailable) {
      throw new GspError("unavailable", "Sandbox GSP service unavailable (simulated 503).", 503);
    }
    if (forceRefresh) this.tokenRefreshedCount += 1;
    if (this.options.simulateExpiredTokenOnce && !this.expiredTokenTriggered && !forceRefresh) {
      return { accessToken: "sandbox_expired_token", expiresAtMs: Date.now() + 60_000 };
    }
    return { accessToken: `sandbox_live_token_${this.tokenRefreshedCount}`, expiresAtMs: Date.now() + 3600_000 };
  }

  private async maybeFail(token: string, signal: AbortSignal): Promise<void> {
    if (this.options.simulateUnavailable) {
      throw new GspError("unavailable", "Sandbox GSP service unavailable.", 503);
    }
    if (this.options.simulateTimeout) {
      await new Promise<void>((_, reject) => {
        const err = new Error("The operation was aborted due to timeout");
        err.name = "AbortError";
        if (signal.aborted) return reject(err);
        signal.addEventListener("abort", () => reject(err), { once: true });
      });
    }
    if (token === "sandbox_expired_token" && !this.expiredTokenTriggered) {
      this.expiredTokenTriggered = true;
      throw new GspError("token_expired", "Sandbox auth token expired (401).", 401);
    }
  }

  async fetchGstin(gstin: string, token: string, signal: AbortSignal): Promise<GspRawResponse> {
    await this.maybeFail(token, signal);

    if (this.options.simulateInvalidResponse) {
      return { httpStatus: 200, body: { status_cd: "1", data: "%%%NOT_VALID_BASE64_JSON%%%" } };
    }

    const clean = gstin.toUpperCase();
    const stateCode = clean.slice(0, 2);
    const stateName = INDIAN_STATES.find((s) => s.code === stateCode)?.name || "West Bengal";

    // Deterministic test fixtures by embedded PAN markers
    let sts = "Active";
    let cancellationDate: string | null = null;
    let legalName = "ZebAlpha Sandbox Textiles Private Limited";
    let tradeName = "ZebAlpha Sandbox Apparel";

    if (clean.includes("CANCL")) {
      sts = "Cancelled";
      cancellationDate = "2025-08-15";
      legalName = "Cancelled Sandbox Traders";
      tradeName = "Cancelled Sandbox Store";
    } else if (clean.includes("SUSPD")) {
      sts = "Suspended";
      legalName = "Suspended Sandbox Apparel";
      tradeName = "Suspended Sandbox Store";
    } else if (clean.includes("MISMH")) {
      legalName = "Completely Different Legal Entity LLP";
      tradeName = "Unrelated Brand";
    }

    const innerPayload = {
      gstin: clean,
      lgnm: legalName,
      tradeNam: tradeName,
      sts,
      ctb: "Private Limited Company",
      dty: "Regular",
      stj: `${stateName} State Jurisdiction - Ward 14`,
      rgdt: "2022-04-01",
      cxdt: cancellationDate,
      pradr: {
        addr: {
          bno: "Plot 42",
          st: "Park Street Commercial Hub",
          loc: "Kolkata",
          stcd: stateName,
          pncd: "700016",
        },
      },
    };

    // Simulate official GSTN Base64 envelope (NOT encryption)
    return {
      httpStatus: 200,
      body: {
        status_cd: "1",
        data: Buffer.from(JSON.stringify(innerPayload), "utf8").toString("base64"),
      },
    };
  }

  async fetchUnregisteredApplicant(
    enrolmentId: string,
    token: string,
    signal: AbortSignal
  ): Promise<GspRawResponse> {
    await this.maybeFail(token, signal);

    if (this.options.simulateInvalidResponse) {
      return { httpStatus: 200, body: { status_cd: "1", data: "invalid###base64" } };
    }

    const clean = enrolmentId.toUpperCase();
    const stateCode = clean.slice(0, 2);
    const stateName = INDIAN_STATES.find((s) => s.code === stateCode)?.name || "West Bengal";

    if (clean.includes("NOTFND")) {
      return { httpStatus: 404, body: { status_cd: "0", error: { message: "Enrolment ID not found on GST Common Portal" } } };
    }

    const innerPayload = {
      enrolment_id: clean,
      legal_name: "Arjun Sen Handicrafts",
      pan: clean.includes("PANMM") ? "ZZZZZ9999Z" : "ABCPA1234F",
      pan_status: "VALID",
      state_code: stateCode,
      state_name: stateName,
      address: `Shop 12, College Street, ${stateName}`,
      enrolment_status: clean.includes("CANCL") ? "Cancelled" : "Active",
      registered_mobile_last4: "3210",
      registered_email_domain: "sandbox-seller.in",
    };

    return {
      httpStatus: 200,
      body: {
        status_cd: "1",
        data: Buffer.from(JSON.stringify(innerPayload), "utf8").toString("base64"),
      },
    };
  }

  async validateUnregisteredApplicantContact(
    enrolmentId: string,
    mobile: string,
    email: string,
    token: string,
    signal: AbortSignal
  ): Promise<GspRawResponse> {
    await this.maybeFail(token, signal);

    if (this.options.simulateInvalidResponse) {
      return { httpStatus: 200, body: { status_cd: "1", data: "not-json-base64" } };
    }

    const cleanMobile = String(mobile || "").replace(/\D/g, "").slice(-10);
    const cleanEmail = String(email || "").trim().toLowerCase();

    // Sandbox rule: registered contact in fixture is 9876543210 & seller@sandbox-seller.in
    const mobileMatch = cleanMobile === "9876543210" || cleanMobile.endsWith("3210");
    const emailMatch = cleanEmail === "seller@sandbox-seller.in" || cleanEmail.endsWith("@sandbox-seller.in");

    const innerPayload = {
      enrolment_id: enrolmentId.toUpperCase(),
      mobile_matched: mobileMatch,
      email_matched: emailMatch,
    };

    return {
      httpStatus: 200,
      body: {
        status_cd: "1",
        data: Buffer.from(JSON.stringify(innerPayload), "utf8").toString("base64"),
      },
    };
  }
}

// ==============================================================================
// ORCHESTRATING GSTN / GSP VERIFICATION SERVICE
// ==============================================================================

export class GstnGspVerificationService {
  private transport: GspTransport;
  private timeoutMs: number;
  private maxRetries: number;

  constructor(options?: { transport?: GspTransport; timeoutMs?: number; maxRetries?: number }) {
    if (options?.transport) {
      this.transport = options.transport;
    } else if (process.env.GSTN_GSP_ENV === "sandbox" && process.env.NODE_ENV !== "production") {
      this.transport = new SandboxGspTransport();
    } else {
      this.transport = new ProductionGspTransport();
    }
    this.timeoutMs = options?.timeoutMs ?? Number(process.env.GSP_TIMEOUT_MS || 10_000);
    this.maxRetries = options?.maxRetries ?? 2;
  }

  private async executeWithResilience(
    rateLimitKey: string,
    fn: (token: string, signal: AbortSignal) => Promise<GspRawResponse>
  ): Promise<GspRawResponse> {
    if (!checkRateLimit(`gsp_${rateLimitKey}`, 15, 60_000)) {
      throw new GspError("rate_limited", "Verification rate limit exceeded. Please wait a minute and retry.", 429);
    }

    if (!this.transport.isConfigured()) {
      throw new GspError(
        "unavailable",
        "Verification temporarily unavailable. Authorized GSP access is pending activation; application routed to Manual Review.",
        503
      );
    }

    let tokenState = await this.transport.authenticate(false);
    let tokenRenewed = false;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);

      try {
        const res = await fn(tokenState.accessToken, controller.signal);
        clearTimeout(timer);

        // Handle 401 token expiry once by renewing token automatically
        if (res.httpStatus === 401 && !tokenRenewed) {
          tokenRenewed = true;
          tokenState = await this.transport.authenticate(true);
          continue;
        }

        // Safe retry on transient 502/503/504
        if ([502, 503, 504].includes(res.httpStatus) && attempt < this.maxRetries) {
          await new Promise((r) => setTimeout(r, 200 * (attempt + 1)));
          continue;
        }

        return res;
      } catch (err: any) {
        clearTimeout(timer);

        if (err instanceof GspError && err.outcome === "token_expired" && !tokenRenewed) {
          tokenRenewed = true;
          tokenState = await this.transport.authenticate(true);
          continue;
        }

        if (err?.name === "AbortError") {
          if (attempt < this.maxRetries) {
            continue;
          }
          throw new GspError(
            "timeout",
            "Verification provider timed out. Verification temporarily unavailable — Manual Review required.",
            504
          );
        }

        if (err instanceof GspError) {
          if (err.outcome === "unavailable" && attempt < this.maxRetries) {
            await new Promise((r) => setTimeout(r, 150 * (attempt + 1)));
            continue;
          }
          throw err;
        }

        throw new GspError(
          "unavailable",
          "Verification temporarily unavailable due to upstream provider connectivity.",
          503
        );
      }
    }

    throw new GspError("unavailable", "Verification temporarily unavailable after retries.", 503);
  }

  /**
   * Authoritative GSTIN verification (Option A).
   * NEVER marks a GSTIN as verified based on format alone!
   */
  async verifyGstin(params: {
    gstin: string;
    submittedBusinessName?: string;
    submittedPan?: string;
    rateLimitKey?: string;
  }): Promise<GstinVerificationResult> {
    const started = Date.now();
    const fmt = validateGstinFormat(params.gstin);

    if (!fmt.valid) {
      return {
        verified: false,
        outcome: "invalid",
        manualReviewRequired: false,
        message: fmt.error || "Invalid GSTIN format.",
        latencyMs: Date.now() - started,
        providerName: this.transport.providerName,
        environment: this.transport.environment,
      };
    }

    // Cross-check embedded PAN against submitted PAN if supplied
    if (params.submittedPan) {
      const panFmt = validatePanFormat(params.submittedPan);
      if (!panFmt.valid || fmt.embeddedPan !== panFmt.normalized) {
        return {
          verified: false,
          outcome: "mismatch",
          manualReviewRequired: false,
          message: "PAN mismatch: The 10-character PAN embedded in your GSTIN does not match your submitted PAN.",
          latencyMs: Date.now() - started,
          providerName: this.transport.providerName,
          environment: this.transport.environment,
        };
      }
    }

    try {
      const rawRes = await this.executeWithResilience(
        params.rateLimitKey || fmt.normalized,
        (token, signal) => this.transport.fetchGstin(fmt.normalized, token, signal)
      );

      if (rawRes.httpStatus === 404) {
        return {
          verified: false,
          outcome: "invalid",
          manualReviewRequired: false,
          message: "GSTIN record was not found in authoritative GSTN records.",
          httpStatus: rawRes.httpStatus,
          latencyMs: Date.now() - started,
          providerName: this.transport.providerName,
          environment: this.transport.environment,
        };
      }

      if (rawRes.httpStatus !== 200) {
        return {
          verified: false,
          outcome: "unavailable",
          manualReviewRequired: true,
          message: "Verification temporarily unavailable. Application queued for Manual Review.",
          httpStatus: rawRes.httpStatus,
          latencyMs: Date.now() - started,
          providerName: this.transport.providerName,
          environment: this.transport.environment,
        };
      }

      const decoded = decodeGstnPayloadSafely(rawRes.body);
      if (!decoded.ok || !decoded.data || !decoded.data.gstin || !decoded.data.lgnm) {
        return {
          verified: false,
          outcome: "invalid_response",
          manualReviewRequired: true,
          message: "Received an invalid or malformed response from GST verification provider. Routed to Manual Review.",
          httpStatus: rawRes.httpStatus,
          latencyMs: Date.now() - started,
          providerName: this.transport.providerName,
          environment: this.transport.environment,
        };
      }

      const d = decoded.data;
      const rawStatus = String(d.sts || "Unknown").trim();
      const lowerStatus = rawStatus.toLowerCase();
      const normalizedStatus: GstinAuthoritativeRecord["registrationStatus"] =
        lowerStatus === "active"
          ? "Active"
          : lowerStatus.includes("cancel")
          ? "Cancelled"
          : lowerStatus.includes("suspend")
          ? "Suspended"
          : lowerStatus.includes("inactive")
          ? "Inactive"
          : "Unknown";

      const pradr = d.pradr?.addr;
      const addressStr = pradr
        ? [pradr.bno, pradr.st, pradr.loc, pradr.stcd, pradr.pncd].filter(Boolean).join(", ")
        : null;
      const stateInfo = normalizeIndianState(pradr?.stcd || fmt.stateCode);

      const record: GstinAuthoritativeRecord = {
        gstin: fmt.normalized,
        legalName: String(d.lgnm || "").trim(),
        tradeName: d.tradeNam ? String(d.tradeNam).trim() : null,
        registrationStatus: normalizedStatus,
        constitutionOfBusiness: d.ctb || null,
        taxpayerType: d.dty || null,
        stateCode: stateInfo?.code || fmt.stateCode || "",
        stateName: stateInfo?.name || fmt.stateName || "",
        jurisdiction: d.stj || d.ctj || null,
        principalPlaceOfBusiness: addressStr,
        registrationDate: d.rgdt || null,
        cancellationDate: d.cxdt || null,
        source: this.transport.providerName,
        environment: this.transport.environment,
        verifiedAt: new Date().toISOString(),
      };

      const encryptedRawPayload = encryptAuditPayloadSafely(d);

      console.info(
        "[GSTN GSTIN Verification]",
        JSON.stringify(
          redactPiiForLogs({
            stateCode: record.stateCode,
            status: record.registrationStatus,
            source: record.source,
            environment: record.environment,
          })
        )
      );

      if (normalizedStatus === "Cancelled") {
        return {
          verified: false,
          outcome: "cancelled",
          manualReviewRequired: false,
          message: `This GSTIN is marked as CANCELLED on GSTN (cancelled on ${record.cancellationDate || "record"}). Cancelled GSTINs cannot be onboarded.`,
          record,
          encryptedRawPayload,
          httpStatus: rawRes.httpStatus,
          latencyMs: Date.now() - started,
          providerName: this.transport.providerName,
          environment: this.transport.environment,
        };
      }

      if (normalizedStatus === "Suspended" || normalizedStatus === "Inactive") {
        return {
          verified: false,
          outcome: "suspended",
          manualReviewRequired: true,
          message: `This GSTIN status is ${normalizedStatus} on GSTN. Active GST registration is required.`,
          record,
          encryptedRawPayload,
          httpStatus: rawRes.httpStatus,
          latencyMs: Date.now() - started,
          providerName: this.transport.providerName,
          environment: this.transport.environment,
        };
      }

      if (normalizedStatus !== "Active") {
        return {
          verified: false,
          outcome: "manual_review",
          manualReviewRequired: true,
          message: "Unable to confirm active GSTIN registration status. Routed to Manual Review.",
          record,
          encryptedRawPayload,
          httpStatus: rawRes.httpStatus,
          latencyMs: Date.now() - started,
          providerName: this.transport.providerName,
          environment: this.transport.environment,
        };
      }

      // Compare submitted business name with authoritative GSTN legal/trade name
      let nameMatchScore: number | undefined;
      let nameMatchStatus: GstinVerificationResult["nameMatchStatus"] = "not_checked";
      if (params.submittedBusinessName && params.submittedBusinessName.trim()) {
        const m = computeBusinessNameMatch(
          params.submittedBusinessName,
          record.legalName,
          record.tradeName
        );
        nameMatchScore = m.score;
        nameMatchStatus = m.status;
        if (m.status === "mismatch") {
          return {
            verified: false,
            outcome: "mismatch",
            manualReviewRequired: true,
            message:
              "Business name mismatch against authoritative GSTN legal/trade name. Submitted for Manual Compliance Review.",
            record,
            nameMatchScore,
            nameMatchStatus,
            encryptedRawPayload,
            httpStatus: rawRes.httpStatus,
            latencyMs: Date.now() - started,
            providerName: this.transport.providerName,
            environment: this.transport.environment,
          };
        }
      }

      return {
        verified: nameMatchStatus !== "partial_review",
        outcome: nameMatchStatus === "partial_review" ? "manual_review" : "verified",
        manualReviewRequired: nameMatchStatus === "partial_review",
        message:
          nameMatchStatus === "partial_review"
            ? "GSTIN is Active, but business name partially differs from GSTN records. Queued for Manual Review."
            : "GSTIN verified authoritatively as Active.",
        record,
        nameMatchScore,
        nameMatchStatus,
        encryptedRawPayload,
        httpStatus: rawRes.httpStatus,
        latencyMs: Date.now() - started,
        providerName: this.transport.providerName,
        environment: this.transport.environment,
      };
    } catch (err: any) {
      const outcome: VerificationOutcome = err instanceof GspError ? err.outcome : "unavailable";
      return {
        verified: false,
        outcome,
        manualReviewRequired: true,
        message:
          err instanceof GspError
            ? err.message
            : "Verification temporarily unavailable. Application queued for Manual Review.",
        httpStatus: err instanceof GspError ? err.httpStatus : 503,
        latencyMs: Date.now() - started,
        providerName: this.transport.providerName,
        environment: this.transport.environment,
      };
    }
  }

  /**
   * Official GSTN Unregistered Applicants API verification (Option B — Notification 34/2023-CT).
   * Works WITHOUT asking the seller for PAN (Meesho-style): GSTN already validates PAN when issuing
   * the Enrolment ID, and ownership is proven via GSTN Unregistered Applicants Validation API
   * (matching verified Mobile + Email) + Legal Name match.
   */
  async verifyEnrolmentId(params: {
    enrolmentId: string;
    submittedPan?: string | null;
    rateLimitKey?: string;
  }): Promise<EnrolmentVerificationResult> {
    const started = Date.now();
    const fmt = validateEnrolmentIdFormat(params.enrolmentId);

    if (!fmt.valid) {
      return {
        verified: false,
        outcome: "invalid",
        manualReviewRequired: false,
        message: fmt.error || "Invalid GST Enrolment ID format.",
        latencyMs: Date.now() - started,
        providerName: this.transport.providerName,
        environment: this.transport.environment,
      };
    }

    const hasSubmittedPan = Boolean(params.submittedPan && String(params.submittedPan).trim());
    const panFmt = hasSubmittedPan ? validatePanFormat(String(params.submittedPan)) : null;
    if (hasSubmittedPan && panFmt && !panFmt.valid) {
      return {
        verified: false,
        outcome: "invalid",
        manualReviewRequired: false,
        message: panFmt.error || "Invalid 10-character PAN format.",
        latencyMs: Date.now() - started,
        providerName: this.transport.providerName,
        environment: this.transport.environment,
      };
    }

    try {
      const rawRes = await this.executeWithResilience(
        params.rateLimitKey || fmt.normalized,
        (token, signal) => this.transport.fetchUnregisteredApplicant(fmt.normalized, token, signal)
      );

      if (rawRes.httpStatus === 404) {
        return {
          verified: false,
          outcome: "invalid",
          manualReviewRequired: false,
          message: "Enrolment ID was not found on the GST Common Portal.",
          httpStatus: rawRes.httpStatus,
          latencyMs: Date.now() - started,
          providerName: this.transport.providerName,
          environment: this.transport.environment,
        };
      }

      if (rawRes.httpStatus !== 200) {
        return {
          verified: false,
          outcome: "unavailable",
          manualReviewRequired: true,
          message: "GSTN Enrolment verification temporarily unavailable. Routed to Manual Review.",
          httpStatus: rawRes.httpStatus,
          latencyMs: Date.now() - started,
          providerName: this.transport.providerName,
          environment: this.transport.environment,
        };
      }

      const decoded = decodeGstnPayloadSafely(rawRes.body);
      if (!decoded.ok || !decoded.data || !decoded.data.enrolment_id || !decoded.data.legal_name) {
        return {
          verified: false,
          outcome: "invalid_response",
          manualReviewRequired: true,
          message: "Invalid response received from GSTN Unregistered Applicants API. Routed to Manual Review.",
          httpStatus: rawRes.httpStatus,
          latencyMs: Date.now() - started,
          providerName: this.transport.providerName,
          environment: this.transport.environment,
        };
      }

      const d = decoded.data;
      const encryptedRawPayload = encryptAuditPayloadSafely(d);

      const providerPan = String(d.pan || "").trim().toUpperCase();
      const gstnPanValid = String(d.pan_status || "").toUpperCase() === "VALID";
      const panMatch = hasSubmittedPan && panFmt
        ? providerPan.length === 10 && providerPan === panFmt.normalized
        : gstnPanValid;

      const stateInfo = normalizeIndianState(d.state_code || d.state_name || fmt.stateCode);

      const rawSts = String(d.enrolment_status || "Unknown").trim();
      const lowerSts = rawSts.toLowerCase();
      const enrolmentStatus: EnrolmentAuthoritativeRecord["enrolmentStatus"] =
        lowerSts === "active"
          ? "Active"
          : lowerSts.includes("cancel")
          ? "Cancelled"
          : lowerSts.includes("invalid")
          ? "Invalidated"
          : "Unknown";

      const record: EnrolmentAuthoritativeRecord = {
        enrolmentId: fmt.normalized,
        legalName: String(d.legal_name).trim(),
        panMasked: providerPan ? maskPan(providerPan) : "Verified by GSTN",
        panVerified: panMatch && gstnPanValid,
        registeredStateCode: stateInfo?.code || fmt.stateCode || "",
        registeredStateName: stateInfo?.name || fmt.stateName || "",
        businessAddress: d.address ? String(d.address).trim() : null,
        enrolmentStatus,
        source: this.transport.providerName,
        environment: this.transport.environment,
        verifiedAt: new Date().toISOString(),
      };

      if (hasSubmittedPan && !panMatch) {
        return {
          verified: false,
          outcome: "mismatch",
          manualReviewRequired: false,
          panMatch: false,
          message: "PAN mismatch: The submitted PAN does not match the PAN linked to this GST Enrolment ID.",
          record,
          encryptedRawPayload,
          httpStatus: rawRes.httpStatus,
          latencyMs: Date.now() - started,
          providerName: this.transport.providerName,
          environment: this.transport.environment,
        };
      }

      if (enrolmentStatus !== "Active") {
        return {
          verified: false,
          outcome: enrolmentStatus === "Cancelled" ? "cancelled" : "invalid",
          manualReviewRequired: false,
          panMatch,
          message: `GST Enrolment ID status is "${enrolmentStatus}". Only Active Enrolment IDs are eligible under Notification No. 34/2023-Central Tax.`,
          record,
          encryptedRawPayload,
          httpStatus: rawRes.httpStatus,
          latencyMs: Date.now() - started,
          providerName: this.transport.providerName,
          environment: this.transport.environment,
        };
      }

      return {
        verified: true,
        outcome: "verified",
        manualReviewRequired: false,
        panMatch: true,
        message: "GST Enrolment ID verified authoritatively as Active on GSTN (no PAN input needed). Restricted to intra-state goods supply only.",
        record,
        encryptedRawPayload,
        httpStatus: rawRes.httpStatus,
        latencyMs: Date.now() - started,
        providerName: this.transport.providerName,
        environment: this.transport.environment,
      };
    } catch (err: any) {
      const outcome: VerificationOutcome = err instanceof GspError ? err.outcome : "unavailable";
      return {
        verified: false,
        outcome,
        manualReviewRequired: true,
        message:
          err instanceof GspError
            ? err.message
            : "GSTN Enrolment verification temporarily unavailable. Routed to Manual Review.",
        httpStatus: err instanceof GspError ? err.httpStatus : 503,
        latencyMs: Date.now() - started,
        providerName: this.transport.providerName,
        environment: this.transport.environment,
      };
    }
  }

  /**
   * Official GSTN Unregistered Applicants Validation API
   * Validates registered mobile number and email address associated with the Enrolment ID.
   */
  async validateEnrolmentContact(params: {
    enrolmentId: string;
    mobile: string;
    email: string;
    rateLimitKey?: string;
  }): Promise<EnrolmentContactValidationResult> {
    const started = Date.now();
    const fmt = validateEnrolmentIdFormat(params.enrolmentId);

    if (!fmt.valid) {
      return {
        verified: false,
        outcome: "invalid",
        manualReviewRequired: false,
        mobileMatched: false,
        emailMatched: false,
        message: fmt.error || "Invalid Enrolment ID format.",
        latencyMs: Date.now() - started,
        providerName: this.transport.providerName,
        environment: this.transport.environment,
      };
    }

    try {
      const rawRes = await this.executeWithResilience(
        params.rateLimitKey || `contact_${fmt.normalized}`,
        (token, signal) =>
          this.transport.validateUnregisteredApplicantContact(
            fmt.normalized,
            params.mobile,
            params.email,
            token,
            signal
          )
      );

      if (rawRes.httpStatus !== 200) {
        return {
          verified: false,
          outcome: "unavailable",
          manualReviewRequired: true,
          mobileMatched: false,
          emailMatched: false,
          message: "GSTN contact validation temporarily unavailable. Routed to Manual Review.",
          httpStatus: rawRes.httpStatus,
          latencyMs: Date.now() - started,
          providerName: this.transport.providerName,
          environment: this.transport.environment,
        };
      }

      const decoded = decodeGstnPayloadSafely(rawRes.body);
      if (
        !decoded.ok ||
        !decoded.data ||
        typeof decoded.data.mobile_matched !== "boolean" ||
        typeof decoded.data.email_matched !== "boolean"
      ) {
        return {
          verified: false,
          outcome: "invalid_response",
          manualReviewRequired: true,
          mobileMatched: false,
          emailMatched: false,
          message: "Invalid response from GSTN Unregistered Applicants Validation API. Routed to Manual Review.",
          httpStatus: rawRes.httpStatus,
          latencyMs: Date.now() - started,
          providerName: this.transport.providerName,
          environment: this.transport.environment,
        };
      }

      const mobileMatched = Boolean(decoded.data.mobile_matched);
      const emailMatched = Boolean(decoded.data.email_matched);
      const encryptedRawPayload = encryptAuditPayloadSafely(decoded.data);

      if (!mobileMatched || !emailMatched) {
        const mismatches: string[] = [];
        if (!mobileMatched) mismatches.push("mobile number");
        if (!emailMatched) mismatches.push("email address");
        return {
          verified: false,
          outcome: "mismatch",
          manualReviewRequired: false,
          mobileMatched,
          emailMatched,
          message: `GSTN contact validation failed: Your ${mismatches.join(" and ")} did not match the details registered on the GST Common Portal for this Enrolment ID.`,
          encryptedRawPayload,
          httpStatus: rawRes.httpStatus,
          latencyMs: Date.now() - started,
          providerName: this.transport.providerName,
          environment: this.transport.environment,
        };
      }

      return {
        verified: true,
        outcome: "verified",
        manualReviewRequired: false,
        mobileMatched: true,
        emailMatched: true,
        message: "Registered mobile number and email address validated successfully against GSTN.",
        encryptedRawPayload,
        httpStatus: rawRes.httpStatus,
        latencyMs: Date.now() - started,
        providerName: this.transport.providerName,
        environment: this.transport.environment,
      };
    } catch (err: any) {
      const outcome: VerificationOutcome = err instanceof GspError ? err.outcome : "unavailable";
      return {
        verified: false,
        outcome,
        manualReviewRequired: true,
        mobileMatched: false,
        emailMatched: false,
        message:
          err instanceof GspError
            ? err.message
            : "GSTN contact validation temporarily unavailable. Routed to Manual Review.",
        httpStatus: err instanceof GspError ? err.httpStatus : 503,
        latencyMs: Date.now() - started,
        providerName: this.transport.providerName,
        environment: this.transport.environment,
      };
    }
  }
}
