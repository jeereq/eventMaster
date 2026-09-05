import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  composeRoomPlanFromBrief,
  normalizeRoomPlanImageUrl,
  normalizeRoomPlanVisionKind,
  refineSeatKindFromFootprint,
  parseHexColor,
  parseModelJson,
  parseRoomPlanVisionDraft,
  ROOM_PLAN_VISION_ITEM_MAX,
} from './roomPlanAiService.ts';

describe('normalizeRoomPlanImageUrl', () => {
  it('accepte une URL https', () => {
    assert.equal(
      normalizeRoomPlanImageUrl('https://res.cloudinary.com/demo/plan.jpg'),
      'https://res.cloudinary.com/demo/plan.jpg',
    );
  });

  it('refuse une URL non https', () => {
    assert.throws(() => normalizeRoomPlanImageUrl('http://evil.example/plan.jpg'), { status: 400 });
  });
});

describe('parseRoomPlanVisionDraft', () => {
  it('ne garde que les objets visibles reconnus et plafonne les sièges', () => {
    const draft = parseRoomPlanVisionDraft({
      view: 'top',
      canvas: { widthM: 18, heightM: 24 },
      outline: { shape: 'rectangle', x: 6, y: 6, w: 88, h: 88 },
      items: [
        { kind: 'table', x: 32, y: 40, shape: 'round', seats: 80 },
        { kind: 'spaceship', x: 10, y: 10 },
        { kind: 'row', x: 50, y: 70, seats: 12 },
        { kind: 'stage', x: 50, y: 8, w: 28, h: 10 },
      ],
      walls: [{ start: { x: 8, y: 8 }, end: { x: 92, y: 8 }, doors: [0.5], windows: [0.25] }],
      confidence: 0.8,
      warnings: [],
    }, { widthM: 20, heightM: 15 });

    assert.equal(draft.items.length, 3);
    assert.equal(draft.items[0]?.kind, 'table');
    assert.equal(draft.items[0]?.seats, 16);
    assert.equal(draft.items[1]?.kind, 'row');
    assert.equal(draft.walls.length, 1);
    assert.equal(draft.walls[0]?.doors[0], 0.5);
    assert.equal(draft.canvas.widthM, 18);
  });

  it('déduit un kind proche (amphithéâtre → rangée) au lieu de jeter l’objet', () => {
    const draft = parseRoomPlanVisionDraft({
      view: 'perspective',
      items: [{ kind: 'amphitheater', x: 50, y: 50, w: 40, h: 12, seats: 200 }],
    }, { widthM: 20, heightM: 16 });

    assert.equal(draft.items.length, 1);
    assert.equal(draft.items[0]?.kind, 'row');
    assert.equal(draft.items[0]?.seats, 40);
    assert.ok(draft.warnings.some((w) => w.includes('perspective')));
    assert.equal(draft.canvas.widthM, 20);
  });

  it('mappe les alias vision courants et estime les sièges manquants', () => {
    const draft = parseRoomPlanVisionDraft({
      view: 'top',
      items: [
        { kind: 'tables', x: 20, y: 24, w: 10, h: 10, shape: 'ronde' },
        { kind: 'chairs', x: 18, y: 60, w: 28, h: 6 },
        { kind: 'chairs', x: 70, y: 20, w: 4, h: 4 },
        { kind: 'dancefloor', x: 40, y: 40, w: 22, h: 18 },
        { kind: 'dj', x: 42, y: 6, w: 16, h: 8 },
        { kind: 'lights', x: 12, y: 12, w: 70, h: 70 },
        { kind: 'corridor', x: 46, y: 20, w: 8, h: 50 },
        { kind: 'spaceship', x: 10, y: 10 },
      ],
    }, { widthM: 22, heightM: 18 });

    assert.deepEqual(draft.items.map((item) => item.kind), [
      'table', 'row', 'chair', 'zone', 'djBooth', 'stringLight', 'corridor',
    ]);
    assert.equal(draft.items[0]?.shape, 'round');
    assert.equal(draft.items[0]?.seats, 8);
    assert.equal(draft.items[1]?.seats, 12);
    assert.equal(draft.items[2]?.kind, 'chair');
    assert.equal(draft.items[3]?.zoneKind, 'dance');
  });

  it('affine chairs : bande longue → rangée, petit footprint → chaise', () => {
    assert.equal(refineSeatKindFromFootprint('chair', 28, 6), 'row');
    assert.equal(refineSeatKindFromFootprint('chair', 4, 4), 'chair');
    assert.equal(refineSeatKindFromFootprint('row', 4, 4), 'chair');
    assert.equal(refineSeatKindFromFootprint('row', 28, 6), 'row');
  });

  it('conserve couleurs, matières et bbox haut-gauche', () => {
    const draft = parseRoomPlanVisionDraft({
      view: 'top',
      appearance: {
        imageRole: 'plan',
        floorType: 'parquet',
        floorColor: '#c4a06a',
        wallTexture: 'brick',
        wallColor: 'cream',
        tableSurface: 'linen',
        tableColor: '#fff',
      },
      items: [{
        kind: 'table',
        x: 12,
        y: 20,
        w: 10,
        h: 10,
        color: '#8b1c1c',
        surface: 'linen',
        chairStyle: 'chiavari',
        seatMaterial: 'velvet',
        anchor: 'box',
      }, {
        kind: 'aisle',
        x: 46,
        y: 14,
        w: 8,
        h: 70,
        color: '#991b1b',
        aisleStyle: 'royalRed',
      }],
    }, { widthM: 20, heightM: 16 });

    assert.equal(draft.appearance.imageRole, 'plan');
    assert.equal(draft.appearance.floorType, 'parquet');
    assert.equal(draft.appearance.floorColor, '#c4a06a');
    assert.equal(draft.appearance.wallTexture, 'brick');
    assert.equal(draft.appearance.wallColor, '#f5f0e8');
    assert.equal(draft.appearance.tableColor, '#ffffff');
    assert.equal(draft.items[0]?.color, '#8b1c1c');
    assert.equal(draft.items[0]?.surface, 'linen');
    assert.equal(draft.items[0]?.chairStyle, 'chiavari');
    assert.equal(draft.items[0]?.anchor, 'box');
    assert.equal(draft.items[1]?.aisleStyle, 'royalRed');
  });

  it('reconnaît arche, cloison, table arc et scène demi-lune', () => {
    const draft = parseRoomPlanVisionDraft({
      view: 'perspective',
      appearance: { imageRole: 'photo', roofStyle: 'tentSwag', floorType: 'herbe', curtainColor: '#faf7f2' },
      items: [
        { kind: 'table', x: 20, y: 30, shape: 'arc', seats: 10, chairStyle: 'ovalBack', hasCenterpiece: true },
        { kind: 'arch', x: 40, y: 8, w: 24, h: 12 },
        { kind: 'partition', x: 28, y: 40, w: 36, h: 14 },
        { kind: 'stage', x: 36, y: 6, w: 28, h: 12, stageShape: 'semiCircle' },
        { kind: 'row', x: 20, y: 50, seats: 10, chairStyle: 'louis' },
        { kind: 'pedestal', x: 22, y: 8, w: 5, h: 5, pedestalStyle: 'squareWhite' },
        { kind: 'decal', x: 40, y: 50, w: 14, h: 14, decalKind: 'butterfly', color: '#dcaeae' },
        { kind: 'aisle', x: 47, y: 18, w: 6, h: 70, hasPetals: true, hasSideLanterns: true },
      ],
    }, { widthM: 22, heightM: 28 });

    assert.equal(draft.appearance.roofStyle, 'tentSwag');
    assert.equal(draft.appearance.curtainColor, '#faf7f2');
    assert.equal(draft.items[0]?.shape, 'arc');
    assert.equal(draft.items[0]?.hasCenterpiece, true);
    assert.equal(draft.items[0]?.chairStyle, 'ovalBack');
    assert.equal(draft.items[1]?.kind, 'arch');
    assert.equal(draft.items[2]?.kind, 'partition');
    assert.equal(draft.items[3]?.stageShape, 'semiCircle');
    assert.equal(draft.items[4]?.chairStyle, 'louis');
    assert.equal(draft.items[5]?.kind, 'pedestal');
    assert.equal(draft.items[5]?.pedestalStyle, 'squareWhite');
    assert.equal(draft.items[6]?.kind, 'decal');
    assert.equal(draft.items[6]?.decalKind, 'butterfly');
    assert.equal(draft.items[7]?.hasPetals, true);
    assert.equal(draft.items[7]?.hasSideLanterns, true);
  });

  it('traite une photo comme imageRole photo par défaut', () => {
    const draft = parseRoomPlanVisionDraft({
      view: 'perspective',
      items: [],
    }, { widthM: 18, heightM: 14 });
    assert.equal(draft.appearance.imageRole, 'photo');
  });

  it('plafonne le nombre d’objets', () => {
    const items = Array.from({ length: ROOM_PLAN_VISION_ITEM_MAX + 5 }, (_, i) => ({
      kind: 'table',
      x: i,
      y: i,
    }));
    const draft = parseRoomPlanVisionDraft({ items }, { widthM: 20, heightM: 15 });
    assert.equal(draft.items.length, ROOM_PLAN_VISION_ITEM_MAX);
    assert.ok(draft.warnings.some((w) => w.includes(String(ROOM_PLAN_VISION_ITEM_MAX))));
  });
});

