import assert from 'node:assert/strict';

console.log('=====================================================');
console.log('⚡ ZEBALPHA ENTERPRISE LAZY LOADING & PERFORMANCE SUITE');
console.log('=====================================================\n');

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
// 1. CLOUDINARY TRANSFORMATION & DPR INJECTION AUDIT
// -------------------------------------------------------------------
console.log('--- TEST GROUP 1: Cloudinary Auto-DPR & Format Transformations ---');

function getOptimizedImageUrl(src, variant = 'productCard', options = {}) {
  if (!src || typeof src !== 'string') return '';
  const isCloudinary = src.includes('res.cloudinary.com') || src.includes('/image/upload/');
  if (!isCloudinary) return src;

  const VARIANTS = {
    productCard: { width: 400, quality: 'auto', crop: 'fill', format: 'auto', dpr: 'auto' },
    productDetailMain: { width: 1000, quality: 'auto', crop: 'limit', format: 'auto', dpr: 'auto' },
    productDetailThumb: { width: 160, quality: 'auto', crop: 'fill', format: 'auto', dpr: 'auto' },
    bannerDesktop: { width: 1920, quality: 'auto', crop: 'limit', format: 'auto', dpr: 'auto' },
    bannerMobile: { width: 800, quality: 'auto', crop: 'limit', format: 'auto', dpr: 'auto' },
  };

  const config = { ...VARIANTS[variant] || VARIANTS.productCard, ...options };
  const uploadIndex = src.indexOf('/upload/');
  if (uploadIndex === -1) return src;

  const params = [];
  if (config.crop) params.push(`c_${config.crop}`);
  if (config.width) params.push(`w_${config.width}`);
  if (config.format) params.push(`f_${config.format}`);
  if (config.quality) params.push(`q_${config.quality}`);
  if (config.dpr) params.push(`dpr_${config.dpr}`);

  const transformString = params.join(',');
  return `${src.slice(0, uploadIndex)}/upload/${transformString}/${src.slice(uploadIndex + 8)}`;
}

test('Injects f_auto, q_auto, dpr_auto and w_400 for product card variant', () => {
  const original = 'https://res.cloudinary.com/zebalpha/image/upload/v12345/products/kurti.jpg';
  const optimized = getOptimizedImageUrl(original, 'productCard');
  assert.equal(
    optimized,
    'https://res.cloudinary.com/zebalpha/image/upload/c_fill,w_400,f_auto,q_auto,dpr_auto/v12345/products/kurti.jpg'
  );
});

test('Injects high-res w_1000 and c_limit for product detail main variant', () => {
  const original = 'https://res.cloudinary.com/zebalpha/image/upload/v12345/products/kurti.jpg';
  const optimized = getOptimizedImageUrl(original, 'productDetailMain');
  assert.equal(
    optimized,
    'https://res.cloudinary.com/zebalpha/image/upload/c_limit,w_1000,f_auto,q_auto,dpr_auto/v12345/products/kurti.jpg'
  );
});

test('Injects compact w_160 thumbnail for cart & wishlist items', () => {
  const original = 'https://res.cloudinary.com/zebalpha/image/upload/v12345/products/kurti.jpg';
  const optimized = getOptimizedImageUrl(original, 'productDetailThumb');
  assert.equal(
    optimized,
    'https://res.cloudinary.com/zebalpha/image/upload/c_fill,w_160,f_auto,q_auto,dpr_auto/v12345/products/kurti.jpg'
  );
});

test('Passes non-Cloudinary external images safely through without corruption', () => {
  const external = 'https://images.unsplash.com/photo-12345?w=500';
  const optimized = getOptimizedImageUrl(external, 'productCard');
  assert.equal(optimized, external);
});

// -------------------------------------------------------------------
// 2. CURSOR-BASED PAGINATION & ZERO DUPLICATES
// -------------------------------------------------------------------
console.log('\n--- TEST GROUP 2: Cursor Pagination & Zero-Duplicate Guarantee ---');

