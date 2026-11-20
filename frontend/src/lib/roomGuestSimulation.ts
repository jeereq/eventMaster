/**
 * Simulation des invités : place des avatars sur les chaises du plan (tables,
 * rangées, chaises libres), autour des mange-debout et sur la piste de danse,
 * pour se représenter la salle pleine avant l'événement.
 *
 * Module pur (sans Three.js ni React) : positions en mètres dans le repère monde
 * de la 3D (x ∈ [-w/2, w/2], z ∈ [-d/2, d/2]). Tirage déterministe : le même plan
 * donne toujours les mêmes invités, ils ne « sautent » pas à chaque modification.
 */
import type { RoomLayoutBlueprint } from './roomLayoutUtils.ts';
import { getTableSeatPlacement3D, tablePlateSizeMeters } from './tablePlanUtils.ts';
import { clampRowSeatCount, computeRowSeatPose } from './roomAmphitheaterGeom.ts';

export type GuestPose = 'seated' | 'standing' | 'dancing';
/** Silhouette : costume, robe, ou boubou / grand boubou (robe longue). */
export type GuestStyle = 'suit' | 'dress' | 'boubou';

export interface SimulatedGuest {
  id: string;
  pose: GuestPose;
  x: number;
  /** Hauteur du sol sous l'invité (estrade, étage…). */
  y: number;
  z: number;
  /** Orientation (rad) : l'avatar regarde vers +Z local tourné de rotY. */
  rotY: number;
  style: GuestStyle;
  skin: string;
  outfit: string;
  /** Bas (pantalon) pour un costume, sinon même teinte que la tenue. */
  bottom: string;
  hair: string;
  /** Foulard / gele noué sur la tête (teinte d'accent). */
  headwrap: string | null;
  /** Échelle de taille (0,92 – 1,06). */
  scale: number;
  /** Décalage de phase pour l'animation (danse). */
  phase: number;
  /** Invité personnalisé : photo de la personne posée sur le visage de l'avatar. */
  photoUrl?: string;
  /** Nom de la personne (invité personnalisé). */
  name?: string;
  /** Identifiant de la fiche personnalisée d'où vient l'invité. */
  portraitId?: string;
}

/**
 * Invité personnalisé, enregistré sur le plan (`metadata.guestPortraits`) :
 * une personne réelle, avec sa photo, assise à une place précise.
 */
export interface GuestPortrait {
  id: string;
  name: string;
  /** Photo recadrée (carrée) : URL hébergée ou image intégrée. */
  photoUrl: string;
  /** Place : `${idMeuble}:${index}`, même clé que la simulation. */
  seatKey: string;
  style?: GuestStyle;
  /** Couleur de la tenue (sinon tirée au hasard). */
  outfit?: string;
}

/** Nombre maximal d'invités personnalisés sur un plan. */
export const MAX_GUEST_PORTRAITS = 50;

export const GUEST_STYLE_LABELS: Record<GuestStyle, string> = {
  suit: 'Costume',
  dress: 'Robe',
  boubou: 'Boubou',
};

/** Couleurs de tenue proposées pour un invité personnalisé. */
export const PORTRAIT_OUTFIT_COLORS = ['#1b1b1f', '#1f2a44', '#f4f1de', '#7a1f2b', '#0f5c4d', '#c8a24a', '#5b2a86', '#b5179e', '#118ab2', '#d62828', '#fb8500', '#2d6a4f'] as const;

export interface GuestSimulationSettings {
  /** Part des places occupées (0 – 1). */
  fill: number;
  /** Danseurs sur les pistes de danse. */
  dancing: boolean;
  /**
   * Invités réels d'un événement, par place (« idTable:indexPlace ») : seules ces places sont occupées,
   * chacune par un avatar qui porte le nom de la personne. Jamais enregistré sur le plan.
   */
  seatOccupants?: Record<string, SeatOccupant> | null;
}

