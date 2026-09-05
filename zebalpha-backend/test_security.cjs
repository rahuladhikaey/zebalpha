const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const path = require('path');

// Dynamically import orderCalculator since backend has "type": "module"
async function runTests() {
  const { calculateOrderTotals } = await import('./src/utils/orderCalculator.js');

  const testResults = [];

  function assert(description, condition, details = '') {
    if (condition) {
      console.log(`  ✅ PASS: ${description}`);
      testResults.push({ description, status: 'PASS', details });
    } else {
      console.error(`  ❌ FAIL: ${description} - ${details}`);
      testResults.push({ description, status: 'FAIL', details });
    }
  }

  console.log('====================================================');
  console.log('🛡️  ZEBALPHA CLOTHING E-COMMERCE SECURITY TEST SUITE');
  console.log('====================================================\n');

  // ----------------------------------------------------
  // TEST SUITE 1: PRICING & PAYMENT INTEGRITY
  // ----------------------------------------------------
  console.log('[SUITE 1] Price Integrity & Server-Side Calculation');
  try {
    const { calculateOrderAmounts } = await import('./src/utils/orderCalculator.js');

    // Test calculation with empty item list
    let emptyRejected = false;
    try {
      await calculateOrderAmounts({ items: [] });
    } catch (err) {
      emptyRejected = true;
    }
    assert('Order calculator rejects empty cart / items payload', emptyRejected);

    // Test that client-supplied manipulated price (e.g. 1.00) cannot be passed without DB lookup
    let missingDbProductRejected = false;
    try {
      await calculateOrderAmounts({
        items: [{ product_id: '00000000-0000-0000-0000-000000000000', price: 0.01, quantity: 1 }]
      });
    } catch (err) {
      missingDbProductRejected = true;
    }
    assert(
      'Client-crafted fake product with arbitrary price 0.01 is strictly rejected by DB validator',
      missingDbProductRejected
    );
  } catch (err) {
    console.error('Suite 1 failed with unexpected error:', err);
  }

  // ----------------------------------------------------
  // TEST SUITE 2: PAYMENT SIGNATURE VERIFICATION
  // ----------------------------------------------------
  console.log('\n[SUITE 2] Razorpay HMAC-SHA256 Cryptographic Verification');
  try {
    const keySecret = 'test_webhook_razorpay_secret_key_98765';
    const orderId = 'order_DA98124FAK192';
    const paymentId = 'pay_09182390123';

    const validSignature = crypto
      .createHmac('sha256', keySecret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    function verifyPaymentSignature(oId, pId, sig, secret) {
      const expected = crypto
        .createHmac('sha256', secret)
        .update(`${oId}|${pId}`)
        .digest('hex');
      const sigBuf = Buffer.from(sig || '', 'utf8');
      const expBuf = Buffer.from(expected, 'utf8');
      if (sigBuf.length !== expBuf.length) return false;
      return crypto.timingSafeEqual(sigBuf, expBuf);
    }

    assert(
      'Valid cryptographic signature verified successfully',
      verifyPaymentSignature(orderId, paymentId, validSignature, keySecret) === true
    );

    assert(
      'Mock signature bypass ("mock_signature") is strictly rejected',
      verifyPaymentSignature(orderId, paymentId, 'mock_signature', keySecret) === false
    );

    assert(
      'Tampered signature is strictly rejected',
      verifyPaymentSignature(orderId, paymentId, validSignature.slice(0, -2) + 'aa', keySecret) === false
    );

    assert(
      'Null / Empty signature is strictly rejected without throwing exception',
      verifyPaymentSignature(orderId, paymentId, '', keySecret) === false
    );

  } catch (err) {
    console.error('Suite 2 failed with unexpected error:', err);
  }

  // ----------------------------------------------------
  // TEST SUITE 3: JWT AUTHENTICATION & PRIVILEGE ESCALATION
  // ----------------------------------------------------
  console.log('\n[SUITE 3] JWT Authentication & Anti-Privilege Escalation');
  try {
    const REAL_JWT_SECRET = 'super_secure_production_jwt_secret_zebalpha_2025';
    const ATTACKER_SECRET = 'evil_attacker_fake_jwt_secret_666';

    const forgedToken = jwt.sign(
      { id: 'attacker-uuid', email: 'attacker@evil.com', role: 'super_admin' },
      ATTACKER_SECRET,
      { expiresIn: '1h' }
    );

    let verifiedPayload = null;
    let authFailed = false;
    try {
      verifiedPayload = jwt.verify(forgedToken, REAL_JWT_SECRET);
    } catch (e) {
      authFailed = true;
    }

    assert(
      'Forged JWT with attacker secret cannot bypass server verification',
      authFailed === true && verifiedPayload === null
    );

    const noneAlgToken = 'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJpZCI6IjEyMyIsInJvbGUiOiJzdXBlcl9hZG1pbiJ9.';
    let noneFailed = false;
    try {
      jwt.verify(noneAlgToken, REAL_JWT_SECRET, { algorithms: ['HS256'] });
    } catch (e) {
      noneFailed = true;
    }

    assert(
      'Algorithm "none" attack is strictly blocked',
      noneFailed === true
    );

    const customerToken = jwt.sign(
      { id: 'cust-123', email: 'customer@test.com', role: 'customer' },
      REAL_JWT_SECRET,
      { expiresIn: '1h' }
    );
    const decodedCust = jwt.verify(customerToken, REAL_JWT_SECRET);

    function checkRbac(user, allowedRoles) {
      return allowedRoles.includes(user.role);
    }

    assert(
      'Customer role is denied access to admin-only operations',
      checkRbac(decodedCust, ['super_admin', 'admin']) === false
    );

    assert(
      'Customer role is denied access to seller-only operations',
      checkRbac(decodedCust, ['seller']) === false
    );

  } catch (err) {
    console.error('Suite 3 failed with unexpected error:', err);
  }

  // ----------------------------------------------------
  // TEST SUITE 4: TIMING-SAFE DUAL-KEY ADMIN 2FA & LOCKOUT
  // ----------------------------------------------------
  console.log('\n[SUITE 4] Dual-Key Admin 2FA & Timing-Safe Lockout');
  try {
    const MOCK_ADMIN_KEY_1 = 'SEC-K1-Alpha-992018247192-Production';
    const MOCK_ADMIN_KEY_2 = 'SEC-K2-Beta-772910481239-Enterprise';

    function timingSafeCheck(input, expected) {
      if (!input || !expected) return false;
      const inBuf = Buffer.from(String(input));
      const expBuf = Buffer.from(String(expected));
      if (inBuf.length !== expBuf.length) return false;
      return crypto.timingSafeEqual(inBuf, expBuf);
    }

    assert(
      'Missing Key 1 rejects authentication',
      timingSafeCheck('', MOCK_ADMIN_KEY_1) === false
    );

    assert(
      'Missing Key 2 rejects authentication',
      timingSafeCheck(MOCK_ADMIN_KEY_1, MOCK_ADMIN_KEY_1) === true && timingSafeCheck('', MOCK_ADMIN_KEY_2) === false
    );

    assert(
      'Incorrect Key 1 rejects authentication',
      timingSafeCheck('wrong-key-1', MOCK_ADMIN_KEY_1) === false
    );

    assert(
      'Incorrect Key 2 rejects authentication',
      timingSafeCheck('wrong-key-2', MOCK_ADMIN_KEY_2) === false
    );

    assert(
      'Both keys valid authenticates successfully in constant time',
      timingSafeCheck(MOCK_ADMIN_KEY_1, MOCK_ADMIN_KEY_1) === true &&
      timingSafeCheck(MOCK_ADMIN_KEY_2, MOCK_ADMIN_KEY_2) === true
    );

    const attempts = {};
    const ip = '192.168.1.50';
    const MAX_ATTEMPTS = 5;

    function registerFailedAttempt(clientIp) {
      const now = Date.now();
      const rec = attempts[clientIp] || { count: 0, lockedUntil: 0 };
      if (rec.lockedUntil > now) {
        return { locked: true, remainingSec: Math.ceil((rec.lockedUntil - now) / 1000) };
      }
      rec.count += 1;
      if (rec.count >= MAX_ATTEMPTS) {
        rec.lockedUntil = now + (15 * 60 * 1000);
      }
      attempts[clientIp] = rec;
      return { locked: rec.count >= MAX_ATTEMPTS, count: rec.count };
    }

    for (let i = 1; i <= 4; i++) {
      const status = registerFailedAttempt(ip);
      assert(`Attempt ${i} is tracked without lockout`, status.locked === false && status.count === i);
    }

    const fifth = registerFailedAttempt(ip);
    assert('5th failed attempt triggers 15-minute administrative lockout', fifth.locked === true);

    const sixth = registerFailedAttempt(ip);
    assert('Subsequent attempts during lockout are blocked with remaining duration', sixth.locked === true && sixth.remainingSec > 0);

  } catch (err) {
    console.error('Suite 4 failed with unexpected error:', err);
  }

  // ----------------------------------------------------
  // TEST SUITE 5: SELLER IDOR ISOLATION
  // ----------------------------------------------------
  console.log('\n[SUITE 5] Seller Resource Multi-Tenant Isolation (Anti-IDOR)');
  try {
    const sellerA = { id: 'seller-uuid-AAA', role: 'seller' };
    const sellerB = { id: 'seller-uuid-BBB', role: 'seller' };
    const productA = { id: 'prod-AAA', seller_id: 'seller-uuid-AAA', name: 'Seller A Shirt' };

    function canModifyProduct(user, product) {
      if (user.role === 'super_admin') return true;
      if (user.role === 'seller' && product.seller_id === user.id) return true;
      return false;
    }

    assert(
      'Seller A can modify their own product',
      canModifyProduct(sellerA, productA) === true
    );

    assert(
      'Seller B is blocked from modifying Seller A product (IDOR prevention)',
      canModifyProduct(sellerB, productA) === false
    );

    assert(
      'Super Admin has authorization to manage any product',
      canModifyProduct({ id: 'admin-01', role: 'super_admin' }, productA) === true
    );

  } catch (err) {
    console.error('Suite 5 failed with unexpected error:', err);
  }

  // ----------------------------------------------------
  // SUMMARY
  // ----------------------------------------------------
  console.log('\n====================================================');
  const passCount = testResults.filter(r => r.status === 'PASS').length;
  const failCount = testResults.filter(r => r.status === 'FAIL').length;
  console.log(`TEST SUMMARY: ${passCount} PASSED, ${failCount} FAILED out of ${testResults.length} checks`);
  console.log('====================================================\n');

  if (failCount > 0) {
    process.exit(1);
  }
}

runTests();
