'use client';

/**
 * Habillage de scène : jupe plissée, rideau de fond à plis, escalier d’accès avec main courante,
 * et habillages complets (portique truss lumière, concert, mariage).
 * Repère local de la scène : origine au sol au centre, plateau à y = `height`, public vers +Z.
 */

import React, { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import type { StageRig, ZoneMaterial } from '@/lib/roomLayoutUtils';
import { resolveDeckSurface } from '@/lib/roomWebGLMaterials';

// ───────────────────────── textures ─────────────────────────

let pleatCache: THREE.Texture | null = null;
/** Plis verticaux de molleton (un motif = un pli d’environ 12 cm), en niveaux de gris à teinter. */
export function pleatTexture(): THREE.Texture | null {
  if (pleatCache || typeof document === 'undefined') return pleatCache;
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 4;
  const ctx = c.getContext('2d');
  if (ctx) {
    const g = ctx.createLinearGradient(0, 0, 64, 0);
    g.addColorStop(0, '#5a5a5a');
    g.addColorStop(0.3, '#ffffff');
    g.addColorStop(0.55, '#d9d9d9');
    g.addColorStop(0.85, '#7a7a7a');
    g.addColorStop(1, '#5a5a5a');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 4);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  pleatCache = t;
  return t;
}

/** Copie de la texture de plis répétée pour une face de `widthM` m. */
export function usePleatMap(widthM: number): THREE.Texture | null {
  const map = useMemo(() => {
    const base = pleatTexture();
    if (!base) return null;
    const t = base.clone();
    t.repeat.set(Math.max(1, Math.round(widthM / 0.12)), 1);
    t.needsUpdate = true;
    return t;
  }, [widthM]);
  useEffect(() => () => map?.dispose(), [map]);
  return map;
}

// ───────────────────────── rideau et escalier ─────────────────────────

/** Rideau à plis ondulés (vraie géométrie), centré en x, bas à y = 0, face au public (+Z). */
export function PleatedDrape({ width, height, color, foldM = 0.22, depth = 0.07, sheen = 0.85 }: { width: number; height: number; color: string; foldM?: number; depth?: number; sheen?: number }) {
  const geo = useMemo(() => {
    const folds = Math.max(4, Math.round(width / foldM));
    const g = new THREE.PlaneGeometry(width, height, folds * 6, 1);
    const p = g.getAttribute('position');
    for (let i = 0; i < p.count; i += 1) {
      const x = p.getX(i);
      p.setZ(i, Math.sin(((x + width / 2) / width) * folds * Math.PI * 2) * depth);
    }
    g.translate(0, height / 2, 0);
    g.computeVertexNormals();
    return g;
  }, [width, height, foldM, depth]);
  useEffect(() => () => geo.dispose(), [geo]);
  return (
    <mesh geometry={geo} castShadow receiveShadow>
      <meshStandardMaterial color={color} roughness={sheen} side={THREE.DoubleSide} />
    </mesh>
  );
}

// Dimensions de l’escalier d’accès (m).
const STAIR_TREAD = 0.3; // giron
const STAIR_NOSE = 0.025; // débord du nez de marche sur la contremarche
const STAIR_TREAD_T = 0.032; // épaisseur du plateau de marche
const STAIR_CHEEK_T = 0.04; // épaisseur d’un limon
const STAIR_CHEEK_ABOVE = 0.06; // hauteur du limon au-dessus de la ligne des nez
const STAIR_RAIL_H = 0.9; // main courante au-dessus de la ligne des nez
const STAIR_RAIL_R = 0.021; // rayon du tube de main courante (Ø 42 mm)

/** Polyligne aux angles arrondis (rayon `r`) pour un tube de main courante. */
function roundedPath(points: THREE.Vector3[], r: number): THREE.CurvePath<THREE.Vector3> {
  const path = new THREE.CurvePath<THREE.Vector3>();
  let cursor = points[0].clone();
  for (let i = 1; i < points.length; i += 1) {
    const p = points[i];
    const next = points[i + 1];
    if (!next) {
      path.add(new THREE.LineCurve3(cursor, p.clone()));
      break;
    }
    const inDir = new THREE.Vector3().subVectors(p, points[i - 1]);
    const outDir = new THREE.Vector3().subVectors(next, p);
    const k = Math.min(r, inDir.length() / 2, outDir.length() / 2);
    const a = p.clone().addScaledVector(inDir.normalize(), -k);
    const b = p.clone().addScaledVector(outDir.normalize(), k);
    path.add(new THREE.LineCurve3(cursor, a));
    path.add(new THREE.QuadraticBezierCurve3(a, p.clone(), b));
    cursor = b;
  }
  return path;
}

/** Profil latéral (XY) d’un escalier montant vers −X : dents de scie, contremarches en retrait du nez. */
function stairProfile(n: number, rise: number, inset: number, lift: number): THREE.Shape {
  const run = n * STAIR_TREAD;
  const sh = new THREE.Shape();
  sh.moveTo(0, 0);
  sh.lineTo(run - inset, 0);
  for (let k = 0; k < n; k += 1) {
    const front = run - k * STAIR_TREAD - inset;
    const top = rise * (k + 1) - lift;
    sh.lineTo(front, top);
    sh.lineTo(k === n - 1 ? 0 : front - STAIR_TREAD, top);
  }
  sh.closePath();
  return sh;
}

type StairGeometries = Record<'carcass' | 'cheeks' | 'treads' | 'nose' | 'grip' | 'led' | 'rail', THREE.BufferGeometry>;

function buildStairGeometries(height: number, width: number): StairGeometries {
  const n = Math.max(2, Math.round(height / 0.17));
  const rise = height / n;
  const run = n * STAIR_TREAD;
  const inner = width - 2 * STAIR_CHEEK_T;
  const merge = (parts: THREE.BufferGeometry[]) => {
    const g = mergeGeometries(parts.map((p) => (p.index ? p.toNonIndexed() : p))) ?? new THREE.BufferGeometry();
    parts.forEach((p) => p.dispose());
    return g;
  };

  // Caisson : contremarches pleines, en retrait du nez de marche, sous les plateaux.
  const carcass = new THREE.ExtrudeGeometry(stairProfile(n, rise, STAIR_NOSE, STAIR_TREAD_T), { depth: inner, bevelEnabled: false });
  carcass.translate(0, 0, -inner / 2);

  // Limons : joues latérales fermées qui suivent la pente, chants légèrement arrondis.
  const slopeY = (x: number) => rise + ((run - x) * rise) / STAIR_TREAD; // ligne des nez
  const cheekShape = new THREE.Shape();
  const bev = 0.006;
  cheekShape.moveTo(0, 0);
  cheekShape.lineTo(run, 0);
  cheekShape.lineTo(run, slopeY(run) + STAIR_CHEEK_ABOVE - 0.02);
  cheekShape.lineTo(STAIR_TREAD, slopeY(STAIR_TREAD) + STAIR_CHEEK_ABOVE - 0.02);
  cheekShape.lineTo(0, height + STAIR_CHEEK_ABOVE - 0.02);
  cheekShape.closePath();
  const cheekParts = ([-1, 1] as const).map((s) => {
    const g = new THREE.ExtrudeGeometry(cheekShape, {
      depth: STAIR_CHEEK_T - 2 * bev,
      bevelEnabled: true,
      bevelThickness: bev,
      bevelSize: bev,
      bevelSegments: 2,
      curveSegments: 1,
    });
    g.translate(0, 0, s < 0 ? -width / 2 + bev : width / 2 - STAIR_CHEEK_T + bev);
    return g;
  });

  // Plateaux de marche à chants arrondis, débordant de STAIR_NOSE sur la contremarche.
  const treadParts: THREE.BufferGeometry[] = [];
  const noseParts: THREE.BufferGeometry[] = [];
  const gripParts: THREE.BufferGeometry[] = [];
  const ledParts: THREE.BufferGeometry[] = [];
  for (let k = 0; k < n; k += 1) {
    const top = rise * (k + 1);
    const front = run - k * STAIR_TREAD;
    const depth = k === n - 1 ? STAIR_TREAD : STAIR_TREAD + STAIR_NOSE;
    const t = new RoundedBoxGeometry(depth, STAIR_TREAD_T, inner + 0.004, 2, 0.006);
    t.translate(front - depth / 2, top - STAIR_TREAD_T / 2, 0);
    treadParts.push(t);
    // Nez aluminium en L : aile horizontale + retour vertical sur le chant.
    const wing = new RoundedBoxGeometry(0.055, 0.006, inner, 1, 0.002);
    wing.translate(front - 0.0275 + 0.002, top + 0.002, 0);
    const lip = new RoundedBoxGeometry(0.006, 0.04, inner, 1, 0.002);
    lip.translate(front + 0.002, top - 0.016, 0);
    noseParts.push(wing, lip);
    // Bande antidérapante caoutchouc incrustée dans l’aile.
    const grip = new THREE.BoxGeometry(0.03, 0.002, inner - 0.05);
    grip.translate(front - 0.03, top + 0.0055, 0);
    gripParts.push(grip);
    // Ruban LED de balisage sous le nez (lumière rasante sur la contremarche).
    const led = new THREE.BoxGeometry(0.006, 0.008, inner - 0.04);
    led.translate(front - STAIR_NOSE + 0.004, top - STAIR_TREAD_T - 0.006, 0);
    ledParts.push(led);
  }

  // Mains courantes : tube Ø 42 mm prolongé en haut et en bas, retours arrondis, poteaux sur platines.
  const railParts: THREE.BufferGeometry[] = [];
  const postXs = [run - 0.12, STAIR_TREAD * 0.5];
  if (run > 1.6) postXs.splice(1, 0, (run + STAIR_TREAD) / 2);
  const cheekTop = (x: number) => (x >= STAIR_TREAD ? slopeY(x) : height) + STAIR_CHEEK_ABOVE - 0.02;
  const railY = (x: number) => (x >= STAIR_TREAD ? slopeY(x) : height) + STAIR_RAIL_H;
  for (const s of [-1, 1] as const) {
    const z = s * (width / 2 - STAIR_CHEEK_T / 2);
    const yb = slopeY(run) + STAIR_RAIL_H;
    const yt = height + STAIR_RAIL_H;
    const top = roundedPath(
      [
        new THREE.Vector3(run + 0.24, yb - 0.11, z),
        new THREE.Vector3(run + 0.24, yb, z),
        new THREE.Vector3(run, yb, z),
        new THREE.Vector3(STAIR_TREAD, yt, z),
        new THREE.Vector3(0.04, yt, z),
        new THREE.Vector3(0.04, yt - 0.11, z),
      ],
      0.07,
    );
    railParts.push(new THREE.TubeGeometry(top, 96, STAIR_RAIL_R, 14, false));
    // Lisse intermédiaire, à mi-hauteur entre limon et main courante.
    const midH = STAIR_CHEEK_ABOVE + (STAIR_RAIL_H - STAIR_CHEEK_ABOVE) * 0.48;
    const mx0 = postXs[0];
    const mx1 = postXs[postXs.length - 1];
    const mid = roundedPath(
      [
        new THREE.Vector3(mx0, slopeY(mx0) + midH, z),
        new THREE.Vector3(STAIR_TREAD, slopeY(STAIR_TREAD) + midH, z),
        new THREE.Vector3(mx1, height + midH, z),
      ],
      0.06,
    );
    railParts.push(new THREE.TubeGeometry(mid, 48, 0.011, 10, false));
    for (const px of postXs) {
      const y0 = cheekTop(px);
      const y1 = railY(px);
      const post = new THREE.CylinderGeometry(0.019, 0.019, y1 - y0, 14, 1);
      post.translate(px, (y0 + y1) / 2, z);
      const plate = new THREE.CylinderGeometry(0.038, 0.042, 0.012, 20, 1);
      plate.translate(px, y0 + 0.006, z);
      railParts.push(post, plate);
    }
    // Embouts sphériques aux extrémités des retours.
    for (const [ex, ey] of [[run + 0.24, yb - 0.11], [0.04, yt - 0.11]] as const) {
      const cap = new THREE.SphereGeometry(STAIR_RAIL_R, 14, 8);
      cap.translate(ex, ey, z);
      railParts.push(cap);
    }
  }

  return {
    carcass,
    cheeks: merge(cheekParts),
    treads: merge(treadParts),
    nose: merge(noseParts),
    grip: merge(gripParts),
    led: merge(ledParts),
    rail: merge(railParts),
  };
}

/**
 * Escalier d’accès (marches de 17 cm environ) posé contre un flanc de la scène, montant vers −X
 * dans son repère : à placer avec une rotation selon le côté.
 * Construction de scène réelle : limons fermés, plateaux de marche assortis au plancher de la scène
 * débordant sur des contremarches en retrait, nez aluminium antidérapant, balisage LED et
 * main courante tubulaire prolongée en haut et en bas.
 */
export function StageStairs({
  height,
  width = 1.1,
  material,
  skirtColor = '#1c1a19',
  selected = false,
}: {
  height: number;
  width?: number;
  /** Matière du plancher de scène, reprise sur les plateaux de marche. */
  material?: ZoneMaterial;
  /** Teinte des contremarches et limons (jupe de scène). */
  skirtColor?: string;
  selected?: boolean;
}) {
  const geos = useMemo(() => buildStairGeometries(height, width), [height, width]);
  useEffect(() => () => Object.values(geos).forEach((g) => g.dispose()), [geos]);
  const surface = useMemo(() => resolveDeckSurface(material, STAIR_TREAD, width), [material, width]);
  const mats = useMemo(
    () => ({
      riser: new THREE.MeshStandardMaterial({ color: skirtColor, roughness: 0.9, metalness: 0 }),
      cheek: new THREE.MeshStandardMaterial({ color: '#242221', roughness: 0.55, metalness: 0.08 }),
      nose: new THREE.MeshStandardMaterial({ color: '#c9ccd1', metalness: 0.85, roughness: 0.32 }),
      grip: new THREE.MeshStandardMaterial({ color: '#2b2b2d', roughness: 0.95, metalness: 0 }),
      led: new THREE.MeshStandardMaterial({ color: '#fff4dc', emissive: '#ffd89a', emissiveIntensity: 1.6, roughness: 0.4 }),
      rail: new THREE.MeshStandardMaterial({ color: '#1f1f22', metalness: 0.6, roughness: 0.28 }),
    }),
    [skirtColor],
  );
  useEffect(() => () => Object.values(mats).forEach((m) => m.dispose()), [mats]);
  const tint = selected ? '#c7d2fe' : undefined;
  return (
    <group>
      <mesh geometry={geos.carcass} material={mats.riser} castShadow receiveShadow />
      <mesh geometry={geos.cheeks} material={mats.cheek} castShadow receiveShadow />
      <mesh geometry={geos.treads} castShadow receiveShadow>
        <meshStandardMaterial
          color={tint ?? surface.color}
          map={surface.map ?? undefined}
          normalMap={surface.normalMap ?? undefined}
          roughnessMap={surface.roughnessMap ?? undefined}
          roughness={surface.roughness}
          metalness={surface.metalness}
        />
      </mesh>
      <mesh geometry={geos.nose} material={mats.nose} castShadow receiveShadow />
      <mesh geometry={geos.grip} material={mats.grip} receiveShadow />
      <mesh geometry={geos.led} material={mats.led} />
      <mesh geometry={geos.rail} material={tint ? undefined : mats.rail} castShadow>
        {tint ? <meshStandardMaterial color={tint} metalness={0.4} roughness={0.35} /> : null}
      </mesh>
    </group>
  );
}

/** Longueur au sol de l’escalier d’accès pour une hauteur donnée (pour le placer). */
export function stageStairsRun(height: number): number {
  return Math.max(2, Math.round(height / 0.17)) * STAIR_TREAD;
}

// ───────────────────────── truss ─────────────────────────

const TRUSS = 0.29;

/** Poutre treillis carrée (4 membrures + diagonales) le long de +Y, de longueur `len`. */
function trussGeometry(len: number): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const h = TRUSS / 2;
  const corners: Array<[number, number]> = [[-h, -h], [h, -h], [h, h], [-h, h]];
  for (const [x, z] of corners) {
    const c = new THREE.CylinderGeometry(0.024, 0.024, len, 8, 1);
    c.translate(x, len / 2, z);
    parts.push(c);
  }
  const strut = (a: THREE.Vector3, b: THREE.Vector3) => {
    const d = new THREE.Vector3().subVectors(b, a);
    const l = d.length();
    const c = new THREE.CylinderGeometry(0.011, 0.011, l, 5, 1);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
    c.applyMatrix4(new THREE.Matrix4().compose(a.clone().add(b).multiplyScalar(0.5), q, new THREE.Vector3(1, 1, 1)));
    parts.push(c);
  };
  const n = Math.max(1, Math.floor(len / TRUSS));
  const step = len / n;
  for (let f = 0; f < 4; f += 1) {
    const [ax, az] = corners[f];
    const [bx, bz] = corners[(f + 1) % 4];
    for (let k = 0; k < n; k += 1) {
      const y0 = k * step;
      const flip = k % 2 === 0;
      strut(new THREE.Vector3(flip ? ax : bx, y0, flip ? az : bz), new THREE.Vector3(flip ? bx : ax, y0 + step, flip ? bz : az));
    }
  }
  const merged = mergeGeometries(parts) ?? new THREE.BufferGeometry();
  parts.forEach((p) => p.dispose());
  return merged;
}

