"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.flexPayCardCallback = flexPayCardCallback;
exports.flexPayCardReturn = flexPayCardReturn;
exports.verifyFlexPayCardOrder = verifyFlexPayCardOrder;
exports.retryFlexPayTicketOrder = retryFlexPayTicketOrder;
const db_1 = require("../db");
const ticketOrderService_1 = require("../services/ticketOrderService");
const subscriptionActivationService_1 = require("../services/subscriptionActivationService");
const flexPayCardService_1 = require("../services/flexPayCardService");
const commercialFlexPayPayoutService_1 = require("../services/commercialFlexPayPayoutService");
const platformSettingsService_1 = require("../services/platformSettingsService");
function frontendBaseUrl() {
    return (process.env.FRONTEND_URL || 'http://localhost:3000').trim().replace(/\/$/, '');
}
async function findTicketOrderForFlexPay(opts) {
    if (opts.orderNumber) {
        const byNumber = await db_1.prisma.ticketOrder.findFirst({
            where: { flexPayOrderNumber: opts.orderNumber },
            include: { event: { select: { slug: true, title: true } } },
        });
        if (byNumber)
            return byNumber;
    }
    if (opts.reference) {
        const byRef = await db_1.prisma.ticketOrder.findFirst({
            where: {
                OR: [{ id: opts.reference }, { flexPayReference: opts.reference }],
            },
            include: { event: { select: { slug: true, title: true } } },
        });
        if (byRef)
            return byRef;
    }
    return null;
}
async function findSubscriptionRequestForFlexPay(opts) {
    if (opts.orderNumber) {
        const byNumber = await db_1.prisma.subscriptionRequest.findFirst({
            where: { flexPayOrderNumber: opts.orderNumber },
        });
        if (byNumber)
            return byNumber;
    }
    if (opts.reference) {
        const byRef = await db_1.prisma.subscriptionRequest.findFirst({
            where: {
                OR: [{ id: opts.reference }, { flexPayReference: opts.reference }],
            },
        });
        if (byRef)
            return byRef;
    }
    return null;
}
function metadataFromCallback(parsed) {
    return (0, flexPayCardService_1.buildFlexPayMetadataUpdate)({
        channel: parsed.channel,
        amountCustomer: parsed.amountCustomer,
        providerReference: parsed.providerReference,
    });
}
function metadataFromCheck(checked) {
    return (0, flexPayCardService_1.buildFlexPayMetadataUpdate)({
        channel: checked.channel,
        amountCustomer: checked.amountCustomer,
        providerReference: checked.providerReference,
    });
}
function mergeMetadata(...parts) {
    return Object.assign({}, ...parts.filter((p) => Object.keys(p).length > 0));
}
async function confirmFlexPaySuccess(orderNumber, parsedSuccess) {
    let success = parsedSuccess;
    let checkMeta = {};
    if (orderNumber) {
        try {
            const checked = await (0, flexPayCardService_1.checkFlexPayCardOrder)(orderNumber);
            checkMeta = metadataFromCheck(checked);
            if (checked.found)
                success = checked.status === 'success';
        }
        catch (err) {
            console.warn('[FlexPay] check échoué:', err);
        }
    }
    return { success, checkMeta };
}
/** Callback serveur FlexPay — POST/GET /api/public/payments/flexpay/callback */
async function flexPayCardCallback(req, res) {
    try {
        const parsed = (0, flexPayCardService_1.parseFlexPayCallbackPayload)((req.body || {}), (req.query || {}));
        const callbackMeta = metadataFromCallback(parsed);
        // 1) Billet événement
        const order = await findTicketOrderForFlexPay({
            reference: parsed.reference || undefined,
            orderNumber: parsed.orderNumber || undefined,
        });
        if (order) {
            if (order.status === 'PAID') {
                const meta = mergeMetadata(callbackMeta);
                if (Object.keys(meta).length) {
                    await db_1.prisma.ticketOrder.update({ where: { id: order.id }, data: meta });
                }
                return res.json({ ok: true, alreadyPaid: true, kind: 'ticket', orderId: order.id });
            }
            const orderNumber = order.flexPayOrderNumber || parsed.orderNumber;
            const { success, checkMeta } = await confirmFlexPaySuccess(orderNumber, parsed.success);
            const meta = mergeMetadata(callbackMeta, checkMeta);
            if (!success) {
                await db_1.prisma.ticketOrder.update({
                    where: { id: order.id },
                    data: { status: 'CANCELLED', ...meta },
                });
                return res.json({ ok: true, paid: false, kind: 'ticket', orderId: order.id });
            }
            if (Object.keys(meta).length) {
                await db_1.prisma.ticketOrder.update({ where: { id: order.id }, data: meta });
            }
            await (0, ticketOrderService_1.fulfillTicketOrder)(order.id, {
                id: orderNumber || order.id,
                payment_intent: orderNumber || null,
            });
            return res.json({ ok: true, paid: true, kind: 'ticket', orderId: order.id });
        }
        // 2) Forfait SaaS
        const sub = await findSubscriptionRequestForFlexPay({
            reference: parsed.reference || undefined,
            orderNumber: parsed.orderNumber || undefined,
        });
        if (sub) {
            if (sub.status === 'APPROVED') {
                const meta = mergeMetadata(callbackMeta);
                if (Object.keys(meta).length) {
                    await db_1.prisma.subscriptionRequest.update({ where: { id: sub.id }, data: meta });
                }
                return res.json({ ok: true, alreadyPaid: true, kind: 'subscription', requestId: sub.id });
            }
            const orderNumber = sub.flexPayOrderNumber || parsed.orderNumber;
            const { success, checkMeta } = await confirmFlexPaySuccess(orderNumber, parsed.success);
            const meta = mergeMetadata(callbackMeta, checkMeta);
            if (!success) {
                await db_1.prisma.subscriptionRequest.update({
                    where: { id: sub.id },
                    data: { status: 'REJECTED', ...meta },
                });
                return res.json({ ok: true, paid: false, kind: 'subscription', requestId: sub.id });
            }
            if (Object.keys(meta).length) {
                await db_1.prisma.subscriptionRequest.update({ where: { id: sub.id }, data: meta });
            }
            await (0, subscriptionActivationService_1.activateSubscriptionRequest)(sub.id, {
                approvedAmount: sub.approvedAmount ?? undefined,
                markPaid: true,
            });
            return res.json({ ok: true, paid: true, kind: 'subscription', requestId: sub.id });
        }
        console.warn('[FlexPay] callback sans commande / demande', parsed);
        // 3) Pay Out commissions
        const payout = await (0, commercialFlexPayPayoutService_1.finalizeCommercialFlexPayPayout)({
            reference: parsed.reference || null,
            orderNumber: parsed.orderNumber || null,
            success: parsed.success,
            channel: parsed.channel,
            providerReference: parsed.providerReference,
            amountCustomer: parsed.amountCustomer,
        });
        if (payout.handled) {
            return res.json({
                ok: true,
                kind: 'payout',
                paid: Boolean(payout.paid),
                transferId: payout.transferId,
                alreadyPaid: Boolean(payout.alreadyPaid),
            });
        }
        // Si succès callback sans match : tenter check via orderNumber pour payout
        if (parsed.orderNumber) {
            try {
                const checked = await (0, flexPayCardService_1.checkFlexPayCardOrder)(parsed.orderNumber);
                const payout2 = await (0, commercialFlexPayPayoutService_1.finalizeCommercialFlexPayPayout)({
                    reference: parsed.reference || checked.reference,
                    orderNumber: parsed.orderNumber,
                    success: checked.status === 'success' || parsed.success,
                    channel: checked.channel || parsed.channel,
                    providerReference: checked.providerReference || parsed.providerReference,
                    amountCustomer: checked.amountCustomer ?? parsed.amountCustomer,
                });
                if (payout2.handled) {
                    return res.json({
                        ok: true,
                        kind: 'payout',
                        paid: Boolean(payout2.paid),
                        transferId: payout2.transferId,
                    });
                }
            }
            catch {
                /* ignore */
            }
        }
        return res.status(404).json({ error: 'Commande, demande ou versement introuvable.' });
    }
    catch (error) {
        console.error('[FlexPay] callback', error);
        return res.status(500).json({ error: error?.message || 'Callback FlexPay impossible.' });
    }
}
/** Retour navigateur — GET /api/public/payments/flexpay/return */
async function flexPayCardReturn(req, res) {
    const FRONTEND_URL = frontendBaseUrl();
    try {
        const kind = String(req.query.kind || 'ticket');
        const result = String(req.query.result || 'approve');
        if (kind === 'subscription') {
            const requestId = String(req.query.requestId || '');
            if (result === 'cancel' || result === 'decline') {
                return res.redirect(`${FRONTEND_URL}/dashboard/billing?flexpay=canceled`);
            }
            const sub = await db_1.prisma.subscriptionRequest.findUnique({ where: { id: requestId } });
            if (!sub) {
                return res.redirect(`${FRONTEND_URL}/dashboard/billing?flexpay=error`);
            }
            if (sub.status !== 'APPROVED' && sub.flexPayOrderNumber) {
                try {
                    const checked = await (0, flexPayCardService_1.checkFlexPayCardOrder)(sub.flexPayOrderNumber);
                    const meta = metadataFromCheck(checked);
                    if (Object.keys(meta).length) {
                        await db_1.prisma.subscriptionRequest.update({ where: { id: sub.id }, data: meta });
                    }
                    if (checked.status === 'success') {
                        await (0, subscriptionActivationService_1.activateSubscriptionRequest)(sub.id, {
                            approvedAmount: sub.approvedAmount ?? undefined,
                            markPaid: true,
                        });
                    }
                }
                catch (err) {
                    console.warn('[FlexPay] verify subscription on return:', err);
                }
            }
            return res.redirect(`${FRONTEND_URL}/dashboard/billing?flexpay=return&requestId=${encodeURIComponent(requestId)}`);
        }
        const orderId = String(req.query.orderId || '');
        const order = await db_1.prisma.ticketOrder.findUnique({
            where: { id: orderId },
            include: { event: { select: { slug: true } } },
        });
        if (!order?.event?.slug) {
            return res.redirect(`${FRONTEND_URL}/marketplace/evenements`);
        }
        const slug = order.event.slug;
        if (result === 'cancel') {
            return res.redirect(`${FRONTEND_URL}/marketplace/evenements/${slug}?canceled=1`);
        }
        if (result === 'decline') {
            return res.redirect(`${FRONTEND_URL}/marketplace/evenements/${slug}?declined=1`);
        }
        if (order.status !== 'PAID' && order.flexPayOrderNumber) {
            try {
                const checked = await (0, flexPayCardService_1.checkFlexPayCardOrder)(order.flexPayOrderNumber);
                const meta = metadataFromCheck(checked);
                if (Object.keys(meta).length) {
                    await db_1.prisma.ticketOrder.update({ where: { id: order.id }, data: meta });
                }
                if (checked.status === 'success') {
                    await (0, ticketOrderService_1.fulfillTicketOrder)(order.id, {
                        id: order.flexPayOrderNumber,
                        payment_intent: order.flexPayOrderNumber,
                    });
                }
            }
            catch (err) {
                console.warn('[FlexPay] verify on return:', err);
            }
        }
        return res.redirect(`${FRONTEND_URL}/marketplace/evenements/${slug}/succes?order=${order.id}&provider=flexpay&method=card&pending=1`);
    }
    catch (error) {
        console.error('[FlexPay] return', error);
        return res.redirect(`${FRONTEND_URL}/marketplace/evenements`);
    }
}
/** Vérifie une commande billet — GET /api/public/payments/flexpay/orders/:orderId/verify */
async function verifyFlexPayCardOrder(req, res) {
    try {
        const orderId = String(req.params.orderId || '');
        const FRONTEND_URL = frontendBaseUrl();
        const order = await db_1.prisma.ticketOrder.findUnique({
            where: { id: orderId },
            include: {
                event: { select: { title: true, slug: true, date: true, location: true } },
                guests: { select: { id: true, email: true, firstName: true } },
            },
        });
        if (!order)
            return res.status(404).json({ error: 'Commande introuvable.' });
        if (order.status === 'PAID' && order.guests.length > 0) {
            const primary = order.guests[0];
            return res.json({
                paid: true,
                orderId: order.id,
                quantity: order.quantity,
                guestId: primary?.id,
                rsvpUrl: primary ? `${FRONTEND_URL}/rsvp/${primary.id}` : null,
                guests: order.guests.map((g) => ({
                    id: g.id,
                    firstName: g.firstName,
                    email: g.email,
                    rsvpUrl: `${FRONTEND_URL}/rsvp/${g.id}`,
                })),
                event: order.event,
                channel: order.flexPayChannel,
            });
        }
        if (!order.flexPayOrderNumber) {
            return res.json({
                paid: false,
                status: order.status === 'CANCELLED' ? 'failed' : 'pending',
                orderId: order.id,
                event: order.event,
                canRetry: true,
                message: 'Aucun paiement FlexPay associé. Relancez une tentative.',
            });
        }
        const checked = await (0, flexPayCardService_1.checkFlexPayCardOrder)(order.flexPayOrderNumber);
        const meta = metadataFromCheck(checked);
        if (Object.keys(meta).length) {
            await db_1.prisma.ticketOrder.update({ where: { id: order.id }, data: meta });
        }
        if (checked.status === 'failed') {
            await db_1.prisma.ticketOrder.update({
                where: { id: order.id },
                data: { status: 'CANCELLED', ...meta },
            });
            return res.json({
                paid: false,
                status: 'failed',
                orderId: order.id,
                event: order.event,
                channel: checked.channel || order.flexPayChannel,
                canRetry: true,
            });
        }
        if (checked.status !== 'success') {
            return res.json({
                paid: false,
                status: checked.status === 'pending' ? 'pending' : checked.status,
                orderId: order.id,
                event: order.event,
                channel: checked.channel || order.flexPayChannel,
            });
        }
        const fulfilled = await (0, ticketOrderService_1.fulfillTicketOrder)(order.id, {
            id: order.flexPayOrderNumber,
            payment_intent: order.flexPayOrderNumber,
        });
        const primary = fulfilled?.guests?.find((g) => g.email.toLowerCase() === order.buyerEmail.toLowerCase()) ||
            fulfilled?.guests?.[0];
        return res.json({
            paid: true,
            orderId: order.id,
            quantity: order.quantity,
            guestId: primary?.id,
            rsvpUrl: primary ? `${FRONTEND_URL}/rsvp/${primary.id}` : null,
            guests: (fulfilled?.guests || []).map((g) => ({
                id: g.id,
                firstName: g.firstName,
                email: g.email,
                rsvpUrl: `${FRONTEND_URL}/rsvp/${g.id}`,
            })),
            event: order.event,
            channel: checked.channel || order.flexPayChannel,
        });
    }
    catch (error) {
        console.error('[FlexPay] verify', error);
        return res.status(500).json({ error: error?.message || 'Vérification impossible.' });
    }
}
/**
 * Relance un paiement FlexPay pour une commande billet PENDING/CANCELLED.
 * POST /api/public/payments/flexpay/orders/:orderId/retry
 * body: { paymentMethod?: 'card'|'mobile', phone? }
 */
