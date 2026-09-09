"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveLedgerAction = resolveLedgerAction;
exports.parseUtcDayStart = parseUtcDayStart;
exports.parseUtcDayEnd = parseUtcDayEnd;
exports.utcDayKey = utcDayKey;
exports.bucketLedgerByUtcDay = bucketLedgerByUtcDay;
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
function resolveLedgerAction(action) {
    return action || 'budget_simulation';
}
function parseUtcDayStart(value) {
    const raw = value.trim();
    if (!raw)
        return undefined;
    const d = ISO_DAY.test(raw) ? new Date(`${raw}T00:00:00.000Z`) : new Date(raw);
    return Number.isNaN(d.getTime()) ? undefined : d;
}
function parseUtcDayEnd(value) {
    const raw = value.trim();
    if (!raw)
        return undefined;
    const d = ISO_DAY.test(raw) ? new Date(`${raw}T23:59:59.999Z`) : new Date(raw);
    return Number.isNaN(d.getTime()) ? undefined : d;
}
function utcDayKey(value) {
    return value.toISOString().slice(0, 10);
}
function bucketLedgerByUtcDay(rows) {
    const map = new Map();
    for (const row of rows) {
        const day = utcDayKey(row.createdAt);
        const current = map.get(day) || { consumed: 0, credited: 0, moves: 0 };
        current.moves += 1;
        if (row.tokensDelta < 0)
            current.consumed += -row.tokensDelta;
        if (row.tokensDelta > 0)
            current.credited += row.tokensDelta;
        map.set(day, current);
    }
    return [...map.entries()]
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([day, values]) => ({ day, ...values }));
}
