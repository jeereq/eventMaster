import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  enforceRealLayoutClearances,
  REAL_CLEARANCE_METERS,
} from './roomLayoutClearance.ts';

describe('enforceRealLayoutClearances', () => {
  it('dés-empile des chaises placées exactement au même endroit', () => {
    const blueprint = {
      canvas: { widthM: 20, heightM: 16 },
      furniture: [
        { id: 'c1', kind: 'chair', x: 50, y: 50 },
        { id: 'c2', kind: 'chair', x: 50, y: 50 },
      ],
      fixtures: [],
    };

    const result = enforceRealLayoutClearances(blueprint);
    const c1 = result.furniture.find((f) => f.id === 'c1')!;
    const c2 = result.furniture.find((f) => f.id === 'c2')!;

    // Ne doivent plus être au même endroit
    assert.notEqual(`${c1.x},${c1.y}`, `${c2.x},${c2.y}`);

    // Distance en mètres >= 0.70m
    const dxM = ((c2.x - c1.x) / 100) * 20;
    const dyM = ((c2.y - c1.y) / 100) * 16;
    const distM = Math.hypot(dxM, dyM);
    assert.ok(distM >= REAL_CLEARANCE_METERS.chairToChair * 0.9, `Distance ${distM}m < 0.70m`);
  });

  it('dés-empile un groupe de 4 chaises empilées', () => {
    const blueprint = {
      canvas: { widthM: 20, heightM: 16 },
      furniture: [
        { id: 'c1', kind: 'chair', x: 45, y: 45 },
        { id: 'c2', kind: 'chair', x: 45, y: 45 },
        { id: 'c3', kind: 'chair', x: 45, y: 45 },
        { id: 'c4', kind: 'chair', x: 45, y: 45 },
      ],
      fixtures: [],
    };

    const result = enforceRealLayoutClearances(blueprint);
    const positions = new Set(result.furniture.map((f) => `${f.x},${f.y}`));
    assert.equal(positions.size, 4, 'Chaque chaise doit avoir des coordonnées distinctes');
  });

  it('dés-empile 8 chaises empilées au même point et garantit les distances', () => {
    const blueprint = {
      canvas: { widthM: 20, heightM: 16 },
      furniture: Array.from({ length: 8 }, (_, i) => ({
        id: `chair-${i}`,
        kind: 'chair',
        x: 50,
        y: 50,
      })),
      fixtures: [],
    };

    const result = enforceRealLayoutClearances(blueprint);
    const chairs = result.furniture;
    assert.equal(chairs.length, 8);
    const positions = new Set(chairs.map((c) => `${c.x},${c.y}`));
    assert.equal(positions.size, 8, 'Toutes les 8 chaises doivent avoir des coordonnées distinctes');

    // Vérifier la distance minimale entre chaque paire
    for (let i = 0; i < chairs.length; i++) {
      for (let j = i + 1; j < chairs.length; j++) {
        const dxM = ((chairs[j].x - chairs[i].x) / 100) * 20;
        const dyM = ((chairs[j].y - chairs[i].y) / 100) * 16;
        const distM = Math.hypot(dxM, dyM);
        assert.ok(
          distM >= REAL_CLEARANCE_METERS.chairToChair * 0.85,
          `Distance trop faible (${distM.toFixed(2)}m) entre chair-${i} et chair-${j}`,
        );
      }
    }
  });

  it('dégage les chaises et tables placées sur une estrade ou scène solide', () => {
    const blueprint = {
      canvas: { widthM: 20, heightM: 16 },
      furniture: [
        { id: 'c1', kind: 'chair', x: 50, y: 10 },
      ],
      fixtures: [
        // Scène solide de x: 40 à 60% (8m à 12m) et y: 5 à 15% (0.8m à 2.4m)
        { id: 'fx1', kind: 'stage', x: 40, y: 5, w: 20, h: 10 },
      ],
    };

    const result = enforceRealLayoutClearances(blueprint);
    const c1 = result.furniture.find((f) => f.id === 'c1')!;
    // La chaise ne doit plus être à l'intérieur de la scène
    const insideX = c1.x >= 40 && c1.x <= 60;
    const insideY = c1.y >= 5 && c1.y <= 15;
    assert.ok(!(insideX && insideY), 'La chaise ne doit pas être bloquée sur la scène');
  });

  it('sépare deux tables qui se chevauchent', () => {
    const blueprint = {
      canvas: { widthM: 20, heightM: 16 },
      furniture: [
        { id: 't1', kind: 'table', shape: 'round', capacity: 8, x: 30, y: 40 },
        { id: 't2', kind: 'table', shape: 'round', capacity: 8, x: 32, y: 40 },
      ],
      fixtures: [],
    };

    const result = enforceRealLayoutClearances(blueprint);
    const t1 = result.furniture.find((f) => f.id === 't1')!;
    const t2 = result.furniture.find((f) => f.id === 't2')!;

    const dxM = ((t2.x - t1.x) / 100) * 20;
    const dyM = ((t2.y - t1.y) / 100) * 16;
    const distM = Math.hypot(dxM, dyM);

    // Diamètre table 8 places ~ 1.9m, target center-to-center >= 1.9m + 1.4m = 3.3m
    assert.ok(distM >= 3.0, `Distance entre tables ${distM}m insuffisante pour passage réel`);
  });

  it('pousse une chaise isolée hors de l’emprise d’une table', () => {
    const blueprint = {
      canvas: { widthM: 20, heightM: 16 },
      furniture: [
        { id: 't1', kind: 'table', shape: 'round', capacity: 8, x: 50, y: 50 },
        { id: 'c1', kind: 'chair', x: 50.5, y: 50.5 },
      ],
      fixtures: [],
    };

    const result = enforceRealLayoutClearances(blueprint);
    const t1 = result.furniture.find((f) => f.id === 't1')!;
    const c1 = result.furniture.find((f) => f.id === 'c1')!;

    const dxM = ((c1.x - t1.x) / 100) * 20;
    const dyM = ((c1.y - t1.y) / 100) * 16;
    const distM = Math.hypot(dxM, dyM);

    // Enveloppe table (~1.4m rayon) + chaise (~0.25m) + clearance (0.8m) >= 2.4m
    assert.ok(distM >= 2.0, `La chaise (${distM}m) est encore à l’intérieur de la table`);
  });

  it('impose une marge périphérique le long des murs', () => {
    const blueprint = {
      canvas: { widthM: 20, heightM: 16 },
      furniture: [
        { id: 'c1', kind: 'chair', x: 0.5, y: 0.5 },
      ],
      fixtures: [],
    };

    const result = enforceRealLayoutClearances(blueprint);
    const c1 = result.furniture.find((f) => f.id === 'c1')!;

    const xM = (c1.x / 100) * 20;
    const yM = (c1.y / 100) * 16;

    // Minimum 0.90m marge + 0.25m demi-chaise = 1.15m
    assert.ok(xM >= 1.0, `Chaise trop proche du mur gauche : ${xM}m`);
    assert.ok(yM >= 1.0, `Chaise trop proche du mur haut : ${yM}m`);
  });
});
