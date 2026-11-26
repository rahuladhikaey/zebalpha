import test from "node:test";
import assert from "node:assert/strict";
import {
  isProductEligibleForRecommendation,
  formatRecommendedProduct,
  scoreAndRankRecommendations,
  type SellerStatusRecord,
  type ProductReviewSummary,
  type PopularitySignal,
} from "@/lib/recommendationScoring";
import type { Product } from "@/lib/types";

const BASE_SELLER_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const CAT_TSHIRTS = "cat-tshirts-1111-4111-8111-111111111111";
const CAT_HOODIES = "cat-hoodies-2222-4222-8222-222222222222";
const CAT_SHOES = "cat-shoes-3333-4333-8333-333333333333";

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: "prod-1111-1111-4111-8111-111111111111",
    seller_id: BASE_SELLER_ID,
    category_id: CAT_HOODIES,
    category: "Streetwear",
    category_name: "Hoodies",
    name: "Heavyweight Acid-Wash Hoodie",
    brand: "ZebAlpha",
    description: "420 GSM French terry oversized hoodie",
    price: 1499,
    mrp: 2499,
    image_url: "https://res.cloudinary.com/demo/image/upload/hoodie.jpg",
    images: ["https://res.cloudinary.com/demo/image/upload/hoodie.jpg"],
    stock: 12,
    is_active: true,
    is_approved: true,
    approval_status: "approved",
    status: "AVAILABLE",
    created_at: new Date("2026-11-10T10:00:00Z").toISOString(),
    ...overrides,
  };
}

function makeSellerMap(): Map<string, SellerStatusRecord> {
  return new Map([
    [
      BASE_SELLER_ID,
      {
        id: BASE_SELLER_ID,
        status: "approved",
        account_status: "Active",
        is_suspended: false,
        is_deleted: false,
      },
    ],
    [
      "seller-suspended",
      {
        id: "seller-suspended",
        status: "suspended",
        account_status: "Suspended",
        is_suspended: true,
        is_deleted: false,
      },
    ],
    [
      "seller-deleted",
      {
        id: "seller-deleted",
        status: "approved",
        is_suspended: false,
        is_deleted: true,
      },
    ],
  ]);
}

test("isProductEligibleForRecommendation enforces strict approval, active, stock, image, drop & seller rules", () => {
  const sellers = makeSellerMap();

  assert.equal(isProductEligibleForRecommendation(makeProduct(), sellers), true);

  // Variant stock via packages makes base stock 0 eligible
  assert.equal(
    isProductEligibleForRecommendation(
      makeProduct({
        stock: 0,
        packages: [{ id: "pkg-m", name: "M", price: 1499, mrp: 2499, stock: 5 }],
      }),
      sellers
    ),
    true
  );

  // Blocked states
  assert.equal(isProductEligibleForRecommendation(makeProduct({ is_active: false }), sellers), false);
  assert.equal(isProductEligibleForRecommendation(makeProduct({ is_approved: false }), sellers), false);
  assert.equal(isProductEligibleForRecommendation(makeProduct({ approval_status: "rejected" }), sellers), false);
  assert.equal(isProductEligibleForRecommendation(makeProduct({ approval_status: "pending" }), sellers), false);
  assert.equal(isProductEligibleForRecommendation(makeProduct({ status: "DELETED" }), sellers), false);
  assert.equal(isProductEligibleForRecommendation(makeProduct({ status: "OUT_OF_STOCK" }), sellers), false);
  assert.equal(isProductEligibleForRecommendation(makeProduct({ stock: 0 }), sellers), false);
  assert.equal(isProductEligibleForRecommendation(makeProduct({ price: 0 }), sellers), false);
  assert.equal(
    isProductEligibleForRecommendation(makeProduct({ image_url: "", images: [] }), sellers),
    false
  );
  assert.equal(
    isProductEligibleForRecommendation(
      makeProduct({
        tier: "DROP",
      }),
      sellers
    ),
    true
  );
  assert.equal(
    isProductEligibleForRecommendation(makeProduct({ seller_id: "seller-suspended" }), sellers),
    false
  );
  assert.equal(
    isProductEligibleForRecommendation(makeProduct({ seller_id: "seller-deleted" }), sellers),
    false
  );
});

