import { Router } from 'express';
import { executeVirtualTryOn, getVTOConfig } from '../controllers/virtualTryOnController.js';

const router = Router();

// Public Virtual Try-On Routes
router.post('/', executeVirtualTryOn);
router.get('/config', getVTOConfig);

export default router;
