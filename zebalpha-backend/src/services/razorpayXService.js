/**
 * ZEBALPHA — RAZORPAYX SELLER UPI VERIFICATION & PAYOUT SERVICE
 * 
 * Production-ready integration with RazorpayX for:
 * 1. UPI ID format validation & sanitize
 * 2. Conservative Beneficiary Name Matching (prevents fraudulent/mismatched payouts)
 * 3. RazorpayX Contact creation
 * 4. RazorpayX VPA Fund Account generation
 * 5. Fund Account & VPA validation
 * 6. Automated UPI Payouts with idempotency keys
 * 7. Constant-time HMAC-SHA256 Webhook verification
 */

import crypto from 'crypto';
import { config } from '../config/index.js';

// Honorifics and business stopwords to normalize for beneficiary matching
const BUSINESS_HONORIFICS = new Set([
  'mr', 'mrs', 'ms', 'dr', 'shri', 'smt', 'md',
  'ms', 'm/s', 'enterprises', 'enterprise', 'traders', 'trading',
  'pvt', 'ltd', 'private', 'limited', 'llp', 'inc', 'co', 'company',
  'services', 'service', 'solutions', 'store', 'stores', 'fashion', 'fashions',
  'clothing', 'apparel', 'apparels', 'textiles', 'textile', 'prop', 'proprietor'
]);

/**
 * Validates UPI address format strictly against NPCI standards
 * Format: username@bankhandle (e.g., rahul@okhdfcbank, 9876543210@paytm)
 */
export function validateUpiFormat(vpa) {
  if (!vpa || typeof vpa !== 'string') {
    return { valid: false, message: 'UPI ID is required.' };
  }

  const trimmed = vpa.trim().toLowerCase();
  
  if (trimmed.length < 5 || trimmed.length > 100) {
    return { valid: false, message: 'UPI ID length must be between 5 and 100 characters.' };
  }

  // NPCI VPA regex: user part (alphanumeric, dot, underscore, hyphen) + @ + bank handle
  const vpaRegex = /^[a-zA-Z0-9.\-_]{2,64}@[a-zA-Z][a-zA-Z0-9]{1,32}$/;
  if (!vpaRegex.test(trimmed)) {
    return { valid: false, message: 'Invalid UPI ID format. Expected format: username@bank (e.g., yourname@okhdfcbank).' };
  }

  // Ensure no double dots or consecutive special symbols
  if (/[.\-_]{2,}/.test(trimmed)) {
    return { valid: false, message: 'UPI ID cannot contain consecutive special characters.' };
  }

  return { valid: true, vpa: trimmed };
}

/**
 * Normalizes a name string for tokenized beneficiary matching
 */
export function normalizeNameForMatching(name) {
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

  return {
    normalized: tokens.join(' '),
    tokens
  };
}

/**
 * Conservative Beneficiary Name Matching Engine
 * Compares the seller's registered legal/business name with the bank-registered VPA beneficiary name.
 * 
 * Returns: { match: boolean, isReview: boolean, score: number, reason: string }
 */
export function matchBeneficiaryName(sellerName, registeredBeneficiaryName) {
  if (!registeredBeneficiaryName || typeof registeredBeneficiaryName !== 'string') {
    return {
      match: false,
      isReview: false,
      score: 0,
      reason: 'No beneficiary name returned by UPI provider'
    };
  }

  if (!sellerName || typeof sellerName !== 'string') {
    return {
      match: false,
      isReview: false,
      score: 0,
      reason: 'No registered seller name found on profile'
    };
  }

  const sellerParsed = normalizeNameForMatching(sellerName);
  const regParsed = normalizeNameForMatching(registeredBeneficiaryName);

  // Exact normalized match
  if (sellerParsed.normalized && sellerParsed.normalized === regParsed.normalized) {
    return {
      match: true,
      isReview: false,
      score: 1.0,
      reason: 'Exact name match'
    };
  }

  const sTokens = new Set(sellerParsed.tokens);
  const rTokens = new Set(regParsed.tokens);

  if (sTokens.size === 0 || rTokens.size === 0) {
    return {
      match: false,
      isReview: true,
      score: 0.1,
      reason: 'Insufficient distinct tokens for automated name matching'
    };
  }

  // Check token intersection
  const intersection = [...sTokens].filter(t => rTokens.has(t));
  const union = new Set([...sTokens, ...rTokens]);
  const jaccardScore = intersection.length / union.size;

  // Complete containment: all tokens of seller's name are present in registered name
  // Example: Seller "Rahul Adhikary" vs Registered "Mr Rahul Adhikary"
  const sellerFullyContained = [...sTokens].every(t => rTokens.has(t));
  const regFullyContained = [...rTokens].every(t => sTokens.has(t));

  if (sellerFullyContained || regFullyContained) {
    return {
      match: true,
      isReview: false,
      score: 0.95,
      reason: 'Full token containment match'
    };
  }

  // High Jaccard similarity (e.g. 2 out of 3 tokens match, like First + Last name)
  if (jaccardScore >= 0.70) {
    return {
      match: true,
      isReview: false,
      score: Number(jaccardScore.toFixed(2)),
      reason: `High token overlap similarity (${Math.round(jaccardScore * 100)}%)`
    };
  }

  // Borderline partial overlap: require manual admin review
  if (jaccardScore >= 0.40 || intersection.length >= 1) {
    return {
      match: false,
      isReview: true,
      score: Number(jaccardScore.toFixed(2)),
      reason: `Partial name match (${Math.round(jaccardScore * 100)}%). Flagged for manual review.`
    };
  }

  // Total mismatch
  return {
    match: false,
    isReview: false,
    score: Number(jaccardScore.toFixed(2)),
    reason: `Beneficiary name "${registeredBeneficiaryName}" does not match registered name "${sellerName}"`
  };
}

