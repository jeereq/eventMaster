'use client';

import {
  captureRoomAmbienceFromBlueprint,
  exportAmbiencesPayload,
  parseAmbienceImport,
  type RoomLayoutBlueprint,
  type SavedRoomAmbience,
} from '@/lib/roomLayoutUtils';

const STORAGE_KEY = 'em-room-ambience-library';
const MAX_LIBRARY_SIZE = 24;

export function loadAmbienceLibrary(): SavedRoomAmbience[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return parseAmbienceImport(raw);
  } catch {
    return [];
  }
}

function persistAmbienceLibrary(items: SavedRoomAmbience[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, exportAmbiencesPayload(items.slice(0, MAX_LIBRARY_SIZE)));
}

export function replaceAmbienceLibrary(items: SavedRoomAmbience[]): SavedRoomAmbience[] {
  const next = items.slice(0, MAX_LIBRARY_SIZE);
  persistAmbienceLibrary(next);
  return next;
}

export function addAmbienceToLibrary(item: SavedRoomAmbience): SavedRoomAmbience[] {
  const existing = loadAmbienceLibrary().filter((row) => row.id !== item.id);
  const next = [item, ...existing].slice(0, MAX_LIBRARY_SIZE);
  persistAmbienceLibrary(next);
  return next;
}

export function captureAmbienceToLibrary(
  blueprint: RoomLayoutBlueprint,
  name: string,
): SavedRoomAmbience[] {
  const trimmed = name.trim();
  if (!trimmed) return loadAmbienceLibrary();
  const id = `lib-${Date.now().toString(36)}`;
  const preset = captureRoomAmbienceFromBlueprint(blueprint, id, trimmed);
  return addAmbienceToLibrary({ id, name: trimmed, preset });
}

export function removeAmbienceFromLibrary(ambienceId: string): SavedRoomAmbience[] {
  const next = loadAmbienceLibrary().filter((item) => item.id !== ambienceId);
  persistAmbienceLibrary(next);
  return next;
}

export function mergeAmbienceLibraryImport(raw: string): SavedRoomAmbience[] {
  const imported = parseAmbienceImport(raw);
  if (!imported.length) return loadAmbienceLibrary();
  const merged = new Map(loadAmbienceLibrary().map((item) => [item.id, item]));
  for (const item of imported) merged.set(item.id, item);
  const next = Array.from(merged.values()).slice(0, MAX_LIBRARY_SIZE);
  persistAmbienceLibrary(next);
  return next;
}

export function downloadAmbienceExport(
  ambiences: SavedRoomAmbience[],
  filename = 'eventmaster-ambiances.json',
) {
  const blob = new Blob([exportAmbiencesPayload(ambiences)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
