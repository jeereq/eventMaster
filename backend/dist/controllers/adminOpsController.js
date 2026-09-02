"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOpsOverview = getOpsOverview;
exports.getPlatformInsights = getPlatformInsights;
exports.getAuditLogs = getAuditLogs;
exports.getTenantOps = getTenantOps;
exports.impersonateTenant = impersonateTenant;
const auth_1 = require("../middleware/auth");
const db_1 = require("../db");
const tenantAccess_1 = require("../utils/tenantAccess");
const permissionsService_1 = require("../services/permissionsService");
const invoiceService_1 = require("../services/invoiceService");
const adminAuditService_1 = require("../services/adminAuditService");
const publicVenue_1 = require("../utils/publicVenue");
const commercialPayoutService_1 = require("../services/commercialPayoutService");
const IMPERSONATE_EXPIRES_SECONDS = 2 * 60 * 60;
function tenantSummary(tenant) {
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
async function getOpsOverview(req, res) {
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
        const [pendingRequestsCount, licensesExpiringCount, licensesExpiring, unpaidInvoices, unpaidCount, recentOrgs, recentOrgsCount, recentAudit, saasPayoutsDue,] = await Promise.all([
            db_1.prisma.subscriptionRequest.count({ where: { status: 'PENDING' } }),
            db_1.prisma.tenant.count({ where: licenseExpiringWhere }),
            db_1.prisma.tenant.findMany({
                where: licenseExpiringWhere,
                include: {
                    manager: { select: { name: true, email: true } },
                },
                orderBy: { licenseExpiresAt: 'asc' },
                take: 20,
            }),
            db_1.prisma.platformInvoice.findMany({
                where: { status: { in: ['SENT', 'PENDING'] } },
                include: { tenant: { select: { name: true } } },
                orderBy: { createdAt: 'desc' },
                take: 20,
            }),
            db_1.prisma.platformInvoice.count({ where: { status: { in: ['SENT', 'PENDING'] } } }),
            db_1.prisma.tenant.findMany({
                where: { createdAt: { gte: since7Days } },
                include: {
                    manager: { select: { name: true, email: true } },
                },
                orderBy: { createdAt: 'desc' },
                take: 20,
            }),
            db_1.prisma.tenant.count({ where: { createdAt: { gte: since7Days } } }),
            db_1.prisma.adminAuditLog.findMany({
                orderBy: { createdAt: 'desc' },
                take: 15,
            }),
            (0, commercialPayoutService_1.previousPeriodPlatformPayoutSummary)(),
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
            licensesExpiring: licensesExpiring.map((t) => tenantSummary(t)),
            unpaidInvoices: unpaidInvoices.map((inv) => (0, invoiceService_1.formatInvoiceForApi)(inv)),
            recentOrgs: recentOrgs.map((t) => tenantSummary(t)),
            recentAudit: recentAudit.map(adminAuditService_1.serializeAuditLog),
        });
    }
    catch (error) {
        console.error('Erreur ops-overview admin:', error);
        return res.status(500).json({ error: 'Impossible de charger l’accueil opérationnel.' });
    }
}
async function getPlatformInsights(req, res) {
    try {
        if (req.user?.role !== 'SUPER_ADMIN') {
            return res.status(403).json({ error: 'Accès refusé. Privilèges Super Admin requis.' });
        }
        const billableWhere = { status: { in: ['CONFIRMED', 'COMPLETED'] } };
        const [eventsTotal, eventsPublic, eventsTicketing, eventsGps, ticketsSoldSum, paidTickets, invitations, rsvpGroups, acceptedWithPdf, acceptedWithoutPdf, checkedIn, seatVerified, favorites, packs, gmvVenue, gmvTrade, gmvRental, openTasks, overdueTasks, doneTasks, protocolUsers, managerUsers,] = await Promise.all([
            db_1.prisma.event.count(),
            db_1.prisma.event.count({ where: { isPublic: true } }),
            db_1.prisma.event.count({ where: { ticketingEnabled: true } }),
            db_1.prisma.event.count({ where: { latitude: { not: null }, longitude: { not: null } } }),
            db_1.prisma.event.aggregate({ _sum: { ticketsSold: true } }),
            db_1.prisma.ticketOrder.aggregate({
                where: { status: 'PAID' },
                _count: { _all: true },
                _sum: { amountFc: true },
            }),
            db_1.prisma.invitation.count(),
            db_1.prisma.guest.groupBy({ by: ['rsvp'], _count: { _all: true } }),
            db_1.prisma.guest.count({ where: { rsvp: 'ACCEPTED', seatingInvitationPdfUrl: { not: null } } }),
            db_1.prisma.guest.count({ where: { rsvp: 'ACCEPTED', seatingInvitationPdfUrl: null } }),
            db_1.prisma.guest.count({ where: { checkedInAt: { not: null } } }),
            db_1.prisma.guest.count({ where: { seatVerified: true } }),
            db_1.prisma.listingFavorite.count(),
            db_1.prisma.savedEventPack.count(),
            db_1.prisma.marketplaceBooking.aggregate({
                where: { ...billableWhere, listingId: { not: null } },
                _count: { _all: true },
                _sum: { amountFc: true },
            }),
            db_1.prisma.marketplaceBooking.aggregate({
                where: { ...billableWhere, offering: (0, publicVenue_1.serviceGroupPrismaFilter)('trade') },
                _count: { _all: true },
                _sum: { amountFc: true },
            }),
            db_1.prisma.marketplaceBooking.aggregate({
                where: { ...billableWhere, offering: (0, publicVenue_1.serviceGroupPrismaFilter)('rental') },
                _count: { _all: true },
                _sum: { amountFc: true },
            }),
            db_1.prisma.eventTask.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS', 'BLOCKED'] } } }),
            db_1.prisma.eventTask.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS', 'BLOCKED'] }, dueAt: { lt: new Date() } } }),
            db_1.prisma.eventTask.count({ where: { status: 'DONE' } }),
            db_1.prisma.user.count({ where: { role: 'USER', orgRole: 'PROTOCOL' } }),
            db_1.prisma.user.count({ where: { role: 'USER', orgRole: 'MANAGER' } }),
        ]);
        const rsvpCount = (status) => rsvpGroups.find((row) => row.rsvp === status)?._count._all || 0;
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
    }
    catch (error) {
        console.error('Erreur insights admin:', error);
        return res.status(500).json({ error: 'Impossible de charger les analyses plateforme.' });
    }
}
async function getAuditLogs(req, res) {
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
        const createdAt = {};
        if (fromRaw) {
            const from = new Date(fromRaw);
            if (!Number.isNaN(from.getTime()))
                createdAt.gte = from;
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
                        { summary: { contains: q, mode: 'insensitive' } },
                        { actorEmail: { contains: q, mode: 'insensitive' } },
                        { action: { contains: q, mode: 'insensitive' } },
                    ],
                }
                : {}),
        };
        const [logs, total, actionRows] = await Promise.all([
            db_1.prisma.adminAuditLog.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * pageSize,
                take: pageSize,
            }),
            db_1.prisma.adminAuditLog.count({ where }),
            db_1.prisma.adminAuditLog.findMany({
                distinct: ['action'],
                select: { action: true },
                orderBy: { action: 'asc' },
            }),
        ]);
        const tenantIds = [...new Set(logs.map((log) => log.tenantId).filter((id) => Boolean(id)))];
        const tenants = tenantIds.length
            ? await db_1.prisma.tenant.findMany({
                where: { id: { in: tenantIds } },
                select: { id: true, name: true },
            })
            : [];
        const tenantNameById = new Map(tenants.map((t) => [t.id, t.name]));
        return res.json({
            logs: logs.map((log) => ({
                ...(0, adminAuditService_1.serializeAuditLog)(log),
                tenantName: log.tenantId ? tenantNameById.get(log.tenantId) || null : null,
            })),
            total,
            page,
            pageSize,
            hasMore: page * pageSize < total,
            actions: actionRows.map((row) => row.action),
        });
    }
    catch (error) {
        console.error('Erreur audit-logs admin:', error);
        return res.status(500).json({ error: 'Impossible de charger le journal d’audit.' });
    }
}
async function getTenantOps(req, res) {
    try {
        if (req.user?.role !== 'SUPER_ADMIN') {
            return res.status(403).json({ error: 'Accès refusé. Privilèges Super Admin requis.' });
        }
        const tenantId = req.params.id;
        const tenant = await db_1.prisma.tenant.findUnique({
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
            db_1.prisma.user.findMany({
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
            db_1.prisma.subscriptionRequest.findMany({
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
            db_1.prisma.platformInvoice.findMany({
                where: { tenantId },
                orderBy: { createdAt: 'desc' },
                take: 8,
            }),
            db_1.prisma.adminAuditLog.findMany({
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
            invoices: invoices.map((inv) => (0, invoiceService_1.formatInvoiceForApi)({ ...inv, tenant: { name: tenant.name } })),
            audit: audit.map(adminAuditService_1.serializeAuditLog),
            canImpersonate: Boolean(tenant.manager?.role === 'USER' || users.some((u) => u.role === 'USER')),
        });
    }
    catch (error) {
        console.error('Erreur fiche org admin:', error);
        return res.status(500).json({ error: 'Impossible de charger la fiche organisation.' });
    }
}
async function impersonateTenant(req, res) {
    try {
        if (req.user?.role !== 'SUPER_ADMIN') {
            return res.status(403).json({ error: 'Accès refusé. Privilèges Super Admin requis.' });
        }
        if (req.user.impersonatedBy) {
            return res.status(403).json({ error: 'Session support déjà active. Revenez d’abord à votre compte.' });
        }
        const tenantId = req.params.id;
        const tenant = await db_1.prisma.tenant.findUnique({ where: { id: tenantId } });
        if (!tenant) {
            return res.status(404).json({ error: 'Organisation non trouvée.' });
        }
        let target = tenant.managerId
            ? await db_1.prisma.user.findFirst({
                where: { id: tenant.managerId, tenantId, role: 'USER' },
            })
            : null;
        if (!target) {
            target = await db_1.prisma.user.findFirst({
                where: { tenantId, role: 'USER' },
                orderBy: { createdAt: 'asc' },
            });
        }
        if (!target || !target.tenantId) {
            return res.status(400).json({
                error: 'Aucun compte manager à ouvrir pour cette organisation.',
            });
        }
        const token = (0, auth_1.signUserToken)({
            userId: target.id,
            tenantId: target.tenantId,
            role: target.role,
            impersonatedBy: req.user.id,
        }, '2h');
        const access = await (0, permissionsService_1.resolveOrgAccess)(target.id, target.tenantId);
        await (0, adminAuditService_1.auditReq)(req, {
            action: 'TENANT_IMPERSONATE',
            targetType: 'tenant',
            targetId: tenant.id,
            tenantId: tenant.id,
            summary: `Ouverture de l’espace « ${tenant.name} » en tant que ${target.email}`,
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
            tenant: (0, tenantAccess_1.formatTenantResponse)(tenant),
            access,
            support: {
                impersonatedBy: req.user.id,
                tenantName: tenant.name,
                expiresInSeconds: IMPERSONATE_EXPIRES_SECONDS,
            },
        });
    }
    catch (error) {
        console.error('Erreur impersonation admin:', error);
        return res.status(500).json({ error: 'Impossible d’ouvrir l’espace de l’organisation.' });
    }
}
