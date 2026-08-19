import 'dotenv/config';
import { PrismaClient, PlanType } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import { DEFAULT_GUEST_MESSAGE_TEMPLATES } from '../src/config/defaultGuestMessageTemplates';
import { getDefaultPlans, PLAN_KEYS, type PlanTypeKey } from '../src/config/plansConfig';
import {
  SEED_PASSWORD,
  addDays,
  billingPeriod,
  buildTemplateContent,
  GLOBAL_CATALOG_TEMPLATES,
  licenseKey,
  PLAN_AMOUNTS,
  seedGuestGuidelines,
} from './seed/helpers';
import { seedMarketplaceCatalog } from './seed/marketplaceCatalog';
import { seedAccountsMatrix } from './seed/accountsMatrix';
import { seedEventsVolume } from './seed/eventsVolume';
import { seedRoomBlueprint } from './seed/roomBlueprints';
import { eventPhotos } from './seed/rdcMedia';

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

async function clearDatabase() {
  console.log('Nettoyage des données existantes...');
  await prisma.platformNotification.deleteMany({});
  await prisma.pushDeviceToken.deleteMany({});
  await prisma.listingFavorite.deleteMany({});
  await prisma.savedEventPack.deleteMany({});
  await prisma.savedEventBrief.deleteMany({});
  await prisma.commercialCommission.deleteMany({});
  await prisma.platformInvoice.deleteMany({});
  await prisma.subscriptionRequest.deleteMany({});
  await prisma.legalAcceptance.deleteMany({});
  await prisma.guestProtocolNote.deleteMany({});
  await prisma.eventComment.deleteMany({});
  await prisma.eventPost.deleteMany({});
  await prisma.guestShare.deleteMany({});
  await prisma.eventStaff.deleteMany({});
  await prisma.roomStaff.deleteMany({});
  await prisma.invitation.deleteMany({});
  await prisma.guest.deleteMany({});
  await prisma.ticketOrder.deleteMany({});
  await prisma.event.deleteMany({});
  await prisma.adminAuditLog.deleteMany({});
  await prisma.marketplaceBooking.deleteMany({});
  await prisma.marketplaceInquiry.deleteMany({});
  await prisma.serviceOffering.deleteMany({});
  await prisma.vendorProfile.deleteMany({});
  await prisma.venueListing.deleteMany({});
  await prisma.organizationRoom.deleteMany({});
  await prisma.template.deleteMany({});
  await prisma.guestMessageTemplate.deleteMany({});
  await prisma.tenant.updateMany({ data: { managerId: null, referredByCommercialId: null, referredByOrgUserId: null } });
  await prisma.user.deleteMany({});
  await prisma.tenant.deleteMany({});
  // Les forfaits (SubscriptionPlan) sont conservés / re-seedés séparément
}

