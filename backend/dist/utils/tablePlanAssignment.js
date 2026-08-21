"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractGuestAssignments = extractGuestAssignments;
exports.findAssignmentChanges = findAssignmentChanges;
exports.getTableMateGuestIds = getTableMateGuestIds;
function parseTablePlan(tablePlan) {
    if (!tablePlan || typeof tablePlan !== 'object')
        return null;
    return tablePlan;
}
/** Extrait les assignations invité → table/siège depuis un plan de table. */
function extractGuestAssignments(tablePlan) {
    const plan = parseTablePlan(tablePlan);
    const map = new Map();
    if (!plan?.tables)
        return map;
    for (const table of plan.tables) {
        const seats = table.seats || {};
        for (const [seatKey, guestId] of Object.entries(seats)) {
            if (!guestId)
                continue;
            map.set(guestId, {
                tableId: table.id,
                tableName: table.name || `Table ${table.id.slice(0, 6)}`,
                seatIndex: parseInt(seatKey, 10),
            });
        }
    }
    return map;
}
/** Invités nouvellement assignés ou déplacés (table ou siège modifié). */
function findAssignmentChanges(oldPlan, newPlan) {
    const oldMap = extractGuestAssignments(oldPlan);
    const newMap = extractGuestAssignments(newPlan);
    const toNotify = [];
    for (const [guestId, newAssign] of newMap) {
        const oldAssign = oldMap.get(guestId);
        if (!oldAssign
            || oldAssign.tableId !== newAssign.tableId
            || oldAssign.seatIndex !== newAssign.seatIndex) {
            toNotify.push(guestId);
        }
    }
    return toNotify;
}
/** IDs des autres invités à la même table. */
function getTableMateGuestIds(tablePlan, guestId) {
    const plan = parseTablePlan(tablePlan);
    if (!plan?.tables)
        return [];
    for (const table of plan.tables) {
        const seats = table.seats || {};
        const guestIds = Object.values(seats).filter((id) => Boolean(id));
        if (guestIds.includes(guestId)) {
            return guestIds.filter((id) => id !== guestId);
        }
    }
    return [];
}
