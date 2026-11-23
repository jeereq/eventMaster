import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { layerOrder, layerPosition, nextTopZ, reorderLayer } from './templateLayers.ts';

const els = () => [
  { id: 'photo', zIndex: 1 },
  { id: 'titre', zIndex: 2 },
  { id: 'fleur', zIndex: 3 },
];
const order = (list: Array<{ id: string; zIndex?: number }>) => layerOrder(list).map((e) => e.id);

describe('reorderLayer', () => {
  it('passe au premier plan et à l’arrière-plan', () => {
    assert.deepEqual(order(reorderLayer(els(), 'photo', 'front')), ['titre', 'fleur', 'photo']);
    assert.deepEqual(order(reorderLayer(els(), 'fleur', 'back')), ['fleur', 'photo', 'titre']);
  });

  it('avance et recule d’un seul plan', () => {
    assert.deepEqual(order(reorderLayer(els(), 'photo', 'forward')), ['titre', 'photo', 'fleur']);
    assert.deepEqual(order(reorderLayer(els(), 'fleur', 'backward')), ['photo', 'fleur', 'titre']);
  });

  it('renumérote de 1 à n sans changer l’ordre de la liste', () => {
    const next = reorderLayer([{ id: 'a', zIndex: 10 }, { id: 'b', zIndex: -4 }, { id: 'c' }], 'b', 'front');
    assert.deepEqual(next.map((e) => e.id), ['a', 'b', 'c']);
    assert.deepEqual(next.map((e) => e.zIndex), [2, 3, 1]);
  });

  it('ne change rien quand l’élément est déjà en place', () => {
    const list = els();
    assert.equal(reorderLayer(list, 'fleur', 'front'), list);
    assert.equal(reorderLayer(list, 'inconnu', 'front'), list);
  });

  it('utilise la position dans la liste quand zIndex manque', () => {
    assert.deepEqual(order([{ id: 'a' }, { id: 'b' }, { id: 'c', zIndex: 0 }]), ['c', 'a', 'b']);
  });
});

describe('layerPosition / nextTopZ', () => {
  it('donne le plan et le prochain plan libre', () => {
    assert.deepEqual(layerPosition(els(), 'titre'), { position: 2, total: 3 });
    assert.equal(nextTopZ(els()), 4);
    assert.equal(nextTopZ([{ id: 'a', zIndex: 9 }, { id: 'b' }]), 10);
    assert.equal(nextTopZ([]), 1);
  });
});
