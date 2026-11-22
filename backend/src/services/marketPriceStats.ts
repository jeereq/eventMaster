/**
 * Prix du marché hors catalogue : calculs purs (sans base de données).
 *
 * Deux sources alimentent le simulateur quand la marketplace n’a aucune offre pour une ligne :
 * - « observed » : réservations acceptées et devis envoyés sur la plateforme (prix réels payés ou proposés) ;
 * - « reference » : fourchettes trouvées par l’IA sur le web, Facebook ou Instagram, publiées tout de suite
 *   (un Super Admin peut les corriger ou les retirer).
 */

export type MarketPriceUnit = 'EVENT' | 'PERSON';

/**
 * Source des prix choisie dans le simulateur :
 * - all : catalogue EventMaster, puis prix réels et prix trouvés en ligne pour les lignes vides ;
 * - app : base EventMaster seulement (catalogue et prix réels des réservations et devis) ;
 * - web : prix trouvés sur le web ;
 * - facebook : prix trouvés sur des pages Facebook publiques ;
 * - instagram : prix trouvés sur des comptes Instagram publics.
 */
export type PriceSource = 'all' | 'app' | 'web' | 'facebook' | 'instagram';
export const PRICE_SOURCES: PriceSource[] = ['all', 'app', 'web', 'facebook', 'instagram'];

export function parsePriceSource(value: unknown): PriceSource {
  return PRICE_SOURCES.includes(value as PriceSource) ? (value as PriceSource) : 'all';
}

/** Canal d’une référence : colonne `source` en base (ai_web, ai_facebook, ai_instagram). */
export type ReferenceChannel = 'web' | 'facebook' | 'instagram';
export const REFERENCE_CHANNELS: ReferenceChannel[] = ['web', 'facebook', 'instagram'];

export function referenceChannel(source: unknown): ReferenceChannel {
  if (source === 'ai_facebook') return 'facebook';
  if (source === 'ai_instagram') return 'instagram';
  return 'web';
}

export function channelSource(channel: ReferenceChannel): string {
  return `ai_${channel}`;
}

export function isReferenceChannel(value: unknown): value is ReferenceChannel {
  return REFERENCE_CHANNELS.includes(value as ReferenceChannel);
}

/** « sur le web », « sur des pages Facebook publiques »… */
export function channelPlace(channel: ReferenceChannel | undefined): string {
  if (channel === 'facebook') return 'sur des pages Facebook publiques';
  if (channel === 'instagram') return 'sur des comptes Instagram publics';
  return 'sur le web';
}
export type MarketPriceSource = 'observed' | 'reference';
export type MarketPriceStyle = 'cheap' | 'balanced' | 'comfort';

/** Ligne du simulateur : « venue » pour la salle, sinon une catégorie de prestataire ou de location. */
export type MarketSlot = string;

/** Lignes chiffrées par invité : traiteur, chaises et vaisselle. Les autres sont des forfaits. */
export const PER_GUEST_SLOTS = new Set<MarketSlot>(['CATERING', 'RENTAL_CHAIRS', 'RENTAL_TABLEWARE']);

/** Nombre minimum de prix réels pour publier une estimation. En dessous, une seule réservation ferait la loi. */
export const MIN_OBSERVED_SAMPLES = 3;

export type MarketObservation = {
  slot: MarketSlot;
  city: string | null;
  amountFc: number;
  guestCount: number | null;
};

export type MarketPriceStat = {
  slot: MarketSlot;
  /** Ville des données, ou '' pour toutes les villes. */
  city: string;
  unit: MarketPriceUnit;
  lowFc: number;
  typicalFc: number;
  highFc: number;
  source: MarketPriceSource;
  /** Nombre de prix réels (source « observed »). */
  sampleCount?: number;
  /** Date de validation (source « reference »). */
  reviewedAt?: string | null;
  sourceCount?: number;
  /** Pages web citées (source « reference »), au plus 3. */
  sources?: MarketSourceLink[];
  /** Canal de la référence (source « reference ») : web, Facebook ou Instagram. */
  channel?: ReferenceChannel;
  /** false : prix publié automatiquement après la recherche, sans relecture admin. */
  adminReviewed?: boolean;
  /** Explication de l’IA : ce que couvre le prix et comment la fourchette est construite. */
  rationale?: string;
  /** Modèle d’IA qui a trouvé le prix. */
  model?: string;
  /** Requêtes tapées dans le moteur de recherche. */
  searchQueries?: string[];
};

