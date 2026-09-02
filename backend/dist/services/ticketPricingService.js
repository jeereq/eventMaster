"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pricingZonesFromPlan = pricingZonesFromPlan;
exports.normalizeTicketPricingMode = normalizeTicketPricingMode;
exports.resolveTablePricingZoneId = resolveTablePricingZoneId;
exports.findPricingZone = findPricingZone;
exports.resolveSeatPrice = resolveSeatPrice;
exports.resolveZoneTicketPrice = resolveZoneTicketPrice;
exports.priceFromFcForEvent = priceFromFcForEvent;
exports.applyAutoZoneAssignment = applyAutoZoneAssignment;
exports.mergePricingZonesIntoTablePlan = mergePricingZonesIntoTablePlan;
function planTables(tablePlan) {
    if (!tablePlan || typeof tablePlan !== 'object')
        return [];
    const tables = tablePlan.tables;
    return Array.isArray(tables) ? tables : [];
}
function pricingZonesFromPlan(tablePlan) {
    if (!tablePlan || typeof tablePlan !== 'object')
        return [];
    const zones = tablePlan.pricingZones;
    if (!Array.isArray(zones))
        return [];
    return zones
        .filter((z) => z && typeof z === 'object' && typeof z.id === 'string')
        .map((z) => ({
        id: String(z.id),
        name: String(z.name || 'Zone'),
        priceFc: Math.max(0, Math.round(Number(z.priceFc) || 0)),
        color: z.color ? String(z.color) : undefined,
        x: z.x != null ? Number(z.x) : undefined,
        y: z.y != null ? Number(z.y) : undefined,
        w: z.w != null ? Number(z.w) : undefined,
        h: z.h != null ? Number(z.h) : undefined,
        maxSeats: z.maxSeats != null ? Math.max(0, Math.round(Number(z.maxSeats))) : undefined,
    }));
}
function normalizeTicketPricingMode(value) {
    return value === 'by_zone' ? 'by_zone' : 'global';
}
function pointInZone(x, y, zone) {
    if (zone.x == null || zone.y == null || zone.w == null || zone.h == null)
        return false;
    return x >= zone.x && x <= zone.x + zone.w && y >= zone.y && y <= zone.y + zone.h;
}
function resolveTablePricingZoneId(table, zones) {
    if (!zones.length)
        return null;
    if (table.pricingZoneId && zones.some((z) => z.id === table.pricingZoneId)) {
        return table.pricingZoneId;
    }
    const tier = table.rowMeta?.tier;
    if (tier != null && Number.isFinite(tier)) {
        const byId = zones.find((z) => z.id === `tier-${tier}`);
        if (byId)
            return byId.id;
        if (zones[tier])
            return zones[tier].id;
    }
    for (const zone of zones) {
        if (pointInZone(table.x, table.y, zone))
            return zone.id;
    }
    return null;
}
function findPricingZone(zones, zoneId) {
    if (!zoneId)
        return null;
    return zones.find((z) => z.id === zoneId) ?? null;
}
function resolveSeatPrice(event, tableId, seatIndex) {
    const mode = normalizeTicketPricingMode(event.ticketPricingMode);
    const fallback = Math.max(0, Math.round(event.ticketPriceFc || 0));
    if (mode !== 'by_zone') {
        return { priceFc: fallback, pricingZoneId: null, pricingZoneName: null };
    }
    const zones = pricingZonesFromPlan(event.tablePlan);
    const table = planTables(event.tablePlan).find((t) => t.id === tableId);
    if (!table) {
        return { priceFc: fallback, pricingZoneId: null, pricingZoneName: null };
    }
    if (seatIndex < 0 || seatIndex >= table.capacity) {
        return { priceFc: fallback, pricingZoneId: null, pricingZoneName: null };
    }
    const zoneId = resolveTablePricingZoneId(table, zones);
    const zone = findPricingZone(zones, zoneId);
    return {
        priceFc: zone ? zone.priceFc : fallback,
        pricingZoneId: zone?.id ?? null,
        pricingZoneName: zone?.name ?? null,
    };
}
function resolveZoneTicketPrice(event, pricingZoneId) {
    const mode = normalizeTicketPricingMode(event.ticketPricingMode);
    const fallback = Math.max(0, Math.round(event.ticketPriceFc || 0));
    if (mode !== 'by_zone') {
        return { priceFc: fallback, pricingZoneId: null, pricingZoneName: null };
    }
    const zone = findPricingZone(pricingZonesFromPlan(event.tablePlan), pricingZoneId);
    if (!zone)
        throw new Error('Zone tarifaire introuvable.');
    return { priceFc: zone.priceFc, pricingZoneId: zone.id, pricingZoneName: zone.name };
}
function priceFromFcForEvent(event) {
    const paid = Boolean(event.ticketingEnabled && (event.ticketPriceFc > 0 || normalizeTicketPricingMode(event.ticketPricingMode) === 'by_zone'));
    if (!paid)
        return null;
    const mode = normalizeTicketPricingMode(event.ticketPricingMode);
    if (mode !== 'by_zone')
        return Math.max(0, event.ticketPriceFc);
    const zones = pricingZonesFromPlan(event.tablePlan);
    const prices = zones.map((z) => z.priceFc).filter((p) => p > 0);
    if (prices.length)
        return Math.min(...prices);
    return Math.max(0, event.ticketPriceFc) || null;
}
/** Applique pricingZoneId sur les tables selon position / rang. */
function applyAutoZoneAssignment(tablePlan, zones) {
    if (!tablePlan || typeof tablePlan !== 'object' || !zones.length)
        return tablePlan;
    const plan = structuredClone(tablePlan);
    if (!Array.isArray(plan.tables))
        return tablePlan;
    plan.pricingZones = zones;
    plan.tables = plan.tables.map((table) => {
        const zoneId = resolveTablePricingZoneId(table, zones);
        return zoneId ? { ...table, pricingZoneId: zoneId } : table;
    });
    return plan;
}
function mergePricingZonesIntoTablePlan(tablePlan, pricingZones) {
    if (!pricingZones?.length)
        return tablePlan;
    const base = tablePlan && typeof tablePlan === 'object'
        ? structuredClone(tablePlan)
        : { tables: [] };
    return applyAutoZoneAssignment(base, pricingZones);
}
