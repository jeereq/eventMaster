import type React from 'react';
import type { FloorType } from '@/lib/roomThemeUtils';

export const floorTypeLabels: Record<FloorType, string> = {
  parquet: 'Parquet Hongrie',
  chevron: 'Parquet chevron',
  bois: 'Lames de chêne',
  boisPanel: 'Bois relief (panneaux)',
  boisHex: 'Bois hexagonal',
  boisAmber: 'Bois ambré veiné',
  boisRustique: 'Bois rustique',
  boisBlond: 'Chêne blond',
  boisPetale: 'Parquet pétale',
  boisCharcoal: 'Bois anthracite',
  boisMarqueterie: 'Marqueterie sombre',
  chevronGris: 'Chevron gris',
  chevronGreige: 'Chevron greige',
  marbreCalacatta: 'Marbre calacatta or',
  marbreOr: 'Marbre géométrique or',
  marbreBourgogne: 'Marbre bordeaux',
  epoxyMenthe: 'Résine menthe & or',
  pavesPinwheel: 'Pavés pinwheel',
  pierreModulaire: 'Pierre modulaire',
  pavesGranit: 'Pavés granit',
  dallesIrregulieres: 'Dalles irrégulières',
  carrelage: 'Carrelage pierre',
  marbre: 'Marbre veiné',
  damier: 'Damier',
  terrazzo: 'Terrazzo',
  pierre: 'Dalles de pierre',
  moquette: 'Moquette velours',
  herbe: 'Gazon naturel',
  pelouse: 'Pelouse fine',
  gazonSynth: 'Gazon synthétique',
  prairie: 'Prairie / jardin',
  sable: 'Sable',
  beton: 'Béton poli',
  epoxy: 'Résine brillante',
  brique: 'Brique',
  gravier: 'Gravier clair',
  gravierFonce: 'Gravier nuit',
  miroirNoir: 'Miroir noir gala',
  parquetVersailles: 'Parquet Versailles',
  betonCire: 'Béton ciré satiné',
  travertin: 'Dalles de travertin',
  moquetteRouge: 'Tapis rouge protocole',
  dancefloorLed: 'Dancefloor LED starlight',
  terrazzoVenitien: 'Terrazzo vénitien (Éclats)',
  tometteProvencale: 'Tomettes provençales terre cuite',
  pointDeHongrie: 'Chêne Point de Hongrie',
  damierMarbreNoirBlanc: 'Damier marbre noir & blanc',
  dancefloorBoisVitrifié: 'Piste de danse chêne vitrifié',
  verreLumineux: 'Dalles de verre luminescentes',
  pavesEventail: 'Pavés de cour en éventail',
  gazonFleurie: 'Pelouse anglaise fleurie',
  pelouseRayee: 'Pelouse tondue à l’anglaise',
  terrasseIpe: 'Terrasse en bois exotique',
  galets: 'Galets de rivière',
  terreBattue: 'Terre battue',
  custom: 'Image importée',
};

/** Ordre d’affichage dans le sélecteur de sol (photos réalistes en tête). */
export const FLOOR_TYPE_PICKER_ORDER: FloorType[] = [
  'miroirNoir', 'dancefloorLed', 'verreLumineux', 'dancefloorBoisVitrifié',
  'parquetVersailles', 'pointDeHongrie', 'damierMarbreNoirBlanc', 'moquetteRouge',
  'betonCire', 'travertin', 'terrazzoVenitien', 'tometteProvencale', 'pavesEventail',
  'boisPanel', 'boisHex', 'boisAmber', 'boisRustique', 'boisBlond', 'boisPetale',
  'boisCharcoal', 'boisMarqueterie', 'bois', 'parquet', 'chevron', 'chevronGris', 'chevronGreige',
  'marbreCalacatta', 'marbreOr', 'marbreBourgogne', 'marbre', 'epoxyMenthe', 'epoxy',
  'pavesPinwheel', 'pierreModulaire', 'pavesGranit', 'dallesIrregulieres',
  'carrelage', 'damier', 'terrazzo', 'pierre', 'moquette',
  'herbe', 'pelouse', 'pelouseRayee', 'gazonFleurie', 'gazonSynth', 'prairie', 'terrasseIpe', 'sable', 'galets', 'gravier', 'gravierFonce', 'terreBattue', 'beton', 'brique',
];

