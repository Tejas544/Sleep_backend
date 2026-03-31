import jwt from 'jsonwebtoken';

export const generateToken = (practitionerId: string): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('FATAL: JWT_SECRET is not defined in environment variables.');
  }
  
  return jwt.sign({ id: practitionerId }, secret, { expiresIn: '7d' });
};