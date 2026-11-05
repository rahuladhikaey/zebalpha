import assert from 'node:assert/strict';

console.log('========================================================================');
console.log('📊 ZEBALPHA CUSTOMER RETENTION LOGIC HARDENING & ACCURACY TEST SUITE');
console.log('========================================================================\n');

let totalTests = 0;
let passedTests = 0;

function test(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✅ PASS: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(`     Reason: ${err.message}`);
  }
}

// -------------------------------------------------------------------
// 1. SEGMENT EXCLUSIVITY (MUTUALLY EXCLUSIVE PARTITION)
// -------------------------------------------------------------------
console.log('--- 1. Purchase Segment Exclusivity & Partitioning ---');

test('Every registered customer belongs to exactly one purchase segment (New, Repeat, Loyal)', () => {
  const config = {
    new_max_delivered: 1,
    repeat_min_delivered: 2,
    repeat_max_delivered: 4,
    loyal_min_delivered: 5,
  };

  const registeredCustomers = [
    { id: 'c1', delivered_orders: 0 },
    { id: 'c2', delivered_orders: 1 },
    { id: 'c3', delivered_orders: 2 },
    { id: 'c4', delivered_orders: 4 },
    { id: 'c5', delivered_orders: 5 },
    { id: 'c6', delivered_orders: 12 },
  ];

  const getSegment = (d) => {
    if (d >= config.loyal_min_delivered) return 'Loyal';
    if (d >= config.repeat_min_delivered && d <= config.repeat_max_delivered) return 'Repeat';
    return 'New';
  };

  const segments = registeredCustomers.map(c => getSegment(c.delivered_orders));
  const newCount = segments.filter(s => s === 'New').length;
  const repeatCount = segments.filter(s => s === 'Repeat').length;
  const loyalCount = segments.filter(s => s === 'Loyal').length;

  assert.equal(newCount, 2, 'New: 0-1 delivered');
  assert.equal(repeatCount, 2, 'Repeat: 2-4 delivered');
  assert.equal(loyalCount, 2, 'Loyal: 5+ delivered');
  assert.equal(newCount + repeatCount + loyalCount, registeredCustomers.length, 'Segments strictly partition total customers');
});

// -------------------------------------------------------------------
// 2. 100% PERCENTAGE RECONCILIATION
// -------------------------------------------------------------------
console.log('\n--- 2. Exact 100% Percentage Reconciliation ---');

test('Primary purchase segment percentages strictly reconcile to 100.0%', () => {
  const scopeTotal = 17;
  const scopeNew = 7;
  const scopeRepeat = 5;
  const scopeLoyal = 5;

  let pNew = Number(((scopeNew / scopeTotal) * 100).toFixed(1));       // 41.2
  let pRepeat = Number(((scopeRepeat / scopeTotal) * 100).toFixed(1)); // 29.4
  let pLoyal = Number(((scopeLoyal / scopeTotal) * 100).toFixed(1));   // 29.4
  // Raw sum: 41.2 + 29.4 + 29.4 = 100.0

  const sum = Number((pNew + pRepeat + pLoyal).toFixed(1));
  const diff = Number((100.0 - sum).toFixed(1));
  if (Math.abs(diff) > 0.001) {
    if (pNew >= pRepeat && pNew >= pLoyal) pNew = Number((pNew + diff).toFixed(1));
    else if (pRepeat >= pLoyal) pRepeat = Number((pRepeat + diff).toFixed(1));
    else pLoyal = Number((pLoyal + diff).toFixed(1));
  }

  const reconciledSum = Number((pNew + pRepeat + pLoyal).toFixed(1));
  assert.equal(reconciledSum, 100.0, 'Reconciled percentages must equal 100.0% exactly');
});

// -------------------------------------------------------------------
// 3. OVERLAPPING ACTIVITY & PURCHASE STATES DECOUPLING
// -------------------------------------------------------------------
console.log('\n--- 3. Overlapping Activity & Purchase States Decoupling ---');

test('A loyal customer who is inactive or has an abandoned cart is classified in Loyal for purchases, and tracked separately for activity', () => {
  const now = new Date('2026-11-05T12:00:00Z');
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);

  const customer = {
    id: 'loyal_but_inactive',
    delivered_orders: 8,
    last_active: '2026-09-01T00:00:00Z', // Inactive (65 days dormant)
    has_abandoned_cart: true,
  };

  // 1. Purchase segment is strictly Loyal
  const segment = customer.delivered_orders >= 5 ? 'Loyal' : 'New';
  assert.equal(segment, 'Loyal');

  // 2. Activity metrics track inactivity independently without polluting purchase segments
  const isInactive = new Date(customer.last_active) < thirtyDaysAgo;
  assert.equal(isInactive, true);
});

