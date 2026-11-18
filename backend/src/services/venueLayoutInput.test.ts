import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  MAX_LAYOUT_NAME_LENGTH,
  isBlueprintShape,
  isBlueprintTooLarge,
  normalizeLayoutOrder,
  parseLayoutName,
  parseThumbnailUrl,
} from './venueLayoutInput.ts';

describe('nom de disposition', () => {
  it('nettoie les espaces', () => {
    assert.equal(parseLayoutName('  Mariage   gala '), 'Mariage gala');
  });

  it('refuse un nom vide, trop long ou non textuel', () => {
    assert.equal(parseLayoutName('   '), null);
    assert.equal(parseLayoutName('a'.repeat(MAX_LAYOUT_NAME_LENGTH + 1)), null);
    assert.equal(parseLayoutName(42), null);
    assert.equal(parseLayoutName(undefined), null);
  });
});

describe('forme d’un plan', () => {
  const valid = { canvas: { widthM: 20, heightM: 15 }, furniture: [] };

  it('accepte un plan minimal', () => {
    assert.equal(isBlueprintShape(valid), true);
  });

  it('refuse les valeurs qui ne sont pas des plans', () => {
    assert.equal(isBlueprintShape(null), false);
    assert.equal(isBlueprintShape([]), false);
    assert.equal(isBlueprintShape('plan'), false);
    assert.equal(isBlueprintShape({ canvas: { widthM: 20, heightM: 15 } }), false);
    assert.equal(isBlueprintShape({ canvas: { widthM: 0, heightM: 15 }, furniture: [] }), false);
    assert.equal(isBlueprintShape({ canvas: { widthM: '20', heightM: 15 }, furniture: [] }), false);
  });

  it('signale un plan trop volumineux', () => {
    assert.equal(isBlueprintTooLarge(valid), false);
    assert.equal(isBlueprintTooLarge({ ...valid, blob: 'x'.repeat(9 * 1024 * 1024) }), true);
  });
});

describe('vignette', () => {
  it('accepte uniquement les URL https', () => {
    assert.equal(parseThumbnailUrl('https://res.cloudinary.com/demo/a.jpg'), 'https://res.cloudinary.com/demo/a.jpg');
    assert.equal(parseThumbnailUrl('http://example.com/a.jpg'), null);
    assert.equal(parseThumbnailUrl('javascript:alert(1)'), null);
    assert.equal(parseThumbnailUrl('data:image/png;base64,AAAA'), null);
    assert.equal(parseThumbnailUrl('pas une url'), null);
    assert.equal(parseThumbnailUrl(''), null);
  });
});

describe('ordre des dispositions', () => {
  const ids = ['a', 'b', 'c'];

  it('accepte une permutation complète', () => {
    assert.deepEqual(normalizeLayoutOrder(['c', 'a', 'b'], ids), ['c', 'a', 'b']);
  });

  it('refuse les doublons, les inconnus et les oublis', () => {
    assert.equal(normalizeLayoutOrder(['a', 'a', 'b'], ids), null);
    assert.equal(normalizeLayoutOrder(['a', 'b', 'x'], ids), null);
    assert.equal(normalizeLayoutOrder(['a', 'b'], ids), null);
    assert.equal(normalizeLayoutOrder('abc', ids), null);
  });
});
