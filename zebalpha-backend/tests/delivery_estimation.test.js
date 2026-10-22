/**
 * ZEBALPHA — REAL DYNAMIC DELIVERY ESTIMATION TEST SUITE (ZERO HARDCODED DATA)
 */
import { calculateDeliveryEstimate } from '../src/services/shiprocket.js';

let passed = 0;
let failed = 0;

function assert(condition, testName, details = '') {
  if (condition) {
    console.log(`\x1b[32m[PASS]\x1b[0m ${testName}`);
    passed++;
  } else {
    console.error(`\x1b[31m[FAIL]\x1b[0m ${testName} ${details ? `— ${details}` : ''}`);
    failed++;
  }
}

console.log('================================================================');
console.log('ZEBALPHA REAL DYNAMIC DELIVERY ESTIMATION TEST SUITE');
console.log('================================================================\n');

// 1. PIN Code Validation Tests
console.log('--- 1. PIN Code Format Validation ---');
const PIN_REGEX = /^[1-9][0-9]{5}$/;

assert(PIN_REGEX.test('700001'), 'Test 1.1: Valid Kolkata PIN 700001 passes');
assert(PIN_REGEX.test('110001'), 'Test 1.2: Valid Delhi PIN 110001 passes');
assert(PIN_REGEX.test('741254'), 'Test 1.3: Valid Nadia PIN 741254 passes');
assert(!PIN_REGEX.test('012345'), 'Test 1.4: PIN starting with 0 is rejected');
assert(!PIN_REGEX.test('12345'), 'Test 1.5: 5-digit PIN is rejected');
assert(!PIN_REGEX.test('1234567'), 'Test 1.6: 7-digit PIN is rejected');
assert(!PIN_REGEX.test('70000A'), 'Test 1.7: Alphanumeric PIN is rejected');
assert(!PIN_REGEX.test(''), 'Test 1.8: Empty PIN is rejected');

// 2. Real Dynamic Date Calculation from Carrier ETD
console.log('\n--- 2. Carrier ETD Dynamic Calculation ---');
{
  const courier = {
    courier_name: 'Xpressbees Air',
    courier_company_id: 33,
    etd: '2026-10-30T00:00:00.000Z',
    estimated_delivery_days: 4,
    rate: 91.72,
    cod_available: true,
  };

  const res = calculateDeliveryEstimate({
    courier,
    dispatchCutoffHour: 16,
    dispatchDays: 0,
    baseDateInput: new Date('2026-10-26T10:00:00+05:30'), // 10:00 AM IST (before cutoff)
  });

  assert(res.has_estimate === true, 'Test 2.1: Has valid estimate');
  assert(res.courier_name === 'Xpressbees Air', 'Test 2.2: Retains verified courier name');
  assert(res.calculation_method === 'CARRIER_ETD', 'Test 2.3: Used genuine CARRIER_ETD method');
  assert(res.day === '30', 'Test 2.4: Dynamic day matches 30');
  assert(res.month === 'Oct', 'Test 2.5: Dynamic month matches Oct');
  assert(res.weekday === 'Fri', 'Test 2.6: Dynamic weekday matches Fri (Oct 30 2026 is Friday)');
  assert(res.display_text === 'Delivery by 30 Oct, Fri', 'Test 2.7: Dynamic display_text is formatted correctly');
}

// 3. Cutoff Time Dispatch Shift (+1 day buffer after 4 PM IST)
console.log('\n--- 3. Cutoff Time Dispatch Buffer ---');
{
  const courier = {
    courier_name: 'Delhivery Surface',
    courier_company_id: 28,
    estimated_delivery_days: 3,
    rate: 65.5,
  };

  // Order placed at 5:30 PM IST (after 16:00 cutoff) on Thursday Oct 22 2026
  const res = calculateDeliveryEstimate({
    courier,
    dispatchCutoffHour: 16,
    dispatchDays: 0,
    baseDateInput: new Date('2026-10-22T17:30:00+05:30'),
  });

  // Base Oct 22 + 1 (cutoff buffer) + 3 (transit days) = Oct 26 2026 (Monday)
  assert(res.has_estimate === true, 'Test 3.1: Has valid estimate after cutoff');
  assert(res.dispatch_buffer_days === 1, 'Test 3.2: Cutoff buffer +1 applied correctly');
  assert(res.day === '26', 'Test 3.3: Correct arrival day Oct 26');
  assert(res.weekday === 'Mon', 'Test 3.4: Correct weekday Mon (Oct 26 2026 is Monday)');
}

