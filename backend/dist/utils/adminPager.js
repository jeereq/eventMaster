"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminPager = adminPager;
exports.adminSearch = adminSearch;
exports.adminQueryString = adminQueryString;
exports.listPayload = listPayload;
exports.prismaAnd = prismaAnd;
function adminPager(req, defaultSize = 20) {
    const page = Math.max(parseInt(String(req.query.page || '1'), 10) || 1, 1);
    const pageSize = Math.min(Math.max(parseInt(String(req.query.limit || defaultSize), 10) || defaultSize, 1), 100);
    return { page, pageSize, skip: (page - 1) * pageSize };
}
function adminSearch(req) {
    return typeof req.query.q === 'string' && req.query.q.trim() ? req.query.q.trim() : undefined;
}
function adminQueryString(req, key) {
    const raw = req.query[key];
    return typeof raw === 'string' && raw.trim() && raw !== 'ALL' ? raw.trim() : undefined;
}
function listPayload(items, total, page, pageSize) {
    return {
        items,
        total,
        page,
        pageSize,
        hasMore: page * pageSize < total,
    };
}
/** Empile des clauses AND sans écraser un OR déjà posé (recherche + filtre licence / GPS). */
function prismaAnd(where, clause) {
    const prev = where.AND;
    const list = Array.isArray(prev) ? [...prev] : prev ? [prev] : [];
    list.push(clause);
    where.AND = list;
}
