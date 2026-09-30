'use client';

import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { loadTiledTexture } from '@/lib/roomWebGLMaterials';

const GOLD = '#c9a227';
const CREAM = '#f5f0e8';
const IVORY = '#faf7f2';
const LEAF = '#3f6b4a';
const ROSE = '#e8d5d0';

function FlowerBloom({
  color,
  scale = 1,
  selected = false,
}: {
  color: string;
  scale?: number;
  selected?: boolean;
}) {
  const tint = selected ? '#fda4af' : color;
  return (
    <group scale={scale}>
      <mesh castShadow>
        <sphereGeometry args={[0.12, 10, 10]} />
        <meshStandardMaterial color={tint} roughness={0.7} />
      </mesh>
      {([0, 1, 2, 3, 4] as const).map((i) => {
        const a = (i / 5) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 0.1, 0.04, Math.sin(a) * 0.1]} castShadow>
            <sphereGeometry args={[0.055, 8, 8]} />
            <meshStandardMaterial color={tint} roughness={0.75} />
          </mesh>
        );
      })}
      <mesh position={[0, -0.06, 0]} castShadow>
        <sphereGeometry args={[0.08, 8, 8]} />
        <meshStandardMaterial color={LEAF} roughness={0.9} />
      </mesh>
    </group>
  );
}

/** Arche florale en fer à cheval (cérémonie / fond de salle). */
export function FloralArchMesh({
  w,
  d,
  color = '#f4e8e4',
  selected = false,
}: {
  w: number;
  d: number;
  color?: string;
  selected?: boolean;
}) {
  const radius = Math.max(0.9, Math.min(w, d) * 0.48);
  const blooms = 16;
  return (
    <group>
      {Array.from({ length: blooms }).map((_, i) => {
        const t = i / (blooms - 1);
        const a = Math.PI * t;
        const x = Math.cos(a) * radius;
        const y = 0.35 + Math.sin(a) * radius * 1.15;
        const z = Math.sin(a * 2) * 0.04;
        return (
          <group key={i} position={[x, y, z]}>
            <FlowerBloom color={i % 3 === 0 ? ROSE : color} scale={0.95 + (i % 2) * 0.15} selected={selected} />
          </group>
        );
      })}
      {([-1, 1] as const).map((side) => (
        <mesh key={side} position={[side * radius, 0.18, 0]} castShadow>
          <boxGeometry args={[0.28, 0.36, 0.28]} />
          <meshStandardMaterial color={selected ? '#c7d2fe' : IVORY} roughness={0.55} />
        </mesh>
      ))}
    </group>
  );
}

/** Vase trompette or + bouquet sphérique (centre de table). */
export function TallCenterpiece({
  color = '#f4e8e4',
  selected = false,
}: {
  color?: string;
  selected?: boolean;
}) {
  return (
    <group>
      <mesh position={[0, 0.04, 0]} castShadow>
        <cylinderGeometry args={[0.07, 0.09, 0.06, 16]} />
        <meshStandardMaterial color={GOLD} metalness={0.82} roughness={0.22} />
      </mesh>
      <mesh position={[0, 0.42, 0]} castShadow>
        <cylinderGeometry args={[0.018, 0.045, 0.72, 12]} />
        <meshStandardMaterial color={GOLD} metalness={0.85} roughness={0.18} />
      </mesh>
      <mesh position={[0, 0.78, 0]} castShadow>
        <cylinderGeometry args={[0.055, 0.03, 0.1, 14]} />
        <meshStandardMaterial color={GOLD} metalness={0.8} roughness={0.2} />
      </mesh>
      <group position={[0, 1.02, 0]}>
        <FlowerBloom color={color} scale={1.35} selected={selected} />
      </group>
      {([-0.12, 0.12] as const).map((x) => (
        <mesh key={x} position={[x, 0.08, 0.08]} castShadow>
          <sphereGeometry args={[0.05, 8, 8]} />
          <meshStandardMaterial color={color} roughness={0.7} />
        </mesh>
      ))}
    </group>
  );
}

/** Cloison basse courbe végétalisée. */
export function CurvedPartitionMesh({
  w,
  d,
  color = '#c4a4a4',
  selected = false,
}: {
  w: number;
  d: number;
  color?: string;
  selected?: boolean;
}) {
  const radius = Math.max(1.2, w * 0.55);
  const segs = 8;
  const wallH = 0.92;
  return (
    <group>
      {Array.from({ length: segs }).map((_, i) => {
        const t0 = (i / segs) * Math.PI * 0.7 - Math.PI * 0.35;
        const t1 = ((i + 1) / segs) * Math.PI * 0.7 - Math.PI * 0.35;
        const mid = (t0 + t1) / 2;
        const len = Math.abs(t1 - t0) * radius;
        return (
          <group key={i} position={[Math.sin(mid) * radius, wallH / 2, Math.cos(mid) * radius * 0.35]} rotation={[0, mid, 0]}>
            <mesh castShadow receiveShadow>
              <boxGeometry args={[len * 1.05, wallH, Math.max(0.14, d * 0.12)]} />
              <meshStandardMaterial color={selected ? '#c7d2fe' : color} roughness={0.7} />
            </mesh>
            <mesh position={[0, wallH * 0.52, 0]} castShadow>
              <boxGeometry args={[len * 0.9, 0.08, 0.18]} />
              <meshStandardMaterial color={LEAF} roughness={0.88} />
            </mesh>
            <group position={[0, wallH * 0.62, 0]}>
              <FlowerBloom color={IVORY} scale={0.55} selected={selected} />
            </group>
          </group>
        );
      })}
    </group>
  );
}

