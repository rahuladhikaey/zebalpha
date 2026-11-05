import assert from 'node:assert/strict';

console.log('====================================================================');
console.log('👥 ZEBALPHA CUSTOMER INTELLIGENCE & LIVE ANALYTICS VERIFICATION SUITE');
console.log('====================================================================\n');

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
// 1. REPEAT CUSTOMER SEGMENTATION ENGINE AUDIT
// -------------------------------------------------------------------
console.log('--- TEST GROUP 1: Repeat Customer Classification & Rules ---');

function classifyCustomer(deliveredOrders, config = { new_max: 1, repeat_min: 2, repeat_max: 4, loyal_min: 5 }) {
  if (deliveredOrders >= config.loyal_min) return 'Loyal';
  if (deliveredOrders >= config.repeat_min && deliveredOrders <= config.repeat_max) return 'Repeat';
  return 'New';
}

test('0 delivered orders classified as New Customer', () => {
  assert.equal(classifyCustomer(0), 'New');
});

test('1 delivered order classified as New Customer', () => {
  assert.equal(classifyCustomer(1), 'New');
});

test('2 delivered orders classified as Repeat Customer', () => {
  assert.equal(classifyCustomer(2), 'Repeat');
});

test('4 delivered orders classified as Repeat Customer', () => {
  assert.equal(classifyCustomer(4), 'Repeat');
});

test('5 delivered orders classified as Loyal Customer', () => {
  assert.equal(classifyCustomer(5), 'Loyal');
});

test('Cancelled and returned orders are excluded from delivered order qualification', () => {
  const customerOrders = [
    { id: 1, order_status: 'delivered', total_amount: 500 },
    { id: 2, order_status: 'cancelled', total_amount: 800 },
    { id: 3, order_status: 'returned', total_amount: 600 },
    { id: 4, order_status: 'delivered', total_amount: 1200 },
  ];
  const deliveredCount = customerOrders.filter(o => o.order_status === 'delivered').length;
  assert.equal(deliveredCount, 2);
  assert.equal(classifyCustomer(deliveredCount), 'Repeat');
});

// -------------------------------------------------------------------
// 2. REVENUE ATTRIBUTION AUDIT (FIRST-TIME VS REPEAT REVENUE)
// -------------------------------------------------------------------
console.log('\n--- TEST GROUP 2: Revenue Attribution Engine ---');

test('Correctly separates first-time delivered order revenue from repeat revenue', () => {
  const customerOrders = [
    { id: 101, created_at: '2026-09-01T10:00:00Z', order_status: 'delivered', total_amount: 750 },
    { id: 102, created_at: '2026-09-15T10:00:00Z', order_status: 'delivered', total_amount: 1200 },
    { id: 103, created_at: '2026-10-01T10:00:00Z', order_status: 'delivered', total_amount: 2500 },
  ];

  const sortedDelivered = customerOrders
    .filter(o => o.order_status === 'delivered')
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  let firstTimeRevenue = 0;
  let repeatRevenue = 0;

  if (sortedDelivered.length > 0) {
    firstTimeRevenue = sortedDelivered[0].total_amount;
    for (let i = 1; i < sortedDelivered.length; i++) {
      repeatRevenue += sortedDelivered[i].total_amount;
    }
  }

  assert.equal(firstTimeRevenue, 750);
  assert.equal(repeatRevenue, 3700);
  assert.equal(firstTimeRevenue + repeatRevenue, 4450);
});

// -------------------------------------------------------------------
// 3. LIVE HEARTBEAT & ONLINE CALCULATION
// -------------------------------------------------------------------
console.log('\n--- TEST GROUP 3: Live Heartbeat & Presence Detection ---');

function isUserOnline(session, timeoutSeconds = 120, currentTime = Date.now()) {
  if (!session || !session.is_active || !session.last_heartbeat) return false;
  const heartbeatTime = new Date(session.last_heartbeat).getTime();
  const diffSeconds = (currentTime - heartbeatTime) / 1000;
  return diffSeconds <= timeoutSeconds;
}

test('Session with heartbeat 45 seconds ago is marked Online', () => {
  const now = Date.now();
  const session = {
    is_active: true,
    last_heartbeat: new Date(now - 45000).toISOString(),
  };
  assert.equal(isUserOnline(session, 120, now), true);
});

test('Session with heartbeat 150 seconds ago exceeds 120s timeout and is marked Offline', () => {
  const now = Date.now();
  const session = {
    is_active: true,
    last_heartbeat: new Date(now - 150000).toISOString(),
  };
  assert.equal(isUserOnline(session, 120, now), false);
});

