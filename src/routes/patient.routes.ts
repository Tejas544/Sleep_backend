import { Router } from 'express';
import { addPatient, getMyPatients } from '../controllers/patient.controller';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();

// Apply the security perimeter to all routes in this file
router.use(requireAuth);

router.post('/', addPatient);
router.get('/', getMyPatients);

export default router;