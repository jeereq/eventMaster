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
  /** Détail des chaises de rangées. */
  rowChairLod: 'instanced' | 'simple' | 'full';
  /** Ombres portées sur chaises de rangée. */
  rowChairShadows: boolean;
  maxChandeliers: number;
  maxUplights: number;
  /** Désactive les pointLights des lustres (perf). */
  chandelierPointLights: boolean;
  /** HDRI / Environment drei. */
  environment: boolean;
  environmentIntensity: number;
  /** Brouillard atmosphérique. */
  fog: boolean;
  fogNear: number;
  fogFar: number;
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
    exposure: 1.08,
    softShadows: false,
    showHints: true,
    fov: 48,
    rowChairLod: 'instanced',
    rowChairShadows: false,
    maxChandeliers: 1,
    maxUplights: 6,
    chandelierPointLights: false,
    environment: false,
    environmentIntensity: 0.2,
    fog: false,
    fogNear: 20,
    fogFar: 60,
  },
  standard: {
    quality: 'standard',
    dpr: [1, 1.75],
    shadowMapSize: 2048,
    contactShadows: true,
    contactShadowsOpacity: 0.5,
    contactShadowsBlur: 2.6,
    contactShadowsResolution: 896,
    exposure: 1.16,
    softShadows: true,
    showHints: true,
    fov: 44,
    rowChairLod: 'simple',
    rowChairShadows: false,
    maxChandeliers: 2,
    maxUplights: 10,
    chandelierPointLights: false,
    environment: true,
    environmentIntensity: 0.28,
    fog: true,
    fogNear: 22,
    fogFar: 70,
  },
  showcase: {
    quality: 'showcase',
    dpr: [1, 2],
    shadowMapSize: 4096,
    contactShadows: true,
    contactShadowsOpacity: 0.62,
    contactShadowsBlur: 3.0,
    contactShadowsResolution: 1280,
    exposure: 1.22,
    softShadows: true,
    showHints: false,
    fov: 40,
    rowChairLod: 'full',
    rowChairShadows: true,
    maxChandeliers: 4,
    maxUplights: 14,
    chandelierPointLights: true,
    environment: true,
    environmentIntensity: 0.42,
    fog: true,
    fogNear: 18,
    fogFar: 55,
  },
};

const LIGHTING: Record<Exclude<LightingPreset, 'auto'>, ScenicLightSettings> = {
  banquet: {
    preset: 'banquet',
    ambient: 0.28,
    keyIntensity: 1.55,
    keyColor: '#fff7ed',
    fillIntensity: 0.32,
    fillColor: '#bfdbfe',
    hemiSky: '#fef3c7',
    hemiGround: '#57534e',
    hemiIntensity: 0.52,
    spotIntensity: 0.55,
    spotColor: '#fffbeb',
    warmPoint: 0.38,
    coolPoint: 0.12,
    background: '#14110e',
  },
  conference: {
    preset: 'conference',
    ambient: 0.38,
    keyIntensity: 1.25,
    keyColor: '#f8fafc',
    fillIntensity: 0.42,
    fillColor: '#e2e8f0',
    hemiSky: '#e2e8f0',
    hemiGround: '#64748b',
    hemiIntensity: 0.42,
    spotIntensity: 0.3,
    spotColor: '#f1f5f9',
    warmPoint: 0.14,
    coolPoint: 0.3,
    background: '#0c1220',
  },
  tent: {
    preset: 'tent',
    ambient: 0.48,
    keyIntensity: 1.65,
    keyColor: '#fffbeb',
    fillIntensity: 0.48,
    fillColor: '#bae6fd',
    hemiSky: '#bae6fd',
    hemiGround: '#854d0e',
    hemiIntensity: 0.58,
    spotIntensity: 0.25,
    spotColor: '#fef9c3',
    warmPoint: 0.42,
    coolPoint: 0.32,
    background: '#0a3a52',
  },
  neutral: {
    preset: 'neutral',
    ambient: 0.36,
    keyIntensity: 1.3,
    keyColor: '#ffffff',
    fillIntensity: 0.38,
    fillColor: '#cbd5e1',
    hemiSky: '#f8fafc',
    hemiGround: '#78716c',
    hemiIntensity: 0.45,
    spotIntensity: 0.35,
    spotColor: '#ffffff',
    warmPoint: 0.2,
    coolPoint: 0.2,
    background: '#121212',
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
