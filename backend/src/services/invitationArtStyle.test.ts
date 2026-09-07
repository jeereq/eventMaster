import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  invitationArtStyleImageDirective,
  invitationArtStyleScaffoldLine,
  parseInvitationArtStyle,
} from './invitationArtStyle.ts';

describe('invitationArtStyle', () => {
  it('accepte les alias et retombe sur réaliste', () => {
    assert.equal(parseInvitationArtStyle('cartoon'), 'dessin-anime');
    assert.equal(parseInvitationArtStyle('watercolor'), 'aquarelle');
    assert.equal(parseInvitationArtStyle('3d'), 'stylise-3d');
    assert.equal(parseInvitationArtStyle('inconnu'), 'realiste');
    assert.equal(parseInvitationArtStyle(null), 'realiste');
  });

  it('ne force plus le photoréalisme pour le dessin animé', () => {
    const cartoon = invitationArtStyleImageDirective('dessin-anime');
    assert.match(cartoon, /DESSIN ANIMÉ/);
    assert.doesNotMatch(cartoon, /Photoreal 35mm/);
    assert.match(invitationArtStyleScaffoldLine('dessin-anime'), /2D animated/);
    assert.match(invitationArtStyleImageDirective('realiste'), /Photoreal 35mm/);
  });
});
