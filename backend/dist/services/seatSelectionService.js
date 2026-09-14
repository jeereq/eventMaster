"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.purgeExpiredSeatHolds = purgeExpiredSeatHolds;
exports.listSeatInventory = listSeatInventory;
exports.assertSeatsAvailable = assertSeatsAvailable;
exports.assertSeatAvailable = assertSeatAvailable;
exports.checkSeatsAvailability = checkSeatsAvailability;
exports.createSeatHold = createSeatHold;
exports.createMultipleSeatHolds = createMultipleSeatHolds;
exports.assignSeatInTablePlan = assignSeatInTablePlan;
exports.assignMultipleSeatsInTablePlan = assignMultipleSeatsInTablePlan;
const db_1 = require("../db");
const prismaJson_1 = require("../utils/prismaJson");
const seatSelectionPlan_1 = require("./seatSelectionPlan");
const HOLD_TTL_MS = 10 * 60 * 1000;
async function purgeExpiredSeatHolds(eventId) {
    await db_1.prisma.seatHold.deleteMany({
        where: {
            expiresAt: { lt: new Date() },
            ...(eventId ? { eventId } : {}),
        },
    });
}
async function listSeatInventory(eventId) {
    await purgeExpiredSeatHolds(eventId);
    const event = await db_1.prisma.event.findUnique({
        where: { id: eventId },
        select: {
            tablePlan: true,
            ticketPricingMode: true,
            ticketPriceFc: true,
            room: { select: { layoutBlueprint: true, roomType: true } },
        },
    });
    const plan = event?.tablePlan;
    const tables = (0, seatSelectionPlan_1.planTables)(plan);
    const holds = await db_1.prisma.seatHold.findMany({
        where: { eventId, expiresAt: { gt: new Date() } },
        select: { tableId: true, seatIndex: true },
    });
    const holdKeys = new Set(holds.map((h) => (0, seatSelectionPlan_1.holdKey)(h.tableId, h.seatIndex)));
    const seats = (0, seatSelectionPlan_1.buildSeatInventoryItems)(event
        ? {
            ticketPricingMode: event.ticketPricingMode,
            ticketPriceFc: event.ticketPriceFc,
            tablePlan: event.tablePlan,
        }
        : null, tables, holdKeys);
    return {
        seats,
        fixtures: plan?.fixtures ?? [],
        roomOutline: plan?.roomOutline ?? null,
        roomThemeId: plan?.roomThemeId ?? null,
        floorType: plan?.floorType ?? null,
        floorImageUrl: plan?.floorImageUrl ?? null,
        depthAmount: typeof plan?.depthAmount === 'number' ? plan.depthAmount : 0,
        pricingZones: Array.isArray(plan?.pricingZones) ? plan?.pricingZones : [],
        roomLayoutBlueprint: event?.room?.layoutBlueprint ?? null,
        roomType: event?.room?.roomType ?? null,
    };
}
async function assertSeatsAvailable(eventId, seats) {
    await purgeExpiredSeatHolds(eventId);
    const event = await db_1.prisma.event.findUnique({
        where: { id: eventId },
        select: { tablePlan: true, seatSelectionEnabled: true },
    });
    if (!event?.seatSelectionEnabled) {
        throw new Error('La sélection de siège n’est pas activée pour cet événement.');
    }
    const tables = (0, seatSelectionPlan_1.planTables)(event.tablePlan);
    const tableById = new Map(tables.map((table) => [table.id, table]));
    const holds = await db_1.prisma.seatHold.findMany({
        where: { eventId, expiresAt: { gt: new Date() } },
        select: { tableId: true, seatIndex: true },
    });
    const holdKeys = new Set(holds.map((h) => (0, seatSelectionPlan_1.holdKey)(h.tableId, h.seatIndex)));
    const seen = new Set();
    for (const seat of seats) {
        const key = (0, seatSelectionPlan_1.holdKey)(seat.tableId, seat.seatIndex);
        if (seen.has(key)) {
            throw new Error('Le même siège a été demandé plusieurs fois.');
        }
        seen.add(key);
        const table = tableById.get(seat.tableId);
        if (!table)
            throw new Error('Table introuvable sur le plan.');
        const bookable = (0, seatSelectionPlan_1.isSeatBookable)(table, seat.seatIndex, holdKeys);
        if (!bookable.ok) {
            if (bookable.reason === 'invalid' || bookable.reason === 'hidden') {
                throw new Error('Siège invalide.');
            }
            throw new Error(`Le siège n°${seat.seatIndex + 1} à la table « ${table.name || seat.tableId} » est déjà réservé.`);
        }
    }
    return tables;
}
async function assertSeatAvailable(eventId, tableId, seatIndex) {
    const tables = await assertSeatsAvailable(eventId, [{ tableId, seatIndex }]);
    const table = tables.find((item) => item.id === tableId);
    if (!table)
        throw new Error('Table introuvable sur le plan.');
    return table;
}
async function checkSeatsAvailability(eventId, seats) {
    await purgeExpiredSeatHolds(eventId);
    const event = await db_1.prisma.event.findUnique({
        where: { id: eventId },
        select: { tablePlan: true },
    });
    const tables = (0, seatSelectionPlan_1.planTables)(event?.tablePlan);
    const holds = await db_1.prisma.seatHold.findMany({
        where: { eventId, expiresAt: { gt: new Date() } },
        select: { tableId: true, seatIndex: true },
    });
    const holdKeys = new Set(holds.map((h) => (0, seatSelectionPlan_1.holdKey)(h.tableId, h.seatIndex)));
    const unavailable = [];
    for (const s of seats) {
        const table = tables.find((t) => t.id === s.tableId);
        if (!table || !(0, seatSelectionPlan_1.isSeatBookable)(table, s.seatIndex, holdKeys).ok) {
            unavailable.push({ tableId: s.tableId, seatIndex: s.seatIndex, tableName: table?.name });
        }
    }
    return {
        allAvailable: unavailable.length === 0,
        unavailable,
    };
}
async function createSeatHold(opts) {
    await createMultipleSeatHolds({
        eventId: opts.eventId,
        seats: [{ tableId: opts.tableId, seatIndex: opts.seatIndex }],
        buyerEmail: opts.buyerEmail,
        orderId: opts.orderId,
    });
    return db_1.prisma.seatHold.findUnique({
        where: {
            eventId_tableId_seatIndex: {
                eventId: opts.eventId,
                tableId: opts.tableId,
                seatIndex: opts.seatIndex,
            },
        },
    });
}
async function createMultipleSeatHolds(opts) {
    if (opts.seats.length === 0)
        return;
    await assertSeatsAvailable(opts.eventId, opts.seats);
    const expiresAt = new Date(Date.now() + HOLD_TTL_MS);
    await db_1.prisma.seatHold.deleteMany({
        where: {
            eventId: opts.eventId,
            expiresAt: { lt: new Date() },
            OR: opts.seats.map((seat) => ({ tableId: seat.tableId, seatIndex: seat.seatIndex })),
        },
    });
    await db_1.prisma.seatHold.createMany({
        data: opts.seats.map((seat) => ({
            eventId: opts.eventId,
            tableId: seat.tableId,
            seatIndex: seat.seatIndex,
            buyerEmail: opts.buyerEmail,
            orderId: opts.orderId,
            expiresAt,
        })),
    });
}
/** Assigne le siège dans tablePlan JSON et libère le hold. */
async function assignSeatInTablePlan(eventId, tableId, seatIndex, guestId) {
    const event = await db_1.prisma.event.findUnique({
        where: { id: eventId },
        select: { tablePlan: true },
    });
    const plan = (event?.tablePlan && typeof event.tablePlan === 'object'
        ? structuredClone(event.tablePlan)
        : { tables: [] });
    const table = plan.tables.find((t) => t.id === tableId);
    if (!table)
        throw new Error('Table introuvable pour assignation.');
    if (!table.seats)
        table.seats = {};
    const current = table.seats[seatIndex] ?? table.seats[String(seatIndex)];
    if (current && current !== guestId) {
        throw new Error('Siège déjà assigné.');
    }
    table.seats[seatIndex] = guestId;
    await db_1.prisma.event.update({
        where: { id: eventId },
        data: { tablePlan: (0, prismaJson_1.toPrismaJson)(plan) },
    });
    await db_1.prisma.seatHold.deleteMany({
        where: { eventId, tableId, seatIndex },
    });
}
/** Assigne plusieurs sièges dans tablePlan JSON et libère les holds. */
async function assignMultipleSeatsInTablePlan(eventId, assignments) {
    if (assignments.length === 0)
        return;
    const event = await db_1.prisma.event.findUnique({
        where: { id: eventId },
        select: { tablePlan: true },
    });
    const plan = (event?.tablePlan && typeof event.tablePlan === 'object'
        ? structuredClone(event.tablePlan)
        : { tables: [] });
    for (const a of assignments) {
        const table = plan.tables.find((t) => t.id === a.tableId);
        if (!table)
            continue;
        if (!table.seats)
            table.seats = {};
        table.seats[a.seatIndex] = a.guestId;
    }
    await db_1.prisma.event.update({
        where: { id: eventId },
        data: { tablePlan: (0, prismaJson_1.toPrismaJson)(plan) },
    });
    for (const a of assignments) {
        await db_1.prisma.seatHold.deleteMany({
            where: { eventId, tableId: a.tableId, seatIndex: a.seatIndex },
        });
    }
}
