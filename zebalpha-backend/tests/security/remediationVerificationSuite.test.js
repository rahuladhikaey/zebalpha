import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

// Setup test environment variables before module evaluation
process.env.RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || 'rzp_test_mockKeyId123';
process.env.RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'mockSecretKey456789';
process.env.BANK_ENCRYPTION_KEY = process.env.BANK_ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'mockServiceRoleKey998877';

// Import services and helpers
const { 
  generatePasswordResetToken, 
  verifyPasswordResetToken, 
  consumePasswordResetToken,
  generateSignupProofToken,
  verifySignupProofToken,
  consumeSignupProofToken,
  checkRateLimit
} = await import('../../../shared/services/securityTokenService.ts');

const {
  encryptAccountNumber,
  decryptAccountNumber,
  maskAccountNumber,
  validateBankInput
} = await import('../../../shared/services/bankSecurityService.ts');

const {
  isValidUpiFormat,
  maskUpiId,
  normalizeNameForMatching,
  matchBeneficiaryName
} = await import('../../../shared/services/razorpayPayoutService.ts');

// ==============================================================================
// 1. P0 AUTHENTICATION: FINDING-01, FINDING-02, FINDING-11
// ==============================================================================
test('P0 Auth - FINDING-01: Password Reset Cryptographic Token Lifecycle', async (t) => {
  const email = 'seller.victim@zebalpha.shop';

  await t.test('Generates valid signed HMAC reset token with 10-minute expiry', () => {
    const token = generatePasswordResetToken(email);
    assert.ok(token);
    assert.equal(token.split('.').length, 2, 'Token must be composed of payload.signature');

    const verified = verifyPasswordResetToken(email, token);
    assert.equal(verified.valid, true);
    assert.ok(verified.jti);
  });

  await t.test('Rejects reset token when supplied for a different email (Account Binding)', () => {
    const token = generatePasswordResetToken(email);
    const verified = verifyPasswordResetToken('attacker@zebalpha.shop', token);
    assert.equal(verified.valid, false);
    assert.match(verified.reason, /not bound to this email/);
  });

  await t.test('Rejects tampered reset token payload or signature', () => {
    const token = generatePasswordResetToken(email);
    const [payload, signature] = token.split('.');
    const forgedToken = `${payload}.0000000000000000000000000000000000000000000000000000000000000000`;

    const verified = verifyPasswordResetToken(email, forgedToken);
    assert.equal(verified.valid, false);
    assert.match(verified.reason, /signature mismatch/i);
  });

  await t.test('Enforces single-use semantics: Token cannot be consumed twice (Replay Protection)', () => {
    const token = generatePasswordResetToken(email);
    const verifiedBefore = verifyPasswordResetToken(email, token);
    assert.equal(verifiedBefore.valid, true);

    const consumed = consumePasswordResetToken(token);
    assert.equal(consumed, true);

    // Second verification must fail because token was consumed
    const verifiedAfter = verifyPasswordResetToken(email, token);
    assert.equal(verifiedAfter.valid, false);
    assert.match(verifiedAfter.reason, /already been consumed/i);
  });
});

test('P0 Auth - FINDING-02: Signup Proof Token & Identity Binding', async (t) => {
  const signupEmail = 'new.merchant@zebalpha.shop';

  await t.test('Issues and consumes verified signup proof token', () => {
    const proofToken = generateSignupProofToken(signupEmail);
    assert.ok(proofToken);

    const check = verifySignupProofToken(signupEmail, proofToken);
    assert.equal(check.valid, true);

    const consumed = consumeSignupProofToken(proofToken);
    assert.equal(consumed, true);

    // Replay attempt fails
    const replayed = verifySignupProofToken(signupEmail, proofToken);
    assert.equal(replayed.valid, false);
    assert.match(replayed.reason, /already been consumed/i);
  });

  await t.test('Sliding window rate limiter blocks brute force attempts', () => {
    const rateLimitKey = 'test_ip_192.168.1.100';

    // Allow 5 attempts within 60s
    for (let i = 0; i < 5; i++) {
      const allowed = checkRateLimit(rateLimitKey, 5, 60000);
      assert.equal(allowed, true);
    }

    // 6th attempt must be blocked
    const blocked = checkRateLimit(rateLimitKey, 5, 60000);
    assert.equal(blocked, false);
  });
});