export type FloorCategory = 'all' | 'prestige' | 'wood' | 'stone' | 'outdoor';

export const FLOOR_CATEGORIES: Array<{ id: FloorCategory; label: string }> = [
  { id: 'all', label: 'Tous' },
  { id: 'prestige', label: 'Prestige & Gala' },
  { id: 'wood', label: 'Bois & Parquets' },
  { id: 'stone', label: 'Pierres & Minéraux' },
  { id: 'outdoor', label: 'Extérieur & Jardin' },
];

export const FLOOR_CATEGORY_MEMBERS: Record<Exclude<FloorCategory, 'all'>, FloorType[]> = {
  prestige: [
    'miroirNoir', 'dancefloorLed', 'verreLumineux', 'parquetVersailles', 'moquetteRouge',
    'damierMarbreNoirBlanc', 'marbreCalacatta', 'marbreOr', 'marbreBourgogne', 'terrazzoVenitien', 'epoxyMenthe', 'epoxy',
  ],
  wood: [
    'dancefloorBoisVitrifié', 'pointDeHongrie', 'parquetVersailles', 'boisPanel', 'boisHex', 'boisAmber', 'boisRustique', 'boisBlond', 'boisPetale',
    'boisCharcoal', 'boisMarqueterie', 'bois', 'parquet', 'chevron', 'chevronGris', 'chevronGreige',
  ],
  stone: [
    'terrazzoVenitien', 'tometteProvencale', 'pavesEventail', 'damierMarbreNoirBlanc',
    'travertin', 'betonCire', 'marbre', 'carrelage', 'damier', 'terrazzo', 'pierre', 'pierreModulaire', 'dallesIrregulieres',
    'pavesPinwheel', 'pavesGranit', 'beton', 'brique',
  ],
  outdoor: [
    'herbe', 'pelouse', 'pelouseRayee', 'gazonFleurie', 'prairie', 'gazonSynth', 'terrasseIpe', 'pavesEventail', 'pavesGranit',
    'dallesIrregulieres', 'tometteProvencale', 'brique', 'sable', 'galets', 'gravier', 'gravierFonce', 'terreBattue', 'beton', 'moquette',
  ],
};

export function floorsForCategory(category: FloorCategory): FloorType[] {
  if (category === 'all') return FLOOR_TYPE_PICKER_ORDER;
  return FLOOR_CATEGORY_MEMBERS[category] ?? FLOOR_TYPE_PICKER_ORDER;
}

type FloorAsset = {
  url: string;
  size: string;
  fallback: string;
};

const DAMIER_TILE = '36px 36px';
const PHOTO = '120px 120px';

