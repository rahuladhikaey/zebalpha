/**
 * ZEBALPHA Targeted Cache Invalidation Service
 * 
 * Rules:
 * 1. Targeted Granular Invalidation: ONLY purges affected namespaces.
 * 2. ZERO FLUSHALL: Never issues destructive global flush commands.
 * 3. Mutation Event Mapping: Clear invalidation triggers for product,
 *    inventory, category, seller, review, and homepage edits.
 */

import { redisClient } from './redisClient.js';
import { cacheKeys } from './cacheKeys.js';

export class CacheInvalidation {
  /**
   * Scan and delete keys matching a pattern (e.g. 'product-list:*')
   */
  async purgePattern(pattern) {
    try {
      const matchedKeys = await redisClient.keys(pattern);
      if (Array.isArray(matchedKeys) && matchedKeys.length > 0) {
        await redisClient.delMany(matchedKeys);
        console.log(`[Cache Invalidate] Pattern '${pattern}' purged (${matchedKeys.length} keys).`);
        return matchedKeys.length;
      }
      return 0;
    } catch (err) {
      console.warn(`[Cache Invalidate Warning] Pattern '${pattern}' purge notice:`, err.message);
      return 0;
    }
  }

  /**
   * Product Mutation Invalidation
   * Triggered on: Price edit, stock decrement/replenishment, description edit, status toggle
   */
  async onProductMutation(productId, categoryId = null) {
    const keysToPurge = [];
    if (productId) {
      keysToPurge.push(cacheKeys.product(productId));
      keysToPurge.push(cacheKeys.productDetail(productId));
      keysToPurge.push(`product:detail:${productId}`);
      keysToPurge.push(`product:${productId}`);
    }

    // Always invalidate homepage featured & trending
    keysToPurge.push(cacheKeys.homepageSection('featured'));
    keysToPurge.push(cacheKeys.homepageSection('trending'));
    keysToPurge.push(cacheKeys.trendingProducts(12));

    await redisClient.delMany(keysToPurge);

    // Invalidate product listings and search caches (both legacy and standardized namespaces)
    await this.purgePattern('product-list:*');
    await this.purgePattern('products:list*');
    await this.purgePattern('search:*');
    await this.purgePattern('products:search*');

    // If category is known, invalidate category section as well
    if (categoryId) {
      await redisClient.del(cacheKeys.category(categoryId));
      await redisClient.del(`category:${categoryId}`);
    }

    console.log(`[Cache Invalidate] Product mutation applied for ID=${productId || 'batch'}`);
  }

  /**
   * Category Mutation Invalidation
   * Triggered on: Category name update, creation, deletion, status toggle
   */
  async onCategoryMutation(categoryId = null) {
    const directKeys = [cacheKeys.categoriesAll(), 'categories:all'];
    if (categoryId) {
      directKeys.push(cacheKeys.category(categoryId));
      directKeys.push(`category:${categoryId}`);
    }
    directKeys.push(cacheKeys.homepageSection('categories'));

    await redisClient.delMany(directKeys);

    // Categories alter product-list filters
    await this.purgePattern('product-list:*');
    await this.purgePattern('products:list*');
    await this.purgePattern('search:*');
    await this.purgePattern('products:search*');

    console.log(`[Cache Invalidate] Category mutation applied for ID=${categoryId || 'all'}`);
  }

  /**
   * Seller Profile Mutation Invalidation
   * Triggered on: Store name, verification, or profile update
   */
  async onSellerMutation(sellerId) {
    if (!sellerId) return;
    await redisClient.del(cacheKeys.sellerPublic(sellerId));
    await this.purgePattern(`product-list:*`);
    console.log(`[Cache Invalidate] Seller profile invalidated for ID=${sellerId}`);
  }

  /**
   * Seller Lifecycle Change (Suspension, Deactivation, Account Deletion)
   * Triggered on: Seller account deleted or marked suspended
   */
  async onSellerLifecycleChange(sellerId) {
    if (!sellerId) return;
    await redisClient.del(cacheKeys.sellerPublic(sellerId));
    await this.purgePattern(`products:*`);
    await this.purgePattern(`product-list:*`);
    await this.purgePattern(`homepage:*`);
    await this.purgePattern(`search:*`);
    console.log(`[Cache Invalidate] Full seller catalog & homepage caches evicted for Seller ID=${sellerId}`);
  }

  /**
   * Review Created / Updated Invalidation
   * Triggered on: New customer review submitted
   */
  async onReviewMutation(productId) {
    if (!productId) return;
    await this.purgePattern(`reviews:product:${productId}:*`);
    await redisClient.del(cacheKeys.productDetail(productId));
    console.log(`[Cache Invalidate] Reviews and product-detail invalidated for ID=${productId}`);
  }

  /**
   * Targeted Homepage Section Invalidation
   * Triggered on: Banner / Promotional / Section layout updates
   */
  async onHomepageSectionMutation(sectionName, variant = '') {
    const key = cacheKeys.homepageSection(sectionName, variant);
    await redisClient.del(key);
    console.log(`[Cache Invalidate] Homepage section invalidated: ${key}`);
  }

  /**
   * User-Personalized Invalidation (Strictly scoped)
   */
  async onUserCartOrWishlistMutation(userId) {
    if (!userId) return;
    await redisClient.del(cacheKeys.userCart(userId));
    await redisClient.del(cacheKeys.userWishlist(userId));
  }
}

export const cacheInvalidation = new CacheInvalidation();
