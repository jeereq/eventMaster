import { api } from '@/lib/api';
import type { RoomLayoutBlueprint } from '@/lib/roomLayoutUtils';

/** Disposition enregistrée, côté propriétaire (sans le plan). */
export interface RoomLayoutRecord {
  id: string;
  name: string;
  sortOrder: number;
  capacityMax: number | null;
  areaM2: number | null;
  thumbnailUrl: string | null;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RoomLayoutList {
  layouts: RoomLayoutRecord[];
  /** Nombre maximal de dispositions enregistrables par salle avec le forfait. */
  maxLayouts: number;
}

export type RoomLayoutPatch = Partial<{
  name: string;
  isPublic: boolean;
  thumbnailUrl: string | null;
  capacityMax: number;
  blueprint: RoomLayoutBlueprint;
}>;

const base = (roomId: string) => `/rooms/${encodeURIComponent(roomId)}/layouts`;

export const venueLayoutsApi = {
  list: (roomId: string): Promise<RoomLayoutList> => api.get(base(roomId)),
  get: (roomId: string, layoutId: string): Promise<RoomLayoutRecord & { blueprint: RoomLayoutBlueprint }> =>
    api.get(`${base(roomId)}/${encodeURIComponent(layoutId)}`),
  create: (
    roomId: string,
    body: { name: string; blueprint: RoomLayoutBlueprint; isPublic?: boolean },
  ): Promise<RoomLayoutRecord> => api.post(base(roomId), body),
  update: (roomId: string, layoutId: string, patch: RoomLayoutPatch): Promise<RoomLayoutRecord> =>
    api.patch(`${base(roomId)}/${encodeURIComponent(layoutId)}`, patch),
  remove: (roomId: string, layoutId: string): Promise<{ message: string }> =>
    api.delete(`${base(roomId)}/${encodeURIComponent(layoutId)}`),
  duplicate: (roomId: string, layoutId: string): Promise<RoomLayoutRecord> =>
    api.post(`${base(roomId)}/${encodeURIComponent(layoutId)}/duplicate`),
  reorder: (roomId: string, ids: string[]): Promise<{ ids: string[] }> =>
    api.put(`${base(roomId)}/order`, { ids }),
};
