import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  effectiveBlockedDates,
  isRangeAvailable,
  rowUnavailableDates,
  sanitizeVendorUnavailableDates,
} from './marketplaceDates.ts';

describe('indisponibilités du prestataire', () => {
  it('ajoute les jours du prestataire aux jours bloqués de la fiche', () => {
    const row = {
      blockedDates: ['2026-12-01'],
      tenant: { marketplaceUnavailableDates: ['2026-12-05', '2026-12-01'] },
    };
    assert.deepEqual(effectiveBlockedDates(row), ['2026-12-01', '2026-12-05']);
  });

  it('rend la fiche indisponible sur un jour du prestataire', () => {
    const row = {
      blockedDates: null,
      tenant: { marketplaceUnavailableDates: ['2026-12-05'] },
      bookings: [{ eventDate: new Date('2026-12-10T12:00:00Z') }],
    };
    const unavailable = rowUnavailableDates(row);
    assert.deepEqual(unavailable, ['2026-12-05', '2026-12-10']);
    assert.equal(isRangeAvailable(unavailable, '2026-12-04', '2026-12-06'), false);
    assert.equal(isRangeAvailable(unavailable, '2026-12-06', '2026-12-09'), true);
  });

  it('fonctionne sans prestataire chargé', () => {
    assert.deepEqual(effectiveBlockedDates({ blockedDates: ['2026-12-01'] }), ['2026-12-01']);
  });

  it('écarte les jours passés et les valeurs invalides', () => {
    const today = new Date('2026-11-07T10:00:00Z');
    assert.deepEqual(
      sanitizeVendorUnavailableDates(['2026-11-01', 'n’importe quoi', '2026-11-06', '2026-11-20', '2026-11-20'], today),
      ['2026-11-06', '2026-11-20'],
    );
    assert.deepEqual(sanitizeVendorUnavailableDates('pas une liste', today), []);
  });
});
