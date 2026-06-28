import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { prisma } from '../db';
import { PlanType, Role } from '@prisma/client';

// Get global system statistics and list of all tenants (Super Admin only)
export async function getSystemStats(req: AuthenticatedRequest, res: Response) {
  try {
    if (req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Accès refusé. Privilèges Super Admin requis.' });
    }

    const [tenantCount, userCount, eventCount, guestCount] = await Promise.all([
      prisma.tenant.count(),
      prisma.user.count(),
      prisma.event.count(),
      prisma.guest.count(),
    ]);

    const tenants = await prisma.tenant.findMany({
      include: {
        manager: {
          select: {
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            events: true,
            users: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return res.json({
      stats: {
        tenants: tenantCount,
        users: userCount,
        events: eventCount,
        guests: guestCount,
      },
      tenants: tenants.map(t => ({
        id: t.id,
        name: t.name,
        plan: t.plan,
        licenseActive: t.licenseActive,
        licenseExpiresAt: t.licenseExpiresAt,
        licenseKey: t.licenseKey,
        createdAt: t.createdAt,
        managerName: t.manager?.name || 'Aucun',
        managerEmail: t.manager?.email || 'Aucun',
        eventsCount: t._count.events,
        usersCount: t._count.users,
      })),
    });
  } catch (error: any) {
    console.error('Erreur lors de la récupération des stats admin:', error);
    return res.status(500).json({ error: 'Erreur lors de la récupération des statistiques globales' });
  }
}

// Update tenant plan and license details
export async function updateTenantPlanOrLicense(req: AuthenticatedRequest, res: Response) {
  try {
    if (req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Accès refusé. Privilèges Super Admin requis.' });
    }

    const id = req.params.id as string;
    const { plan, licenseActive, licenseExpiresAt, licenseKey } = req.body;

    const updatedTenant = await prisma.tenant.update({
      where: { id },
      data: {
        plan: plan as PlanType,
        licenseActive: licenseActive !== undefined ? Boolean(licenseActive) : undefined,
        licenseExpiresAt: licenseExpiresAt ? new Date(licenseExpiresAt) : null,
        licenseKey: licenseKey !== undefined ? licenseKey : undefined,
      },
    });

    return res.json({ message: 'Tenant mis à jour avec succès', tenant: updatedTenant });
  } catch (error: any) {
    console.error('Erreur lors de la mise à jour du tenant:', error);
    return res.status(500).json({ error: 'Erreur lors de la mise à jour de l\'organisation' });
  }
}

// Delete tenant and all associated data
export async function deleteTenant(req: AuthenticatedRequest, res: Response) {
  try {
    if (req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Accès refusé. Privilèges Super Admin requis.' });
    }

    const id = req.params.id as string;

    await prisma.tenant.delete({
      where: { id },
    });

    return res.json({ message: 'Tenant supprimé avec succès' });
  } catch (error: any) {
    console.error('Erreur lors de la suppression du tenant:', error);
    return res.status(500).json({ error: 'Erreur lors de la suppression de l\'organisation' });
  }
}

// Get all users across the platform
export async function getAllUsers(req: AuthenticatedRequest, res: Response) {
  try {
    if (req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Accès refusé. Privilèges Super Admin requis.' });
    }

    const users = await prisma.user.findMany({
      include: {
        tenant: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return res.json(users.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      isEmailVerified: u.isEmailVerified,
      tenantName: u.tenant?.name || 'Aucun (Super Admin)',
      createdAt: u.createdAt,
    })));
  } catch (error: any) {
    console.error('Erreur lors de la récupération des utilisateurs:', error);
    return res.status(500).json({ error: 'Erreur lors de la récupération des utilisateurs' });
  }
}

// Update user role or status
export async function updateUserRoleOrStatus(req: AuthenticatedRequest, res: Response) {
  try {
    if (req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Accès refusé. Privilèges Super Admin requis.' });
    }

    const id = req.params.id as string;
    const { role, isEmailVerified } = req.body;

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        role: role as Role,
        isEmailVerified: isEmailVerified !== undefined ? Boolean(isEmailVerified) : undefined,
      },
    });

    return res.json({ message: 'Utilisateur mis à jour avec succès', user: updatedUser });
  } catch (error: any) {
    console.error('Erreur lors de la mise à jour de l\'utilisateur:', error);
    return res.status(500).json({ error: 'Erreur lors de la mise à jour de l\'utilisateur' });
  }
}

// Delete user
export async function deleteUser(req: AuthenticatedRequest, res: Response) {
  try {
    if (req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Accès refusé. Privilèges Super Admin requis.' });
    }

    const id = req.params.id as string;

    await prisma.user.delete({
      where: { id },
    });

    return res.json({ message: 'Utilisateur supprimé avec succès' });
  } catch (error: any) {
    console.error('Erreur lors de la suppression de l\'utilisateur:', error);
    return res.status(500).json({ error: 'Erreur lors de la suppression de l\'utilisateur' });
  }
}

// Get all templates across the platform
export async function getAllTemplates(req: AuthenticatedRequest, res: Response) {
  try {
    if (req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Accès refusé. Privilèges Super Admin requis.' });
    }

    const templates = await prisma.template.findMany({
      include: {
        tenant: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return res.json(templates.map(t => ({
      id: t.id,
      name: t.name,
      content: t.content,
      isGlobal: t.tenantId === null,
      tenantName: t.tenant?.name || 'Global (Tous)',
      createdAt: t.createdAt,
    })));
  } catch (error: any) {
    console.error('Erreur lors de la récupération des modèles:', error);
    return res.status(500).json({ error: 'Erreur lors de la récupération des modèles' });
  }
}

// Create a global template
export async function createGlobalTemplate(req: AuthenticatedRequest, res: Response) {
  try {
    if (req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Accès refusé. Privilèges Super Admin requis.' });
    }

    const { name, content } = req.body;

    if (!name || !content) {
      return res.status(400).json({ error: 'Le nom et le contenu du modèle sont requis.' });
    }

    const template = await prisma.template.create({
      data: {
        name,
        content,
        tenantId: null, // Null means it is a global template
      },
    });

    return res.status(201).json({ message: 'Modèle global créé avec succès', template });
  } catch (error: any) {
    console.error('Erreur lors de la création du modèle global:', error);
    return res.status(500).json({ error: 'Erreur lors de la création du modèle global' });
  }
}

// Delete template
export async function deleteTemplate(req: AuthenticatedRequest, res: Response) {
  try {
    if (req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Accès refusé. Privilèges Super Admin requis.' });
    }

    const id = req.params.id as string;

    await prisma.template.delete({
      where: { id },
    });

    return res.json({ message: 'Modèle supprimé avec succès' });
  } catch (error: any) {
    console.error('Erreur lors de la suppression du modèle:', error);
    return res.status(500).json({ error: 'Erreur lors de la suppression du modèle' });
  }
}
