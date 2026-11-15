'use client';

import { useLayoutEffect, useMemo, useRef, type ReactNode } from 'react';
import * as THREE from 'three';
import type { BarStyle } from '@/lib/roomLayoutUtils';
import { resolveBarDesign, type BarBack, type BarDesign, type BarFront, type BarMetal, type BarStool, type BarTop } from '@/lib/roomBarDesign';
import { SurfaceMat, type SurfaceFinish } from '@/components/room/SurfaceMaterial';
import { generatedDetailMaps, loadTiledTexture, resolveTableMaterial, roughnessWithMap } from '@/lib/roomWebGLMaterials';
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
/** `lie` : bouteille couchée, goulot vers l’avant (+z), comme dans un casier à vins. */
type BottleSlot = { x: number; y: number; z: number; kind: BottleKind; color: string; label: string; cap: string; lie?: boolean };

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
    const lie = new THREE.Matrix4().makeRotationX(Math.PI / 2);
    // Repère local de la bouteille (axe = +y), puis couchée si besoin, puis posée en (x, y, z).
    const place = (s: BottleSlot, local: THREE.Matrix4) => {
      const m = new THREE.Matrix4().makeTranslation(s.x, s.y, s.z);
      if (s.lie) m.multiply(lie);
      return m.multiply(local);
    };
    for (const s of slots) {
      const rot = rand(s.x * 91 + s.y * 7 + s.z * 13) * Math.PI * 2;
      bodies[s.kind].push({ m: place(s, trs(0, 0, 0, 1, 1, 1, rot)), c: s.color });
      const [lr, l0, l1] = BOTTLE_PROFILES[s.kind].label;
      labels[s.kind].push({ m: place(s, trs(0, (l0 + l1) / 2, 0, lr, l1 - l0, lr, rot)), c: s.label });
      const top = BOTTLE_PROFILES[s.kind].pts[BOTTLE_PROFILES[s.kind].pts.length - 1][1];
      caps.push({ m: place(s, trs(0, top - 0.006, 0)), c: s.cap });
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


/* ---------------------------------------------------------------------------------------------
 * Matières communes : textures générées (couleur + relief + rugosité), métaux des accessoires.
 * ------------------------------------------------------------------------------------------- */

const r2 = (v: number) => Math.max(0.5, Math.round(v * 4) / 4);

/** Texture générée de public/floors/gen avec ses cartes de relief et de rugosité. */
function useGenMaps(name: string, repeatX: number, repeatY: number) {
  const rx = r2(repeatX);
  const ry = r2(repeatY);
  return useMemo(() => {
    const url = `/floors/gen/${name}.jpg`;
    return { map: loadTiledTexture(url, rx, ry), ...generatedDetailMaps(url, rx, ry) };
  }, [name, rx, ry]);
}

function GenSurface({
  name,
  repeat,
  color = '#ffffff',
  roughness = 0.6,
  metalness = 0,
  normalScale = 0.6,
  clearcoat,
}: {
  name: string;
  repeat: [number, number];
  color?: string;
  roughness?: number;
  metalness?: number;
  normalScale?: number;
  clearcoat?: number;
}) {
  const maps = useGenMaps(name, repeat[0], repeat[1]);
  return (
    <SurfaceMat
      color={color}
      finish="plain"
      map={maps.map}
      normalMap={maps.normalMap}
      normalScale={normalScale}
      roughnessMap={maps.roughnessMap}
      roughness={roughnessWithMap(roughness, maps.roughnessMap)}
      metalness={metalness}
      clearcoat={clearcoat}
      clearcoatRoughness={clearcoat ? 0.08 : undefined}
    />
  );
}

const METAL_COLORS: Record<BarMetal, string> = { brass: '#d4af37', chrome: '#d4d4d8', black: '#2a2a2e' };

/** `plain` : sans brossage (pièces tournées dont les UV rayonnent, comme un socle de tabouret). */
function MetalMat({ metal, repeat, plain = false }: { metal: BarMetal; repeat?: [number, number]; plain?: boolean }) {
  if (metal === 'brass') return <SurfaceMat color={METAL_COLORS.brass} finish={plain ? 'plain' : 'brass'} metalness={0.95} roughness={0.22} repeat={repeat} />;
  if (metal === 'chrome') return <SurfaceMat color={METAL_COLORS.chrome} finish="chrome" metalness={1} roughness={0.1} />;
  return <SurfaceMat color={METAL_COLORS.black} finish="metal" metalness={0.65} roughness={0.42} />;
}

/** Instances d’une même pièce (cannelures, douelles, boutons…) avec un matériau JSX enfant. */
function InstancedParts({
  geometry,
  matrices,
  colors,
  castShadow = false,
  children,
}: {
  geometry: THREE.BufferGeometry;
  matrices: THREE.Matrix4[];
  colors?: string[];
  castShadow?: boolean;
  children: ReactNode;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const col = new THREE.Color();
    matrices.forEach((m, i) => {
      mesh.setMatrixAt(i, m);
      if (colors) mesh.setColorAt(i, col.set(colors[i % colors.length]));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [matrices, colors]);
  if (!matrices.length) return null;
  return (
    <instancedMesh key={matrices.length} ref={ref} args={[geometry, undefined, matrices.length]} castShadow={castShadow} receiveShadow>
      {children}
    </instancedMesh>
  );
}

/** Teintes de bois proches du blanc : multipliées par la couleur du bar, elles varient les lames. */
const WOOD_TONES = ['#ffffff', '#efe4d6', '#f7efe6', '#e2d3c1', '#fbf6ef', '#e9dccb'];

/* ---------------------------------------------------------------------------------------------
 * Façade côté clients. Repère : face avant de la rehausse en z = 0, de y0 à y1, largeur w.
 * ------------------------------------------------------------------------------------------- */

function BarFrontFace({ kind, w, y0, y1, body, metal }: { kind: BarFront; w: number; y0: number; y1: number; body: string; metal: BarMetal }) {
  const h = y1 - y0;
  const yc = (y0 + y1) / 2;

  const fluted = useMemo(() => {
    if (kind !== 'fluted') return null;
    const r = 0.022;
    const pitch = 2 * r + 0.004;
    const n = Math.max(4, Math.floor((w * 0.98) / pitch));
    const geo = new THREE.CylinderGeometry(r, r, h - 0.06, 12, 1, false, -Math.PI / 2, Math.PI);
    const mats = Array.from({ length: n }, (_, i) => new THREE.Matrix4().makeTranslation((i + 0.5 - n / 2) * pitch, yc, 0));
    return { geo, mats };
  }, [kind, w, h, yc]);

  const boards = useMemo(() => {
    if (kind !== 'staves' && kind !== 'planks') return null;
    const vertical = kind === 'staves';
    const size = vertical ? 0.095 : 0.125;
    const span = vertical ? w * 0.99 : h - 0.02;
    const n = Math.max(3, Math.round(span / size));
    const step = span / n;
    const geo = vertical ? new THREE.BoxGeometry(step - 0.005, h - 0.02, 0.026) : new THREE.BoxGeometry(w * 0.99, step - 0.007, 0.024);
    const mats = Array.from({ length: n }, (_, i) => {
      const jitter = (rand(i * 7 + 3) - 0.5) * 0.008;
      return vertical
        ? new THREE.Matrix4().makeTranslation((i + 0.5 - n / 2) * step, yc, 0.013 + jitter)
        : new THREE.Matrix4().makeTranslation((rand(i * 3) - 0.5) * 0.01, y0 + 0.01 + (i + 0.5) * step, 0.012 + jitter);
    });
    const tones = Array.from({ length: n }, (_, i) => WOOD_TONES[Math.floor(rand(i * 11 + 5) * WOOD_TONES.length) % WOOD_TONES.length]);
    return { geo, mats, tones, vertical };
  }, [kind, w, h, y0, yc]);

  const tufts = useMemo(() => {
    if (kind !== 'tufted') return null;
    const buttons: THREE.Matrix4[] = [];
    const nails: THREE.Matrix4[] = [];
    const cols = Math.max(3, Math.round(w / 0.16));
    const rows = Math.max(3, Math.round(h / 0.16));
    const sx = (w - 0.12) / cols;
    const sy = (h - 0.12) / rows;
    for (let r = 0; r <= rows; r += 1) {
      for (let c = 0; c <= cols; c += 1) {
        if ((r + c) % 2) continue;
        buttons.push(new THREE.Matrix4().makeTranslation(-w / 2 + 0.06 + c * sx, y0 + 0.06 + r * sy, 0.04));
      }
    }
    const nn = Math.round(w / 0.025);
    for (let i = 0; i < nn; i += 1) {
      const x = (i + 0.5 - nn / 2) * (w / nn);
      nails.push(new THREE.Matrix4().makeTranslation(x, y1 - 0.025, 0.048), new THREE.Matrix4().makeTranslation(x, y0 + 0.025, 0.048));
    }
    return { buttons, nails, button: new THREE.SphereGeometry(0.011, 8, 6), nail: new THREE.SphereGeometry(0.006, 6, 4) };
  }, [kind, w, h, y0, y1]);

  const onyx = useGenMaps('marble-calacatta', Math.max(1, w / 1.4), Math.max(0.5, h / 1.4));

  switch (kind) {
    case 'fluted':
      return (
        <group>
          {fluted ? (
            <InstancedParts geometry={fluted.geo} matrices={fluted.mats} castShadow>
              <SurfaceMat color={body} finish="wood" roughness={0.42} repeat={[0.2, 1]} vertical />
            </InstancedParts>
          ) : null}
          {[y0 + 0.015, y1 - 0.015].map((y) => (
            <mesh key={y} position={[0, y, 0.02]} castShadow>
              <boxGeometry args={[w, 0.03, 0.04]} />
              <MetalMat metal={metal} repeat={[6, 1]} />
            </mesh>
          ))}
        </group>
      );
    case 'staves':
    case 'planks':
      return (
        <group>
          {boards ? (
            <InstancedParts geometry={boards.geo} matrices={boards.mats} colors={boards.tones} castShadow>
              <SurfaceMat color={body} finish="wood" roughness={0.62} repeat={boards.vertical ? [0.25, 1] : [Math.max(1, w / 1.4), 0.15]} vertical={boards.vertical} />
            </InstancedParts>
          ) : null}
          {kind === 'staves'
            ? [0.22, 0.78].map((t) => (
                <mesh key={t} position={[0, y0 + h * t, 0.03]} castShadow>
                  <boxGeometry args={[w * 0.995, 0.05, 0.008]} />
                  <MetalMat metal="black" />
                </mesh>
              ))
            : null}
        </group>
      );
    case 'deco': {
      const pil = Math.max(2, Math.round(w / 0.6));
      return (
        <group>
          <mesh position={[0, yc, 0.01]} castShadow receiveShadow>
            <boxGeometry args={[w, h, 0.02]} />
            <SurfaceMat color={body} finish="lacquer" roughness={0.22} clearcoat={0.7} />
          </mesh>
          {[y0 + 0.03, y0 + 0.07, y1 - 0.07, y1 - 0.03].map((y) => (
            <mesh key={y} position={[0, y, 0.024]}>
              <boxGeometry args={[w, 0.012, 0.01]} />
              <MetalMat metal={metal} repeat={[6, 1]} />
            </mesh>
          ))}
          {Array.from({ length: pil + 1 }).map((_, i) => (
            <group key={i} position={[(i / pil - 0.5) * (w - 0.03), yc, 0.024]}>
              <mesh>
                <boxGeometry args={[0.014, h - 0.18, 0.01]} />
                <MetalMat metal={metal} />
              </mesh>
              {/* Chevron Art déco en tête de pilastre */}
              {i < pil
                ? [-1, 1].map((s) => (
                    <mesh key={s} position={[w / pil / 2 + s * 0.06, h / 2 - 0.16, 0]} rotation={[0, 0, s * 0.7]}>
                      <boxGeometry args={[0.008, 0.16, 0.008]} />
                      <MetalMat metal={metal} />
                    </mesh>
                  ))
                : null}
            </group>
          ))}
        </group>
      );
    }
    case 'metro':
      return (
        <mesh position={[0, yc, 0.008]} castShadow receiveShadow>
          <boxGeometry args={[w, h, 0.016]} />
          <GenSurface name="wall-metro" repeat={[w / 0.8, h / 0.8]} color={body} roughness={0.25} clearcoat={0.5} />
        </mesh>
      );
    case 'terrazzo':
    case 'tiles':
      return (
        <mesh position={[0, yc, 0.008]} castShadow receiveShadow>
          <boxGeometry args={[w, h, 0.016]} />
          <GenSurface
            name={kind === 'terrazzo' ? 'terrazzo-classic' : 'tomettes'}
            repeat={kind === 'terrazzo' ? [w / 1.2, h / 1.2] : [w / 0.9, h / 0.9]}
            color={body}
            roughness={kind === 'terrazzo' ? 0.3 : 0.55}
          />
        </mesh>
      );
    case 'tufted':
      return (
        <group>
          <mesh position={[0, yc, 0.02]} castShadow receiveShadow>
            <boxGeometry args={[w, h, 0.04]} />
            <SurfaceMat color={body} finish="leather" roughness={0.5} repeat={[Math.max(1, w / 0.8), Math.max(1, h / 0.8)]} />
          </mesh>
          {tufts ? (
            <>
              <InstancedParts geometry={tufts.button} matrices={tufts.buttons}>
                <SurfaceMat color={body} finish="leather" roughness={0.4} />
              </InstancedParts>
              <InstancedParts geometry={tufts.nail} matrices={tufts.nails}>
                <MetalMat metal={metal} />
              </InstancedParts>
            </>
          ) : null}
        </group>
      );
    case 'backlit':
      return (
        <group>
          <mesh position={[0, yc, 0.01]}>
            <boxGeometry args={[w - 0.04, h - 0.04, 0.02]} />
            <meshStandardMaterial color={body} map={onyx.map} emissive={body} emissiveMap={onyx.map} emissiveIntensity={0.85} roughness={0.15} />
          </mesh>
          {[y0, y1].map((y) => (
            <mesh key={y} position={[0, y, 0.02]} castShadow>
              <boxGeometry args={[w, 0.03, 0.04]} />
              <MetalMat metal={metal} />
            </mesh>
          ))}
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * (w / 2 - 0.015), yc, 0.02]} castShadow>
              <boxGeometry args={[0.03, h, 0.04]} />
              <MetalMat metal={metal} />
            </mesh>
          ))}
        </group>
      );
    case 'cane': {
      const n = Math.max(2, Math.round(w / 0.62));
      const pw = w / n;
      return (
        <group>
          {Array.from({ length: n }).map((_, i) => (
            <group key={i} position={[(i + 0.5 - n / 2) * pw, yc, 0]}>
              <mesh position={[0, 0, 0.006]} receiveShadow>
                <boxGeometry args={[pw - 0.08, h - 0.08, 0.012]} />
                <SurfaceMat color="#d8b884" finish="rattan" roughness={0.75} repeat={[Math.max(1, pw / 0.25), Math.max(1, h / 0.25)]} />
              </mesh>
              {[-1, 1].map((s) => (
                <mesh key={`v${s}`} position={[s * (pw / 2 - 0.02), 0, 0.016]} castShadow>
                  <boxGeometry args={[0.04, h, 0.032]} />
                  <SurfaceMat color={body} finish="wood" roughness={0.5} repeat={[0.2, 1]} vertical />
                </mesh>
              ))}
              {[-1, 1].map((s) => (
                <mesh key={`h${s}`} position={[0, s * (h / 2 - 0.02), 0.016]} castShadow>
                  <boxGeometry args={[pw, 0.04, 0.032]} />
                  <SurfaceMat color={body} finish="wood" roughness={0.5} />
                </mesh>
              ))}
            </group>
          ))}
        </group>
      );
    }
    default: {
      const slatCount = Math.max(6, Math.min(28, Math.round(w * 5)));
      return (
        <group>
          {Array.from({ length: slatCount }).map((_, si) => (
            <mesh key={si} position={[((si + 0.5) / slatCount - 0.5) * (w * 0.94), yc, 0.01]} castShadow>
              <boxGeometry args={[Math.max(0.015, (w * 0.8) / (slatCount * 1.6)), h - 0.04, 0.02]} />
              <SurfaceMat color="#6b4a2e" finish="wood" roughness={0.55} repeat={[1, 0.3]} vertical />
            </mesh>
          ))}
        </group>
      );
    }
  }
}

