import type { LayoutParams, RoomLayoutBlueprint, RoomType } from '@/lib/roomLayoutUtils';
import { sanitizeLayoutActions } from '@/lib/layoutActionLog';

export const ROOM_LAYOUT_DRAFT_VERSION = 1 as const;
export const WIZARD_DRAFT_KEY = 'new';

const DB_NAME = 'eventmaster-room-drafts';
const DB_VERSION = 1;
const STORE = 'drafts';
const LOCAL_PREFIX = 'em-room-layout-draft:';

export type RoomLayoutDraftWizardTab = 'structure' | 'capacite' | 'ambiance' | 'editeur';

export interface RoomLayoutDraftWizard {
  name: string;
  description: string;
  floor: string;
  location: string;
  roomType: RoomType;
  layoutParams: LayoutParams;
  wizardStep: number;
  wizardPlanTab: RoomLayoutDraftWizardTab;
  farthestStep: number;
}

export interface RoomLayoutDraftMeta {
  name: string;
  floor: string;
  location: string;
  description: string;
}

export interface RoomLayoutDraft {
  id: string;
  version: typeof ROOM_LAYOUT_DRAFT_VERSION;
  tenantId: string;
  roomKey: string;
  savedAt: string;
  blueprint: RoomLayoutBlueprint;
  wizard?: RoomLayoutDraftWizard;
  editMeta?: RoomLayoutDraftMeta;
  pendingServerSync?: boolean;
}

function draftId(tenantId: string, roomKey: string): string {
  return `${tenantId}:${roomKey}`;
}

function localKey(id: string): string {
  return `${LOCAL_PREFIX}${id}`;
}

function isBlueprint(value: unknown): value is RoomLayoutBlueprint {
  if (!value || typeof value !== 'object') return false;
  const bp = value as Partial<RoomLayoutBlueprint>;
  return bp.version === 1 && typeof bp.roomType === 'string' && Boolean(bp.canvas);
}

function normalizeDraft(value: unknown): RoomLayoutDraft | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Partial<RoomLayoutDraft>;
  if (raw.version !== ROOM_LAYOUT_DRAFT_VERSION) return null;
  if (typeof raw.id !== 'string' || typeof raw.tenantId !== 'string' || typeof raw.roomKey !== 'string') return null;
  if (typeof raw.savedAt !== 'string' || !isBlueprint(raw.blueprint)) return null;
  return {
    id: raw.id,
    version: ROOM_LAYOUT_DRAFT_VERSION,
    tenantId: raw.tenantId,
    roomKey: raw.roomKey,
    savedAt: raw.savedAt,
    blueprint: {
      ...raw.blueprint,
      metadata: {
        ...raw.blueprint.metadata,
        layoutActions: sanitizeLayoutActions(raw.blueprint.metadata?.layoutActions),
      },
    },
    wizard: raw.wizard,
    editMeta: raw.editMeta,
    pendingServerSync: Boolean(raw.pendingServerSync),
  };
}

function openDraftDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('IndexedDB indisponible'));
  });
}

function writeLocalFallback(draft: RoomLayoutDraft) {
  try {
    localStorage.setItem(localKey(draft.id), JSON.stringify(draft));
  } catch {
    /* quota — le brouillon reste en IndexedDB si possible */
  }
}

function readLocalFallback(id: string): RoomLayoutDraft | null {
  try {
    const raw = localStorage.getItem(localKey(id));
    if (!raw) return null;
    return normalizeDraft(JSON.parse(raw));
  } catch {
    return null;
  }
}

function clearLocalFallback(id: string) {
  try {
    localStorage.removeItem(localKey(id));
  } catch {
    /* ignore */
  }
}

export async function readRoomLayoutDraft(
  tenantId: string | undefined,
  roomKey: string,
): Promise<RoomLayoutDraft | null> {
  if (typeof window === 'undefined' || !tenantId) return null;
  const id = draftId(tenantId, roomKey);
  try {
    const db = await openDraftDb();
    const stored = await new Promise<unknown>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(id);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => reject(req.error);
    });
    db.close();
    const fromDb = normalizeDraft(stored);
    if (fromDb) return fromDb;
  } catch {
    /* fallback localStorage */
  }
  return readLocalFallback(id);
}

export async function writeRoomLayoutDraft(input: {
  tenantId: string;
  roomKey: string;
  blueprint: RoomLayoutBlueprint;
  wizard?: RoomLayoutDraftWizard;
  editMeta?: RoomLayoutDraftMeta;
  pendingServerSync?: boolean;
}): Promise<RoomLayoutDraft> {
  const draft: RoomLayoutDraft = {
    id: draftId(input.tenantId, input.roomKey),
    version: ROOM_LAYOUT_DRAFT_VERSION,
    tenantId: input.tenantId,
    roomKey: input.roomKey,
    savedAt: new Date().toISOString(),
    blueprint: input.blueprint,
    wizard: input.wizard,
    editMeta: input.editMeta,
    pendingServerSync: input.pendingServerSync,
  };
  if (typeof window === 'undefined') return draft;
  try {
    const db = await openDraftDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.objectStore(STORE).put(draft);
    });
    db.close();
  } catch {
    /* IndexedDB refusé — tenter localStorage */
  }
  writeLocalFallback(draft);
  return draft;
}

export async function clearRoomLayoutDraft(
  tenantId: string | undefined,
  roomKey: string,
): Promise<void> {
  if (typeof window === 'undefined' || !tenantId) return;
  const id = draftId(tenantId, roomKey);
  try {
    const db = await openDraftDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.objectStore(STORE).delete(id);
    });
    db.close();
  } catch {
    /* ignore */
  }
  clearLocalFallback(id);
}
