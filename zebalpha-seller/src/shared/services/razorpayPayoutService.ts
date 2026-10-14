import crypto from "crypto";

/**
 * Razorpay Payouts & UPI VPA Verification Engine
 * Direct integration with Razorpay NPCI banking rails for real-time beneficiary
 * validation and on-demand merchant disbursements.
 */

const RAZORPAY_KEY_ID = (process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "").trim();
const RAZORPAY_KEY_SECRET = (process.env.RAZORPAY_KEY_SECRET || "").trim();

export interface UpiVerificationResult {
  success: boolean;
  verified: boolean;
  vpa: string;
  verifiedName: string | null;
  maskedVpa: string;
  beneficiaryNameMasked?: string;
  verificationStatus?: 'verified' | 'name_mismatch' | 'inactive' | 'failed' | 'manual_review';
  matchResult?: {
    match: boolean;
    isReview: boolean;
    score: number;
    reason: string;
  };
  error?: string;
  providerReference?: string;
}

const BUSINESS_HONORIFICS = new Set([
  'mr', 'mrs', 'ms', 'dr', 'shri', 'smt', 'md',
  'ms', 'm/s', 'enterprises', 'enterprise', 'traders', 'trading',
  'pvt', 'ltd', 'private', 'limited', 'llp', 'inc', 'co', 'company',
  'services', 'service', 'solutions', 'store', 'stores', 'fashion', 'fashions',
  'clothing', 'apparel', 'apparels', 'textiles', 'textile', 'prop', 'proprietor'
]);

export function normalizeNameForMatching(name: string) {
  if (!name || typeof name !== 'string') return { normalized: '', tokens: [] };
  const cleaned = name
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const tokens = cleaned
    .split(' ')
    .map(t => t.trim())
    .filter(t => t.length > 1 && !BUSINESS_HONORIFICS.has(t));

  return { normalized: tokens.join(' '), tokens };
}

export function matchBeneficiaryName(sellerName: string, registeredBeneficiaryName: string) {
  if (!registeredBeneficiaryName || typeof registeredBeneficiaryName !== 'string') {
    return { match: false, isReview: false, score: 0, reason: 'No beneficiary name returned by UPI banking network' };
  }
  if (!sellerName || typeof sellerName !== 'string') {
    return { match: false, isReview: false, score: 0, reason: 'No registered seller name found' };
  }

  const sellerParsed = normalizeNameForMatching(sellerName);
  const regParsed = normalizeNameForMatching(registeredBeneficiaryName);

  if (sellerParsed.normalized && sellerParsed.normalized === regParsed.normalized) {
    return { match: true, isReview: false, score: 1.0, reason: 'Exact name match' };
  }

  const sTokens = new Set(sellerParsed.tokens);
  const rTokens = new Set(regParsed.tokens);

  if (sTokens.size === 0 || rTokens.size === 0) {
    return { match: false, isReview: true, score: 0.1, reason: 'Insufficient distinct tokens for automated name matching' };
  }

  const intersection = [...sTokens].filter(t => rTokens.has(t));
  const union = new Set([...sTokens, ...rTokens]);
  const jaccardScore = intersection.length / union.size;

  const sellerFullyContained = [...sTokens].every(t => rTokens.has(t));
  const regFullyContained = [...rTokens].every(t => sTokens.has(t));

  if (sellerFullyContained || regFullyContained) {
    return { match: true, isReview: false, score: 0.95, reason: 'Full token containment match' };
  }

  if (jaccardScore >= 0.70) {
    return { match: true, isReview: false, score: Number(jaccardScore.toFixed(2)), reason: `High token overlap similarity (${Math.round(jaccardScore * 100)}%)` };
  }

  if (jaccardScore >= 0.40 || intersection.length >= 1) {
    return { match: false, isReview: true, score: Number(jaccardScore.toFixed(2)), reason: `Partial name match (${Math.round(jaccardScore * 100)}%). Requires manual review.` };
  }

  return {
    match: false,
    isReview: false,
    score: Number(jaccardScore.toFixed(2)),
    reason: `Beneficiary name "${registeredBeneficiaryName}" does not match registered seller name "${sellerName}"`
  };
}