/* ---------------------------------------------------------------------------------------------
 * Plateau du comptoir.
 * ------------------------------------------------------------------------------------------- */

function BarTopSurface({ kind, w, d }: { kind: BarTop; w: number; d: number }) {
  switch (kind) {
    case 'marble':
      return <BarMarbleTop w={w} d={d} />;
    case 'blackMarble':
      return <GenSurface name="marble-veined" repeat={[w / 1.6, d / 1.6]} color="#4a4a50" roughness={0.12} normalScale={0.25} clearcoat={0.85} />;
    case 'oak':
      return <GenSurface name="table-wood" repeat={[w / 1.8, 1]} color="#e9d6bd" roughness={0.42} normalScale={0.4} clearcoat={0.3} />;
    case 'walnut':
      return <GenSurface name="table-walnut" repeat={[w / 1.8, 1]} roughness={0.38} normalScale={0.4} clearcoat={0.35} />;
    case 'terrazzo':
      return <GenSurface name="terrazzo-venetian" repeat={[w / 1.4, d / 1.4]} roughness={0.22} normalScale={0.3} clearcoat={0.5} />;
    case 'concrete':
      return <GenSurface name="concrete-polished" repeat={[w / 2, d / 2]} color="#e7e3de" roughness={0.45} normalScale={0.35} />;
    case 'zinc':
    default:
      return <SurfaceMat color="#a9adb3" finish="metal" metalness={0.85} roughness={0.36} repeat={[Math.max(1, w / 1.2), 1]} />;
  }
}

