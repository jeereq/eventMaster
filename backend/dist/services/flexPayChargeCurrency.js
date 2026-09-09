"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveUsdExchangeRateCdf = resolveUsdExchangeRateCdf;
exports.parseFlexPayChargeCurrency = parseFlexPayChargeCurrency;
exports.convertFcToUsd = convertFcToUsd;
exports.formatFlexPayApiAmount = formatFlexPayApiAmount;
exports.resolveFlexPayCharge = resolveFlexPayCharge;
function resolveUsdExchangeRateCdf(value, fallback = 2800) {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : fallback;
}
/** Carte = toujours FC. Mobile Money accepte FC ou USD. */
function parseFlexPayChargeCurrency(raw, method = 'mobile') {
    if (method !== 'mobile')
        return 'CDF';
    const value = String(raw ?? '')
        .trim()
        .toUpperCase()
        .replace(/\s+/g, '');
    if (value === 'USD' || value === 'DOLLAR' || value === 'DOLLARS' || value === '$')
        return 'USD';
    return 'CDF';
}
function convertFcToUsd(amountFc, rate) {
    if (!(amountFc > 0) || !(rate > 0))
        return 0;
    return Math.round((amountFc / rate) * 100) / 100;
}
function formatFlexPayApiAmount(amount, currency) {
    if (currency === 'USD') {
        const usd = Math.round(amount * 100) / 100;
        if (usd < 0.01) {
            throw new Error('Ce montant est trop faible pour un paiement en dollars. Choisissez les francs.');
        }
        return usd.toFixed(2);
    }
    return String(Math.max(1, Math.round(amount)));
}
function resolveFlexPayCharge(amountFc, currency, usdExchangeRateCdf) {
    const rate = resolveUsdExchangeRateCdf(usdExchangeRateCdf);
    if (currency === 'USD') {
        const amount = convertFcToUsd(amountFc, rate);
        if (amount < 0.01) {
            throw new Error('Ce montant est trop faible pour un paiement en dollars. Choisissez les francs.');
        }
        return { currency: 'USD', amount, rate };
    }
    return { currency: 'CDF', amount: Math.max(1, Math.round(amountFc)), rate };
}
