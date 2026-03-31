import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { prisma } from '../server';
import { registerSchema, loginSchema } from '../schemas/auth.schema';
import { generateToken } from '../utils/jwt';

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    // 1. Zod Validation
    const validatedData = registerSchema.parse(req.body);

    // 2. Conflict Check
    const existingPractitioner = await prisma.practitioner.findUnique({
      where: { email: validatedData.email },
    });

    if (existingPractitioner) {
      res.status(409).json({ error: 'A practitioner with this email already exists.' });
      return;
    }

    // 3. Cryptography
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(validatedData.password, saltRounds);

    // 4. Database Write
    const practitioner = await prisma.practitioner.create({
      data: {
        email: validatedData.email,
        passwordHash,
        fullName: validatedData.fullName,
        hospitalName: validatedData.hospitalName,
      },
    });

    // 5. Token Generation
    const token = generateToken(practitioner.id);

    // 6. Sanitized Response (Never send the passwordHash back)
    res.status(201).json({
      message: 'Registration successful',
      token,
      practitioner: {
        id: practitioner.id,
        email: practitioner.email,
        fullName: practitioner.fullName,
        hospitalName: practitioner.hospitalName,
        planType: practitioner.planType,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Explicitly cast with <any> to override the unknown generic
      const validationError = error as z.ZodError<any>;
      
      res.status(400).json({ 
        error: 'Validation failed', 
        details: validationError.flatten().fieldErrors 
      });
      return;
    }
    console.error('[AUTH ERROR] Registration failed:', error);
    res.status(500).json({ error: 'Internal server error during registration.' });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    // 1. Zod Validation
    const validatedData = loginSchema.parse(req.body);

    // 2. Fetch Practitioner
    const practitioner = await prisma.practitioner.findUnique({
      where: { email: validatedData.email },
    });

    if (!practitioner) {
      res.status(401).json({ error: 'Invalid credentials.' });
      return;
    }

    // 3. Verify Password
    const isMatch = await bcrypt.compare(validatedData.password, practitioner.passwordHash);
    if (!isMatch) {
      res.status(401).json({ error: 'Invalid credentials.' });
      return;
    }

    // 4. Token Generation
    const token = generateToken(practitioner.id);

    res.status(200).json({
      message: 'Login successful',
      token,
      practitioner: {
        id: practitioner.id,
        email: practitioner.email,
        fullName: practitioner.fullName,
        hospitalName: practitioner.hospitalName,
        planType: practitioner.planType,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Force TypeScript to recognize the type, and flatten the error array into a clean object
      const validationError = error as z.ZodError;
      res.status(400).json({ error: 'Validation failed', details: validationError.flatten().fieldErrors });
      return;
    }
    console.error('[AUTH ERROR] Registration failed:', error);
    res.status(500).json({ error: 'Internal server error during registration.' });
  }
};