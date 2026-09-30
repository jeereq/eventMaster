'use client';

/**
 * Lustres 3D détaillés : bras en volute (tubes courbes), bobèches et bougies, guirlandes de pampilles
 * en chaînette, abat-jour en rotin tourné, couronne d’eucalyptus… Origine = point d’accroche du corps
 * du lustre (y = 0), le lustre descend vers les y négatifs. Dimensions réelles en mètres.
 */

import React, { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { SurfaceMat } from '@/components/room/SurfaceMaterial';
import type { ChandelierFixtureStyle } from '@/lib/roomLayoutUtils';

type Mat4List = THREE.Matrix4[];

/** Plusieurs copies d’une même petite pièce (perles, feuilles, LED) en un seul appel de rendu. */
function Instances({ matrices, material, children }: { matrices: Mat4List; material: THREE.Material; children: React.ReactNode }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    matrices.forEach((m, i) => mesh.setMatrixAt(i, m));
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [matrices]);
  if (!matrices.length) return null;
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, matrices.length]} material={material} castShadow={false}>
      {children}
    </instancedMesh>
  );
}

const tmpQ = new THREE.Quaternion();
const tmpS = new THREE.Vector3();
function at(p: THREE.Vector3, scale = 1, euler?: THREE.Euler): THREE.Matrix4 {
  tmpQ.setFromEuler(euler ?? new THREE.Euler());
  tmpS.set(scale, scale, scale);
  return new THREE.Matrix4().compose(p, tmpQ, tmpS);
}

/** Perles le long d’une chaînette entre a et b (creux `sag` au milieu). */
function beadChain(a: THREE.Vector3, b: THREE.Vector3, n: number, sag: number): THREE.Vector3[] {
  const out: THREE.Vector3[] = [];
  for (let i = 0; i <= n; i += 1) {
    const t = i / n;
    const p = a.clone().lerp(b, t);
    p.y -= sag * 4 * t * (1 - t);
    out.push(p);
  }
  return out;
}

function useCrystalMaterial(tint = '#f8fbff', glow = '#fff1c9', glowIntensity = 0.18) {
  return useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: tint,
        roughness: 0.02,
        metalness: 0.15,
        clearcoat: 1,
        clearcoatRoughness: 0.02,
        envMapIntensity: 2.6,
        emissive: glow,
        emissiveIntensity: glowIntensity,
        transparent: true,
        opacity: 0.88,
        flatShading: true,
      }),
    [tint, glow, glowIntensity],
  );
}

function useFlameMaterial(color: string, intensity = 2.4) {
  return useMemo(() => new THREE.MeshStandardMaterial({ color: '#fff4d6', emissive: color, emissiveIntensity: intensity, roughness: 0.4 }), [color, intensity]);
}

function Lathe({ profile, segments = 24, children, ...rest }: { profile: Array<[number, number]>; segments?: number; children: React.ReactNode } & Omit<React.ComponentProps<'mesh'>, 'children'>) {
  const geo = useMemo(() => new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(Math.max(0.0005, r), y)), segments), [profile, segments]);
  return (
    <mesh geometry={geo} {...rest}>
      {children}
    </mesh>
  );
}

/** Bras en volute : tube le long d’une courbe dans le plan (r, y), tourné à l’angle `a`. */
function ScrollArm({ pts, a, radius, color, finish = 'brass' }: { pts: Array<[number, number]>; a: number; radius: number; color: string; finish?: 'brass' | 'metal' }) {
  const geo = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(pts.map(([r, y]) => new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r)));
    return new THREE.TubeGeometry(curve, 24, radius, 8, false);
  }, [pts, a, radius]);
  return (
    <mesh geometry={geo} castShadow>
      <SurfaceMat color={color} finish={finish} metalness={0.92} roughness={0.28} />
    </mesh>
  );
}

