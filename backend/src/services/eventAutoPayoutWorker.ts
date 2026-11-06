import { prisma } from '../db';
import { PLATFORM_NOTIFICATION_TYPE } from '../config/platformNotificationTypes';
import { loadPlatformSettings, sanitizeEventAutoPayoutSettings } from './platformSettingsService';
import { isFlexPayPayoutConfigured } from './flexPayPayoutClient';
import { computeEventPayoutAmounts } from './eventPayoutAmounts';
import { eventPayoutRates, isEventEnded } from './eventPayoutService';
import { extractEventPayoutAccount } from './eventPayoutAccount';
import {
  AUTO_PAYOUT_ACTOR_ID,
  initiateEventFlexPayPayout,
  verifyEventFlexPayPayout,
} from './eventFlexPayPayoutService';
import {
  notifyAutoPayoutRunSummary,
  notifyEventPayoutActionRequired,
  notifyEventPayoutOverpaid,
} from './eventPayoutNotifications';
import {
  autoPayoutDecision,
  autoPayoutUtcOffsetMinutes,
  localDateLabel,
  nextLocalMidnight,
  type AutoPayoutSkipReason,
} from './eventAutoPayoutSchedule';

/**
 * Reversement automatique des événements, chaque nuit à 0h00 (heure de Kinshasa) :
 * 1. vérifie auprès de FlexPay les versements restés en attente ;
 * 2. signale les trop-versés (paiements annulés après un reversement) ;
 * 3. envoie par FlexPay Pay Out le reste à verser de chaque événement éligible, vers le
 *    numéro Mobile Money de reversement renseigné par l'organisateur.
 * Les garde-fous du reversement manuel s'appliquent (un seul versement en attente par
 * événement, montant ≤ reste à verser, statut confirmé par FlexPay).
 */

export interface AutoPayoutRunResult {
  startedAt: string;
  finishedAt: string;
  runDate: string;
  skipped?: 'DISABLED' | 'NOT_CONFIGURED' | 'ALREADY_RUNNING';
  verifiedPending: number;
  sentCount: number;
  sentAmountFc: number;
  failedCount: number;
  uncertainCount: number;
  missingPhoneCount: number;
  overpaidCount: number;
  skippedByReason: Partial<Record<AutoPayoutSkipReason, number>>;
}

let running = false;
let lastRun: AutoPayoutRunResult | null = null;
let nextRunAt: Date | null = null;
let timer: NodeJS.Timeout | null = null;

export function getEventAutoPayoutStatus() {
  const settings = sanitizeEventAutoPayoutSettings(loadPlatformSettings());
  return {
    enabled: settings.eventAutoPayoutEnabled,
    timing: settings.eventAutoPayoutTiming,
    minFc: settings.eventAutoPayoutMinFc,
    flexPayConfigured: isFlexPayPayoutConfigured(),
    nextRunAt: nextRunAt?.toISOString() ?? null,
    lastRun,
  };
}

async function alreadyNotifiedOverpaid(eventId: string, overpaidFc: number): Promise<boolean> {
  const rows = await prisma.platformNotification.findMany({
    where: {
      type: PLATFORM_NOTIFICATION_TYPE.EVENT_PAYOUT_OVERPAID,
      metadata: { path: ['eventId'], equals: eventId },
    },
    select: { metadata: true },
    take: 10,
    orderBy: { createdAt: 'desc' },
  });
  return rows.some((r) => (r.metadata as { overpaidFc?: number } | null)?.overpaidFc === overpaidFc);
}

