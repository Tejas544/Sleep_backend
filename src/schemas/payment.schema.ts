import { z } from 'zod';

export const createOrderSchema = z.object({
  // Enforce valid paid plans using the exact error parameter Zod expects
  planType: z.enum(['INTERMEDIATE', 'ADVANCE'], {
    message: 'Plan must be either INTERMEDIATE or ADVANCE',
  }),
});

export const verifyPaymentSchema = z.object({
  razorpay_order_id: z.string(),
  razorpay_payment_id: z.string(),
  razorpay_signature: z.string(),
});