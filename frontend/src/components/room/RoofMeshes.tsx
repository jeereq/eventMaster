'use client';

/**
 * Toitures 3D de la salle : chaque style est construit en vraie géométrie (pentes qui se rejoignent
 * au faîtage, pignons fermés, débords de toit, toile tendue entre les fermes…) à partir de l’emprise
 * réelle du contour (rectangle, L, T, U, polygone convexe).
 */

import React, { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { loadTiledTexture } from '@/lib/roomWebGLMaterials';
import {
  frameBays,
  ridgeFrame,
  ridgeRise,
  type RoofFootprint,
  type RoofPoint,
  type RoofRect,
} from '@/lib/roomRoofGeometry';
import type { RoofStyle } from '@/lib/roomLayoutUtils';

export type RoofBuildProps = {
  footprint: RoofFootprint;
  /** Haut des murs (m) : base de la toiture. */
  y: number;
  wallHeightM: number;
  color: string;
  opacity: number;
  /** Murs masqués (plein air) : poteaux / mâts jusqu’au sol. */
  withLegs: boolean;
  /** Teinte des murs (pignons maçonnés). */
  wallColor?: string;
};

// ───────────────────────── géométrie ─────────────────────────

/** Surface paramétrique (u, v) ∈ [0,1]² → point ; UV en mètres fournis par `uv`. */
function paramGeometry(
  nu: number,
  nv: number,
  fn: (u: number, v: number) => [number, number, number],
  uv?: (u: number, v: number) => [number, number],
): THREE.BufferGeometry {
  const pos: number[] = [];
  const uvs: number[] = [];
  const idx: number[] = [];
  for (let j = 0; j <= nv; j += 1) {
    for (let i = 0; i <= nu; i += 1) {
      const u = i / nu;
      const v = j / nv;
      pos.push(...fn(u, v));
      uvs.push(...(uv ? uv(u, v) : [u, v]));
    }
  }
  for (let j = 0; j < nv; j += 1) {
    for (let i = 0; i < nu; i += 1) {
      const a = j * (nu + 1) + i;
      const b = a + 1;
      const c = a + nu + 1;
      const d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

function mergeGeometries(geos: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const pos: number[] = [];
  const uvs: number[] = [];
  const idx: number[] = [];
  let offset = 0;
  for (const g of geos) {
    const p = g.getAttribute('position');
    const t = g.getAttribute('uv');
    for (let i = 0; i < p.count; i += 1) {
      pos.push(p.getX(i), p.getY(i), p.getZ(i));
      uvs.push(t ? t.getX(i) : 0, t ? t.getY(i) : 0);
    }
    const index = g.getIndex();
    if (index) for (let i = 0; i < index.count; i += 1) idx.push(index.getX(i) + offset);
    else for (let i = 0; i < p.count; i += 1) idx.push(i + offset);
    offset += p.count;
    g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  out.setIndex(idx);
  out.computeVertexNormals();
  return out;
}

/** Transforme une géométrie locale (faîtage selon X) dans le repère du rectangle. */
function placeInRect(g: THREE.BufferGeometry, rect: RoofRect, rotationY: number, y: number): THREE.BufferGeometry {
  const m = new THREE.Matrix4().makeRotationY(rotationY);
  m.setPosition(rect.cx, y, rect.cz);
  g.applyMatrix4(m);
  return g;
}

/** Lambrequin festonné : bande verticale de `depth` m à bord inférieur en arcs. */
function valanceGeometry(a: THREE.Vector3, b: THREE.Vector3, depth = 0.32, scallop = 0.75): THREE.BufferGeometry {
  const len = a.distanceTo(b);
  const n = Math.max(1, Math.round(len / scallop));
  const segs = n * 8;
  const dir = new THREE.Vector3().subVectors(b, a);
  return paramGeometry(
    segs,
    1,
    (u, v) => {
      const p = a.clone().addScaledVector(dir, u);
      const k = (u * n) % 1;
      const drop = depth * (0.72 + 0.28 * Math.sin(Math.PI * k));
      return [p.x, p.y - v * drop, p.z];
    },
    (u, v) => [u * len, v * depth],
  );
}

/** Poutre (boîte) tendue entre deux points. */
function Beam({ a, b, w = 0.08, h = 0.14, material }: { a: THREE.Vector3; b: THREE.Vector3; w?: number; h?: number; material: THREE.Material }) {
  const { pos, quat, len } = useMemo(() => {
    const dir = new THREE.Vector3().subVectors(b, a);
    const l = dir.length();
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir.clone().normalize());
    return { pos: a.clone().add(b).multiplyScalar(0.5), quat: q, len: l };
  }, [a, b]);
  if (len < 0.01) return null;
  return (
    <mesh position={pos} quaternion={quat} material={material} castShadow>
      <boxGeometry args={[w, h, len]} />
    </mesh>
  );
}

/** Nuée de petites sphères (guirlandes, ampoules) en une seule InstancedMesh. */
function PointsInstanced({ points, radius, material }: { points: THREE.Vector3[]; radius: number; material: THREE.Material }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    points.forEach((p, i) => {
      m.makeTranslation(p.x, p.y, p.z);
      mesh.setMatrixAt(i, m);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, [points]);
  if (!points.length) return null;
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, points.length]} material={material}>
      <sphereGeometry args={[radius, 6, 5]} />
    </instancedMesh>
  );
}

// ───────────────────────── matières ─────────────────────────

/**
 * Toile PVC / voilage. `glow` simule la lumière du jour qui traverse la toile (une tente est claire
 * à l’intérieur) : la toile n’est pas un écran opaque.
 */
function useFabricMaterial(color: string, opacity: number, sheen = 0.55, glow = 0) {
  return useMemo(() => {
    const map = loadTiledTexture('/floors/gen/tent-pvc.jpg', 1, 1);
    const normalMap = loadTiledTexture('/floors/gen/tent-pvc-normal.jpg', 1, 1, true);
    const transparent = opacity < 0.97;
    return new THREE.MeshStandardMaterial({
      color,
      map,
      normalMap,
      normalScale: new THREE.Vector2(0.4, 0.4),
      roughness: sheen,
      metalness: 0,
      emissive: new THREE.Color(color),
      emissiveMap: glow > 0 ? map : null,
      emissiveIntensity: glow,
      side: THREE.DoubleSide,
      transparent,
      opacity: transparent ? opacity : 1,
      depthWrite: !transparent,
    });
  }, [color, opacity, sheen, glow]);
}

function useTexturedMaterial(url: string, color: string, roughness: number, opacity = 1) {
  return useMemo(() => {
    const transparent = opacity < 0.97;
    return new THREE.MeshStandardMaterial({
      color,
      map: loadTiledTexture(url, 1, 1),
      normalMap: loadTiledTexture(url.replace(/\.jpg$/, '-normal.jpg'), 1, 1, true),
      roughness,
      metalness: 0,
      side: THREE.DoubleSide,
      transparent,
      opacity: transparent ? opacity : 1,
      depthWrite: !transparent,
    });
  }, [url, color, roughness, opacity]);
}

function usePlainMaterial(color: string, roughness: number, metalness = 0, opacity = 1, side: THREE.Side = THREE.FrontSide) {
  return useMemo(() => {
    const transparent = opacity < 0.97;
    return new THREE.MeshStandardMaterial({
      color,
      roughness,
      metalness,
      side,
      transparent,
      opacity: transparent ? opacity : 1,
      depthWrite: !transparent,
    });
  }, [color, roughness, metalness, opacity, side]);
}

function useGlassMaterial(opacity: number) {
  return useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: '#dbeafe',
        roughness: 0.04,
        metalness: 0,
        clearcoat: 1,
        clearcoatRoughness: 0.03,
        transparent: true,
        opacity: Math.min(0.42, Math.max(0.18, opacity * 0.5)),
        side: THREE.DoubleSide,
        depthWrite: false,
        envMapIntensity: 1.4,
      }),
    [opacity],
  );
}

