import { HTTP_STATUS } from '../constants/index.js';
import { supabaseA } from '../lib/supabase.js';
import { cacheService } from '../services/cacheService.js';

export const checkHealth = (req, res) => {
  res.status(HTTP_STATUS.OK).json({
    status: 'online',
    service: 'ZEBALPHA Backend API',
    timestamp: new Date().toISOString()
  });
};

export const checkDbHealth = async (req, res) => {
  try {
    const startTime = Date.now();
    const { error } = await supabaseA.from('categories').select('id').limit(1);
    const latencyMs = Date.now() - startTime;

    if (error) throw error;
    res.status(HTTP_STATUS.OK).json({
      status: 'healthy',
      component: 'PostgreSQL / Supabase',
      latencyMs,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json({
      status: 'unhealthy',
      component: 'PostgreSQL / Supabase',
      error: 'Database query failed'
    });
  }
};

export const checkRedisHealth = async (req, res) => {
  try {
    const isRedisActive = cacheService.isUpstashEnabled;
    res.status(HTTP_STATUS.OK).json({
      status: isRedisActive ? 'healthy' : 'in_memory_fallback',
      component: isRedisActive ? 'Upstash Shared Redis' : 'Memory Cache Store',
      metrics: cacheService.getMetrics(),
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json({
      status: 'unhealthy',
      component: 'Redis Layer',
      error: 'Cache service check failed'
    });
  }
};
