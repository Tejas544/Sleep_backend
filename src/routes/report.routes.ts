import { Router } from 'express';
import { createReport, getPatientReports } from '../controllers/report.controller';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();

// Secure all routes
router.use(requireAuth);

router.post('/', createReport);
router.get('/:patientId', getPatientReports); // Uses a URL parameter to specify the patient

export default router;