function useLightBulbMaterial() {
  return useMemo(() => new THREE.MeshStandardMaterial({ color: '#fff7d6', emissive: '#ffcf73', emissiveIntensity: 2.2 }), []);
}

const ALU = '#d4d4d8';
const STEEL = '#1f2937';

/** Couleur claire par défaut du toit plat (#d6d3d1) : remplacée par une matière adaptée au style. */
function styleColor(color: string, fallback: string): string {
  const c = color.toLowerCase();
  return c === '#d6d3d1' || c === '#e7e5e4' ? fallback : color;
}

function rectsOf(fp: RoofFootprint): RoofRect[] {
  if (fp.kind === 'rects') return fp.rects;
  const xs = fp.ring.map((p) => p.x);
  const zs = fp.ring.map((p) => p.z);
  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs);
  const z0 = Math.min(...zs);
  const z1 = Math.max(...zs);
  return [{ cx: (x0 + x1) / 2, cz: (z0 + z1) / 2, w: x1 - x0, d: z1 - z0 }];
}

function radialOverhang(center: RoofPoint, p: RoofPoint, oh: number): RoofPoint {
  const dx = p.x - center.x;
  const dz = p.z - center.z;
  const r = Math.hypot(dx, dz) || 1;
  return { x: p.x + (dx / r) * oh, z: p.z + (dz / r) * oh };
}

function maxRadius(center: RoofPoint, ring: RoofPoint[]): number {
  return ring.reduce((m, p) => Math.max(m, Math.hypot(p.x - center.x, p.z - center.z)), 1);
}

// ───────────────────────── tente de réception ─────────────────────────

const TENT_PITCH = 20;
const TENT_OVERHANG = 0.22;

/** Tente à faîtage (structure alu, toile PVC tendue entre les fermes, pignons, lambrequins, voilage intérieur). */
function MarqueeRect({ rect, props, lining }: { rect: RoofRect; props: RoofBuildProps; lining: boolean }) {
  const { y, color, opacity, withLegs, wallHeightM } = props;
  const { length: L, span: S, rotationY } = ridgeFrame(rect);
  const rise = ridgeRise(S, TENT_PITCH);
  const tan = Math.tan((TENT_PITCH * Math.PI) / 180);
  const bays = frameBays(L);
  const bay = L / bays;
  const skin = useFabricMaterial(color, opacity, 0.55, 0.22);
  const liningMat = useFabricMaterial('#fbf8f1', Math.min(0.92, opacity + 0.1), 0.85, 0.42);
  const alu = usePlainMaterial(ALU, 0.35, 0.75);
  const bulbs = useLightBulbMaterial();

  const geos = useMemo(() => {
    const slopeLen = (S / 2 + TENT_OVERHANG) / Math.cos((TENT_PITCH * Math.PI) / 180);
    const sides = ([-1, 1] as const).map((s) =>
      paramGeometry(
        bays * 10,
        10,
        (u, v) => {
          const x = -L / 2 - 0.04 + u * (L + 0.08);
          const zAbs = (S / 2 + TENT_OVERHANG) * (1 - v);
          const t = (((x + L / 2) / bay) % 1 + 1) % 1;
          // Toile tendue : léger creux entre deux fermes, nul au faîtage et à la gouttière.
          const sag = 0.07 * Math.sin(Math.PI * t) * Math.sin(Math.PI * v);
          return [x, (S / 2 - zAbs) * tan - sag, s * zAbs];
        },
        (u, v) => [v * slopeLen / 1.6, (u * L) / 1.6],
      ),
    );
    const gables = ([-1, 1] as const).map((sx) => {
      const g = new THREE.BufferGeometry();
      const x = sx * (L / 2);
      g.setAttribute('position', new THREE.Float32BufferAttribute([x, 0, -S / 2, x, 0, S / 2, x, rise, 0], 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, S / 1.6, 0, S / 3.2, rise / 1.6], 2));
      g.setIndex([0, 1, 2]);
      g.computeVertexNormals();
      return g;
    });
    const skinGeo = placeInRect(mergeGeometries([...sides, ...gables]), rect, rotationY, y);

    const eaveY = -TENT_OVERHANG * tan;
    const zE = S / 2 + TENT_OVERHANG;
    const val = mergeGeometries([
      valanceGeometry(new THREE.Vector3(-L / 2, eaveY, zE), new THREE.Vector3(L / 2, eaveY, zE)),
      valanceGeometry(new THREE.Vector3(L / 2, eaveY, -zE), new THREE.Vector3(-L / 2, eaveY, -zE)),
      valanceGeometry(new THREE.Vector3(-L / 2 - 0.01, 0, -S / 2), new THREE.Vector3(-L / 2 - 0.01, 0, S / 2), 0.28),
      valanceGeometry(new THREE.Vector3(L / 2 + 0.01, 0, S / 2), new THREE.Vector3(L / 2 + 0.01, 0, -S / 2), 0.28),
    ]);
    const valGeo = placeInRect(val, rect, rotationY, y);

    let liningGeo: THREE.BufferGeometry | null = null;
    if (lining) {
      // Voilage intérieur : lés froncés qui retombent en festons entre les fermes.
      const parts = ([-1, 1] as const).map((s) =>
        paramGeometry(
          bays * 24,
          8,
          (u, v) => {
            const x = -L / 2 + 0.06 + u * (L - 0.12);
            const zAbs = (S / 2 - 0.1) * (1 - v);
            const t = (((x + L / 2) / bay) % 1 + 1) % 1;
            const swag = 0.38 * Math.sin(Math.PI * t) * (0.35 + 0.65 * Math.sin(Math.PI * Math.min(1, v * 1.1)));
            // Fronces : plis serrés parallèles à la pente, plus marqués près des fermes où le voile est resserré.
            const pleat = (0.03 + 0.05 * (1 - Math.sin(Math.PI * t))) * Math.sin((x * Math.PI * 2) / 0.22);
            return [x, (S / 2 - zAbs) * tan - 0.18 - swag + pleat, s * zAbs];
          },
          (u, v) => [u * L * 2, v * S],
        ),
      );
      liningGeo = placeInRect(mergeGeometries(parts), rect, rotationY, y);
    }
    return { skinGeo, valGeo, liningGeo };
  }, [L, S, bays, bay, rise, tan, rect, rotationY, y, lining]);

  const frame = useMemo(() => {
    const m = new THREE.Matrix4().makeRotationY(rotationY);
    m.setPosition(rect.cx, y, rect.cz);
    const P = (x: number, yy: number, z: number) => new THREE.Vector3(x, yy, z).applyMatrix4(m);
    const beams: Array<[THREE.Vector3, THREE.Vector3, number, number]> = [];
    const lights: THREE.Vector3[] = [];
    for (let i = 0; i <= bays; i += 1) {
      const x = -L / 2 + i * bay;
      beams.push([P(x, -0.06, -S / 2), P(x, rise - 0.12, 0), 0.07, 0.16]);
      beams.push([P(x, -0.06, S / 2), P(x, rise - 0.12, 0), 0.07, 0.16]);
      if (withLegs) {
        beams.push([P(x, -wallHeightM, -S / 2), P(x, 0, -S / 2), 0.1, 0.16]);
        beams.push([P(x, -wallHeightM, S / 2), P(x, 0, S / 2), 0.1, 0.16]);
      }
    }
    beams.push([P(-L / 2, rise - 0.14, 0), P(L / 2, rise - 0.14, 0), 0.08, 0.12]);
    beams.push([P(-L / 2, -0.04, -S / 2), P(L / 2, -0.04, -S / 2), 0.08, 0.12]);
    beams.push([P(-L / 2, -0.04, S / 2), P(L / 2, -0.04, S / 2), 0.08, 0.12]);
    if (lining) {
      // Guirlande guinguette le long du faîtage et festons de micro-LED sous chaque ferme.
      const n = Math.max(8, Math.round(L / 0.6));
      for (let k = 0; k <= n; k += 1) lights.push(P(-L / 2 + (k / n) * L, rise - 0.36 - 0.12 * Math.sin((Math.PI * ((k / n) * L % bay)) / bay), 0));
      for (let i = 0; i <= bays; i += 1) {
        const x = -L / 2 + i * bay;
        const m2 = Math.max(6, Math.round(S / 0.7));
        for (let k = 0; k <= m2; k += 1) {
          const z = -S / 2 + (k / m2) * S;
          lights.push(P(x, (S / 2 - Math.abs(z)) * tan - 0.3 - 0.15 * Math.sin((Math.PI * k) / m2), z));
        }
      }
    }
    return { beams, lights };
  }, [rotationY, rect, y, bays, L, bay, S, rise, withLegs, wallHeightM, lining, tan]);

  return (
    <group>
      <mesh geometry={geos.skinGeo} material={skin} receiveShadow />
      <mesh geometry={geos.valGeo} material={skin} />
      {geos.liningGeo ? <mesh geometry={geos.liningGeo} material={liningMat} receiveShadow /> : null}
      {frame.beams.map(([a, b, w, h], i) => (
        <Beam key={i} a={a} b={b} w={w} h={h} material={alu} />
      ))}
      <PointsInstanced points={frame.lights} radius={0.03} material={bulbs} />
    </group>
  );
}

