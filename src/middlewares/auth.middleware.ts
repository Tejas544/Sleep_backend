import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Extend the Express Request interface to securely hold our practitioner ID
export interface AuthRequest extends Request {
  practitionerId?: string;
}

export const requireAuth = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  // 1. Guard Check: Is the header present and formatted correctly?
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized: Missing or invalid authorization header.' });
    return;
  }

  // 2. Extract the raw token
  const token = authHeader.split(' ')[1];

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET is completely missing from environment variables.');

    // 3. Cryptographic Verification
    // If the token is tampered with or expired, jwt.verify() will instantly throw an error.
    const decoded = jwt.verify(token, secret) as { id: string };

    // 4. Attach the ID to the request object for the downstream controllers to use
    req.practitionerId = decoded.id;

    // 5. Pass control to the next function (the controller)
    next();
  } catch (error) {
    console.error('[SECURITY CAUGHT] Invalid token attempt:', error);
    res.status(401).json({ error: 'Unauthorized: Token is invalid or has expired.' });
  }
};