/** Bobèche + fourreau de bougie + ampoule flamme. */
function CandleCup({ p, color, flame, sleeve = 0.09 }: { p: THREE.Vector3; color: string; flame: THREE.Material; sleeve?: number }) {
  return (
    <group position={p}>
      <mesh castShadow>
        <cylinderGeometry args={[0.045, 0.02, 0.022, 16]} />
        <SurfaceMat color={color} finish="brass" metalness={0.92} roughness={0.25} />
      </mesh>
      <mesh position={[0, sleeve / 2 + 0.011, 0]} castShadow>
        <cylinderGeometry args={[0.013, 0.014, sleeve, 12]} />
        <meshStandardMaterial color="#f8f4ea" roughness={0.45} />
      </mesh>
      <mesh position={[0, sleeve + 0.035, 0]} scale={[1, 1.7, 1]} material={flame}>
        <sphereGeometry args={[0.014, 10, 8]} />
      </mesh>
    </group>
  );
}

// ───────────────────────── modèles ─────────────────────────

/** Lustre Marie-Thérèse : fût en balustre, 8 + 6 bras en volute, guirlandes et pendeloques de cristal. */
export function CrystalChandelier({ scale = 1, lightColor = '#ffd79a', frame = '#c9a227', selected = false }: { scale?: number; lightColor?: string; frame?: string; selected?: boolean }) {
  const crystal = useCrystalMaterial('#f8fbff', lightColor, 0.22);
  const flame = useFlameMaterial(lightColor);
  const metal = selected ? '#c7d2fe' : frame;
  const lower = 8;
  const upper = 6;
  const { beads, drops, tips, upperTips } = useMemo(() => {
    const b: Mat4List = [];
    const d: Mat4List = [];
    const lowTips = Array.from({ length: lower }, (_, i) => {
      const a = (i / lower) * Math.PI * 2;
      return new THREE.Vector3(Math.cos(a) * 0.44, -0.62, Math.sin(a) * 0.44);
    });
    const upTips = Array.from({ length: upper }, (_, i) => {
      const a = (i / upper) * Math.PI * 2 + Math.PI / upper;
      return new THREE.Vector3(Math.cos(a) * 0.27, -0.34, Math.sin(a) * 0.27);
    });
    const crown = Array.from({ length: lower }, (_, i) => {
      const a = (i / lower) * Math.PI * 2;
      return new THREE.Vector3(Math.cos(a) * 0.14, -0.1, Math.sin(a) * 0.14);
    });
    // Guirlandes entre bobèches voisines (étage bas et haut) et cascades depuis la couronne.
    lowTips.forEach((p, i) => {
      const q = lowTips[(i + 1) % lower];
      beadChain(p.clone().add(new THREE.Vector3(0, -0.02, 0)), q.clone().add(new THREE.Vector3(0, -0.02, 0)), 11, 0.13).forEach((v) => b.push(at(v, 1)));
      beadChain(crown[i], p.clone().add(new THREE.Vector3(0, 0.02, 0)), 12, 0.06).forEach((v) => b.push(at(v, 0.85)));
      // Pendeloque sous chaque bobèche.
      [1, 2].forEach((k) => b.push(at(p.clone().add(new THREE.Vector3(0, -0.02 - k * 0.028, 0)), 0.9)));
      d.push(at(p.clone().add(new THREE.Vector3(0, -0.14, 0)), 1, new THREE.Euler(0, (i / lower) * Math.PI, 0)));
      // Pendeloque au creux de chaque guirlande.
      const mid = p.clone().lerp(q, 0.5);
      mid.y -= 0.15;
      d.push(at(mid, 0.8, new THREE.Euler(0, i, 0)));
    });
    upTips.forEach((p, i) => {
      const q = upTips[(i + 1) % upper];
      beadChain(p, q, 8, 0.08).forEach((v) => b.push(at(v, 0.8)));
    });
    return { beads: b, drops: d, tips: lowTips, upperTips: upTips };
  }, []);

  const baluster: Array<[number, number]> = useMemo(
    () => [
      [0.0, 0], [0.03, -0.02], [0.03, -0.08], [0.06, -0.12], [0.03, -0.18], [0.025, -0.3], [0.05, -0.34], [0.025, -0.4],
      [0.035, -0.55], [0.08, -0.62], [0.09, -0.66], [0.07, -0.7], [0.03, -0.74], [0.04, -0.8], [0.0, -0.84],
    ],
    [],
  );

  return (
    <group scale={scale}>
      <Lathe profile={baluster} castShadow>
        <SurfaceMat color={metal} finish="brass" metalness={0.92} roughness={0.25} />
      </Lathe>
      {/* Couronne ajourée : anneau + fleurons de cristal */}
      <mesh position={[0, -0.1, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <torusGeometry args={[0.14, 0.008, 8, 32]} />
        <SurfaceMat color={metal} finish="brass" metalness={0.92} roughness={0.25} />
      </mesh>
      {Array.from({ length: 8 }).map((_, i) => {
        const a = (i / 8) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 0.14, -0.05, Math.sin(a) * 0.14]} material={crystal}>
            <coneGeometry args={[0.014, 0.08, 6]} />
          </mesh>
        );
      })}
      {tips.map((p, i) => (
        <group key={`l${i}`}>
          <ScrollArm
            a={(i / lower) * Math.PI * 2}
            radius={0.011}
            color={metal}
            pts={[[0.06, -0.66], [0.18, -0.76], [0.32, -0.74], [0.4, -0.68], [0.44, -0.63]]}
          />
          <CandleCup p={p} color={metal} flame={flame} />
        </group>
      ))}
      {upperTips.map((p, i) => (
        <group key={`u${i}`}>
          <ScrollArm
            a={(i / upper) * Math.PI * 2 + Math.PI / upper}
            radius={0.009}
            color={metal}
            pts={[[0.04, -0.36], [0.12, -0.44], [0.22, -0.42], [0.27, -0.35]]}
          />
          <CandleCup p={p} color={metal} flame={flame} sleeve={0.07} />
        </group>
      ))}
      <Instances matrices={beads} material={crystal}>
        <octahedronGeometry args={[0.014, 0]} />
      </Instances>
      <Instances matrices={drops} material={crystal}>
        <octahedronGeometry args={[0.03, 0]} />
      </Instances>
      {/* Boule et pampille finale */}
      <mesh position={[0, -0.9, 0]} material={crystal}>
        <icosahedronGeometry args={[0.045, 1]} />
      </mesh>
      <mesh position={[0, -0.99, 0]} scale={[1, 2.2, 1]} material={crystal}>
        <octahedronGeometry args={[0.025, 0]} />
      </mesh>
    </group>
  );
}

