"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGuestLegalStatusHandler = getGuestLegalStatusHandler;
exports.acceptGuestLegalHandler = acceptGuestLegalHandler;
exports.getUserLegalStatusHandler = getUserLegalStatusHandler;
exports.acceptUserLegalHandler = acceptUserLegalHandler;
const legalService_1 = require("../services/legalService");
const db_1 = require("../db");
const brandingUtils_1 = require("../utils/brandingUtils");
function getRequestMeta(req) {
    return {
        ipAddress: req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
            req.socket.remoteAddress ||
            null,
        userAgent: req.headers['user-agent'] || null,
    };
}
async function getGuestLegalStatusHandler(req, res) {
    try {
        const guestId = req.params.guestId;
        const status = await (0, legalService_1.getGuestLegalStatus)(guestId);
        if (!status) {
            return res.status(404).json({ error: 'Invité non trouvé.' });
        }
        const guest = await db_1.prisma.guest.findUnique({
            where: { id: guestId },
            select: { event: { select: { tenant: { select: { name: true, branding: true } } } } },
        });
        return res.json({
            ...status,
            requiresAcceptance: !(status.termsAccepted && status.privacyAccepted),
            branding: (0, brandingUtils_1.resolveBranding)(guest?.event?.tenant?.branding),
            organizationName: guest?.event?.tenant?.name || 'Organisation',
        });
    }
    catch (error) {
        console.error('Erreur statut légal invité:', error);
        return res.status(500).json({ error: 'Impossible de récupérer le statut légal.' });
    }
}
async function acceptGuestLegalHandler(req, res) {
    try {
        const guestId = req.params.guestId;
        const { acceptTerms, acceptPrivacy } = req.body;
        const status = await (0, legalService_1.recordGuestLegalAcceptance)({
            guestId,
            acceptTerms: Boolean(acceptTerms),
            acceptPrivacy: Boolean(acceptPrivacy),
            ...getRequestMeta(req),
        });
        if (!status) {
            return res.status(404).json({ error: 'Invité non trouvé.' });
        }
        const guest = await db_1.prisma.guest.findUnique({
            where: { id: guestId },
            select: { event: { select: { tenant: { select: { name: true, branding: true } } } } },
        });
        return res.json({
            message: 'Acceptation enregistrée avec succès.',
            ...status,
            requiresAcceptance: false,
            branding: (0, brandingUtils_1.resolveBranding)(guest?.event?.tenant?.branding),
            organizationName: guest?.event?.tenant?.name || 'Organisation',
        });
    }
    catch (error) {
        if (error.message === 'TERMS_AND_PRIVACY_REQUIRED') {
            return res.status(400).json({
                error: 'Vous devez accepter les conditions d\'utilisation et la politique de confidentialité.',
            });
        }
        console.error('Erreur acceptation légale invité:', error);
        return res.status(500).json({ error: 'Impossible d\'enregistrer votre acceptation.' });
    }
}
async function getUserLegalStatusHandler(req, res) {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Non authentifié.' });
        }
        if (req.user?.impersonatedBy) {
            return res.json({
                termsAccepted: true,
                privacyAccepted: true,
                requiresAcceptance: false,
                isFirstAcceptance: false,
                supportSession: true,
            });
        }
        const status = await (0, legalService_1.getUserLegalStatus)(userId);
        if (!status) {
            return res.status(404).json({ error: 'Utilisateur non trouvé.' });
        }
        return res.json(status);
    }
    catch (error) {
        console.error('Erreur statut légal utilisateur:', error);
        return res.status(500).json({ error: 'Impossible de récupérer le statut légal.' });
    }
}
async function acceptUserLegalHandler(req, res) {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Non authentifié.' });
        }
        if (req.user?.impersonatedBy) {
            return res.status(403).json({
                error: 'Une session support ne peut pas accepter les conditions à la place du client.',
            });
        }
        const { acceptTerms, acceptPrivacy } = req.body;
        const status = await (0, legalService_1.recordUserLegalAcceptance)({
            userId,
            acceptTerms: Boolean(acceptTerms),
            acceptPrivacy: Boolean(acceptPrivacy),
            ...getRequestMeta(req),
        });
        if (!status) {
            return res.status(404).json({ error: 'Utilisateur non trouvé.' });
        }
        return res.json({
            message: 'Acceptation enregistrée avec succès.',
            ...status,
        });
    }
    catch (error) {
        if (error.message === 'TERMS_AND_PRIVACY_REQUIRED') {
            return res.status(400).json({
                error: 'Vous devez accepter les conditions d\'utilisation et la politique de confidentialité.',
            });
        }
        console.error('Erreur acceptation légale utilisateur:', error);
        return res.status(500).json({ error: 'Impossible d\'enregistrer votre acceptation.' });
    }
}
