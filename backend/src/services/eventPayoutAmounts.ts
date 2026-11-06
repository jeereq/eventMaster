type PayoutOrderLike = { amountFc: number; pricingZoneId: string | null };

/** Calcule brut, retenue, net et reste à verser d'un événement (commandes PAID uniquement). */
export function computeEventPayoutAmounts(params: {
  orders: PayoutOrderLike[];
  eventPrep: unknown;
  ticketRate: number;
  donationRate: number;
}) {
  let tGross = 0;
  let tCount = 0;
  let dGross = 0;
  let dCount = 0;
  for (const ord of params.orders) {
    if (ord.pricingZoneId === 'donation') {
      dGross += ord.amountFc;
      dCount += 1;
    } else {
      tGross += ord.amountFc;
      tCount += 1;
    }
  }
  const tRetention = Math.round(tGross * params.ticketRate);
  const dRetention = Math.round(dGross * params.donationRate);
  const gross = tGross + dGross;
  const retention = tRetention + dRetention;
  const net = gross - retention;

  const prep =
    params.eventPrep && typeof params.eventPrep === 'object'
      ? (params.eventPrep as Record<string, unknown>)
      : {};
  const payoutMeta =
    prep.payout && typeof prep.payout === 'object' ? (prep.payout as Record<string, unknown>) : null;

  const recordedSettled =
    typeof payoutMeta?.settledAmountFc === 'number' && Number.isFinite(payoutMeta.settledAmountFc)
      ? payoutMeta.settledAmountFc
      : null;
  const alreadySettledFc =
    recordedSettled ?? (payoutMeta?.status === 'PAID' ? net : 0);
  const remainingFc = Math.max(0, Math.round(net - alreadySettledFc));
  /**
   * Trop-versé : des paiements ont été annulés après un reversement, le net est passé sous
   * ce qui a déjà été versé. Rien n'est versé tant que les nouveaux encaissements n'ont pas
   * comblé cet écart (le reste à verser vaut 0).
   */
  const overpaidFc = Math.max(0, Math.round(alreadySettledFc - net));
  const payoutStatus = derivePayoutStatus({ gross, alreadySettledFc, remainingFc });

  return {
    tGross,
    tCount,
    tRetention,
    tNet: tGross - tRetention,
    dGross,
    dCount,
    dRetention,
    dNet: dGross - dRetention,
    gross,
    retention,
    net,
    payoutMeta,
    alreadySettledFc,
    remainingFc,
    overpaidFc,
    payoutStatus,
  };
}

/**
 * Statut affiché d'un événement, déduit des montants (et non du dernier statut enregistré) :
 * de nouvelles ventes après un reversement complet repassent l'événement en « Partiel ».
 */
export function derivePayoutStatus(params: {
  gross: number;
  alreadySettledFc: number;
  remainingFc: number;
}): 'NONE' | 'DUE' | 'PARTIAL' | 'PAID' {
  if (params.gross <= 0 && params.alreadySettledFc <= 0) return 'NONE';
  if (params.remainingFc <= 0) return params.alreadySettledFc > 0 || params.gross > 0 ? 'PAID' : 'NONE';
  return params.alreadySettledFc > 0 ? 'PARTIAL' : 'DUE';
}

/**
 * Métadonnées `eventPrep.payout` après un versement FlexPay réussi : on ajoute le montant
 * au déjà-versé, PAID si tout le net est couvert, PARTIAL sinon.
 */
export function applyFlexPaySettlement(params: {
  payoutMeta: Record<string, unknown> | null;
  netFc: number;
  alreadySettledFc: number;
  amountFc: number;
  orderNumber: string;
  providerReference: string | null;
  actorId: string;
  now: Date;
}) {
  const settled = Math.round(params.alreadySettledFc + params.amountFc);
  const previousNotes =
    typeof params.payoutMeta?.notes === 'string' && params.payoutMeta.notes.trim()
      ? `${params.payoutMeta.notes.trim()}\n`
      : '';
  const line = [
    `FlexPay Pay Out ${params.amountFc} FC`,
    `n° ${params.orderNumber}`,
    params.providerReference ? `réf. opérateur ${params.providerReference}` : null,
    params.now.toISOString().slice(0, 10),
  ]
    .filter(Boolean)
    .join(' · ');
  const status = settled >= params.netFc ? 'PAID' : 'PARTIAL';
  return {
    ...(params.payoutMeta || {}),
    status,
    settledAt: params.now.toISOString(),
    settledBy: params.actorId,
    settledAmountFc: settled,
    proofUrl: `flexpay:${params.orderNumber}`,
    notes: `${previousNotes}${line}`.slice(-2000),
    paymentMethod: 'FlexPay Pay Out',
    updatedAt: params.now.toISOString(),
  };
}
