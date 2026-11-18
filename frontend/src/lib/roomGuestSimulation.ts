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
}

export interface GuestSimulationSettings {
  /** Part des places occupées (0 – 1). */
  fill: number;
  /** Danseurs sur les pistes de danse. */
  dancing: boolean;
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
function dressGuest(id: string, pose: GuestPose, x: number, y: number, z: number, rotY: number): SimulatedGuest {
  const r = rng(`guest:${id}`);
  const roll = r();
  const style: GuestStyle = roll < 0.42 ? 'suit' : roll < 0.82 ? 'dress' : 'boubou';
  const outfit = style === 'suit' ? pick(SUITS, r()) : pick(OUTFITS, r());
  const bottom = style === 'suit' ? pick(TROUSERS, r()) : outfit;
  const headwrapRoll = r();
  const headwrap = style !== 'suit' && headwrapRoll < 0.38 ? pick(HEADWRAPS, r()) : null;
  return {
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
}

export interface GuestSimulationResult {
  guests: SimulatedGuest[];
  seated: number;
  standing: number;
  dancing: number;
  /** Places assises disponibles sur le plan (pour afficher « 96 / 128 »). */
  seats: number;
}

/**
 * Place les invités simulés. `fill` règle la part des places occupées ; les
 * danseurs (si `dancing`) occupent environ une personne pour 2 m² de piste.
 */
export function buildGuestSimulation(blueprint: RoomLayoutBlueprint, options: GuestSimulationOptions = {}): GuestSimulationResult {
  const fill = Math.max(0, Math.min(1, options.fill ?? DEFAULT_GUEST_SIMULATION.fill));
  const dancing = options.dancing ?? DEFAULT_GUEST_SIMULATION.dancing;
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
  const occupied = (key: string) => rng(`seat:${key}`)() < fill;
  const full = () => guests.length >= maxGuests;

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
          if (full()) break;
          const key = `${item.id}:${i}`;
          if (!occupied(key)) continue;
          const a = (i / n) * Math.PI * 2 + Math.PI / 4;
          const lx = Math.sin(a) * radius;
          const lz = Math.cos(a) * radius;
          const [dx, dz] = rotateY(lx, lz, rot);
          guests.push(dressGuest(key, 'standing', wx + dx, y, wz + dz, a + Math.PI + rot));
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
        if (full()) continue;
        const key = `${item.id}:${i}`;
        if (!occupied(key)) continue;
        const seat = getTableSeatPlacement3D(item.shape, item.capacity, i, size, item.seatingSide);
        const [dx, dz] = rotateY(seat.x, seat.z, rot);
        guests.push(dressGuest(key, 'seated', wx + dx, y, wz + dz, seat.rotationY + rot));
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
        if (full()) continue;
        const key = `${item.id}:${i}`;
        if (!occupied(key)) continue;
        const p = computeRowSeatPose(i, count, 0.55, item.curve, elevation, focusLocal, item.aisleSplit === true, item.aisleWidthPct);
        const [dx, dz] = rotateY(p.localX, p.localZ, rot);
        guests.push(dressGuest(key, 'seated', wx + dx, floorY + p.y, wz + dz, p.faceY + rot));
      }
      continue;
    }

    if (item.kind === 'chair') {
      seats += 1;
      if (full() || !occupied(`${item.id}:0`)) continue;
      const [wx, wz] = pctToWorld(item.x, item.y, widthM, depthM);
      const rot = ((item.rotation ?? 0) * Math.PI) / 180;
      guests.push(dressGuest(`${item.id}:0`, 'seated', wx, floorY + elevAt(item.x, item.y, item.id), wz, rot));
      continue;
    }

    if (item.kind === 'zone' && item.zoneKind === 'dance' && dancing) {
      const wM = (item.w / 100) * widthM;
      const dM = (item.h / 100) * depthM;
      const area = wM * dM;
      const n = Math.min(60, Math.round((area / 2) * fill));
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
        guests.push(dressGuest(`${item.id}:d${i}`, 'dancing', cx + dx, floorY + 0.03, cz + dz, face));
        dancers += 1;
      }
    }
  }

  return { guests, seated: guests.length - standing - dancers, standing, dancing: dancers, seats };
}