/** Chapiteau (contour rond / polygonal) : mât central, toile en pointe au profil concave. */
function BigTop({ center, ring, props, lining, peak = 1 }: { center: RoofPoint; ring: RoofPoint[]; props: RoofBuildProps; lining: boolean; peak?: number }) {
  const { y, color, opacity, withLegs, wallHeightM } = props;
  const R = maxRadius(center, ring);
  const rise = (R * Math.tan((24 * Math.PI) / 180) + 0.8) * peak;
  const skin = useFabricMaterial(color, opacity, 0.55, 0.22);
  const liningMat = useFabricMaterial('#fbf8f1', Math.min(0.92, opacity + 0.1), 0.85, 0.42);
  const alu = usePlainMaterial(ALU, 0.35, 0.75);
  const white = usePlainMaterial('#f5f5f4', 0.5, 0.1);
  const bulbs = useLightBulbMaterial();

  const geos = useMemo(() => {
    const n = ring.length;
    const outer = ring.map((p) => radialOverhang(center, p, 0.22));
    const profile = (v: number) => rise * Math.pow(v, 1.7) - 0.08 * (1 - v);
    const sectors: THREE.BufferGeometry[] = [];
    const vals: THREE.BufferGeometry[] = [];
    const lin: THREE.BufferGeometry[] = [];
    for (let i = 0; i < n; i += 1) {
      const a = outer[i];
      const b = outer[(i + 1) % n];
      const edge = Math.hypot(b.x - a.x, b.z - a.z);
      sectors.push(
        paramGeometry(
          Math.max(4, Math.round(edge / 0.5)),
          14,
          (u, v) => {
            const ex = a.x + (b.x - a.x) * u;
            const ez = a.z + (b.z - a.z) * u;
            const sag = 0.1 * Math.sin(Math.PI * u) * Math.sin(Math.PI * Math.min(1, v * 1.2)) * (edge / 5);
            return [ex + (center.x - ex) * v, y + profile(v) - sag, ez + (center.z - ez) * v];
          },
          (u, v) => [u * edge / 1.6, v * R / 1.6],
        ),
      );
      vals.push(valanceGeometry(new THREE.Vector3(a.x, y + profile(0), a.z), new THREE.Vector3(b.x, y + profile(0), b.z)));
      if (lining) {
        const ia = ring[i];
        const ib = ring[(i + 1) % n];
        const iedge = Math.hypot(ib.x - ia.x, ib.z - ia.z);
        lin.push(
          paramGeometry(
            Math.max(8, Math.round(iedge / 0.12)),
            10,
            (u, v) => {
              const ex = ia.x + (ib.x - ia.x) * u;
              const ez = ia.z + (ib.z - ia.z) * u;
              const vv = v * 0.94;
              const swag = 0.35 * Math.sin(Math.PI * u) * Math.sin(Math.PI * Math.min(1, vv * 1.15)) * Math.min(1, iedge / 4);
              const pleat = (0.03 + 0.05 * (1 - Math.sin(Math.PI * u))) * Math.sin((u * iedge * Math.PI * 2) / 0.22) * (1 - vv);
              return [ex + (center.x - ex) * vv, y + profile(vv) - 0.22 - swag + pleat, ez + (center.z - ez) * vv];
            },
            (u, v) => [u * iedge * 2, v * R],
          ),
        );
      }
    }
    return {
      skin: mergeGeometries(sectors),
      val: mergeGeometries(vals),
      lining: lin.length ? mergeGeometries(lin) : null,
      profile,
    };
  }, [ring, center, rise, y, R, lining]);

  const extras = useMemo(() => {
    const beams: Array<[THREE.Vector3, THREE.Vector3]> = [];
    const lights: THREE.Vector3[] = [];
    const apex = new THREE.Vector3(center.x, y + rise, center.z);
    ring.forEach((p) => {
      if (withLegs) beams.push([new THREE.Vector3(p.x, y - wallHeightM, p.z), new THREE.Vector3(p.x, y, p.z)]);
      if (lining) {
        const k = 14;
        for (let s = 1; s < k; s += 1) {
          const v = s / k;
          lights.push(new THREE.Vector3(p.x + (center.x - p.x) * v, y + geos.profile(v) - 0.3 - 0.1 * Math.sin(Math.PI * v), p.z + (center.z - p.z) * v));
        }
      }
    });
    return { beams, lights, apex };
  }, [ring, center, y, rise, withLegs, wallHeightM, lining, geos]);

  return (
    <group>
      <mesh geometry={geos.skin} material={skin} receiveShadow />
      <mesh geometry={geos.val} material={skin} />
      {geos.lining ? <mesh geometry={geos.lining} material={liningMat} /> : null}
      {extras.beams.map(([a, b], i) => (
        <Beam key={i} a={a} b={b} w={0.1} h={0.14} material={alu} />
      ))}
      {/* Mât central et fleuron */}
      <mesh position={[center.x, y + rise / 2 - wallHeightM / 2 + 0.2, center.z]} material={white} castShadow>
        <cylinderGeometry args={[0.07, 0.09, rise + wallHeightM + 0.4, 12]} />
      </mesh>
      <mesh position={[center.x, y + rise + 0.45, center.z]} material={alu} castShadow>
        <coneGeometry args={[0.05, 0.5, 8]} />
      </mesh>
      <mesh position={[center.x, y + rise + 0.05, center.z]} rotation={[Math.PI / 2, 0, 0]} material={alu}>
        <torusGeometry args={[0.16, 0.035, 8, 20]} />
      </mesh>
      <PointsInstanced points={extras.lights} radius={0.03} material={bulbs} />
    </group>
  );
}

