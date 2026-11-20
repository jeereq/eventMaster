'use client';

/**
 * Piscines en 3D : le bassin est réellement creusé sous le sol (le sol de la salle et le terrain
 * sont percés à son contour, voir `poolGroundHole`). On voit donc les parois carrelées, le fond
 * en pente (petit et grand bain), les marches, l’eau qui fonce avec la profondeur et les reflets
 * de lumière (caustiques) qui ondulent au fond.
 *
 * Types : classique, débordement (bac de rétention et lame d’eau), couloir de nage (lignes d’eau),
 * baignade naturelle (galets, rochers, roseaux), lagon (sable, plage), spa (banquette, bulles),
 * pataugeoire, hors-sol bois et miroir d’eau. Tout se règle : eau, revêtement, margelles, accès,
 * projecteurs, cascade et décor flottant.
 */

import React, { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { MeshReflectorMaterial, RoundedBox } from '@react-three/drei';
import { generatedDetailMaps, loadTiledTexture, roughnessWithMap } from '@/lib/roomWebGLMaterials';
import { seededRandom, type PoolShape } from '@/lib/roomOutdoorUtils';
import { offsetRing } from '@/lib/roomRoofGeometry';
import {
  POOL_COPING_META,
  POOL_LINER_META,
  mixHex,
  poolCopingWidth,
  poolFloorDepthAt,
  poolGroundHole,
  poolIsAboveGround,
  poolLaneLines,
  poolRimHeight,
  poolWaterOutline,
  resolvePoolDepth,
  resolvePoolOptions,
  resolvePoolShape,
  type PoolOptions,
} from '@/lib/roomPoolDesign';

type P = [number, number];

// ───────────────────────── outils géométriques ─────────────────────────

function offset(ring: P[], dist: number): P[] {
  return offsetRing(ring.map(([x, z]) => ({ x, z })), dist).map((p) => [p.x, p.z]);
}

function insidePolygon(ring: P[], x: number, z: number): boolean {
  let c = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const [xi, zi] = ring[i];
    const [xj, zj] = ring[j];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c;
  }
  return c;
}

function bbox(ring: P[]) {
  const xs = ring.map((p) => p[0]);
  const zs = ring.map((p) => p[1]);
  return { x0: Math.min(...xs), x1: Math.max(...xs), z0: Math.min(...zs), z1: Math.max(...zs) };
}

/** Points tirés au hasard (graine) dans le bassin, à `margin` des parois. */
function scatterInside(ring: P[], count: number, margin: number, seed: number): P[] {
  const inner = margin > 0 ? offset(ring, margin) : ring;
  const b = bbox(inner);
  const rand = seededRandom(seed);
  const out: P[] = [];
  for (let tries = 0; out.length < count && tries < count * 40; tries += 1) {
    const x = b.x0 + rand() * (b.x1 - b.x0);
    const z = b.z0 + rand() * (b.z1 - b.z0);
    if (insidePolygon(inner, x, z)) out.push([x, z]);
  }
  return out;
}

/** Points régulièrement espacés le long du contour, avec la normale tournée vers l’intérieur. */
function alongRing(ring: P[], count: number): Array<{ p: P; n: P; t: P }> {
  const lens = ring.map((p, i) => Math.hypot(ring[(i + 1) % ring.length][0] - p[0], ring[(i + 1) % ring.length][1] - p[1]));
  const total = lens.reduce((s, l) => s + l, 0);
  const out: Array<{ p: P; n: P; t: P }> = [];
  for (let k = 0; k < count; k += 1) {
    let target = ((k + 0.5) / count) * total;
    let i = 0;
    while (i < lens.length - 1 && target > lens[i]) { target -= lens[i]; i += 1; }
    const a = ring[i];
    const b = ring[(i + 1) % ring.length];
    const u = lens[i] > 0 ? target / lens[i] : 0;
    const p: P = [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u];
    const t: P = [(b[0] - a[0]) / (lens[i] || 1), (b[1] - a[1]) / (lens[i] || 1)];
    let n: P = [-t[1], t[0]];
    if (!insidePolygon(ring, p[0] + n[0] * 0.05, p[1] + n[1] * 0.05)) n = [t[1], -t[0]];
    out.push({ p, n, t });
  }
  return out;
}

/** Fond du bassin : contour triangulé, chaque sommet à sa propre profondeur. */
function floorGeometry(ring: P[], yAt: (x: number, z: number) => number, tileM: number, tint?: (y: number) => THREE.Color) {
  const tris = THREE.ShapeUtils.triangulateShape(ring.map(([x, z]) => new THREE.Vector2(x, z)), []);
  const pos: number[] = [];
  const uv: number[] = [];
  const col: number[] = [];
  ring.forEach(([x, z]) => {
    const y = yAt(x, z);
    pos.push(x, y, z);
    uv.push(x / tileM, z / tileM);
    if (tint) { const c = tint(y); col.push(c.r, c.g, c.b); }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  if (tint) g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  // Triangles orientés vers le haut (face avant visible depuis le ciel).
  const [a, b, c] = tris[0] ?? [0, 1, 2];
  const pa = ring[a]; const pb = ring[b]; const pc = ring[c];
  const upward = pa && pb && pc ? (pb[1] - pa[1]) * (pc[0] - pa[0]) - (pb[0] - pa[0]) * (pc[1] - pa[1]) > 0 : true;
  g.setIndex(tris.flatMap((t) => (upward ? t : [t[0], t[2], t[1]])));
  g.computeVertexNormals();
  return g;
}

/** Parois verticales le long du contour, de `topAt` à `bottomAt` ; UV en mètres. */
function wallGeometry(
  ring: P[],
  topAt: (x: number, z: number) => number,
  bottomAt: (x: number, z: number) => number,
  tileM: number,
  tint?: (y: number) => THREE.Color,
) {
  const pos: number[] = [];
  const uv: number[] = [];
  const col: number[] = [];
  let u = 0;
  for (let i = 0; i < ring.length; i += 1) {
    const a = ring[i];
    const b = ring[(i + 1) % ring.length];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const corners: Array<[P, number, number]> = [
      [a, topAt(a[0], a[1]), u], [a, bottomAt(a[0], a[1]), u], [b, bottomAt(b[0], b[1]), u + len],
      [a, topAt(a[0], a[1]), u], [b, bottomAt(b[0], b[1]), u + len], [b, topAt(b[0], b[1]), u + len],
    ];
    for (const [p, y, uu] of corners) {
      pos.push(p[0], y, p[1]);
      uv.push(uu / tileM, y / tileM);
      if (tint) { const c = tint(y); col.push(c.r, c.g, c.b); }
    }
    u += len;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  if (tint) g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  return g;
}

/** Anneau plat épais (margelle) entre deux contours, posé à `y0`. */
function ringSlab(outer: P[], inner: P[], thickness: number, y0: number, tileM: number) {
  const shape = new THREE.Shape(outer.map(([x, z]) => new THREE.Vector2(x, -z)));
  shape.holes.push(new THREE.Path(inner.map(([x, z]) => new THREE.Vector2(x, -z))));
  const g = new THREE.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 2, curveSegments: 12 });
  g.rotateX(-Math.PI / 2);
  g.translate(0, y0, 0);
  const uv = g.getAttribute('uv') as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i += 1) uv.setXY(i, uv.getX(i) / tileM, uv.getY(i) / tileM);
  return g;
}

