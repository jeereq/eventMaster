'use client';

import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { BarStyle } from '@/lib/roomLayoutUtils';
import { SurfaceMat, type SurfaceFinish } from '@/components/room/SurfaceMaterial';
import { resolveTableMaterial } from '@/lib/roomWebGLMaterials';
import { withRepeat } from '@/lib/roomSurfaceFinish';

export { ConcertInstrumentMesh } from '@/components/CatalogueInstrumentMeshes';

const BOTTLE_COLORS: Record<BarStyle, string[]> = {
  cocktail: ['#14532d', '#7f1d1d', '#1e3a5f', '#854d0e', '#4c1d95'],
  wine: ['#3f1d1d', '#4a1515', '#2d1b14', '#5b1a1a'],
  champagne: ['#854d0e', '#a16207', '#713f12', '#ca8a04'],
  beer: ['#92400e', '#b45309', '#78350f'],
  coffee: ['#1c1917', '#44403c', '#292524'],
  whiskey: ['#7c2d12', '#9a3412', '#451a03', '#b45309'],
  island: ['#14532d', '#7f1d1d', '#854d0e', '#1e3a5f'],
  lShaped: ['#14532d', '#7f1d1d', '#1e3a5f', '#854d0e'],
  juice: ['#ea580c', '#65a30d', '#eab308', '#f97316'],
  mocktail: ['#db2777', '#7c3aed', '#06b6d4', '#84cc16'],
  tapas: ['#7f1d1d', '#854d0e', '#14532d'],
  tea: ['#78716c', '#a8a29e', '#44403c', '#d6d3d1'],
};

const BAR_GLASS_MAX = 14;
const BAR_STOOL_MAX = 7;
const BAR_SHELF_COUNT = 3;
/** Pas entre bouteilles sur une étagère (≈ 8 cm de diamètre + jour). */
const BOTTLE_PITCH = 0.088;

const GLASS_TINT: Record<BarStyle, string> = {
  cocktail: '#e0f2fe',
  wine: '#fecaca',
  champagne: '#fef08a',
  beer: '#fbbf24',
  coffee: '#f5f0e8',
  whiskey: '#fdba74',
  island: '#e0f2fe',
  lShaped: '#e0f2fe',
  juice: '#fdba74',
  mocktail: '#f9a8d4',
  tapas: '#fed7aa',
  tea: '#f5f0e8',
};

function Mat({
  color,
  roughness = 0.5,
  metalness = 0.08,
  finish,
  repeat,
  opacity,
}: {
  color: string;
  roughness?: number;
  metalness?: number;
  finish?: SurfaceFinish;
  repeat?: number | [number, number];
  opacity?: number;
}) {
  return (
    <SurfaceMat
      color={color}
      finish={finish ?? 'auto'}
      roughness={roughness}
      metalness={finish === 'wood' || finish === 'leather' || finish === 'glass' ? 0 : metalness}
      repeat={repeat}
      opacity={opacity}
    />
  );
}

/** Plateau marbre du comptoir : même marbre calacatta que les sols / tables, calé sur la longueur. */
function BarMarbleTop({ w, d, color }: { w: number; d: number; color?: string }) {
  const marble = useMemo(() => resolveTableMaterial('rectangular', undefined, undefined, 'marble'), []);
  const rx = Math.max(1, w / 1.6);
  const ry = Math.max(0.5, d / 1.6);
  return (
    <SurfaceMat
      color={color ?? '#ffffff'}
      finish="plain"
      map={withRepeat(marble.map, rx, ry)}
      normalMap={withRepeat(marble.normalMap ?? null, rx, ry)}
      normalScale={0.25}
      roughness={0.12}
      metalness={0}
      clearcoat={0.8}
      clearcoatRoughness={0.06}
    />
  );
}

/* ---------------------------------------------------------------------------------------------
 * Bouteilles et verres tournés (LatheGeometry), rendus en instances : un arrière-bar réel
 * aligne 40 à 60 bouteilles par étagère, impossible à tenir en maillages séparés.
 * ------------------------------------------------------------------------------------------- */

type BottleKind = 'liquor' | 'wine' | 'squat';
type BottleSlot = { x: number; y: number; z: number; kind: BottleKind; color: string; label: string; cap: string };

/** Profils [rayon, hauteur] du pied au goulot, et bande d’étiquette [rayon, bas, haut]. */
const BOTTLE_PROFILES: Record<BottleKind, { pts: Array<[number, number]>; label: [number, number, number] }> = {
  liquor: {
    pts: [[0, 0], [0.034, 0], [0.036, 0.006], [0.036, 0.19], [0.03, 0.215], [0.016, 0.235], [0.013, 0.25], [0.013, 0.285], [0.015, 0.29], [0.015, 0.3], [0, 0.3]],
    label: [0.0368, 0.07, 0.15],
  },
  wine: {
    pts: [[0, 0], [0.036, 0], [0.037, 0.008], [0.037, 0.2], [0.033, 0.23], [0.02, 0.255], [0.0135, 0.27], [0.0135, 0.305], [0.015, 0.31], [0, 0.31]],
    label: [0.0378, 0.06, 0.13],
  },
  squat: {
    pts: [[0, 0], [0.042, 0], [0.045, 0.008], [0.045, 0.13], [0.036, 0.16], [0.017, 0.175], [0.016, 0.205], [0.018, 0.21], [0, 0.21]],
    label: [0.0458, 0.035, 0.11],
  },
};
const BOTTLE_KINDS: BottleKind[] = ['liquor', 'wine', 'squat'];
const LABEL_COLORS = ['#f5ecd7', '#fafaf9', '#1c1917', '#d6b46a', '#e7e5e4', '#7f1d1d'];
const CAP_COLORS = ['#d4af37', '#1c1917', '#b8b8bd', '#7c2d12'];

