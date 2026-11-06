import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  extractEventPayoutAccount,
  maskPayoutPhone,
  normalizePayoutPhone,
  preserveServerOwnedEventPrep,
  resolvePayoutAccountUpdate,
} from './eventPayoutAccount.ts';

const NOW = new Date('2026-11-06T10:00:00Z');

describe('numéro de reversement des événements', () => {
  it('normalise les formats RDC', () => {
    assert.equal(normalizePayoutPhone('0812345678'), '243812345678');
    assert.equal(normalizePayoutPhone('+243 81 234 5678'), '243812345678');
    assert.equal(normalizePayoutPhone('00243812345678'), '243812345678');
    assert.equal(normalizePayoutPhone('12345'), null);
    assert.equal(normalizePayoutPhone(''), null);
  });

  it('exige un numéro quand la billetterie ou les dons sont actifs', () => {
    const r = resolvePayoutAccountUpdate({ body: {}, existingEventPrep: null, willCollect: true, userId: 'u1', now: NOW });
    assert.equal(r.kind, 'missing');
    const empty = resolvePayoutAccountUpdate({
      body: { payoutPhone: ' ' },
      existingEventPrep: { payoutAccount: { phone: '243812345678' } },
      willCollect: true,
      userId: 'u1',
      now: NOW,
    });
    assert.equal(empty.kind, 'missing');
  });

  it('refuse un numéro invalide', () => {
    const r = resolvePayoutAccountUpdate({ body: { payoutPhone: '123' }, existingEventPrep: null, willCollect: true, userId: 'u1' });
    assert.equal(r.kind, 'invalid');
  });

  it('enregistre le numéro et signale l’ancien en cas de changement', () => {
    const r = resolvePayoutAccountUpdate({
      body: { payoutPhone: '0991112222', payoutHolderName: 'Asso X' },
      existingEventPrep: { payoutAccount: { phone: '243812345678' } },
      willCollect: true,
      userId: 'u1',
      now: NOW,
    });
    assert.equal(r.kind, 'set');
    if (r.kind !== 'set') return;
    assert.equal(r.account.phone, '243991112222');
    assert.equal(r.account.holderName, 'Asso X');
    assert.equal(r.previousPhone, '243812345678');
  });

  it('garde le numéro existant si le champ est absent', () => {
    const r = resolvePayoutAccountUpdate({
      body: {},
      existingEventPrep: { payoutAccount: { phone: '243812345678' } },
      willCollect: true,
      userId: 'u1',
    });
    assert.equal(r.kind, 'unchanged');
  });

  it('pas de collecte : numéro facultatif', () => {
    const r = resolvePayoutAccountUpdate({ body: {}, existingEventPrep: null, willCollect: false, userId: 'u1' });
    assert.equal(r.kind, 'unchanged');
  });

  it('le formulaire ne peut ni écraser ni effacer le reversement', () => {
    const prev = { payout: { status: 'PAID', settledAmountFc: 5000 }, payoutAccount: { phone: '243812345678' } };
    const out = preserveServerOwnedEventPrep({ payout: { status: 'DUE' }, other: 1 }, prev);
    assert.deepEqual(out.payout, prev.payout);
    assert.deepEqual(out.payoutAccount, prev.payoutAccount);
    assert.equal(out.other, 1);
    const fresh = preserveServerOwnedEventPrep({ payout: { status: 'PAID' } }, null);
    assert.equal('payout' in fresh, false);
  });

  it('lit et masque le numéro', () => {
    assert.equal(extractEventPayoutAccount({ payoutAccount: { phone: 'abc' } }), null);
    assert.equal(maskPayoutPhone('243812345678'), '243••••••678');
  });
});