/** Nappe plane horizontale (surface de l’eau) au contour donné. */
function flatGeometry(ring: P[], y: number, tileM: number) {
  return floorGeometry(ring, () => y, tileM);
}

// ───────────────────────── matières ─────────────────────────

const matCache = new Map<string, THREE.Material>();

function textured(url: string, color: string, roughness: number, extra: THREE.MeshStandardMaterialParameters = {}, key = '') {
  const cacheKey = `${url}|${color}|${roughness}|${key}`;
  const hit = matCache.get(cacheKey);
  if (hit) return hit as THREE.MeshStandardMaterial;
  const map = loadTiledTexture(url, 1, 1);
  const { normalMap, roughnessMap } = generatedDetailMaps(url, 1, 1);
  const mat = new THREE.MeshStandardMaterial({ map, normalMap, roughnessMap, color, roughness, metalness: 0, ...extra });
  mat.roughness = roughnessWithMap(mat.roughness, roughnessMap);
  matCache.set(cacheKey, mat);
  return mat;
}

function linerMaterial(liner: PoolOptions['liner'], band = false) {
  const meta = POOL_LINER_META[liner];
  const color = band ? mixHex(meta.color, '#1e3a5f', 0.55) : meta.color;
  const opts = { vertexColors: true, side: THREE.DoubleSide } as const;
  switch (meta.texture) {
    case 'mosaic': return textured('/floors/gen/pool-mosaic.jpg', band ? '#2a5f8a' : liner === 'mosaicWhite' ? '#ffffff' : '#bfe8f5', 0.3, opts, `liner${band}`);
    case 'sand': return textured('/floors/gen/sand.jpg', '#fff7e6', 0.9, opts, 'liner');
    case 'gravel': return textured('/floors/gen/pebbles.jpg', '#b9ae98', 0.9, opts, 'liner');
    default: return textured('/floors/gen/concrete-polished.jpg', color, 0.45, opts, `liner${liner}${band}`);
  }
}

function copingMaterial(coping: PoolOptions['coping']) {
  const meta = POOL_COPING_META[coping];
  return textured(meta.texture, meta.color, coping === 'marble' ? 0.3 : coping === 'slate' ? 0.6 : 0.85, {}, 'coping');
}

const chrome = new THREE.MeshStandardMaterial({ color: '#e5e7eb', metalness: 1, roughness: 0.12 });

