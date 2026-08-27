import { prisma } from '../db';
import { toPrismaJson } from '../utils/prismaJson';
import { resolveSeatPrice } from './ticketPricingService';

const HOLD_TTL_MS = 10 * 60 * 1000;

export type SeatInventoryItem = {
  tableId: string;
  tableName: string;
  seatIndex: number;
  x: number;
  y: number;
  shape: string;
  capacity: number;
  available: boolean;
  priceFc: number;
  pricingZoneId: string | null;
  pricingZoneName: string | null;
};

type PlanTable = {
  id: string;
  name: string;
  shape?: string;
  capacity: number;
  x: number;
  y: number;
  seats?: Record<string | number, string | null>;
};

function planTables(tablePlan: unknown): PlanTable[] {
  if (!tablePlan || typeof tablePlan !== 'object') return [];
  const tables = (tablePlan as { tables?: PlanTable[] }).tables;
  return Array.isArray(tables) ? tables : [];
}

export async function purgeExpiredSeatHolds(eventId?: string) {
  await prisma.seatHold.deleteMany({
    where: {
      expiresAt: { lt: new Date() },
      ...(eventId ? { eventId } : {}),
    },
  });
}

export async function listSeatInventory(eventId: string): Promise<{
  seats: SeatInventoryItem[];
  fixtures: unknown;
  roomOutline: unknown;
  roomThemeId: string | null;
  floorType: string | null;
  floorImageUrl: string | null;
  depthAmount: number;
}> {
  await purgeExpiredSeatHolds(eventId);
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { tablePlan: true, ticketPricingMode: true, ticketPriceFc: true },
  });
  const plan = event?.tablePlan as Record<string, unknown> | null;
  const tables = planTables(plan);
  const holds = await prisma.seatHold.findMany({
    where: { eventId, expiresAt: { gt: new Date() } },
    select: { tableId: true, seatIndex: true },
  });
  const holdKeys = new Set(holds.map((h) => `${h.tableId}:${h.seatIndex}`));

  const seats: SeatInventoryItem[] = [];
  for (const table of tables) {
    const cap = Math.max(0, Number(table.capacity) || 0);
    for (let i = 0; i < cap; i++) {
      const taken = Boolean(table.seats?.[i] ?? table.seats?.[String(i)]);
      const held = holdKeys.has(`${table.id}:${i}`);
      const pricing = event
        ? resolveSeatPrice(
            {
              ticketPricingMode: event.ticketPricingMode,
              ticketPriceFc: event.ticketPriceFc,
              tablePlan: event.tablePlan,
            },
            table.id,
            i,
          )
        : { priceFc: 0, pricingZoneId: null, pricingZoneName: null };
      seats.push({
        tableId: table.id,
        tableName: table.name,
        seatIndex: i,
        x: table.x,
        y: table.y,
        shape: table.shape || 'round',
        capacity: cap,
        available: !taken && !held,
        priceFc: pricing.priceFc,
        pricingZoneId: pricing.pricingZoneId,
        pricingZoneName: pricing.pricingZoneName,
      });
    }
  }

  return {
    seats,
    fixtures: plan?.fixtures ?? [],
    roomOutline: plan?.roomOutline ?? null,
    roomThemeId: (plan?.roomThemeId as string) ?? null,
    floorType: (plan?.floorType as string) ?? null,
    floorImageUrl: (plan?.floorImageUrl as string) ?? null,
    depthAmount: typeof plan?.depthAmount === 'number' ? plan.depthAmount : 0,
  };
}

export async function assertSeatAvailable(eventId: string, tableId: string, seatIndex: number) {
  await purgeExpiredSeatHolds(eventId);
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { tablePlan: true, seatSelectionEnabled: true },
  });
  if (!event?.seatSelectionEnabled) {
    throw new Error('La sélection de siège n’est pas activée pour cet événement.');
  }
  const table = planTables(event.tablePlan).find((t) => t.id === tableId);
  if (!table) throw new Error('Table introuvable sur le plan.');
  if (seatIndex < 0 || seatIndex >= table.capacity) throw new Error('Siège invalide.');
  const occupied = Boolean(table.seats?.[seatIndex] ?? table.seats?.[String(seatIndex)]);
  if (occupied) throw new Error('Ce siège est déjà occupé.');
  const hold = await prisma.seatHold.findUnique({
    where: { eventId_tableId_seatIndex: { eventId, tableId, seatIndex } },
  });
  if (hold && hold.expiresAt > new Date()) {
    throw new Error('Ce siège est temporairement réservé par un autre acheteur.');
  }
  return table;
}

