'use client';

import { api } from '@/lib/api';
import { parseAmbienceImport, type SavedRoomAmbience, type SharedRoomAmbience } from '@/lib/roomLayoutUtils';

function fromOrgRow(row: {
  id: string;
  name: string;
  preset: unknown;
  scope?: string;
  authorName?: string;
  description?: string;
}): SharedRoomAmbience | null {
  const items = parseAmbienceImport(JSON.stringify({ id: row.id, name: row.name, preset: row.preset }));
  const base = items[0];
  if (!base) return null;
  return {
    ...base,
    scope: 'org',
    authorName: row.authorName,
    description: row.description,
  };
}

export async function fetchOrgAmbiences(): Promise<SharedRoomAmbience[]> {
  const data = await api.get('/rooms/ambiences/org');
  const rows = Array.isArray(data?.ambiences) ? data.ambiences : [];
  return rows
    .map((row: {
      id: string;
      name: string;
      preset: unknown;
      authorName?: string;
      description?: string;
    }) => fromOrgRow(row))
    .filter((item: SharedRoomAmbience | null): item is SharedRoomAmbience => item !== null);
}

export async function publishOrgAmbience(
  item: SavedRoomAmbience,
  description?: string,
): Promise<SharedRoomAmbience | null> {
  const data = await api.post('/rooms/ambiences/org', {
    name: item.name,
    description,
    preset: item.preset,
  });
  if (!data?.ambience) return null;
  return fromOrgRow(data.ambience);
}

export async function publishBlueprintAmbienceToOrg(
  name: string,
  preset: SavedRoomAmbience['preset'],
  description?: string,
): Promise<SharedRoomAmbience | null> {
  return publishOrgAmbience({ id: 'draft', name, preset }, description);
}

export async function deleteOrgAmbience(id: string): Promise<void> {
  await api.delete(`/rooms/ambiences/org/${id}`);
}