/** Motif de caustiques tuilable (reflets de soleil qui dansent au fond de l’eau). */
let causticTex: THREE.Texture | null = null;
function causticTexture(): THREE.Texture | null {
  if (causticTex || typeof document === 'undefined') return causticTex;
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const img = ctx.createImageData(size, size);
  const TAU = Math.PI * 2;
  for (let py = 0; py < size; py += 1) {
    for (let px = 0; px < size; px += 1) {
      const p = [((px / size) * TAU) % TAU - 250, ((py / size) * TAU) % TAU - 250];
      let i = [p[0], p[1]];
      let c = 1;
      const inten = 0.005;
      for (let n = 0; n < 5; n += 1) {
        const t = 1.7 * (1 - 3.5 / (n + 1));
        i = [p[0] + Math.cos(t - i[0]) + Math.sin(t + i[1]), p[1] + Math.sin(t - i[1]) + Math.cos(t + i[0])];
        c += 1 / Math.hypot(p[0] / (Math.sin(i[0] + t) / inten), p[1] / (Math.cos(i[1] + t) / inten));
      }
      c /= 5;
      c = 1.17 - Math.pow(c, 1.4);
      const v = Math.min(255, Math.pow(Math.abs(c), 8) * 255);
      const k = (py * size + px) * 4;
      img.data[k] = img.data[k + 1] = img.data[k + 2] = v;
      img.data[k + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  causticTex = tex;
  return tex;
}

/** Fait glisser une texture (normales d’eau qui coulent) sans muter l’objet tenu par le hook. */
function useScrollTexture(tex: THREE.Texture | null | undefined, dx: number, dy: number) {
  const ref = useRef<THREE.Texture | null>(null);
  useEffect(() => {
    ref.current = tex ?? null;
  }, [tex]);
  useFrame((_, dt) => {
    const t = ref.current;
    if (!t) return;
    t.offset.x += dt * dx;
    t.offset.y += dt * dy;
  });
}

/** Surface de l’eau : normales qui glissent, reflets nets, transparence selon le type de bassin. */
function useWater(color: string, opacity: number, roughness = 0.04, glow: string | null = null, calm = false) {
  const mat = useMemo(() => {
    const normalMap = loadTiledTexture('/floors/gen/water-normal.jpg', 1, 1, true).clone();
    normalMap.wrapS = normalMap.wrapT = THREE.RepeatWrapping;
    normalMap.needsUpdate = true;
    return new THREE.MeshPhysicalMaterial({
      color,
      roughness,
      metalness: 0,
      ior: 1.33,
      clearcoat: 1,
      clearcoatRoughness: 0.03,
      normalMap,
      normalScale: new THREE.Vector2(calm ? 0.05 : 0.28, calm ? 0.05 : 0.28),
      envMapIntensity: calm ? 1.6 : 1.1,
      // Projecteurs allumés : l’eau s’illumine de l’intérieur (bassin turquoise la nuit).
      emissive: glow ?? '#000000',
      emissiveIntensity: glow ? 0.22 : 0,
      transparent: true,
      opacity,
      depthWrite: false,
      side: THREE.FrontSide,
    });
  }, [color, opacity, roughness, glow, calm]);
  useEffect(() => () => { mat.normalMap?.dispose(); mat.dispose(); }, [mat]);
  useScrollTexture(mat.normalMap, 0.02, 0.011);
  return mat;
}

/** Caustiques : deux calques qui dérivent en sens contraires, additionnés à la lumière du fond. */
function Caustics({ geometry, strength, tint }: { geometry: THREE.BufferGeometry; strength: number; tint: string }) {
  const mats = useMemo(() => {
    const base = causticTexture();
    if (!base) return [];
    return [0, 1].map((k) => {
      const map = base.clone();
      map.needsUpdate = true;
      map.repeat.set(k === 0 ? 0.42 : 0.31, k === 0 ? 0.42 : 0.31);
      return new THREE.MeshBasicMaterial({ map, color: tint, transparent: true, opacity: strength, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
    });
  }, [strength, tint]);
  useEffect(() => () => mats.forEach((m) => { m.map?.dispose(); m.dispose(); }), [mats]);
  useScrollTexture(mats[0]?.map, 0.018, 0.009);
  useScrollTexture(mats[1]?.map, -0.013, 0.016);
  return (
    <>
      {mats.map((m, k) => <mesh key={k} geometry={geometry} material={m} position={[0, 0.004 + k * 0.002, 0]} renderOrder={2} />)}
    </>
  );
}

// ───────────────────────── accessoires ─────────────────────────

function Ladder({ p, n, t, topY, waterY, floorY, copingY }: { p: P; n: P; t: P; topY: number; waterY: number; floorY: number; copingY: number }) {
  const geos = useMemo(() => {
    const rails = [-0.24, 0.24].map((s) => {
      const at = (inward: number, y: number) => new THREE.Vector3(p[0] + n[0] * inward + t[0] * s, y, p[1] + n[1] * inward + t[1] * s);
      const bottom = Math.max(floorY + 0.15, waterY - 1.1);
      const curve = new THREE.CatmullRomCurve3([
        at(0.12, bottom), at(0.12, topY + 0.15), at(0.08, copingY + 0.62), at(-0.12, copingY + 0.78), at(-0.3, copingY + 0.55), at(-0.32, copingY),
      ]);
      return new THREE.TubeGeometry(curve, 40, 0.022, 8, false);
    });
    const bottom = Math.max(floorY + 0.15, waterY - 1.1);
    const rungs = [0.2, 0.5, 0.8]
      .map((dy) => waterY - dy)
      .filter((y) => y > bottom + 0.05)
      .map((y) => ({ pos: [p[0] + n[0] * 0.12, y, p[1] + n[1] * 0.12] as [number, number, number], rot: Math.atan2(t[0], t[1]) }));
    return { rails, rungs };
  }, [p, n, t, topY, waterY, floorY, copingY]);
  useEffect(() => () => geos.rails.forEach((g) => g.dispose()), [geos]);
  return (
    <group>
      {geos.rails.map((g, i) => <mesh key={i} geometry={g} material={chrome} castShadow />)}
      {geos.rungs.map((r, i) => (
        <mesh key={`r${i}`} position={r.pos} rotation={[Math.PI / 2, 0, r.rot]} material={chrome}>
          <boxGeometry args={[0.07, 0.48, 0.03]} />
        </mesh>
      ))}
    </group>
  );
}

/** Corde de ligne d’eau : flotteurs alternés, rouges aux extrémités. */
function LaneRope({ from, to, y }: { from: P; to: P; y: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const len = Math.hypot(to[0] - from[0], to[1] - from[1]);
  const count = Math.max(2, Math.floor(len / 0.14));
  useEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(to[0] - from[0], 0, to[1] - from[1]).normalize());
    const c = new THREE.Color();
    for (let i = 0; i < count; i += 1) {
      const u = (i + 0.5) / count;
      m.compose(new THREE.Vector3(from[0] + (to[0] - from[0]) * u, y, from[1] + (to[1] - from[1]) * u), q, new THREE.Vector3(1, 1, 1));
      mesh.setMatrixAt(i, m);
      const edge = u * len < 2 || (1 - u) * len < 2;
      mesh.setColorAt(i, c.set(edge ? '#dc2626' : i % 2 === 0 ? '#1d4ed8' : '#f8fafc'));
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [from, to, y, count, len]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]} castShadow>
      <cylinderGeometry args={[0.05, 0.05, 0.11, 10]} />
      <meshStandardMaterial roughness={0.45} />
    </instancedMesh>
  );
}

/** Décor qui flotte et tangue doucement. */
function Bobbing({ children, phase, y }: { children: React.ReactNode; phase: number; y: number }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const g = ref.current;
    if (!g) return;
    const t = clock.elapsedTime + phase;
    g.position.y = y + Math.sin(t * 1.3) * 0.012;
    g.rotation.x = Math.sin(t * 0.9) * 0.03;
    g.rotation.z = Math.cos(t * 1.1) * 0.03;
  });
  return <group ref={ref} position={[0, y, 0]}>{children}</group>;
}

function FloatingDecor({ kind, ring, y, seed }: { kind: PoolOptions['floating']; ring: P[]; y: number; seed: number }) {
  const area = useMemo(() => {
    const b = bbox(ring);
    return (b.x1 - b.x0) * (b.z1 - b.z0);
  }, [ring]);
  const spots = useMemo(() => {
    if (kind === 'none') return [];
    const n = kind === 'floats' ? Math.min(4, Math.max(2, Math.round(area / 12)))
      : kind === 'petals' ? Math.min(140, Math.round(area * 4))
        : Math.min(40, Math.max(5, Math.round(area / (kind === 'lanterns' ? 4 : 2))));
    return scatterInside(ring, n, kind === 'floats' ? 0.9 : 0.25, seed);
  }, [kind, ring, area, seed]);
  if (kind === 'none') return null;
  const rand = seededRandom(seed + 7);
  if (kind === 'petals') {
    return (
      <group>
        {spots.map(([x, z], i) => {
          const flower = i % 9 === 0;
          const color = ['#f43f5e', '#fb7185', '#fda4af', '#fdfcf7', '#e11d48'][i % 5];
          return (
            <group key={i} position={[x, y + 0.006, z]} rotation={[0, rand() * 6.28, 0]}>
              {flower ? (
                <>
                  {Array.from({ length: 6 }).map((_, k) => (
                    <mesh key={k} position={[Math.cos((k / 6) * 6.28) * 0.06, 0.01, Math.sin((k / 6) * 6.28) * 0.06]} rotation={[-Math.PI / 2 + 0.25, 0, (k / 6) * 6.28]} scale={[0.07, 0.045, 1]}>
                      <circleGeometry args={[1, 10]} />
                      <meshStandardMaterial color={i % 2 ? '#fdfcf7' : '#f9a8d4'} roughness={0.6} side={THREE.DoubleSide} />
                    </mesh>
                  ))}
                  <mesh position={[0, 0.02, 0]}><sphereGeometry args={[0.03, 10, 8]} /><meshStandardMaterial color="#facc15" /></mesh>
                </>
              ) : (
                <mesh rotation={[-Math.PI / 2, 0, 0]} scale={[0.035, 0.022, 1]}>
                  <circleGeometry args={[1, 8]} />
                  <meshStandardMaterial color={color} roughness={0.55} side={THREE.DoubleSide} />
                </mesh>
              )}
            </group>
          );
        })}
      </group>
    );
  }
  return (
    <group>
      {spots.map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <Bobbing phase={i * 1.7} y={y}>
            {kind === 'floats' ? (
              i % 3 === 2 ? (
                <RoundedBox args={[1.8, 0.14, 0.72]} radius={0.06} smoothness={3} rotation={[0, rand() * 3, 0]} position={[0, 0.05, 0]} castShadow>
                  <meshStandardMaterial color={['#38bdf8', '#fde047', '#fb7185'][i % 3]} roughness={0.35} />
                </RoundedBox>
              ) : (
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]} castShadow>
                  <torusGeometry args={[0.38, 0.13, 14, 28]} />
                  <meshStandardMaterial color={['#f472b6', '#facc15', '#fb923c', '#34d399'][i % 4]} roughness={0.3} />
                </mesh>
              )
            ) : kind === 'candles' ? (
              <>
                <mesh position={[0, 0.01, 0]}>
                  <cylinderGeometry args={[0.07, 0.07, 0.02, 16]} />
                  <meshStandardMaterial color="#e2e8f0" roughness={0.2} metalness={0.6} />
                </mesh>
                <mesh position={[0, 0.045, 0]}>
                  <cylinderGeometry args={[0.05, 0.05, 0.06, 16]} />
                  <meshStandardMaterial color="#fdfaf2" roughness={0.6} emissive="#ffb347" emissiveIntensity={0.25} />
                </mesh>
                <mesh position={[0, 0.095, 0]}>
                  <coneGeometry args={[0.012, 0.04, 8]} />
                  <meshBasicMaterial color="#ffd27a" toneMapped={false} />
                </mesh>
              </>
            ) : (
              <mesh position={[0, 0.12, 0]}>
                <sphereGeometry args={[0.18, 20, 14]} />
                <meshStandardMaterial
                  color="#ffffff"
                  emissive={['#f9a8d4', '#a5f3fc', '#fde68a', '#c4b5fd'][i % 4]}
                  emissiveIntensity={1.6}
                  transparent
                  opacity={0.92}
                  roughness={0.2}
                  toneMapped={false}
                />
              </mesh>
            )}
          </Bobbing>
        </group>
      ))}
    </group>
  );
}

