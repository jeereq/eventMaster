import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { RoomLayoutBlueprint } from './roomLayoutUtils.ts';
import { buildGuestSimulation, type SimulatedGuest } from './roomGuestSimulation.ts';
import {
  availableAvatarFilters,
  clampAvatarPitch,
  describeAvatarViewer,
  pickDefaultAvatarViewer,
  randomAvatarViewer,
  stepAvatarViewer,
  wrapAngle,
  yawToward,
} from './roomAvatarView.ts';

function blueprint(furniture: unknown[]): RoomLayoutBlueprint {
  return {
    version: 1,
    roomType: 'BANQUET',
    canvas: { widthM: 20, heightM: 16 },
    fixtures: [],
    furniture,
    metadata: { totalSeats: 0 },
  } as unknown as RoomLayoutBlueprint;
}

function guest(id: string, x: number, z: number, rotY: number, pose: SimulatedGuest['pose'] = 'seated'): SimulatedGuest {
  return { id, pose, x, y: 0, z, rotY, style: 'suit', skin: '#000', outfit: '#000', bottom: '#000', hair: '#000', headwrap: null, scale: 1, phase: 0 };
}

describe('angles', () => {
  it('vise un point avec la même convention que rotY (0 = +Z)', () => {
    assert.equal(yawToward({ x: 0, z: 0 }, { x: 0, z: 5 }), 0);
    assert.ok(Math.abs(yawToward({ x: 0, z: 0 }, { x: 5, z: 0 }) - Math.PI / 2) < 1e-9);
  });
  it('ramène un écart entre -π et π', () => {
    assert.ok(Math.abs(wrapAngle(3 * Math.PI) - Math.PI) < 1e-9);
    assert.ok(Math.abs(wrapAngle(-Math.PI / 2 - 2 * Math.PI) + Math.PI / 2) < 1e-9);
  });
  it('limite l’inclinaison de la tête', () => {
    assert.ok(clampAvatarPitch(3) < 1.3);
    assert.ok(clampAvatarPitch(-3) > -1.3);
    assert.equal(clampAvatarPitch(0.2), 0.2);
  });
});

describe('choix de l’invité', () => {
  const stage = { x: 0, z: -6 };
  const facing = guest('a:0', 0, -1, Math.PI); // 5 m de la scène, tourné vers elle.
  const back = guest('b:0', 0, -1.2, 0); // même distance, mais dos à la scène.
  const far = guest('c:0', 0, 7, Math.PI);
  const dancer = guest('z:d0', 3, 3, 0, 'dancing');

  it('propose un invité assis face à la scène, à bonne distance', () => {
    assert.equal(pickDefaultAvatarViewer([back, far, facing, dancer], stage)?.id, 'a:0');
  });
  it('sans scène, prend un invité assis du milieu de la liste', () => {
    assert.equal(pickDefaultAvatarViewer([dancer, facing, back, far], null)?.id, 'b:0');
    assert.equal(pickDefaultAvatarViewer([], stage), null);
  });
  it('passe au suivant / précédent en boucle, selon le filtre', () => {
    const all = [facing, back, far, dancer];
    assert.equal(stepAvatarViewer(all, 'a:0', 1)?.id, 'b:0');
    assert.equal(stepAvatarViewer(all, 'a:0', -1)?.id, 'z:d0');
    assert.equal(stepAvatarViewer(all, 'c:0', 1, 'seated')?.id, 'a:0');
    assert.equal(stepAvatarViewer(all, 'a:0', 1, 'dancing')?.id, 'z:d0');
    assert.equal(stepAvatarViewer(all, 'a:0', 1, 'standing'), null);
  });
  it('tire au hasard un autre invité que l’actuel', () => {
    const all = [facing, back];
    assert.equal(randomAvatarViewer(all, 'a:0', 'all', () => 0)?.id, 'b:0');
    assert.equal(randomAvatarViewer([facing], 'a:0')?.id, 'a:0');
  });
  it('ne propose que les filtres utiles', () => {
    assert.deepEqual(availableAvatarFilters([facing, back]), ['seated']);
    assert.deepEqual(availableAvatarFilters([facing, dancer]), ['all', 'seated', 'dancing']);
  });
});

describe('libellé de la place', () => {
  const bp = blueprint([
    { id: 't1', kind: 'table', name: 'Table 4', shape: 'round', capacity: 8, chairType: 'BANQUET', x: 30, y: 50 },
    { id: 'r1', kind: 'row', label: 'Rangée B', seatCount: 6, chairType: 'BANQUET', x: 70, y: 70, tier: 0 },
    { id: 'm1', kind: 'table', name: 'Mange-debout', shape: 'cocktail', capacity: 4, chairType: 'BANQUET', x: 50, y: 20 },
  ]);
  const guests = buildGuestSimulation(bp, { fill: 1 }).guests;

  it('nomme la table et la place', () => {
    const g = guests.find((x) => x.id === 't1:2');
    assert.ok(g);
    assert.equal(describeAvatarViewer(bp, g), 'Table 4 · place 3');
  });
  it('nomme la rangée et le siège', () => {
    const g = guests.find((x) => x.id === 'r1:0');
    assert.ok(g);
    assert.equal(describeAvatarViewer(bp, g), 'Rangée B · siège 1');
  });
  it('mange-debout et piste de danse', () => {
    const g = guests.find((x) => x.id.startsWith('m1:'));
    assert.ok(g);
    assert.equal(describeAvatarViewer(bp, g), 'Mange-debout · debout');
    assert.equal(describeAvatarViewer(bp, guest('zz:d1', 0, 0, 0, 'dancing')), 'Sur la piste de danse');
  });
  it('affiche le nom d’un invité personnalisé', () => {
    assert.equal(describeAvatarViewer(bp, { ...guest('t1:0', 0, 0, 0), name: 'Awa' }), 'Awa');
  });
});

describe('invités réels d’un événement', () => {
  const bp = blueprint([
    { id: 't1', kind: 'table', name: 'Table 1', shape: 'round', capacity: 8, chairType: 'BANQUET', x: 30, y: 50 },
    { id: 't2', kind: 'table', name: 'Table 2', shape: 'round', capacity: 8, chairType: 'BANQUET', x: 70, y: 50 },
  ]);
  it('assoit chaque invité à sa place, avec son nom, et laisse les autres places vides', () => {
    const res = buildGuestSimulation(bp, {
      fill: 1,
      dancing: false,
      seatOccupants: { 't1:0': { name: 'Awa Diallo' }, 't2:5': { name: 'Jean Mbala' } },
    });
    assert.equal(res.guests.length, 2);
    const jean = res.guests.find((g) => g.id === 't2:5');
    assert.equal(jean?.name, 'Jean Mbala');
    assert.equal(describeAvatarViewer(bp, jean!), 'Jean Mbala');
  });
  it('sans invité placé, la salle reste vide', () => {
    assert.equal(buildGuestSimulation(bp, { fill: 1, dancing: false, seatOccupants: {} }).guests.length, 0);
  });
});
