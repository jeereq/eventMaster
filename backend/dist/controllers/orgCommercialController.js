"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOrgCommercialDashboard = getOrgCommercialDashboard;
const db_1 = require("../db");
const commercialService_1 = require("../services/commercialService");
async function getOrgCommercialDashboard(req, res) {
    try {
        const tenantId = req.user?.tenantId;
        const userId = req.user?.id;
        if (!tenantId || !userId || req.user?.role !== 'USER') {
            return res.status(403).json({ error: 'Accès réservé aux commerciaux organisation.' });
        }
        const user = await db_1.prisma.user.findFirst({
            where: { id: userId, tenantId, orgRole: 'COMMERCIAL' },
            select: {
                id: true,
                name: true,
                referralCode: true,
                commissionRate: true,
                renewalCommissionRate: true,
                tenant: {
                    select: {
                        name: true,
                        defaultOrgCommercialCommissionRate: true,
                        defaultOrgCommercialRenewalCommissionRate: true,
                    },
                },
            },
        });
        if (!user) {
            return res.status(403).json({ error: 'Accès réservé aux commerciaux organisation.' });
        }
        const referralCode = await (0, commercialService_1.ensureOrgCommercialReferralCode)(userId, tenantId);
        const rates = (0, commercialService_1.resolveCommissionRates)({
            first: user.commissionRate,
            renewal: user.renewalCommissionRate,
            firstFallback: user.tenant?.defaultOrgCommercialCommissionRate ?? commercialService_1.DEFAULT_COMMISSION_RATE,
            renewalFallback: user.tenant?.defaultOrgCommercialRenewalCommissionRate ?? commercialService_1.DEFAULT_RENEWAL_COMMISSION_RATE,
        });
        const commissionRate = rates.first;
        const renewalCommissionRate = rates.renewal;
        const [organizations, commissions] = await Promise.all([
            db_1.prisma.tenant.findMany({
                where: { referredByOrgUserId: userId },
                include: {
                    manager: { select: { name: true, email: true } },
                    _count: { select: { events: true } },
                },
                orderBy: { createdAt: 'desc' },
            }),
            db_1.prisma.commercialCommission.findMany({
                where: { commercialId: userId },
                include: { tenant: { select: { id: true, name: true } } },
                orderBy: { createdAt: 'desc' },
            }),
        ]);
        const totalCommission = commissions.reduce((sum, c) => sum + c.commissionAmount, 0);
        const monthlyCommissions = commissions.filter((c) => c.billingPeriod === new Date().toISOString().slice(0, 7));
        const monthlyCommission = monthlyCommissions.reduce((sum, c) => sum + c.commissionAmount, 0);
        const monthlyDue = monthlyCommissions
            .filter((c) => !c.paidAt)
            .reduce((sum, c) => sum + c.commissionAmount, 0);
        return res.json({
            referralCode,
            commissionRate,
            renewalCommissionRate,
            organizationName: user.tenant?.name,
            stats: {
                organizations: organizations.length,
                totalCommission,
                monthlyCommission,
                monthlyDue,
            },
            organizations: organizations.map((o) => ({
                id: o.id,
                name: o.name,
                plan: o.plan,
                licenseActive: o.licenseActive,
                managerName: o.manager?.name,
                eventsCount: o._count.events,
                createdAt: o.createdAt,
            })),
            commissions,
        });
    }
    catch (error) {
        console.error('getOrgCommercialDashboard:', error);
        return res.status(500).json({ error: 'Erreur lors du chargement du tableau commercial.' });
    }
}