/** Candélabre grand siècle en fer patiné doré : 2 étages de bras en S, coupelles et bougies. */
export function CandelabraChandelier({ scale = 1, lightColor = '#ffb85c', selected = false }: { scale?: number; lightColor?: string; selected?: boolean }) {
  const flame = useFlameMaterial(lightColor, 2.8);
  const metal = selected ? '#c7d2fe' : '#8a6d2f';
  const arms = 8;
  const tips = useMemo(
    () =>
      Array.from({ length: arms }, (_, i) => {
        const a = (i / arms) * Math.PI * 2;
        return new THREE.Vector3(Math.cos(a) * 0.5, -0.55, Math.sin(a) * 0.5);
      }),
    [],
  );
  const upper = useMemo(
    () =>
      Array.from({ length: 4 }, (_, i) => {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
        return new THREE.Vector3(Math.cos(a) * 0.26, -0.3, Math.sin(a) * 0.26);
      }),
    [],
  );
  const stem: Array<[number, number]> = useMemo(
    () => [[0, 0], [0.025, -0.02], [0.025, -0.15], [0.07, -0.2], [0.03, -0.26], [0.03, -0.45], [0.11, -0.58], [0.13, -0.64], [0.09, -0.7], [0.03, -0.74], [0.05, -0.82], [0, -0.9]],
    [],
  );
  return (
    <group scale={scale}>
      <Lathe profile={stem} castShadow>
        <SurfaceMat color={metal} finish="brass" metalness={0.85} roughness={0.4} />
      </Lathe>
      {tips.map((p, i) => {
        const a = (i / arms) * Math.PI * 2;
        return (
          <group key={i}>
            <ScrollArm a={a} radius={0.013} color={metal} pts={[[0.1, -0.62], [0.24, -0.72], [0.4, -0.7], [0.47, -0.62], [0.5, -0.57]]} />
            {/* Volute décorative sous le bras */}
            <ScrollArm a={a} radius={0.007} color={metal} pts={[[0.12, -0.66], [0.2, -0.64], [0.24, -0.68], [0.2, -0.72]]} />
            <CandleCup p={p} color={metal} flame={flame} sleeve={0.12} />
          </group>
        );
      })}
      {upper.map((p, i) => (
        <group key={`u${i}`}>
          <ScrollArm a={(i / 4) * Math.PI * 2 + Math.PI / 4} radius={0.01} color={metal} pts={[[0.03, -0.24], [0.14, -0.36], [0.24, -0.35], [0.26, -0.32]]} />
          <CandleCup p={p} color={metal} flame={flame} sleeve={0.1} />
        </group>
      ))}
    </group>
  );
}

