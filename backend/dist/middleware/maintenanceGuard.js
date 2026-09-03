"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.maintenanceGuard = maintenanceGuard;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const platformSettingsService_1 = require("../services/platformSettingsService");
const JWT_SECRET = process.env.JWT_SECRET || 'eventmaster-secret-key-12345';
const ALLOWED_PREFIXES = [
    '/health',
    '/api/health',
    '/api/public/site',
    '/api/public/plans',
    '/api/public/templates',
    '/api/public/venues',
    '/api/public/services',
    '/api/public/event-plan-ai',
    '/api/public/ai-simulations',
    '/api/auth/login',
    '/api/auth/forgot-password',
    '/api/auth/reset-password',
    '/api/billing/webhook',
];
function isAllowedPath(path) {
    return ALLOWED_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));
}
/**
 * Bloque l’API en mode maintenance, sauf santé, site public, login Super Admin
 * et routes RSVP (invités).
 */
function maintenanceGuard(req, res, next) {
    try {
        const settings = (0, platformSettingsService_1.loadPlatformSettings)();
        if (!settings.maintenanceMode)
            return next();
        const path = (req.originalUrl || req.url || req.path).split('?')[0];
        if (isAllowedPath(path) || path.startsWith('/api/rsvp') || path.startsWith('/api/admin')) {
            return next();
        }
        // Auth login déjà autorisé ; laisser Super Admin déjà connecté accéder au reste
        const auth = req.headers.authorization;
        if (auth?.startsWith('Bearer ')) {
            try {
                const payload = jsonwebtoken_1.default.verify(auth.slice(7), JWT_SECRET);
                if (payload.role === 'SUPER_ADMIN')
                    return next();
            }
            catch {
                /* ignore */
            }
        }
        // Inscription / OTP bloqués pendant maintenance
        return res.status(503).json({
            error: 'maintenance',
            message: settings.maintenanceMessage ||
                'La plateforme est temporairement en maintenance.',
            maintenanceMode: true,
        });
    }
    catch {
        return next();
    }
}