// 4. Month Boundary Rollover (October 31 -> November)
console.log('\n--- 4. Month Boundary Transitions ---');
{
  const courier = {
    courier_name: 'BlueDart Express',
    courier_company_id: 12,
    estimated_delivery_days: 3,
    rate: 110.0,
  };

  // Base Oct 30 2026 at 10 AM IST + 3 days = Nov 2 2026 (Monday)
  const res = calculateDeliveryEstimate({
    courier,
    dispatchCutoffHour: 16,
    dispatchDays: 0,
    baseDateInput: new Date('2026-10-30T10:00:00+05:30'),
  });

  assert(res.has_estimate === true, 'Test 4.1: Month rollover calculated correctly');
  assert(res.day === '2', 'Test 4.2: Day rolls over to 2');
  assert(res.month === 'Nov', 'Test 4.3: Month rolls over to Nov');
  assert(res.weekday === 'Mon', 'Test 4.4: Nov 2 2026 is Monday');
}

// 5. Year Boundary Rollover (Dec 30 -> Jan Next Year)
console.log('\n--- 5. Year Boundary Transitions ---');
{
  const courier = {
    courier_name: 'DTDC Priority',
    courier_company_id: 45,
    estimated_delivery_days: 4,
    rate: 85.0,
  };

  // Base Dec 30 2026 at 10 AM IST + 4 days = Jan 3 2027 (Sunday)
  const res = calculateDeliveryEstimate({
    courier,
    dispatchCutoffHour: 16,
    dispatchDays: 0,
    baseDateInput: new Date('2026-12-30T10:00:00+05:30'),
  });

  assert(res.has_estimate === true, 'Test 5.1: Year boundary rollover calculated');
  assert(res.day === '3', 'Test 5.2: Day is 3');
  assert(res.month === 'Jan', 'Test 5.3: Month is Jan');
  assert(res.weekday === 'Sun', 'Test 5.4: Jan 3 2027 is Sunday');
}

// 6. Leap Year Calculation (Feb 27 2028 is a leap year -> Feb 29)
console.log('\n--- 6. Leap Year Transitions ---');
{
  const courier = {
    courier_name: 'Shadowfax Quick',
    courier_company_id: 19,
    estimated_delivery_days: 2,
    rate: 70.0,
  };

  // Base Feb 27 2028 + 2 days = Feb 29 2028 (Tuesday)
  const res = calculateDeliveryEstimate({
    courier,
    dispatchCutoffHour: 16,
    dispatchDays: 0,
    baseDateInput: new Date('2028-02-27T10:00:00+05:30'),
  });

  assert(res.has_estimate === true, 'Test 6.1: Leap year calculated');
  assert(res.day === '29', 'Test 6.2: Leap day Feb 29 correctly reached');
  assert(res.month === 'Feb', 'Test 6.3: Month is Feb');
  assert(res.weekday === 'Tue', 'Test 6.4: Feb 29 2028 is Tuesday');
}

// 7. Missing Transit Data Policy (Truthful Unavailable State)
console.log('\n--- 7. Missing Transit Data (Zero Hardcoding Policy) ---');
{
  const courierWithoutData = {
    courier_name: 'Generic Logistics',
    courier_company_id: 999,
    etd: null,
    estimated_delivery_days: null,
  };

  const res = calculateDeliveryEstimate({
    courier: courierWithoutData,
    baseDateInput: new Date('2026-10-22T12:00:00+05:30'),
  });

  assert(res.has_estimate === false, 'Test 7.1: Returns has_estimate: false when courier lacks transit data');
  assert(res.delivery_date === undefined || res.delivery_date === null, 'Test 7.2: Never invents fake delivery date');
  assert(res.display_text === undefined || res.display_text === null, 'Test 7.3: Never produces fabricated display text');
  assert(typeof res.message === 'string' && res.message.length > 0, 'Test 7.4: Provides truthful unavailable message');
}

// 8. Null Courier Option Handling
console.log('\n--- 8. Null/Empty Courier Handling ---');
{
  const res = calculateDeliveryEstimate({ courier: null });
  assert(res.has_estimate === false, 'Test 8.1: Null courier returns has_estimate: false');
}

console.log('\n================================================================');
console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
console.log('================================================================');

if (failed > 0) {
  process.exit(1);
}
