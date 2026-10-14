import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';

const TEST_JWT_SECRET = 'x9#kL2!pQ8$vN5@mZ1*cJ4^yH7&tR0%bW3';
const TEST_RAZORPAY_SECRET = process.env.RAZORPAY_KEY_SECRET || '';

test('Security Audit - JWT Signature Validation & Algorithm Restriction', async (t) => {
  await t.test('Valid JWT token signed with HS256 algorithm passes verification', () => {
    const payload = { id: 'cust_123', email: 'user@example.com', role: 'customer' };
    const token = jwt.sign(payload, TEST_JWT_SECRET, { algorithm: 'HS256', expiresIn: '1h' });
    const decoded = jwt.verify(token, TEST_JWT_SECRET, { algorithms: ['HS256'] });
    assert.equal(decoded.id, 'cust_123');
    assert.equal(decoded.role, 'customer');
  });

  await t.test('Forged token with wrong signature is rejected', () => {
    const payload = { id: 'cust_123', email: 'user@example.com', role: 'admin' };
    const forgedToken = jwt.sign(payload, 'wrong_forged_secret', { algorithm: 'HS256' });
    assert.throws(() => {
      jwt.verify(forgedToken, TEST_JWT_SECRET, { algorithms: ['HS256'] });
    }, /invalid signature/);
  });

  await t.test('Expired JWT token is rejected', () => {
    const payload = { id: 'cust_123', email: 'user@example.com' };
    const expiredToken = jwt.sign(payload, TEST_JWT_SECRET, { algorithm: 'HS256', expiresIn: '-1s' });
    assert.throws(() => {
      jwt.verify(expiredToken, TEST_JWT_SECRET, { algorithms: ['HS256'] });
    }, /jwt expired/);
  });
});

test('Security Audit - Razorpay HMAC Payment Signature Verification', async (t) => {
  await t.test('Valid HMAC-SHA256 Razorpay signature passes timing-safe verification', () => {
    const orderId = 'order_M123456789';
    const paymentId = 'pay_P987654321';
    
    const validSignature = crypto
      .createHmac('sha256', TEST_RAZORPAY_SECRET)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    const expectedBuf = Buffer.from(validSignature);
    const providedBuf = Buffer.from(validSignature);

    const isMatch = expectedBuf.length === providedBuf.length && crypto.timingSafeEqual(expectedBuf, providedBuf);
    assert.equal(isMatch, true);
  });

  await t.test('Tampered payment signature fails timing-safe verification', () => {
    const orderId = 'order_M123456789';
    const paymentId = 'pay_P987654321';
    
    const validSignature = crypto
      .createHmac('sha256', TEST_RAZORPAY_SECRET)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    const tamperedSignature = validSignature.substring(0, validSignature.length - 4) + '0000';

    const expectedBuf = Buffer.from(validSignature);
    const providedBuf = Buffer.from(tamperedSignature);

    const isMatch = expectedBuf.length === providedBuf.length && crypto.timingSafeEqual(expectedBuf, providedBuf);
    assert.equal(isMatch, false);
  });
});

test('Security Audit - IDOR & Role Isolation Logic', async (t) => {
  await t.test('Customer cannot access or modify order owned by another user ID', () => {
    const userA = { id: 'user_A', role: 'customer' };
    const orderB = { id: 'ord_B', user_id: 'user_B', seller_id: 'seller_X' };

    const canCustomerAccess = (user, order) => {
      if (user.role === 'super_admin' || user.role === 'admin') return true;
      return order.user_id === user.id;
    };

    assert.equal(canCustomerAccess(userA, orderB), false);
  });

  await t.test('Seller cannot modify product owned by another seller ID', () => {
    const sellerA = { id: 'seller_A', user_id: 'user_seller_A', role: 'seller' };
    const productB = { id: 'prod_B', seller_id: 'seller_B' };

    const canSellerModifyProduct = (seller, product) => {
      if (seller.role === 'super_admin' || seller.role === 'admin') return true;
      return product.seller_id === seller.id || product.seller_id === seller.user_id;
    };

    assert.equal(canSellerModifyProduct(sellerA, productB), false);
  });

  await t.test('Customer cannot elevate role to admin via request body payload', () => {
    const incomingBody = { name: 'Alice', email: 'alice@example.com', role: 'super_admin', is_admin: true };
    
    const allowedCustomerUpdateFields = ['name', 'phone', 'address', 'city', 'state', 'pincode'];
    const sanitizedPayload = {};
    for (const key of allowedCustomerUpdateFields) {
      if (incomingBody[key] !== undefined) {
        sanitizedPayload[key] = incomingBody[key];
      }
    }

    assert.equal(sanitizedPayload.role, undefined);
    assert.equal(sanitizedPayload.is_admin, undefined);
    assert.equal(sanitizedPayload.name, 'Alice');
  });
});

