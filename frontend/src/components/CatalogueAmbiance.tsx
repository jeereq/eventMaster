'use client';

import React, { useMemo } from 'react';
import * as THREE from 'three';
import {
  resolveChandelierCount,
  resolveChandelierType,
  type ChandelierType,
} from '@/lib/roomCeilingUtils';

function ChandelierClassic({ pointLights }: { pointLights: boolean }) {
  return (
    <group>
      <mesh position={[0, 0.25, 0]}>
        <cylinderGeometry args={[0.008, 0.008, 0.5, 6]} />
        <meshStandardMaterial color="#a8a29e" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0, -0.05, 0]} castShadow>
        <sphereGeometry args={[0.14, 16, 16]} />
        <meshStandardMaterial color="#fef3c7" emissive="#fbbf24" emissiveIntensity={0.55} roughness={0.25} metalness={0.2} />
      </mesh>
      {[0, 1, 2, 3, 4, 5].map((a) => {
        const ang = (a / 6) * Math.PI * 2;
        return (
          <group key={a} rotation={[0, ang, 0]}>
            <mesh position={[0.22, -0.08, 0]} rotation={[0, 0, 0.4]} castShadow>
              <cylinderGeometry args={[0.012, 0.012, 0.28, 6]} />
              <meshStandardMaterial color="#d4af37" metalness={0.8} roughness={0.25} />
            </mesh>
            <mesh position={[0.34, -0.18, 0]} castShadow>
              <sphereGeometry args={[0.05, 10, 10]} />
              <meshStandardMaterial color="#fff7ed" emissive="#fde68a" emissiveIntensity={0.7} roughness={0.2} />
            </mesh>
          </group>
        );
      })}
      {pointLights ? (
        <pointLight position={[0, -0.2, 0]} intensity={0.55} color="#fef3c7" distance={10} decay={2} />
      ) : null}
    </group>
  );
}

function ChandelierCrystal({ pointLights }: { pointLights: boolean }) {
  return (
    <group>
      <mesh position={[0, 0.28, 0]}>
        <cylinderGeometry args={[0.006, 0.006, 0.45, 6]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.85} roughness={0.2} />
      </mesh>
      <mesh position={[0, 0.02, 0]} castShadow>
        <octahedronGeometry args={[0.1, 0]} />
        <meshStandardMaterial color="#e0f2fe" metalness={0.9} roughness={0.08} transparent opacity={0.85} />
      </mesh>
      {[0, 1, 2, 3, 4, 5, 6, 7].map((a) => {
        const ang = (a / 8) * Math.PI * 2;
        const r = 0.2 + (a % 2) * 0.06;
        return (
          <group key={a} rotation={[0, ang, 0]}>
            <mesh position={[r, -0.12, 0]} castShadow>
              <octahedronGeometry args={[0.045, 0]} />
              <meshPhysicalMaterial
                color="#f0f9ff"
                metalness={0.15}
                roughness={0.05}
                transmission={0.55}
                thickness={0.4}
                transparent
                opacity={0.9}
              />
            </mesh>
            <mesh position={[r * 0.7, -0.28, 0]} castShadow>
              <octahedronGeometry args={[0.03, 0]} />
              <meshStandardMaterial color="#e0f2fe" emissive="#bae6fd" emissiveIntensity={0.35} roughness={0.1} />
            </mesh>
          </group>
        );
      })}
      {pointLights ? (
        <pointLight position={[0, -0.15, 0]} intensity={0.7} color="#e0f2fe" distance={11} decay={2} />
      ) : null}
    </group>
  );
}

