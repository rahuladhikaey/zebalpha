import { Router } from 'express';
import { cacheService } from '../services/cacheService.js';
import { HTTP_STATUS } from '../constants/index.js';

const router = Router();

/**
 * POST /api/cache/invalidate
 * Centralized Cache Invalidation Endpoint
 * Allows authenticated mutation handlers to trigger targeted L2 Redis cache purges
 */
router.post('/invalidate', async (req, res, next) => {
  try {
    const { target, id, categoryId, sellerId } = req.body;

    if (!target) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: 'Invalidation target is required (product, category, seller, orders, all)'
      });
    }

    console.log(`[Cache Invalidation API] Received request for target=${target}, id=${id || 'N/A'}`);

    if (target === 'product') {
      await cacheService.invalidateProductCache(id, categoryId);
    } else if (target === 'category') {
      await cacheService.invalidateCategoryCache(categoryId || id);
    } else if (target === 'seller') {
      await cacheService.invalidator.onSellerMutation(sellerId || id);
    } else if (target === 'seller_lifecycle') {
      await cacheService.invalidator.onSellerLifecycleChange(sellerId || id);
    } else if (target === 'all') {
      await cacheService.invalidatePattern('*');
    } else {
      await cacheService.invalidatePattern(`${target}:*`);
    }

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: `Cache target '${target}' successfully invalidated`,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    next(err);
  }
});

export default router;
