import { test } from 'node:test';
import assert from 'node:assert/strict';
import { describeAmbienceRules } from './roomAmbienceRules.ts';
import {
  ROOM_AMBIENCE_PRESETS,
  applyRoomAmbiencePreset,
  createBlueprintFixture,
  ensureBlueprintDefaults,
  type RoomLayoutBlueprint,
} from './roomLayoutUtils.ts';

const room = (patch: Partial<RoomLayoutBlueprint> = {}, meta: Partial<RoomLayoutBlueprint['metadata']> = {}): RoomLayoutBlueprint => {
  const base = ensureBlueprintDefaults(undefined as unknown as RoomLayoutBlueprint);
  return { ...base, ...patch, metadata: { ...base.metadata, ...meta } };
};

const ids = (b: RoomLayoutBlueprint, scope?: Parameters<typeof describeAmbienceRules>[1]) =>
  describeAmbienceRules(b, scope).map((r) => r.id);

test('murs masqués : la matière murale ne se voit pas', () => {
  assert.ok(ids(room({}, { showWalls: false })).includes('walls-hidden'));
  assert.ok(!ids(room({}, { showWalls: false }), { floor: true }).includes('walls-hidden'));
});

test('tente : la matière murale ne s’applique pas aux parois', () => {
  assert.ok(ids(room({ roomType: 'TENT' })).includes('walls-tent'));
});

test('lustres posés : les lustres automatiques de l’ambiance sont ignorés', () => {
  const b = room({ fixtures: [createBlueprintFixture('chandelier')] });
  const rule = describeAmbienceRules(b).find((r) => r.id === 'lighting-placed-chandeliers');
  assert.equal(rule?.level, 'blocked');
});

test('plan importé au sol : signalé comme remplacé', () => {
  const b = room({}, { floorImageUrl: 'data:image/png;base64,AA', floorImageFit: 'cover' });
  assert.match(describeAmbienceRules(b).find((r) => r.id === 'floor-image')!.text, /plan importé/);
});

test('tapis au sol : restent par-dessus le nouveau sol', () => {
  const b = room({ fixtures: [createBlueprintFixture('carpet'), createBlueprintFixture('aisle')] });
  assert.match(describeAmbienceRules(b).find((r) => r.id === 'floor-covered')!.text, /^2 tapis/);
});

test('salle sans mobilier : seule la table par défaut change', () => {
  assert.ok(ids(room({ furniture: [] })).includes('furniture-empty'));
});

test('murs générés depuis le contour : l’ambiance applique bien sa matière', () => {
  const b = room({ walls: [] });
  const preset = ROOM_AMBIENCE_PRESETS.find((p) => p.wallTexture === 'brick')!;
  const next = applyRoomAmbiencePreset(b, preset);
  assert.ok((next.walls ?? []).length > 0);
  assert.ok(next.walls!.every((w) => w.texture === 'brick'));
});
