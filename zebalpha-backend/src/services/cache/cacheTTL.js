/**
 * ZEBALPHA Production Cache TTL Strategy
 * 
 * Standardized TTL values (in seconds) according to data volatility:
 * - Categories: 12-24 hours
 * - Static configuration: 12-24 hours
 * - Homepage sections: 15-30 minutes
 * - Trending products: 15-30 minutes
 * - Product details: 30-60 minutes
 * - Product listing: 5-15 minutes
 * - Search results: 5-15 minutes
 * - Reviews: 5-15 minutes
 * - Public seller info: 30-60 minutes
 * - Recommendations: 5-15 minutes
 * 
 * Critical transactional data (inventory, checkout prices, orders, payments)
 * must NEVER use stale long caching.
 */

export const CACHE_TTL = {
  // Aggressive Caching (Rarely changes)
  CATEGORIES: parseInt(process.env.CACHE_TTL_CATEGORIES || '43200', 10), // 12 hours (43200s)
  STATIC_CONFIG: parseInt(process.env.CACHE_TTL_CONFIG || '43200', 10), // 12 hours
  
  // Moderate Caching (Semi-static storefront displays)
  HOMEPAGE_SECTIONS: parseInt(process.env.CACHE_TTL_HOMEPAGE || '1200', 10), // 20 minutes (1200s)
  TRENDING_PRODUCTS: parseInt(process.env.CACHE_TTL_TRENDING || '1200', 10), // 20 minutes (1200s)
  PRODUCT_DETAIL: parseInt(process.env.CACHE_TTL_PRODUCT_DETAIL || '2400', 10), // 40 minutes (2400s)
  PUBLIC_SELLER_INFO: parseInt(process.env.CACHE_TTL_SELLER || '2400', 10), // 40 minutes (2400s)

  // Dynamic Storefront Caching
  PRODUCT_LISTING: parseInt(process.env.CACHE_TTL_PRODUCTS || '600', 10), // 10 minutes (600s)
  SEARCH_RESULTS: parseInt(process.env.CACHE_TTL_SEARCH || '600', 10), // 10 minutes (600s)
  REVIEWS: parseInt(process.env.CACHE_TTL_REVIEWS || '600', 10), // 10 minutes (600s)
  RECOMMENDATIONS: parseInt(process.env.CACHE_TTL_RECOMMENDATIONS || '600', 10), // 10 minutes (600s)

  // Short-lived Caches (Volatile/Active session)
  SHORT_TTL: 60, // 1 minute
  DEFAULT: parseInt(process.env.CACHE_TTL_DEFAULT || '600', 10), // 10 minutes default

  // Concurrency Lock TTL
  LOCK_TTL: 5 // 5 seconds max single-flight lock
};