async function main() {
  console.log('=== EventMaster — Seed complet ===\n');
  await clearDatabase();

  // ─── Catalogue forfaits (BD) ────────────────────────────────────────
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
        sortOrder: PLAN_SORT_ORDER[key],
        isActive: true,
      },
      update: {
        name: def.name,
        price: def.price,
        monthlyPriceFc: def.monthlyPriceFc,
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
        sortOrder: PLAN_SORT_ORDER[key],
      },
    });
  }

  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10);
  const now = new Date();
  const period = billingPeriod(now);

  // ─── Comptes plateforme ─────────────────────────────────────────────
  console.log('Comptes plateforme (Super Admin + Commercial)...');
  const superAdmin = await prisma.user.create({
    data: {
      email: 'superadmin@eventmaster.cd',
      name: 'Super Admin EventMaster',
      passwordHash,
      role: 'SUPER_ADMIN',
      isEmailVerified: true,
      referralCode: 'EM-SUPER',
    },
  });

  const commercial = await prisma.user.create({
    data: {
      email: 'commercial@eventmaster.cd',
      name: 'Jean Commercial ITM',
      phone: '+243900000001',
      passwordHash,
      role: 'COMMERCIAL',
      isEmailVerified: true,
      referralCode: 'EM-COMM01',
      commissionRate: 0.3,
      renewalCommissionRate: 0.2,
    },
  });

  // ─── Organisations ──────────────────────────────────────────────────
  console.log('Organisations...');
  const tenantPrestige = await prisma.tenant.create({
    data: {
      name: 'Agence Prestige',
      plan: 'PREMIUM_2',
      stripeCustId: 'cus_prestige123',
      licenseActive: true,
      licenseExpiresAt: addDays(120),
      licenseKey: licenseKey(),
      referredByCommercialId: commercial.id,
    },
  });

  const tenantEntrepreneurs = await prisma.tenant.create({
    data: {
      name: 'Club des Entrepreneurs',
      plan: 'STANDARD',
      stripeCustId: 'cus_entrepreneurs123',
      licenseActive: true,
      licenseExpiresAt: addDays(60),
      licenseKey: licenseKey(),
      referredByCommercialId: commercial.id,
    },
  });

  const tenantMariage = await prisma.tenant.create({
    data: {
      name: 'Mariage Rêvé',
      plan: 'FREE',
      licenseActive: true,
      licenseExpiresAt: addDays(30),
      licenseKey: licenseKey(),
    },
  });

  const tenantGlobalCorp = await prisma.tenant.create({
    data: {
      name: 'Global Corp Events',
      plan: 'ENTERPRISE_2',
      stripeCustId: 'cus_globalcorp123',
      licenseActive: true,
      licenseExpiresAt: addDays(365),
      licenseKey: licenseKey(),
      referredByCommercialId: commercial.id,
    },
  });

  const tenantNouveau = await prisma.tenant.create({
    data: {
      name: 'Nova Events (nouvelle org.)',
      plan: 'FREE',
      licenseActive: true,
      licenseExpiresAt: addDays(14),
      licenseKey: licenseKey(),
      referredByCommercialId: commercial.id,
    },
  });

  // ─── Utilisateurs organisations ─────────────────────────────────────
  console.log('Utilisateurs organisations...');
  const userPrestige = await prisma.user.create({
    data: {
      email: 'admin@prestige.cd',
      name: 'Jean-Marc Kabeya',
      phone: '+243810000001',
      passwordHash,
      role: 'USER',
      orgRole: 'MANAGER',
      tenantId: tenantPrestige.id,
      isEmailVerified: true,
    },
  });

  const protocolPrestige = await prisma.user.create({
    data: {
      email: 'protocole@prestige.cd',
      name: 'Grace Mujinga',
      passwordHash,
      role: 'USER',
      orgRole: 'PROTOCOL',
      tenantId: tenantPrestige.id,
      isEmailVerified: true,
    },
  });

  const userEntrepreneurs = await prisma.user.create({
    data: {
      email: 'contact@entrepreneurs.cd',
      name: 'Sarah Mwamba',
      passwordHash,
      role: 'USER',
      orgRole: 'MANAGER',
      tenantId: tenantEntrepreneurs.id,
      isEmailVerified: true,
    },
  });

  const userMariage = await prisma.user.create({
    data: {
      email: 'claire@mariagereve.cd',
      name: 'Claire Mpunga',
      passwordHash,
      role: 'USER',
      orgRole: 'MANAGER',
      tenantId: tenantMariage.id,
      isEmailVerified: true,
    },
  });

  const userGlobalCorp = await prisma.user.create({
    data: {
      email: 'event@globalcorp.cd',
      name: 'Patrick Kalonji',
      passwordHash,
      role: 'USER',
      orgRole: 'MANAGER',
      tenantId: tenantGlobalCorp.id,
      isEmailVerified: true,
    },
  });

  const userNova = await prisma.user.create({
    data: {
      email: 'demo@novaevents.cd',
      name: 'Demo Nouvelle Org',
      passwordHash,
      role: 'USER',
      orgRole: 'MANAGER',
      tenantId: tenantNouveau.id,
      isEmailVerified: true,
    },
  });

  await prisma.tenant.update({ where: { id: tenantPrestige.id }, data: { managerId: userPrestige.id } });
  await prisma.tenant.update({ where: { id: tenantEntrepreneurs.id }, data: { managerId: userEntrepreneurs.id } });
  await prisma.tenant.update({ where: { id: tenantMariage.id }, data: { managerId: userMariage.id } });
  await prisma.tenant.update({ where: { id: tenantGlobalCorp.id }, data: { managerId: userGlobalCorp.id } });
  await prisma.tenant.update({ where: { id: tenantNouveau.id }, data: { managerId: userNova.id } });

  // ─── Modèles globaux (bibliothèque) ─────────────────────────────────
  console.log('Bibliothèque de modèles globaux...');
  for (const tpl of GLOBAL_CATALOG_TEMPLATES) {
    await prisma.template.create({
      data: {
        tenantId: null,
        name: tpl.name,
        showOnLanding: tpl.showOnLanding,
        content: buildTemplateContent(tpl.elements, tpl.global),
      },
    });
  }

  // ─── Modèles par organisation ───────────────────────────────────────
  console.log('Modèles organisations...');
  const templatePrestige = await prisma.template.create({
    data: {
      tenantId: tenantPrestige.id,
      name: "Modèle Gala d'Excellence",
      content: buildTemplateContent(
        [
          { id: '1', type: 'text', text: 'SOIRÉE ANNUELLE DE BIENFAISANCE', color: '#f59e0b', fontSize: '12px', align: 'center' },
          { id: '2', type: 'text', text: "Gala d'Excellence 2026", color: '#1e1b4b', fontSize: '32px', align: 'center' },
          { id: '3', type: 'text', text: "Une soirée prestigieuse dédiée à l'innovation.", color: '#475569', fontSize: '14px', align: 'center' },
          { id: '4', type: 'rsvp-block', text: 'Confirmer ma présence', color: '#4f46e5', fontSize: '16px', align: 'center' },
        ],
        { floralColor: '#f59e0b' },
      ),
    },
  });

  const templateEntrepreneurs = await prisma.template.create({
    data: {
      tenantId: tenantEntrepreneurs.id,
      name: 'Modèle Networking Pro',
      content: buildTemplateContent(
        [
          { id: '1', type: 'text', text: 'NETWORKING & COCKTAIL', color: '#4f46e5', fontSize: '12px', align: 'center' },
          { id: '2', type: 'text', text: "Cocktail d'Inauguration", color: '#0f172a', fontSize: '28px', align: 'center' },
          { id: '3', type: 'rsvp-block', text: "S'inscrire", color: '#0f172a', fontSize: '16px', align: 'center' },
        ],
        { bgColor: '#f8fafc' },
      ),
    },
  });

  const templateMariage = await prisma.template.create({
    data: {
      tenantId: tenantMariage.id,
      name: 'Modèle Mariage Champêtre',
      content: buildTemplateContent(
        [
          { id: '1', type: 'text', text: 'CÉLÉBRATION DE NOTRE UNION', color: '#b45309', fontSize: '12px', align: 'center' },
          { id: '2', type: 'text', text: 'Claire & Alexandre', color: '#78350f', fontSize: '36px', align: 'center' },
          { id: '3', type: 'rsvp-block', text: 'Confirmer ma Présence', color: '#b45309', fontSize: '16px', align: 'center' },
        ],
        { floralColor: '#b45309', landingCategory: 'wedding' },
      ),
    },
  });

  const templateGlobalCorp = await prisma.template.create({
    data: {
      tenantId: tenantGlobalCorp.id,
      name: 'Modèle Séminaire Corporatif',
      content: buildTemplateContent(
        [
          { id: '1', type: 'text', text: 'CONFÉRENCE EXCLUSIVE', color: '#2563eb', fontSize: '12px', align: 'center' },
          { id: '2', type: 'text', text: 'Séminaire Dirigeants 2026', color: '#1e293b', fontSize: '30px', align: 'center' },
          { id: '3', type: 'rsvp-block', text: 'Confirmer ma présence', color: '#2563eb', fontSize: '16px', align: 'center' },
        ],
        { frameType: 'double-border' },
      ),
    },
  });

  // ─── Salles ─────────────────────────────────────────────────────────
  console.log('Salles organisations...');
  const roomPrestige = await prisma.organizationRoom.create({
    data: {
      tenantId: tenantPrestige.id,
      name: 'Grande salle de bal',
      description: 'Capacité 350 places, scène et piste de danse',
      capacity: 350,
      floor: 'RDC',
      location: 'Hôtel Fleuve Congo',
      roomType: 'BANQUET',
      layoutBlueprint: seedRoomBlueprint('BANQUET', 1),
    },
  });

  const roomGlobal = await prisma.organizationRoom.create({
    data: {
      tenantId: tenantGlobalCorp.id,
      name: 'Amphithéâtre Executive',
      capacity: 120,
      roomType: 'AMPHITHEATER',
      location: 'Pullman Grand Hôtel',
      layoutBlueprint: seedRoomBlueprint('AMPHITHEATER', 2),
    },
  });

  await prisma.roomStaff.create({
    data: { roomId: roomPrestige.id, userId: protocolPrestige.id, staffRole: 'PROTOCOL' },
  });

  // ─── Événements ───────────────────────────────────────────────────
  console.log('Événements...');
  const eventGala = await prisma.event.create({
    data: {
      tenantId: tenantPrestige.id,
      roomId: roomPrestige.id,
      title: "Gala de Charité d'Élite",
      description: 'Collecte de fonds annuelle pour les orphelinats de Kinshasa.',
      date: new Date('2026-09-25T19:00:00Z'),
      location: 'Hôtel Fleuve Congo, Gombe, Kinshasa',
      reminderFrequency: 'EVERY_5_DAYS',
      latitude: -4.3014,
      longitude: 15.3048,
      photos: eventPhotos(1),
      isPublic: true,
      slug: 'gala-de-charite-elite-kinshasa',
      publishedAt: new Date(),
      ticketingEnabled: true,
      ticketPriceFc: 150_000,
      ticketsTotal: 200,
      ticketsSold: 0,
      guestGuidelines: seedGuestGuidelines(1),
    },
  });

  const eventVIP = await prisma.event.create({
    data: {
      tenantId: tenantPrestige.id,
      title: "Cocktail d'Inauguration VIP",
      description: "Lancement de la nouvelle collection d'art contemporain.",
      date: new Date('2026-07-30T18:30:00Z'),
      location: "Galerie d'Art de la Gombe",
      reminderFrequency: 'EVERY_3_DAYS',
      latitude: -4.305,
      longitude: 15.302,
      photos: eventPhotos(2),
      guestGuidelines: seedGuestGuidelines(2),
    },
  });

  const eventNetworking = await prisma.event.create({
    data: {
      tenantId: tenantEntrepreneurs.id,
      title: 'Soirée Networking & Pitch',
      description: 'Rencontre mensuelle des entrepreneurs.',
      date: new Date('2026-08-15T18:00:00Z'),
      location: 'Silikin Village, Limete',
      reminderFrequency: 'WEEKLY',
      latitude: -4.3488,
      longitude: 15.3185,
      photos: eventPhotos(3),
      isPublic: true,
      slug: 'soiree-networking-pitch-limete',
      publishedAt: new Date(),
      ticketingEnabled: false,
      guestGuidelines: seedGuestGuidelines(3),
    },
  });

  const eventMariage = await prisma.event.create({
    data: {
      tenantId: tenantMariage.id,
      title: 'Mariage de Claire & Alexandre',
      description: 'Cérémonie religieuse suivie d\'un dîner dansant.',
      date: new Date('2026-12-19T14:00:00Z'),
      location: 'Espace Texas, Binza Pigeon',
      reminderFrequency: 'WEEKLY',
      latitude: -4.3725,
      longitude: 15.253,
      photos: eventPhotos(4),
      guestGuidelines: seedGuestGuidelines(4),
    },
  });

  const eventSeminar = await prisma.event.create({
    data: {
      tenantId: tenantGlobalCorp.id,
      roomId: roomGlobal.id,
      title: 'Séminaire Annuel des Dirigeants',
      description: 'Planification stratégique annuelle.',
      date: new Date('2026-10-10T09:00:00Z'),
      location: 'Pullman Grand Hôtel, Gombe',
      latitude: -4.3032,
      longitude: 15.2861,
      photos: eventPhotos(5),
      guestGuidelines: seedGuestGuidelines(5),
    },
  });

  await prisma.eventStaff.create({
    data: { eventId: eventGala.id, userId: protocolPrestige.id, staffRole: 'PROTOCOL' },
  });

  // ─── Invitations ──────────────────────────────────────────────────
  console.log('Invitations...');
  const invitationPairs: Array<{ eventId: string; templateId: string; subject: string; body: string }> = [
    {
      eventId: eventGala.id,
      templateId: templatePrestige.id,
      subject: "Invitation : Gala de Charité d'Élite 2026",
      body: 'Cher(e) {{firstName}},\n\nInvitation au Gala.\n\n{{rsvpLink}}',
    },
    {
      eventId: eventNetworking.id,
      templateId: templateEntrepreneurs.id,
      subject: 'Networking & Pitch — Invitation',
      body: 'Bonjour {{firstName}},\n\n{{rsvpLink}}',
    },
    {
      eventId: eventMariage.id,
      templateId: templateMariage.id,
      subject: 'Mariage Claire & Alexandre',
      body: 'Chers {{firstName}} {{lastName}},\n\n{{rsvpLink}}',
    },
    {
      eventId: eventSeminar.id,
      templateId: templateGlobalCorp.id,
      subject: 'Séminaire Dirigeants 2026',
      body: 'Cher(e) {{firstName}},\n\n{{rsvpLink}}',
    },
  ];

  for (const inv of invitationPairs) {
    await prisma.invitation.create({
      data: { ...inv, channel: 'EMAIL' },
    });
  }

  // ─── Invités ──────────────────────────────────────────────────────
  console.log('Invités...');
  const guestBatches: Array<{
    eventId: string;
    guests: Array<{
      firstName: string;
      lastName: string;
      email: string;
      category?: string;
      rsvp: string;
      preferences?: object;
      phone?: string;
    }>;
  }> = [
    {
      eventId: eventGala.id,
      guests: [
        { firstName: 'Dieudonné', lastName: 'Kabila', email: 'dieudonne.kabila@gmail.com', category: 'VIP', rsvp: 'ACCEPTED', preferences: { specialMeal: 'none', allergies: '' } },
        { firstName: 'Marie-Thérèse', lastName: 'Nzuzi', email: 'mt.nzuzi@yahoo.fr', category: 'VIP', rsvp: 'ACCEPTED', preferences: { specialMeal: 'vegetarian' } },
        { firstName: 'Christian', lastName: 'Lwamba', email: 'c.lwamba@outlook.com', category: 'Donateur', rsvp: 'PENDING' },
        { firstName: 'Fanny', lastName: 'Kapinga', email: 'fanny.kapinga@gmail.com', category: 'Donateur', rsvp: 'DECLINED' },
        { firstName: 'Jonathan', lastName: 'Tshilombo', email: 'j.tshilombo@gmail.com', category: 'Presse', rsvp: 'ACCEPTED', phone: '+243820000101' },
      ],
    },
    {
      eventId: eventNetworking.id,
      guests: [
        { firstName: 'Alain', lastName: 'Mukendi', email: 'alain@mukendi-consulting.cd', category: 'Membre', rsvp: 'ACCEPTED' },
        { firstName: 'Patricia', lastName: 'Ngalula', email: 'patricia@techstart.cd', category: 'Pitcher', rsvp: 'ACCEPTED' },
        { firstName: 'Didier', lastName: 'Tshisekedi', email: 'didier.t@invest-rdc.com', category: 'Investisseur', rsvp: 'PENDING' },
      ],
    },
    {
      eventId: eventMariage.id,
      guests: [
        { firstName: 'Alexandre', lastName: 'Nguya', email: 'alexandre.nguya@gmail.com', category: 'Famille', rsvp: 'ACCEPTED' },
        { firstName: 'Rachel', lastName: 'Mbuyi', email: 'rachel.mbuyi@gmail.com', category: 'Ami', rsvp: 'ACCEPTED', preferences: { specialMeal: 'vegetarian' } },
        { firstName: 'Gauthier', lastName: 'Kalonji', email: 'gauthier.k@gmail.com', category: 'Ami', rsvp: 'PENDING' },
      ],
    },
    {
      eventId: eventSeminar.id,
      guests: [
        { firstName: 'Jean-Pierre', lastName: 'Bemba', email: 'jp.bemba@globalcorp.cd', category: 'C-Level', rsvp: 'ACCEPTED' },
        { firstName: 'Solange', lastName: 'Liyolo', email: 'solange.liyolo@globalcorp.cd', category: 'C-Level', rsvp: 'ACCEPTED' },
        { firstName: 'Arthur', lastName: 'Mavinga', email: 'arthur.mavinga@globalcorp.cd', category: 'Directeur', rsvp: 'PENDING' },
      ],
    },
  ];

  for (const batch of guestBatches) {
    for (const g of batch.guests) {
      await prisma.guest.create({ data: { eventId: batch.eventId, ...g } });
    }
  }

  // ─── Mur social événement ─────────────────────────────────────────
  console.log('Publications événement...');
  const post = await prisma.eventPost.create({
    data: {
      eventId: eventGala.id,
      content: 'Merci à tous pour vos confirmations ! La soirée promet d\'être mémorable.',
      mediaType: 'TEXT',
      likes: [],
    },
  });

  await prisma.eventComment.create({
    data: {
      postId: post.id,
      authorName: userPrestige.name || 'Organisateur',
      userId: userPrestige.id,
      content: 'N\'oubliez pas la tenue de soirée.',
    },
  });

  // ─── Modèles messages invités ─────────────────────────────────────
  console.log('Modèles messages WhatsApp...');
  for (const tpl of DEFAULT_GUEST_MESSAGE_TEMPLATES) {
    await prisma.guestMessageTemplate.create({
      data: {
        type: tpl.type,
        name: tpl.name,
        description: tpl.description,
        channel: tpl.channel,
        subject: tpl.subject ?? null,
        body: tpl.body,
        isActive: true,
      },
    });
  }

  // ─── Demandes d'abonnement ────────────────────────────────────────
  console.log('Demandes d\'abonnement...');
  const subApproved = await prisma.subscriptionRequest.create({
    data: {
      tenantId: tenantEntrepreneurs.id,
      requestedPlan: 'STANDARD',
      durationDays: 30,
      status: 'APPROVED',
      baseAmount: PLAN_AMOUNTS.STANDARD,
      approvedAmount: PLAN_AMOUNTS.STANDARD,
      proofOfPayment: 'VIREMENT-REF-2026-001',
    },
  });

  await prisma.subscriptionRequest.create({
    data: {
      tenantId: tenantMariage.id,
      requestedPlan: 'PREMIUM_1',
      durationDays: 30,
      status: 'PENDING',
      proofOfPayment: 'Preuve mobile money — à valider',
    },
  });

  await prisma.subscriptionRequest.create({
    data: {
      tenantId: tenantNouveau.id,
      requestedPlan: 'STANDARD',
      durationDays: 30,
      status: 'PENDING',
    },
  });

  // ─── Factures plateforme ──────────────────────────────────────────
  console.log('Factures plateforme...');
  const invoiceNumber = `EM-INV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-SEED01`;
  const platformInvoice = await prisma.platformInvoice.create({
    data: {
      invoiceNumber,
      tenantId: tenantEntrepreneurs.id,
      plan: 'STANDARD',
      amount: PLAN_AMOUNTS.STANDARD ?? 30000,
      type: 'SUBSCRIPTION_APPROVAL',
      status: 'PAID',
      durationDays: 30,
      periodStart: addDays(-30),
      periodEnd: tenantEntrepreneurs.licenseExpiresAt,
      billingPeriod: period,
      subscriptionRequestId: subApproved.id,
      recipientEmails: [userEntrepreneurs.email],
      details: {
        planName: 'Business',
        tenantName: tenantEntrepreneurs.name,
        baseAmount: PLAN_AMOUNTS.STANDARD,
        discountPercent: 0,
        discountAmount: 0,
      },
      sentAt: addDays(-28),
    },
  });

  // ─── Commissions commercial ─────────────────────────────────────────
  console.log('Commissions commercial...');
  const commissionAmount = Math.round((PLAN_AMOUNTS.STANDARD ?? 30000) * 0.3);
  await prisma.commercialCommission.create({
    data: {
      commercialId: commercial.id,
      tenantId: tenantEntrepreneurs.id,
      plan: 'STANDARD',
      invoiceAmount: PLAN_AMOUNTS.STANDARD ?? 30000,
      commissionRate: 0.3,
      commissionAmount,
      billingPeriod: period,
      source: 'SUBSCRIPTION_APPROVAL',
      platformInvoiceId: platformInvoice.id,
    },
  });

  // ─── Notifications plateforme ─────────────────────────────────────
  console.log('Notifications commercial...');
  await prisma.platformNotification.create({
    data: {
      userId: commercial.id,
      type: 'SUBSCRIPTION_APPROVAL',
      title: `Abonnement activé — ${tenantEntrepreneurs.name}`,
      message: `Forfait STANDARD activé. Montant facturé : ${(PLAN_AMOUNTS.STANDARD ?? 30000).toLocaleString('fr-FR')} FC. Commission : ${commissionAmount.toLocaleString('fr-FR')} FC.`,
      metadata: {
        tenantId: tenantEntrepreneurs.id,
        invoiceNumber,
        commissionAmount,
      },
    },
  });

  await seedMarketplaceCatalog(prisma, passwordHash);

  const matrix = await seedAccountsMatrix(prisma, passwordHash, commercial.id);
  await seedEventsVolume(prisma, {
    organizers: matrix.organizers,
    agendaTenantId: matrix.agendaTenantId,
    protocolUserId: matrix.protocolUserId,
    existingEventCount: await prisma.event.count(),
  });

  // ─── Résumé ───────────────────────────────────────────────────────
  const counts = {
    users: await prisma.user.count(),
    tenants: await prisma.tenant.count(),
    globalTemplates: await prisma.template.count({ where: { tenantId: null } }),
    landingTemplates: await prisma.template.count({ where: { tenantId: null, showOnLanding: true } }),
    orgTemplates: await prisma.template.count({ where: { tenantId: { not: null } } }),
    events: await prisma.event.count(),
    guests: await prisma.guest.count(),
    subscriptionRequests: await prisma.subscriptionRequest.count(),
    invoices: await prisma.platformInvoice.count(),
    rooms: await prisma.organizationRoom.count(),
    venueListings: await prisma.venueListing.count({ where: { isPublic: true } }),
    venuesKinshasa: await prisma.venueListing.count({ where: { isPublic: true, city: 'Kinshasa' } }),
    venuesLubumbashi: await prisma.venueListing.count({ where: { isPublic: true, city: 'Lubumbashi' } }),
    serviceOfferings: await prisma.serviceOffering.count({ where: { isPublic: true } }),
    tradeServices: await prisma.serviceOffering.count({
      where: {
        isPublic: true,
        category: { in: ['CATERING', 'PHOTOGRAPHY', 'VIDEO', 'DJ', 'DECORATION', 'SECURITY', 'FLORIST', 'TRANSPORT', 'MC', 'OTHER'] },
      },
    }),
    rentalServices: await prisma.serviceOffering.count({
      where: {
        isPublic: true,
        category: { in: ['RENTAL_CLOTHING_MEN', 'RENTAL_CLOTHING_WOMEN', 'RENTAL_CLOTHING_CHILD', 'RENTAL_CAR', 'RENTAL_MOTO', 'RENTAL_EQUIPMENT'] },
      },
    }),
    ticketOrders: await prisma.ticketOrder.count({ where: { status: 'PAID' } }),
    publicEvents: await prisma.event.count({ where: { isPublic: true } }),
  };

  console.log('\n=== Seed terminé ===');
  console.log(JSON.stringify(counts, null, 2));
  console.log('\nComptes de test (mot de passe : password123) :');
  console.log('  Super Admin  : superadmin@eventmaster.cd');
  console.log('  Commercial   : commercial@eventmaster.cd');
  console.log('  Prestige     : admin@prestige.cd');
  console.log('  Entrepreneurs: contact@entrepreneurs.cd');
  console.log('  Mariage      : claire@mariagereve.cd');
  console.log('  Global Corp  : event@globalcorp.cd');
  console.log('  Nouvelle org.: demo@novaevents.cd  (FREE — bibliothèque modèles)');
  console.log('  Salles Kinshasa : salles.kin1@eventmaster.cd … salles.kin20@  (5 salles/org, forfait VENUE)');
  console.log('  Salles L’shi    : salles.lshi1@eventmaster.cd … salles.lshi20@');
  console.log('  Métiers 1–10    : prestas1@eventmaster.cd … prestas10@  (savoir-faire, l’équipe se déplace)');
  console.log('  Locations 1–10  : locations1@eventmaster.cd … locations10@  (biens à louer, caution / restitution)');
  console.log('  Protocoles      : protocole.salles.kin1@…5@ · protocole.prestas1@…5@ · protocole.locations1@…5@');
  console.log('  Commerciaux org : commercial.salles.kin1@…5@ · commercial.prestas1@…5@');
  console.log('  Forfaits / rôles :');
  for (const line of matrix.logins) {
    console.log(`    ${line}`);
  }
  console.log(`\nSuper Admin id: ${superAdmin.id}`);
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
