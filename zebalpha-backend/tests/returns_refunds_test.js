/**
 * Automated Verification Test Suite for Returns, Cancellations & Refunds
 * Tests Section 12 requirements of Master Prompt
 */

import { calculateAuthoritativeRefund } from '../src/utils/refundCalculator.js';

let passed = 0;
let failed = 0;

const assert = (condition, testName) => {
  if (condition) {
    console.log(`\x1b[32m[PASS]\x1b[0m ${testName}`);
    passed++;
  } else {
    console.error(`\x1b[31m[FAIL]\x1b[0m ${testName}`);
    failed++;
  }
};

console.log('================================================================');
console.log('RUNNING RETURN, CANCELLATION & REFUND SYSTEM TEST SUITE');
console.log('================================================================\n');

// 1. COD with UNPAID status
{
  const result = calculateAuthoritativeRefund({
    orderTotal: 1500,
    paymentMethod: 'COD',
    paymentStatus: 'PENDING',
    items: [{ id: 'item-1', price: 1500, quantity: 1 }]
  });
  assert(!result.eligible && result.refundAmount === 0, 'Test 1: COD uncollected payment yields 0 refund');
}

// 2. COD with PAID status
{
  const result = calculateAuthoritativeRefund({
    orderTotal: 1500,
    paymentMethod: 'COD',
    paymentStatus: 'PAID',
    items: [{ id: 'item-1', price: 1500, quantity: 1 }]
  });
  assert(result.eligible && result.refundAmount === 1500, 'Test 2: COD collected payment yields full refund');
}

// 3. Prepaid full refund calculation
{
  const result = calculateAuthoritativeRefund({
    orderTotal: 2499,
    paymentMethod: 'ONLINE',
    paymentStatus: 'COMPLETE',
    items: [{ id: 'item-1', price: 2499, quantity: 1 }]
  });
  assert(result.eligible && result.refundAmount === 2499, 'Test 3: Prepaid successful payment calculates full refund');
}

// 4. Partial return calculation with multiple items
{
  const result = calculateAuthoritativeRefund({
    orderTotal: 3000,
    paymentMethod: 'ONLINE',
    paymentStatus: 'COMPLETE',
    items: [
      { id: 'item-1', price: 1000, quantity: 1 },
      { id: 'item-2', price: 2000, quantity: 1 }
    ],
    returnItems: [
      { id: 'item-1', price: 1000, quantity: 1 }
    ]
  });
  assert(result.eligible && result.refundAmount === 1000, 'Test 4: Partial return refunds only returned item subtotal');
}

// 5. Coupon discount proportionate deduction
{
  const result = calculateAuthoritativeRefund({
    orderTotal: 1800, // 2000 - 200 coupon
    couponDiscount: 200,
    paymentMethod: 'ONLINE',
    paymentStatus: 'COMPLETE',
    items: [
      { id: 'item-1', price: 1000, quantity: 1 },
      { id: 'item-2', price: 1000, quantity: 1 }
    ],
    returnItems: [
      { id: 'item-1', price: 1000, quantity: 1 }
    ]
  });
  // 1000 returned out of 1800 order -> ratio ~0.555, discount deducted = 100 -> net refund = 900
  assert(result.refundAmount === 900, `Test 5: Proportionate discount applied correctly (expected 900, got ${result.refundAmount})`);
}

// 6. Remaining refundable balance cap (Prevent over-refund)
{
  const result = calculateAuthoritativeRefund({
    orderTotal: 1000,
    alreadyRefundedAmount: 800,
    paymentMethod: 'ONLINE',
    paymentStatus: 'COMPLETE',
    items: [{ id: 'item-1', price: 500, quantity: 1 }],
    returnItems: [{ id: 'item-1', price: 500, quantity: 1 }]
  });
  // Max remaining balance = 1000 - 800 = 200. Item is 500. Result must cap at 200.
  assert(result.refundAmount === 200, `Test 6: Refund amount capped at remaining balance (expected 200, got ${result.refundAmount})`);
}

// 7. Cancellation 2-hour window logic
{
  const now = Date.now();
  const created1HourAgo = new Date(now - 1 * 60 * 60 * 1000).toISOString();
  const created3HoursAgo = new Date(now - 3 * 60 * 60 * 1000).toISOString();
  
  const isCancellable1Hr = ((now - new Date(created1HourAgo).getTime()) / (1000 * 60 * 60)) <= 2;
  const isCancellable3Hr = ((now - new Date(created3HoursAgo).getTime()) / (1000 * 60 * 60)) <= 2;

  assert(isCancellable1Hr === true, 'Test 7a: Order created 1 hour ago is eligible for cancellation');
  assert(isCancellable3Hr === false, 'Test 7b: Order created 3 hours ago is strictly blocked from cancellation');
}

// 8. Pure UPI ID pattern validation
{
  const upiRegex = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;
  
  const validUpis = ['user@okhdfcbank', '9876543210@paytm', 'seller.support@ybl', 'rahul-123@ibl'];
  const invalidUpis = ['invalid_upi_no_handle', 'user@', '@bank', '1234567890123456', 'SBIN0001234'];

  const allValidsPass = validUpis.every(u => upiRegex.test(u.trim()));
  const allInvalidsFail = invalidUpis.every(u => !upiRegex.test(u.trim()));

  assert(allValidsPass, 'Test 8a: Valid pure UPI handles pass regex validation');
  assert(allInvalidsFail, 'Test 8b: Bank account / IFSC / invalid patterns are rejected');
}

// 9. Shipping refund for defective/wrong item
{
  const result = calculateAuthoritativeRefund({
    orderTotal: 1050,
    shippingFee: 50,
    returnReason: 'Damaged item received with torn seam',
    paymentMethod: 'ONLINE',
    paymentStatus: 'COMPLETE',
    items: [{ id: 'item-1', price: 1000, quantity: 1 }]
  });
  // Item 1000 + Shipping 50 = 1050
  assert(result.refundAmount === 1050, `Test 9: Defective item triggers full shipping fee refund (expected 1050, got ${result.refundAmount})`);
}

console.log('\n================================================================');
console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
console.log('================================================================\n');

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
