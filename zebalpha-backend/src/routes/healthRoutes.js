import { Router } from 'express';
import { checkHealth, checkDbHealth, checkRedisHealth } from '../controllers/healthController.js';

const router = Router();

router.get('/', checkHealth);
router.get('/db', checkDbHealth);
router.get('/redis', checkRedisHealth);

export default router;