/** Épaisseur visible du plateau : le bois et le zinc se lisent plus épais que la pierre. */
const TOP_THICKNESS: Record<BarTop, number> = { marble: 0.05, blackMarble: 0.05, oak: 0.065, walnut: 0.065, zinc: 0.045, terrazzo: 0.05, concrete: 0.06 };

/* ---------------------------------------------------------------------------------------------
 * Tabourets (assise à 75–78 cm pour un comptoir à 1,10–1,15 m). Clients vers +z.
 * ------------------------------------------------------------------------------------------- */

const STOOL_TINT: Partial<Record<BarStyle, string>> = {
  champagne: '#1f4d3a',
  mocktail: '#c46a8e',
  whiskey: '#5a2a1a',
  juice: '#d8b884',
  tea: '#c9a46c',
  coffee: '#7a5232',
  wine: '#6b4428',
  tapas: '#5c3a22',
};

function BarStoolModel({ kind, metal, tint, x, z }: { kind: BarStool; metal: BarMetal; tint?: string; x: number; z: number }) {
  const seatGeo = useMemo(() => lathe([[0, 0], [0.16, 0], [0.18, 0.015], [0.19, 0.045], [0.182, 0.07], [0.15, 0.085], [0, 0.088]], 24), []);
  const baseGeo = useMemo(() => lathe([[0, 0.022], [0.2, 0.012], [0.22, 0.004], [0.22, 0], [0, 0]], 28), []);
  const woodSeat = useMemo(() => lathe([[0, 0], [0.17, 0], [0.18, 0.012], [0.178, 0.035], [0.16, 0.042], [0, 0.036]], 28), []);
  if (kind === 'none') return null;

  if (kind === 'leather' || kind === 'velvet') {
    const color = tint ?? (kind === 'velvet' ? '#1f4d3a' : '#4a2c1d');
    const finish = kind === 'velvet' ? 'velvet' : 'leather';
    return (
      <group position={[x, 0, z]}>
        <mesh geometry={baseGeo} castShadow receiveShadow>
          <MetalMat metal={metal} plain />
        </mesh>
        <mesh position={[0, 0.37, 0]} castShadow>
          <cylinderGeometry args={[0.024, 0.03, 0.7, 14]} />
          <MetalMat metal={metal} />
        </mesh>
        <mesh position={[0, 0.3, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <torusGeometry args={[0.17, 0.011, 8, 28]} />
          <MetalMat metal={metal} />
        </mesh>
        {[0, 1, 2].map((k) => (
          <mesh key={k} position={[Math.sin((k * Math.PI * 2) / 3) * 0.085, 0.3, Math.cos((k * Math.PI * 2) / 3) * 0.085]} rotation={[0, (k * Math.PI * 2) / 3, Math.PI / 2]}>
            <cylinderGeometry args={[0.007, 0.007, 0.17, 6]} />
            <MetalMat metal={metal} />
          </mesh>
        ))}
        <mesh position={[0, 0.7, 0]} geometry={seatGeo} castShadow receiveShadow>
          <SurfaceMat color={color} finish={finish} roughness={kind === 'velvet' ? 0.85 : 0.55} />
        </mesh>
        <mesh position={[0, 0.86, 0]} castShadow>
          <cylinderGeometry args={[0.185, 0.18, 0.11, 24, 1, true, -Math.PI * 0.38, Math.PI * 0.76]} />
          <SurfaceMat color={color} finish={finish} roughness={kind === 'velvet' ? 0.85 : 0.55} side={THREE.DoubleSide} />
        </mesh>
        {[-0.5, 0.5].map((s) => (
          <mesh key={s} position={[Math.sin(s) * 0.17, 0.79, Math.cos(s) * 0.17]} castShadow>
            <cylinderGeometry args={[0.009, 0.009, 0.12, 6]} />
            <MetalMat metal={metal} />
          </mesh>
        ))}
      </group>
    );
  }

  // Piètement 4 pieds évasés : bois, métal industriel ou bois + rotin.
  const seatY = 0.74;
  const splay = 0.07;
  const legTop = 0.13;
  const legLen = Math.hypot(seatY, splay);
  const isMetal = kind === 'industrial';
  const legColor = isMetal ? METAL_COLORS[metal === 'brass' ? 'black' : metal] : tint ?? '#7a5232';
  const LegMat = () => (isMetal ? <MetalMat metal={metal === 'brass' ? 'black' : metal} /> : <SurfaceMat color={legColor} finish="wood" roughness={0.5} repeat={[0.2, 1]} vertical />);
  return (
    <group position={[x, 0, z]}>
      {[0, 1, 2, 3].map((k) => {
        const a = Math.PI / 4 + (k * Math.PI) / 2;
        const ox = Math.cos(a);
        const oz = Math.sin(a);
        const r = legTop + splay / 2;
        return (
          <mesh
            key={k}
            position={[ox * r, seatY / 2, oz * r]}
            rotation={[-oz * Math.atan2(splay, seatY), 0, ox * Math.atan2(splay, seatY)]}
            castShadow
          >
            <cylinderGeometry args={isMetal ? [0.012, 0.015, legLen, 8] : [0.017, 0.013, legLen, 10]} />
            <LegMat />
          </mesh>
        );
      })}
      {/* Barreaux repose-pieds */}
      {[0, 1, 2, 3].map((k) => {
        const a = (k * Math.PI) / 2;
        const rr = legTop + splay * 0.62;
        return (
          <mesh key={k} position={[Math.cos(a) * rr * 0.7071, 0.28, Math.sin(a) * rr * 0.7071]} rotation={[0, -a + Math.PI / 2, Math.PI / 2]}>
            <cylinderGeometry args={[0.009, 0.009, rr * 1.42, 8]} />
            <LegMat />
          </mesh>
        );
      })}
      {isMetal ? (
        <mesh position={[0, seatY + 0.012, 0]} rotation={[0, Math.PI / 4, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.235, 0.22, 0.024, 4]} />
          <MetalMat metal={metal === 'brass' ? 'black' : metal} />
        </mesh>
      ) : (
        <mesh position={[0, seatY, 0]} geometry={woodSeat} castShadow receiveShadow>
          {kind === 'rattan' ? (
            <SurfaceMat color="#d8b884" finish="rattan" roughness={0.75} repeat={[2, 2]} />
          ) : (
            <SurfaceMat color={tint ?? '#8b5e3c'} finish="wood" roughness={0.45} />
          )}
        </mesh>
      )}
      {kind === 'rattan' ? (
        <group>
          <mesh position={[0, seatY + 0.16, 0]} castShadow>
            <cylinderGeometry args={[0.19, 0.18, 0.16, 24, 1, true, -Math.PI * 0.38, Math.PI * 0.76]} />
            <SurfaceMat color="#d8b884" finish="rattan" roughness={0.75} repeat={[3, 1]} side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[0, seatY + 0.24, 0]} rotation={[Math.PI / 2, 0, Math.PI * 0.12]}>
            <torusGeometry args={[0.19, 0.01, 6, 24, Math.PI * 0.76]} />
            <SurfaceMat color={legColor} finish="wood" roughness={0.5} />
          </mesh>
        </group>
      ) : null}
    </group>
  );
}

/* ---------------------------------------------------------------------------------------------
 * Comptoir.
 * ------------------------------------------------------------------------------------------- */

type EventBarMeshProps = {
  w: number;
  d: number;
  height?: number;
  style?: BarStyle;
  color?: string;
  selected?: boolean;
  /** Habillage choisi dans l’éditeur (sinon celui du type de bar). */
  design?: { barFront?: BarFront; barTop?: BarTop; barBack?: BarBack; barStool?: BarStool; barMetal?: BarMetal };
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
/** Profondeur de la rehausse côté clients qui porte le comptoir. */
const RISER_D = 0.32;

/**
 * Comptoir : rehausse côté clients (façade + plateau en surplomb) et, derrière, plan de travail
 * inox à 90 cm avec bac à glace et rail de bouteilles côté barman. Repère local : clients vers +z.
 */
function BarCounter({
  cw,
  cd,
  height,
  body,
  style,
  colors,
  design,
  glasses = 0,
}: {
  cw: number;
  cd: number;
  height: number;
  body: string;
  style: BarStyle;
  colors: string[];
  design: BarDesign;
  glasses?: number;
}) {
  const topY = height;
  const riserD = Math.min(RISER_D, cd * 0.5);
  const workD = Math.max(0.1, cd - riserD);
  const riserZ = cd / 2 - riserD / 2;
  const workZ = -cd / 2 + workD / 2;
  const barTopD = riserD + 0.14;
  const barTopZ = cd / 2 - riserD + barTopD / 2;
  const topT = TOP_THICKNESS[design.top];
  const railSlots = useMemo(() => {
    const n = Math.max(3, Math.min(10, Math.floor((cw * 0.45) / BOTTLE_PITCH)));
    return Array.from({ length: n }, (_, i) => bottleSlot(style, colors, i * 29 + 7, (i + 0.5 - n / 2) * BOTTLE_PITCH + cw * 0.18, 0.52, -cd / 2 - 0.055));
  }, [cw, cd, style, colors]);
  const glassPositions = useMemo<Array<[number, number]>>(
    () => Array.from({ length: glasses }, (_, i) => [((i + 0.5) / glasses - 0.5) * cw * 0.72 + (rand(i + 5) - 0.5) * 0.08, barTopZ + 0.03 + (rand(i * 3 + 1) - 0.5) * 0.08]),
    [glasses, cw, barTopZ],
  );
  const iceW = Math.min(0.9, cw * 0.28);
  // Rehausse : teinte neutre sous les façades rapportées, bois du bar sinon.
  const riserColor = design.front === 'slats' ? body : '#2a211b';
  return (
    <>
      {/* Rehausse côté clients : pleine hauteur jusque sous le plateau (aucun jour) */}
      <mesh position={[0, (topY - topT) / 2, riserZ]} castShadow receiveShadow>
        <boxGeometry args={[cw, topY - topT, riserD]} />
        <Mat color={riserColor} finish="wood" roughness={0.5} repeat={[Math.max(1, cw / 1.2), 1]} />
      </mesh>
      {/* Caisson barman, habillé inox */}
      <mesh position={[0, (WORK_TOP_Y - 0.02) / 2, workZ]} castShadow receiveShadow>
        <boxGeometry args={[cw, WORK_TOP_Y - 0.02, workD]} />
        <SurfaceMat color="#a1a1aa" finish="metal" metalness={0.85} roughness={0.32} />
      </mesh>
      {/* Façade côté clients */}
      <group position={[0, 0, cd / 2]}>
        <BarFrontFace kind={design.front} w={cw} y0={0.1} y1={topY - topT - 0.005} body={body} metal={design.metal} />
      </group>
      <mesh position={[0, 0.05, cd / 2 - 0.02]} castShadow>
        <boxGeometry args={[cw * 0.99, 0.1, 0.06]} />
        <Mat color="#09090b" roughness={0.7} />
      </mesh>
      {/* Plateau avec surplomb côté clients */}
      <mesh position={[0, topY - topT / 2, barTopZ]} receiveShadow castShadow>
        <boxGeometry args={[cw + 0.06, topT, barTopD]} />
        <BarTopSurface kind={design.top} w={cw} d={barTopD} />
      </mesh>
      {design.top === 'zinc' ? (
        // Nez de comptoir arrondi, typique du zinc de bistrot
        <mesh position={[0, topY - topT / 2, barTopZ + barTopD / 2]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[topT / 2 + 0.006, topT / 2 + 0.006, cw + 0.06, 16]} />
          <SurfaceMat color="#b4b8bd" finish="metal" metalness={0.9} roughness={0.3} />
        </mesh>
      ) : null}
      <mesh position={[0, topY - topT - 0.006, cd / 2 + 0.11]}>
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
      {/* Repose-pieds */}
      <group position={[0, 0.2, cd / 2 + 0.12]}>
        <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.022, 0.022, cw * 0.94, 14]} />
          <MetalMat metal={design.metal} repeat={[1, 6]} />
        </mesh>
        {Array.from({ length: Math.max(2, Math.round(cw / 1.2) + 1) }).map((_, spi, arr) => (
          <mesh key={spi} position={[((spi / (arr.length - 1)) - 0.5) * cw * 0.88, 0, -0.06]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.012, 0.012, 0.12, 8]} />
            <MetalMat metal={design.metal} />
          </mesh>
        ))}
      </group>
      {glasses ? <BarGlassSet style={style} positions={glassPositions} y={topY} /> : null}
    </>
  );
}

