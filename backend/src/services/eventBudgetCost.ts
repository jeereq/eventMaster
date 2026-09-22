import { activePromoPrice } from './offerPromotion.ts';
import { deliveryPriceForDestination, parseListingDetails } from '../utils/listingDetails.ts';
import type { EventPlanType } from './eventPlanBrief';

export type BudgetStyle = 'cheap' | 'balanced' | 'comfort';

export type BudgetSimulationScope = 'complete' | 'drinks' | 'rentals' | 'services';

export function parseBudgetSimulationScope(value: unknown): BudgetSimulationScope {
  if (value === 'drinks' || value === 'rentals' || value === 'services') return value;
  return 'complete';
}

const BRAND_ID_LIMIT = 40;
const SALE_UNITS = ['BOTTLE', 'CRATE', 'PACK', 'OTHER'] as const;
export type WantedSaleUnit = (typeof SALE_UNITS)[number];

export function parseWantedBrandIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const ids = value
    .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    .map((item) => item.trim());
  return [...new Set(ids)].slice(0, BRAND_ID_LIMIT);
}

export function parseWantedSaleUnits(value: unknown): WantedSaleUnit[] {
  if (!Array.isArray(value)) return [];
  return SALE_UNITS.filter((unit) => value.includes(unit));
}

export type BeverageOrderLine = {
  brandId: string;
  unitKind: WantedSaleUnit;
  packs: number;
};

const DRINK_LINE_LIMIT = 20;

export function parseWantedDrinkLines(value: unknown): BeverageOrderLine[] {
  if (!Array.isArray(value)) return [];
  const lines: BeverageOrderLine[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    const brandId = typeof row.brandId === 'string' ? row.brandId.trim() : '';
    const unitKind = SALE_UNITS.find((unit) => unit === row.unitKind);
    const packs = Math.round(Number(row.packs));
    if (!brandId || !unitKind || !Number.isFinite(packs) || packs < 1) continue;
    lines.push({ brandId, unitKind, packs: Math.min(500, packs) });
    if (lines.length >= DRINK_LINE_LIMIT) break;
  }
  return lines;
}

const PER_PIECE = new Set(['RENTAL_CHAIRS', 'RENTAL_TABLEWARE']);

export type RentalBudgetInput = {
  category: string;
  priceUnit?: string | null;
  priceFromFc?: number | null;
  promoPriceFc?: number | null;
  promoEndsAt?: Date | string | null;
  guestCount: number;
  dayCount?: number;
  deliveryMode?: string | null;
  deliveryPriceFc?: number | null;
  details?: unknown;
  destinationCommune?: string | null;
};

/** Supplément de livraison, une seule fois. Le prix d’une commune de Kinshasa prime sur le prix par défaut. Le prix inclus dans le tarif n’est pas ajouté. */
export function rentalDeliverySurcharge(input: {
  deliveryMode?: string | null;
  deliveryPriceFc?: number | null;
  details?: unknown;
  destinationCommune?: string | null;
}): number {
  const details = input.details != null ? parseListingDetails(input.details) : null;
  const mode = String(input.deliveryMode || details?.deliveryMode || '');
  if (mode !== 'extra_fee') return 0;
  const communePrice = details ? deliveryPriceForDestination(details, input.destinationCommune) : null;
  if (communePrice) return communePrice.amountFc;
  const columnPrice = input.deliveryPriceFc != null ? Math.round(Number(input.deliveryPriceFc)) : 0;
  const detailPrice = Number.parseInt(String(details?.deliveryPriceFc || ''), 10);
  const price = columnPrice > 0 ? columnPrice : (Number.isFinite(detailPrice) ? detailPrice : 0);
  if (price <= 0) return 0;
  return price;
}

export type BudgetAmount = {
  amountFc: number;
  note: string;
};

function money(amount: number): string {
  return `${Math.round(amount).toLocaleString('fr-FR')} FC`;
}

