import { Router, Request, Response } from 'express';
import { prisma } from '../db';
import { sendRealEmail, sendRealWhatsApp } from '../services/notificationService';
import { getPlansConfiguration } from '../config/plansConfig';
import { loadSubscriptionPlansFromDb } from '../services/subscriptionPlanCatalogService';
import {
  CONTACT_ADMIN_EMAIL,
  CONTACT_ADMIN_WHATSAPP,
} from '../config/defaultGuestMessageTemplates';
import { renderGuestMessage, polishWhatsAppBody } from '../services/messageTemplateService';

const router = Router();

// GET /api/public/plans — catalogue depuis la BD (cache hydraté)
router.get('/plans', async (_req: Request, res: Response) => {
  try {
    const plans = await loadSubscriptionPlansFromDb();
    return res.json(plans);
  } catch (error: any) {
    console.error('[Public] Erreur chargement forfaits:', error);
    return res.json(getPlansConfiguration());
  }
});

// GET /api/public/templates
// Public endpoint to fetch templates that are configured to be shown on the landing page
router.get('/templates', async (req: Request, res: Response) => {
  try {
    const templates = await prisma.template.findMany({
      where: {
        tenantId: null,
        showOnLanding: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return res.json(templates.map(t => {
      const content = t.content as { global?: { landingCategory?: string; landingDescription?: string } } | null;
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
  } catch (error: any) {
    console.error('Erreur lors de la récupération des modèles publics:', error);
    return res.status(500).json({ error: 'Erreur lors de la récupération des modèles publics' });
  }
});

// POST /api/public/contact
// Public endpoint to submit contact form messages
router.post('/contact', async (req: Request, res: Response) => {
  try {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !subject || !message) {
      return res.status(400).json({ error: 'Tous les champs sont requis (nom, email, sujet, message).' });
    }

    const adminEmail = CONTACT_ADMIN_EMAIL;
    const adminWhatsApp = CONTACT_ADMIN_WHATSAPP;

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

    const emailResult = await sendRealEmail(adminEmail, emailSubject, emailText, emailHtml);

    const whatsappRendered = await renderGuestMessage('CONTACT_ADMIN_WHATSAPP', {
      name,
      email,
      subject,
      message,
    });
    const whatsappResult = await sendRealWhatsApp(
      adminWhatsApp,
      polishWhatsAppBody(whatsappRendered.body)
    );

    const channels: string[] = [];
    if (emailResult.success) channels.push('email');
    if (whatsappResult.success) channels.push('whatsapp');

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
  } catch (error: any) {
    console.error('Erreur lors de la soumission du formulaire de contact:', error);
    return res.status(500).json({ error: 'Une erreur est survenue lors de l\'envoi de votre message.' });
  }
});

export default router;