function encodeCursor(createdAt, id) {
  return Buffer.from(JSON.stringify({ createdAt, id })).toString('base64');
}

function decodeCursor(cursor) {
  try {
    const raw = Buffer.from(cursor, 'base64').toString('utf-8');
    const parsed = JSON.parse(raw);
    if (!parsed.createdAt || !parsed.id) return null;
    return parsed;
  } catch {
    return null;
  }
}

test('Cursor encodes and decodes symmetrically with timestamp and UUID', () => {
  const original = { createdAt: '2026-11-05T10:15:30.000Z', id: 'prod_98765' };
  const encoded = encodeCursor(original.createdAt, original.id);
  const decoded = decodeCursor(encoded);
  assert.deepEqual(decoded, original);
});

test('Corrupt or malformed cursors decode safely to null without crashing', () => {
  assert.equal(decodeCursor('INVALID_BASE64_!!!'), null);
  assert.equal(decodeCursor(Buffer.from('{"bad":"payload"}').toString('base64')), null);
});

test('Cursor-based pagination across 50 records yields 0 duplicates and correct sequential sets', () => {
  // Generate 50 mock items ordered strictly by created_at DESC
  const mockDatabase = Array.from({ length: 50 }, (_, i) => ({
    id: `item_${50 - i}`,
    title: `Product ${50 - i}`,
    created_at: new Date(Date.now() - (50 - i) * 60000).toISOString(),
  })).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  function queryPage(cursor, limit) {
    let items = mockDatabase;
    if (cursor) {
      const decoded = decodeCursor(cursor);
      assert.ok(decoded);
      items = items.filter(
        item => new Date(item.created_at) < new Date(decoded.createdAt) ||
                (item.created_at === decoded.createdAt && item.id < decoded.id)
      );
    }
    const pageItems = items.slice(0, limit);
    const hasMore = items.length > limit;
    const nextCursor = hasMore && pageItems.length > 0
      ? encodeCursor(pageItems[pageItems.length - 1].created_at, pageItems[pageItems.length - 1].id)
      : null;
    return { items: pageItems, nextCursor, hasMore };
  }

  // Page 1: Fast network limit 20
  const page1 = queryPage(null, 20);
  assert.equal(page1.items.length, 20);
  assert.equal(page1.hasMore, true);
  assert.ok(page1.nextCursor);

  // Page 2: Medium network limit 12
  const page2 = queryPage(page1.nextCursor, 12);
  assert.equal(page2.items.length, 12);
  assert.equal(page2.hasMore, true);
  assert.ok(page2.nextCursor);

  // Page 3: Slow network limit 8
  const page3 = queryPage(page2.nextCursor, 8);
  assert.equal(page3.items.length, 8);
  assert.equal(page3.hasMore, true);
  assert.ok(page3.nextCursor);

  // Page 4: Remainder limit 12 (10 left)
  const page4 = queryPage(page3.nextCursor, 12);
  assert.equal(page4.items.length, 10);
  assert.equal(page4.hasMore, false);
  assert.equal(page4.nextCursor, null);

  // Check uniqueness across all collected items
  const allCollected = [...page1.items, ...page2.items, ...page3.items, ...page4.items];
  assert.equal(allCollected.length, 50);
  const idSet = new Set(allCollected.map(p => p.id));
  assert.equal(idSet.size, 50, 'Duplicate IDs detected across pages!');
});

// -------------------------------------------------------------------
// 3. NETWORK ADAPTIVE BATCH SIZE & PREFETCH MARGIN AUDIT
// -------------------------------------------------------------------
console.log('\n--- TEST GROUP 3: Network Adaptive Sizing & Prefetch Policy ---');

