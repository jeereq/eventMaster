import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  autoDistributeTablesToZones,
  computeTicketingRevenueSummary,
  TICKETING_ZONE_PRESETS,
  type PricingZone,
} from './ticketPricing.ts';

describe('ticketPricing zone distribution', () => {
  const sampleZones: PricingZone[] = [
    { id: 'zone-vip', name: 'VIP', priceFc: 100000, color: '#c4a35a' },
    { id: 'zone-standard', name: 'Standard', priceFc: 50000, color: '#5b8def' },
  ];

  const sampleTables = [
    { id: 't1', name: 'Table 1', x: 50, y: 15, capacity: 8 }, // very close to front
    { id: 't2', name: 'Table 2', x: 30, y: 25, capacity: 8 }, // close to front
    { id: 't3', name: 'Table 3', x: 70, y: 55, capacity: 8 }, // mid
    { id: 't4', name: 'Table 4', x: 50, y: 75, capacity: 8 }, // back
    { id: 't5', name: 'Table 5', x: 50, y: 85, capacity: 8 }, // very back
  ];

  it('computes ticketing revenue summary correctly', () => {
    const tables = [
      { id: 't1', capacity: 10, pricingZoneId: 'zone-vip' },
      { id: 't2', capacity: 20, pricingZoneId: 'zone-standard' },
      { id: 't3', capacity: 5 }, // unassigned
    ];

    const summary = computeTicketingRevenueSummary(tables, sampleZones, 20000);
    assert.equal(summary.totalTables, 3);
    assert.equal(summary.totalSeats, 35);
    // VIP: 10 * 100000 = 1 000 000
    // Standard: 20 * 50000 = 1 000 000
    // Unassigned: 5 * 20000 = 100 000
    // Total = 2 100 000
    assert.equal(summary.totalRevenueFc, 2100000);
    assert.equal(summary.byZone[0].seatCount, 10);
    assert.equal(summary.byZone[1].seatCount, 20);
    assert.equal(summary.unassigned.seatCount, 5);
  });

  it('distributes tables front-to-back prioritizing VIP closer to stage', () => {
    const result = autoDistributeTablesToZones(sampleTables, sampleZones, {
      strategy: 'front_to_back',
      fixtures: [{ kind: 'stage', x: 50, y: 5, w: 20, h: 10 }],
    });

    assert.equal(result.tables.length, 5);
    // Table 1 (y: 15) and Table 2 (y: 25) closest to stage should be VIP
    const t1 = result.tables.find((t) => t.id === 't1');
    const t5 = result.tables.find((t) => t.id === 't5');

    assert.equal(t1?.pricingZoneId, 'zone-vip');
    assert.equal(t5?.pricingZoneId, 'zone-standard');

    // Bounding boxes should be generated
    const vipZone = result.zones.find((z) => z.id === 'zone-vip');
    assert.ok(vipZone?.w && vipZone.w > 0);
    assert.ok(vipZone?.h && vipZone.h > 0);
  });

  it('distributes concentric circles from center of room', () => {
    const tables = [
      { id: 'center', x: 50, y: 50, capacity: 10 },
      { id: 'corner1', x: 10, y: 10, capacity: 10 },
      { id: 'corner2', x: 90, y: 90, capacity: 10 },
    ];
    const result = autoDistributeTablesToZones(tables, sampleZones, {
      strategy: 'concentric',
    });

    const center = result.tables.find((t) => t.id === 'center');
    const corner = result.tables.find((t) => t.id === 'corner1');

    assert.equal(center?.pricingZoneId, 'zone-vip');
    assert.equal(corner?.pricingZoneId, 'zone-standard');
  });

  it('provides rich ticketing zone presets', () => {
    assert.ok(TICKETING_ZONE_PRESETS.length >= 3);
    for (const preset of TICKETING_ZONE_PRESETS) {
      assert.ok(preset.zones.length >= 2);
      assert.ok(preset.zones[0].priceFc > preset.zones[1].priceFc);
    }
  });
});
