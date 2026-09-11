import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  bucketLedgerByUtcDay,
  estimateComposeCostAndMargin,
  parseUtcDayEnd,
  parseUtcDayStart,
  resolveLedgerAction,
  utcDayKey,
} from './aiTokenUsageQuery.ts';

describe('resolveLedgerAction', () => {
  it('ne déduit jamais l’action depuis le nombre de jetons', () => {
    assert.equal(resolveLedgerAction(undefined), 'budget_simulation');
    assert.equal(resolveLedgerAction(null), 'budget_simulation');
    assert.equal(resolveLedgerAction('invitation_compose'), 'invitation_compose');
    assert.equal(resolveLedgerAction('room_plan_from_photo'), 'room_plan_from_photo');
    assert.equal(resolveLedgerAction('recharge'), 'recharge');
    assert.equal(resolveLedgerAction('grant'), 'grant');
  });
});

describe('parseUtcDayStart / parseUtcDayEnd', () => {
  it('interprète YYYY-MM-DD en UTC, pas dans le fuseau local', () => {
    const start = parseUtcDayStart('2026-09-05');
    const end = parseUtcDayEnd('2026-09-05');
    assert.ok(start);
    assert.ok(end);
    assert.equal(start.toISOString(), '2026-09-05T00:00:00.000Z');
    assert.equal(end.toISOString(), '2026-09-05T23:59:59.999Z');
  });

  it('ignore une date invalide', () => {
    assert.equal(parseUtcDayStart('not-a-date'), undefined);
    assert.equal(parseUtcDayEnd(''), undefined);
  });
});

describe('bucketLedgerByUtcDay', () => {
  it('agrège conso et recharge par jour UTC', () => {
    const rows = [
      { createdAt: new Date('2026-09-05T01:00:00.000Z'), tokensDelta: -2 },
      { createdAt: new Date('2026-09-05T22:00:00.000Z'), tokensDelta: -1 },
      { createdAt: new Date('2026-09-06T00:00:00.000Z'), tokensDelta: 6 },
    ];
    assert.deepEqual(bucketLedgerByUtcDay(rows), [
      { day: '2026-09-05', consumed: 3, credited: 0, moves: 2 },
      { day: '2026-09-06', consumed: 0, credited: 6, moves: 1 },
    ]);
  });

  it('utilise la clé UTC même si l’heure locale change de jour', () => {
    assert.equal(utcDayKey(new Date('2026-09-05T23:30:00.000Z')), '2026-09-05');
  });
});

describe('estimateComposeCostAndMargin', () => {
  it('calcule correctement pour le mode Rapide (Flash) 1 visuel', () => {
    const res = estimateComposeCostAndMargin({
      speedMode: 'fast',
      variantsCount: 1,
      tokensConsumed: 2,
    });
    assert.equal(res.speedMode, 'fast');
    assert.equal(res.speedModeLabel, '⚡ Rapide (Flash)');
    assert.equal(res.variantsCount, 1);
    assert.equal(res.safetyFallbackTriggered, false);
    // 1 * 0.030 + 0.002 = 0.032 $
    assert.equal(res.estimatedCostUsd, 0.032);
    // 2 jetons * 416 FC = 832 FC
    assert.equal(res.estimatedRevenueFc, 832);
    // 832 / 2800 = 0.297 $
    assert.equal(res.estimatedRevenueUsd, 0.297);
    // Marge brute ~ 89%
    assert.ok(res.estimatedMarginPct >= 88 && res.estimatedMarginPct <= 90);
    assert.ok(res.estimatedMarginUsd > 0.26);
  });

  it('calcule correctement pour le mode Qualité (Pro 2K) avec 2 variantes A/B', () => {
    const res = estimateComposeCostAndMargin({
      speedMode: 'quality',
      variantsCount: 2,
      tokensConsumed: 2,
    });
    assert.equal(res.speedMode, 'quality');
    assert.equal(res.speedModeLabel, '✨ Qualité (Pro 2K)');
    assert.equal(res.variantsCount, 2);
    // 2 * 0.065 + 0.002 = 0.132 $
    assert.equal(res.estimatedCostUsd, 0.132);
    assert.ok(res.estimatedMarginPct >= 50 && res.estimatedMarginPct <= 60);
  });

  it('tient compte du surcoût d’un repli sécurité', () => {
    const res = estimateComposeCostAndMargin({
      speedMode: 'fast',
      variantsCount: 1,
      safetyFallbackTriggered: true,
      tokensConsumed: 2,
    });
    assert.equal(res.safetyFallbackTriggered, true);
    // (1 + 1) * 0.030 + 0.002 = 0.062 $
    assert.equal(res.estimatedCostUsd, 0.062);
  });
});