const trussMaterial = new THREE.MeshStandardMaterial({ color: '#c8ccd2', metalness: 0.7, roughness: 0.35 });

/** Tronçon de truss tendu de `a` à `b`. */
function Truss({ a, b }: { a: [number, number, number]; b: [number, number, number] }) {
  const { geo, pos, quat } = useMemo(() => {
    const va = new THREE.Vector3(...a);
    const vb = new THREE.Vector3(...b);
    const dir = new THREE.Vector3().subVectors(vb, va);
    const len = dir.length();
    return {
      geo: trussGeometry(len),
      pos: va,
      quat: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize()),
    };
  }, [a, b]);
  useEffect(() => () => geo.dispose(), [geo]);
  return <mesh geometry={geo} position={pos} quaternion={quat} material={trussMaterial} castShadow />;
}

// ───────────────────────── projecteurs ─────────────────────────

const BEAM_COLORS = ['#ffb347', '#ff4fd8', '#5b8cff', '#ffe08a', '#a855f7', '#22d3ee'];

/** Faisceau visible (cône additif) de longueur `len`, pointant vers −Y. */
function BeamCone({ len, radius, color, opacity = 0.16 }: { len: number; radius: number; color: string; opacity?: number }) {
  const mat = useMemo(
    () => new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false }),
    [color, opacity],
  );
  useEffect(() => () => mat.dispose(), [mat]);
  return (
    <mesh position={[0, -len / 2, 0]} material={mat} renderOrder={3}>
      <cylinderGeometry args={[0.07, radius, len, 20, 1, true]} />
    </mesh>
  );
}