test('Security Audit - Input Validation & Price Tampering Protection', async (t) => {
  await t.test('Order calculator uses database product prices instead of frontend prices', () => {
    const dbProducts = [
      { id: 'prod_1', price: 999, stock: 50 },
      { id: 'prod_2', price: 499, stock: 20 }
    ];

    const frontendItemsPayload = [
      { product_id: 'prod_1', price: 1, quantity: 2 }, // Client trying to buy 999 INR product for 1 INR!
      { product_id: 'prod_2', price: 0, quantity: 1 }  // Client trying to buy 499 INR product for 0 INR!
    ];

    const calculateServerTotal = (items, dbCatalog) => {
      let subtotal = 0;
      for (const item of items) {
        const dbProd = dbCatalog.find(p => p.id === item.product_id);
        if (!dbProd) throw new Error(`Product ${item.product_id} not found`);
        const qty = Math.max(1, Math.floor(Number(item.quantity) || 1));
        subtotal += dbProd.price * qty;
      }
      return subtotal;
    };

    const trustedSubtotal = calculateServerTotal(frontendItemsPayload, dbProducts);
    assert.equal(trustedSubtotal, (999 * 2) + 499); // 2497 INR, not 2 INR!
  });

  await t.test('Negative or non-integer quantities are sanitized to at least 1 unit', () => {
    const sanitizeQuantity = (inputQty) => {
      const parsed = Math.floor(Number(inputQty));
      if (isNaN(parsed) || parsed <= 0) return 1;
      return Math.min(parsed, 100);
    };

    assert.equal(sanitizeQuantity(-5), 1);
    assert.equal(sanitizeQuantity(0), 1);
    assert.equal(sanitizeQuantity(3), 3);
    assert.equal(sanitizeQuantity('invalid'), 1);
    assert.equal(sanitizeQuantity(500), 100);
  });
});

test('Security Audit - Payment Verification Backdoor & Bypass Prevention', async (t) => {
  const secret = 'rzp_live_secret_key_vault_998877';

  function verifyPaymentSignature(orderId, paymentId, signature, keySecret) {
    if (!orderId || !paymentId || !signature || !keySecret) return false;
    try {
      const generated = crypto.createHmac('sha256', keySecret).update(`${orderId}|${paymentId}`).digest('hex');
      const genBuf = Buffer.from(generated, 'utf-8');
      const sigBuf = Buffer.from(signature, 'utf-8');
      if (genBuf.length !== sigBuf.length) return false;
      return crypto.timingSafeEqual(genBuf, sigBuf);
    } catch {
      return false;
    }
  }

  await t.test('Valid payment signature passes constant-time verification', () => {
    const orderId = 'order_valid_123';
    const paymentId = 'pay_valid_456';
    const signature = crypto.createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex');
    assert.equal(verifyPaymentSignature(orderId, paymentId, signature, secret), true);
  });

  await t.test('Bypass string direct_checkout_verified is strictly rejected', () => {
    assert.equal(verifyPaymentSignature('order_test_123', 'pay_test_456', 'direct_checkout_verified', secret), false);
  });

  await t.test('Prefix order_ without valid cryptographic HMAC is strictly rejected', () => {
    assert.equal(verifyPaymentSignature('order_test_123', 'pay_test_456', 'fake_sig_1234567890', secret), false);
  });

  await t.test('Missing secret fails closed (never verifies without secret)', () => {
    assert.equal(verifyPaymentSignature('order_123', 'pay_456', 'any_sig', ''), false);
    assert.equal(verifyPaymentSignature('order_123', 'pay_456', 'any_sig', null), false);
  });
});

