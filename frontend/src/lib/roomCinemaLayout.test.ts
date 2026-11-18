/**
 * Salle de cinéma : gradins « stadium » réalistes (contremarche de 45 cm, marche de 1,15 m),
 * escaliers latéraux et grand écran mural.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { applyRoomTemplate, generateAmphitheaterRows } from './roomLayoutUtils.ts';

describe('salle de cinéma', () => {
  it('génère des gradins stadium : 45 cm de contremarche et 1,15 m de marche', () => {
    const depthM = 21;
    const rows = generateAmphitheaterRows({ style: 'cinemaStadium', tierCount: 8, seatsPerRow: 18, depthM });
    assert.equal(rows.length, 8);
    for (let i = 1; i < rows.length; i += 1) {
      const rise = (rows[i].elevationM ?? 0) - (rows[i - 1].elevationM ?? 0);
      const tread = ((rows[i].y - rows[i - 1].y) / 100) * depthM;
      assert.ok(Math.abs(rise - 0.45) < 0.011, `contremarche ${rise}`);
      assert.ok(Math.abs(tread - 1.15) < 0.01, `marche ${tread}`);
    }
    // Premier rang presque au sol, même nombre de fauteuils partout, escaliers latéraux.
    assert.ok((rows[0].elevationM ?? 0) <= 0.2);
    assert.ok(rows.every((r) => r.seatCount === 18));
    assert.ok(rows.every((r) => r.aisleSplit === false && (r.sideAisleM ?? 0) >= 0.9));
  });

  it('le modèle « Salle de cinéma » place un grand écran devant des gradins qui tiennent dans la salle', () => {
    const bp = applyRoomTemplate('cinema-hall');
    assert.ok(bp);
    const screen = bp.fixtures.find((f) => f.kind === 'screen' && f.screenKind === 'cinemaScreen');
    assert.ok(screen, 'grand écran présent');
    assert.ok((screen.w / 100) * bp.canvas.widthM >= 12, 'écran presque mur à mur');
    const rows = bp.furniture.filter((f) => f.kind === 'row');
    assert.ok(rows.length >= 10);
    assert.ok(rows.every((r) => r.kind === 'row' && r.chairStyle === 'cinema'));
    const last = rows[rows.length - 1];
    assert.ok(last.y < 95, 'dernier rang avant le mur du fond');
    assert.ok(rows.every((r) => r.y > screen.y + screen.h), 'rangs derrière l’écran');
  });
});
