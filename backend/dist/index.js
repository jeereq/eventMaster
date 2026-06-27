"use strict";
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
const billingController_1 = require("./controllers/billingController");
const db_1 = require("./db");
// Load environment variables
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5001;
// Global Middlewares
app.use((0, cors_1.default)({
    origin: '*', // We can restrict this to the frontend URL later if needed
    credentials: true
}));
app.use(express_1.default.json());
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
// Mount Routes
app.use('/api/auth', authRoutes_1.default);
app.use('/api/events', eventRoutes_1.default);
app.use('/api/templates', templateRoutes_1.default);
app.use('/api/rsvp', rsvpRoutes_1.default);
app.use('/api/admin', adminRoutes_1.default);
app.post('/api/billing/webhook', billingController_1.handleStripeWebhook);
app.use('/api/billing', billingRoutes_1.default);
// Start Server
app.listen(PORT, () => {
    console.log(`[EventMaster Server] running on http://localhost:${PORT}`);
});