/** Suspension à halos : trois anneaux laiton à LED indirecte, chacun pendu à trois câbles. */
function BrassRingsChandelier({ ceilingDrop, lightColor, selected }: { ceilingDrop: number; lightColor: string; selected: boolean }) {
  const led = useMemo(() => new THREE.MeshStandardMaterial({ color: '#fff7e6', emissive: lightColor, emissiveIntensity: 2 }), [lightColor]);
  const rings: Array<[number, number, number]> = [[0.6, -0.5, 0.0], [0.44, -0.66, 0.05], [0.28, -0.8, -0.04]];
  return (
    <group>
      {rings.map(([r, y, tilt], i) => (
        <group key={i} position={[0, y, 0]} rotation={[tilt, i * 0.6, tilt * 0.5]}>
          <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
            <torusGeometry args={[r, 0.02, 12, 64]} />
            <SurfaceMat color={selected ? '#c7d2fe' : '#c9a227'} finish="brass" metalness={0.95} roughness={0.22} />
          </mesh>
          {/* Ruban LED sous l’anneau */}
          <mesh position={[0, -0.018, 0]} rotation={[Math.PI / 2, 0, 0]} material={led}>
            <torusGeometry args={[r, 0.008, 6, 64]} />
          </mesh>
          {[0, 1, 2].map((k) => {
            const a = (k / 3) * Math.PI * 2;
            const len = ceilingDrop - y;
            return (
              <mesh key={k} position={[Math.cos(a) * r, len / 2, Math.sin(a) * r]}>
                <cylinderGeometry args={[0.0015, 0.0015, len, 4]} />
                <meshStandardMaterial color="#52525b" metalness={0.8} roughness={0.3} />
              </mesh>
            );
          })}
        </group>
      ))}
    </group>
  );
}

