import { Router } from 'express';
import { 
  acceptOrderAndCreateShipment,
  handleShiprocketWebhook, 
  scanPickup, 
  getShippingLabel,
  trackShipment
} from '../controllers/shipmentController.js';
import { authenticateJWT, requireRole } from '../middleware/auth.js';
import { ROLES } from '../constants/index.js';

const router = Router();

// Seller Accepts Order & Creates Shiprocket Manifest / AWB
router.post('/accept-order', authenticateJWT, requireRole([ROLES.SUPER_ADMIN, ROLES.SELLER]), acceptOrderAndCreateShipment);
router.post('/create-shipment', authenticateJWT, requireRole([ROLES.SUPER_ADMIN, ROLES.SELLER]), acceptOrderAndCreateShipment);

// Delivery Boy / Rider Pickup Scan (Courier Handover)
router.post('/scan-pickup', scanPickup);

// Get Verified 2-in-1 Printable Shipping Label Data
router.get('/label/:orderId', authenticateJWT, requireRole([ROLES.SUPER_ADMIN, ROLES.SELLER]), getShippingLabel);

// Live Shipment Tracking Timeline
router.get('/track/:orderId', trackShipment);

// Shiprocket Realtime Webhook Receiver
router.post('/webhook', handleShiprocketWebhook);

export default router;
