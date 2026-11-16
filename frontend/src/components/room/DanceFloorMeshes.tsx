'use client';

/**
 * Habillage des pistes de danse : dalles LED animées, ciel étoilé scintillant, laqué noir ou blanc,
 * monogramme central et boule à facettes avec ses éclats lumineux au sol.
 * Les pièces répétées sont dessinées en instances, mises à jour à chaque image.
 */

import React, { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import {
  danceTileColor,
  danceTileGrid,
  sanitizeMonogram,
  starlitPoints,
  type DanceFloorStyle,
  type DanceLedPattern,
} from '@/lib/roomDanceFloor';

function useDispose<T extends { dispose: () => void }>(items: T[]) {
  useEffect(() => () => items.forEach((m) => m.dispose()), [items]);
}

function LedTiles({ w, h, y, pattern, color }: { w: number; h: number; y: number; pattern: DanceLedPattern; color: string }) {
  const grid = useMemo(() => danceTileGrid(w, h, 0.6), [w, h]);
  const ref = useRef<THREE.InstancedMesh>(null);
  const lightA = useRef<THREE.PointLight>(null);
  const lightB = useRef<THREE.PointLight>(null);
  const mats = useMemo(
    () => [
      new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false }),
      new THREE.MeshStandardMaterial({ color: '#08080a', roughness: 0.35, metalness: 0.4 }),
    ],
    [],
  );
  useDispose(mats);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    grid.tiles.forEach((t, k) => {
      m.makeScale(t.size * 0.9, 1, t.size * 0.9);
      m.setPosition(t.x, 0, t.z);
      mesh.setMatrixAt(k, m);
      mesh.setColorAt(k, new THREE.Color(0, 0, 0));
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [grid]);
  const tmp = useMemo(() => new THREE.Color(), []);
  useFrame(({ clock }) => {
    const mesh = ref.current;
    if (!mesh) return;
    const t = clock.elapsedTime;
    let ar = 0;
    let ag = 0;
    let ab = 0;
    grid.tiles.forEach((tile, k) => {
      const [r, g, b] = danceTileColor(pattern, t, tile, grid.nx, grid.nz, color);
      ar += r;
      ag += g;
      ab += b;
      tmp.setRGB(r * 1.35, g * 1.35, b * 1.35);
      mesh.setColorAt(k, tmp);
    });
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    const n = Math.max(1, grid.tiles.length);
    // Reflet coloré sur les tables voisines : deux lampes qui reprennent la teinte moyenne.
    for (const l of [lightA.current, lightB.current]) if (l) l.color.setRGB(ar / n, ag / n, ab / n);
  });
  return (
    <group position={[0, y, 0]}>
      <mesh position={[0, -0.004, 0]} material={mats[1]} receiveShadow>
        <boxGeometry args={[w, 0.006, h]} />
      </mesh>
      <instancedMesh key={grid.tiles.length} ref={ref} args={[undefined, mats[0], grid.tiles.length]}>
        <boxGeometry args={[1, 0.01, 1]} />
      </instancedMesh>
      <pointLight ref={lightA} position={[-w * 0.25, 0.6, 0]} intensity={1.6} distance={Math.max(w, h) * 1.3} decay={2} />
      <pointLight ref={lightB} position={[w * 0.25, 0.6, 0]} intensity={1.6} distance={Math.max(w, h) * 1.3} decay={2} />
    </group>
  );
}

