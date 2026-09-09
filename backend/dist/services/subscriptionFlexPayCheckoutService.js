"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initiateFlexPaySessionForRequest = initiateFlexPaySessionForRequest;
const db_1 = require("../db");
const flexPayCardService_1 = require("./flexPayCardService");
const subscriptionActivationService_1 = require("./subscriptionActivationService");
const platformSettingsService_1 = require("./platformSettingsService");
const flexPayChargeCurrency_1 = require("./flexPayChargeCurrency");
/**
 * Relance / démarre une session FlexPay sur une SubscriptionRequest existante.
 * Met à jour montants, provider, orderNumber.
 */
async function initiateFlexPaySessionForRequest(params) {
    (0, flexPayCardService_1.assertFlexPayConfigured)();
    const { request, tenantName, method, phone } = params;
    const chargeCurrency = (0, flexPayChargeCurrency_1.parseFlexPayChargeCurrency)(params.currency, method);
    const days = request.durationDays;
    const plan = request.requestedPlan;
    const catalog = (0, subscriptionActivationService_1.computeSubscriptionCheckoutAmount)(plan, days);
    const preserveQuote = request.status === 'QUOTED' ||
        (typeof request.approvedAmount === 'number' &&
            request.approvedAmount > 0 &&
            ((request.specialDiscountPercent ?? 0) > 0 || request.requestKind === 'discount'));
    const baseAmount = preserveQuote && request.baseAmount != null ? request.baseAmount : catalog.baseAmount;
    const amountFc = preserveQuote && request.approvedAmount != null ? request.approvedAmount : catalog.amountFc;
    if (amountFc <= 0) {
        throw new Error('Montant de forfait invalide.');
    }
    if (method === 'mobile' && !phone?.trim()) {
        throw new Error('Numéro Mobile Money requis (243…).');
    }
    const reference = (0, flexPayCardService_1.buildFlexPayReference)('sub', request.id);
    // Libérer l’unicité de l’ancien orderNumber avant d’en créer un nouveau
    await db_1.prisma.subscriptionRequest.update({
        where: { id: request.id },
        data: {
            status: request.status === 'QUOTED' ? 'QUOTED' : 'PENDING',
            baseAmount,
            approvedAmount: amountFc,
            paymentProvider: method === 'mobile' ? 'flexpay_mobile' : 'flexpay_card',
            flexPayOrderNumber: null,
            flexPayReference: reference,
            paidAt: null,
            specialDiscountPercent: preserveQuote ? request.specialDiscountPercent : null,
        },
    });
    const apiBase = (0, flexPayCardService_1.getPublicApiBaseUrl)();
    const callbackUrl = `${apiBase}/api/public/payments/flexpay/callback`;
    const description = `Forfait ${plan} — ${days} jours — ${tenantName}`;
    if (method === 'mobile') {
        const charge = (0, flexPayChargeCurrency_1.resolveFlexPayCharge)(amountFc, chargeCurrency, (0, platformSettingsService_1.loadPlatformSettings)().usdExchangeRateCdf);
        const flex = await (0, flexPayCardService_1.createFlexPayMobileCheckout)({
            reference,
            amount: charge.amount,
            currency: charge.currency,
            phone: String(phone),
            callbackUrl,
        });
        await db_1.prisma.subscriptionRequest.update({
            where: { id: request.id },
            data: { flexPayOrderNumber: flex.orderNumber, flexPayReference: reference },
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
        reference,
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
        data: { flexPayOrderNumber: flex.orderNumber, flexPayReference: reference },
    });
    return {
        paid: false,
        mock: false,
        provider: 'flexpay_card',
        requestId: request.id,
        checkoutUrl: flex.redirectUrl ?? undefined,
    };
}
