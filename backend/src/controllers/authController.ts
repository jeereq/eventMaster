import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../db';

const JWT_SECRET = process.env.JWT_SECRET || 'eventmaster-secret-key-12345';

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
        },
      });

      // 3. Set User as the manager of the Tenant
      await tx.tenant.update({
        where: { id: tenant.id },
        data: { managerId: user.id },
      });

      return { user, tenant };
    });

    const token = jwt.sign(
      {
        userId: result.user.id,
        tenantId: result.tenant.id,
        role: result.user.role,
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return res.status(201).json({
      token,
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
