/**
 * Vue « à la place d'un invité » : choix de l'avatar dont on emprunte les yeux,
 * passage d'un invité à l'autre et libellé de sa place.
 * Fonctions pures (sans Three.js) pour être testées.
 */
import type { RoomLayoutBlueprint } from './roomLayoutUtils.ts';
import type { GuestPose, SimulatedGuest } from './roomGuestSimulation.ts';

export type AvatarViewFilter = 'all' | GuestPose;

export const AVATAR_VIEW_FILTER_LABELS: Record<AvatarViewFilter, string> = {
  all: 'Tous',
  seated: 'Assis',
  standing: 'Debout',
  dancing: 'Piste',
};

/** Inclinaison de la tête autorisée (rad) : on ne regarde ni ses pieds ni le plafond à la verticale. */
export const AVATAR_PITCH_LIMIT = (70 * Math.PI) / 180;

export function clampAvatarPitch(pitch: number): number {
  return Math.max(-AVATAR_PITCH_LIMIT, Math.min(AVATAR_PITCH_LIMIT, pitch));
}

/** Cap (rad) pour regarder un point depuis un autre : 0 = vers +Z, même convention que `rotY`. */
export function yawToward(from: { x: number; z: number }, to: { x: number; z: number }): number {
  return Math.atan2(to.x - from.x, to.z - from.z);
}

/** Écart d'angle ramené entre -π et π. */
export function wrapAngle(a: number): number {
  const twoPi = Math.PI * 2;
  let r = ((a + Math.PI) % twoPi + twoPi) % twoPi - Math.PI;
  if (r === -Math.PI) r = Math.PI;
  return r;
}

export function filterAvatarViewers(guests: SimulatedGuest[], filter: AvatarViewFilter): SimulatedGuest[] {
  return filter === 'all' ? guests : guests.filter((g) => g.pose === filter);
}

/** Postures présentes dans la salle, dans l'ordre d'affichage des filtres. */
export function availableAvatarFilters(guests: SimulatedGuest[]): AvatarViewFilter[] {
  const poses = new Set(guests.map((g) => g.pose));
  const out: AvatarViewFilter[] = [];
  for (const pose of ['seated', 'standing', 'dancing'] as const) if (poses.has(pose)) out.push(pose);
  return out.length > 1 ? ['all', ...out] : out;
}

/**
 * Premier point de vue proposé : un invité assis face à la scène, à bonne distance
 * (ni collé à l'estrade, ni au fond), sinon l'invité du milieu de la liste.
 */
export function pickDefaultAvatarViewer(
  guests: SimulatedGuest[],
  focus?: { x: number; z: number } | null,
): SimulatedGuest | null {
  if (guests.length === 0) return null;
  const seated = guests.filter((g) => g.pose === 'seated');
  const pool = seated.length > 0 ? seated : guests;
  if (!focus) return pool[Math.floor(pool.length / 2)];
  let best: SimulatedGuest | null = null;
  let bestScore = Infinity;
  for (const g of pool) {
    const dist = Math.hypot(focus.x - g.x, focus.z - g.z);
    // Regarder la scène sans se retourner : on pénalise les invités qui lui tournent le dos.
    const turn = Math.abs(wrapAngle(yawToward(g, focus) - g.rotY));
    const score = Math.abs(dist - 5) + turn * 2.5;
    if (score < bestScore) {
      bestScore = score;
      best = g;
    }
  }
  return best;
}

/** Invité suivant (dir = 1) ou précédent (dir = -1) dans la liste filtrée, en boucle. */
export function stepAvatarViewer(
  guests: SimulatedGuest[],
  currentId: string | null,
  dir: 1 | -1,
  filter: AvatarViewFilter = 'all',
): SimulatedGuest | null {
  const list = filterAvatarViewers(guests, filter);
  if (list.length === 0) return null;
  const idx = list.findIndex((g) => g.id === currentId);
  if (idx < 0) return dir > 0 ? list[0] : list[list.length - 1];
  return list[(idx + dir + list.length) % list.length];
}

/** Invité tiré au hasard (différent de l'actuel quand c'est possible). */
export function randomAvatarViewer(
  guests: SimulatedGuest[],
  currentId: string | null,
  filter: AvatarViewFilter = 'all',
  random: () => number = Math.random,
): SimulatedGuest | null {
  const list = filterAvatarViewers(guests, filter);
  if (list.length === 0) return null;
  if (list.length === 1) return list[0];
  const others = list.filter((g) => g.id !== currentId);
  return others[Math.min(others.length - 1, Math.floor(random() * others.length))];
}

