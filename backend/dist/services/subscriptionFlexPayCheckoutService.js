"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initiateFlexPaySessionForRequest = initiateFlexPaySessionForRequest;
const db_1 = require("../db");
const flexPayCardService_1 = require("./flexPayCardService");
const subscriptionActivationService_1 = require("./subscriptionActivationService");
/**
 * Relance / démarre une session FlexPay sur une SubscriptionRequest existante.
 * Met à jour montants, provider, orderNumber.
 */
async function initiateFlexPaySessionForRequest(params) {
    (0, flexPayCardService_1.assertFlexPayConfigured)();
    const { request, tenantName, method, phone } = params;
    const days = request.durationDays;
    const plan = request.requestedPlan;
    const { baseAmount, amountFc } = (0, subscriptionActivationService_1.computeSubscriptionCheckoutAmount)(plan, days);
    if (amountFc <= 0) {
        throw new Error('Montant de forfait invalide.');
    }
    if (method === 'mobile' && !phone?.trim()) {
        throw new Error('Numéro Mobile Money requis (243…).');
    }
    // Libérer l’unicité de l’ancien orderNumber avant d’en créer un nouveau
    await db_1.prisma.subscriptionRequest.update({
        where: { id: request.id },
        data: {
            status: 'PENDING',
            baseAmount,
            approvedAmount: amountFc,
            paymentProvider: method === 'mobile' ? 'flexpay_mobile' : 'flexpay_card',
            flexPayOrderNumber: null,
            flexPayReference: request.id,
            paidAt: null,
            specialDiscountPercent: null,
        },
    });
    const apiBase = (0, flexPayCardService_1.getPublicApiBaseUrl)();
    const callbackUrl = `${apiBase}/api/public/payments/flexpay/callback`;
    const description = `Forfait ${plan} — ${days} jours — ${tenantName}`;
    if (method === 'mobile') {
        const flex = await (0, flexPayCardService_1.createFlexPayMobileCheckout)({
            reference: request.id,
            amount: amountFc,
            currency: 'CDF',
            phone: String(phone),
            callbackUrl,
        });
        await db_1.prisma.subscriptionRequest.update({
            where: { id: request.id },
            data: { flexPayOrderNumber: flex.orderNumber, flexPayReference: request.id },
        });
        return {
            paid: false,
            mock: false,
            provider: 'flexpay_mobile',
            requestId: request.id,
            orderNumber: flex.orderNumber,
            message: 'Demande de paiement envoyée sur votre téléphone. Confirmez sur Mobile Money, puis revenez vérifier le statut.',
        };
    }
    const flex = await (0, flexPayCardService_1.createFlexPayCardCheckout)({
        reference: request.id,
        amount: amountFc,
        currency: 'CDF',
        description,
        callbackUrl,
        approveUrl: `${apiBase}/api/public/payments/flexpay/return?kind=subscription&requestId=${request.id}&result=approve`,
        cancelUrl: `${apiBase}/api/public/payments/flexpay/return?kind=subscription&requestId=${request.id}&result=cancel`,
        declineUrl: `${apiBase}/api/public/payments/flexpay/return?kind=subscription&requestId=${request.id}&result=decline`,
        language: 'fr',
    });
    await db_1.prisma.subscriptionRequest.update({
        where: { id: request.id },
        data: { flexPayOrderNumber: flex.orderNumber, flexPayReference: request.id },
    });
    return {
        paid: false,
        mock: false,
        provider: 'flexpay_card',
        requestId: request.id,
        checkoutUrl: flex.redirectUrl ?? undefined,
    };
}
