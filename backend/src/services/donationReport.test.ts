import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseDonationMeta,
  resolveChannelLabel,
  csvEscape,
} from '../utils/donationReportUtils.ts';

describe('donationReport utilities', () => {
  it('extrait correctement les métadonnées de don (anonymat, note, pass)', () => {
    const meta = parseDonationMeta({
      kind: 'donation',
      donationNote: ' Bravo pour cette belle initiative ! ',
      isAnonymous: true,
      donorAttendancePass: false,
    });

    assert.equal(meta.kind, 'donation');
    assert.equal(meta.donationNote, 'Bravo pour cette belle initiative !');
    assert.equal(meta.isAnonymous, true);
    assert.equal(meta.donorAttendancePass, false);
  });

  it('gère les valeurs nulles ou absentes avec des défauts sûrs', () => {
    const metaEmpty = parseDonationMeta(null);
    assert.equal(metaEmpty.isAnonymous, undefined);
    assert.equal(metaEmpty.donorAttendancePass, true);

    const metaSpaces = parseDonationMeta({ donationNote: '   ', isAnonymous: false });
    assert.equal(metaSpaces.donationNote, null);
    assert.equal(metaSpaces.isAnonymous, false);
  });

  it('résout convenablement les libellés des opérateurs de paiement en RDC', () => {
    assert.equal(resolveChannelLabel('mpesa', null), 'M-Pesa (Vodacom)');
    assert.equal(resolveChannelLabel('vodacom', null), 'M-Pesa (Vodacom)');
    assert.equal(resolveChannelLabel('orange_money', null), 'Orange Money');
    assert.equal(resolveChannelLabel('airtel', null), 'Airtel Money');
    assert.equal(resolveChannelLabel('afrimoney', null), 'Afrimoney');
    assert.equal(resolveChannelLabel('card', 'flexpay'), 'Carte Bancaire (FlexPay)');
    assert.equal(resolveChannelLabel(null, 'stripe'), 'Carte Bancaire (Stripe)');
    assert.equal(resolveChannelLabel(null, null), 'Mobile Money / En ligne');
  });

  it('échappe correctement les champs pour le format CSV', () => {
    assert.equal(csvEscape('Simple text'), '"Simple text"');
    assert.equal(csvEscape('Text with "quotes"'), '"Text with ""quotes"""');
    assert.equal(csvEscape('Text\nwith\nnewlines'), '"Text with newlines"');
    assert.equal(csvEscape(null), '""');
  });
});
