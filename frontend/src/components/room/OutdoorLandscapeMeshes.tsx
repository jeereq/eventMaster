'use client';

/**
 * Aménagements extérieurs en 3D : arbres, haies, massifs, eau, feu, clôtures, rochers,
 * et « abords » (terrain + décor qui entourent le plan : jardin, plage, forêt…).
 *
 * - Géométries procédurales à graine (même rendu à chaque ouverture) mises en cache.
 * - Feuillage, écorce, pierre et eau utilisent les textures générées (public/floors/gen) avec normales.
 * - Aucune lumière par élément, sauf le brasero : un décor chargé reste fluide sur mobile.
 */

import React, { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import { loadTiledTexture } from '@/lib/roomWebGLMaterials';
import {
  LANDSCAPE_STYLE_META,
  OUTDOOR_SURROUNDINGS_META,
  seededRandom,
  type LandscapeStyle,
  type OutdoorSurroundings,
} from '@/lib/roomOutdoorUtils';

// ───────────────────────── matières partagées ─────────────────────────

const matCache = new Map<string, THREE.Material>();

function texturedMat(
  key: string,
  url: string,
  repeat: number | [number, number],
  opts: Omit<THREE.MeshStandardMaterialParameters, 'normalScale'> & { normalScale?: number } = {},
): THREE.MeshStandardMaterial {
  const [rx, ry] = typeof repeat === 'number' ? [repeat, repeat] : repeat;
  const cacheKey = `${key}|${url}|${rx.toFixed(2)}x${ry.toFixed(2)}|${String(opts.color ?? '')}`;
  const cached = matCache.get(cacheKey);
  if (cached) return cached as THREE.MeshStandardMaterial;
  const { normalScale = 1, ...rest } = opts;
  const map = loadTiledTexture(url, rx, ry);
  const normalMap = loadTiledTexture(url.replace(/\.jpg$/, '-normal.jpg'), rx, ry, true);
  const mat = new THREE.MeshStandardMaterial({
    map,
    normalMap,
    normalScale: new THREE.Vector2(normalScale, normalScale),
    roughness: 0.85,
    metalness: 0,
    ...rest,
  });
  matCache.set(cacheKey, mat);
  return mat;
}

const foliageMat = (tint = '#ffffff', repeat: number | [number, number] = 2) =>
  texturedMat('foliage', '/floors/gen/foliage.jpg', repeat, { color: tint, roughness: 0.82, normalScale: 1.2 });
const barkMat = (tint = '#8d7a66') =>
  texturedMat('bark', '/floors/gen/wood-rustic.jpg', 1, { color: tint, roughness: 0.95, normalScale: 1.4 });
const stoneMat = (tint = '#ffffff', repeat = 1) =>
  texturedMat('stone', '/floors/gen/limestone-slabs.jpg', repeat, { color: tint, roughness: 0.88, normalScale: 1 });
const rockMat = (tint = '#a39d93') =>
  texturedMat('rock', '/floors/gen/concrete.jpg', 1, { color: tint, roughness: 0.92, normalScale: 2, flatShading: true });
const woodMat = (repeat = 1) =>
  texturedMat('deck', '/floors/gen/deck-ipe.jpg', repeat, { color: '#d9b894', roughness: 0.7, normalScale: 0.8 });

// ───────────────────────── géométries procédurales ─────────────────────────

const geoCache = new Map<string, THREE.BufferGeometry>();

/** Sphère déformée par un bruit de sinus à graine : couronne d'arbre, buisson, rocher. */
function blobGeometry(seed: number, detail = 3, roughness = 0.22): THREE.BufferGeometry {
  const key = `blob:${seed}:${detail}:${roughness}`;
  const cached = geoCache.get(key);
  if (cached) return cached;
  const g = new THREE.IcosahedronGeometry(1, detail);
  const rand = seededRandom(seed);
  const waves = Array.from({ length: 6 }, () => ({
    d: new THREE.Vector3(rand() - 0.5, rand() - 0.5, rand() - 0.5).normalize(),
    f: 1.5 + rand() * 4,
    p: rand() * Math.PI * 2,
    a: (0.3 + rand() * 0.7) * roughness,
  }));
  const pos = g.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i += 1) {
    v.fromBufferAttribute(pos, i);
    let k = 1;
    for (const w of waves) k += Math.sin(v.dot(w.d) * w.f + w.p) * w.a;
    v.multiplyScalar(Math.max(0.55, k));
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  geoCache.set(key, g);
  return g;
}

/** Palme : ruban effilé et retombant, folioles suggérées par une largeur en dents de scie. */
function frondGeometry(length: number): THREE.BufferGeometry {
  const key = `frond:${length.toFixed(2)}`;
  const cached = geoCache.get(key);
  if (cached) return cached;
  const segs = 18;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  for (let i = 0; i <= segs; i += 1) {
    const t = i / segs;
    const x = t * length;
    const y = -t * t * length * 0.55 + t * length * 0.18;
    const saw = i % 2 === 0 ? 1 : 0.55;
    const half = length * 0.2 * Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.1)), 0.8) * saw + 0.01;
    // Pli central : les folioles remontent en V.
    positions.push(x, y + half * 0.25, -half, x, y, 0, x, y + half * 0.25, half);
    uvs.push(t, 0, t, 0.5, t, 1);
  }
  for (let i = 0; i < segs; i += 1) {
    const a = i * 3;
    const b = (i + 1) * 3;
    indices.push(a, b, a + 1, b, b + 1, a + 1, a + 1, b + 1, a + 2, b + 1, b + 2, a + 2);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(indices);
  g.computeVertexNormals();
  geoCache.set(key, g);
  return g;
}