/** Tente pagode : modules d’environ 5 × 5 m, chacun en pointe concave avec fleuron. */
function PagodaRect({ rect, props }: { rect: RoofRect; props: RoofBuildProps }) {
  const { y, color, opacity, withLegs, wallHeightM } = props;
  const nx = Math.max(1, Math.round(rect.w / 5));
  const nz = Math.max(1, Math.round(rect.d / 5));
  const mw = rect.w / nx;
  const md = rect.d / nz;
  const peak = Math.min(3.2, Math.max(1.8, Math.min(mw, md) * 0.5));
  const skin = useFabricMaterial(color, opacity, 0.55, 0.22);
  const alu = usePlainMaterial(ALU, 0.35, 0.75);

  const geos = useMemo(() => {
    const parts: THREE.BufferGeometry[] = [];
    const vals: THREE.BufferGeometry[] = [];
    const tips: THREE.Vector3[] = [];
    for (let i = 0; i < nx; i += 1) {
      for (let j = 0; j < nz; j += 1) {
        const cx = rect.cx - rect.w / 2 + (i + 0.5) * mw;
        const cz = rect.cz - rect.d / 2 + (j + 0.5) * md;
        const hw = mw / 2 + 0.12;
        const hd = md / 2 + 0.12;
        const corners: RoofPoint[] = [
          { x: cx - hw, z: cz - hd },
          { x: cx + hw, z: cz - hd },
          { x: cx + hw, z: cz + hd },
          { x: cx - hw, z: cz + hd },
        ];
        for (let k = 0; k < 4; k += 1) {
          const a = corners[k];
          const b = corners[(k + 1) % 4];
          const edge = Math.hypot(b.x - a.x, b.z - a.z);
          parts.push(
            paramGeometry(
              12,
              14,
              (u, v) => {
                const ex = a.x + (b.x - a.x) * u;
                const ez = a.z + (b.z - a.z) * u;
                // Profil pagode : bord presque plat puis pointe élancée.
                const h = peak * Math.pow(v, 2.3) - 0.05 * Math.sin(Math.PI * u) * Math.sin(Math.PI * v);
                return [ex + (cx - ex) * v, y + h, ez + (cz - ez) * v];
              },
              (u, v) => [u * edge / 1.6, v * edge / 3.2],
            ),
          );
          const outerEdge =
            (k === 0 && j === 0) || (k === 2 && j === nz - 1) || (k === 3 && i === 0) || (k === 1 && i === nx - 1);
          if (outerEdge) vals.push(valanceGeometry(new THREE.Vector3(a.x, y, a.z), new THREE.Vector3(b.x, y, b.z), 0.3, 0.6));
        }
        tips.push(new THREE.Vector3(cx, y + peak, cz));
      }
    }
    return { skin: mergeGeometries(parts), val: vals.length ? mergeGeometries(vals) : null, tips };
  }, [nx, nz, mw, md, rect, y, peak]);

  const legs = useMemo(() => {
    if (!withLegs) return [];
    const pts: Array<[THREE.Vector3, THREE.Vector3]> = [];
    for (let i = 0; i <= nx; i += 1) {
      for (let j = 0; j <= nz; j += 1) {
        if (i > 0 && i < nx && j > 0 && j < nz) continue;
        const x = rect.cx - rect.w / 2 + i * mw;
        const z = rect.cz - rect.d / 2 + j * md;
        pts.push([new THREE.Vector3(x, y - wallHeightM, z), new THREE.Vector3(x, y, z)]);
      }
    }
    return pts;
  }, [withLegs, nx, nz, rect, mw, md, y, wallHeightM]);

  return (
    <group>
      <mesh geometry={geos.skin} material={skin} receiveShadow />
      {geos.val ? <mesh geometry={geos.val} material={skin} /> : null}
      {geos.tips.map((t, i) => (
        <mesh key={i} position={[t.x, t.y + 0.3, t.z]} material={alu} castShadow>
          <coneGeometry args={[0.04, 0.6, 8]} />
        </mesh>
      ))}
      {legs.map(([a, b], i) => (
        <Beam key={i} a={a} b={b} w={0.1} h={0.1} material={alu} />
      ))}
    </group>
  );
}

// ───────────────────────── toitures de bâtiment ─────────────────────────

const GABLE_PITCH = 35;
const GABLE_OVERHANG = 0.45;

