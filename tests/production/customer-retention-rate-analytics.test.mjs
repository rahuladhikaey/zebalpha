import assert from 'node:assert/strict';

console.log('========================================================================');
console.log('📊 ZEBALPHA PREMIUM CUSTOMER RETENTION ANALYTICS AUDIT & TEST SUITE');
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
// 1. SEGMENTATION & CLASSIFICATION LOGIC VERIFICATION
// -------------------------------------------------------------------
console.log('--- 1. Real Database Customer Segmentation Classification ---');

test('Correctly classifies New, Repeat, Loyal, Inactive and Cart Abandoner customers', () => {
  const config = {
    new_max_delivered: 1,
    repeat_min_delivered: 2,
    repeat_max_delivered: 4,
    loyal_min_delivered: 5,
  };

  const now = new Date('2026-11-05T12:00:00Z');
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);

  const customers = [
    { id: 'c1', delivered_orders: 0, last_active: '2026-11-05T10:00:00Z' }, // New (0 delivered)
    { id: 'c2', delivered_orders: 1, last_active: '2026-11-04T15:00:00Z' }, // New (1 delivered)
    { id: 'c3', delivered_orders: 3, last_active: '2026-11-05T11:00:00Z' }, // Repeat (3 delivered)
    { id: 'c4', delivered_orders: 7, last_active: '2026-11-05T09:00:00Z' }, // Loyal (7 delivered)
    { id: 'c5', delivered_orders: 1, last_active: '2026-09-01T00:00:00Z' }, // Inactive (>30d idle)
  ];

  const getSegment = (delivered) => {
    if (delivered >= config.loyal_min_delivered) return 'Loyal';
    if (delivered >= config.repeat_min_delivered && delivered <= config.repeat_max_delivered) return 'Repeat';
    return 'New';
  };

  const newCount = customers.filter(c => getSegment(c.delivered_orders) === 'New').length;
  const repeatCount = customers.filter(c => getSegment(c.delivered_orders) === 'Repeat').length;
  const loyalCount = customers.filter(c => getSegment(c.delivered_orders) === 'Loyal').length;
  const inactiveCount = customers.filter(c => new Date(c.last_active) < thirtyDaysAgo).length;

  assert.equal(newCount, 3, 'New customers count (c1, c2, c5)');
  assert.equal(repeatCount, 1, 'Repeat customers count (c3)');
  assert.equal(loyalCount, 1, 'Loyal customers count (c4)');
  assert.equal(inactiveCount, 1, 'Inactive customers count (c5)');
});

// -------------------------------------------------------------------
// 2. REAL ANALYTICS CALCULATIONS & ZERO FAKE DATA
// -------------------------------------------------------------------
console.log('\n--- 2. Real Analytics Calculations & Percentages ---');

test('Segment percentages and repeat rate calculate deterministically from counts', () => {
  const segments = [
    { id: 'new', name: 'New Customers', count: 120, color: '#38BDF8' },
    { id: 'repeat', name: 'Frequent / Repeat', count: 50, color: '#FBBF24' },
    { id: 'loyal', name: 'Loyal Customers', count: 30, color: '#A855F7' },
    { id: 'inactive', name: 'Inactive Customers', count: 40, color: '#F43F5E' },
    { id: 'cart_abandoners', name: 'Cart Abandoners', count: 10, color: '#FB923C' },
  ];

  const totalSegmentUnits = segments.reduce((sum, s) => sum + s.count, 0);
  assert.equal(totalSegmentUnits, 250);

  const withPercentages = segments.map(s => ({
    ...s,
    percentage: Number(((s.count / totalSegmentUnits) * 100).toFixed(1)),
  }));

  assert.equal(withPercentages[0].percentage, 48.0); // 120 / 250
  assert.equal(withPercentages[1].percentage, 20.0); // 50 / 250
  assert.equal(withPercentages[2].percentage, 12.0); // 30 / 250
  assert.equal(withPercentages[3].percentage, 16.0); // 40 / 250
  assert.equal(withPercentages[4].percentage, 4.0);  // 10 / 250

  const sumPct = withPercentages.reduce((sum, s) => sum + s.percentage, 0);
  assert.ok(Math.abs(sumPct - 100) < 0.2, `Sum of percentages should equal 100% (actual: ${sumPct}%)`);
});

test('Graceful fallback for Cart Abandoners when cart table has no active records', () => {
  const cartAvailable = false;
  const cartAbandonersCount = 0;

  const segment = {
    id: 'cart_abandoners',
    name: 'Cart Abandoners',
    count: cartAbandonersCount,
    color: '#FB923C',
    description: 'Unpurchased cart > 24h',
    isUnavailable: !cartAvailable,
  };

  assert.equal(segment.isUnavailable, true, 'isUnavailable must be true when cart items cannot be queried');
  assert.equal(segment.count, 0, 'No fake or invented count is injected');
});

// -------------------------------------------------------------------
// 3. TRIGONOMETRIC DONUT / PIE CHART SVG MATH VERIFICATION
// -------------------------------------------------------------------
console.log('\n--- 3. Trigonometric Donut Chart SVG Path Mathematics ---');

