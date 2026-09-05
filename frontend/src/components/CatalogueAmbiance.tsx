'use client';

import React, { useMemo } from 'react';
import * as THREE from 'three';
import {
  resolveChandelierCount,
  resolveChandelierType,
  type ChandelierType,
} from '@/lib/roomCeilingUtils';
import type { DoorStyle, AisleStyle, ChandelierFixtureStyle, OpeningMaterial } from '@/lib/roomLayoutUtils';
import { getDoorMaterialProps } from '@/lib/roomWebGLMaterials';

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

/** ───────── PORTE 3D RÉALISTE (PINTEREST) ───────── */
export function CatalogueDoor({
  w,
  d,
  height = 2.4,
  style = 'frenchDoor',
  doorSwing = 'left',
  hasMat = true,
  matColor,
  color,
  openingMaterial,
  frameColor,
  selected = false,
}: {
  w: number;
  d: number;
  height?: number;
  style?: DoorStyle;
  doorSwing?: 'left' | 'right' | 'double' | 'sliding' | 'arch';
  hasMat?: boolean;
  matColor?: string;
  color?: string;
  openingMaterial?: OpeningMaterial;
  frameColor?: string;
  selected?: boolean;
}) {
  const doorMat = useMemo(
    () => getDoorMaterialProps(openingMaterial, color),
    [openingMaterial, color],
  );
  const leafColor = selected ? '#c7d2fe' : (color ?? doorMat.color);
  const jambColor = frameColor ?? leafColor;
  const frameThickness = 0.08;
  const doorThick = 0.045;
  const frameW = Math.max(0.9, w);
  const frameH = Math.max(2.1, height);

  return (
    <group>
      {/* Paillasson d'entrée / tapis d'accueil */}
      {hasMat && (
        <mesh position={[0, 0.008, d * 0.45]} receiveShadow>
          <boxGeometry args={[frameW * 0.95, 0.015, Math.max(0.6, d * 0.6)]} />
          <meshStandardMaterial
            color={matColor ?? (style === 'grandPortal' ? '#78350f' : '#b45309')}
            roughness={0.9}
          />
        </mesh>
      )}

      {/* Cadre de porte (Montants & Linteau) */}
      <group position={[0, frameH / 2, 0]}>
        {/* Montant gauche */}
        <mesh position={[-frameW / 2 + frameThickness / 2, 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[frameThickness, frameH, frameThickness * 1.5]} />
          <meshStandardMaterial
            color={selected ? '#c7d2fe' : jambColor}
            map={doorMat.map}
            roughness={doorMat.roughness}
            metalness={doorMat.metalness}
          />
        </mesh>
        {/* Montant droit */}
        <mesh position={[frameW / 2 - frameThickness / 2, 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[frameThickness, frameH, frameThickness * 1.5]} />
          <meshStandardMaterial
            color={selected ? '#c7d2fe' : jambColor}
            map={doorMat.map}
            roughness={doorMat.roughness}
            metalness={doorMat.metalness}
          />
        </mesh>
        {/* Linteau haut */}
        <mesh position={[0, frameH / 2 - frameThickness / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[frameW, frameThickness, frameThickness * 1.5]} />
          <meshStandardMaterial
            color={selected ? '#c7d2fe' : jambColor}
            map={doorMat.map}
            roughness={doorMat.roughness}
          />
        </mesh>

        {/* 1. GRAND PORTAIL ROYAL AVEC ORNEMENTS DORÉS */}
        {style === 'grandPortal' && (
          <>
            {/* Fronton / imposte dorée */}
            <mesh position={[0, frameH / 2 + 0.15, 0]} castShadow>
              <boxGeometry args={[frameW * 1.1, 0.2, 0.1]} />
              <meshStandardMaterial color="#d4af37" metalness={0.8} roughness={0.2} />
            </mesh>
            {/* Battant gauche orné */}
            <group position={[-frameW / 4, 0, 0]}>
              <mesh castShadow receiveShadow>
                <boxGeometry args={[frameW / 2 - frameThickness, frameH - frameThickness, doorThick]} />
                <meshStandardMaterial color="#1c1917" roughness={0.3} />
              </mesh>
              {/* Moulure or */}
              <mesh position={[0, 0, doorThick / 2 + 0.005]} castShadow>
                <boxGeometry args={[frameW / 2 - frameThickness * 2, frameH * 0.75, 0.01]} />
                <meshStandardMaterial color="#d4af37" metalness={0.75} roughness={0.25} />
              </mesh>
              {/* Poignée dorée */}
              <mesh position={[frameW / 4 - 0.08, -0.1, doorThick / 2 + 0.02]} castShadow>
                <cylinderGeometry args={[0.015, 0.015, 0.25, 12]} />
                <meshStandardMaterial color="#fbbf24" metalness={0.9} roughness={0.15} />
              </mesh>
            </group>
            {/* Battant droit orné */}
            <group position={[frameW / 4, 0, 0]}>
              <mesh castShadow receiveShadow>
                <boxGeometry args={[frameW / 2 - frameThickness, frameH - frameThickness, doorThick]} />
                <meshStandardMaterial color="#1c1917" roughness={0.3} />
              </mesh>
              <mesh position={[0, 0, doorThick / 2 + 0.005]} castShadow>
                <boxGeometry args={[frameW / 2 - frameThickness * 2, frameH * 0.75, 0.01]} />
                <meshStandardMaterial color="#d4af37" metalness={0.75} roughness={0.25} />
              </mesh>
              <mesh position={[-frameW / 4 + 0.08, -0.1, doorThick / 2 + 0.02]} castShadow>
                <cylinderGeometry args={[0.015, 0.015, 0.25, 12]} />
                <meshStandardMaterial color="#fbbf24" metalness={0.9} roughness={0.15} />
              </mesh>
            </group>
          </>
        )}

        {/* 2. PORTE FRANÇAISE AVEC CARREAUX DE VERRE & CROISILLONS */}
        {style === 'frenchDoor' && (
          <>
            {/* Battants vitrés */}
            {[-1, 1].map((side) => (
              <group key={side} position={[side * (frameW / 4), 0, 0]}>
                {/* Cadre du battant */}
                <mesh castShadow receiveShadow>
                  <boxGeometry args={[frameW / 2 - frameThickness * 1.1, frameH - frameThickness * 1.1, doorThick]} />
                  <meshStandardMaterial color="#ffffff" roughness={0.3} />
                </mesh>
                {/* Vitres en verre */}
                <mesh position={[0, 0, 0]}>
                  <boxGeometry args={[frameW / 2 - frameThickness * 2.5, frameH * 0.7, 0.01]} />
                  <meshPhysicalMaterial
                    color="#f8fafc"
                    transmission={0.8}
                    opacity={0.4}
                    transparent
                    roughness={0.1}
                    metalness={0.1}
                  />
                </mesh>
                {/* Poignée laiton */}
                <mesh position={[-side * (frameW / 4 - 0.08), -0.1, doorThick / 2 + 0.02]} castShadow>
                  <cylinderGeometry args={[0.012, 0.012, 0.18, 12]} />
                  <meshStandardMaterial color="#d4af37" metalness={0.8} roughness={0.25} />
                </mesh>
              </group>
            ))}
          </>
        )}

        {/* 3. PORTE DE GRANGE SUR RAIL NOIR RUSTIQUE */}
        {style === 'barnDoor' && (
          <>
            {/* Rail supérieur en acier noir */}
            <mesh position={[0, frameH / 2 + 0.08, 0.06]} castShadow>
              <boxGeometry args={[frameW * 1.3, 0.04, 0.04]} />
              <meshStandardMaterial color="#1c1917" metalness={0.85} roughness={0.3} />
            </mesh>
            {/* Roulettes de suspension */}
            {[-frameW / 3, frameW / 3].map((rx, idx) => (
              <mesh key={idx} position={[rx, frameH / 2 + 0.08, 0.08]} rotation={[Math.PI / 2, 0, 0]} castShadow>
                <cylinderGeometry args={[0.035, 0.035, 0.02, 16]} />
                <meshStandardMaterial color="#0f172a" metalness={0.9} roughness={0.2} />
              </mesh>
            ))}
            {/* Panneau bois massif avec croisillons en Z */}
            <group position={[0, -0.02, 0.04]}>
              <mesh castShadow receiveShadow>
                <boxGeometry args={[frameW * 0.95, frameH - 0.05, 0.05]} />
                <meshStandardMaterial color="#78350f" roughness={0.7} />
              </mesh>
              {/* Poignée barre en fonte noire */}
              <mesh position={[frameW * 0.35, -0.1, 0.045]} castShadow>
                <boxGeometry args={[0.02, 0.35, 0.03]} />
                <meshStandardMaterial color="#18181b" metalness={0.8} roughness={0.3} />
              </mesh>
            </group>
          </>
        )}

        {/* 4. SAS RIDEAUX VELOURS VIP */}
        {style === 'velvetCurtain' && (
          <>
            {/* Tringle en laiton doré */}
            <mesh position={[0, frameH / 2 + 0.05, 0.05]} rotation={[0, 0, Math.PI / 2]} castShadow>
              <cylinderGeometry args={[0.02, 0.02, frameW * 1.2, 12]} />
              <meshStandardMaterial color="#d4af37" metalness={0.85} roughness={0.2} />
            </mesh>
            {/* Rideau velours drapé gauche */}
            <mesh position={[-frameW * 0.3, -0.05, 0.04]} castShadow>
              <cylinderGeometry args={[0.18, 0.22, frameH * 0.9, 16]} />
              <meshStandardMaterial color="#881337" roughness={0.9} />
            </mesh>
            {/* Rideau velours drapé droit */}
            <mesh position={[frameW * 0.3, -0.05, 0.04]} castShadow>
              <cylinderGeometry args={[0.18, 0.22, frameH * 0.9, 16]} />
              <meshStandardMaterial color="#881337" roughness={0.9} />
            </mesh>
            {/* Embrasses dorées */}
            {[-frameW * 0.3, frameW * 0.3].map((cx, idx) => (
              <mesh key={idx} position={[cx, -0.15, 0.08]} castShadow>
                <torusGeometry args={[0.12, 0.02, 8, 24]} />
                <meshStandardMaterial color="#fbbf24" metalness={0.8} roughness={0.2} />
              </mesh>
            ))}
          </>
        )}

        {/* 5. SORTIE DE SECOURS AVEC BLOC LUMINEUX VERT */}
        {style === 'fireExit' && (
          <>
            {/* Bloc lumineux de secours */}
            <group position={[0, frameH / 2 + 0.16, 0.05]}>
              <mesh castShadow>
                <boxGeometry args={[0.38, 0.15, 0.06]} />
                <meshStandardMaterial color="#059669" emissive="#10b981" emissiveIntensity={0.85} roughness={0.2} />
              </mesh>
            </group>
            {/* Panneau porte battante */}
            <mesh position={[0, 0, 0]} castShadow receiveShadow>
              <boxGeometry args={[frameW - frameThickness * 1.2, frameH - frameThickness * 1.2, doorThick]} />
              <meshStandardMaterial color="#e2e8f0" roughness={0.5} />
            </mesh>
            {/* Barre anti-panique */}
            <mesh position={[0, -0.1, doorThick / 2 + 0.03]} castShadow>
              <boxGeometry args={[frameW * 0.75, 0.05, 0.03]} />
              <meshStandardMaterial color="#dc2626" metalness={0.6} roughness={0.3} />
            </mesh>
          </>
        )}

        {/* 6. DOUBLE BATTANTE OU SIMPLE PAR DÉFAUT */}
        {style !== 'grandPortal' && style !== 'frenchDoor' && style !== 'barnDoor' && style !== 'velvetCurtain' && style !== 'fireExit' && (
          <group position={[0, 0, 0]}>
            <mesh castShadow receiveShadow>
              <boxGeometry args={[frameW - frameThickness * 1.2, frameH - frameThickness * 1.2, doorThick]} />
              <meshStandardMaterial color={color ?? '#ffffff'} roughness={0.4} />
            </mesh>
            {/* Poignée inox */}
            <mesh position={[frameW * 0.35, -0.1, doorThick / 2 + 0.02]} castShadow>
              <cylinderGeometry args={[0.012, 0.012, 0.16, 12]} />
              <meshStandardMaterial color="#94a3b8" metalness={0.8} roughness={0.2} />
            </mesh>
          </group>
        )}
      </group>
    </group>
  );
}

/** ───────── LUSTRE & SUSPENSION 3D INDIVIDUEL (PINTEREST) ───────── */
export function CatalogueChandelierFixture({
  style = 'crystalCascade',
  lightWarmth = 'warm',
  lightIntensity = 1.6,
  lightRadius = 8,
  selected = false,
}: {
  style?: ChandelierFixtureStyle;
  lightWarmth?: 'warm' | 'candle' | 'neutral' | 'gold' | 'rose' | 'night' | 'golden' | 'cool';
  lightIntensity?: number;
  lightRadius?: number;
  selected?: boolean;
}) {
  const lightColor =
    lightWarmth === 'candle'
      ? '#f59e0b'
      : lightWarmth === 'gold' || lightWarmth === 'golden'
        ? '#fbbf24'
        : lightWarmth === 'rose'
          ? '#fda4af'
          : lightWarmth === 'night' || lightWarmth === 'cool'
            ? '#38bdf8'
            : lightWarmth === 'neutral'
              ? '#f8fafc'
              : '#fef3c7';

  return (
    <group position={[0, 2.5, 0]}>
      {/* Câble / tige de suspension du plafond */}
      <mesh position={[0, 0.45, 0]}>
        <cylinderGeometry args={[0.006, 0.006, 0.9, 6]} />
        <meshStandardMaterial color="#475569" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* 1. CASCADE DE CRISTAL ROYAL */}
      {style === 'crystalCascade' && (
        <group>
          {/* Couronne supérieure dorée */}
          <mesh position={[0, 0.05, 0]} castShadow>
            <cylinderGeometry args={[0.35, 0.38, 0.08, 24]} />
            <meshStandardMaterial color={selected ? '#c7d2fe' : '#d4af37'} metalness={0.85} roughness={0.2} />
          </mesh>
          {/* Cascades de pampilles en cristal transparent */}
          {[0, 1, 2].map((tier) => {
            const r = 0.3 - tier * 0.08;
            const y = -tier * 0.15;
            return (
              <group key={tier} position={[0, y, 0]}>
                {Array.from({ length: 12 - tier * 2 }).map((_, idx) => {
                  const ang = (idx / (12 - tier * 2)) * Math.PI * 2;
                  return (
                    <mesh
                      key={idx}
                      position={[Math.cos(ang) * r, -0.08, Math.sin(ang) * r]}
                      rotation={[0, ang, 0]}
                      castShadow
                    >
                      <octahedronGeometry args={[0.035, 0]} />
                      <meshPhysicalMaterial
                        color="#f8fafc"
                        transmission={0.85}
                        opacity={0.85}
                        transparent
                        roughness={0.05}
                        metalness={0.1}
                        emissive={lightColor}
                        emissiveIntensity={0.18 * Math.max(0.4, lightIntensity)}
                      />
                    </mesh>
                  );
                })}
              </group>
            );
          })}
        </group>
      )}

      {/* 2. HALOS & ANNEAUX DE LAITON BROSSÉ */}
      {style === 'brassRings' && (
        <group>
          {[0.42, 0.28, 0.16].map((ringR, idx) => (
            <mesh
              key={idx}
              position={[0, -idx * 0.12, 0]}
              rotation={[0.15 * (idx % 2 === 0 ? 1 : -1), 0.3 * idx, 0.1 * idx]}
              castShadow
            >
              <torusGeometry args={[ringR, 0.015, 12, 36]} />
              <meshStandardMaterial
                color={selected ? '#c7d2fe' : '#d4af37'}
                metalness={0.85}
                roughness={0.25}
                emissive="#fde68a"
                emissiveIntensity={0.2}
              />
            </mesh>
          ))}
        </group>
      )}

      {/* 3. BOHÈME ROTIN & FEUILLES DE PAMPA */}
      {style === 'bohoPampas' && (
        <group>
          {/* Abat-jour rotin tressé */}
          <mesh position={[0, 0, 0]} castShadow>
            <cylinderGeometry args={[0.2, 0.38, 0.3, 16, 1, true]} />
            <meshStandardMaterial color="#d97706" roughness={0.85} side={THREE.DoubleSide} />
          </mesh>
          {/* Éventail d'herbes de pampa autour */}
          {Array.from({ length: 10 }).map((_, i) => {
            const ang = (i / 10) * Math.PI * 2;
            return (
              <mesh
                key={i}
                position={[Math.cos(ang) * 0.35, -0.05, Math.sin(ang) * 0.35]}
                rotation={[0.4, ang, 0]}
                castShadow
              >
                <coneGeometry args={[0.06, 0.35, 6]} />
                <meshStandardMaterial color="#fef3c7" roughness={0.95} />
              </mesh>
            );
          })}
        </group>
      )}

      {/* 4. COURONNE BOTANIQUE FLORALE */}
      {style === 'botanicalHalo' && (
        <group>
          {/* Anneau végétal eucalyptus */}
          <mesh position={[0, 0, 0]} castShadow>
            <torusGeometry args={[0.4, 0.05, 12, 24]} />
            <meshStandardMaterial color="#15803d" roughness={0.9} />
          </mesh>
          {/* Boutons floraux roses et ivoires */}
          {Array.from({ length: 12 }).map((_, i) => {
            const ang = (i / 12) * Math.PI * 2;
            return (
              <mesh
                key={i}
                position={[Math.cos(ang) * 0.4, (i % 2 === 0 ? 0.03 : -0.03), Math.sin(ang) * 0.4]}
                castShadow
              >
                <sphereGeometry args={[0.035, 8, 8]} />
                <meshStandardMaterial color={i % 3 === 0 ? '#fb7185' : '#fffbeb'} roughness={0.6} />
              </mesh>
            );
          })}
        </group>
      )}

      {/* 5. CANDÉLABRE DE CHÂTEAU GRAND SIÈCLE */}
      {style === 'candleCandelabra' && (
        <group>
          {/* Tige centrale or */}
          <mesh position={[0, 0, 0]} castShadow>
            <cylinderGeometry args={[0.03, 0.05, 0.4, 12]} />
            <meshStandardMaterial color="#d4af37" metalness={0.8} roughness={0.25} />
          </mesh>
          {/* 6 bras recourbés avec bougies */}
          {Array.from({ length: 6 }).map((_, i) => {
            const ang = (i / 6) * Math.PI * 2;
            const bx = Math.cos(ang) * 0.32;
            const bz = Math.sin(ang) * 0.32;
            return (
              <group key={i}>
                <mesh position={[bx * 0.6, -0.06, bz * 0.6]} rotation={[0, ang, 0.5]} castShadow>
                  <cylinderGeometry args={[0.012, 0.012, 0.28, 8]} />
                  <meshStandardMaterial color="#d4af37" metalness={0.8} roughness={0.25} />
                </mesh>
                {/* Bougie cire */}
                <mesh position={[bx, 0.06, bz]} castShadow>
                  <cylinderGeometry args={[0.015, 0.015, 0.14, 10]} />
                  <meshStandardMaterial color="#fffbeb" roughness={0.4} />
                </mesh>
                {/* Flamme scintillante */}
                <mesh position={[bx, 0.15, bz]}>
                  <sphereGeometry args={[0.016, 8, 8]} />
                  <meshStandardMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={1.2} />
                </mesh>
              </group>
            );
          })}
        </group>
      )}

      {/* 6. CIEL ÉTOILÉ FAIRY CANOPY */}
      {style === 'fairyCanopy' && (
        <group>
          {Array.from({ length: 16 }).map((_, i) => {
            const ang = (i / 16) * Math.PI * 2;
            const r = 0.15 + (i % 3) * 0.12;
            const dropY = -0.1 - (i % 4) * 0.1;
            return (
              <group key={i} position={[Math.cos(ang) * r, 0, Math.sin(ang) * r]}>
                <mesh position={[0, dropY / 2, 0]}>
                  <cylinderGeometry args={[0.002, 0.002, Math.abs(dropY), 4]} />
                  <meshStandardMaterial color="#94a3b8" />
                </mesh>
                <mesh position={[0, dropY, 0]}>
                  <sphereGeometry args={[0.018, 8, 8]} />
                  <meshStandardMaterial color="#fef08a" emissive="#fde047" emissiveIntensity={1.2} />
                </mesh>
              </group>
            );
          })}
        </group>
      )}

      {/* Source de lumière ponctuelle scénique */}
      <pointLight
        position={[0, -0.25, 0]}
        intensity={lightIntensity * 0.85}
        color={lightColor}
        distance={lightRadius}
        decay={2}
        castShadow
      />
    </group>
  );
}

/** ───────── ALLÉE VIP & TAPIS DE CÉRÉMONIE 3D (PINTEREST) ───────── */
export function CatalogueAisle({
  w,
  d,
  style = 'royalRed',
  hasGoldBorder = true,
  hasSideLanterns = false,
  hasPetals = false,
  selected = false,
}: {
  w: number;
  d: number;
  style?: AisleStyle;
  hasGoldBorder?: boolean;
  hasSideLanterns?: boolean;
  hasPetals?: boolean;
  selected?: boolean;
}) {
  const isRed = style === 'royalRed';
  const isMirror = style === 'whiteMirror';
  const isBotanical = style === 'botanicalRunner';
  const isWood = style === 'rusticWood';
  const isDamask = style === 'damaskGold';
  const isLed = style === 'ledRunway';
  const isBlack = style === 'blackVelvet';

  return (
    <group>
      {/* Tapis principal au sol */}
      <mesh position={[0, 0.015, 0]} receiveShadow>
        <boxGeometry args={[w, 0.025, d]} />
        <meshStandardMaterial
          color={
            selected
              ? '#c7d2fe'
              : isRed
                ? '#881337'
                : isMirror
                  ? '#ffffff'
                  : isBotanical
                    ? '#fef3c7'
                    : isWood
                      ? '#78350f'
                      : isDamask
                        ? '#d97706'
                        : isLed
                          ? '#0f172a'
                          : isBlack
                            ? '#18181b'
                            : '#881337'
          }
          roughness={isMirror ? 0.08 : isLed ? 0.2 : isWood ? 0.62 : 0.94}
          metalness={isMirror ? 0.75 : isDamask ? 0.35 : 0.04}
        />
      </mesh>

      {/* Bordures or / ganse de prestige */}
      {(hasGoldBorder || isRed || isDamask) && (
        <>
          <mesh position={[-w / 2 + 0.025, 0.028, 0]} receiveShadow castShadow>
            <boxGeometry args={[0.04, 0.01, d]} />
            <meshStandardMaterial color="#fbbf24" metalness={0.8} roughness={0.25} />
          </mesh>
          <mesh position={[w / 2 - 0.025, 0.028, 0]} receiveShadow castShadow>
            <boxGeometry args={[0.04, 0.01, d]} />
            <meshStandardMaterial color="#fbbf24" metalness={0.8} roughness={0.25} />
          </mesh>
        </>
      )}

      {/* Bandes lumineuses néon LED latérales pour catwalk */}
      {isLed && (
        <>
          <mesh position={[-w / 2 + 0.02, 0.03, 0]}>
            <boxGeometry args={[0.03, 0.01, d]} />
            <meshStandardMaterial color="#38bdf8" emissive="#0284c7" emissiveIntensity={1.2} />
          </mesh>
          <mesh position={[w / 2 - 0.02, 0.03, 0]}>
            <boxGeometry args={[0.03, 0.01, d]} />
            <meshStandardMaterial color="#38bdf8" emissive="#0284c7" emissiveIntensity={1.2} />
          </mesh>
        </>
      )}

      {/* Lanternes posées le long de l'allée */}
      {hasSideLanterns && (
        <group>
          {[-1, 1].map((side) =>
            [0.2, 0.5, 0.8].map((t, idx) => (
              <group key={`${side}-${idx}`} position={[side * (w / 2 + 0.12), 0.12, (t - 0.5) * d]}>
                <mesh castShadow>
                  <boxGeometry args={[0.12, 0.22, 0.12]} />
                  <meshStandardMaterial color="#d4af37" metalness={0.8} roughness={0.25} />
                </mesh>
                <mesh position={[0, 0, 0]}>
                  <boxGeometry args={[0.09, 0.18, 0.09]} />
                  <meshStandardMaterial color="#fef3c7" emissive="#fbbf24" emissiveIntensity={0.8} />
                </mesh>
              </group>
            )),
          )}
        </group>
      )}

      {/* Pétales de roses parsemés */}
      {(hasPetals || isBotanical) && (
        <group>
          {Array.from({ length: 16 }).map((_, idx) => {
            const px = ((idx % 4) / 3 - 0.5) * w * 0.75;
            const pz = ((Math.floor(idx / 4)) / 3 - 0.5) * d * 0.85;
            return (
              <mesh key={idx} position={[px, 0.03, pz]} rotation={[-Math.PI / 2, 0, idx * 0.7]}>
                <circleGeometry args={[0.035, 6]} />
                <meshStandardMaterial color={idx % 2 === 0 ? '#fb7185' : '#f43f5e'} roughness={0.6} />
              </mesh>
            );
          })}
        </group>
      )}
    </group>
  );
}