function SelectionRing({ w, d }: { w: number; d: number }) {
  const r = Math.max(w, d) * 0.55 + 0.2;
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
      <ringGeometry args={[r, r + 0.12, 48]} />
      <meshBasicMaterial color="#6366f1" transparent opacity={0.85} depthWrite={false} />
    </mesh>
  );
}

// ───────────────────────── végétation ─────────────────────────

function DeciduousTree({ w, d, h, seed, tint = '#ffffff' }: { w: number; d: number; h: number; seed: number; tint?: string }) {
  const rand = useMemo(() => seededRandom(seed), [seed]);
  const R = Math.max(0.8, Math.min(w, d) / 2);
  const trunkH = h * 0.42;
  const clumps = useMemo(() => {
    const list: Array<{ p: [number, number, number]; s: [number, number, number]; seed: number; shade: string }> = [
      { p: [0, h * 0.66, 0], s: [R * 0.85, h * 0.27, R * 0.85], seed: seed * 7 + 1, shade: tint },
    ];
    const n = 6;
    for (let i = 0; i < n; i += 1) {
      const a = (i / n) * Math.PI * 2 + rand() * 0.6;
      const rr = R * (0.45 + rand() * 0.2);
      list.push({
        p: [Math.cos(a) * rr, h * (0.55 + rand() * 0.25), Math.sin(a) * rr],
        s: [R * (0.45 + rand() * 0.15), h * (0.16 + rand() * 0.06), R * (0.45 + rand() * 0.15)],
        seed: seed * 7 + 2 + i,
        // Couronne plus claire en haut, plus sombre dessous : lecture du volume sans lumière dédiée.
        shade: i % 2 === 0 ? tint : '#d7e3c8',
      });
    }
    return list;
  }, [R, h, rand, seed, tint]);
  return (
    <group>
      <mesh position={[0, trunkH / 2, 0]} castShadow receiveShadow material={barkMat()}>
        <cylinderGeometry args={[R * 0.07, R * 0.12, trunkH, 10]} />
      </mesh>
      {[0, 2.1, 4.2].map((a, i) => (
        <mesh
          key={i}
          position={[Math.cos(a) * R * 0.18, trunkH * 0.95, Math.sin(a) * R * 0.18]}
          rotation={[Math.sin(a) * 0.7, 0, -Math.cos(a) * 0.7]}
          castShadow
          material={barkMat()}
        >
          <cylinderGeometry args={[R * 0.03, R * 0.06, h * 0.25, 7]} />
        </mesh>
      ))}
      {clumps.map((c, i) => (
        <mesh key={i} position={c.p} scale={c.s} geometry={blobGeometry(c.seed, 3, 0.2)} material={foliageMat(c.shade, 2)} castShadow receiveShadow />
      ))}
    </group>
  );
}

function OliveTree({ w, d, h, seed }: { w: number; d: number; h: number; seed: number }) {
  const R = Math.max(0.8, Math.min(w, d) / 2);
  const rand = useMemo(() => seededRandom(seed), [seed]);
  const clumps = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const a = (i / 7) * Math.PI * 2 + rand();
        const rr = i === 0 ? 0 : R * (0.35 + rand() * 0.3);
        return {
          p: [Math.cos(a) * rr, h * (0.68 + rand() * 0.15), Math.sin(a) * rr] as [number, number, number],
          s: [R * (0.42 + rand() * 0.15), h * 0.14, R * (0.42 + rand() * 0.15)] as [number, number, number],
          seed: seed * 11 + i,
        };
      }),
    [R, h, rand, seed],
  );
  return (
    <group>
      {/* Tronc noueux : deux fûts torsadés qui divergent. */}
      {[-0.35, 0.4].map((lean, i) => (
        <mesh key={i} position={[lean * R * 0.3, h * 0.3, 0]} rotation={[0.15 * (i ? -1 : 1), i * 0.8, lean * 0.45]} castShadow material={barkMat('#9a9186')}>
          <cylinderGeometry args={[R * 0.06, R * 0.12, h * 0.62, 8]} />
        </mesh>
      ))}
      {clumps.map((c, i) => (
        <mesh key={i} position={c.p} scale={c.s} geometry={blobGeometry(c.seed, 2, 0.28)} material={foliageMat('#c9d1b4', 2)} castShadow />
      ))}
    </group>
  );
}

function Cypress({ w, d, h, seed, conifer = false }: { w: number; d: number; h: number; seed: number; conifer?: boolean }) {
  const R = Math.max(0.35, Math.min(w, d) / 2);
  if (conifer) {
    // Sapin : étages de cônes feuillus décroissants.
    const tiers = 5;
    return (
      <group>
        <mesh position={[0, h * 0.12, 0]} castShadow material={barkMat('#6f5d4c')}>
          <cylinderGeometry args={[R * 0.06, R * 0.1, h * 0.25, 8]} />
        </mesh>
        {Array.from({ length: tiers }, (_, i) => {
          const t = i / tiers;
          const r = R * (1 - t * 0.75);
          return (
            <mesh key={i} position={[0, h * (0.2 + t * 0.62) + h * 0.1, 0]} castShadow material={foliageMat('#9fb39a', 1.5)}>
              <coneGeometry args={[r, h * 0.3, 12, 1]} />
            </mesh>
          );
        })}
      </group>
    );
  }
  return (
    <group>
      <mesh position={[0, h * 0.06, 0]} material={barkMat()}>
        <cylinderGeometry args={[R * 0.12, R * 0.16, h * 0.12, 8]} />
      </mesh>
      <mesh position={[0, h * 0.5, 0]} scale={[R, h * 0.46, R]} geometry={blobGeometry(seed, 3, 0.12)} material={foliageMat('#b6c7a8', 3)} castShadow />
      <mesh position={[0, h * 0.86, 0]} scale={[R * 0.55, h * 0.16, R * 0.55]} geometry={blobGeometry(seed + 1, 2, 0.1)} material={foliageMat('#b6c7a8', 2)} castShadow />
    </group>
  );
}