export async function runEventAutoPayouts(opts?: { now?: Date; force?: boolean }): Promise<AutoPayoutRunResult> {
  const now = opts?.now ?? new Date();
  const offset = autoPayoutUtcOffsetMinutes();
  const result: AutoPayoutRunResult = {
    startedAt: now.toISOString(),
    finishedAt: now.toISOString(),
    runDate: localDateLabel(now, offset),
    verifiedPending: 0,
    sentCount: 0,
    sentAmountFc: 0,
    failedCount: 0,
    uncertainCount: 0,
    missingPhoneCount: 0,
    overpaidCount: 0,
    skippedByReason: {},
  };
  const settings = sanitizeEventAutoPayoutSettings(loadPlatformSettings());

  if (running) return { ...result, skipped: 'ALREADY_RUNNING' };
  if (!settings.eventAutoPayoutEnabled && !opts?.force) {
    lastRun = { ...result, skipped: 'DISABLED' };
    return lastRun;
  }
  if (!isFlexPayPayoutConfigured()) {
    lastRun = { ...result, skipped: 'NOT_CONFIGURED' };
    return lastRun;
  }

  running = true;
  try {
    // 1. Rattrapage des versements en attente (callback FlexPay manqué).
    const pending = await prisma.eventPayoutTransfer.findMany({
      where: { status: 'PENDING', flexPayOrderNumber: { not: null } },
      select: { id: true },
    });
    for (const t of pending) {
      try {
        await verifyEventFlexPayPayout(t.id);
        result.verifiedPending += 1;
      } catch (err) {
        console.error('[AutoPayout] vérification versement', t.id, err);
      }
    }

    // 2–3. Événements avec encaissements.
    const { ticketRate, donationRate } = eventPayoutRates();
    const events = await prisma.event.findMany({
      where: { ticketOrders: { some: { status: 'PAID' } } },
      select: {
        id: true,
        title: true,
        tenantId: true,
        date: true,
        endsAt: true,
        isBlockedByAdmin: true,
        eventPrep: true,
        ticketOrders: { where: { status: 'PAID' }, select: { amountFc: true, pricingZoneId: true } },
      },
    });
    const transfers = events.length
      ? await prisma.eventPayoutTransfer.findMany({
          where: { eventId: { in: events.map((e) => e.id) } },
          select: { eventId: true, status: true, phone: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
        })
      : [];

    for (const ev of events) {
      const amounts = computeEventPayoutAmounts({
        orders: ev.ticketOrders,
        eventPrep: ev.eventPrep,
        ticketRate,
        donationRate,
      });

      if (amounts.overpaidFc > 0) {
        result.overpaidCount += 1;
        if (!(await alreadyNotifiedOverpaid(ev.id, amounts.overpaidFc))) {
          await notifyEventPayoutOverpaid({
            eventId: ev.id,
            eventTitle: ev.title,
            tenantId: ev.tenantId,
            overpaidFc: amounts.overpaidFc,
          });
        }
      }

      const evTransfers = transfers.filter((t) => t.eventId === ev.id);
      const account = extractEventPayoutAccount(ev.eventPrep);
      const decision = autoPayoutDecision({
        remainingFc: amounts.remainingFc,
        minFc: settings.eventAutoPayoutMinFc,
        timing: settings.eventAutoPayoutTiming,
        eventEnded: isEventEnded(ev, now),
        isBlockedByAdmin: ev.isBlockedByAdmin,
        hasPendingTransfer: evTransfers.some((t) => t.status === 'PENDING'),
        lastTransfer: evTransfers[0] ?? null,
        payoutPhone: account?.phone ?? null,
      });

      if (!decision.send) {
        result.skippedByReason[decision.reason] = (result.skippedByReason[decision.reason] ?? 0) + 1;
        if (decision.reason === 'MISSING_PHONE') {
          result.missingPhoneCount += 1;
          await notifyEventPayoutActionRequired({
            eventId: ev.id,
            eventTitle: ev.title,
            tenantId: ev.tenantId,
            remainingFc: amounts.remainingFc,
          });
        }
        continue;
      }

      try {
        const sent = await initiateEventFlexPayPayout({
          eventId: ev.id,
          initiatedByUserId: AUTO_PAYOUT_ACTOR_ID,
          automatic: true,
        });
        if (!sent.error) {
          result.sentCount += 1;
          result.sentAmountFc += sent.transfer.amountFc;
        } else if (sent.error === 'FLEXPAY_REFUSED') {
          result.failedCount += 1;
        } else if (sent.error === 'UNCERTAIN') {
          result.uncertainCount += 1;
        } else {
          const reason = sent.error === 'ALREADY_PENDING' ? 'PENDING' : 'NOTHING_DUE';
          result.skippedByReason[reason] = (result.skippedByReason[reason] ?? 0) + 1;
        }
      } catch (err) {
        result.uncertainCount += 1;
        console.error('[AutoPayout] versement événement', ev.id, err);
      }
    }

    result.finishedAt = new Date().toISOString();
    lastRun = result;
    console.log(
      `[AutoPayout] ${result.runDate} — envoyés : ${result.sentCount} (${result.sentAmountFc} FC), refusés : ${result.failedCount}, incertains : ${result.uncertainCount}, sans numéro : ${result.missingPhoneCount}`,
    );
    await notifyAutoPayoutRunSummary(result);
    return result;
  } finally {
    running = false;
  }
}

function scheduleNext() {
  const offset = autoPayoutUtcOffsetMinutes();
  nextRunAt = nextLocalMidnight(new Date(), offset);
  const delay = Math.max(1000, nextRunAt.getTime() - Date.now());
  timer = setTimeout(() => {
    void runEventAutoPayouts()
      .catch((err) => console.error('[AutoPayout] Erreur:', err))
      .finally(scheduleNext);
  }, delay);
  timer.unref?.();
}

export function startEventAutoPayoutWorker() {
  if (process.env.EVENT_AUTO_PAYOUT_DISABLED === 'true') {
    console.log('[AutoPayout] Désactivé par EVENT_AUTO_PAYOUT_DISABLED.');
    return;
  }
  if (timer) return;
  scheduleNext();
  console.log(`[AutoPayout] Prochain reversement automatique : ${nextRunAt?.toISOString()}`);
}
