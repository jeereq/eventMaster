import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  comparisonValueFromDb,
  editorBadgeFromDb,
  formatQuota,
  guestsBadgeFromDb,
  planDisplayName,
  guestQuotaLabel,
  highlightsFromDb,
} from './planCatalogDb.ts';

describe('plan catalog from database', () => {
  it('formats quotas like the pricing table', () => {
    assert.equal(formatQuota(0), '—');
    assert.equal(formatQuota(9999), 'Illimité');
    assert.equal(formatQuota(99999), 'Illimité');
    assert.equal(formatQuota(3500), '3 500');
    assert.equal(guestQuotaLabel('PERSONAL_50', 50), '50 / trim.');
    assert.equal(guestQuotaLabel('STANDARD', 150), '150 / mois');
    assert.equal(guestQuotaLabel('FREE', 50), '50 (total essai)');
  });

  it('uses database quotas and flags in the comparison table', () => {
    const db = { maxEvents: 10, maxGuests: 200, customTemplates: true, roomEditorLevel: 'advanced', maxRooms: 4, supportLevel: 'priority' };
    assert.equal(comparisonValueFromDb('Événements actifs', 'STANDARD', '8', db), '10');
    assert.equal(comparisonValueFromDb('Invités inclus par période payée (quota org.)', 'STANDARD', '150 / mois', db), '200 / mois');
    assert.equal(comparisonValueFromDb('Modèles personnalisés', 'STANDARD', false, db), true);
    assert.equal(comparisonValueFromDb('Éditeur de salle 2D / 3D', 'STANDARD', 'Standard', db), 'Avancé');
    assert.equal(comparisonValueFromDb('Support & SLA', 'STANDARD', 'E-mail', db), 'Prioritaire');
  });

  it('keeps editorial rows and falls back before the database answers', () => {
    assert.equal(comparisonValueFromDb('Rendu 3D showcase & vue animée', 'STANDARD', true, { maxEvents: 1 }), true);
    assert.equal(comparisonValueFromDb('Événements actifs', 'STANDARD', '8', null), '8');
    assert.equal(comparisonValueFromDb('Événements actifs', 'STANDARD', '8', {}), '8');
  });

  it('shows no editor for plans without rooms', () => {
    assert.equal(comparisonValueFromDb('Éditeur de salle 2D / 3D', 'SERVICE', '—', { maxRooms: 0, roomEditorLevel: 'basic' }), '—');
  });

  it('rewrites the quota bullets of a card', () => {
    const lines = ['8 événements · 150 invités / mois', '4 essais IA', '3 salles publiables · éditeur Business', 'Prestations'];
    assert.deepEqual(highlightsFromDb('STANDARD', lines, { maxEvents: 10, maxGuests: 300, maxRooms: 4 }), [
      '10 événements · 300 invités / mois',
      '4 essais IA',
      '4 salles publiables · éditeur Business',
      'Prestations',
    ]);
    assert.deepEqual(highlightsFromDb('PERSONAL_PLUS', ['3 événements · invités illimités', '2 salles · hors marketplace'], { maxEvents: 3, maxGuests: 99999, maxRooms: 2 }), [
      '3 événements · invités illimités',
      '2 salles · hors marketplace',
    ]);
    assert.deepEqual(highlightsFromDb('FREE', ['3 événements · 50 invités (essai)', '1 salle · 1 prestation'], { maxEvents: 3, maxGuests: 50, maxRooms: 1 }), [
      '3 événements · 50 invités (essai)',
      '1 salle · 1 prestation',
    ]);
    assert.deepEqual(highlightsFromDb('STANDARD', lines, null), lines);
  });

  it('derives the editor badge from the database', () => {
    assert.equal(editorBadgeFromDb({ roomEditorLevel: 'complete' }), 'editorComplete');
    assert.equal(editorBadgeFromDb({ roomEditorLevel: 'basic' }), null);
    assert.equal(editorBadgeFromDb(null), null);
  });

  it('rewrites capitalised event bullets too', () => {
    assert.deepEqual(highlightsFromDb('PERSONAL_PLUS', ['Événements illimités · +200 invités'], { maxEvents: 3, maxGuests: 99999 }), [
      '3 événements · invités illimités',
    ]);
  });

  it('names plans and guest badges from the database', () => {
    assert.equal(planDisplayName('PREMIUM_1', { name: 'Premium' }, 'X'), 'Premium');
    assert.equal(planDisplayName('PREMIUM_1', null, 'Premium (secours)'), 'Premium (secours)');
    assert.equal(planDisplayName('PREMIUM_1', null), 'PREMIUM_1');
    assert.equal(guestsBadgeFromDb('PERSONAL_50', { maxGuests: 50 }), '50 invités / trim.');
    assert.equal(guestsBadgeFromDb('PERSONAL_PLUS', { maxGuests: 99999 }), 'Invités illimités');
    assert.equal(guestsBadgeFromDb('VENUE', { maxGuests: 0 }), null);
    assert.equal(guestsBadgeFromDb('STANDARD', null), null);
  });
});
