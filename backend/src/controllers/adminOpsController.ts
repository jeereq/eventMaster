import { Response } from 'express';
import { AuthenticatedRequest, signUserToken } from '../middleware/auth';
import { prisma } from '../db';
import { formatTenantResponse } from '../utils/tenantAccess';
import { resolveOrgAccess } from '../services/permissionsService';
import { formatInvoiceForApi } from '../services/invoiceService';
import { auditReq, serializeAuditLog } from '../services/adminAuditService';
import { serviceGroupPrismaFilter } from '../utils/publicVenue';
import { MarketplaceBookingStatus } from '@prisma/client';
import { previousPeriodPlatformPayoutSummary } from '../services/commercialPayoutService';

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
      pendingRequests,
      licensesExpiringCount,
      licensesExpiring,
      unpaidInvoices,
      unpaidCount,
      recentOrgs,
      recentOrgsCount,
      recentAudit,
      saasPayoutsDue,
    ] = await Promise.all([
      prisma.subscriptionRequest.count({ where: { status: 'PENDING' } }),
      prisma.subscriptionRequest.findMany({
        where: { status: 'PENDING' },
        include: {
          tenant: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'asc' },
        take: 20,
      }),
      prisma.tenant.count({ where: licenseExpiringWhere }),
      prisma.tenant.findMany({
        where: licenseExpiringWhere,
        select: {
          id: true,
          name: true,
          plan: true,
          accountKind: true,
          licenseActive: true,
          licenseExpiresAt: true,
          createdAt: true,
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
        select: {
          id: true,
          name: true,
          plan: true,
          accountKind: true,
          licenseActive: true,
          licenseExpiresAt: true,
          createdAt: true,
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
      previousPeriodPlatformPayoutSummary(),
    ]);

    return res.json({
      counts: {
        pendingRequests: pendingRequestsCount,
        licensesExpiring: licensesExpiringCount,
        unpaidInvoices: unpaidCount,
        recentOrgs: recentOrgsCount,
        saasPayoutsDue: saasPayoutsDue.count,
      },
      saasPayoutsDue,
      pendingRequests: pendingRequests.map((req) => ({
        id: req.id,
        requestedPlan: req.requestedPlan,
        durationDays: req.durationDays,
        proofOfPayment: req.proofOfPayment,
        baseAmount: req.baseAmount,
        paymentProvider: req.paymentProvider,
        createdAt: req.createdAt,
        tenant: req.tenant,
      })),
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

export async function getPlatformInsights(req: AuthenticatedRequest, res: Response) {
  try {
    if (req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Accès refusé. Privilèges Super Admin requis.' });
    }

    const billableWhere = { status: { in: ['CONFIRMED', 'COMPLETED'] as MarketplaceBookingStatus[] } };

    const [
      eventsTotal,
      eventsPublic,
      eventsTicketing,
      eventsGps,
      ticketsSoldSum,
      paidTickets,
      invitations,
      rsvpGroups,
      acceptedWithPdf,
      acceptedWithoutPdf,
      checkedIn,
      seatVerified,
      favorites,
      packs,
      gmvVenue,
      gmvTrade,
      gmvRental,
      openTasks,
      overdueTasks,
      doneTasks,
      protocolUsers,
      managerUsers,
    ] = await Promise.all([
      prisma.event.count(),
      prisma.event.count({ where: { isPublic: true } }),
      prisma.event.count({ where: { ticketingEnabled: true } }),
      prisma.event.count({ where: { latitude: { not: null }, longitude: { not: null } } }),
      prisma.event.aggregate({ _sum: { ticketsSold: true } }),
      prisma.ticketOrder.aggregate({
        where: { status: 'PAID' },
        _count: { _all: true },
        _sum: { amountFc: true },
      }),
      prisma.invitation.count(),
      prisma.guest.groupBy({ by: ['rsvp'], _count: { _all: true } }),
      prisma.guest.count({ where: { rsvp: 'ACCEPTED', seatingInvitationPdfUrl: { not: null } } }),
      prisma.guest.count({ where: { rsvp: 'ACCEPTED', seatingInvitationPdfUrl: null } }),
      prisma.guest.count({ where: { checkedInAt: { not: null } } }),
      prisma.guest.count({ where: { seatVerified: true } }),
      prisma.listingFavorite.count(),
      prisma.savedEventPack.count(),
      prisma.marketplaceBooking.aggregate({
        where: { ...billableWhere, listingId: { not: null } },
        _count: { _all: true },
        _sum: { amountFc: true },
      }),
      prisma.marketplaceBooking.aggregate({
        where: { ...billableWhere, offering: serviceGroupPrismaFilter('trade') },
        _count: { _all: true },
        _sum: { amountFc: true },
      }),
      prisma.marketplaceBooking.aggregate({
        where: { ...billableWhere, offering: serviceGroupPrismaFilter('rental') },
        _count: { _all: true },
        _sum: { amountFc: true },
      }),
      prisma.eventTask.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS', 'BLOCKED'] } } }),
      prisma.eventTask.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS', 'BLOCKED'] }, dueAt: { lt: new Date() } } }),
      prisma.eventTask.count({ where: { status: 'DONE' } }),
      prisma.user.count({ where: { role: 'USER', orgRole: 'PROTOCOL' } }),
      prisma.user.count({ where: { role: 'USER', orgRole: 'MANAGER' } }),
    ]);

    const rsvpCount = (status: string) => rsvpGroups.find((row) => row.rsvp === status)?._count._all || 0;
    const guestsTotal = rsvpGroups.reduce((sum, row) => sum + row._count._all, 0);
    const accepted = rsvpCount('ACCEPTED');
    const pending = rsvpCount('PENDING');
    const declined = rsvpCount('DECLINED');

    return res.json({
      events: {
        total: eventsTotal,
        publicCount: eventsPublic,
        privateCount: eventsTotal - eventsPublic,
        ticketingEnabled: eventsTicketing,
        ticketsSold: ticketsSoldSum._sum.ticketsSold || 0,
        gpsCount: eventsGps,
      },
      tickets: {
        paidOrders: paidTickets._count._all,
        gmvFc: paidTickets._sum.amountFc || 0,
      },
      guests: {
        total: guestsTotal,
        pending,
        accepted,
        declined,
        invitations,
        pdfDelivered: acceptedWithPdf,
        pdfMissing: acceptedWithoutPdf,
        checkedIn,
        seatVerified,
      },
      marketplace: {
        favorites,
        packs,
        gmvVenueFc: gmvVenue._sum.amountFc || 0,
        gmvTradeFc: gmvTrade._sum.amountFc || 0,
        gmvRentalFc: gmvRental._sum.amountFc || 0,
        bookingsVenue: gmvVenue._count._all,
        bookingsTrade: gmvTrade._count._all,
        bookingsRental: gmvRental._count._all,
      },
      tasks: {
        open: openTasks,
        overdue: overdueTasks,
        done: doneTasks,
      },
      team: {
        protocolUsers,
        managerUsers,
      },
    });
  } catch (error) {
    console.error('Erreur insights admin:', error);
    return res.status(500).json({ error: 'Impossible de charger les analyses plateforme.' });
  }
}

export async function getAuditLogs(req: AuthenticatedRequest, res: Response) {
  try {
    if (req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Accès refusé. Privilèges Super Admin requis.' });
    }

    const tenantId = typeof req.query.tenantId === 'string' && req.query.tenantId.trim()
      ? req.query.tenantId.trim()
      : undefined;
    const action = typeof req.query.action === 'string' && req.query.action.trim()
      ? req.query.action.trim()
      : undefined;
    const q = typeof req.query.q === 'string' && req.query.q.trim() ? req.query.q.trim() : undefined;
    const fromRaw = typeof req.query.from === 'string' ? req.query.from : undefined;
    const toRaw = typeof req.query.to === 'string' ? req.query.to : undefined;
    const page = Math.max(parseInt(String(req.query.page || '1'), 10) || 1, 1);
    const pageSize = Math.min(Math.max(parseInt(String(req.query.limit || '50'), 10) || 50, 1), 100);

    const createdAt: { gte?: Date; lte?: Date } = {};
    if (fromRaw) {
      const from = new Date(fromRaw);
      if (!Number.isNaN(from.getTime())) createdAt.gte = from;
    }
    if (toRaw) {
      const to = new Date(toRaw);
      if (!Number.isNaN(to.getTime())) {
        if (/^\d{4}-\d{2}-\d{2}$/.test(toRaw)) {
          to.setHours(23, 59, 59, 999);
        }
        createdAt.lte = to;
      }
    }

    const where = {
      tenantId: tenantId || undefined,
      action: action || undefined,
      createdAt: Object.keys(createdAt).length ? createdAt : undefined,
      ...(q
        ? {
            OR: [
              { summary: { contains: q, mode: 'insensitive' as const } },
              { actorEmail: { contains: q, mode: 'insensitive' as const } },
              { action: { contains: q, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [logs, total, actionRows] = await Promise.all([
      prisma.adminAuditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.adminAuditLog.count({ where }),
      prisma.adminAuditLog.findMany({
        distinct: ['action'],
        select: { action: true },
        orderBy: { action: 'asc' },
      }),
    ]);

    const tenantIds = [...new Set(logs.map((log) => log.tenantId).filter((id): id is string => Boolean(id)))];
    const tenants = tenantIds.length
      ? await prisma.tenant.findMany({
          where: { id: { in: tenantIds } },
          select: { id: true, name: true },
        })
      : [];
    const tenantNameById = new Map(tenants.map((t) => [t.id, t.name]));

    return res.json({
      logs: logs.map((log) => ({
        ...serializeAuditLog(log),
        tenantName: log.tenantId ? tenantNameById.get(log.tenantId) || null : null,
      })),
      total,
      page,
      pageSize,
      hasMore: page * pageSize < total,
      actions: actionRows.map((row) => row.action),
    });
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
        vendorProfile: { select: { id: true, isBlockedByAdmin: true } },
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
          proofOfPayment: true,
          baseAmount: true,
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
