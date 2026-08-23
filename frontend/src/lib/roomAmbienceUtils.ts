import {
  captureRoomAmbienceFromBlueprint,
  chairStyleLabels,
  chairTypeLabels,
  parseAmbienceImport,
  seatMaterialLabels,
  tableSurfaceLabels,
  wallTextureLabels,
  type AmbienceApplyScope,
  type RoomAmbiencePreset,
  type RoomLayoutBlueprint,
  type SavedRoomAmbience,
} from '@/lib/roomLayoutUtils';
import { chandelierTypeLabels } from '@/lib/roomCeilingUtils';
import { floorTypeLabels } from '@/lib/roomFloorUtils';
import { lightingPresetLabels } from '@/lib/roomRenderQuality';
import { getRoomTheme } from '@/lib/roomThemeUtils';

const SCOPE_LABELS: Record<keyof AmbienceApplyScope, string> = {
  walls: 'Murs',
  floor: 'Sol',
  theme: 'Thème',
  furniture: 'Mobilier',
  lighting: 'Éclairage',
};

export function describeAmbienceChanges(
  blueprint: RoomLayoutBlueprint,
  preset: RoomAmbiencePreset,
  scope: AmbienceApplyScope,
): string[] {
  const current = captureRoomAmbienceFromBlueprint(blueprint, preset.id, preset.label);
  const lines: string[] = [];

  if (scope.walls && current.wallTexture !== preset.wallTexture) {
    lines.push(`Murs : ${wallTextureLabels[current.wallTexture]} → ${wallTextureLabels[preset.wallTexture]}`);
  }
  if (scope.walls && current.wallPaintColor !== (preset.wallPaintColor ?? preset.wallColor)) {
    lines.push('Peinture murale mise à jour');
  }
  if (scope.floor && current.floorType !== preset.floorType) {
    const fromLabel = floorTypeLabels[current.floorType] ?? current.floorType;
    const toLabel = floorTypeLabels[preset.floorType] ?? preset.floorType;
    lines.push(`Sol : ${fromLabel} → ${toLabel}`);
  }
  if (scope.theme && current.roomThemeId !== preset.roomThemeId && preset.roomThemeId) {
    const themeLabel = getRoomTheme(preset.roomThemeId, blueprint).name;
    lines.push(`Thème : ${themeLabel}`);
  }
  if (scope.furniture && current.chairType !== preset.chairType) {
    lines.push(`Chaises : ${chairTypeLabels[current.chairType]} → ${chairTypeLabels[preset.chairType]}`);
  }
  if (scope.furniture && preset.chairStyle && current.chairStyle !== preset.chairStyle) {
    lines.push(`Style chaise : ${chairStyleLabels[preset.chairStyle]}`);
  }
  if (scope.furniture && preset.seatMaterial && current.seatMaterial !== preset.seatMaterial) {
    lines.push(`Assise : ${seatMaterialLabels[preset.seatMaterial]}`);
  }
  if (scope.furniture && preset.tableSurface && current.tableSurface !== preset.tableSurface) {
    lines.push(`Plateaux : ${tableSurfaceLabels[preset.tableSurface]}`);
  }
  if (scope.lighting && preset.lightingPreset && current.lightingPreset !== preset.lightingPreset) {
    lines.push(`Éclairage : ${lightingPresetLabels[preset.lightingPreset]}`);
  }
  if (
    scope.lighting
    && preset.showChandeliers
    && preset.chandelierType
    && (current.chandelierType !== preset.chandelierType || current.showChandeliers !== preset.showChandeliers)
  ) {
    lines.push(`Lustre : ${chandelierTypeLabels[preset.chandelierType]}`);
  }

  const activeScopes = (Object.keys(scope) as (keyof AmbienceApplyScope)[])
    .filter((key) => scope[key])
    .map((key) => SCOPE_LABELS[key]);
  if (!lines.length && activeScopes.length) {
    lines.push(`Aucun changement visible (${activeScopes.join(', ')})`);
  }
  return lines;
}

export function encodeAmbienceShareToken(item: SavedRoomAmbience): string {
  const payload = JSON.stringify({ v: 1, item });
  return btoa(unescape(encodeURIComponent(payload)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export function decodeAmbienceShareToken(token: string): SavedRoomAmbience | null {
  try {
    const padded = token.replace(/-/g, '+').replace(/_/g, '/');
    const pad = padded.length % 4 === 0 ? padded : `${padded}${'='.repeat(4 - (padded.length % 4))}`;
    const json = decodeURIComponent(escape(atob(pad)));
    const data = JSON.parse(json) as { item?: unknown };
    const items = parseAmbienceImport(JSON.stringify(data.item ?? data));
    return items[0] ?? null;
  } catch {
    return null;
  }
}

export function buildAmbienceShareUrl(item: SavedRoomAmbience): string {
  if (typeof window === 'undefined') return '';
  const params = new URLSearchParams(window.location.search);
  params.set('ambience', encodeAmbienceShareToken(item));
  return `${window.location.origin}${window.location.pathname}?${params.toString()}`;
}

export async function copyAmbienceShareLink(item: SavedRoomAmbience): Promise<boolean> {
  const url = buildAmbienceShareUrl(item);
  if (!url) return false;
  try {
    await navigator.clipboard.writeText(url);
    return true;
  } catch {
    return false;
  }
}
