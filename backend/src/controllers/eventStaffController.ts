import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { prisma } from '../db';
import { canManageEvent, canAccessEvent, resolveOrgAccess } from '../services/permissionsService';
import { verifyEventBelongsToTenant } from '../utils/tenantAccess';

export async function getEventStaff(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    const eventId = req.params.eventId as string;

    if (!tenantId || !userId) {
      return res.status(403).json({ error: 'Organisation non identifiée.' });
    }

    const event = await verifyEventBelongsToTenant(eventId, tenantId);
    if (!event) return res.status(404).json({ error: 'Événement introuvable.' });

    if (!(await canAccessEvent(userId, tenantId, eventId))) {
      return res.status(403).json({ error: 'Accès refusé à cet événement.' });
    }

    const staff = await prisma.eventStaff.findMany({
      where: { eventId },
      include: {
        user: { select: { id: true, name: true, email: true, orgRole: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    const access = await resolveOrgAccess(userId, tenantId);
    return res.json({
      staff,
      canManage: access.canManageAllEvents || (await canManageEvent(userId, tenantId, eventId)),
    });
  } catch (error) {
    console.error('Erreur getEventStaff:', error);
    return res.status(500).json({ error: 'Impossible de charger l\'équipe événement.' });
  }
}

export async function assignEventStaff(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    const eventId = req.params.eventId as string;
    const { userId: targetUserId, staffRole } = req.body;

    if (!tenantId || !userId) {
      return res.status(403).json({ error: 'Organisation non identifiée.' });
    }
    if (!targetUserId || !staffRole || !['MANAGER', 'PROTOCOL'].includes(staffRole)) {
      return res.status(400).json({ error: 'userId et staffRole (MANAGER|PROTOCOL) requis.' });
    }

    const event = await verifyEventBelongsToTenant(eventId, tenantId);
    if (!event) return res.status(404).json({ error: 'Événement introuvable.' });

    const access = await resolveOrgAccess(userId, tenantId);
    if (!access.canManageAllEvents && !(await canManageEvent(userId, tenantId, eventId))) {
      return res.status(403).json({ error: 'Accès refusé pour gérer l\'équipe de cet événement.' });
    }

    const targetUser = await prisma.user.findFirst({ where: { id: targetUserId, tenantId, role: 'USER' } });
    if (!targetUser) return res.status(404).json({ error: 'Utilisateur introuvable dans l\'organisation.' });

    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { managerId: true } });
    if (tenant?.managerId === targetUserId) {
      return res.status(400).json({ error: 'Le propriétaire a déjà tous les accès.' });
    }

    const assignment = await prisma.eventStaff.upsert({
      where: { eventId_userId: { eventId, userId: targetUserId } },
      update: { staffRole },
      create: { eventId, userId: targetUserId, staffRole },
      include: {
        user: { select: { id: true, name: true, email: true, orgRole: true } },
      },
    });

    return res.status(201).json(assignment);
  } catch (error) {
    console.error('Erreur assignEventStaff:', error);
    return res.status(500).json({ error: 'Impossible d\'assigner le staff.' });
  }
}

export async function removeEventStaff(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    const eventId = req.params.eventId as string;
    const targetUserId = req.params.userId as string;

    if (!tenantId || !userId) {
      return res.status(403).json({ error: 'Organisation non identifiée.' });
    }

    const access = await resolveOrgAccess(userId, tenantId);
    if (!access.canManageAllEvents && !(await canManageEvent(userId, tenantId, eventId))) {
      return res.status(403).json({ error: 'Accès refusé.' });
    }

    await prisma.eventStaff.deleteMany({ where: { eventId, userId: targetUserId } });
    return res.json({ message: 'Staff retiré de l\'événement.' });
  } catch (error) {
    console.error('Erreur removeEventStaff:', error);
    return res.status(500).json({ error: 'Impossible de retirer le staff.' });
  }
}
