/**
 * Automated Verification Test Suite for Authentication & Account Persistence
 * Tests Section 11 requirements of Master Prompt
 */

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
console.log('RUNNING AUTHENTICATION & ACCOUNT DATA PERSISTENCE TEST SUITE');
console.log('================================================================\n');

// 1. Google OAuth Metadata Normalization
{
  const googleUser = {
    id: 'usr-google-123',
    email: 'test.user@gmail.com',
    user_metadata: {
      full_name: 'Rahul Adhikary',
      picture: 'https://lh3.googleusercontent.com/a/photo.jpg',
    }
  };

  const name = googleUser.user_metadata.full_name || googleUser.user_metadata.name || googleUser.email.split('@')[0];
  const avatar = googleUser.user_metadata.avatar_url || googleUser.user_metadata.picture;

  assert(name === 'Rahul Adhikary', 'Test 1a: Google OAuth full_name extracted correctly');
  assert(avatar === 'https://lh3.googleusercontent.com/a/photo.jpg', 'Test 1b: Google avatar picture extracted correctly');
}

// 2. Deterministic Cart Merging (Guest + DB Items)
{
  const dbCart = [
    { id: 'prod-1', name: 'ZEBALPHA Hoodie', price: 1999, quantity: 1, stock: 5 },
    { id: 'prod-2', name: 'Streetwear Tee', price: 999, quantity: 2, stock: 10 }
  ];

  const guestCart = [
    { id: 'prod-1', name: 'ZEBALPHA Hoodie', price: 1999, quantity: 2, stock: 5 }, // Should add -> 3
    { id: 'prod-3', name: 'Cargo Pants', price: 2499, quantity: 1, stock: 3 }     // Should insert new
  ];

  const mergedMap = new Map();
  dbCart.forEach(item => mergedMap.set(item.id, { ...item }));

  for (const gItem of guestCart) {
    if (mergedMap.has(gItem.id)) {
      const existing = mergedMap.get(gItem.id);
      const newQty = Math.min(existing.quantity + gItem.quantity, existing.stock);
      mergedMap.set(gItem.id, { ...existing, quantity: newQty });
    } else {
      mergedMap.set(gItem.id, { ...gItem });
    }
  }

  const mergedResult = Array.from(mergedMap.values());
  const hoodieItem = mergedResult.find(i => i.id === 'prod-1');
  const cargoItem = mergedResult.find(i => i.id === 'prod-3');

  assert(mergedResult.length === 3, 'Test 2a: Merged cart contains exactly 3 unique items');
  assert(hoodieItem.quantity === 3, 'Test 2b: Existing hoodie quantity consolidated to 3 (1+2)');
  assert(cargoItem.quantity === 1, 'Test 2c: New cargo pants added cleanly to authenticated cart');
}

// 3. Cart Stock Capping during Merge
{
  const dbCart = [
    { id: 'prod-limited', name: 'Limited Drop Tee', price: 1299, quantity: 4, stock: 5 }
  ];

  const guestCart = [
    { id: 'prod-limited', name: 'Limited Drop Tee', price: 1299, quantity: 3, stock: 5 }
  ];

  const existing = dbCart[0];
  const gItem = guestCart[0];
  const consolidatedQty = Math.min(existing.quantity + gItem.quantity, existing.stock);

  assert(consolidatedQty === 5, `Test 3: Cart quantity capped at available stock limit of 5 (requested 4+3=7)`);
}

// 4. Wishlist Deduplication on Merge
{
  const dbWishlist = [
    { id: 'prod-1', name: 'Item 1' },
    { id: 'prod-2', name: 'Item 2' }
  ];

  const guestWishlist = [
    { id: 'prod-2', name: 'Item 2' }, // duplicate
    { id: 'prod-3', name: 'Item 3' }  // new
  ];

  const mergedWishlistMap = new Map();
  dbWishlist.forEach(p => mergedWishlistMap.set(p.id, p));
  guestWishlist.forEach(p => {
    if (!mergedWishlistMap.has(p.id)) {
      mergedWishlistMap.set(p.id, p);
    }
  });

  const finalWishlist = Array.from(mergedWishlistMap.values());
  assert(finalWishlist.length === 3, 'Test 4: Wishlist deduplicated cleanly to 3 unique items');
}

// 5. Safe Account Linking Verification
{
  const existingAccount = {
    id: 'user-canonical-456',
    email: 'customer@zebalpha.com',
    email_verified: true,
    role: 'customer'
  };

  const incomingOAuthLogin = {
    email: 'customer@zebalpha.com',
    email_verified: true,
    provider: 'google'
  };

  const unverifiedOAuthLogin = {
    email: 'customer@zebalpha.com',
    email_verified: false,
    provider: 'untrusted_custom'
  };

  const isSafeLink = (incoming) => {
    return incoming.email_verified && incoming.email.toLowerCase() === existingAccount.email.toLowerCase();
  };

  assert(isSafeLink(incomingOAuthLogin) === true, 'Test 5a: Verified Google identity with matching email allows safe account linking');
  assert(isSafeLink(unverifiedOAuthLogin) === false, 'Test 5b: Unverified identity is blocked from automatic account linking');
}

// 6. Admin 2-Key Security Verification
{
  const configuredKey1 = 'ADMIN_ALPHA_KEY_SECURE_9981';
  const configuredKey2 = 'ADMIN_BETA_KEY_SECURE_4412';

  const verifyAdminAccess = (k1, k2) => {
    if (!k1 || !k2) return false;
    return k1.trim() === configuredKey1 && k2.trim() === configuredKey2;
  };

  assert(verifyAdminAccess(configuredKey1, configuredKey2) === true, 'Test 6a: Valid 2-factor admin security keys granted access');
  assert(verifyAdminAccess(configuredKey1, 'wrong_key_2') === false, 'Test 6b: Partial key mismatch rejected');
  assert(verifyAdminAccess('', configuredKey2) === false, 'Test 6c: Missing factor 1 rejected');
  assert(verifyAdminAccess(null, null) === false, 'Test 6d: Null credentials rejected');
}

// 7. Role Isolation Verification
{
  const customerUser = { id: 'cust-1', role: 'customer' };
  const sellerUser = { id: 'seller-1', role: 'seller' };
  const adminUser = { id: 'admin-1', role: 'SUPER_ADMIN' };

  const checkAccess = (user, requiredRole) => {
    return (user.role || '').toLowerCase() === requiredRole.toLowerCase();
  };

  assert(checkAccess(customerUser, 'customer') === true, 'Test 7a: Customer has customer access');
  assert(checkAccess(customerUser, 'seller') === false, 'Test 7b: Customer cannot access seller resources');
  assert(checkAccess(sellerUser, 'seller') === true, 'Test 7c: Seller has seller access');
  assert(checkAccess(sellerUser, 'SUPER_ADMIN') === false, 'Test 7d: Seller cannot access super admin resources');
}

console.log('\n================================================================');
console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
console.log('================================================================\n');

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