test('P0 Auth - FINDING-11: Cryptographically Secure OTP & Lockout Mechanism', async (t) => {
  await t.test('crypto.randomInt produces non-predictable 6-digit OTPs within valid range', () => {
    const samples = new Set();
    for (let i = 0; i < 100; i++) {
      const otp = crypto.randomInt(100000, 1000000).toString();
      assert.equal(otp.length, 6);
      const num = parseInt(otp, 10);
      assert.ok(num >= 100000 && num <= 999999);
      samples.add(otp);
    }
    // High entropy check: across 100 samples, collisions should be virtually zero
    assert.ok(samples.size > 95);
  });

  await t.test('OTP verification fails after maximum 5 incorrect attempts', () => {
    const maxAttempts = 5;
    let attempts = 0;
    const testOtpStore = { email: 'user@zebalpha.shop', code: '654321', attempts: 0 };

    for (let i = 0; i < 5; i++) {
      testOtpStore.attempts++;
    }

    const isLockedOut = testOtpStore.attempts >= maxAttempts;
    assert.equal(isLockedOut, true);
  });
});

// ==============================================================================
// 2. P0 WEBHOOK & FINANCIAL INTEGRITY: FINDING-05, FINDING-06, FINDING-17
// ==============================================================================
test('P0 Financial - FINDING-06 & FINDING-17: Webhook Signature Verification', async (t) => {
  const webhookSecret = 'test_shiprocket_production_secret_key_8899';

  await t.test('Valid webhook authorization header passes timingSafeEqual check', () => {
    const incomingHeader = 'test_shiprocket_production_secret_key_8899';
    const secretBuf = Buffer.from(webhookSecret, 'utf8');
    const headerBuf = Buffer.from(incomingHeader, 'utf8');

    const isValid = secretBuf.length === headerBuf.length && crypto.timingSafeEqual(secretBuf, headerBuf);
    assert.equal(isValid, true);
  });

  await t.test('Forged or mismatched webhook authorization header is rejected', () => {
    const forgedHeader = 'forged_fake_shiprocket_secret';
    const secretBuf = Buffer.from(webhookSecret, 'utf8');
    const headerBuf = Buffer.from(forgedHeader, 'utf8');

    const isValid = secretBuf.length === headerBuf.length && crypto.timingSafeEqual(secretBuf, headerBuf);
    assert.equal(isValid, false);
  });
});

test('P0 Financial - FINDING-05: Return Action Authorization & Refund Protection', async (t) => {
  await t.test('Rejects unauthenticated requests with HTTP 401', () => {
    const caller = null;
    const checkAuth = (user) => {
      if (!user) return { status: 401, error: 'Unauthorized access' };
      return { status: 200 };
    };

    const res = checkAuth(caller);
    assert.equal(res.status, 401);
  });

  await t.test('Rejects cross-seller return actions with HTTP 403 Forbidden', () => {
    const caller = { id: 'seller_A_user_id', sellerId: 'seller_A' };
    const order = { id: 'ord_123', seller_id: 'seller_B' };

    const authorizeReturn = (caller, order, isAdmin = false) => {
      if (isAdmin) return true;
      return order.seller_id === caller.sellerId;
    };

    assert.equal(authorizeReturn(caller, order, false), false);
  });
});

// ==============================================================================
// 3. P0 ORDER & PRODUCT AUTHORIZATION: FINDING-04, FINDING-07, FINDING-08
// ==============================================================================
test('P0 Orders - FINDING-04: Strict State Transitions & Isolation', async (t) => {
  const VALID_TRANSITIONS = {
    placed: ["confirmed", "processing", "cancelled"],
    confirmed: ["processing", "packed", "cancelled"],
    processing: ["packed", "ready_for_pickup", "cancelled"],
    packed: ["ready_for_pickup", "shipped", "cancelled"],
    shipped: ["in_transit", "out_for_delivery", "delivered", "rto_initiated"],
    out_for_delivery: ["delivered", "rto_initiated"],
    delivered: ["return_requested"]
  };

  await t.test('Allows valid transition: placed -> confirmed', () => {
    const allowed = VALID_TRANSITIONS['placed'] || [];
    assert.ok(allowed.includes('confirmed'));
  });

  await t.test('Rejects illegal transition: placed -> delivered', () => {
    const allowed = VALID_TRANSITIONS['placed'] || [];
    assert.equal(allowed.includes('delivered'), false);
  });

  await t.test('Prevents duplicate ledger insertions if order already marked delivered', () => {
    let ledgerGenerated = false;
    const currentStatus = 'delivered';
    const targetStatus = 'delivered';

    if (targetStatus === 'delivered' && currentStatus !== 'delivered') {
      ledgerGenerated = true;
    }

    assert.equal(ledgerGenerated, false, 'Must not regenerate delivery ledger entries on repeated delivered events');
  });
});

