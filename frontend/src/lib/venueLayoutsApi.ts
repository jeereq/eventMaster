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

/** Identifiant réservé à la disposition principale (le plan de la salle). */
export const MAIN_LAYOUT_ID = 'main';
/** Nom par défaut de la disposition principale tant qu'elle n'a pas été renommée. */
export const MAIN_LAYOUT_NAME = 'Disposition principale';

/** Disposition principale de la salle : c'est le plan de la salle lui-même. */
export interface MainLayoutSummary {
  id: typeof MAIN_LAYOUT_ID;
  name: string;
  capacityMax: number | null;
  areaM2: number | null;
  hasBlueprint: boolean;
}

export interface RoomLayoutList {
  main: MainLayoutSummary;
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

export interface MakeMainResult {
  /** Salle mise à jour (nouveau plan principal, nouvelle version). */
  room: { id: string; layoutBlueprint: RoomLayoutBlueprint | null; layoutName: string | null; updatedAt: string; capacity: number | null };
  main: MainLayoutSummary;
  /** La disposition choisie, qui contient désormais l'ancien plan principal (`null` si la salle n'en avait pas). */
  replaced: RoomLayoutRecord | null;
}

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
  makeMain: (roomId: string, layoutId: string): Promise<MakeMainResult> =>
    api.post(`${base(roomId)}/${encodeURIComponent(layoutId)}/make-main`),
  renameMain: (roomId: string, name: string): Promise<MainLayoutSummary & { roomUpdatedAt: string }> =>
    api.patch(`${base(roomId)}/${MAIN_LAYOUT_ID}`, { name }),
  reorder: (roomId: string, ids: string[]): Promise<{ ids: string[] }> =>
    api.put(`${base(roomId)}/order`, { ids }),
};