function ChandelierModern({ pointLights }: { pointLights: boolean }) {
  return (
    <group>
      <mesh position={[0, 0.35, 0]}>
        <cylinderGeometry args={[0.005, 0.005, 0.55, 6]} />
        <meshStandardMaterial color="#57534e" metalness={0.6} roughness={0.35} />
      </mesh>
      <mesh position={[0, 0.02, 0]} castShadow>
        <cylinderGeometry args={[0.09, 0.11, 0.28, 24]} />
        <meshStandardMaterial color="#1c1917" metalness={0.55} roughness={0.35} />
      </mesh>
      <mesh position={[0, -0.14, 0]}>
        <cylinderGeometry args={[0.08, 0.08, 0.04, 24]} />
        <meshStandardMaterial color="#fef3c7" emissive="#fbbf24" emissiveIntensity={0.85} roughness={0.4} />
      </mesh>
      {pointLights ? (
        <pointLight position={[0, -0.25, 0]} intensity={0.65} color="#fff7ed" distance={9} decay={2} />
      ) : null}
    </group>
  );
}

function ChandelierIndustrial({ pointLights }: { pointLights: boolean }) {
  return (
    <group>
      <mesh position={[0, 0.32, 0]}>
        <cylinderGeometry args={[0.01, 0.01, 0.5, 6]} />
        <meshStandardMaterial color="#292524" metalness={0.7} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.05, 0]} castShadow>
        <coneGeometry args={[0.18, 0.22, 16, 1, true]} />
        <meshStandardMaterial color="#44403c" metalness={0.65} roughness={0.4} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, -0.02, 0]}>
        <sphereGeometry args={[0.07, 12, 12]} />
        <meshStandardMaterial color="#fef9c3" emissive="#fde68a" emissiveIntensity={0.9} roughness={0.3} />
      </mesh>
      {pointLights ? (
        <pointLight position={[0, -0.15, 0]} intensity={0.5} color="#fde68a" distance={8} decay={2} />
      ) : null}
    </group>
  );
}

function ChandelierLantern({ pointLights }: { pointLights: boolean }) {
  return (
    <group>
      <mesh position={[0, 0.3, 0]}>
        <cylinderGeometry args={[0.006, 0.006, 0.4, 6]} />
        <meshStandardMaterial color="#a8a29e" metalness={0.75} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.08, 0]} castShadow>
        <boxGeometry args={[0.22, 0.06, 0.22]} />
        <meshStandardMaterial color="#d4af37" metalness={0.8} roughness={0.25} />
      </mesh>
      <mesh position={[0, -0.08, 0]} castShadow>
        <boxGeometry args={[0.2, 0.28, 0.2]} />
        <meshStandardMaterial color="#fef3c7" emissive="#fbbf24" emissiveIntensity={0.45} transparent opacity={0.75} roughness={0.35} />
      </mesh>
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} position={[0, -0.08, 0]} rotation={[0, (i * Math.PI) / 2, 0]} castShadow>
          <boxGeometry args={[0.22, 0.28, 0.012]} />
          <meshStandardMaterial color="#b45309" metalness={0.55} roughness={0.4} />
        </mesh>
      ))}
      <mesh position={[0, -0.24, 0]} castShadow>
        <boxGeometry args={[0.22, 0.04, 0.22]} />
        <meshStandardMaterial color="#d4af37" metalness={0.8} roughness={0.25} />
      </mesh>
      {pointLights ? (
        <pointLight position={[0, -0.1, 0]} intensity={0.6} color="#fdba74" distance={9} decay={2} />
      ) : null}
    </group>
  );
}

function ChandelierRecessed({ pointLights }: { pointLights: boolean }) {
  return (
    <group>
      <mesh position={[0, 0.02, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.08, 0.12, 24]} />
        <meshStandardMaterial color="#a8a29e" metalness={0.5} roughness={0.4} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.08, 24]} />
        <meshStandardMaterial color="#fffbeb" emissive="#fde68a" emissiveIntensity={1.1} roughness={0.5} />
      </mesh>
      {pointLights ? (
        <pointLight position={[0, -0.35, 0]} intensity={0.45} color="#fff7ed" distance={7} decay={2} />
      ) : null}
    </group>
  );
}

function ChandelierByType({
  type,
  pointLights,
}: {
  type: ChandelierType;
  pointLights: boolean;
}) {
  switch (type) {
    case 'crystal':
      return <ChandelierCrystal pointLights={pointLights} />;
    case 'modern':
      return <ChandelierModern pointLights={pointLights} />;
    case 'industrial':
      return <ChandelierIndustrial pointLights={pointLights} />;
    case 'lantern':
      return <ChandelierLantern pointLights={pointLights} />;
    case 'recessed':
      return <ChandelierRecessed pointLights={pointLights} />;
    case 'classic':
    default:
      return <ChandelierClassic pointLights={pointLights} />;
  }
}