test("formatRecommendedProduct never fabricates MRP/discount or review ratings", () => {
  const noMrpNoReviews = formatRecommendedProduct(
    makeProduct({ mrp: undefined }),
    "trending_fallback",
    55,
    new Map(),
    new Map()
  );
  assert.equal(noMrpNoReviews.mrp, undefined);
  assert.equal(noMrpNoReviews.discount_percentage, undefined);
  assert.equal(noMrpNoReviews.rating, undefined);
  assert.equal(noMrpNoReviews.review_count, undefined);
  assert.equal(noMrpNoReviews.is_bestseller, false);

  const realDiscountAndReviews = formatRecommendedProduct(
    makeProduct({ price: 1499, mrp: 2499 }),
    "search_intent",
    90,
    new Map<string, ProductReviewSummary>([
      ["prod-1111-1111-4111-8111-111111111111", { avg: 4.7, count: 6 }],
    ]),
    new Map<string, PopularitySignal>([
      ["prod-1111-1111-4111-8111-111111111111", { orderCount: 5, eventScore: 18 }],
    ])
  );
  assert.equal(realDiscountAndReviews.mrp, 2499);
  assert.equal(realDiscountAndReviews.discount_percentage, 40);
  assert.equal(realDiscountAndReviews.rating, 4.7);
  assert.equal(realDiscountAndReviews.review_count, 6);
  assert.equal(realDiscountAndReviews.is_bestseller, true);
  assert.equal(realDiscountAndReviews.badge_label, "Bestseller");
});

test("scoreAndRankRecommendations returns empty cleanly on empty catalog", () => {
  const res = scoreAndRankRecommendations({
    catalog: [],
    events: [],
    purchasedProductIds: new Set(),
    purchasedCategoryIds: new Set(),
    wishlistProductIds: new Set(),
    cartProductIds: new Set(),
  });
  assert.equal(res.items.length, 0);
  assert.equal(res.totalEligible, 0);
  assert.equal(res.hasPersonalizationSignals, false);
});

