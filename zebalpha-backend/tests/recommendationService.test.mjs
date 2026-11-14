import test from "node:test";
import assert from "node:assert/strict";
import {
  isEligibleProduct,
  formatCard,
  rankBackendRecommendations,
  sanitizeUuid,
  sanitizeSessionId,
  normalizePlatform,
} from "../src/services/recommendationScoring.js";

const VALID_PRODUCT = {
  id: "11111111-1111-4111-8111-111111111111",
  seller_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  category_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  name: "Heavyweight Street Hoodie",
  price: 1299,
  mrp: 1999,
  image_url: "https://res.cloudinary.com/demo/image/upload/hoodie.jpg",
  images: ["https://res.cloudinary.com/demo/image/upload/hoodie.jpg"],
  stock: 15,
  is_active: true,
  is_approved: true,
  approval_status: "approved",
  status: "AVAILABLE",
};

test("isEligibleProduct allows valid active approved in-stock product with active seller", () => {
  const sellerMap = new Map([
    [
      VALID_PRODUCT.seller_id,
      { id: VALID_PRODUCT.seller_id, status: "approved", account_status: "Active", is_suspended: false, is_deleted: false },
    ],
  ]);
  assert.equal(isEligibleProduct(VALID_PRODUCT, sellerMap), true);
});

test("isEligibleProduct blocks rejected, inactive, unapproved, zero-stock, no-image, and suspended seller products", () => {
  const sellerMap = new Map([
    [VALID_PRODUCT.seller_id, { id: VALID_PRODUCT.seller_id, status: "approved", is_suspended: false, is_deleted: false }],
    ["suspended-seller", { id: "suspended-seller", status: "suspended", is_suspended: true, is_deleted: false }],
    ["deleted-seller", { id: "deleted-seller", status: "approved", is_suspended: false, is_deleted: true }],
  ]);

  assert.equal(isEligibleProduct({ ...VALID_PRODUCT, is_active: false }, sellerMap), false);
  assert.equal(isEligibleProduct({ ...VALID_PRODUCT, is_approved: false }, sellerMap), false);
  assert.equal(isEligibleProduct({ ...VALID_PRODUCT, approval_status: "rejected" }, sellerMap), false);
  assert.equal(isEligibleProduct({ ...VALID_PRODUCT, approval_status: "pending" }, sellerMap), false);
  assert.equal(isEligibleProduct({ ...VALID_PRODUCT, status: "DELETED" }, sellerMap), false);
  assert.equal(isEligibleProduct({ ...VALID_PRODUCT, status: "OUT_OF_STOCK" }, sellerMap), false);
  assert.equal(isEligibleProduct({ ...VALID_PRODUCT, stock: 0, stock_count: 0 }, sellerMap), false);
  assert.equal(isEligibleProduct({ ...VALID_PRODUCT, price: 0 }, sellerMap), false);
  assert.equal(isEligibleProduct({ ...VALID_PRODUCT, image_url: "", images: [] }, sellerMap), false);
  assert.equal(isEligibleProduct({ ...VALID_PRODUCT, seller_id: "suspended-seller" }, sellerMap), false);
  assert.equal(isEligibleProduct({ ...VALID_PRODUCT, seller_id: "deleted-seller" }, sellerMap), false);
});

test("sanitizers validate UUIDs, visitor session IDs, and platforms strictly", () => {
  assert.equal(sanitizeUuid("11111111-1111-4111-8111-111111111111"), "11111111-1111-4111-8111-111111111111");
  assert.equal(sanitizeUuid("not-a-uuid"), null);
  assert.equal(sanitizeSessionId("zba_v_abc12345678"), "zba_v_abc12345678");
  assert.equal(sanitizeSessionId("bad id!"), null);
  assert.equal(normalizePlatform("android"), "android");
  assert.equal(normalizePlatform("ANDROID"), "android");
  assert.equal(normalizePlatform("ios_or_web"), "website");
});

test("formatCard only exposes discount_percentage and rating from real valid fields", () => {
  const noDiscountNoReviews = formatCard(
    { ...VALID_PRODUCT, mrp: 1299 },
    "trending_fallback",
    42,
    new Map(),
    new Map()
  );
  assert.equal(noDiscountNoReviews.discount_percentage, undefined);
  assert.equal(noDiscountNoReviews.mrp, undefined);
  assert.equal(noDiscountNoReviews.rating, undefined);
  assert.equal(noDiscountNoReviews.is_bestseller, false);

  const validDiscountAndReview = formatCard(
    VALID_PRODUCT,
    "search_intent",
    80,
    new Map([[VALID_PRODUCT.id, { avg: 4.8, count: 5 }]]),
    new Map([[VALID_PRODUCT.id, { orderCount: 4, eventScore: 10 }]])
  );
  assert.equal(validDiscountAndReview.discount_percentage, 35);
  assert.equal(validDiscountAndReview.rating, 4.8);
  assert.equal(validDiscountAndReview.is_bestseller, true);
});

test("rankBackendRecommendations prioritizes search intent, suppresses purchases, deduplicates names, and handles empty catalog", () => {
  const emptyRes = rankBackendRecommendations({ products: [] });
  assert.equal(emptyRes.items.length, 0);
  assert.equal(emptyRes.total, 0);

  const hoodie = { ...VALID_PRODUCT };
  const hoodieDup = { ...VALID_PRODUCT, id: "22222222-2222-4222-8222-222222222222" };
  const tee = {
    ...VALID_PRODUCT,
    id: "33333333-3333-4333-8333-333333333333",
    category_id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    name: "Oversized Streetwear Tee",
  };
  const joggers = {
    ...VALID_PRODUCT,
    id: "44444444-4444-4444-8444-444444444444",
    category_id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
    name: "Relaxed Cargo Jogger",
  };

  // Search for Hoodie -> hoodie leads
  const searchRes = rankBackendRecommendations({
    products: [tee, hoodie, hoodieDup, joggers],
    events: [{ event_type: "product_searched", search_query: "Hoodie" }],
  });
  assert.equal(searchRes.items[0].id, hoodie.id);
  assert.equal(searchRes.items[0].recommendation_strategy, "search_intent");
  // Duplicate product name+brand must be deduplicated
  assert.equal(searchRes.items.filter((x) => x.name === hoodie.name).length, 1);

  // Purchased tee -> tee suppressed to bottom, joggers promoted by complementary family
  const purchaseRes = rankBackendRecommendations({
    products: [tee, joggers],
    purchasedIds: new Set([tee.id]),
  });
  assert.equal(purchaseRes.items[0].id, joggers.id);
  assert.equal(purchaseRes.items[0].recommendation_strategy, "purchase_cross_sell");
  assert.equal(purchaseRes.items[1].id, tee.id);
});
