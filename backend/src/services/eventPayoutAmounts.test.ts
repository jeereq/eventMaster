import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { applyFlexPaySettlement, computeEventPayoutAmounts } from './eventPayoutAmounts.ts';

const orders = [
  { amountFc: 10000, pricingZoneId: 'vip' },
  { amountFc: 10000, pricingZoneId: null },
  { amountFc: 5000, pricingZoneId: 'donation' },
];

describe('montants de reversement événement', () => {
  it('calcule le net après retenues', () => {
    const a = computeEventPayoutAmounts({ orders, eventPrep: {}, ticketRate: 0.05, donationRate: 0.04 });
    assert.equal(a.gross, 25000);
    assert.equal(a.retention, 1000 + 200);
    assert.equal(a.net, 23800);
    assert.equal(a.remainingFc, 23800);
  });

  it('déduit un versement partiel déjà fait', () => {
    const a = computeEventPayoutAmounts({
      orders,
      eventPrep: { payout: { status: 'PARTIAL', settledAmountFc: 10000 } },
      ticketRate: 0.05,
      donationRate: 0.04,
    });
    assert.equal(a.remainingFc, 13800);
  });

  it('un reversement PAID sans montant ne laisse rien à verser', () => {
    const a = computeEventPayoutAmounts({
      orders,
      eventPrep: { payout: { status: 'PAID' } },
      ticketRate: 0.05,
      donationRate: 0.04,
    });
    assert.equal(a.remainingFc, 0);
  });
});

describe('reversement FlexPay confirmé', () => {
  const now = new Date('2026-10-07T12:00:00Z');

  it('passe PARTIAL puis PAID en cumulant', () => {
    const first = applyFlexPaySettlement({
      payoutMeta: null,
      netFc: 23800,
      alreadySettledFc: 0,
      amountFc: 10000,
      orderNumber: 'O1',
      providerReference: 'P1',
      actorId: 'admin',
      now,
    });
    assert.equal(first.status, 'PARTIAL');
    assert.equal(first.settledAmountFc, 10000);
    assert.equal(first.proofUrl, 'flexpay:O1');

    const second = applyFlexPaySettlement({
      payoutMeta: first,
      netFc: 23800,
      alreadySettledFc: first.settledAmountFc,
      amountFc: 13800,
      orderNumber: 'O2',
      providerReference: null,
      actorId: 'admin',
      now,
    });
    assert.equal(second.status, 'PAID');
    assert.equal(second.settledAmountFc, 23800);
    assert.equal(second.paymentMethod, 'FlexPay Pay Out');
    assert.match(String(second.notes), /O1[\s\S]*O2/);
  });
});
