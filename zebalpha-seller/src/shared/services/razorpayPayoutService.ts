import crypto from "crypto";

/**
 * Razorpay Payouts & UPI VPA Verification Engine
 * Direct integration with Razorpay NPCI banking rails for real-time beneficiary
 * validation and on-demand merchant disbursements.
 */

const RAZORPAY_KEY_ID = (process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "").trim();
const RAZORPAY_KEY_SECRET = (process.env.RAZORPAY_KEY_SECRET || "").trim();

if (!RAZORPAY_KEY_SECRET) {
  throw new Error("Missing required environment variable: RAZORPAY_KEY_SECRET");
}

if (!RAZORPAY_KEY_ID) {
  throw new Error("Missing required environment variable: RAZORPAY_KEY_ID");
}

export interface UpiVerificationResult {
  success: boolean;
  verified: boolean;
  vpa: string;
  verifiedName: string | null;
  maskedVpa: string;
  error?: string;
  providerReference?: string;
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
  // Validates username (min 2, alphanumeric with . - _) @ provider handle (min 2 letters/digits)
  const upiRegex = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z0-9.\-_]{2,64}$/;
  return upiRegex.test(clean);
}

/**
 * Real-time UPI VPA Verification via Razorpay banking validation API
 */
export async function verifyUpiWithProvider(vpa: string): Promise<UpiVerificationResult> {
  const cleanVpa = String(vpa || "").trim().toLowerCase();

  // 1. Initial Format Verification
  if (!isValidUpiFormat(cleanVpa)) {
    return {
      success: false,
      verified: false,
      vpa: cleanVpa,
      verifiedName: null,
      maskedVpa: cleanVpa,
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
      return {
        success: true,
        verified: true,
        vpa: cleanVpa,
        verifiedName: String(data.customer_name).trim(),
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
        error: data.error.description || data.error.message || "UPI ID verification failed on banking network."
      };
    }

    return {
      success: false,
      verified: false,
      vpa: cleanVpa,
      verifiedName: null,
      maskedVpa: masked,
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
    // If RazorpayX Payouts API is active
    const basicAuth = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString("base64");
    
    // We attempt real Razorpay Payouts call
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
