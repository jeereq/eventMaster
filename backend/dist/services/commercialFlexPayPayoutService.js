"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initiateCommercialFlexPayPayout = initiateCommercialFlexPayPayout;
exports.finalizeCommercialFlexPayPayout = finalizeCommercialFlexPayPayout;
exports.verifyCommercialFlexPayPayout = verifyCommercialFlexPayPayout;
const crypto_1 = require("crypto");
const db_1 = require("../db");
const flexPayCardService_1 = require("./flexPayCardService");
const commercialPayoutService_1 = require("./commercialPayoutService");
function buildPayoutReference(kind, commercialId, period) {
    // FlexPay reference: unique, alphanumeric-friendly
    const short = (0, crypto_1.randomUUID)().replace(/-/g, '').slice(0, 12);
    return `cp${kind === 'platform' ? 'p' : 'o'}${short}`;
}
async function resolveUnpaidAmount(params) {
    if (params.kind === 'platform') {
        const rows = await (0, commercialPayoutService_1.listMonthlyPayouts)(params.period);
        const row = rows.find((r) => r.commercialId === params.commercialId);
        return Math.round(row?.unpaidCommission || 0);
    }
    if (!params.tenantId)
        return 0;
    const result = await (0, commercialPayoutService_1.listOrgSaaSPayouts)({
        payerTenantId: params.tenantId,
        period: params.period,
        settlement: 'due',
        page: 1,
        pageSize: 500,
    });
    const row = result.items.find((r) => r.commercialId === params.commercialId);
    return Math.round(row?.unpaidCommission || 0);
}
/**
 * Initie un Pay Out FlexPay vers le Mobile Money du commercial.
 * Ne marque pas paid tant que le callback / check n’a pas réussi.
 */