/** Toit à deux pans : couverture tuiles, pignons maçonnés, faîtière, bandeaux de rive, gouttières. */
function GableRect({ rect, props, glass }: { rect: RoofRect; props: RoofBuildProps; glass?: boolean }) {
  const { y, color, opacity, withLegs, wallHeightM, wallColor } = props;
  const pitch = glass ? 28 : GABLE_PITCH;
  const oh = glass ? 0.12 : GABLE_OVERHANG;
  const { length: L, span: S, rotationY } = ridgeFrame(rect);
  const rad = (pitch * Math.PI) / 180;
  const rise = ridgeRise(S, pitch);
  const slopeLen = (S / 2 + oh) / Math.cos(rad);
  const tiles = useTexturedMaterial('/floors/gen/roof-tiles.jpg', styleColor(color, '#ffffff'), 0.78, opacity);
  const glassMat = useGlassMaterial(opacity);
  const gableMat = usePlainMaterial(wallColor ?? '#ece7df', 0.9, 0, 1);
  const trim = usePlainMaterial(glass ? STEEL : '#f5f5f4', glass ? 0.3 : 0.6, glass ? 0.7 : 0);
  const ridgeMat = usePlainMaterial(glass ? STEEL : '#9a4a2c', 0.7, glass ? 0.7 : 0);
  const gutter = usePlainMaterial('#9ca3af', 0.35, 0.8);

  const geo = useMemo(() => {
    const thick = glass ? 0.02 : 0.14;
    const sides = ([-1, 1] as const).map((s) => {
      const g = new THREE.BoxGeometry(L + (glass ? 0.1 : 2 * 0.35), thick, slopeLen, 1, 1, 1);
      // UV en mètres pour que les tuiles gardent leur taille (≈ 20 cm).
      const uv = g.getAttribute('uv');
      for (let i = 0; i < uv.count; i += 1) uv.setXY(i, uv.getX(i) * (L / 1.2), uv.getY(i) * (slopeLen / 1.2));
      const m = new THREE.Matrix4().makeRotationX(s * rad);
      m.setPosition(0, rise / 2 - (oh * Math.tan(rad)) / 2 + thick / 2, (s * (S / 2 + oh)) / 2);
      g.applyMatrix4(m);
      return g;
    });
    return placeInRect(mergeGeometries(sides), rect, rotationY, y);
  }, [L, S, slopeLen, rad, rise, oh, rect, rotationY, y, glass]);

  const gableShape = useMemo(() => {
    const sh = new THREE.Shape();
    sh.moveTo(-S / 2, 0);
    sh.lineTo(S / 2, 0);
    sh.lineTo(0, rise);
    sh.closePath();
    return sh;
  }, [S, rise]);

  const placement = useMemo(() => {
    const m = new THREE.Matrix4().makeRotationY(rotationY);
    m.setPosition(rect.cx, y, rect.cz);
    return m;
  }, [rotationY, rect, y]);
  const pos = new THREE.Vector3().setFromMatrixPosition(placement);

  const mullions = useMemo(() => {
    if (!glass) return [];
    const out: Array<[THREE.Vector3, THREE.Vector3, number, number]> = [];
    const P = (x: number, yy: number, z: number) => new THREE.Vector3(x, yy, z).applyMatrix4(placement);
    const n = Math.max(2, Math.round(L / 1.25));
    for (let i = 0; i <= n; i += 1) {
      const x = -L / 2 + (i / n) * L;
      ([-1, 1] as const).forEach((s) => out.push([P(x, 0.02, s * (S / 2)), P(x, rise + 0.02, 0), 0.05, 0.09]));
    }
    const k = Math.max(2, Math.round(slopeLen / 1.4));
    for (let j = 0; j <= k; j += 1) {
      const t = j / k;
      ([-1, 1] as const).forEach((s) => out.push([P(-L / 2, rise * (1 - t) + 0.03, s * (S / 2) * t), P(L / 2, rise * (1 - t) + 0.03, s * (S / 2) * t), 0.04, 0.07]));
    }
    return out;
  }, [glass, L, S, rise, slopeLen, placement]);

  const posts = useMemo(() => {
    if (!withLegs) return [];
    const out: THREE.Vector3[] = [];
    const n = Math.max(1, Math.round(L / 4));
    for (let i = 0; i <= n; i += 1) {
      ([-1, 1] as const).forEach((s) => out.push(new THREE.Vector3(-L / 2 + (i / n) * L, 0, s * (S / 2)).applyMatrix4(placement)));
    }
    return out;
  }, [withLegs, L, S, placement]);

  return (
    <group>
      <mesh geometry={geo} material={glass ? glassMat : tiles} castShadow={!glass} receiveShadow />
      {/* Pignons fermés (maçonnés ou vitrés) */}
      {([-1, 1] as const).map((sx) => (
        <group key={sx} position={pos} rotation={[0, rotationY, 0]}>
          <mesh position={[sx * (L / 2) - (sx > 0 ? 0.2 : 0), 0, 0]} rotation={[0, Math.PI / 2, 0]} material={glass ? glassMat : gableMat} castShadow={!glass} receiveShadow>
            <extrudeGeometry args={[gableShape, { depth: 0.2, bevelEnabled: false }]} />
          </mesh>
        </group>
      ))}
      <group position={pos} rotation={[0, rotationY, 0]}>
        {/* Faîtière */}
        <mesh position={[0, rise + (glass ? 0.05 : 0.14), 0]} rotation={[Math.PI / 4, 0, 0]} material={ridgeMat} castShadow>
          <boxGeometry args={[L + (glass ? 0.1 : 0.7), glass ? 0.1 : 0.2, glass ? 0.1 : 0.2]} />
        </mesh>
        {!glass
          ? ([-1, 1] as const).map((s) => (
              <group key={s}>
                {/* Planche de rive (bandeau) + gouttière demi-ronde */}
                <mesh position={[0, -oh * Math.tan(rad) - 0.04, s * (S / 2 + oh)]} material={trim} castShadow>
                  <boxGeometry args={[L + 0.7, 0.22, 0.04]} />
                </mesh>
                <mesh position={[0, -oh * Math.tan(rad) - 0.1, s * (S / 2 + oh + 0.07)]} rotation={[0, 0, Math.PI / 2]} material={gutter} castShadow>
                  <cylinderGeometry args={[0.07, 0.07, L + 0.7, 10, 1, true, s > 0 ? 0 : Math.PI, Math.PI]} />
                </mesh>
                {/* Rives de pignon */}
                {([-1, 1] as const).map((sx) => (
                  <mesh
                    key={sx}
                    position={[sx * (L / 2 + 0.35), rise / 2 - (oh * Math.tan(rad)) / 2 + 0.06, (s * (S / 2 + oh)) / 2]}
                    rotation={[s * rad, 0, 0]}
                    material={trim}
                    castShadow
                  >
                    <boxGeometry args={[0.04, 0.22, slopeLen]} />
                  </mesh>
                ))}
              </group>
            ))
          : null}
      </group>
      {mullions.map(([a, b, w, h], i) => (
        <Beam key={i} a={a} b={b} w={w} h={h} material={trim} />
      ))}
      {posts.map((p, i) => (
        <mesh key={i} position={[p.x, p.y - wallHeightM / 2, p.z]} material={trim} castShadow>
          <boxGeometry args={[0.18, wallHeightM, 0.18]} />
        </mesh>
      ))}
    </group>
  );
}

/** Toit en pavillon (contour polygonal) : pans triangulaires jusqu’au poinçon, tuiles ou verre. */
function HipRadial({ center, ring, props, pitch = 32, glass = false, material }: { center: RoofPoint; ring: RoofPoint[]; props: RoofBuildProps; pitch?: number; glass?: boolean; material?: 'tiles' | 'slate' }) {
  const { y, color, opacity } = props;
  const R = maxRadius(center, ring);
  const rise = R * Math.tan((pitch * Math.PI) / 180);
  const tiles = useTexturedMaterial(material === 'slate' ? '/floors/gen/roof-slate.jpg' : '/floors/gen/roof-tiles.jpg', styleColor(color, '#ffffff'), 0.75, opacity);
  const glassMat = useGlassMaterial(opacity);
  const steel = usePlainMaterial(STEEL, 0.3, 0.7);
  const geo = useMemo(() => {
    const outer = ring.map((p) => radialOverhang(center, p, glass ? 0.08 : 0.4));
    const drop = glass ? 0.02 : 0.4 * Math.tan((pitch * Math.PI) / 180);
    const parts = outer.map((a, i) => {
      const b = outer[(i + 1) % outer.length];
      const edge = Math.hypot(b.x - a.x, b.z - a.z);
      return paramGeometry(
        4,
        4,
        (u, v) => {
          const ex = a.x + (b.x - a.x) * u;
          const ez = a.z + (b.z - a.z) * u;
          return [ex + (center.x - ex) * v, y - drop + (rise + drop) * v, ez + (center.z - ez) * v];
        },
        (u, v) => [(u - 0.5) * edge * (1 - v) / 1.2 + edge / 2.4, (v * Math.hypot(R, rise)) / 1.2],
      );
    });
    return mergeGeometries(parts);
  }, [ring, center, y, rise, R, glass, pitch]);
  const ribs = useMemo(
    () => ring.map((p) => [new THREE.Vector3(p.x, y + 0.02, p.z), new THREE.Vector3(center.x, y + rise + 0.02, center.z)] as const),
    [ring, center, y, rise],
  );
  return (
    <group>
      <mesh geometry={geo} material={glass ? glassMat : tiles} castShadow={!glass} receiveShadow />
      {ribs.map(([a, b], i) => (
        <Beam key={i} a={a} b={b} w={glass ? 0.06 : 0.16} h={glass ? 0.08 : 0.12} material={glass ? steel : tiles} />
      ))}
      <mesh position={[center.x, y + rise + 0.18, center.z]} material={steel} castShadow>
        <coneGeometry args={[0.08, 0.4, 8]} />
      </mesh>
    </group>
  );
}

