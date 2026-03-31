import Razorpay from 'razorpay';
import dotenv from 'dotenv';

// 1. Force environment variables to load into memory RIGHT NOW
dotenv.config();

const key_id = process.env.RAZORPAY_KEY_ID;
const key_secret = process.env.RAZORPAY_KEY_SECRET;

if (!key_id || !key_secret) {
  console.error('[FATAL] Razorpay keys are missing from environment variables.');
}

export const razorpayInstance = new Razorpay({
  key_id: key_id as string,
  key_secret: key_secret as string,
});