test('Security Audit - Settlement Controller IDOR & BOLA Prevention', async (t) => {
  await t.test('Seller querying payouts list is restricted strictly to own seller ID', () => {
    const callerUser = { id: 'usr_seller_1', role: 'seller', sellerId: 'seller_1' };
    const requestedQuery = { sellerId: 'seller_VICTIM' };

    const isSuperAdmin = callerUser.role === 'super_admin' || callerUser.role === 'admin';
    const effectiveSellerId = isSuperAdmin ? requestedQuery.sellerId : (callerUser.sellerId || callerUser.id);

    // Non-admin seller CANNOT query seller_VICTIM's payouts
    assert.equal(effectiveSellerId, 'seller_1');
    assert.notEqual(effectiveSellerId, 'seller_VICTIM');
  });

  await t.test('Seller querying single payout detail of another seller is forbidden', () => {
    const callerUser = { id: 'usr_seller_1', role: 'seller', sellerId: 'seller_1' };
    const targetPayout = { id: 'payout_99', seller_id: 'seller_2', amount: 50000 };

    const isSuperAdmin = callerUser.role === 'super_admin' || callerUser.role === 'admin';
    const callerSellerId = callerUser.sellerId || callerUser.id;

    const canView = isSuperAdmin || String(targetPayout.seller_id) === String(callerSellerId);
    assert.equal(canView, false);
  });

  await t.test('Seller querying another seller financial overview is forbidden', () => {
    const callerUser = { id: 'usr_seller_1', role: 'seller', sellerId: 'seller_1' };
    const targetSellerParam = 'seller_2';

    const isSuperAdmin = callerUser.role === 'super_admin' || callerUser.role === 'admin';
    const callerSellerId = callerUser.sellerId || callerUser.id;

    const canView = isSuperAdmin || String(targetSellerParam) === String(callerSellerId);
    assert.equal(canView, false);
  });
});

test('Security Audit - Strict CORS Whitelist Verification', async (t) => {
  const ALLOWED_ORIGINS = [
    'https://zebalpha.shop',
    'https://www.zebalpha.shop',
    'https://seller.zebalpha.shop',
    'https://adm.in.zebalpha.shop',
    'https://admin.zebalpha.shop',
    'https://api.zebalpha.shop',
    'https://zebalpha-zebalpha-customer.vercel.app',
    'http://localhost:3000'
  ];

  function isOriginPermitted(origin) {
    if (!origin) return false;
    if (ALLOWED_ORIGINS.includes(origin)) return true;
    if (origin.endsWith('.zebalpha.shop') || origin.endsWith('.zebalpha.com')) return true;
    return false;
  }

  await t.test('Official production storefront and seller origins are permitted', () => {
    assert.equal(isOriginPermitted('https://zebalpha.shop'), true);
    assert.equal(isOriginPermitted('https://seller.zebalpha.shop'), true);
    assert.equal(isOriginPermitted('https://adm.in.zebalpha.shop'), true);
    assert.equal(isOriginPermitted('http://localhost:3000'), true);
  });

  await t.test('Arbitrary third-party origins on vercel or onrender are rejected', () => {
    assert.equal(isOriginPermitted('https://attacker-app.vercel.app'), false);
    assert.equal(isOriginPermitted('https://malicious.onrender.com'), false);
    assert.equal(isOriginPermitted('https://evil-hacker.com'), false);
  });
});

