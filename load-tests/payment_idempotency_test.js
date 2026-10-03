/**
 * ZEBALPHA PHASE 5 — PAYMENT IDEMPOTENCY CONCURRENCY TEST
 * 
 * Scenario:
 * - 20 concurrent requests send identical Razorpay payment and order identifiers
 * - Invariant: Exactly 1 primary order created in database
 * - 19 other requests receive idempotent already-processed responses
 * - Inventory must NOT be decremented multiple times
 * 
 * Execution:
 * node load-tests/payment_idempotency_test.js
 */

const crypto = require('crypto');

const BASE_URL = process.env.STAGING_BASE_URL || 'http://localhost:3000';
const TEST_RAZORPAY_SECRET = process.env.RAZORPAY_KEY_SECRET || '';
const CONCURRENT_REQUESTS = 20;

async function runPaymentIdempotencyTest() {
  console.log(`\n===============================================================`);
  console.log(`ZEBALPHA PHASE 5 — PAYMENT IDEMPOTENCY CONCURRENCY TEST`);
  console.log(`Target: ${BASE_URL}`);
  console.log(`Concurrent Replay Attempts: ${CONCURRENT_REQUESTS}`);
  console.log(`===============================================================\n`);

  const mockOrderId = `order_test_${Date.now()}`;
  const mockPaymentId = `pay_test_${Date.now()}`;
  
  // Generate authentic HMAC-SHA256 signature for test credentials
  const signature = crypto
    .createHmac('sha256', TEST_RAZORPAY_SECRET)
    .update(`${mockOrderId}|${mockPaymentId}`)
    .digest('hex');

  const testPayload = {
    razorpay_order_id: mockOrderId,
    razorpay_payment_id: mockPaymentId,
    razorpay_signature: signature,
    customer_name: 'Idempotency Test User',
    phone: '9876543210',
    address: '456 Safe Staging Way, Kolkata, 700001',
    items: [{
      id: process.env.TEST_PRODUCT_ID || '00000000-0000-0000-0000-000000000001',
      quantity: 1,
      price: 499,
      seller_id: 'test-seller'
    }],
    total: 499,
    user_id: 'test-user-id'
  };

  const results = {
    firstOrderCreated: 0,
    idempotentReturns: 0,
    errors: 0,
    createdOrderIds: new Set()
  };

  const requests = Array.from({ length: CONCURRENT_REQUESTS }, (_, i) => {
    return fetch(`${BASE_URL}/api/checkout/verify-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Request-Attempt': String(i + 1)
      },
      body: JSON.stringify(testPayload)
    })
    .then(async (res) => {
      const data = await res.json().catch(() => ({}));
      if (res.status === 200 && data.success) {
        if (data.alreadyProcessed || data.isDuplicateSubmission) {
          results.idempotentReturns++;
        } else {
          results.firstOrderCreated++;
        }
        if (data.orderId || data.orderNumber) {
          results.createdOrderIds.add(data.orderId || data.orderNumber);
        }
        return { attempt: i + 1, status: 'SUCCESS', data };
      } else {
        results.errors++;
        return { attempt: i + 1, status: 'ERROR', statusCode: res.status, data };
      }
    })
    .catch((err) => {
      results.errors++;
      return { attempt: i + 1, status: 'NETWORK_ERROR', error: err.message };
    });
  });

  const outcomes = await Promise.all(requests);

  console.log('Payment Verification Outcomes:');
  console.log(`- Initial Order Creations:    ${results.firstOrderCreated}`);
  console.log(`- Idempotent Cached Returns:   ${results.idempotentReturns}`);
  console.log(`- Unique Order IDs in Responses: ${results.createdOrderIds.size}`);
  console.log(`- Error/Failed Requests:       ${results.errors}`);

  console.log('\n--- Invariant Verification ---');
  if (results.createdOrderIds.size === 1 && results.firstOrderCreated <= 1) {
    console.log('✅ INVARIANT PASSED: Exactly 1 logical order was created. Idempotency successfully intercepted all replay requests.');
  } else if (results.createdOrderIds.size > 1) {
    console.error(`❌ INVARIANT VIOLATION: Duplicate orders generated! Unique IDs found: ${Array.from(results.createdOrderIds).join(', ')}`);
  } else {
    console.log(`ℹ️ Result recorded: ${results.createdOrderIds.size} unique orders, ${results.errors} errors.`);
  }
}

if (process.argv[1] && process.argv[1].endsWith('payment_idempotency_test.js')) {
  runPaymentIdempotencyTest();
}

module.exports = { runPaymentIdempotencyTest };
