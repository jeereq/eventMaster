"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const eventRoutes_1 = __importDefault(require("./routes/eventRoutes"));
const templateRoutes_1 = __importDefault(require("./routes/templateRoutes"));
const rsvpRoutes_1 = __importDefault(require("./routes/rsvpRoutes"));
const billingRoutes_1 = __importDefault(require("./routes/billingRoutes"));
const adminRoutes_1 = __importDefault(require("./routes/adminRoutes"));
const publicRoutes_1 = __importDefault(require("./routes/publicRoutes"));
const subscriptionRoutes_1 = __importDefault(require("./routes/subscriptionRoutes"));
const teamRoutes_1 = __importDefault(require("./routes/teamRoutes"));
const roomRoutes_1 = __importDefault(require("./routes/roomRoutes"));
const commercialRoutes_1 = __importDefault(require("./routes/commercialRoutes"));
const orgCommercialRoutes_1 = __importDefault(require("./routes/orgCommercialRoutes"));
const uploadRoutes_1 = __importDefault(require("./routes/uploadRoutes"));
const notificationRoutes_1 = __importDefault(require("./routes/notificationRoutes"));
const marketplaceRoutes_1 = __importDefault(require("./routes/marketplaceRoutes"));
const billingController_1 = require("./controllers/billingController");
const db_1 = require("./db");
const reminderService_1 = require("./services/reminderService");
const subscriptionExpiryService_1 = require("./services/subscriptionExpiryService");
const commercialPayoutWorker_1 = require("./services/commercialPayoutWorker");
const subscriptionPlanCatalogService_1 = require("./services/subscriptionPlanCatalogService");
const platformSettingsService_1 = require("./services/platformSettingsService");
const notificationConfig_1 = require("./config/notificationConfig");
const maintenanceGuard_1 = require("./middleware/maintenanceGuard");
// Load environment variables
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5001;
// Global Middlewares
app.use((0, cors_1.default)({
    origin: '*', // We can restrict this to the frontend URL later if needed
    credentials: true
}));
app.use(express_1.default.json({ limit: '50mb' }));
app.use(express_1.default.urlencoded({ limit: '50mb', extended: true }));
// Basic Route for Health Check
app.get('/health', async (req, res) => {
    try {
        // Basic Prisma connection test
        await db_1.prisma.$queryRaw `SELECT 1`;
        res.json({ status: 'OK', database: 'Connected', message: 'EventMaster API is running' });
    }
    catch (error) {
        res.status(500).json({ status: 'ERROR', database: 'Disconnected', error: error.message });
    }
});
app.get('/api/health', async (req, res) => {
    try {
        await db_1.prisma.$queryRaw `SELECT 1`;
        res.json({ status: 'OK', database: 'Connected', message: 'EventMaster API is running' });
    }
    catch (error) {
        res.status(500).json({ status: 'ERROR', database: 'Disconnected', error: error.message });
    }
});
app.use(maintenanceGuard_1.maintenanceGuard);
// Mount Routes
app.use('/api/auth', authRoutes_1.default);
app.use('/api/events', eventRoutes_1.default);
app.use('/api/templates', templateRoutes_1.default);
app.use('/api/uploads', uploadRoutes_1.default);
app.use('/api/rsvp', rsvpRoutes_1.default);
app.use('/api/admin', adminRoutes_1.default);
app.use('/api/public', publicRoutes_1.default);
app.use('/api/subscriptions', subscriptionRoutes_1.default);
app.use('/api/team', teamRoutes_1.default);
app.use('/api/rooms', roomRoutes_1.default);
app.use('/api/marketplace', marketplaceRoutes_1.default);
app.use('/api/commercial', commercialRoutes_1.default);
app.use('/api/org-commercial', orgCommercialRoutes_1.default);
app.use('/api/notifications', notificationRoutes_1.default);
app.post('/api/billing/webhook', billingController_1.handleStripeWebhook);
app.use('/api/billing', billingRoutes_1.default);
async function bootstrap() {
    try {
        await (0, platformSettingsService_1.hydratePlatformSettingsFromDb)();
    }
    catch (error) {
        console.error('[EventMaster Server] Impossible de charger les réglages plateforme depuis la BD — fallback fichier/défauts.', error);
    }
    try {
        await (0, subscriptionPlanCatalogService_1.loadSubscriptionPlansFromDb)();
    }
    catch (error) {
        console.error('[EventMaster Server] Impossible de charger les forfaits depuis la BD — fallback défauts code.', error);
    }
    try {
        const { ensureDefaultGuestMessageTemplates } = await Promise.resolve().then(() => __importStar(require('./services/messageTemplateService')));
        await ensureDefaultGuestMessageTemplates();
    }
    catch (error) {
        console.warn('[EventMaster Server] Impossible de synchroniser les modèles de messages invités.', error);
    }
    app.listen(PORT, () => {
        console.log(`[EventMaster Server] running on http://localhost:${PORT}`);
        if (!(0, notificationConfig_1.isSendGridConfigured)()) {
            console.error('[EventMaster Server] ATTENTION : SendGrid non configuré — aucun e-mail ne sera envoyé. Configurez SENDGRID_API_KEY et SENDGRID_FROM (ou les réglages plateforme).');
        }
        else {
            (0, notificationConfig_1.logNotificationConfigStatus)();
        }
        if (!process.env.CLOUDINARY_CLOUD_NAME) {
            console.warn("[EventMaster Server] Cloudinary non configuré — uploads d'images modèles désactivés. CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET.");
        }
        (0, reminderService_1.startReminderWorker)();
        (0, subscriptionExpiryService_1.startSubscriptionExpiryWorker)();
        (0, commercialPayoutWorker_1.startCommercialPayoutWorker)();
    });
}
void bootstrap();
// Reload ts-node-dev after Prisma generate (maxServices + forfaits VENUE / SERVICE / CATALOG).