/** Combles à la Mansart : brisis quasi vertical en ardoise, terrasson en zinc, lucarnes. */
function MansardRect({ rect, props }: { rect: RoofRect; props: RoofBuildProps }) {
  const { y, color, opacity } = props;
  const { length: L, span: S, rotationY } = ridgeFrame(rect);
  const h1 = Math.min(2.2, Math.max(1.4, S * 0.16));
  const inset = h1 / Math.tan((72 * Math.PI) / 180);
  const upperRise = Math.max(0.5, (S / 2 - inset) * Math.tan((16 * Math.PI) / 180));
  const slate = useTexturedMaterial('/floors/gen/roof-slate.jpg', '#ffffff', 0.6, opacity);
  const zinc = usePlainMaterial(styleColor(color, '#7c858f'), 0.45, 0.6, opacity, THREE.DoubleSide);
  const trim = usePlainMaterial('#f5f5f4', 0.6, 0);
  const glassDark = usePlainMaterial('#1e293b', 0.15, 0.4);

  const geo = useMemo(() => {
    const oh = 0.18;
    const hw0 = L / 2 + oh;
    const hd0 = S / 2 + oh;
    const hw1 = L / 2 - inset;
    const hd1 = S / 2 - inset;
    const ridgeHalf = Math.max(0.2, hw1 - hd1);
    const quad = (a: number[], b: number[], c: number[], d: number[], lenU: number, lenV: number) =>
      paramGeometry(1, 1, (u, v) => {
        const top = [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
        const bot = [d[0] + (c[0] - d[0]) * u, d[1] + (c[1] - d[1]) * u, d[2] + (c[2] - d[2]) * u];
        return [bot[0] + (top[0] - bot[0]) * v, bot[1] + (top[1] - bot[1]) * v, bot[2] + (top[2] - bot[2]) * v] as [number, number, number];
      }, (u, v) => [u * lenU / 1.2, v * lenV / 1.2]);
    const y0 = -0.05;
    const lower = [
      quad([-hw1, h1, hd1], [hw1, h1, hd1], [hw0, y0, hd0], [-hw0, y0, hd0], L, h1),
      quad([hw1, h1, -hd1], [-hw1, h1, -hd1], [-hw0, y0, -hd0], [hw0, y0, -hd0], L, h1),
      quad([hw1, h1, hd1], [hw1, h1, -hd1], [hw0, y0, -hd0], [hw0, y0, hd0], S, h1),
      quad([-hw1, h1, -hd1], [-hw1, h1, hd1], [-hw0, y0, hd0], [-hw0, y0, -hd0], S, h1),
    ];
    const yr = h1 + upperRise;
    const upper = [
      quad([-ridgeHalf, yr, 0], [ridgeHalf, yr, 0], [hw1, h1, hd1], [-hw1, h1, hd1], L, S / 2),
      quad([ridgeHalf, yr, 0], [-ridgeHalf, yr, 0], [-hw1, h1, -hd1], [hw1, h1, -hd1], L, S / 2),
      quad([ridgeHalf, yr, 0], [ridgeHalf, yr, 0], [hw1, h1, -hd1], [hw1, h1, hd1], S, S / 2),
      quad([-ridgeHalf, yr, 0], [-ridgeHalf, yr, 0], [-hw1, h1, hd1], [-hw1, h1, -hd1], S, S / 2),
    ];
    return {
      lower: placeInRect(mergeGeometries(lower), rect, rotationY, y),
      upper: placeInRect(mergeGeometries(upper), rect, rotationY, y),
    };
  }, [L, S, inset, h1, upperRise, rect, rotationY, y]);

  const dormers = useMemo(() => {
    const n = Math.max(1, Math.floor(L / 3.2));
    return Array.from({ length: n }, (_, i) => -L / 2 + ((i + 0.5) / n) * L);
  }, [L]);

  return (
    <group>
      <mesh geometry={geo.lower} material={slate} castShadow receiveShadow />
      <mesh geometry={geo.upper} material={zinc} castShadow receiveShadow />
      <group position={[rect.cx, y, rect.cz]} rotation={[0, rotationY, 0]}>
        {/* Corniche à la base du brisis */}
        {([-1, 1] as const).map((s) => (
          <mesh key={`c${s}`} position={[0, -0.08, s * (S / 2 + 0.12)]} material={trim} castShadow>
            <boxGeometry args={[L + 0.5, 0.16, 0.28]} />
          </mesh>
        ))}
        {/* Lucarnes à fronton */}
        {([-1, 1] as const).flatMap((s) =>
          dormers.map((x) => (
            <group key={`${s}-${x}`} position={[x, h1 * 0.42, s * (S / 2 - inset * 0.3)]} rotation={[0, s > 0 ? 0 : Math.PI, 0]}>
              <mesh position={[0, 0, 0.12]} material={trim} castShadow>
                <boxGeometry args={[1.0, 1.25, 0.5]} />
              </mesh>
              <mesh position={[0, -0.05, 0.38]} material={glassDark}>
                <boxGeometry args={[0.66, 0.9, 0.02]} />
              </mesh>
              <mesh position={[0, -0.05, 0.395]} material={trim}>
                <boxGeometry args={[0.04, 0.9, 0.02]} />
              </mesh>
              <mesh position={[0, 0.78, 0.12]} rotation={[0, 0, Math.PI / 4]} material={slate} castShadow>
                <boxGeometry args={[0.8, 0.8, 0.56]} />
              </mesh>
            </group>
          )),
        )}
      </group>
    </group>
  );
}

// ───────────────────────── structures ouvertes ─────────────────────────

/** Pergola bioclimatique : poteaux, poutres de ceinture et lames orientables alu. */
function PergolaRect({ rect, props }: { rect: RoofRect; props: RoofBuildProps }) {
  const { y, color, withLegs, wallHeightM } = props;
  const { length: L, span: S, rotationY } = ridgeFrame(rect);
  const tint = styleColor(color, '#374151');
  const frameMat = usePlainMaterial(tint, 0.42, 0.55);
  const louverMat = usePlainMaterial(tint, 0.38, 0.6);
  const ref = useRef<THREE.InstancedMesh>(null);
  const pitch = 0.2;
  const count = Math.max(4, Math.floor((L - 0.3) / pitch));
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0.55));
    for (let i = 0; i < count; i += 1) {
      const x = -L / 2 + 0.15 + (i + 0.5) * ((L - 0.3) / count);
      m.compose(new THREE.Vector3(x, 0.14, 0), q, new THREE.Vector3(1, 1, 1));
      mesh.setMatrixAt(i, m);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, [count, L]);
  const posts = useMemo(() => {
    const out: Array<[number, number]> = [];
    const n = Math.max(1, Math.round(L / 4));
    for (let i = 0; i <= n; i += 1) {
      out.push([-L / 2 + (i / n) * L, -S / 2]);
      out.push([-L / 2 + (i / n) * L, S / 2]);
    }
    return out;
  }, [L, S]);
  return (
    <group position={[rect.cx, y, rect.cz]} rotation={[0, rotationY, 0]}>
      {([-1, 1] as const).map((s) => (
        <mesh key={`l${s}`} position={[0, 0.12, s * (S / 2)]} material={frameMat} castShadow>
          <boxGeometry args={[L + 0.2, 0.26, 0.16]} />
        </mesh>
      ))}
      {([-1, 1] as const).map((s) => (
        <mesh key={`w${s}`} position={[s * (L / 2), 0.12, 0]} material={frameMat} castShadow>
          <boxGeometry args={[0.16, 0.26, S + 0.2]} />
        </mesh>
      ))}
      {/* Lames orientables à 30° posées sur les longerons transversaux */}
      <instancedMesh ref={ref} args={[undefined, undefined, count]} material={louverMat} castShadow receiveShadow>
        <boxGeometry args={[0.2, 0.025, S - 0.1]} />
      </instancedMesh>
      {withLegs
        ? posts.map(([x, z], i) => (
            <mesh key={i} position={[x, -wallHeightM / 2 + 0.12, z]} material={frameMat} castShadow>
              <boxGeometry args={[0.16, wallHeightM + 0.24, 0.16]} />
            </mesh>
          ))
        : null}
    </group>
  );
}

