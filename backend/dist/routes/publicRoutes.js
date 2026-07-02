"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const notificationService_1 = require("../services/notificationService");
const plansConfig_1 = require("../config/plansConfig");
const defaultGuestMessageTemplates_1 = require("../config/defaultGuestMessageTemplates");
const messageTemplateService_1 = require("../services/messageTemplateService");
const router = (0, express_1.Router)();
// GET /api/public/plans
router.get('/plans', async (req, res) => {
    return res.json((0, plansConfig_1.getPlansConfiguration)());
});
// GET /api/public/templates
// Public endpoint to fetch templates that are configured to be shown on the landing page
router.get('/templates', async (req, res) => {
    try {
        const templates = await db_1.prisma.template.findMany({
            where: {
                showOnLanding: true,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
        return res.json(templates.map(t => ({
            id: t.id,
            name: t.name,
            content: t.content,
            createdAt: t.createdAt,
        })));
    }
    catch (error) {
        console.error('Erreur lors de la récupération des modèles publics:', error);
        return res.status(500).json({ error: 'Erreur lors de la récupération des modèles publics' });
    }
});
// POST /api/public/contact
// Public endpoint to submit contact form messages
router.post('/contact', async (req, res) => {
    try {
        const { name, email, subject, message } = req.body;
        if (!name || !email || !subject || !message) {
            return res.status(400).json({ error: 'Tous les champs sont requis (nom, email, sujet, message).' });
        }
        const adminEmail = defaultGuestMessageTemplates_1.CONTACT_ADMIN_EMAIL;
        const adminWhatsApp = defaultGuestMessageTemplates_1.CONTACT_ADMIN_WHATSAPP;
        const emailSubject = `[EventMaster Contact] ${subject}`;
        const emailText = `Nouveau message de contact EventMaster\n\nNom : ${name}\nEmail : ${email}\nSujet : ${subject}\n\nMessage :\n${message}`;
        const emailHtml = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px;">
        <h2 style="color: #312e81; margin-top: 0;">Nouveau message de contact</h2>
        <p><strong>Nom :</strong> ${name}</p>
        <p><strong>Email :</strong> <a href="mailto:${email}">${email}</a></p>
        <p><strong>Sujet :</strong> ${subject}</p>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-top: 16px;">
          <p style="margin: 0; white-space: pre-line; color: #334155;">${message}</p>
        </div>
        <p style="font-size: 12px; color: #94a3b8; margin-top: 24px;">EventMaster — formulaire de contact public</p>
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
                error: 'Impossible d\'envoyer votre message pour le moment. Veuillez réessayer ou nous contacter directement.',
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
        return res.status(500).json({ error: 'Une erreur est survenue lors de l\'envoi de votre message.' });
    }
});
exports.default = router;