function PalmTree({ h, seed }: { h: number; seed: number }) {
  const rand = useMemo(() => seededRandom(seed), [seed]);
  const lean = useMemo(() => ({ a: rand() * Math.PI * 2, k: 0.12 + rand() * 0.12 }), [rand]);
  const segs = 12;
  const trunk = useMemo(
    () =>
      Array.from({ length: segs }, (_, i) => {
        const t = (i + 0.5) / segs;
        const off = t * t * h * lean.k;
        return { p: [Math.cos(lean.a) * off, t * h * 0.92, Math.sin(lean.a) * off] as [number, number, number], r: 0.17 - t * 0.05 };
      }),
    [h, lean],
  );
  const top = trunk[segs - 1].p;
  const fronds = 11;
  return (
    <group>
      {trunk.map((s, i) => (
        <mesh key={i} position={s.p} rotation={[Math.sin(lean.a) * lean.k * 1.5, 0, -Math.cos(lean.a) * lean.k * 1.5]} castShadow material={barkMat('#b3a58f')}>
          {/* Anneaux du stipe : segments légèrement évasés vers le haut. */}
          <cylinderGeometry args={[s.r * 1.08, s.r, (h * 0.92) / segs, 9]} />
        </mesh>
      ))}
      <group position={[top[0], top[1] + 0.1, top[2]]}>
        {Array.from({ length: fronds }, (_, i) => {
          const a = (i / fronds) * Math.PI * 2 + rand() * 0.3;
          const up = -0.25 + rand() * 0.6;
          return (
            <mesh key={i} rotation={[0, a, up]} geometry={frondGeometry(h * 0.42 * (0.85 + rand() * 0.3))} castShadow>
              <meshStandardMaterial color="#5b8a36" roughness={0.7} side={THREE.DoubleSide} />
            </mesh>
          );
        })}
        {[0, 2.1, 4.2].map((a, i) => (
          <mesh key={`c${i}`} position={[Math.cos(a) * 0.18, -0.2, Math.sin(a) * 0.18]}>
            <sphereGeometry args={[0.11, 10, 10]} />
            <meshStandardMaterial color="#6b4a26" roughness={0.6} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function Hedge({ w, d, h, tint = '#ffffff' }: { w: number; d: number; h: number; tint?: string }) {
  const len = Math.max(w, d);
  const thick = Math.max(0.4, Math.min(w, d));
  const alongX = w >= d;
  // Toujours modélisée le long de X puis tournée : la répétition (feuilles ≈ 1,2 m par tuile) reste juste sur les faces longues.
  return (
    <group rotation={[0, alongX ? 0 : Math.PI / 2, 0]}>
      <RoundedBox
        args={[len, h, thick]}
        radius={Math.min(0.18, thick * 0.3)}
        smoothness={3}
        position={[0, h / 2, 0]}
        castShadow
        receiveShadow
        material={foliageMat(tint, [Math.max(1, Math.round(len / 1.2)), Math.max(1, Math.round(h / 1.2))])}
      />
    </group>
  );
}

function Shrubs({ w, d, h, seed }: { w: number; d: number; h: number; seed: number }) {
  const rand = useMemo(() => seededRandom(seed), [seed]);
  const bushes = useMemo(() => {
    const n = Math.max(3, Math.round((w * d) / 0.9));
    return Array.from({ length: Math.min(9, n) }, (_, i) => ({
      p: [(rand() - 0.5) * w * 0.7, 0, (rand() - 0.5) * d * 0.7] as [number, number, number],
      r: 0.35 + rand() * 0.3,
      seed: seed * 13 + i,
    }));
  }, [w, d, rand, seed]);
  const flowers = useMemo(() => {
    const cols = ['#f9a8d4', '#fdfcf7', '#f472b6', '#fde047', '#c4b5fd'];
    return bushes.flatMap((b, bi) =>
      Array.from({ length: 12 }, (_, k) => {
        const th = rand() * Math.PI * 2;
        const ph = rand() * Math.PI * 0.45;
        return {
          p: [b.p[0] + Math.cos(th) * Math.sin(ph) * b.r, h * b.r * 1.2 * Math.cos(ph) * 0.9 + 0.05, b.p[2] + Math.sin(th) * Math.sin(ph) * b.r] as [number, number, number],
          c: cols[(bi + k) % cols.length],
        };
      }),
    );
  }, [bushes, h, rand]);
  return (
    <group>
      {bushes.map((b, i) => (
        <mesh key={i} position={[b.p[0], b.r * h * 0.55, b.p[2]]} scale={[b.r, b.r * h * 1.1, b.r]} geometry={blobGeometry(b.seed, 2, 0.25)} material={foliageMat('#e8f0dc', 1)} castShadow receiveShadow />
      ))}
      {flowers.map((f, i) => (
        <mesh key={`f${i}`} position={f.p}>
          <icosahedronGeometry args={[0.045, 0]} />
          <meshStandardMaterial color={f.c} roughness={0.6} />
        </mesh>
      ))}
    </group>
  );
}

function Planter({ w, d, h }: { w: number; d: number; h: number }) {
  const boxH = h * 0.5;
  const tufts = Math.max(3, Math.round(w / 0.25));
  return (
    <group>
      <mesh position={[0, boxH / 2, 0]} castShadow receiveShadow material={woodMat(1)}>
        <boxGeometry args={[w, boxH, d]} />
      </mesh>
      <mesh position={[0, boxH + 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[w * 0.9, d * 0.8]} />
        <meshStandardMaterial color="#3b2a1d" roughness={1} />
      </mesh>
      {Array.from({ length: tufts }, (_, i) => {
        const x = -w * 0.4 + (i / Math.max(1, tufts - 1)) * w * 0.8;
        return (
          <group key={i} position={[x, boxH, 0]}>
            {[-0.35, 0, 0.35].map((tilt, k) => (
              <mesh key={k} position={[0, h * 0.28, 0]} rotation={[tilt * 0.4, k, tilt]} castShadow>
                <coneGeometry args={[0.05, h * 0.6, 4, 1, true]} />
                <meshStandardMaterial color={k === 1 ? '#8aa35a' : '#a8b86e'} roughness={0.8} side={THREE.DoubleSide} />
              </mesh>
            ))}
          </group>
        );
      })}
    </group>
  );
}

// ───────────────────────── eau ─────────────────────────

/** Matière d'eau animée : deux cartes de normales qui glissent en sens contraires. */
function useWaterMaterial(color: string, repeat: number, opacity = 1) {
  const mat = useMemo(() => {
    const normalA = loadTiledTexture('/floors/gen/water-normal.jpg', repeat, repeat, true).clone();
    normalA.wrapS = normalA.wrapT = THREE.RepeatWrapping;
    normalA.repeat.set(repeat, repeat);
    normalA.needsUpdate = true;
    return new THREE.MeshPhysicalMaterial({
      color,
      roughness: 0.06,
      metalness: 0,
      clearcoat: 1,
      clearcoatRoughness: 0.05,
      normalMap: normalA,
      normalScale: new THREE.Vector2(0.35, 0.35),
      envMapIntensity: 1.3,
      transparent: opacity < 1,
      opacity,
    });
  }, [color, repeat, opacity]);
  const ripples = useRef<THREE.Texture | null>(null);
  useEffect(() => {
    ripples.current = mat.normalMap;
  }, [mat]);
  useFrame((_, dt) => {
    const tex = ripples.current;
    if (!tex) return;
    tex.offset.x += dt * 0.012;
    tex.offset.y += dt * 0.007;
  });
  return mat;
}

function Pool({ w, d }: { w: number; d: number }) {
  const coping = 0.35;
  const water = useWaterMaterial('#36b3d3', Math.max(1, Math.round(Math.max(w, d) / 3)));
  const iw = Math.max(0.5, w - coping * 2);
  const id = Math.max(0.5, d - coping * 2);
  return (
    <group>
      {/* Margelles en pierre. */}
      {[
        [0, -d / 2 + coping / 2, w, coping],
        [0, d / 2 - coping / 2, w, coping],
        [-w / 2 + coping / 2, 0, coping, id],
        [w / 2 - coping / 2, 0, coping, id],
      ].map(([x, z, bw, bd], i) => (
        <mesh key={i} position={[x, 0.05, z]} castShadow receiveShadow material={stoneMat('#f3efe6', 1)}>
          <boxGeometry args={[bw, 0.1, bd]} />
        </mesh>
      ))}
      {/* Frise de carreaux à la ligne d'eau. */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[iw, id]} />
        <meshStandardMaterial color="#1f6f8c" roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.035, 0]} rotation={[-Math.PI / 2, 0, 0]} material={water} receiveShadow>
        <planeGeometry args={[iw - 0.08, id - 0.08]} />
      </mesh>
      {/* Échelle inox. */}
      {[-0.22, 0.22].map((x, i) => (
        <mesh key={i} position={[w / 2 - coping - 0.02 - 0.25, 0.45, -id / 2 + 0.6 + x]} rotation={[0, Math.PI / 2, 0]}>
          <torusGeometry args={[0.25, 0.022, 8, 20, Math.PI]} />
          <meshStandardMaterial color="#e5e7eb" metalness={1} roughness={0.15} />
        </mesh>
      ))}
    </group>
  );
}

function Pond({ w, d, seed }: { w: number; d: number; seed: number }) {
  const rand = useMemo(() => seededRandom(seed), [seed]);
  const outline = useMemo(() => {
    const pts: THREE.Vector2[] = [];
    const n = 40;
    for (let i = 0; i < n; i += 1) {
      const a = (i / n) * Math.PI * 2;
      const k = 0.85 + Math.sin(a * 3 + seed) * 0.08 + Math.sin(a * 5 + seed * 2) * 0.05;
      pts.push(new THREE.Vector2(Math.cos(a) * (w / 2) * k, Math.sin(a) * (d / 2) * k));
    }
    return pts;
  }, [w, d, seed]);
  const shape = useMemo(() => new THREE.Shape(outline), [outline]);
  const water = useWaterMaterial('#3f7f6e', 1);
  const stones = useMemo(
    () =>
      outline
        .filter((_, i) => i % 1 === 0)
        .map((p, i) => ({ p: [p.x * (1.02 + rand() * 0.06), 0.04, -p.y * (1.02 + rand() * 0.06)] as [number, number, number], s: 0.12 + rand() * 0.14, seed: seed * 17 + (i % 6) })),
    [outline, rand, seed],
  );
  const pads = useMemo(
    () => Array.from({ length: 6 }, () => ({ x: (rand() - 0.5) * w * 0.55, z: (rand() - 0.5) * d * 0.55, r: 0.14 + rand() * 0.1, a: rand() * 6 })),
    [w, d, rand],
  );
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.025, 0]} material={water} receiveShadow>
        <shapeGeometry args={[shape, 40]} />
      </mesh>
      {stones.map((s, i) => (
        <mesh key={i} position={s.p} scale={[s.s * 1.3, s.s * 0.7, s.s]} geometry={blobGeometry(s.seed, 1, 0.3)} material={rockMat('#b7b0a4')} castShadow receiveShadow />
      ))}
      {pads.map((p, i) => (
        <group key={`p${i}`} position={[p.x, 0.04, p.z]} rotation={[-Math.PI / 2, 0, p.a]}>
          <mesh>
            <circleGeometry args={[p.r, 18, 0.3, Math.PI * 2 - 0.3]} />
            <meshStandardMaterial color="#3f7d2c" roughness={0.5} side={THREE.DoubleSide} />
          </mesh>
          {i % 2 === 0 ? (
            <mesh position={[0, 0, 0.03]}>
              <sphereGeometry args={[p.r * 0.35, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
              <meshStandardMaterial color="#f9c4d8" roughness={0.5} />
            </mesh>
          ) : null}
        </group>
      ))}
    </group>
  );
}

// ───────────────────────── feu ─────────────────────────

function Flames({ scale = 1, withLight = false }: { scale?: number; withLight?: boolean }) {
  const group = useRef<THREE.Group>(null);
  const light = useRef<THREE.PointLight>(null);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    group.current?.children.forEach((c, i) => {
      c.scale.y = 1 + Math.sin(t * (7 + i * 1.7) + i) * 0.18 + Math.sin(t * 13.1 + i * 3) * 0.08;
      c.rotation.y = t * (0.6 + i * 0.2);
    });
    if (light.current) light.current.intensity = (2.2 + Math.sin(t * 9) * 0.35 + Math.sin(t * 23) * 0.2) * scale;
  });
  return (
    <group scale={scale}>
      <group ref={group}>
        {[
          ['#ffb347', 0.16, 0.5, 0],
          ['#ff7a1a', 0.12, 0.38, 0.05],
          ['#ffe29a', 0.08, 0.3, -0.04],
        ].map(([c, r, hh, off], i) => (
          <mesh key={i} position={[off as number, (hh as number) / 2, 0]}>
            <coneGeometry args={[r as number, hh as number, 10, 1, true]} />
            <meshBasicMaterial color={c as string} transparent opacity={0.85} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
          </mesh>
        ))}
      </group>
      {withLight ? <pointLight ref={light} position={[0, 0.5, 0]} color="#ff9a3c" intensity={2.2} distance={9} decay={2} /> : null}
    </group>
  );
}

function FirePit({ w }: { w: number }) {
  const r = Math.max(0.35, w / 2);
  const bowl = useMemo(() => {
    const pts = [
      new THREE.Vector2(0, 0.28),
      new THREE.Vector2(r * 0.55, 0.3),
      new THREE.Vector2(r * 0.9, 0.4),
      new THREE.Vector2(r, 0.5),
      new THREE.Vector2(r * 0.96, 0.52),
      new THREE.Vector2(r * 0.86, 0.43),
      new THREE.Vector2(r * 0.5, 0.34),
      new THREE.Vector2(0, 0.32),
    ];
    return new THREE.LatheGeometry(pts, 36);
  }, [r]);
  return (
    <group>
      <mesh geometry={bowl} castShadow receiveShadow>
        <meshStandardMaterial color="#3a3530" metalness={0.75} roughness={0.55} side={THREE.DoubleSide} />
      </mesh>
      {[0, 2.1, 4.2].map((a, i) => (
        <mesh key={i} position={[Math.cos(a) * r * 0.55, 0.15, Math.sin(a) * r * 0.55]} castShadow>
          <cylinderGeometry args={[0.025, 0.025, 0.3, 6]} />
          <meshStandardMaterial color="#2b2622" metalness={0.8} roughness={0.5} />
        </mesh>
      ))}
      {[0, 1.2, 2.4].map((a, i) => (
        <mesh key={`l${i}`} position={[0, 0.42, 0]} rotation={[0, a, Math.PI / 2 - 0.25]} castShadow material={barkMat('#7a5a3a')}>
          <cylinderGeometry args={[0.05, 0.06, r * 1.1, 7]} />
        </mesh>
      ))}
      <mesh position={[0, 0.37, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[r * 0.6, 20]} />
        <meshBasicMaterial color="#ff5a1f" toneMapped={false} />
      </mesh>
      <group position={[0, 0.4, 0]}>
        <Flames scale={Math.min(1.6, r * 1.6)} withLight />
      </group>
    </group>
  );
}

function Torch({ h }: { h: number }) {
  return (
    <group>
      <mesh position={[0, h / 2, 0]} castShadow material={barkMat('#c9a877')}>
        <cylinderGeometry args={[0.028, 0.035, h, 8]} />
      </mesh>
      {[0.25, 0.5, 0.75].map((t) => (
        <mesh key={t} position={[0, h * t, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.036, 0.008, 6, 14]} />
          <meshStandardMaterial color="#8a6a43" roughness={0.8} />
        </mesh>
      ))}
      <mesh position={[0, h + 0.07, 0]}>
        <cylinderGeometry args={[0.07, 0.045, 0.16, 12]} />
        <meshStandardMaterial color="#7a5a34" roughness={0.7} />
      </mesh>
      <group position={[0, h + 0.15, 0]}>
        <Flames scale={0.55} />
      </group>
    </group>
  );
}

// ───────────────────────── clôture & minéral ─────────────────────────

function Fence({ w, d, h }: { w: number; d: number; h: number }) {
  const len = Math.max(w, d);
  const alongX = w >= d;
  const pickets = Math.max(4, Math.round(len / 0.14));
  const posts = Math.max(2, Math.round(len / 2) + 1);
  const ref = useRef<THREE.InstancedMesh>(null);
  const picketMat = woodMat(0.5);
  React.useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    for (let i = 0; i < pickets; i += 1) {
      const x = -len / 2 + ((i + 0.5) / pickets) * len;
      const hh = h * (0.92 + ((i * 37) % 7) * 0.012);
      m.compose(new THREE.Vector3(x, hh / 2, 0), new THREE.Quaternion(), new THREE.Vector3(1, hh, 1));
      mesh.setMatrixAt(i, m);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, [pickets, len, h]);
  return (
    <group rotation={[0, alongX ? 0 : Math.PI / 2, 0]}>
      <instancedMesh ref={ref} args={[undefined, undefined, pickets]} castShadow receiveShadow material={picketMat}>
        <boxGeometry args={[0.09, 1, 0.022]} />
      </instancedMesh>
      {[0.25, 0.75].map((t) => (
        <mesh key={t} position={[0, h * t, -0.03]} castShadow material={picketMat}>
          <boxGeometry args={[len, 0.07, 0.035]} />
        </mesh>
      ))}
      {Array.from({ length: posts }, (_, i) => (
        <mesh key={`p${i}`} position={[-len / 2 + (i / (posts - 1)) * len, h * 0.55, -0.05]} castShadow material={picketMat}>
          <boxGeometry args={[0.1, h * 1.1, 0.1]} />
        </mesh>
      ))}
    </group>
  );
}

function Boulders({ w, d, h, seed }: { w: number; d: number; h: number; seed: number }) {
  const rand = useMemo(() => seededRandom(seed), [seed]);
  const rocks = useMemo(
    () =>
      [1, 0.65, 0.45].map((k, i) => ({
        p: [i === 0 ? 0 : (rand() - 0.5) * w * 0.7, h * k * 0.35, i === 0 ? 0 : (rand() - 0.5) * d * 0.7] as [number, number, number],
        s: [w * 0.35 * k, h * 0.55 * k, d * 0.35 * k] as [number, number, number],
        r: rand() * 6,
        seed: seed * 19 + i,
      })),
    [w, d, h, rand, seed],
  );
  return (
    <group>
      {rocks.map((r, i) => (
        <mesh key={i} position={r.p} rotation={[0, r.r, 0]} scale={r.s} geometry={blobGeometry(r.seed, 1, 0.35)} material={rockMat()} castShadow receiveShadow />
      ))}
    </group>
  );
}

// ───────────────────────── point d'entrée fixture ─────────────────────────

export function LandscapeMesh({
  style,
  w,
  d,
  heightM,
  seed = 1,
  selected = false,
}: {
  style: LandscapeStyle;
  w: number;
  d: number;
  heightM?: number;
  seed?: number;
  selected?: boolean;
}) {
  const h = heightM ?? LANDSCAPE_STYLE_META[style].heightM;
  let body: React.ReactNode;
  switch (style) {
    case 'oak': body = <DeciduousTree w={w} d={d} h={h} seed={seed} />; break;
    case 'olive': body = <OliveTree w={w} d={d} h={h} seed={seed} />; break;
    case 'cypress': body = <Cypress w={w} d={d} h={h} seed={seed} />; break;
    case 'palm': body = <PalmTree h={h} seed={seed} />; break;
    case 'hedge': body = <Hedge w={w} d={d} h={h} />; break;
    case 'shrub': body = <Shrubs w={w} d={d} h={h} seed={seed} />; break;
    case 'planter': body = <Planter w={w} d={d} h={h} />; break;
    case 'pool': body = <Pool w={w} d={d} />; break;
    case 'pond': body = <Pond w={w} d={d} seed={seed} />; break;
    case 'firePit': body = <FirePit w={Math.min(w, d)} />; break;
    case 'torch': body = <Torch h={h} />; break;
    case 'fence': body = <Fence w={w} d={d} h={h} />; break;
    case 'boulder': body = <Boulders w={w} d={d} h={h} seed={seed} />; break;
    default: body = null;
  }
  return (
    <group>
      {body}
      {selected ? <SelectionRing w={w} d={d} /> : null}
    </group>
  );
}

/** Graine stable tirée d'un identifiant d'élément (même arbre à chaque rendu). */
export function seedFromId(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i += 1) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) % 100000;
}

