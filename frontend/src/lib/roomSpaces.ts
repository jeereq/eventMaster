/**
 * « Explorer les espaces » de la vue 3D : liste des espaces réels d’un plan
 * (scène, bar, piste, table d’honneur, tables…) et cadrages caméra associés.
 *
 * Module pur (aucune dépendance Three.js / React) pour rester testable avec
 * `node --test`. Les coordonnées du plan sont en % du canevas (0–100), le
 * monde 3D est centré sur la salle : x ∈ [-w/2, w/2], z ∈ [-d/2, d/2].
 */
import type { RoomLayoutBlueprint, RoomFixtureKind } from './roomLayoutUtils';

export type RoomSpaceIcon =
  | 'stage'
  | 'bar'
  | 'dj'
  | 'buffet'
  | 'dance'
  | 'vip'
  | 'honor'
  | 'tables'
  | 'rows'
  | 'entrance'
  | 'ceremony'
  | 'zone';

export type RoomSpaceSelectionKind = 'fixture' | 'zone' | 'table' | 'row';

export interface RoomSpace {
  /** Identifiant stable (id d’élément ou groupe synthétique). */
  id: string;
  icon: RoomSpaceIcon;
  /** Titre affiché (« Scène », « Piste de danse », libellé saisi…). */
  title: string;
  /** Ligne de détails : dimensions, places, nombre de tables… */
  details: string;
  /** Centre de l’espace en mètres, repère monde. */
  center: { x: number; z: number };
  /** Emprise au sol (m) pour le cadrage et le surlignage. */
  size: { w: number; d: number };
  /** Rotation de l’emprise (degrés, sens du plan). */
  rotationDeg: number;
  /** Hauteur utile pour viser (scène surélevée, bar…). */
  focusHeightM: number;
  /** Élément à sélectionner dans l’éditeur (absent pour un groupe). */
  selection?: { kind: RoomSpaceSelectionKind; id: string };
  /** Nombre de places assises rattachées à l’espace. */
  seats?: number;
}

export interface CameraPoseLite {
  pos: [number, number, number];
  target: [number, number, number];
}

const FIXTURE_SPACES: Partial<Record<RoomFixtureKind, { icon: RoomSpaceIcon; title: string; focus: number }>> = {
  stage: { icon: 'stage', title: 'Scène', focus: 1.2 },
  podium: { icon: 'stage', title: 'Podium', focus: 1.1 },
  bar: { icon: 'bar', title: 'Bar', focus: 1.1 },
  orderCounter: { icon: 'bar', title: 'Comptoir de commande', focus: 1.1 },
  pickupCounter: { icon: 'bar', title: 'Comptoir de retrait', focus: 1.1 },
  djBooth: { icon: 'dj', title: 'Régie DJ', focus: 1.1 },
  buffet: { icon: 'buffet', title: 'Buffet', focus: 0.9 },
  entrance: { icon: 'entrance', title: 'Entrée', focus: 1.2 },
  arch: { icon: 'ceremony', title: 'Arche de cérémonie', focus: 1.4 },
  gazebo: { icon: 'ceremony', title: 'Kiosque', focus: 1.4 },
  fountain: { icon: 'ceremony', title: 'Fontaine', focus: 0.9 },
};

const ZONE_SPACES: Record<string, { icon: RoomSpaceIcon; title: string }> = {
  dance: { icon: 'dance', title: 'Piste de danse' },
  vip: { icon: 'vip', title: 'Espace VIP' },
  buffet: { icon: 'buffet', title: 'Buffet' },
  custom: { icon: 'zone', title: 'Zone' },
  plot: { icon: 'zone', title: 'Emplacement' },
};

/** Ordre d’affichage : ce que l’on veut voir en premier dans une salle. */
const ICON_ORDER: RoomSpaceIcon[] = [
  'stage', 'honor', 'dance', 'vip', 'tables', 'rows', 'bar', 'dj', 'buffet', 'ceremony', 'zone', 'entrance',
];

