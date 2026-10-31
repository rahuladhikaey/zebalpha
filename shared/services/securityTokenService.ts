import crypto from "crypto";

/**
 * Security Token & Rate Limiting Service
 * Provides cryptographically signed, short-lived, single-use authentication tokens
 * for Password Reset and Verified Signup operations.
 */

const TOKEN_SALT = "zebalpha_auth_token_signing_salt_2026";
const RESET_TOKEN_TTL_MS = 10 * 60 * 1000; // 10 minutes
const SIGNUP_TOKEN_TTL_MS = 15 * 60 * 1000; // 15 minutes

// In-memory single-use consumed token store (JTI -> expiry timestamp)
const consumedTokens = new Map<string, number>();

// In-memory rate limiting store (Key -> { count, resetAt })
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

function getSigningKey(): Buffer {
  const masterSecret = (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.BANK_ENCRYPTION_KEY ||
    process.env.AUTH_SECRET ||
    "zebalpha_auth_master_signing_fallback_key_2026"
  ).trim();

  return crypto.pbkdf2Sync(masterSecret, TOKEN_SALT, 100000, 32, "sha256");
}

export interface TokenPayload {
  email: string;
  purpose: "password_reset" | "signup_verification";
  exp: number;
  jti: string;
}

/**
 * Generates a cryptographically signed HMAC-SHA256 token.
 */
function createSignedToken(payload: TokenPayload): string {
  const serialized = JSON.stringify(payload);
  const base64Payload = Buffer.from(serialized, "utf8").toString("base64url");
  const key = getSigningKey();
  const signature = crypto.createHmac("sha256", key).update(base64Payload).digest("hex");
  return `${base64Payload}.${signature}`;
}

/**
 * Validates token signature, expiration, purpose, and single-use status.
 */
function verifySignedToken(
  token: string,
  expectedEmail: string,
  expectedPurpose: "password_reset" | "signup_verification"
): { valid: boolean; payload?: TokenPayload; reason?: string } {
  try {
    if (!token || typeof token !== "string" || !token.includes(".")) {
      return { valid: false, reason: "Malformed or missing token" };
    }

    const [base64Payload, signature] = token.split(".");
    if (!base64Payload || !signature) {
      return { valid: false, reason: "Invalid token structure" };
    }

    const key = getSigningKey();
    const expectedSig = crypto.createHmac("sha256", key).update(base64Payload).digest("hex");

    const sigBuf = Buffer.from(signature, "hex");
    const expSigBuf = Buffer.from(expectedSig, "hex");

    if (sigBuf.length !== expSigBuf.length || !crypto.timingSafeEqual(sigBuf, expSigBuf)) {
      return { valid: false, reason: "Cryptographic signature mismatch" };
    }

    const payloadRaw = Buffer.from(base64Payload, "base64url").toString("utf8");
    const payload: TokenPayload = JSON.parse(payloadRaw);

    if (Date.now() > payload.exp) {
      return { valid: false, reason: "Token has expired" };
    }

    if (payload.purpose !== expectedPurpose) {
      return { valid: false, reason: `Token purpose mismatch (expected ${expectedPurpose})` };
    }

    if (payload.email.toLowerCase().trim() !== expectedEmail.toLowerCase().trim()) {
      return { valid: false, reason: "Token is not bound to this email address" };
    }

    if (consumedTokens.has(payload.jti)) {
      return { valid: false, reason: "Token has already been consumed (single-use violation)" };
    }

    return { valid: true, payload };
  } catch (err: any) {
    return { valid: false, reason: err?.message || "Token parsing failure" };
  }
}

/**
 * Issues a signed Password Reset Token for a verified email (10-minute expiry).
 */
export function generatePasswordResetToken(email: string): string {
  return createSignedToken({
    email: email.toLowerCase().trim(),
    purpose: "password_reset",
    exp: Date.now() + RESET_TOKEN_TTL_MS,
    jti: crypto.randomUUID(),
  });
}

/**
 * Verifies a Password Reset Token.
 */
export function verifyPasswordResetToken(
  email: string,
  token: string
): { valid: boolean; reason?: string; jti?: string } {
  const result = verifySignedToken(token, email, "password_reset");
  return { valid: result.valid, reason: result.reason, jti: result.payload?.jti };
}

/**
 * Consumes a Password Reset Token to prevent replay attacks.
 */
export function consumePasswordResetToken(token: string): boolean {
  try {
    const [base64Payload] = token.split(".");
    const payload: TokenPayload = JSON.parse(Buffer.from(base64Payload, "base64url").toString("utf8"));
    consumedTokens.set(payload.jti, payload.exp);
    return true;
  } catch {
    return false;
  }
}

/**
 * Issues a signed Signup Verification Token for a verified email (15-minute expiry).
 */
export function generateSignupProofToken(email: string): string {
  return createSignedToken({
    email: email.toLowerCase().trim(),
    purpose: "signup_verification",
    exp: Date.now() + SIGNUP_TOKEN_TTL_MS,
    jti: crypto.randomUUID(),
  });
}

/**
 * Verifies a Signup Proof Token.
 */
export function verifySignupProofToken(
  email: string,
  token: string
): { valid: boolean; reason?: string; jti?: string } {
  const result = verifySignedToken(token, email, "signup_verification");
  return { valid: result.valid, reason: result.reason, jti: result.payload?.jti };
}

/**
 * Consumes a Signup Proof Token to prevent replay attacks.
 */
export function consumeSignupProofToken(token: string): boolean {
  try {
    const [base64Payload] = token.split(".");
    const payload: TokenPayload = JSON.parse(Buffer.from(base64Payload, "base64url").toString("utf8"));
    consumedTokens.set(payload.jti, payload.exp);
    return true;
  } catch {
    return false;
  }
}

/**
 * In-memory IP and Action rate limiter.
 * Returns true if request is allowed, false if limit exceeded.
 */
export function checkRateLimit(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= maxRequests) {
    return false;
  }

  entry.count += 1;
  return true;
}

// Periodic cleanup of consumed tokens & expired rate-limit records
const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [jti, exp] of consumedTokens.entries()) {
    if (now > exp) {
      consumedTokens.delete(jti);
    }
  }
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetAt) {
      rateLimitStore.delete(key);
    }
  }
}, 60000);

cleanupTimer.unref?.();
