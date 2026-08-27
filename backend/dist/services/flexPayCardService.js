"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapFlexPayTransactionStatus = mapFlexPayTransactionStatus;
exports.buildFlexPayMetadataUpdate = buildFlexPayMetadataUpdate;
exports.normalizeFlexPayPhone = normalizeFlexPayPhone;
exports.getFlexPayCardConfig = getFlexPayCardConfig;
exports.isFlexPayCardConfigured = isFlexPayCardConfigured;
exports.isFlexPayCardMock = isFlexPayCardMock;
exports.assertFlexPayConfigured = assertFlexPayConfigured;
exports.resolveTicketCheckoutProvider = resolveTicketCheckoutProvider;
exports.createFlexPayCardCheckout = createFlexPayCardCheckout;
exports.createFlexPayMobileCheckout = createFlexPayMobileCheckout;
exports.createFlexPayMobilePayout = createFlexPayMobilePayout;
exports.checkFlexPayCardOrder = checkFlexPayCardOrder;
exports.parseFlexPayCallbackPayload = parseFlexPayCallbackPayload;
exports.getPublicApiBaseUrl = getPublicApiBaseUrl;
const platformSettingsService_1 = require("./platformSettingsService");
function parseOptionalNumber(value) {
    if (value === undefined || value === null || value === '')
        return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
}
function normalizeFlexPayChannel(value) {
    const raw = String(value ?? '').trim().toLowerCase();
    return raw || null;
}
function extractProviderReference(src) {
    const v = src.provider_reference ??
        src.providerReference ??
        src.ProviderReference ??
        src.providerRef;
    const s = String(v ?? '').trim();
    return s || null;
}
/** Mappe les codes status check FlexPay (doc API Paiement v1.5). */
function mapFlexPayTransactionStatus(statusCode) {
    switch (String(statusCode ?? '').trim()) {
        case '0':
            return 'success';
        case '1':
        case '4':
        case '5':
            return 'failed';
        case '2':
        case '3':
            return 'pending';
        default:
            return 'unknown';
    }
}
function buildFlexPayMetadataUpdate(source) {
    const data = {};
    if (source.channel)
        data.flexPayChannel = source.channel;
    if (source.amountCustomer != null && Number.isFinite(source.amountCustomer)) {
        data.flexPayAmountCustomer = source.amountCustomer;
    }
    if (source.providerReference)
        data.flexPayProviderReference = source.providerReference;
    return data;
}
function envOrSetting(envKey, settingValue) {
    const fromEnv = process.env[envKey]?.trim();
    if (fromEnv)
        return fromEnv;
    return (settingValue || '').trim();
}
function authHeader(token) {
    const t = token.trim();
    return t.startsWith('Bearer ') ? t : `Bearer ${t}`;
}
/** Normalise un numéro RDC vers 243XXXXXXXXX. */
function normalizeFlexPayPhone(input) {
    const digits = String(input || '').replace(/\D/g, '');
    if (!digits)
        return null;
    let phone = digits;
    if (phone.startsWith('00'))
        phone = phone.slice(2);
    if (phone.startsWith('0') && phone.length === 10)
        phone = `243${phone.slice(1)}`;
    if (phone.length === 9 && /^[89]/.test(phone))
        phone = `243${phone}`;
    if (!phone.startsWith('243') || phone.length < 12 || phone.length > 13)
        return null;
    return phone;
}
function getFlexPayCardConfig() {
    const settings = (0, platformSettingsService_1.loadPlatformSettings)();
    const token = (envOrSetting('FLEXPAY_CARD_TOKEN', settings.flexPayCardToken) ||
        envOrSetting('FLEXPAY_TOKEN', '')).trim();
    const merchant = (envOrSetting('FLEXPAY_CARD_MERCHANT', settings.flexPayCardMerchant) ||
        envOrSetting('FLEXPAY_MERCHANT', '')).trim();
    const payUrl = envOrSetting('FLEXPAY_CARD_PAY_URL', settings.flexPayCardPayUrl);
    const checkUrlBase = envOrSetting('FLEXPAY_CARD_CHECK_URL', settings.flexPayCardCheckUrl);
    const mobilePayUrl = envOrSetting('FLEXPAY_MOBILE_PAY_URL', settings.flexPayMobilePayUrl);
    const mobileCheckUrl = envOrSetting('FLEXPAY_MOBILE_CHECK_URL', settings.flexPayMobileCheckUrl);
    const payoutUrl = envOrSetting('FLEXPAY_PAYOUT_URL', '');
    return {
        token,
        merchant,
        payUrl: payUrl || 'https://cardpayment.flexpay.cd/v1.1/pay',
        checkUrlBase: checkUrlBase || 'https://cardpayment.flexpay.cd/api/rest/v1/check',
        mobilePayUrl: mobilePayUrl || 'https://backend.flexpay.cd/api/rest/v1/paymentService',
        mobileCheckUrlBase: mobileCheckUrl || 'https://backend.flexpay.cd/api/rest/v1/check',
        payoutUrl: payoutUrl || 'https://backend.flexpay.cd/api/rest/v1/merchantPayOutService',
    };
}
function isFlexPayCardConfigured() {
    const { token, merchant } = getFlexPayCardConfig();
    if (!token || !merchant)
        return false;
    const bare = token.replace(/^Bearer\s+/i, '').trim().toLowerCase();
    return bare.length > 0 && !bare.includes('mock');
}
/** @deprecated Ne plus utiliser pour court-circuiter un paiement — préférer isFlexPayCardConfigured(). */
function isFlexPayCardMock() {
    return !isFlexPayCardConfigured();
}
function assertFlexPayConfigured() {
    if (!isFlexPayCardConfigured()) {
        throw new Error('Paiements FlexPay non configurés (token / merchant manquants).');
    }
}
/** Billets : uniquement FlexPay (plus de Stripe). */
function resolveTicketCheckoutProvider() {
    return 'flexpay_card';
}
/**
 * Crée une session de paiement carte FlexPay (Visa / Mastercard).
 * Doc : POST /v1.1/pay (JSON) → { code: "0", orderNumber, url }
 */
