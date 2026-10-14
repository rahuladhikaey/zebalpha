/**
 * ZEBALPHA — BANK VAULT DATA MIGRATION & RE-ENCRYPTION UTILITY
 * 
 * Safely decrypts legacy bank account numbers and re-encrypts them
 * using the newly configured production BANK_ENCRYPTION_KEY.
 * 
 * Usage:
 *   node scripts/migrate_bank_encryption_vault.js
 */

import crypto from 'crypto';
import { supabaseA } from '../src/lib/supabase.js';

const VAULT_SALT = 'zebalpha_seller_bank_vault_salt_2026';
const LEGACY_DEFAULT_MASTER = 'zebalpha-enterprise-bank-vault-master-key-998877';

function getNewKey() {
  const envKey = process.env.BANK_ENCRYPTION_KEY;
  if (!envKey) {
    throw new Error('BANK_ENCRYPTION_KEY environment variable is required to execute re-encryption.');
  }
  if (envKey.length === 64) {
    return Buffer.from(envKey, 'hex');
  }
  return crypto.pbkdf2Sync(envKey, VAULT_SALT, 100000, 32, 'sha256');
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

function decryptPayload(payload, candidateKeys) {
  if (!payload || !payload.startsWith('enc:v1:')) {
    return null;
  }
  const parts = payload.split(':');
  if (parts.length !== 5) return null;

  const iv = Buffer.from(parts[2], 'hex');
  const tag = Buffer.from(parts[3], 'hex');
  const ciphertext = Buffer.from(parts[4], 'hex');

  for (const key of candidateKeys) {
    try {
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(tag);
      const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
      return decrypted.toString('utf8');
    } catch {}
  }
  return null;
}

function encryptWithKey(plainText, key) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `enc:v1:${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

function hashWithKey(plainText, key) {
  return crypto.createHmac('sha256', key).update(plainText).digest('hex');
}

async function runMigration() {
  console.log('=== ZEBALPHA BANK VAULT DATA RE-ENCRYPTION MIGRATION ===');
  
  let newKey;
  try {
    newKey = getNewKey();
    console.log('✓ Target BANK_ENCRYPTION_KEY validated.');
  } catch (err) {
    console.error('✗ Migration Aborted:', err.message);
    process.exit(1);
  }

  const candidateKeys = getCandidateKeys();
  console.log(`✓ Loaded ${candidateKeys.length} candidate decryption keys for fallback resolution.`);

  // 1. Process seller_bank_accounts if table exists
  try {
    const { data: accounts, error } = await supabaseA
      .from('seller_bank_accounts')
      .select('id, seller_id, encrypted_account_number, masked_account_number');

    if (error) {
      console.log(`ℹ seller_bank_accounts table check: ${error.message}`);
    } else if (accounts && accounts.length > 0) {
      console.log(`Found ${accounts.length} records in seller_bank_accounts to audit.`);
      let updatedCount = 0;

      for (const acc of accounts) {
        if (!acc.encrypted_account_number) continue;

        const decrypted = decryptPayload(acc.encrypted_account_number, candidateKeys);
        if (!decrypted) {
          console.warn(`[WARN] Could not decrypt record ${acc.id} with any candidate key. Skipping.`);
          continue;
        }

        const newEncrypted = encryptWithKey(decrypted, newKey);
        const newHash = hashWithKey(decrypted, newKey);

        const { error: updateErr } = await supabaseA
          .from('seller_bank_accounts')
          .update({
            encrypted_account_number: newEncrypted,
            account_number_hash: newHash,
            updated_at: new Date().toISOString()
          })
          .eq('id', acc.id);

        if (updateErr) {
          console.error(`[ERROR] Failed to update record ${acc.id}:`, updateErr.message);
        } else {
          updatedCount++;
        }
      }
      console.log(`✓ Successfully re-encrypted ${updatedCount}/${accounts.length} bank accounts under the new key.`);
    } else {
      console.log('✓ seller_bank_accounts is empty or has no encrypted records.');
    }
  } catch (err) {
    console.log('ℹ seller_bank_accounts check finished:', err.message);
  }

  // 2. Process seller_settlement_methods if table exists
  try {
    const { data: methods, error: mErr } = await supabaseA
      .from('seller_settlement_methods')
      .select('id, seller_id, encrypted_destination, masked_destination');

    if (mErr) {
      console.log(`ℹ seller_settlement_methods table check: ${mErr.message}`);
    } else if (methods && methods.length > 0) {
      console.log(`Found ${methods.length} records in seller_settlement_methods to audit.`);
      let updatedMethods = 0;

      for (const meth of methods) {
        if (!meth.encrypted_destination) continue;

        const decrypted = decryptPayload(meth.encrypted_destination, candidateKeys);
        if (!decrypted) {
          console.warn(`[WARN] Could not decrypt settlement method ${meth.id}. Skipping.`);
          continue;
        }

        const newEncrypted = encryptWithKey(decrypted, newKey);
        const newHash = hashWithKey(decrypted, newKey);

        const { error: updErr } = await supabaseA
          .from('seller_settlement_methods')
          .update({
            encrypted_destination: newEncrypted,
            destination_hash: newHash,
            updated_at: new Date().toISOString()
          })
          .eq('id', meth.id);

        if (!updErr) updatedMethods++;
      }
      console.log(`✓ Successfully re-encrypted ${updatedMethods}/${methods.length} settlement methods under the new key.`);
    } else {
      console.log('✓ seller_settlement_methods is clean or has no encrypted records.');
    }
  } catch (err) {
    console.log('ℹ seller_settlement_methods check finished:', err.message);
  }

  console.log('=== RE-ENCRYPTION MIGRATION COMPLETED ===');
}

runMigration().catch(err => {
  console.error('Fatal Migration Error:', err);
  process.exit(1);
});
