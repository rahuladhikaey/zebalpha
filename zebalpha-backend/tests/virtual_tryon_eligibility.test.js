/**
 * ZEBALPHA — VIRTUAL TRY-ON (VTO) BACKEND ELIGIBILITY TEST SUITE
 */
import { evaluateProductTryOnEligibility } from '../src/services/vto/tryOnEligibility.js';

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
console.log('ZEBALPHA BACKEND VTO ELIGIBILITY TEST SUITE');
console.log('================================================================\n');

// 1. Supported Apparel Categories
{
  const tShirt = {
    name: 'Oversized Cotton Tee',
    specifications: { product_type: 't_shirts' }
  };
  const res = evaluateProductTryOnEligibility(tShirt);
  assert(res.isEligible && res.categoryType === 'upper_body', 'Test 1: T-shirt is eligible (upper_body)');
}

{
  const jeans = {
    name: 'Slim Fit Blue Jeans',
    specifications: { product_type: 'jeans_men' }
  };
  const res = evaluateProductTryOnEligibility(jeans);
  assert(res.isEligible && res.categoryType === 'lower_body', 'Test 2: Jeans are eligible (lower_body)');
}

{
  const dress = {
    name: 'Evening Maxi Dress',
    specifications: { product_type: 'dresses_women' }
  };
  const res = evaluateProductTryOnEligibility(dress);
  assert(res.isEligible && res.categoryType === 'dresses', 'Test 3: Dress is eligible (dresses)');
}

{
  const kurti = {
    name: 'Anarkali Kurti Suit',
    specifications: { product_type: 'kurtis' }
  };
  const res = evaluateProductTryOnEligibility(kurti);
  assert(res.isEligible && res.categoryType === 'dresses', 'Test 4: Kurti is eligible (dresses)');
}

// 2. Restricted Intimate Apparel (Strict Rejection)
{
  const bra = {
    name: 'Padded Underwire Bra',
    specifications: { product_type: 'bras' }
  };
  const res = evaluateProductTryOnEligibility(bra);
  assert(!res.isEligible && res.isRestrictedIntimate, 'Test 5: Bra is strictly restricted');
}

{
  const panties = {
    name: 'Cotton Hipster Panties',
    specifications: { product_type: 'panties' }
  };
  const res = evaluateProductTryOnEligibility(panties);
  assert(!res.isEligible && res.isRestrictedIntimate, 'Test 6: Panties are strictly restricted');
}

{
  const thong = {
    name: 'Lace Thong Underwear',
    specifications: { product_type: 'thongs' }
  };
  const res = evaluateProductTryOnEligibility(thong);
  assert(!res.isEligible && res.isRestrictedIntimate, 'Test 7: Thong is strictly restricted');
}

{
  const lingerie = {
    name: 'Satin Lingerie Nightwear Set',
    specifications: { product_type: 'lingerie' }
  };
  const res = evaluateProductTryOnEligibility(lingerie);
  assert(!res.isEligible && res.isRestrictedIntimate, 'Test 8: Lingerie is strictly restricted');
}

// 3. Admin Overrides
{
  const braWithAdmin = {
    name: 'Silk Bralette',
    is_vto_enabled: true
  };
  const res = evaluateProductTryOnEligibility(braWithAdmin);
  assert(!res.isEligible && res.isRestrictedIntimate, 'Test 9: Admin flag CANNOT override intimate restriction');
}

{
  const regularWithDisabled = {
    name: 'Classic White Shirt',
    is_vto_enabled: false
  };
  const res = evaluateProductTryOnEligibility(regularWithDisabled);
  assert(!res.isEligible && res.detectedCategory === 'admin_disabled', 'Test 10: Admin can disable regular apparel');
}

// 4. Non-Apparel and Indeterminate
{
  const bottle = {
    name: 'Insulated Water Bottle',
    main_category: 'Home & Kitchen'
  };
  const res = evaluateProductTryOnEligibility(bottle);
  assert(!res.isEligible && res.detectedCategory === 'non_apparel', 'Test 11: Non-apparel water bottle excluded');
}

{
  const indeterminate = {
    name: 'Artisan Crafted Ceramic Object #782',
    category_id: null,
    specifications: {}
  };
  const res = evaluateProductTryOnEligibility(indeterminate);
  assert(!res.isEligible && res.detectedCategory === 'indeterminate', 'Test 12: Missing category disabled until reviewed');
}

// 5. Variant Inheritance
{
  const parent = {
    name: 'Premium Street Hoodie',
    packages: [
      { id: 'v1', color: 'Black', is_vto_enabled: true },
      { id: 'v2', color: 'Red', is_vto_enabled: false }
    ]
  };
  const resV1 = evaluateProductTryOnEligibility(parent, parent.packages[0]);
  const resV2 = evaluateProductTryOnEligibility(parent, parent.packages[1]);
  assert(resV1.isEligible, 'Test 13: Variant 1 inherits eligibility');
  assert(!resV2.isEligible && resV2.detectedCategory === 'variant_restricted', 'Test 14: Variant 2 stricter restriction enforced');
}

console.log('\n================================================================');
console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
console.log('================================================================');

if (failed > 0) {
  process.exit(1);
} else {
  console.log('\x1b[32mALL BACKEND VTO ELIGIBILITY TESTS PASSED!\x1b[0m\n');
  process.exit(0);
}