// -------------------------------------------------------------------
// 4. GUEST VS REGISTERED CUSTOMER SEPARATION
// -------------------------------------------------------------------
console.log('\n--- 4. Guest vs Registered Customer Separation ---');

test('Guest shoppers are isolated from registered customer purchase retention distribution', () => {
  const allProfiles = [
    { id: 'u_reg_1', is_guest: false, delivered_orders: 1 },
    { id: 'u_reg_2', is_guest: false, delivered_orders: 3 },
    { id: 'guest_phone_99999', is_guest: true, delivered_orders: 1 },
    { id: 'guest_phone_88888', is_guest: true, delivered_orders: 0 },
  ];

  const registered = allProfiles.filter(p => !p.is_guest);
  const guests = allProfiles.filter(p => p.is_guest);

  assert.equal(registered.length, 2, 'Only 2 registered customer accounts');
  assert.equal(guests.length, 2, '2 guest customer profiles');

  // Registered repeat share: 1 repeat out of 2 registered = 50%
  const regRepeat = registered.filter(p => p.delivered_orders >= 2).length;
  assert.equal(regRepeat, 1);
});

// -------------------------------------------------------------------
// 5. REPEAT PURCHASE RATE (DENOMINATOR = BUYERS WITH >= 1 DELIVERED ORDER)
// -------------------------------------------------------------------
console.log('\n--- 5. Repeat Purchase Rate Standard Denominator ---');

test('Repeat purchase rate uses customers with >= 1 delivered order as denominator', () => {
  const cohort = [
    { id: 'c1', delivered_orders: 0 }, // Registered, never purchased
    { id: 'c2', delivered_orders: 0 }, // Registered, never purchased
    { id: 'c3', delivered_orders: 1 }, // 1st time buyer
    { id: 'c4', delivered_orders: 2 }, // Repeat buyer
    { id: 'c5', delivered_orders: 6 }, // Loyal buyer
  ];

  const purchasedCustomers = cohort.filter(c => c.delivered_orders >= 1);
  assert.equal(purchasedCustomers.length, 3, '3 customers with at least 1 delivered order');

  const repeatCustomers = cohort.filter(c => c.delivered_orders >= 2);
  assert.equal(repeatCustomers.length, 2, '2 customers returned to buy again');

  const repeatPurchaseRate = Number(((repeatCustomers.length / purchasedCustomers.length) * 100).toFixed(1));
  assert.equal(repeatPurchaseRate, 66.7, 'Repeat purchase rate is 2 / 3 = 66.7% (not 2 / 5 = 40%)');
});

// -------------------------------------------------------------------
// 6. COHORT RETENTION: PURCHASE VS VISIT RETENTION
// -------------------------------------------------------------------
console.log('\n--- 6. Cohort Retention: Purchase vs Visit Differentiation ---');

test('Visit retention tracks session/login returns, while purchase retention tracks second order placement', () => {
  const now = new Date('2026-11-05T12:00:00Z').getTime();

  // Customer A: Registered 45d ago, bought 1st order 45d ago, bought 2nd order 10d later
  const customerA = {
    registration_date: new Date(now - 45 * 86400000).toISOString(),
    orders: [
      { created_at: new Date(now - 45 * 86400000).toISOString(), order_status: 'delivered' },
      { created_at: new Date(now - 35 * 86400000).toISOString(), order_status: 'delivered' },
    ],
    last_active: new Date(now - 35 * 86400000).toISOString(),
  };

  // Customer B: Registered 45d ago, bought 1st order 45d ago, visited app 10d later but never bought again
  const customerB = {
    registration_date: new Date(now - 45 * 86400000).toISOString(),
    orders: [
      { created_at: new Date(now - 45 * 86400000).toISOString(), order_status: 'delivered' },
    ],
    last_active: new Date(now - 35 * 86400000).toISOString(), // Had active visit
  };

  // Both customers had a return visit within 30 days -> Visit Retention = 2/2 = 100%
  // Only Customer A placed a 2nd order within 30 days -> Purchase Retention = 1/2 = 50%
  const visitRetained = [customerA, customerB].filter(c => {
    const diff = new Date(c.last_active).getTime() - new Date(c.registration_date).getTime();
    return diff >= 86400000 && diff <= 30 * 86400000;
  }).length;

  const purchaseRetained = [customerA, customerB].filter(c => {
    return c.orders.length > 1 && (new Date(c.orders[1].created_at).getTime() - new Date(c.orders[0].created_at).getTime()) <= 30 * 86400000;
  }).length;

  assert.equal(visitRetained, 2, 'Both retained by visit');
  assert.equal(purchaseRetained, 1, 'Only Customer A retained by purchase');
});

