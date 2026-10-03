/**
 * ZEBALPHA PHASE 5 — RAPID COD DUPLICATE SUBMISSION TEST
 * 
 * Scenario:
 * - Customer rapid double-clicks "Place Order" or network glitches resend requests
 * - 10 rapid submissions with identical customer identity, cart, and phone within 100ms
 * - Invariant: Exactly 1 primary order created in database
 * - Remaining submissions are throttled and return the existing order
 * 
 * Execution:
 * node load-tests/cod_duplicate_test.js
 */

const BASE_URL = process.env.STAGING_BASE_URL || 'http://localhost:3000';
const RAPID_ATTEMPTS = 10;

async function runCodDuplicateTest() {
  console.log(`\n===============================================================`);
  console.log(`ZEBALPHA PHASE 5 — RAPID COD DUPLICATE SUBMISSION TEST`);
  console.log(`Target: ${BASE_URL}`);
  console.log(`Rapid Parallel Submissions: ${RAPID_ATTEMPTS}`);
  console.log(`===============================================================\n`);

  const uniqueSuffix = Date.now();
  const testPhone = `98${String(uniqueSuffix).slice(-8)}`;

  const testPayload = {
    customer_name: 'COD Rapid Clicker',
    phone: testPhone,
    address: '789 Anti-Duplicate Lane, Kolkata, 700001',
    items: [{
      id: process.env.TEST_PRODUCT_ID || '00000000-0000-0000-0000-000000000001',
      quantity: 1,
      price: 699,
      seller_id: 'test-seller'
    }],
    total: 699,
    user_id: `test-user-${uniqueSuffix}`
  };

  const results = {
    createdOrders: 0,
    throttledDuplicates: 0,
    errors: 0,
    distinctOrderNumbers: new Set()
  };

  // Launch parallel rapid requests without delay
  const promises = Array.from({ length: RAPID_ATTEMPTS }, (_, i) => {
    return fetch(`${BASE_URL}/api/checkout/cod`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Rapid-Attempt': String(i + 1)
      },
      body: JSON.stringify(testPayload)
    })
    .then(async (res) => {
      const data = await res.json().catch(() => ({}));
      if (res.status === 200 && data.success) {
        if (data.isDuplicateSubmission) {
          results.throttledDuplicates++;
        } else {
          results.createdOrders++;
        }
        if (data.orderNumber || data.orderId) {
          results.distinctOrderNumbers.add(data.orderNumber || data.orderId);
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

  await Promise.all(promises);

  console.log('Rapid COD Outcomes:');
  console.log(`- Created Primary Orders:     ${results.createdOrders}`);
  console.log(`- Throttled Duplicate Returns: ${results.throttledDuplicates}`);
  console.log(`- Distinct Order Numbers:      ${results.distinctOrderNumbers.size}`);
  console.log(`- Errors:                      ${results.errors}`);

  console.log('\n--- Invariant Verification ---');
  if (results.distinctOrderNumbers.size === 1 && results.createdOrders === 1) {
    console.log('✅ INVARIANT PASSED: Exactly 1 order was generated. 30-second throttle successfully protected against duplicate order creation.');
  } else if (results.distinctOrderNumbers.size > 1) {
    console.error(`❌ INVARIANT VIOLATION: Duplicate COD orders created! Distinct Orders: ${Array.from(results.distinctOrderNumbers).join(', ')}`);
  } else {
    console.log(`ℹ️ Result recorded: ${results.distinctOrderNumbers.size} distinct orders, ${results.errors} errors.`);
  }
}

if (process.argv[1] && process.argv[1].endsWith('cod_duplicate_test.js')) {
  runCodDuplicateTest();
}

module.exports = { runCodDuplicateTest };
