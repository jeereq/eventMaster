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
import type { StageRig } from '@/lib/roomLayoutUtils';

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

/**
 * Escalier d’accès (marches de 17 cm environ) posé contre un flanc de la scène, montant vers −X
 * dans son repère : à placer avec une rotation selon le côté.
 */
export function StageStairs({ height, width = 1.1 }: { height: number; width?: number }) {
  const n = Math.max(2, Math.round(height / 0.17));
  const rise = height / n;
  const tread = 0.3;
  const run = n * tread;
  const mats = useMemo(
    () => ({
      tread: new THREE.MeshStandardMaterial({ color: '#1c1917', roughness: 0.8 }),
      nose: new THREE.MeshStandardMaterial({ color: '#d4d4d8', metalness: 0.75, roughness: 0.3 }),
      rail: new THREE.MeshStandardMaterial({ color: '#27272a', metalness: 0.7, roughness: 0.3 }),
    }),
    [],
  );
  useEffect(() => () => Object.values(mats).forEach((m) => m.dispose()), [mats]);
  const railY = 0.9;
  const slope = Math.atan2(height, run);
  const railLen = Math.hypot(run, height);
  return (
    <group>
      {Array.from({ length: n }).map((_, k) => {
        // Marche k (0 = la plus basse) : bloc plein jusqu’au sol.
        const top = rise * (k + 1);
        const x = run - (k + 0.5) * tread;
        return (
          <group key={k}>
            <mesh position={[x, top / 2, 0]} material={mats.tread} castShadow receiveShadow>
              <boxGeometry args={[tread, top, width]} />
            </mesh>
            <mesh position={[x + tread / 2 - 0.02, top + 0.004, 0]} material={mats.nose}>
              <boxGeometry args={[0.04, 0.01, width * 0.98]} />
            </mesh>
          </group>
        );
      })}
      {([-1, 1] as const).map((s) => (
        <group key={s} position={[0, 0, s * (width / 2 - 0.03)]}>
          <mesh position={[run / 2, height / 2 + railY, 0]} rotation={[0, 0, slope]} material={mats.rail} castShadow>
            <boxGeometry args={[railLen, 0.04, 0.04]} />
          </mesh>
          {[0.08, run - 0.08].map((px, i) => {
            const base = i === 0 ? rise : height;
            const top = height * (1 - px / run) + railY;
            return (
              <mesh key={i} position={[px, (base + top) / 2, 0]} material={mats.rail} castShadow>
                <cylinderGeometry args={[0.02, 0.02, Math.max(0.1, top - base), 8]} />
              </mesh>
            );
          })}
        </group>
      ))}
    </group>
  );
}

/** Longueur au sol de l’escalier d’accès pour une hauteur donnée (pour le placer). */
export function stageStairsRun(height: number): number {
  return Math.max(2, Math.round(height / 0.17)) * 0.3;
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
