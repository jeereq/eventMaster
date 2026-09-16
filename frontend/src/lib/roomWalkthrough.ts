import type { RoomLayoutBlueprint, RoomWallOpening, RoomWallSegment } from '@/lib/roomLayoutUtils';
import { resolveBlueprintWalls } from '@/lib/roomLayoutUtils';

export type WalkthroughWaypoint = {
  /** Position caméra monde. */
  position: [number, number, number];
  /** Point regardé. */
  lookAt: [number, number, number];
  /** Durée du segment vers ce point (s). */
  duration: number;
  label?: string;
};

function pctToWorld(xPct: number, yPct: number, widthM: number, heightM: number): [number, number] {
  const x = ((xPct / 100) - 0.5) * widthM;
  const z = ((yPct / 100) - 0.5) * heightM;
  return [x, z];
}

type DoorAnchor = {
  x: number;
  z: number;
  outward: [number, number];
  inward: [number, number];
  widthM: number;
};

function wallDoorAnchor(
  wall: RoomWallSegment,
  opening: RoomWallOpening,
  widthM: number,
  heightM: number,
): DoorAnchor {
  const [sx, sz] = pctToWorld(wall.start.x, wall.start.y, widthM, heightM);
  const [ex, ez] = pctToWorld(wall.end.x, wall.end.y, widthM, heightM);
  const dx = ex - sx;
  const dz = ez - sz;
  const length = Math.hypot(dx, dz) || 1;
  const angle = Math.atan2(dz, dx);
  const midX = (sx + ex) / 2;
  const midZ = (sz + ez) / 2;
  const localX = (opening.t - 0.5) * length;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const doorX = midX + localX * cos;
  const doorZ = midZ + localX * sin;
  // Normale locale +Z après rotation Y = -angle → (-sin, cos)
  let nx = -sin;
  let nz = cos;
  if (midX * nx + midZ * nz < 0) {
    nx = -nx;
    nz = -nz;
  }
  return {
    x: doorX,
    z: doorZ,
    outward: [nx, nz],
    inward: [-nx, -nz],
    widthM: opening.widthM,
  };
}

function findMainDoor(blueprint: RoomLayoutBlueprint): DoorAnchor | null {
  const widthM = blueprint.canvas.widthM;
  const heightM = blueprint.canvas.heightM;
  const walls = resolveBlueprintWalls(blueprint);
  let best: DoorAnchor | null = null;
  let bestScore = -1;
  for (const wall of walls) {
    for (const op of wall.openings ?? []) {
      if (op.kind !== 'door') continue;
      const anchor = wallDoorAnchor(wall, op, widthM, heightM);
      const score = op.widthM * (op.style === 'double' ? 1.4 : 1);
      if (score > bestScore) {
        bestScore = score;
        best = anchor;
      }
    }
  }
  return best;
}

function findNamedFocus(
  blueprint: RoomLayoutBlueprint,
  widthM: number,
  heightM: number,
  nameRe: RegExp,
  kind?: string,
): [number, number, number] | null {
  const item = blueprint.furniture.find((entry) => {
    if (kind && entry.kind !== kind) return false;
    return nameRe.test(entry.name ?? '') || nameRe.test(entry.id ?? '');
  });
  if (!item || typeof item.x !== 'number' || typeof item.y !== 'number') return null;
  const [x, z] = pctToWorld(item.x, item.y, widthM, heightM);
  return [x, 1.15, z];
}

function findKindFocus(
  blueprint: RoomLayoutBlueprint,
  widthM: number,
  heightM: number,
  kind: string,
): [number, number, number] | null {
  const item = blueprint.furniture.find((entry) => entry.kind === kind);
  if (!item || typeof item.x !== 'number' || typeof item.y !== 'number') return null;
  const [x, z] = pctToWorld(item.x, item.y, widthM, heightM);
  return [x, 1.3, z];
}

function fallbackEntrance(widthM: number, heightM: number): DoorAnchor {
  return {
    x: 0,
    z: heightM * 0.48,
    outward: [0, 1],
    inward: [0, -1],
    widthM: 1.2,
  };
}

/**
 * Parcours : extérieur → seuil → entrée → tour de la salle → vue d’ensemble.
 */
export function buildRoomWalkthrough(blueprint: RoomLayoutBlueprint): WalkthroughWaypoint[] {
  const widthM = blueprint.canvas.widthM;
  const heightM = blueprint.canvas.heightM;
  const eye = 1.55;
  const door = findMainDoor(blueprint) ?? fallbackEntrance(widthM, heightM);
  const [ox, oz] = door.outward;
  const [ix, iz] = door.inward;

  const outside: [number, number, number] = [
    door.x + ox * 3.2,
    eye + 0.15,
    door.z + oz * 3.2,
  ];
  const threshold: [number, number, number] = [
    door.x + ox * 0.35,
    eye,
    door.z + oz * 0.35,
  ];
  const justInside: [number, number, number] = [
    door.x + ix * 1.4,
    eye,
    door.z + iz * 1.4,
  ];

  const honor = findNamedFocus(blueprint, widthM, heightM, /honneur|honor/i, 'table');
  const stage = findKindFocus(blueprint, widthM, heightM, 'stage');
  const roomCenter: [number, number, number] = [0, 1.15, 0];

  const rx = widthM * 0.28;
  const rz = heightM * 0.28;
  const tourStops: Array<{ pos: [number, number]; look: [number, number, number]; label: string }> = [
    { pos: [rx * 0.15, rz], look: honor ?? roomCenter, label: honor ? 'Table d’honneur' : 'Allée centrale' },
    { pos: [rx, rz * 0.1], look: stage ?? [rx * 0.2, 1.2, -rz * 0.4], label: stage ? 'La scène' : 'Côté jardin' },
    { pos: [rx * 0.1, -rz], look: [0, 1.4, 0], label: 'Lustres et allées' },
    { pos: [-rx, -rz * 0.15], look: honor ?? roomCenter, label: 'Côté cour' },
    { pos: [-rx * 0.15, rz * 0.5], look: [door.x, eye, door.z], label: 'Retour vers l’entrée' },
  ];

  const waypoints: WalkthroughWaypoint[] = [
    {
      position: outside,
      lookAt: [door.x, eye * 0.85, door.z],
      duration: 2.2,
      label: 'Approche de l’entrée',
    },
    {
      position: threshold,
      lookAt: [door.x + ix * 3, eye, door.z + iz * 3],
      duration: 2.0,
      label: 'Passage de la porte',
    },
    {
      position: justInside,
      lookAt: honor ?? roomCenter,
      duration: 2.4,
      label: 'Entrée dans la salle',
    },
  ];

  for (const stop of tourStops) {
    waypoints.push({
      position: [stop.pos[0], eye + 0.05, stop.pos[1]],
      lookAt: stop.look,
      duration: 2.6,
      label: stop.label,
    });
  }

  waypoints.push({
    position: [0, Math.max(widthM, heightM) * 0.55, heightM * 0.42],
    lookAt: [0, 0.4, 0],
    duration: 3.2,
    label: 'Vue d’ensemble',
  });

  return waypoints;
}

export function walkthroughTotalDuration(waypoints: WalkthroughWaypoint[]): number {
  return waypoints.reduce((sum, w) => sum + w.duration, 0);
}
