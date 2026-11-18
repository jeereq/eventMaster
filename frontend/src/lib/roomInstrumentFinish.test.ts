import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { instrumentFinishPresets } from './roomInstrumentFinish.ts';

describe('instrumentFinishPresets', () => {
  it('propose des finitions adaptées à chaque famille', () => {
    assert.equal(instrumentFinishPresets('piano')[0].label, 'Noir laqué');
    assert.ok(instrumentFinishPresets('upright').some((p) => p.label === 'Blanc laqué'));
    assert.ok(instrumentFinishPresets('violin').some((p) => p.label === 'Bois naturel'));
    assert.ok(instrumentFinishPresets('sax').some((p) => p.label === 'Laiton'));
    assert.equal(instrumentFinishPresets('micStand').length, 0);
  });

  it('chaque finition a une couleur hexadécimale', () => {
    for (const style of ['piano', 'drums', 'cello', 'trumpet', 'mixer'] as const) {
      for (const p of instrumentFinishPresets(style)) assert.match(p.color, /^#[0-9a-f]{6}$/);
    }
  });
});
