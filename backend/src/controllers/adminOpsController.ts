import { Response } from 'express';
import { AuthenticatedRequest, signUserToken } from '../middleware/auth';
import { prisma } from '../db';
import { formatTenantResponse } from '../utils/tenantAccess';
import { resolveOrgAccess } from '../services/permissionsService';
import { formatInvoiceForApi } from '../services/invoiceService';
import { auditReq, serializeAuditLog } from '../services/adminAuditService';

const IMPERSONATE_EXPIRES_SECONDS = 2 * 60 * 60;

function tenantSummary(tenant: {
  id: string;
  name: string;
  plan: string;
  accountKind: string;
  licenseActive: boolean;
  licenseExpiresAt: Date | null;
  createdAt: Date;
  manager?: { name: string | null; email: string } | null;
}) {
  return {
    id: tenant.id,
    name: tenant.name,
    plan: tenant.plan,
    accountKind: tenant.accountKind,
    licenseActive: tenant.licenseActive,
    licenseExpiresAt: tenant.licenseExpiresAt,
    createdAt: tenant.createdAt,
    managerName: tenant.manager?.name || 'Aucun',
    managerEmail: tenant.manager?.email || 'Aucun',
  };
}

export async function getOpsOverview(req: AuthenticatedRequest, res: Response) {
  try {
    if (req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Accès refusé. Privilèges Super Admin requis.' });
    }

    const now = new Date();
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const since7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const licenseExpiringWhere = {
      licenseActive: true,
      licenseExpiresAt: { gte: now, lte: in7Days },
    };

    const [
      pendingRequestsCount,
      licensesExpiringCount,
      licensesExpiring,
      unpaidInvoices,
      unpaidCount,
      recentOrgs,
      recentOrgsCount,
      recentAudit,
    ] = await Promise.all([
      prisma.subscriptionRequest.count({ where: { status: 'PENDING' } }),
      prisma.tenant.count({ where: licenseExpiringWhere }),
      prisma.tenant.findMany({
        where: licenseExpiringWhere,
        include: {
          manager: { select: { name: true, email: true } },
        },
        orderBy: { licenseExpiresAt: 'asc' },
        take: 20,
      }),
      prisma.platformInvoice.findMany({
        where: { status: { in: ['SENT', 'PENDING'] } },
        include: { tenant: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      prisma.platformInvoice.count({ where: { status: { in: ['SENT', 'PENDING'] } } }),
      prisma.tenant.findMany({
        where: { createdAt: { gte: since7Days } },
        include: {
          manager: { select: { name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      prisma.tenant.count({ where: { createdAt: { gte: since7Days } } }),
      prisma.adminAuditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 15,
      }),
    ]);

    return res.json({
      counts: {
        pendingRequests: pendingRequestsCount,
        licensesExpiring: licensesExpiringCount,
        unpaidInvoices: unpaidCount,
        recentOrgs: recentOrgsCount,
      },
      licensesExpiring: licensesExpiring.map((t) => tenantSummary(t)),
      unpaidInvoices: unpaidInvoices.map((inv) => formatInvoiceForApi(inv)),
      recentOrgs: recentOrgs.map((t) => tenantSummary(t)),
      recentAudit: recentAudit.map(serializeAuditLog),
    });
  } catch (error) {
    console.error('Erreur ops-overview admin:', error);
    return res.status(500).json({ error: 'Impossible de charger l’accueil opérationnel.' });
  }
}

export async function getAuditLogs(req: AuthenticatedRequest, res: Response) {
  try {
    if (req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Accès refusé. Privilèges Super Admin requis.' });
    }

    const tenantId = typeof req.query.tenantId === 'string' ? req.query.tenantId : undefined;
    const action = typeof req.query.action === 'string' ? req.query.action : undefined;
    const take = Math.min(Math.max(parseInt(String(req.query.limit || '50'), 10) || 50, 1), 100);

    const logs = await prisma.adminAuditLog.findMany({
      where: {
        tenantId: tenantId || undefined,
        action: action || undefined,
      },
      orderBy: { createdAt: 'desc' },
      take,
    });

    return res.json({ logs: logs.map(serializeAuditLog) });
  } catch (error) {
    console.error('Erreur audit-logs admin:', error);
    return res.status(500).json({ error: 'Impossible de charger le journal d’audit.' });
  }
}

export async function getTenantOps(req: AuthenticatedRequest, res: Response) {
  try {
    if (req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Accès refusé. Privilèges Super Admin requis.' });
    }

    const tenantId = req.params.id as string;
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        manager: { select: { id: true, name: true, email: true, role: true, orgRole: true } },
        _count: {
          select: {
            users: true,
            events: true,
            rooms: true,
            venueListings: true,
            serviceOfferings: true,
          },
        },
      },
    });

    if (!tenant) {
      return res.status(404).json({ error: 'Organisation non trouvée.' });
    }

    const [users, pendingRequests, invoices, audit] = await Promise.all([
      prisma.user.findMany({
        where: { tenantId },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          orgRole: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'asc' },
        take: 30,
      }),
      prisma.subscriptionRequest.findMany({
        where: { tenantId, status: 'PENDING' },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          requestedPlan: true,
          status: true,
          createdAt: true,
          durationDays: true,
        },
      }),
      prisma.platformInvoice.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        take: 8,
      }),
      prisma.adminAuditLog.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        take: 15,
      }),
    ]);

    return res.json({
      tenant: {
        ...tenantSummary(tenant),
        licenseKey: tenant.licenseKey,
        managerId: tenant.managerId,
        manager: tenant.manager,
      },
      counts: tenant._count,
      users,
      pendingRequests,
      invoices: invoices.map((inv) => formatInvoiceForApi({ ...inv, tenant: { name: tenant.name } })),
      audit: audit.map(serializeAuditLog),
      canImpersonate: Boolean(
        tenant.manager?.role === 'USER' || users.some((u) => u.role === 'USER'),
      ),
    });
  } catch (error) {
    console.error('Erreur fiche org admin:', error);
    return res.status(500).json({ error: 'Impossible de charger la fiche organisation.' });
  }
}