export const FLOOR_ASSETS: Record<Exclude<FloorType, 'custom'>, FloorAsset> = {
  parquet: { url: '/floors/gen/parquet-oak-herringbone.jpg', size: '176px 176px', fallback: '#c4a06a' },
  chevron: { url: '/floors/gen/herringbone-honey.jpg', size: PHOTO, fallback: '#c9a06a' },
  bois: { url: '/floors/gen/oak-planks.jpg', size: '192px 192px', fallback: '#d2b07a' },
  boisPanel: { url: '/floors/gen/wood-panel.jpg', size: PHOTO, fallback: '#4a3018' },
  boisHex: { url: '/floors/gen/wood-hex.jpg', size: PHOTO, fallback: '#6b4423' },
  boisAmber: { url: '/floors/gen/wood-amber.jpg', size: PHOTO, fallback: '#c4782a' },
  boisRustique: { url: '/floors/gen/wood-rustic.jpg', size: PHOTO, fallback: '#5c3317' },
  boisBlond: { url: '/floors/gen/wood-blonde.jpg', size: PHOTO, fallback: '#d4c4a8' },
  boisPetale: { url: '/floors/gen/wood-petal.jpg', size: PHOTO, fallback: '#b8956a' },
  boisCharcoal: { url: '/floors/gen/wood-charcoal.jpg', size: PHOTO, fallback: '#4a4a4a' },
  boisMarqueterie: { url: '/floors/gen/wood-marquetry.jpg', size: PHOTO, fallback: '#3d2a1a' },
  chevronGris: { url: '/floors/gen/herringbone-grey.jpg', size: PHOTO, fallback: '#7a7a7a' },
  chevronGreige: { url: '/floors/gen/herringbone-greige.jpg', size: PHOTO, fallback: '#b8b0a4' },
  marbreCalacatta: { url: '/floors/gen/marble-calacatta.jpg', size: PHOTO, fallback: '#f5f0ea' },
  marbreOr: { url: '/floors/gen/marble-gold-shard.jpg', size: PHOTO, fallback: '#f0ebe3' },
  marbreBourgogne: { url: '/floors/gen/marble-burgundy.jpg', size: PHOTO, fallback: '#5c0a0a' },
  epoxyMenthe: { url: '/floors/gen/epoxy-mint-gold.jpg', size: PHOTO, fallback: '#c8e0d4' },
  pavesPinwheel: { url: '/floors/gen/paver-pinwheel.jpg', size: PHOTO, fallback: '#9a9a9a' },
  pierreModulaire: { url: '/floors/gen/stone-modular-brown.jpg', size: PHOTO, fallback: '#5c4030' },
  pavesGranit: { url: '/floors/gen/cobble-granite.jpg', size: PHOTO, fallback: '#8a8a8a' },
  dallesIrregulieres: { url: '/floors/gen/flagstone.jpg', size: PHOTO, fallback: '#6b6558' },
  carrelage: { url: '/floors/gen/stone-tile.jpg', size: PHOTO, fallback: '#ddd7cb' },
  marbre: { url: '/floors/gen/marble-veined.jpg', size: PHOTO, fallback: '#ebe8e3' },
  damier: { url: '/floors/gen/marble-checker.jpg', size: PHOTO, fallback: '#1c1917' },
  terrazzo: { url: '/floors/gen/terrazzo-classic.jpg', size: PHOTO, fallback: '#e8e0d4' },
  pierre: { url: '/floors/gen/limestone-slabs.jpg', size: PHOTO, fallback: '#d8cdb8' },
  moquette: { url: '/floors/gen/carpet-navy.jpg', size: PHOTO, fallback: '#1a1d3a' },
  herbe: { url: '/floors/gen/grass-lawn.jpg', size: PHOTO, fallback: '#3f7a2d' },
  pelouse: { url: '/floors/gen/grass-fine.jpg', size: PHOTO, fallback: '#4f9a38' },
  gazonSynth: { url: '/floors/gen/turf-synthetic.jpg', size: PHOTO, fallback: '#2f8a3a' },
  prairie: { url: '/floors/gen/meadow.jpg', size: PHOTO, fallback: '#6c8f3a' },
  sable: { url: '/floors/gen/sand.jpg', size: PHOTO, fallback: '#dcc79f' },
  beton: { url: '/floors/gen/concrete.jpg', size: PHOTO, fallback: '#9d9b95' },
  epoxy: { url: '/floors/gen/epoxy-grey.jpg', size: PHOTO, fallback: '#cbd5e1' },
  brique: { url: '/floors/gen/brick-pavers.jpg', size: PHOTO, fallback: '#9c4a31' },
  gravier: { url: '/floors/gen/gravel-light.jpg', size: PHOTO, fallback: '#c4b8a4' },
  gravierFonce: { url: '/floors/gen/gravel-dark.jpg', size: PHOTO, fallback: '#3f3f46' },
  miroirNoir: { url: '/floors/damier.svg', size: DAMIER_TILE, fallback: '#0b0c10' },
  parquetVersailles: { url: '/floors/gen/wood-panel.jpg', size: PHOTO, fallback: '#b38243' },
  betonCire: { url: '/floors/gen/concrete-polished.jpg', size: PHOTO, fallback: '#8f8c85' },
  travertin: { url: '/floors/gen/travertine.jpg', size: PHOTO, fallback: '#ded3be' },
  moquetteRouge: { url: '/floors/gen/carpet-red.jpg', size: PHOTO, fallback: '#80131d' },
  dancefloorLed: { url: '/floors/gen/epoxy-mint-gold.jpg', size: PHOTO, fallback: '#07090e' },
  terrazzoVenitien: { url: '/floors/gen/terrazzo-venetian.jpg', size: PHOTO, fallback: '#e8e2d8' },
  tometteProvencale: { url: '/floors/gen/tomettes.jpg', size: PHOTO, fallback: '#b5532f' },
  pointDeHongrie: { url: '/floors/gen/wood-panel.jpg', size: PHOTO, fallback: '#be925f' },
  damierMarbreNoirBlanc: { url: '/floors/gen/marble-checker.jpg', size: PHOTO, fallback: '#1e2022' },
  dancefloorBoisVitrifié: { url: '/floors/gen/wood-panel.jpg', size: PHOTO, fallback: '#d4a373' },
  verreLumineux: { url: '/floors/damier.svg', size: DAMIER_TILE, fallback: '#0f172a' },
  pavesEventail: { url: '/floors/gen/pavers-fan.jpg', size: PHOTO, fallback: '#7d7a75' },
  gazonFleurie: { url: '/floors/gen/lawn-flowers.jpg', size: PHOTO, fallback: '#3f7a2d' },
  pelouseRayee: { url: '/floors/gen/grass-striped.jpg', size: PHOTO, fallback: '#4b9535' },
  terrasseIpe: { url: '/floors/gen/deck-ipe.jpg', size: PHOTO, fallback: '#6b3a22' },
  galets: { url: '/floors/gen/pebbles.jpg', size: PHOTO, fallback: '#a8a092' },
  terreBattue: { url: '/floors/gen/dirt.jpg', size: PHOTO, fallback: '#7a5e44' },
};

