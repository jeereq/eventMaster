import { prisma } from '../db';
import { toPrismaJson } from '../utils/prismaJson';
import {
  buildSeatInventoryItems,
  holdKey,
  isSeatBookable,
  planTables,
  type PlanTable,
  type SeatInventoryItem,
} from './seatSelectionPlan';

const HOLD_TTL_MS = 10 * 60 * 1000;

export type { SeatInventoryItem } from './seatSelectionPlan';

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
  pricingZones: unknown[];
  roomLayoutBlueprint: unknown;
  roomType: string | null;
}> {
  await purgeExpiredSeatHolds(eventId);
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      tablePlan: true,
      ticketPricingMode: true,
      ticketPriceFc: true,
      room: { select: { layoutBlueprint: true, roomType: true } },
    },
  });
  const plan = event?.tablePlan as Record<string, unknown> | null;
  const tables = planTables(plan);
  const holds = await prisma.seatHold.findMany({
    where: { eventId, expiresAt: { gt: new Date() } },
    select: { tableId: true, seatIndex: true },
  });
  const holdKeys = new Set(holds.map((h) => holdKey(h.tableId, h.seatIndex)));
  const seats = buildSeatInventoryItems(
    event
      ? {
          ticketPricingMode: event.ticketPricingMode,
          ticketPriceFc: event.ticketPriceFc,
          tablePlan: event.tablePlan,
        }
      : null,
    tables,
    holdKeys,
  );

  return {
    seats,
    fixtures: plan?.fixtures ?? [],
    roomOutline: plan?.roomOutline ?? null,
    roomThemeId: (plan?.roomThemeId as string) ?? null,
    floorType: (plan?.floorType as string) ?? null,
    floorImageUrl: (plan?.floorImageUrl as string) ?? null,
    depthAmount: typeof plan?.depthAmount === 'number' ? plan.depthAmount : 0,
    pricingZones: Array.isArray(plan?.pricingZones) ? (plan?.pricingZones as unknown[]) : [],
    roomLayoutBlueprint: event?.room?.layoutBlueprint ?? null,
    roomType: event?.room?.roomType ?? null,
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
  const holds = await prisma.seatHold.findMany({
    where: { eventId, expiresAt: { gt: new Date() } },
    select: { tableId: true, seatIndex: true },
  });
  const holdKeys = new Set(holds.map((h) => holdKey(h.tableId, h.seatIndex)));
  const bookable = isSeatBookable(table, seatIndex, holdKeys);
  if (!bookable.ok) {
    if (bookable.reason === 'invalid' || bookable.reason === 'hidden') {
      throw new Error('Siège invalide.');
    }
    throw new Error(`Le siège n°${seatIndex + 1} à la table « ${table.name || tableId} » est déjà réservé.`);
  }
  return table;
}

export async function checkSeatsAvailability(
  eventId: string,
  seats: Array<{ tableId: string; seatIndex: number }>,
): Promise<{
  allAvailable: boolean;
  unavailable: Array<{ tableId: string; seatIndex: number; tableName?: string }>;
}> {
  await purgeExpiredSeatHolds(eventId);
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { tablePlan: true },
  });
  const tables = planTables(event?.tablePlan);
  const holds = await prisma.seatHold.findMany({
    where: { eventId, expiresAt: { gt: new Date() } },
    select: { tableId: true, seatIndex: true },
  });
  const holdKeys = new Set(holds.map((h) => holdKey(h.tableId, h.seatIndex)));
  const unavailable: Array<{ tableId: string; seatIndex: number; tableName?: string }> = [];

  for (const s of seats) {
    const table = tables.find((t) => t.id === s.tableId);
    if (!table || !isSeatBookable(table, s.seatIndex, holdKeys).ok) {
      unavailable.push({ tableId: s.tableId, seatIndex: s.seatIndex, tableName: table?.name });
    }
  }

  return {
    allAvailable: unavailable.length === 0,
    unavailable,
  };
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
