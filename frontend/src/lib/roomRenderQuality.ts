import type { RoomType } from '@/lib/roomLayoutUtils';

/** Qualité de rendu WebGL. */
export type RenderQuality = 'draft' | 'standard' | 'showcase';

/** Ambiance lumineuse scénique. */
export type LightingPreset =
  | 'auto'
  | 'banquet'
  | 'conference'
  | 'tent'
  | 'neutral'
  | 'day'
  | 'dusk'
  | 'night';

export const renderQualityLabels: Record<RenderQuality, string> = {
  draft: 'Brouillon',
  standard: 'Standard',
  showcase: 'Showcase',
};

export const lightingPresetLabels: Record<LightingPreset, string> = {
  auto: 'Auto (type de salle)',
  day: 'Soleil (jour)',
  dusk: 'Crépuscule',
  night: 'Nuit',
  banquet: 'Banquet chaud',
  conference: 'Conférence neutre',
  tent: 'Tente / extérieur',
  neutral: 'Studio neutre',
};

/** Groupes pour le sélecteur UI. */
export const lightingPresetGroups: { label: string; presets: LightingPreset[] }[] = [
  { label: 'Moment', presets: ['auto', 'day', 'dusk', 'night'] },
  { label: 'Scène', presets: ['banquet', 'conference', 'tent', 'neutral'] },
];


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
  /** Position soleil / lune (monde). */
  sunPosition: [number, number, number];
  /** Ciel / extérieur visible. */
  showSky: boolean;
  skyTop: string;
  skyHorizon: string;
  /** Intensité intérieure (lustres / uplights relative). */
  interiorBoost: number;
  /** Exposure ACES (réalité : jour plus haut, nuit plus bas). */
  exposure: number;
  /** Intensité HDRI Environment. */
  environmentIntensity: number;
  /** Preset drei Environment. */
  environmentPreset: 'apartment' | 'city' | 'dawn' | 'night' | 'warehouse' | 'sunset';
  /** Rebond sol / bounce light. */
  bounceIntensity: number;
  bounceColor: string;
  /** Paramètres ciel physique (drei Sky). */
  skyTurbidity: number;
  skyRayleigh: number;
  skyMie: number;
  /** Afficher étoiles (nuit). */
  showStars: boolean;
  /** Couleur brouillard atmosphérique. */
  fogColor: string;
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
  // Midi clair : soleil haut, ombres nettes, ciel bleu, peu d’ambiance flat
  day: {
    preset: 'day',
    ambient: 0.22,
    keyIntensity: 2.85,
    keyColor: '#fff8e7',
    fillIntensity: 0.42,
    fillColor: '#a5d8ff',
    hemiSky: '#87ceeb',
    hemiGround: '#c4b5a0',
    hemiIntensity: 0.55,
    spotIntensity: 0.08,
    spotColor: '#ffffff',
    warmPoint: 0.06,
    coolPoint: 0.28,
    background: '#9ec9e8',
    sunPosition: [14, 32, 10],
    showSky: true,
    skyTop: '#3b82f6',
    skyHorizon: '#dbeafe',
    interiorBoost: 0.28,
    exposure: 1.05,
    environmentIntensity: 0.55,
    environmentPreset: 'city',
    bounceIntensity: 0.35,
    bounceColor: '#f5e6d3',
    skyTurbidity: 2.2,
    skyRayleigh: 1.15,
    skyMie: 0.004,
    showStars: false,
    fogColor: '#c5d9eb',
  },
  // Golden hour : soleil bas, teintes chaudes, ombres longues, ciel orangé → violet
  dusk: {
    preset: 'dusk',
    ambient: 0.16,
    keyIntensity: 1.75,
    keyColor: '#ff9f43',
    fillIntensity: 0.38,
    fillColor: '#7c6cf0',
    hemiSky: '#f97316',
    hemiGround: '#4a3728',
    hemiIntensity: 0.48,
    spotIntensity: 0.42,
    spotColor: '#ffe4c4',
    warmPoint: 0.55,
    coolPoint: 0.18,
    background: '#2a1510',
    sunPosition: [28, 4.5, -6],
    showSky: true,
    skyTop: '#4c1d95',
    skyHorizon: '#fb923c',
    interiorBoost: 0.95,
    exposure: 0.92,
    environmentIntensity: 0.38,
    environmentPreset: 'sunset',
    bounceIntensity: 0.45,
    bounceColor: '#fdba74',
    skyTurbidity: 9,
    skyRayleigh: 2.8,
    skyMie: 0.012,
    showStars: false,
    fogColor: '#5c2e1a',
  },
  // Nuit : clair de lune froid + lumières intérieures chaudes dominantes
  night: {
    preset: 'night',
    ambient: 0.06,
    keyIntensity: 0.55,
    keyColor: '#c7d7fe',
    fillIntensity: 0.12,
    fillColor: '#1e293b',
    hemiSky: '#0b1224',
    hemiGround: '#0f0e0d',
    hemiIntensity: 0.18,
    spotIntensity: 0.95,
    spotColor: '#ffefc2',
    warmPoint: 0.85,
    coolPoint: 0.22,
    background: '#030712',
    sunPosition: [-16, 26, 8],
    showSky: true,
    skyTop: '#020617',
    skyHorizon: '#111827',
    interiorBoost: 1.45,
    exposure: 0.78,
    environmentIntensity: 0.12,
    environmentPreset: 'night',
    bounceIntensity: 0.12,
    bounceColor: '#334155',
    skyTurbidity: 1,
    skyRayleigh: 0.4,
    skyMie: 0.001,
    showStars: true,
    fogColor: '#060a14',
  },
  // Salle de réception : spots chauds, ambiance chandelier
  banquet: {
    preset: 'banquet',
    ambient: 0.18,
    keyIntensity: 1.45,
    keyColor: '#fff4e0',
    fillIntensity: 0.28,
    fillColor: '#bfdbfe',
    hemiSky: '#fef3c7',
    hemiGround: '#44403c',
    hemiIntensity: 0.4,
    spotIntensity: 0.72,
    spotColor: '#fff7ed',
    warmPoint: 0.5,
    coolPoint: 0.1,
    background: '#120f0c',
    sunPosition: [10, 18, 6],
    showSky: false,
    skyTop: '#1a1410',
    skyHorizon: '#292524',
    interiorBoost: 1.15,
    exposure: 1.0,
    environmentIntensity: 0.32,
    environmentPreset: 'apartment',
    bounceIntensity: 0.28,
    bounceColor: '#d6b896',
    skyTurbidity: 2,
    skyRayleigh: 1,
    skyMie: 0.005,
    showStars: false,
    fogColor: '#1a1410',
  },
  conference: {
    preset: 'conference',
    ambient: 0.28,
    keyIntensity: 1.35,
    keyColor: '#f8fafc',
    fillIntensity: 0.4,
    fillColor: '#e2e8f0',
    hemiSky: '#e2e8f0',
    hemiGround: '#64748b',
    hemiIntensity: 0.38,
    spotIntensity: 0.38,
    spotColor: '#f1f5f9',
    warmPoint: 0.12,
    coolPoint: 0.28,
    background: '#0b1220',
    sunPosition: [8, 20, 5],
    showSky: false,
    skyTop: '#0f172a',
    skyHorizon: '#1e293b',
    interiorBoost: 0.95,
    exposure: 1.08,
    environmentIntensity: 0.4,
    environmentPreset: 'warehouse',
    bounceIntensity: 0.22,
    bounceColor: '#cbd5e1',
    skyTurbidity: 2,
    skyRayleigh: 1,
    skyMie: 0.005,
    showStars: false,
    fogColor: '#0c1220',
  },
  tent: {
    preset: 'tent',
    ambient: 0.26,
    keyIntensity: 2.2,
    keyColor: '#fff8e7',
    fillIntensity: 0.45,
    fillColor: '#bae6fd',
    hemiSky: '#7dd3fc',
    hemiGround: '#92700c',
    hemiIntensity: 0.52,
    spotIntensity: 0.22,
    spotColor: '#fef9c3',
    warmPoint: 0.35,
    coolPoint: 0.3,
    background: '#0a3a52',
    sunPosition: [18, 24, 12],
    showSky: true,
    skyTop: '#38bdf8',
    skyHorizon: '#fef3c7',
    interiorBoost: 0.65,
    exposure: 1.08,
    environmentIntensity: 0.5,
    environmentPreset: 'dawn',
    bounceIntensity: 0.4,
    bounceColor: '#fde68a',
    skyTurbidity: 3.5,
    skyRayleigh: 1.4,
    skyMie: 0.006,
    showStars: false,
    fogColor: '#6ba3c4',
  },
  neutral: {
    preset: 'neutral',
    ambient: 0.28,
    keyIntensity: 1.4,
    keyColor: '#ffffff',
    fillIntensity: 0.36,
    fillColor: '#cbd5e1',
    hemiSky: '#f8fafc',
    hemiGround: '#78716c',
    hemiIntensity: 0.4,
    spotIntensity: 0.32,
    spotColor: '#ffffff',
    warmPoint: 0.18,
    coolPoint: 0.18,
    background: '#121212',
    sunPosition: [8, 20, 8],
    showSky: false,
    skyTop: '#171717',
    skyHorizon: '#27272a',
    interiorBoost: 1,
    exposure: 1.05,
    environmentIntensity: 0.35,
    environmentPreset: 'apartment',
    bounceIntensity: 0.2,
    bounceColor: '#a8a29e',
    skyTurbidity: 2,
    skyRayleigh: 1,
    skyMie: 0.005,
    showStars: false,
    fogColor: '#121212',
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
  return LIGHTING[key] ?? LIGHTING.neutral;
}

/** Alias pour le programme événement (day/dusk/night…). */
export function resolveLightingFromPresetKey(
  key: Exclude<LightingPreset, 'auto'> | undefined | null,
  roomType: RoomType,
): ScenicLightSettings {
  if (key && LIGHTING[key]) return LIGHTING[key];
  return resolveLightingPreset('auto', roomType);
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
