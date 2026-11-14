import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  handleGetForYou,
  handleGetTrending,
  handleGetRecentlyViewed,
  handleGetSimilar,
  handleTrackEvent,
  handleTrackImpressions,
  handleTrackClick,
  handleMergeSession
} from '../controllers/recommendationController.js';
import { authenticateJWT } from '../middleware/auth.js';

const router = Router();

const recommendationLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 180,
  standardHeaders: true,
  legacyHeaders: false
});

router.use(recommendationLimiter);

router.get('/for-you', handleGetForYou);
router.get('/trending', handleGetTrending);
router.get('/recently-viewed', handleGetRecentlyViewed);
router.get('/similar/:productId', handleGetSimilar);

router.post('/events', handleTrackEvent);
router.post('/impressions', handleTrackImpressions);
router.post('/click', handleTrackClick);
router.post('/merge-session', authenticateJWT, handleMergeSession);

export default router;
