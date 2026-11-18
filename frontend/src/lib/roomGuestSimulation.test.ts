import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { RoomLayoutBlueprint } from './roomLayoutUtils.ts';
import { buildGuestSimulation, detectDressCode, dressCodePalette, firstFreeGuestSeat, listGuestSeats } from './roomGuestSimulation.ts';

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

  it('installe les invités personnalisés à leur place, même salle peu remplie', () => {
    const portraits = [
      { id: 'p1', name: 'Awa', photoUrl: 'data:image/jpeg;base64,AAA', seatKey: 't1:3', style: 'dress' as const, outfit: '#c8a24a' },
      { id: 'p2', name: 'Fantôme', photoUrl: 'data:image/jpeg;base64,BBB', seatKey: 'absent:0' },
    ];
    const res = buildGuestSimulation(blueprint([round10], { metadata: { totalSeats: 0, guestPortraits: portraits } } as never), { fill: 0 });
    assert.equal(res.guests.length, 1);
    assert.equal(res.portraits, 1);
    const awa = res.guests[0];
    assert.equal(awa.id, 't1:3');
    assert.equal(awa.name, 'Awa');
    assert.equal(awa.photoUrl, 'data:image/jpeg;base64,AAA');
    assert.equal(awa.style, 'dress');
    assert.equal(awa.outfit, '#c8a24a');
    assert.equal(awa.headwrap, null);
  });

  it('garde les invités personnalisés au-delà du plafond d’avatars', () => {
    const tables = Array.from({ length: 5 }, (_, i) => ({ ...round10, id: `t${i}` }));
    const portraits = [{ id: 'p', name: 'Jo', photoUrl: 'x', seatKey: 't4:9' }];
    const res = buildGuestSimulation(blueprint(tables), { fill: 1, maxGuests: 10, portraits });
    assert.equal(res.guests.length, 11);
    assert.ok(res.guests.some((g) => g.portraitId === 'p'));
  });

  it('liste les places et propose la première libre près du meuble choisi', () => {
    const t2 = { ...round10, id: 't2', name: '', capacity: 4, hiddenSeatIndices: [1] };
    const row = { id: 'r', kind: 'row', label: 'Rang A', seatCount: 3, tier: 0, x: 50, y: 70 };
    const seats = listGuestSeats(blueprint([round10, t2, row]));
    assert.equal(seats.length, 10 + 3 + 3);
    assert.equal(seats[0].label, 'Table 1 · place 1');
    assert.equal(seats[10].label, 'Table 2 · place 1');
    assert.equal(seats[11].key, 't2:2');
    assert.equal(seats[13].label, 'Rang A · siège 1');
    const bp = blueprint([round10, t2, row]);
    assert.equal(firstFreeGuestSeat(bp, ['t1:0'])?.key, 't1:1');
    assert.equal(firstFreeGuestSeat(bp, [], 't2')?.key, 't2:0');
    assert.equal(firstFreeGuestSeat(bp, ['t2:0', 't2:2', 't2:3'], 't2')?.key, 't1:0');
  });

  it('habille les invités selon le thème de la soirée', () => {
    const tables = Array.from({ length: 6 }, (_, i) => ({ ...round10, id: `t${i}` }));
    const white = buildGuestSimulation(blueprint(tables, { metadata: { totalSeats: 0, guestDressCode: { id: 'blanc' } } } as never), { fill: 1 });
    const whites = new Set(['#f4f1de', '#ece6d6', '#f7f4ee', '#e8e2d0', '#fbf8f1', '#efe7d6', '#f6efe0', '#e9dcc0', '#fffdf8']);
    assert.ok(white.guests.every((g) => whites.has(g.outfit)), 'soirée blanche : tout le monde en blanc');
    const colors = buildGuestSimulation(blueprint(tables), { fill: 1, dressCode: { id: 'couleurs', colors: ['#c1121f', '#c8a24a'] } });
    const dresses = colors.guests.filter((g) => g.style !== 'suit');
    assert.ok(dresses.length > 10 && dresses.every((g) => g.outfit === '#c1121f' || g.outfit === '#c8a24a'));
    const trad = buildGuestSimulation(blueprint(tables), { fill: 1, dressCode: { id: 'traditionnel' } });
    assert.ok(trad.guests.filter((g) => g.style === 'boubou').length > trad.guests.length / 3);
    // Mêmes invités, seule la tenue change : les places occupées ne bougent pas.
    assert.deepEqual(white.guests.map((g) => g.id), colors.guests.map((g) => g.id));
    // Couleurs absentes : on retombe sur les tenues variées.
    assert.deepEqual(dressCodePalette({ id: 'couleurs', colors: [] }), dressCodePalette(null));
  });

  it('devine le thème de la soirée à partir de la description', () => {
    assert.equal(detectDressCode('Mariage, soirée blanche pour 200 invités')?.id, 'blanc');
    assert.equal(detectDressCode('Dîner de gala de fin d’année')?.id, 'gala');
    assert.equal(detectDressCode('Dot et mariage coutumier à Kinshasa')?.id, 'traditionnel');
    assert.equal(detectDressCode('Conférence de 300 personnes avec scène')?.id, 'business');
    assert.deepEqual(detectDressCode('Anniversaire, thème rouge et or, piste de danse'), { id: 'couleurs', colors: ['#c1121f', '#c8a24a'] });
    assert.deepEqual(detectDressCode('Dress code bleu roi et blanc'), { id: 'couleurs', colors: ['#1d4ed8', '#f4f1de'] });
    // Les couleurs du décor ne sont pas un dress code.
    assert.equal(detectDressCode('Tables rondes avec nappes blanches et chaises dorées'), null);
    assert.equal(detectDressCode(''), null);
  });
});
