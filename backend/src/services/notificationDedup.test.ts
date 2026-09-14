import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isWithinDedupWindow, notificationDedupeKey } from './notificationDedup.ts';

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
