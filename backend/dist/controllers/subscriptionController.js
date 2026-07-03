"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.submitSubscriptionRequest = submitSubscriptionRequest;
exports.getMySubscriptionRequests = getMySubscriptionRequests;
exports.getAdminSubscriptionRequests = getAdminSubscriptionRequests;
exports.approveSubscriptionRequest = approveSubscriptionRequest;
exports.rejectSubscriptionRequest = rejectSubscriptionRequest;
exports.getSubscriptionPlans = getSubscriptionPlans;
const db_1 = require("../db");
const platformAccess_1 = require("../middleware/platformAccess");
const platformCommercialScope_1 = require("../services/platformCommercialScope");
const plansConfig_1 = require("../config/plansConfig");
const tenantBillingService_1 = require("../services/tenantBillingService");
const invoiceService_1 = require("../services/invoiceService");
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
        const days = durationDays ? parseInt(durationDays) : 30;
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
                tenant: { select: { name: true } },
            },
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
                return res.status(403).json({ error: 'Vous ne pouvez approuver que les demandes des organisations que vous avez parrainées.' });
            }
        }
        const baseAmount = (0, invoiceService_1.getPlanAmount)(request.requestedPlan);
        const planDef = (0, plansConfig_1.getPlanLimits)(request.requestedPlan);
        let resolvedApproved = parsedApproved;
        let resolvedDiscount = parsedDiscount;
        const hasExplicitDiscount = (resolvedDiscount !== undefined && resolvedDiscount > 0) ||
            resolvedApproved !== undefined;
        if (!hasExplicitDiscount && planDef.promoActive && planDef.promoMonthlyPriceFc != null) {
            resolvedApproved = planDef.promoMonthlyPriceFc;
        }
        const pricing = (0, invoiceService_1.computeApprovedAmount)(baseAmount, {
            discountPercent: resolvedDiscount,
            approvedAmount: resolvedApproved,
        });
        // Calculate expiry date (30 days or custom duration)
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + request.durationDays);
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
                },
            }),
        ]);
        let invoiceResult = null;
        let billingWarning = null;
        try {
            invoiceResult = await (0, tenantBillingService_1.issueTenantPlanInvoice)({
                tenantId: request.tenantId,
                tenantName: request.tenant?.name ?? 'Organisation',
                plan: request.requestedPlan,
                billing: {
                    action: 'ACTIVATION',
                    durationDays: request.durationDays,
                    discountPercent: resolvedDiscount,
                    approvedAmount: resolvedApproved,
                    periodStart,
                    periodEnd,
                },
                subscriptionRequestId: requestId,
            });
        }
        catch (billingError) {
            const billingMessage = billingError instanceof Error ? billingError.message : 'Erreur facturation inconnue';
            console.error('Erreur facturation après approbation abonnement:', billingError);
            billingWarning = `Licence activée, mais la facture n'a pas pu être générée (${billingMessage}).`;
        }
        const discountNote = invoiceResult && invoiceResult.pricing.discountAmount > 0
            ? ` Réduction spéciale de ${invoiceResult.pricing.discountPercent} % appliquée (− ${invoiceResult.pricing.discountAmount.toLocaleString('fr-FR')} FC).`
            : '';
        const commercialNote = invoiceResult && invoiceResult.commercialNotified.length > 0
            ? ` Commercial(s) informé(s) : ${invoiceResult.commercialNotified.join(', ')}.`
            : '';
        const invoiceNote = invoiceResult?.invoice
            ? ' Facture envoyée au propriétaire et aux managers.'
            : billingWarning
                ? ` ${billingWarning}`
                : '';
        return res.json({
            message: `La demande d'abonnement a été approuvée. Licence active jusqu'au ${expiryDate.toLocaleDateString('fr-FR')}.${invoiceNote}${discountNote}${commercialNote}`,
            request: updatedRequest,
            pricing: invoiceResult?.pricing ?? pricing,
            commercialNotified: invoiceResult?.commercialNotified ?? [],
            invoice: invoiceResult?.invoice
                ? { id: invoiceResult.invoice.id, invoiceNumber: invoiceResult.invoice.invoiceNumber, amount: invoiceResult.invoice.amount }
                : null,
            billingWarning,
            tenant: {
                id: updatedTenant.id,
                name: updatedTenant.name,
                plan: updatedTenant.plan,
                licenseActive: updatedTenant.licenseActive,
                licenseExpiresAt: updatedTenant.licenseExpiresAt,
                licenseKey: updatedTenant.licenseKey,
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
    return res.json((0, plansConfig_1.getPlansConfiguration)());
}