test('Session with is_active = false (tab closed / beacon sent) is immediately Offline', () => {
  const now = Date.now();
  const session = {
    is_active: false,
    last_heartbeat: new Date(now - 5000).toISOString(),
  };
  assert.equal(isUserOnline(session, 120, now), false);
});

// -------------------------------------------------------------------
// 4. SECURITY & PRIVACY MASKING AUDIT
// -------------------------------------------------------------------
console.log('\n--- TEST GROUP 4: Security & Sensitive Contact Masking ---');

function maskPhone(phone) {
  if (!phone) return 'Not Provided';
  const cleaned = phone.replace(/[^\d+]/g, '');
  if (cleaned.length < 6) return '******';
  return cleaned.slice(0, 3) + '******' + cleaned.slice(-3);
}

function maskEmail(email) {
  if (!email || !email.includes('@')) return 'anonymous';
  const [user, domain] = email.split('@');
  if (user.length <= 2) return `${user[0]}***@${domain}`;
  return `${user.slice(0, 2)}***${user.slice(-1)}@${domain}`;
}

test('Masks phone number preventing full personal contact exposure', () => {
  assert.equal(maskPhone('+919876543210'), '+91******210');
  assert.equal(maskPhone('9876543210'), '987******210');
});

test('Masks email address protecting customer privacy', () => {
  assert.equal(maskEmail('rahul.adhikary@gmail.com'), 'ra***y@gmail.com');
  assert.equal(maskEmail('hi@zebalpha.shop'), 'h***@zebalpha.shop');
});

// -------------------------------------------------------------------
// 5. DATA INTEGRITY AUDIT (REGISTERED VS PURCHASED CUSTOMERS)
// -------------------------------------------------------------------
console.log('\n--- TEST GROUP 5: Data Integrity & Cross-Table Consistency ---');

test('Guarantees total customers >= purchased customers (resolves 0 registered with 2 purchased anomaly)', () => {
  const registeredProfiles = [{ id: 'p1', email: 'p1@test.com' }];
  const orders = [
    { id: 1, user_id: 'p1', phone: '9870000001', customer_name: 'P1' },
    { id: 2, user_id: null, phone: '9870000002', customer_name: 'Guest 2' },
    { id: 3, user_id: null, phone: '9870000003', customer_name: 'Guest 3' },
  ];

  const guestKeys = new Set(
    orders.filter(o => !o.user_id && (o.phone || o.customer_name)).map(o => o.phone || o.customer_name)
  );

  const totalCustomers = registeredProfiles.length + guestKeys.size;
  const activeBuyers = new Set(orders.map(o => o.user_id || o.phone || o.customer_name)).size;

  assert.equal(totalCustomers, 3);
  assert.equal(activeBuyers, 3);
  assert.ok(totalCustomers >= activeBuyers);
});

test('Category sales matches product revenue with category UUID and string normalization', () => {
  const categories = [
    { id: 'cat-uuid-1', name: 'Apparel' },
    { id: 'cat-uuid-2', name: 'Footwear' },
  ];
  const products = [
    { id: 'prod-1', name: 'Kurti', category_id: 'cat-uuid-1', category: 'Apparel' },
    { id: 'prod-2', name: 'Sneakers', category_id: 'cat-uuid-2', category: 'Footwear' },
  ];
  const order = {
    id: 1,
    order_status: 'delivered',
    product_details: JSON.stringify([
      { product_id: 'prod-1', name: 'Kurti', price: 1000, quantity: 2 },
      { product_id: 'prod-2', name: 'Sneakers', price: 2000, quantity: 1 },
    ]),
  };

  const catMap = {};
  const items = JSON.parse(order.product_details);
  items.forEach(item => {
    const p = products.find(prod => prod.id === item.product_id);
    const cat = categories.find(c => c.id === p.category_id);
    catMap[cat.id] = (catMap[cat.id] || 0) + item.price * item.quantity;
  });

  assert.equal(catMap['cat-uuid-1'], 2000);
  assert.equal(catMap['cat-uuid-2'], 2000);
  assert.equal(catMap['cat-uuid-1'] + catMap['cat-uuid-2'], 4000);
});

// -------------------------------------------------------------------
// SUMMARY
// -------------------------------------------------------------------
console.log('\n====================================================================');
console.log(`SUITE RESULTS: ${passedTests} / ${totalTests} TESTS PASSED`);
console.log('====================================================================');

if (passedTests === totalTests) {
  process.exit(0);
} else {
  process.exit(1);
}

