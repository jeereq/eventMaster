import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  invitationArtStyleCompositionNote,
  invitationArtStyleCraftNotes,
  invitationArtStyleImageDirective,
  invitationArtStyleLightNote,
  invitationArtStyleScaffoldLine,
  parseInvitationArtStyle,
} from './invitationArtStyle.ts';

describe('invitationArtStyle', () => {
  it('accepte les alias et retombe sur réaliste', () => {
    assert.equal(parseInvitationArtStyle('cartoon'), 'dessin-anime');
    assert.equal(parseInvitationArtStyle('watercolor'), 'aquarelle');
    assert.equal(parseInvitationArtStyle('3d'), 'stylise-3d');
    assert.equal(parseInvitationArtStyle('gatsby'), 'art-deco');
    assert.equal(parseInvitationArtStyle('kuba'), 'afro-luxe');
    assert.equal(parseInvitationArtStyle('letterpress'), 'gravure-vintage');
    assert.equal(parseInvitationArtStyle('quietluxury'), 'minimaliste-luxe');
    assert.equal(parseInvitationArtStyle('cyber'), 'cyber-neon');
    assert.equal(parseInvitationArtStyle('inconnu'), 'realiste');
    assert.equal(parseInvitationArtStyle(null), 'realiste');
  });

  it('ne force plus le photoréalisme pour le dessin animé', () => {
    const cartoon = invitationArtStyleImageDirective('dessin-anime');
    assert.match(cartoon, /DESSIN ANIMÉ IMMERSIF/);
    assert.match(cartoon, /Multiplane|parallax|depth/i);
    assert.doesNotMatch(cartoon, /Photoreal 35mm \/ 85mm portrait language/);
    assert.match(invitationArtStyleScaffoldLine('dessin-anime'), /multiplane|immersion|depth/i);
    assert.match(invitationArtStyleImageDirective('realiste'), /35mm \/ 85mm/);
    assert.match(invitationArtStyleImageDirective('stylise-3d'), /volume|bokeh|depth of field/i);
    assert.match(invitationArtStyleCompositionNote('dessin-anime'), /three readable planes|IMMERSION/);
    assert.match(invitationArtStyleCompositionNote('realiste'), /real space/);
    assert.match(invitationArtStyleCraftNotes(), /museum-grade|9:16/);
    assert.match(invitationArtStyleLightNote('stylise-3d'), /rim/);
    assert.match(invitationArtStyleLightNote('realiste'), /Kinshasa|85mm/);
  });
});
