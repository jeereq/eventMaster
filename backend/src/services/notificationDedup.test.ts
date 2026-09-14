import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  claimSimilarOutbound,
  isPlatformBrandedEmailSubject,
  isWithinDedupWindow,
  notificationDedupeKey,
  outboundChannelFingerprint,
  resetOutboundClaims,
} from './notificationDedup.ts';

describe('notificationDedupeKey', () => {
  it('keeps the same inquiry reply together', () => {
    assert.equal(
      notificationDedupeKey({
        type: 'MARKETPLACE_INQUIRY',
        title: 'Réponse devis — Salle',
        message: 'Disponible vendredi',
        metadata: { inquiryId: 'inq-1' },
      }),
      'MARKETPLACE_INQUIRY|Réponse devis — Salle|inq-1|Disponible vendredi',
    );
  });

  it('does not collapse two different replies', () => {
    assert.notEqual(
      notificationDedupeKey({
        type: 'MARKETPLACE_INQUIRY',
        title: 'Réponse devis — Salle',
        message: 'Premier message',
        metadata: { inquiryId: 'inq-1' },
      }),
      notificationDedupeKey({
        type: 'MARKETPLACE_INQUIRY',
        title: 'Réponse devis — Salle',
        message: 'Deuxième message',
        metadata: { inquiryId: 'inq-1' },
      }),
    );
  });

  it('prefers inquiryId when both entity ids are present', () => {
    assert.equal(
      notificationDedupeKey({
        type: 'MARKETPLACE_BOOKING',
        title: 'Réservation acceptée',
        message: 'Acompte requis',
        metadata: { bookingId: 'bk-1', inquiryId: 'inq-1' },
      }),
      'MARKETPLACE_BOOKING|Réservation acceptée|inq-1|Acompte requis',
    );
  });
});

describe('isWithinDedupWindow', () => {
  it('accepts events inside the window and rejects older ones', () => {
    const now = new Date('2026-09-14T12:00:00.000Z');
    assert.equal(isWithinDedupWindow(new Date('2026-09-14T11:59:00.000Z'), now, 90_000), true);
    assert.equal(isWithinDedupWindow(new Date('2026-09-14T11:58:00.000Z'), now, 90_000), false);
  });
});

describe('outbound channel dedup', () => {
  it('treats two emails to the same inbox with the same subject and body as one send', () => {
    resetOutboundClaims();
    const fingerprint = outboundChannelFingerprint({
      channel: 'EMAIL',
      to: 'Ada@Example.com',
      subject: 'EventMaster — Devis chiffré — Salle',
      body: 'Devis chiffré reçu pour « Salle » : 500 000 FC.',
    });
    const same = outboundChannelFingerprint({
      channel: 'EMAIL',
      to: 'ada@example.com',
      subject: 'EventMaster — Devis chiffré — Salle',
      body: 'Devis chiffré reçu pour « Salle » : 500 000 FC.',
    });
    assert.equal(fingerprint, same);
    assert.equal(claimSimilarOutbound(fingerprint, 1_000), true);
    assert.equal(claimSimilarOutbound(same, 1_400), false);
  });

  it('lets a later reply with a different body through', () => {
    resetOutboundClaims();
    const first = outboundChannelFingerprint({
      channel: 'EMAIL',
      to: 'ada@example.com',
      subject: 'EventMaster — Réponse devis — Salle',
      body: 'Premier message',
    });
    const second = outboundChannelFingerprint({
      channel: 'EMAIL',
      to: 'ada@example.com',
      subject: 'EventMaster — Réponse devis — Salle',
      body: 'Deuxième message',
    });
    assert.notEqual(first, second);
    assert.equal(claimSimilarOutbound(first, 1_000), true);
    assert.equal(claimSimilarOutbound(second, 1_200), true);
  });

  it('recognizes branded platform email subjects', () => {
    assert.equal(isPlatformBrandedEmailSubject('EventMaster — Devis chiffré — Salle'), true);
    assert.equal(isPlatformBrandedEmailSubject('Votre code OTP EventMaster'), false);
  });
});
