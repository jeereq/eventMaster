import { prisma } from '../db.ts';

const STYLE_REF_CACHE_MS = 5 * 60 * 1000;
let cachedUrls: string[] = [];
let cachedAt = 0;

function extractBgImageUrl(content: unknown): string | null {
  if (!content || typeof content !== 'object' || Array.isArray(content)) return null;
  const global = (content as { global?: Record<string, unknown> }).global;
  if (!global || typeof global !== 'object') return null;
  const url = global.bgImageUrl;
  return typeof url === 'string' && /^https?:\/\//i.test(url.trim()) ? url.trim() : null;
}

/** Deux cartes vitrine EventMaster, uniquement comme goût papier / or / cadre. */
export async function loadEventMasterStyleRefUrls(limit = 2): Promise<string[]> {
  const take = Math.max(1, Math.min(limit, 2));
  if (cachedUrls.length >= take && Date.now() - cachedAt < STYLE_REF_CACHE_MS) {
    return cachedUrls.slice(0, take);
  }
  try {
    const rows = await prisma.template.findMany({
      where: { showOnLanding: true, tenantId: null },
      orderBy: { updatedAt: 'desc' },
      take: 12,
      select: { content: true },
    });
    const urls: string[] = [];
    const seen = new Set<string>();
    for (const row of rows) {
      const url = extractBgImageUrl(row.content);
      if (!url || seen.has(url)) continue;
      seen.add(url);
      urls.push(url);
      if (urls.length >= take) break;
    }
    cachedUrls = urls;
    cachedAt = Date.now();
    return urls;
  } catch (error) {
    console.warn('[invitationStyleRefs] load skipped:', (error as Error)?.message);
    return cachedUrls.slice(0, take);
  }
}
