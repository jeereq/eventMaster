"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadEventMasterStyleRefUrls = loadEventMasterStyleRefUrls;
const db_ts_1 = require("../db.js");
const STYLE_REF_CACHE_MS = 5 * 60 * 1000;
let cachedUrls = [];
let cachedAt = 0;
function extractBgImageUrl(content) {
    if (!content || typeof content !== 'object' || Array.isArray(content))
        return null;
    const global = content.global;
    if (!global || typeof global !== 'object')
        return null;
    const url = global.bgImageUrl;
    return typeof url === 'string' && /^https?:\/\//i.test(url.trim()) ? url.trim() : null;
}
/** Deux cartes vitrine EventMaster, uniquement comme goût papier / or / cadre. */
async function loadEventMasterStyleRefUrls(limit = 2) {
    const take = Math.max(1, Math.min(limit, 2));
    if (cachedUrls.length >= take && Date.now() - cachedAt < STYLE_REF_CACHE_MS) {
        return cachedUrls.slice(0, take);
    }
    try {
        const rows = await db_ts_1.prisma.template.findMany({
            where: { showOnLanding: true, tenantId: null },
            orderBy: { updatedAt: 'desc' },
            take: 12,
            select: { content: true },
        });
        const urls = [];
        const seen = new Set();
        for (const row of rows) {
            const url = extractBgImageUrl(row.content);
            if (!url || seen.has(url))
                continue;
            seen.add(url);
            urls.push(url);
            if (urls.length >= take)
                break;
        }
        cachedUrls = urls;
        cachedAt = Date.now();
        return urls;
    }
    catch (error) {
        console.warn('[invitationStyleRefs] load skipped:', error?.message);
        return cachedUrls.slice(0, take);
    }
}