/** Répétition monde (mètres) pour textures WebGL. */
export const FLOOR_TEXTURE_REPEAT_M: Record<Exclude<FloorType, 'custom'>, number> = {
  parquet: 2.2,
  chevron: 1.8,
  bois: 2.4,
  boisPanel: 1.6,
  boisHex: 1.4,
  boisAmber: 2.0,
  boisRustique: 1.8,
  boisBlond: 2.6,
  boisPetale: 2.2,
  boisCharcoal: 2.2,
  boisMarqueterie: 1.5,
  chevronGris: 1.6,
  chevronGreige: 1.6,
  marbreCalacatta: 2.4,
  marbreOr: 2.2,
  marbreBourgogne: 2.4,
  epoxyMenthe: 3.2,
  pavesPinwheel: 1.5,
  pierreModulaire: 1.8,
  pavesGranit: 1.2,
  dallesIrregulieres: 2.0,
  carrelage: 2.4,
  marbre: 2.4,
  damier: 1.6,
  terrazzo: 1.6,
  pierre: 1.6,
  moquette: 2.0,
  herbe: 2.0,
  pelouse: 1.6,
  gazonSynth: 1.4,
  prairie: 2.4,
  sable: 2.5,
  beton: 3.0,
  epoxy: 3.0,
  brique: 1.6,
  gravier: 1.2,
  gravierFonce: 1.2,
  miroirNoir: 2.4,
  parquetVersailles: 2.0,
  betonCire: 3.0,
  travertin: 1.6,
  moquetteRouge: 2.0,
  dancefloorLed: 2.0,
  terrazzoVenitien: 1.8,
  tometteProvencale: 1.3,
  pointDeHongrie: 2.0,
  damierMarbreNoirBlanc: 1.6,
  dancefloorBoisVitrifié: 2.4,
  verreLumineux: 2.0,
  pavesEventail: 2.8,
  gazonFleurie: 2.0,
  pelouseRayee: 6.0,
  terrasseIpe: 1.0,
  galets: 1.2,
  terreBattue: 2.5,
};

export function getFloorAsset(floorType: FloorType | undefined): FloorAsset {
  if (!floorType || floorType === 'custom') return FLOOR_ASSETS.parquet;
  return FLOOR_ASSETS[floorType] ?? FLOOR_ASSETS.parquet;
}