export function payableUnitPrice(input: {
  priceFromFc?: number | null;
  promoPriceFc?: number | null;
  promoEndsAt?: Date | string | null;
}): number | null {
  const price = input.priceFromFc;
  if (price == null || price <= 0) return null;
  return activePromoPrice({
    priceFc: price,
    promoPriceFc: input.promoPriceFc,
    promoEndsAt: input.promoEndsAt,
  }) ?? price;
}

/** Chaises et vaisselle : une pièce par invité. Les autres locations : un lot, ou le tarif jour × jours. */
export function rentalBudgetAmount(input: RentalBudgetInput): BudgetAmount | null {
  const unit = payableUnitPrice(input);
  if (unit == null) return null;
  const guests = Math.max(0, Math.floor(input.guestCount));
  const days = Math.max(1, Math.floor(input.dayCount || 1));
  const perPiece = PER_PIECE.has(input.category);
  const pieceCount = guests > 0 ? guests : 1;
  let amount = unit;
  let note = `1 prestation · ${money(unit)}`;

  if (perPiece) {
    if (input.priceUnit === 'DAY') {
      amount = unit * pieceCount * days;
      note = guests > 0
        ? `${pieceCount} pièces × ${money(unit)} × ${days} jour${days > 1 ? 's' : ''}`
        : `1 pièce × ${money(unit)} × ${days} jour${days > 1 ? 's' : ''} (invités non précisés)`;
    } else {
      amount = unit * pieceCount;
      note = guests > 0
        ? `${pieceCount} pièces × ${money(unit)}`
        : `1 pièce × ${money(unit)} (invités non précisés)`;
    }
  } else if (input.priceUnit === 'DAY') {
    amount = unit * days;
    note = `1 lot × ${money(unit)} × ${days} jour${days > 1 ? 's' : ''}`;
  } else if ((input.priceUnit === 'PERSON' || input.priceUnit === 'QUOTA') && guests > 0) {
    amount = unit * guests;
    note = `${guests} × ${money(unit)}`;
  } else if (input.category.startsWith('RENTAL_')) {
    note = `1 lot · ${money(unit)}`;
  }

  const details = input.details != null ? parseListingDetails(input.details) : null;
  const deliveryMode = String(input.deliveryMode || details?.deliveryMode || '');
  const columnPrice = input.deliveryPriceFc != null && Number(input.deliveryPriceFc) > 0
    ? Math.round(Number(input.deliveryPriceFc))
    : 0;
  const detailPrice = Number.parseInt(String(details?.deliveryPriceFc || ''), 10);
  const delivery = rentalDeliverySurcharge(input);
  const communePrice = details ? deliveryPriceForDestination(details, input.destinationCommune) : null;
  const listedDelivery = delivery > 0
    ? delivery
    : (columnPrice > 0 ? columnPrice : (Number.isFinite(detailPrice) && detailPrice > 0 ? detailPrice : 0));
  if (delivery > 0) {
    amount += delivery;
    const place = communePrice ? ` vers ${communePrice.commune}` : '';
    note = `${note} + livraison${place} ${money(delivery)}`;
  } else if (deliveryMode === 'included' && listedDelivery > 0) {
    note = `${note} · livraison incluse ${money(listedDelivery)}`;
  } else if (deliveryMode === 'pickup') {
    note = `${note} · retrait sur place`;
  }

  return { amountFc: Math.round(amount), note };
}

type DrinkKind = 'BEER' | 'DRINK' | 'WINE' | 'CHAMPAGNE';

type DrinkNeed = {
  kind: DrinkKind;
  servingsPerGuest: number;
  rule: string;
};

const DRINK_LABEL: Record<DrinkKind, string> = {
  BEER: 'Bière',
  DRINK: 'Boisson',
  WINE: 'Vin',
  CHAMPAGNE: 'Champagne',
};

