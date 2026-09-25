import 'dotenv/config';
import { Prisma, PrismaClient, PlanType } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import { DEFAULT_GUEST_MESSAGE_TEMPLATES } from '../src/config/defaultGuestMessageTemplates';
import { getDefaultPlans, PLAN_KEYS, type PlanTypeKey } from '../src/config/plansConfig';
import { buildTemplateContent, GLOBAL_CATALOG_TEMPLATES } from './seed/helpers';
import { seedBeverageBrands } from './seed/beverageBrands';

/**
 * Seed minimal : uniquement les données dont l’application a besoin pour fonctionner.
 * Aucune donnée de démonstration, aucune suppression : le script est idempotent et
 * ne crée que ce qui manque (les réglages modifiés par l’admin sont conservés).
 *
 *  - Catalogue des forfaits (SubscriptionPlan)
 *  - Modèles de messages invités (WhatsApp / e-mail / SMS)
 *  - Bibliothèque globale de modèles d’invitation (tenantId = null)
 *  - Catalogue de marques de boissons
 *  - Compte Super Admin initial, si SEED_SUPERADMIN_PASSWORD est défini
 */

const PLAN_SORT_ORDER: Record<PlanTypeKey, number> = {
  FREE: 0,
  PERSONAL_50: 1,
  PERSONAL_100: 2,
  PERSONAL_200: 3,
  PERSONAL_PLUS: 4,
  STANDARD: 5,
  PREMIUM_1: 6,
  PREMIUM_2: 7,
  ENTERPRISE_1: 8,
  ENTERPRISE_2: 9,
  ENTERPRISE_3: 10,
  VENUE: 11,
  SERVICE: 12,
  CATALOG: 13,
};

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? undefined : { rejectUnauthorized: false },
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function seedSubscriptionPlans() {
  console.log('Catalogue SubscriptionPlan…');
  const defaults = getDefaultPlans();
  for (const key of PLAN_KEYS) {
    const def = defaults[key];
    await prisma.subscriptionPlan.upsert({
      where: { id: key as PlanType },
      create: {
        id: key as PlanType,
        name: def.name,
        price: def.price,
        monthlyPriceFc: def.monthlyPriceFc,
        promoActive: Boolean(def.promoActive),
        promoPrice: def.promoPrice ?? null,
        promoMonthlyPriceFc: def.promoMonthlyPriceFc ?? null,
        promoLabel: def.promoLabel ?? null,
        description: def.description,
        audience: def.audience,
        maxEvents: def.maxEvents,
        maxGuests: def.maxGuests,
        maxTemplates: def.maxTemplates,
        maxRooms: def.maxRooms,
        maxServices: def.maxServices,
        maxOrgManagers: def.maxOrgManagers,
        customTemplates: def.customTemplates,
        mockupOcr: def.mockupOcr,
        protocolQr: def.protocolQr,
        seatNotifications: def.seatNotifications,
        roomThemesFixtures: def.roomThemesFixtures,
        adminReports: def.adminReports,
        roomEditorLevel: def.roomEditorLevel,
        commercialNetwork: def.commercialNetwork,
        supportLevel: def.supportLevel,
        customRsvpFields: def.customRsvpFields,
        sortOrder: PLAN_SORT_ORDER[key],
        isActive: true,
      },
      // Prix et promos modifiés par l’admin conservés ; les quotas sont réalignés au démarrage du serveur.
      update: {},
    });
  }
}

async function seedGuestMessageTemplates() {
  console.log('Modèles de messages invités…');
  for (const tpl of DEFAULT_GUEST_MESSAGE_TEMPLATES) {
    await prisma.guestMessageTemplate.upsert({
      where: { type: tpl.type },
      create: {
        type: tpl.type,
        name: tpl.name,
        description: tpl.description,
        channel: tpl.channel,
        subject: tpl.subject ?? null,
        body: tpl.body,
        isActive: true,
      },
      update: {},
    });
  }
}

async function seedGlobalTemplateLibrary() {
  console.log('Bibliothèque de modèles globaux…');
  const existing = await prisma.template.findMany({
    where: { tenantId: null },
    select: { name: true },
  });
  const have = new Set(existing.map((t) => t.name));
  for (const tpl of GLOBAL_CATALOG_TEMPLATES) {
    if (have.has(tpl.name)) continue;
    await prisma.template.create({
      data: {
        tenantId: null,
        name: tpl.name,
        showOnLanding: tpl.showOnLanding,
        content: buildTemplateContent(tpl.elements, tpl.global) as Prisma.InputJsonValue,
      },
    });
  }
}

async function seedSuperAdmin() {
  const email = (process.env.SEED_SUPERADMIN_EMAIL || 'superadmin@eventmaster.cd').trim();
  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) {
    console.log(`Super Admin ${email} déjà présent — inchangé.`);
    return;
  }
  const password = process.env.SEED_SUPERADMIN_PASSWORD;
  if (!password) {
    const admins = await prisma.user.count({ where: { role: 'SUPER_ADMIN' } });
    if (admins === 0) {
      console.warn(
        'ATTENTION : aucun Super Admin en base. Relancez le seed avec SEED_SUPERADMIN_PASSWORD (et SEED_SUPERADMIN_EMAIL) pour le créer.',
      );
    }
    return;
  }
  console.log(`Création du Super Admin ${email}…`);
  await prisma.user.create({
    data: {
      email,
      name: process.env.SEED_SUPERADMIN_NAME || 'Super Admin EventMaster',
      passwordHash: await bcrypt.hash(password, 10),
      role: 'SUPER_ADMIN',
      isEmailVerified: true,
    },
  });
}

async function main() {
  console.log('=== EventMaster — Seed (données obligatoires) ===\n');
  await seedSubscriptionPlans();
  await seedGuestMessageTemplates();
  await seedGlobalTemplateLibrary();
  await seedBeverageBrands(prisma);
  await seedSuperAdmin();

  const counts = {
    subscriptionPlans: await prisma.subscriptionPlan.count(),
    guestMessageTemplates: await prisma.guestMessageTemplate.count(),
    globalTemplates: await prisma.template.count({ where: { tenantId: null } }),
    beverageBrands: await prisma.beverageBrand.count(),
    superAdmins: await prisma.user.count({ where: { role: 'SUPER_ADMIN' } }),
  };
  console.log('\n=== Seed terminé ===');
  console.log(JSON.stringify(counts, null, 2));
}

main()
  .catch((e) => {
    console.error('Erreur lors du seeding :', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
