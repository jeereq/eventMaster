"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.submitSubscriptionRequest = submitSubscriptionRequest;
exports.getMySubscriptionRequests = getMySubscriptionRequests;
exports.getAdminSubscriptionRequests = getAdminSubscriptionRequests;
exports.approveSubscriptionRequest = approveSubscriptionRequest;
exports.rejectSubscriptionRequest = rejectSubscriptionRequest;
exports.getSubscriptionPlans = getSubscriptionPlans;
exports.checkoutSubscriptionFlexPay = checkoutSubscriptionFlexPay;
exports.retrySubscriptionFlexPay = retrySubscriptionFlexPay;
exports.verifySubscriptionFlexPay = verifySubscriptionFlexPay;
const db_1 = require("../db");
const platformAccess_1 = require("../middleware/platformAccess");
const platformCommercialScope_1 = require("../services/platformCommercialScope");
const plansConfig_1 = require("../config/plansConfig");
const tenantBillingService_1 = require("../services/tenantBillingService");
const invoiceService_1 = require("../services/invoiceService");
const adminAuditService_1 = require("../services/adminAuditService");
const platformNotificationService_1 = require("../services/platformNotificationService");
const platformNotificationTypes_1 = require("../config/platformNotificationTypes");
const platformSettingsService_1 = require("../services/platformSettingsService");
const subscriptionActivationService_1 = require("../services/subscriptionActivationService");
const subscriptionFlexPayCheckoutService_1 = require("../services/subscriptionFlexPayCheckoutService");
const flexPayCardService_1 = require("../services/flexPayCardService");
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
// 1. Submit a subscription request (Tenant)
async function submitSubscriptionRequest(req, res) {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            return res.status(403).json({ error: 'Tenant non identifié.' });
        }
        const { requestedPlan, durationDays, proofOfPayment } = req.body;
        if (!requestedPlan || !plansConfig_1.PAID_PLAN_KEYS.includes(requestedPlan)) {
            return res.status(400).json({ error: 'Le forfait demandé est invalide.' });
        }
        const tenant = await db_1.prisma.tenant.findUnique({
            where: { id: tenantId },
            select: { accountKind: true },
        });
        if (!tenant || !(0, plansConfig_1.isPlanAllowedForAccountKind)(requestedPlan, tenant.accountKind)) {
            return res.status(403).json({
                error: (0, plansConfig_1.planAudienceMismatchMessage)(requestedPlan, tenant?.accountKind),
            });
        }
        const days = (0, plansConfig_1.resolveDurationDaysForPlan)(requestedPlan, durationDays != null ? parseInt(String(durationDays), 10) : null);
        if (isNaN(days) || days <= 0) {
            return res.status(400).json({ error: 'La durée demandée est invalide.' });
        }
        // Create subscription request
        const request = await db_1.prisma.subscriptionRequest.create({
            data: {
                tenantId,
                requestedPlan: requestedPlan,
                durationDays: days,
                proofOfPayment: proofOfPayment || null,
                status: 'PENDING',
            },
        });
        const org = await db_1.prisma.tenant.findUnique({
            where: { id: tenantId },
            select: { name: true },
        });
        void (0, platformNotificationService_1.notifyPlatformStaff)({
            type: platformNotificationTypes_1.PLATFORM_NOTIFICATION_TYPE.SUBSCRIPTION_REQUEST_PENDING,
            title: `Demande d’abonnement — ${org?.name || 'Organisation'}`,
            message: `Forfait ${requestedPlan} · ${days} jours. À traiter dans Demandes d’abonnement.`,
            metadata: {
                tenantId,
                requestedPlan,
                requestId: request.id,
                href: `${FRONTEND_URL}/dashboard?tab=subscription-requests`,
            },
            includeCommercials: true,
        });
        return res.status(201).json({
            message: 'Votre demande d\'abonnement a été soumise avec succès au Super Admin !',
            request,
        });
    }
    catch (error) {
        console.error('Erreur lors de la soumission de la demande d\'abonnement:', error);
        return res.status(500).json({ error: 'Erreur lors de la soumission de la demande.' });
    }
}
// 2. Get my subscription requests (Tenant)
async function getMySubscriptionRequests(req, res) {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            return res.status(403).json({ error: 'Tenant non identifié.' });
        }
        const requests = await db_1.prisma.subscriptionRequest.findMany({
            where: { tenantId },
            orderBy: { createdAt: 'desc' },
        });
        return res.json(requests);
    }
    catch (error) {
        console.error('Erreur lors de la récupération des demandes d\'abonnement:', error);
        return res.status(500).json({ error: 'Erreur lors de la récupération de vos demandes.' });
    }
}
const tenantCommercialSelect = {
    id: true,
    name: true,
    plan: true,
    licenseActive: true,
    licenseExpiresAt: true,
    referredByCommercial: {
        select: { id: true, name: true, email: true, referralCode: true },
    },
    referredByOrgUser: {
        select: { id: true, name: true, email: true, referralCode: true, orgRole: true },
    },
};
// 3. Get all subscription requests (Super Admin)
async function getAdminSubscriptionRequests(req, res) {
    try {
        if (!(0, platformAccess_1.isPlatformStaff)(req.user?.role)) {
            return res.status(403).json({ error: 'Accès refusé. Privilèges plateforme requis.' });
        }
        const commercialId = (0, platformCommercialScope_1.isPlatformCommercial)(req.user?.role) ? req.user?.id : undefined;
        const requests = await db_1.prisma.subscriptionRequest.findMany({
            where: commercialId
                ? { tenant: (0, platformCommercialScope_1.commercialReferredTenantFilter)(commercialId) }
                : undefined,
            include: {
                tenant: {
                    select: tenantCommercialSelect,
                },
                platformInvoice: {
                    select: {
                        id: true,
                        invoiceNumber: true,
                        amount: true,
                        status: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        return res.json(requests);
    }
    catch (error) {
        console.error('Erreur lors de la récupération globale des demandes d\'abonnement:', error);
        return res.status(500).json({ error: 'Erreur lors de la récupération des demandes.' });
    }
}
// 4. Approve a subscription request (Super Admin)
async function approveSubscriptionRequest(req, res) {
    try {
        if (!(0, platformAccess_1.isPlatformStaff)(req.user?.role)) {
            return res.status(403).json({ error: 'Accès refusé. Privilèges plateforme requis.' });
        }
        const requestId = req.params.id;
        const { discountPercent, approvedAmount } = req.body ?? {};
        const parsedDiscount = discountPercent !== undefined && discountPercent !== null && discountPercent !== ''
            ? parseFloat(String(discountPercent))
            : undefined;
        const parsedApproved = approvedAmount !== undefined && approvedAmount !== null && approvedAmount !== ''
            ? parseFloat(String(approvedAmount))
            : undefined;
        if (parsedDiscount !== undefined && (isNaN(parsedDiscount) || parsedDiscount < 0 || parsedDiscount > 100)) {
            return res.status(400).json({ error: 'La réduction doit être entre 0 et 100 %.' });
        }
        if (parsedApproved !== undefined && (isNaN(parsedApproved) || parsedApproved < 0)) {
            return res.status(400).json({ error: 'Le montant approuvé est invalide.' });
        }
        const request = await db_1.prisma.subscriptionRequest.findUnique({
            where: { id: requestId },
            include: {
                tenant: {
                    select: {
                        name: true,
                        plan: true,
                        licenseActive: true,
                        licenseExpiresAt: true,
                        accountKind: true,
                    },
                },
            },
        });
        if (!request) {
            return res.status(404).json({ error: 'Demande d\'abonnement non trouvée.' });
        }
        if (request.status !== 'PENDING') {
            return res.status(400).json({ error: 'Cette demande a déjà été traitée.' });
        }
        if (!(0, plansConfig_1.isPlanAllowedForAccountKind)(request.requestedPlan, request.tenant.accountKind)) {
            return res.status(403).json({
                error: (0, plansConfig_1.planAudienceMismatchMessage)(request.requestedPlan, request.tenant.accountKind),
            });
        }
        if ((0, platformCommercialScope_1.isPlatformCommercial)(req.user?.role) && req.user?.id) {
            const owns = await (0, platformCommercialScope_1.assertCommercialOwnsTenant)(req.user.id, request.tenantId);
            if (!owns) {
                return res.status(403).json({ error: 'Vous ne pouvez approuver que les demandes des organisations que vous avez parrainées.' });
            }
        }
        const durationDays = (0, plansConfig_1.resolveDurationDaysForPlan)(request.requestedPlan, request.durationDays);
        const baseAmount = (0, invoiceService_1.getPlanAmount)(request.requestedPlan, durationDays);
        let resolvedApproved = parsedApproved;
        let resolvedDiscount = parsedDiscount;
        const hasExplicitDiscount = resolvedDiscount !== undefined || resolvedApproved !== undefined;
        if (!hasExplicitDiscount) {
            const defaults = (0, plansConfig_1.resolveDefaultSubscriptionDiscountOptions)(request.requestedPlan, durationDays);
            if (defaults.approvedAmount !== undefined)
                resolvedApproved = defaults.approvedAmount;
            if (defaults.discountPercent !== undefined)
                resolvedDiscount = defaults.discountPercent;
        }
        const pricing = (0, invoiceService_1.computeApprovedAmount)(baseAmount, {
            discountPercent: resolvedDiscount,
            approvedAmount: resolvedApproved,
        });
        // Expiration : prolongation si même forfait actif, sinon nouvelle période (changement de plan)
        const tenantBefore = request.tenant;
        const isSamePlanRenewal = tenantBefore.licenseActive &&
            tenantBefore.licenseExpiresAt &&
            tenantBefore.plan === request.requestedPlan;
        const expiryDate = isSamePlanRenewal
            ? (0, tenantBillingService_1.computeExtendedExpiry)(tenantBefore.licenseExpiresAt, durationDays)
            : (() => {
                const d = new Date();
                d.setDate(d.getDate() + durationDays);
                return d;
            })();
        const billingAction = tenantBefore.plan === 'FREE' || !tenantBefore.licenseActive
            ? 'ACTIVATION'
            : tenantBefore.plan === request.requestedPlan
                ? 'RENEWAL'
                : 'PLAN_CHANGE';
        // Generate a unique license key EM-XXXX-XXXX-XXXX
        const generateLicenseKey = () => {
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
            const segment = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
            return `EM-${segment()}-${segment()}-${segment()}`;
        };
        const newLicenseKey = generateLicenseKey();
        const periodStart = new Date();
        const periodEnd = expiryDate;
        // Update Tenant and Request in a transaction
        const [updatedRequest, updatedTenant] = await db_1.prisma.$transaction([
            db_1.prisma.subscriptionRequest.update({
                where: { id: requestId },
                data: {
                    status: 'APPROVED',
                    specialDiscountPercent: pricing.discountPercent > 0 ? pricing.discountPercent : null,
                    baseAmount: pricing.baseAmount,
                    approvedAmount: pricing.finalAmount,
                },
            }),
            db_1.prisma.tenant.update({
                where: { id: request.tenantId },
                data: {
                    plan: request.requestedPlan,
                    licenseActive: true,
                    licenseExpiresAt: expiryDate,
                    licenseKey: newLicenseKey,
                    licenseExpiryWarningFor: null,
                    billingCycle: (0, plansConfig_1.billingCycleFromDurationDays)(durationDays),
                },
            }),
        ]);
        const successMessage = billingAction === 'PLAN_CHANGE'
            ? `Forfait changé (${tenantBefore.plan} → ${request.requestedPlan}). Licence active jusqu'au ${expiryDate.toLocaleDateString('fr-FR')}.`
            : billingAction === 'RENEWAL'
                ? `Abonnement renouvelé jusqu'au ${expiryDate.toLocaleDateString('fr-FR')}.`
                : `La demande d'abonnement a été approuvée. Licence active jusqu'au ${expiryDate.toLocaleDateString('fr-FR')}.`;
        // Facturation et notifications en arrière-plan (réponse immédiate à l'interface)
        void (async () => {
            try {
                const invoiceResult = await (0, tenantBillingService_1.issueTenantPlanInvoice)({
                    tenantId: request.tenantId,
                    tenantName: tenantBefore?.name ?? 'Organisation',
                    plan: request.requestedPlan,
                    billing: {
                        action: billingAction,
                        durationDays,
                        discountPercent: resolvedDiscount,
                        approvedAmount: resolvedApproved,
                        periodStart,
                        periodEnd,
                    },
                    subscriptionRequestId: requestId,
                });
                if (invoiceResult.invoice) {
                    console.log(`[Subscription] Facture ${invoiceResult.invoice.invoiceNumber} générée pour la demande ${requestId}`);
                }
            }
            catch (billingError) {
                console.error('Erreur facturation après approbation abonnement:', billingError);
            }
        })();
        await (0, adminAuditService_1.auditReq)(req, {
            action: 'SUBSCRIPTION_APPROVE',
            targetType: 'subscriptionRequest',
            targetId: requestId,
            tenantId: request.tenantId,
            summary: `Demande d’abonnement approuvée pour « ${tenantBefore.name} » (${request.requestedPlan})`,
            metadata: {
                requestedPlan: request.requestedPlan,
                billingAction,
                approvedAmount: pricing.finalAmount,
            },
        });
        return res.json({
            message: successMessage,
            request: updatedRequest,
            pricing,
            commercialNotified: [],
            invoice: null,
            billingWarning: null,
            billingAction,
            tenant: {
                id: updatedTenant.id,
                name: updatedTenant.name,
                plan: updatedTenant.plan,
                licenseActive: updatedTenant.licenseActive,
                licenseExpiresAt: updatedTenant.licenseExpiresAt,
                licenseKey: updatedTenant.licenseKey,
                previousPlan: tenantBefore.plan,
            },
        });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Erreur inconnue';
        console.error('Erreur lors de l\'approbation de la demande d\'abonnement:', error);
        return res.status(500).json({
            error: 'Erreur lors de l\'approbation de la demande.',
            details: process.env.NODE_ENV !== 'production' ? message : undefined,
        });
    }
}
// 5. Reject a subscription request (Super Admin)
async function rejectSubscriptionRequest(req, res) {
    try {
        if (!(0, platformAccess_1.isPlatformStaff)(req.user?.role)) {
            return res.status(403).json({ error: 'Accès refusé. Privilèges plateforme requis.' });
        }
        const requestId = req.params.id;
        const request = await db_1.prisma.subscriptionRequest.findUnique({
            where: { id: requestId },
        });
        if (!request) {
            return res.status(404).json({ error: 'Demande d\'abonnement non trouvée.' });
        }
        if (request.status !== 'PENDING') {
            return res.status(400).json({ error: 'Cette demande a déjà été traitée.' });
        }
        if ((0, platformCommercialScope_1.isPlatformCommercial)(req.user?.role) && req.user?.id) {
            const owns = await (0, platformCommercialScope_1.assertCommercialOwnsTenant)(req.user.id, request.tenantId);
            if (!owns) {
                return res.status(403).json({ error: 'Vous ne pouvez rejeter que les demandes des organisations que vous avez parrainées.' });
            }
        }
        const updatedRequest = await db_1.prisma.subscriptionRequest.update({
            where: { id: requestId },
            data: { status: 'REJECTED' },
        });
        await (0, adminAuditService_1.auditReq)(req, {
            action: 'SUBSCRIPTION_REJECT',
            targetType: 'subscriptionRequest',
            targetId: requestId,
            tenantId: request.tenantId,
            summary: `Demande d’abonnement rejetée (${request.requestedPlan})`,
            metadata: { requestedPlan: request.requestedPlan },
        });
        return res.json({
            message: 'La demande d\'abonnement a été rejetée.',
            request: updatedRequest,
        });
    }
    catch (error) {
        console.error('Erreur lors du rejet de la demande d\'abonnement:', error);
        return res.status(500).json({ error: 'Erreur lors du rejet de la demande.' });
    }
}
// 6. Get public/authenticated subscription plans from settings
async function getSubscriptionPlans(req, res) {
    return res.json({
        ...(0, plansConfig_1.getPlansConfiguration)(),
        saasPaymentMode: (0, platformSettingsService_1.getSaasPaymentMode)(),
        onlinePaymentsEnabled: (0, platformSettingsService_1.isOnlinePaymentsEnabled)(),
    });
}
/**
 * Checkout forfait SaaS via FlexPay (Visa ou Mobile Money).
 * POST /api/subscriptions/checkout
 * body: { requestedPlan, durationDays?, paymentMethod: 'card'|'mobile', phone? }
 */
async function checkoutSubscriptionFlexPay(req, res) {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            return res.status(403).json({ error: 'Tenant non identifié.' });
        }
        if ((0, platformSettingsService_1.getSaasPaymentMode)() !== 'flexpay') {
            return res.status(400).json({
                error: 'Le paiement FlexPay des forfaits est désactivé. Soumettez une demande manuelle.',
                saasPaymentMode: 'manual',
            });
        }
        if (!(0, platformSettingsService_1.isOnlinePaymentsEnabled)()) {
            return res.status(503).json({
                error: 'Les paiements en ligne sont temporairement désactivés.',
            });
        }
        if (!(0, flexPayCardService_1.isFlexPayCardConfigured)()) {
            return res.status(503).json({
                error: 'Paiements FlexPay non configurés. Contactez le support.',
            });
        }
        const { requestedPlan, durationDays, paymentMethod, phone } = req.body || {};
        const method = paymentMethod === 'mobile' ? 'mobile' : 'card';
        if (!requestedPlan || !plansConfig_1.PAID_PLAN_KEYS.includes(requestedPlan)) {
            return res.status(400).json({ error: 'Le forfait demandé est invalide.' });
        }
        const tenant = await db_1.prisma.tenant.findUnique({
            where: { id: tenantId },
            select: { accountKind: true, name: true },
        });
        if (!tenant || !(0, plansConfig_1.isPlanAllowedForAccountKind)(requestedPlan, tenant.accountKind)) {
            return res.status(403).json({
                error: (0, plansConfig_1.planAudienceMismatchMessage)(requestedPlan, tenant?.accountKind),
            });
        }
        const days = (0, plansConfig_1.resolveDurationDaysForPlan)(requestedPlan, durationDays != null ? parseInt(String(durationDays), 10) : null);
        if (isNaN(days) || days <= 0) {
            return res.status(400).json({ error: 'La durée demandée est invalide.' });
        }
        const { baseAmount, amountFc } = (0, subscriptionActivationService_1.computeSubscriptionCheckoutAmount)(requestedPlan, days);
        if (amountFc <= 0) {
            return res.status(400).json({ error: 'Montant de forfait invalide.' });
        }
        if (method === 'mobile' && !phone) {
            return res.status(400).json({ error: 'Numéro Mobile Money requis (243…).' });
        }
        const request = await db_1.prisma.subscriptionRequest.create({
            data: {
                tenantId,
                requestedPlan: requestedPlan,
                durationDays: days,
                status: 'PENDING',
                baseAmount,
                approvedAmount: amountFc,
                paymentProvider: method === 'mobile' ? 'flexpay_mobile' : 'flexpay_card',
                flexPayReference: null,
            },
        });
        try {
            const result = await (0, subscriptionFlexPayCheckoutService_1.initiateFlexPaySessionForRequest)({
                request,
                tenantName: tenant.name,
                method,
                phone,
            });
            return res.status(201).json(result);
        }
        catch (err) {
            await db_1.prisma.subscriptionRequest.update({
                where: { id: request.id },
                data: { status: 'REJECTED' },
            });
            return res.status(502).json({
                error: err?.message || 'Impossible d’ouvrir le paiement FlexPay.',
            });
        }
    }
    catch (error) {
        console.error('[Subscription] checkout FlexPay', error);
        return res.status(500).json({ error: error?.message || 'Checkout forfait impossible.' });
    }
}
/**
 * Relance un paiement FlexPay sur une demande PENDING ou REJECTED.
 * POST /api/subscriptions/requests/:id/retry-payment
 * body: { paymentMethod?: 'card'|'mobile', phone? }
 */
async function retrySubscriptionFlexPay(req, res) {
    try {
        const tenantId = req.user?.tenantId;
        const requestId = String(req.params.id || '');
        if (!tenantId)
            return res.status(403).json({ error: 'Tenant non identifié.' });
        if ((0, platformSettingsService_1.getSaasPaymentMode)() !== 'flexpay') {
            return res.status(400).json({
                error: 'Le paiement FlexPay des forfaits est désactivé.',
                saasPaymentMode: 'manual',
            });
        }
        if (!(0, platformSettingsService_1.isOnlinePaymentsEnabled)()) {
            return res.status(503).json({ error: 'Les paiements en ligne sont temporairement désactivés.' });
        }
        const request = await db_1.prisma.subscriptionRequest.findFirst({
            where: { id: requestId, tenantId },
            include: { tenant: { select: { name: true } } },
        });
        if (!request)
            return res.status(404).json({ error: 'Demande introuvable.' });
        if (request.status === 'APPROVED') {
            return res.status(400).json({ error: 'Cette demande est déjà payée et approuvée.' });
        }
        if (request.status !== 'PENDING' && request.status !== 'REJECTED') {
            return res.status(400).json({ error: 'Cette demande ne peut pas être relancée.' });
        }
        const rawMethod = String(req.body?.paymentMethod || '').toLowerCase();
        const fallback = request.paymentProvider === 'flexpay_mobile' ? 'mobile' : 'card';
        const method = rawMethod === 'mobile' || rawMethod === 'card' ? rawMethod : fallback;
        const phone = req.body?.phone ?? null;
        try {
            const result = await (0, subscriptionFlexPayCheckoutService_1.initiateFlexPaySessionForRequest)({
                request,
                tenantName: request.tenant.name,
                method: method,
                phone,
            });
            return res.json({
                ...result,
                retried: true,
                message: result.message || 'Nouvelle tentative de paiement initiée.',
            });
        }
        catch (err) {
            await db_1.prisma.subscriptionRequest.update({
                where: { id: request.id },
                data: { status: 'REJECTED' },
            });
            return res.status(502).json({
                error: err?.message || 'Impossible de relancer le paiement FlexPay.',
            });
        }
    }
    catch (error) {
        console.error('[Subscription] retry FlexPay', error);
        return res.status(500).json({ error: error?.message || 'Relance impossible.' });
    }
}
/** Vérifie / finalise un paiement forfait FlexPay. */
async function verifySubscriptionFlexPay(req, res) {
    try {
        const tenantId = req.user?.tenantId;
        const requestId = String(req.params.id || '');
        if (!tenantId)
            return res.status(403).json({ error: 'Tenant non identifié.' });
        const request = await db_1.prisma.subscriptionRequest.findFirst({
            where: { id: requestId, tenantId },
        });
        if (!request)
            return res.status(404).json({ error: 'Demande introuvable.' });
        if (request.status === 'APPROVED') {
            return res.json({
                paid: true,
                requestId: request.id,
                status: request.status,
                channel: request.flexPayChannel,
            });
        }
        if (request.status === 'REJECTED') {
            return res.json({
                paid: false,
                status: 'failed',
                requestId: request.id,
                message: 'Paiement refusé ou annulé. Vous pouvez relancer une tentative.',
                canRetry: true,
                channel: request.flexPayChannel,
            });
        }
        if (!request.flexPayOrderNumber) {
            return res.json({
                paid: false,
                status: 'pending',
                requestId: request.id,
                message: 'Aucun paiement FlexPay associé. Relancez une tentative.',
                canRetry: true,
            });
        }
        if (!(0, flexPayCardService_1.isFlexPayCardConfigured)()) {
            return res.status(503).json({
                error: 'Paiements FlexPay non configurés.',
                canRetry: true,
            });
        }
        const checked = await (0, flexPayCardService_1.checkFlexPayCardOrder)(request.flexPayOrderNumber);
        const meta = (0, flexPayCardService_1.buildFlexPayMetadataUpdate)({
            channel: checked.channel,
            amountCustomer: checked.amountCustomer,
            providerReference: checked.providerReference,
        });
        if (checked.status === 'failed') {
            await db_1.prisma.subscriptionRequest.update({
                where: { id: request.id },
                data: { status: 'REJECTED', ...meta },
            });
            return res.json({
                paid: false,
                status: 'failed',
                requestId: request.id,
                message: 'Le paiement a échoué. Vous pouvez relancer une tentative.',
                canRetry: true,
                channel: checked.channel || request.flexPayChannel,
            });
        }
        if (checked.status !== 'success') {
            if (Object.keys(meta).length) {
                await db_1.prisma.subscriptionRequest.update({ where: { id: request.id }, data: meta });
            }
            return res.json({
                paid: false,
                status: checked.status === 'pending' ? 'pending' : checked.status,
                requestId: request.id,
                canRetry: checked.status === 'unknown',
                channel: checked.channel || request.flexPayChannel,
            });
        }
        if (Object.keys(meta).length) {
            await db_1.prisma.subscriptionRequest.update({ where: { id: request.id }, data: meta });
        }
        const activated = await (0, subscriptionActivationService_1.activateSubscriptionRequest)(request.id, {
            approvedAmount: request.approvedAmount ?? undefined,
            markPaid: true,
        });
        return res.json({
            paid: true,
            requestId: request.id,
            status: 'APPROVED',
            tenant: activated.alreadyProcessed ? undefined : activated.tenant,
            channel: checked.channel || request.flexPayChannel,
        });
    }
    catch (error) {
        console.error('[Subscription] verify FlexPay', error);
        return res.status(500).json({ error: error?.message || 'Vérification impossible.' });
    }
}
