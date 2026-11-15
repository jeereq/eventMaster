import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { aislePetals, evenlySpacedOffsets, shadeHex } from './roomAisleLayout.ts';

describe('aislePetals', () => {
  it('donne toujours les mêmes pétales pour un même élément', () => {
    assert.deepEqual(aislePetals(1.2, 10, 0.4, 42), aislePetals(1.2, 10, 0.4, 42));
    assert.notDeepEqual(aislePetals(1.2, 10, 0.4, 42), aislePetals(1.2, 10, 0.4, 43));
  });

  it('suit la densité et la surface, sans déborder de l’allée', () => {
    const few = aislePetals(1, 10, 0.1, 1);
    const many = aislePetals(1, 10, 0.5, 1);
    assert.equal(few.length, 60);
    assert.equal(many.length, 300);
    for (const p of many) {
      assert.ok(Math.abs(p.x) <= 0.5 && Math.abs(p.z) <= 5);
    }
    assert.equal(aislePetals(1, 10, 0, 1).length, 0);
    assert.ok(aislePetals(10, 100, 1, 1).length <= 600);
  });
});

describe('evenlySpacedOffsets', () => {
  it('espace les lanternes selon la longueur', () => {
    assert.deepEqual(evenlySpacedOffsets(12, 2), [-5, -3, -1, 1, 3, 5]);
    assert.equal(evenlySpacedOffsets(12, 4).length, 3);
    assert.equal(evenlySpacedOffsets(1, 4).length, 1);
    assert.deepEqual(evenlySpacedOffsets(0, 2), []);
  });
});

describe('shadeHex', () => {
  it('éclaircit et assombrit une couleur', () => {
    assert.equal(shadeHex('#808080', 0), '#808080');
    assert.equal(shadeHex('#000000', 1), '#ffffff');
    assert.equal(shadeHex('#ffffff', -1), '#000000');
    assert.equal(shadeHex('rouge', 0.2), 'rouge');
  });
});