/** Personne assise à une place précise (plan de table d'un événement). */
export interface SeatOccupant {
  name: string;
  photoUrl?: string;
}

export const GUEST_FILL_CHOICES = [0.25, 0.5, 0.75, 1] as const;
export const DEFAULT_GUEST_SIMULATION: GuestSimulationSettings = { fill: 0.75, dancing: true };
/** Plafond d'avatars dessinés (au-delà, la 3D deviendrait lourde sur mobile). */
export const MAX_SIMULATED_GUESTS = 900;

/** Teintes de peau, des plus foncées aux plus claires (les foncées sont plus fréquentes). */
const SKIN = ['#2f1b13', '#3b2219', '#4a2c20', '#5c3a28', '#6e4630', '#7d5236', '#8d5e3c', '#a0704a', '#b98463', '#d1a07c', '#e5bf9f'];
const SKIN_WEIGHTS = [3, 4, 4, 4, 3, 3, 2, 2, 1, 1, 1];
/** Tenues de fête : wax, satin, costumes. */
const OUTFITS = ['#1f2a44', '#7a1f2b', '#0f5c4d', '#c8a24a', '#5b2a86', '#e07a5f', '#264653', '#b5179e', '#118ab2', '#ef476f', '#ffd166', '#06d6a0', '#f4f1de', '#d62828', '#3a86ff', '#8338ec', '#fb8500', '#2d6a4f'];
const SUITS = ['#1b1b1f', '#23262e', '#1f2a44', '#2f2a26', '#3a3f4b', '#f4f1de', '#5a3e2b'];
const TROUSERS = ['#141418', '#1d2027', '#2a2522', '#30343d'];
const HAIR = ['#120d0b', '#171110', '#1d1612', '#2a1d16', '#3b2a1f', '#6b4a2f'];
const HEADWRAPS = ['#c8a24a', '#d62828', '#ffd166', '#b5179e', '#118ab2', '#e07a5f', '#06d6a0', '#f4f1de', '#fb8500'];

/* ------------------------------------------------------------------ */
/* Thème de la soirée (dress code)                                     */
/* ------------------------------------------------------------------ */

/** Thème de la soirée : il habille les invités simulés (tenues, couleurs, foulards). */
export type GuestDressCode = 'mixte' | 'blanc' | 'gala' | 'traditionnel' | 'cocktail' | 'business' | 'noir' | 'couleurs';

/** Thème choisi pour le plan, avec les couleurs de la fête pour « Aux couleurs de la fête ». */
export interface GuestDressCodeSetting {
  id: GuestDressCode;
  /** 1 à 4 couleurs (hexadécimal), utilisées par le thème « couleurs ». */
  colors?: string[];
}

interface DressCodePalette {
  /** Part des costumes, robes et boubous. */
  weights: [number, number, number];
  suits: readonly string[];
  trousers: readonly string[];
  outfits: readonly string[];
  headwraps: readonly string[];
  /** Probabilité d'un foulard / gele pour une robe ou un boubou. */
  headwrapChance: number;
}

export const GUEST_DRESS_CODES: ReadonlyArray<{ id: GuestDressCode; label: string; hint: string }> = [
  { id: 'mixte', label: 'Tenues variées', hint: 'Costumes, robes et boubous de toutes les couleurs' },
  { id: 'blanc', label: 'Soirée blanche', hint: 'Tout le monde en blanc, crème et champagne' },
  { id: 'gala', label: 'Gala / tenue de soirée', hint: 'Smokings noirs et robes longues aux tons profonds' },
  { id: 'traditionnel', label: 'Mariage traditionnel', hint: 'Pagnes, wax, boubous et foulards colorés' },
  { id: 'cocktail', label: 'Cocktail chic', hint: 'Costumes clairs et robes aux couleurs vives ou pastel' },
  { id: 'business', label: 'Conférence / séminaire', hint: 'Costumes sobres, tons marine et gris' },
  { id: 'noir', label: 'Soirée en noir', hint: 'Tout en noir, quelques touches dorées' },
  { id: 'couleurs', label: 'Aux couleurs de la fête', hint: 'Les invités portent les couleurs choisies pour la fête' },
];

