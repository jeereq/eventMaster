import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { rateLimit } from 'express-rate-limit';
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
import notificationRoutes from './routes/notificationRoutes';
import marketplaceRoutes from './routes/marketplaceRoutes';
import beverageBrandRoutes from './routes/beverageBrandRoutes';
import { handleStripeWebhook } from './controllers/billingController';
import { prisma } from './db';
import { startReminderWorker } from './services/reminderService';
import { startSubscriptionExpiryWorker } from './services/subscriptionExpiryService';
import { startCommercialPayoutWorker } from './services/commercialPayoutWorker';
import { loadSubscriptionPlansFromDb } from './services/subscriptionPlanCatalogService';
import { hydratePlatformSettingsFromDb } from './services/platformSettingsService';
import { isSendGridConfigured, logNotificationConfigStatus } from './config/notificationConfig';
import { maintenanceGuard } from './middleware/maintenanceGuard';
import { createCorsOptions, getJwtSecret, getRateLimitConfig } from './config/security';
import { bodyLimitFor, DEFAULT_BODY_LIMIT, LARGE_BODY_LIMIT } from './config/bodyLimits';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;
const rateLimits = getRateLimitConfig();

// Valide les secrets dès le démarrage, avant d'accepter du trafic.
getJwtSecret();

// Global Middlewares
app.set('trust proxy', 1);
app.use(cors(createCorsOptions()));
app.use((_req: Request, res: Response, next: NextFunction) => {
  // API JSON uniquement : pas d'interprétation de type MIME ni d'affichage en iframe.
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});
app.disable('x-powered-by');
app.use(rateLimit({
  windowMs: rateLimits.windowMs,
  limit: rateLimits.globalMax,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
}));
const bodyParsers = new Map(
  [DEFAULT_BODY_LIMIT, LARGE_BODY_LIMIT].map((limit) => [
    limit,
    [express.json({ limit }), express.urlencoded({ limit, extended: true })] as const,
  ]),
);
app.use((req: Request, res: Response, next: NextFunction) => {
  const limit = bodyLimitFor(req.path, Boolean(req.headers.authorization?.startsWith('Bearer ')));
  const [json, urlencoded] = bodyParsers.get(limit)!;
  json(req, res, (err?: unknown) => (err ? next(err) : urlencoded(req, res, next)));
});

// Basic Route for Health Check
app.get('/health', async (req: Request, res: Response) => {
  try {
    // Basic Prisma connection test
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'OK', database: 'Connected', message: 'EventMaster API is running' });
  } catch (error: any) {
    console.error('[Health] Base de données injoignable:', error);
    res.status(500).json({ status: 'ERROR', database: 'Disconnected' });
  }
});

app.get('/api/health', async (req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'OK', database: 'Connected', message: 'EventMaster API is running' });
  } catch (error: any) {
    console.error('[Health] Base de données injoignable:', error);
    res.status(500).json({ status: 'ERROR', database: 'Disconnected' });
  }
});

app.use(maintenanceGuard);

// Mount Routes
app.use('/api/auth', rateLimit({
  windowMs: rateLimits.windowMs,
  limit: rateLimits.authMax,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
}), authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/rsvp', rsvpRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/team', teamRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/marketplace', marketplaceRoutes);
app.use('/api/beverage-brands', beverageBrandRoutes);
app.use('/api/commercial', commercialRoutes);
app.use('/api/org-commercial', orgCommercialRoutes);
app.use('/api/notifications', notificationRoutes);
app.post('/api/billing/webhook', handleStripeWebhook);
app.use('/api/billing', billingRoutes);

async function bootstrap() {
  try {
    await hydratePlatformSettingsFromDb();
  } catch (error) {
    console.error(
      '[EventMaster Server] Impossible de charger les réglages plateforme depuis la BD — fallback fichier/défauts.',
      error,
    );
  }

  try {
    await loadSubscriptionPlansFromDb();
  } catch (error) {
    console.error(
      '[EventMaster Server] Impossible de charger les forfaits depuis la BD — fallback défauts code.',
      error,
    );
  }

  try {
    const { ensureDefaultGuestMessageTemplates } = await import('./services/messageTemplateService');
    await ensureDefaultGuestMessageTemplates();
  } catch (error) {
    console.warn('[EventMaster Server] Impossible de synchroniser les modèles de messages invités.', error);
  }

  app.listen(PORT, () => {
    console.log(`[EventMaster Server] running on http://localhost:${PORT}`);

    if (!isSendGridConfigured()) {
      console.error(
        '[EventMaster Server] ATTENTION : SendGrid non configuré — aucun e-mail ne sera envoyé. Configurez SENDGRID_API_KEY et SENDGRID_FROM (ou les réglages plateforme).',
      );
    } else {
      logNotificationConfigStatus();
    }

    if (!process.env.CLOUDINARY_CLOUD_NAME) {
      console.warn(
        "[EventMaster Server] Cloudinary non configuré — uploads d'images modèles désactivés. CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET.",
      );
    }

    startReminderWorker();
    startSubscriptionExpiryWorker();
    startCommercialPayoutWorker();
  });
}

void bootstrap();

// Reload ts-node-dev after Prisma generate (maxServices + forfaits VENUE / SERVICE / CATALOG).

