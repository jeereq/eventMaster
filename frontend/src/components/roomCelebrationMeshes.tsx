'use client';

import React from 'react';
import * as THREE from 'three';

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
        <meshStandardMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={1.4} />
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
  color = '#94a3b8',
  selected = false,
}: {
  color?: string;
  selected?: boolean;
}) {
  const stone = selected ? '#c7d2fe' : color;
  return (
    <group>
      <mesh position={[0, 0.12, 0]} receiveShadow>
        <cylinderGeometry args={[0.95, 1.05, 0.24, 24]} />
        <meshStandardMaterial color={stone} roughness={0.55} />
      </mesh>
      <mesh position={[0, 0.16, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.78, 24]} />
        <meshStandardMaterial color="#7dd3fc" roughness={0.12} metalness={0.35} />
      </mesh>
      <mesh position={[0, 0.55, 0]} castShadow>
        <cylinderGeometry args={[0.42, 0.5, 0.18, 20]} />
        <meshStandardMaterial color={stone} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.92, 0]} castShadow>
        <cylinderGeometry args={[0.16, 0.2, 0.14, 16]} />
        <meshStandardMaterial color={stone} roughness={0.48} />
      </mesh>
      <mesh position={[0, 1.08, 0]}>
        <sphereGeometry args={[0.06, 10, 10]} />
        <meshStandardMaterial color="#e0f2fe" roughness={0.15} metalness={0.2} />
      </mesh>
    </group>
  );
}

/** Gloriette / pergola à treillis. */
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
  const posts: Array<[number, number]> = [
    [-w * 0.4, -d * 0.4],
    [w * 0.4, -d * 0.4],
    [-w * 0.4, d * 0.4],
    [w * 0.4, d * 0.4],
  ];
  return (
    <group>
      {posts.map(([x, z], i) => (
        <mesh key={i} position={[x, h * 0.45, z]} castShadow>
          <boxGeometry args={[0.12, h * 0.9, 0.12]} />
          <meshStandardMaterial color={frame} roughness={0.45} />
        </mesh>
      ))}
      <mesh position={[0, h * 0.92, 0]} castShadow>
        <boxGeometry args={[w * 0.86, 0.08, d * 0.86]} />
        <meshStandardMaterial color={frame} roughness={0.4} />
      </mesh>
      {[-0.25, 0, 0.25].map((off) => (
        <mesh key={`x-${off}`} position={[0, h * 0.92, off * d]} rotation={[0, 0, 0]}>
          <boxGeometry args={[w * 0.82, 0.03, 0.03]} />
          <meshStandardMaterial color="#e7e5e4" roughness={0.5} />
        </mesh>
      ))}
      {[-0.25, 0, 0.25].map((off) => (
        <mesh key={`z-${off}`} position={[off * w, h * 0.92, 0]}>
          <boxGeometry args={[0.03, 0.03, d * 0.82]} />
          <meshStandardMaterial color="#e7e5e4" roughness={0.5} />
        </mesh>
      ))}
    </group>
  );
}

/** Régie DJ / bar technique. */
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
  return (
    <group>
      <mesh position={[0, 0.55, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, 1.05, d]} />
        <meshStandardMaterial color={body} roughness={0.55} />
      </mesh>
      <mesh position={[0, 1.12, 0]} receiveShadow>
        <boxGeometry args={[w * 0.92, 0.06, d * 0.7]} />
        <meshStandardMaterial color="#e7e5e4" roughness={0.25} metalness={0.2} />
      </mesh>
      {([-0.32, 0.32] as const).map((side) => (
        <group key={side} position={[side * w * 0.55, 1.35, -d * 0.15]}>
          <mesh castShadow>
            <boxGeometry args={[0.22, 0.55, 0.18]} />
            <meshStandardMaterial color="#171717" roughness={0.6} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** Écran de projection. */
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
  return (
    <group>
      <mesh position={[0, h * 0.55, 0]} castShadow>
        <boxGeometry args={[w, h, 0.08]} />
        <meshStandardMaterial color={selected ? '#1e293b' : '#0f172a'} roughness={0.85} />
      </mesh>
      <mesh position={[0, h * 0.55, 0.05]}>
        <boxGeometry args={[w * 0.92, h * 0.82, 0.02]} />
        <meshStandardMaterial color="#111827" roughness={0.35} metalness={0.15} />
      </mesh>
    </group>
  );
}

/** Toit à pignon au-dessus d’une scène. */
export function GabledStageRoof({
  w,
  d,
  heightM = 2.6,
  selected = false,
}: {
  w: number;
  d: number;
  heightM?: number;
  selected?: boolean;
}) {
  const h = Math.max(1.8, heightM);
  const wood = selected ? '#c7d2fe' : '#b45309';
  const stone = '#78716c';
  return (
    <group>
      {([-1, 1] as const).map((side) => (
        <mesh key={side} position={[side * w * 0.38, h * 0.42, 0]} castShadow>
          <boxGeometry args={[0.28, h * 0.84, 0.28]} />
          <meshStandardMaterial color={stone} roughness={0.7} />
        </mesh>
      ))}
      <mesh position={[0, h * 0.92, 0]} rotation={[0, 0, 0.32]} castShadow>
        <boxGeometry args={[w * 0.55, 0.08, d * 0.7]} />
        <meshStandardMaterial color={wood} roughness={0.55} />
      </mesh>
      <mesh position={[0, h * 0.92, 0]} rotation={[0, 0, -0.32]} castShadow>
        <boxGeometry args={[w * 0.55, 0.08, d * 0.7]} />
        <meshStandardMaterial color={wood} roughness={0.55} />
      </mesh>
    </group>
  );
}