/** Pseudo-aléatoire déterministe : même rayonnage d’un rendu à l’autre. */
function rand(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function pickBottleKind(style: BarStyle, r: number): BottleKind {
  if (style === 'wine' || style === 'champagne') return r < 0.8 ? 'wine' : 'liquor';
  if (style === 'whiskey') return r < 0.55 ? 'squat' : 'liquor';
  if (style === 'coffee' || style === 'tea' || style === 'juice') return r < 0.6 ? 'squat' : 'liquor';
  return r < 0.6 ? 'liquor' : r < 0.82 ? 'squat' : 'wine';
}

function bottleSlot(style: BarStyle, colors: string[], seed: number, x: number, y: number, z: number): BottleSlot {
  return {
    x,
    y,
    z,
    kind: pickBottleKind(style, rand(seed * 3.1)),
    color: colors[Math.floor(rand(seed * 5.7) * colors.length) % colors.length],
    label: LABEL_COLORS[Math.floor(rand(seed * 7.3) * LABEL_COLORS.length) % LABEL_COLORS.length],
    cap: CAP_COLORS[Math.floor(rand(seed * 9.1) * CAP_COLORS.length) % CAP_COLORS.length],
  };
}

/** Rangées de bouteilles serrées sur des étagères (quelques jours pour éviter l’effet « mur »). */
function shelfSlots(style: BarStyle, colors: string[], width: number, rows: Array<{ y: number; fill: number }>, z: number): BottleSlot[] {
  const out: BottleSlot[] = [];
  const n = Math.max(1, Math.floor(width / BOTTLE_PITCH));
  rows.forEach(({ y, fill }, row) => {
    for (let i = 0; i < n; i += 1) {
      const seed = row * 131 + i * 17 + 3;
      if (rand(seed) > fill) continue;
      const x = (i + 0.5 - n / 2) * BOTTLE_PITCH + (rand(seed + 1) - 0.5) * 0.012;
      out.push(bottleSlot(style, colors, seed, x, y, z + (rand(seed + 2) - 0.5) * 0.04));
    }
  });
  return out;
}

type InstanceItem = { m: THREE.Matrix4; c?: string };

function ColoredInstances({
  geometry,
  material,
  items,
  castShadow = false,
}: {
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  items: InstanceItem[];
  castShadow?: boolean;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const col = new THREE.Color();
    items.forEach((it, i) => {
      mesh.setMatrixAt(i, it.m);
      if (it.c) mesh.setColorAt(i, col.set(it.c));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [items]);
  if (!items.length) return null;
  return <instancedMesh key={items.length} ref={ref} args={[geometry, material, items.length]} castShadow={castShadow} />;
}

function lathe(pts: Array<[number, number]>, segments = 14): THREE.LatheGeometry {
  return new THREE.LatheGeometry(pts.map(([r, h]) => new THREE.Vector2(r, h)), segments);
}

function trs(x: number, y: number, z: number, sx = 1, sy = 1, sz = 1, rotY = 0): THREE.Matrix4 {
  return new THREE.Matrix4().compose(
    new THREE.Vector3(x, y, z),
    new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rotY),
    new THREE.Vector3(sx, sy, sz),
  );
}

function BottleSet({ slots }: { slots: BottleSlot[] }) {
  const geos = useMemo(() => {
    const out = {} as Record<BottleKind, THREE.BufferGeometry>;
    for (const kind of BOTTLE_KINDS) out[kind] = lathe(BOTTLE_PROFILES[kind].pts);
    return out;
  }, []);
  const labelGeo = useMemo(() => new THREE.CylinderGeometry(1, 1, 1, 14, 1, true), []);
  const capGeo = useMemo(() => new THREE.CylinderGeometry(0.0165, 0.0165, 0.022, 10), []);
  const glass = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: '#ffffff',
        roughness: 0.08,
        metalness: 0,
        transparent: true,
        opacity: 0.9,
        clearcoat: 1,
        clearcoatRoughness: 0.04,
        envMapIntensity: 1.3,
      }),
    [],
  );
  const paper = useMemo(() => new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.7, side: THREE.DoubleSide }), []);
  const capMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.3, metalness: 0.65 }), []);
  const parts = useMemo(() => {
    const bodies = {} as Record<BottleKind, InstanceItem[]>;
    const labels = {} as Record<BottleKind, InstanceItem[]>;
    for (const kind of BOTTLE_KINDS) {
      bodies[kind] = [];
      labels[kind] = [];
    }
    const caps: InstanceItem[] = [];
    for (const s of slots) {
      const rot = rand(s.x * 91 + s.y * 7) * Math.PI * 2;
      bodies[s.kind].push({ m: trs(s.x, s.y, s.z, 1, 1, 1, rot), c: s.color });
      const [lr, l0, l1] = BOTTLE_PROFILES[s.kind].label;
      labels[s.kind].push({ m: trs(s.x, s.y + (l0 + l1) / 2, s.z, lr, l1 - l0, lr, rot), c: s.label });
      const top = BOTTLE_PROFILES[s.kind].pts[BOTTLE_PROFILES[s.kind].pts.length - 1][1];
      caps.push({ m: trs(s.x, s.y + top - 0.006, s.z), c: s.cap });
    }
    return { bodies, labels, caps };
  }, [slots]);
  return (
    <group>
      {BOTTLE_KINDS.map((kind) => (
        <group key={kind}>
          <ColoredInstances geometry={geos[kind]} material={glass} items={parts.bodies[kind]} castShadow />
          <ColoredInstances geometry={labelGeo} material={paper} items={parts.labels[kind]} />
        </group>
      ))}
      <ColoredInstances geometry={capGeo} material={capMat} items={parts.caps} />
    </group>
  );
}

