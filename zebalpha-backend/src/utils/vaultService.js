import crypto from 'crypto';

const VAULT_SALT = 'zebalpha_seller_bank_vault_salt_2026';
const LEGACY_DEFAULT_MASTER = 'zebalpha-enterprise-bank-vault-master-key-998877';

function getNewKey() {
  const envKey = (process.env.BANK_ENCRYPTION_KEY || '').trim();
  if (envKey) {
    if (envKey.length === 64) {
      return Buffer.from(envKey, 'hex');
    }
    return crypto.pbkdf2Sync(envKey, VAULT_SALT, 100000, 32, 'sha256');
  }

  // Fallback to Supabase service role key if BANK_ENCRYPTION_KEY is not yet populated
  const serviceKey = (process.env.SUPABASE_A_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (serviceKey) {
    return crypto.pbkdf2Sync(serviceKey, VAULT_SALT, 100000, 32, 'sha256');
  }

  // Final fallback for local/dev
  return crypto.pbkdf2Sync(LEGACY_DEFAULT_MASTER, VAULT_SALT, 100000, 32, 'sha256');
}

function getCandidateKeys() {
  const keys = [];
  const seenHex = new Set();

  function addKey(buf) {
    if (buf && buf.length === 32) {
      const hex = buf.toString('hex');
      if (!seenHex.has(hex)) {
        seenHex.add(hex);
        keys.push(buf);
      }
    }
  }

  // 1. Current configured key
  try {
    addKey(getNewKey());
  } catch {}

  // 2. Previous/legacy key from env
  const prevKey = (process.env.PREVIOUS_BANK_ENCRYPTION_KEY || process.env.LEGACY_BANK_ENCRYPTION_KEY || '').trim();
  if (prevKey) {
    if (prevKey.length === 64) {
      addKey(Buffer.from(prevKey, 'hex'));
    } else {
      addKey(crypto.pbkdf2Sync(prevKey, VAULT_SALT, 100000, 32, 'sha256'));
    }
  }

  // 3. Supabase Service Role Key
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_A_SERVICE_ROLE_KEY || '').trim();
  if (serviceKey) {
    addKey(crypto.pbkdf2Sync(serviceKey, VAULT_SALT, 100000, 32, 'sha256'));
  }

  // 4. Legacy default key
  addKey(crypto.pbkdf2Sync(LEGACY_DEFAULT_MASTER, VAULT_SALT, 100000, 32, 'sha256'));

  return keys;
}

/**
 * Encrypt sensitive financial data using AES-256-GCM
 */
export function encryptSensitiveData(plainText) {
  if (!plainText) return null;
  const key = getNewKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(String(plainText), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `enc:v1:${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

/**
 * Decrypt sensitive financial data using multi-key fallback
 */
export function decryptSensitiveData(payload) {
  if (!payload || typeof payload !== 'string') return null;
  if (!payload.startsWith('enc:v1:')) {
    // Non-encrypted or legacy plaintext
    return payload;
  }

  const parts = payload.split(':');
  if (parts.length !== 5) return null;

  const iv = Buffer.from(parts[2], 'hex');
  const tag = Buffer.from(parts[3], 'hex');
  const ciphertext = Buffer.from(parts[4], 'hex');
  const candidateKeys = getCandidateKeys();

  for (const key of candidateKeys) {
    try {
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(tag);
      const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
      return decrypted.toString('utf8');
    } catch {
      // Continue to next candidate key
    }
  }
  return null;
}

/**
 * Deterministic blind indexing / fingerprint for unique lookups
 */
export function createDeterministicFingerprint(plainText) {
  if (!plainText) return null;
  const key = getNewKey();
  return crypto.createHmac('sha256', key).update(String(plainText).trim().toLowerCase()).digest('hex');
}

/**
 * Mask UPI ID (e.g. "rahuladhikary@oksbi" -> "ra***ry@oksbi")
 */
export function maskUpiId(vpa) {
  if (!vpa || typeof vpa !== 'string') return '';
  const trimmed = vpa.trim().toLowerCase();
  const atIndex = trimmed.indexOf('@');
  if (atIndex === -1) {
    if (trimmed.length <= 4) return '***';
    return `${trimmed.slice(0, 2)}***${trimmed.slice(-2)}`;
  }

  const user = trimmed.slice(0, atIndex);
  const handle = trimmed.slice(atIndex); // includes '@'

  if (user.length <= 2) {
    return `${user[0] || '*'}***${handle}`;
  }
  if (user.length <= 4) {
    return `${user[0]}***${user.slice(-1)}${handle}`;
  }
  return `${user.slice(0, 2)}***${user.slice(-2)}${handle}`;
}

/**
 * Mask Beneficiary Name (e.g. "RAHUL ADHIKARY" -> "R***L A***Y")
 */
export function maskBeneficiaryName(name) {
  if (!name || typeof name !== 'string') return '';
  const parts = name.trim().split(/\s+/);
  return parts.map(part => {
    if (part.length <= 2) return `${part[0]}*`;
    return `${part[0]}${'*'.repeat(Math.min(3, part.length - 2))}${part.slice(-1)}`;
  }).join(' ');
}