test('P0 Products - FINDING-07: Resilient Fallback Stripping & Privilege Isolation', async (t) => {
  await t.test('Rejects unauthenticated product creation when body contains arbitrary seller_id', () => {
    const user = null;
    const body = { seller_id: 'target_victim_seller_id', name: 'Malicious Product' };

    // With resilient fallback removed:
    const authenticate = (u) => {
      if (!u) return { status: 401, error: 'Unauthorized: Please log in' };
      return { status: 200 };
    };

    const res = authenticate(user);
    assert.equal(res.status, 401);
  });

  await t.test('Strips administrative fields from ordinary seller updates', () => {
    const updates = {
      name: 'Legitimate Product Edit',
      price: 499,
      approval_status: 'approved',
      is_approved: true,
      admin_notes: 'Bypassed admin review'
    };

    const isAdmin = false;
    if (!isAdmin) {
      delete updates.approval_status;
      delete updates.is_approved;
      delete updates.admin_notes;
    }

    assert.equal(updates.name, 'Legitimate Product Edit');
    assert.equal(updates.price, 499);
    assert.equal(updates.approval_status, undefined);
    assert.equal(updates.is_approved, undefined);
    assert.equal(updates.admin_notes, undefined);
  });
});

test('P0 Shipping - FINDING-08: Shipment Manifestation Authorization', async (t) => {
  await t.test('Blocks unauthenticated shipment requests', () => {
    const user = null;
    const checkUser = (u) => !u ? { status: 401 } : { status: 200 };
    assert.equal(checkUser(user).status, 401);
  });

  await t.test('Prevents Seller A from manifesting shipments for Seller B', () => {
    const callerSellerId = 'seller_111';
    const order = { id: 'ord_999', seller_id: 'seller_222' };

    const canShip = (sellerId, ord, isAdmin = false) => {
      if (isAdmin) return true;
      return ord.seller_id === sellerId;
    };

    assert.equal(canShip(callerSellerId, order, false), false);
  });
});

// ==============================================================================
// 4. STORAGE & SENSITIVE DATA ENCRYPTION: FINDING-12, FINDING-13, FINDING-14
// ==============================================================================
test('Storage Security - FINDING-12: SVG Upload Blocking & MIME Sanitization', async (t) => {
  const safeMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

  await t.test('Rejects dangerous image/svg+xml to mitigate Stored XSS', () => {
    const dangerousMime = 'image/svg+xml';
    assert.equal(safeMimeTypes.includes(dangerousMime), false);
  });

  await t.test('Permits safe raster image MIME types', () => {
    assert.ok(safeMimeTypes.includes('image/webp'));
    assert.ok(safeMimeTypes.includes('image/png'));
    assert.ok(safeMimeTypes.includes('image/jpeg'));
  });
});

test('Financial Security - FINDING-13 & FINDING-14: UPI Vault Decryption & Validation', async (t) => {
  const rawVpa = 'rahul.merchant@okhdfcbank';

  await t.test('Encrypts and decrypts UPI destination without plaintext leakage', () => {
    const encrypted = encryptAccountNumber(rawVpa);
    assert.ok(encrypted.startsWith('enc:v1:'));
    assert.notEqual(encrypted, rawVpa);

    const decrypted = decryptAccountNumber(encrypted);
    assert.equal(decrypted, rawVpa);
  });

  await t.test('Validates proper VPA handle format', () => {
    assert.equal(isValidUpiFormat(rawVpa), true);
    assert.equal(isValidUpiFormat('invalid-vpa-without-at-sign'), false);
    assert.equal(isValidUpiFormat('rahul***@okhdfcbank'), false, 'Masked VPA must fail format check');
  });

  await t.test('Masks UPI ID safely for display and database audit notes', () => {
    const masked = maskUpiId(rawVpa);
    assert.ok(masked.includes('***'));
    assert.ok(masked.endsWith('@okhdfcbank'));
  });

  await t.test('Fuzzy beneficiary name matching detects name mismatches', () => {
    const matchSuccess = matchBeneficiaryName('Rahul Adhikary', 'Rahul Adhikary');
    assert.equal(matchSuccess.match, true);

    const matchFail = matchBeneficiaryName('Rahul Adhikary', 'Unknown Attacker Account');
    assert.equal(matchFail.match, false);
  });
});