/** Verre (profil tourné) et liquide éventuel, selon le style de bar. */
const GLASS_PROFILES: Record<'wine' | 'flute' | 'coupe' | 'rocks' | 'pint' | 'highball' | 'cup', Array<[number, number]>> = {
  wine: [[0, 0], [0.034, 0], [0.034, 0.004], [0.004, 0.008], [0.004, 0.1], [0.022, 0.112], [0.042, 0.14], [0.043, 0.168], [0.036, 0.2]],
  flute: [[0, 0], [0.03, 0], [0.03, 0.004], [0.0035, 0.008], [0.0035, 0.09], [0.016, 0.1], [0.023, 0.15], [0.025, 0.215]],
  coupe: [[0, 0], [0.034, 0], [0.034, 0.004], [0.0035, 0.008], [0.0035, 0.1], [0.03, 0.118], [0.05, 0.14], [0.056, 0.15]],
  rocks: [[0, 0], [0.037, 0], [0.039, 0.014], [0.04, 0.088]],
  pint: [[0, 0], [0.029, 0], [0.031, 0.012], [0.041, 0.15]],
  highball: [[0, 0], [0.03, 0], [0.031, 0.012], [0.033, 0.15]],
  cup: [[0, 0], [0.021, 0], [0.026, 0.006], [0.031, 0.05], [0.033, 0.062]],
};

type GlassSpec = {
  profile: keyof typeof GLASS_PROFILES;
  /** Liquide : [rayon bas, rayon haut, bas, haut] */
  liquid?: [number, number, number, number];
  saucer?: boolean;
};

function glassSpec(style: BarStyle): GlassSpec {
  switch (style) {
    case 'wine':
    case 'tapas':
      return { profile: 'wine', liquid: [0.024, 0.036, 0.118, 0.145] };
    case 'champagne':
      return { profile: 'flute', liquid: [0.014, 0.022, 0.1, 0.18] };
    case 'beer':
      return { profile: 'pint', liquid: [0.03, 0.039, 0.014, 0.135] };
    case 'whiskey':
      return { profile: 'rocks', liquid: [0.036, 0.037, 0.014, 0.04] };
    case 'juice':
    case 'mocktail':
      return { profile: 'highball', liquid: [0.029, 0.031, 0.014, 0.12] };
    case 'coffee':
    case 'tea':
      return { profile: 'cup', liquid: [0.028, 0.028, 0.04, 0.052], saucer: true };
    default:
      return { profile: 'coupe', liquid: [0.012, 0.046, 0.108, 0.134] };
  }
}

function BarGlassSet({ style, positions, y }: { style: BarStyle; positions: Array<[number, number]>; y: number }) {
  const spec = glassSpec(style);
  const ceramic = spec.profile === 'cup';
  const glassGeo = useMemo(() => lathe(GLASS_PROFILES[spec.profile], 18), [spec.profile]);
  const liquidGeo = useMemo(() => {
    if (!spec.liquid) return null;
    const [r0, r1, y0, y1] = spec.liquid;
    const g = new THREE.CylinderGeometry(r1, r0, y1 - y0, 16);
    g.translate(0, (y0 + y1) / 2, 0);
    return g;
  }, [spec.liquid]);
  const saucerGeo = useMemo(() => lathe([[0, 0], [0.05, 0], [0.065, 0.012], [0.066, 0.014]], 20), []);
  const glassMat = useMemo(
    () =>
      ceramic
        ? new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.25, side: THREE.DoubleSide })
        : new THREE.MeshPhysicalMaterial({
            color: '#f8fafc',
            roughness: 0.04,
            metalness: 0,
            transparent: true,
            opacity: 0.3,
            depthWrite: false,
            side: THREE.DoubleSide,
            clearcoat: 1,
            envMapIntensity: 1.5,
          }),
    [ceramic],
  );
  const liquidMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: ceramic ? '#3b2415' : GLASS_TINT[style],
        roughness: 0.15,
        transparent: !ceramic,
        opacity: ceramic ? 1 : 0.82,
      }),
    [ceramic, style],
  );
  const items = useMemo(() => positions.map(([x, z]) => ({ m: trs(x, y + (spec.saucer ? 0.012 : 0), z) })), [positions, y, spec.saucer]);
  const saucers = useMemo(() => (spec.saucer ? positions.map(([x, z]) => ({ m: trs(x, y, z) })) : []), [positions, y, spec.saucer]);
  return (
    <group>
      <ColoredInstances geometry={glassGeo} material={glassMat} items={items} />
      {liquidGeo ? <ColoredInstances geometry={liquidGeo} material={liquidMat} items={items} /> : null}
      {saucers.length ? <ColoredInstances geometry={saucerGeo} material={glassMat} items={saucers} /> : null}
    </group>
  );
}

