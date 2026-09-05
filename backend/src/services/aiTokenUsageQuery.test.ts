import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  bucketLedgerByUtcDay,
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