const KIND_ORDER: DrinkKind[] = ['DRINK', 'BEER', 'WINE', 'CHAMPAGNE'];

function softNeed(rate: number): DrinkNeed {
  return { kind: 'DRINK', servingsPerGuest: rate, rule: `${rate} verre ou bouteille par invité` };
}

function beerNeed(rate: number): DrinkNeed {
  return { kind: 'BEER', servingsPerGuest: rate, rule: `${rate} bouteille par invité` };
}

function wineNeed(guestsPerBottle: number): DrinkNeed {
  return {
    kind: 'WINE',
    servingsPerGuest: 1 / guestsPerBottle,
    rule: `1 bouteille pour ${guestsPerBottle} invités`,
  };
}

function champagneNeed(guestsPerBottle: number): DrinkNeed {
  return {
    kind: 'CHAMPAGNE',
    servingsPerGuest: 1 / guestsPerBottle,
    rule: `1 bouteille pour ${guestsPerBottle} invités`,
  };
}

function needsFor(eventType: EventPlanType, style: BudgetStyle): DrinkNeed[] {
  const soft = softNeed;
  const beer = beerNeed;
  const wine = wineNeed;
  const champagne = champagneNeed;

  if (eventType === 'religious') return [soft(style === 'comfort' ? 2 : 1)];
  if (eventType === 'shooting') return [soft(1)];
  if (eventType === 'corporate') {
    return style === 'comfort' ? [soft(2), wine(5)] : [soft(style === 'cheap' ? 1 : 2)];
  }
  if (eventType === 'birthday' || eventType === 'private') {
    if (style === 'cheap') return [soft(1), beer(1)];
    if (style === 'comfort') return [soft(1.5), beer(1.5)];
    return [soft(1), beer(1)];
  }
  if (style === 'cheap') return [soft(1), beer(1)];
  if (style === 'comfort') return [soft(1), beer(1.5), wine(4), champagne(6)];
  return [soft(1), beer(1), wine(4)];
}

export type BeverageBudgetOffer = {
  kind: string;
  brandId?: string | null;
  brandName: string;
  imageUrl?: string | null;
  unitKind?: string | null;
  quantity: number;
  unitLabel: string;
  priceFc: number;
  promoPriceFc?: number | null;
  promoEndsAt?: Date | string | null;
};

export type BeverageFocusBrand = {
  id: string;
  name: string;
  kind: string;
};

export type BeverageBudgetLine = {
  kind: DrinkKind;
  slug: string;
  title: string;
  categoryLabel: string;
  brandName: string | null;
  quantityLabel: string;
  unitPriceFc: number | null;
  amountFc: number;
  imageUrl: string | null;
  detail: string;
};

type PricedDrink = {
  cost: number;
  imageUrl: string | null;
  brandName: string;
  quantityLabel: string;
  unitPrice: number;
  unitLabel: string;
  pack: number;
};

function isDrinkKind(value: string): value is DrinkKind {
  return KIND_ORDER.includes(value as DrinkKind);
}

function needForKind(kind: DrinkKind, eventType: EventPlanType, style: BudgetStyle): DrinkNeed {
  return needsFor(eventType, style).find((need) => need.kind === kind)
    || (kind === 'DRINK' ? softNeed(style === 'comfort' ? 1.5 : 1)
      : kind === 'BEER' ? beerNeed(style === 'comfort' ? 1.5 : 1)
        : kind === 'WINE' ? wineNeed(4)
          : champagneNeed(6));
}

function brandSlug(name: string): string {
  const slug = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return slug || 'marque';
}

