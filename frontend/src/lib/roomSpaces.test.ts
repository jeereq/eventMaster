import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { RoomLayoutBlueprint } from './roomLayoutUtils.ts';
import {
  dollhouseOverviewPose,
  entranceEyeLevelPose,
  findRoomSpace,
  listRoomSpaces,
  roomSpaceCameraPose,
} from './roomSpaces.ts';

function blueprint(partial: Partial<RoomLayoutBlueprint>): RoomLayoutBlueprint {
  return {
    version: 1,
    roomType: 'BANQUET',
    canvas: { widthM: 20, heightM: 16 },
    fixtures: [],
    furniture: [],
    metadata: { totalSeats: 0 },
    ...partial,
  } as RoomLayoutBlueprint;
}

describe('listRoomSpaces', () => {
  it('liste scène, table d’honneur, piste et regroupe les tables', () => {
    const spaces = listRoomSpaces(blueprint({
      fixtures: [
        { id: 'st', kind: 'stage', x: 30, y: 2, w: 40, h: 15, heightM: 0.8 },
        { id: 'br', kind: 'bar', x: 85, y: 70, w: 10, h: 6 },
        { id: 'ch', kind: 'chandelier', x: 50, y: 50, w: 4, h: 4 },
      ],
      furniture: [
        { id: 'hon', kind: 'table', name: 'Table d’honneur', shape: 'rectangular', capacity: 12, chairType: 'chiavari', x: 50, y: 25 },
        { id: 't1', kind: 'table', name: 'Table 1', shape: 'round', capacity: 8, chairType: 'chiavari', x: 25, y: 60 },
        { id: 't2', kind: 'table', name: 'Table 2', shape: 'round', capacity: 10, chairType: 'chiavari', x: 75, y: 60 },
        { id: 'z1', kind: 'zone', label: 'Piste', zoneKind: 'dance', x: 40, y: 40, w: 20, h: 15 },
      ],
    } as Partial<RoomLayoutBlueprint>));
    assert.deepEqual(spaces.map((s) => s.icon), ['stage', 'honor', 'dance', 'tables', 'bar']);
    const tables = spaces.find((s) => s.id === 'group:tables');
    assert.equal(tables?.details, '2 tables · 18 places');
    assert.equal(tables?.selection, undefined);
    const stage = spaces[0];
    assert.equal(stage.title, 'Scène');
    assert.equal(stage.details, '8 × 2.4 m · hauteur 0.8 m');
    assert.deepEqual(stage.selection, { kind: 'fixture', id: 'st' });
    // Centre de la scène : x = 50 % → 0 m ; y = 9.5 % → (0.095 − 0.5) × 16
    assert.ok(Math.abs(stage.center.x) < 1e-9);
    assert.ok(Math.abs(stage.center.z - (0.095 - 0.5) * 16) < 1e-9);
  });

  it('numérote les espaces de même nom et ignore les moquettes', () => {
    const spaces = listRoomSpaces(blueprint({
      fixtures: [
        { id: 'b1', kind: 'bar', x: 0, y: 0, w: 10, h: 5 },
        { id: 'b2', kind: 'bar', x: 80, y: 0, w: 10, h: 5 },
      ],
      furniture: [
        { id: 'c', kind: 'zone', label: 'Tapis', zoneKind: 'carpet', x: 0, y: 0, w: 10, h: 10 },
      ],
    } as Partial<RoomLayoutBlueprint>));
    assert.deepEqual(spaces.map((s) => s.title), ['Bar 1', 'Bar 2']);
  });

  it('une table unique est nommée et sélectionnable', () => {
    const spaces = listRoomSpaces(blueprint({
      furniture: [
        { id: 'd', kind: 'table', name: 'Table à manger', shape: 'rectangular', capacity: 6, chairType: 'chiavari', x: 60, y: 40 },
      ],
    } as Partial<RoomLayoutBlueprint>));
    assert.equal(spaces[0].title, 'Table à manger');
    assert.deepEqual(spaces[0].selection, { kind: 'table', id: 'd' });
  });

  it('retourne une liste vide pour une salle vide', () => {
    assert.deepEqual(listRoomSpaces(blueprint({})), []);
  });

  it('findRoomSpace suit l’ordre de préférence', () => {
    const spaces = listRoomSpaces(blueprint({
      furniture: [
        { id: 'z', kind: 'zone', label: 'VIP', zoneKind: 'vip', x: 0, y: 0, w: 10, h: 10 },
      ],
    } as Partial<RoomLayoutBlueprint>));
    assert.equal(findRoomSpace(spaces, ['honor', 'vip'])?.id, 'z');
    assert.equal(findRoomSpace(spaces, ['stage']), undefined);
  });
});

describe('cadrages caméra', () => {
  it('vise l’espace depuis le centre de la salle, en plongée', () => {
    const pose = roomSpaceCameraPose(
      { center: { x: 0, z: -6 }, size: { w: 8, d: 2.4 }, focusHeightM: 1.2 },
      { widthM: 20, depthM: 16, fovDeg: 45, aspect: 1.6 },
    );
    assert.deepEqual(pose.target, [0, 1.2, -6]);
    // La caméra est du côté de la salle (z plus grand) et au-dessus de la cible.
    assert.ok(pose.pos[2] > -6);
    assert.ok(pose.pos[1] > 3);
  });

  it('espace central : la scène reste en face de la caméra', () => {
    const pose = roomSpaceCameraPose(
      { center: { x: 0, z: 0.5 }, size: { w: 10, d: 8 }, focusHeightM: 0.75 },
      { widthM: 20, depthM: 16 },
      { x: 0, z: 6 },
    );
    // Scène côté +z → la caméra se place côté −z.
    assert.ok(pose.pos[2] < 0);
  });

  it('vue maquette : caméra de biais, au-dessus de la salle', () => {
    const pose = dollhouseOverviewPose({ widthM: 24, depthM: 18 });
    assert.ok(pose.pos[0] > 0 && pose.pos[2] > 0 && pose.pos[1] > 8);
  });
});

describe('entranceEyeLevelPose', () => {
  it('se place juste après l’entrée, à hauteur d’yeux, tourné vers le centre', () => {
    const pose = entranceEyeLevelPose(blueprint({
      fixtures: [{ id: 'e', kind: 'entrance', x: 45, y: 96, w: 10, h: 4 }],
    } as Partial<RoomLayoutBlueprint>));
    assert.ok(pose);
    // Entrée au sud (z ≈ +7.8 m) : la caméra entre dans la salle (z plus petit) sans sortir des murs.
    assert.ok(pose.pos[2] < 7.8 && pose.pos[2] <= 8 - 0.6);
    assert.ok(Math.abs(pose.pos[0]) < 0.01);
    assert.equal(pose.pos[1], 1.65);
    assert.deepEqual(pose.target, [0, 1.1, 0]);
  });

  it('se rabat sur une porte, et renvoie null sans porte ni entrée', () => {
    const withDoor = entranceEyeLevelPose(blueprint({
      fixtures: [{ id: 'd', kind: 'door', x: 0, y: 45, w: 3, h: 10 }],
    } as Partial<RoomLayoutBlueprint>));
    assert.ok(withDoor && withDoor.pos[0] > -10 + 0.59);
    assert.equal(entranceEyeLevelPose(blueprint({})), null);
  });
});
