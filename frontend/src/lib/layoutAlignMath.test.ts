import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  alignedPositions,
  clusterIndices,
  snapPct,
  snapRotationDeg,
  type AlignBox,
} from './layoutAlignMath.ts';

function box(id: string, x: number, y: number, w = 10, h = 10, isCenter = true): AlignBox {
  return { id, x, y, w, h, isCenter };
}

describe('snapPct / snapRotationDeg', () => {
  it('arrondit sur le pas 0.5', () => {
    assert.equal(snapPct(21.24), 21);
    assert.equal(snapPct(21.3), 21.5);
  });

  it('aligne une rotation presque droite sur 0/90/180', () => {
    assert.equal(snapRotationDeg(2), 0);
    assert.equal(snapRotationDeg(88), 90);
    assert.equal(snapRotationDeg(176), 180);
    assert.equal(snapRotationDeg(44), 44);
  });
});

describe('clusterIndices', () => {
  it('regroupe les valeurs proches et sépare les autres', () => {
    assert.deepEqual(clusterIndices([20.1, 40, 20.8, 21.2], 2.2), [
      [0, 2, 3],
      [1],
    ]);
  });
});

describe('alignedPositions — 8 modes', () => {
  const row = [
    box('a', 20, 30),
    box('b', 50, 33),
    box('c', 80, 28),
  ];

  it('left aligne les bords gauches', () => {
    const next = alignedPositions(row, 'left');
    assert.equal(next.get('a')?.x, 20);
    assert.equal(next.get('b')?.x, 20);
    assert.equal(next.get('c')?.x, 20);
  });

  it('right aligne les bords droits', () => {
    const next = alignedPositions(row, 'right');
    assert.equal(next.get('a')?.x, 80);
    assert.equal(next.get('b')?.x, 80);
    assert.equal(next.get('c')?.x, 80);
  });

  it('centerX aligne les centres sur le milieu de la sélection', () => {
    const next = alignedPositions(row, 'centerX');
    assert.equal(next.get('a')?.x, 50);
    assert.equal(next.get('b')?.x, 50);
    assert.equal(next.get('c')?.x, 50);
  });

  it('top aligne les bords hauts', () => {
    const next = alignedPositions(row, 'top');
    assert.equal(next.get('a')?.y, 28);
    assert.equal(next.get('b')?.y, 28);
    assert.equal(next.get('c')?.y, 28);
  });

  it('bottom aligne les bords bas', () => {
    const next = alignedPositions(row, 'bottom');
    assert.equal(next.get('a')?.y, 33);
    assert.equal(next.get('b')?.y, 33);
    assert.equal(next.get('c')?.y, 33);
  });

  it('centerY aligne les centres verticaux', () => {
    const next = alignedPositions(row, 'centerY');
    assert.equal(next.get('a')?.y, 30.5);
    assert.equal(next.get('b')?.y, 30.5);
    assert.equal(next.get('c')?.y, 30.5);
  });

  it('distributeX répartit 3 centres à intervalle égal', () => {
    const next = alignedPositions(row, 'distributeX');
    assert.equal(next.get('a')?.x, 20);
    assert.equal(next.get('b')?.x, 50);
    assert.equal(next.get('c')?.x, 80);
  });

  it('distributeY répartit 3 centres à intervalle égal', () => {
    const stacked = [box('a', 40, 20), box('b', 42, 40), box('c', 38, 80)];
    const next = alignedPositions(stacked, 'distributeY');
    assert.equal(next.get('a')?.y, 20);
    assert.equal(next.get('b')?.y, 50);
    assert.equal(next.get('c')?.y, 80);
  });

  it('distribute exige au moins 3 éléments', () => {
    assert.equal(alignedPositions([box('a', 20, 20), box('b', 80, 20)], 'distributeX').size, 0);
  });

  it('aligne aussi les fixtures ancrées coin haut-gauche', () => {
    const fixtures = [
      box('stage', 10, 8, 40, 10, false),
      box('carpet', 30, 40, 20, 16, false),
    ];
    const next = alignedPositions(fixtures, 'left');
    assert.equal(next.get('stage')?.x, 10);
    assert.equal(next.get('carpet')?.x, 10);
  });
});
