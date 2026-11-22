import { prisma } from '../db';
import { AuthenticatedRequest, invalidateSessionCache } from '../middleware/auth';
import { auditReq } from './adminAuditService';
import { removeCommercialPermissions } from './platformSettingsService';
import {
  deleteFailureMessage,
  protectedReason,
  type AdminBulkDeleteType,
} from './adminBulkDeletePolicy';

/**
 * Suppression d'une donnée plateforme par le Super Admin : un seul chemin pour la suppression
 * unitaire et la suppression groupée, avec les mêmes garde-fous et la même trace d'audit.
 */

export type AdminDeleteOutcome =
  | { ok: true; id: string; label: string }
  | { ok: false; id: string; status: 403 | 404 | 409 | 500; error: string; label?: string };

/**
 * Les tâches créées par un utilisateur bloquent sa suppression (clé étrangère stricte).
 * On les confie à un autre membre de l'organisation de l'événement, sinon à l'admin qui supprime.
 */
async function reassignTasksCreatedBy(userId: string, fallbackUserId: string) {
  const tasks = await prisma.eventTask.findMany({
    where: { createdById: userId },
    select: { id: true, event: { select: { tenantId: true } } },
  });
  if (tasks.length === 0) return 0;

  const byTenant = new Map<string, string[]>();
  for (const task of tasks) {
    const list = byTenant.get(task.event.tenantId) ?? [];
    list.push(task.id);
    byTenant.set(task.event.tenantId, list);
  }

  for (const [tenantId, taskIds] of byTenant) {
    const heir = await prisma.user.findFirst({
      where: { tenantId, id: { not: userId }, OR: [{ orgRole: null }, { orgRole: 'MANAGER' }] },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });
    await prisma.eventTask.updateMany({
      where: { id: { in: taskIds } },
      data: { createdById: heir?.id ?? fallbackUserId },
    });
  }
  return tasks.length;
}

async function deleteTenantRecord(req: AuthenticatedRequest, id: string): Promise<AdminDeleteOutcome> {
  const existing = await prisma.tenant.findUnique({
    where: { id },
    select: { id: true, name: true, plan: true, users: { select: { id: true } } },
  });
  if (!existing) return { ok: false, id, status: 404, error: 'Organisation introuvable.' };

  // Les membres partent avec l'organisation : leurs tâches dans d'autres espaces ne doivent pas bloquer.
  for (const member of existing.users) {
    await reassignTasksCreatedBy(member.id, req.user!.id);
  }
  await prisma.tenant.delete({ where: { id } });
  for (const member of existing.users) invalidateSessionCache(member.id);

  await auditReq(req, {
    action: 'TENANT_DELETE',
    targetType: 'tenant',
    targetId: existing.id,
    tenantId: existing.id,
    summary: `Organisation « ${existing.name} » supprimée`,
    metadata: { plan: existing.plan, members: existing.users.length },
  });
  return { ok: true, id, label: existing.name };
}

async function deleteUserRecord(req: AuthenticatedRequest, id: string): Promise<AdminDeleteOutcome> {
  const existing = await prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, role: true, tenantId: true },
  });
  if (!existing) return { ok: false, id, status: 404, error: 'Utilisateur introuvable.' };

  const reassigned = await reassignTasksCreatedBy(id, req.user!.id);
  await prisma.user.delete({ where: { id } });
  invalidateSessionCache(id);
  if (existing.role === 'COMMERCIAL') {
    await removeCommercialPermissions(id);
  }

  await auditReq(req, {
    action: 'USER_DELETE',
    targetType: 'user',
    targetId: existing.id,
    tenantId: existing.tenantId,
    summary: `Utilisateur ${existing.email} supprimé`,
    metadata: { role: existing.role, ...(reassigned ? { reassignedTasks: reassigned } : {}) },
  });
  return { ok: true, id, label: existing.email };
}

