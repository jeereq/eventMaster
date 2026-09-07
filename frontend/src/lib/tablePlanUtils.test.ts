import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getSeatCoordinates, getTableSeatPlacement3D } from './tablePlanUtils.ts';
import { rowArcZ, computeRowSeatPose } from './roomAmphitheaterGeom.ts';

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
  it('calcule une courbure positive rowArcZ pour reculer les extrémités de rangée', () => {
    const centerZ = rowArcZ(0, 0.55, 0.4);
    const sideZ = rowArcZ(4, 0.55, 0.4);
    assert.equal(centerZ, 0, 'Le centre a courbure zéro');
    assert.ok(sideZ > 0, 'Les extrémités ont courbure positive (+Z)');
  });

  it('calcule la pose 3D des sièges en orientant le regard vers la scène (focus)', () => {
    // Scène en Z négatif (devant la rangée)
    const pose = computeRowSeatPose(2, 5, 0.55, 30, 0.5, { x: 0, z: -10 });
    // Pour une cible en Z négatif (dx = 0, dz < 0), faceY doit être proche de PI (180°)
    assert.ok(Math.abs(pose.faceY - Math.PI) < 0.001 || Math.abs(pose.faceY + Math.PI) < 0.001);
  });
});