/** Bulles du spa : petites écumes qui gonflent et éclatent à la surface. */
function SpaBubbles({ ring, y, seed }: { ring: P[]; y: number; seed: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const spots = useMemo(() => scatterInside(ring, 90, 0.08, seed), [ring, seed]);
  const m = useMemo(() => new THREE.Matrix4(), []);
  useFrame(({ clock }) => {
    const mesh = ref.current;
    if (!mesh) return;
    const t = clock.elapsedTime;
    spots.forEach(([x, z], i) => {
      const k = (t * 1.6 + i * 0.37) % 1;
      const s = 0.02 + Math.sin(k * Math.PI) * 0.05;
      m.makeScale(s, s * 0.5, s);
      m.setPosition(x + Math.sin(t * 2 + i) * 0.02, y + 0.005, z + Math.cos(t * 2.3 + i) * 0.02);
      mesh.setMatrixAt(i, m);
    });
    mesh.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, spots.length]}>
      <sphereGeometry args={[1, 10, 8]} />
      <meshStandardMaterial color="#ffffff" emissive="#bfe9ff" emissiveIntensity={0.35} roughness={0.25} transparent opacity={0.85} />
    </instancedMesh>
  );
}

/** Lame d’eau : bloc de pierre et nappe qui retombe en courbe dans le bassin. */
function Waterfall({ x, z, dirZ, baseY, waterY, width, water, coping }: { x: number; z: number; dirZ: 1 | -1; baseY: number; waterY: number; width: number; water: string; coping: PoolOptions['coping'] }) {
  const blockH = 0.75;
  const sheet = useMemo(() => {
    const g = new THREE.PlaneGeometry(width * 0.8, 1, 1, 16);
    const pos = g.getAttribute('position') as THREE.BufferAttribute;
    const top = baseY + blockH - 0.06;
    for (let i = 0; i < pos.count; i += 1) {
      const t = 0.5 - pos.getY(i); // 0 en haut, 1 en bas
      pos.setXYZ(i, pos.getX(i), top - (top - waterY) * t * t, dirZ * (0.06 + 0.42 * t));
    }
    g.computeVertexNormals();
    return g;
  }, [width, baseY, waterY, dirZ]);
  const mat = useMemo(() => {
    const normalMap = loadTiledTexture('/floors/gen/water-normal.jpg', 1, 1, true).clone();
    normalMap.wrapS = normalMap.wrapT = THREE.RepeatWrapping;
    normalMap.repeat.set(1, 2);
    normalMap.needsUpdate = true;
    return new THREE.MeshPhysicalMaterial({ color: mixHex(water, '#ffffff', 0.55), roughness: 0.08, transparent: true, opacity: 0.7, normalMap, normalScale: new THREE.Vector2(0.6, 0.6), side: THREE.DoubleSide, depthWrite: false });
  }, [water]);
  useEffect(() => () => { sheet.dispose(); mat.normalMap?.dispose(); mat.dispose(); }, [sheet, mat]);
  useScrollTexture(mat.normalMap, 0, 0.9);
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, baseY + blockH / 2, -dirZ * 0.18]} material={copingMaterial(coping === 'ipe' ? 'stone' : coping)} castShadow receiveShadow>
        <boxGeometry args={[width, blockH, 0.5]} />
      </mesh>
      <mesh geometry={sheet} material={mat} />
      <mesh position={[0, waterY + 0.008, dirZ * 0.5]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[width * 0.38, 24]} />
        <meshStandardMaterial color="#ffffff" transparent opacity={0.45} roughness={0.4} depthWrite={false} />
      </mesh>
    </group>
  );
}

