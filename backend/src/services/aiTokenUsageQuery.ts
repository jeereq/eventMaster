export type AiTokenAction = 'budget_simulation' | 'invitation_compose' | 'recharge';

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

export function resolveLedgerAction(action?: AiTokenAction | null): AiTokenAction {
  return action || 'budget_simulation';
}

export function parseUtcDayStart(value: string): Date | undefined {
  const raw = value.trim();
  if (!raw) return undefined;
  const d = ISO_DAY.test(raw) ? new Date(`${raw}T00:00:00.000Z`) : new Date(raw);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export function parseUtcDayEnd(value: string): Date | undefined {
  const raw = value.trim();
  if (!raw) return undefined;
  const d = ISO_DAY.test(raw) ? new Date(`${raw}T23:59:59.999Z`) : new Date(raw);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export function utcDayKey(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export function bucketLedgerByUtcDay(
  rows: Array<{ createdAt: Date; tokensDelta: number }>,
): Array<{ day: string; consumed: number; credited: number; moves: number }> {
  const map = new Map<string, { consumed: number; credited: number; moves: number }>();
  for (const row of rows) {
    const day = utcDayKey(row.createdAt);
    const current = map.get(day) || { consumed: 0, credited: 0, moves: 0 };
    current.moves += 1;
    if (row.tokensDelta < 0) current.consumed += -row.tokensDelta;
    if (row.tokensDelta > 0) current.credited += row.tokensDelta;
    map.set(day, current);
  }
  return [...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([day, values]) => ({ day, ...values }));
}