function pricedDrinks(offers: BeverageBudgetOffer[], kind: DrinkKind, servings: number): PricedDrink[] {
  return offers.flatMap((offer) => {
    if (offer.kind !== kind) return [];
    const unitPrice = payableUnitPrice({
      priceFromFc: offer.priceFc,
      promoPriceFc: offer.promoPriceFc,
      promoEndsAt: offer.promoEndsAt,
    });
    if (unitPrice == null) return [];
    const pack = Math.max(1, Math.floor(offer.quantity) || 1);
    const packs = Math.ceil(servings / pack);
    return [{
      cost: packs * unitPrice,
      imageUrl: offer.imageUrl || null,
      brandName: offer.brandName,
      quantityLabel: `${packs} × ${offer.unitLabel}`,
      unitPrice,
      unitLabel: offer.unitLabel,
      pack,
    }];
  });
}

function cheapestDrink(choices: PricedDrink[]): PricedDrink {
  return choices.reduce((cheapest, item) => (item.cost < cheapest.cost ? item : cheapest));
}

function drinkLine(
  kind: DrinkKind,
  slug: string,
  title: string,
  brandName: string | null,
  detail: string,
  choice?: PricedDrink,
): BeverageBudgetLine {
  const family = DRINK_LABEL[kind];
  return {
    kind,
    slug,
    title,
    categoryLabel: family,
    brandName,
    quantityLabel: choice?.quantityLabel || '',
    unitPriceFc: choice?.unitPrice ?? null,
    amountFc: choice?.cost || 0,
    imageUrl: choice?.imageUrl || null,
    detail,
  };
}

function pricedDetail(choice: PricedDrink, servings: number, guests: number, rule: string): string {
  const contained = choice.pack > 1 ? ` (${choice.pack} par ${choice.unitLabel})` : '';
  return `${choice.quantityLabel}${contained} · ${money(choice.unitPrice)} / ${choice.unitLabel} · ${servings} pour ${guests} invités (${rule})`;
}

function pricedOrderLine(
  offers: BeverageBudgetOffer[],
  line: BeverageOrderLine,
  brand: BeverageFocusBrand | undefined,
): BeverageBudgetLine {
  const sample = offers.find((offer) => offer.brandId === line.brandId);
  const kind = isDrinkKind(brand?.kind || sample?.kind || '') ? (brand?.kind || sample?.kind) as DrinkKind : 'DRINK';
  const family = DRINK_LABEL[kind];
  const name = brand?.name || sample?.brandName || family;
  const slug = `budget:boissons:${kind}:${brandSlug(name)}:${line.unitKind}`;
  const matches = offers.filter((offer) => offer.brandId === line.brandId && offer.unitKind === line.unitKind);
  const choices = matches.flatMap((offer) => {
    const unitPrice = payableUnitPrice({
      priceFromFc: offer.priceFc,
      promoPriceFc: offer.promoPriceFc,
      promoEndsAt: offer.promoEndsAt,
    });
    if (unitPrice == null) return [];
    return [{
      cost: line.packs * unitPrice,
      imageUrl: offer.imageUrl || null,
      brandName: offer.brandName,
      quantityLabel: `${line.packs} × ${offer.unitLabel}`,
      unitPrice,
      unitLabel: offer.unitLabel,
      pack: Math.max(1, Math.floor(offer.quantity) || 1),
    }];
  });
  if (!choices.length) {
    return drinkLine(kind, slug, name, name, `${name} : aucun tarif publié pour ${line.packs} × ce conditionnement`);
  }
  const best = cheapestDrink(choices);
  const contained = best.pack > 1 ? ` (${best.pack} par ${best.unitLabel})` : '';
  return drinkLine(
    kind,
    slug,
    best.brandName,
    best.brandName,
    `${best.quantityLabel}${contained} · ${money(best.unitPrice)} / ${best.unitLabel} · commande précise`,
    best,
  );
}