describe('normalizeRoomPlanVisionKind', () => {
  it('reconnaît les kinds canoniques et les alias FR / EN', () => {
    assert.equal(normalizeRoomPlanVisionKind('table'), 'table');
    assert.equal(normalizeRoomPlanVisionKind('Piste de danse'), 'zone');
    assert.equal(normalizeRoomPlanVisionKind('régie'), 'djBooth');
    assert.equal(normalizeRoomPlanVisionKind('guirlandes'), 'stringLight');
    assert.equal(normalizeRoomPlanVisionKind('spaceship'), undefined);
  });
});

describe('composeRoomPlanFromBrief', () => {
  it('refuse un brief trop court', async () => {
    await assert.rejects(
      () => composeRoomPlanFromBrief({ brief: 'ok', widthM: 20, heightM: 16 }),
      { status: 400 },
    );
  });
});

describe('parseModelJson', () => {
  it('accepte un JSON nu ou entouré de fences markdown', () => {
    assert.deepEqual(parseModelJson('{"view":"top"}'), { view: 'top' });
    assert.deepEqual(parseModelJson('```json\n{"view":"perspective"}\n```'), { view: 'perspective' });
  });
});

describe('parseHexColor', () => {
  it('normalise hex court, long et noms courants', () => {
    assert.equal(parseHexColor('#fff'), '#ffffff');
    assert.equal(parseHexColor('c4a06a'), '#c4a06a');
    assert.equal(parseHexColor('gold'), '#c4a06a');
    assert.equal(parseHexColor('not-a-color'), undefined);
  });
});
