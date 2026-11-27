/**
 * Salle de cinéma : gradins « stadium » réalistes (contremarche de 45 cm, marche de 1,15 m),
 * escaliers latéraux et grand écran mural.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { applyRoomTemplate, generateAmphitheaterRows, resolveBlueprintWalls } from './roomLayoutUtils.ts';

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

  for (const id of ['cinema-hall', 'cinema-imax', 'cinema-premium', 'cinema-private', 'chairs-cinema']) {
    it(`« ${id} » : vraie toile de cinéma qui tient sous le plafond, salle sans fenêtre`, () => {
      const bp = applyRoomTemplate(id);
      assert.ok(bp);
      const screen = bp.fixtures.find((f) => f.kind === 'screen' && f.screenKind === 'cinemaScreen');
      assert.ok(screen, 'toile de cinéma présente');
      assert.ok(!bp.fixtures.some((f) => f.kind === 'stage'), 'plus de scène à la place de l’écran');
      const walls = resolveBlueprintWalls(bp);
      assert.ok(walls.every((w) => (w.openings ?? []).every((o) => o.kind !== 'window')), 'aucune fenêtre');
      const ratio = screen.screenRatio === '1.43:1' ? 1.43 : screen.screenRatio === '16:9' ? 16 / 9 : 2.39;
      const widthM = (screen.w / 100) * bp.canvas.widthM;
      const top = (screen.screenElevationM ?? 1.2) + widthM / ratio;
      const ceiling = Math.min(...walls.map((w) => w.heightM ?? 3));
      assert.ok(top <= ceiling - 0.5, `haut de toile ${top.toFixed(2)} m sous ${ceiling} m`);
      const rows = bp.furniture.filter((f) => f.kind === 'row');
      assert.ok(rows.length >= 3);
      assert.ok(rows.every((r) => r.y > screen.y + screen.h && r.y < 95), 'rangs entre l’écran et le mur du fond');
    });
  }

  it('« Cinéma en plein air » : écran gonflable, chaises sur pelouse, sans murs', () => {
    const bp = applyRoomTemplate('cinema-outdoor');
    assert.ok(bp);
    assert.ok(bp.fixtures.some((f) => f.kind === 'screen' && f.screenKind === 'inflatableScreen'));
    assert.equal(bp.metadata.showWalls, false);
    const rows = bp.furniture.filter((f) => f.kind === 'row');
    assert.ok(rows.length >= 6 && rows.every((r) => r.kind === 'row' && r.chairType === 'FOLDING'));
  });
});
