export type RoomPlanComposeDraft = {
  view?: string;
  canvas?: { widthM?: number; heightM?: number };
  outline?: unknown;
  appearance?: unknown;
  items?: unknown[];
  walls?: unknown[];
  confidence?: number;
  warnings?: string[];
};

const HTTP_IMAGE_RE = /^https?:\/\//i;

export function persistableRoomPlanImageUrl(url?: string | null): string | null {
  const value = url?.trim() || '';
  if (!value || value.startsWith('data:') || !HTTP_IMAGE_RE.test(value)) return null;
  return value.slice(0, 2000);
}

export function serializeRoomPlanComposeRun(run: {
  id: string;
  userId: string | null;
  deviceId: string | null;
  source: string;
  prompt: string | null;
  imageUrl: string | null;
  roomType: string | null;
  widthM: number | null;
  heightM: number | null;
  draft: unknown;
  createdAt: Date;
}) {
  const draft = (run.draft && typeof run.draft === 'object' ? run.draft : { items: [] }) as RoomPlanComposeDraft;
  const items = Array.isArray(draft.items) ? draft.items : [];
  return {
    id: run.id,
    userId: run.userId,
    deviceId: run.deviceId,
    source: run.source,
    prompt: run.prompt,
    imageUrl: persistableRoomPlanImageUrl(run.imageUrl),
    roomType: run.roomType,
    widthM: run.widthM,
    heightM: run.heightM,
    itemCount: items.length,
    draft,
    createdAt: run.createdAt.toISOString(),
  };
}
