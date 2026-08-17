import { Request } from 'express';
import { prisma } from '../db';
import { AuthenticatedRequest } from '../middleware/auth';

export function requestClientIp(req: Pick<Request, 'headers' | 'ip' | 'socket'>): string | null {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0]?.trim() || null;
  }
  if (Array.isArray(forwarded) && forwarded[0]) {
    return forwarded[0].split(',')[0]?.trim() || null;
  }
  return req.ip || req.socket?.remoteAddress || null;
}

export async function logAdminAction(params: {
  actorId: string;
  actorRole: string;
  action: string;
  targetType: string;
  targetId?: string | null;
  tenantId?: string | null;
  summary: string;
  metadata?: Record<string, unknown> | null;
  ip?: string | null;
}): Promise<void> {
  try {
    const actor = await prisma.user.findUnique({
      where: { id: params.actorId },
      select: { email: true },
    });

    await prisma.adminAuditLog.create({
      data: {
        actorId: params.actorId,
        actorEmail: actor?.email || 'inconnu',
        actorRole: params.actorRole,
        action: params.action,
        targetType: params.targetType,
        targetId: params.targetId ?? null,
        tenantId: params.tenantId ?? null,
        summary: params.summary,
        metadata: params.metadata
          ? (JSON.parse(JSON.stringify(params.metadata)) as object)
          : undefined,
        ip: params.ip ?? null,
      },
    });
  } catch (error) {
    console.error('[AdminAudit] Impossible d’enregistrer l’action:', error);
  }
}

export async function auditReq(
  req: AuthenticatedRequest,
  payload: {
    action: string;
    targetType: string;
    targetId?: string | null;
    tenantId?: string | null;
    summary: string;
    metadata?: Record<string, unknown> | null;
  },
): Promise<void> {
  if (!req.user?.id) return;
  await logAdminAction({
    actorId: req.user.id,
    actorRole: req.user.role,
    ip: requestClientIp(req),
    ...payload,
  });
}

export function serializeAuditLog(log: {
  id: string;
  actorId: string;
  actorEmail: string;
  actorRole: string;
  action: string;
  targetType: string;
  targetId: string | null;
  tenantId: string | null;
  summary: string;
  metadata: unknown;
  ip: string | null;
  createdAt: Date;
}) {
  return {
    id: log.id,
    actorId: log.actorId,
    actorEmail: log.actorEmail,
    actorRole: log.actorRole,
    action: log.action,
    targetType: log.targetType,
    targetId: log.targetId,
    tenantId: log.tenantId,
    summary: log.summary,
    metadata: log.metadata,
    ip: log.ip,
    createdAt: log.createdAt,
  };
}
