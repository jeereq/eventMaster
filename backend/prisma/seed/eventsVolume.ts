import type { PrismaClient } from '@prisma/client';
import { blueprintToTablePlan } from '../../src/services/roomLayoutService';
import { seedGuestGuidelines } from './helpers';
import { marketplacePlaceFor, slugify } from './marketplaceCatalog';
import { eventPhotos, rdcTicketPriceFc } from './rdcMedia';
import type { OrganizerSeed } from './accountsMatrix';
import {
  assignSeatOnPlan,
  enrichTablePlanWithZones,
  findAvailableSeat,
  pricingZonesForVolumeSeed,
  resolveOrderPricing,
  type TablePlanLike,
} from './ticketingPlan';

const TITLES = [
  'Concert live',
  'Gala de charité',
  'Conférence business',
  'Festival culturel',
  'Afterwork networking',
  'Showcase artistes',
  'Forum de l’emploi',
  'Soirée dansante',
  'Cérémonie de remise',
  'Brunch networking',
  'Open mic',
  'Salon du mariage',
  'Lancement produit',
  'Masterclass',
  'Défilé de mode',
];

const FIRST_NAMES = [
  'Amina', 'Patrick', 'Grace', 'Olivier', 'Mireille', 'Héritier', 'Chantal', 'David',
  'Rachel', 'Alain', 'Fanny', 'Jonathan', 'Solange', 'Didier', 'Carine', 'Bruno',
];
const LAST_NAMES = [
  'Tshibanda', 'Kalala', 'Mujinga', 'Mutombo', 'Ngalula', 'Ilunga', 'Mpunga', 'Kabongo',
  'Kasongo', 'Mbuyi', 'Lwamba', 'Kapinga', 'Nzuzi', 'Mukendi', 'Kalonji', 'Bemba',
];

type RoomRow = { id: string; tenantId: string; location: string | null; layoutBlueprint: unknown };

function pick<T>(list: T[], index: number): T {
  return list[index % list.length];
}