/** Plafond tente : faîte + pans drapés. */
export function TentSwagRoof({
  widthM,
  heightM,
  wallHeightM,
  color = CREAM,
  opacity = 0.82,
  baseElevationM = 0,
}: {
  widthM: number;
  heightM: number;
  wallHeightM: number;
  color?: string;
  opacity?: number;
  baseElevationM?: number;
}) {
  const ridge = wallHeightM + 1.35;
  const halfW = widthM * 0.48;
  const halfD = heightM * 0.48;
  const y0 = baseElevationM + wallHeightM + 0.02;
  const strips = 7;
  return (
    <group>
      {([-1, 1] as const).map((side) => (
        <mesh
          key={side}
          position={[side * halfW * 0.5, y0 + (ridge - wallHeightM) * 0.5, 0]}
          rotation={[0, 0, side * -0.52]}
        >
          <planeGeometry args={[Math.hypot(halfW, ridge - wallHeightM), heightM * 0.96]} />
          <meshStandardMaterial
            color={color}
            transparent
            opacity={opacity}
            roughness={0.92}
            side={THREE.DoubleSide}
            depthWrite={opacity > 0.8}
          />
        </mesh>
      ))}
      {Array.from({ length: strips }).map((_, i) => {
        const z = -halfD + (i / (strips - 1)) * halfD * 2;
        return (
          <mesh key={i} position={[0, y0 + 0.35, z]} rotation={[0.15, 0, 0]}>
            <boxGeometry args={[widthM * 0.92, 0.04, 0.22]} />
            <meshStandardMaterial color={IVORY} roughness={0.88} transparent opacity={0.7} />
          </mesh>
        );
      })}
      {Array.from({ length: 10 }).map((_, i) => {
        const z = -halfD * 0.85 + (i / 9) * halfD * 1.7;
        return (
          <mesh key={`led-${i}`} position={[0, y0 + (ridge - wallHeightM) * 0.72, z]}>
            <sphereGeometry args={[0.025, 6, 6]} />
            <meshStandardMaterial color="#fde68a" emissive="#fbbf24" emissiveIntensity={0.9} />
          </mesh>
        );
      })}
    </group>
  );
}

const ARC_SWEEP = Math.PI * 0.95;
const ARC_START = -ARC_SWEEP / 2;

/** Points (x, z) le long du plateau en arc, t ∈ [0, 1] d’un bout à l’autre. */
export function arcTablePoint(size: [number, number], t: number): [number, number] {
  const a = ARC_START + t * ARC_SWEEP;
  const r = arcTableRadius(size);
  return [Math.sin(a) * r, Math.cos(a) * r];
}

export function arcTableRadius(size: [number, number]): number {
  return Math.max(1.4, size[0] / 2);
}

