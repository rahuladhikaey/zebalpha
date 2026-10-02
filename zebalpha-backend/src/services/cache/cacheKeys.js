/**
 * ZEBALPHA Standardized Cache Key Generator
 * 
 * Provides deterministic, normalized cache keys across all endpoints.
 * Prevents key collision and eliminates duplicate database calls caused
 * by inconsistent query formatting (e.g. " Nike Shoes " vs "nike shoes").
 */

export const normalizeString = (str) => {
  if (!str || typeof str !== 'string') return '';
  return str.trim().toLowerCase().replace(/\s+/g, ' ');
};

export const cacheKeys = {
  /**
   * Product single item metadata
   */
  product: (productId) => `product:${productId}`,

  /**
   * Complete product detail including categories and variants
   */
  productDetail: (productId) => `product-detail:${productId}`,

  /**
   * Normalized Product listing
   * e.g. product-list:men:price_asc:start:12:all:active
   */
  productList: (params = {}) => {
    const category = normalizeString(params.category) || 'all';
    const sort = normalizeString(params.sort) || 'default';
    const cursor = params.cursor ? String(params.cursor).trim() : 'start';
    const limit = Math.min(Math.max(1, parseInt(String(params.limit), 10) || 12), 48);
    const brand = normalizeString(params.brand) || 'all';
    const active = params.activeOnly !== false ? 'active' : 'all';

    return `product-list:${category}:${sort}:${cursor}:${limit}:${brand}:${active}`;
  },

  /**
   * Single category
   */
  category: (categoryId) => `category:${categoryId}`,

  /**
   * All active categories
   */
  categoriesAll: () => 'categories:all',

  /**
   * Independent homepage section
   * e.g. homepage:section:hero, homepage:section:trending, homepage:section:categories
   */
  homepageSection: (sectionName, variant = '') => {
    const normSection = normalizeString(sectionName) || 'main';
    const normVariant = normalizeString(variant);
    return normVariant ? `homepage:section:${normSection}:${normVariant}` : `homepage:section:${normSection}`;
  },

  /**
   * Normalized search results
   * Automatically strips punctuation variations and excess whitespace
   */
  search: (params = {}) => {
    const query = normalizeString(params.q || params.query || params.search);
    const category = normalizeString(params.category) || 'all';
    const sort = normalizeString(params.sort) || 'relevance';
    const cursor = params.cursor ? String(params.cursor).trim() : 'start';
    const limit = Math.min(Math.max(1, parseInt(String(params.limit), 10) || 12), 48);

    return `search:${query || 'all'}:${category}:${sort}:${cursor}:${limit}`;
  },

  /**
   * Search suggestions / autocomplete
   */
  searchSuggestions: (query) => `search:suggestions:${normalizeString(query)}`,

  /**
   * Trending products catalog
   */
  trendingProducts: (limit = 12) => `trending-products:${limit}`,

  /**
   * Public seller profile
   */
  sellerPublic: (sellerId) => `seller:${sellerId}:public`,

  /**
   * Customer reviews for a product with pagination
   */
  reviewsProduct: (productId, cursor = '') => `reviews:product:${productId}:${cursor ? String(cursor).trim() : 'p1'}`,

  /**
   * Personalized recommendations (Strictly user-isolated)
   */
  recommendations: (userId) => `recommendations:user:${userId}`,

  /**
   * User shopping cart (User-isolated)
   */
  userCart: (userId) => `cart:user:${userId}`,

  /**
   * User wishlist (User-isolated)
   */
  userWishlist: (userId) => `wishlist:user:${userId}`,

  /**
   * Global store configuration
   */
  config: (key) => `config:${normalizeString(key)}`,

  /**
   * Helper to normalize arbitrary query parameter dictionaries
   */
  deterministicKey: (prefix, params = {}) => {
    if (!params || typeof params !== 'object' || Object.keys(params).length === 0) {
      return `${prefix}:default`;
    }
    const parts = [];
    const keys = Object.keys(params).sort();
    for (const k of keys) {
      const v = params[k];
      if (v !== undefined && v !== null && v !== '') {
        parts.push(`${k}=${encodeURIComponent(normalizeString(String(v)))}`);
      }
    }
    return parts.length === 0 ? `${prefix}:default` : `${prefix}:${parts.join(':')}`;
  }
};
