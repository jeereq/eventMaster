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

export const DEFAULT_SALE_QUANTITY: Record<BeverageSaleUnit, number> = {
  BOTTLE: 1,
  CRATE: 12,
  PACK: 6,
  OTHER: 1,
};

export function formatBeverageSale(offer: {
  unitKind: BeverageSaleUnit;
  quantity: number;
  unitLabel?: string | null;
}): string {
  const quantity = Math.max(1, Math.round(offer.quantity) || 1);
  if (offer.unitKind === 'BOTTLE') return quantity <= 1 ? '1 bouteille' : `${quantity} bouteilles`;
  if (offer.unitKind === 'CRATE') return `Casier de ${quantity}`;
  if (offer.unitKind === 'PACK') return `Pack de ${quantity}`;
  const label = (offer.unitLabel || 'Autre').trim();
  return quantity <= 1 ? label : `${label} · ${quantity}`;
}

export type BeverageBrandRow = {
  id: string;
  name: string;
  kind: BeverageKind;
  kindLabel: string;
  producer: string | null;
  country: string | null;
  volumeLabel: string | null;
  description: string | null;
  isActive: boolean;
  invitationOption: string;
  vendorCount?: number;
  priceFromFc?: number | null;
};

export type VendorBeveragePriceRow = {
  id: string;
  priceFc: number;
  unitKind: BeverageSaleUnit;
  quantity: number;
  unitLabel: string;
  isAvailable: boolean;
  notes: string | null;
};

export type VendorBeverageBrandRow = BeverageBrandRow & {
  myPrices: VendorBeveragePriceRow[];
};

export function beverageInvitationOption(brand: { name: string; kind: BeverageKind }): string {
  const name = brand.name.trim().replace(/\s+/g, ' ').replace(/,/g, ' ');
  return `${name} (${BEVERAGE_KIND_LABELS[brand.kind]})`;
}

const BRAND_OPTION_MARK = /\((Bière|Boisson|Vin|Champagne)\)/;

export function looksLikeBeverageBrandOptions(options?: string): boolean {
  if (!options) return false;
  return options.split(',').some((part) => BRAND_OPTION_MARK.test(part));
}
