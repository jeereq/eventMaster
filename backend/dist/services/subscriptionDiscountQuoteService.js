"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.subscriptionPayHref = subscriptionPayHref;
exports.statusAfterFailedQuotedPayment = statusAfterFailedQuotedPayment;
exports.computeCatalogBaseAmount = computeCatalogBaseAmount;
exports.notifyDiscountRequestSubmitted = notifyDiscountRequestSubmitted;
exports.approveDiscountQuote = approveDiscountQuote;
const db_1 = require("../db");
const invoiceService_1 = require("./invoiceService");
const plansConfig_1 = require("../config/plansConfig");
const platformNotificationService_1 = require("./platformNotificationService");
const platformNotificationTypes_1 = require("../config/platformNotificationTypes");
const flexPayCardService_1 = require("./flexPayCardService");
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const QUOTE_TTL_DAYS = 14;
function subscriptionPayHref(requestId) {
    return `${FRONTEND_URL.replace(/\/$/, '')}/dashboard/billing?payRequest=${encodeURIComponent(requestId)}`;
}
/** Un devis validé reste payable après un échec FlexPay (le montant négocié est conservé). */
function statusAfterFailedQuotedPayment(status) {
    return status === 'QUOTED' ? status : 'REJECTED';
}
function computeCatalogBaseAmount(requestedPlan, durationDays) {
    const days = (0, plansConfig_1.resolveDurationDaysForPlan)(requestedPlan, durationDays);
    return (0, invoiceService_1.getPlanAmount)(requestedPlan, days);
}
async function notifyDiscountRequestSubmitted(opts) {
    const discountHint = opts.requestedAmount != null
        ? `Montant souhaité : ${Math.round(opts.requestedAmount).toLocaleString('fr-FR')} FC`
        : opts.requestedDiscountPercent != null
            ? `Rabais demandé : ${opts.requestedDiscountPercent} %`
            : 'Rabais à négocier';
    await (0, platformNotificationService_1.notifyPlatformStaff)({
        type: platformNotificationTypes_1.PLATFORM_NOTIFICATION_TYPE.DISCOUNT_REQUEST_PENDING,
        title: `Demande de rabais — ${opts.tenantName}`,
        message: `Forfait ${opts.requestedPlan} · ${opts.durationDays} jours. ${discountHint}. Validez le devis dans Demandes d’abonnement.`,
        metadata: {
            tenantId: opts.tenantId,
            requestId: opts.requestId,
            requestedPlan: opts.requestedPlan,
            href: `${FRONTEND_URL}/dashboard?tab=subscription-requests`,
        },
        includeCommercials: true,
    });
}
async function approveDiscountQuote(opts) {
    const request = await db_1.prisma.subscriptionRequest.findUnique({
        where: { id: opts.requestId },
        include: { tenant: { select: { id: true, name: true, accountKind: true } } },
    });
    if (!request) {
        throw new Error('Demande introuvable.');
    }
    if (request.status !== 'PENDING' && request.status !== 'QUOTED') {
        throw new Error('Cette demande a déjà été traitée.');
    }
    const durationDays = (0, plansConfig_1.resolveDurationDaysForPlan)(request.requestedPlan, request.durationDays);
    const baseAmount = (0, invoiceService_1.getPlanAmount)(request.requestedPlan, durationDays);
    const pricing = (0, invoiceService_1.computeApprovedAmount)(baseAmount, {
        discountPercent: opts.discountPercent,
        approvedAmount: opts.approvedAmount,
    });
    const quoteExpiresAt = new Date();
    quoteExpiresAt.setDate(quoteExpiresAt.getDate() + QUOTE_TTL_DAYS);
    const updated = await db_1.prisma.subscriptionRequest.update({
        where: { id: request.id },
        data: {
            status: 'QUOTED',
            requestKind: 'discount',
            specialDiscountPercent: pricing.discountPercent > 0 ? pricing.discountPercent : null,
            baseAmount: pricing.baseAmount,
            approvedAmount: pricing.finalAmount,
            quoteExpiresAt,
            quoteReviewedAt: new Date(),
            quoteReviewedById: opts.reviewerId,
        },
    });
    const payHref = subscriptionPayHref(request.id);
    const canPayOnline = (0, flexPayCardService_1.isFlexPayCardConfigured)();
    const amountLabel = `${Math.round(pricing.finalAmount).toLocaleString('fr-FR')} FC`;
    await (0, platformNotificationService_1.notifyTenantOperators)(request.tenantId, {
        type: platformNotificationTypes_1.PLATFORM_NOTIFICATION_TYPE.DISCOUNT_QUOTE_READY,
        title: 'Votre rabais a été validé',
        message: canPayOnline
            ? `Le Superadmin / commercial a accepté un tarif de ${amountLabel} pour le forfait ${request.requestedPlan}. Ouvrez le lien pour payer.`
            : `Le tarif négocié est de ${amountLabel} pour le forfait ${request.requestedPlan}. Contactez le support pour finaliser le paiement.`,
        metadata: {
            requestId: request.id,
            tenantId: request.tenantId,
            href: `/dashboard/billing?payRequest=${request.id}`,
            approvedAmount: pricing.finalAmount,
        },
        email: {
            subject: `Rabais validé — ${request.requestedPlan} · ${amountLabel}`,
            text: [
                `Bonjour,`,
                ``,
                `Votre demande de rabais pour le forfait ${request.requestedPlan} a été validée.`,
                `Montant catalogue : ${Math.round(pricing.baseAmount).toLocaleString('fr-FR')} FC`,
                `Montant à payer : ${amountLabel}`,
                pricing.discountPercent > 0 ? `Réduction : ${pricing.discountPercent} %` : '',
                ``,
                canPayOnline ? `Payer maintenant : ${payHref}` : `Ouvrez votre espace facturation : ${payHref}`,
                ``,
                `Ce devis reste valable jusqu’au ${quoteExpiresAt.toLocaleDateString('fr-FR')}.`,
            ]
                .filter(Boolean)
                .join('\n'),
        },
        whatsapp: [
            `Rabais validé — ${request.requestedPlan}`,
            `À payer : ${amountLabel}`,
            canPayOnline ? `Lien de paiement : ${payHref}` : `Espace facturation : ${payHref}`,
        ].join('\n'),
    });
    return {
        request: updated,
        payHref,
        canPayOnline,
        pricing,
        quoteExpiresAt,
        tenantName: request.tenant.name,
    };
}
