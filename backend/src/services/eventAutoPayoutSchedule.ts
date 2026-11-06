/** Planification pure (testable) du reversement automatique de minuit. */

/** Kinshasa = UTC+1, sans heure d'été. Surchargeable par EVENT_AUTO_PAYOUT_UTC_OFFSET_MINUTES. */
export function autoPayoutUtcOffsetMinutes(): number {
  const raw = Number(process.env.EVENT_AUTO_PAYOUT_UTC_OFFSET_MINUTES);
  return Number.isFinite(raw) && Math.abs(raw) <= 14 * 60 ? Math.round(raw) : 60;
}

/** Prochain 0h00 local (strictement après `now`). */
export function nextLocalMidnight(now: Date, offsetMinutes: number): Date {
  const offsetMs = offsetMinutes * 60_000;
  const local = new Date(now.getTime() + offsetMs);
  const nextLocal = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() + 1, 0, 0, 0, 0);
  return new Date(nextLocal - offsetMs);
}

/** Date locale AAAA-MM-JJ (jour du passage). */
export function localDateLabel(now: Date, offsetMinutes: number): string {
  return new Date(now.getTime() + offsetMinutes * 60_000).toISOString().slice(0, 10);
}

export type AutoPayoutSkipReason =
  | 'NOTHING_DUE'
  | 'BELOW_MINIMUM'
  | 'EVENT_NOT_ENDED'
  | 'BLOCKED'
  | 'PENDING'
  | 'LAST_FAILED_SAME_PHONE'
  | 'MISSING_PHONE';

/** Décide si un événement part dans le reversement automatique de la nuit. */
export function autoPayoutDecision(params: {
  remainingFc: number;
  minFc: number;
  timing: 'after_event' | 'daily';
  eventEnded: boolean;
  isBlockedByAdmin: boolean;
  hasPendingTransfer: boolean;
  /** Dernier versement de l'événement (le plus récent), s'il y en a un. */
  lastTransfer: { status: string; phone: string } | null;
  payoutPhone: string | null;
}): { send: true } | { send: false; reason: AutoPayoutSkipReason } {
  if (params.remainingFc <= 0) return { send: false, reason: 'NOTHING_DUE' };
  if (params.isBlockedByAdmin) return { send: false, reason: 'BLOCKED' };
  if (params.timing === 'after_event' && !params.eventEnded) return { send: false, reason: 'EVENT_NOT_ENDED' };
  if (params.remainingFc < params.minFc) return { send: false, reason: 'BELOW_MINIMUM' };
  if (params.hasPendingTransfer) return { send: false, reason: 'PENDING' };
  if (!params.payoutPhone) return { send: false, reason: 'MISSING_PHONE' };
  // Un refus FlexPay sur ce même numéro se répéterait chaque nuit : on attend qu'un admin
  // relance à la main ou que l'organisateur change de numéro.
  if (params.lastTransfer?.status === 'FAILED' && params.lastTransfer.phone === params.payoutPhone) {
    return { send: false, reason: 'LAST_FAILED_SAME_PHONE' };
  }
  return { send: true };
}
