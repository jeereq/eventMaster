export const LAYOUT_ACTION_KINDS = [
  'add',
  'edit',
  'delete',
  'move',
  'template',
  'settings',
  'info',
] as const;

export type LayoutActionKind = (typeof LAYOUT_ACTION_KINDS)[number];

export const LAYOUT_ACTION_LOG_MAX = 40;

export interface LayoutActionEntry {
  id: string;
  at: string;
  message: string;
  kind: LayoutActionKind;
}

const KIND_SET = new Set<string>(LAYOUT_ACTION_KINDS);

export function sanitizeLayoutActions(value: unknown, max = LAYOUT_ACTION_LOG_MAX): LayoutActionEntry[] {
  if (!Array.isArray(value)) return [];
  const next: LayoutActionEntry[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Partial<LayoutActionEntry>;
    if (typeof row.id !== 'string' || typeof row.at !== 'string' || typeof row.message !== 'string') continue;
    if (!KIND_SET.has(row.kind || '')) continue;
    next.push({
      id: row.id,
      at: row.at,
      message: row.message,
      kind: row.kind as LayoutActionKind,
    });
    if (next.length >= max) break;
  }
  return next;
}

export function createLayoutAction(
  message: string,
  kind: LayoutActionEntry['kind'] = 'info',
): LayoutActionEntry {
  return {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    at: new Date().toISOString(),
    message,
    kind,
  };
}

export function prependLayoutAction(
  log: LayoutActionEntry[],
  message: string,
  kind: LayoutActionEntry['kind'] = 'info',
  max = LAYOUT_ACTION_LOG_MAX,
): LayoutActionEntry[] {
  return [createLayoutAction(message, kind), ...log].slice(0, max);
}