export function beverageBudgetAmount(
  offers: BeverageBudgetOffer[],
  guestCount: number,
  eventType: EventPlanType,
  style: BudgetStyle,
  focusBrands: BeverageFocusBrand[] = [],
  orderLines: BeverageOrderLine[] = [],
): (BudgetAmount & { imageUrl: string | null; lines: BeverageBudgetLine[] }) | null {
  if (orderLines.length) {
    const lines = orderLines.map((line) => pricedOrderLine(
      offers,
      line,
      focusBrands.find((brand) => brand.id === line.brandId),
    ));
    const total = lines.reduce((sum, line) => sum + line.amountFc, 0);
    return {
      amountFc: Math.round(total),
      note: lines.map((line) => line.detail).join(' · '),
      imageUrl: lines.find((line) => line.imageUrl)?.imageUrl || null,
      lines,
    };
  }

  const guests = Math.max(0, Math.floor(guestCount));
  if (guests < 1) return null;
  if (!offers.length && !focusBrands.length) return null;
  const lines: BeverageBudgetLine[] = [];
  let total = 0;
  let imageUrl: string | null = null;

  const pushChoice = (kind: DrinkKind, slug: string, choice: PricedDrink, servings: number, rule: string) => {
    total += choice.cost;
    if (!imageUrl && choice.imageUrl) imageUrl = choice.imageUrl;
    lines.push(drinkLine(kind, slug, choice.brandName, choice.brandName, pricedDetail(choice, servings, guests, rule), choice));
  };

  if (focusBrands.length) {
    const brands = [...focusBrands].sort((left, right) => {
      const leftKind = KIND_ORDER.indexOf(left.kind as DrinkKind);
      const rightKind = KIND_ORDER.indexOf(right.kind as DrinkKind);
      const byKind = (leftKind < 0 ? KIND_ORDER.length : leftKind) - (rightKind < 0 ? KIND_ORDER.length : rightKind);
      return byKind || left.name.localeCompare(right.name, 'fr');
    });
    for (const brand of brands) {
      if (!isDrinkKind(brand.kind)) continue;
      const family = DRINK_LABEL[brand.kind];
      const slug = `budget:boissons:${brand.kind}:${brandSlug(brand.name)}`;
      if (eventType === 'religious' && brand.kind !== 'DRINK') {
        lines.push(drinkLine(
          brand.kind,
          slug,
          brand.name,
          brand.name,
          `${brand.name} : alcool non inclus pour une cérémonie`,
        ));
        continue;
      }
      const need = needForKind(brand.kind, eventType, style);
      const servings = Math.ceil(guests * need.servingsPerGuest);
      const ownOffers = offers.filter((offer) => offer.brandId === brand.id || (!offer.brandId && offer.brandName === brand.name && offer.kind === brand.kind));
      const choices = pricedDrinks(ownOffers, brand.kind, servings);
      if (!choices.length) {
        lines.push(drinkLine(
          brand.kind,
          slug,
          brand.name,
          brand.name,
          `${brand.name} (${family}) : aucun tarif publié pour ce conditionnement · ${need.rule}`,
        ));
        continue;
      }
      pushChoice(brand.kind, slug, cheapestDrink(choices), servings, need.rule);
    }
    if (!lines.length) return null;
    return {
      amountFc: Math.round(total),
      note: lines.map((line) => line.detail).join(' · '),
      imageUrl,
      lines,
    };
  }

  if (!offers.length) return null;
  for (const need of needsFor(eventType, style)) {
    const servings = Math.ceil(guests * need.servingsPerGuest);
    if (servings < 1) continue;
    const family = DRINK_LABEL[need.kind];
    const choices = pricedDrinks(offers, need.kind, servings);
    if (!choices.length) {
      lines.push(drinkLine(
        need.kind,
        `budget:boissons:${need.kind}`,
        family,
        null,
        `${family} : aucun tarif publié · ${need.rule}`,
      ));
      continue;
    }
    pushChoice(need.kind, `budget:boissons:${need.kind}`, cheapestDrink(choices), servings, need.rule);
  }

  if (total <= 0) return null;
  return {
    amountFc: Math.round(total),
    note: lines.map((line) => line.detail).join(' · '),
    imageUrl,
    lines,
  };
}
