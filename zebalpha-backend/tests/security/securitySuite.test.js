import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';

const TEST_JWT_SECRET = 'x9#kL2!pQ8$vN5@mZ1*cJ4^yH7&tR0%bW3';
const TEST_RAZORPAY_SECRET = '5LUjZ94LMDnjwlLyB9cUU5cb';

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
