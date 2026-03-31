import { Response } from 'express';
import { z } from 'zod';
import { prisma } from '../server';
import { AuthRequest } from '../middlewares/auth.middleware';
import { createReportSchema } from '../schemas/report.schema';

export const createReport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const practitionerId = req.practitionerId;
    if (!practitionerId) {
      res.status(401).json({ error: 'Unauthorized boundary failure.' });
      return;
    }

    // 1. Strict Input Validation
    const validatedData = createReportSchema.parse(req.body);

    // 2. Authorization Guard Check (Horizontal Privilege Escalation Prevention)
    // We must prove this patient belongs to the practitioner making the request.
    const patient = await prisma.patient.findUnique({
      where: { id: validatedData.patientId },
    });

    if (!patient || patient.practitionerId !== practitionerId) {
      res.status(403).json({ error: 'Forbidden: Patient not found or access denied.' });
      return;
    }

    // 3. Database Insertion
    const report = await prisma.report.create({
      data: {
        patientId: validatedData.patientId,
        clinicalScore: validatedData.clinicalScore,
        totalSleepMin: validatedData.totalSleepMin,
        deepSleepMin: validatedData.deepSleepMin,
        remSleepMin: validatedData.remSleepMin,
        status: 'ANALYZED', // Defaulting to analyzed for this phase
      },
    });

    res.status(201).json({
      message: 'Clinical report generated successfully.',
      report,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationError = error as z.ZodError<any>;
      res.status(400).json({ error: 'Validation failed', details: validationError.flatten().fieldErrors });
      return;
    }
    console.error('[DATABASE ERROR] Failed to create report:', error);
    res.status(500).json({ error: 'Internal server error while creating report.' });
  }
};

export const getPatientReports = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const practitionerId = req.practitionerId;
    
    // Explicitly cast the parameter to a single string to satisfy Prisma
    const patientId = req.params.patientId as string;

    if (!practitionerId) {
      res.status(401).json({ error: 'Unauthorized boundary failure.' });
      return;
    }

    // 1. Authorization Guard Check
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
    });

    if (!patient || patient.practitionerId !== practitionerId) {
      res.status(403).json({ error: 'Forbidden: Patient not found or access denied.' });
      return;
    }

    // 2. Fetch Reports (Chronological order)
    // Explicitly map the field name to the variable to prevent shorthand inference errors
    const reports = await prisma.report.findMany({
      where: { patientId: patientId }, 
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({
      count: reports.length,
      reports,
    });
  } catch (error) {
    console.error('[DATABASE ERROR] Failed to fetch reports:', error);
    res.status(500).json({ error: 'Internal server error while fetching reports.' });
  }

};