/** Voiles d’ombrage tendues : hypars à coins hauts et bas, bords concaves, mâts inclinés. */
function ShadeSailsRect({ rect, props }: { rect: RoofRect; props: RoofBuildProps }) {
  const { y, color, opacity, wallHeightM } = props;
  const nx = Math.max(1, Math.round(rect.w / 6));
  const nz = Math.max(1, Math.round(rect.d / 6));
  const cw = rect.w / nx;
  const cd = rect.d / nz;
  const sail = useFabricMaterial(styleColor(color, '#f5f1e8'), Math.max(0.85, opacity), 0.7);
  const steel = usePlainMaterial('#cbd5e1', 0.3, 0.85);
  const { geo, masts } = useMemo(() => {
    const parts: THREE.BufferGeometry[] = [];
    const heights = new Map<string, number>();
    const hAt = (i: number, j: number) => {
      const key = `${i}:${j}`;
      if (!heights.has(key)) heights.set(key, (i + j) % 2 === 0 ? 1.7 : 0.35);
      return heights.get(key)!;
    };
    for (let i = 0; i < nx; i += 1) {
      for (let j = 0; j < nz; j += 1) {
        const x0 = rect.cx - rect.w / 2 + i * cw;
        const z0 = rect.cz - rect.d / 2 + j * cd;
        const h00 = hAt(i, j);
        const h10 = hAt(i + 1, j);
        const h01 = hAt(i, j + 1);
        const h11 = hAt(i + 1, j + 1);
        const inset = 0.25;
        parts.push(
          paramGeometry(
            16,
            16,
            (u, v) => {
              const cut = 0.1;
              const uu = 0.5 + (u - 0.5) * (1 - cut * Math.sin(Math.PI * v));
              const vv = 0.5 + (v - 0.5) * (1 - cut * Math.sin(Math.PI * u));
              const x = x0 + inset + uu * (cw - 2 * inset);
              const z = z0 + inset + vv * (cd - 2 * inset);
              const h = h00 * (1 - uu) * (1 - vv) + h10 * uu * (1 - vv) + h01 * (1 - uu) * vv + h11 * uu * vv;
              return [x, y + h, z];
            },
            (u, v) => [u * cw / 1.6, v * cd / 1.6],
          ),
        );
      }
    }
    const m: Array<[number, number, number]> = [];
    for (let i = 0; i <= nx; i += 1) {
      for (let j = 0; j <= nz; j += 1) {
        m.push([rect.cx - rect.w / 2 + i * cw, rect.cz - rect.d / 2 + j * cd, hAt(i, j)]);
      }
    }
    return { geo: mergeGeometries(parts), masts: m };
  }, [nx, nz, cw, cd, rect, y]);
  return (
    <group>
      <mesh geometry={geo} material={sail} castShadow receiveShadow />
      {masts.map(([x, z, h], i) => (
        <mesh key={i} position={[x, y + (h + 0.3 - wallHeightM) / 2, z]} material={steel} castShadow>
          <cylinderGeometry args={[0.05, 0.07, h + 0.3 + wallHeightM, 10]} />
        </mesh>
      ))}
    </group>
  );
}

/** Voile conique tendue (contour polygonal) : mât central, bords festonnés entre les ancrages. */
function TensileCone({ center, ring, props }: { center: RoofPoint; ring: RoofPoint[]; props: RoofBuildProps }) {
  const { y, color, opacity, wallHeightM } = props;
  const R = maxRadius(center, ring);
  const rise = Math.max(2.2, R * 0.45);
  const sail = useFabricMaterial(styleColor(color, '#f5f1e8'), Math.max(0.85, opacity), 0.7);
  const steel = usePlainMaterial('#cbd5e1', 0.3, 0.85);
  const geo = useMemo(() => {
    const parts = ring.map((a, i) => {
      const b = ring[(i + 1) % ring.length];
      const edge = Math.hypot(b.x - a.x, b.z - a.z);
      return paramGeometry(
        10,
        14,
        (u, v) => {
          const ex = a.x + (b.x - a.x) * u;
          const ez = a.z + (b.z - a.z) * u;
          const pull = 0.12 * Math.sin(Math.PI * u) * (1 - v);
          const vv = Math.min(0.97, v + pull);
          return [ex + (center.x - ex) * vv, y + 0.3 + rise * Math.pow(vv, 2.4), ez + (center.z - ez) * vv];
        },
        (u, v) => [u * edge / 1.6, v * R / 1.6],
      );
    });
    return mergeGeometries(parts);
  }, [ring, center, y, rise, R]);
  return (
    <group>
      <mesh geometry={geo} material={sail} castShadow receiveShadow />
      <mesh position={[center.x, y + (rise + 0.8 - wallHeightM) / 2, center.z]} material={steel} castShadow>
        <cylinderGeometry args={[0.07, 0.09, rise + 0.8 + wallHeightM, 12]} />
      </mesh>
    </group>
  );
}

// ───────────────────────── toitures plates ─────────────────────────