/** PAR LED suspendu, orienté vers `target` (repère de la scène). */
function ParCan({ at, target, color }: { at: [number, number, number]; target: [number, number, number]; color: string }) {
  const { quat, len } = useMemo(() => {
    const dir = new THREE.Vector3(target[0] - at[0], target[1] - at[1], target[2] - at[2]);
    const l = dir.length();
    return { quat: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir.normalize()), len: l };
  }, [at, target]);
  return (
    <group position={at} quaternion={quat}>
      <mesh castShadow>
        <cylinderGeometry args={[0.1, 0.09, 0.26, 14]} />
        <meshStandardMaterial color="#18181b" metalness={0.5} roughness={0.4} />
      </mesh>
      <mesh position={[0, -0.135, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.085, 18]} />
        <meshBasicMaterial color={color} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
      <BeamCone len={len * 0.95} radius={Math.min(0.8, len * 0.17)} color={color} />
    </group>
  );
}

/** Lyre asservie (moving head) qui balaie la scène. */
function MovingHead({ at, color, phase, beamLen }: { at: [number, number, number]; color: string; phase: number; beamLen: number }) {
  const yoke = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime * 0.7 + phase;
    if (yoke.current) yoke.current.rotation.y = Math.sin(t) * 0.9;
    if (head.current) head.current.rotation.x = 0.35 + Math.sin(t * 1.3 + 1) * 0.35;
  });
  return (
    <group position={at}>
      <mesh position={[0, 0.06, 0]} castShadow>
        <boxGeometry args={[0.32, 0.1, 0.24]} />
        <meshStandardMaterial color="#111113" metalness={0.4} roughness={0.5} />
      </mesh>
      <group ref={yoke} position={[0, -0.02, 0]}>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 0.15, -0.13, 0]}>
            <boxGeometry args={[0.04, 0.24, 0.12]} />
            <meshStandardMaterial color="#111113" metalness={0.4} roughness={0.5} />
          </mesh>
        ))}
        <group ref={head} position={[0, -0.2, 0]}>
          <mesh castShadow>
            <sphereGeometry args={[0.12, 16, 12]} />
            <meshStandardMaterial color="#18181b" metalness={0.5} roughness={0.35} />
          </mesh>
          <group position={[0, -0.1, 0]}>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <circleGeometry args={[0.06, 16]} />
              <meshBasicMaterial color={color} toneMapped={false} side={THREE.DoubleSide} />
            </mesh>
            <BeamCone len={beamLen} radius={0.32} color={color} opacity={0.2} />
          </group>
        </group>
      </group>
    </group>
  );
}