export function maskBeneficiaryName(name: string): string {
  if (!name || typeof name !== 'string') return '';
  return name.trim().split(/\s+/).map(part => {
    if (part.length <= 2) return `${part[0]}*`;
    return `${part[0]}${'*'.repeat(Math.min(3, part.length - 2))}${part.slice(-1)}`;
  }).join(' ');
}

/**
 * Masks a UPI ID according to privacy guidelines (e.g., "m********@upi")
 */
export function maskUpiId(vpa: string): string {
  const clean = String(vpa || "").trim().toLowerCase();
  const parts = clean.split("@");
  if (parts.length !== 2) return clean;

  const [username, handle] = parts;
  if (username.length <= 2) {
    return `${username[0]}****@${handle}`;
  }

  const firstChar = username[0];
  const lastChar = username[username.length - 1];
  const maskLength = Math.max(3, Math.min(username.length - 2, 8));
  return `${firstChar}${"*".repeat(maskLength)}${lastChar}@${handle}`;
}

/**
 * Validates the basic structural format of a UPI ID (VPA).
 * Supports any standard bank or PSP handle (e.g., username@provider).
 */
export function isValidUpiFormat(vpa: string): boolean {
  if (!vpa || typeof vpa !== "string") return false;
  const clean = vpa.trim().toLowerCase();
  const upiRegex = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z0-9.\-_]{2,64}$/;
  return upiRegex.test(clean);
}

/**
 * Real-time UPI VPA Verification via Razorpay banking validation API
 * Performs conservative Beneficiary Name Matching against seller's registered legal/business name.
 */
export async function verifyUpiWithProvider(vpa: string, sellerName?: string): Promise<UpiVerificationResult> {
  const cleanVpa = String(vpa || "").trim().toLowerCase();

  // 1. Initial Format Verification
  if (!isValidUpiFormat(cleanVpa)) {
    return {
      success: false,
      verified: false,
      vpa: cleanVpa,
      verifiedName: null,
      maskedVpa: cleanVpa,
      verificationStatus: 'failed',
      error: "Invalid UPI ID format. Standard format: username@bank (e.g. merchant@upi, merchant@paytm, merchant@ybl)."
    };
  }

  const masked = maskUpiId(cleanVpa);

  // 2. Query Razorpay VPA Validation Endpoint
  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
    return {
      success: false,
      verified: false,
      vpa: cleanVpa,
      verifiedName: null,
      maskedVpa: masked,
      verificationStatus: 'failed',
      error: "Payment provider credentials missing. Cannot verify UPI ID."
    };
  }

  try {
    const basicAuth = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString("base64");
    const endpoint = `https://api.razorpay.com/v1/payments/validate/vpa?vpa=${encodeURIComponent(cleanVpa)}`;

    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/json"
      },
      cache: "no-store"
    });

    const data = await response.json();

    // 3. Strict Validation against Razorpay NPCI Banking Rails
    if (response.ok && data && data.success === true && data.customer_name) {
      const customerName = String(data.customer_name).trim();
      const maskedName = maskBeneficiaryName(customerName);

      if (sellerName) {
        const matchRes = matchBeneficiaryName(sellerName, customerName);
        if (matchRes.match) {
          return {
            success: true,
            verified: true,
            vpa: cleanVpa,
            verifiedName: customerName,
            beneficiaryNameMasked: maskedName,
            verificationStatus: 'verified',
            matchResult: matchRes,
            maskedVpa: masked,
            providerReference: data.id || `vpa_${Date.now()}`
          };
        } else if (matchRes.isReview) {
          return {
            success: false,
            verified: false,
            vpa: cleanVpa,
            verifiedName: customerName,
            beneficiaryNameMasked: maskedName,
            verificationStatus: 'manual_review',
            matchResult: matchRes,
            maskedVpa: masked,
            providerReference: data.id || `vpa_${Date.now()}`,
            error: matchRes.reason
          };
        } else {
          return {
            success: false,
            verified: false,
            vpa: cleanVpa,
            verifiedName: customerName,
            beneficiaryNameMasked: maskedName,
            verificationStatus: 'name_mismatch',
            matchResult: matchRes,
            maskedVpa: masked,
            providerReference: data.id || `vpa_${Date.now()}`,
            error: matchRes.reason
          };
        }
      }

      return {
        success: true,
        verified: true,
        vpa: cleanVpa,
        verifiedName: customerName,
        beneficiaryNameMasked: maskedName,
        verificationStatus: 'verified',
        maskedVpa: masked,
        providerReference: data.id || `vpa_${Date.now()}`
      };
    }

    // Explicit banking failure or invalid VPA handle
    if (data && data.success === false) {
      return {
        success: false,
        verified: false,
        vpa: cleanVpa,
        verifiedName: null,
        maskedVpa: masked,
        verificationStatus: 'inactive',
        error: "UPI ID verification failed. This handle is invalid or not registered on the banking network."
      };
    }

    if (data && data.error) {
      return {
        success: false,
        verified: false,
        vpa: cleanVpa,
        verifiedName: null,
        maskedVpa: masked,
        verificationStatus: 'failed',
        error: data.error.description || data.error.message || "UPI ID verification failed on banking network."
      };
    }

    return {
      success: false,
      verified: false,
      vpa: cleanVpa,
      verifiedName: null,
      maskedVpa: masked,
      verificationStatus: 'failed',
      error: "Unable to verify UPI ID with payment provider. Please check the handle and try again."
    };
  } catch (err: any) {
    console.error("[Razorpay VPA Validation Error]:", err);
    return {
      success: false,
      verified: false,
      vpa: cleanVpa,
      verifiedName: null,
      maskedVpa: masked,
      verificationStatus: 'failed',
      error: err?.message || "Network error while verifying UPI ID."
    };
  }
}