function StarlitFloor({ w, h, y }: { w: number; h: number; y: number }) {
  const stars = useMemo(() => starlitPoints(w, h), [w, h]);
  const ref = useRef<THREE.InstancedMesh>(null);
  const mats = useMemo(
    () => [
      new THREE.MeshStandardMaterial({ color: '#06060a', roughness: 0.12, metalness: 0.35 }),
      new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false }),
    ],
    [],
  );
  useDispose(mats);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    stars.forEach((s, k) => {
      m.makeScale(s.size, 1, s.size);
      m.setPosition(s.x, 0.002, s.z);
      mesh.setMatrixAt(k, m);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [stars]);
  const tmp = useMemo(() => new THREE.Color(), []);
  useFrame(({ clock }) => {
    const mesh = ref.current;
    if (!mesh) return;
    const t = clock.elapsedTime;
    stars.forEach((s, k) => {
      const v = 0.25 + 0.75 * Math.pow(0.5 + 0.5 * Math.sin(t * 2.2 + s.phase), 3);
      tmp.setRGB(v * 1.4, v * 1.32, v * 1.1);
      mesh.setColorAt(k, tmp);
    });
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });
  return (
    <group position={[0, y, 0]}>
      <mesh material={mats[0]} receiveShadow>
        <boxGeometry args={[w, 0.006, h]} />
      </mesh>
      <instancedMesh key={stars.length} ref={ref} args={[undefined, mats[1], stars.length]}>
        <cylinderGeometry args={[1, 1, 0.004, 6]} />
      </instancedMesh>
    </group>
  );
}

function GlossFloor({ w, h, y, white, accent }: { w: number; h: number; y: number; white: boolean; accent: string }) {
  const mats = useMemo(
    () => [
      new THREE.MeshPhysicalMaterial({ color: white ? '#f8f7f4' : '#050506', roughness: 0.06, metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.03 }),
      white
        ? new THREE.MeshStandardMaterial({ color: '#c9a24a', metalness: 0.9, roughness: 0.25 })
        : new THREE.MeshBasicMaterial({ color: accent, toneMapped: false }),
    ],
    [white, accent],
  );
  useDispose(mats);
  const inset = 0.22;
  return (
    <group position={[0, y, 0]}>
      <mesh material={mats[0]} receiveShadow>
        <boxGeometry args={[w, 0.006, h]} />
      </mesh>
      {/* Filet doré (blanc) ou liseré LED (noir) à 22 cm du bord */}
      {([
        [0, -h / 2 + inset, w - 2 * inset, 0.03],
        [0, h / 2 - inset, w - 2 * inset, 0.03],
        [-w / 2 + inset, 0, 0.03, h - 2 * inset],
        [w / 2 - inset, 0, 0.03, h - 2 * inset],
      ] as const).map(([x, z, bw, bd], i) => (
        <mesh key={i} position={[x, 0.004, z]} material={mats[1]}>
          <boxGeometry args={[bw, 0.003, bd]} />
        </mesh>
      ))}
    </group>
  );
}

