import { z } from 'zod';

export const createReportSchema = z.object({
  patientId: z.string().uuid('Invalid patient ID format.'),
  clinicalScore: z.number().min(0).max(100, 'Clinical score must be between 0 and 100.'),
  totalSleepMin: z.number().int().nonnegative('Total sleep must be a positive integer.'),
  deepSleepMin: z.number().int().nonnegative('Deep sleep must be a positive integer.'),
  remSleepMin: z.number().int().nonnegative('REM sleep must be a positive integer.'),
});

export type CreateReportInput = z.infer<typeof createReportSchema>;