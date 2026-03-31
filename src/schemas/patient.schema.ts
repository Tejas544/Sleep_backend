import { z } from 'zod';

export const createPatientSchema = z.object({
  firstName: z.string().min(1, 'First name is strictly required.'),
  lastName: z.string().min(1, 'Last name is strictly required.'),
  age: z.number().int().positive('Age must be a valid positive number.'),
});

export type CreatePatientInput = z.infer<typeof createPatientSchema>;