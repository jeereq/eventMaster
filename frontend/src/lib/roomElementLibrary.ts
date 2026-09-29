'use client';

/**
 * Bibliothèque « Mes éléments » : éléments créés à partir d’une image ou d’une vidéo,
 * enregistrés sur le compte (API /rooms/elements) avec une copie locale de secours.
 */

import { api } from '@/lib/api';
import { sanitizeCustomElement, type CustomElementDefinition } from '@/lib/roomCustomElements';

const STORAGE_KEY = 'em-room-element-library';
const MAX_LOCAL = 60;

function readLocal(): CustomElementDefinition[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    return Array.isArray(raw) ? raw.map(sanitizeCustomElement).filter((d): d is CustomElementDefinition => d !== null) : [];
  } catch {
    return [];
  }
}

function writeLocal(items: CustomElementDefinition[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_LOCAL)));
  } catch {
    /* stockage plein ou bloqué : la bibliothèque cloud reste la référence */
  }
}

const fromRow = (row: { id: string; definition: unknown }) =>
  sanitizeCustomElement({ ...(row.definition as object), id: row.id });

/** Liste cloud (copiée en local) ; en cas d’échec réseau, la copie locale. */
export async function loadElementLibrary(): Promise<CustomElementDefinition[]> {
  try {
    const data = await api.get('/rooms/elements');
    const items = (Array.isArray(data?.elements) ? data.elements : [])
      .map(fromRow)
      .filter((d: CustomElementDefinition | null): d is CustomElementDefinition => d !== null);
    const localOnly = readLocal().filter((d) => d.id?.startsWith('local-'));
    const merged = [...items, ...localOnly];
    writeLocal(merged);
    return merged;
  } catch {
    return readLocal();
  }
}

/** Enregistre sur le compte ; hors ligne, garde l’élément en local. */
export async function saveElementToLibrary(def: CustomElementDefinition): Promise<CustomElementDefinition> {
  const { id: _ignored, ...definition } = def;
  void _ignored;
  let saved: CustomElementDefinition | null = null;
  try {
    const data = await api.post('/rooms/elements', { definition });
    saved = data?.element ? fromRow(data.element) : null;
  } catch {
    saved = null;
  }
  const item = saved ?? { ...def, id: `local-${Date.now().toString(36)}` };
  writeLocal([item, ...readLocal().filter((d) => d.id !== item.id)]);
  return item;
}

export async function removeElementFromLibrary(id: string): Promise<void> {
  writeLocal(readLocal().filter((d) => d.id !== id));
  if (!id.startsWith('local-')) await api.delete(`/rooms/elements/${id}`);
}