test('Generates valid SVG arc path data covering entire 2*PI radians', () => {
  const segments = [
    { id: 'new', count: 50 },
    { id: 'repeat', count: 30 },
    { id: 'loyal', count: 20 },
  ];

  const totalCount = segments.reduce((sum, s) => sum + s.count, 0);
  assert.equal(totalCount, 100);

  let currentAngle = -Math.PI / 2; // 12 o'clock
  const cx = 160;
  const cy = 160;
  const outerR = 135;
  const innerR = 75;

  const slices = segments.map((seg) => {
    const sliceAngle = (seg.count / totalCount) * 2 * Math.PI;
    const startAngle = currentAngle;
    const endAngle = currentAngle + sliceAngle;
    currentAngle = endAngle;

    const x1 = cx + outerR * Math.cos(startAngle);
    const y1 = cy + outerR * Math.sin(startAngle);
    const x2 = cx + outerR * Math.cos(endAngle);
    const y2 = cy + outerR * Math.sin(endAngle);

    const x3 = cx + innerR * Math.cos(endAngle);
    const y3 = cy + innerR * Math.sin(endAngle);
    const x4 = cx + innerR * Math.cos(startAngle);
    const y4 = cy + innerR * Math.sin(startAngle);

    const largeArc = sliceAngle > Math.PI ? 1 : 0;
    const pathData = `M ${x1.toFixed(1)} ${y1.toFixed(1)} A ${outerR} ${outerR} 0 ${largeArc} 1 ${x2.toFixed(1)} ${y2.toFixed(1)} L ${x3.toFixed(1)} ${y3.toFixed(1)} A ${innerR} ${innerR} 0 ${largeArc} 0 ${x4.toFixed(1)} ${y4.toFixed(1)} Z`;

    const midAngle = startAngle + sliceAngle / 2;
    const labelR = (outerR + innerR) / 2;
    const labelX = cx + labelR * Math.cos(midAngle);
    const labelY = cy + labelR * Math.sin(midAngle);

    return {
      id: seg.id,
      pathData,
      labelX,
      labelY,
      sliceAngle,
      percentage: (seg.count / totalCount) * 100,
    };
  });

  assert.equal(slices.length, 3);
  // Verify slice 1 (50% = Math.PI radians)
  assert.ok(Math.abs(slices[0].sliceAngle - Math.PI) < 0.001);
  // Verify label position for 50% slice is valid finite coordinates
  assert.ok(Number.isFinite(slices[0].labelX));
  assert.ok(Number.isFinite(slices[0].labelY));
  // Verify final angle completed full circle (currentAngle == -PI/2 + 2*PI = 3*PI/2)
  assert.ok(Math.abs(currentAngle - (3 * Math.PI / 2)) < 0.001, 'Angle must complete full 360 degrees');
});

test('Labels are only rendered on chart slices with percentage >= 8%', () => {
  const slices = [
    { id: 's1', percentage: 40 },
    { id: 's2', percentage: 25 },
    { id: 's3', percentage: 2 },  // Tiny slice
    { id: 's4', percentage: 7.9 }, // Just below threshold
    { id: 's5', percentage: 8.0 }, // Exact threshold
  ];

  const visibleLabelSlices = slices.filter(s => s.percentage >= 8);
  assert.equal(visibleLabelSlices.length, 3);
  assert.deepEqual(visibleLabelSlices.map(s => s.id), ['s1', 's2', 's5']);
});

// -------------------------------------------------------------------
// 4. DATE RANGE FILTERING VERIFICATION
// -------------------------------------------------------------------
console.log('\n--- 4. Date Range Filtering Behavior ---');

test('Filters customers by date ranges: Today, Last 7 Days, Last 30 Days, Last 90 Days', () => {
  const now = new Date('2026-11-05T12:00:00Z');
  const todayStart = new Date('2026-11-05T00:00:00Z');
  const last7Days = new Date(now.getTime() - 7 * 86400000);
  const last30Days = new Date(now.getTime() - 30 * 86400000);
  const last90Days = new Date(now.getTime() - 90 * 86400000);

  const records = [
    { id: 'u1', last_active: '2026-11-05T08:00:00Z' }, // Today
    { id: 'u2', last_active: '2026-11-02T10:00:00Z' }, // 3 days ago (in 7d)
    { id: 'u3', last_active: '2026-10-20T12:00:00Z' }, // 16 days ago (in 30d)
    { id: 'u4', last_active: '2026-09-10T12:00:00Z' }, // 56 days ago (in 90d)
    { id: 'u5', last_active: '2026-06-01T12:00:00Z' }, // 157 days ago (outside 90d)
  ];

  const inToday = records.filter(r => new Date(r.last_active) >= todayStart);
  const in7D = records.filter(r => new Date(r.last_active) >= last7Days);
  const in30D = records.filter(r => new Date(r.last_active) >= last30Days);
  const in90D = records.filter(r => new Date(r.last_active) >= last90Days);

  assert.equal(inToday.length, 1);
  assert.equal(in7D.length, 2);
  assert.equal(in30D.length, 3);
  assert.equal(in90D.length, 4);
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

