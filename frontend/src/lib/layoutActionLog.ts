export interface LayoutActionEntry {
  id: string;
  at: string;
  message: string;
  kind: 'add' | 'edit' | 'delete' | 'move' | 'template' | 'settings' | 'info';
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
  max = 40,
): LayoutActionEntry[] {
  return [createLayoutAction(message, kind), ...log].slice(0, max);
}
