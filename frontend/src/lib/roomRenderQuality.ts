import type { RoomType } from '@/lib/roomLayoutUtils';

/** Qualité de rendu WebGL. */
export type RenderQuality = 'draft' | 'standard' | 'showcase';

/** Ambiance lumineuse scénique. */
export type LightingPreset = 'auto' | 'banquet' | 'conference' | 'tent' | 'neutral';

export const renderQualityLabels: Record<RenderQuality, string> = {
  draft: 'Brouillon',
  standard: 'Standard',
  showcase: 'Showcase',
};

export const lightingPresetLabels: Record<LightingPreset, string> = {
  auto: 'Auto (type de salle)',
  banquet: 'Banquet chaud',
  conference: 'Conférence neutre',
  tent: 'Tente / extérieur',
  neutral: 'Studio neutre',
};

export type RenderQualitySettings = {
  quality: RenderQuality;
  dpr: [number, number];
  shadowMapSize: number;
  contactShadows: boolean;
  contactShadowsOpacity: number;
  contactShadowsBlur: number;
  contactShadowsResolution: number;
  exposure: number;
  softShadows: boolean;
  showHints: boolean;
  fov: number;
};

export type ScenicLightSettings = {
  preset: Exclude<LightingPreset, 'auto'>;
  ambient: number;
  keyIntensity: number;
  keyColor: string;
  fillIntensity: number;
  fillColor: string;
  hemiSky: string;
  hemiGround: string;
  hemiIntensity: number;
  spotIntensity: number;
  spotColor: string;
  warmPoint: number;
  coolPoint: number;
  background: string;
};

const QUALITY: Record<RenderQuality, RenderQualitySettings> = {
  draft: {
    quality: 'draft',
    dpr: [1, 1.25],
    shadowMapSize: 1024,
    contactShadows: false,
    contactShadowsOpacity: 0.3,
    contactShadowsBlur: 2,
    contactShadowsResolution: 512,
    exposure: 1.05,
    softShadows: false,
    showHints: true,
    fov: 48,
  },
  standard: {
    quality: 'standard',
    dpr: [1, 1.75],
    shadowMapSize: 2048,
    contactShadows: true,
    contactShadowsOpacity: 0.45,
    contactShadowsBlur: 2.5,
    contactShadowsResolution: 768,
    exposure: 1.12,
    softShadows: true,
    showHints: true,
    fov: 45,
  },
  showcase: {
    quality: 'showcase',
    dpr: [1, 2],
    shadowMapSize: 2048,
    contactShadows: true,
    contactShadowsOpacity: 0.55,
    contactShadowsBlur: 2.8,
    contactShadowsResolution: 1024,
    exposure: 1.18,
    softShadows: true,
    showHints: false,
    fov: 42,
  },
};

const LIGHTING: Record<Exclude<LightingPreset, 'auto'>, ScenicLightSettings> = {
  banquet: {
    preset: 'banquet',
    ambient: 0.32,
    keyIntensity: 1.4,
    keyColor: '#fff7ed',
    fillIntensity: 0.28,
    fillColor: '#bfdbfe',
    hemiSky: '#fef3c7',
    hemiGround: '#57534e',
    hemiIntensity: 0.48,
    spotIntensity: 0.45,
    spotColor: '#fffbeb',
    warmPoint: 0.32,
    coolPoint: 0.15,
    background: '#1a1410',
  },
  conference: {
    preset: 'conference',
    ambient: 0.42,
    keyIntensity: 1.15,
    keyColor: '#f8fafc',
    fillIntensity: 0.4,
    fillColor: '#e2e8f0',
    hemiSky: '#e2e8f0',
    hemiGround: '#64748b',
    hemiIntensity: 0.4,
    spotIntensity: 0.25,
    spotColor: '#f1f5f9',
    warmPoint: 0.12,
    coolPoint: 0.28,
    background: '#0f172a',
  },
  tent: {
    preset: 'tent',
    ambient: 0.5,
    keyIntensity: 1.55,
    keyColor: '#fffbeb',
    fillIntensity: 0.45,
    fillColor: '#bae6fd',
    hemiSky: '#bae6fd',
    hemiGround: '#854d0e',
    hemiIntensity: 0.55,
    spotIntensity: 0.2,
    spotColor: '#fef9c3',
    warmPoint: 0.4,
    coolPoint: 0.35,
    background: '#0c4a6e',
  },
  neutral: {
    preset: 'neutral',
    ambient: 0.4,
    keyIntensity: 1.2,
    keyColor: '#ffffff',
    fillIntensity: 0.35,
    fillColor: '#cbd5e1',
    hemiSky: '#f8fafc',
    hemiGround: '#78716c',
    hemiIntensity: 0.42,
    spotIntensity: 0.3,
    spotColor: '#ffffff',
    warmPoint: 0.18,
    coolPoint: 0.18,
    background: '#171717',
  },
};

export function resolveRenderQuality(
  quality?: RenderQuality | null,
  opts?: { preview?: boolean },
): RenderQualitySettings {
  if (quality && QUALITY[quality]) return QUALITY[quality];
  return opts?.preview ? QUALITY.showcase : QUALITY.standard;
}

export function lightingFromRoomType(roomType: RoomType): Exclude<LightingPreset, 'auto'> {
  if (roomType === 'BANQUET' || roomType === 'SIMPLE') return 'banquet';
  if (roomType === 'CONFERENCE' || roomType === 'AMPHITHEATER') return 'conference';
  if (roomType === 'TENT') return 'tent';
  return 'neutral';
}

export function resolveLightingPreset(
  preset: LightingPreset | undefined | null,
  roomType: RoomType,
): ScenicLightSettings {
  const key = !preset || preset === 'auto' ? lightingFromRoomType(roomType) : preset;
  return LIGHTING[key];
}

/** Qualité d’export PNG (multiplicateur de résolution canvas). */
export function exportPixelRatio(quality: RenderQuality): number {
  if (quality === 'showcase') return 2;
  if (quality === 'draft') return 1;
  return 1.5;
}

export function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
}
