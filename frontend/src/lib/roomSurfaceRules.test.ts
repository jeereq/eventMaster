import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  applySurfaceRuleAction,
  collectFloorRules,
  collectWallRules,
} from './roomSurfaceRules.ts';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function bp(patch: Record<string, any> = {}): any {
  return {
    roomType: 'BANQUET',
    walls: [],
    furniture: [],
    fixtures: [],
    ...patch,
    metadata: { totalSeats: 0, ...(patch.metadata ?? {}) },
  };
}

const wall = (texture: string, color?: string) => ({ id: texture + (color ?? ''), start: { x: 0, y: 0 }, end: { x: 1, y: 0 }, heightM: 3, thicknessM: 0.2, texture, color });

describe('règles murs', () => {
  it('rien à signaler sur une salle standard', () => {
    assert.deepEqual(collectWallRules(bp({ walls: [wall('plaster'), wall('plaster')] })), []);
  });
  it('murs masqués : invisibles, avec action pour les réafficher', () => {
    const [rule] = collectWallRules(bp({ metadata: { showWalls: false } }));
    assert.equal(rule?.id, 'walls-hidden');
    assert.equal(rule?.tone, 'hidden');
    assert.equal(rule?.action?.id, 'showWalls');
  });
  it('tente : texture ignorée', () => {
    assert.equal(collectWallRules(bp({ roomType: 'TENT' }))[0]?.id, 'walls-tent');
    assert.equal(collectWallRules(bp({ metadata: { tentVenue: true, roofStyle: 'clearTent' } }))[0]?.id, 'walls-tent');
    assert.deepEqual(collectWallRules(bp({ metadata: { tentVenue: true, roofStyle: 'flat' } })), []);
  });
  it('murs réglés un par un', () => {
    const rules = collectWallRules(bp({ walls: [wall('plaster'), wall('brick')] }));
    assert.equal(rules[0]?.id, 'walls-per-segment');
  });
});

describe('règles sol', () => {
  it('plan importé : sol invisible', () => {
    const [rule] = collectFloorRules(bp({ metadata: { floorImageUrl: 'data:x', floorImageFit: 'cover' } }));
    assert.equal(rule?.id, 'floor-plan-image');
    assert.equal(rule?.tone, 'hidden');
  });
  it('texture importée, teinte, zones et abords', () => {
    const rules = collectFloorRules(bp({
      metadata: { floorImageUrl: 'data:x', floorImageFit: 'tile', floorColor: '#1e3a5f', outdoorSurroundings: 'garden' },
      furniture: [{ kind: 'zone', material: 'led' }, { kind: 'zone' }],
      fixtures: [{ kind: 'carpet' }],
    }));
    assert.deepEqual(rules.map((r) => r.id), ['floor-image-texture', 'floor-tint', 'floor-overlays', 'floor-outdoor']);
    assert.match(rules[2]!.title, /^2 zones/);
  });
  it('teinte blanche = pas de teinte', () => {
    assert.deepEqual(collectFloorRules(bp({ metadata: { floorColor: '#FFFFFF' } })), []);
  });
});

describe('actions', () => {
  it('réaffiche les murs, retire le plan ou la teinte', () => {
    assert.equal(applySurfaceRuleAction(bp({ metadata: { showWalls: false } }), 'showWalls').blueprint.metadata.showWalls, true);
    const removed = applySurfaceRuleAction(bp({ metadata: { floorImageUrl: 'x', floorType: 'custom' } }), 'removeFloorImage').blueprint.metadata;
    assert.equal(removed.floorImageUrl, undefined);
    assert.equal(removed.floorType, 'parquet');
    assert.equal(applySurfaceRuleAction(bp({ metadata: { floorColor: '#123' } }), 'clearFloorTint').blueprint.metadata.floorColor, undefined);
  });
});
