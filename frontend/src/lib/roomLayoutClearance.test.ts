import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  enforceRealLayoutClearances,
  detectLayoutClearanceConflicts,
  normalizeDoorOrthogonal,
  distancePointToSegmentM,
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
        { id: 'fx1', kind: 'stage', x: 40, y: 5, w: 20, h: 10 },
      ],
    };

    const result = enforceRealLayoutClearances(blueprint);
    const c1 = result.furniture.find((f) => f.id === 'c1')!;
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

    assert.ok(distM >= 2.8, `Distance entre tables ${distM}m insuffisante pour passage réel`);
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

    assert.ok(distM >= 2.0, `La chaise (${distM}m) est encore à l’intérieur de la table`);
  });

  it('sépare une table et une banquette/rangée', () => {
    const blueprint = {
      canvas: { widthM: 20, heightM: 16 },
      furniture: [
        { id: 'r1', kind: 'row', label: 'Banquette Mur', seatCount: 6, x: 50, y: 50 },
        { id: 't1', kind: 'table', shape: 'rectangular', capacity: 6, x: 50, y: 50.5 },
      ],
      fixtures: [],
    };

    const result = enforceRealLayoutClearances(blueprint);
    const r1 = result.furniture.find((f) => f.id === 'r1')!;
    const t1 = result.furniture.find((f) => f.id === 't1')!;

    const dyM = Math.abs(((t1.y - r1.y) / 100) * 16);
    assert.ok(dyM >= 1.0, `Dégagement vertical insuffisant (${dyM.toFixed(2)}m) entre table et banquette`);
  });

  it('dégage les éléments placés devant une porte d’accès', () => {
    const blueprint = {
      canvas: { widthM: 20, heightM: 16 },
      furniture: [
        { id: 't1', kind: 'table', shape: 'round', capacity: 6, x: 50, y: 92 },
      ],
      fixtures: [
        { id: 'd1', kind: 'door', x: 48, y: 95, w: 4, h: 2 },
      ],
    };

    const result = enforceRealLayoutClearances(blueprint);
    const t1 = result.furniture.find((f) => f.id === 't1')!;

    const dxM = ((t1.x - 50) / 100) * 20;
    const dyM = ((t1.y - 96) / 100) * 16;
    const distM = Math.hypot(dxM, dyM);

    assert.ok(distM >= 1.3, `La table bloque toujours la porte : distance ${distM.toFixed(2)}m`);
  });

  it('dégage les tables placées sur le tapis d’honneur (allée centrale)', () => {
    const blueprint = {
      canvas: { widthM: 20, heightM: 16 },
      furniture: [
        { id: 't1', kind: 'table', shape: 'round', capacity: 8, x: 50, y: 50 },
      ],
      fixtures: [
        // Allée centrale de x: 45% à 55% (9m à 11m, w=2m)
        { id: 'aisle1', kind: 'aisle', x: 45, y: 10, w: 10, h: 80 },
      ],
    };

    const result = enforceRealLayoutClearances(blueprint);
    const t1 = result.furniture.find((f) => f.id === 't1')!;

    // La table doit avoir été déplacée à gauche (<45%) ou à droite (>55%)
    assert.ok(t1.x < 44 || t1.x > 56, `La table est encore sur l'allée centrale (x=${t1.x}%)`);
  });

  it('dégage les tables placées au milieu de la piste de danse', () => {
    const blueprint = {
      canvas: { widthM: 20, heightM: 16 },
      furniture: [
        { id: 'z1', kind: 'zone', zoneKind: 'dance', label: 'Piste', x: 35, y: 35, w: 30, h: 30 },
        { id: 't1', kind: 'table', shape: 'round', capacity: 8, x: 50, y: 50 },
      ],
      fixtures: [],
    };

    const result = enforceRealLayoutClearances(blueprint);
    const t1 = result.furniture.find((f) => f.id === 't1')!;

    const insideX = t1.x >= 35 && t1.x <= 65;
    const insideY = t1.y >= 35 && t1.y <= 65;
    assert.ok(!(insideX && insideY), `La table est toujours sur la piste de danse (x=${t1.x}%, y=${t1.y}%)`);
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

    assert.ok(xM >= 1.0, `Chaise trop proche du mur gauche : ${xM}m`);
    assert.ok(yM >= 1.0, `Chaise trop proche du mur haut : ${yM}m`);
  });
});

