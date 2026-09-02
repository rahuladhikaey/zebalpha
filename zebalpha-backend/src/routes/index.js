import { Router } from 'express';
import healthRoutes from './healthRoutes.js';
import authRoutes from './authRoutes.js';
import productRoutes from './productRoutes.js';
import orderRoutes from './orderRoutes.js';
import paymentRoutes from './paymentRoutes.js';
import shipmentRoutes from './shipmentRoutes.js';
import sellerRoutes from './sellerRoutes.js';
import adminRoutes from './adminRoutes.js';
import notificationRoutes from './notificationRoutes.js';
import uploadRoutes from './uploadRoutes.js';
import cronRoutes from './cronRoutes.js';
import checkoutRoutes from './checkoutRoutes.js';
import settlementRoutes from './settlementRoutes.js';
import virtualTryOnRoutes from './virtualTryOnRoutes.js';

const router = Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/products', productRoutes);
router.use('/orders', orderRoutes);
router.use('/payments', paymentRoutes);
router.use('/shipments', shipmentRoutes);
router.use('/sellers', sellerRoutes);
router.use('/admin', adminRoutes);
router.use('/notifications', notificationRoutes);
router.use('/uploads', uploadRoutes);
router.use('/cron', cronRoutes);
router.use('/checkout', checkoutRoutes);
router.use('/settlements', settlementRoutes);
router.use('/virtual-try-on', virtualTryOnRoutes);

export default router;
