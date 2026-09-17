import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  emptyInvitationStructuredBrief,
  formatInvitationStructuredBrief,
  hasInvitationStructuredBrief,
  mergeInvitationStructuredBrief,
  parseInvitationStructuredBrief,
} from './invitationStructuredBrief.ts';

describe('invitationStructuredBrief', () => {
  it('reste vide sans champs utiles', () => {
    assert.deepEqual(parseInvitationStructuredBrief(null), emptyInvitationStructuredBrief());
    assert.equal(hasInvitationStructuredBrief(emptyInvitationStructuredBrief()), false);
    assert.equal(formatInvitationStructuredBrief(emptyInvitationStructuredBrief()), '');
  });

  it('garde cérémonie, langue, 3 mots d’ambiance et l’essentiel', () => {
    const parsed = parseInvitationStructuredBrief({
      ceremony: 'mariage',
      language: 'ln',
      mood: ['Or ivoire', 'Floral', 'Kuba', ' Trop'],
      mustKeep: 'Garder le cadre doré',
    });
    assert.equal(parsed.ceremony, 'mariage');
    assert.equal(parsed.language, 'ln');
    assert.deepEqual(parsed.mood, ['Or ivoire', 'Floral', 'Kuba']);
    assert.match(formatInvitationStructuredBrief(parsed), /wedding/);
    assert.match(formatInvitationStructuredBrief(parsed), /Must keep: Garder le cadre doré/);
    assert.match(
      mergeInvitationStructuredBrief('Mariage à Kinshasa', parsed),
      /STRUCTURED BRIEF/,
    );
  });

  it('ignore une cérémonie inconnue', () => {
    assert.equal(parseInvitationStructuredBrief({ ceremony: 'festival' }).ceremony, null);
  });
});