describe('detectLayoutClearanceConflicts', () => {
  it('signale les chaises empilées et tables trop proches', () => {
    const blueprint = {
      canvas: { widthM: 20, heightM: 16 },
      furniture: [
        { id: 'c1', kind: 'chair', x: 10, y: 10 },
        { id: 'c2', kind: 'chair', x: 10, y: 10 },
        { id: 't1', kind: 'table', name: 'Table 1', shape: 'round', capacity: 8, x: 40, y: 40 },
        { id: 't2', kind: 'table', name: 'Table 2', shape: 'round', capacity: 8, x: 41, y: 40 },
      ],
      fixtures: [],
    };

    const report = detectLayoutClearanceConflicts(blueprint);
    assert.equal(report.isCompliant, false);
    assert.ok(report.conflicts.length >= 2);
    assert.ok(report.conflicts.some((c) => c.type === 'chair_overlap'));
    assert.ok(report.conflicts.some((c) => c.type === 'table_overlap'));
  });

  it('rapporte une conformité totale (100%) sur un plan correctement espacé', () => {
    const blueprint = {
      canvas: { widthM: 20, heightM: 16 },
      furniture: [
        { id: 't1', kind: 'table', name: 'Table 1', shape: 'round', capacity: 8, x: 25, y: 30 },
        { id: 't2', kind: 'table', name: 'Table 2', shape: 'round', capacity: 8, x: 75, y: 30 },
        { id: 't3', kind: 'table', name: 'Table 3', shape: 'round', capacity: 8, x: 25, y: 70 },
        { id: 't4', kind: 'table', name: 'Table 4', shape: 'round', capacity: 8, x: 75, y: 70 },
      ],
      fixtures: [],
    };

    const report = detectLayoutClearanceConflicts(blueprint);
    assert.equal(report.isCompliant, true);
    assert.equal(report.conflicts.length, 0);
    assert.equal(report.score, 100);
  });

  it('détecte les portes non droites (angles obliques non orthogonaux)', () => {
    const blueprint = {
      canvas: { widthM: 20, heightM: 16 },
      furniture: [],
      fixtures: [
        { id: 'd1', kind: 'door', label: 'Porte Entrée', x: 50, y: 95, w: 4, h: 2, rotation: 37 },
      ],
    };

    const report = detectLayoutClearanceConflicts(blueprint);
    assert.equal(report.isCompliant, false);
    const conflict = report.conflicts.find((c) => c.type === 'door_crooked');
    assert.ok(conflict, 'Doit détecter un conflit de porte oblique');
    assert.match(conflict.message, /strictement orthogonal/);
  });

  it('détecte les éléments incorporés ou encastrés dans un mur', () => {
    const blueprint = {
      canvas: { widthM: 20, heightM: 16 },
      furniture: [
        // Table centrée exactement sur la cloison (x=50%, y=50%)
        { id: 't1', kind: 'table', name: 'Table Murale', shape: 'round', capacity: 8, x: 50, y: 50 },
      ],
      fixtures: [],
      walls: [
        {
          id: 'w1',
          start: { x: 50, y: 20 },
          end: { x: 50, y: 80 },
          thicknessM: 0.20,
        },
      ],
    };

    const report = detectLayoutClearanceConflicts(blueprint);
    assert.equal(report.isCompliant, false);
    const wallConflict = report.conflicts.find((c) => c.type === 'wall_penetration');
    assert.ok(wallConflict, 'Doit détecter une incorporation dans le mur');
    assert.equal(wallConflict.severity, 'error');
  });

  it('détecte les éléments incorporés dans une installation fixe', () => {
    const blueprint = {
      canvas: { widthM: 20, heightM: 16 },
      furniture: [
        { id: 't1', kind: 'table', name: 'Table Buffet', shape: 'round', capacity: 8, x: 22, y: 22 },
      ],
      fixtures: [
        { id: 'fx1', kind: 'buffet', label: 'Buffet Cocktail', x: 20, y: 20, w: 10, h: 10 },
      ],
    };

    const report = detectLayoutClearanceConflicts(blueprint);
    assert.equal(report.isCompliant, false);
    const overlapConflict = report.conflicts.find((c) => c.type === 'element_overlap');
    assert.ok(overlapConflict, 'Doit détecter une incorporation dans le buffet');
    assert.equal(overlapConflict.severity, 'error');
  });
});

describe('règles architecturales des portes et murs', () => {
  it('normalise l’orientation des portes à des angles strictement orthogonaux', () => {
    assert.equal(normalizeDoorOrthogonal(0), 0);
    assert.equal(normalizeDoorOrthogonal(22), 0);
    assert.equal(normalizeDoorOrthogonal(46), 90);
    assert.equal(normalizeDoorOrthogonal(89), 90);
    assert.equal(normalizeDoorOrthogonal(134), 90);
    assert.equal(normalizeDoorOrthogonal(136), 180);
    assert.equal(normalizeDoorOrthogonal(269), 270);
    assert.equal(normalizeDoorOrthogonal(-45), 360 % 360); // 0 or 360 -> 0
    assert.equal(normalizeDoorOrthogonal(-85), 270);
  });

  it('enforceRealLayoutClearances redresse automatiquement les portes obliques', () => {
    const blueprint = {
      canvas: { widthM: 20, heightM: 16 },
      furniture: [],
      fixtures: [
        { id: 'd1', kind: 'door', x: 50, y: 95, w: 4, h: 2, rotation: 33 },
        { id: 'e1', kind: 'entrance', x: 10, y: 50, w: 4, h: 2, rotation: 112 },
      ],
    };

    const result = enforceRealLayoutClearances(blueprint);
    const d1 = result.fixtures.find((f) => f.id === 'd1')!;
    const e1 = result.fixtures.find((f) => f.id === 'e1')!;

    assert.equal(d1.rotation, 0, 'La porte à 33° doit être redressée à 0°');
    assert.equal(e1.rotation, 90, 'L’entrée à 112° doit être redressée à 90°');
  });

  it('enforceRealLayoutClearances expulse une table incorporée dans un mur intérieur', () => {
    const blueprint = {
      canvas: { widthM: 20, heightM: 16 },
      furniture: [
        { id: 't1', kind: 'table', shape: 'round', capacity: 8, x: 50, y: 50 },
      ],
      fixtures: [],
      walls: [
        {
          id: 'w1',
          start: { x: 50, y: 20 },
          end: { x: 50, y: 80 },
          thicknessM: 0.20,
        },
      ],
    };

    const result = enforceRealLayoutClearances(blueprint);
    const t1 = result.furniture.find((f) => f.id === 't1')!;

    // La table ne doit plus être à x=50% sur le mur
    const dxM = Math.abs(((t1.x - 50) / 100) * 20);
    assert.ok(dxM >= 1.0, `La table est encore trop proche du mur : distance ${dxM.toFixed(2)}m`);

    // Le rapport de dégagement ne doit plus rapporter de pénétration murale
    const report = detectLayoutClearanceConflicts(result);
    assert.ok(!report.conflicts.some((c) => c.type === 'wall_penetration'));
  });
});