const HONOR_NAME = /honneur|mari[ée]s|d[’']honneur|présidence|presidence|officiel/i;

function finite(n: unknown, fallback: number): number {
  return typeof n === 'number' && Number.isFinite(n) ? n : fallback;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function pctCenterToWorld(xPct: number, yPct: number, widthM: number, depthM: number) {
  return { x: (xPct / 100 - 0.5) * widthM, z: (yPct / 100 - 0.5) * depthM };
}

function plural(n: number, one: string, many: string): string {
  return `${n} ${n > 1 ? many : one}`;
}

function cleanLabel(label: string | undefined, fallback: string): string {
  const trimmed = (label ?? '').replace(/\s+/g, ' ').trim();
  return trimmed.length > 0 ? trimmed.slice(0, 48) : fallback;
}

/** Emprise approximative d’une table (plateau + chaises). */
function tableFootprint(shape: string, capacity: number, oneSide: boolean): { w: number; d: number } {
  const n = Math.max(1, Math.round(capacity) || 1);
  if (oneSide) return { w: Math.min(14, n * 0.62 + 0.3) + 0.6, d: 0.76 + 1.4 };
  if (shape === 'rectangular') return { w: Math.min(12, Math.ceil(n / 2) * 0.62 + 0.1) + 1.2, d: 0.9 + 1.4 };
  if (shape === 'cocktail' || shape === 'highTop') return { w: 1.4, d: 1.4 };
  const diam = Math.max(1.2, Math.min(3, n * 0.2));
  return { w: diam + 1.3, d: diam + 1.3 };
}

/**
 * Liste les espaces « visitables » d’un plan, du plus important au moins important.
 * Les tables d’invités et les rangées sont regroupées en un seul espace chacune.
 */
export function listRoomSpaces(blueprint: RoomLayoutBlueprint, maxSpaces = 14): RoomSpace[] {
  const widthM = finite(blueprint.canvas?.widthM, 20) > 0 ? finite(blueprint.canvas?.widthM, 20) : 20;
  const depthM = finite(blueprint.canvas?.heightM, 16) > 0 ? finite(blueprint.canvas?.heightM, 16) : 16;
  const spaces: RoomSpace[] = [];
  const titleCount = new Map<string, number>();

  for (const f of blueprint.fixtures ?? []) {
    const meta = FIXTURE_SPACES[f.kind];
    if (!meta) continue;
    const w = (finite(f.w, 0) / 100) * widthM;
    const d = (finite(f.h, 0) / 100) * depthM;
    if (w <= 0.05 || d <= 0.05) continue;
    const label = f.label && !/^(scène|scene|bar|buffet|entrée|podium)$/i.test(f.label.trim()) ? f.label : undefined;
    const elevation = f.kind === 'stage' || f.kind === 'podium' ? finite(f.heightM, 0.6) : 0;
    spaces.push({
      id: f.id,
      icon: meta.icon,
      title: cleanLabel(label, meta.title),
      details: [
        `${round1(w)} × ${round1(d)} m`,
        elevation > 0 ? `hauteur ${round1(elevation)} m` : null,
      ].filter(Boolean).join(' · '),
      center: pctCenterToWorld(finite(f.x, 0) + finite(f.w, 0) / 2, finite(f.y, 0) + finite(f.h, 0) / 2, widthM, depthM),
      size: { w, d },
      rotationDeg: finite(f.rotation, 0),
      focusHeightM: meta.focus + elevation * 0.5,
      selection: { kind: 'fixture', id: f.id },
    });
  }

  const guestTables: Array<{ id: string; name: string; x: number; z: number; w: number; d: number; seats: number }> = [];
  const rows: Array<{ x: number; z: number; seats: number }> = [];

  for (const item of blueprint.furniture ?? []) {
    if (item.kind === 'zone') {
      const meta = ZONE_SPACES[item.zoneKind ?? 'custom'] ?? ZONE_SPACES.custom;
      if (item.zoneKind === 'carpet') continue;
      const w = (finite(item.w, 0) / 100) * widthM;
      const d = (finite(item.h, 0) / 100) * depthM;
      if (w <= 0.05 || d <= 0.05) continue;
      const useLabel = item.zoneKind === 'custom' || item.zoneKind === 'plot' || !item.zoneKind;
      spaces.push({
        id: item.id,
        icon: meta.icon,
        title: cleanLabel(useLabel ? item.label : undefined, meta.title),
        details: `${round1(w)} × ${round1(d)} m · ${Math.round(w * d)} m²`,
        center: pctCenterToWorld(finite(item.x, 0) + finite(item.w, 0) / 2, finite(item.y, 0) + finite(item.h, 0) / 2, widthM, depthM),
        size: { w, d },
        rotationDeg: finite(item.rotation, 0),
        focusHeightM: 0.4,
        selection: { kind: 'zone', id: item.id },
      });
    } else if (item.kind === 'table') {
      const oneSide = item.seatingSide === 'oneSide';
      const seats = Math.max(0, Math.round(finite(item.capacity, 0)) - (item.hiddenSeatIndices?.length ?? 0));
      const foot = tableFootprint(item.shape, item.capacity, oneSide);
      const c = pctCenterToWorld(finite(item.x, 50), finite(item.y, 50), widthM, depthM);
      if (oneSide || HONOR_NAME.test(item.name ?? '')) {
        spaces.push({
          id: item.id,
          icon: 'honor',
          title: cleanLabel(item.name, 'Table d’honneur'),
          details: plural(seats, 'place', 'places'),
          center: c,
          size: foot,
          rotationDeg: finite(item.rotation, 0),
          focusHeightM: 0.9,
          selection: { kind: 'table', id: item.id },
          seats,
        });
      } else {
        guestTables.push({ id: item.id, name: item.name ?? '', ...c, ...foot, seats });
      }
    } else if (item.kind === 'row') {
      rows.push({ ...pctCenterToWorld(finite(item.x, 50), finite(item.y, 50), widthM, depthM), seats: Math.max(0, Math.round(finite(item.seatCount, 0))) });
    }
  }

  if (guestTables.length === 1) {
    // Une seule table (salle à manger d’un appartement, table de réunion…) : on la nomme.
    const t = guestTables[0];
    spaces.push({
      id: t.id,
      icon: 'tables',
      title: cleanLabel(t.name, 'Table'),
      details: plural(t.seats, 'place', 'places'),
      center: { x: t.x, z: t.z },
      size: { w: t.w, d: t.d },
      rotationDeg: 0,
      focusHeightM: 0.75,
      selection: { kind: 'table', id: t.id },
      seats: t.seats,
    });
  } else if (guestTables.length > 1) {
    const minX = Math.min(...guestTables.map((t) => t.x - t.w / 2));
    const maxX = Math.max(...guestTables.map((t) => t.x + t.w / 2));
    const minZ = Math.min(...guestTables.map((t) => t.z - t.d / 2));
    const maxZ = Math.max(...guestTables.map((t) => t.z + t.d / 2));
    const seats = guestTables.reduce((sum, t) => sum + t.seats, 0);
    spaces.push({
      id: 'group:tables',
      icon: 'tables',
      title: 'Tables des invités',
      details: `${plural(guestTables.length, 'table', 'tables')} · ${plural(seats, 'place', 'places')}`,
      center: { x: (minX + maxX) / 2, z: (minZ + maxZ) / 2 },
      size: { w: maxX - minX, d: maxZ - minZ },
      rotationDeg: 0,
      focusHeightM: 0.75,
      seats,
    });
  }

  if (rows.length > 0) {
    const minX = Math.min(...rows.map((r) => r.x)) - 3;
    const maxX = Math.max(...rows.map((r) => r.x)) + 3;
    const minZ = Math.min(...rows.map((r) => r.z)) - 0.6;
    const maxZ = Math.max(...rows.map((r) => r.z)) + 0.6;
    const seats = rows.reduce((sum, r) => sum + r.seats, 0);
    spaces.push({
      id: 'group:rows',
      icon: 'rows',
      title: rows.length > 1 ? 'Rangées de sièges' : 'Rangée de sièges',
      details: `${plural(rows.length, 'rangée', 'rangées')} · ${plural(seats, 'place', 'places')}`,
      center: { x: (minX + maxX) / 2, z: (minZ + maxZ) / 2 },
      size: { w: Math.min(widthM, maxX - minX), d: maxZ - minZ },
      rotationDeg: 0,
      focusHeightM: 0.8,
      seats,
    });
  }

  spaces.sort((a, b) => ICON_ORDER.indexOf(a.icon) - ICON_ORDER.indexOf(b.icon));

  // « Bar », « Bar » → « Bar 1 », « Bar 2 » pour qu’on les distingue dans la liste.
  for (const s of spaces) titleCount.set(s.title, (titleCount.get(s.title) ?? 0) + 1);
  const seen = new Map<string, number>();
  for (const s of spaces) {
    if ((titleCount.get(s.title) ?? 0) > 1) {
      const idx = (seen.get(s.title) ?? 0) + 1;
      seen.set(s.title, idx);
      s.title = `${s.title} ${idx}`;
    }
  }

  return spaces.slice(0, Math.max(1, maxSpaces));
}

/** Premier espace d’un type donné (pour les raccourcis Scène / Table VIP). */
export function findRoomSpace(spaces: RoomSpace[], icons: RoomSpaceIcon[]): RoomSpace | undefined {
  for (const icon of icons) {
    const hit = spaces.find((s) => s.icon === icon);
    if (hit) return hit;
  }
  return undefined;
}

/**
 * Cadrage « maquette » d’un espace : vue plongeante à 3/4, depuis le côté
 * le plus proche du centre de la salle, à une distance qui fait tenir
 * l’espace entier dans le champ.
 */
export function roomSpaceCameraPose(
  space: Pick<RoomSpace, 'center' | 'size' | 'focusHeightM'>,
  room: { widthM: number; depthM: number; fovDeg?: number; aspect?: number },
  /** Point à garder dans le dos du visiteur quand l’espace est au centre (ex. la scène). */
  backdrop?: { x: number; z: number },
): CameraPoseLite {
  const fov = ((room.fovDeg ?? 45) * Math.PI) / 180;
  const aspect = room.aspect && room.aspect > 0 ? room.aspect : 1.6;
  const span = Math.max(space.size.w / aspect, space.size.d, 2.2);
  const dist = Math.min(Math.max(room.widthM, room.depthM) * 1.4, Math.max(6, (span * 0.9) / Math.tan(fov / 2) + 2));
  // On regarde depuis le centre de la salle vers l’espace (la scène au fond est vue « de face »).
  let dirX = -space.center.x;
  let dirZ = -space.center.z;
  const len = Math.hypot(dirX, dirZ);
  if (len < Math.max(1.5, Math.min(room.widthM, room.depthM) * 0.15)) {
    // Espace central (tables, piste…) : on le regarde « depuis la salle », la scène en face.
    const bx = backdrop ? space.center.x - backdrop.x : 0;
    const bz = backdrop ? space.center.z - backdrop.z : 1;
    const bl = Math.hypot(bx, bz);
    dirX = bl > 0.5 ? bx / bl : 0;
    dirZ = bl > 0.5 ? bz / bl : 1;
  } else {
    dirX /= len;
    dirZ /= len;
  }
  const pitch = (52 * Math.PI) / 180;
  const horiz = Math.cos(pitch) * dist;
  const target: [number, number, number] = [space.center.x, space.focusHeightM, space.center.z];
  return {
    pos: [space.center.x + dirX * horiz, space.focusHeightM + Math.sin(pitch) * dist, space.center.z + dirZ * horiz],
    target,
  };
}

/**
 * Vue d’ensemble « maquette » : la salle entière vue en plongée à 3/4,
 * comme une maquette d’architecte posée sur une table.
 */
export function dollhouseOverviewPose(room: { widthM: number; depthM: number; fovDeg?: number; aspect?: number }): CameraPoseLite {
  const fov = ((room.fovDeg ?? 45) * Math.PI) / 180;
  const aspect = room.aspect && room.aspect > 0 ? room.aspect : 1.6;
  const diag = Math.hypot(room.widthM, room.depthM);
  const span = Math.max(diag / aspect, room.depthM * 0.9);
  const dist = Math.max(8, (span * 0.72) / Math.tan(fov / 2));
  const yaw = (32 * Math.PI) / 180;
  const pitch = (48 * Math.PI) / 180;
  const horiz = Math.cos(pitch) * dist;
  return {
    pos: [Math.sin(yaw) * horiz, Math.sin(pitch) * dist, Math.cos(yaw) * horiz],
    target: [0, 0.4, 0],
  };
}

/** Hauteur de coupe des murs en vue maquette (m). */
export const DOLLHOUSE_WALL_CUT_M = 1.25;

/**
 * Point de vue « depuis l’entrée » : à hauteur d’yeux, juste après la porte, tourné vers
 * le centre de la salle, comme un invité qui arrive. Sans entrée ni porte sur le plan → null.
 */
export function entranceEyeLevelPose(blueprint: RoomLayoutBlueprint): CameraPoseLite | null {
  const widthM = finite(blueprint.canvas?.widthM, 20) > 0 ? finite(blueprint.canvas?.widthM, 20) : 20;
  const depthM = finite(blueprint.canvas?.heightM, 16) > 0 ? finite(blueprint.canvas?.heightM, 16) : 16;
  const fixtures = blueprint.fixtures ?? [];
  const door = fixtures.find((f) => f.kind === 'entrance') ?? fixtures.find((f) => f.kind === 'door');
  if (!door) return null;
  const c = pctCenterToWorld(finite(door.x, 0) + finite(door.w, 0) / 2, finite(door.y, 0) + finite(door.h, 0) / 2, widthM, depthM);
  const len = Math.hypot(c.x, c.z);
  // Porte au milieu du plan (cas rare) : on regarde vers le nord, comme sur le plan 2D.
  const ux = len > 0.3 ? -c.x / len : 0;
  const uz = len > 0.3 ? -c.z / len : -1;
  const step = Math.min(1.6, Math.max(0.6, len * 0.4));
  const margin = 0.6;
  const px = Math.max(-widthM / 2 + margin, Math.min(widthM / 2 - margin, c.x + ux * step));
  const pz = Math.max(-depthM / 2 + margin, Math.min(depthM / 2 - margin, c.z + uz * step));
  return { pos: [px, 1.65, pz], target: [0, 1.1, 0] };
}
