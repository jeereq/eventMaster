import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../db';
import { AuthenticatedRequest } from '../middleware/auth';
import { isTenantManager } from '../utils/tenantAccess';
import { isValidOrgRole, resolveOrgAccess } from '../services/permissionsService';

const userSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  orgRole: true,
  isEmailVerified: true,
  createdAt: true,
};

export async function getTeamMembers(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;

    if (!tenantId || !userId) {
      return res.status(403).json({ error: 'Organisation non identifiée.' });
    }

    if (req.user?.role !== 'USER') {
      return res.status(403).json({ error: 'Accès réservé aux membres d\'organisation.' });
    }

    const access = await resolveOrgAccess(userId, tenantId);

    const members = await prisma.user.findMany({
      where: { tenantId, role: 'USER' },
      select: userSelect,
      orderBy: { createdAt: 'asc' },
    });

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { managerId: true },
    });

    return res.json({
      members: members.map((m) => ({
        ...m,
        isOwner: tenant?.managerId === m.id,
        orgRoleLabel:
          tenant?.managerId === m.id
            ? 'OWNER'
            : m.orgRole || 'MANAGER',
      })),
      access,
      isManager: access.canManageTeam,
    });
  } catch (error: any) {
    console.error('Erreur lors de la récupération de l\'équipe:', error);
    return res.status(500).json({ error: 'Erreur lors de la récupération de l\'équipe.' });
  }
}

export async function createTeamMember(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;

    if (!tenantId || !userId) {
      return res.status(403).json({ error: 'Organisation non identifiée.' });
    }

    const access = await resolveOrgAccess(userId, tenantId);
    if (!access.canManageTeam) {
      return res.status(403).json({ error: 'Seuls le propriétaire et les managers peuvent créer des utilisateurs.' });
    }

    const { name, email, password, phone, orgRole = 'MANAGER' } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Le nom, l\'e-mail et le mot de passe sont requis.' });
    }

    if (!isValidOrgRole(orgRole)) {
      return res.status(400).json({ error: 'orgRole doit être MANAGER ou PROTOCOL.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caractères.' });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'Un utilisateur avec cette adresse e-mail existe déjà.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        phone: phone || null,
        passwordHash,
        role: 'USER',
        orgRole,
        tenantId,
        isEmailVerified: true,
      },
      select: userSelect,
    });

    return res.status(201).json({
      message: 'Utilisateur créé avec succès. Il peut se connecter immédiatement avec les identifiants définis.',
      member: { ...newUser, isOwner: false, orgRoleLabel: orgRole },
    });
  } catch (error: any) {
    console.error('Erreur lors de la création de l\'utilisateur d\'équipe:', error);
    return res.status(500).json({ error: 'Erreur lors de la création de l\'utilisateur.' });
  }
}

export async function updateTeamMember(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    const memberId = req.params.id as string;

    if (!tenantId || !userId) {
      return res.status(403).json({ error: 'Organisation non identifiée.' });
    }

    const access = await resolveOrgAccess(userId, tenantId);
    if (!access.canManageTeam) {
      return res.status(403).json({ error: 'Accès refusé.' });
    }

    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (tenant?.managerId === memberId) {
      return res.status(400).json({ error: 'Impossible de modifier le rôle du propriétaire.' });
    }

    const { orgRole } = req.body;
    if (!isValidOrgRole(orgRole)) {
      return res.status(400).json({ error: 'orgRole doit être MANAGER ou PROTOCOL.' });
    }

    const member = await prisma.user.findFirst({
      where: { id: memberId, tenantId, role: 'USER' },
    });
    if (!member) {
      return res.status(404).json({ error: 'Utilisateur introuvable.' });
    }

    const updated = await prisma.user.update({
      where: { id: memberId },
      data: { orgRole },
      select: userSelect,
    });

    return res.json({
      message: 'Rôle mis à jour.',
      member: { ...updated, isOwner: false, orgRoleLabel: orgRole },
    });
  } catch (error: any) {
    console.error('Erreur updateTeamMember:', error);
    return res.status(500).json({ error: 'Impossible de mettre à jour l\'utilisateur.' });
  }
}

export async function deleteTeamMember(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    const memberId = req.params.id as string;

    if (!tenantId || !userId) {
      return res.status(403).json({ error: 'Organisation non identifiée.' });
    }

    const access = await resolveOrgAccess(userId, tenantId);
    if (!access.canManageTeam) {
      return res.status(403).json({ error: 'Seuls le propriétaire et les managers peuvent supprimer des utilisateurs.' });
    }

    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (tenant?.managerId === memberId) {
      return res.status(400).json({ error: 'Impossible de supprimer le propriétaire de l\'organisation.' });
    }

    const member = await prisma.user.findFirst({
      where: { id: memberId, tenantId, role: 'USER' },
    });

    if (!member) {
      return res.status(404).json({ error: 'Utilisateur introuvable dans votre organisation.' });
    }

    await prisma.user.delete({ where: { id: memberId } });

    return res.json({ message: 'Utilisateur supprimé de l\'organisation.' });
  } catch (error: any) {
    console.error('Erreur lors de la suppression de l\'utilisateur d\'équipe:', error);
    return res.status(500).json({ error: 'Erreur lors de la suppression de l\'utilisateur.' });
  }
}
