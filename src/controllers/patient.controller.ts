import { Response } from 'express';
import { z } from 'zod';
import { prisma } from '../server';
import { AuthRequest } from '../middlewares/auth.middleware';
import { createPatientSchema } from '../schemas/patient.schema';

export const addPatient = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // 1. Ensure Auth Middleware did its job
    const practitionerId = req.practitionerId;
    if (!practitionerId) {
      res.status(401).json({ error: 'Unauthorized boundary failure.' });
      return;
    }

    // 2. Strict Input Validation
    const validatedData = createPatientSchema.parse(req.body);

    // 3. Database Insertion (Automatically linking to the authenticated Practitioner)
    const patient = await prisma.patient.create({
      data: {
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        age: validatedData.age,
        practitionerId: practitionerId,
      },
    });

    res.status(201).json({
      message: 'Patient registered successfully.',
      patient,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationError = error as z.ZodError<any>;
      res.status(400).json({ error: 'Validation failed', details: validationError.flatten().fieldErrors });
      return;
    }
    console.error('[DATABASE ERROR] Failed to add patient:', error);
    res.status(500).json({ error: 'Internal server error while adding patient.' });
  }
};

export const getMyPatients = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const practitionerId = req.practitionerId;
    if (!practitionerId) {
      res.status(401).json({ error: 'Unauthorized boundary failure.' });
      return;
    }

    // Fetch only the patients mapped to the JWT's identity
    // Industry standard: Sort them chronologically by creation date
    const patients = await prisma.patient.findMany({
      where: { practitionerId },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({
      count: patients.length,
      patients,
    });
  } catch (error) {
    console.error('[DATABASE ERROR] Failed to fetch patients:', error);
    res.status(500).json({ error: 'Internal server error while fetching patients.' });
  }
};