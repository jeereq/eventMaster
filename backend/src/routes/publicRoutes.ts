import { Router, Request, Response } from 'express';
import { prisma } from '../db';
import { sendRealEmail } from '../services/notificationService';
import fs from 'fs';
import path from 'path';

const router = Router();

const settingsFilePath = path.join(__dirname, '..', 'config', 'settings.json');

// GET /api/public/plans
// Public endpoint to fetch active subscription plans configuration
router.get('/plans', async (req: Request, res: Response) => {
  const defaultPlans = {
    STANDARD: {
      name: "Plan Standard",
      price: "30.000 FC",
      maxEvents: 8,
      maxGuests: 150,
      maxTemplates: 5,
      customTemplates: false
    },
    PREMIUM: {
      name: "Plan Premium",
      price: "80.000 FC",
      maxEvents: 20,
      maxGuests: 500,
      maxTemplates: 10,
      customTemplates: true
    },
    ENTERPRISE: {
      name: "Plan Enterprise",
      price: "275.000 FC",
      maxEvents: 9999,
      maxGuests: 99999,
      maxTemplates: 9999,
      customTemplates: true
    }
  };

  try {
    if (fs.existsSync(settingsFilePath)) {
      const data = fs.readFileSync(settingsFilePath, 'utf-8');
      const settings = JSON.parse(data);
      if (settings.plans) {
        return res.json(settings.plans);
      }
    }
    return res.json(defaultPlans);
  } catch (error) {
    console.error('Error reading plans from settings for public:', error);
    return res.json(defaultPlans);
  }
});

// GET /api/public/templates
// Public endpoint to fetch templates that are configured to be shown on the landing page
router.get('/templates', async (req: Request, res: Response) => {
  try {
    const templates = await prisma.template.findMany({
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

    // Send email to administrator
    const adminEmail = process.env.ADMIN_EMAIL || 'contact@eventmaster.cd';
    const emailSubject = `[EventMaster Contact] ${subject}`;
    const emailText = `Nouveau message de contact reçu :\n\nNom: ${name}\nEmail: ${email}\nSujet: ${subject}\n\nMessage:\n${message}`;
    const emailHtml = `
      <h3>Nouveau message de contact EventMaster</h3>
      <p><strong>Nom:</strong> ${name}</p>
      <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
      <p><strong>Sujet:</strong> ${subject}</p>
      <br/>
      <p><strong>Message:</strong></p>
      <p style="white-space: pre-line; background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; borderRadius: 8px;">${message}</p>
    `;

    const emailResult = await sendRealEmail(adminEmail, emailSubject, emailText, emailHtml);

    return res.status(200).json({
      success: true,
      message: 'Votre message a été envoyé avec succès ! Notre équipe vous répondra dans les plus brefs délais.',
      simulated: emailResult.simulated
    });
  } catch (error: any) {
    console.error('Erreur lors de la soumission du formulaire de contact:', error);
    return res.status(500).json({ error: 'Une erreur est survenue lors de l\'envoi de votre message.' });
  }
});

export default router;
