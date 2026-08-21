"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const notificationService_1 = require("../services/notificationService");
const plansConfig_1 = require("../config/plansConfig");
const subscriptionPlanCatalogService_1 = require("../services/subscriptionPlanCatalogService");
const messageTemplateService_1 = require("../services/messageTemplateService");
const platformSettingsService_1 = require("../services/platformSettingsService");
const auth_1 = require("../middleware/auth");
const marketplaceController_1 = require("../controllers/marketplaceController");
const publicEventController_1 = require("../controllers/publicEventController");
const router = (0, express_1.Router)();
/** GET /api/public/site — identité & contact (sans secrets) */
router.get('/site', (_req, res) => {
    try {
        return res.json((0, platformSettingsService_1.getPublicSiteConfig)());
    }
    catch (error) {
        console.error('[Public] Erreur site config:', error);
        return res.status(500).json({ error: 'Impossible de charger la configuration du site' });
    }
});
// GET /api/public/plans — cache (hydraté au démarrage, mis à jour à la sauvegarde admin)
router.get('/plans', async (_req, res) => {
    try {
        return res.json((0, plansConfig_1.getPlansConfiguration)());
    }
    catch (error) {
        console.error('[Public] Erreur chargement forfaits:', error);
        try {
            return res.json(await (0, subscriptionPlanCatalogService_1.loadSubscriptionPlansFromDb)());
        }
        catch {
            return res.json((0, plansConfig_1.getPlansConfiguration)());
        }
    }
});
// GET /api/public/templates
router.get('/templates', async (_req, res) => {
    try {
        const templates = await db_1.prisma.template.findMany({
            where: {
                tenantId: null,
                showOnLanding: true,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
        return res.json(templates.map((t) => {
            const content = t.content;
            return {
                id: t.id,
                name: t.name,
                content: t.content,
                tenantId: null,
                isGlobal: true,
                showOnLanding: t.showOnLanding,
                category: content?.global?.landingCategory || 'private',
                description: content?.global?.landingDescription || null,
                createdAt: t.createdAt,
            };
        }));
    }
    catch (error) {
        console.error('Erreur lors de la récupération des modèles publics:', error);
        return res.status(500).json({ error: 'Erreur lors de la récupération des modèles publics' });
    }
});
router.get('/venues', marketplaceController_1.listPublicVenues);
router.get('/venues/:slug', auth_1.optionalAuth, marketplaceController_1.getPublicVenue);
router.post('/venues/:slug/inquire', auth_1.requireAuth, marketplaceController_1.createVenueInquiry);
router.get('/services', marketplaceController_1.listPublicServices);
router.get('/services/:slug', auth_1.optionalAuth, marketplaceController_1.getPublicService);
router.post('/services/:slug/inquire', auth_1.requireAuth, marketplaceController_1.createServiceInquiry);
router.get('/vendors/:slug', marketplaceController_1.getPublicVendor);
router.get('/events', publicEventController_1.listPublicEvents);
router.get('/events/:slug', publicEventController_1.getPublicEvent);
router.post('/events/:slug/checkout', auth_1.requireAuth, publicEventController_1.checkoutPublicEvent);
router.get('/ticket-orders/session/:sessionId', publicEventController_1.getTicketOrderBySession);
// POST /api/public/contact
router.post('/contact', async (req, res) => {
    try {
        const settings = (0, platformSettingsService_1.loadPlatformSettings)();
        if (settings.maintenanceMode) {
            return res.status(503).json({
                error: 'maintenance',
                message: settings.maintenanceMessage || 'La plateforme est en maintenance.',
            });
        }
        const { name, email, subject, message } = req.body;
        if (!name || !email || !subject || !message) {
            return res
                .status(400)
                .json({ error: 'Tous les champs sont requis (nom, email, sujet, message).' });
        }
        const { email: adminEmail, whatsapp: adminWhatsApp, platformName, } = (0, platformSettingsService_1.getContactDestinations)(settings);
        const emailSubject = `[${platformName} Contact] ${subject}`;
        const emailText = `Nouveau message de contact ${platformName}\n\nNom : ${name}\nEmail : ${email}\nSujet : ${subject}\n\nMessage :\n${message}`;
        const emailHtml = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px;">
        <h2 style="color: #312e81; margin-top: 0;">Nouveau message de contact</h2>
        <p><strong>Nom :</strong> ${name}</p>
        <p><strong>Email :</strong> <a href="mailto:${email}">${email}</a></p>
        <p><strong>Sujet :</strong> ${subject}</p>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-top: 16px;">
          <p style="margin: 0; white-space: pre-line; color: #334155;">${message}</p>
        </div>
        <p style="font-size: 12px; color: #94a3b8; margin-top: 24px;">${platformName} — formulaire de contact public</p>
      </div>
    `;
        const emailResult = await (0, notificationService_1.sendRealEmail)(adminEmail, emailSubject, emailText, emailHtml);
        const whatsappRendered = await (0, messageTemplateService_1.renderGuestMessage)('CONTACT_ADMIN_WHATSAPP', {
            name,
            email,
            subject,
            message,
        });
        const whatsappResult = await (0, notificationService_1.sendRealWhatsApp)(adminWhatsApp, (0, messageTemplateService_1.polishWhatsAppBody)(whatsappRendered.body));
        const channels = [];
        if (emailResult.success)
            channels.push('email');
        if (whatsappResult.success)
            channels.push('whatsapp');
        if (channels.length === 0) {
            return res.status(502).json({
                error: "Impossible d'envoyer votre message pour le moment. Veuillez réessayer ou nous contacter directement.",
            });
        }
        return res.status(200).json({
            success: true,
            message: 'Votre message a été transmis avec succès ! Notre équipe vous répondra dans les plus brefs délais.',
            channels,
            emailSimulated: emailResult.simulated,
            whatsappSimulated: whatsappResult.simulated,
        });
    }
    catch (error) {
        console.error('Erreur lors de la soumission du formulaire de contact:', error);
        return res
            .status(500)
            .json({ error: "Une erreur est survenue lors de l'envoi de votre message." });
    }
});
exports.default = router;
