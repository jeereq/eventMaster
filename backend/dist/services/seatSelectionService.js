"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.purgeExpiredSeatHolds = purgeExpiredSeatHolds;
exports.listSeatInventory = listSeatInventory;
exports.assertSeatAvailable = assertSeatAvailable;
exports.createSeatHold = createSeatHold;
exports.assignSeatInTablePlan = assignSeatInTablePlan;
const db_1 = require("../db");
const prismaJson_1 = require("../utils/prismaJson");
const ticketPricingService_1 = require("./ticketPricingService");
const HOLD_TTL_MS = 10 * 60 * 1000;
function planTables(tablePlan) {
    if (!tablePlan || typeof tablePlan !== 'object')
        return [];
    const tables = tablePlan.tables;
    return Array.isArray(tables) ? tables : [];
}
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
        select: { tablePlan: true, ticketPricingMode: true, ticketPriceFc: true },
    });
    const plan = event?.tablePlan;
    const tables = planTables(plan);
    const holds = await db_1.prisma.seatHold.findMany({
        where: { eventId, expiresAt: { gt: new Date() } },
        select: { tableId: true, seatIndex: true },
    });
    const holdKeys = new Set(holds.map((h) => `${h.tableId}:${h.seatIndex}`));
    const seats = [];
    for (const table of tables) {
        const cap = Math.max(0, Number(table.capacity) || 0);
        for (let i = 0; i < cap; i++) {
            const taken = Boolean(table.seats?.[i] ?? table.seats?.[String(i)]);
            const held = holdKeys.has(`${table.id}:${i}`);
            const pricing = event
                ? (0, ticketPricingService_1.resolveSeatPrice)({
                    ticketPricingMode: event.ticketPricingMode,
                    ticketPriceFc: event.ticketPriceFc,
                    tablePlan: event.tablePlan,
                }, table.id, i)
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
        roomThemeId: plan?.roomThemeId ?? null,
        floorType: plan?.floorType ?? null,
        floorImageUrl: plan?.floorImageUrl ?? null,
        depthAmount: typeof plan?.depthAmount === 'number' ? plan.depthAmount : 0,
    };
}
async function assertSeatAvailable(eventId, tableId, seatIndex) {
    await purgeExpiredSeatHolds(eventId);
    const event = await db_1.prisma.event.findUnique({
        where: { id: eventId },
        select: { tablePlan: true, seatSelectionEnabled: true },
    });
    if (!event?.seatSelectionEnabled) {
        throw new Error('La sélection de siège n’est pas activée pour cet événement.');
    }
    const table = planTables(event.tablePlan).find((t) => t.id === tableId);
    if (!table)
        throw new Error('Table introuvable sur le plan.');
    if (seatIndex < 0 || seatIndex >= table.capacity)
        throw new Error('Siège invalide.');
    const occupied = Boolean(table.seats?.[seatIndex] ?? table.seats?.[String(seatIndex)]);
    if (occupied)
        throw new Error('Ce siège est déjà occupé.');
    const hold = await db_1.prisma.seatHold.findUnique({
        where: { eventId_tableId_seatIndex: { eventId, tableId, seatIndex } },
    });
    if (hold && hold.expiresAt > new Date()) {
        throw new Error('Ce siège est temporairement réservé par un autre acheteur.');
    }
    return table;
}
async function createSeatHold(opts) {
    await assertSeatAvailable(opts.eventId, opts.tableId, opts.seatIndex);
    const expiresAt = new Date(Date.now() + HOLD_TTL_MS);
    // Nettoyer un hold expiré sur la même clé
    await db_1.prisma.seatHold.deleteMany({
        where: {
            eventId: opts.eventId,
            tableId: opts.tableId,
            seatIndex: opts.seatIndex,
            expiresAt: { lt: new Date() },
        },
    });
    return db_1.prisma.seatHold.create({
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
