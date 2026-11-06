/**
 * Compte de reversement d'un événement : numéro Mobile Money sur lequel EventMaster
 * reverse le net de la billetterie et des dons. Stocké dans `eventPrep.payoutAccount`.
 */

export interface EventPayoutAccount {
  /** Numéro Mobile Money normalisé (243…). */
  phone: string;
  /** Nom du titulaire du compte Mobile Money (facultatif). */
  holderName: string | null;
  updatedAt: string;
  updatedByUserId: string | null;
}

/** Même règle que FlexPay : 243 + 9 chiffres (accepte 0…, 00243…, +243…). */
export function normalizePayoutPhone(input: unknown): string | null {
  const digits = String(input ?? '').replace(/\D/g, '');
  if (!digits) return null;
  let phone = digits;
  if (phone.startsWith('00')) phone = phone.slice(2);
  if (phone.startsWith('0') && phone.length === 10) phone = `243${phone.slice(1)}`;
  if (phone.length === 9 && /^[89]/.test(phone)) phone = `243${phone}`;
  if (!phone.startsWith('243') || phone.length < 12 || phone.length > 13) return null;
  return phone;
}

export function extractEventPayoutAccount(eventPrep: unknown): EventPayoutAccount | null {
  if (!eventPrep || typeof eventPrep !== 'object') return null;
  const raw = (eventPrep as Record<string, unknown>).payoutAccount;
  if (!raw || typeof raw !== 'object') return null;
  const rec = raw as Record<string, unknown>;
  const phone = normalizePayoutPhone(rec.phone);
  if (!phone) return null;
  return {
    phone,
    holderName: typeof rec.holderName === 'string' && rec.holderName.trim() ? rec.holderName.trim().slice(0, 120) : null,
    updatedAt: typeof rec.updatedAt === 'string' ? rec.updatedAt : '',
    updatedByUserId: typeof rec.updatedByUserId === 'string' ? rec.updatedByUserId : null,
  };
}

export type PayoutAccountResolution =
  | { kind: 'unchanged'; account: EventPayoutAccount | null }
  | { kind: 'set'; account: EventPayoutAccount; previousPhone: string | null }
  | { kind: 'invalid' }
  | { kind: 'missing' };

/**
 * Décide du compte de reversement après création / modification d'un événement.
 * - `payoutPhone` absent du corps : on garde l'existant.
 * - présent mais invalide : refus.
 * - collecte active (billetterie payante ou dons) sans numéro valide : refus.
 */
export function resolvePayoutAccountUpdate(params: {
  body: Record<string, unknown>;
  existingEventPrep: unknown;
  willCollect: boolean;
  userId: string | null;
  now?: Date;
}): PayoutAccountResolution {
  const existing = extractEventPayoutAccount(params.existingEventPrep);
  const hasPhoneField = params.body.payoutPhone !== undefined;

  if (hasPhoneField) {
    const raw = params.body.payoutPhone;
    const isEmpty = raw === null || String(raw).trim() === '';
    if (isEmpty) {
      if (params.willCollect) return { kind: 'missing' };
      return { kind: 'unchanged', account: existing };
    }
    const phone = normalizePayoutPhone(raw);
    if (!phone) return { kind: 'invalid' };
    const holderRaw = params.body.payoutHolderName;
    const holderName =
      typeof holderRaw === 'string' && holderRaw.trim()
        ? holderRaw.trim().slice(0, 120)
        : holderRaw === undefined
          ? existing?.holderName ?? null
          : null;
    if (existing && existing.phone === phone && existing.holderName === holderName) {
      return { kind: 'unchanged', account: existing };
    }
    return {
      kind: 'set',
      previousPhone: existing?.phone ?? null,
      account: {
        phone,
        holderName,
        updatedAt: (params.now ?? new Date()).toISOString(),
        updatedByUserId: params.userId,
      },
    };
  }

  if (params.willCollect && !existing) return { kind: 'missing' };
  return { kind: 'unchanged', account: existing };
}

/** Masque un numéro pour les messages : 243••••••123. */
export function maskPayoutPhone(phone: string): string {
  if (phone.length <= 6) return phone;
  return `${phone.slice(0, 3)}${'•'.repeat(Math.max(0, phone.length - 6))}${phone.slice(-3)}`;
}

/** Clés de `eventPrep` gérées uniquement par le serveur (jamais écrasées par le formulaire). */
export const SERVER_OWNED_EVENT_PREP_KEYS = ['payout', 'payoutAccount'] as const;

/** Remet les clés serveur de l'ancien `eventPrep` dans le nouveau (le client ne peut pas les modifier). */
export function preserveServerOwnedEventPrep(
  next: Record<string, unknown>,
  existingEventPrep: unknown,
): Record<string, unknown> {
  const prev =
    existingEventPrep && typeof existingEventPrep === 'object'
      ? (existingEventPrep as Record<string, unknown>)
      : {};
  const out = { ...next };
  for (const key of SERVER_OWNED_EVENT_PREP_KEYS) {
    if (key in prev) out[key] = prev[key];
    else delete out[key];
  }
  return out;
}