// ───────────────────────── abords de la salle ─────────────────────────

type Prop = { style: LandscapeStyle | 'fir' | 'vines' | 'wall'; x: number; z: number; w: number; d: number; h: number; rot?: number; seed: number };

/** Point au hasard dans l'anneau autour du plan (hors salle + marge). */
function ringPoint(rand: () => number, halfW: number, halfD: number, margin: number, spread: number) {
  for (let k = 0; k < 20; k += 1) {
    const a = rand() * Math.PI * 2;
    const r = Math.max(halfW, halfD) + margin + rand() * spread;
    const x = Math.cos(a) * r * (0.8 + rand() * 0.4);
    const z = Math.sin(a) * r * (0.8 + rand() * 0.4);
    // Couloir de vue dégagé devant l'entrée (côté sud, d'où arrive la caméra).
    const inViewCorridor = z > halfD && Math.abs(x) < halfW * 0.9;
    if (!inViewCorridor && (Math.abs(x) > halfW + margin || Math.abs(z) > halfD + margin)) return { x, z };
  }
  return { x: halfW + margin + spread * rand(), z: -halfD * rand() };
}

function buildSurroundings(kind: Exclude<OutdoorSurroundings, 'none'>, widthM: number, depthM: number, lite: boolean): Prop[] {
  const rand = seededRandom(kind.length * 1009 + Math.round(widthM * 7 + depthM * 13));
  const hw = widthM / 2;
  const hd = depthM / 2;
  const extent = Math.max(widthM, depthM);
  const k = lite ? 0.5 : 1;
  const props: Prop[] = [];
  let s = 1;
  const scatter = (style: Prop['style'], count: number, margin: number, spread: number, size: () => [number, number, number]) => {
    for (let i = 0; i < Math.round(count * k); i += 1) {
      const { x, z } = ringPoint(rand, hw, hd, margin, spread);
      const [w, d, h] = size();
      props.push({ style, x, z, w, d, h, rot: rand() * Math.PI * 2, seed: s++ });
    }
  };
  const tree = (): [number, number, number] => { const r = 4 + rand() * 3; return [r, r, 6 + rand() * 4]; };
  const palm = (): [number, number, number] => [3, 3, 5.5 + rand() * 3];
  const fir = (): [number, number, number] => { const r = 2.2 + rand() * 1.6; return [r, r, 8 + rand() * 6]; };

  if (kind === 'garden') {
    const m = 3;
    // Haies au cordeau sur les 4 côtés, ouvertes au milieu (entrées).
    for (const side of [-1, 1]) {
      const segW = hw + m - 1.6;
      props.push({ style: 'hedge', x: -(hw + m) / 2 - 0.8, z: side * (hd + m), w: segW, d: 0.8, h: 1.3, seed: s++ });
      props.push({ style: 'hedge', x: (hw + m) / 2 + 0.8, z: side * (hd + m), w: segW, d: 0.8, h: 1.3, seed: s++ });
      const segD = hd + m - 1.6;
      props.push({ style: 'hedge', x: side * (hw + m), z: -(hd + m) / 2 - 0.8, w: 0.8, d: segD, h: 1.3, seed: s++ });
      props.push({ style: 'hedge', x: side * (hw + m), z: (hd + m) / 2 + 0.8, w: 0.8, d: segD, h: 1.3, seed: s++ });
    }
    // Allée de cyprès dans l'axe, derrière la salle (la caméra arrive par l'entrée côté sud).
    for (let i = 0; i < Math.round(6 * k) + 2; i += 1) {
      for (const side of [-1, 1]) props.push({ style: 'cypress', x: side * 2.4, z: -(hd + m + 3 + i * 3.2), w: 1.2, d: 1.2, h: 7, seed: s++ });
    }
    scatter('shrub', 10, m + 2, 6, () => [2.4, 1.6, 0.9]);
    scatter('oak', 8, m + 8, extent * 0.8 + 8, tree);
  } else if (kind === 'park') {
    scatter('oak', 22, 4, extent + 20, tree);
    scatter('shrub', 10, 3, 10, () => [2.6, 1.8, 1]);
    scatter('boulder', 4, 5, 14, () => [1.6, 1.2, 0.8]);
  } else if (kind === 'beach') {
    scatter('palm', 12, 3, extent * 0.6 + 10, palm);
    scatter('boulder', 5, 4, 14, () => [2, 1.6, 0.9]);
  } else if (kind === 'countryside') {
    // Rangées de vignes des deux côtés.
    for (const side of [-1, 1]) {
      for (let r = 0; r < Math.round(9 * k) + 2; r += 1) {
        props.push({ style: 'vines', x: side * (hw + 5 + r * 2.2), z: 0, w: 0.5, d: depthM + 26, h: 1.3, seed: s++ });
      }
    }
    scatter('olive', 8, 4, 12, () => [3.2, 3.2, 4 + rand()]);
    scatter('cypress', 5, 20, 20, () => [1.3, 1.3, 8]);
  } else if (kind === 'forest') {
    scatter('fir', 46, 4, extent + 22, fir);
    scatter('oak', 12, 6, extent + 18, tree);
    scatter('shrub', 8, 2.5, 6, () => [2.4, 1.8, 1]);
  } else if (kind === 'courtyard') {
    const m = 4;
    for (const side of [-1, 1]) {
      props.push({ style: 'wall', x: 0, z: side * (hd + m), w: widthM + m * 2, d: 0.45, h: 1.1, seed: s++ });
      props.push({ style: 'wall', x: side * (hw + m), z: 0, w: 0.45, d: depthM + m * 2, h: 1.1, seed: s++ });
    }
    for (const [cx, cz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) {
      props.push({ style: 'planter', x: cx * (hw + m - 1.2), z: cz * (hd + m - 1.2), w: 1.6, d: 0.6, h: 0.9, seed: s++ });
      props.push({ style: 'olive', x: cx * (hw + m + 3.5), z: cz * (hd + m + 3.5), w: 3.2, d: 3.2, h: 4.2, seed: s++ });
    }
    scatter('cypress', 8, m + 6, 14, () => [1.2, 1.2, 7]);
  } else if (kind === 'desert') {
    scatter('boulder', 14, 4, extent + 20, () => { const r = 1.5 + rand() * 3; return [r, r * 0.8, r * 0.6]; });
    // Oasis : palmiers regroupés dans un coin.
    const ox = hw + 9;
    const oz = -hd - 7;
    for (let i = 0; i < Math.round(7 * k) + 1; i += 1) {
      const a = rand() * Math.PI * 2;
      props.push({ style: 'palm', x: ox + Math.cos(a) * (4 + rand() * 3), z: oz + Math.sin(a) * (3 + rand() * 3), w: 3, d: 3, h: 5 + rand() * 3, seed: s++ });
    }
    props.push({ style: 'pond', x: ox, z: oz, w: 7, d: 5, h: 0.5, seed: s++ });
  }
  return props;
}

function Vines({ d, h, seed }: { d: number; h: number; seed: number }) {
  const stakes = Math.max(2, Math.round(d / 5));
  return (
    <group>
      <mesh position={[0, h * 0.6, 0]} scale={[0.35, h * 0.45, d / 2]} geometry={blobGeometry(seed, 2, 0.08)} material={foliageMat('#d6e0b8', 3)} castShadow />
      {Array.from({ length: stakes }, (_, i) => (
        <mesh key={i} position={[0, h * 0.5, -d / 2 + (i / (stakes - 1)) * d]} material={barkMat('#9c8c78')}>
          <boxGeometry args={[0.06, h, 0.06]} />
        </mesh>
      ))}
    </group>
  );
}

function LowStoneWall({ w, d, h }: { w: number; d: number; h: number }) {
  const len = Math.max(w, d);
  const mat = useMemo(
    () => texturedMat('wallstone', '/floors/gen/wall-stone.jpg', Math.max(1, Math.round(len / 2)), { roughness: 0.9, normalScale: 1.1 }),
    [len],
  );
  return (
    <group>
      <mesh position={[0, h / 2, 0]} castShadow receiveShadow material={mat}>
        <boxGeometry args={[w, h, d]} />
      </mesh>
      <mesh position={[0, h + 0.04, 0]} castShadow material={stoneMat('#efe9dd', 1)}>
        <boxGeometry args={[w + 0.08, 0.08, d + 0.08]} />
      </mesh>
    </group>
  );
}

function Dunes({ radius, inner }: { radius: number; inner: number }) {
  const geo = useMemo(() => {
    const g = new THREE.RingGeometry(inner, radius, 96, 24);
    const pos = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i += 1) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const r = Math.sqrt(x * x + y * y);
      const t = Math.min(1, Math.max(0, (r - inner) / (radius * 0.35)));
      const hgt = (Math.sin(x * 0.09 + Math.sin(y * 0.05) * 2) * 0.5 + 0.5) * (Math.sin(y * 0.07 + x * 0.02) * 0.5 + 0.5);
      pos.setZ(i, hgt * 5 * t * t);
    }
    g.computeVertexNormals();
    return g;
  }, [radius, inner]);
  const mat = useMemo(() => texturedMat('dune', '/floors/gen/sand.jpg', Math.round(radius / 4), { roughness: 0.95, normalScale: 0.8 }), [radius]);
  return <mesh geometry={geo} material={mat} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow />;
}

