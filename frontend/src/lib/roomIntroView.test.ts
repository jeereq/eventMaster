import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ROOM_INTRO_VIEWS,
  introViewLabel,
  isPresetIntroView,
  resolveIntroView,
  topDownIntroDistance,
} from './roomIntroView.ts';

describe('roomIntroView', () => {
  it('garde le survol par défaut pour une valeur absente ou inconnue', () => {
    assert.equal(resolveIntroView(undefined), 'arc');
    assert.equal(resolveIntroView('drone'), 'arc');
    assert.equal(resolveIntroView(42), 'arc');
    assert.equal(resolveIntroView('stage'), 'stage');
  });

  it('a un libellé pour chaque perspective', () => {
    for (const view of ROOM_INTRO_VIEWS) {
      assert.ok(view.label.length > 0);
      assert.equal(introViewLabel(view.id), view.label);
    }
  });

  it('distingue les travellings vers un point de vue précis', () => {
    assert.equal(isPresetIntroView('entrance'), true);
    assert.equal(isPresetIntroView('vip'), true);
    assert.equal(isPresetIntroView('top'), false);
    assert.equal(isPresetIntroView('arc'), false);
  });

  it('recule davantage en portrait pour que toute la salle tienne à l’écran', () => {
    const room = { widthM: 24, depthM: 18, fovDeg: 32 };
    const desktop = topDownIntroDistance({ ...room, aspect: 1.6 });
    const phone = topDownIntroDistance({ ...room, aspect: 0.75 });
    assert.ok(phone > desktop);
    // La largeur (24 m) tient dans le champ horizontal du téléphone.
    const halfWidthVisible = phone * Math.tan((32 * Math.PI) / 360) * 0.75;
    assert.ok(halfWidthVisible >= 12);
  });

  it('ne colle jamais la caméra au sol d’une très petite pièce', () => {
    assert.equal(topDownIntroDistance({ widthM: 2, depthM: 2, fovDeg: 45, aspect: 1 }), 6);
  });
});