export async function createSeatHold(opts: {
  eventId: string;
  tableId: string;
  seatIndex: number;
  buyerEmail: string;
  orderId: string;
}) {
  await assertSeatAvailable(opts.eventId, opts.tableId, opts.seatIndex);
  const expiresAt = new Date(Date.now() + HOLD_TTL_MS);
  // Nettoyer un hold expiré sur la même clé
  await prisma.seatHold.deleteMany({
    where: {
      eventId: opts.eventId,
      tableId: opts.tableId,
      seatIndex: opts.seatIndex,
      expiresAt: { lt: new Date() },
    },
  });
  return prisma.seatHold.create({
    data: {
      eventId: opts.eventId,
      tableId: opts.tableId,
      seatIndex: opts.seatIndex,
      buyerEmail: opts.buyerEmail,
      orderId: opts.orderId,
      expiresAt,
    },
  });
}

export async function createMultipleSeatHolds(opts: {
  eventId: string;
  seats: Array<{ tableId: string; seatIndex: number }>;
  buyerEmail: string;
  orderId: string;
}) {
  await purgeExpiredSeatHolds(opts.eventId);
  for (const s of opts.seats) {
    await assertSeatAvailable(opts.eventId, s.tableId, s.seatIndex);
  }
  const expiresAt = new Date(Date.now() + HOLD_TTL_MS);
  for (const s of opts.seats) {
    await prisma.seatHold.deleteMany({
      where: {
        eventId: opts.eventId,
        tableId: s.tableId,
        seatIndex: s.seatIndex,
        expiresAt: { lt: new Date() },
      },
    });
    await prisma.seatHold.create({
      data: {
        eventId: opts.eventId,
        tableId: s.tableId,
        seatIndex: s.seatIndex,
        buyerEmail: opts.buyerEmail,
        orderId: opts.orderId,
        expiresAt,
      },
    });
  }
}

/** Assigne le siège dans tablePlan JSON et libère le hold. */
export async function assignSeatInTablePlan(
  eventId: string,
  tableId: string,
  seatIndex: number,
  guestId: string,
) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { tablePlan: true },
  });
  const plan = (event?.tablePlan && typeof event.tablePlan === 'object'
    ? structuredClone(event.tablePlan)
    : { tables: [] }) as { tables: PlanTable[] };
  const table = plan.tables.find((t) => t.id === tableId);
  if (!table) throw new Error('Table introuvable pour assignation.');
  if (!table.seats) table.seats = {};
  const current = table.seats[seatIndex] ?? table.seats[String(seatIndex)];
  if (current && current !== guestId) {
    throw new Error('Siège déjà assigné.');
  }
  table.seats[seatIndex] = guestId;
  await prisma.event.update({
    where: { id: eventId },
    data: { tablePlan: toPrismaJson(plan) },
  });
  await prisma.seatHold.deleteMany({
    where: { eventId, tableId, seatIndex },
  });
}

/** Assigne plusieurs sièges dans tablePlan JSON et libère les holds. */
export async function assignMultipleSeatsInTablePlan(
  eventId: string,
  assignments: Array<{ tableId: string; seatIndex: number; guestId: string }>,
) {
  if (assignments.length === 0) return;
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { tablePlan: true },
  });
  const plan = (event?.tablePlan && typeof event.tablePlan === 'object'
    ? structuredClone(event.tablePlan)
    : { tables: [] }) as { tables: PlanTable[] };

  for (const a of assignments) {
    const table = plan.tables.find((t) => t.id === a.tableId);
    if (!table) continue;
    if (!table.seats) table.seats = {};
    table.seats[a.seatIndex] = a.guestId;
  }

  await prisma.event.update({
    where: { id: eventId },
    data: { tablePlan: toPrismaJson(plan) },
  });

  for (const a of assignments) {
    await prisma.seatHold.deleteMany({
      where: { eventId, tableId: a.tableId, seatIndex: a.seatIndex },
    });
  }
}
