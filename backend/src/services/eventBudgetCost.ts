import { activePromoPrice } from './offerPromotion.ts';
import type { EventPlanType } from './eventPlanBrief';

export type BudgetStyle = 'cheap' | 'balanced' | 'comfort';

export type BudgetSimulationScope = 'complete' | 'drinks' | 'rentals' | 'services';

export function parseBudgetSimulationScope(value: unknown): BudgetSimulationScope {
  if (value === 'drinks' || value === 'rentals' || value === 'services') return value;
  return 'complete';
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
  let note = money(unit);

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
    note = `${money(unit)} × ${days} jour${days > 1 ? 's' : ''}`;
  } else if ((input.priceUnit === 'PERSON' || input.priceUnit === 'QUOTA') && guests > 0) {
    amount = unit * guests;
    note = `${guests} × ${money(unit)}`;
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

export function beverageBudgetAmount(
  offers: BeverageBudgetOffer[],
  guestCount: number,
  eventType: EventPlanType,
  style: BudgetStyle,
): (BudgetAmount & { imageUrl: string | null }) | null {
  const guests = Math.max(0, Math.floor(guestCount));
  if (guests < 1 || !offers.length) return null;
  const parts: string[] = [];
  let total = 0;
  let imageUrl: string | null = null;

  for (const need of needsFor(eventType, style)) {
    const servings = Math.ceil(guests * need.servingsPerGuest);
    if (servings < 1) continue;
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
      return [{
        cost: packs * unitPrice,
        imageUrl: offer.imageUrl || null,
        label: `${DRINK_LABEL[need.kind]} : ${packs} × ${offer.unitLabel} (${offer.brandName}, ${need.rule})`,
      }];
    });
    if (!choices.length) {
      parts.push(`${DRINK_LABEL[need.kind]} : aucun tarif publié`);
      continue;
    }
    const best = choices.reduce((cheapest, item) => (item.cost < cheapest.cost ? item : cheapest));
    total += best.cost;
    if (!imageUrl && best.imageUrl) imageUrl = best.imageUrl;
    parts.push(best.label);
  }

  if (total <= 0) return null;
  return {
    amountFc: Math.round(total),
    note: parts.join(' · '),
    imageUrl,
  };
}