async function initiateCommercialFlexPayPayout(params) {
    (0, flexPayCardService_1.assertFlexPayConfigured)();
    const commercial = await db_1.prisma.user.findUnique({
        where: { id: params.commercialId },
        select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
            orgRole: true,
            tenantId: true,
        },
    });
    if (!commercial) {
        return { error: 'NOT_FOUND' };
    }
    if (params.kind === 'platform' && !(0, commercialPayoutService_1.isPlatformCommercialAccount)(commercial)) {
        return { error: 'NOT_PLATFORM' };
    }
    if (params.kind === 'org') {
        if (!params.tenantId)
            return { error: 'TENANT_REQUIRED' };
        if (!(0, commercialPayoutService_1.isOrgCommercialAccount)(commercial) || commercial.tenantId !== params.tenantId) {
            return { error: 'NOT_ORG' };
        }
    }
    const existingPending = await db_1.prisma.commercialPayoutTransfer.findFirst({
        where: {
            kind: params.kind,
            commercialId: params.commercialId,
            billingPeriod: params.period,
            status: 'PENDING',
            ...(params.kind === 'org' ? { tenantId: params.tenantId } : {}),
        },
    });
    if (existingPending) {
        return {
            error: 'ALREADY_PENDING',
            transfer: existingPending,
        };
    }
    const amountFc = await resolveUnpaidAmount({
        kind: params.kind,
        commercialId: params.commercialId,
        period: params.period,
        tenantId: params.tenantId,
    });
    if (amountFc <= 0) {
        return { error: 'NOTHING_DUE' };
    }
    const phoneRaw = params.phone?.trim() || commercial.phone || '';
    const phone = (0, flexPayCardService_1.normalizeFlexPayPhone)(phoneRaw);
    if (!phone) {
        return { error: 'PHONE_REQUIRED' };
    }
    const reference = buildPayoutReference(params.kind, params.commercialId, params.period);
    const transfer = await db_1.prisma.commercialPayoutTransfer.create({
        data: {
            kind: params.kind,
            commercialId: params.commercialId,
            tenantId: params.kind === 'org' ? params.tenantId : null,
            billingPeriod: params.period,
            amountFc,
            phone,
            status: 'PENDING',
            flexPayReference: reference,
            initiatedByUserId: params.initiatedByUserId,
        },
    });
    const callbackUrl = `${(0, flexPayCardService_1.getPublicApiBaseUrl)()}/api/public/payments/flexpay/callback`;
    try {
        const flex = await (0, flexPayCardService_1.createFlexPayMobilePayout)({
            reference,
            amount: amountFc,
            currency: 'CDF',
            phone,
            callbackUrl,
        });
        const updated = await db_1.prisma.commercialPayoutTransfer.update({
            where: { id: transfer.id },
            data: { flexPayOrderNumber: flex.orderNumber },
        });
        return {
            transfer: updated,
            message: `Versement FlexPay initié (${(0, commercialPayoutService_1.formatBillingPeriodLabel)(params.period)} · ${amountFc.toLocaleString('fr-FR')} FC). Confirmez sur le téléphone du commercial.`,
        };
    }
    catch (err) {
        await db_1.prisma.commercialPayoutTransfer.update({
            where: { id: transfer.id },
            data: { status: 'FAILED' },
        });
        throw err;
    }
}
async function finalizeCommercialFlexPayPayout(opts) {
    let transfer = null;
    if (opts.orderNumber) {
        transfer = await db_1.prisma.commercialPayoutTransfer.findFirst({
            where: { flexPayOrderNumber: opts.orderNumber },
        });
    }
    if (!transfer && opts.reference) {
        transfer = await db_1.prisma.commercialPayoutTransfer.findFirst({
            where: { flexPayReference: opts.reference },
        });
    }
    if (!transfer)
        return { handled: false };
    if (transfer.status === 'SUCCESS') {
        return { handled: true, alreadyPaid: true, transferId: transfer.id };
    }
    const meta = (0, flexPayCardService_1.buildFlexPayMetadataUpdate)({
        channel: opts.channel,
        amountCustomer: opts.amountCustomer,
        providerReference: opts.providerReference,
    });
    if (!opts.success) {
        await db_1.prisma.commercialPayoutTransfer.update({
            where: { id: transfer.id },
            data: {
                status: 'FAILED',
                flexPayChannel: meta.flexPayChannel,
                flexPayProviderReference: meta.flexPayProviderReference,
            },
        });
        return { handled: true, paid: false, transferId: transfer.id };
    }
    const proofUrl = `flexpay:${transfer.flexPayOrderNumber || transfer.flexPayReference}`;
    const note = [
        'Versement FlexPay Pay Out',
        meta.flexPayChannel ? `canal ${meta.flexPayChannel}` : null,
        meta.flexPayProviderReference ? `réf. ${meta.flexPayProviderReference}` : null,
    ]
        .filter(Boolean)
        .join(' · ');
    if (transfer.kind === 'platform') {
        await (0, commercialPayoutService_1.markCommercialPeriodPaid)({
            commercialId: transfer.commercialId,
            period: transfer.billingPeriod,
            paidByUserId: transfer.initiatedByUserId,
            proofUrl,
            note,
        });
    }
    else {
        if (!transfer.tenantId) {
            await db_1.prisma.commercialPayoutTransfer.update({
                where: { id: transfer.id },
                data: { status: 'FAILED' },
            });
            return { handled: true, paid: false, transferId: transfer.id, error: 'NO_TENANT' };
        }
        await (0, commercialPayoutService_1.markOrgPeriodPaid)({
            payerTenantId: transfer.tenantId,
            commercialId: transfer.commercialId,
            period: transfer.billingPeriod,
            paidByUserId: transfer.initiatedByUserId,
            proofUrl,
            note,
        });
    }
    await db_1.prisma.commercialPayoutTransfer.update({
        where: { id: transfer.id },
        data: {
            status: 'SUCCESS',
            flexPayChannel: meta.flexPayChannel,
            flexPayProviderReference: meta.flexPayProviderReference,
        },
    });
    return { handled: true, paid: true, transferId: transfer.id };
}
/** Vérifie un payout PENDING via l’API check FlexPay. */
async function verifyCommercialFlexPayPayout(transferId) {
    const transfer = await db_1.prisma.commercialPayoutTransfer.findUnique({ where: { id: transferId } });
    if (!transfer)
        return { error: 'NOT_FOUND' };
    if (transfer.status === 'SUCCESS') {
        return { paid: true, status: 'SUCCESS', transfer };
    }
    if (!transfer.flexPayOrderNumber) {
        return { paid: false, status: transfer.status, transfer, canRetry: true };
    }
    const checked = await (0, flexPayCardService_1.checkFlexPayCardOrder)(transfer.flexPayOrderNumber);
    if (checked.status === 'success') {
        const result = await finalizeCommercialFlexPayPayout({
            reference: transfer.flexPayReference,
            orderNumber: transfer.flexPayOrderNumber,
            success: true,
            channel: checked.channel,
            providerReference: checked.providerReference,
            amountCustomer: checked.amountCustomer,
        });
        return { paid: Boolean(result.paid), status: 'SUCCESS', transferId: transfer.id };
    }
    if (checked.status === 'failed') {
        await finalizeCommercialFlexPayPayout({
            reference: transfer.flexPayReference,
            orderNumber: transfer.flexPayOrderNumber,
            success: false,
            channel: checked.channel,
            providerReference: checked.providerReference,
        });
        return { paid: false, status: 'FAILED', canRetry: true, transferId: transfer.id };
    }
    return {
        paid: false,
        status: 'PENDING',
        transfer,
        channel: checked.channel,
    };
}
