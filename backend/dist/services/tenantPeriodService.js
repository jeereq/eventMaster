"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveTenantPaidPeriod = resolveTenantPaidPeriod;
exports.countTenantGuestsForQuota = countTenantGuestsForQuota;
const db_1 = require("../db");
const client_1 = require("@prisma/client");
const plansConfig_1 = require("../config/plansConfig");
const DAY_MS = 24 * 60 * 60 * 1000;
const MONTH_DAYS = 30;
const B2C_DAYS = 90;
/**
 * Détermine la période payée en cours pour une organisation afin de comptabiliser
 * les invitations et invités sur le cycle actif (mensuel, trimestriel ou cycle mensuel annuel),
 * plutôt que sur l'ensemble de l'historique du compte.
 */
async function resolveTenantPaidPeriod(tenantId) {
    const tenant = await db_1.prisma.tenant.findUnique({
        where: { id: tenantId },
        select: {
            id: true,
            plan: true,
            billingCycle: true,
            accountKind: true,
            licenseActive: true,
            licenseExpiresAt: true,
            createdAt: true,
        },
    });
    if (!tenant || tenant.plan === 'FREE') {
        return {
            isPaidPlan: false,
            periodStart: null,
            periodEnd: null,
            periodLabel: 'Période d’essai gratuite (Essentiel)',
        };
    }
    const isB2c = (0, plansConfig_1.isB2cPlanKey)(tenant.plan);
    const cycleDays = isB2c ? B2C_DAYS : MONTH_DAYS;
    const cycleMs = cycleDays * DAY_MS;
    const now = new Date();
    // 1. Chercher la facture payée la plus récente avec une période définie
    const latestPaidInvoice = await db_1.prisma.platformInvoice.findFirst({
        where: {
            tenantId,
            status: 'PAID',
            periodStart: { not: null },
        },
        orderBy: { periodStart: 'desc' },
        select: {
            id: true,
            periodStart: true,
            periodEnd: true,
            durationDays: true,
            createdAt: true,
        },
    });
    if (latestPaidInvoice?.periodStart) {
        const invoiceDuration = latestPaidInvoice.durationDays || cycleDays;
        const isAnnualInvoice = invoiceDuration >= 365;
        if (isAnnualInvoice) {
            // Pour un abonnement annuel de 12 mois, le quota mensuel d'invités se renouvelle chaque 30 jours
            const annualStart = latestPaidInvoice.periodStart;
            const elapsedDays = Math.max(0, Math.floor((now.getTime() - annualStart.getTime()) / DAY_MS));
            const monthIndex = Math.min(11, Math.floor(elapsedDays / MONTH_DAYS));
            const periodStart = new Date(annualStart.getTime() + monthIndex * MONTH_DAYS * DAY_MS);
            const periodEnd = new Date(periodStart.getTime() + MONTH_DAYS * DAY_MS);
            return {
                isPaidPlan: true,
                periodStart,
                periodEnd,
                periodLabel: `Cycle mensuel ${monthIndex + 1}/12 (Abonnement annuel)`,
            };
        }
        // Facture mensuelle ou trimestrielle standard
        const invoiceStart = latestPaidInvoice.periodStart;
        const invoiceEnd = latestPaidInvoice.periodEnd || new Date(invoiceStart.getTime() + invoiceDuration * DAY_MS);
        if (now >= invoiceStart && now <= invoiceEnd) {
            return {
                isPaidPlan: true,
                periodStart: invoiceStart,
                periodEnd: invoiceEnd,
                periodLabel: isB2c ? 'Trimestre payé en cours (90 j)' : 'Mois payé en cours (30 j)',
            };
        }
        // Si la facture est échue mais la licence reste active (renouvellement implicite ou extension admin)
        if (tenant.licenseExpiresAt && tenant.licenseExpiresAt > now) {
            const elapsedCycles = Math.max(0, Math.floor((now.getTime() - invoiceStart.getTime()) / cycleMs));
            const periodStart = new Date(invoiceStart.getTime() + elapsedCycles * cycleMs);
            const periodEnd = new Date(periodStart.getTime() + cycleMs);
            return {
                isPaidPlan: true,
                periodStart,
                periodEnd,
                periodLabel: isB2c ? 'Trimestre actif en cours' : 'Mois actif en cours',
            };
        }
        return {
            isPaidPlan: true,
            periodStart: invoiceStart,
            periodEnd: invoiceEnd,
            periodLabel: isB2c ? 'Dernier trimestre payé' : 'Dernier mois payé',
        };
    }
    // 2. Aucun historique de facture (ex. activation directe admin ou test) mais date d'expiration
    if (tenant.licenseExpiresAt) {
        const expiresAt = tenant.licenseExpiresAt;
        if (expiresAt > now) {
            const remainingMs = expiresAt.getTime() - now.getTime();
            const futureCycles = Math.floor(remainingMs / cycleMs);
            const periodEnd = new Date(expiresAt.getTime() - futureCycles * cycleMs);
            const periodStart = new Date(periodEnd.getTime() - cycleMs);
            const effectiveStart = periodStart < tenant.createdAt ? tenant.createdAt : periodStart;
            return {
                isPaidPlan: true,
                periodStart: effectiveStart,
                periodEnd,
                periodLabel: isB2c ? 'Trimestre actif en cours' : 'Mois actif en cours',
            };
        }
        // Licence expirée
        const periodStart = new Date(expiresAt.getTime() - cycleMs);
        return {
            isPaidPlan: true,
            periodStart: periodStart < tenant.createdAt ? tenant.createdAt : periodStart,
            periodEnd: expiresAt,
            periodLabel: 'Période échue',
        };
    }
    // 3. Repli si aucune date de licence n'est configurée
    return {
        isPaidPlan: true,
        periodStart: tenant.createdAt,
        periodEnd: null,
        periodLabel: isB2c ? 'Période trimestrielle active' : 'Période mensuelle active',
    };
}
/**
 * Compte les invités d'un tenant pour le contrôle des quotas :
 * - Forfait payant : invités créés au cours de la période payée active (remis à zéro à chaque cycle)
 * - Forfait FREE : total d'invités historique (limite globale de 50)
 * Retourne à la fois le quota de la période et le total historique pour visibilité superadmin / stats.
 */
async function countTenantGuestsForQuota(tenantId) {
    const [period, tenant] = await Promise.all([
        resolveTenantPaidPeriod(tenantId),
        db_1.prisma.tenant.findUnique({
            where: { id: tenantId },
            select: { plan: true, accountKind: true },
        }),
    ]);
    const limits = (0, plansConfig_1.getPlanLimitsForTenant)(tenant?.plan || client_1.PlanType.FREE, tenant?.accountKind);
    const [periodGuests, totalHistoricalGuests] = await Promise.all([
        period.periodStart
            ? db_1.prisma.guest.count({
                where: {
                    event: { tenantId },
                    createdAt: {
                        gte: period.periodStart,
                        ...(period.periodEnd ? { lte: period.periodEnd } : {}),
                    },
                },
            })
            : db_1.prisma.guest.count({
                where: { event: { tenantId } },
            }),
        db_1.prisma.guest.count({
            where: { event: { tenantId } },
        }),
    ]);
    return {
        periodGuests,
        totalHistoricalGuests,
        maxGuests: limits.maxGuests,
        periodStart: period.periodStart,
        periodEnd: period.periodEnd,
        isPaidPlan: period.isPaidPlan,
        periodLabel: period.periodLabel,
    };
}
