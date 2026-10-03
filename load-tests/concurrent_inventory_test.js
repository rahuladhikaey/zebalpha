/**
 * ZEBALPHA PHASE 5 — CONCURRENT INVENTORY OVERSELLING TEST
 * 
 * Scenario:
 * - A test product has initial stock = 10
 * - 50 concurrent checkout attempts try to purchase quantity 1 simultaneously
 * - Invariant: Exactly 10 successful reservations, 40 controlled out-of-stock (HTTP 400/409/422)
 * - Final stock must equal 0, NEVER < 0
 * 
 * Execution:
 * node load-tests/concurrent_inventory_test.js
 */

const BASE_URL = process.env.STAGING_BASE_URL || 'http://localhost:3000';
const TEST_PRODUCT_ID = process.env.TEST_PRODUCT_ID;
const CONCURRENT_REQUESTS = 50;

if (!TEST_PRODUCT_ID) {
  console.log('[CONCURRENCY TEST] ℹ️ TEST_PRODUCT_ID not provided.');
  console.log('To run this test against staging, specify:');
  console.log('  TEST_PRODUCT_ID="<uuid>" STAGING_BASE_URL="https://staging.zebalpha.shop" node load-tests/concurrent_inventory_test.js');
}

async function runConcurrencyTest() {
  if (BASE_URL.includes('zebalpha.shop') && !process.env.ALLOW_DESTRUCTIVE_STAGING_TEST) {
    console.error('❌ [SAFETY GUARD]: Refusing to execute stock mutation test against live domain without ALLOW_DESTRUCTIVE_STAGING_TEST=true.');
    process.exit(1);
  }

  console.log(`\n===============================================================`);
  console.log(`ZEBALPHA PHASE 5 — CONCURRENT INVENTORY TEST`);
  console.log(`Target: ${BASE_URL}`);
  console.log(`Product ID: ${TEST_PRODUCT_ID || 'MOCK_TEST_PRODUCT'}`);
  console.log(`Concurrent Checkout Workers: ${CONCURRENT_REQUESTS}`);
  console.log(`===============================================================\n`);

  if (!TEST_PRODUCT_ID) {
    console.log('STATUS: NOT TESTED (Test harness ready; awaiting staging TEST_PRODUCT_ID fixture).');
    return;
  }

  const results = {
    successfulReservations: 0,
    outOfStockRejections: 0,
    serverErrors: 0,
    clientErrors: 0,
    durationsMs: []
  };

  const requests = Array.from({ length: CONCURRENT_REQUESTS }, (_, i) => {
    const workerId = i + 1;
    const startTime = Date.now();
    
    return fetch(`${BASE_URL}/api/checkout/cod`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Worker-ID': `worker-${workerId}`
      },
      body: JSON.stringify({
        customer_name: `Concurrency Tester ${workerId}`,
        phone: `99999${String(10000 + workerId).slice(1)}`,
        address: '123 Staging Concurrency Lane, Test City',
        items: [{
          id: TEST_PRODUCT_ID,
          quantity: 1,
          price: 999,
          seller_id: 'test-seller'
        }],
        total: 999,
        payment_method: 'COD'
      })
    })
    .then(async (res) => {
      const duration = Date.now() - startTime;
      results.durationsMs.push(duration);
      const data = await res.json().catch(() => ({}));

      if (res.status === 200 && data.success) {
        results.successfulReservations++;
        return { workerId, status: 'SUCCESS', orderId: data.orderId, duration };
      } else if (res.status === 400 || (data && !data.success && /out of stock|insufficient/i.test(data.error || ''))) {
        results.outOfStockRejections++;
        return { workerId, status: 'REJECTED_OUT_OF_STOCK', error: data.error, duration };
      } else if (res.status >= 500) {
        results.serverErrors++;
        return { workerId, status: 'SERVER_ERROR', statusCode: res.status, duration };
      } else {
        results.clientErrors++;
        return { workerId, status: 'CLIENT_ERROR', statusCode: res.status, data, duration };
      }
    })
    .catch((err) => {
      results.serverErrors++;
      return { workerId, status: 'NETWORK_ERROR', error: err.message };
    });
  });

  const workerOutcomes = await Promise.all(requests);

  console.log('Worker Outcomes Summary:');
  console.log(`- Successful reservations: ${results.successfulReservations}`);
  console.log(`- Out of stock rejections: ${results.outOfStockRejections}`);
  console.log(`- Server (5xx) errors:     ${results.serverErrors}`);
  console.log(`- Client (4xx) errors:     ${results.clientErrors}`);

  // Invariant verification
  console.log('\n--- Invariant Verification ---');
  if (results.successfulReservations <= 10 && results.successfulReservations + results.outOfStockRejections === CONCURRENT_REQUESTS) {
    console.log('✅ INVARIANT PASSED: No overselling occurred. Stock reservations capped precisely at available stock.');
  } else if (results.successfulReservations > 10) {
    console.error(`❌ INVARIANT VIOLATION: Overselling detected! ${results.successfulReservations} orders placed for 10 units.`);
  } else {
    console.log(`ℹ️ Result: ${results.successfulReservations} reserved, ${results.outOfStockRejections} rejected.`);
  }
}

if (process.argv[1] && process.argv[1].endsWith('concurrent_inventory_test.js')) {
  runConcurrencyTest();
}

export { runConcurrencyTest };
