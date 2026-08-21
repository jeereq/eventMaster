"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MARKETPLACE_DEPOSIT_RATE = exports.MARKETPLACE_COMMISSION_RATE = void 0;
exports.getMarketplaceBillingRates = getMarketplaceBillingRates;
exports.computeMarketplaceAmounts = computeMarketplaceAmounts;
exports.billedMarketplaceAmount = billedMarketplaceAmount;
const platformSettingsService_1 = require("../services/platformSettingsService");
const ratePercent_1 = require("../utils/ratePercent");
/** Défauts si les réglages plateforme n’ont pas encore été enregistrés. */
exports.MARKETPLACE_COMMISSION_RATE = 0.08;
exports.MARKETPLACE_DEPOSIT_RATE = 0.3;
function getMarketplaceBillingRates(settings = (0, platformSettingsService_1.loadPlatformSettings)()) {
    return {
        commissionRate: (0, ratePercent_1.parseRateInput)(settings.marketplaceCommissionRate, exports.MARKETPLACE_COMMISSION_RATE, 0.01, 0.5),
        depositRate: (0, ratePercent_1.parseRateInput)(settings.marketplaceDepositRate, exports.MARKETPLACE_DEPOSIT_RATE, 0.05, 0.9),
    };
}
function computeMarketplaceAmounts(amountFc, rates = getMarketplaceBillingRates()) {
    const amount = Math.max(0, Math.round(amountFc));
    const depositFc = Math.round(amount * rates.depositRate);
    const commissionFc = Math.round(amount * rates.commissionRate);
    return {
        amountFc: amount,
        depositFc,
        commissionFc,
        commissionRate: rates.commissionRate,
    };
}
/** Tarif « par jour » × nombre de jours ; les autres unités restent un forfait pour la plage. */
function billedMarketplaceAmount(priceFromFc, priceUnit, dayCount) {
    const days = Math.max(1, dayCount);
    const base = priceUnit === 'DAY' ? priceFromFc * days : priceFromFc;
    return computeMarketplaceAmounts(base);
}
