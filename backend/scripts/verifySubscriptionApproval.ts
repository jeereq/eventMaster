/**
 * Vérifie le flux d'approbation abonnement (computeApprovedAmount + champs schema).
 * Usage: npx ts-node scripts/verifySubscriptionApproval.ts
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { computeApprovedAmount, getPlanAmount } from '../src/services/invoiceService';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? undefined : { rejectUnauthorized: false },
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('--- Test computeApprovedAmount ---');
  const base = getPlanAmount('STANDARD');
  const withDiscount = computeApprovedAmount(base, { discountPercent: 15 });
  console.log(`STANDARD base: ${base} FC → après 15%: ${withDiscount.finalAmount} FC (réduction ${withDiscount.discountAmount} FC)`);
  if (withDiscount.finalAmount !== base - withDiscount.discountAmount) {
    throw new Error('Calcul de réduction incohérent');
  }
  console.log('✅ Calcul réduction OK\n');

  console.log('--- Colonnes SubscriptionRequest ---');
  const cols = await prisma.$queryRaw<Array<{ column_name: string }>>`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'SubscriptionRequest'
    AND column_name IN ('specialDiscountPercent', 'baseAmount', 'approvedAmount')
    ORDER BY column_name
  `;
  const names = cols.map((c) => c.column_name);
  const expected = ['approvedAmount', 'baseAmount', 'specialDiscountPercent'];
  for (const col of expected) {
    if (!names.includes(col)) {
      throw new Error(`Colonne manquante: ${col}`);
    }
    console.log(`✅ ${col}`);
  }

  const pending = await prisma.subscriptionRequest.count({ where: { status: 'PENDING' } });
  console.log(`\nDemandes PENDING en base: ${pending}`);
  console.log('\n✅ Schéma et logique d\'approbation prêts.');
  console.log('   Test UI: Dashboard → Demandes d\'abonnement → Approuver (modal réduction)');
}

main()
  .catch((err) => {
    console.error('❌', err.message || err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