function Reeds({ x, z, seed }: { x: number; z: number; seed: number }) {
  const rand = seededRandom(seed);
  return (
    <group position={[x, 0, z]}>
      {Array.from({ length: 9 }).map((_, k) => {
        const h = 0.7 + rand() * 0.6;
        return (
          <mesh key={k} position={[(rand() - 0.5) * 0.5, h / 2 - 0.1, (rand() - 0.5) * 0.5]} rotation={[(rand() - 0.5) * 0.25, 0, (rand() - 0.5) * 0.25]}>
            <coneGeometry args={[0.025, h, 4]} />
            <meshStandardMaterial color={k % 3 === 0 ? '#6b8f3a' : '#4f7a2e'} roughness={0.8} />
          </mesh>
        );
      })}
    </group>
  );
}

const rockGeoCache = new Map<number, THREE.BufferGeometry>();
function rockGeometry(seed: number) {
  const hit = rockGeoCache.get(seed);
  if (hit) return hit;
  const g = new THREE.DodecahedronGeometry(1, 1);
  const rand = seededRandom(seed);
  const pos = g.getAttribute('position') as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  const bumps = new Map<string, number>();
  for (let i = 0; i < pos.count; i += 1) {
    v.fromBufferAttribute(pos, i);
    const key = `${v.x.toFixed(3)},${v.y.toFixed(3)},${v.z.toFixed(3)}`;
    if (!bumps.has(key)) bumps.set(key, 0.8 + rand() * 0.35);
    v.multiplyScalar(bumps.get(key)!);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  rockGeoCache.set(seed, g);
  return g;
}

// ───────────────────────── projecteurs ─────────────────────────

function PoolLights({ spots, y, color, intensity, center }: { spots: Array<{ p: P; n: P }>; y: number; color: string; intensity: number; center: [number, number, number] }) {
  const rgb = color === 'rgb';
  const base = rgb ? '#38bdf8' : color;
  const emissive = useMemo(() => new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: base, emissiveIntensity: 3, toneMapped: false }), [base]);
  const glow = useMemo(() => new THREE.MeshBasicMaterial({ color: base, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }), [base]);
  const light = useRef<THREE.PointLight>(null);
  useEffect(() => () => { emissive.dispose(); glow.dispose(); }, [emissive, glow]);
  useFrame(({ clock }) => {
    if (!rgb) return;
    const c = new THREE.Color().setHSL((clock.elapsedTime * 0.06) % 1, 0.85, 0.6);
    emissive.emissive.copy(c);
    glow.color.copy(c);
    light.current?.color.copy(c);
  });
  return (
    <group>
      {spots.map(({ p, n }, i) => {
        const rot = Math.atan2(n[0], n[1]);
        return (
          <group key={i} position={[p[0] + n[0] * 0.012, y, p[1] + n[1] * 0.012]} rotation={[0, rot, 0]}>
            <mesh material={emissive}><circleGeometry args={[0.1, 20]} /></mesh>
            <mesh material={glow} position={[0, 0, 0.004]}><circleGeometry args={[0.45, 24]} /></mesh>
          </group>
        );
      })}
      <pointLight ref={light} position={center} color={base} intensity={intensity} distance={0} decay={1} />
    </group>
  );
}

// ───────────────────────── piscine ─────────────────────────

