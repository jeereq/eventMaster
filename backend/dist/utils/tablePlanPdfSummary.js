"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractTablePlanSummaryForPdf = extractTablePlanSummaryForPdf;
function extractTablePlanSummaryForPdf(tablePlan, guestId) {
    if (!tablePlan || typeof tablePlan !== 'object')
        return null;
    const plan = tablePlan;
    if (!Array.isArray(plan.tables) || plan.tables.length === 0)
        return null;
    let guestTableId = null;
    const tables = plan.tables.map((table) => {
        const seats = table.seats || {};
        const occupiedCount = Object.values(seats).filter(Boolean).length;
        const isGuestTable = Object.values(seats).includes(guestId);
        if (isGuestTable)
            guestTableId = table.id;
        return {
            name: table.name || `Table ${table.id.slice(0, 6)}`,
            isGuestTable,
            occupiedCount,
            capacity: table.capacity ?? occupiedCount,
        };
    });
    return { tables, guestTableId };
}