async function retryFlexPayTicketOrder(req, res) {
    try {
        if (!(0, platformSettingsService_1.isOnlinePaymentsEnabled)()) {
            return res.status(503).json({ error: 'Les paiements en ligne sont temporairement désactivés.' });
        }
        if (!(0, flexPayCardService_1.isFlexPayCardConfigured)()) {
            return res.status(503).json({ error: 'Paiements FlexPay non configurés.' });
        }
        const orderId = String(req.params.orderId || '');
        const order = await db_1.prisma.ticketOrder.findUnique({
            where: { id: orderId },
            include: { event: { select: { id: true, slug: true, title: true } } },
        });
        if (!order)
            return res.status(404).json({ error: 'Commande introuvable.' });
        if (order.status === 'PAID') {
            return res.status(400).json({ error: 'Cette commande est déjà payée.', paid: true });
        }
        if (order.amountFc <= 0) {
            return res.status(400).json({ error: 'Commande gratuite — pas de paiement à relancer.' });
        }
        const rawMethod = String(req.body?.paymentMethod || '').toLowerCase();
        const fallback = order.paymentProvider === 'flexpay_mobile' ? 'mobile' : 'card';
        const method = rawMethod === 'mobile' || rawMethod === 'card' ? rawMethod : fallback;
        const phone = (typeof req.body?.phone === 'string' && req.body.phone.trim()) || order.buyerPhone || '';
        if (method === 'mobile' && !phone) {
            return res.status(400).json({ error: 'Numéro Mobile Money requis (243…).' });
        }
        // Libère l’ancien orderNumber unique avant une nouvelle session
        await db_1.prisma.ticketOrder.update({
            where: { id: order.id },
            data: {
                status: 'PENDING',
                flexPayOrderNumber: null,
                flexPayChannel: null,
                flexPayAmountCustomer: null,
                flexPayProviderReference: null,
                paymentProvider: method === 'mobile' ? 'flexpay_mobile' : 'flexpay_card',
                flexPayReference: order.id,
            },
        });
        const apiBase = (0, flexPayCardService_1.getPublicApiBaseUrl)();
        const callbackUrl = `${apiBase}/api/public/payments/flexpay/callback`;
        try {
            if (method === 'mobile') {
                const flex = await (0, flexPayCardService_1.createFlexPayMobileCheckout)({
                    reference: order.id,
                    amount: order.amountFc,
                    currency: 'CDF',
                    phone,
                    callbackUrl,
                });
                await db_1.prisma.ticketOrder.update({
                    where: { id: order.id },
                    data: { flexPayOrderNumber: flex.orderNumber },
                });
                return res.json({
                    paid: false,
                    retried: true,
                    provider: 'flexpay_mobile',
                    orderId: order.id,
                    orderNumber: flex.orderNumber,
                    message: 'Nouvelle demande envoyée sur votre téléphone. Confirmez le paiement Mobile Money.',
                });
            }
            const flex = await (0, flexPayCardService_1.createFlexPayCardCheckout)({
                reference: order.id,
                amount: order.amountFc,
                currency: 'CDF',
                description: `Billet — ${order.event.title}`.slice(0, 200),
                callbackUrl,
                approveUrl: `${apiBase}/api/public/payments/flexpay/return?kind=ticket&orderId=${order.id}&result=approve`,
                cancelUrl: `${apiBase}/api/public/payments/flexpay/return?kind=ticket&orderId=${order.id}&result=cancel`,
                declineUrl: `${apiBase}/api/public/payments/flexpay/return?kind=ticket&orderId=${order.id}&result=decline`,
                language: 'fr',
            });
            await db_1.prisma.ticketOrder.update({
                where: { id: order.id },
                data: { flexPayOrderNumber: flex.orderNumber },
            });
            return res.json({
                paid: false,
                retried: true,
                provider: 'flexpay_card',
                orderId: order.id,
                orderNumber: flex.orderNumber,
                checkoutUrl: flex.redirectUrl,
                message: 'Nouvelle session carte FlexPay ouverte.',
            });
        }
        catch (err) {
            await db_1.prisma.ticketOrder.update({
                where: { id: order.id },
                data: { status: 'CANCELLED' },
            });
            return res.status(502).json({
                error: err?.message || 'Impossible de relancer le paiement FlexPay.',
            });
        }
    }
    catch (error) {
        console.error('[FlexPay] retry ticket', error);
        return res.status(500).json({ error: error?.message || 'Relance impossible.' });
    }
}