async function createFlexPayCardCheckout(input) {
    assertFlexPayConfigured();
    const cfg = getFlexPayCardConfig();
    const body = {
        authorization: authHeader(cfg.token),
        merchant: cfg.merchant,
        reference: input.reference,
        amount: String(Math.max(1, Math.round(input.amount))),
        currency: input.currency || 'CDF',
        language: (input.language || 'fr').toUpperCase(),
        description: input.description.slice(0, 200),
        callback_url: input.callbackUrl,
        approve_url: input.approveUrl,
        cancel_url: input.cancelUrl,
        decline_url: input.declineUrl,
    };
    const res = await fetch(cfg.payUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Authorization: authHeader(cfg.token),
        },
        body: JSON.stringify(body),
    });
    const raw = (await res.json().catch(() => ({})));
    const code = String(raw.code ?? '');
    if (!res.ok || code !== '0') {
        throw new Error(String(raw.message || `FlexPay a refusé le paiement (HTTP ${res.status}).`));
    }
    const orderNumber = String(raw.orderNumber || '');
    const redirectUrl = String(raw.url || '');
    if (!orderNumber || !redirectUrl) {
        throw new Error('Réponse FlexPay incomplète (orderNumber / url manquants).');
    }
    return { orderNumber, redirectUrl, raw };
}
/**
 * Déclenche un paiement Mobile Money FlexPay (Airtel / Orange / M-Pesa / Afrimoney).
 * Doc : POST …/paymentService → { code: "0", orderNumber, message }
 */
async function createFlexPayMobileCheckout(input) {
    assertFlexPayConfigured();
    const cfg = getFlexPayCardConfig();
    const phone = normalizeFlexPayPhone(input.phone);
    if (!phone) {
        throw new Error('Numéro Mobile Money invalide. Utilisez le format 243XXXXXXXXX.');
    }
    const body = {
        merchant: cfg.merchant,
        type: '1',
        phone,
        reference: input.reference,
        amount: String(Math.max(1, Math.round(input.amount))),
        currency: input.currency || 'CDF',
        callbackUrl: input.callbackUrl,
    };
    const res = await fetch(cfg.mobilePayUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Authorization: authHeader(cfg.token),
        },
        body: JSON.stringify(body),
    });
    const raw = (await res.json().catch(() => ({})));
    const code = String(raw.code ?? '');
    if (!res.ok || (code !== '0' && code !== '0.0')) {
        throw new Error(String(raw.message || `FlexPay Mobile Money a refusé le paiement (HTTP ${res.status}).`));
    }
    const orderNumber = String(raw.orderNumber || raw.order_number || '');
    if (!orderNumber) {
        throw new Error('Réponse FlexPay Mobile Money incomplète (orderNumber manquant).');
    }
    return { orderNumber, redirectUrl: null, raw };
}
/**
 * Décaissement marchand → Mobile Money (Pay Out).
 * Doc API Paiement v1.5 : POST …/merchantPayOutService
 */