/** « Table 4 · place 3 », « Rangée B · siège 12 », « Sur la piste de danse »… */
export function describeAvatarViewer(blueprint: RoomLayoutBlueprint, guest: SimulatedGuest): string {
  if (guest.name) return guest.name;
  const sep = guest.id.lastIndexOf(':');
  const itemId = sep >= 0 ? guest.id.slice(0, sep) : guest.id;
  const slot = sep >= 0 ? guest.id.slice(sep + 1) : '';
  const item = (blueprint.furniture ?? []).find((f) => f.id === itemId);
  const n = Number.parseInt(slot, 10);
  const seatNo = Number.isFinite(n) ? n + 1 : null;
  if (guest.pose === 'dancing') {
    const label = item && item.kind === 'zone' ? item.label?.trim() : '';
    return label ? `Sur la piste · ${label}` : 'Sur la piste de danse';
  }
  if (!item) return guest.pose === 'standing' ? 'Invité debout' : 'Invité assis';
  if (item.kind === 'table') {
    const name = item.name?.trim() || 'Table';
    if (item.shape === 'cocktail' || item.shape === 'highTop') return `${name} · debout`;
    return seatNo ? `${name} · place ${seatNo}` : name;
  }
  if (item.kind === 'row') {
    const name = item.label?.trim() || 'Rangée';
    return seatNo ? `${name} · siège ${seatNo}` : name;
  }
  if (item.kind === 'chair') return item.label?.trim() || 'Chaise';
  return guest.pose === 'standing' ? 'Invité debout' : 'Invité assis';
}

/* ------------------------------------------------------------------ */
/* Qualité de vue d'une place (carte des places)                       */
/* ------------------------------------------------------------------ */

export type SeatViewGrade = 'excellent' | 'good' | 'fair' | 'far';

export const SEAT_VIEW_GRADE_LABELS: Record<SeatViewGrade, string> = {
  excellent: 'Vue excellente',
  good: 'Bonne vue',
  fair: 'Vue correcte',
  far: 'Vue difficile',
};

/** Teintes de la carte : du vert (meilleures places) au rouge brique (trop loin ou dos à la scène). */
export const SEAT_VIEW_GRADE_COLORS: Record<SeatViewGrade, string> = {
  excellent: '#16a34a',
  good: '#65a30d',
  fair: '#d97706',
  far: '#dc2626',
};

export interface SeatViewQuality {
  /** Distance au centre de la scène (m). */
  distanceM: number;
  /** Rotation de tête nécessaire pour voir la scène (degrés, 0 = droit devant). */
  turnDeg: number;
  grade: SeatViewGrade;
}

/**
 * Note la vue d'une place vers la scène, comme une billetterie de stade :
 * on regarde la distance (idéal entre 3 et 12 m) et l'angle dont il faut tourner la tête.
 */
export function seatViewQuality(
  guest: Pick<SimulatedGuest, 'x' | 'z' | 'rotY'>,
  focus: { x: number; z: number },
): SeatViewQuality {
  const distanceM = Math.hypot(focus.x - guest.x, focus.z - guest.z);
  const turnDeg = Math.abs(wrapAngle(yawToward(guest, focus) - guest.rotY)) * (180 / Math.PI);
  // Score sur 100 : chaque mètre au-delà de 12 m et chaque degré au-delà de 30° coûtent des points.
  let score = 100;
  if (distanceM < 2) score -= (2 - distanceM) * 18;
  if (distanceM > 12) score -= (distanceM - 12) * 4.5;
  if (turnDeg > 30) score -= (turnDeg - 30) * 0.55;
  const grade: SeatViewGrade = score >= 85 ? 'excellent' : score >= 68 ? 'good' : score >= 48 ? 'fair' : 'far';
  return { distanceM, turnDeg, grade };
}

/** Place la plus proche d'un point du plan (clic sur la carte), dans la liste filtrée. */
export function nearestAvatarViewer(
  guests: SimulatedGuest[],
  point: { x: number; z: number },
  filter: AvatarViewFilter = 'all',
  maxDistanceM = Infinity,
): SimulatedGuest | null {
  let best: SimulatedGuest | null = null;
  let bestD = maxDistanceM;
  for (const g of filterAvatarViewers(guests, filter)) {
    const d = Math.hypot(g.x - point.x, g.z - point.z);
    if (d < bestD) {
      bestD = d;
      best = g;
    }
  }
  return best;
}

/* ------------------------------------------------------------------ */
/* Vol de caméra jusqu'à une place                                     */
/* ------------------------------------------------------------------ */

export interface SeatFlight {
  /** Durée du vol (s). */
  durationS: number;
  /** Altitude de croisière (m), au-dessus des deux extrémités. */
  peakY: number;
}

/**
 * Trajectoire de « vol jusqu'au siège » : un saut de puce entre voisins reste court et bas,
 * une traversée de salle prend de la hauteur pour survoler les tables avant de redescendre.
 * `ceilingY` borne l'altitude sous le plafond quand la salle est couverte.
 */
export function planSeatFlight(
  from: { x: number; y: number; z: number },
  to: { x: number; y: number; z: number },
  ceilingY?: number | null,
): SeatFlight {
  const dist = Math.hypot(to.x - from.x, to.y - from.y, to.z - from.z);
  const base = Math.max(from.y, to.y);
  let peakY = Math.max(base, to.y + Math.min(7, Math.max(0, (dist - 1.5) * 0.4)));
  if (ceilingY != null && Number.isFinite(ceilingY)) peakY = Math.min(peakY, Math.max(base, ceilingY));
  const durationS = Math.min(2.4, Math.max(0.9, 0.75 + dist * 0.07));
  return { durationS, peakY };
}