/**
 * Initiates an on-demand payout/settlement request
 */
export async function createProviderPayout(params: {
  sellerId: string;
  amount: number;
  vpa: string;
  beneficiaryName: string;
  payoutNumber: string;
  idempotencyKey: string;
}): Promise<{
  success: boolean;
  status: "COMPLETED" | "PROCESSING" | "FAILED";
  providerPayoutId?: string;
  utrNumber?: string;
  failureReason?: string;
}> {
  const { amount, vpa, beneficiaryName, payoutNumber, idempotencyKey } = params;

  try {
    const basicAuth = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString("base64");
    
    const payoutPayload = {
      account_number: (process.env.RAZORPAY_ACCOUNT_NUMBER || "2323230041641014").trim(),
      amount: Math.round(amount * 100), // amount in paise
      currency: "INR",
      mode: "UPI",
      purpose: "settlement",
      fund_account: {
        account_type: "vpa",
        vpa: {
          address: vpa
        },
        contact: {
          name: beneficiaryName || "Seller Settlement",
          type: "vendor"
        }
      },
      queue_if_low_balance: true,
      reference_id: payoutNumber,
      narration: "ZebAlpha Settlement"
    };

    const response = await fetch("https://api.razorpay.com/v1/payouts", {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/json",
        "X-Payout-Idempotency": idempotencyKey
      },
      body: JSON.stringify(payoutPayload)
    });

    const data = await response.json();

    if (response.ok && data.id) {
      const isCompleted = data.status === "processed";
      return {
        success: true,
        status: isCompleted ? "COMPLETED" : "PROCESSING",
        providerPayoutId: data.id,
        utrNumber: data.utr || null
      };
    }

    return {
      success: false,
      status: "FAILED",
      failureReason: data.error?.description || "Payout initiation rejected by provider"
    };
  } catch (err: any) {
    console.error("[Razorpay Payout Error]:", err);
    return {
      success: false,
      status: "FAILED",
      failureReason: err?.message || "Internal network error during payout dispatch"
    };
  }
}

/**
 * Validates Razorpay Webhook Signature using HMAC-SHA256
 */
export function verifyRazorpayWebhookSignature(payload: string, signature: string, secret?: string): boolean {
  const webhookSecret = secret || process.env.RAZORPAY_WEBHOOK_SECRET || RAZORPAY_KEY_SECRET;
  if (!webhookSecret || !signature) return false;

  const expectedSignature = crypto
    .createHmac("sha256", webhookSecret)
    .update(payload)
    .digest("hex");

  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expectedSignature);

  if (sigBuf.length !== expBuf.length) return false;
  return crypto.timingSafeEqual(sigBuf, expBuf);
}