test("scoreAndRankRecommendations supports Search, Browsing, Purchase Cross-Sell, Category, Cart Removal, Deduplication & Cold-Start", () => {
  const nowMs = new Date("2026-11-14T12:00:00Z").getTime();

  const hoodie = makeProduct({
    id: "prod-hoodie-1",
    category_id: CAT_HOODIES,
    category_name: "Hoodies",
    name: "Heavyweight Street Hoodie",
    price: 1599,
    mrp: 1999,
  });
  const hoodieDupTitle = makeProduct({
    id: "prod-hoodie-dup",
    category_id: CAT_HOODIES,
    category_name: "Hoodies",
    name: "Heavyweight Street Hoodie",
    price: 1599,
    mrp: 1999,
  });
  const tShirt = makeProduct({
    id: "prod-tee-1",
    category_id: CAT_TSHIRTS,
    category_name: "T-Shirts",
    name: "Oversized Drop Shoulder T-Shirt",
    description: "240 GSM combed cotton oversized streetwear t-shirt; pairs well with a hoodie",
    price: 799,
    mrp: 1299,
  });
  const sneakers = makeProduct({
    id: "prod-shoe-1",
    category_id: CAT_SHOES,
    category_name: "Footwear",
    name: "Chunky Retro Sneakers",
    description: "Breathable suede and mesh retro sneakers",
    price: 2499,
    mrp: 3999,
  });

  const catalog = [tShirt, sneakers, hoodie, hoodieDupTitle];
  const popularityMap = new Map<string, PopularitySignal>([
    [String(sneakers.id), { orderCount: 10, eventScore: 30 }],
    [String(tShirt.id), { orderCount: 2, eventScore: 6 }],
    [String(hoodie.id), { orderCount: 1, eventScore: 2 }],
  ]);

  // 1. Cold-start fallback for brand-new user ranks popular sneakers first & deduplicates clone title
  const coldStart = scoreAndRankRecommendations({
    catalog,
    events: [],
    purchasedProductIds: new Set(),
    purchasedCategoryIds: new Set(),
    wishlistProductIds: new Set(),
    cartProductIds: new Set(),
    popularityMap,
    nowMs,
  });
  assert.equal(coldStart.hasPersonalizationSignals, false);
  assert.equal(coldStart.items[0].id, sneakers.id);
  assert.equal(coldStart.items[0].recommendation_strategy, "trending_fallback");
  assert.equal(coldStart.items.filter((i) => i.name === hoodie.name).length, 1);

  // 2. Search for "Hoodie" elevates hoodie over higher-popularity sneakers
  const searched = scoreAndRankRecommendations({
    catalog,
    events: [
      {
        event_type: "product_searched",
        search_query: "Hoodie",
        created_at: new Date(nowMs - 60_000).toISOString(),
      },
    ],
    purchasedProductIds: new Set(),
    purchasedCategoryIds: new Set(),
    wishlistProductIds: new Set(),
    cartProductIds: new Set(),
    popularityMap,
    nowMs,
  });
  assert.equal(searched.hasPersonalizationSignals, true);
  assert.equal(searched.items[0].id, hoodie.id);
  assert.equal(searched.items[0].recommendation_strategy, "search_intent");

  // 3. Repeated T-shirt views elevate similar T-shirts via browsing_affinity & category_affinity
  const tShirt2 = makeProduct({
    id: "prod-tee-2",
    category_id: CAT_TSHIRTS,
    category_name: "T-Shirts",
    name: "Boxy Cotton Vintage T-Shirt",
    description: "Relaxed streetwear tee in washed cotton",
    price: 849,
    mrp: 1299,
  });
  const browsed = scoreAndRankRecommendations({
    catalog: [...catalog, tShirt2],
    events: [
      {
        event_type: "product_viewed",
        product_id: String(tShirt.id),
        category_id: CAT_TSHIRTS,
        created_at: new Date(nowMs - 120_000).toISOString(),
      },
      {
        event_type: "product_viewed",
        product_id: String(tShirt.id),
        category_id: CAT_TSHIRTS,
        created_at: new Date(nowMs - 150_000).toISOString(),
      },
      {
        event_type: "product_viewed",
        product_id: String(tShirt.id),
        category_id: CAT_TSHIRTS,
        created_at: new Date(nowMs - 170_000).toISOString(),
      },
      {
        event_type: "category_viewed",
        category_id: CAT_TSHIRTS,
        created_at: new Date(nowMs - 180_000).toISOString(),
      },
    ],
    purchasedProductIds: new Set(),
    purchasedCategoryIds: new Set(),
    wishlistProductIds: new Set(),
    cartProductIds: new Set(),
    popularityMap,
    nowMs,
  });
  assert.equal(browsed.items[0].category_id, CAT_TSHIRTS);
  assert.ok([tShirt.id, tShirt2.id].includes(browsed.items[0].id));

  // 4. Purchased T-shirt suppresses repeat tee & promotes complementary footwear (tshirts -> footwear)
  const purchased = scoreAndRankRecommendations({
    catalog: [tShirt, sneakers, hoodie],
    events: [],
    purchasedProductIds: new Set([String(tShirt.id)]),
    purchasedCategoryIds: new Set([CAT_TSHIRTS]),
    wishlistProductIds: new Set(),
    cartProductIds: new Set(),
    popularityMap: new Map(),
    nowMs,
  });
  assert.equal(purchased.items[0].id, sneakers.id);
  assert.equal(purchased.items[0].recommendation_strategy, "purchase_cross_sell");
  assert.equal(purchased.items[purchased.items.length - 1].id, tShirt.id);

  // 5. Cart removal reduces score compared to wishlisted competitor
  const cartRemoved = scoreAndRankRecommendations({
    catalog: [hoodie, tShirt],
    events: [
      {
        event_type: "cart_removed",
        product_id: String(hoodie.id),
        created_at: new Date(nowMs - 30_000).toISOString(),
      },
    ],
    purchasedProductIds: new Set(),
    purchasedCategoryIds: new Set(),
    wishlistProductIds: new Set([String(tShirt.id)]),
    cartProductIds: new Set(),
    popularityMap: new Map(),
    nowMs,
  });
  assert.equal(cartRemoved.items[0].id, tShirt.id);
});