/** Tabouret de bar : piètement chromé lesté, repose-pieds, assise capitonnée et dossier bas. */
function BarStool({ x, z }: { x: number; z: number }) {
  const seatGeo = useMemo(() => lathe([[0, 0], [0.16, 0], [0.18, 0.015], [0.19, 0.045], [0.182, 0.07], [0.15, 0.085], [0, 0.088]], 24), []);
  const baseGeo = useMemo(() => lathe([[0, 0.022], [0.2, 0.012], [0.22, 0.004], [0.22, 0], [0, 0]], 28), []);
  return (
    <group position={[x, 0, z]}>
      <mesh geometry={baseGeo} castShadow receiveShadow>
        <SurfaceMat color="#d4d4d8" finish="chrome" metalness={1} roughness={0.1} />
      </mesh>
      <mesh position={[0, 0.37, 0]} castShadow>
        <cylinderGeometry args={[0.024, 0.03, 0.7, 14]} />
        <SurfaceMat color="#d4d4d8" finish="chrome" metalness={1} roughness={0.1} />
      </mesh>
      <mesh position={[0, 0.3, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <torusGeometry args={[0.17, 0.011, 8, 28]} />
        <SurfaceMat color="#d4d4d8" finish="chrome" metalness={1} roughness={0.1} />
      </mesh>
      {[0, 1, 2].map((k) => (
        <mesh key={k} position={[Math.sin((k * Math.PI * 2) / 3) * 0.085, 0.3, Math.cos((k * Math.PI * 2) / 3) * 0.085]} rotation={[0, (k * Math.PI * 2) / 3, Math.PI / 2]}>
          <cylinderGeometry args={[0.007, 0.007, 0.17, 6]} />
          <SurfaceMat color="#d4d4d8" finish="chrome" metalness={1} roughness={0.1} />
        </mesh>
      ))}
      <mesh position={[0, 0.7, 0]} geometry={seatGeo} castShadow receiveShadow>
        <SurfaceMat color="#4a2c1d" finish="leather" roughness={0.55} />
      </mesh>
      {/* Dossier bas cintré, côté salle (+z) */}
      <mesh position={[0, 0.86, 0]} castShadow>
        <cylinderGeometry args={[0.185, 0.18, 0.11, 24, 1, true, -Math.PI * 0.38, Math.PI * 0.76]} />
        <SurfaceMat color="#4a2c1d" finish="leather" roughness={0.55} side={THREE.DoubleSide} />
      </mesh>
      {[-0.5, 0.5].map((s) => (
        <mesh key={s} position={[Math.sin(s) * 0.17, 0.79, Math.cos(s) * 0.17]} castShadow>
          <cylinderGeometry args={[0.009, 0.009, 0.12, 6]} />
          <SurfaceMat color="#d4d4d8" finish="chrome" metalness={1} roughness={0.1} />
        </mesh>
      ))}
    </group>
  );
}

type EventBarMeshProps = {
  w: number;
  d: number;
  height?: number;
  style?: BarStyle;
  color?: string;
  selected?: boolean;
};

export function EventBarMesh(props: EventBarMeshProps) {
  // Emprise « en longueur » dans le sens de la profondeur (bar dessiné verticalement sur le plan) :
  // on oriente le comptoir sur le grand côté au lieu d’écraser un bar de 6 m en 1,8 m de façade.
  const { w, d, style = 'cocktail' } = props;
  if (style !== 'island' && d > w * 1.25) {
    return (
      <group rotation={[0, Math.PI / 2, 0]}>
        <EventBarBody {...props} w={d} d={w} />
      </group>
    );
  }
  return <EventBarBody {...props} />;
}

/** Hauteur du plan de travail barman (sous le comptoir client). */
const WORK_TOP_Y = 0.9;
/** Profondeur de la rehausse côté clients qui porte le comptoir marbre. */
const RISER_D = 0.32;

/**
 * Comptoir : rehausse côté clients (façade à tasseaux + plateau marbre en surplomb) et, derrière,
 * plan de travail inox à 90 cm avec bac à glace et rail de bouteilles côté barman.
 * Repère local : clients vers +z.
 */
function BarCounter({
  cw,
  cd,
  height,
  body,
  style,
  colors,
  glasses = 0,
}: {
  cw: number;
  cd: number;
  height: number;
  body: string;
  style: BarStyle;
  colors: string[];
  glasses?: number;
}) {
  const topY = height;
  const riserD = Math.min(RISER_D, cd * 0.5);
  const workD = Math.max(0.1, cd - riserD);
  const riserZ = cd / 2 - riserD / 2;
  const workZ = -cd / 2 + workD / 2;
  const barTopD = riserD + 0.14;
  const barTopZ = cd / 2 - riserD + barTopD / 2;
  const slatCount = Math.max(6, Math.min(28, Math.round(cw * 5)));
  const railSlots = useMemo(() => {
    const n = Math.max(3, Math.min(10, Math.floor((cw * 0.45) / BOTTLE_PITCH)));
    return Array.from({ length: n }, (_, i) => bottleSlot(style, colors, i * 29 + 7, (i + 0.5 - n / 2) * BOTTLE_PITCH + cw * 0.18, 0.52, -cd / 2 - 0.055));
  }, [cw, cd, style, colors]);
  const glassPositions = useMemo<Array<[number, number]>>(
    () => Array.from({ length: glasses }, (_, i) => [((i + 0.5) / glasses - 0.5) * cw * 0.72 + (rand(i + 5) - 0.5) * 0.08, barTopZ + 0.03 + (rand(i * 3 + 1) - 0.5) * 0.08]),
    [glasses, cw, barTopZ],
  );
  const iceW = Math.min(0.9, cw * 0.28);
  return (
    <>
      {/* Rehausse côté clients : pleine hauteur jusque sous le marbre (aucun jour) */}
      <mesh position={[0, (topY - 0.05) / 2, riserZ]} castShadow receiveShadow>
        <boxGeometry args={[cw, topY - 0.05, riserD]} />
        <Mat color={body} finish="wood" roughness={0.5} repeat={[Math.max(1, cw / 1.2), 1]} />
      </mesh>
      {/* Caisson barman, habillé inox */}
      <mesh position={[0, (WORK_TOP_Y - 0.02) / 2, workZ]} castShadow receiveShadow>
        <boxGeometry args={[cw, WORK_TOP_Y - 0.02, workD]} />
        <SurfaceMat color="#a1a1aa" finish="metal" metalness={0.85} roughness={0.32} />
      </mesh>
      {/* Façade à tasseaux verticaux */}
      {Array.from({ length: slatCount }).map((_, si) => {
        const sx = ((si + 0.5) / slatCount - 0.5) * (cw * 0.94);
        return (
          <mesh key={`slat-${si}`} position={[sx, (topY - 0.05) / 2 + 0.03, cd / 2 + 0.01]} castShadow>
            <boxGeometry args={[Math.max(0.015, (cw * 0.8) / (slatCount * 1.6)), topY - 0.2, 0.02]} />
            <SurfaceMat color="#6b4a2e" finish="wood" roughness={0.55} repeat={[1, 0.3]} vertical />
          </mesh>
        );
      })}
      <mesh position={[0, 0.05, cd / 2 - 0.02]} castShadow>
        <boxGeometry args={[cw * 0.99, 0.1, 0.06]} />
        <Mat color="#09090b" roughness={0.7} />
      </mesh>
      {/* Plateau marbre avec surplomb côté clients */}
      <mesh position={[0, topY - 0.025, barTopZ]} receiveShadow castShadow>
        <boxGeometry args={[cw + 0.06, 0.05, barTopD]} />
        <BarMarbleTop w={cw} d={barTopD} />
      </mesh>
      <mesh position={[0, topY - 0.056, cd / 2 + 0.11]}>
        <boxGeometry args={[cw, 0.01, 0.02]} />
        <meshStandardMaterial color="#fef3c7" emissive="#fbbf24" emissiveIntensity={0.9} roughness={0.1} />
      </mesh>
      {/* Tapis de service caoutchouc sur le bord barman du comptoir */}
      <mesh position={[0, topY + 0.004, cd / 2 - riserD + 0.06]}>
        <boxGeometry args={[Math.min(1.2, cw * 0.35), 0.008, 0.1]} />
        <Mat color="#18181b" roughness={0.85} />
      </mesh>
      {/* Plan de travail inox + bac à glace */}
      <mesh position={[0, WORK_TOP_Y - 0.01, workZ]} receiveShadow>
        <boxGeometry args={[cw, 0.02, workD]} />
        <SurfaceMat color="#d4d4d8" finish="metal" metalness={0.95} roughness={0.2} />
      </mesh>
      <group position={[-cw * 0.12, WORK_TOP_Y, workZ]}>
        <mesh position={[0, 0.012, 0]}>
          <boxGeometry args={[iceW + 0.04, 0.024, workD * 0.78 + 0.04]} />
          <SurfaceMat color="#e4e4e7" finish="metal" metalness={0.95} roughness={0.15} />
        </mesh>
        <mesh position={[0, 0.02, 0]}>
          <boxGeometry args={[iceW, 0.012, workD * 0.78]} />
          <meshPhysicalMaterial color="#eef8fc" roughness={0.35} transmission={0.2} clearcoat={0.6} emissive="#dbeafe" emissiveIntensity={0.08} />
        </mesh>
      </group>
      {/* Rail de bouteilles côté barman */}
      <mesh position={[cw * 0.18, 0.52, -cd / 2 - 0.055]} castShadow>
        <boxGeometry args={[Math.min(cw * 0.5, railSlots.length * BOTTLE_PITCH + 0.06), 0.1, 0.1]} />
        <SurfaceMat color="#c4c4c8" finish="metal" metalness={0.95} roughness={0.24} />
      </mesh>
      <BottleSet slots={railSlots} />
      {/* Repose-pieds laiton */}
      <group position={[0, 0.2, cd / 2 + 0.12]}>
        <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.022, 0.022, cw * 0.94, 14]} />
          <SurfaceMat color="#d4af37" finish="brass" metalness={0.95} roughness={0.22} repeat={[1, 6]} />
        </mesh>
        {Array.from({ length: Math.max(2, Math.round(cw / 1.2) + 1) }).map((_, spi, arr) => (
          <mesh key={spi} position={[((spi / (arr.length - 1)) - 0.5) * cw * 0.88, 0, -0.06]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.012, 0.012, 0.12, 8]} />
            <SurfaceMat color="#d4af37" finish="brass" metalness={0.95} roughness={0.22} />
          </mesh>
        ))}
      </group>
      {glasses ? <BarGlassSet style={style} positions={glassPositions} y={topY} /> : null}
    </>
  );
}

