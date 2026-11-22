import { defaultMarketUnit, type MarketPriceUnit } from './marketPriceStats.ts';
import { isOpenAiStudioModel } from './aiStudioModels.ts';

export type ResearchEngineStep = { engine: 'gemini' | 'openai'; model?: string };

/**
 * Ordre des moteurs de la recherche de prix : le modèle choisi dans les paramètres IA de la plateforme
 * passe en premier ; l’autre fournisseur (avec son modèle par défaut) complète les lignes manquantes.
 */
export function researchEnginePlan(chosenModel?: string | null): ResearchEngineStep[] {
  const model = String(chosenModel || '').trim();
  if (!model) return [{ engine: 'gemini' }, { engine: 'openai' }];
  return isOpenAiStudioModel(model)
    ? [{ engine: 'openai', model }, { engine: 'gemini' }]
    : [{ engine: 'gemini', model }, { engine: 'openai' }];
}

/** Plafond de sécurité : au-delà, la réponse de l’IA est jugée aberrante. */
const MAX_PRICE_FC = 5_000_000_000;
const MAX_SOURCES = 8;
const MAX_SPREAD = 20;

export type ResearchSource = { title: string; url: string };

/** Objets JSON complets (accolades équilibrées, hors chaînes) trouvés dans un texte, dans l’ordre. */
function completeObjects(text: string, from = 0): Array<{ start: number; end: number }> {
  const found: Array<{ start: number; end: number }> = [];
  let depth = 0;
  let start = -1;
  let inString = false;
  let escaped = false;
  for (let i = from; i < text.length; i += 1) {
    const ch = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === '{') {
      if (depth === 0) start = i;
      depth += 1;
    } else if (ch === '}' && depth > 0) {
      depth -= 1;
      if (depth === 0) found.push({ start, end: i + 1 });
    }
  }
  return found;
}

function tryParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

/**
 * Lit la réponse JSON d’une IA qui fait des recherches : avec l’outil de recherche, le mode JSON strict
 * n’est pas disponible, donc la réponse peut être entourée de balises de code (fermées ou non),
 * précédée ou suivie de texte, ou coupée en route. On garde alors les lignes complètes.
 */
export function extractResearchJson(raw: string): unknown {
  const text = String(raw || '')
    .replace(/^\uFEFF/, '')
    .replace(/```(?:json|JSON)?/g, '')
    .trim();
  const direct = tryParse(text);
  if (direct !== undefined) return direct;
  const first = text.indexOf('{');
  const last = text.lastIndexOf('}');
  if (first >= 0 && last > first) {
    const sliced = tryParse(text.slice(first, last + 1));
    if (sliced !== undefined) return sliced;
  }
  // Réponse coupée ou entourée de texte : on récupère chaque ligne complète du tableau « items ».
  const itemsAt = text.search(/"items"\s*:\s*\[/);
  const objects = completeObjects(text, itemsAt >= 0 ? text.indexOf('[', itemsAt) + 1 : 0);
  const items = objects
    .map((range) => tryParse(text.slice(range.start, range.end)))
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object' && !Array.isArray(item))
    .flatMap((item) => (Array.isArray(item.items) ? item.items : [item]));
  if (items.length) return { items };
  throw new Error('Réponse de l’IA illisible (JSON attendu).');
}

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
    // Une fourchette trop large (haut > 20 × bas) mélange des prestations différentes : on l’écarte.
    if (highFc > lowFc * MAX_SPREAD) continue;
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

const SOCIAL_HOSTS: Record<'facebook' | 'instagram', RegExp> = {
  facebook: /(^|\.)(facebook\.com|fb\.com|fb\.me)$/i,
  instagram: /(^|\.)(instagram\.com|instagr\.am)$/i,
};

/**
 * Pour une recherche sur un réseau social, ne garde que les liens vers ce réseau
 * (ou, pour les liens de redirection de la recherche Google, un titre qui cite le réseau).
 */
export function keepSocialSources(sources: ResearchSource[], network: 'facebook' | 'instagram'): ResearchSource[] {
  return sources.filter((source) => {
    let host = '';
    try {
      host = new URL(source.url).hostname;
    } catch {
      return false;
    }
    if (SOCIAL_HOSTS[network].test(host)) return true;
    // Les sources de la recherche Google passent par un lien de redirection : on se fie alors au titre (le domaine).
    return host === 'vertexaisearch.cloud.google.com' && new RegExp(network, 'i').test(source.title);
  });
}

export function keepFacebookSources(sources: ResearchSource[]): ResearchSource[] {
  return keepSocialSources(sources, 'facebook');
}

/**
 * Fusionne deux séries de propositions : la première l’emporte ligne par ligne,
 * la seconde complète les lignes manquantes.
 */
export function mergeProposals(primary: ResearchProposal[], extra: ResearchProposal[]): ResearchProposal[] {
  const seen = new Set(primary.map((item) => item.slot));
  return [...primary, ...extra.filter((item) => !seen.has(item.slot))];
}