/** Coupole sur tambour ajouré, nervures et lanternon, posée au centre d’une toiture-terrasse. */
function DomeRoof({ center, radius, props }: { center: RoofPoint; radius: number; props: RoofBuildProps }) {
  const { y, color } = props;
  const patina = usePlainMaterial(styleColor(color, '#7fa89a'), 0.45, 0.35, 1, THREE.DoubleSide);
  const stone = usePlainMaterial('#ece6da', 0.85, 0);
  const glassDark = usePlainMaterial('#1f2937', 0.2, 0.3);
  const drumH = Math.max(0.8, radius * 0.35);
  const windows = 12;
  return (
    <group position={[center.x, y, center.z]}>
      <mesh position={[0, drumH / 2, 0]} material={stone} castShadow receiveShadow>
        <cylinderGeometry args={[radius * 1.02, radius * 1.06, drumH, 48]} />
      </mesh>
      {Array.from({ length: windows }).map((_, i) => {
        const a = (i / windows) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * radius * 1.035, drumH * 0.5, Math.sin(a) * radius * 1.035]} rotation={[0, -a + Math.PI / 2, 0]} material={glassDark}>
            <boxGeometry args={[Math.min(0.6, radius * 0.22), drumH * 0.55, 0.04]} />
          </mesh>
        );
      })}
      <mesh position={[0, drumH + 0.05, 0]} material={stone} castShadow>
        <cylinderGeometry args={[radius * 1.1, radius * 1.1, 0.12, 48]} />
      </mesh>
      <mesh position={[0, drumH + 0.1, 0]} material={patina} castShadow receiveShadow>
        <sphereGeometry args={[radius, 48, 20, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>
      {Array.from({ length: 16 }).map((_, i) => (
        <mesh key={`r${i}`} position={[0, drumH + 0.1, 0]} rotation={[0, (i / 16) * Math.PI * 2, 0]} material={stone}>
          <torusGeometry args={[radius + 0.01, 0.035, 6, 32, Math.PI / 2]} />
        </mesh>
      ))}
      {/* Lanternon */}
      <mesh position={[0, drumH + 0.1 + radius + 0.25, 0]} material={stone} castShadow>
        <cylinderGeometry args={[radius * 0.12, radius * 0.14, 0.5, 16]} />
      </mesh>
      <mesh position={[0, drumH + 0.1 + radius + 0.6, 0]} material={patina} castShadow>
        <sphereGeometry args={[radius * 0.14, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>
      <mesh position={[0, drumH + 0.1 + radius + 0.85, 0]} material={stone} castShadow>
        <coneGeometry args={[0.04, 0.4, 8]} />
      </mesh>
    </group>
  );
}

/** Lanterneau pyramidal vitré (puits de lumière). */
function RoofLantern({ x, z, w, d, y }: { x: number; z: number; w: number; d: number; y: number }) {
  const glass = useGlassMaterial(0.8);
  const frame = usePlainMaterial('#f8fafc', 0.35, 0.3);
  const h = Math.min(w, d) * 0.35;
  const geo = useMemo(() => {
    const hw = w / 2;
    const hd = d / 2;
    const ridge = Math.max(0, hw - hd);
    const g = new THREE.BufferGeometry();
    const v = [
      -hw, 0, -hd, hw, 0, -hd, hw, 0, hd, -hw, 0, hd,
      -ridge, h, 0, ridge, h, 0,
    ];
    g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
    g.setIndex([0, 4, 1, 1, 4, 5, 1, 5, 2, 2, 5, 3, 3, 5, 4, 3, 4, 0]);
    g.computeVertexNormals();
    return g;
  }, [w, d, h]);
  return (
    <group position={[x, y + 0.3, z]}>
      <mesh position={[0, -0.12, 0]} material={frame} castShadow>
        <boxGeometry args={[w + 0.16, 0.24, d + 0.16]} />
      </mesh>
      <mesh geometry={geo} material={glass} />
      {[-1, 1].flatMap((sx) => [-1, 1].map((sz) => (
        <Beam key={`${sx}${sz}`} a={new THREE.Vector3(sx * w / 2, 0, sz * d / 2)} b={new THREE.Vector3(Math.sign(sx) * Math.max(0, w / 2 - d / 2), h, 0)} w={0.05} h={0.05} material={frame} />
      )))}
    </group>
  );
}

// ───────────────────────── point d’entrée ─────────────────────────

export function StyledRoof({ style, props }: { style: RoofStyle; props: RoofBuildProps }) {
  const fp = props.footprint;
  switch (style) {
    case 'tentSwag':
      return fp.kind === 'radial' ? (
        <BigTop center={fp.center} ring={fp.ring} props={props} lining />
      ) : (
        <>{fp.rects.map((r, i) => <MarqueeRect key={i} rect={r} props={props} lining />)}</>
      );
    case 'pagoda':
      return fp.kind === 'radial' ? (
        <BigTop center={fp.center} ring={fp.ring} props={props} lining={false} peak={1.25} />
      ) : (
        <>{fp.rects.map((r, i) => <PagodaRect key={i} rect={r} props={props} />)}</>
      );
    case 'gabled':
      return fp.kind === 'radial' ? (
        <HipRadial center={fp.center} ring={fp.ring} props={props} />
      ) : (
        <>{fp.rects.map((r, i) => <GableRect key={i} rect={r} props={props} />)}</>
      );
    case 'glassCanopy':
      return fp.kind === 'radial' ? (
        <HipRadial center={fp.center} ring={fp.ring} props={props} glass pitch={30} />
      ) : (
        <>{fp.rects.map((r, i) => <GableRect key={i} rect={r} props={props} glass />)}</>
      );
    case 'mansard':
      return fp.kind === 'radial' ? (
        <HipRadial center={fp.center} ring={fp.ring} props={props} pitch={45} material="slate" />
      ) : (
        <>{fp.rects.map((r, i) => <MansardRect key={i} rect={r} props={props} />)}</>
      );
    case 'pergola':
      return <>{rectsOf(fp).map((r, i) => <PergolaRect key={i} rect={r} props={props} />)}</>;
    case 'fabricStretch':
      return fp.kind === 'radial' ? (
        <TensileCone center={fp.center} ring={fp.ring} props={props} />
      ) : (
        <>{fp.rects.map((r, i) => <ShadeSailsRect key={i} rect={r} props={props} />)}</>
      );
    default:
      return null;
  }
}

export { DomeRoof, RoofLantern };

// ───────────────────────── parois de tente ─────────────────────────

export type SidewallHole = { kind: 'door' | 'window'; x0: number; x1: number; y0: number; y1: number };

/**
 * Paroi de tente (repère du mur : x le long du mur, centré ; y du sol vers le haut, centré sur la hauteur).
 * Toile PVC légèrement ondulée, fenêtres « cathédrale » en cristal souple, portes à toile roulée en imposte.
 */
export function TentSidewall({
  length,
  height,
  panels,
  holes,
  color = '#f7f5f0',
  selected = false,
}: {
  length: number;
  height: number;
  panels: Array<{ x0: number; x1: number; y0: number; y1: number }>;
  holes: SidewallHole[];
  color?: string;
  selected?: boolean;
}) {
  const fabric = useFabricMaterial(selected ? '#c7d2fe' : color, 1, 0.7, 0.18);
  const clear = useGlassMaterial(0.9);
  const strap = usePlainMaterial('#f5f5f4', 0.8, 0);
  const geo = useMemo(() => {
    const parts = panels.map((p) =>
      paramGeometry(
        Math.max(2, Math.round((p.x1 - p.x0) / 0.12)),
        1,
        (u, v) => {
          const x = p.x0 + (p.x1 - p.x0) * u;
          const y = p.y0 + (p.y1 - p.y0) * v - height / 2;
          // Ondulation de la toile tendue entre deux poteaux (≈ tous les 2,5 m).
          const wave = 0.035 * Math.sin((x + length / 2) * Math.PI * 2 / 0.9) * Math.sin(Math.PI * ((p.y0 + (p.y1 - p.y0) * v) / height));
          return [x, y, wave];
        },
        (u, v) => [(p.x0 + (p.x1 - p.x0) * u) / 1.6, (p.y0 + (p.y1 - p.y0) * v) / 1.6],
      ),
    );
    return parts.length ? mergeGeometries(parts) : null;
  }, [panels, height, length]);
  return (
    <group>
      {geo ? <mesh geometry={geo} material={fabric} castShadow receiveShadow /> : null}
      {holes.map((h, i) => {
        const w = h.x1 - h.x0;
        const hh = h.y1 - h.y0;
        const cx = (h.x0 + h.x1) / 2;
        const cy = (h.y0 + h.y1) / 2 - height / 2;
        if (h.kind === 'door') {
          // Toile de porte enroulée en haut de l’ouverture, retenue par deux sangles.
          return (
            <group key={i} position={[cx, h.y1 - height / 2 - 0.12, 0.05]}>
              <mesh rotation={[0, 0, Math.PI / 2]} material={fabric} castShadow>
                <cylinderGeometry args={[0.11, 0.11, w * 0.98, 16]} />
              </mesh>
              {[-0.3, 0.3].map((k) => (
                <mesh key={k} position={[k * w, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={strap}>
                  <torusGeometry args={[0.12, 0.012, 6, 16]} />
                </mesh>
              ))}
            </group>
          );
        }
        const archR = w / 2;
        return (
          <group key={i} position={[cx, cy, 0]}>
            <mesh material={clear}>
              <planeGeometry args={[w, hh]} />
            </mesh>
            {/* Fenêtre cathédrale : meneaux en toile et arc en ogive */}
            {[-1, 0, 1].map((k) => (
              <mesh key={k} position={[(k * w) / 2, 0, 0.01]} material={fabric}>
                <boxGeometry args={[k === 0 ? 0.05 : 0.1, hh, 0.012]} />
              </mesh>
            ))}
            <mesh position={[0, hh / 2 - archR * 0.9, 0.012]} material={fabric}>
              <torusGeometry args={[archR * 0.9, 0.035, 6, 24, Math.PI]} />
            </mesh>
            <mesh position={[0, -hh / 2 + hh * 0.35, 0.012]} material={fabric}>
              <boxGeometry args={[w, 0.05, 0.012]} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
