import crypto from "crypto";

/**
 * Bank Privacy & Security Vault Service
 * Provides military-grade AES-256-GCM encryption, blind indexing, masking, 
 * anti-tamper verification, and rate limiting for seller financial data.
 */

// Secret salt used for key derivation if BANK_ENCRYPTION_KEY is not a 64-char hex key
const VAULT_SALT = "zebalpha_seller_bank_vault_salt_2026";

/**
 * Derives a deterministic 256-bit (32-byte) AES key using PBKDF2-HMAC-SHA256
 */
function getDerivedKey(): Buffer {
  if (process.env.BANK_ENCRYPTION_KEY && process.env.BANK_ENCRYPTION_KEY.length === 64) {
    return Buffer.from(process.env.BANK_ENCRYPTION_KEY, "hex");
  }
  const masterSecret = (process.env.BANK_ENCRYPTION_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  if (!masterSecret) {
    throw new Error("CRITICAL SECURITY ERROR: Neither BANK_ENCRYPTION_KEY nor SUPABASE_SERVICE_ROLE_KEY is configured. Bank vault operations require a valid key in environment variables.");
  }
  return crypto.pbkdf2Sync(masterSecret, VAULT_SALT, 100000, 32, "sha256");
}

/**
 * Encrypts a bank account number using AES-256-GCM (Authenticated Encryption).
 * Output format: enc:v1:<iv_hex>:<tag_hex>:<ciphertext_hex>
 */
export function encryptAccountNumber(accountNumber: string): string {
  const clean = String(accountNumber).trim();
  const key = getDerivedKey();
  const iv = crypto.randomBytes(12); // 96-bit IV recommended for AES-GCM

  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(clean, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `enc:v1:${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

/**
 * Returns an array of candidate decryption keys to enable zero-downtime key rotation
 * and seamless decryption of legacy records encrypted before BANK_ENCRYPTION_KEY was set.
 */
function getCandidateDecryptionKeys(): Buffer[] {
  const keys: Buffer[] = [];
  const seenHex = new Set<string>();

  function addKey(buf: Buffer | null) {
    if (buf && buf.length === 32) {
      const hex = buf.toString("hex");
      if (!seenHex.has(hex)) {
        seenHex.add(hex);
        keys.push(buf);
      }
    }
  }

  // 1. Primary configured key
  try {
    addKey(getDerivedKey());
  } catch {}

  // 2. Explicit legacy/previous keys if specified
  const prevKey = (process.env.PREVIOUS_BANK_ENCRYPTION_KEY || process.env.LEGACY_BANK_ENCRYPTION_KEY || "").trim();
  if (prevKey) {
    if (prevKey.length === 64) {
      addKey(Buffer.from(prevKey, "hex"));
    } else {
      addKey(crypto.pbkdf2Sync(prevKey, VAULT_SALT, 100000, 32, "sha256"));
    }
  }

  // 3. Supabase service role key (if used previously)
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_A_SERVICE_ROLE_KEY || "").trim();
  if (serviceKey) {
    addKey(crypto.pbkdf2Sync(serviceKey, VAULT_SALT, 100000, 32, "sha256"));
  }

  // 4. Historical default key for backward compatibility during migration
  const LEGACY_DEFAULT_MASTER = "zebalpha-enterprise-bank-vault-master-key-998877";
  addKey(crypto.pbkdf2Sync(LEGACY_DEFAULT_MASTER, VAULT_SALT, 100000, 32, "sha256"));

  return keys;
}

/**
 * Decrypts an encrypted account number payload.
 * Supports multi-key resolution: tries active key first, then fallback keys.
 * Throws an error if tampered with or corrupted (Authentication failure).
 */
export function decryptAccountNumber(encryptedPayload: string): string {
  if (!encryptedPayload || !encryptedPayload.startsWith("enc:v1:")) {
    throw new Error("Invalid or unsupported ciphertext format");
  }

  const parts = encryptedPayload.split(":");
  if (parts.length !== 5) {
    throw new Error("Malformed ciphertext payload");
  }

  const iv = Buffer.from(parts[2], "hex");
  const authTag = Buffer.from(parts[3], "hex");
  const ciphertext = Buffer.from(parts[4], "hex");

  const candidateKeys = getCandidateDecryptionKeys();
  if (candidateKeys.length === 0) {
    throw new Error("No decryption keys available to decrypt bank account number.");
  }

  let lastError: Error | null = null;
  for (const key of candidateKeys) {
    try {
      const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
      decipher.setAuthTag(authTag);
      const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
      return decrypted.toString("utf8");
    } catch (err: any) {
      lastError = err;
      // In AES-GCM, incorrect key fails authTag verification; try next candidate key
    }
  }

  throw new Error(`Authentication failure: Unable to decrypt bank account payload with any configured or legacy keys (${lastError?.message || 'GCM auth failure'})`);
}

/**
 * Re-encrypts an old encrypted bank account payload with the current primary key.
 * Used for zero-downtime key rotation.
 */
export function reEncryptAccountNumber(encryptedPayload: string): string {
  const plaintext = decryptAccountNumber(encryptedPayload);
  return encryptAccountNumber(plaintext);
}

/**
 * Generates an HMAC-SHA256 blind index hash of the account number.
 * Allows duplicate detection and indexing without ever storing or querying plaintext.
 */
export function hashAccountNumber(accountNumber: string): string {
  const clean = String(accountNumber).trim();
  const key = getDerivedKey();
  return crypto.createHmac("sha256", key).update(clean).digest("hex");
}

/**
 * Masks the bank account number according to banking privacy standards (PCI/RBI).
 * Preserves only the last 4 digits: e.g. "•••• •••• •••• 1234"
 */
export function maskAccountNumber(accountNumber: string): string {
  const clean = String(accountNumber).replace(/\D/g, "");
  if (clean.length < 4) {
    return "•••• •••• •••• ••••";
  }
  const last4 = clean.slice(-4);
  return `•••• •••• •••• ${last4}`;
}

/**
 * Strips dangerous HTML / scripts to prevent XSS injection attacks.
 */
export function sanitizeText(text: string): string {
  return String(text || "")
    .replace(/[<>'"&]/g, "")
    .trim();
}

export interface BankValidationResult {
  valid: boolean;
  error?: string;
  cleaned?: {
    accountHolderName: string;
    bankName: string;
    accountNumber: string;
    ifscCode: string;
    upiId: string | null;
  };
}

/**
 * Performs rigorous multi-layer validation on seller bank details.
 */
export function validateBankInput(data: {
  accountHolderName?: string;
  bankName?: string;
  accountNumber?: string;
  confirmAccountNumber?: string;
  ifscCode?: string;
  upiId?: string;
}): BankValidationResult {
  const accountHolderName = sanitizeText(data.accountHolderName || "");
  const bankName = sanitizeText(data.bankName || "");
  const accountNumber = String(data.accountNumber || "").replace(/\s+/g, "").trim();
  const confirmAccountNumber = data.confirmAccountNumber
    ? String(data.confirmAccountNumber).replace(/\s+/g, "").trim()
    : undefined;
  const ifscCode = String(data.ifscCode || "").replace(/\s+/g, "").toUpperCase().trim();
  const upiId = data.upiId ? sanitizeText(data.upiId) : null;

  if (!accountHolderName || accountHolderName.length < 2 || accountHolderName.length > 100) {
    return { valid: false, error: "Account holder name must be between 2 and 100 characters" };
  }

  if (!bankName || bankName.length < 2 || bankName.length > 100) {
    return { valid: false, error: "Bank name must be between 2 and 100 characters" };
  }

  // Account number: Indian bank accounts are strictly 9 to 18 numeric digits
  const accRegex = /^\d{9,18}$/;
  if (!accRegex.test(accountNumber)) {
    return {
      valid: false,
      error: "Invalid bank account number. Must contain only 9 to 18 digits with no spaces or letters."
    };
  }

  // Confirmation match check
  if (confirmAccountNumber !== undefined && accountNumber !== confirmAccountNumber) {
    return { valid: false, error: "Account numbers do not match. Please verify carefully." };
  }

  // IFSC Code: 4 alphabetic letters, 5th character is '0', followed by 6 alphanumeric characters
  const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
  if (!ifscRegex.test(ifscCode)) {
    return {
      valid: false,
      error: "Invalid IFSC code format. Standard format: 4 letters, '0', then 6 alphanumeric characters (e.g. HDFC0001234)."
    };
  }

  // UPI validation (optional)
  if (upiId) {
    const upiRegex = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;
    if (!upiRegex.test(upiId)) {
      return { valid: false, error: "Invalid UPI / VPA format. Must be in the format yourname@bank." };
    }
  }

  return {
    valid: true,
    cleaned: {
      accountHolderName,
      bankName,
      accountNumber,
      ifscCode,
      upiId
    }
  };
}

// In-memory sliding window rate limiter for bank detail updates
// Key: sellerId or IP -> timestamps array
const rateLimitMap = new Map<string, number[]>();

/**
 * Enforces rate limiting: Max 3 bank update attempts per 30 minutes per seller / IP.
 */
export function checkBankRateLimit(identifier: string, maxAttempts = 3, windowMs = 30 * 60 * 1000): { allowed: boolean; retryAfterSeconds?: number } {
  const now = Date.now();
  const timestamps = rateLimitMap.get(identifier) || [];
  
  // Filter out timestamps older than window
  const recent = timestamps.filter(ts => now - ts < windowMs);
  
  if (recent.length >= maxAttempts) {
    const oldestInWindow = recent[0];
    const retryAfter = Math.ceil((oldestInWindow + windowMs - now) / 1000);
    return { allowed: false, retryAfterSeconds: retryAfter };
  }

  recent.push(now);
  rateLimitMap.set(identifier, recent);

  // Periodically clean up map to prevent memory leak
  if (rateLimitMap.size > 5000) {
    for (const [key, tsList] of rateLimitMap.entries()) {
      if (tsList.every(t => now - t > windowMs)) {
        rateLimitMap.delete(key);
      }
    }
  }

  return { allowed: true };
}
