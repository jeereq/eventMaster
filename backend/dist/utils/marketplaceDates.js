"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toDateKey = toDateKey;
exports.parseDateKey = parseDateKey;
exports.eachDateKey = eachDateKey;
exports.parseBlockedDates = parseBlockedDates;
exports.mergeBlockedDate = mergeBlockedDate;
exports.mergeBlockedDates = mergeBlockedDates;
exports.bookingOccupiedKeys = bookingOccupiedKeys;
exports.collectUnavailableDates = collectUnavailableDates;
exports.isRangeAvailable = isRangeAvailable;
exports.haversineKm = haversineKm;
function toDateKey(value) {
    const raw = typeof value === 'string' ? value : value.toISOString();
    const match = raw.match(/^(\d{4}-\d{2}-\d{2})/);
    return match ? match[1] : null;
}
function parseDateKey(value) {
    const key = typeof value === 'string' ? toDateKey(value) : null;
    if (!key)
        return null;
    const date = new Date(`${key}T12:00:00.000Z`);
    return Number.isNaN(date.getTime()) ? null : date;
}
function eachDateKey(from, to) {
    const start = from <= to ? from : to;
    const end = from <= to ? to : from;
    const match = start.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    const endMatch = end.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match || !endMatch)
        return [];
    const keys = [];
    const cursor = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
    const last = new Date(Date.UTC(Number(endMatch[1]), Number(endMatch[2]) - 1, Number(endMatch[3])));
    while (cursor.getTime() <= last.getTime() && keys.length < 366) {
        keys.push(cursor.toISOString().slice(0, 10));
        cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    return keys;
}
function parseBlockedDates(input) {
    if (!Array.isArray(input))
        return [];
    const keys = new Set();
    for (const item of input) {
        const key = toDateKey(String(item));
        if (key)
            keys.add(key);
    }
    return [...keys].sort();
}
function mergeBlockedDate(existing, extra) {
    return parseBlockedDates([...(parseBlockedDates(existing)), extra]);
}
function mergeBlockedDates(existing, extras) {
    return parseBlockedDates([...(parseBlockedDates(existing)), ...extras]);
}
function bookingOccupiedKeys(booking) {
    const start = toDateKey(booking.eventDate);
    if (!start)
        return [];
    const end = toDateKey(booking.eventEndDate || booking.eventDate) || start;
    return eachDateKey(start, end);
}
function collectUnavailableDates(blocked, bookings) {
    const fromBookings = (bookings || []).flatMap(bookingOccupiedKeys);
    return parseBlockedDates([...(parseBlockedDates(blocked)), ...fromBookings]);
}
function isRangeAvailable(unavailable, from, to) {
    const keys = eachDateKey(from, to);
    if (!keys.length)
        return false;
    const blocked = new Set(unavailable);
    return keys.every((key) => !blocked.has(key));
}
function haversineKm(lat1, lon1, lat2, lon2) {
    const toRad = (deg) => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(a)));
}
