/**
 * ZEBALPHA Cache Service Facade (Backward-Compatible Re-Export)
 * Points to the modular cache architecture in ./cache/
 */

export { 
  cacheService, 
  CacheService,
  redisClient, 
  cacheKeys, 
  CACHE_TTL, 
  cacheLock, 
  cacheInvalidation 
} from './cache/index.js';

import { cacheService } from './cache/index.js';
export default cacheService;