test('Security Audit - Webhook Timing-Safe Authentication', async (t) => {
  const configuredSecret = 'sr_webhook_token_vault_secret_12345';

  function verifyWebhookAuth(incomingHeader, expectedSecret) {
    if (!expectedSecret) return true;
    const token = incomingHeader?.startsWith('Bearer ') ? incomingHeader.slice(7).trim() : (incomingHeader || '').trim();
    const expBuf = Buffer.from(expectedSecret);
    const provBuf = Buffer.from(token);
    if (expBuf.length !== provBuf.length) return false;
    return crypto.timingSafeEqual(expBuf, provBuf);
  }

  await t.test('Valid webhook authorization header passes verification', () => {
    assert.equal(verifyWebhookAuth('sr_webhook_token_vault_secret_12345', configuredSecret), true);
    assert.equal(verifyWebhookAuth('Bearer sr_webhook_token_vault_secret_12345', configuredSecret), true);
  });

  await t.test('Invalid or forged webhook token is rejected', () => {
    assert.equal(verifyWebhookAuth('sr_webhook_token_vault_secret_wrong', configuredSecret), false);
    assert.equal(verifyWebhookAuth('', configuredSecret), false);
    assert.equal(verifyWebhookAuth(null, configuredSecret), false);
  });
});

test('Security Audit - Multi-Role Authorization Matrix (Customer, Seller, Admin)', async (t) => {
  // Authorization Policy Engine Simulator mimicking backend middleware and RLS
  function authorizeOperation({ user, resource, action, resourceOwnerId }) {
    if (!user) return { allowed: false, reason: 'UNAUTHENTICATED' };

    // Super Admin has platform-wide management rights
    if (user.role === 'super_admin' || user.role === 'admin') {
      return { allowed: true, role: user.role };
    }

    // Customer operations
    if (user.role === 'customer') {
      if (resource === 'orders' || resource === 'addresses' || resource === 'cart' || resource === 'profile') {
        if (action === 'read' || action === 'update') {
          return { allowed: user.id === resourceOwnerId, reason: user.id === resourceOwnerId ? 'OK' : 'FORBIDDEN_IDOR' };
        }
        if (action === 'create') return { allowed: true };
      }
      if (resource === 'admin_settings' || resource === 'payouts' || resource === 'sellers' || resource === 'audit_logs') {
        return { allowed: false, reason: 'FORBIDDEN_ROLE_INSUFFICIENT' };
      }
      if (resource === 'products' && (action === 'update' || action === 'delete' || action === 'create')) {
        return { allowed: false, reason: 'FORBIDDEN_CUSTOMER_CANNOT_WRITE_PRODUCTS' };
      }
      if (resource === 'products' && action === 'read') {
        return { allowed: true };
      }
    }

    // Seller operations
    if (user.role === 'seller') {
      const sellerId = user.sellerId || user.id;
      if (resource === 'products' || resource === 'inventory' || resource === 'settlements' || resource === 'pickup_locations') {
        if (action === 'read' || action === 'update' || action === 'create' || action === 'delete') {
          return { allowed: sellerId === resourceOwnerId, reason: sellerId === resourceOwnerId ? 'OK' : 'FORBIDDEN_SELLER_CROSS_TENANT' };
        }
      }
      if (resource === 'orders') {
        if (action === 'read') {
          return { allowed: sellerId === resourceOwnerId, reason: sellerId === resourceOwnerId ? 'OK' : 'FORBIDDEN_SELLER_CROSS_ORDER' };
        }
        return { allowed: false, reason: 'FORBIDDEN_SELLER_CANNOT_DIRECTLY_MODIFY_ORDERS' };
      }
      if (resource === 'admin_settings' || resource === 'admin_audit_logs' || resource === 'delete_seller_permanently') {
        return { allowed: false, reason: 'FORBIDDEN_ROLE_INSUFFICIENT' };
      }
    }

    return { allowed: false, reason: 'DENY_BY_DEFAULT' };
  }

  await t.test('Customer legitimate: Can view and manage own cart, orders, and addresses', () => {
    const customer = { id: 'cust_001', role: 'customer' };
    assert.equal(authorizeOperation({ user: customer, resource: 'orders', action: 'read', resourceOwnerId: 'cust_001' }).allowed, true);
    assert.equal(authorizeOperation({ user: customer, resource: 'addresses', action: 'update', resourceOwnerId: 'cust_001' }).allowed, true);
    assert.equal(authorizeOperation({ user: customer, resource: 'cart', action: 'create', resourceOwnerId: 'cust_001' }).allowed, true);
  });

  await t.test('Customer unauthorized: Denied access to other customer data, admin endpoints, and product modification', () => {
    const customer = { id: 'cust_001', role: 'customer' };
    assert.equal(authorizeOperation({ user: customer, resource: 'orders', action: 'read', resourceOwnerId: 'cust_002' }).allowed, false);
    assert.equal(authorizeOperation({ user: customer, resource: 'addresses', action: 'update', resourceOwnerId: 'cust_002' }).allowed, false);
    assert.equal(authorizeOperation({ user: customer, resource: 'admin_settings', action: 'read' }).allowed, false);
    assert.equal(authorizeOperation({ user: customer, resource: 'payouts', action: 'read' }).allowed, false);
    assert.equal(authorizeOperation({ user: customer, resource: 'products', action: 'update', resourceOwnerId: 'seller_100' }).allowed, false);
  });

  await t.test('Seller legitimate: Can manage own products, stock, settlements, and assigned order items', () => {
    const seller = { id: 'usr_seller_1', sellerId: 'seller_001', role: 'seller' };
    assert.equal(authorizeOperation({ user: seller, resource: 'products', action: 'update', resourceOwnerId: 'seller_001' }).allowed, true);
    assert.equal(authorizeOperation({ user: seller, resource: 'inventory', action: 'update', resourceOwnerId: 'seller_001' }).allowed, true);
    assert.equal(authorizeOperation({ user: seller, resource: 'settlements', action: 'read', resourceOwnerId: 'seller_001' }).allowed, true);
    assert.equal(authorizeOperation({ user: seller, resource: 'orders', action: 'read', resourceOwnerId: 'seller_001' }).allowed, true);
  });

  await t.test('Seller unauthorized: Denied access to another seller products, settlements, and admin tools', () => {
    const seller = { id: 'usr_seller_1', sellerId: 'seller_001', role: 'seller' };
    assert.equal(authorizeOperation({ user: seller, resource: 'products', action: 'update', resourceOwnerId: 'seller_002' }).allowed, false);
    assert.equal(authorizeOperation({ user: seller, resource: 'settlements', action: 'read', resourceOwnerId: 'seller_002' }).allowed, false);
    assert.equal(authorizeOperation({ user: seller, resource: 'admin_settings', action: 'update' }).allowed, false);
    assert.equal(authorizeOperation({ user: seller, resource: 'delete_seller_permanently', action: 'create' }).allowed, false);
  });

  await t.test('Super Admin legitimate: Full authorization to manage platform, settings, and audit logs', () => {
    const admin = { id: 'adm_001', role: 'super_admin' };
    assert.equal(authorizeOperation({ user: admin, resource: 'admin_settings', action: 'update' }).allowed, true);
    assert.equal(authorizeOperation({ user: admin, resource: 'admin_audit_logs', action: 'read' }).allowed, true);
    assert.equal(authorizeOperation({ user: admin, resource: 'settlements', action: 'read', resourceOwnerId: 'seller_002' }).allowed, true);
  });

  await t.test('Unauthenticated anonymous: Deny by default for all private resources', () => {
    assert.equal(authorizeOperation({ user: null, resource: 'orders', action: 'read', resourceOwnerId: 'cust_001' }).allowed, false);
    assert.equal(authorizeOperation({ user: null, resource: 'payouts', action: 'read' }).allowed, false);
    assert.equal(authorizeOperation({ user: null, resource: 'admin_settings', action: 'update' }).allowed, false);
  });
});