/* ---------------------------------------------------------------------------------------------
 * Arrière-bars. Repère : centré sur le meuble, fond du mur en z = -backD / 2, salle vers +z.
 * ------------------------------------------------------------------------------------------- */

const BACK_BASE_H = 0.9;

/** Meuble bas à portes + plateau pierre, commun à tous les arrière-bars. */
function BackCabinet({ W, backD, metal, wood = '#2a1d14', door = '#3a2618' }: { W: number; backD: number; metal: BarMetal; wood?: string; door?: string }) {
  const baseH = BACK_BASE_H;
  const doorCount = Math.max(2, Math.round(W / 0.6));
  return (
    <group>
      <mesh position={[0, 0.05, 0.03]} receiveShadow>
        <boxGeometry args={[W - 0.04, 0.1, backD - 0.06]} />
        <Mat color="#0c0a09" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.1 + (baseH - 0.13) / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[W, baseH - 0.13, backD]} />
        <Mat color={wood} finish="wood" roughness={0.55} repeat={[Math.max(1, W / 1.2), 1]} />
      </mesh>
      {Array.from({ length: doorCount }).map((_, i) => {
        const dw = W / doorCount;
        const x = (i + 0.5 - doorCount / 2) * dw;
        return (
          <group key={`door-${i}`} position={[x, 0.1 + (baseH - 0.13) / 2, backD / 2 + 0.008]}>
            <mesh castShadow>
              <boxGeometry args={[dw - 0.012, baseH - 0.19, 0.016]} />
              <SurfaceMat color={door} finish="wood" roughness={0.45} repeat={[0.6, 1]} vertical />
            </mesh>
            <mesh position={[(i % 2 ? -1 : 1) * (dw / 2 - 0.06), 0.1, 0.02]}>
              <boxGeometry args={[0.012, 0.18, 0.018]} />
              <MetalMat metal={metal} />
            </mesh>
          </group>
        );
      })}
      <mesh position={[0, baseH - 0.015, 0.01]} castShadow receiveShadow>
        <boxGeometry args={[W + 0.02, 0.03, backD + 0.04]} />
        <SurfaceMat color="#27272a" finish="stone" roughness={0.3} />
      </mesh>
    </group>
  );
}