function lightingOverlays(floorType: FloorType): { image: string; size: string; repeat: string; blend: string } {
  if (floorType === 'miroirNoir' || floorType === 'dancefloorLed') {
    return {
      image: [
        'radial-gradient(ellipse at 50% 35%, rgba(255,255,255,0.22) 0%, transparent 60%)',
        'linear-gradient(135deg, rgba(255,255,255,0.18) 0%, transparent 40%, rgba(20,20,35,0.45) 100%)',
        'linear-gradient(180deg, rgba(0,0,0,0.4) 0%, transparent 50%, rgba(0,0,0,0.6) 100%)',
      ].join(', '),
      size: '100% 100%, 100% 100%, 100% 100%',
      repeat: 'no-repeat, no-repeat, no-repeat',
      blend: 'screen, overlay, multiply',
    };
  }
  if (floorType === 'moquette' || floorType === 'moquetteRouge' || floorType === 'damier') {
    return {
      image: [
        'radial-gradient(ellipse at 50% 38%, rgba(80,60,120,0.16) 0%, transparent 55%)',
        'linear-gradient(180deg, rgba(0,0,0,0.28) 0%, transparent 38%, rgba(0,0,0,0.18) 100%)',
      ].join(', '),
      size: '100% 100%, 100% 100%',
      repeat: 'no-repeat, no-repeat',
      blend: 'soft-light, multiply',
    };
  }
  if (
    floorType === 'herbe' || floorType === 'pelouse' || floorType === 'gazonSynth' || floorType === 'prairie' || floorType === 'sable'
    || floorType === 'gazonFleurie' || floorType === 'pelouseRayee' || floorType === 'galets' || floorType === 'terreBattue'
  ) {
    return {
      image: [
        'radial-gradient(ellipse at 50% 40%, rgba(255,255,255,0.1) 0%, transparent 50%)',
        'linear-gradient(180deg, rgba(20,40,10,0.22) 0%, transparent 42%, rgba(10,30,8,0.2) 100%)',
      ].join(', '),
      size: '100% 100%, 100% 100%',
      repeat: 'no-repeat, no-repeat',
      blend: 'overlay, multiply',
    };
  }
  if (
    floorType === 'epoxy' || floorType === 'marbre' || floorType === 'epoxyMenthe'
    || floorType === 'marbreCalacatta' || floorType === 'marbreOr' || floorType === 'marbreBourgogne'
  ) {
    return {
      image: [
        'radial-gradient(ellipse at 50% 42%, transparent 40%, rgba(12,16,28,0.28) 100%)',
        'linear-gradient(118deg, rgba(255,255,255,0.28) 0%, transparent 32%, rgba(20,24,36,0.12) 100%)',
        'linear-gradient(180deg, rgba(8,12,24,0.18) 0%, transparent 36%, rgba(255,255,255,0.06) 100%)',
      ].join(', '),
      size: '100% 100%, 100% 100%, 100% 100%',
      repeat: 'no-repeat, no-repeat, no-repeat',
      blend: 'multiply, overlay, soft-light',
    };
  }
  return {
    image: [
      'radial-gradient(ellipse at 50% 42%, transparent 42%, rgba(28,14,4,0.26) 100%)',
      'linear-gradient(118deg, rgba(255,255,255,0.14) 0%, transparent 34%, rgba(40,20,6,0.12) 100%)',
      'linear-gradient(180deg, rgba(20,10,4,0.2) 0%, transparent 40%, rgba(255,255,255,0.05) 100%)',
    ].join(', '),
    size: '100% 100%, 100% 100%, 100% 100%',
    repeat: 'no-repeat, no-repeat, no-repeat',
    blend: 'multiply, overlay, soft-light',
  };
}