const DRESS_CODE_PALETTES: Record<Exclude<GuestDressCode, 'couleurs'>, DressCodePalette> = {
  mixte: { weights: [0.42, 0.4, 0.18], suits: SUITS, trousers: TROUSERS, outfits: OUTFITS, headwraps: HEADWRAPS, headwrapChance: 0.38 },
  blanc: {
    weights: [0.42, 0.4, 0.18],
    suits: ['#f4f1de', '#ece6d6', '#f7f4ee', '#e8e2d0'],
    trousers: ['#efe9dc', '#f4f1de', '#e3dccb'],
    outfits: ['#fbf8f1', '#f4f1de', '#efe7d6', '#f6efe0', '#e9dcc0', '#fffdf8'],
    headwraps: ['#f4f1de', '#e9dcc0', '#c8a24a'],
    headwrapChance: 0.35,
  },
  gala: {
    weights: [0.48, 0.46, 0.06],
    suits: ['#0f0f12', '#15161b', '#1b1f2e'],
    trousers: ['#0f0f12', '#141418'],
    outfits: ['#0f0f12', '#5a0f1e', '#0f3d33', '#1b2a5a', '#c8a24a', '#6b1d5e', '#b8b8c0'],
    headwraps: ['#c8a24a', '#0f0f12', '#5a0f1e'],
    headwrapChance: 0.15,
  },
  traditionnel: {
    weights: [0.2, 0.3, 0.5],
    suits: ['#1b1b1f', '#3a2a1f', '#c8a24a', '#2d6a4f'],
    trousers: ['#141418', '#2a2522'],
    outfits: ['#e07a5f', '#f2a541', '#118ab2', '#06d6a0', '#d62828', '#ffd166', '#5b2a86', '#2d6a4f', '#fb8500', '#b5179e'],
    headwraps: ['#c8a24a', '#d62828', '#ffd166', '#118ab2', '#fb8500', '#5b2a86', '#06d6a0'],
    headwrapChance: 0.7,
  },
  cocktail: {
    weights: [0.45, 0.5, 0.05],
    suits: ['#3a3f4b', '#5b6b82', '#c9b79c', '#2f3e57', '#7a6a58'],
    trousers: ['#2a2d35', '#c9b79c', '#3a3f4b'],
    outfits: ['#f4a6b8', '#a8dadc', '#ffd6a5', '#cdb4db', '#e63946', '#457b9d', '#f1c0e8', '#90be6d'],
    headwraps: ['#f4a6b8', '#ffd6a5', '#a8dadc'],
    headwrapChance: 0.1,
  },
  business: {
    weights: [0.6, 0.32, 0.08],
    suits: ['#1f2a44', '#2b2f38', '#3a3f4b', '#23262e', '#4b5563'],
    trousers: ['#1d2027', '#2b2f38', '#30343d'],
    outfits: ['#1f2a44', '#3a3f4b', '#7a1f2b', '#f4f1de', '#2f3e57', '#5b6b82'],
    headwraps: ['#1f2a44', '#7a1f2b'],
    headwrapChance: 0.08,
  },
  noir: {
    weights: [0.45, 0.45, 0.1],
    suits: ['#0f0f12', '#141418'],
    trousers: ['#0f0f12', '#141418'],
    outfits: ['#0f0f12', '#151518', '#1c1c20'],
    headwraps: ['#0f0f12', '#c8a24a'],
    headwrapChance: 0.25,
  },
};

const HEX = /^#[0-9a-f]{6}$/i;