/** Suspension bohème : cloche en rotin tressé et gerbe d’herbes de pampa. */
function BohoPampasChandelier({ lightColor, selected }: { lightColor: string; selected: boolean }) {
  const plume = useMemo(() => new THREE.MeshStandardMaterial({ color: '#eadcc0', roughness: 1, transparent: true, opacity: 0.92 }), []);
  const bulb = useFlameMaterial(lightColor, 2);
  const shade: Array<[number, number]> = [[0.06, 0], [0.12, -0.05], [0.24, -0.16], [0.34, -0.3], [0.38, -0.38], [0.38, -0.4]];
  const plumes = useMemo(() => {
    const out: Mat4List = [];
    const n = 22;
    for (let i = 0; i < n; i += 1) {
      const a = (i / n) * Math.PI * 2 + (i % 2) * 0.12;
      // Plumeaux qui retombent en gerbe sous le bord de la cloche.
      const tilt = 2.05 + ((i * 7) % 5) * 0.09;
      const len = 0.34 + ((i * 3) % 4) * 0.05;
      const base = new THREE.Vector3(Math.cos(a) * 0.33, -0.36, Math.sin(a) * 0.33);
      const dir = new THREE.Vector3(Math.cos(a) * Math.sin(tilt), Math.cos(tilt), Math.sin(a) * Math.sin(tilt)).normalize();
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      out.push(new THREE.Matrix4().compose(base.clone().addScaledVector(dir, len / 2), q, new THREE.Vector3(0.55, len / 0.11, 0.55)));
    }
    return out;
  }, []);
  return (
    <group>
      <Lathe profile={shade} segments={32} castShadow>
        <SurfaceMat color={selected ? '#c7d2fe' : '#c49358'} finish="rattan" roughness={0.85} repeat={[6, 2]} side={THREE.DoubleSide} />
      </Lathe>
      <mesh position={[0, -0.36, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.38, 0.012, 8, 40]} />
        <SurfaceMat color="#a87942" finish="rattan" />
      </mesh>
      <mesh position={[0, -0.22, 0]} material={bulb}>
        <sphereGeometry args={[0.05, 12, 10]} />
      </mesh>
      {/* Plumeaux de pampa : fuseaux duveteux */}
      <Instances matrices={plumes} material={plume}>
        <sphereGeometry args={[0.055, 8, 12]} />
      </Instances>
    </group>
  );
}

const HALO_R = 0.5;
const HALO_Y = -0.35;

