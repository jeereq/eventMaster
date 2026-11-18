import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { moveId } from './layoutOrder.ts';

describe('moveId', () => {
  const ids = ['a', 'b', 'c'];

  it('déplace vers le haut et vers le bas', () => {
    assert.deepEqual(moveId(ids, 'b', -1), ['b', 'a', 'c']);
    assert.deepEqual(moveId(ids, 'b', 1), ['a', 'c', 'b']);
  });

  it('refuse de sortir des bornes ou de déplacer un inconnu', () => {
    assert.equal(moveId(ids, 'a', -1), null);
    assert.equal(moveId(ids, 'c', 1), null);
    assert.equal(moveId(ids, 'x', 1), null);
  });

  it('ne modifie pas le tableau d’origine', () => {
    moveId(ids, 'b', 1);
    assert.deepEqual(ids, ['a', 'b', 'c']);
  });
});
