/**
 * Validation d’un élément de salle personnalisé (image / vidéo) avant stockage.
 * Miroir de `sanitizeCustomElement` côté frontend (lib/roomCustomElements.ts).
 */

export type RoomElementMode = 'cutout' | 'panel' | 'box' | 'cylinder' | 'video';

const MODES: RoomElementMode[] = ['cutout', 'panel', 'box', 'cylinder', 'video'];
const MAX_OUTLINE_VALUES = 480;

const num = (v: unknown, min: number, max: number, fallback: number) =>
  typeof v === 'number' && Number.isFinite(v) ? Math.max(min, Math.min(max, v)) : fallback;

/** Seules des URL https (médias envoyés via /uploads) sont acceptées. */
const isMediaUrl = (v: unknown): v is string =>
  typeof v === 'string' && v.length < 1000 && /^https:\/\//.test(v);

export function sanitizeRoomElementDefinition(raw: unknown): Record<string, unknown> & { name: string } | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  const mode = MODES.includes(r.mode as RoomElementMode) ? (r.mode as RoomElementMode) : null;
  if (!mode || !isMediaUrl(r.imageUrl)) return null;
  if (mode === 'video' && !isMediaUrl(r.videoUrl)) return null;
  const name = typeof r.name === 'string' && r.name.trim() ? r.name.trim().slice(0, 60) : 'Élément importé';
  const outline = Array.isArray(r.outline)
    && r.outline.length >= 6
    && r.outline.length % 2 === 0
    && r.outline.length <= MAX_OUTLINE_VALUES
    && r.outline.every((v) => typeof v === 'number' && Number.isFinite(v))
    ? (r.outline as number[]).map((v) => Math.round(Math.max(0, Math.min(1, v)) * 10000) / 10000)
    : undefined;
  return {
    name,
    mode,
    imageUrl: r.imageUrl,
    ...(mode === 'video' ? { videoUrl: r.videoUrl } : {}),
    ...(outline ? { outline } : {}),
    aspect: num(r.aspect, 0.05, 20, 1),
    widthM: num(r.widthM, 0.05, 40, 1),
    heightM: num(r.heightM, 0.05, 20, 1),
    depthM: num(r.depthM, 0.005, 20, 0.1),
    ...(typeof r.elevationM === 'number' ? { elevationM: num(r.elevationM, 0, 15, 0) } : {}),
    ...(typeof r.edgeColor === 'string' && /^#[0-9a-f]{6}$/i.test(r.edgeColor) ? { edgeColor: r.edgeColor } : {}),
  };
}
