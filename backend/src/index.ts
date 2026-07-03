import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes';
import eventRoutes from './routes/eventRoutes';
import templateRoutes from './routes/templateRoutes';
import rsvpRoutes from './routes/rsvpRoutes';
import billingRoutes from './routes/billingRoutes';
import adminRoutes from './routes/adminRoutes';
import publicRoutes from './routes/publicRoutes';
import subscriptionRoutes from './routes/subscriptionRoutes';
import teamRoutes from './routes/teamRoutes';
import roomRoutes from './routes/roomRoutes';
import commercialRoutes from './routes/commercialRoutes';
import orgCommercialRoutes from './routes/orgCommercialRoutes';
import uploadRoutes from './routes/uploadRoutes';
import { handleStripeWebhook } from './controllers/billingController';
import { prisma } from './db';
import { startReminderWorker } from './services/reminderService';
import { startSubscriptionExpiryWorker } from './services/subscriptionExpiryService';
import { isSendGridConfigured } from './config/notificationConfig';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// Global Middlewares
app.use(cors({
  origin: '*', // We can restrict this to the frontend URL later if needed
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Basic Route for Health Check
app.get('/health', async (req: Request, res: Response) => {
  try {
    // Basic Prisma connection test
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'OK', database: 'Connected', message: 'EventMaster API is running' });
  } catch (error: any) {
    res.status(500).json({ status: 'ERROR', database: 'Disconnected', error: error.message });
  }
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/rsvp', rsvpRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/team', teamRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/commercial', commercialRoutes);
app.use('/api/org-commercial', orgCommercialRoutes);
app.post('/api/billing/webhook', handleStripeWebhook);
app.use('/api/billing', billingRoutes);

// Start Server
app.listen(PORT, () => {
  console.log(`[EventMaster Server] running on http://localhost:${PORT}`);

  if (!isSendGridConfigured()) {
    console.error(
      '[EventMaster Server] ATTENTION : SendGrid non configuré — aucun e-mail ne sera envoyé. Configurez SENDGRID_API_KEY et SENDGRID_FROM.',
    );
  }

  if (!process.env.CLOUDINARY_CLOUD_NAME) {
    console.warn(
      '[EventMaster Server] Cloudinary non configuré — uploads d\'images modèles désactivés. CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET.',
    );
  }

  // Start background workers
  startReminderWorker();
  startSubscriptionExpiryWorker();
});

// Trigger ts-node-dev reload to pick up generated Prisma client after schema change (latitude and longitude fields added)