export async function impersonateTenant(req: AuthenticatedRequest, res: Response) {
  try {
    if (req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Accès refusé. Privilèges Super Admin requis.' });
    }
    if (req.user.impersonatedBy) {
      return res.status(403).json({ error: 'Session support déjà active. Revenez d’abord à votre compte.' });
    }

    const tenantId = req.params.id as string;
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) {
      return res.status(404).json({ error: 'Organisation non trouvée.' });
    }

    let target = tenant.managerId
      ? await prisma.user.findFirst({
          where: { id: tenant.managerId, tenantId, role: 'USER' },
        })
      : null;

    if (!target) {
      target = await prisma.user.findFirst({
        where: { tenantId, role: 'USER' },
        orderBy: { createdAt: 'asc' },
      });
    }

    if (!target || !target.tenantId) {
      return res.status(400).json({
        error: 'Aucun compte manager à ouvrir pour cette organisation.',
      });
    }

    const token = signUserToken(
      {
        userId: target.id,
        tenantId: target.tenantId,
        role: target.role,
        impersonatedBy: req.user.id,
      },
      '2h',
    );

    const access = await resolveOrgAccess(target.id, target.tenantId);

    await auditReq(req, {
      action: 'TENANT_IMPERSONATE',
      targetType: 'tenant',
      targetId: tenant.id,
      tenantId: tenant.id,
      summary: `Ouverture de l’espace « ${tenant.name } » en tant que ${target.email}`,
      metadata: {
        targetUserId: target.id,
        targetEmail: target.email,
        expiresInSeconds: IMPERSONATE_EXPIRES_SECONDS,
      },
    });

    return res.json({
      token,
      user: {
        id: target.id,
        email: target.email,
        name: target.name,
        phone: target.phone,
        role: target.role,
        orgRole: target.orgRole,
        impersonatedBy: req.user.id,
      },
      tenant: formatTenantResponse(tenant),
      access,
      support: {
        impersonatedBy: req.user.id,
        tenantName: tenant.name,
        expiresInSeconds: IMPERSONATE_EXPIRES_SECONDS,
      },
    });
  } catch (error) {
    console.error('Erreur impersonation admin:', error);
    return res.status(500).json({ error: 'Impossible d’ouvrir l’espace de l’organisation.' });
  }
}