/** Palette d'un thème ; « couleurs » se construit à partir des couleurs de la fête. */
export function dressCodePalette(setting?: GuestDressCodeSetting | null): DressCodePalette {
  const id = setting?.id ?? 'mixte';
  if (id !== 'couleurs') return DRESS_CODE_PALETTES[id] ?? DRESS_CODE_PALETTES.mixte;
  const colors = (setting?.colors ?? []).filter((c) => HEX.test(c)).slice(0, 4);
  if (colors.length === 0) return DRESS_CODE_PALETTES.mixte;
  return {
    weights: [0.4, 0.42, 0.18],
    // Les hommes portent les couleurs de la fête ou un costume sombre relevé par elles.
    suits: [...colors, '#1b1b1f'],
    trousers: ['#141418', '#1d2027'],
    outfits: colors,
    headwraps: colors,
    headwrapChance: 0.4,
  };
}

/** Couleurs reconnues dans une description (« rouge et or », « bleu roi »…). */
const COLOR_WORDS: ReadonlyArray<[RegExp, string]> = [
  [/bleu (roi|electrique)/, '#1d4ed8'],
  [/bleu (marine|nuit)/, '#1f2a44'],
  [/bleu ciel/, '#7cb7e8'],
  [/turquoise/, '#1fb5a8'],
  [/emeraude/, '#0f5c4d'],
  [/bordeaux|grenat/, '#6d1a2a'],
  [/fuchsia/, '#b5179e'],
  [/\bbleue?s?\b/, '#2563eb'],
  [/\bvert(e|s|es)?\b/, '#2d6a4f'],
  [/\brouges?\b/, '#c1121f'],
  [/\b(or|dore|dorees?|dores)\b/, '#c8a24a'],
  [/\b(argent|argente|argentee?s?)\b/, '#b8b8c0'],
  [/\broses?\b/, '#e5739a'],
  [/\b(violet(te)?s?|mauve|lilas)\b/, '#6b2fa0'],
  [/\borange\b/, '#f28c28'],
  [/\bjaunes?\b/, '#f2c94c'],
  [/\bbeiges?\b/, '#d8c3a5'],
  [/\b(blanc|blanche|blancs|blanches)\b/, '#f4f1de'],
  [/\b(noir|noire|noirs|noires)\b/, '#111114'],
];