async function deleteTemplateRecord(req: AuthenticatedRequest, id: string): Promise<AdminDeleteOutcome> {
  const existing = await prisma.template.findUnique({
    where: { id },
    select: { id: true, name: true, tenantId: true },
  });
  if (!existing) return { ok: false, id, status: 404, error: 'Modèle introuvable.' };

  await prisma.template.delete({ where: { id } });
  await auditReq(req, {
    action: 'TEMPLATE_DELETE',
    targetType: 'template',
    targetId: existing.id,
    tenantId: existing.tenantId,
    summary: `Modèle « ${existing.name} » supprimé`,
  });
  return { ok: true, id, label: existing.name };
}

async function deleteEventRecord(req: AuthenticatedRequest, id: string): Promise<AdminDeleteOutcome> {
  const existing = await prisma.event.findUnique({
    where: { id },
    select: { id: true, title: true, tenantId: true },
  });
  if (!existing) return { ok: false, id, status: 404, error: 'Événement introuvable.' };

  await prisma.event.delete({ where: { id } });
  await auditReq(req, {
    action: 'EVENT_DELETE',
    targetType: 'event',
    targetId: existing.id,
    tenantId: existing.tenantId,
    summary: `Événement « ${existing.title} » supprimé`,
  });
  return { ok: true, id, label: existing.title };
}

async function deleteGuestRecord(req: AuthenticatedRequest, id: string): Promise<AdminDeleteOutcome> {
  const existing = await prisma.guest.findUnique({
    where: { id },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      event: { select: { tenantId: true, title: true } },
    },
  });
  if (!existing) return { ok: false, id, status: 404, error: 'Invité introuvable.' };

  await prisma.guest.delete({ where: { id } });
  const name = `${existing.firstName} ${existing.lastName}`.trim();
  await auditReq(req, {
    action: 'GUEST_DELETE',
    targetType: 'guest',
    targetId: existing.id,
    tenantId: existing.event.tenantId,
    summary: `Invité ${name} supprimé (${existing.event.title})`,
  });
  return { ok: true, id, label: name };
}

const DELETERS: Record<
  AdminBulkDeleteType,
  (req: AuthenticatedRequest, id: string) => Promise<AdminDeleteOutcome>
> = {
  tenant: deleteTenantRecord,
  user: deleteUserRecord,
  template: deleteTemplateRecord,
  event: deleteEventRecord,
  guest: deleteGuestRecord,
};

/** Supprime un élément ; ne lève jamais, renvoie un résultat exploitable par l'API. */
export async function deleteAdminRecord(
  req: AuthenticatedRequest,
  type: AdminBulkDeleteType,
  id: string,
): Promise<AdminDeleteOutcome> {
  const blocked = req.user ? protectedReason(type, id, req.user) : 'Session requise.';
  if (blocked) return { ok: false, id, status: 403, error: blocked };
  try {
    return await DELETERS[type](req, id);
  } catch (error) {
    console.error(`[AdminDelete] Suppression ${type} ${id} impossible:`, error);
    const code = (error as { code?: unknown } | null)?.code;
    return {
      ok: false,
      id,
      status: code === 'P2025' ? 404 : code === 'P2003' || code === 'P2014' ? 409 : 500,
      error: deleteFailureMessage(error),
    };
  }
}

/** Supprime plusieurs éléments d'un même type, l'un après l'autre (chacun garde sa cascade). */
export async function deleteAdminRecords(
  req: AuthenticatedRequest,
  type: AdminBulkDeleteType,
  ids: string[],
) {
  const deleted: { id: string; label: string }[] = [];
  const failed: { id: string; error: string }[] = [];
  for (const id of ids) {
    const outcome = await deleteAdminRecord(req, type, id);
    if (outcome.ok) deleted.push({ id: outcome.id, label: outcome.label });
    else failed.push({ id: outcome.id, error: outcome.error });
  }
  return { deleted, failed };
}