function Monogram({ text, size, y, color }: { text: string; size: number; y: number; color: string }) {
  const texture = useMemo(() => {
    if (typeof document === 'undefined') return null;
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 512;
    const ctx = c.getContext('2d');
    if (!ctx) return null;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.arc(256, 256, 226, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(256, 256, 208, 0, Math.PI * 2);
    ctx.stroke();
    // Petits fleurons aux quatre points cardinaux.
    for (let k = 0; k < 4; k += 1) {
      const a = (k * Math.PI) / 2;
      ctx.beginPath();
      ctx.arc(256 + Math.cos(a) * 217, 256 + Math.sin(a) * 217, 9, 0, Math.PI * 2);
      ctx.fill();
    }
    const fontSize = text.length <= 3 ? 190 : text.length <= 6 ? 120 : 76;
    ctx.font = `italic 600 ${fontSize}px Georgia, 'Times New Roman', serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 256, 266, 380);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  }, [text, color]);
  useEffect(() => () => texture?.dispose(), [texture]);
  if (!texture) return null;
  return (
    <mesh position={[0, y, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[size, size]} />
      <meshStandardMaterial map={texture} transparent depthWrite={false} metalness={0.6} roughness={0.3} polygonOffset polygonOffsetFactor={-4} />
    </mesh>
  );
}

/** Boule à facettes qui tourne, suspendue sous le plafond, et ses éclats balayant la piste. */
function MirrorBall({ w, h, y, ceilingY }: { w: number; h: number; y: number; ceilingY: number }) {
  const ball = useRef<THREE.Group>(null);
  const specks = useRef<THREE.Group>(null);
  const ballY = Math.max(y + 2.2, ceilingY - 0.9);
  const flecks = useMemo(
    () =>
      Array.from({ length: 70 }, (_, k) => {
        const a = (k * 2.399963) % (Math.PI * 2);
        const r = Math.sqrt((k + 0.5) / 70) * Math.min(w, h) * 0.46;
        return { x: Math.cos(a) * r, z: Math.sin(a) * r, s: 0.016 + ((k * 37) % 10) * 0.0022 };
      }),
    [w, h],
  );
  const mats = useMemo(
    () => [
      new THREE.MeshStandardMaterial({ color: '#e5e7eb', metalness: 1, roughness: 0.08, flatShading: true }),
      new THREE.MeshStandardMaterial({ color: '#52525b', metalness: 0.8, roughness: 0.3 }),
      new THREE.MeshBasicMaterial({ color: '#fff7e6', transparent: true, opacity: 0.4, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }),
    ],
    [],
  );
  useDispose(mats);
  useFrame((_, dt) => {
    if (ball.current) ball.current.rotation.y += dt * 0.5;
    if (specks.current) specks.current.rotation.y += dt * 0.5;
  });
  return (
    <group>
      <mesh position={[0, (ballY + ceilingY) / 2 + 0.15, 0]} material={mats[1]}>
        <cylinderGeometry args={[0.008, 0.008, Math.max(0.1, ceilingY - ballY - 0.3), 6]} />
      </mesh>
      <group ref={ball} position={[0, ballY, 0]}>
        <mesh material={mats[0]} castShadow>
          <icosahedronGeometry args={[0.28, 3]} />
        </mesh>
        <mesh position={[0, 0.3, 0]} material={mats[1]}>
          <cylinderGeometry args={[0.04, 0.06, 0.06, 10]} />
        </mesh>
      </group>
      <pointLight position={[0, ballY - 0.35, 0]} intensity={0.8} distance={7} color="#fff1d6" />
      <group ref={specks} position={[0, y + 0.012, 0]}>
        {flecks.map((f, k) => (
          <mesh key={k} position={[f.x, 0, f.z]} rotation={[-Math.PI / 2, 0, 0]} material={mats[2]}>
            <circleGeometry args={[f.s, 8]} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/**
 * Habillage posé sur la piste (repère local de la zone, sol à y = `top`).
 * `ceilingY` = hauteur du plafond dans ce repère (boule à facettes).
 */
export function DanceFloorDressing({
  w,
  h,
  top,
  style,
  pattern,
  color,
  monogram,
  mirrorBall,
  ceilingY,
}: {
  w: number;
  h: number;
  top: number;
  style: DanceFloorStyle;
  pattern?: DanceLedPattern;
  color?: string;
  monogram?: string;
  mirrorBall?: boolean;
  ceilingY: number;
}) {
  const text = sanitizeMonogram(monogram);
  const y = top + 0.003;
  const monogramColor = style === 'ledTiles' ? '#ffffff' : style === 'whiteGloss' ? '#b8892b' : '#d4af37';
  return (
    <group>
      {style === 'ledTiles' ? <LedTiles w={w} h={h} y={y} pattern={pattern ?? 'rainbow'} color={color ?? '#8b5cf6'} /> : null}
      {style === 'starlit' ? <StarlitFloor w={w} h={h} y={y} /> : null}
      {style === 'blackGloss' || style === 'whiteGloss' ? <GlossFloor w={w} h={h} y={y} white={style === 'whiteGloss'} accent={color ?? '#a855f7'} /> : null}
      {text ? <Monogram text={text} size={Math.min(w, h) * 0.46} y={y + 0.012} color={monogramColor} /> : null}
      {mirrorBall ? <MirrorBall w={w} h={h} y={y} ceilingY={ceilingY} /> : null}
    </group>
  );
}
