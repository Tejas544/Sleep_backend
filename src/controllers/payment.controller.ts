import { Response } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import { prisma } from '../server';
import { AuthRequest } from '../middlewares/auth.middleware';
import { createOrderSchema, verifyPaymentSchema } from '../schemas/payment.schema';
import { razorpayInstance } from '../config/razorpay';

// Single Source of Truth for Pricing (in INR Rupees)
const PLAN_PRICING = {
  INTERMEDIATE: 499,
  ADVANCE: 999,
};

export const createOrder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const practitionerId = req.practitionerId;
    if (!practitionerId) {
      res.status(401).json({ error: 'Unauthorized boundary failure.' });
      return;
    }

    // 1. Validate the requested plan
    const { planType } = createOrderSchema.parse(req.body);

    // 2. Calculate amount in paise (Razorpay standard)
    const amountInRupees = PLAN_PRICING[planType];
    const amountInPaise = amountInRupees * 100;

    // 3. Generate Razorpay Order
    const options = {
      amount: amountInPaise,
      currency: 'INR',
      receipt: `rcpt_plan_${practitionerId.substring(0, 8)}`,
    };

    const order = await razorpayInstance.orders.create(options);

    // 4. Record the Pending Payment in our Database
    await prisma.payment.create({
      data: {
        practitionerId,
        rzpOrderId: order.id,
        amount: amountInPaise,
        planName: planType,
        status: 'PENDING',
      },
    });

    res.status(200).json({
      message: 'Order created successfully',
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationError = error as z.ZodError<any>;
      res.status(400).json({ error: 'Validation failed', details: validationError.flatten().fieldErrors });
      return;
    }
    console.error('[PAYMENT ERROR] Failed to create order:', error);
    res.status(500).json({ error: 'Internal server error while creating payment order.' });
  }
};

export const verifyPayment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const practitionerId = req.practitionerId;
    if (!practitionerId) {
      res.status(401).json({ error: 'Unauthorized boundary failure.' });
      return;
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = verifyPaymentSchema.parse(req.body);

    // 1. Cryptographic HMAC SHA256 Verification
    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) throw new Error('Razorpay secret is missing.');

    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(body.toString())
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      res.status(400).json({ error: 'Digital signature mismatch. Payment rejected.' });
      return;
    }

    // 2. Find the Pending Payment
    const paymentRecord = await prisma.payment.findUnique({
      where: { rzpOrderId: razorpay_order_id },
    });

    if (!paymentRecord || paymentRecord.status === 'SUCCESS') {
      res.status(404).json({ error: 'Valid pending payment record not found.' });
      return;
    }

    // 3. ACID Transaction: Update Payment AND Upgrade Practitioner
    // Extract the strict PlanType enum string from the payment record
    const newPlanType = paymentRecord.planName as 'INTERMEDIATE' | 'ADVANCE';

    await prisma.$transaction([
      prisma.payment.update({
        where: { id: paymentRecord.id },
        data: { 
          status: 'SUCCESS', 
          rzpPaymentId: razorpay_payment_id 
        },
      }),
      prisma.practitioner.update({
        where: { id: practitionerId },
        data: { planType: newPlanType },
      }),
    ]);

    res.status(200).json({ 
      message: 'Payment verified successfully. Account upgraded.',
      newPlan: newPlanType
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationError = error as z.ZodError<any>;
      res.status(400).json({ error: 'Validation failed', details: validationError.flatten().fieldErrors });
      return;
    }
    console.error('[PAYMENT ERROR] Verification failed:', error);
    res.status(500).json({ error: 'Internal server error during payment verification.' });
  }
};