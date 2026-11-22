import { defaultMarketUnit, type MarketPriceUnit } from './marketPriceStats.ts';

/** Plafond de sécurité : au-delà, la réponse de l’IA est jugée aberrante. */
const MAX_PRICE_FC = 5_000_000_000;
const MAX_SOURCES = 8;

export type ResearchSource = { title: string; url: string };

export type ResearchProposal = {
  slot: string;
  unit: MarketPriceUnit;
  lowFc: number;
  typicalFc: number;
  highFc: number;
  rationale: string;
  sources: ResearchSource[];
};

function toFc(value: unknown, currency: string, usdRate: number): number | null {
  const amount = typeof value === 'number' ? value : Number(String(value ?? '').replace(/[\s ,]/g, ''));
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const fc = currency === 'USD' ? amount * usdRate : amount;
  const rounded = Math.round(fc);
  if (rounded <= 0 || rounded > MAX_PRICE_FC) return null;
  return rounded;
}

export function sanitizeSources(value: unknown): ResearchSource[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const sources: ResearchSource[] = [];
  for (const item of value) {
    const row = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>;
    const url = String(row.url || row.uri || '').trim();
    if (!/^https?:\/\//i.test(url) || url.length > 1000 || seen.has(url)) continue;
    seen.add(url);
    const title = String(row.title || '').trim().slice(0, 200) || new URL(url).hostname;
    sources.push({ title, url });
    if (sources.length >= MAX_SOURCES) break;
  }
  return sources;
}

/**
 * Nettoie la réponse de l’IA : lignes connues seulement, montants positifs convertis en FC,
 * fourchette remise dans l’ordre, au moins une source web par ligne.
 * Les sources trouvées par l’outil de recherche (`fallbackSources`) complètent celles citées par l’IA.
 */
export function sanitizeResearchProposals(
  raw: unknown,
  allowedSlots: string[],
  usdRate: number,
  fallbackSources: ResearchSource[] = [],
): ResearchProposal[] {
  const root = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const items = Array.isArray(root.items) ? root.items : Array.isArray(raw) ? raw : [];
  const allowed = new Set(allowedSlots);
  const seen = new Set<string>();
  const proposals: ResearchProposal[] = [];
  for (const item of items) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    const slot = String(row.slot || '').trim();
    if (!allowed.has(slot) || seen.has(slot)) continue;
    const currency = String(row.currency || 'FC').trim().toUpperCase() === 'USD' ? 'USD' : 'FC';
    const values = [row.lowFc ?? row.low, row.typicalFc ?? row.typical, row.highFc ?? row.high]
      .map((value) => toFc(value, currency, usdRate));
    const known = values.filter((value): value is number => value != null).sort((a, b) => a - b);
    if (!known.length) continue;
    const lowFc = known[0];
    const highFc = known[known.length - 1];
    // Trois montants : on les remet dans l’ordre. Sinon le typique manquant devient le milieu de la fourchette.
    const typicalRaw = values[1];
    const typicalFc = known.length === 3
      ? known[1]
      : typicalRaw != null && typicalRaw >= lowFc && typicalRaw <= highFc
        ? typicalRaw
        : Math.round((lowFc + highFc) / 2);
    const unitRaw = String(row.unit || '').trim().toUpperCase();
    const unit: MarketPriceUnit = unitRaw === 'PERSON' || unitRaw === 'EVENT' ? unitRaw : defaultMarketUnit(slot);
    const sources = sanitizeSources(row.sources);
    const merged = sources.length ? sources : fallbackSources.slice(0, 3);
    if (!merged.length) continue;
    seen.add(slot);
    proposals.push({
      slot,
      unit,
      lowFc,
      typicalFc,
      highFc,
      rationale: String(row.rationale || row.note || '').trim().slice(0, 800),
      sources: merged,
    });
  }
  return proposals;
}

const FACEBOOK_HOST = /(^|\.)(facebook\.com|fb\.com|fb\.me)$/i;

/** Pour une recherche Facebook, ne garde que les liens vers facebook.com (ou un titre qui le cite, pour les liens de redirection de la recherche). */
export function keepFacebookSources(sources: ResearchSource[]): ResearchSource[] {
  return sources.filter((source) => {
    let host = '';
    try {
      host = new URL(source.url).hostname;
    } catch {
      return false;
    }
    if (FACEBOOK_HOST.test(host)) return true;
    // Les sources de la recherche Google passent par un lien de redirection : on se fie alors au titre (le domaine).
    return host === 'vertexaisearch.cloud.google.com' && /facebook/i.test(source.title);
  });
}