function normalizeText(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Thème de la soirée deviné à partir de la description de la fête (studio IA,
 * nom de l'événement…). `null` si rien de clair : on garde des tenues variées.
 */
export function detectDressCode(text: string | null | undefined): GuestDressCodeSetting | null {
  if (!text) return null;
  const t = normalizeText(text);
  if (/soiree blanche|tout en blanc|all white|white party|dress ?code ?:? ?blanc/.test(t)) return { id: 'blanc' };
  if (/tout en noir|all black|soiree noire|black party|dress ?code ?:? ?noir/.test(t)) return { id: 'noir' };
  if (/gala|black tie|smoking|tenue de soiree|soiree chic|tenue correcte exigee/.test(t)) return { id: 'gala' };
  if (/traditionnel|coutumier|\bdot\b|kitchen party|pagne|\bwax\b|liputa|boubou|kente/.test(t)) return { id: 'traditionnel' };
  if (/conference|seminaire|colloque|\bforum\b|business|formation|assemblee generale|lancement de produit|atelier de travail/.test(t)) return { id: 'business' };
  // Couleurs annoncées comme thème : « thème rouge et or », « dress code bleu et blanc ».
  const themed = t.match(/(theme|couleurs?|dress ?code|tenue|habille[es]* en)[^.,;:!?]{0,40}/g);
  if (themed) {
    const colors: string[] = [];
    for (const found of themed) {
      let chunk = found;
      for (const [re, hex] of COLOR_WORDS) {
        if (!re.test(chunk)) continue;
        // « bleu roi » ne compte pas une seconde fois comme « bleu ».
        chunk = chunk.replace(re, ' ');
        if (!colors.includes(hex)) colors.push(hex);
      }
    }
    if (colors.length > 0) return { id: 'couleurs', colors: colors.slice(0, 4) };
  }
  if (/cocktail|afterwork|vernissage/.test(t)) return { id: 'cocktail' };
  return null;
}

/** Hachage 32 bits (FNV-1a) d'une chaîne. */
function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Générateur pseudo-aléatoire déterministe (mulberry32). */
function rng(seed: string): () => number {
  let a = hashString(seed) || 1;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(list: readonly T[], r: number): T {
  return list[Math.min(list.length - 1, Math.floor(r * list.length))];
}

function pickWeighted<T>(list: readonly T[], weights: readonly number[], r: number): T {
  const total = weights.reduce((a, b) => a + b, 0);
  let acc = r * total;
  for (let i = 0; i < list.length; i += 1) {
    acc -= weights[i] ?? 0;
    if (acc <= 0) return list[i];
  }
  return list[list.length - 1];
}

function pctToWorld(xPct: number, yPct: number, widthM: number, depthM: number): [number, number] {
  return [((xPct / 100) - 0.5) * widthM, ((yPct / 100) - 0.5) * depthM];
}

/** Rotation autour de Y, même convention que Three.js (groupe tourné de `rot`). */
function rotateY(x: number, z: number, rot: number): [number, number] {
  const c = Math.cos(rot);
  const s = Math.sin(rot);
  return [x * c + z * s, -x * s + z * c];
}

/** Apparence d'un invité, tirée de son identifiant. */
function dressGuest(
  id: string,
  pose: GuestPose,
  x: number,
  y: number,
  z: number,
  rotY: number,
  portrait?: GuestPortrait,
  palette: DressCodePalette = DRESS_CODE_PALETTES.mixte,
): SimulatedGuest {
  const r = rng(`guest:${id}`);
  const roll = r();
  const [wSuit, wDress] = palette.weights;
  const style: GuestStyle = portrait?.style ?? (roll < wSuit ? 'suit' : roll < wSuit + wDress ? 'dress' : 'boubou');
  const randomOutfit = style === 'suit' ? pick(palette.suits, r()) : pick(palette.outfits, r());
  const outfit = portrait?.outfit || randomOutfit;
  const bottom = style === 'suit' ? pick(palette.trousers, r()) : outfit;
  const headwrapRoll = r();
  // La photo montre déjà la coiffure de la personne : pas de foulard ajouté.
  const headwrap = !portrait && style !== 'suit' && headwrapRoll < palette.headwrapChance ? pick(palette.headwraps, r()) : null;
  const extra = portrait ? { photoUrl: portrait.photoUrl, name: portrait.name, portraitId: portrait.id } : {};
  return {
    ...extra,
    id,
    pose,
    x,
    y,
    z,
    rotY,
    style,
    skin: pickWeighted(SKIN, SKIN_WEIGHTS, r()),
    outfit,
    bottom,
    hair: pick(HAIR, r()),
    headwrap,
    scale: 0.92 + r() * 0.14,
    phase: r() * Math.PI * 2,
  };
}

export interface GuestSimulationOptions extends Partial<GuestSimulationSettings> {
  /** Hauteur du sol sous un point du plan (estrade, podium…), en mètres. */
  surfaceElevationAt?: (xPct: number, yPct: number, itemId: string) => number;
  /** Hauteur de l'étage d'un élément (bâtiments à plusieurs niveaux). */
  storyElevation?: (storyId: string | undefined) => number;
  /** Étage affiché ? (sinon ses invités ne sont pas dessinés). */
  storyVisible?: (storyId: string | undefined) => boolean;
  maxGuests?: number;
  /** Invités personnalisés (par défaut ceux du plan). Toujours présents, quel que soit le remplissage. */
  portraits?: GuestPortrait[] | null;
  /** Thème de la soirée (par défaut celui du plan). */
  dressCode?: GuestDressCodeSetting | null;
  /** Remplissage des pistes de danse (par défaut `fill`) : la musique attire du monde sur la piste. */
  danceFill?: number;
}

export interface GuestSimulationResult {
  guests: SimulatedGuest[];
  seated: number;
  standing: number;
  dancing: number;
  /** Places assises disponibles sur le plan (pour afficher « 96 / 128 »). */
  seats: number;
  /** Invités personnalisés effectivement placés (leur place existe toujours). */
  portraits: number;
}

/**
 * Place les invités simulés. `fill` règle la part des places occupées ; les
 * danseurs (si `dancing`) occupent environ une personne pour 2 m² de piste.
 */
export function buildGuestSimulation(blueprint: RoomLayoutBlueprint, options: GuestSimulationOptions = {}): GuestSimulationResult {
  const fill = Math.max(0, Math.min(1, options.fill ?? DEFAULT_GUEST_SIMULATION.fill));
  const dancing = options.dancing ?? DEFAULT_GUEST_SIMULATION.dancing;
  const danceFill = Math.max(0, Math.min(1, options.danceFill ?? fill));
  const maxGuests = options.maxGuests ?? MAX_SIMULATED_GUESTS;
  const widthM = blueprint.canvas?.widthM > 0 ? blueprint.canvas.widthM : 20;
  const depthM = blueprint.canvas?.heightM > 0 ? blueprint.canvas.heightM : 16;
  const elevAt = options.surfaceElevationAt ?? (() => 0);
  const storyElev = options.storyElevation ?? (() => 0);
  const visible = options.storyVisible ?? (() => true);
  const guests: SimulatedGuest[] = [];
  let seats = 0;
  let standing = 0;
  let dancers = 0;
  const portraitsBySeat = new Map<string, GuestPortrait>();
  for (const p of options.portraits ?? blueprint.metadata?.guestPortraits ?? []) {
    if (p?.seatKey && p.photoUrl && !portraitsBySeat.has(p.seatKey)) portraitsBySeat.set(p.seatKey, p);
  }
  let portraits = 0;
  const palette = dressCodePalette(options.dressCode ?? blueprint.metadata?.guestDressCode);
  const occupants = options.seatOccupants ?? null;
  // Plan de table d'un événement : les places assignées, et elles seules, sont occupées.
  const occupied = (key: string) => (occupants
    ? Boolean(occupants[key]) || portraitsBySeat.has(key)
    : portraitsBySeat.has(key) || rng(`seat:${key}`)() < fill);
  // Les invités personnalisés passent même quand le plafond d'avatars est atteint.
  const full = (key?: string) => guests.length >= maxGuests && !(key && portraitsBySeat.has(key));
  const dress = (key: string, pose: GuestPose, x: number, y: number, z: number, rotY: number) => {
    const portrait = portraitsBySeat.get(key);
    if (portrait) portraits += 1;
    const guest = dressGuest(key, pose, x, y, z, rotY, portrait, palette);
    const occupant = occupants?.[key];
    if (occupant && !portrait) {
      guest.name = occupant.name;
      if (occupant.photoUrl) guest.photoUrl = occupant.photoUrl;
    }
    return guest;
  };

  for (const item of blueprint.furniture ?? []) {
    if (!visible(item.storyId)) continue;
    const floorY = storyElev(item.storyId);

    if (item.kind === 'table') {
      const [wx, wz] = pctToWorld(item.x, item.y, widthM, depthM);
      const rot = ((item.rotation ?? 0) * Math.PI) / 180;
      const y = floorY + elevAt(item.x, item.y, item.id);
      const size = tablePlateSizeMeters(item.shape, item.capacity, {
        customWidthM: item.customWidthM,
        customDepthM: item.customDepthM,
        customRadiusM: item.customRadiusM,
      }, item.seatingSide);
      if (item.shape === 'cocktail' || item.shape === 'highTop') {
        // Mange-debout : quelques invités debout tout autour, tournés vers la table.
        const n = Math.min(Math.max(1, Math.round(item.capacity) || 1), 6);
        const radius = Math.max(size[0], size[1]) / 2 + 0.32;
        for (let i = 0; i < n; i += 1) {
          const key = `${item.id}:${i}`;
          if (full(key) || !occupied(key)) continue;
          const a = (i / n) * Math.PI * 2 + Math.PI / 4;
          const lx = Math.sin(a) * radius;
          const lz = Math.cos(a) * radius;
          const [dx, dz] = rotateY(lx, lz, rot);
          guests.push(dress(key, 'standing', wx + dx, y, wz + dz, a + Math.PI + rot));
          standing += 1;
        }
        continue;
      }
      if (item.attachedChairs === false) continue;
      const hidden = new Set(item.hiddenSeatIndices ?? []);
      const count = Math.min(Math.max(0, Math.round(item.capacity) || 0), 40);
      for (let i = 0; i < count; i += 1) {
        if (hidden.has(i)) continue;
        seats += 1;
        const key = `${item.id}:${i}`;
        if (full(key) || !occupied(key)) continue;
        const seat = getTableSeatPlacement3D(item.shape, item.capacity, i, size, item.seatingSide);
        const [dx, dz] = rotateY(seat.x, seat.z, rot);
        guests.push(dress(key, 'seated', wx + dx, y, wz + dz, seat.rotationY + rot));
      }
      continue;
    }

    if (item.kind === 'row') {
      const [wx, wz] = pctToWorld(item.x, item.y, widthM, depthM);
      const count = clampRowSeatCount(item.seatCount);
      const elevation = Math.max(
        item.elevationM ?? (item.tier > 0 ? item.tier * 0.38 : 0),
        elevAt(item.x, item.y, item.id),
      );
      const stage = !item.focusX && !item.focusY
        ? (blueprint.fixtures ?? []).find((f) => f.kind === 'stage' || f.kind === 'podium')
        : undefined;
      const focusX = item.focusX ?? (stage ? stage.x + stage.w / 2 : item.x);
      const focusY = item.focusY ?? (stage ? stage.y + stage.h / 2 : Math.max(4, item.y - 25));
      const [fx, fz] = pctToWorld(focusX, focusY, widthM, depthM);
      const rot = ((item.rotation ?? 0) * Math.PI) / 180;
      const dx0 = fx - wx;
      const dz0 = fz - wz;
      // Même passage repère monde → repère de la rangée que la 3D.
      const focusLocal = { x: Math.cos(rot) * dx0 - Math.sin(rot) * dz0, z: Math.sin(rot) * dx0 + Math.cos(rot) * dz0 };
      for (let i = 0; i < count; i += 1) {
        seats += 1;
        const key = `${item.id}:${i}`;
        if (full(key) || !occupied(key)) continue;
        const p = computeRowSeatPose(i, count, 0.55, item.curve, elevation, focusLocal, item.aisleSplit === true, item.aisleWidthPct);
        const [dx, dz] = rotateY(p.localX, p.localZ, rot);
        guests.push(dress(key, 'seated', wx + dx, floorY + p.y, wz + dz, p.faceY + rot));
      }
      continue;
    }

    if (item.kind === 'chair') {
      seats += 1;
      if (full(`${item.id}:0`) || !occupied(`${item.id}:0`)) continue;
      const [wx, wz] = pctToWorld(item.x, item.y, widthM, depthM);
      const rot = ((item.rotation ?? 0) * Math.PI) / 180;
      guests.push(dress(`${item.id}:0`, 'seated', wx, floorY + elevAt(item.x, item.y, item.id), wz, rot));
      continue;
    }

    if (item.kind === 'zone' && item.zoneKind === 'dance' && dancing) {
      const wM = (item.w / 100) * widthM;
      const dM = (item.h / 100) * depthM;
      const area = wM * dM;
      const n = Math.min(60, Math.round((area / 2) * danceFill));
      const [cx, cz] = pctToWorld(item.x + item.w / 2, item.y + item.h / 2, widthM, depthM);
      const rot = ((item.rotation ?? 0) * Math.PI) / 180;
      const r = rng(`dance:${item.id}`);
      for (let i = 0; i < n; i += 1) {
        if (full()) break;
        // Un peu de marge pour ne pas danser sur le bord de la piste.
        const lx = (r() - 0.5) * Math.max(0, wM - 0.8);
        const lz = (r() - 0.5) * Math.max(0, dM - 0.8);
        const [dx, dz] = rotateY(lx, lz, rot);
        // Les danseurs se tournent vers le centre de la piste (ou au hasard s'ils y sont).
        const face = Math.hypot(lx, lz) > 0.6 ? Math.atan2(-dx, -dz) : r() * Math.PI * 2;
        guests.push(dressGuest(`${item.id}:d${i}`, 'dancing', cx + dx, floorY + 0.03, cz + dz, face, undefined, palette));
        dancers += 1;
      }
    }
  }

  return { guests, seated: guests.length - standing - dancers, standing, dancing: dancers, seats, portraits };
}

export interface GuestSeat {
  /** Clé de la place (`${idMeuble}:${index}`). */
  key: string;
  /** Libellé lisible : « Table 3 · place 2 ». */
  label: string;
  /** Meuble auquel appartient la place. */
  furnitureId: string;
  /** Place debout (mange-debout) plutôt qu'assise. */
  standing: boolean;
}

/** Toutes les places où l'on peut installer un invité personnalisé, dans l'ordre du plan. */
export function listGuestSeats(blueprint: RoomLayoutBlueprint): GuestSeat[] {
  const out: GuestSeat[] = [];
  let tableNo = 0;
  let chairNo = 0;
  for (const item of blueprint.furniture ?? []) {
    if (item.kind === 'table') {
      tableNo += 1;
      const name = item.name?.trim() || `Table ${tableNo}`;
      if (item.shape === 'cocktail' || item.shape === 'highTop') {
        const n = Math.min(Math.max(1, Math.round(item.capacity) || 1), 6);
        for (let i = 0; i < n; i += 1) {
          out.push({ key: `${item.id}:${i}`, label: `${name} · debout ${i + 1}`, furnitureId: item.id, standing: true });
        }
        continue;
      }
      if (item.attachedChairs === false) continue;
      const hidden = new Set(item.hiddenSeatIndices ?? []);
      const count = Math.min(Math.max(0, Math.round(item.capacity) || 0), 40);
      for (let i = 0; i < count; i += 1) {
        if (hidden.has(i)) continue;
        out.push({ key: `${item.id}:${i}`, label: `${name} · place ${i + 1}`, furnitureId: item.id, standing: false });
      }
    } else if (item.kind === 'row') {
      const count = clampRowSeatCount(item.seatCount);
      const name = item.label?.trim() || 'Rangée';
      for (let i = 0; i < count; i += 1) {
        out.push({ key: `${item.id}:${i}`, label: `${name} · siège ${i + 1}`, furnitureId: item.id, standing: false });
      }
    } else if (item.kind === 'chair') {
      chairNo += 1;
      out.push({ key: `${item.id}:0`, label: `Chaise ${chairNo}`, furnitureId: item.id, standing: false });
    }
  }
  return out;
}

/**
 * Première place libre pour un nouvel invité personnalisé : d'abord autour du
 * meuble sélectionné (s'il en a), puis sur tout le plan. `null` si tout est pris.
 */
export function firstFreeGuestSeat(
  blueprint: RoomLayoutBlueprint,
  taken: Iterable<string>,
  preferFurnitureId?: string | null,
): GuestSeat | null {
  const used = new Set(taken);
  const seats = listGuestSeats(blueprint).filter((s) => !used.has(s.key));
  if (preferFurnitureId) {
    const near = seats.find((s) => s.furnitureId === preferFurnitureId);
    if (near) return near;
  }
  return seats.find((s) => !s.standing) ?? seats[0] ?? null;
}
