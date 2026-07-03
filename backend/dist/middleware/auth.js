"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = requireAuth;
exports.requireRole = requireRole;
exports.requireActiveLicense = requireActiveLicense;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const db_1 = require("../db");
const JWT_SECRET = process.env.JWT_SECRET || 'eventmaster-secret-key-12345';
function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Accès non autorisé. Token manquant ou invalide.' });
    }
    const token = authHeader.split(' ')[1];
    try {
        const payload = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        req.user = {
            id: payload.userId,
            tenantId: payload.tenantId,
            role: payload.role,
        };
        next();
    }
    catch (error) {
        return res.status(401).json({ error: 'Token invalide ou expiré.' });
    }
}
function requireRole(roles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Non authentifié.' });
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Accès refusé. Privilèges insuffisants.' });
        }
        next();
    };
}
async function requireActiveLicense(req, res, next) {
    if (!req.user) {
        return res.status(401).json({ error: 'Non authentifié.' });
    }
    // SUPER_ADMIN et COMMERCIAL (sans organisation) contournent la vérification de licence
    if (req.user.role === 'SUPER_ADMIN' || req.user.role === 'COMMERCIAL') {
        return next();
    }
    const tenantId = req.user.tenantId;
    if (!tenantId) {
        return res.status(403).json({ error: 'Tenant non identifié. Accès refusé.' });
    }
    try {
        const tenant = await db_1.prisma.tenant.findUnique({
            where: { id: tenantId },
        });
        if (!tenant) {
            return res.status(404).json({ error: 'Organisation non trouvée.' });
        }
        if (!tenant.licenseActive) {
            return res.status(403).json({
                error: 'Votre licence est inactive. Veuillez contacter l\'administrateur ou régulariser votre abonnement.',
                licenseError: 'INACTIVE'
            });
        }
        if (tenant.licenseExpiresAt && new Date(tenant.licenseExpiresAt) < new Date()) {
            return res.status(403).json({
                error: `Votre licence a expiré le ${new Date(tenant.licenseExpiresAt).toLocaleDateString('fr-FR')}. Veuillez renouveler votre abonnement.`,
                licenseError: 'EXPIRED'
            });
        }
        next();
    }
    catch (error) {
        console.error('[Auth Middleware] Erreur lors de la vérification de la licence:', error);
        return res.status(500).json({ error: 'Erreur interne lors de la vérification de la licence.' });
    }
}
