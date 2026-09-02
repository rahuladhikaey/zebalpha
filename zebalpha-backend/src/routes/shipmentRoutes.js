import { Router } from 'express';
import { createShipment, handleShiprocketWebhook } from '../controllers/shipmentController.js';
import { authenticateJWT, requireRole } from '../middleware/auth.js';
import { ROLES } from '../constants/index.js';

const router = Router();

router.post('/create-shipment', authenticateJWT, requireRole([ROLES.SUPER_ADMIN, ROLES.SELLER]), createShipment);
router.post('/webhook', handleShiprocketWebhook);

export default router;