export function PoolMesh({
  w,
  d,
  shape,
  pool,
  depthM,
  sunken = true,
  seed = 1,
}: {
  w: number;
  d: number;
  shape?: PoolShape;
  pool?: Partial<PoolOptions>;
  /** Profondeur d’eau maximale (m). */
  depthM?: number;
  /** Le sol est percé sous la piscine : sinon (étage, vue empilée) le bassin est posé sur le sol. */
  sunken?: boolean;
  seed?: number;
}) {
  const o = useMemo(() => resolvePoolOptions(pool), [pool]);
  const realShape = resolvePoolShape(o.type, shape);
  const depth = resolvePoolDepth(o.type, depthM);
  const aboveGround = poolIsAboveGround(o.type) || !sunken;
  const rim = aboveGround && o.type !== 'raised' && o.type !== 'spa' ? Math.min(depth, 1.3) + 0.12 : poolRimHeight(o.type, depth);
  const flush = o.type === 'infinity' || o.type === 'mirror';
  const topY = aboveGround || o.type === 'spa' ? rim : 0;
  const waterY = aboveGround ? rim - 0.12 : o.type === 'spa' ? rim - 0.1 : flush ? -0.012 : -0.1;
  const copingY = aboveGround || o.type === 'spa' ? rim : 0;
  const copingT = flush ? 0.025 : 0.05;
  const copingW = poolCopingWidth(o, w, d);
  const effDepth = aboveGround && o.type !== 'spa' ? Math.max(0.3, waterY - 0.02) : depth;

  const ring = useMemo(() => poolWaterOutline(o, realShape, w, d), [o, realShape, w, d]);
  const box = useMemo(() => bbox(ring), [ring]);
  const floorY = (x: number, z: number) => waterY - (aboveGround && o.type !== 'spa' ? effDepth : poolFloorDepthAt(o, effDepth, w, d, x, z));
  const waterTint = useMemo(() => new THREE.Color(o.water), [o.water]);
  const tint = (y: number) => {
    // Absorption : plus on descend, plus le revêtement prend la couleur de l’eau.
    const k = Math.min(1, Math.max(0, (waterY - y) / 1.4)) * (o.type === 'natural' ? 0.9 : 0.8) + (y < waterY ? 0.25 : 0);
    return new THREE.Color(1, 1, 1).lerp(waterTint, Math.min(0.92, k));
  };
  const linerTile = POOL_LINER_META[o.liner].texture === 'mosaic' ? 1.2 : 2.4;
  const bandBottom = waterY - 0.14;

  const geos = useMemo(() => {
    const walls = wallGeometry(ring, () => Math.min(topY, bandBottom), (x, z) => floorY(x, z), linerTile, tint);
    const band = topY > bandBottom ? wallGeometry(ring, () => topY, () => bandBottom, linerTile, () => new THREE.Color('#ffffff')) : null;
    const floor = floorGeometry(ring, floorY, linerTile, tint);
    const caustics = floorGeometry(ring, floorY, 1);
    const water = flatGeometry(ring, waterY, 3);
    let coping: THREE.BufferGeometry | null = null;
    let copingBoxes: Array<{ pos: [number, number, number]; size: [number, number, number] }> = [];
    let skirt: THREE.BufferGeometry | null = null;
    let bench: THREE.BufferGeometry | null = null;
    const outer = offset(ring, -copingW);
    if (o.type === 'infinity') {
      const hole = poolGroundHole(o, realShape, w, d);
      const hb = bbox(hole ?? ring);
      const strips: Array<[number, number, number, number]> = [
        [-w / 2, hb.x0, -d / 2, d / 2], [hb.x1, w / 2, -d / 2, d / 2], [hb.x0, hb.x1, -d / 2, hb.z0], [hb.x0, hb.x1, hb.z1, d / 2],
      ];
      copingBoxes = strips
        .filter(([x0, x1, z0, z1]) => x1 - x0 > 0.01 && z1 - z0 > 0.01)
        .map(([x0, x1, z0, z1]) => ({ pos: [(x0 + x1) / 2, copingT / 2, (z0 + z1) / 2], size: [x1 - x0, copingT, z1 - z0] }));
    } else if (o.coping !== 'rocks' || aboveGround) {
      coping = ringSlab(outer, ring, copingT, copingY, POOL_COPING_META[o.coping].tileM);
    } else {
      coping = ringSlab(outer, ring, 0.03, 0, POOL_COPING_META.rocks.tileM);
    }
    if (aboveGround || o.type === 'spa') {
      skirt = wallGeometry(outer, () => rim, () => 0, o.type === 'raised' ? 1.4 : POOL_COPING_META[o.coping].tileM);
    }
    if (o.type === 'spa') {
      const inner = offset(ring, Math.min(0.42, Math.min(box.x1 - box.x0, box.z1 - box.z0) * 0.22));
      const shapeB = new THREE.Shape(ring.map(([x, z]) => new THREE.Vector2(x, -z)));
      shapeB.holes.push(new THREE.Path(inner.map(([x, z]) => new THREE.Vector2(x, -z))));
      const benchTop = waterY - 0.5;
      const minFloor = waterY - effDepth;
      bench = new THREE.ExtrudeGeometry(shapeB, { depth: benchTop - minFloor, bevelEnabled: false, curveSegments: 16 });
      bench.rotateX(-Math.PI / 2);
      bench.translate(0, minFloor, 0);
      const uv = bench.getAttribute('uv') as THREE.BufferAttribute;
      for (let i = 0; i < uv.count; i += 1) uv.setXY(i, uv.getX(i) / linerTile, uv.getY(i) / linerTile);
      const col: number[] = [];
      const pos = bench.getAttribute('position') as THREE.BufferAttribute;
      for (let i = 0; i < pos.count; i += 1) { const c = tint(pos.getY(i)); col.push(c.r, c.g, c.b); }
      bench.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    }
    return { walls, band, floor, caustics, water, coping, copingBoxes, skirt, bench };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ring, topY, waterY, bandBottom, linerTile, copingW, copingT, copingY, rim, o, realShape, w, d, effDepth, aboveGround, waterTint]);
  useEffect(() => () => {
    Object.values(geos).forEach((g) => { if (g instanceof THREE.BufferGeometry) g.dispose(); });
  }, [geos]);

  // Bac de rétention de la piscine à débordement.
  const infinity = useMemo(() => {
    if (o.type !== 'infinity' || aboveGround) return null;
    const hole = poolGroundHole(o, realShape, w, d);
    if (!hole) return null;
    const hb = bbox(hole);
    const t = { x0: hb.x0, x1: hb.x1, z0: hb.z0, z1: hb.z1 };
    let sheetA: P; let sheetB: P;
    if (o.infinityEdge === 'north') { t.z1 = box.z0; sheetA = [box.x0, box.z0]; sheetB = [box.x1, box.z0]; }
    else if (o.infinityEdge === 'south') { t.z0 = box.z1; sheetA = [box.x0, box.z1]; sheetB = [box.x1, box.z1]; }
    else if (o.infinityEdge === 'west') { t.x1 = box.x0; sheetA = [box.x0, box.z0]; sheetB = [box.x0, box.z1]; }
    else { t.x0 = box.x1; sheetA = [box.x1, box.z0]; sheetB = [box.x1, box.z1]; }
    const troughRing: P[] = [[t.x1, t.z0], [t.x1, t.z1], [t.x0, t.z1], [t.x0, t.z0]];
    const troughWater = -0.32;
    const sheetWall = wallGeometry([sheetA, sheetB], () => waterY + 0.004, () => troughWater, 1);
    // Une seule face : on retire le segment de retour B→A.
    sheetWall.setDrawRange(0, 6);
    return {
      walls: wallGeometry(troughRing, () => 0, () => -0.55, 1.2),
      floor: floorGeometry(troughRing, () => -0.55, 1.2),
      water: flatGeometry(troughRing, troughWater, 2),
      sheet: sheetWall,
    };
  }, [o, aboveGround, realShape, w, d, box, waterY]);

  const glow = o.lights && o.type !== 'mirror' ? (o.lightColor === 'rgb' ? o.water : mixHex(o.lightColor, o.water, 0.5)) : null;
  const water = useWater(o.water, o.type === 'mirror' ? 0.95 : o.type === 'natural' ? 0.8 : o.type === 'spa' ? 0.62 : 0.58, o.type === 'mirror' ? 0.015 : 0.04, glow, o.type === 'mirror');
  const sheetMat = useMemo(() => {
    const normalMap = loadTiledTexture('/floors/gen/water-normal.jpg', 1, 1, true).clone();
    normalMap.wrapS = normalMap.wrapT = THREE.RepeatWrapping;
    normalMap.repeat.set(2, 1);
    normalMap.needsUpdate = true;
    return new THREE.MeshPhysicalMaterial({ color: mixHex(o.water, '#ffffff', 0.35), roughness: 0.06, transparent: true, opacity: 0.75, normalMap, side: THREE.DoubleSide, depthWrite: false });
  }, [o.water]);
  useEffect(() => () => { sheetMat.normalMap?.dispose(); sheetMat.dispose(); }, [sheetMat]);
  useScrollTexture(sheetMat.normalMap, 0, -0.8);

  const liner = linerMaterial(o.liner);
  const band = linerMaterial(o.liner === 'mosaicBlue' || o.liner === 'mosaicWhite' ? o.liner : 'grey', true);
  const copingMat = copingMaterial(o.coping);
  const skirtMat = o.type === 'raised'
    ? textured('/floors/gen/deck-ipe.jpg', '#c99f74', 0.75, { side: THREE.DoubleSide }, 'skirt')
    : textured(POOL_COPING_META[o.coping].texture, POOL_COPING_META[o.coping].color, 0.85, { side: THREE.DoubleSide }, 'skirt');

  const long = box.x1 - box.x0 >= box.z1 - box.z0;
  const straight = realShape === 'rectangle' || realShape === 'rounded' || o.type === 'infinity';
  const access = o.access === 'roman' && !straight ? 'ladder' : o.access;

  // Marches romaines au petit bain.
  const steps = useMemo(() => {
    if (access !== 'roman' || aboveGround || o.type === 'spa') return [];
    const across = long ? box.z1 - box.z0 : box.x1 - box.x0;
    const span = across * (realShape === 'rounded' ? 0.5 : 0.96);
    const start = long ? box.x0 : box.z0;
    const shallowFloor = floorY(long ? box.x0 : 0, long ? 0 : box.z0);
    const n = Math.max(1, Math.min(4, Math.floor((waterY - shallowFloor) / 0.28)));
    return Array.from({ length: n }, (_, k) => {
      const top = waterY - 0.28 * (k + 1);
      const len = 0.4 * (n - k);
      const h = top - shallowFloor + 0.02;
      const c = start + len / 2;
      return {
        pos: (long ? [c, shallowFloor + h / 2 - 0.02, (box.z0 + box.z1) / 2] : [(box.x0 + box.x1) / 2, shallowFloor + h / 2 - 0.02, c]) as [number, number, number],
        size: (long ? [len, h, span] : [span, h, len]) as [number, number, number],
        color: tint(top),
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [access, aboveGround, o.type, long, box, realShape, waterY, effDepth]);

  // Lignes de nage peintes au fond (bandes sombres le long du grand axe).
  const stripes = useMemo(() => {
    if (!straight || o.type === 'mirror' || o.type === 'spa' || aboveGround) return [];
    const lines = poolLaneLines(o, w, d);
    const acrossMin = long ? box.z0 : box.x0;
    const acrossMax = long ? box.z1 : box.x1;
    const bounds = [acrossMin, ...lines, acrossMax];
    const centers = o.type === 'lap' ? bounds.slice(0, -1).map((v, i) => (v + bounds[i + 1]) / 2) : [(acrossMin + acrossMax) / 2];
    const a0 = (long ? box.x0 : box.z0) + 1;
    const a1 = (long ? box.x1 : box.z1) - 1;
    if (a1 - a0 < 1) return [];
    return centers.map((c) => {
      const pt = (along: number, off: number): P => (long ? [along, c + off] : [c + off, along]);
      const quad: P[] = [pt(a0, -0.12), pt(a1, -0.12), pt(a1, 0.12), pt(a0, 0.12)];
      return floorGeometry(quad, (x, z) => floorY(x, z) + 0.006, 1);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [straight, o, w, d, long, box, aboveGround, waterY, effDepth]);
  useEffect(() => () => stripes.forEach((g) => g.dispose()), [stripes]);

  const ropes = useMemo(() => {
    const lines = poolLaneLines(o, w, d);
    return lines.map((c) => (long ? { from: [box.x0, c] as P, to: [box.x1, c] as P } : { from: [c, box.z0] as P, to: [c, box.z1] as P }));
  }, [o, w, d, long, box]);

  const lightSpots = useMemo(() => {
    if (!o.lights || o.type === 'mirror') return [];
    const b = bbox(ring);
    const perim = 2 * (b.x1 - b.x0 + b.z1 - b.z0);
    return alongRing(ring, Math.max(2, Math.min(8, Math.round(perim / 6))));
  }, [o.lights, o.type, ring]);

  // Échelle au grand bain.
  const ladder = useMemo(() => {
    if (access !== 'ladder') return null;
    const spots = alongRing(ring, 48);
    const best = spots.reduce((acc, s) => ((long ? s.p[0] : s.p[1]) > (long ? acc.p[0] : acc.p[1]) ? s : acc), spots[0]);
    return best;
  }, [access, ring, long]);

  const natural = useMemo(() => {
    if (o.coping !== 'rocks' || aboveGround) return null;
    const outer = offset(ring, -copingW * 0.55);
    const rocks = alongRing(outer, Math.max(8, Math.round((2 * (box.x1 - box.x0 + box.z1 - box.z0)) / 0.9)));
    const reedSide = alongRing(ring, 24).filter((s) => (long ? s.p[0] < box.x0 + (box.x1 - box.x0) * 0.3 : s.p[1] < box.z0 + (box.z1 - box.z0) * 0.3));
    return { rocks, reeds: reedSide.filter((_, i) => i % 2 === 0) };
  }, [o.coping, aboveGround, ring, copingW, box, long]);

  const waterfall = useMemo(() => {
    if (!o.waterfall || o.type === 'spa' || o.type === 'mirror') return null;
    const north = !(o.type === 'infinity' && o.infinityEdge === 'north');
    const z = north ? box.z0 : box.z1;
    return { x: (box.x0 + box.x1) / 2, z, dirZ: (north ? 1 : -1) as 1 | -1, width: Math.min(1.6, (box.x1 - box.x0) * 0.35) };
  }, [o.waterfall, o.type, o.infinityEdge, box]);

  const area = (box.x1 - box.x0) * (box.z1 - box.z0);
  const mirrorGeo = useMemo(() => new THREE.ShapeGeometry(new THREE.Shape(ring.map(([x, z]) => new THREE.Vector2(x, -z))), 16), [ring]);
  useEffect(() => () => mirrorGeo.dispose(), [mirrorGeo]);
  const lily = o.type === 'natural' ? scatterInside(ring, 6, 0.4, seed + 3).filter(([x, z]) => (long ? x < (box.x0 + box.x1) / 2 : z < (box.z0 + box.z1) / 2)) : [];

  return (
    <group>
      {/* Bassin : parois, frise à la ligne d’eau, fond en pente */}
      <mesh geometry={geos.walls} material={liner} receiveShadow />
      {geos.band ? <mesh geometry={geos.band} material={band} receiveShadow /> : null}
      <mesh geometry={geos.floor} material={liner} receiveShadow />
      {geos.bench ? <mesh geometry={geos.bench} material={liner} receiveShadow /> : null}
      {o.type !== 'mirror' ? <Caustics geometry={geos.caustics} strength={o.type === 'natural' ? 0.12 : 0.28} tint={mixHex(o.water, '#ffffff', 0.6)} /> : null}
      {stripes.map((g, i) => (
        <mesh key={i} geometry={g}>
          <meshStandardMaterial color={mixHex('#0f2a44', o.water, 0.25)} roughness={0.4} side={THREE.DoubleSide} />
        </mesh>
      ))}
      {steps.map((s, i) => (
        <mesh key={i} position={s.pos} receiveShadow>
          <boxGeometry args={s.size} />
          <meshStandardMaterial color={new THREE.Color(POOL_LINER_META[o.liner].color).multiply(s.color)} roughness={0.45} />
        </mesh>
      ))}

      {/* Margelles, plage, habillage */}
      {geos.coping ? <mesh geometry={geos.coping} material={copingMat} castShadow receiveShadow /> : null}
      {geos.copingBoxes.map((b, i) => (
        <mesh key={i} position={b.pos} material={copingMat} castShadow receiveShadow>
          <boxGeometry args={b.size} />
        </mesh>
      ))}
      {geos.skirt ? <mesh geometry={geos.skirt} material={skirtMat} castShadow receiveShadow /> : null}

      {/* Débordement : lame d’eau sur toute la longueur et bac de rétention */}
      {infinity ? (
        <>
          <mesh geometry={infinity.walls} material={textured('/floors/gen/wall-slate.jpg', '#4b5563', 0.6, { side: THREE.DoubleSide }, 'trough')} receiveShadow />
          <mesh geometry={infinity.floor} material={textured('/floors/gen/wall-slate.jpg', '#374151', 0.6, { side: THREE.DoubleSide }, 'troughf')} />
          <mesh geometry={infinity.water} material={water} />
          <mesh geometry={infinity.sheet} material={sheetMat} />
        </>
      ) : null}

      {o.type === 'mirror' ? (
        // Miroir d’eau : vrai reflet du décor (bougies, invités, arbres) sur une lame d’eau noire.
        <mesh geometry={mirrorGeo} rotation={[-Math.PI / 2, 0, 0]} position={[0, waterY, 0]} renderOrder={3}>
          <MeshReflectorMaterial
            resolution={512}
            mirror={0.9}
            mixStrength={4}
            mixBlur={0}
            blur={[0, 0]}
            color={o.water}
            metalness={0.4}
            roughness={0.12}
          />
        </mesh>
      ) : (
        <mesh geometry={geos.water} material={water} receiveShadow renderOrder={3} />
      )}

      {ropes.map((r, i) => <LaneRope key={i} from={r.from} to={r.to} y={waterY + 0.01} />)}
      {o.type === 'spa' ? <SpaBubbles ring={ring} y={waterY} seed={seed} /> : null}
      {ladder ? <Ladder p={ladder.p} n={ladder.n} t={ladder.t} topY={topY} waterY={waterY} floorY={floorY(ladder.p[0], ladder.p[1])} copingY={copingY + copingT} /> : null}
      {o.type === 'raised' && ladder ? (
        // Échelle extérieure symétrique pour monter dans un bassin hors-sol.
        <Ladder p={ladder.p} n={[-ladder.n[0], -ladder.n[1]]} t={ladder.t} topY={rim} waterY={rim - 0.1} floorY={-0.4} copingY={copingY + copingT} />
      ) : null}
      {lightSpots.length > 0 ? (
        <PoolLights
          spots={lightSpots}
          y={Math.max(waterY - 0.38, waterY - effDepth * 0.5)}
          color={o.lightColor}
          intensity={Math.min(6, 1 + area * 0.06)}
          center={[(box.x0 + box.x1) / 2, waterY - effDepth * 0.4, (box.z0 + box.z1) / 2]}
        />
      ) : null}
      {natural ? (
        <>
          {natural.rocks.map((r, i) => {
            const s = 0.22 + ((i * 37) % 10) / 30;
            return (
              <mesh key={i} position={[r.p[0], s * 0.35, r.p[1]]} scale={[s * 1.3, s * 0.75, s]} rotation={[0, i * 1.3, 0]} geometry={rockGeometry((seed + i) % 7)} castShadow receiveShadow>
                <meshStandardMaterial color={['#b7b0a4', '#a39d93', '#c2baa9'][i % 3]} roughness={0.92} flatShading />
              </mesh>
            );
          })}
          {natural.reeds.map((r, i) => <Reeds key={`reed${i}`} x={r.p[0] + r.n[0] * 0.25} z={r.p[1] + r.n[1] * 0.25} seed={seed + i * 11} />)}
          {lily.map(([x, z], i) => (
            <mesh key={`lily${i}`} position={[x, waterY + 0.006, z]} rotation={[-Math.PI / 2, 0, i * 1.1]}>
              <circleGeometry args={[0.2, 18, 0.3, Math.PI * 2 - 0.3]} />
              <meshStandardMaterial color="#3f7d2c" roughness={0.5} side={THREE.DoubleSide} />
            </mesh>
          ))}
        </>
      ) : null}
      {waterfall ? <Waterfall {...waterfall} baseY={copingY + copingT} waterY={waterY} water={o.water} coping={o.coping} /> : null}
      <FloatingDecor kind={o.floating} ring={ring} y={waterY} seed={seed} />
    </group>
  );
}