export function getFloorPatternStyle(floorType: FloorType, _accentColor = '#94a3b8'): React.CSSProperties {
  if (floorType === 'custom') {
    return { backgroundColor: '#c4a06a' };
  }
  const asset = FLOOR_ASSETS[floorType] ?? FLOOR_ASSETS.parquet;
  const light = lightingOverlays(floorType);
  return {
    backgroundColor: asset.fallback,
    backgroundImage: `${light.image}, url(${asset.url})`,
    backgroundSize: `${light.size}, ${asset.size}`,
    backgroundRepeat: `${light.repeat}, repeat`,
    backgroundBlendMode: `${light.blend}, normal` as React.CSSProperties['backgroundBlendMode'],
  };
}

export function resolveFloorStyle(
  floorType: FloorType | undefined,
  floorImageUrl?: string | undefined,
  accentColor?: string,
): React.CSSProperties {
  if (floorImageUrl) {
    return {
      backgroundColor: '#8b6840',
      backgroundImage: [
        'radial-gradient(ellipse at 50% 42%, transparent 48%, rgba(28,14,4,0.26) 100%)',
        'linear-gradient(180deg, rgba(20,10,4,0.18) 0%, transparent 40%, rgba(255,255,255,0.05) 100%)',
        `url(${floorImageUrl})`,
      ].join(', '),
      backgroundSize: '100% 100%, 100% 100%, cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
    };
  }
  return getFloorPatternStyle(floorType ?? 'parquet', accentColor);
}

/** 0 = plat, 100 = perspective 2,5D max. `depthView` historique = 55. */
export function resolveDepthAmount(meta?: {
  depthView?: boolean;
  depthAmount?: number;
} | null): number {
  if (typeof meta?.depthAmount === 'number' && !Number.isNaN(meta.depthAmount)) {
    return Math.max(0, Math.min(100, Math.round(meta.depthAmount)));
  }
  return meta?.depthView ? 55 : 0;
}

/** Vue invité : conserver le réglage org, sinon une profondeur lisible par défaut. */
export const GUEST_PLAN_DEFAULT_DEPTH = 58;

export function resolveGuestDepthAmount(meta?: {
  depthView?: boolean;
  depthAmount?: number;
} | null): number {
  const resolved = resolveDepthAmount(meta);
  return resolved > 0 ? resolved : GUEST_PLAN_DEFAULT_DEPTH;
}

export function depthScaleForY(yPct: number, amount: number): number {
  if (amount <= 0) return 1;
  const t = Math.min(1, Math.max(0, yPct / 100));
  const strength = amount / 100;
  const far = 0.52;
  const near = 1.06;
  return 1 - (1 - (far + t * (near - far))) * strength;
}

export function depthRotateDeg(amount: number, maxDeg = 42): number {
  if (amount <= 0) return 0;
  return (amount / 100) * maxDeg;
}

export function furnitureDepthStyle(yPct: number, amount: number): React.CSSProperties {
  if (amount <= 0) return {};
  const t = Math.min(1, Math.max(0, yPct / 100));
  const strength = amount / 100;
  const brightness = 1 - (1 - (0.72 + t * 0.28)) * strength;
  const shadowY = 3 + t * 20 * strength;
  const shadowBlur = 8 + t * 28 * strength;
  const z = 6 + t * 36 * strength;
  return {
    zIndex: Math.round(8 + t * 52),
    filter: `brightness(${brightness.toFixed(3)})`,
    ['--em-item-shadow' as string]: `0 ${shadowY.toFixed(1)}px ${shadowBlur.toFixed(1)}px rgba(8, 5, 2, ${0.22 + t * 0.34 * strength})`,
    ['--em-item-z' as string]: `${z.toFixed(1)}px`,
  };
}

export function depthCanvasVars(amount: number): React.CSSProperties {
  if (amount <= 0) return {};
  const rotate = depthRotateDeg(amount);
  return {
    ['--em-depth-perspective' as string]: `${2200 - amount * 9}px`,
    ['--em-depth-origin' as string]: `${90 + amount * 0.05}%`,
    ['--em-depth-haze' as string]: String(amount / 100),
    ['--em-depth-rotate' as string]: `${rotate}deg`,
    ['--em-depth-wall' as string]: `${12 + amount * 0.16}%`,
    ['--em-depth-scene-scale' as string]: String(1.08 + (amount / 100) * 0.14),
  };
}