/**
 * Returns API credentials for RazorpayX
 */
export function getRazorpayXCredentials() {
  const keyId = (process.env.RAZORPAYX_KEY_ID || config.razorpay?.keyId || '').trim();
  const keySecret = (process.env.RAZORPAYX_KEY_SECRET || config.razorpay?.keySecret || '').trim();
  const accountNumber = (process.env.RAZORPAYX_ACCOUNT_NUMBER || config.razorpay?.accountNumber || '').trim();
  const webhookSecret = (process.env.RAZORPAYX_WEBHOOK_SECRET || config.razorpay?.webhookSecret || '').trim();

  return {
    keyId,
    keySecret,
    accountNumber,
    webhookSecret,
    isConfigured: Boolean(keyId && keySecret)
  };
}

/**
 * Internal helper for authenticated RazorpayX API calls
 */
async function callRazorpayApi(endpoint, { method = 'GET', body = null, headers = {} } = {}) {
  const { keyId, keySecret, isConfigured } = getRazorpayXCredentials();
  if (!isConfigured) {
    throw new Error('RazorpayX API keys are not configured in environment.');
  }

  const authHeader = 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64');
  const url = endpoint.startsWith('http') ? endpoint : `https://api.razorpay.com/v1${endpoint}`;

  const fetchOptions = {
    method,
    headers: {
      'Authorization': authHeader,
      'Content-Type': 'application/json',
      ...headers
    }
  };

  if (body) {
    fetchOptions.body = JSON.stringify(body);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000); // 20s timeout
  fetchOptions.signal = controller.signal;

  try {
    const response = await fetch(url, fetchOptions);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const errorMsg = data?.error?.description || data?.message || `Razorpay API error HTTP ${response.status}`;
      const errorObj = new Error(errorMsg);
      errorObj.status = response.status;
      errorObj.data = data;
      throw errorObj;
    }
    return data;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Creates or retrieves a Contact on RazorpayX for a seller
 */
export async function createOrGetContact(seller) {
  const { keyId } = getRazorpayXCredentials();
  if (!keyId) {
    // In mock/test environments
    return { id: `cont_mock_${seller.id.slice(0, 8)}`, name: seller.full_name || seller.owner_name };
  }

  const contactName = (seller.owner_name || seller.full_name || seller.business_name || 'Zebalpha Seller').trim();
  const referenceId = `seller_${seller.id}`;

  try {
    const contact = await callRazorpayApi('/contacts', {
      method: 'POST',
      body: {
        name: contactName,
        email: seller.email || `seller_${seller.id}@seller.zebalpha.shop`,
        contact: seller.phone_number || seller.mobile_number || '9999999999',
        type: 'vendor',
        reference_id: referenceId,
        notes: {
          seller_id: seller.id,
          system: 'Zebalpha Marketplace'
        }
      }
    });
    return contact;
  } catch (err) {
    // If contact with reference_id already exists, search for it
    if (err.data?.error?.description?.includes('already exists') || err.status === 400) {
      try {
        const searchRes = await callRazorpayApi(`/contacts?reference_id=${encodeURIComponent(referenceId)}`);
        if (searchRes.items && searchRes.items.length > 0) {
          return searchRes.items[0];
        }
      } catch {}
    }
    throw err;
  }
}

/**
 * Creates a VPA Fund Account under a RazorpayX Contact
 */
export async function createVpaFundAccount(contactId, vpa) {
  const { keyId } = getRazorpayXCredentials();
  if (!keyId) {
    return { id: `fa_mock_${Date.now()}`, vpa: { address: vpa } };
  }

  const fundAccount = await callRazorpayApi('/fund_accounts', {
    method: 'POST',
    body: {
      contact_id: contactId,
      account_type: 'vpa',
      vpa: {
        address: vpa
      }
    }
  });

  return fundAccount;
}

/**
 * Validates a UPI ID and matches the beneficiary name
 * Uses Razorpay Fund Account Validation or VPA Validate endpoint
 */
export async function validateUpiAccount({ contactId, fundAccountId, vpa, seller }) {
  const { keyId, accountNumber } = getRazorpayXCredentials();
  const sellerLegalName = seller.owner_name || seller.full_name || seller.business_name || '';

  // Mock fallback if keys not provided
  if (!keyId) {
    const match = matchBeneficiaryName(sellerLegalName, sellerLegalName);
    return {
      success: true,
      validationId: `fav_mock_${Date.now()}`,
      accountStatus: 'active',
      beneficiaryName: sellerLegalName,
      matchResult: match,
      verificationStatus: 'verified',
      reason: 'Validation completed (Development Mode)'
    };
  }

  let validationRes = null;
  let beneficiaryName = '';
  let accountActive = false;
  let validationId = null;

  // 1. Attempt Fund Account Validation if account number is configured
  if (fundAccountId && accountNumber) {
    try {
      validationRes = await callRazorpayApi('/fund_accounts/validations', {
        method: 'POST',
        body: {
          account_number: accountNumber,
          fund_account: { id: fundAccountId },
          amount: 100, // 100 paise = 1 INR test micro-deposit verification
          currency: 'INR',
          notes: {
            seller_id: seller.id,
            vpa
          }
        }
      });
      validationId = validationRes.id;
      beneficiaryName = validationRes.results?.registered_name || validationRes.results?.beneficiary_name || '';
      accountActive = validationRes.results?.account_status === 'active' || validationRes.status === 'completed';
    } catch (favErr) {
      console.warn('[RazorpayX FAV Fallback] Fund account validation endpoint failed or not enabled:', favErr.message);
    }
  }

  // 2. Fallback to standard Razorpay VPA validation if FAV didn't return a name
  if (!beneficiaryName) {
    try {
      const vpaRes = await callRazorpayApi(`/payments/validate/vpa?vpa=${encodeURIComponent(vpa)}`);
      validationId = validationId || `vpa_val_${Date.now()}`;
      if (vpaRes.valid) {
        accountActive = true;
        beneficiaryName = vpaRes.customer_name || '';
      } else {
        return {
          success: false,
          validationId,
          accountStatus: 'invalid',
          beneficiaryName: '',
          matchResult: { match: false, isReview: false, score: 0, reason: 'UPI ID does not exist or is inactive' },
          verificationStatus: 'inactive',
          reason: 'UPI ID is not recognized by NPCI banking rails'
        };
      }
    } catch (vpaErr) {
      console.error('[Razorpay VPA Validation Error]:', vpaErr.message);
      return {
        success: false,
        validationId,
        accountStatus: 'failed',
        beneficiaryName: '',
        matchResult: { match: false, isReview: false, score: 0, reason: vpaErr.message },
        verificationStatus: 'failed',
        reason: vpaErr.message || 'Unable to verify UPI ID with banking rails'
      };
    }
  }

  if (!accountActive) {
    return {
      success: false,
      validationId,
      accountStatus: 'inactive',
      beneficiaryName,
      matchResult: { match: false, isReview: false, score: 0, reason: 'UPI Account is inactive' },
      verificationStatus: 'inactive',
      reason: 'UPI Account is inactive or blocked by provider bank'
    };
  }

  // 3. Conservative Beneficiary Name Matching
  const matchResult = matchBeneficiaryName(sellerLegalName, beneficiaryName);

  let verificationStatus = 'verified';
  let reason = 'Beneficiary name verified successfully';

  if (!matchResult.match) {
    if (matchResult.isReview) {
      verificationStatus = 'manual_review';
      reason = matchResult.reason;
    } else {
      verificationStatus = 'name_mismatch';
      reason = matchResult.reason;
    }
  }

  return {
    success: verificationStatus === 'verified',
    validationId,
    accountStatus: 'active',
    beneficiaryName,
    matchResult,
    verificationStatus,
    reason
  };
}

/**
 * Executes a UPI Payout via RazorpayX
 */
export async function executeUpiPayout({
  sellerId,
  amountPaise,
  fundAccountId,
  referenceId,
  idempotencyKey,
  narration = 'Zebalpha Payout'
}) {
  const { keyId, accountNumber, isConfigured } = getRazorpayXCredentials();

  if (!isConfigured) {
    return {
      id: `pout_mock_${Date.now()}`,
      entity: 'payout',
      fund_account_id: fundAccountId,
      amount: amountPaise,
      currency: 'INR',
      status: 'processed',
      utr: `UTR${Date.now()}`,
      reference_id: referenceId
    };
  }

  if (!accountNumber) {
    throw new Error('RazorpayX debit account number is missing in configuration.');
  }

  const payoutPayload = {
    account_number: accountNumber,
    fund_account_id: fundAccountId,
    amount: amountPaise,
    currency: 'INR',
    mode: 'UPI',
    purpose: 'payout',
    reference_id: referenceId,
    narration: narration.slice(0, 30),
    notes: {
      seller_id: sellerId,
      idempotency_key: idempotencyKey,
      system: 'Zebalpha Settlement Engine'
    }
  };

  const payout = await callRazorpayApi('/payouts', {
    method: 'POST',
    headers: {
      'X-Payout-Idempotency': idempotencyKey
    },
    body: payoutPayload
  });

  return payout;
}

/**
 * Validates incoming RazorpayX webhook signature using constant-time comparison
 */
export function verifyWebhookSignature(rawBody, signature, secret) {
  if (!rawBody || !signature || !secret) {
    return false;
  }

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');

  const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
  const signatureBuffer = Buffer.from(signature, 'utf8');

  if (expectedBuffer.length !== signatureBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, signatureBuffer);
}