function LedStrip({ position, length }: { position: [number, number, number]; length: number }) {
  return (
    <mesh position={position}>
      <boxGeometry args={[length, 0.008, 0.012]} />
      <meshStandardMaterial color="#fff7e6" emissive="#fbbf24" emissiveIntensity={1.1} />
    </mesh>
  );
}

/** Enseigne néon : tube lumineux le long d’une courbe (cercle + vague). */
function NeonSign({ width, color = '#ff4fa3' }: { width: number; color?: string }) {
  const tubes = useMemo(() => {
    const r = Math.min(0.32, width * 0.12);
    const ring = new THREE.TorusGeometry(r, 0.012, 8, 64);
    const pts = Array.from({ length: 24 }, (_, i) => {
      const t = i / 23;
      return new THREE.Vector3((t - 0.5) * r * 3.2, Math.sin(t * Math.PI * 3) * r * 0.28, 0);
    });
    const wave = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 80, 0.012, 8, false);
    return { ring, wave };
  }, [width]);
  return (
    <group>
      <mesh geometry={tubes.ring}>
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2.4} toneMapped={false} />
      </mesh>
      <mesh geometry={tubes.wave}>
        <meshStandardMaterial color="#fff1f8" emissive="#ffd6ea" emissiveIntensity={2} toneMapped={false} />
      </mesh>
    </group>
  );
}

