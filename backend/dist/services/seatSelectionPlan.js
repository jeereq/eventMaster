"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.planTables = planTables;
exports.hiddenSeatIndexSet = hiddenSeatIndexSet;
exports.isSeatHidden = isSeatHidden;
exports.isSeatOccupiedOnPlan = isSeatOccupiedOnPlan;
exports.isPmrSeat = isPmrSeat;
exports.holdKey = holdKey;
exports.isSeatBookable = isSeatBookable;
exports.buildSeatInventoryItems = buildSeatInventoryItems;
const ticketPricingService_ts_1 = require("./ticketPricingService.js");
function planTables(tablePlan) {
    if (!tablePlan || typeof tablePlan !== 'object')
        return [];
    const tables = tablePlan.tables;
    return Array.isArray(tables) ? tables : [];
}
function hiddenSeatIndexSet(table) {
    return new Set((table.hiddenSeatIndices ?? []).filter((index) => Number.isFinite(index)));
}
function isSeatHidden(table, seatIndex) {
    return hiddenSeatIndexSet(table).has(seatIndex);
}
function isSeatOccupiedOnPlan(table, seatIndex) {
    return Boolean(table.seats?.[seatIndex] ?? table.seats?.[String(seatIndex)]);
}
function isPmrSeat(table, seatIndex) {
    if (table.chairMeta?.isPmr || table.chairType === 'WHEELCHAIR')
        return true;
    return Array.isArray(table.pmrSeatIndices) && table.pmrSeatIndices.includes(seatIndex);
}
function holdKey(tableId, seatIndex) {
    return `${tableId}:${seatIndex}`;
}
function isSeatBookable(table, seatIndex, holdKeys = new Set()) {
    if (seatIndex < 0 || seatIndex >= table.capacity)
        return { ok: false, reason: 'invalid' };
    if (isSeatHidden(table, seatIndex))
        return { ok: false, reason: 'hidden' };
    if (isSeatOccupiedOnPlan(table, seatIndex))
        return { ok: false, reason: 'occupied' };
    if (holdKeys.has(holdKey(table.id, seatIndex)))
        return { ok: false, reason: 'held' };
    return { ok: true };
}
function buildSeatInventoryItems(event, tables, holdKeys = new Set()) {
    const seats = [];
    for (const table of tables) {
        const cap = Math.max(0, Number(table.capacity) || 0);
        const hidden = hiddenSeatIndexSet(table);
        for (let i = 0; i < cap; i++) {
            if (hidden.has(i))
                continue;
            const pricing = event
                ? (0, ticketPricingService_ts_1.resolveSeatPrice)(event, table.id, i)
                : { priceFc: 0, pricingZoneId: null, pricingZoneName: null };
            const taken = !isSeatBookable(table, i, holdKeys).ok;
            seats.push({
                tableId: table.id,
                tableName: table.name,
                seatIndex: i,
                x: table.x,
                y: table.y,
                shape: table.shape || 'round',
                capacity: cap,
                available: !taken,
                priceFc: pricing.priceFc,
                pricingZoneId: pricing.pricingZoneId,
                pricingZoneName: pricing.pricingZoneName,
                ...(table.rowMeta ? { rowMeta: table.rowMeta } : {}),
                ...(table.chairMeta ? { chairMeta: table.chairMeta } : {}),
                isPmr: isPmrSeat(table, i),
                seatCode: table.rowMeta?.seatCodes?.[i],
            });
        }
    }
    return seats;
}
