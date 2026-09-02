"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processSubscriptionExpiryTasks = processSubscriptionExpiryTasks;
exports.startSubscriptionExpiryWorker = startSubscriptionExpiryWorker;
const db_1 = require("../db");
const invoiceService_1 = require("./invoiceService");
const tenantBillingService_1 = require("./tenantBillingService");
const platformNotificationService_1 = require("./platformNotificationService");
const platformNotificationTypes_1 = require("../config/platformNotificationTypes");
const notificationService_1 = require("./notificationService");
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
function startOfDay(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
}
function daysUntil(expiry, now) {
    const start = startOfDay(now);
    const end = startOfDay(expiry);
    return Math.round((end.getTime() - start.getTime()) / 86400000);
}
function isSameExpiryDate(a, b) {
    if (!a)
        return false;
    return startOfDay(a).getTime() === startOfDay(b).getTime();
}
async function processSubscriptionExpiryTasks() {
    console.log('[Subscription Expiry] Vérification des expirations et renouvellements...');
    try {
        const now = new Date();
        const tenants = await db_1.prisma.tenant.findMany({
            where: {
                plan: { not: 'FREE' },
                licenseExpiresAt: { not: null },
                OR: [{ licenseActive: true }, { licenseActive: false }],
            },
            select: {
                id: true,
                name: true,
                plan: true,
                billingCycle: true,
                licenseActive: true,
                licenseExpiresAt: true,
                licenseExpiryWarningFor: true,
            },
        });
        for (const tenant of tenants) {
            const expiresAt = tenant.licenseExpiresAt;
            const remaining = daysUntil(expiresAt, now);
            const renewal = (0, tenantBillingService_1.resolveRenewalTerms)(tenant.plan, tenant.billingCycle);
            // J-7 : avertir une seule fois par date d'expiration
            if (remaining === 7 &&
                tenant.licenseActive &&
                !isSameExpiryDate(tenant.licenseExpiryWarningFor, expiresAt)) {
                const owner = await (0, invoiceService_1.getTenantOwner)(tenant.id);
                if (owner) {
                    await (0, invoiceService_1.sendLicenseExpiryWarning)({
                        tenantId: tenant.id,
                        tenantName: tenant.name,
                        plan: tenant.plan,
                        expiresAt,
                        ownerEmail: owner.email,
                        ownerName: owner.name,
                        ownerPhone: owner.phone,
                        durationDays: renewal.durationDays,
                    });
                    await db_1.prisma.tenant.update({
                        where: { id: tenant.id },
                        data: { licenseExpiryWarningFor: expiresAt },
                    });
                    console.log(`[Subscription Expiry] Rappel J-7 envoyé pour ${tenant.name}`);
                }
            }
            // Jour J ou déjà dépassé : désactiver + notifier (pas de facture PAID sans paiement)
            if (remaining <= 0 && tenant.licenseActive) {
                await db_1.prisma.tenant.update({
                    where: { id: tenant.id },
                    data: { licenseActive: false },
                });
                const renewHref = `${FRONTEND_URL}/dashboard/billing`;
                const expiryLabel = expiresAt.toLocaleDateString('fr-FR');
                const amountHint = renewal.finalAmount.toLocaleString('fr-FR');
                void (0, platformNotificationService_1.notifyTenantOperators)(tenant.id, {
                    type: platformNotificationTypes_1.PLATFORM_NOTIFICATION_TYPE.LICENSE_EXPIRING,
                    title: `Licence expirée — ${tenant.name}`,
                    message: `Votre forfait ${tenant.plan} a expiré le ${expiryLabel}. Renouvelez depuis Facturation (≈ ${amountHint} FC).`,
                    metadata: {
                        tenantId: tenant.id,
                        plan: tenant.plan,
                        href: renewHref,
                    },
                    channels: ['IN_APP', 'PUSH', 'WHATSAPP'],
                });
                void (0, platformNotificationService_1.notifyPlatformStaff)({
                    type: platformNotificationTypes_1.PLATFORM_NOTIFICATION_TYPE.LICENSE_EXPIRING,
                    title: `Licence expirée — ${tenant.name}`,
                    message: `Forfait ${tenant.plan} expiré le ${expiryLabel}. En attente de renouvellement.`,
                    metadata: { tenantId: tenant.id, plan: tenant.plan, href: renewHref },
                    includeCommercials: true,
                });
                const owner = await (0, invoiceService_1.getTenantOwner)(tenant.id);
                if (owner?.email) {
                    void (0, notificationService_1.sendRealEmail)(owner.email, 'EventMaster — Votre abonnement a expiré', [
                        `L'abonnement de « ${tenant.name} » (${tenant.plan}) a expiré le ${expiryLabel}.`,
                        `Montant estimé du renouvellement : ${amountHint} FC.`,
                        '',
                        `Renouvelez ici : ${renewHref}`,
                    ].join('\n'), `<p>L'abonnement de <strong>${tenant.name}</strong> (<strong>${tenant.plan}</strong>) a expiré le <strong>${expiryLabel}</strong>.</p>
<p>Montant estimé : <strong>${amountHint} FC</strong>.</p>
<p><a href="${renewHref}">Renouveler mon forfait</a></p>`).catch((err) => console.warn('[Subscription Expiry] email:', err));
                }
                console.log(`[Subscription Expiry] Licence désactivée pour ${tenant.name} (expirée ${expiryLabel})`);
            }
        }
    }
    catch (error) {
        console.error('[Subscription Expiry] Erreur:', error);
    }
}
function startSubscriptionExpiryWorker() {
    console.log('[Subscription Expiry] Initialisation du worker...');
    setTimeout(() => {
        processSubscriptionExpiryTasks();
    }, 15000);
    setInterval(() => {
        processSubscriptionExpiryTasks();
    }, 6 * 60 * 60 * 1000);
}
