import { Router } from 'express';
import { createOrder, verifyPayment } from '../controllers/payment.controller';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();

// Lock down all payment routes
router.use(requireAuth);

router.post('/create-order', createOrder);
router.post('/verify', verifyPayment);

export default router;