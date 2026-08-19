/**
 * Vérifie le montant annuel : 12 mois (B2B) ou 4 trimestres (B2C), puis −10 %.
 * Usage: npx ts-node -P tsconfig.scripts.json scripts/verifyAnnualBilling.ts
 */
import {
  ANNUAL_DISCOUNT_PERCENT,
  annualPayableFromPeriod,
  annualPromoPayableFromPeriod,
  periodAmountToInvoiceBase,
} from '../src/config/plansConfig';
import { computeApprovedAmount } from '../src/services/invoiceService';

function assertEqual(actual: number, expected: number, label: string) {
  if (actual !== expected) {
    throw new Error(`${label}: attendu ${expected}, obtenu ${actual}`);
  }
  console.log(`✅ ${label}: ${actual} FC`);
}

function main() {
  console.log('--- Base catalogue (une période vs annuel) ---\n');

  assertEqual(periodAmountToInvoiceBase(30000, 'STANDARD', 30), 30000, 'Business 1 mois');
  assertEqual(periodAmountToInvoiceBase(30000, 'STANDARD', 365), 360000, 'Business 12 mois (avant −10 %)');
  assertEqual(periodAmountToInvoiceBase(90000, 'PERSONAL_100', 90), 90000, 'Particulier 100 1 trimestre');
  assertEqual(
    periodAmountToInvoiceBase(90000, 'PERSONAL_100', 365),
    360000,
    'Particulier 100 4 trimestres (avant −10 %)',
  );
  assertEqual(periodAmountToInvoiceBase(14900, 'VENUE', 365), 178800, 'Salle 12 mois (avant −10 %)');

  console.log('\n--- Montant à payer (après −10 %) ---\n');

  assertEqual(annualPayableFromPeriod(30000, 'STANDARD'), 324000, 'Business annuel');
  assertEqual(annualPayableFromPeriod(90000, 'PERSONAL_100'), 324000, 'Particulier 100 annuel');
  assertEqual(annualPayableFromPeriod(85000, 'PREMIUM_2'), 918000, 'Premium 2 annuel');
  assertEqual(annualPayableFromPeriod(14900, 'VENUE'), 160920, 'Salle annuel');

  const billed = computeApprovedAmount(360000, { discountPercent: ANNUAL_DISCOUNT_PERCENT });
  assertEqual(billed.finalAmount, 324000, 'Approbation Business : catalogue 12 mois × 90 %');
  assertEqual(billed.discountAmount, 36000, 'Réduction Business annuel');

  const monthly = computeApprovedAmount(30000, { discountPercent: 0 });
  assertEqual(monthly.finalAmount, 30000, 'Mois Business inchangé');

  console.log('\n--- Promo annuelle (min promo × N vs catalogue × N × 0,90) ---\n');

  assertEqual(
    annualPromoPayableFromPeriod(30000, 20000, 'STANDARD'),
    240000,
    'Promo 20 000 × 12 (plus bas que 324 000)',
  );
  assertEqual(
    annualPromoPayableFromPeriod(30000, 28000, 'STANDARD'),
    324000,
    'Promo 28 000 × 12 (336 000) → plafond annuel −10 %',
  );
  assertEqual(
    annualPromoPayableFromPeriod(90000, 50000, 'PERSONAL_100'),
    200000,
    'Promo Particulier 50 000 × 4',
  );

  console.log('\n✅ Facturation annuelle cohérente (12 mois / 4 trimestres puis −10 %).');
}

try {
  main();
} catch (err) {
  console.error('❌', err instanceof Error ? err.message : err);
  process.exit(1);
}