/** Lustres / suspensions au plafond. */
export function RoomChandeliers({
  widthM,
  heightM,
  wallHeightM,
  count = 3,
  pointLights = true,
  chandelierType = 'classic',
}: {
  widthM: number;
  heightM: number;
  wallHeightM: number;
  count?: number;
  pointLights?: boolean;
  chandelierType?: ChandelierType | string;
}) {
  const type = resolveChandelierType(chandelierType);
  const positions = useMemo(() => {
    const n = Math.max(1, Math.min(5, count));
    const flush = type === 'recessed';
    return Array.from({ length: n }).map((_, i) => {
      const t = n === 1 ? 0.5 : i / (n - 1);
      const y = flush ? wallHeightM - 0.02 : wallHeightM - 0.15;
      return [
        (t - 0.5) * widthM * 0.55,
        y,
        (i % 2 === 0 ? -0.12 : 0.12) * heightM,
      ] as [number, number, number];
    });
  }, [count, widthM, heightM, wallHeightM, type]);

  return (
    <group>
      {positions.map((pos, i) => (
        <group key={`${type}-${i}`} position={pos}>
          <ChandelierByType type={type} pointLights={pointLights} />
        </group>
      ))}
    </group>
  );
}

/** Uplights le long des murs (wash scénique). */
export function RoomUplights({
  widthM,
  heightM,
  maxCount = 16,
}: {
  widthM: number;
  heightM: number;
  maxCount?: number;
}) {
  const spots = useMemo(() => {
    const list: [number, number, number][] = [];
    const margin = 0.4;
    const step = Math.max(3, Math.min(widthM, heightM) / 3);
    for (let x = -widthM / 2 + margin; x <= widthM / 2 - margin; x += step) {
      list.push([x, 0.15, -heightM / 2 + 0.35]);
      list.push([x, 0.15, heightM / 2 - 0.35]);
    }
    for (let z = -heightM / 2 + step; z <= heightM / 2 - step; z += step) {
      list.push([-widthM / 2 + 0.35, 0.15, z]);
      list.push([widthM / 2 - 0.35, 0.15, z]);
    }
    return list.slice(0, Math.max(2, maxCount));
  }, [widthM, heightM, maxCount]);

  return (
    <group>
      {spots.map((pos, i) => (
        <group key={i} position={pos}>
          <mesh castShadow>
            <cylinderGeometry args={[0.06, 0.08, 0.12, 12]} />
            <meshStandardMaterial color="#292524" metalness={0.55} roughness={0.4} />
          </mesh>
          <mesh position={[0, 0.12, 0]}>
            <coneGeometry args={[0.2, 0.55, 16]} />
            <meshStandardMaterial
              color="#fef9c3"
              transparent
              opacity={0.12}
              emissive="#fbbf24"
              emissiveIntensity={0.35}
              depthWrite={false}
              side={THREE.DoubleSide}
            />
          </mesh>
          <pointLight position={[0, 0.35, 0]} intensity={0.4} color="#fde68a" distance={7} decay={2} />
        </group>
      ))}
    </group>
  );
}