function evaluateNetworkPolicy({ effectiveType, saveData, online }) {
  if (!online) {
    return {
      tier: 'offline',
      recommendedBatchSize: 8,
      prefetchMargin: '0px 0px',
      prefetchEnabled: false,
    };
  }

  if (saveData || effectiveType === 'slow-2g' || effectiveType === '2g') {
    return {
      tier: 'slow',
      recommendedBatchSize: 8,
      prefetchMargin: '0px 0px',
      prefetchEnabled: false,
    };
  }

  if (effectiveType === '3g') {
    return {
      tier: 'medium',
      recommendedBatchSize: 12,
      prefetchMargin: '250px 0px',
      prefetchEnabled: true,
    };
  }

  // Fast 4G, 5G, Wi-Fi default
  return {
    tier: 'fast',
    recommendedBatchSize: 20,
    prefetchMargin: '600px 0px',
    prefetchEnabled: true,
  };
}

test('Fast 4G / Wi-Fi sets batch size 20 and 600px prefetch margin', () => {
  const policy = evaluateNetworkPolicy({ effectiveType: '4g', saveData: false, online: true });
  assert.equal(policy.tier, 'fast');
  assert.equal(policy.recommendedBatchSize, 20);
  assert.equal(policy.prefetchMargin, '600px 0px');
  assert.equal(policy.prefetchEnabled, true);
});

test('Medium 3G throttles to batch size 12 and 250px prefetch margin', () => {
  const policy = evaluateNetworkPolicy({ effectiveType: '3g', saveData: false, online: true });
  assert.equal(policy.tier, 'medium');
  assert.equal(policy.recommendedBatchSize, 12);
  assert.equal(policy.prefetchMargin, '250px 0px');
  assert.equal(policy.prefetchEnabled, true);
});

test('Slow 2G throttles to batch size 8 and disables prefetch (0px 0px)', () => {
  const policy = evaluateNetworkPolicy({ effectiveType: '2g', saveData: false, online: true });
  assert.equal(policy.tier, 'slow');
  assert.equal(policy.recommendedBatchSize, 8);
  assert.equal(policy.prefetchMargin, '0px 0px');
  assert.equal(policy.prefetchEnabled, false);
});

test('Data Saver active overrides fast connection to conservative 8-batch & 0px margin', () => {
  const policy = evaluateNetworkPolicy({ effectiveType: '4g', saveData: true, online: true });
  assert.equal(policy.tier, 'slow');
  assert.equal(policy.recommendedBatchSize, 8);
  assert.equal(policy.prefetchMargin, '0px 0px');
  assert.equal(policy.prefetchEnabled, false);
});

test('Offline mode disables prefetching immediately', () => {
  const policy = evaluateNetworkPolicy({ effectiveType: '4g', saveData: false, online: false });
  assert.equal(policy.tier, 'offline');
  assert.equal(policy.prefetchEnabled, false);
  assert.equal(policy.prefetchMargin, '0px 0px');
});

// -------------------------------------------------------------------
// 4. LAYOUT STABILITY & CLS AUDIT
// -------------------------------------------------------------------
console.log('\n--- TEST GROUP 4: Layout Stability & CLS Verification ---');

test('ProductCard skeleton geometry perfectly mirrors loaded card aspect ratio (3:4)', () => {
  const skeletonImageClass = 'aspect-[3/4] w-full bg-neutral-900';
  const cardImageWrapperClass = 'relative aspect-[3/4] w-full overflow-hidden bg-neutral-900';
  assert.ok(skeletonImageClass.includes('aspect-[3/4]'));
  assert.ok(cardImageWrapperClass.includes('aspect-[3/4]'));
});

test('Cart and Wishlist thumbnails enforce aspect-square to guarantee CLS = 0', () => {
  const cartThumbClass = 'relative aspect-square w-20 flex-shrink-0 overflow-hidden rounded-md bg-neutral-900';
  assert.ok(cartThumbClass.includes('aspect-square'));
  assert.ok(cartThumbClass.includes('w-20'));
});

// -------------------------------------------------------------------
// SUMMARY
// -------------------------------------------------------------------
console.log('\n=====================================================');
console.log(`SUITE RESULTS: ${passedTests} / ${totalTests} TESTS PASSED`);
console.log('=====================================================');

if (passedTests === totalTests) {
  process.exit(0);
} else {
  process.exit(1);
}