/** Arrière-bar : meuble bas à portes, miroir bronze, étagères verre rétroéclairées, corniche LED. */
function BackBar({ w, backD, style, colors }: { w: number; backD: number; style: BarStyle; colors: string[] }) {
  const baseH = 0.9;
  const shelfYs = Array.from({ length: BAR_SHELF_COUNT }, (_, k) => baseH + 0.42 + k * 0.38);
  const panelH = shelfYs[shelfYs.length - 1] - baseH + 0.44;
  const W = w * 0.96;
  const shelfW = W * 0.94;
  const shelfZ = -backD / 2 + 0.17;
  const doorCount = Math.max(2, Math.round(W / 0.6));
  const moduleCount = Math.max(1, Math.round(W / 1.3));
  const slots = useMemo(
    () =>
      shelfSlots(
        style,
        colors,
        shelfW - 0.1,
        [{ y: baseH + 0.03, fill: 0.55 }, ...shelfYs.map((y) => ({ y: y + 0.012, fill: 0.9 }))],
        shelfZ,
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [style, colors, shelfW, shelfZ],
  );
  return (
    <group>
      {/* Socle en retrait + meuble bas */}
      <mesh position={[0, 0.05, 0.03]} receiveShadow>
        <boxGeometry args={[W - 0.04, 0.1, backD - 0.06]} />
        <Mat color="#0c0a09" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.1 + (baseH - 0.13) / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[W, baseH - 0.13, backD]} />
        <Mat color="#2a1d14" finish="wood" roughness={0.55} repeat={[Math.max(1, W / 1.2), 1]} />
      </mesh>
      {Array.from({ length: doorCount }).map((_, i) => {
        const dw = W / doorCount;
        const x = (i + 0.5 - doorCount / 2) * dw;
        return (
          <group key={`door-${i}`} position={[x, 0.1 + (baseH - 0.13) / 2, backD / 2 + 0.008]}>
            <mesh castShadow>
              <boxGeometry args={[dw - 0.012, baseH - 0.19, 0.016]} />
              <SurfaceMat color="#3a2618" finish="wood" roughness={0.45} repeat={[0.6, 1]} vertical />
            </mesh>
            <mesh position={[(i % 2 ? -1 : 1) * (dw / 2 - 0.06), 0.1, 0.02]}>
              <boxGeometry args={[0.012, 0.18, 0.018]} />
              <SurfaceMat color="#d4af37" finish="brass" metalness={0.95} roughness={0.2} />
            </mesh>
          </group>
        );
      })}
      <mesh position={[0, baseH - 0.015, 0.01]} castShadow receiveShadow>
        <boxGeometry args={[W + 0.02, 0.03, backD + 0.04]} />
        <SurfaceMat color="#27272a" finish="stone" roughness={0.3} />
      </mesh>
      {/* Panneau de fond bois + miroir bronze */}
      <mesh position={[0, baseH + panelH / 2, -backD / 2 + 0.02]} castShadow>
        <boxGeometry args={[W, panelH, 0.04]} />
        <SurfaceMat color="#3a2618" finish="wood" roughness={0.5} repeat={[Math.max(1, W / 1.2), 1]} />
      </mesh>
      <mesh position={[0, baseH + (panelH - 0.12) / 2 + 0.02, -backD / 2 + 0.045]}>
        <boxGeometry args={[shelfW, panelH - 0.12, 0.008]} />
        <meshPhysicalMaterial color="#c9a27e" roughness={0.07} metalness={1} clearcoat={1} clearcoatRoughness={0.05} envMapIntensity={1.1} />
      </mesh>
      {/* Montants de module */}
      {Array.from({ length: moduleCount + 1 }).map((_, i) => (
        <mesh key={`post-${i}`} position={[((i / moduleCount) - 0.5) * (W - 0.05), baseH + panelH / 2, -backD / 2 + 0.16]} castShadow>
          <boxGeometry args={[0.05, panelH, 0.26]} />
          <SurfaceMat color="#2a1d14" finish="wood" roughness={0.5} repeat={[0.3, 1]} vertical />
        </mesh>
      ))}
      {/* Étagères verre + réglette LED sous le chant avant */}
      {shelfYs.map((y) => (
        <group key={`shelf-${y}`} position={[0, y, shelfZ]}>
          <mesh receiveShadow>
            <boxGeometry args={[shelfW, 0.018, 0.26]} />
            <meshPhysicalMaterial color="#d8efe9" roughness={0.05} transparent opacity={0.45} clearcoat={1} />
          </mesh>
          <mesh position={[0, -0.014, 0.115]}>
            <boxGeometry args={[shelfW, 0.008, 0.012]} />
            <meshStandardMaterial color="#fff7e6" emissive="#fbbf24" emissiveIntensity={1.1} />
          </mesh>
        </group>
      ))}
      {/* Corniche avec bandeau LED */}
      <mesh position={[0, baseH + panelH + 0.05, -backD / 2 + 0.16]} castShadow>
        <boxGeometry args={[W + 0.04, 0.1, 0.3]} />
        <SurfaceMat color="#2a1d14" finish="wood" roughness={0.5} repeat={[Math.max(1, W / 1.2), 1]} />
      </mesh>
      <mesh position={[0, baseH + panelH - 0.004, -backD / 2 + 0.28]}>
        <boxGeometry args={[W * 0.96, 0.008, 0.015]} />
        <meshStandardMaterial color="#fff7e6" emissive="#fbbf24" emissiveIntensity={1.1} />
      </mesh>
      <BottleSet slots={slots} />
    </group>
  );
}