/** Arrière-bar à étagères : miroir bronze, onyx ambré rétroéclairé ou fond sombre avec néon. */
function ShelvedBackBar({ w, backD, style, colors, kind, metal }: { w: number; backD: number; style: BarStyle; colors: string[]; kind: BarBack; metal: BarMetal }) {
  const baseH = BACK_BASE_H;
  const shelfYs = Array.from({ length: BAR_SHELF_COUNT }, (_, k) => baseH + 0.42 + k * 0.38);
  const panelH = shelfYs[shelfYs.length - 1] - baseH + 0.44;
  const W = w * 0.96;
  const shelfW = W * 0.94;
  const shelfZ = -backD / 2 + 0.17;
  const moduleCount = Math.max(1, Math.round(W / 1.3));
  const onyx = useGenMaps('marble-calacatta', Math.max(1, shelfW / 1.4), Math.max(0.5, panelH / 1.4));
  // Néon : on libère le module central de ses étagères pour l’enseigne.
  const neonGap = kind === 'neon' ? Math.min(1.1, W / Math.max(1, moduleCount)) : 0;
  const slots = useMemo(
    () =>
      shelfSlots(
        style,
        colors,
        shelfW - 0.1,
        [{ y: baseH + 0.03, fill: 0.55 }, ...shelfYs.map((y) => ({ y: y + 0.012, fill: 0.9 }))],
        shelfZ,
      ).filter((s) => !neonGap || Math.abs(s.x) > neonGap / 2 || s.y < baseH + 0.2),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [style, colors, shelfW, shelfZ, neonGap],
  );
  return (
    <group>
      <BackCabinet W={W} backD={backD} metal={metal} />
      {/* Panneau de fond bois */}
      <mesh position={[0, baseH + panelH / 2, -backD / 2 + 0.02]} castShadow>
        <boxGeometry args={[W, panelH, 0.04]} />
        <SurfaceMat color="#3a2618" finish="wood" roughness={0.5} repeat={[Math.max(1, W / 1.2), 1]} />
      </mesh>
      {/* Fond : miroir bronze, onyx ambré lumineux ou laque sombre */}
      <mesh position={[0, baseH + (panelH - 0.12) / 2 + 0.02, -backD / 2 + 0.045]}>
        <boxGeometry args={[shelfW, panelH - 0.12, 0.008]} />
        {kind === 'amber' ? (
          <meshStandardMaterial color="#f5a524" map={onyx.map} emissive="#f59e0b" emissiveMap={onyx.map} emissiveIntensity={0.9} roughness={0.2} />
        ) : kind === 'neon' ? (
          <SurfaceMat color="#17141a" finish="lacquer" roughness={0.35} />
        ) : (
          <meshPhysicalMaterial color="#c9a27e" roughness={0.07} metalness={1} clearcoat={1} clearcoatRoughness={0.05} envMapIntensity={1.1} />
        )}
      </mesh>
      {kind === 'neon' ? (
        <group position={[0, shelfYs[1], -backD / 2 + 0.08]}>
          <NeonSign width={W} />
        </group>
      ) : null}
      {/* Montants de module */}
      {Array.from({ length: moduleCount + 1 }).map((_, i) => (
        <mesh key={`post-${i}`} position={[((i / moduleCount) - 0.5) * (W - 0.05), baseH + panelH / 2, -backD / 2 + 0.16]} castShadow>
          <boxGeometry args={[0.05, panelH, 0.26]} />
          <SurfaceMat color="#2a1d14" finish="wood" roughness={0.5} repeat={[0.3, 1]} vertical />
        </mesh>
      ))}
      {/* Étagères verre + réglette LED sous le chant avant */}
      {shelfYs.map((y) =>
        (neonGap ? [-1, 1] : [0]).map((side) => {
          const sw = neonGap ? (shelfW - neonGap) / 2 : shelfW;
          const sx = neonGap ? side * (neonGap / 2 + sw / 2) : 0;
          return (
            <group key={`shelf-${y}-${side}`} position={[sx, y, shelfZ]}>
              <mesh receiveShadow>
                <boxGeometry args={[sw, 0.018, 0.26]} />
                <meshPhysicalMaterial color="#d8efe9" roughness={0.05} transparent opacity={0.45} clearcoat={1} />
              </mesh>
              <LedStrip position={[0, -0.014, 0.115]} length={sw} />
            </group>
          );
        }),
      )}
      {/* Corniche avec bandeau LED */}
      <mesh position={[0, baseH + panelH + 0.05, -backD / 2 + 0.16]} castShadow>
        <boxGeometry args={[W + 0.04, 0.1, 0.3]} />
        <SurfaceMat color="#2a1d14" finish="wood" roughness={0.5} repeat={[Math.max(1, W / 1.2), 1]} />
      </mesh>
      <LedStrip position={[0, baseH + panelH - 0.004, -backD / 2 + 0.28]} length={W * 0.96} />
      <BottleSet slots={slots} />
    </group>
  );
}

/** Casier à vins : grille de cases en bois, bouteilles couchées goulot vers la salle. */
function WineWallBack({ w, backD, style, colors, metal }: { w: number; backD: number; style: BarStyle; colors: string[]; metal: BarMetal }) {
  const baseH = BACK_BASE_H;
  const W = w * 0.96;
  const cellW = 0.34;
  const cellH = 0.27;
  const cols = Math.max(2, Math.floor((W - 0.06) / cellW));
  const rows = 5;
  const gridW = cols * cellW;
  const gridH = rows * cellH;
  const y0 = baseH + 0.06;
  const zBack = -backD / 2 + 0.04;
  const depth = Math.min(0.34, backD - 0.04);
  const slots = useMemo(() => {
    const out: BottleSlot[] = [];
    const wineColors = style === 'tapas' ? ['#3f1d1d', '#4a1515', '#14532d', '#2d1b14'] : colors;
    for (let c = 0; c < cols; c += 1) {
      for (let r = 0; r < rows; r += 1) {
        const cx = -gridW / 2 + (c + 0.5) * cellW;
        const cy = y0 + r * cellH;
        // Pile en pyramide : 3 bouteilles au fond de la case, 2 posées dessus.
        const spots: Array<[number, number]> = [[-0.078, 0.04], [0, 0.04], [0.078, 0.04], [-0.039, 0.108], [0.039, 0.108]];
        spots.forEach(([dx, dy], k) => {
          const seed = c * 97 + r * 31 + k * 7 + 1;
          if (rand(seed) > 0.93) return;
          out.push({ ...bottleSlot('wine', wineColors, seed, cx + dx, cy + dy, zBack + 0.01), kind: 'wine', lie: true });
        });
      }
    }
    return out;
  }, [cols, gridW, y0, zBack, style, colors]);
  const wood = '#5a3a22';
  return (
    <group>
      <BackCabinet W={W} backD={backD} metal={metal} wood="#3b2717" door="#4a3020" />
      {/* Fond et cadre */}
      <mesh position={[0, y0 + gridH / 2, -backD / 2 + 0.02]} castShadow>
        <boxGeometry args={[gridW + 0.08, gridH + 0.08, 0.04]} />
        <SurfaceMat color="#2b1d12" finish="wood" roughness={0.6} repeat={[Math.max(1, W / 1.2), 1]} />
      </mesh>
      {Array.from({ length: cols + 1 }).map((_, i) => (
        <mesh key={`v${i}`} position={[-gridW / 2 + i * cellW, y0 + gridH / 2, zBack + depth / 2]} castShadow receiveShadow>
          <boxGeometry args={[0.02, gridH, depth]} />
          <SurfaceMat color={wood} finish="wood" roughness={0.55} repeat={[0.3, 1]} vertical />
        </mesh>
      ))}
      {Array.from({ length: rows + 1 }).map((_, i) => (
        <mesh key={`h${i}`} position={[0, y0 + i * cellH - 0.01, zBack + depth / 2]} castShadow receiveShadow>
          <boxGeometry args={[gridW + 0.02, 0.02, depth]} />
          <SurfaceMat color={wood} finish="wood" roughness={0.55} repeat={[Math.max(1, W / 1.2), 0.3]} />
        </mesh>
      ))}
      <mesh position={[0, y0 + gridH + 0.06, -backD / 2 + 0.17]} castShadow>
        <boxGeometry args={[gridW + 0.12, 0.1, Math.min(0.36, backD)]} />
        <SurfaceMat color="#2b1d12" finish="wood" roughness={0.5} repeat={[Math.max(1, W / 1.2), 1]} />
      </mesh>
      <LedStrip position={[0, y0 + gridH + 0.006, zBack + depth - 0.02]} length={gridW} />
      <BottleSet slots={slots} />
    </group>
  );
}

