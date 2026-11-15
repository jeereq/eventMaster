import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  MAX_CANVAS_SIDE_M,
  MAX_FURNITURE_ITEMS,
  parseExpectedUpdatedAt,
  validateRoomBlueprint,
} from './roomBlueprintValidation.ts';

const plan = (over: Record<string, unknown> = {}) => ({
  canvas: { widthM: 20, heightM: 12 },
  fixtures: [{ id: 'f1', kind: 'stage', x: 40, y: 0, w: 20, h: 10 }],
  furniture: [
    { id: 't1', kind: 'table', shape: 'round', capacity: 8, x: 30, y: 50 },
    { id: 'r1', kind: 'row', seatCount: 10, x: 50, y: 70, rotation: 0 },
    { id: 'c1', kind: 'chair', x: 10, y: 10 },
    { id: 'z1', kind: 'zone', x: 0, y: 0, w: 10, h: 10 },
  ],
  walls: [{ id: 'w1', start: { x: 0, y: 0 }, end: { x: 100, y: 0 }, openings: [] }],
  metadata: { totalSeats: 19 },
  ...over,
});

const reason = (value: unknown) => {
  const r = validateRoomBlueprint(value);
  return r.ok ? null : r;
};

describe('validateRoomBlueprint', () => {
  it('accepte un plan complet et l’absence de plan', () => {
    assert.deepEqual(validateRoomBlueprint(plan()), { ok: true });
    assert.deepEqual(validateRoomBlueprint(null), { ok: true });
    assert.deepEqual(validateRoomBlueprint(undefined), { ok: true });
    assert.deepEqual(validateRoomBlueprint(plan({ fixtures: undefined, walls: undefined })), { ok: true });
  });

  it('refuse une structure illisible', () => {
    assert.equal(reason('plan')?.status, 400);
    assert.equal(reason([])?.status, 400);
    assert.equal(reason(plan({ canvas: { widthM: 0, heightM: 10 } }))?.status, 400);
    assert.equal(reason(plan({ furniture: 'x' }))?.status, 400);
    assert.equal(reason(plan({ fixtures: {} }))?.status, 400);
    assert.equal(reason(plan({ walls: [{ start: { x: 0 } }] }))?.status, 400);
    assert.equal(reason(plan({ metadata: [] }))?.status, 400);
  });

  it('refuse un mobilier sans identifiant, en double, de type inconnu ou mal placé', () => {
    assert.match(reason(plan({ furniture: [{ kind: 'chair', x: 1, y: 1 }] }))!.detail!, /identifiant/);
    assert.match(
      reason(plan({ furniture: [{ id: 'a', kind: 'chair', x: 1, y: 1 }, { id: 'a', kind: 'chair', x: 2, y: 2 }] }))!.detail!,
      /double/,
    );
    assert.match(reason(plan({ furniture: [{ id: 'a', kind: 'sofa', x: 1, y: 1 }] }))!.detail!, /type/);
    assert.match(reason(plan({ furniture: [{ id: 'a', kind: 'chair', x: null, y: 1 }] }))!.detail!, /position/);
  });

  it('borne les capacités, la taille de la salle et le nombre d’éléments', () => {
    assert.ok(reason(plan({ furniture: [{ id: 't', kind: 'table', capacity: 5000, x: 1, y: 1 }] })));
    assert.ok(reason(plan({ furniture: [{ id: 'r', kind: 'row', seatCount: -1, x: 1, y: 1 }] })));
    assert.ok(reason(plan({ canvas: { widthM: MAX_CANVAS_SIDE_M + 1, heightM: 10 } })));
    const many = Array.from({ length: MAX_FURNITURE_ITEMS + 1 }, (_, i) => ({ id: `c${i}`, kind: 'chair', x: 1, y: 1 }));
    assert.match(reason(plan({ furniture: many }))!.detail!, /Trop/);
  });

  it('répond 413 au-delà de 8 Mo', () => {
    const huge = plan({ metadata: { totalSeats: 0, notes: 'x'.repeat(8 * 1024 * 1024 + 10) } });
    assert.equal(reason(huge)?.status, 413);
  });
});

describe('parseExpectedUpdatedAt', () => {
  it('distingue absent, illisible et valide', () => {
    assert.equal(parseExpectedUpdatedAt(undefined), undefined);
    assert.equal(parseExpectedUpdatedAt(''), undefined);
    assert.equal(parseExpectedUpdatedAt('pas une date'), null);
    assert.equal(parseExpectedUpdatedAt({}), null);
    assert.equal(parseExpectedUpdatedAt('2026-11-14T10:00:00.000Z')?.toISOString(), '2026-11-14T10:00:00.000Z');
  });
});