// ───────────────────────── concert : sono et écran ─────────────────────────

function LineArray({ at, side }: { at: [number, number, number]; side: 1 | -1 }) {
  return (
    <group position={at} rotation={[0, side * -0.25, 0]}>
      <mesh position={[0, 0.06, 0]}>
        <boxGeometry args={[0.95, 0.06, 0.55]} />
        <meshStandardMaterial color="#27272a" metalness={0.6} roughness={0.4} />
      </mesh>
      {Array.from({ length: 6 }).map((_, k) => (
        <group key={k} position={[0, -0.2 - k * 0.3, 0.01 * k * k]} rotation={[0.05 * k * k * 0.5, 0, 0]}>
          <mesh castShadow>
            <boxGeometry args={[0.9, 0.28, 0.5]} />
            <meshStandardMaterial color="#141416" roughness={0.75} />
          </mesh>
          <mesh position={[0, 0, 0.252]}>
            <planeGeometry args={[0.84, 0.22]} />
            <meshStandardMaterial color="#26262b" roughness={0.95} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Subwoofer({ at }: { at: [number, number, number] }) {
  return (
    <group position={at}>
      <mesh position={[0, 0.3, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.1, 0.6, 0.75]} />
        <meshStandardMaterial color="#121214" roughness={0.8} />
      </mesh>
      {[-0.26, 0.26].map((x) => (
        <mesh key={x} position={[x, 0.3, 0.377]}>
          <circleGeometry args={[0.2, 24]} />
          <meshStandardMaterial color="#202024" roughness={0.6} metalness={0.2} />
        </mesh>
      ))}
    </group>
  );
}

function Wedge({ at }: { at: [number, number, number] }) {
  return (
    <group position={at} rotation={[-0.55, 0, 0]}>
      <mesh position={[0, 0.16, 0]} castShadow>
        <boxGeometry args={[0.55, 0.3, 0.36]} />
        <meshStandardMaterial color="#151517" roughness={0.75} />
      </mesh>
      <mesh position={[0, 0.16, 0.182]}>
        <planeGeometry args={[0.48, 0.24]} />
        <meshStandardMaterial color="#2a2a2f" roughness={0.95} />
      </mesh>
    </group>
  );
}

/** Mur LED : dégradé animé qui défile (texture décalée à chaque image). */
function LedWall({ width, height }: { width: number; height: number }) {
  const tex = useMemo(() => {
    if (typeof document === 'undefined') return null;
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 64;
    const ctx = c.getContext('2d');
    if (ctx) {
      const g = ctx.createLinearGradient(0, 0, 256, 0);
      ['#3b0764', '#a21caf', '#f97316', '#facc15', '#22d3ee', '#3b0764'].forEach((col, i, arr) => g.addColorStop(i / (arr.length - 1), col));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 256, 64);
      // Grille de modules (50 cm) et pixels.
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      for (let x = 0; x < 256; x += 4) ctx.fillRect(x, 0, 1, 64);
      for (let y = 0; y < 64; y += 4) ctx.fillRect(0, y, 256, 1);
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = THREE.RepeatWrapping;
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
  useEffect(() => () => tex?.dispose(), [tex]);
  const screen = useRef<THREE.MeshBasicMaterial>(null);
  useFrame((_, dt) => {
    const map = screen.current?.map;
    if (map) map.offset.x = (map.offset.x + dt * 0.06) % 1;
  });
  return (
    <group>
      <mesh position={[0, 0, -0.06]} castShadow>
        <boxGeometry args={[width + 0.1, height + 0.1, 0.1]} />
        <meshStandardMaterial color="#0a0a0b" roughness={0.6} />
      </mesh>
      <mesh>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial ref={screen} map={tex ?? undefined} toneMapped={false} />
      </mesh>
    </group>
  );
}

// ───────────────────────── mariage : rideau lumineux ─────────────────────────

function FairyCurtain({ width, height }: { width: number; height: number }) {
  const pts = useMemo(() => {
    const out: Array<[number, number, number]> = [];
    const strands = Math.max(6, Math.round(width / 0.16));
    const per = Math.max(6, Math.round(height / 0.17));
    for (let i = 0; i < strands; i += 1) {
      const x = -width / 2 + ((i + 0.5) / strands) * width;
      for (let k = 0; k < per; k += 1) out.push([x, height - (k + 0.5) * (height / per) - (i % 2) * 0.06, (k * 13 + i * 7) % 10]);
    }
    return out;
  }, [width, height]);
  const ref = useRef<THREE.InstancedMesh>(null);
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false }), []);
  useEffect(() => () => mat.dispose(), [mat]);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    pts.forEach(([x, y], k) => {
      m.makeTranslation(x, y, 0.09);
      mesh.setMatrixAt(k, m);
      mesh.setColorAt(k, new THREE.Color('#ffe2a8'));
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [pts]);
  const tmp = useMemo(() => new THREE.Color(), []);
  useFrame(({ clock }) => {
    const mesh = ref.current;
    if (!mesh) return;
    const t = clock.elapsedTime;
    pts.forEach(([, , ph], k) => {
      const v = 0.55 + 0.45 * Math.sin(t * 2 + ph * 0.9 + k * 0.37);
      tmp.setRGB(1.3 * v, 1.05 * v, 0.62 * v);
      mesh.setColorAt(k, tmp);
    });
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });
  return (
    <instancedMesh key={pts.length} ref={ref} args={[undefined, mat, pts.length]}>
      <sphereGeometry args={[0.012, 6, 5]} />
    </instancedMesh>
  );
}

/** Lambrequin en festons au-dessus du rideau de mariage. */
function SwagValance({ width, color }: { width: number; color: string }) {
  const geo = useMemo(() => {
    const n = Math.max(2, Math.round(width / 1.2));
    const g = new THREE.PlaneGeometry(width, 0.5, n * 16, 6);
    const p = g.getAttribute('position');
    for (let i = 0; i < p.count; i += 1) {
      const x = p.getX(i);
      const y = p.getY(i);
      const u = (((x + width / 2) / width) * n) % 1;
      const v = (0.25 - y) / 0.5; // 0 en haut, 1 en bas
      const drop = 0.32 * Math.sin(Math.PI * u) * v;
      p.setY(i, y - drop);
      p.setZ(i, 0.06 * Math.sin(Math.PI * u) * v + 0.02 * Math.sin(x * 40));
    }
    g.computeVertexNormals();
    return g;
  }, [width]);
  useEffect(() => () => geo.dispose(), [geo]);
  return (
    <mesh geometry={geo} castShadow>
      <meshStandardMaterial color={color} roughness={0.7} side={THREE.DoubleSide} />
    </mesh>
  );
}

// ───────────────────────── habillage complet ─────────────────────────

/**
 * Habillage de scène. `w` × `d` = emprise, `height` = hauteur du plateau,
 * `ceilingY` = plafond disponible (même repère). `flower` = composition florale (mariage).
 */
export function StageRigDressing({
  rig,
  w,
  d,
  height,
  ceilingY,
  flower,
  shape = 'rect',
}: {
  rig: StageRig;
  /** Demi-lune : le portique avant recule là où le plateau est encore large. */
  shape?: 'rect' | 'semiCircle';
  w: number;
  d: number;
  height: number;
  ceilingY: number;
  flower?: (pos: [number, number, number], scale: number) => React.ReactNode;
}) {
  const top = Math.max(height + 2.4, Math.min(ceilingY - 0.3, height + 5));
  const beamY = top - TRUSS / 2;
  const semi = shape === 'semiCircle';
  // Demi-lune (bord droit au fond) : largeur du plateau à 35 % de la profondeur ≈ 94 % du rayon.
  const tx = Math.max(0.6, semi ? (w / 2) * 0.93 - 0.3 : w / 2 - 0.2);
  const frontZ = semi ? -d / 2 + d * 0.35 : d / 2 - 0.25;
  const backZ = -d / 2 + 0.25;

  const pars = useMemo(() => {
    if (rig !== 'truss' && rig !== 'concert') return [];
    const n = Math.max(3, Math.min(10, Math.round(w / 1.1)));
    return Array.from({ length: n }, (_, k) => {
      const x = -tx + 0.35 + ((k + 0.5) / n) * (2 * tx - 0.7);
      return {
        at: [x, beamY - 0.36, frontZ] as [number, number, number],
        target: [x * 0.6, height, -d * 0.12] as [number, number, number],
        color: BEAM_COLORS[k % BEAM_COLORS.length],
      };
    });
  }, [rig, w, tx, beamY, frontZ, height, d]);

  if (rig === 'none') return null;

  if (rig === 'wedding') {
    const dh = Math.max(1.8, Math.min(3.4, ceilingY - height - 0.25));
    const dw = w * 0.94;
    return (
      <group>
        <group position={[0, height, -d / 2 + 0.3]}>
          <PleatedDrape width={dw} height={dh} color="#f6efe4" foldM={0.26} depth={0.08} />
          <FairyCurtain width={dw * 0.96} height={dh * 0.96} />
          <group position={[0, dh - 0.12, 0.12]}>
            <SwagValance width={dw} color="#efe4d2" />
          </group>
          <pointLight position={[0, dh * 0.6, 0.9]} intensity={1.2} distance={6} color="#ffd9a0" />
        </group>
        {flower
          ? ([-1, 1] as const).map((s) => (
              <React.Fragment key={s}>
                {flower([s * (w / 2 - 0.35), height, d / 2 - 0.3], 2.2)}
                {flower([s * (w / 2 - 0.3), height, -d / 2 + 0.45], 3)}
              </React.Fragment>
            ))
          : null}
      </group>
    );
  }

  const concert = rig === 'concert';
  return (
    <group>
      {/* Portique avant (et arrière en configuration concert) */}
      {([-1, 1] as const).map((s) => (
        <Truss key={`f${s}`} a={[s * tx, height, frontZ]} b={[s * tx, top, frontZ]} />
      ))}
      <Truss a={[-tx - TRUSS / 2, beamY, frontZ]} b={[tx + TRUSS / 2, beamY, frontZ]} />
      {concert ? (
        <>
          {([-1, 1] as const).map((s) => (
            <Truss key={`b${s}`} a={[s * tx, height, backZ]} b={[s * tx, top, backZ]} />
          ))}
          <Truss a={[-tx - TRUSS / 2, beamY, backZ]} b={[tx + TRUSS / 2, beamY, backZ]} />
          {([-1, 1] as const).map((s) => (
            <Truss key={`s${s}`} a={[s * tx, beamY, backZ + TRUSS / 2]} b={[s * tx, beamY, frontZ - TRUSS / 2]} />
          ))}
        </>
      ) : null}
      {/* Platines de pied */}
      {(concert ? [frontZ, backZ] : [frontZ]).flatMap((z) =>
        ([-1, 1] as const).map((s) => (
          <mesh key={`${z}${s}`} position={[s * tx, height + 0.01, z]} castShadow>
            <boxGeometry args={[0.6, 0.02, 0.6]} />
            <meshStandardMaterial color="#3f3f46" metalness={0.6} roughness={0.4} />
          </mesh>
        )),
      )}
      {pars.map((p, k) => (
        <ParCan key={k} at={p.at} target={p.target} color={p.color} />
      ))}
      {([-1, 1] as const).map((s, k) => (
        <MovingHead key={s} at={[s * tx * 0.5, beamY + TRUSS / 2 + 0.02, frontZ]} color={k ? '#c084fc' : '#7dd3fc'} phase={k * 2.1} beamLen={top - height + 0.6} />
      ))}
      <pointLight position={[0, top - 0.6, frontZ + 0.4]} intensity={2.2} distance={8} color="#ffd9b0" />
      {concert ? (
        <>
          {([-1, 1] as const).map((s) => (
            <LineArray key={`la${s}`} at={[s * (tx + 0.75), top - 0.1, frontZ]} side={s} />
          ))}
          {([-1, 1] as const).map((s) => (
            <Subwoofer key={`sb${s}`} at={[s * (w / 2 - 0.75), 0, d / 2 + 0.45]} />
          ))}
          {[-0.28, 0, 0.28].map((f) => (
            <Wedge key={f} at={[f * w, height, d / 2 - 0.35]} />
          ))}
          <group position={[0, height + 0.4 + Math.min(3, top - height - 1) / 2, backZ + 0.25]}>
            <LedWall width={Math.min(w * 0.62, 8)} height={Math.max(1.2, Math.min(3, top - height - 1))} />
          </group>
        </>
      ) : null}
    </group>
  );
}