/** Plateau en C pour tables de gala organique. */
export function CatalogueArcTable({
  size,
  topY,
  color,
  selected,
}: {
  size: [number, number];
  topY: number;
  color: string;
  selected: boolean;
}) {
  const radius = arcTableRadius(size);
  const thick = Math.min(0.72, Math.max(0.48, size[1] * 0.38));
  const segs = 12;
  const topColor = selected ? '#c7d2fe' : color;
  return (
    <group>
      {Array.from({ length: segs }).map((_, i) => {
        const t0 = ARC_START + (i / segs) * ARC_SWEEP;
        const t1 = ARC_START + ((i + 1) / segs) * ARC_SWEEP;
        const mid = (t0 + t1) / 2;
        const len = Math.abs(t1 - t0) * radius;
        return (
          <group key={i} position={[Math.sin(mid) * radius, topY, Math.cos(mid) * radius]} rotation={[0, mid, 0]}>
            <mesh castShadow receiveShadow>
              <boxGeometry args={[len * 1.08, 0.06, thick]} />
              <meshStandardMaterial color={topColor} roughness={0.55} />
            </mesh>
            <mesh position={[0, -0.14, 0]} castShadow>
              <boxGeometry args={[len * 1.04, 0.22, thick * 0.96]} />
              <meshStandardMaterial color={CREAM} roughness={0.9} transparent opacity={0.45} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

export function arcSeatPlacement(
  capacity: number,
  seatIndex: number,
  tableSize: [number, number],
): { x: number; z: number; rotationY: number } {
  const n = Math.max(1, capacity);
  const radius = arcTableRadius(tableSize) + 0.5;
  const a = ARC_START + (n === 1 ? ARC_SWEEP / 2 : (seatIndex / (n - 1)) * ARC_SWEEP);
  const x = Math.sin(a) * radius;
  const z = Math.cos(a) * radius;
  return { x, z, rotationY: a + Math.PI };
}

/** Motif au sol (roses, papillons) — décalcomanie plate. */
export function FloorDecalMesh({
  w,
  d,
  kind = 'rose',
  color = '#dcaeae',
  map,
  selected = false,
}: {
  w: number;
  d: number;
  kind?: 'rose' | 'butterfly' | 'custom' | 'path';
  color?: string;
  map?: THREE.Texture | null;
  selected?: boolean;
}) {
  const tint = selected ? '#fda4af' : color;
  if (map || kind === 'custom') {
    return (
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial
          color={map ? '#ffffff' : tint}
          map={map ?? undefined}
          roughness={0.85}
          transparent
          opacity={0.88}
          side={THREE.DoubleSide}
        />
      </mesh>
    );
  }
  if (kind === 'path') {
    return (
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.025, 0]}>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial
          color={tint}
          roughness={0.35}
          transparent
          opacity={0.55}
          side={THREE.DoubleSide}
        />
      </mesh>
    );
  }
  if (kind === 'butterfly') {
    return (
      <group rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
        {([-1, 1] as const).map((side) => (
          <mesh key={side} position={[side * w * 0.16, d * 0.02, 0]} rotation={[0, 0, side * 0.35]}>
            <circleGeometry args={[Math.min(w, d) * 0.22, 10]} />
            <meshStandardMaterial color={tint} roughness={0.55} transparent opacity={0.82} side={THREE.DoubleSide} />
          </mesh>
        ))}
        <mesh>
          <planeGeometry args={[Math.min(w, d) * 0.08, Math.min(w, d) * 0.28]} />
          <meshStandardMaterial color="#78716c" roughness={0.7} side={THREE.DoubleSide} />
        </mesh>
      </group>
    );
  }
  return (
    <group rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
      {[0, 1, 2].map((i) => {
        const a = (i / 3) * Math.PI * 2;
        const r = Math.min(w, d) * (0.12 + i * 0.08);
        return (
          <mesh key={i} position={[Math.cos(a) * r * 0.4, Math.sin(a) * r * 0.4, 0]}>
            <circleGeometry args={[Math.min(w, d) * (0.18 - i * 0.03), 12]} />
            <meshStandardMaterial
              color={i === 1 ? ROSE : tint}
              roughness={0.75}
              transparent
              opacity={0.78}
              side={THREE.DoubleSide}
            />
          </mesh>
        );
      })}
    </group>
  );
}

/** Colonne carrée blanche + bouquet (cérémonie). */
export function SquarePedestalMesh({
  color = IVORY,
  flowerColor = ROSE,
  heightM = 1.15,
  gold = false,
  selected = false,
}: {
  color?: string;
  flowerColor?: string;
  heightM?: number;
  gold?: boolean;
  selected?: boolean;
}) {
  const h = Math.max(0.7, heightM);
  const shaft = gold ? GOLD : selected ? '#c7d2fe' : color;
  return (
    <group>
      <mesh position={[0, 0.06, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.42, 0.12, 0.42]} />
        <meshStandardMaterial color={shaft} roughness={0.45} metalness={gold ? 0.7 : 0.05} />
      </mesh>
      <mesh position={[0, h * 0.48, 0]} castShadow>
        <boxGeometry args={[0.28, h * 0.78, 0.28]} />
        <meshStandardMaterial color={shaft} roughness={0.4} metalness={gold ? 0.65 : 0.04} />
      </mesh>
      <mesh position={[0, h * 0.9, 0]} castShadow>
        <boxGeometry args={[0.38, 0.08, 0.38]} />
        <meshStandardMaterial color={shaft} roughness={0.42} metalness={gold ? 0.7 : 0.05} />
      </mesh>
      <group position={[0, h + 0.12, 0]}>
        <FlowerBloom color={flowerColor} scale={1.2} selected={selected} />
      </group>
    </group>
  );
}

function CandleGlow({
  height = 0.22,
  selected = false,
}: {
  height?: number;
  selected?: boolean;
}) {
  return (
    <group>
      <mesh position={[0, height * 0.35, 0]} castShadow>
        <cylinderGeometry args={[0.035, 0.04, height, 10]} />
        <meshStandardMaterial color={selected ? '#fde68a' : '#f8fafc'} roughness={0.7} />
      </mesh>
      <mesh position={[0, height * 0.78, 0]}>
        <sphereGeometry args={[0.018, 8, 8]} />
        <meshStandardMaterial
          color="#fbbf24"
          emissive="#f59e0b"
          emissiveIntensity={2.2}
          roughness={0.2}
        />
      </mesh>
    </group>
  );
}

/** Runner eucalyptus + bougies (tables banquet). */
export function GreeneryRunnerMesh({
  length = 1.4,
  selected = false,
}: {
  length?: number;
  selected?: boolean;
}) {
  const n = Math.max(4, Math.round(length / 0.28));
  return (
    <group>
      {Array.from({ length: n }).map((_, i) => {
        const t = n === 1 ? 0 : i / (n - 1);
        const x = (t - 0.5) * length;
        return (
          <group key={i} position={[x, 0.04, (i % 2 === 0 ? 0.04 : -0.03)]}>
            <mesh rotation={[0.2, t * 1.4, 0.15]} castShadow>
              <sphereGeometry args={[0.07, 8, 8]} />
              <meshStandardMaterial color={selected ? '#86efac' : LEAF} roughness={0.92} />
            </mesh>
            {i % 2 === 0 ? <CandleGlow height={0.16 + (i % 3) * 0.04} selected={selected} /> : null}
          </group>
        );
      })}
    </group>
  );
}

/** Grappe de bougies pour tables rondes. */
export function CandleClusterMesh({ selected = false }: { selected?: boolean }) {
  return (
    <group>
      {([-0.08, 0, 0.09] as const).map((x, i) => (
        <group key={i} position={[x, 0, i === 1 ? 0.02 : -0.04]}>
          <CandleGlow height={0.14 + i * 0.05} selected={selected} />
        </group>
      ))}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.14, 16]} />
        <meshStandardMaterial color={LEAF} roughness={0.9} />
      </mesh>
    </group>
  );
}

/** Guirlandes Edison tendues entre poteaux. */
export function EdisonStringLightMesh({
  w,
  d,
  heightM = 3.4,
  selected = false,
}: {
  w: number;
  d: number;
  heightM?: number;
  selected?: boolean;
}) {
  const poles: Array<[number, number]> = [
    [-w * 0.42, -d * 0.42],
    [w * 0.42, -d * 0.42],
    [-w * 0.42, d * 0.42],
    [w * 0.42, d * 0.42],
  ];
  const spans: Array<[[number, number], [number, number]]> = [
    [poles[0], poles[1]],
    [poles[0], poles[2]],
    [poles[1], poles[3]],
    [poles[2], poles[3]],
    [poles[0], poles[3]],
    [poles[1], poles[2]],
  ];
  const h = Math.max(2.4, heightM);
  return (
    <group>
      {poles.map(([x, z], i) => (
        <group key={`p-${i}`} position={[x, 0, z]}>
          <mesh position={[0, 0.08, 0]} receiveShadow>
            <boxGeometry args={[0.28, 0.16, 0.28]} />
            <meshStandardMaterial color="#a8a29e" roughness={0.85} />
          </mesh>
          <mesh position={[0, h * 0.5, 0]} castShadow>
            <cylinderGeometry args={[0.035, 0.04, h, 8]} />
            <meshStandardMaterial color={selected ? '#c7d2fe' : '#44403c'} metalness={0.45} roughness={0.4} />
          </mesh>
        </group>
      ))}
      {spans.map(([a, b], si) => {
        const bulbs = 7;
        return (
          <group key={`s-${si}`}>
            {Array.from({ length: bulbs }).map((_, i) => {
              const t = (i + 0.5) / bulbs;
              const sag = Math.sin(t * Math.PI) * 0.45;
              return (
                <mesh
                  key={i}
                  position={[
                    a[0] + (b[0] - a[0]) * t,
                    h - 0.12 - sag,
                    a[1] + (b[1] - a[1]) * t,
                  ]}
                >
                  <sphereGeometry args={[0.035, 8, 8]} />
                  <meshStandardMaterial
                    color="#fde68a"
                    emissive="#fbbf24"
                    emissiveIntensity={selected ? 1.8 : 1.15}
                  />
                </mesh>
              );
            })}
          </group>
        );
      })}
      <pointLight position={[0, h * 0.7, 0]} intensity={0.55} color="#fde68a" distance={Math.max(w, d) * 1.4} />
    </group>
  );
}

/** Fontaine à vasques. */
export function FountainMesh({
  w = 3,
  d = 3,
  color = '#94a3b8',
  selected = false,
}: {
  w?: number;
  d?: number;
  color?: string;
  selected?: boolean;
}) {
  // Fontaine à vasques en pierre, calée sur l’emprise ; eau animée (nappe + chute en voile).
  const R = Math.max(0.6, Math.min(w, d) / 2);
  const stone = selected ? '#c7d2fe' : color === '#94a3b8' ? '#e7e2d8' : color;
  const waterRef = useRef<THREE.MeshStandardMaterial>(null);
  const veilRef = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (waterRef.current?.map) waterRef.current.map.offset.set(Math.sin(t * 0.2) * 0.05, t * 0.02);
    if (veilRef.current) veilRef.current.opacity = 0.34 + Math.sin(t * 3) * 0.04;
  });
  const waterMap = useMemo(() => {
    const tex = new THREE.TextureLoader().load('/floors/gen/water.jpg');
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(R, R);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, [R]);
  return (
    <group>
      {/* Bassin : margelle moulurée + eau */}
      <mesh position={[0, 0.22, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[R, R * 1.03, 0.44, 48, 1, true]} />
        <meshStandardMaterial color={stone} roughness={0.7} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0.45, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <torusGeometry args={[R, 0.06, 10, 64]} />
        <meshStandardMaterial color={stone} roughness={0.65} />
      </mesh>
      <mesh position={[0, 0.34, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[R * 0.99, 48]} />
        <meshStandardMaterial ref={waterRef} color="#8fc7d6" map={waterMap} roughness={0.08} metalness={0.2} transparent opacity={0.92} />
      </mesh>
      {/* Fût central + vasque haute */}
      <mesh position={[0, 0.75, 0]} castShadow>
        <cylinderGeometry args={[R * 0.1, R * 0.16, 0.9, 20]} />
        <meshStandardMaterial color={stone} roughness={0.62} />
      </mesh>
      <mesh position={[0, 1.22, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[R * 0.46, R * 0.18, 0.16, 32]} />
        <meshStandardMaterial color={stone} roughness={0.6} />
      </mesh>
      <mesh position={[0, 1.301, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[R * 0.43, 32]} />
        <meshStandardMaterial color="#8fc7d6" map={waterMap} roughness={0.08} metalness={0.2} />
      </mesh>
      {/* Voile d’eau qui retombe de la vasque */}
      <mesh position={[0, 0.83, 0]}>
        <cylinderGeometry args={[R * 0.47, R * 0.56, 0.95, 40, 1, true]} />
        <meshStandardMaterial ref={veilRef} color="#dbeef5" transparent opacity={0.34} roughness={0.1} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      {/* Pinacle + jet */}
      <mesh position={[0, 1.42, 0]} castShadow>
        <cylinderGeometry args={[R * 0.05, R * 0.08, 0.22, 12]} />
        <meshStandardMaterial color={stone} roughness={0.6} />
      </mesh>
      <mesh position={[0, 1.62, 0]}>
        <cylinderGeometry args={[0.012, 0.03, 0.22, 8]} />
        <meshStandardMaterial color="#e0f2fe" transparent opacity={0.6} roughness={0.05} />
      </mesh>
    </group>
  );
}

/** Gloriette : colonnes, garde-corps bas, plancher et toit pavillon en tuiles. */
export function GazeboMesh({
  w,
  d,
  heightM = 3.2,
  selected = false,
}: {
  w: number;
  d: number;
  heightM?: number;
  selected?: boolean;
}) {
  const h = Math.max(2.4, heightM);
  const frame = selected ? '#c7d2fe' : IVORY;
  const side = Math.min(w, d) * 0.9;
  const R = side / 2;
  const postH = h * 0.78;
  const n = 8;
  const posts = Array.from({ length: n }).map((_, i) => {
    const a = (i / n) * Math.PI * 2 + Math.PI / n;
    return [Math.cos(a) * R * 0.92, Math.sin(a) * R * 0.92] as [number, number];
  });
  return (
    <group>
      {/* Plancher octogonal surélevé */}
      <mesh position={[0, 0.08, 0]} castShadow receiveShadow rotation={[0, Math.PI / n, 0]}>
        <cylinderGeometry args={[R, R * 1.02, 0.16, n]} />
        <meshStandardMaterial color="#d6cfc2" roughness={0.75} />
      </mesh>
      {posts.map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position={[0, 0.16 + postH / 2, 0]} castShadow>
            <cylinderGeometry args={[0.06, 0.07, postH, 12]} />
            <meshStandardMaterial color={frame} roughness={0.45} />
          </mesh>
          <mesh position={[0, 0.16 + postH, 0]} castShadow>
            <boxGeometry args={[0.18, 0.08, 0.18]} />
            <meshStandardMaterial color={frame} roughness={0.45} />
          </mesh>
        </group>
      ))}
      {/* Garde-corps bas entre colonnes (ouvert à l’avant) */}
      {posts.map(([x, z], i) => {
        if (i === 1 || i === 2) return null;
        const [nx, nz] = posts[(i + 1) % n];
        const len = Math.hypot(nx - x, nz - z);
        const ang = Math.atan2(nz - z, nx - x);
        return (
          <group key={`rail-${i}`} position={[(x + nx) / 2, 0, (z + nz) / 2]} rotation={[0, -ang, 0]}>
            <mesh position={[0, 0.95, 0]} castShadow>
              <boxGeometry args={[len, 0.05, 0.06]} />
              <meshStandardMaterial color={frame} roughness={0.45} />
            </mesh>
            {Array.from({ length: Math.max(3, Math.round(len / 0.14)) }).map((_, k, arr) => (
              <mesh key={k} position={[(-0.5 + (k + 0.5) / arr.length) * len, 0.56, 0]}>
                <cylinderGeometry args={[0.012, 0.012, 0.78, 6]} />
                <meshStandardMaterial color={frame} roughness={0.45} />
              </mesh>
            ))}
          </group>
        );
      })}
      {/* Ceinture + toit pavillon */}
      <mesh position={[0, 0.2 + postH + 0.06, 0]} rotation={[0, Math.PI / n, 0]} castShadow>
        <cylinderGeometry args={[R * 1.02, R * 1.02, 0.14, n, 1, true]} />
        <meshStandardMaterial color={frame} roughness={0.45} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0.2 + postH + 0.13 + R * 0.28, 0]} rotation={[0, Math.PI / n, 0]} castShadow receiveShadow>
        <coneGeometry args={[R * 1.12, R * 0.56, n]} />
        <meshStandardMaterial color={selected ? '#c7d2fe' : '#5b6b73'} roughness={0.6} metalness={0.15} />
      </mesh>
      <mesh position={[0, 0.2 + postH + 0.13 + R * 0.56 + 0.12, 0]} castShadow>
        <sphereGeometry args={[0.07, 12, 10]} />
        <meshStandardMaterial color="#c9a227" metalness={0.85} roughness={0.25} />
      </mesh>
    </group>
  );
}

/** Régie DJ : meuble façade lumineuse, platines, table de mixage, enceintes sur pied. */
export function DjBoothMesh({
  w,
  d,
  color = '#1c1917',
  selected = false,
}: {
  w: number;
  d: number;
  color?: string;
  selected?: boolean;
}) {
  const body = selected ? '#c7d2fe' : color;
  const deskW = Math.min(w, 2.4);
  const deskD = Math.min(d, 0.8);
  return (
    <group>
      <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[deskW, 1, deskD]} />
        <meshStandardMaterial color={body} roughness={0.55} />
      </mesh>
      {/* Façade lumineuse */}
      <mesh position={[0, 0.52, deskD / 2 + 0.005]}>
        <boxGeometry args={[deskW * 0.9, 0.7, 0.01]} />
        <meshStandardMaterial color="#1e1b4b" emissive="#7c3aed" emissiveIntensity={0.55} roughness={0.3} />
      </mesh>
      <mesh position={[0, 1.015, 0]} receiveShadow>
        <boxGeometry args={[deskW * 1.02, 0.03, deskD * 1.02]} />
        <meshStandardMaterial color="#27272a" roughness={0.4} metalness={0.3} />
      </mesh>
      {/* Platines + mixeur */}
      {([-0.3, 0.3] as const).map((sx) => (
        <group key={sx} position={[sx * deskW, 1.05, 0]}>
          <mesh castShadow>
            <boxGeometry args={[0.45, 0.06, 0.36]} />
            <meshStandardMaterial color="#18181b" roughness={0.35} metalness={0.4} />
          </mesh>
          <mesh position={[-0.03, 0.04, 0]}>
            <cylinderGeometry args={[0.15, 0.15, 0.012, 32]} />
            <meshStandardMaterial color="#0a0a0a" roughness={0.25} metalness={0.3} />
          </mesh>
          <mesh position={[-0.03, 0.048, 0]}>
            <cylinderGeometry args={[0.04, 0.04, 0.004, 16]} />
            <meshStandardMaterial color="#dc2626" roughness={0.5} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 1.07, 0]} castShadow>
        <boxGeometry args={[0.32, 0.08, 0.34]} />
        <meshStandardMaterial color="#27272a" roughness={0.35} metalness={0.4} />
      </mesh>
      {Array.from({ length: 6 }).map((_, i) => (
        <mesh key={i} position={[-0.1 + (i % 3) * 0.1, 1.115, -0.08 + Math.floor(i / 3) * 0.14]}>
          <cylinderGeometry args={[0.012, 0.012, 0.02, 8]} />
          <meshStandardMaterial color="#22d3ee" emissive="#06b6d4" emissiveIntensity={0.8} />
        </mesh>
      ))}
      {/* Enceintes sur pied de part et d’autre */}
      {([-1, 1] as const).map((side) => (
        <group key={side} position={[side * (deskW / 2 + 0.45), 0, -0.05]}>
          <mesh position={[0, 0.7, 0]} castShadow>
            <cylinderGeometry args={[0.018, 0.018, 1.4, 8]} />
            <meshStandardMaterial color="#27272a" metalness={0.7} roughness={0.3} />
          </mesh>
          {[0, 1, 2].map((k) => (
            <mesh key={k} position={[Math.cos((k / 3) * Math.PI * 2) * 0.3, 0.12, Math.sin((k / 3) * Math.PI * 2) * 0.3]} rotation={[0, -(k / 3) * Math.PI * 2, 0.9]}>
              <cylinderGeometry args={[0.012, 0.012, 0.4, 6]} />
              <meshStandardMaterial color="#27272a" metalness={0.7} roughness={0.3} />
            </mesh>
          ))}
          <mesh position={[0, 1.65, 0]} castShadow>
            <boxGeometry args={[0.36, 0.56, 0.32]} />
            <meshStandardMaterial color="#111" roughness={0.6} />
          </mesh>
          <mesh position={[0, 1.58, 0.161]}>
            <circleGeometry args={[0.13, 24]} />
            <meshStandardMaterial color="#27272a" roughness={0.8} />
          </mesh>
          <mesh position={[0, 1.83, 0.161]}>
            <circleGeometry args={[0.05, 16]} />
            <meshStandardMaterial color="#3f3f46" roughness={0.6} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** Écran de projection / Mur LED événementiel professionnel avec structure truss scénique. */
export function ScreenMesh({
  w,
  heightM = 2.4,
  selected = false,
}: {
  w: number;
  heightM?: number;
  selected?: boolean;
}) {
  const h = Math.max(1.4, heightM);
  const trussR = 0.024;
  const trussColor = selected ? '#c7d2fe' : '#94a3b8';
  const speakerH = Math.min(0.65, h * 0.45);
  const speakerW = 0.22;

  return (
    <group>
      {/* Structure pont scénique alu (truss) : piliers latéraux et traverses */}
      {([-1, 1] as const).map((side) => (
        <group key={`truss-side-${side}`} position={[side * (w * 0.52 + 0.08), 0, 0]}>
          {/* Embase lourde en acier au sol */}
          <mesh position={[0, 0.015, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.42, 0.03, 0.42]} />
            <meshStandardMaterial color="#1e293b" metalness={0.85} roughness={0.25} />
          </mesh>
          {/* 2 tubes verticaux du mât truss */}
          {[-0.08, 0.08].map((tz, tzi) => (
            <mesh key={tzi} position={[0, h * 0.55, tz]} castShadow>
              <cylinderGeometry args={[trussR, trussR, h * 1.1, 12]} />
              <meshStandardMaterial color={trussColor} metalness={0.88} roughness={0.22} />
            </mesh>
          ))}
          {/* Croisillons de renfort triangulés du truss */}
          {Array.from({ length: 5 }).map((_, ci) => (
            <mesh
              key={ci}
              position={[0, (h * 1.1 * (ci + 0.5)) / 5, 0]}
              rotation={[ci % 2 === 0 ? 0.65 : -0.65, 0, 0]}
              castShadow
            >
              <cylinderGeometry args={[0.012, 0.012, 0.22, 8]} />
              <meshStandardMaterial color={trussColor} metalness={0.85} roughness={0.25} />
            </mesh>
          ))}
          {/* Enceinte de façade suspendue au pont scénique */}
          <group position={[side * -0.06, h * 0.72, 0.12]}>
            <mesh castShadow>
              <boxGeometry args={[speakerW, speakerH, 0.24]} />
              <meshStandardMaterial color="#09090b" roughness={0.65} metalness={0.15} />
            </mesh>
            {/* Grille de haut-parleur */}
            <mesh position={[0, 0, 0.125]}>
              <boxGeometry args={[speakerW * 0.9, speakerH * 0.9, 0.01]} />
              <meshStandardMaterial color="#18181b" roughness={0.85} metalness={0.4} />
            </mesh>
          </group>
        </group>
      ))}

      {/* Traverse supérieure du pont scénique */}
      <mesh position={[0, h * 1.06, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[trussR * 1.1, trussR * 1.1, w * 1.12, 12]} />
        <meshStandardMaterial color={trussColor} metalness={0.88} roughness={0.22} />
      </mesh>

      {/* Châssis / coque arrière de l'écran LED (armoire technique modulaire) */}
      <mesh position={[0, h * 0.55, -0.02]} castShadow receiveShadow>
        <boxGeometry args={[w, h, 0.07]} />
        <meshStandardMaterial color={selected ? '#334155' : '#0f172a'} roughness={0.7} metalness={0.3} />
      </mesh>

      {/* Dalle écran LED active haute résolution avec rétroéclairage scénique */}
      <mesh position={[0, h * 0.55, 0.025]}>
        <boxGeometry args={[w * 0.96, h * 0.94, 0.02]} />
        <meshStandardMaterial
          color="#0f172a"
          emissive="#1e3a8a"
          emissiveIntensity={0.55}
          roughness={0.18}
          metalness={0.25}
        />
      </mesh>

      {/* Cadre biseauté ultra-fin autour de l'écran */}
      <mesh position={[0, h * 0.55, 0.02]}>
        <boxGeometry args={[w * 0.98, h * 0.96, 0.015]} />
        <meshStandardMaterial color="#020617" roughness={0.3} metalness={0.6} />
      </mesh>

      {/* Ligne LED d'ambiance sous l'écran */}
      <mesh position={[0, h * 0.08, 0.04]}>
        <boxGeometry args={[w * 0.92, 0.015, 0.015]} />
        <meshStandardMaterial
          color="#38bdf8"
          emissive="#0284c7"
          emissiveIntensity={0.85}
          roughness={0.1}
        />
      </mesh>

      {/* Halo lumineux doux projeté vers la scène / public */}
      <pointLight position={[0, h * 0.55, 0.45]} intensity={0.45} color="#60a5fa" distance={7} />
    </group>
  );
}

/** Télévision murale / écran accroché au mur avec support articulé VESA. */
export function WallTvMesh({
  w = 1.4,
  ratio = '16:9',
  tiltDeg = 5,
  elevationM = 1.6,
  selected = false,
  powered = true,
  frameColor = '#0f172a',
}: {
  w?: number;
  ratio?: '16:9' | '21:9' | '9:16' | '32:9';
  tiltDeg?: number;
  elevationM?: number;
  selected?: boolean;
  powered?: boolean;
  frameColor?: string;
}) {
  const aspect = ratio === '9:16' ? 9 / 16 : ratio === '21:9' ? 21 / 9 : ratio === '32:9' ? 32 / 9 : 16 / 9;
  const h = w / aspect;
  const tiltRad = (tiltDeg * Math.PI) / 180;
  const emissiveColor = powered ? '#1e3a8a' : '#020617';
  const emissiveInt = powered ? 0.65 : 0;

  return (
    <group position={[0, elevationM, 0]}>
      {/* Support mural VESA arrière en acier noir */}
      <mesh position={[0, 0, -0.06]} castShadow>
        <boxGeometry args={[0.26, 0.22, 0.03]} />
        <meshStandardMaterial color="#1e293b" metalness={0.85} roughness={0.3} />
      </mesh>
      {/* Bras articulé de fixation murale */}
      <mesh position={[0, 0, -0.03]} castShadow>
        <boxGeometry args={[0.08, 0.08, 0.05]} />
        <meshStandardMaterial color="#334155" metalness={0.9} roughness={0.2} />
      </mesh>

      {/* Ensemble téléviseur orienté et incliné */}
      <group rotation={[tiltRad, 0, 0]}>
        {/* Châssis arrière ultra-fin */}
        <mesh position={[0, 0, -0.012]} castShadow receiveShadow>
          <boxGeometry args={[w, h, 0.024]} />
          <meshStandardMaterial color={selected ? '#3b82f6' : frameColor} roughness={0.4} metalness={0.7} />
        </mesh>
        {/* Dalle écran OLED antireflet active */}
        <mesh position={[0, 0, 0.002]}>
          <planeGeometry args={[w * 0.985, h * 0.98]} />
          <meshStandardMaterial
            color="#090d16"
            emissive={emissiveColor}
            emissiveIntensity={emissiveInt}
            roughness={0.12}
            metalness={0.3}
          />
        </mesh>
        {/* Cadre biseauté ultra-fin */}
        <mesh position={[0, 0, 0.001]}>
          <boxGeometry args={[w, h, 0.005]} />
          <meshStandardMaterial color={frameColor} roughness={0.3} metalness={0.8} />
        </mesh>
        {/* Voyant LED de veille / sous tension discret */}
        <mesh position={[w * 0.45, -h * 0.47, 0.004]}>
          <sphereGeometry args={[0.006, 8, 8]} />
          <meshStandardMaterial
            color={powered ? '#38bdf8' : '#ef4444'}
            emissive={powered ? '#0ea5e9' : '#dc2626'}
            emissiveIntensity={1}
          />
        </mesh>
        {/* Rétroéclairage d'ambiance mural arrière (Ambilight) */}
        {powered && (
          <pointLight position={[0, 0, -0.08]} intensity={0.5} color="#60a5fa" distance={2.5} />
        )}
        {/* Lueur frontale projetée */}
        {powered && (
          <pointLight position={[0, 0, 0.25]} intensity={0.4} color="#93c5fd" distance={3.5} />
        )}
      </group>
    </group>
  );
}

/** Écran / Moniteur sur table ou régie de conférence. */
export function TableMonitorMesh({
  w = 0.65,
  ratio = '16:9',
  surfaceElevationM = 0,
  selected = false,
  powered = true,
}: {
  w?: number;
  ratio?: '16:9' | '21:9' | '9:16' | '32:9';
  surfaceElevationM?: number;
  selected?: boolean;
  powered?: boolean;
}) {
  const aspect = ratio === '9:16' ? 9 / 16 : ratio === '21:9' ? 21 / 9 : ratio === '32:9' ? 32 / 9 : 16 / 9;
  const h = w / aspect;
  const standH = 0.16;

  return (
    <group position={[0, surfaceElevationM, 0]}>
      {/* Base du pied de moniteur posé sur la table (forme épurée alu lourd) */}
      <mesh position={[0, 0.006, 0.02]} castShadow receiveShadow>
        <cylinderGeometry args={[0.11, 0.12, 0.012, 24]} />
        <meshStandardMaterial color={selected ? '#60a5fa' : '#334155'} metalness={0.85} roughness={0.25} />
      </mesh>
      {/* Colonne / mât réglable en hauteur */}
      <mesh position={[0, standH * 0.55, -0.01]} castShadow>
        <cylinderGeometry args={[0.018, 0.02, standH, 16]} />
        <meshStandardMaterial color="#1e293b" metalness={0.9} roughness={0.2} />
      </mesh>
      {/* Articulation rotule et attache écran */}
      <mesh position={[0, standH + 0.02, 0.01]} castShadow>
        <boxGeometry args={[0.05, 0.05, 0.04]} />
        <meshStandardMaterial color="#475569" metalness={0.85} roughness={0.3} />
      </mesh>

      {/* Dalle et cadre du moniteur légèrement inclinés vers l'utilisateur (~8°) */}
      <group position={[0, standH + h * 0.5, 0.03]} rotation={[-0.12, 0, 0]}>
        {/* Dos du moniteur biseauté */}
        <mesh position={[0, 0, -0.012]} castShadow>
          <boxGeometry args={[w, h, 0.022]} />
          <meshStandardMaterial color={selected ? '#3b82f6' : '#1e293b'} roughness={0.4} metalness={0.5} />
        </mesh>
        {/* Dalle active avec rétroéclairage fin */}
        <mesh position={[0, 0, 0.001]}>
          <planeGeometry args={[w * 0.98, h * 0.97]} />
          <meshStandardMaterial
            color="#0b1329"
            emissive={powered ? '#1d4ed8' : '#030712'}
            emissiveIntensity={powered ? 0.7 : 0}
            roughness={0.14}
            metalness={0.25}
          />
        </mesh>
        {/* Voyant LED sous le logo */}
        <mesh position={[0, -h * 0.48, 0.003]}>
          <boxGeometry args={[0.012, 0.004, 0.002]} />
          <meshStandardMaterial color={powered ? '#38bdf8' : '#64748b'} emissive={powered ? '#0284c7' : '#000000'} emissiveIntensity={1} />
        </mesh>
      </group>
    </group>
  );
}

/** Ordinateur portable (PC portable / laptop) posé sur table avec écran ouvert incliné. */
export function LaptopMesh({
  w = 0.36,
  surfaceElevationM = 0,
  selected = false,
  powered = true,
}: {
  w?: number;
  surfaceElevationM?: number;
  selected?: boolean;
  powered?: boolean;
}) {
  const depth = w * 0.72;
  const chassisH = 0.012;
  const screenAngle = 1.95; // ~112° d'ouverture réaliste

  return (
    <group position={[0, surfaceElevationM, 0]}>
      {/* Châssis inférieur (base clavier en aluminium unibody) */}
      <mesh position={[0, chassisH / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, chassisH, depth]} />
        <meshStandardMaterial color={selected ? '#93c5fd' : '#cbd5e1'} metalness={0.88} roughness={0.22} />
      </mesh>
      {/* Emplacement clavier noir mat encastré */}
      <mesh position={[0, chassisH + 0.0005, -depth * 0.12]}>
        <planeGeometry args={[w * 0.88, depth * 0.48]} />
        <meshStandardMaterial color="#18181b" roughness={0.65} metalness={0.2} />
      </mesh>
      {/* Pavé tactile (trackpad) en verre poli */}
      <mesh position={[0, chassisH + 0.0005, depth * 0.26]}>
        <planeGeometry args={[w * 0.38, depth * 0.28]} />
        <meshStandardMaterial color="#94a3b8" roughness={0.18} metalness={0.6} />
      </mesh>
      {/* Charnière cylindrique fine */}
      <mesh position={[0, chassisH, -depth / 2]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.007, 0.007, w * 0.65, 12]} />
        <meshStandardMaterial color="#475569" metalness={0.9} roughness={0.2} />
      </mesh>

      {/* Capot supérieur et écran ouvert incliné */}
      <group position={[0, chassisH, -depth / 2]} rotation={[-screenAngle, 0, 0]}>
        {/* Dos d'écran en aluminium brossé */}
        <mesh position={[0, depth * 0.48, -0.004]} castShadow>
          <boxGeometry args={[w, depth * 0.96, 0.008]} />
          <meshStandardMaterial color={selected ? '#60a5fa' : '#cbd5e1'} metalness={0.88} roughness={0.22} />
        </mesh>
        {/* Dalle écran LCD / Retina active */}
        <mesh position={[0, depth * 0.48, 0.001]}>
          <planeGeometry args={[w * 0.94, depth * 0.9]} />
          <meshStandardMaterial
            color="#0c1938"
            emissive={powered ? '#2563eb' : '#020617'}
            emissiveIntensity={powered ? 0.8 : 0}
            roughness={0.15}
            metalness={0.2}
          />
        </mesh>
        {/* Webcam discrète en haut de l'écran */}
        <mesh position={[0, depth * 0.92, 0.002]}>
          <circleGeometry args={[0.004, 12]} />
          <meshStandardMaterial color="#020617" roughness={0.1} metalness={0.9} />
        </mesh>
        {/* Légère illumination projetée sur le clavier */}
        {powered && (
          <pointLight position={[0, depth * 0.4, 0.12]} intensity={0.25} color="#93c5fd" distance={0.9} />
        )}
      </group>
    </group>
  );
}

/** Ordinateur fixe (Desktop PC / Tout-en-un) avec grand écran, clavier fin et souris. */
export function DesktopPcMesh({
  w = 0.58,
  surfaceElevationM = 0,
  selected = false,
  powered = true,
}: {
  w?: number;
  surfaceElevationM?: number;
  selected?: boolean;
  powered?: boolean;
}) {
  const h = w * (9 / 16);
  const standH = 0.12;

  return (
    <group position={[0, surfaceElevationM, 0]}>
      {/* Moniteur sur pied aluminium contemporain */}
      <group position={[0, 0, -0.06]}>
        {/* Embase métallique rectangulaire au sol de la table */}
        <mesh position={[0, 0.004, 0.04]} castShadow receiveShadow>
          <boxGeometry args={[0.2, 0.008, 0.16]} />
          <meshStandardMaterial color={selected ? '#60a5fa' : '#94a3b8'} metalness={0.88} roughness={0.25} />
        </mesh>
        {/* Pied incliné ergonomique */}
        <mesh position={[0, standH * 0.55, 0.01]} rotation={[-0.22, 0, 0]} castShadow>
          <boxGeometry args={[0.08, standH * 1.05, 0.012]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.2} />
        </mesh>
        {/* Écran d'ordinateur (All-in-one / Moniteur) */}
        <group position={[0, standH + h * 0.5, 0]}>
          <mesh position={[0, 0, -0.01]} castShadow>
            <boxGeometry args={[w, h, 0.02]} />
            <meshStandardMaterial color={selected ? '#3b82f6' : '#cbd5e1'} metalness={0.8} roughness={0.3} />
          </mesh>
          <mesh position={[0, 0, 0.001]}>
            <planeGeometry args={[w * 0.98, h * 0.96]} />
            <meshStandardMaterial
              color="#09142e"
              emissive={powered ? '#1e40af' : '#030712'}
              emissiveIntensity={powered ? 0.75 : 0}
              roughness={0.14}
              metalness={0.2}
            />
          </mesh>
        </group>
      </group>

      {/* Clavier fin posé à plat devant l'écran */}
      <group position={[0, 0.005, 0.14]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[0.34, 0.01, 0.12]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.8} roughness={0.3} />
        </mesh>
        {/* Touches du clavier */}
        <mesh position={[0, 0.006, 0]}>
          <planeGeometry args={[0.32, 0.1]} />
          <meshStandardMaterial color="#18181b" roughness={0.7} metalness={0.2} />
        </mesh>
      </group>

      {/* Souris optique ergonomique à droite */}
      <group position={[0.22, 0.008, 0.15]}>
        <mesh castShadow>
          <boxGeometry args={[0.065, 0.018, 0.11]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.25} metalness={0.4} />
        </mesh>
      </group>
    </group>
  );
}

/** Toit à pignon au-dessus d’une scène. */
/**
 * Toit de scène à deux pans (charpente bois) : faîtage dans l’axe public → fond de scène,
 * poteaux aux angles, sablières, entraits, pignon arrière fermé et couverture en tuiles.
 */
export function GabledStageRoof({
  w,
  d,
  heightM = 4.6,
  selected = false,
}: {
  w: number;
  d: number;
  heightM?: number;
  selected?: boolean;
}) {
  const h = Math.max(3.2, heightM);
  const pitch = (24 * Math.PI) / 180;
  const overhang = 0.35;
  const halfSpan = w / 2 + overhang;
  const slopeLen = halfSpan / Math.cos(pitch);
  const rise = halfSpan * Math.tan(pitch);
  const roofD = d + overhang * 2;
  const timber = selected ? '#c7d2fe' : '#7c5230';
  const tiles = useMemo(() => loadTiledTexture('/floors/gen/roof-tiles.jpg', slopeLen / 1.2, roofD / 1.2), [slopeLen, roofD]);
  const px = w / 2 - 0.12;
  const pz = d / 2 - 0.12;
  const gable = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(-w / 2, 0);
    shape.lineTo(w / 2, 0);
    shape.lineTo(0, (w / 2) * Math.tan(pitch));
    shape.closePath();
    const g = new THREE.ExtrudeGeometry(shape, { depth: 0.05, bevelEnabled: false });
    return g;
  }, [w, pitch]);
  return (
    <group>
      {/* Poteaux d’angle et intermédiaires sur les grandes portées */}
      {[-1, 1].flatMap((sx) =>
        [-1, 1].map((sz) => (
          <mesh key={`post-${sx}-${sz}`} position={[sx * px, h / 2, sz * pz]} castShadow receiveShadow>
            <boxGeometry args={[0.2, h, 0.2]} />
            <meshStandardMaterial color={timber} roughness={0.7} />
          </mesh>
        )),
      )}
      {/* Sablières (le long des rives) et entraits (avant / arrière) */}
      {[-1, 1].map((sx) => (
        <mesh key={`plate-${sx}`} position={[sx * px, h - 0.1, 0]} castShadow>
          <boxGeometry args={[0.18, 0.2, d]} />
          <meshStandardMaterial color={timber} roughness={0.7} />
        </mesh>
      ))}
      {[-1, 1].map((sz) => (
        <mesh key={`tie-${sz}`} position={[0, h - 0.12, sz * pz]} castShadow>
          <boxGeometry args={[w, 0.22, 0.16]} />
          <meshStandardMaterial color={timber} roughness={0.7} />
        </mesh>
      ))}
      {/* Poinçon et arbalétriers du pignon avant (ouvert côté public) */}
      <mesh position={[0, h + rise / 2 - 0.1, pz]} castShadow>
        <boxGeometry args={[0.14, rise, 0.14]} />
        <meshStandardMaterial color={timber} roughness={0.7} />
      </mesh>
      {[-1, 1].map((sx) => (
        <mesh key={`rafter-${sx}`} position={[(sx * w) / 4, h + rise / 2 - 0.12, pz]} rotation={[0, 0, -sx * pitch]} castShadow>
          <boxGeometry args={[w / 2 / Math.cos(pitch), 0.16, 0.14]} />
          <meshStandardMaterial color={timber} roughness={0.7} />
        </mesh>
      ))}
      {/* Pignon arrière fermé (bardage bois) */}
      <mesh geometry={gable} position={[0, h, -pz - 0.05]} castShadow receiveShadow>
        <meshStandardMaterial color={selected ? '#c7d2fe' : '#9a6b43'} roughness={0.8} side={THREE.DoubleSide} />
      </mesh>
      {/* Faîtage */}
      <mesh position={[0, h + rise + 0.02, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.07, 0.07, roofD, 10]} />
        <meshStandardMaterial color="#8a3b24" roughness={0.75} />
      </mesh>
      {/* Deux pans couverts de tuiles */}
      {[-1, 1].map((sx) => (
        <mesh
          key={`pan-${sx}`}
          position={[(sx * halfSpan) / 2, h + rise / 2 + 0.05, 0]}
          rotation={[0, 0, -sx * pitch]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[slopeLen, 0.07, roofD]} />
          <meshStandardMaterial color={selected ? '#c7d2fe' : '#ffffff'} map={tiles} roughness={0.8} />
        </mesh>
      ))}
    </group>
  );
}