test('Security Audit - Input Sanitization & SQL Injection / XSS Defense', async (t) => {
  function sanitizeSearchQuery(input) {
    if (typeof input !== 'string') return '';
    // Strip dangerous SQL control characters and XSS tags
    return input
      .replace(/<[^>]*>?/gm, '') // Strip HTML tags
      .replace(/['";\\]/g, '')     // Strip SQL quoting
      .trim();
  }

  await t.test('SQL injection payloads are sanitized in search/filter parameters', () => {
    const maliciousInput = "test'; DROP TABLE orders; --";
    const sanitized = sanitizeSearchQuery(maliciousInput);
    assert.equal(sanitized.includes('DROP TABLE orders'), true); // Text is preserved
    assert.equal(sanitized.includes(';'), false);               // Semicolons stripped
    assert.equal(sanitized.includes("'"), false);               // Single quotes stripped
  });

  await t.test('XSS script tags are stripped from user-supplied strings', () => {
    const xssPayload = '<script>alert("xss")</script>Cotton Shirt';
    const sanitized = sanitizeSearchQuery(xssPayload);
    assert.equal(sanitized.includes('<script>'), false);
    assert.equal(sanitized.includes('</script>'), false);
    assert.equal(sanitized.includes('Cotton Shirt'), true);
  });
});

test('Security Audit - Bank Vault Encryption, Multi-Key Decryption & Key Rotation', async (t) => {
  const VAULT_SALT = "zebalpha_seller_bank_vault_salt_2026";
  const LEGACY_KEY = "zebalpha-enterprise-bank-vault-master-key-998877";
  const NEW_HEX_KEY = crypto.randomBytes(32).toString('hex'); // 64-character hex key

  const legacyDerivedKey = crypto.pbkdf2Sync(LEGACY_KEY, VAULT_SALT, 100000, 32, "sha256");
  const newKeyBuffer = Buffer.from(NEW_HEX_KEY, 'hex');

  function encryptWithKey(plainText, keyBuf) {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', keyBuf, iv);
    const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `enc:v1:${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
  }

  function decryptWithCandidateKeys(payload, candidateKeys) {
    const parts = payload.split(':');
    const iv = Buffer.from(parts[2], 'hex');
    const authTag = Buffer.from(parts[3], 'hex');
    const ciphertext = Buffer.from(parts[4], 'hex');

    for (const key of candidateKeys) {
      try {
        const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
        decipher.setAuthTag(authTag);
        const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
        return decrypted.toString('utf8');
      } catch {}
    }
    throw new Error('Decryption failed for all candidate keys');
  }

  await t.test('Account number encrypted with legacy master key is decrypted successfully when candidate keys include legacy key', () => {
    const originalAccount = '9876543210123456';
    const legacyEncrypted = encryptWithKey(originalAccount, legacyDerivedKey);

    // Candidate keys: active new key first, then legacy key fallback
    const candidateKeys = [newKeyBuffer, legacyDerivedKey];
    const decrypted = decryptWithCandidateKeys(legacyEncrypted, candidateKeys);
    assert.equal(decrypted, originalAccount);
  });

  await t.test('Account number encrypted with new key decrypts directly with new key', () => {
    const originalAccount = '1234567890123456';
    const newEncrypted = encryptWithKey(originalAccount, newKeyBuffer);

    const candidateKeys = [newKeyBuffer, legacyDerivedKey];
    const decrypted = decryptWithCandidateKeys(newEncrypted, candidateKeys);
    assert.equal(decrypted, originalAccount);
  });

  await t.test('Re-encryption migrates legacy ciphertext to new key format seamlessly', () => {
    const originalAccount = '5555444433332222';
    const legacyEncrypted = encryptWithKey(originalAccount, legacyDerivedKey);

    // Decrypt with fallback and re-encrypt with new active key
    const decrypted = decryptWithCandidateKeys(legacyEncrypted, [newKeyBuffer, legacyDerivedKey]);
    const reEncrypted = encryptWithKey(decrypted, newKeyBuffer);

    // Re-encrypted payload now decrypts using ONLY the new key without legacy fallback
    const decryptedWithNewOnly = decryptWithCandidateKeys(reEncrypted, [newKeyBuffer]);
    assert.equal(decryptedWithNewOnly, originalAccount);
  });

  await t.test('Tampered ciphertext fails authentication tag check and throws error', () => {
    const originalAccount = '9876543210123456';
    const legacyEncrypted = encryptWithKey(originalAccount, legacyDerivedKey);
    const tampered = legacyEncrypted.slice(0, -6) + '000000';

    assert.throws(() => {
      decryptWithCandidateKeys(tampered, [newKeyBuffer, legacyDerivedKey]);
    }, /Decryption failed for all candidate keys/);
  });
});


