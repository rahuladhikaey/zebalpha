import { Router } from 'express';
import { createNotifyRequest } from '../controllers/notificationController.js';

const router = Router();

router.post('/notify', createNotifyRequest);

export default router;