export async function seedEventsVolume(
  prisma: PrismaClient,
  opts: {
    organizers: OrganizerSeed[];
    agendaTenantId: string;
    protocolUserId?: string | null;
    existingEventCount: number;
  },
) {
  const target = 100;
  const toCreate = Math.max(0, target - opts.existingEventCount);
  if (toCreate === 0) {
    console.log(`Événements volume — déjà ${opts.existingEventCount} (cible ${target}).`);
    return;
  }

  console.log(`Événements volume — ${toCreate} fiches (total visé ${target})…`);

  const agendaRooms = await prisma.organizationRoom.findMany({
    where: { tenantId: opts.agendaTenantId },
    select: { id: true, tenantId: true, location: true, layoutBlueprint: true },
  });

  const organizerByPlan = new Map(opts.organizers.map((o) => [o.plan, o]));
  const distribution: Array<{ plan: OrganizerSeed['plan']; count: number }> = [
    { plan: 'PERSONAL_50', count: 2 },
    { plan: 'PERSONAL_100', count: 2 },
    { plan: 'PERSONAL_200', count: 2 },
    { plan: 'PERSONAL_PLUS', count: 4 },
    { plan: 'FREE', count: 2 },
    { plan: 'STANDARD', count: 6 },
    { plan: 'PREMIUM_1', count: 8 },
    { plan: 'PREMIUM_2', count: 6 },
    { plan: 'ENTERPRISE_1', count: 10 },
    { plan: 'ENTERPRISE_2', count: 8 },
  ];

  const slots: OrganizerSeed[] = [];
  for (const row of distribution) {
    const org = organizerByPlan.get(row.plan);
    if (!org || org.accountKind === 'CLIENT' || org.accountKind === 'VENDOR') continue;
    for (let i = 0; i < row.count; i++) slots.push(org);
  }
  const agenda = opts.organizers.find((o) => o.tenantId === opts.agendaTenantId);
  while (slots.length < toCreate && agenda) slots.push(agenda);
  const hosts = slots.slice(0, toCreate);

  const globalTemplates = await prisma.template.findMany({
    where: { tenantId: null, showOnLanding: true },
    select: { id: true },
  });

  const created: Array<{
    id: string;
    isPublic: boolean;
    ticketingEnabled: boolean;
    ticketPricingMode: string;
    ticketPriceFc: number;
    ticketsTotal: number | null;
    seatSelectionEnabled: boolean;
    title: string;
  }> = [];

  let tablePlanEventCounter = 0;

  for (let i = 0; i < hosts.length; i++) {
    const host = hosts[i];
    const place = marketplacePlaceFor(i + 40);
    const isAgenda = host.tenantId === opts.agendaTenantId;
    const isPublic = isAgenda ? i % 5 !== 4 : i % 3 !== 2;
    const paid = isPublic && i % 3 !== 0;
    const title = `${pick(TITLES, i)} ${place.city.name} #${i + 1}`;
    const ticketPriceFc = paid ? rdcTicketPriceFc(title, i) : 0;
    const ticketsTotal = paid ? 80 + (i % 12) * 20 : isPublic ? 150 : null;
    const slug = isPublic ? `${slugify(title)}-${String(i + 1).padStart(3, '0')}` : null;
    const future = i % 11 !== 0;
    const date = new Date();
    date.setDate(date.getDate() + (future ? 8 + (i % 140) : -3 - (i % 20)));
    date.setHours(18 + (i % 4), 0, 0, 0);

    const room: RoomRow | undefined =
      host.tenantId === opts.agendaTenantId ? agendaRooms[i % Math.max(1, agendaRooms.length)] : undefined;

    let tablePlan: TablePlanLike | undefined = room?.layoutBlueprint
      ? (blueprintToTablePlan(room.layoutBlueprint as Parameters<typeof blueprintToTablePlan>[0]) as TablePlanLike)
      : undefined;

    const byZone = Boolean(paid && isPublic && tablePlan && tablePlanEventCounter % 3 === 0);
    const seatSelection = Boolean(paid && isPublic && tablePlan && (tablePlanEventCounter % 2 === 0 || byZone));
    if (tablePlan) tablePlanEventCounter += 1;

    if (byZone && tablePlan) {
      tablePlan = enrichTablePlanWithZones(tablePlan, pricingZonesForVolumeSeed(i));
    }

    const location = room?.location || `${place.neighborhood}, ${place.commune.name}, ${place.city.name}`;
    const event = await prisma.event.create({
      data: {
        tenantId: host.tenantId,
        roomId: room?.id ?? null,
        title,
        description: `${title} — ${place.commune.name}, ${place.neighborhood}. ${
          paid
            ? byZone
              ? 'Billets par zones (VIP, Standard…), choix de place sur le plan.'
              : seatSelection
                ? 'Billets en ligne avec réservation de siège.'
                : 'Billets en ligne, places limitées.'
            : isPublic
              ? 'Entrée libre, inscription en ligne obligatoire.'
              : 'Événement privé sur liste d’invités.'
        } Accueil 30 minutes avant. Badge QR à présenter à l’entrée.`,
        date,
        location,
        reminderFrequency: i % 2 === 0 ? 'WEEKLY' : 'EVERY_5_DAYS',
        latitude: place.lat,
        longitude: place.lng,
        isPublic,
        slug,
        publishedAt: isPublic ? new Date() : null,
        ticketingEnabled: paid,
        ticketPricingMode: byZone ? 'by_zone' : 'global',
        ticketPriceFc,
        seatSelectionEnabled: seatSelection,
        ticketsTotal,
        ticketsSold: 0,
        photos: eventPhotos(i),
        guestGuidelines: seedGuestGuidelines(i),
        tablePlan: tablePlan ? (tablePlan as object) : undefined,
      },
    });
    created.push({
      id: event.id,
      isPublic,
      ticketingEnabled: paid,
      ticketPricingMode: byZone ? 'by_zone' : 'global',
      ticketPriceFc,
      ticketsTotal,
      seatSelectionEnabled: seatSelection,
      title: event.title,
    });

    if (isPublic && i % 4 === 0) {
      await prisma.eventPost.create({
        data: {
          eventId: event.id,
          content: `Bienvenue à ${title}. Ouverture des portes 30 minutes avant. Conservez votre badge QR.`,
          mediaType: 'TEXT',
          publishedOnListing: true,
        },
      });
    }

    if (globalTemplates.length > 0 && (isPublic || i % 7 === 0)) {
      const templateId = globalTemplates[i % globalTemplates.length].id;
      await prisma.invitation.create({
        data: {
          eventId: event.id,
          templateId,
          subject: `Invitation : ${title}`,
          body: `Bonjour {{firstName}},\n\nVous êtes invité(e) à ${title} le {{date}} à {{location}}.\n\nTenue : {{dressCode}}\n\n{{rsvpLink}}`,
          channel: 'EMAIL',
        },
      });
    }

    if (opts.protocolUserId && host.tenantId === opts.agendaTenantId && i % 6 === 0) {
      await prisma.eventStaff.create({
        data: { eventId: event.id, userId: opts.protocolUserId, staffRole: 'PROTOCOL' },
      });
    }
  }

  const ticketed = created.filter((e) => e.isPublic && e.ticketingEnabled);
  console.log(`Billets — commandes payées sur ${ticketed.length} événements publics…`);

  for (let e = 0; e < ticketed.length; e++) {
    const meta = ticketed[e];
    const eventRow = await prisma.event.findUnique({
      where: { id: meta.id },
      select: {
        id: true,
        ticketPricingMode: true,
        ticketPriceFc: true,
        seatSelectionEnabled: true,
        tablePlan: true,
        ticketsTotal: true,
      },
    });
    if (!eventRow) continue;

    const orderCount = 2 + (e % 4);
    let sold = 0;
    let livePlan = eventRow.tablePlan as TablePlanLike | null;

    for (let o = 0; o < orderCount; o++) {
      const quantity = eventRow.seatSelectionEnabled ? 1 : 1 + (o % 3);
      if (eventRow.ticketsTotal != null && sold + quantity > eventRow.ticketsTotal) break;

      const first = pick(FIRST_NAMES, e * 5 + o);
      const last = pick(LAST_NAMES, e * 3 + o);
      const buyerEmail = `acheteur.${e + 1}.${o + 1}@tickets.seed.cd`;

      const soldOutEvent = e % 9 === 0 && o === orderCount - 1;
      const qty = soldOutEvent && eventRow.ticketsTotal != null
        ? Math.max(1, eventRow.ticketsTotal - sold)
        : quantity;

      let tableId: string | null = null;
      let seatIndex: number | null = null;
      let pricingZoneId: string | null = null;
      let unitPriceFc = eventRow.ticketPriceFc;
      let amountFc = unitPriceFc * qty;

      if (eventRow.seatSelectionEnabled && livePlan) {
        const seat = findAvailableSeat(livePlan);
        if (!seat) break;
        tableId = seat.tableId;
        seatIndex = seat.seatIndex;
        const pricing = resolveOrderPricing(eventRow, { tableId, seatIndex });
        unitPriceFc = pricing.unitPriceFc;
        pricingZoneId = pricing.pricingZoneId;
        amountFc = pricing.amountFc;
      } else if (eventRow.ticketPricingMode === 'by_zone' && livePlan?.pricingZones?.length) {
        const zone = livePlan.pricingZones[o % livePlan.pricingZones.length];
        const pricing = resolveOrderPricing(eventRow, { pricingZoneId: zone.id });
        unitPriceFc = pricing.unitPriceFc;
        pricingZoneId = pricing.pricingZoneId;
        amountFc = pricing.unitPriceFc * qty;
      } else {
        amountFc = eventRow.ticketPriceFc * qty;
      }

      const order = await prisma.ticketOrder.create({
        data: {
          eventId: eventRow.id,
          buyerName: `${first} ${last}`,
          buyerEmail,
          buyerPhone: `+24381${String(4000000 + e * 10 + o).slice(0, 7)}`,
          quantity: qty,
          amountFc,
          unitPriceFc,
          pricingZoneId,
          tableId,
          seatIndex,
          status: 'PAID',
          stripeCheckoutSessionId: `seed_cs_${eventRow.id.slice(0, 8)}_${o}`,
          stripePaymentIntentId: `seed_pi_${eventRow.id.slice(0, 8)}_${o}`,
          paidAt: new Date(),
        },
      });

      const guests = Array.from({ length: qty }, (_, g) => ({
        eventId: eventRow.id,
        firstName: g === 0 ? first : `Invité ${g + 1}`,
        lastName: last,
        email: g === 0 ? buyerEmail : `acheteur.${e + 1}.${o + 1}+${g}@tickets.seed.cd`,
        phone: g === 0 ? `+24381${String(4000000 + e * 10 + o).slice(0, 7)}` : null,
        category: 'Billet',
        rsvp: 'ACCEPTED' as const,
        ticketOrderId: order.id,
      }));
      const createdGuests = [];
      for (const data of guests) {
        createdGuests.push(await prisma.guest.create({ data }));
      }

      if (tableId != null && seatIndex != null && livePlan && createdGuests[0]) {
        livePlan = assignSeatOnPlan(livePlan, tableId, seatIndex, createdGuests[0].id);
      }

      sold += qty;
    }

    await prisma.event.update({
      where: { id: eventRow.id },
      data: {
        ticketsSold: sold,
        ...(livePlan ? { tablePlan: livePlan as object } : {}),
      },
    });
  }

  const freePublic = created.filter((ev) => ev.isPublic && !ev.ticketingEnabled);
  for (let f = 0; f < Math.min(8, freePublic.length); f++) {
    const ev = freePublic[f];
    await prisma.guest.create({
      data: {
        eventId: ev.id,
        firstName: pick(FIRST_NAMES, f + 2),
        lastName: pick(LAST_NAMES, f + 4),
        email: `inscrit.${f + 1}@public.seed.cd`,
        category: 'Public',
        rsvp: 'PENDING',
      },
    });
  }

  const events = await prisma.event.count();
  const orders = await prisma.ticketOrder.count({ where: { status: 'PAID' } });
  const ticketGuests = await prisma.guest.count({ where: { ticketOrderId: { not: null } } });
  const zoneEvents = await prisma.event.count({ where: { ticketPricingMode: 'by_zone' } });
  const seatEvents = await prisma.event.count({ where: { seatSelectionEnabled: true } });
  console.log(
    `  → ${events} événements, ${orders} commandes payées, ${ticketGuests} billets, ${zoneEvents} tarifs par zone, ${seatEvents} avec choix de place`,
  );
}