/** Colonne à bière : fût chromé en T, becs verseurs vers le barman, manettes et égouttoir. */
function BeerTower({ taps = 4 }: { taps?: number }) {
  const span = 0.12 * (taps - 1) + 0.12;
  return (
    <group>
      <mesh position={[0, 0.006, -0.08]}>
        <boxGeometry args={[span + 0.1, 0.012, 0.14]} />
        <SurfaceMat color="#d4d4d8" finish="chrome" metalness={1} roughness={0.12} />
      </mesh>
      <mesh position={[0, 0.2, 0]} castShadow>
        <cylinderGeometry args={[0.035, 0.045, 0.4, 16]} />
        <SurfaceMat color="#e5e7eb" finish="chrome" metalness={1} roughness={0.08} />
      </mesh>
      <mesh position={[0, 0.4, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.04, 0.04, span, 18]} />
        <SurfaceMat color="#e5e7eb" finish="chrome" metalness={1} roughness={0.08} />
      </mesh>
      {Array.from({ length: taps }).map((_, i) => {
        const x = (i - (taps - 1) / 2) * 0.12;
        return (
          <group key={i} position={[x, 0.4, -0.04]}>
            <mesh position={[0, -0.02, -0.03]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.012, 0.012, 0.06, 10]} />
              <SurfaceMat color="#e5e7eb" finish="chrome" metalness={1} roughness={0.08} />
            </mesh>
            <mesh position={[0, -0.06, -0.06]}>
              <cylinderGeometry args={[0.008, 0.01, 0.06, 8]} />
              <SurfaceMat color="#e5e7eb" finish="chrome" metalness={1} roughness={0.08} />
            </mesh>
            <mesh position={[0, 0.08, -0.05]} rotation={[-0.15, 0, 0]} castShadow>
              <cylinderGeometry args={[0.014, 0.01, 0.16, 10]} />
              <Mat color={['#1c1917', '#7c2d12', '#14532d', '#1e3a5f'][i % 4]} roughness={0.35} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

/** Machine expresso deux groupes posée sur le plan de travail. */
function EspressoMachine() {
  return (
    <group>
      <mesh position={[0, 0.2, 0]} castShadow>
        <boxGeometry args={[0.62, 0.4, 0.5]} />
        <SurfaceMat color="#e5e7eb" finish="chrome" metalness={1} roughness={0.12} />
      </mesh>
      <mesh position={[0, 0.2, 0.251]}>
        <boxGeometry args={[0.56, 0.16, 0.004]} />
        <Mat color="#18181b" roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.41, 0]}>
        <boxGeometry args={[0.6, 0.02, 0.48]} />
        <SurfaceMat color="#a1a1aa" finish="metal" metalness={0.9} roughness={0.3} />
      </mesh>
      {[-0.15, 0.15].map((x) => (
        <group key={x} position={[x, 0.1, 0.28]}>
          <mesh>
            <cylinderGeometry args={[0.04, 0.04, 0.05, 14]} />
            <SurfaceMat color="#d4d4d8" finish="chrome" metalness={1} roughness={0.1} />
          </mesh>
          <mesh position={[0, -0.02, 0.08]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.012, 0.012, 0.14, 8]} />
            <Mat color="#18181b" roughness={0.4} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function EventBarBody({
  w,
  d,
  height = 1.15,
  style = 'cocktail',
  color,
  selected = false,
}: EventBarMeshProps) {
  const body = selected ? '#c7d2fe' : color ?? '#292524';
  const bottles = BOTTLE_COLORS[style] ?? BOTTLE_COLORS.cocktail;
  const glassCount = Math.min(BAR_GLASS_MAX, Math.max(3, Math.round(w * 1.4)));
  const stoolCount = Math.min(BAR_STOOL_MAX, Math.max(2, Math.floor(w / 0.62)));
  const isIsland = style === 'island';
  const isL = style === 'lShaped';

  // Implantation réaliste : comptoir client à l’avant (≈ 70 cm), allée barman, arrière-bar
  // posé contre le fond — et non un bloc plein de toute la profondeur.
  const counterD = Math.min(0.75, Math.max(0.5, d * 0.42));
  const counterZ = d / 2 - counterD / 2;
  const backD = Math.min(0.5, Math.max(0.35, d * 0.28));
  const backZ = -d / 2 + backD / 2;
  const frontZ = d / 2;
  const riserD = Math.min(RISER_D, counterD * 0.5);
  // Plan de travail barman (accessoires de service), derrière la rehausse.
  const workZ = counterZ - riserD / 2;
  const workY = WORK_TOP_Y;
  const barTopZ = counterZ + counterD / 2 - riserD / 2;

  const towerSlots = useMemo(
    () =>
      [1.25, 1.62, 1.99].flatMap((y, k) =>
        Array.from({ length: 10 }, (_, i) => {
          const ang = (i / 10) * Math.PI * 2 + k * 0.3;
          return bottleSlot(style, bottles, k * 41 + i * 7 + 1, Math.cos(ang) * 0.33, y + 0.012, Math.sin(ang) * 0.33);
        }),
      ),
    [style, bottles],
  );

  const counterProps = { height, body, style, colors: bottles };

  return (
    <group>
      {isIsland ? (
        <>
          {/* Îlot : comptoir sur les 4 côtés, barman au centre, tour à bouteilles */}
          <group position={[0, 0, d / 2 - counterD / 2]}>
            <BarCounter cw={w} cd={counterD} glasses={glassCount} {...counterProps} />
          </group>
          <group position={[0, 0, -d / 2 + counterD / 2]} rotation={[0, Math.PI, 0]}>
            <BarCounter cw={w} cd={counterD} glasses={glassCount} {...counterProps} />
          </group>
          <group position={[w / 2 - counterD / 2, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
            <BarCounter cw={Math.max(0.4, d - counterD * 2)} cd={counterD} {...counterProps} />
          </group>
          <group position={[-w / 2 + counterD / 2, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
            <BarCounter cw={Math.max(0.4, d - counterD * 2)} cd={counterD} {...counterProps} />
          </group>
          <group>
            <mesh position={[0, 1.2, 0]} castShadow>
              <cylinderGeometry args={[0.05, 0.05, 2.4, 12]} />
              <SurfaceMat color="#1c1917" finish="metal" roughness={0.35} />
            </mesh>
            {[1.25, 1.62, 1.99].map((y) => (
              <group key={y} position={[0, y, 0]}>
                <mesh>
                  <cylinderGeometry args={[0.44, 0.44, 0.02, 40]} />
                  <meshPhysicalMaterial color="#d8efe9" roughness={0.05} transparent opacity={0.45} clearcoat={1} />
                </mesh>
                <mesh position={[0, -0.014, 0]} rotation={[Math.PI / 2, 0, 0]}>
                  <torusGeometry args={[0.44, 0.006, 6, 48]} />
                  <meshStandardMaterial color="#fff7e6" emissive="#fbbf24" emissiveIntensity={1.1} />
                </mesh>
              </group>
            ))}
            <BottleSet slots={towerSlots} />
          </group>
          {[1, -1].flatMap((side) =>
            Array.from({ length: stoolCount }).map((_, i) => (
              <group key={`s-${side}-${i}`} position={[((i + 0.5) / stoolCount - 0.5) * w * 0.82, 0, side * (d / 2 + 0.42)]} rotation={[0, side > 0 ? 0 : Math.PI, 0]}>
                <BarStool x={0} z={0} />
              </group>
            )),
          )}
        </>
      ) : (
        <>
          <group position={[0, 0, counterZ]}>
            <BarCounter cw={w} cd={counterD} glasses={glassCount} {...counterProps} />
          </group>
          {isL ? (
            // Retour d’angle sur le côté gauche, jusqu’à l’arrière-bar.
            <group position={[-w / 2 + counterD / 2, 0, (counterZ - counterD / 2 + backZ + backD / 2) / 2]} rotation={[0, -Math.PI / 2, 0]}>
              <BarCounter cw={Math.max(0.4, counterZ - counterD / 2 - (backZ + backD / 2))} cd={counterD} {...counterProps} />
            </group>
          ) : null}
          <group position={[0, 0, backZ]}>
            <BackBar w={w} backD={backD} style={style} colors={bottles} />
          </group>
          {Array.from({ length: stoolCount }).map((_, i) => {
            const x = ((i + 0.5) / stoolCount - 0.5) * w * 0.86;
            return <BarStool key={`s-${i}`} x={x} z={frontZ + 0.42} />;
          })}
        </>
      )}

      {/* Shaker et planche sur le plan de travail barman */}
      <group position={[w * 0.3, workY, workZ]}>
        <mesh position={[0, 0.09, 0]} castShadow>
          <cylinderGeometry args={[0.045, 0.035, 0.18, 16]} />
          <SurfaceMat color="#e5e7eb" finish="chrome" metalness={1} roughness={0.08} />
        </mesh>
        <mesh position={[0, 0.2, 0]} castShadow>
          <cylinderGeometry args={[0.028, 0.044, 0.06, 14]} />
          <SurfaceMat color="#e5e7eb" finish="chrome" metalness={1} roughness={0.08} />
        </mesh>
        <mesh position={[-0.25, 0.012, 0]} castShadow>
          <boxGeometry args={[0.36, 0.024, 0.24]} />
          <SurfaceMat color="#c8a27a" finish="wood" roughness={0.6} />
        </mesh>
      </group>

      {/* Accessoires propres au style */}
      {style === 'champagne' ? (
        <group position={[-w * 0.3, height, barTopZ]}>
          <mesh position={[0, 0.11, 0]} castShadow>
            <cylinderGeometry args={[0.13, 0.1, 0.22, 24]} />
            <SurfaceMat color="#e5e7eb" finish="chrome" metalness={1} roughness={0.1} />
          </mesh>
          {[0, 1, 2].map((k) => (
            <mesh key={k} position={[Math.cos(k * 2.1) * 0.05, 0.18, Math.sin(k * 2.1) * 0.05]} rotation={[Math.cos(k * 2.1) * 0.25, 0, -Math.sin(k * 2.1) * 0.25]} castShadow>
              <cylinderGeometry args={[0.014, 0.038, 0.3, 12]} />
              <Mat color="#14532d" finish="glass" roughness={0.1} opacity={0.92} />
            </mesh>
          ))}
        </group>
      ) : null}
      {style === 'beer' ? (
        <group position={[-w * 0.18, height, barTopZ]}>
          <BeerTower taps={4} />
        </group>
      ) : null}
      {style === 'coffee' || style === 'tea' ? (
        <group position={[-w * 0.28, workY, workZ - 0.02]} rotation={[0, Math.PI, 0]}>
          <EspressoMachine />
        </group>
      ) : null}
      {style === 'juice' ? (
        <group position={[-w * 0.28, workY, workZ]}>
          <mesh position={[0, 0.2, 0]} castShadow>
            <cylinderGeometry args={[0.1, 0.1, 0.4, 20]} />
            <meshPhysicalMaterial color="#fb923c" roughness={0.1} transparent opacity={0.7} clearcoat={1} />
          </mesh>
          {Array.from({ length: 6 }).map((_, i) => (
            <mesh key={i} position={[0.2 + (i % 3) * 0.07, 0.04, (Math.floor(i / 3) - 0.5) * 0.07]} castShadow>
              <sphereGeometry args={[0.038, 12, 10]} />
              <Mat color={i % 2 ? '#ea580c' : '#65a30d'} roughness={0.6} />
            </mesh>
          ))}
        </group>
      ) : null}
      {style === 'tapas' ? (
        Array.from({ length: 3 }).map((_, i) => (
          <group key={i} position={[((i + 0.5) / 3 - 0.5) * w * 0.5, height, barTopZ - 0.04]}>
            <mesh position={[0, 0.012, 0]} castShadow>
              <boxGeometry args={[0.4, 0.024, 0.2]} />
              <SurfaceMat color="#8b5a2b" finish="wood" roughness={0.6} />
            </mesh>
            {[-0.12, 0, 0.12].map((x) => (
              <mesh key={x} position={[x, 0.034, 0]} castShadow>
                <cylinderGeometry args={[0.045, 0.04, 0.02, 14]} />
                <Mat color={['#b91c1c', '#ca8a04', '#f5f5f4'][((i + Math.round(x * 10)) % 3 + 3) % 3]} roughness={0.7} />
              </mesh>
            ))}
          </group>
        ))
      ) : null}
    </group>
  );
}