function Sea({ depthM, radius }: { depthM: number; radius: number }) {
  const water = useWaterMaterial('#1f78a0', Math.round(radius / 6));
  const shoreZ = -depthM / 2 - 12;
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, shoreZ - radius / 2]} material={water}>
        <planeGeometry args={[radius * 2.2, radius]} />
      </mesh>
      {/* Écume au bord de l'eau. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, shoreZ + 0.4]}>
        <planeGeometry args={[radius * 2.2, 1.2]} />
        <meshStandardMaterial color="#f4f7f6" transparent opacity={0.55} roughness={0.4} depthWrite={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, shoreZ + 2.2]}>
        <planeGeometry args={[radius * 2.2, 3.4]} />
        <meshStandardMaterial color="#b9a57f" transparent opacity={0.5} roughness={0.2} depthWrite={false} />
      </mesh>
    </group>
  );
}

export function OutdoorSurroundingsScene({
  kind,
  widthM,
  depthM,
  lite = false,
}: {
  kind: OutdoorSurroundings;
  widthM: number;
  depthM: number;
  lite?: boolean;
}) {
  const meta = kind === 'none' ? null : OUTDOOR_SURROUNDINGS_META[kind];
  const radius = Math.max(70, Math.max(widthM, depthM) * 4);
  const groundMat = useMemo(() => {
    if (!meta) return null;
    return texturedMat('ground', meta.groundUrl, Math.round((radius * 2) / meta.groundTileM), { roughness: 0.95, normalScale: 0.9 });
  }, [meta, radius]);
  const props = useMemo(
    () => (kind === 'none' ? [] : buildSurroundings(kind, widthM, depthM, lite)),
    [kind, widthM, depthM, lite],
  );
  if (!meta || !groundMat) return null;
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.03, 0]} material={groundMat} receiveShadow>
        <circleGeometry args={[radius, 64]} />
      </mesh>
      {kind === 'desert' ? <Dunes radius={radius} inner={Math.max(widthM, depthM) * 0.9 + 6} /> : null}
      {kind === 'beach' ? <Sea depthM={depthM} radius={radius} /> : null}
      {props.map((p, i) => (
        <group key={i} position={[p.x, 0, p.z]} rotation={[0, p.style === 'hedge' || p.style === 'wall' || p.style === 'vines' ? 0 : p.rot ?? 0, 0]}>
          {p.style === 'fir' ? (
            <Cypress w={p.w} d={p.d} h={p.h} seed={p.seed} conifer />
          ) : p.style === 'vines' ? (
            <Vines d={p.d} h={p.h} seed={p.seed} />
          ) : p.style === 'wall' ? (
            <LowStoneWall w={p.w} d={p.d} h={p.h} />
          ) : (
            <LandscapeMesh style={p.style} w={p.w} d={p.d} heightM={p.h} seed={p.seed + 500} />
          )}
        </group>
      ))}
    </group>
  );
}
