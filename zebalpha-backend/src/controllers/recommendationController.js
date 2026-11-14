import { supabase } from '../lib/supabase.js';
import {
  getForYouRecommendations,
  getTrendingProducts,
  getRecentlyViewedProducts,
  getSimilarProductsForId,
  recordEvent,
  recordImpressions,
  recordClick,
  mergeSession,
  normalizePlatform
} from '../services/recommendationService.js';

async function resolveOptionalUserId(req) {
  if (req.user?.id) return req.user.id;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
    const token = authHeader.slice(7).trim();
    if (token && token.split('.').length === 3) {
      try {
        const { data } = await supabase.auth.getUser(token);
        if (data?.user?.id) return data.user.id;
      } catch {
        // Ignore invalid optional token
      }
    }
  }
  return null;
}

function getSessionFromReq(req) {
  return req.body?.sessionId || req.query?.sessionId || req.headers['x-zebalpha-session-id'] || null;
}

function getPlatformFromReq(req) {
  const explicit = req.body?.platform || req.query?.platform || req.headers['x-zebalpha-platform'];
  if (explicit) return normalizePlatform(explicit);
  return req.headers['user-agent']?.includes('ZEBALPHA_ANDROID_APP') ? 'android' : 'website';
}

export async function handleGetForYou(req, res) {
  try {
    const userId = await resolveOptionalUserId(req);
    const sessionId = getSessionFromReq(req);
    const excludeRaw = String(req.query?.exclude || '');
    const result = await getForYouRecommendations({
      userId,
      sessionId,
      page: req.query?.page,
      limit: req.query?.limit,
      excludeProductIds: excludeRaw ? excludeRaw.split(',') : []
    });
    return res.json({ success: true, ...result });
  } catch (err) {
    return res.status(500).json({ success: false, items: [], error: err.message });
  }
}

export async function handleGetTrending(req, res) {
  try {
    const result = await getTrendingProducts({ page: req.query?.page, limit: req.query?.limit });
    return res.json({ success: true, ...result });
  } catch (err) {
    return res.status(500).json({ success: false, items: [], error: err.message });
  }
}

export async function handleGetRecentlyViewed(req, res) {
  try {
    const userId = await resolveOptionalUserId(req);
    const sessionId = getSessionFromReq(req);
    const result = await getRecentlyViewedProducts({
      userId,
      sessionId,
      page: req.query?.page,
      limit: req.query?.limit,
      excludeProductId: req.query?.exclude || null
    });
    return res.json({ success: true, ...result });
  } catch (err) {
    return res.status(500).json({ success: false, items: [], error: err.message });
  }
}

export async function handleGetSimilar(req, res) {
  try {
    const items = await getSimilarProductsForId(req.params.productId, req.query?.limit);
    return res.json({ success: true, items, count: items.length, strategy: 'product_similarity' });
  } catch (err) {
    return res.status(500).json({ success: false, items: [], error: err.message });
  }
}

export async function handleTrackEvent(req, res) {
  try {
    const userId = await resolveOptionalUserId(req);
    const result = await recordEvent({
      ...req.body,
      userId,
      sessionId: getSessionFromReq(req),
      platform: getPlatformFromReq(req)
    });
    if (!result.recorded && result.error) {
      return res.status(400).json({ success: false, error: result.error });
    }
    return res.json({ success: true, ...result });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

export async function handleTrackImpressions(req, res) {
  try {
    const userId = await resolveOptionalUserId(req);
    const result = await recordImpressions({
      ...req.body,
      userId,
      sessionId: getSessionFromReq(req),
      platform: getPlatformFromReq(req)
    });
    return res.json({ success: true, ...result });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

export async function handleTrackClick(req, res) {
  try {
    const userId = await resolveOptionalUserId(req);
    const result = await recordClick({
      ...req.body,
      userId,
      sessionId: getSessionFromReq(req),
      platform: getPlatformFromReq(req)
    });
    if (!result.recorded && result.error) {
      return res.status(400).json({ success: false, error: result.error });
    }
    return res.json({ success: true, ...result });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

export async function handleMergeSession(req, res) {
  try {
    const userId = await resolveOptionalUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }
    const result = await mergeSession(getSessionFromReq(req), userId);
    return res.json({ success: true, ...result });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
