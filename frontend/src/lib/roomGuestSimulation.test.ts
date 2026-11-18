import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { RoomLayoutBlueprint } from './roomLayoutUtils.ts';
import { buildGuestSimulation } from './roomGuestSimulation.ts';

function blueprint(furniture: unknown[], extra: Partial<RoomLayoutBlueprint> = {}): RoomLayoutBlueprint {
  return {
    version: 1,
    roomType: 'BANQUET',
    canvas: { widthM: 20, heightM: 16 },
    fixtures: [],
    furniture,
    metadata: { totalSeats: 0 },
    ...extra,
  } as unknown as RoomLayoutBlueprint;
}

const round10 = { id: 't1', kind: 'table', name: 'Table 1', shape: 'round', capacity: 10, chairType: 'BANQUET', x: 50, y: 50 };

describe('buildGuestSimulation', () => {
  it('assoit un invité par chaise quand la salle est pleine', () => {
    const res = buildGuestSimulation(blueprint([round10]), { fill: 1 });
    assert.equal(res.seats, 10);
    assert.equal(res.seated, 10);
    assert.ok(res.guests.every((g) => g.pose === 'seated'));
    // Autour du centre de la table (0, 0), à moins de 2 m.
    assert.ok(res.guests.every((g) => Math.hypot(g.x, g.z) < 2 && Math.hypot(g.x, g.z) > 0.5));
  });

  it('tourne chaque invité vers la table', () => {
    const res = buildGuestSimulation(blueprint([round10]), { fill: 1 });
    for (const g of res.guests) {
      // Direction du regard (sin, cos) · direction vers le centre > 0.
      const dot = Math.sin(g.rotY) * -g.x + Math.cos(g.rotY) * -g.z;
      assert.ok(dot > 0, `invité ${g.id} dos à la table`);
    }
  });

  it('respecte le taux de remplissage et reste stable d’un appel à l’autre', () => {
    const tables = Array.from({ length: 20 }, (_, i) => ({ ...round10, id: `t${i}`, x: 10 + (i % 5) * 18, y: 15 + Math.floor(i / 5) * 20 }));
    const half = buildGuestSimulation(blueprint(tables), { fill: 0.5 });
    assert.equal(half.seats, 200);
    assert.ok(half.seated > 70 && half.seated < 130, `${half.seated} invités pour 50 %`);
    const again = buildGuestSimulation(blueprint(tables), { fill: 0.5 });
    assert.deepEqual(again.guests.map((g) => g.id), half.guests.map((g) => g.id));
    // Les invités présents à 50 % le restent à 75 % : le remplissage s'ajoute.
    const more = new Set(buildGuestSimulation(blueprint(tables), { fill: 0.75 }).guests.map((g) => g.id));
    assert.ok(half.guests.every((g) => more.has(g.id)));
  });

  it('ignore les places masquées et suit la rotation de la table', () => {
    const t = { ...round10, capacity: 8, hiddenSeatIndices: [0, 1], rotation: 90 };
    const res = buildGuestSimulation(blueprint([t]), { fill: 1 });
    assert.equal(res.seats, 6);
    assert.equal(res.seated, 6);
  });

  it('fait danser les invités sur la piste, dans ses limites', () => {
    const dance = { id: 'z', kind: 'zone', label: 'Piste', zoneKind: 'dance', x: 40, y: 40, w: 20, h: 25 };
    const res = buildGuestSimulation(blueprint([dance]), { fill: 1 });
    // Piste de 4 × 4 m : environ une personne pour 2 m².
    assert.equal(res.dancing, 8);
    for (const g of res.guests) {
      assert.equal(g.pose, 'dancing');
      assert.ok(Math.abs(g.x) <= 2 && Math.abs(g.z) <= 2);
    }
    const none = buildGuestSimulation(blueprint([dance]), { fill: 1, dancing: false });
    assert.equal(none.guests.length, 0);
  });

  it('place des invités debout autour des mange-debout et assis dans les rangées', () => {
    const cocktail = { ...round10, id: 'c', shape: 'cocktail', capacity: 4 };
    const row = { id: 'r', kind: 'row', label: 'Rang A', seatCount: 12, tier: 0, chairType: 'THEATER', x: 50, y: 70 };
    const res = buildGuestSimulation(blueprint([cocktail, row]), { fill: 1 });
    assert.equal(res.standing, 4);
    assert.equal(res.seated, 12);
    assert.equal(res.seats, 12);
  });

  it('plafonne le nombre d’avatars', () => {
    const tables = Array.from({ length: 30 }, (_, i) => ({ ...round10, id: `t${i}` }));
    const res = buildGuestSimulation(blueprint(tables), { fill: 1, maxGuests: 50 });
    assert.equal(res.guests.length, 50);
    assert.equal(res.seats, 300);
  });

  it('varie les tenues et les teintes de peau', () => {
    const tables = Array.from({ length: 10 }, (_, i) => ({ ...round10, id: `t${i}` }));
    const res = buildGuestSimulation(blueprint(tables), { fill: 1 });
    assert.ok(new Set(res.guests.map((g) => g.skin)).size >= 5);
    assert.ok(new Set(res.guests.map((g) => g.style)).size === 3);
    assert.ok(res.guests.some((g) => g.headwrap));
  });
});
