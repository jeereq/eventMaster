"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processMonthlyCommissionPayouts = processMonthlyCommissionPayouts;
exports.startCommercialPayoutWorker = startCommercialPayoutWorker;
const commercialPayoutService_1 = require("./commercialPayoutService");
async function processMonthlyCommissionPayouts() {
    if (!(0, commercialPayoutService_1.shouldAutoNotifyMonthlyPayouts)())
        return;
    const period = (0, commercialPayoutService_1.previousBillingPeriod)();
    try {
        const result = await (0, commercialPayoutService_1.notifyMonthlyCommissionPayouts)({ period, force: false });
        if (result.commercialsNotified > 0 || result.adminsNotified.length > 0) {
            console.log(`[Commission Payout] Récap ${result.period} envoyé — commerciaux : ${result.commercialsNotified}, super admins : ${result.adminsNotified.length}, dû : ${result.unpaidCommission} FC`);
        }
    }
    catch (error) {
        console.error('[Commission Payout] Erreur:', error);
    }
}
function startCommercialPayoutWorker() {
    console.log('[Commission Payout] Initialisation du worker mensuel...');
    setTimeout(() => {
        void processMonthlyCommissionPayouts();
    }, 20000);
    setInterval(() => {
        void processMonthlyCommissionPayouts();
    }, 12 * 60 * 60 * 1000);
}
