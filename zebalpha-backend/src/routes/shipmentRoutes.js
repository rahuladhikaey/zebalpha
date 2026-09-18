import { Router } from 'express';
import { 
  createShipment, 
  handleShiprocketWebhook, 
  scanPickup, 
  getShippingLabel 
} from '../controllers/shipmentController.js';
import { authenticateJWT, requireRole } from '../middleware/auth.js';
import { ROLES } from '../constants/index.js';

const router = Router();

// Create AWB & Manifest
router.post('/create-shipment', authenticateJWT, requireRole([ROLES.SUPER_ADMIN, ROLES.SELLER]), createShipment);

// Delivery Boy / Rider Pickup Scan (Simulated or Live Rider App)
router.post('/scan-pickup', scanPickup);

// Get structured printable label payload
router.get('/label/:orderId', authenticateJWT, requireRole([ROLES.SUPER_ADMIN, ROLES.SELLER]), getShippingLabel);

// Courier & Shiprocket Live Webhook
router.post('/webhook', handleShiprocketWebhook);

export default router;