/** Rideaux sur les grands murs. */
export function RoomCurtains({
  widthM,
  heightM,
  wallHeightM,
}: {
  widthM: number;
  heightM: number;
  wallHeightM: number;
}) {
  const h = Math.min(wallHeightM * 0.92, wallHeightM - 0.15);
  const panels = useMemo(() => ([
    { pos: [0, h / 2, -heightM / 2 + 0.12] as [number, number, number], w: widthM * 0.42, rot: 0 },
    { pos: [0, h / 2, heightM / 2 - 0.12] as [number, number, number], w: widthM * 0.42, rot: Math.PI },
  ]), [widthM, heightM, h]);

  return (
    <group>
      {panels.map((p, i) => (
        <group key={i} position={p.pos} rotation={[0, p.rot, 0]}>
          <mesh castShadow>
            <boxGeometry args={[p.w, h, 0.05]} />
            <meshStandardMaterial color="#7f1d1d" roughness={0.88} metalness={0.02} />
          </mesh>
          {Array.from({ length: 8 }).map((_, f) => {
            const x = ((f + 0.5) / 8 - 0.5) * p.w * 0.95;
            return (
              <mesh key={f} position={[x, 0, 0.03]} castShadow>
                <boxGeometry args={[p.w / 18, h * 0.98, 0.04]} />
                <meshStandardMaterial color="#991b1b" roughness={0.9} />
              </mesh>
            );
          })}
          <mesh position={[0, h / 2 + 0.04, 0.02]} castShadow>
            <cylinderGeometry args={[0.02, 0.02, p.w * 1.05, 8]} />
            <meshStandardMaterial color="#d4af37" metalness={0.75} roughness={0.25} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** Plantes décoratives d’angle. */
export function RoomCornerPlants({
  widthM,
  heightM,
}: {
  widthM: number;
  heightM: number;
}) {
  const corners = useMemo(() => ([
    [-widthM / 2 + 0.7, 0, -heightM / 2 + 0.7],
    [widthM / 2 - 0.7, 0, -heightM / 2 + 0.7],
    [-widthM / 2 + 0.7, 0, heightM / 2 - 0.7],
    [widthM / 2 - 0.7, 0, heightM / 2 - 0.7],
  ] as [number, number, number][]), [widthM, heightM]);

  return (
    <group>
      {corners.map((pos, i) => (
        <group key={i} position={pos}>
          <mesh position={[0, 0.18, 0]} castShadow>
            <cylinderGeometry args={[0.18, 0.22, 0.36, 12]} />
            <meshStandardMaterial color="#78716c" roughness={0.75} />
          </mesh>
          <mesh position={[0, 0.55, 0]} castShadow>
            <sphereGeometry args={[0.35, 12, 12]} />
            <meshStandardMaterial color="#166534" roughness={0.9} />
          </mesh>
          <mesh position={[0.15, 0.7, 0.1]} castShadow>
            <sphereGeometry args={[0.22, 10, 10]} />
            <meshStandardMaterial color="#15803d" roughness={0.9} />
          </mesh>
          <mesh position={[-0.12, 0.65, -0.08]} castShadow>
            <sphereGeometry args={[0.2, 10, 10]} />
            <meshStandardMaterial color="#14532d" roughness={0.92} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

export type RoomAmbianceFlags = {
  chandeliers?: boolean;
  uplights?: boolean;
  curtains?: boolean;
  plants?: boolean;
};

export function RoomAmbiance({
  widthM,
  heightM,
  wallHeightM,
  flags,
  maxChandeliers = 3,
  maxUplights = 12,
  chandelierPointLights = true,
  chandelierType,
  chandelierCount,
}: {
  widthM: number;
  heightM: number;
  wallHeightM: number;
  flags: RoomAmbianceFlags;
  maxChandeliers?: number;
  maxUplights?: number;
  chandelierPointLights?: boolean;
  chandelierType?: ChandelierType | string;
  chandelierCount?: number;
}) {
  const count = resolveChandelierCount(chandelierCount, maxChandeliers);
  return (
    <group>
      {flags.chandeliers ? (
        <RoomChandeliers
          widthM={widthM}
          heightM={heightM}
          wallHeightM={wallHeightM}
          count={count}
          pointLights={chandelierPointLights}
          chandelierType={chandelierType}
        />
      ) : null}
      {flags.uplights ? (
        <RoomUplights widthM={widthM} heightM={heightM} maxCount={maxUplights} />
      ) : null}
      {flags.curtains ? (
        <RoomCurtains widthM={widthM} heightM={heightM} wallHeightM={wallHeightM} />
      ) : null}
      {flags.plants ? <RoomCornerPlants widthM={widthM} heightM={heightM} /> : null}
    </group>
  );
}
