"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AI_TOKEN_PACK_PRICE_CDF = exports.AI_TOKEN_PACK_COUNT = void 0;
exports.initiateAiTokenPayment = initiateAiTokenPayment;
exports.findAiTokenOrderForFlexPay = findAiTokenOrderForFlexPay;
exports.verifyAndFinalizeAiTokenOrder = verifyAndFinalizeAiTokenOrder;
exports.getDeviceAiTokensSummary = getDeviceAiTokensSummary;
const db_1 = require("../db");
const paymentTraceService_1 = require("./paymentTraceService");
const aiSimulationWalletService_1 = require("./aiSimulationWalletService");
const flexPayCardService_1 = require("./flexPayCardService");
exports.AI_TOKEN_PACK_COUNT = 6;
exports.AI_TOKEN_PACK_PRICE_CDF = 2500;
// Mémoire de secours en cas d'indisponibilité momentanée de la table DB
const memoryOrders = new Map();
/**
 * Crée une commande et lance le paiement réel FlexPay (Mobile Money ou Carte).
 */
async function initiateAiTokenPayment(input) {
    const paymentMethod = input.paymentMethod === 'card' ? 'card' : 'mobile';
    const tokensCount = input.tokensCount && input.tokensCount > 0 ? input.tokensCount : exports.AI_TOKEN_PACK_COUNT;
    const amountFc = input.amountFc && input.amountFc > 0 ? input.amountFc : exports.AI_TOKEN_PACK_PRICE_CDF;
    let normalizedPhone = null;
    if (paymentMethod === 'mobile') {
        normalizedPhone = (0, flexPayCardService_1.normalizeFlexPayPhone)(input.phone || '');
        if (!normalizedPhone) {
            throw new Error('Numéro Mobile Money invalide. Veuillez saisir un numéro RDC valide (ex: 24389XXXXXXX, 24381XXXXXXX, 24399XXXXXXX).');
        }
    }
    // Création initiale de la commande
    let dbOrder = null;
    try {
        dbOrder = await db_1.prisma.aiTokenOrder.create({
            data: {
                userId: input.userId || null,
                deviceId: input.deviceId || null,
                tokensCount,
                amountFc,
                currency: 'CDF',
                status: 'PENDING',
                paymentMethod,
                phone: normalizedPhone || input.phone || null,
                operator: input.operator || null,
            },
        });
    }
    catch (err) {
        console.warn('[AiTokenPayment] Prisma create order fallback to memory:', err);
        const mockId = `aitok_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        dbOrder = {
            id: mockId,
            userId: input.userId || null,
            deviceId: input.deviceId || null,
            tokensCount,
            amountFc,
            currency: 'CDF',
            status: 'PENDING',
            paymentMethod,
            phone: normalizedPhone || input.phone || null,
            operator: input.operator || null,
            createdAt: new Date(),
        };
    }
    const orderId = dbOrder.id;
    const reference = (0, flexPayCardService_1.buildFlexPayReference)('aitok', orderId);
    const apiBase = (0, flexPayCardService_1.getPublicApiBaseUrl)();
    const callbackUrl = `${apiBase}/api/public/payments/flexpay/callback`;
    // 1) Paiement Mobile Money (Orange Money, M-Pesa, Airtel Money)
    if (paymentMethod === 'mobile') {
        let flex;
        if ((0, flexPayCardService_1.isFlexPayCardConfigured)()) {
            flex = await (0, flexPayCardService_1.createFlexPayMobileCheckout)({
                reference,
                amount: amountFc,
                currency: 'CDF',
                phone: normalizedPhone,
                callbackUrl,
            });
        }
        else {
            // Si FlexPay n'est pas configuré en dev local
            const mockOrderNumber = `FLEX-MM-${Date.now()}`;
            flex = {
                orderNumber: mockOrderNumber,
                redirectUrl: null,
                raw: { code: '0', message: 'Mode sandbox / dev' },
            };
        }
        try {
            await db_1.prisma.aiTokenOrder.update({
                where: { id: orderId },
                data: {
                    flexPayOrderNumber: flex.orderNumber,
                    flexPayReference: reference,
                },
            });
        }
        catch {
            memoryOrders.set(orderId, {
                ...dbOrder,
                flexPayOrderNumber: flex.orderNumber,
                flexPayReference: reference,
            });
        }
        return {
            success: true,
            orderId,
            orderNumber: flex.orderNumber,
            reference,
            paymentMethod: 'mobile',
            status: 'PENDING',
            tokensCount,
            amountFc,
            message: 'Une demande de paiement a été envoyée sur votre téléphone. Veuillez valider le code secret PIN sur votre mobile.',
        };
    }
    // 2) Paiement Carte Bancaire (Visa / Mastercard)
    const approveUrl = `${apiBase}/api/public/payments/flexpay/return?kind=ai_tokens&result=approve&orderId=${encodeURIComponent(orderId)}`;
    const cancelUrl = `${apiBase}/api/public/payments/flexpay/return?kind=ai_tokens&result=cancel&orderId=${encodeURIComponent(orderId)}`;
    const declineUrl = `${apiBase}/api/public/payments/flexpay/return?kind=ai_tokens&result=decline&orderId=${encodeURIComponent(orderId)}`;
    let flexCard;
    if ((0, flexPayCardService_1.isFlexPayCardConfigured)()) {
        flexCard = await (0, flexPayCardService_1.createFlexPayCardCheckout)({
            reference,
            amount: amountFc,
            currency: 'CDF',
            description: `Recharge ${tokensCount} simulations IA — EventMaster`,
            callbackUrl,
            approveUrl,
            cancelUrl,
            declineUrl,
            language: 'fr',
        });
    }
    else {
        const mockOrderNumber = `FLEX-CARD-${Date.now()}`;
        flexCard = {
            orderNumber: mockOrderNumber,
            redirectUrl: `${apiBase}/api/public/payments/flexpay/return?kind=ai_tokens&result=approve&orderId=${encodeURIComponent(orderId)}`,
            raw: { code: '0', message: 'Mode sandbox / dev' },
        };
    }
    try {
        await db_1.prisma.aiTokenOrder.update({
            where: { id: orderId },
            data: {
                flexPayOrderNumber: flexCard.orderNumber,
                flexPayReference: reference,
            },
        });
    }
    catch {
        memoryOrders.set(orderId, {
            ...dbOrder,
            flexPayOrderNumber: flexCard.orderNumber,
            flexPayReference: reference,
        });
    }
    return {
        success: true,
        orderId,
        orderNumber: flexCard.orderNumber,
        reference,
        paymentMethod: 'card',
        status: 'PENDING',
        redirectUrl: flexCard.redirectUrl,
        tokensCount,
        amountFc,
        message: 'Redirection vers la passerelle sécurisée FlexPay (Visa / Mastercard)...',
    };
}
/**
 * Recherche une commande de jetons IA par référence ou orderNumber FlexPay.
 */
async function findAiTokenOrderForFlexPay(opts) {
    try {
        if (opts.orderId) {
            const order = await db_1.prisma.aiTokenOrder.findUnique({ where: { id: opts.orderId } });
            if (order)
                return order;
        }
        if (opts.orderNumber) {
            const order = await db_1.prisma.aiTokenOrder.findFirst({
                where: { flexPayOrderNumber: opts.orderNumber },
            });
            if (order)
                return order;
        }
        if (opts.reference) {
            const order = await db_1.prisma.aiTokenOrder.findFirst({
                where: {
                    OR: [{ id: opts.reference }, { flexPayReference: opts.reference }],
                },
            });
            if (order)
                return order;
        }
    }
    catch (err) {
        console.warn('[AiTokenPayment] findAiTokenOrder fallback to memory:', err);
    }
    // Recherche dans la mémoire si non trouvé en DB
    for (const order of memoryOrders.values()) {
        if (opts.orderId && order.id === opts.orderId)
            return order;
        if (opts.orderNumber && order.flexPayOrderNumber === opts.orderNumber)
            return order;
        if (opts.reference && (order.id === opts.reference || order.flexPayReference === opts.reference)) {
            return order;
        }
    }
    return null;
}
/**
 * Vérifie le statut réel du paiement auprès de FlexPay et met à jour la commande.
 */
async function verifyAndFinalizeAiTokenOrder(orderIdOrNumber) {
    const order = await findAiTokenOrderForFlexPay({
        orderId: orderIdOrNumber,
        orderNumber: orderIdOrNumber,
        reference: orderIdOrNumber,
    });
    if (!order) {
        return {
            found: false,
            paid: false,
            status: 'NOT_FOUND',
            tokensCount: 0,
            orderId: orderIdOrNumber,
            message: 'Commande de jetons introuvable.',
        };
    }
    if (order.status === 'PAID') {
        void (0, aiSimulationWalletService_1.creditPaidAiTokenOrder)(order).catch((err) => console.error('[AiTokenPayment] wallet credit:', err));
        return {
            found: true,
            paid: true,
            status: 'PAID',
            tokensCount: order.tokensCount,
            orderId: order.id,
            orderNumber: order.flexPayOrderNumber,
            message: 'Paiement déjà validé.',
        };
    }
    const orderNumber = order.flexPayOrderNumber;
    if (!orderNumber) {
        return {
            found: true,
            paid: false,
            status: order.status,
            tokensCount: order.tokensCount,
            orderId: order.id,
            message: 'En attente d’initialisation.',
        };
    }
    let checked;
    try {
        checked = await (0, flexPayCardService_1.checkFlexPayCardOrder)(orderNumber);
    }
    catch (err) {
        console.warn('[AiTokenPayment] checkFlexPayCardOrder error:', err);
        return {
            found: true,
            paid: false,
            status: 'PENDING',
            tokensCount: order.tokensCount,
            orderId: order.id,
            orderNumber,
            message: 'Vérification en cours auprès de l’opérateur...',
        };
    }
    const isSuccess = checked.status === 'success';
    const isFailed = checked.status === 'failed';
    const metaUpdate = (0, flexPayCardService_1.buildFlexPayMetadataUpdate)({
        channel: checked.channel,
        amountCustomer: checked.amountCustomer,
        providerReference: checked.providerReference,
    });
    if (isSuccess) {
        try {
            await db_1.prisma.aiTokenOrder.update({
                where: { id: order.id },
                data: {
                    status: 'PAID',
                    paidAt: new Date(),
                    ...metaUpdate,
                },
            });
        }
        catch {
            if (memoryOrders.has(order.id)) {
                memoryOrders.set(order.id, {
                    ...memoryOrders.get(order.id),
                    status: 'PAID',
                    paidAt: new Date(),
                    ...metaUpdate,
                });
            }
        }
        void (0, paymentTraceService_1.notifyAiTokenPayment)(order).catch((err) => console.error('[AiTokenPayment] notify:', err));
        void (0, aiSimulationWalletService_1.creditPaidAiTokenOrder)(order).catch((err) => console.error('[AiTokenPayment] wallet credit:', err));
        return {
            found: true,
            paid: true,
            status: 'PAID',
            tokensCount: order.tokensCount,
            orderId: order.id,
            orderNumber,
            message: 'Paiement validé avec succès ! Jetons crédités.',
        };
    }
    if (isFailed) {
        try {
            await db_1.prisma.aiTokenOrder.update({
                where: { id: order.id },
                data: {
                    status: 'FAILED',
                    ...metaUpdate,
                },
            });
        }
        catch {
            if (memoryOrders.has(order.id)) {
                memoryOrders.set(order.id, {
                    ...memoryOrders.get(order.id),
                    status: 'FAILED',
                    ...metaUpdate,
                });
            }
        }
        return {
            found: true,
            paid: false,
            status: 'FAILED',
            tokensCount: order.tokensCount,
            orderId: order.id,
            orderNumber,
            message: 'Le paiement a échoué ou a été refusé par l’opérateur.',
        };
    }
    return {
        found: true,
        paid: false,
        status: 'PENDING',
        tokensCount: order.tokensCount,
        orderId: order.id,
        orderNumber,
        message: 'En attente de validation sur votre téléphone...',
    };
}
/**
 * Récupère le total des jetons payés et validés attachés à un identifiant d'appareil (device).
 */
async function getDeviceAiTokensSummary(deviceId) {
    if (!deviceId || typeof deviceId !== 'string') {
        return {
            deviceId: '',
            totalPaidTokens: 0,
            paidOrdersCount: 0,
        };
    }
    let totalPaidTokens = 0;
    let paidOrdersCount = 0;
    let lastPaidOrderAt = null;
    try {
        const orders = await db_1.prisma.aiTokenOrder.findMany({
            where: {
                deviceId,
                status: 'PAID',
            },
            select: {
                tokensCount: true,
                paidAt: true,
            },
        });
        for (const ord of orders) {
            totalPaidTokens += ord.tokensCount || 0;
            paidOrdersCount += 1;
            if (ord.paidAt && (!lastPaidOrderAt || ord.paidAt > lastPaidOrderAt)) {
                lastPaidOrderAt = ord.paidAt;
            }
        }
    }
    catch (err) {
        console.warn('[AiTokenPayment] getDeviceAiTokensSummary fallback to memory:', err);
        for (const order of memoryOrders.values()) {
            if (order.deviceId === deviceId && order.status === 'PAID') {
                totalPaidTokens += order.tokensCount || 0;
                paidOrdersCount += 1;
            }
        }
    }
    return {
        deviceId,
        totalPaidTokens,
        paidOrdersCount,
        lastPaidOrderAt: lastPaidOrderAt ? lastPaidOrderAt.toISOString() : null,
    };
}
