"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMyBranding = getMyBranding;
exports.updateMyBranding = updateMyBranding;
const db_1 = require("../db");
const permissionsService_1 = require("../services/permissionsService");
const tenantAccess_1 = require("../utils/tenantAccess");
const brandingUtils_1 = require("../utils/brandingUtils");
const client_1 = require("@prisma/client");
async function getMyBranding(req, res) {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            return res.status(403).json({ error: 'Organisation non identifiée.' });
        }
        const tenant = await db_1.prisma.tenant.findUnique({ where: { id: tenantId } });
        if (!tenant) {
            return res.status(404).json({ error: 'Organisation introuvable.' });
        }
        return res.json({
            branding: (0, brandingUtils_1.parseBranding)(tenant.branding) || { primary: '#4f46e5', accent: '#6366f1' },
            tenant: (0, tenantAccess_1.formatTenantResponse)(tenant),
        });
    }
    catch (error) {
        console.error('getMyBranding:', error);
        return res.status(500).json({ error: 'Impossible de charger le branding.' });
    }
}
async function updateMyBranding(req, res) {
    try {
        const tenantId = req.user?.tenantId;
        const userId = req.user?.id;
        if (!tenantId || !userId) {
            return res.status(403).json({ error: 'Organisation non identifiée.' });
        }
        const access = await (0, permissionsService_1.resolveOrgAccess)(userId, tenantId);
        if (!access.isOwner && access.level !== 'manager') {
            return res.status(403).json({
                error: 'Seuls le propriétaire et les managers peuvent modifier les couleurs.',
            });
        }
        const { primary, accent, sidebar, reset } = req.body || {};
        if (reset === true) {
            const tenant = await db_1.prisma.tenant.update({
                where: { id: tenantId },
                data: { branding: client_1.Prisma.DbNull },
            });
            return res.json({
                message: 'Couleurs EventMaster restaurées.',
                branding: { primary: '#4f46e5', accent: '#6366f1' },
                tenant: (0, tenantAccess_1.formatTenantResponse)(tenant),
            });
        }
        const branding = (0, brandingUtils_1.parseBranding)({
            primary: (0, brandingUtils_1.normalizeBrandHex)(primary),
            accent: (0, brandingUtils_1.normalizeBrandHex)(accent),
            sidebar: (0, brandingUtils_1.normalizeBrandHex)(sidebar),
        });
        if (!branding?.primary) {
            return res.status(400).json({ error: 'Couleur primary invalide (hex #RGB ou #RRGGBB).' });
        }
        const tenant = await db_1.prisma.tenant.update({
            where: { id: tenantId },
            data: { branding },
        });
        return res.json({
            message: 'Couleurs de marque enregistrées.',
            branding,
            tenant: (0, tenantAccess_1.formatTenantResponse)(tenant),
        });
    }
    catch (error) {
        console.error('updateMyBranding:', error);
        return res.status(500).json({ error: "Impossible d'enregistrer le branding." });
    }
}