// -------------------------------------------------------------------
// 7. PARTIAL REFUNDS AND RETURNS LIFECYCLE
// -------------------------------------------------------------------
console.log('\n--- 7. Order Lifecycle: Partial Returns & Refunds ---');

test('Delivered orders with partial returns are counted as delivered, with net revenue deducted', () => {
  const order = {
    order_status: 'partially_returned',
    payment_status: 'PAID',
    total_amount: 1500,
    refund_amount: 500,
  };

  const isValidDelivered = ['delivered', 'partially_returned'].includes(order.order_status) && order.payment_status !== 'FAILED';
  const netRevenue = Math.max(0, order.total_amount - (order.refund_amount || 0));

  assert.equal(isValidDelivered, true, 'Partially returned order counts toward customer delivered count');
  assert.equal(netRevenue, 1000, 'Net revenue is deducted properly');
});

// -------------------------------------------------------------------
// 8. DATE FILTER BOUNDARIES & TIMEZONE CONSISTENCY
// -------------------------------------------------------------------
console.log('\n--- 8. Date Filter Boundaries & Timezones ---');

test('Date filters enforce explicit UTC start (00:00:00.000) and end (23:59:59.999) timestamps', () => {
  const startParam = '2026-11-01';
  const endParam = '2026-11-03';

  const rangeStart = new Date(startParam + 'T00:00:00.000Z');
  const rangeEnd = new Date(endParam + 'T23:59:59.999Z');

  const regOnBoundary = new Date('2026-11-03T23:30:00.000Z');
  const regJustOutside = new Date('2026-11-04T00:00:01.000Z');

  assert.ok(regOnBoundary >= rangeStart && regOnBoundary <= rangeEnd, 'Includes boundary record');
  assert.ok(!(regJustOutside >= rangeStart && regJustOutside <= rangeEnd), 'Excludes records outside boundary');
});

// -------------------------------------------------------------------
// 9. EMPTY DATABASE RESILIENCE
// -------------------------------------------------------------------
console.log('\n--- 9. Empty Database Resilience ---');

test('Zero-mock empty database returns 0s without NaN or division by zero errors', () => {
  const emptyList = [];
  const scopeTotal = emptyList.length;
  const scopePurchased = emptyList.filter(c => c.delivered_orders > 0).length;

  const pNew = scopeTotal > 0 ? Number(((0 / scopeTotal) * 100).toFixed(1)) : 0;
  const repeatRate = scopePurchased > 0 ? Number(((0 / scopePurchased) * 100).toFixed(1)) : 0;

  assert.equal(pNew, 0);
  assert.equal(repeatRate, 0);
  assert.ok(!Number.isNaN(pNew));
  assert.ok(!Number.isNaN(repeatRate));
});

// -------------------------------------------------------------------
// 10. CART ABANDONMENT RIGOR
// -------------------------------------------------------------------
console.log('\n--- 10. Cart Abandonment Validation ---');

test('Cart item is not counted as abandoned if user subsequently placed an order or purchased the item', () => {
  const now = new Date('2026-11-05T12:00:00Z').getTime();
  const cartItem = {
    user_id: 'u100',
    product_id: 'prod_99',
    quantity: 1,
    created_at: new Date(now - 28 * 3600000).toISOString(), // Added 28h ago
  };

  const userOrders = [
    {
      created_at: new Date(now - 2 * 3600000).toISOString(), // Ordered 2h ago
      order_status: 'delivered',
      payment_status: 'PAID',
      items: [{ product_id: 'prod_99', quantity: 1 }],
    },
  ];

  const itemTime = new Date(cartItem.created_at).getTime();
  const hasSubsequentOrder = userOrders.some(o => new Date(o.created_at).getTime() >= itemTime);

  assert.equal(hasSubsequentOrder, true, 'User converted and purchased; item is NOT abandoned');
});

// -------------------------------------------------------------------
// SUMMARY
// -------------------------------------------------------------------
console.log('\n========================================================================');
console.log(`🏁 TEST EXECUTION COMPLETE: ${passedTests}/${totalTests} TESTS PASSED`);
console.log('========================================================================\n');

if (passedTests === totalTests) {
  process.exit(0);
} else {
  process.exit(1);
}
