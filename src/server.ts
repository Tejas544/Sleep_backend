import app from './app';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

dotenv.config();

const PORT = process.env.PORT || 5000;
export const prisma = new PrismaClient();

async function bootstrap() {
  try {
    // Verify DB Connection before starting server
    await prisma.$connect();
    console.log('[DATABASE] PostgreSQL connected successfully.');

    app.listen(PORT, () => {
      console.log(`[SERVER] InfoSys PRO AI Backend running on port ${PORT}`);
    });
  } catch (error) {
    console.error('[FATAL ERROR] Failed to start server:', error);
    process.exit(1);
  }
}

bootstrap();