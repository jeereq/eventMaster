import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getSeatCoordinates, getTableSeatPlacement3D, tablePlateSizeMeters } from './tablePlanUtils.ts';
import { rowArcZ, computeRowSeatPose, concentricRowCurvePercent } from './roomAmphitheaterGeom.ts';

describe('tablePlanUtils - orientation des chaises (2D et 3D)', () => {
  it('oriente les chaises vers le plateau pour une table rectangulaire en 2D', () => {
    // 4 places : 2 en haut (y < 0), 2 en bas (y > 0)
    const topSeat = getSeatCoordinates('rectangular', 4, 0);
    const bottomSeat = getSeatCoordinates('rectangular', 4, 2);

    assert.ok(topSeat.y < 0, 'Le siège du haut doit avoir un y négatif');
    assert.equal(topSeat.rotationDeg, 0, 'Le siège du haut doit faire face vers le bas (0°)');

    assert.ok(bottomSeat.y > 0, 'Le siège du bas doit avoir un y positif');
    assert.equal(bottomSeat.rotationDeg, 180, 'Le siège du bas doit faire face vers le haut (180°)');
  });

  it('oriente les chaises vers le plateau pour une table carrée en 2D', () => {
    // 4 places : 1 par côté (haut, droite, bas, gauche)
    const top = getSeatCoordinates('square', 4, 0);
    const right = getSeatCoordinates('square', 4, 1);
    const bottom = getSeatCoordinates('square', 4, 2);
    const left = getSeatCoordinates('square', 4, 3);

    assert.equal(top.rotationDeg, 0, 'Haut face vers le bas (0°)');
    assert.equal(right.rotationDeg, 90, 'Droite face vers la gauche (90°)');
    assert.equal(bottom.rotationDeg, 180, 'Bas face vers le haut (180°)');
    assert.equal(left.rotationDeg, 270, 'Gauche face vers la droite (270°)');
  });

  it('oriente les chaises vers le centre de table pour une table ronde en 2D', () => {
    const top = getSeatCoordinates('round', 4, 0);
    const right = getSeatCoordinates('round', 4, 1);
    const bottom = getSeatCoordinates('round', 4, 2);
    const left = getSeatCoordinates('round', 4, 3);

    assert.equal(top.rotationDeg, 0, 'Haut face vers le bas (0°)');
    assert.equal(right.rotationDeg, 90, 'Droite face vers la gauche (90°)');
    assert.equal(bottom.rotationDeg, 180, 'Bas face vers le haut (180°)');
    assert.equal(left.rotationDeg, 270, 'Gauche face vers la droite (270°)');
  });

  it('oriente les chaises vers le plateau pour une table en arc en 2D', () => {
    const centerSeat = getSeatCoordinates('arc', 3, 1);
    assert.ok(centerSeat.y > 0, 'Le siège en arc est placé en bas du plateau');
    assert.equal(centerSeat.rotationDeg, 180, 'Le siège en arc doit faire face vers le haut vers la table (180°)');
  });

  it('oriente les chaises 3D vers le plateau pour toutes les formes', () => {
    const rectTop = getTableSeatPlacement3D('rectangular', 4, 0, [2, 1]);
    assert.equal(rectTop.rotationY, 0, 'En 3D le siège haut regarde vers +Z (le plateau)');

    const rectBottom = getTableSeatPlacement3D('rectangular', 4, 2, [2, 1]);
    assert.equal(rectBottom.rotationY, Math.PI, 'En 3D le siège bas regarde vers -Z (le plateau)');
  });
});

describe('roomAmphitheaterGeom - courbure et orientation 3D', () => {
  it('avance les extrémités de rangée vers la scène (arc concave)', () => {
    const centerZ = rowArcZ(0, 0.55, 0.4);
    const sideZ = rowArcZ(4, 0.55, 0.4);
    assert.equal(centerZ, 0, 'Le centre a courbure zéro');
    assert.ok(sideZ < 0, 'Les extrémités avancent vers la scène (-Z)');
  });

  it('calcule une courbure concentrique au foyer', () => {
    const curve = concentricRowCurvePercent(4, 0.55);
    const f = curve / 100;
    // Siège à 1,1 m du centre : sur un cercle de 4 m, recul attendu ≈ 4 - √(16 - 1,21) ≈ 0,154 m
    const z = rowArcZ(1.1, 0.55, f);
    assert.ok(Math.abs(Math.abs(z) - 0.154) < 0.02, `recul ${z}`);
  });

  it('calcule la pose 3D des sièges en orientant le regard vers la scène (focus)', () => {
    // Scène en Z négatif (devant la rangée)
    const pose = computeRowSeatPose(2, 5, 0.55, 30, 0.5, { x: 0, z: -10 });
    // Pour une cible en Z négatif (dx = 0, dz < 0), faceY doit être proche de PI (180°)
    assert.ok(Math.abs(pose.faceY - Math.PI) < 0.001 || Math.abs(pose.faceY + Math.PI) < 0.001);
  });
});

describe('tablePlanUtils - chaises d’un seul côté et taille selon capacité', () => {
  it('place tous les convives du même côté, face à la salle', () => {
    const size = tablePlateSizeMeters('rectangular', 8, undefined, 'oneSide');
    const seats = Array.from({ length: 8 }, (_, i) => getTableSeatPlacement3D('rectangular', 8, i, size, 'oneSide'));
    assert.ok(seats.every((s) => s.z < 0 && s.rotationY === 0), 'toutes les chaises derrière le plateau, regard vers +Z');
    const xs = seats.map((s) => s.x);
    for (let i = 1; i < xs.length; i += 1) assert.ok(xs[i] - xs[i - 1] >= 0.55, 'au moins 55 cm entre deux chaises');
    const coords = Array.from({ length: 8 }, (_, i) => getSeatCoordinates('rectangular', 8, i, 45, 'oneSide'));
    assert.ok(coords.every((c) => c.y < 0 && c.rotationDeg === 0), 'plan 2D : même côté');
  });

  it('ignore l’option sur les tables rondes', () => {
    const around = getTableSeatPlacement3D('round', 8, 4, [1.32, 1.32]);
    const oneSide = getTableSeatPlacement3D('round', 8, 4, [1.32, 1.32], 'oneSide');
    assert.deepEqual(oneSide, around);
  });

  it('agrandit le plateau avec le nombre de convives', () => {
    const [r8] = tablePlateSizeMeters('round', 8);
    const [r12] = tablePlateSizeMeters('round', 12);
    assert.ok(r12 > r8 + 0.4, `Ø12 (${r12}) nettement plus grand que Ø8 (${r8})`);
    const [l14] = tablePlateSizeMeters('rectangular', 14);
    const [l20] = tablePlateSizeMeters('rectangular', 20);
    assert.ok(l20 >= 6, `20 convives : au moins 6 m (${l20})`);
    assert.ok(l20 > l14);
    const [single, depth] = tablePlateSizeMeters('rectangular', 10, undefined, 'oneSide');
    assert.ok(single >= 6 && depth < 0.9, 'table d’honneur longue et peu profonde');
  });

  it('garde les dimensions personnalisées prioritaires', () => {
    assert.deepEqual(tablePlateSizeMeters('rectangular', 20, { customWidthM: 3, customDepthM: 1 }), [3, 1]);
  });
});
