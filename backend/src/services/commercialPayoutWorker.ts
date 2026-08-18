import {
  notifyMonthlyCommissionPayouts,
  previousBillingPeriod,
  shouldAutoNotifyMonthlyPayouts,
} from './commercialPayoutService';

export async function processMonthlyCommissionPayouts() {
  if (!shouldAutoNotifyMonthlyPayouts()) return;

  const period = previousBillingPeriod();
  try {
    const result = await notifyMonthlyCommissionPayouts({ period, force: false });
    if (result.commercialsNotified > 0 || result.adminsNotified.length > 0) {
      console.log(
        `[Commission Payout] Récap ${result.period} envoyé — commerciaux : ${result.commercialsNotified}, super admins : ${result.adminsNotified.length}, dû : ${result.unpaidCommission} FC`,
      );
    }
  } catch (error) {
    console.error('[Commission Payout] Erreur:', error);
  }
}

export function startCommercialPayoutWorker() {
  console.log('[Commission Payout] Initialisation du worker mensuel...');

  setTimeout(() => {
    void processMonthlyCommissionPayouts();
  }, 20000);

  setInterval(() => {
    void processMonthlyCommissionPayouts();
  }, 12 * 60 * 60 * 1000);
}