/** Mur de tireuses : ardoise du jour, robinets muraux, étagères de pintes, fûts inox. */
function KegsBack({ w, backD, metal }: { w: number; backD: number; metal: BarMetal }) {
  const baseH = BACK_BASE_H;
  const W = w * 0.96;
  const boardW = W * 0.55;
  const boardH = 1.0;
  const boardX = -W / 2 + boardW / 2 + 0.04;
  const shelfW = W - boardW - 0.14;
  const shelfX = W / 2 - shelfW / 2 - 0.04;
  const taps = Math.max(4, Math.min(10, Math.floor(boardW / 0.16)));
  const chalk = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => ({
        y: boardH / 2 - 0.16 - i * 0.11,
        len: (0.35 + rand(i * 5 + 2) * 0.4) * (boardW - 0.2),
        price: i > 0,
      })),
    [boardW],
  );
  const glassRows = [baseH + 0.42, baseH + 0.82];
  const glassPos = useMemo(() => {
    const n = Math.max(2, Math.floor((shelfW - 0.1) / 0.1));
    return Array.from({ length: n }, (_, i) => [shelfX + (i + 0.5 - n / 2) * ((shelfW - 0.1) / n), -backD / 2 + 0.16] as [number, number]);
  }, [shelfW, shelfX, backD]);
  return (
    <group>
      <BackCabinet W={W} backD={backD} metal={metal} wood="#3a2a1e" door="#4a3424" />
      {/* Lambris brique derrière */}
      <mesh position={[0, baseH + 0.7, -backD / 2 + 0.01]} receiveShadow>
        <boxGeometry args={[W, 1.4, 0.02]} />
        <GenSurface name="wall-brick" repeat={[W / 1.6, 1.4 / 1.6]} roughness={0.85} />
      </mesh>
      {/* Ardoise encadrée */}
      <group position={[boardX, baseH + 0.25 + boardH / 2, -backD / 2 + 0.035]}>
        <mesh castShadow>
          <boxGeometry args={[boardW + 0.06, boardH + 0.06, 0.03]} />
          <SurfaceMat color="#6b4a2e" finish="wood" roughness={0.55} />
        </mesh>
        <mesh position={[0, 0, 0.017]}>
          <boxGeometry args={[boardW, boardH, 0.006]} />
          <GenSurface name="wall-slate" repeat={[boardW / 1.6, boardH / 1.6]} color="#3a3d40" roughness={0.9} normalScale={0.3} />
        </mesh>
        <mesh position={[0, boardH / 2 - 0.08, 0.022]}>
          <boxGeometry args={[boardW * 0.5, 0.04, 0.002]} />
          <meshStandardMaterial color="#f5f0e1" roughness={1} />
        </mesh>
        {chalk.slice(1).map((c) => (
          <group key={c.y}>
            <mesh position={[-boardW / 2 + 0.1 + c.len / 2, c.y, 0.022]}>
              <boxGeometry args={[c.len, 0.016, 0.002]} />
              <meshStandardMaterial color="#e7e2d4" roughness={1} />
            </mesh>
            <mesh position={[boardW / 2 - 0.12, c.y, 0.022]}>
              <boxGeometry args={[0.08, 0.016, 0.002]} />
              <meshStandardMaterial color="#fcd34d" roughness={1} />
            </mesh>
          </group>
        ))}
      </group>
      {/* Robinets muraux sous l’ardoise */}
      <group position={[boardX, baseH + 0.16, -backD / 2 + 0.06]}>
        <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.022, 0.022, boardW, 14]} />
          <MetalMat metal={metal === 'black' ? 'chrome' : metal} />
        </mesh>
        {Array.from({ length: taps }).map((_, i) => (
          <group key={i} position={[(i + 0.5 - taps / 2) * (boardW / taps), 0, 0.03]}>
            <mesh position={[0, -0.04, 0.02]}>
              <cylinderGeometry args={[0.008, 0.01, 0.06, 8]} />
              <MetalMat metal="chrome" />
            </mesh>
            <mesh position={[0, 0.07, 0.01]} castShadow>
              <cylinderGeometry args={[0.014, 0.01, 0.14, 10]} />
              <Mat color={['#1c1917', '#7c2d12', '#14532d', '#1e3a5f', '#854d0e'][i % 5]} roughness={0.35} />
            </mesh>
          </group>
        ))}
      </group>
      {/* Étagères de pintes */}
      {glassRows.map((y) => (
        <group key={y}>
          <mesh position={[shelfX, y - 0.012, -backD / 2 + 0.16]} castShadow receiveShadow>
            <boxGeometry args={[shelfW, 0.024, 0.26]} />
            <SurfaceMat color="#6b4a2e" finish="wood" roughness={0.55} />
          </mesh>
          <BarGlassSet style="beer" positions={glassPos} y={y} />
        </group>
      ))}
      {/* Fûts inox posés au bout du meuble */}
      {[0, 1].map((k) => (
        <group key={k} position={[shelfX + (k - 0.5) * 0.36, baseH, -backD / 2 + 0.2]}>
          <mesh position={[0, 0.26, 0]} castShadow>
            <cylinderGeometry args={[0.16, 0.16, 0.52, 24]} />
            <SurfaceMat color="#cfd2d6" finish="metal" metalness={0.9} roughness={0.28} />
          </mesh>
          {[0.03, 0.49].map((y) => (
            <mesh key={y} position={[0, y, 0]}>
              <torusGeometry args={[0.162, 0.012, 8, 32]} />
              <SurfaceMat color="#b8bcc1" finish="metal" metalness={0.9} roughness={0.25} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

/** Étagères ouvertes sur carrelage : bocaux, piles de tasses, sacs de café et ardoise du menu. */
function CafeBack({ w, backD, style, metal }: { w: number; backD: number; style: BarStyle; metal: BarMetal }) {
  const baseH = BACK_BASE_H;
  const W = w * 0.96;
  const shelfYs = [baseH + 0.5, baseH + 0.92];
  const shelfZ = -backD / 2 + 0.14;
  const jarColors = style === 'juice' ? ['#ea580c', '#65a30d', '#eab308', '#db2777'] : style === 'tea' ? ['#14532d', '#78350f', '#a16207', '#7f1d1d'] : ['#3b2415', '#1c1917', '#78350f'];
  const jars = useMemo(() => {
    const out: BottleSlot[] = [];
    shelfYs.forEach((y, row) => {
      const n = Math.floor((W * 0.5) / 0.11);
      for (let i = 0; i < n; i += 1) {
        const seed = row * 53 + i * 13 + 5;
        if (rand(seed) > 0.85) continue;
        out.push({ ...bottleSlot(style, jarColors, seed, -W / 2 + 0.12 + i * 0.11, y, shelfZ), kind: 'squat' });
      }
    });
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [W, shelfZ, style]);
  const cupStacks = useMemo(() => {
    const n = Math.max(2, Math.floor((W * 0.4) / 0.12));
    return Array.from({ length: n }, (_, i) => ({ x: W / 2 - 0.1 - i * 0.12, h: 3 + Math.floor(rand(i * 9 + 1) * 4) }));
  }, [W]);
  return (
    <group>
      <BackCabinet W={W} backD={backD} metal={metal} wood="#e8e2d8" door="#f2ede6" />
      {/* Crédence carrelage métro */}
      <mesh position={[0, baseH + 0.75, -backD / 2 + 0.01]} receiveShadow>
        <boxGeometry args={[W, 1.5, 0.02]} />
        <GenSurface name="wall-metro" repeat={[W / 0.8, 1.5 / 0.8]} color="#f4f2ee" roughness={0.2} />
      </mesh>
      {shelfYs.map((y) => (
        <group key={y}>
          <mesh position={[0, y - 0.02, shelfZ]} castShadow receiveShadow>
            <boxGeometry args={[W * 0.96, 0.04, 0.24]} />
            <SurfaceMat color="#9a6b43" finish="wood" roughness={0.5} repeat={[Math.max(1, W / 1.2), 0.3]} />
          </mesh>
          {Array.from({ length: Math.max(2, Math.round(W / 1.1) + 1) }).map((_, i, arr) => (
            <mesh key={i} position={[((i / (arr.length - 1)) - 0.5) * W * 0.9, y - 0.08, shelfZ - 0.04]} castShadow>
              <boxGeometry args={[0.02, 0.12, 0.16]} />
              <MetalMat metal="black" />
            </mesh>
          ))}
        </group>
      ))}
      <BottleSet slots={jars} />
      {/* Piles de tasses sur l’étagère basse */}
      {cupStacks.map((c) => (
        <group key={c.x} position={[c.x, shelfYs[0], shelfZ]}>
          {Array.from({ length: c.h }).map((_, k) => (
            <mesh key={k} position={[0, 0.03 + k * 0.045, 0]} castShadow>
              <cylinderGeometry args={[0.042, 0.032, 0.05, 16]} />
              <SurfaceMat color="#f8fafc" finish="ceramic" roughness={0.22} />
            </mesh>
          ))}
        </group>
      ))}
      {/* Sacs de café (ou boîtes à thé) sur l’étagère haute */}
      {[0, 1, 2].map((k) => (
        <mesh key={k} position={[W / 2 - 0.15 - k * 0.16, shelfYs[1] + 0.11, shelfZ]} castShadow>
          <boxGeometry args={[0.12, 0.22, 0.08]} />
          <SurfaceMat color={style === 'tea' ? ['#14532d', '#7f1d1d', '#a16207'][k] : '#b08d5c'} finish={style === 'tea' ? 'metal' : 'plain'} roughness={style === 'tea' ? 0.35 : 0.85} metalness={style === 'tea' ? 0.5 : 0} />
        </mesh>
      ))}
      {/* Ardoise du menu */}
      <group position={[0, shelfYs[1] + 0.48, -backD / 2 + 0.04]}>
        <mesh castShadow>
          <boxGeometry args={[Math.min(1.6, W * 0.5) + 0.05, 0.6, 0.03]} />
          <SurfaceMat color="#2b1d12" finish="wood" roughness={0.55} />
        </mesh>
        <mesh position={[0, 0, 0.017]}>
          <boxGeometry args={[Math.min(1.6, W * 0.5), 0.55, 0.004]} />
          <GenSurface name="wall-slate" repeat={[1, 0.5]} color="#33363a" roughness={0.9} normalScale={0.3} />
        </mesh>
        {[0.16, 0.06, -0.04, -0.14].map((y, i) => (
          <mesh key={y} position={[-0.1 + (i % 2) * 0.05, y, 0.021]}>
            <boxGeometry args={[Math.min(1.6, W * 0.5) * (0.5 - i * 0.06), 0.014, 0.002]} />
            <meshStandardMaterial color="#ece7da" roughness={1} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function BarBackUnit({ w, backD, style, colors, design }: { w: number; backD: number; style: BarStyle; colors: string[]; design: BarDesign }) {
  switch (design.back) {
    case 'wineWall':
      return <WineWallBack w={w} backD={backD} style={style} colors={colors} metal={design.metal} />;
    case 'kegs':
      return <KegsBack w={w} backD={backD} metal={design.metal} />;
    case 'cafe':
      return <CafeBack w={w} backD={backD} style={style} metal={design.metal} />;
    default:
      return <ShelvedBackBar w={w} backD={backD} style={style} colors={colors} kind={design.back} metal={design.metal} />;
  }
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
  design: overrides,
}: EventBarMeshProps) {
  const body = selected ? '#c7d2fe' : color ?? '#292524';
  const bottles = BOTTLE_COLORS[style] ?? BOTTLE_COLORS.cocktail;
  const glassCount = Math.min(BAR_GLASS_MAX, Math.max(3, Math.round(w * 1.4)));
  const stoolCount = Math.min(BAR_STOOL_MAX, Math.max(2, Math.floor(w / 0.62)));
  const isIsland = style === 'island';
  const isL = style === 'lShaped';
  const design = useMemo(
    () => resolveBarDesign(style, overrides),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [style, overrides?.barFront, overrides?.barTop, overrides?.barBack, overrides?.barStool, overrides?.barMetal],
  );
  const stoolTint = STOOL_TINT[style];

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

  const counterProps = { height, body, style, colors: bottles, design };
  const stool = (x: number, z: number, key: string, rotY = 0) => (
    <group key={key} position={[x, 0, z]} rotation={[0, rotY, 0]}>
      <BarStoolModel kind={design.stool} metal={design.metal} tint={stoolTint} x={0} z={0} />
    </group>
  );

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
              <MetalMat metal={design.metal === 'chrome' ? 'chrome' : 'black'} />
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
            Array.from({ length: stoolCount }).map((_, i) =>
              stool(((i + 0.5) / stoolCount - 0.5) * w * 0.82, side * (d / 2 + 0.42), `s-${side}-${i}`, side > 0 ? 0 : Math.PI),
            ),
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
            <BarBackUnit w={w} backD={backD} style={style} colors={bottles} design={design} />
          </group>
          {Array.from({ length: stoolCount }).map((_, i) => stool(((i + 0.5) / stoolCount - 0.5) * w * 0.86, frontZ + 0.42, `s-${i}`))}
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
