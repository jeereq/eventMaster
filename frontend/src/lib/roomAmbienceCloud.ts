'use client';

import { api } from '@/lib/api';
import { parseAmbienceImport, type SavedRoomAmbience } from '@/lib/roomLayoutUtils';
import { loadAmbienceLibrary, replaceAmbienceLibrary } from '@/lib/roomAmbienceLibrary';

function fromCloudRow(row: { id: string; name: string; preset: unknown }): SavedRoomAmbience | null {
  const items = parseAmbienceImport(JSON.stringify({ id: row.id, name: row.name, preset: row.preset }));
  return items[0] ?? null;
}

export function isCloudAmbienceId(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

export async function fetchCloudAmbiences(): Promise<SavedRoomAmbience[]> {
  const data = await api.get('/rooms/ambiences');
  const rows = Array.isArray(data?.ambiences) ? data.ambiences : [];
  return rows
    .map((row: { id: string; name: string; preset: unknown }) => fromCloudRow(row))
    .filter((item: SavedRoomAmbience | null): item is SavedRoomAmbience => item !== null);
}

export async function pushCloudAmbience(item: SavedRoomAmbience): Promise<SavedRoomAmbience | null> {
  const data = await api.post('/rooms/ambiences', {
    name: item.name,
    preset: item.preset,
  });
  if (!data?.ambience) return null;
  return fromCloudRow(data.ambience);
}

export async function deleteCloudAmbience(id: string): Promise<void> {
  await api.delete(`/rooms/ambiences/${id}`);
}

export async function syncAmbienceLibraryWithCloud(): Promise<SavedRoomAmbience[]> {
  const local = loadAmbienceLibrary();
  const data = await api.post('/rooms/ambiences/sync', { ambiences: local });
  const cloud = (Array.isArray(data?.ambiences) ? data.ambiences : [])
    .map((row: { id: string; name: string; preset: unknown }) => fromCloudRow(row))
    .filter((item: SavedRoomAmbience | null): item is SavedRoomAmbience => item !== null);
  return replaceAmbienceLibrary(cloud);
}
