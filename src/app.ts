import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import authRoutes from './routes/auth.routes';
import patientRoutes from './routes/patient.routes';
import reportRoutes from './routes/report.routes';
import paymentRoutes from './routes/payment.routes';

const app = express();

// Security & Utility Middlewares
app.use(helmet());
app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
app.use(express.json());
app.use(morgan('dev'));

// Health Check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Sleep AI Backend is running securely.' });
});

// Route Mounts (We will build these next)
 app.use('/api/auth', authRoutes);
// app.use('/api/payments', paymentRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/payments', paymentRoutes);

export default app;