import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  COUVERT_SPECS,
  centerpieceStyleColor,
  centerpieceStyleHints,
  centerpieceStyleLabels,
  couvertStyleHints,
  couvertStyleLabels,
  isCenterpieceStyle,
  resolveCouvertSpec,
} from './roomTableware.ts';

test('chaque service a un libellé, une aide et des teintes hexadécimales', () => {
  for (const style of Object.keys(COUVERT_SPECS) as Array<keyof typeof COUVERT_SPECS>) {
    assert.ok(couvertStyleLabels[style], style);
    assert.ok(couvertStyleHints[style], style);
    const spec = COUVERT_SPECS[style];
    for (const hex of [spec.chargerColor, spec.plate, spec.flatware, spec.napkin, spec.napkinAccent, spec.glass]) {
      assert.match(hex, /^#[0-9a-f]{6}$/i, `${style} ${hex}`);
    }
  }
});

test('un service inconnu ou absent retombe sur la porcelaine classique', () => {
  assert.equal(resolveCouvertSpec(undefined), COUVERT_SPECS.classic);
  assert.equal(resolveCouvertSpec('inconnu'), COUVERT_SPECS.classic);
  assert.equal(resolveCouvertSpec('emerald'), COUVERT_SPECS.emerald);
});

test('les centres de table ont libellé, aide et teinte 2D', () => {
  for (const style of Object.keys(centerpieceStyleLabels) as Array<keyof typeof centerpieceStyleLabels>) {
    assert.ok(centerpieceStyleHints[style], style);
    assert.match(centerpieceStyleColor[style], /^#[0-9a-f]{6}$/i);
    assert.ok(isCenterpieceStyle(style));
  }
  assert.equal(isCenterpieceStyle('toString'), false);
});
