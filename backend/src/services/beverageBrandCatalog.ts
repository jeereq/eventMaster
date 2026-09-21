export const BEVERAGE_KINDS = ['BEER', 'DRINK', 'WINE', 'CHAMPAGNE'] as const;

export type BeverageKind = (typeof BEVERAGE_KINDS)[number];

export const BEVERAGE_KIND_LABELS: Record<BeverageKind, string> = {
  BEER: 'Bière',
  DRINK: 'Boisson',
  WINE: 'Vin',
  CHAMPAGNE: 'Champagne',
};

export const BEVERAGE_SALE_UNITS = ['BOTTLE', 'CRATE', 'PACK', 'OTHER'] as const;

export type BeverageSaleUnit = (typeof BEVERAGE_SALE_UNITS)[number];

export const BEVERAGE_SALE_UNIT_LABELS: Record<BeverageSaleUnit, string> = {
  BOTTLE: 'Bouteille',
  CRATE: 'Casier',
  PACK: 'Pack',
  OTHER: 'Autre',
};

const CANONICAL_SALE_LABEL: Record<Exclude<BeverageSaleUnit, 'OTHER'>, string> = {
  BOTTLE: 'bouteille',
  CRATE: 'casier',
  PACK: 'pack',
};

export const DEFAULT_SALE_QUANTITY: Record<BeverageSaleUnit, number> = {
  BOTTLE: 1,
  CRATE: 12,
  PACK: 6,
  OTHER: 1,
};

const MAX_SALE_QUANTITY = 500;

const MAX_NAME_LENGTH = 80;
const MAX_TEXT_LENGTH = 160;
const MAX_DESCRIPTION_LENGTH = 400;
const MAX_UNIT_LENGTH = 40;
const MAX_PRICE_FC = 50_000_000;

export function isBeverageKind(value: unknown): value is BeverageKind {
  return typeof value === 'string' && (BEVERAGE_KINDS as readonly string[]).includes(value);
}

export function normalizeBeverageName(value: unknown): string {
  return String(value ?? '').trim().replace(/\s+/g, ' ');
}

export function beverageInvitationOption(brand: { name: string; kind: BeverageKind }): string {
  const name = normalizeBeverageName(brand.name).replace(/,/g, ' ');
  return `${name} (${BEVERAGE_KIND_LABELS[brand.kind]})`;
}

export function joinBeverageInvitationOptions(
  brands: Array<{ name: string; kind: BeverageKind }>,
): string {
  return brands.map(beverageInvitationOption).join(', ');
}

export type BrandDraft = {
  name: string;
  kind: BeverageKind;
  producer: string | null;
  country: string | null;
  volumeLabel: string | null;
  description: string | null;
  isActive: boolean;
};

function optionalText(value: unknown, max: number): string | null {
  const text = String(value ?? '').trim().replace(/\s+/g, ' ');
  if (!text) return null;
  return text.slice(0, max);
}

export function parseBrandDraft(body: unknown): { draft: BrandDraft } | { error: string } {
  const source = body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
  const name = normalizeBeverageName(source.name);
  if (name.length < 2) return { error: 'Indiquez le nom de la marque (2 caractères minimum).' };
  if (name.length > MAX_NAME_LENGTH) return { error: 'Le nom de la marque est trop long.' };
  if (!isBeverageKind(source.kind)) return { error: 'Choisissez une famille : bière, boisson, vin ou champagne.' };
  return {
    draft: {
      name,
      kind: source.kind,
      producer: optionalText(source.producer, MAX_TEXT_LENGTH),
      country: optionalText(source.country, MAX_TEXT_LENGTH),
      volumeLabel: optionalText(source.volumeLabel, 40),
      description: optionalText(source.description, MAX_DESCRIPTION_LENGTH),
      isActive: source.isActive !== false,
    },
  };
}

export function isBeverageSaleUnit(value: unknown): value is BeverageSaleUnit {
  return typeof value === 'string' && (BEVERAGE_SALE_UNITS as readonly string[]).includes(value);
}

export function formatBeverageSale(offer: {
  unitKind: BeverageSaleUnit;
  quantity: number;
  unitLabel: string;
}): string {
  const quantity = Math.max(1, Math.round(offer.quantity) || 1);
  if (offer.unitKind === 'BOTTLE') {
    return quantity <= 1 ? '1 bouteille' : `${quantity} bouteilles`;
  }
  if (offer.unitKind === 'CRATE') return `Casier de ${quantity}`;
  if (offer.unitKind === 'PACK') return `Pack de ${quantity}`;
  const label = offer.unitLabel.trim() || 'Autre';
  return quantity <= 1 ? label : `${label} · ${quantity}`;
}

export type VendorPriceDraft = {
  brandId: string;
  unitKind: BeverageSaleUnit;
  quantity: number;
  unitLabel: string;
  priceFc: number;
  isAvailable: boolean;
  notes: string | null;
};

export function parseVendorPriceOffers(body: unknown): { offers: VendorPriceDraft[] } | { error: string } {
  const source = body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
  const raw = source.offers;
  if (!Array.isArray(raw)) return { error: 'La liste des tarifs est invalide.' };
  if (raw.length > 200) return { error: 'Trop de marques dans une seule mise à jour.' };

  const seen = new Set<string>();
  const offers: VendorPriceDraft[] = [];
  for (const row of raw) {
    if (!row || typeof row !== 'object') return { error: 'Un tarif est incomplet.' };
    const item = row as Record<string, unknown>;
    const brandId = String(item.brandId ?? '').trim();
    if (!brandId) return { error: 'Chaque tarif doit citer une marque.' };
    if (!isBeverageSaleUnit(item.unitKind)) {
      return { error: 'Choisissez un conditionnement : bouteille, casier, pack ou autre.' };
    }
    const quantity = Math.round(Number(item.quantity));
    if (!Number.isFinite(quantity) || quantity < 1 || quantity > MAX_SALE_QUANTITY) {
      return { error: `La quantité doit être comprise entre 1 et ${MAX_SALE_QUANTITY}.` };
    }
    const customLabel = optionalText(item.unitLabel, MAX_UNIT_LENGTH);
    if (item.unitKind === 'OTHER' && (!customLabel || customLabel.length < 2)) {
      return { error: 'Précisez le conditionnement pour « Autre » (fût, magnum, cubi…).' };
    }
    const unitLabel = item.unitKind === 'OTHER'
      ? customLabel!
      : CANONICAL_SALE_LABEL[item.unitKind];
    const key = `${brandId}:${item.unitKind}:${unitLabel.toLowerCase()}`;
    if (seen.has(key)) return { error: 'Un même conditionnement ne peut être tarifé qu’une fois par marque.' };
    seen.add(key);
    const priceFc = Math.round(Number(item.priceFc));
    if (!Number.isFinite(priceFc) || priceFc < 0 || priceFc > MAX_PRICE_FC) {
      return { error: 'Chaque prix doit être un montant en FC, positif ou nul.' };
    }
    offers.push({
      brandId,
      unitKind: item.unitKind,
      quantity,
      unitLabel,
      priceFc,
      isAvailable: item.isAvailable !== false,
      notes: optionalText(item.notes, MAX_DESCRIPTION_LENGTH),
    });
  }
  return { offers };
}