/** Couronne végétale : cerceau laiton, eucalyptus, brins retombants, roses et micro-LED. */
function BotanicalHaloChandelier({ ceilingDrop, lightColor, selected }: { ceilingDrop: number; lightColor: string; selected: boolean }) {
  const leafMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#7f9c8a', roughness: 0.8, side: THREE.DoubleSide }), []);
  const leafDark = useMemo(() => new THREE.MeshStandardMaterial({ color: '#5c7d68', roughness: 0.85, side: THREE.DoubleSide }), []);
  const rose = useMemo(() => new THREE.MeshStandardMaterial({ color: '#f3d3cf', roughness: 0.75 }), []);
  const led = useFlameMaterial(lightColor, 2.2);
  const R = HALO_R;
  const y0 = HALO_Y;
  const { leaves, leaves2, roses, leds } = useMemo(() => {
    const l1: Mat4List = [];
    const l2: Mat4List = [];
    const r: Mat4List = [];
    const d: Mat4List = [];
    let seed = 7;
    const rnd = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    const R = HALO_R;
    const y0 = HALO_Y;
    for (let i = 0; i < 140; i += 1) {
      const a = (i / 140) * Math.PI * 2;
      const rr = R + (rnd() - 0.5) * 0.08;
      const p = new THREE.Vector3(Math.cos(a) * rr, y0 + (rnd() - 0.5) * 0.08, Math.sin(a) * rr);
      const m = at(p, 0.8 + rnd() * 0.5, new THREE.Euler(rnd() * Math.PI, -a + (rnd() - 0.5), rnd() * Math.PI));
      (i % 3 === 0 ? l2 : l1).push(m);
    }
    // Brins retombants d’eucalyptus.
    for (let s = 0; s < 10; s += 1) {
      const a = (s / 10) * Math.PI * 2 + 0.2;
      const len = 0.25 + (s % 3) * 0.12;
      for (let k = 0; k < 7; k += 1) {
        const t = k / 6;
        const p = new THREE.Vector3(Math.cos(a) * (R + 0.02), y0 - t * len, Math.sin(a) * (R + 0.02));
        l1.push(at(p, 0.6 - t * 0.2, new THREE.Euler(0.3 + k, -a, k * 0.7)));
      }
    }
    for (let i = 0; i < 9; i += 1) {
      const a = (i / 9) * Math.PI * 2 + 0.35;
      r.push(at(new THREE.Vector3(Math.cos(a) * R, y0 + 0.03, Math.sin(a) * R), 0.7));
    }
    for (let i = 0; i < 36; i += 1) {
      const a = (i / 36) * Math.PI * 2;
      d.push(at(new THREE.Vector3(Math.cos(a) * (R - 0.04), y0 - 0.03 - (i % 3) * 0.02, Math.sin(a) * (R - 0.04)), 1));
    }
    return { leaves: l1, leaves2: l2, roses: r, leds: d };
  }, []);
  return (
    <group>
      <mesh position={[0, y0, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <torusGeometry args={[R, 0.01, 8, 64]} />
        <SurfaceMat color={selected ? '#c7d2fe' : '#c9a227'} finish="brass" />
      </mesh>
      {[0, 1, 2].map((k) => {
        const a = (k / 3) * Math.PI * 2;
        const len = ceilingDrop - y0;
        return (
          <mesh key={k} position={[Math.cos(a) * R, y0 + len / 2, Math.sin(a) * R]}>
            <cylinderGeometry args={[0.0015, 0.0015, len, 4]} />
            <meshStandardMaterial color="#a1a1aa" metalness={0.7} roughness={0.3} />
          </mesh>
        );
      })}
      <Instances matrices={leaves} material={leafMat}>
        <circleGeometry args={[0.04, 8]} />
      </Instances>
      <Instances matrices={leaves2} material={leafDark}>
        <circleGeometry args={[0.035, 8]} />
      </Instances>
      <Instances matrices={roses} material={rose}>
        <dodecahedronGeometry args={[0.045, 1]} />
      </Instances>
      <Instances matrices={leds} material={led}>
        <sphereGeometry args={[0.008, 6, 4]} />
      </Instances>
    </group>
  );
}

/** Pluie de micro-LED : quarante fils de longueurs variées sous un disque de fixation. */
function FairyCanopyChandelier({ lightColor }: { lightColor: string }) {
  const led = useFlameMaterial(lightColor, 2.6);
  const wire = useMemo(() => new THREE.MeshStandardMaterial({ color: '#b8b8b8', metalness: 0.6, roughness: 0.4 }), []);
  const { wires, dots } = useMemo(() => {
    const w: Mat4List = [];
    const d: Mat4List = [];
    const n = 44;
    for (let i = 0; i < n; i += 1) {
      const a = i * 2.39996;
      const r = 0.08 + Math.sqrt(i / n) * 0.55;
      const len = 0.35 + ((i * 37) % 11) / 11 * 0.8 * (1 - r * 0.6);
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      w.push(new THREE.Matrix4().compose(new THREE.Vector3(x, -len / 2, z), new THREE.Quaternion(), new THREE.Vector3(1, len, 1)));
      const k = Math.max(3, Math.round(len / 0.12));
      for (let j = 1; j <= k; j += 1) d.push(at(new THREE.Vector3(x, -(j / k) * len, z), j === k ? 1.6 : 1));
    }
    return { wires: w, dots: d };
  }, []);
  return (
    <group>
      <mesh position={[0, -0.01, 0]}>
        <cylinderGeometry args={[0.1, 0.1, 0.02, 24]} />
        <meshStandardMaterial color="#e7e5e4" roughness={0.6} />
      </mesh>
      <Instances matrices={wires} material={wire}>
        <cylinderGeometry args={[0.0012, 0.0012, 1, 3]} />
      </Instances>
      <Instances matrices={dots} material={led}>
        <sphereGeometry args={[0.007, 6, 4]} />
      </Instances>
    </group>
  );
}

/** Trio de suspensions tubulaires noires à diffuseur opale. */
function ModernTrioChandelier({ ceilingDrop, lightColor, selected }: { ceilingDrop: number; lightColor: string; selected: boolean }) {
  return (
    <group>
      {([[-0.2, 0.08, -0.25], [0.2, 0.08, -0.25], [0, -0.22, -0.45]] as const).map(([px, pz, y], i) => (
        <group key={i} position={[px, y, pz]}>
          <mesh position={[0, (ceilingDrop - y) / 2 + 0.17, 0]}>
            <cylinderGeometry args={[0.002, 0.002, ceilingDrop - y - 0.17, 4]} />
            <meshStandardMaterial color="#27272a" />
          </mesh>
          <mesh castShadow>
            <cylinderGeometry args={[0.07, 0.07, 0.34, 24, 1, true]} />
            <SurfaceMat color={selected ? '#c7d2fe' : '#18181b'} finish="metal" roughness={0.35} side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[0, 0.17, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.07, 24]} />
            <SurfaceMat color="#18181b" finish="metal" side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[0, -0.168, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.07, 0.006, 8, 24]} />
            <SurfaceMat color="#c9a227" finish="brass" />
          </mesh>
          <mesh position={[0, -0.15, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.064, 24]} />
            <meshStandardMaterial color="#fffbeb" emissive={lightColor} emissiveIntensity={1.6} side={THREE.DoubleSide} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** Lanterne de fer forgé : chapeau pyramidal, cage vitrée à croisillons, bougie. */
function LanternChandelier({ lightColor, selected }: { lightColor: string; selected: boolean }) {
  const iron = selected ? '#c7d2fe' : '#1c1917';
  const flame = useFlameMaterial(lightColor, 2.4);
  return (
    <group position={[0, -0.72, 0]}>
      {Array.from({ length: 8 }).map((_, i) => (
        <mesh key={i} position={[0, 0.4 + i * 0.04, 0]} rotation={[0, (i % 2) * (Math.PI / 2), 0]}>
          <torusGeometry args={[0.022, 0.005, 6, 12]} />
          <SurfaceMat color="#1c1917" finish="metal" roughness={0.5} />
        </mesh>
      ))}
      <mesh position={[0, 0.3, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[0.26, 0.16, 4]} />
        <SurfaceMat color={iron} finish="metal" roughness={0.45} />
      </mesh>
      {([[-1, -1], [1, -1], [1, 1], [-1, 1]] as const).map(([sx, sz], i) => (
        <mesh key={i} position={[sx * 0.15, 0, sz * 0.15]} castShadow>
          <boxGeometry args={[0.02, 0.46, 0.02]} />
          <SurfaceMat color={iron} finish="metal" roughness={0.45} />
        </mesh>
      ))}
      {[0.22, -0.22].map((y) => (
        <mesh key={y} position={[0, y, 0]} castShadow>
          <boxGeometry args={[0.33, 0.028, 0.33]} />
          <SurfaceMat color={iron} finish="metal" roughness={0.45} />
        </mesh>
      ))}
      {/* Croisillons sur chaque face */}
      {[0, 1, 2, 3].map((k) => (
        <group key={k} rotation={[0, (k * Math.PI) / 2, 0]}>
          <mesh position={[0, 0, 0.152]}>
            <boxGeometry args={[0.28, 0.008, 0.008]} />
            <SurfaceMat color={iron} finish="metal" />
          </mesh>
          <mesh position={[0, 0, 0.152]}>
            <boxGeometry args={[0.008, 0.42, 0.008]} />
            <SurfaceMat color={iron} finish="metal" />
          </mesh>
        </group>
      ))}
      <mesh>
        <boxGeometry args={[0.29, 0.42, 0.29]} />
        <SurfaceMat color="#fef3c7" finish="glass" opacity={0.25} />
      </mesh>
      <mesh position={[0, -0.12, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 0.14, 12]} />
        <meshStandardMaterial color="#fffbeb" roughness={0.5} />
      </mesh>
      <mesh position={[0, -0.02, 0]} scale={[1, 1.7, 1]} material={flame}>
        <sphereGeometry args={[0.02, 10, 8]} />
      </mesh>
      <mesh position={[0, -0.27, 0]} rotation={[Math.PI, Math.PI / 4, 0]}>
        <coneGeometry args={[0.1, 0.08, 4]} />
        <SurfaceMat color={iron} finish="metal" roughness={0.45} />
      </mesh>
    </group>
  );
}

/** Hauteur du corps (m) sous le point d’accroche, par style — sert à caler la suspension. */
export const CHANDELIER_BODY_DROP: Record<ChandelierFixtureStyle, number> = {
  crystalCascade: 1.0,
  candleCandelabra: 0.9,
  brassRings: 0.85,
  bohoPampas: 0.8,
  botanicalHalo: 0.75,
  fairyCanopy: 1.1,
  modernMinimal: 0.65,
  lantern: 1.05,
};

/**
 * Lustre choisi, suspendu sous le plafond : câble ou chaîne jusqu’à la rosace, corps au-dessus
 * d’un passage libre d’au moins 2,3 m.
 */
export function ChandelierModel({
  style,
  ceilingM,
  lightColor,
  selected = false,
}: {
  style: ChandelierFixtureStyle;
  ceilingM: number;
  lightColor: string;
  selected?: boolean;
}) {
  const hangY = chandelierHangY(style, ceilingM);
  const drop = Math.max(0, ceilingM - hangY);
  const suspendedByOwnCables = style === 'brassRings' || style === 'botanicalHalo' || style === 'modernMinimal';
  return (
    <group position={[0, hangY, 0]}>
      {/* Rosace de plafond */}
      <mesh position={[0, drop - 0.02, 0]}>
        <cylinderGeometry args={[0.07, 0.09, 0.04, 20]} />
        <SurfaceMat color={style === 'crystalCascade' || style === 'candleCandelabra' ? '#c9a227' : '#1f1f1f'} finish="metal" roughness={0.35} />
      </mesh>
      {!suspendedByOwnCables && drop > 0.02 ? (
        <mesh position={[0, drop / 2, 0]}>
          <cylinderGeometry args={[0.005, 0.005, drop, 6]} />
          <SurfaceMat color="#3f3f46" finish="metal" roughness={0.3} />
        </mesh>
      ) : null}
      {style === 'crystalCascade' ? <CrystalChandelier lightColor={lightColor} selected={selected} /> : null}
      {style === 'candleCandelabra' ? <CandelabraChandelier lightColor={lightColor} selected={selected} /> : null}
      {style === 'brassRings' ? <BrassRingsChandelier ceilingDrop={drop} lightColor={lightColor} selected={selected} /> : null}
      {style === 'bohoPampas' ? <BohoPampasChandelier lightColor={lightColor} selected={selected} /> : null}
      {style === 'botanicalHalo' ? <BotanicalHaloChandelier ceilingDrop={drop} lightColor={lightColor} selected={selected} /> : null}
      {style === 'fairyCanopy' ? <FairyCanopyChandelier lightColor={lightColor} /> : null}
      {style === 'modernMinimal' ? <ModernTrioChandelier ceilingDrop={drop} lightColor={lightColor} selected={selected} /> : null}
      {style === 'lantern' ? <LanternChandelier lightColor={lightColor} selected={selected} /> : null}
    </group>
  );
}

/** Point d’accroche du corps : sous le plafond, en visant 2,3 m de passage libre sous le lustre. */
export function chandelierHangY(style: ChandelierFixtureStyle, ceilingM: number): number {
  const body = CHANDELIER_BODY_DROP[style] ?? 0.9;
  const gap = style === 'fairyCanopy' || style === 'botanicalHalo' ? 0.15 : 0.55;
  return Math.min(ceilingM - 0.05, Math.max(2.3 + body, ceilingM - gap));
}

export function chandelierLightY(style: ChandelierFixtureStyle, ceilingM: number): number {
  // Sous le corps : une source ponctuelle au cœur du lustre brûlerait le fût et les bras.
  return chandelierHangY(style, ceilingM) - (CHANDELIER_BODY_DROP[style] ?? 0.9) - 0.15;
}
