import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from '../db';
import { sendRealEmail } from '../services/notificationService';

const JWT_SECRET = process.env.JWT_SECRET || 'eventmaster-secret-key-12345';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

export async function register(req: Request, res: Response) {
  try {
    const { email, password, name, tenantName } = req.body;

    if (!email || !password || !name || !tenantName) {
      return res.status(400).json({ error: 'Tous les champs sont obligatoires (email, password, name, tenantName)' });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'Cet email est déjà utilisé' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const verificationToken = crypto.randomBytes(32).toString('hex');

    // Create Tenant and User in a transaction to ensure atomic registration
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Tenant
      const tenant = await tx.tenant.create({
        data: {
          name: tenantName,
          plan: 'FREE',
        },
      });

      // 2. Create User linked to Tenant
      const user = await tx.user.create({
        data: {
          email,
          passwordHash,
          name,
          role: 'USER',
          tenantId: tenant.id,
          isEmailVerified: false,
          verificationToken,
        },
      });

      // 3. Set User as the manager of the Tenant
      await tx.tenant.update({
        where: { id: tenant.id },
        data: { managerId: user.id },
      });

      return { user, tenant };
    });

    // Send confirmation email
    const verificationLink = `${FRONTEND_URL}/verify-email?token=${verificationToken}`;
    const emailSubject = 'Confirmez votre adresse e-mail - EventMaster';
    const emailText = `Bonjour ${name},\n\nMerci de vous être inscrit sur EventMaster. Veuillez confirmer votre adresse e-mail en cliquant sur le lien suivant :\n${verificationLink}\n\nSi vous n'avez pas créé de compte, vous pouvez ignorer cet e-mail.\n\nCordialement,\nL'équipe EventMaster`;
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
        <h2 style="color: #4f46e5; text-align: center;">Bienvenue sur EventMaster !</h2>
        <p>Bonjour <strong>${name}</strong>,</p>
        <p>Merci de vous être inscrit sur EventMaster, votre plateforme de gestion d'événements et d'invitations.</p>
        <p>Pour activer votre compte et commencer à organiser vos événements, veuillez confirmer votre adresse e-mail en cliquant sur le bouton ci-dessous :</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationLink}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Confirmer mon e-mail</a>
        </div>
        <p style="font-size: 0.875rem; color: #6b7280;">Si le bouton ne fonctionne pas, vous pouvez copier et coller ce lien dans votre navigateur :<br><a href="${verificationLink}" style="color: #4f46e5;">${verificationLink}</a></p>
        <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
        <p style="font-size: 0.875rem; color: #9ca3af; text-align: center;">Si vous n'avez pas créé de compte, vous pouvez ignorer cet e-mail.</p>
      </div>
    `;

    await sendRealEmail(email, emailSubject, emailText, emailHtml);

    return res.status(201).json({
      message: 'Compte créé avec succès ! Un e-mail de confirmation a été envoyé. Veuillez confirmer votre adresse e-mail pour vous connecter.',
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        role: result.user.role,
      },
      tenant: {
        id: result.tenant.id,
        name: result.tenant.name,
        plan: result.tenant.plan,
      },
    });
  } catch (error: any) {
    console.error('Erreur lors de l\'inscription:', error);
    return res.status(500).json({ error: 'Erreur interne du serveur lors de l\'inscription' });
  }
}

export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Veuillez saisir votre email et mot de passe' });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { tenant: true },
    });

    if (!user) {
      return res.status(401).json({ error: 'Identifiants incorrects' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Identifiants incorrects' });
    }

    // Check if email is verified
    if (!user.isEmailVerified && user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        error: 'Veuillez confirmer votre adresse e-mail avant de vous connecter. Un lien de confirmation vous a été envoyé par e-mail.',
        notVerified: true,
      });
    }

    const token = jwt.sign(
      {
        userId: user.id,
        tenantId: user.tenantId,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      tenant: user.tenant
        ? {
            id: user.tenant.id,
            name: user.tenant.name,
            plan: user.tenant.plan,
          }
        : null,
    });
  } catch (error: any) {
    console.error('Erreur lors de la connexion:', error);
    return res.status(500).json({ error: 'Erreur interne du serveur lors de la connexion' });
  }
}

export async function verifyEmail(req: Request, res: Response) {
  try {
    const { token } = req.query;

    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'Jeton de vérification manquant ou invalide' });
    }

    const user = await prisma.user.findFirst({
      where: { verificationToken: token },
    });

    if (!user) {
      return res.status(400).json({ error: 'Le jeton de vérification est invalide ou a expiré' });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        isEmailVerified: true,
        verificationToken: null,
      },
    });

    return res.json({ message: 'Votre adresse e-mail a été confirmée avec succès ! Vous pouvez maintenant vous connecter.' });
  } catch (error: any) {
    console.error('Erreur lors de la vérification de l\'e-mail:', error);
    return res.status(500).json({ error: 'Erreur interne du serveur lors de la vérification de l\'e-mail' });
  }
}