async function createFlexPayMobilePayout(input) {
    assertFlexPayConfigured();
    const cfg = getFlexPayCardConfig();
    const phone = normalizeFlexPayPhone(input.phone);
    if (!phone) {
        throw new Error('Numéro Mobile Money invalide. Utilisez le format 243XXXXXXXXX.');
    }
    const body = {
        merchant: cfg.merchant,
        type: '1',
        phone,
        reference: input.reference,
        amount: String(Math.max(1, Math.round(input.amount))),
        currency: input.currency || 'CDF',
        callbackUrl: input.callbackUrl,
    };
    const res = await fetch(cfg.payoutUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Authorization: authHeader(cfg.token),
        },
        body: JSON.stringify(body),
    });
    const raw = (await res.json().catch(() => ({})));
    const code = String(raw.code ?? '');
    if (!res.ok || (code !== '0' && code !== '0.0')) {
        throw new Error(String(raw.message || `FlexPay Pay Out a refusé le versement (HTTP ${res.status}).`));
    }
    const orderNumber = String(raw.orderNumber || raw.order_number || '');
    if (!orderNumber) {
        throw new Error('Réponse FlexPay Pay Out incomplète (orderNumber manquant).');
    }
    return { orderNumber, redirectUrl: null, raw };
}
async function checkOrderAt(baseUrl, token, orderNumber) {
    const url = `${baseUrl.replace(/\/$/, '')}/${encodeURIComponent(orderNumber)}`;
    const res = await fetch(url, {
        method: 'GET',
        headers: {
            Accept: 'application/json',
            Authorization: authHeader(token),
        },
    });
    const raw = (await res.json().catch(() => ({})));
    const code = String(raw.code ?? '');
    if (code !== '0' || !raw.transaction || typeof raw.transaction !== 'object') {
        return {
            found: false,
            status: 'unknown',
            reference: null,
            orderNumber,
            amount: null,
            amountCustomer: null,
            currency: null,
            channel: null,
            providerReference: null,
            raw,
        };
    }
    const tx = raw.transaction;
    const statusCode = String(tx.status ?? '');
    return {
        found: true,
        status: mapFlexPayTransactionStatus(statusCode),
        reference: tx.reference != null ? String(tx.reference) : null,
        orderNumber: tx.orderNumber != null ? String(tx.orderNumber) : orderNumber,
        amount: parseOptionalNumber(tx.amount),
        amountCustomer: parseOptionalNumber(tx.amountCustomer),
        currency: tx.currency != null ? String(tx.currency) : null,
        channel: normalizeFlexPayChannel(tx.channel),
        providerReference: extractProviderReference(tx),
        raw,
    };
}
/** Vérifie une transaction FlexPay (essaie check Card puis Mobile). */
async function checkFlexPayCardOrder(orderNumber) {
    const cfg = getFlexPayCardConfig();
    if (!cfg.token)
        throw new Error('FlexPay non configuré.');
    const card = await checkOrderAt(cfg.checkUrlBase, cfg.token, orderNumber);
    if (card.found)
        return card;
    return checkOrderAt(cfg.mobileCheckUrlBase, cfg.token, orderNumber);
}
/** Interprète un callback FlexPay (API Paiement v1.5 + variantes Card). */
function parseFlexPayCallbackPayload(body, query) {
    const src = { ...query, ...body };
    const reference = String(src.reference || src.Reference || src.merchantReference || src.merchant_reference || '').trim();
    const orderNumber = String(src.orderNumber || src.order_number || src.OrderNumber || '').trim();
    const statusRaw = String(src.status || src.Status || src.code || '').trim();
    const success = statusRaw === '0' ||
        statusRaw.toLowerCase() === 'success' ||
        statusRaw.toLowerCase() === 'approved' ||
        String(src.transactionStatus || '').toLowerCase() === 'success';
    return {
        reference,
        orderNumber,
        success,
        statusRaw,
        channel: normalizeFlexPayChannel(src.channel),
        amountCustomer: parseOptionalNumber(src.amountCustomer ?? src.amount_customer),
        providerReference: extractProviderReference(src),
        raw: src,
    };
}
function getPublicApiBaseUrl() {
    return (process.env.API_PUBLIC_URL ||
        process.env.BACKEND_PUBLIC_URL ||
        process.env.BACKEND_URL ||
        `http://localhost:${process.env.PORT || 5001}`)
        .trim()
        .replace(/\/$/, '');
}
