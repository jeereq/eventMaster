const MAX_LABEL = 80;

export type OfferPromotion = {
  promoPriceFc: number | null;
  promoLabel: string | null;
  promoEndsAt: Date | null;
};

function cleanLabel(value: unknown): string | null {
  const text = String(value ?? '').trim().replace(/\s+/g, ' ');
  if (!text) return null;
  return text.slice(0, MAX_LABEL);
}

export function parseOfferPromotion(input: {
  priceFc: number;
  promoPriceFc: unknown;
  promoLabel: unknown;
  promoEndsAt?: unknown;
}): { promo: OfferPromotion } | { error: string } {
  const raw = input.promoPriceFc;
  const empty = raw == null || raw === '';
  if (empty) {
    return { promo: { promoPriceFc: null, promoLabel: null, promoEndsAt: null } };
  }
  const promoPriceFc = Math.round(Number(raw));
  if (!Number.isFinite(promoPriceFc) || promoPriceFc < 0) {
    return { error: 'Le prix promotionnel doit être un montant en FC.' };
  }
  if (input.priceFc > 0 && promoPriceFc >= input.priceFc) {
    return { error: 'Le prix promotionnel doit être inférieur au tarif normal.' };
  }
  let promoEndsAt: Date | null = null;
  if (input.promoEndsAt != null && String(input.promoEndsAt).trim()) {
    const end = new Date(String(input.promoEndsAt));
    if (Number.isNaN(end.getTime())) return { error: 'La date de fin de promotion est invalide.' };
    promoEndsAt = end;
  }
  return {
    promo: {
      promoPriceFc,
      promoLabel: cleanLabel(input.promoLabel),
      promoEndsAt,
    },
  };
}

export function activePromoPrice(input: {
  priceFc: number | null | undefined;
  promoPriceFc?: number | null;
  promoEndsAt?: Date | string | null;
  now?: Date;
}): number | null {
  const price = input.priceFc;
  const promo = input.promoPriceFc;
  if (price == null || promo == null || promo < 0 || promo >= price) return null;
  if (input.promoEndsAt) {
    const end = new Date(input.promoEndsAt);
    if (Number.isNaN(end.getTime()) || end.getTime() < (input.now ?? new Date()).getTime()) return null;
  }
  return promo;
}