/** Page citée, avec le prix relevé, la phrase qui le donne et sa date quand l’IA les fournit. */
export type MarketSourceLink = { title: string; url: string; price?: string; excerpt?: string; date?: string };

/** Au-delà, une référence web est signalée « à revérifier ». */
export const REFERENCE_MAX_AGE_DAYS = 180;

function sourceLinks(value: unknown): MarketSourceLink[] {
  if (!Array.isArray(value)) return [];
  const links: MarketSourceLink[] = [];
  for (const item of value) {
    const row = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>;
    const url = String(row.url || '').trim();
    if (!/^https?:\/\//i.test(url)) continue;
    const extra = (key: string, max: number) => {
      const text = String(row[key] ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
      return text ? { [key]: text } : {};
    };
    links.push({ title: String(row.title || '').trim().slice(0, 200) || url, url, ...extra('price', 120), ...extra('excerpt', 400), ...extra('date', 40) });
    if (links.length >= 5) break;
  }
  return links;
}

export type MarketReferenceRow = {
  slot: string;
  city: string;
  unit: string;
  lowFc: number;
  typicalFc: number;
  highFc: number;
  reviewedAt: Date | string | null;
  sources?: unknown;
  /** ai_web, ai_facebook ou ai_instagram */
  source?: string | null;
  /** Renseigné quand un Super Admin a validé ou corrigé le prix ; vide pour un prix publié automatiquement. */
  reviewedById?: string | null;
  rationale?: string | null;
  model?: string | null;
  searchQueries?: string[] | null;
};

export function defaultMarketUnit(slot: MarketSlot): MarketPriceUnit {
  return PER_GUEST_SLOTS.has(slot) ? 'PERSON' : 'EVENT';
}

/** Quantile par interpolation linéaire, sur une liste déjà triée. */
export function quantile(sorted: number[], q: number): number {
  if (!sorted.length) return 0;
  if (sorted.length === 1) return sorted[0];
  const pos = (sorted.length - 1) * Math.min(1, Math.max(0, q));
  const base = Math.floor(pos);
  const rest = pos - base;
  const next = sorted[base + 1] ?? sorted[base];
  return sorted[base] + rest * (next - sorted[base]);
}

function normalizeCity(city: string | null | undefined): string {
  return String(city || '').trim().toLowerCase();
}

function summarize(values: number[], minSamples: number): { lowFc: number; typicalFc: number; highFc: number; count: number } | null {
  const clean = values.filter((value) => Number.isFinite(value) && value > 0).sort((a, b) => a - b);
  if (clean.length < minSamples) return null;
  return {
    lowFc: Math.round(quantile(clean, 0.25)),
    typicalFc: Math.round(quantile(clean, 0.5)),
    highFc: Math.round(quantile(clean, 0.75)),
    count: clean.length,
  };
}

/**
 * Statistiques d’une ligne à partir des prix réels.
 * Les lignes par invité utilisent le prix par invité quand assez de réservations précisent le nombre d’invités.
 * Sinon, et pour les forfaits, on garde le montant total.
 */
export function summarizeObservations(
  observations: MarketObservation[],
  slot: MarketSlot,
  city: string,
  minSamples = MIN_OBSERVED_SAMPLES,
): MarketPriceStat | null {
  const wantedCity = normalizeCity(city);
  const rows = observations.filter((row) => (
    row.slot === slot
    && row.amountFc > 0
    && (!wantedCity || normalizeCity(row.city) === wantedCity)
  ));
  if (!rows.length) return null;

  if (PER_GUEST_SLOTS.has(slot)) {
    const perGuest = summarize(
      rows.filter((row) => row.guestCount != null && row.guestCount > 0).map((row) => row.amountFc / (row.guestCount as number)),
      minSamples,
    );
    if (perGuest) {
      return { slot, city: wantedCity ? rows[0].city || city : '', unit: 'PERSON', ...pick(perGuest), source: 'observed', sampleCount: perGuest.count };
    }
  }
  const total = summarize(rows.map((row) => row.amountFc), minSamples);
  if (!total) return null;
  return { slot, city: wantedCity ? rows[0].city || city : '', unit: 'EVENT', ...pick(total), source: 'observed', sampleCount: total.count };
}

function pick(stat: { lowFc: number; typicalFc: number; highFc: number }) {
  return { lowFc: stat.lowFc, typicalFc: stat.typicalFc, highFc: stat.highFc };
}

function referenceToStat(row: MarketReferenceRow): MarketPriceStat {
  const unit: MarketPriceUnit = row.unit === 'PERSON' ? 'PERSON' : 'EVENT';
  const reviewedAt = row.reviewedAt instanceof Date ? row.reviewedAt.toISOString() : row.reviewedAt || null;
  return {
    slot: row.slot,
    city: row.city || '',
    unit,
    lowFc: row.lowFc,
    typicalFc: row.typicalFc,
    highFc: row.highFc,
    source: 'reference',
    reviewedAt,
    sourceCount: Array.isArray(row.sources) ? row.sources.length : 0,
    sources: sourceLinks(row.sources),
    channel: referenceChannel(row.source),
    adminReviewed: Boolean(row.reviewedById),
    ...(row.rationale ? { rationale: row.rationale } : {}),
    ...(row.model ? { model: row.model } : {}),
    ...(row.searchQueries?.length ? { searchQueries: row.searchQueries.slice(0, 12) } : {}),
  };
}

/**
 * Choisit l’estimation d’une ligne, de la plus fiable à la moins fiable :
 * prix réels de la ville, référence validée pour la ville, référence toutes villes, prix réels toutes villes.
 */
export function resolveMarketPrice(
  slot: MarketSlot,
  city: string,
  observations: MarketObservation[],
  references: MarketReferenceRow[],
  minSamples = MIN_OBSERVED_SAMPLES,
  priceSource: PriceSource = 'all',
): MarketPriceStat | null {
  const wantedCity = normalizeCity(city);
  // Base EventMaster : pas de référence web. Web ou Facebook : ce canal seulement, sans prix réels.
  if (isReferenceChannel(priceSource)) {
    observations = [];
    references = references.filter((row) => referenceChannel(row.source) === priceSource);
  } else if (priceSource === 'app') {
    references = [];
  }
  const forSlot = references.filter((row) => row.slot === slot);
  if (wantedCity) {
    const local = summarizeObservations(observations, slot, city, minSamples);
    if (local) return local;
    const localRef = forSlot.find((row) => normalizeCity(row.city) === wantedCity);
    if (localRef) return referenceToStat(localRef);
  }
  const nationalRef = forSlot.find((row) => !normalizeCity(row.city));
  if (nationalRef) return referenceToStat(nationalRef);
  return summarizeObservations(observations, slot, '', minSamples);
}

function money(amount: number): string {
  return `${Math.round(amount).toLocaleString('fr-FR')} FC`;
}

function formatDay(value: string | null | undefined): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('fr-FR', { timeZone: 'Africa/Kinshasa' });
}

/** Libellé court de la provenance, affiché sous la ligne du pack. */
export function marketSourceNote(stat: MarketPriceStat): string {
  const where = stat.city ? ` à ${stat.city}` : ', toutes villes';
  if (stat.source === 'observed') {
    const count = stat.sampleCount || 0;
    return `Prix réels de ${count} réservation${count > 1 ? 's' : ''} ou devis${where}`;
  }
  const day = formatDay(stat.reviewedAt);
  const checked = stat.adminReviewed ? ', validés par EventMaster' : '';
  return `Prix du marché trouvés ${channelPlace(stat.channel)}${where}${day ? ` le ${day}` : ''}${checked}`;
}

/**
 * Montant estimé pour le pack. Économique : bas de fourchette, Équilibré : prix médian, Confort : haut de fourchette.
 * Si le montant dépasse le plafond de la ligne, on essaie le prix médian puis le bas de fourchette avant d’abandonner.
 */
export function marketEstimateAmount(
  stat: MarketPriceStat,
  guestCount: number,
  style: MarketPriceStyle,
  capFc = Number.POSITIVE_INFINITY,
): MarketEstimatePriced | null {
  const guests = Math.max(0, Math.floor(guestCount));
  if (stat.unit === 'PERSON' && guests < 1) return null;
  const preferred = style === 'cheap' ? stat.lowFc : style === 'comfort' ? stat.highFc : stat.typicalFc;
  const candidates = [...new Set([preferred, stat.typicalFc, stat.lowFc])].filter((value) => value > 0);
  for (const unitFc of candidates) {
    const amountFc = Math.round(stat.unit === 'PERSON' ? unitFc * guests : unitFc);
    if (amountFc <= capFc) {
      const how = stat.unit === 'PERSON' ? `${guests} × ${money(unitFc)}` : `forfait ${money(unitFc)}`;
      const range = stat.lowFc !== stat.highFc
        ? ` (fourchette ${money(stat.lowFc)} à ${money(stat.highFc)}${stat.unit === 'PERSON' ? ' par invité' : ''})`
        : '';
      const quantity = stat.unit === 'PERSON' ? guests : 1;
      return {
        amountFc,
        unitFc,
        quantity,
        note: `${how}${range}. ${marketSourceNote(stat)}.`,
        check: checkMarketEstimate(stat, unitFc, quantity, amountFc),
      };
    }
  }
  return null;
}

export type MarketEstimateCheck = {
  /** true : calcul juste, prix dans la fourchette et référence récente. */
  ok: boolean;
  messages: string[];
};

export type MarketEstimatePriced = {
  amountFc: number;
  unitFc: number;
  quantity: number;
  note: string;
  check: MarketEstimateCheck;
};

/**
 * Contrôle du coût d’une ligne estimée : le total correspond au prix unitaire × quantité,
 * le prix unitaire reste dans la fourchette du marché, et la référence web n’est pas trop ancienne.
 */
export function checkMarketEstimate(
  stat: MarketPriceStat,
  unitFc: number,
  quantity: number,
  amountFc: number,
  now: Date = new Date(),
): MarketEstimateCheck {
  const messages: string[] = [];
  let ok = true;
  const expected = Math.round(unitFc * quantity);
  if (expected !== amountFc || amountFc <= 0) {
    ok = false;
    messages.push(`Calcul incohérent : ${money(unitFc)} × ${quantity} = ${money(expected)}, et non ${money(amountFc)}.`);
  } else {
    messages.push(quantity > 1
      ? `Calcul vérifié : ${quantity} × ${money(unitFc)} = ${money(amountFc)}.`
      : `Calcul vérifié : forfait de ${money(amountFc)}.`);
  }
  if (unitFc < stat.lowFc || unitFc > stat.highFc) {
    ok = false;
    messages.push(`Prix hors de la fourchette du marché (${money(stat.lowFc)} à ${money(stat.highFc)}).`);
  } else {
    messages.push(`Prix dans la fourchette du marché (${money(stat.lowFc)} à ${money(stat.highFc)}).`);
  }
  if (stat.source === 'reference') {
    const reviewed = stat.reviewedAt ? new Date(stat.reviewedAt) : null;
    const ageDays = reviewed && !Number.isNaN(reviewed.getTime())
      ? (now.getTime() - reviewed.getTime()) / (24 * 60 * 60 * 1000)
      : Number.POSITIVE_INFINITY;
    if (ageDays > REFERENCE_MAX_AGE_DAYS) {
      ok = false;
      messages.push('Prix trouvé il y a plus de 6 mois : à revérifier.');
    }
    if (!stat.sources?.length) {
      ok = false;
      messages.push(`Aucune source enregistrée ${channelPlace(stat.channel)} pour ce prix.`);
    }
    if (!stat.adminReviewed) {
      messages.push('Prix trouvé automatiquement par l’IA, pas encore relu par EventMaster : comparez avec les sources.');
    }
  } else if ((stat.sampleCount || 0) < 5) {
    messages.push(`Basé sur seulement ${stat.sampleCount || 0} prix réels : à confirmer.`);
  }
  return { ok, messages };
}

export function isMarketEstimateSlug(slug: string): boolean {
  return slug.startsWith('budget:marche:');
}

export function marketEstimateSlug(slot: MarketSlot): string {
  return `budget:marche:${slot.toLowerCase()}`;
}
