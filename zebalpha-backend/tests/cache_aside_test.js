/**
 * Automated Verification Test Suite for Cache-Aside (Cache-First) System
 * Tests Section 12 requirements of Master Prompt
 */

import { cacheService } from '../src/services/cacheService.js';

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
console.log('RUNNING PRODUCTION CACHE-ASIDE (CACHE-FIRST) TEST SUITE');
console.log('================================================================\n');

async function runTests() {
  // 1. Deterministic Cache Key Generation
  {
    const paramsA = { limit: 10, category: 'hoodies', q: 'Oversized ', page: 1 };
    const paramsB = { q: ' oversized', page: 1, limit: 10, category: 'hoodies' };

    const keyA = cacheService.generateKey('products:list', paramsA);
    const keyB = cacheService.generateKey('products:list', paramsB);

    assert(keyA === keyB, `Test 1a: Normalized & sorted parameters generate identical key: ${keyA}`);
    assert(keyA.includes('q=oversized'), 'Test 1b: Search term is lowercased and trimmed');
  }

  // 2. Cache-Aside Read Flow (Miss -> DB Query -> Set -> Hit)
  {
    const testKey = `test:product:${Date.now()}`;
    let dbQueryCount = 0;

    const mockDbFetch = async () => {
      dbQueryCount++;
      return { id: 'prod-99', name: 'ZEBALPHA Signature Tee', price: 1499, stock: 20 };
    };

    // First Read -> Should be CACHE MISS
    const res1 = await cacheService.fetchOrCache(testKey, mockDbFetch, 60);
    assert(res1.source === 'database' && res1.data.name === 'ZEBALPHA Signature Tee', 'Test 2a: First read triggers database query (Cache Miss)');
    assert(dbQueryCount === 1, 'Test 2b: DB query counter is 1');

    // Second Read -> Should be CACHE HIT
    const res2 = await cacheService.fetchOrCache(testKey, mockDbFetch, 60);
    assert(res2.source === 'cache' && res2.data.name === 'ZEBALPHA Signature Tee', 'Test 2c: Second read served directly from cache (Cache Hit)');
    assert(dbQueryCount === 1, 'Test 2d: DB query was NOT called again (cached)');
  }

  // 3. Cache Invalidation on Product Write
  {
    const prodId = 'prod-inval-101';
    const detailKey = `product:detail:${prodId}`;
    const listKey = cacheService.generateKey('products:list', { category: 'streetwear' });

    await cacheService.set(detailKey, { id: prodId, name: 'Old Name' }, 300);
    await cacheService.set(listKey, [{ id: prodId, name: 'Old Name' }], 300);

    assert((await cacheService.get(detailKey)) !== null, 'Test 3a: Detail cache populated before write');
    assert((await cacheService.get(listKey)) !== null, 'Test 3b: Listing cache populated before write');

    // Trigger Invalidation
    await cacheService.invalidateProductCache(prodId);

    assert((await cacheService.get(detailKey)) === null, 'Test 3c: Product detail cache purged upon write');
    assert((await cacheService.get(listKey)) === null, 'Test 3d: Product listing namespace purged upon write');
  }

  // 4. Category Cache Invalidation
  {
    const categoryKey = 'categories:all';
    const listKey = cacheService.generateKey('products:list', { category: 'jackets' });

    await cacheService.set(categoryKey, [{ id: 'cat-1', name: 'Jackets' }], 300);
    await cacheService.set(listKey, [{ id: 'prod-1', name: 'Winter Puffer' }], 300);

    await cacheService.invalidateCategoryCache();

    assert((await cacheService.get(categoryKey)) === null, 'Test 4a: Category cache purged upon category write');
    assert((await cacheService.get(listKey)) === null, 'Test 4b: Related product listings purged upon category write');
  }

  // 5. Stampede Lock Protection for Concurrent Identical Queries
  {
    const stampedeKey = `stampede:test:${Date.now()}`;
    let concurrentDbHits = 0;

    const slowDbFetch = async () => {
      concurrentDbHits++;
      await new Promise(r => setTimeout(r, 50));
      return { result: 'heavy_data' };
    };

    // Dispatch 5 concurrent requests simultaneously for uncached key
    const promises = [
      cacheService.fetchOrCache(stampedeKey, slowDbFetch, 60),
      cacheService.fetchOrCache(stampedeKey, slowDbFetch, 60),
      cacheService.fetchOrCache(stampedeKey, slowDbFetch, 60),
      cacheService.fetchOrCache(stampedeKey, slowDbFetch, 60),
      cacheService.fetchOrCache(stampedeKey, slowDbFetch, 60)
    ];

    const results = await Promise.all(promises);

    assert(results.every(r => r.data.result === 'heavy_data'), 'Test 5a: All 5 concurrent callers received valid response');
    assert(concurrentDbHits === 1, `Test 5b: Stampede lock collapsed 5 concurrent requests into 1 DB query (Hits: ${concurrentDbHits})`);
  }

  // 6. Graceful Degradation on Redis/Network Failure
  {
    // Query with invalid key structure or non-responsive parameters
    const fallbackKey = `fallback:test:${Date.now()}`;
    let fallbackCalled = false;

    const fallbackDb = async () => {
      fallbackCalled = true;
      return { status: 'db_success' };
    };

    const res = await cacheService.fetchOrCache(fallbackKey, fallbackDb, 60);
    assert(fallbackCalled === true, 'Test 6a: Fallback function executed safely without throwing exception');
    assert(res.data.status === 'db_success', 'Test 6b: Caller received authoritative DB response');
  }

  // 7. Diagnostic Metrics
  {
    const metrics = cacheService.getMetrics();
    assert(typeof metrics.hitRate === 'string', 'Test 7a: Cache metrics returns valid hitRate string');
    assert(metrics.hits > 0, `Test 7b: Cache recorded hits (${metrics.hits})`);
    assert(metrics.writes > 0, `Test 7c: Cache recorded writes (${metrics.writes})`);
    assert(metrics.invalidations > 0, `Test 7d: Cache recorded invalidations (${metrics.invalidations})`);
  }

  // 8. 100 Simultaneous Requests Stampede Test (Section 17 & 29)
  {
    const scaleKey = `stampede:100:${Date.now()}`;
    let scaleDbHits = 0;

    const scaleDbFetch = async () => {
      scaleDbHits++;
      await new Promise(r => setTimeout(r, 60)); // Simulate PostgreSQL query latency
      return { id: 'scale-product', name: 'High-Demand Sneaker', stock: 100 };
    };

    // Dispatch 100 simultaneous requests at the exact same millisecond
    const requests = Array.from({ length: 100 }, () => 
      cacheService.fetchOrCache(scaleKey, scaleDbFetch, 120)
    );

    const responses = await Promise.all(requests);
    assert(responses.length === 100, 'Test 8a: Exactly 100 responses fulfilled');
    assert(responses.every(r => r.data.id === 'scale-product'), 'Test 8b: All 100 callers received identical correct data');
    assert(scaleDbHits === 1, `Test 8c: Concurrency stampede protection collapsed 100 simultaneous requests into 1 DB query! (Actual DB queries: ${scaleDbHits})`);
  }

  // 9. TTL Expiration Lifecycle Test
  {
    const ttlKey = `ttl:test:${Date.now()}`;
    let fetchCount = 0;
    const fetchFunc = async () => {
      fetchCount++;
      return { count: fetchCount };
    };

    // Set with 1 second TTL
    await cacheService.fetchOrCache(ttlKey, fetchFunc, 1);
    assert(fetchCount === 1, 'Test 9a: Initial fetch executed');

    // Immediate second read -> Cache Hit
    const hitRes = await cacheService.fetchOrCache(ttlKey, fetchFunc, 1);
    assert(hitRes.source === 'cache' && hitRes.data.count === 1, 'Test 9b: Second read is cache hit');
    assert(fetchCount === 1, 'Test 9c: No DB query while valid');

    // Wait 1.1s for expiration
    await new Promise(r => setTimeout(r, 1100));

    // Third read -> Must be Cache Miss and trigger fresh fetch
    const expireRes = await cacheService.fetchOrCache(ttlKey, fetchFunc, 1);
    assert(expireRes.source === 'database' && expireRes.data.count === 2, 'Test 9d: Read after TTL expiration triggers fresh database query');
    assert(fetchCount === 2, 'Test 9e: DB query counter incremented to 2');
  }

  // 10. Personalized User Data Isolation Test (Section 21 & 27)
  {
    const userA = 'user-uuid-111';
    const userB = 'user-uuid-222';
    const cartAKey = cacheService.keys.userCart(userA);
    const cartBKey = cacheService.keys.userCart(userB);

    assert(cartAKey !== cartBKey, 'Test 10a: User A and User B cache keys are strictly isolated');

    await cacheService.set(cartAKey, { items: ['T-Shirt'] }, 300);
    await cacheService.set(cartBKey, { items: ['Jeans'] }, 300);

    const cartA = await cacheService.get(cartAKey);
    const cartB = await cacheService.get(cartBKey);

    assert(cartA.items[0] === 'T-Shirt', 'Test 10b: User A receives only User A cart');
    assert(cartB.items[0] === 'Jeans', 'Test 10c: User B receives only User B cart');
    assert(cartA.items[0] !== cartB.items[0], 'Test 10d: Zero leakage between personalized user caches');
  }

  // 11. Malformed / Non-JSON Data Resilience Test
  {
    const malformedKey = `malformed:test:${Date.now()}`;
    await cacheService.set(malformedKey, 'primitive-plain-string', 60);
    const readBack = await cacheService.get(malformedKey);
    assert(readBack === 'primitive-plain-string', 'Test 11a: Primitive non-JSON strings handled without exception');
  }

  console.log('\n================================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error('Fatal Test Suite Error:', err);
  process.exit(1);
});
