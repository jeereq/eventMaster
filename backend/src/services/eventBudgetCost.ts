import { activePromoPrice } from './offerPromotion.ts';
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
};

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

  const delivery = input.deliveryPriceFc && input.deliveryPriceFc > 0 ? Math.round(input.deliveryPriceFc) : 0;
  if (input.deliveryMode === 'extra_fee' && delivery > 0) {
    amount += delivery;
    note = `${note} + livraison ${money(delivery)}`;
  } else if (input.deliveryMode === 'included' && delivery > 0) {
    note = `${note} · livraison incluse ${money(delivery)}`;
  } else if (input.deliveryMode === 'pickup') {
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

function needsFor(eventType: EventPlanType, style: BudgetStyle): DrinkNeed[] {
  const soft = (rate: number): DrinkNeed => ({ kind: 'DRINK', servingsPerGuest: rate, rule: `${rate} verre ou bouteille par invité` });
  const beer = (rate: number): DrinkNeed => ({ kind: 'BEER', servingsPerGuest: rate, rule: `${rate} bouteille par invité` });
  const wine = (guestsPerBottle: number): DrinkNeed => ({
    kind: 'WINE',
    servingsPerGuest: 1 / guestsPerBottle,
    rule: `1 bouteille pour ${guestsPerBottle} invités`,
  });
  const champagne = (guestsPerBottle: number): DrinkNeed => ({
    kind: 'CHAMPAGNE',
    servingsPerGuest: 1 / guestsPerBottle,
    rule: `1 bouteille pour ${guestsPerBottle} invités`,
  });

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
  brandName: string;
  imageUrl?: string | null;
  quantity: number;
  unitLabel: string;
  priceFc: number;
  promoPriceFc?: number | null;
  promoEndsAt?: Date | string | null;
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

export function beverageBudgetAmount(
  offers: BeverageBudgetOffer[],
  guestCount: number,
  eventType: EventPlanType,
  style: BudgetStyle,
): (BudgetAmount & { imageUrl: string | null; lines: BeverageBudgetLine[] }) | null {
  const guests = Math.max(0, Math.floor(guestCount));
  if (guests < 1 || !offers.length) return null;
  const lines: BeverageBudgetLine[] = [];
  let total = 0;
  let imageUrl: string | null = null;

  for (const need of needsFor(eventType, style)) {
    const servings = Math.ceil(guests * need.servingsPerGuest);
    if (servings < 1) continue;
    const family = DRINK_LABEL[need.kind];
    const choices = offers.flatMap((offer) => {
      if (offer.kind !== need.kind) return [];
      const unitPrice = payableUnitPrice({
        priceFromFc: offer.priceFc,
        promoPriceFc: offer.promoPriceFc,
        promoEndsAt: offer.promoEndsAt,
      });
      if (unitPrice == null) return [];
      const pack = Math.max(1, Math.floor(offer.quantity) || 1);
      const packs = Math.ceil(servings / pack);
      const quantityLabel = `${packs} × ${offer.unitLabel}`;
      return [{
        cost: packs * unitPrice,
        imageUrl: offer.imageUrl || null,
        brandName: offer.brandName,
        quantityLabel,
        unitPrice,
        unitLabel: offer.unitLabel,
        pack,
      }];
    });
    if (!choices.length) {
      lines.push({
        kind: need.kind,
        slug: `budget:boissons:${need.kind}`,
        title: family,
        categoryLabel: family,
        brandName: null,
        quantityLabel: '',
        unitPriceFc: null,
        amountFc: 0,
        imageUrl: null,
        detail: `${family} : aucun tarif publié · ${need.rule}`,
      });
      continue;
    }
    const best = choices.reduce((cheapest, item) => (item.cost < cheapest.cost ? item : cheapest));
    total += best.cost;
    if (!imageUrl && best.imageUrl) imageUrl = best.imageUrl;
    const contained = best.pack > 1 ? ` (${best.pack} par ${best.unitLabel})` : '';
    lines.push({
      kind: need.kind,
      slug: `budget:boissons:${need.kind}`,
      title: best.brandName,
      categoryLabel: family,
      brandName: best.brandName,
      quantityLabel: best.quantityLabel,
      unitPriceFc: best.unitPrice,
      amountFc: best.cost,
      imageUrl: best.imageUrl,
      detail: `${best.quantityLabel}${contained} · ${money(best.unitPrice)} / ${best.unitLabel} · ${servings} pour ${guests} invités (${need.rule})`,
    });
  }

  if (total <= 0) return null;
  return {
    amountFc: Math.round(total),
    note: lines.map((line) => line.detail).join(' · '),
    imageUrl,
    lines,
  };
}
