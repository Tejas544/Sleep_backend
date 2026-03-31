import { Router } from 'express';
import multer from 'multer';
import { handleCsvUpload } from '../controllers/upload.controller';

const router = Router();

// Configure temporary storage for incoming CSVs
const upload = multer({ dest: 'uploads/' });

// The key 'file' must match the form-data key we use in Postman/Frontend
router.post('/', upload.single('file'), handleCsvUpload);

export default router;