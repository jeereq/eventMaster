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
import { SurfaceMat } from '@/components/room/SurfaceMaterial';
import { CandelabraChandelier, ChandelierModel, CrystalChandelier, chandelierLightY } from '@/components/room/ChandelierMeshes';

function ChandelierClassic({ pointLights }: { pointLights: boolean }) {
  return (
    <group>
      <mesh position={[0, 0.1, 0]}>
        <cylinderGeometry args={[0.005, 0.005, 0.2, 6]} />
        <SurfaceMat color="#57534e" metalness={0.7} roughness={0.3} />
      </mesh>
      <CandelabraChandelier scale={0.62} />
      {pointLights ? (
        <pointLight position={[0, -0.4, 0]} intensity={0.55} color="#fef3c7" distance={10} decay={2} />
      ) : null}
    </group>
  );
}

function ChandelierCrystal({ pointLights }: { pointLights: boolean }) {
  return (
    <group>
      <mesh position={[0, 0.1, 0]}>
        <cylinderGeometry args={[0.005, 0.005, 0.2, 6]} />
        <SurfaceMat color="#a8a29e" metalness={0.85} roughness={0.2} />
      </mesh>
      <CrystalChandelier scale={0.72} />
      {pointLights ? (
        <pointLight position={[0, -0.45, 0]} intensity={0.78} color="#fef3c7" distance={11} decay={2} />
      ) : null}
    </group>
  );
}

function ChandelierModern({ pointLights }: { pointLights: boolean }) {
  return (
    <group>
      <mesh position={[0, 0.35, 0]}>
        <cylinderGeometry args={[0.005, 0.005, 0.55, 6]} />
        <SurfaceMat color="#57534e" metalness={0.6} roughness={0.35} />
      </mesh>
      <mesh position={[0, 0.02, 0]} castShadow>
        <cylinderGeometry args={[0.09, 0.11, 0.28, 24]} />
        <SurfaceMat color="#1c1917" metalness={0.55} roughness={0.35} />
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
        <SurfaceMat color="#292524" metalness={0.7} roughness={0.4} />
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
        <SurfaceMat color="#a8a29e" metalness={0.75} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.08, 0]} castShadow>
        <boxGeometry args={[0.22, 0.06, 0.22]} />
        <SurfaceMat color="#d4af37" metalness={0.8} roughness={0.25} />
      </mesh>
      <mesh position={[0, -0.08, 0]} castShadow>
        <boxGeometry args={[0.2, 0.28, 0.2]} />
        <meshStandardMaterial color="#fef3c7" emissive="#fbbf24" emissiveIntensity={0.45} transparent opacity={0.75} roughness={0.35} />
      </mesh>
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} position={[0, -0.08, 0]} rotation={[0, (i * Math.PI) / 2, 0]} castShadow>
          <boxGeometry args={[0.22, 0.28, 0.012]} />
          <SurfaceMat color="#b45309" metalness={0.55} roughness={0.4} />
        </mesh>
      ))}
      <mesh position={[0, -0.24, 0]} castShadow>
        <boxGeometry args={[0.22, 0.04, 0.22]} />
        <SurfaceMat color="#d4af37" metalness={0.8} roughness={0.25} />
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
            <SurfaceMat color="#292524" metalness={0.55} roughness={0.4} />
          </mesh>
          <mesh position={[0, 0.08, 0]}>
            <sphereGeometry args={[0.022, 8, 8]} />
            <meshStandardMaterial
              color="#fef08a"
              emissive="#f59e0b"
              emissiveIntensity={2.5}
              roughness={0.2}
            />
          </mesh>
          <mesh position={[0, 0.12, 0]}>
            <coneGeometry args={[0.2, 0.55, 16]} />
            <meshStandardMaterial
              color="#fef9c3"
              transparent
              opacity={0.15}
              emissive="#fbbf24"
              emissiveIntensity={0.45}
              depthWrite={false}
              side={THREE.DoubleSide}
            />
          </mesh>
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
  color = '#7f1d1d',
}: {
  widthM: number;
  heightM: number;
  wallHeightM: number;
  color?: string;
}) {
  const h = Math.min(wallHeightM * 0.92, wallHeightM - 0.15);
  const fold = color === '#7f1d1d' ? '#991b1b' : color;
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
            <meshStandardMaterial color={color} roughness={0.88} metalness={0.02} />
          </mesh>
          {Array.from({ length: 8 }).map((_, f) => {
            const x = ((f + 0.5) / 8 - 0.5) * p.w * 0.95;
            return (
              <mesh key={f} position={[x, 0, 0.03]} castShadow>
                <boxGeometry args={[p.w / 18, h * 0.98, 0.04]} />
                <meshStandardMaterial color={fold} roughness={0.9} />
              </mesh>
            );
          })}
          <mesh position={[0, h / 2 + 0.04, 0.02]} castShadow>
            <cylinderGeometry args={[0.02, 0.02, p.w * 1.05, 8]} />
            <SurfaceMat color="#d4af37" metalness={0.75} roughness={0.25} />
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
  curtainColor,
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
  curtainColor?: string;
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
        <RoomCurtains widthM={widthM} heightM={heightM} wallHeightM={wallHeightM} color={curtainColor} />
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
              <SurfaceMat color="#d4af37" metalness={0.8} roughness={0.2} />
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
                <SurfaceMat color="#d4af37" metalness={0.75} roughness={0.25} />
              </mesh>
              {/* Poignée dorée */}
              <mesh position={[frameW / 4 - 0.08, -0.1, doorThick / 2 + 0.02]} castShadow>
                <cylinderGeometry args={[0.015, 0.015, 0.25, 12]} />
                <SurfaceMat color="#fbbf24" metalness={0.9} roughness={0.15} />
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
                <SurfaceMat color="#d4af37" metalness={0.75} roughness={0.25} />
              </mesh>
              <mesh position={[-frameW / 4 + 0.08, -0.1, doorThick / 2 + 0.02]} castShadow>
                <cylinderGeometry args={[0.015, 0.015, 0.25, 12]} />
                <SurfaceMat color="#fbbf24" metalness={0.9} roughness={0.15} />
              </mesh>
            </group>
          </>
        )}

        {/* 2. PORTE FRANÇAISE AVEC CARREAUX DE VERRE & CROISILLONS */}
        {style === 'frenchDoor' && (
          <>
            {[-1, 1].map((side) => {
              const leafW = frameW / 2 - frameThickness * 1.1;
              const leafH = frameH - frameThickness * 1.1;
              const stile = 0.07;
              const glassW = leafW - stile * 2;
              const glassH = leafH - stile * 2 - 0.28;
              const leafWood = color ?? '#f8fafc';
              return (
                <group key={side} position={[side * (frameW / 4), 0, 0]}>
                  {/* Montants et traverses du battant (le verre reste visible) */}
                  {[-1, 1].map((sx) => (
                    <mesh key={`st-${sx}`} position={[sx * (leafW / 2 - stile / 2), 0, 0]} castShadow receiveShadow>
                      <boxGeometry args={[stile, leafH, doorThick]} />
                      <meshStandardMaterial color={leafWood} roughness={0.35} />
                    </mesh>
                  ))}
                  <mesh position={[0, leafH / 2 - stile / 2, 0]} castShadow>
                    <boxGeometry args={[leafW, stile, doorThick]} />
                    <meshStandardMaterial color={leafWood} roughness={0.35} />
                  </mesh>
                  {/* Soubassement plein */}
                  <mesh position={[0, -leafH / 2 + (stile + 0.28) / 2, 0]} castShadow receiveShadow>
                    <boxGeometry args={[leafW, stile + 0.28, doorThick]} />
                    <meshStandardMaterial color={leafWood} roughness={0.35} />
                  </mesh>
                  {/* Vitrage */}
                  <mesh position={[0, 0.14, 0]}>
                    <boxGeometry args={[glassW, glassH, 0.008]} />
                    <SurfaceMat color="#e0f2fe" finish="glass" opacity={0.3} />
                  </mesh>
                  {/* Croisillons : 2 colonnes × 5 rangées de petits carreaux */}
                  <mesh position={[0, 0.14, 0.006]}>
                    <boxGeometry args={[0.022, glassH, 0.018]} />
                    <meshStandardMaterial color={leafWood} roughness={0.35} />
                  </mesh>
                  {[1, 2, 3, 4].map((k) => (
                    <mesh key={k} position={[0, 0.14 - glassH / 2 + (glassH * k) / 5, 0.006]}>
                      <boxGeometry args={[glassW, 0.022, 0.018]} />
                      <meshStandardMaterial color={leafWood} roughness={0.35} />
                    </mesh>
                  ))}
                  {/* Poignée laiton */}
                  <mesh position={[-side * (leafW / 2 - 0.05), -0.1, doorThick / 2 + 0.02]} castShadow>
                    <cylinderGeometry args={[0.012, 0.012, 0.18, 12]} />
                    <SurfaceMat color="#d4af37" metalness={0.8} roughness={0.25} />
                  </mesh>
                </group>
              );
            })}
          </>
        )}

        {/* 3. PORTE DE GRANGE SUR RAIL NOIR RUSTIQUE */}
        {style === 'barnDoor' && (
          <>
            {/* Rail supérieur en acier noir */}
            <mesh position={[0, frameH / 2 + 0.08, 0.06]} castShadow>
              <boxGeometry args={[frameW * 1.3, 0.04, 0.04]} />
              <SurfaceMat color="#1c1917" metalness={0.85} roughness={0.3} />
            </mesh>
            {/* Roulettes de suspension */}
            {[-frameW / 3, frameW / 3].map((rx, idx) => (
              <mesh key={idx} position={[rx, frameH / 2 + 0.08, 0.08]} rotation={[Math.PI / 2, 0, 0]} castShadow>
                <cylinderGeometry args={[0.035, 0.035, 0.02, 16]} />
                <SurfaceMat color="#0f172a" metalness={0.9} roughness={0.2} />
              </mesh>
            ))}
            {/* Panneau bois massif avec croisillons en Z */}
            <group position={[0, -0.02, 0.04]}>
              <mesh castShadow receiveShadow>
                <boxGeometry args={[frameW * 0.95, frameH - 0.05, 0.05]} />
                <SurfaceMat color={color ?? '#8a5a35'} finish="wood" vertical repeat={[3, 1]} roughness={0.7} />
              </mesh>
              {/* Traverses et écharpe en Z */}
              {[frameH * 0.38, -frameH * 0.38].map((y) => (
                <mesh key={y} position={[0, y, 0.035]} castShadow>
                  <boxGeometry args={[frameW * 0.9, 0.14, 0.03]} />
                  <SurfaceMat color={color ?? '#7a4d2c'} finish="wood" roughness={0.7} />
                </mesh>
              ))}
              <mesh position={[0, 0, 0.035]} rotation={[0, 0, Math.atan2(frameH * 0.76, frameW * 0.9)]} castShadow>
                <boxGeometry args={[Math.hypot(frameW * 0.9, frameH * 0.76) * 0.95, 0.14, 0.03]} />
                <SurfaceMat color={color ?? '#7a4d2c'} finish="wood" roughness={0.7} />
              </mesh>
              {/* Poignée barre en fonte noire */}
              <mesh position={[frameW * 0.35, -0.1, 0.045]} castShadow>
                <boxGeometry args={[0.02, 0.35, 0.03]} />
                <SurfaceMat color="#18181b" metalness={0.8} roughness={0.3} />
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
              <SurfaceMat color="#d4af37" metalness={0.85} roughness={0.2} />
            </mesh>
            {/* Rideaux velours drapés : plis verticaux resserrés à l’embrasse */}
            {[-1, 1].map((side) => (
              <group key={side} position={[side * frameW * 0.27, 0, 0.05]}>
                {Array.from({ length: 7 }).map((_, i) => {
                  const t = i / 6 - 0.5;
                  return (
                    <mesh key={i} position={[t * frameW * 0.42, -0.02, (i % 2) * 0.03]} scale={[1, 1, 0.55]} castShadow>
                      <cylinderGeometry args={[frameW * 0.036, frameW * 0.03, frameH * 0.96, 10]} />
                      <SurfaceMat color={color && color !== '#78716c' ? color : '#7f1d3a'} finish="velvet" roughness={0.9} />
                    </mesh>
                  );
                })}
              </group>
            ))}
            {/* Embrasses dorées */}
            {[-frameW * 0.27, frameW * 0.27].map((cx, idx) => (
              <mesh key={idx} position={[cx, -0.15, 0.1]} rotation={[Math.PI / 2, 0, 0]} scale={[frameW * 0.26 / 0.12, 1, 0.5]} castShadow>
                <torusGeometry args={[0.12, 0.012, 8, 24]} />
                <SurfaceMat color="#fbbf24" metalness={0.8} roughness={0.2} />
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
              <SurfaceMat color="#dc2626" metalness={0.6} roughness={0.3} />
            </mesh>
          </>
        )}

        {/* 6. PORTE TOUT-VERRE MINIMALISTE AVEC BÂTON DE MARÉCHAL INOX */}
        {style === 'glass' && (
          <group position={[0, 0, 0]}>
            {/* Panneau de verre sécurit feuilleté */}
            <mesh position={[0, 0, 0]}>
              <boxGeometry args={[frameW - frameThickness * 1.1, frameH - frameThickness * 1.1, 0.012]} />
              <SurfaceMat color="#e0f2fe" finish="glass" opacity={0.28} />
            </mesh>
            {/* Fines bordures périphériques en aluminium noir anodisé (profilés, pas un panneau plein) */}
            {([
              [0, (frameH - frameThickness * 1.1) / 2, frameW - frameThickness * 1.1, 0.035],
              [0, -(frameH - frameThickness * 1.1) / 2, frameW - frameThickness * 1.1, 0.035],
              [(frameW - frameThickness * 1.1) / 2, 0, 0.035, frameH - frameThickness * 1.1],
              [-(frameW - frameThickness * 1.1) / 2, 0, 0.035, frameH - frameThickness * 1.1],
            ] as const).map(([px, py, bw, bh], i) => (
              <mesh key={i} position={[px, py, 0]} castShadow>
                <boxGeometry args={[bw, bh, 0.03]} />
                <SurfaceMat color="#18181b" finish="metal" roughness={0.3} />
              </mesh>
            ))}
            {/* Longue poignée verticale bâton de maréchal en inox brossé */}
            <group position={[frameW * 0.32, 0, 0.045]}>
              <mesh castShadow>
                <cylinderGeometry args={[0.016, 0.016, 1.25, 16]} />
                <SurfaceMat color="#e2e8f0" metalness={0.92} roughness={0.12} />
              </mesh>
              {/* Fixations murales / entretoises de la poignée */}
              {[-0.5, 0.5].map((py, pi) => (
                <mesh key={pi} position={[0, py, -0.025]} rotation={[Math.PI / 2, 0, 0]} castShadow>
                  <cylinderGeometry args={[0.012, 0.012, 0.05, 12]} />
                  <SurfaceMat color="#cbd5e1" metalness={0.9} roughness={0.15} />
                </mesh>
              ))}
            </group>
          </group>
        )}

        {/* 7. GRANDE PORTE PIVOTANTE D'ARCHITECTE CONTEMPORAINE (AXE DÉPORTÉ) */}
        {style === 'pivot' && (
          <group position={[frameW * 0.05, 0, 0.02]}>
            {/* Axe de pivot supérieur et inférieur */}
            {[-frameH * 0.48, frameH * 0.48].map((py, pi) => (
              <mesh key={pi} position={[-frameW * 0.28, py, 0]} castShadow>
                <cylinderGeometry args={[0.025, 0.025, 0.04, 16]} />
                <SurfaceMat color="#18181b" metalness={0.9} roughness={0.2} />
              </mesh>
            ))}
            {/* Vantail pivotant en bois noir texturé ou métal liquide */}
            <mesh position={[0, 0, 0]} castShadow receiveShadow>
              <boxGeometry args={[frameW * 0.94, frameH * 0.96, 0.065]} />
              <meshStandardMaterial color={color ?? '#18181b'} roughness={0.4} metalness={0.2} />
            </mesh>
            {/* Gorge / poignée intégrée verticale rétroéclairée */}
            <mesh position={[frameW * 0.34, 0, 0.035]}>
              <boxGeometry args={[0.02, 1.4, 0.015]} />
              <meshStandardMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={0.6} />
            </mesh>
          </group>
        )}

        {/* 8. DOUBLE PORTE BATTANTE CLASSIQUE MOULURÉE */}
        {style === 'double' && (
          <>
            {[-1, 1].map((side) => {
              const leafW = (frameW - frameThickness * 1.5) / 2;
              return (
                <group key={`double-${side}`} position={[side * (leafW / 2 + 0.01), 0, 0]}>
                  {/* Vantail */}
                  <mesh castShadow receiveShadow>
                    <boxGeometry args={[leafW, frameH - frameThickness * 1.2, doorThick]} />
                    <meshStandardMaterial color={color ?? '#ffffff'} roughness={0.35} />
                  </mesh>
                  {/* Moulure haute en relief */}
                  <mesh position={[0, frameH * 0.22, doorThick / 2 + 0.006]} castShadow>
                    <boxGeometry args={[leafW * 0.75, frameH * 0.35, 0.01]} />
                    <meshStandardMaterial color={color ?? '#f8fafc'} roughness={0.4} />
                  </mesh>
                  {/* Moulure basse en relief */}
                  <mesh position={[0, -frameH * 0.22, doorThick / 2 + 0.006]} castShadow>
                    <boxGeometry args={[leafW * 0.75, frameH * 0.35, 0.01]} />
                    <meshStandardMaterial color={color ?? '#f8fafc'} roughness={0.4} />
                  </mesh>
                  {/* Poignée béquille laiton/inox sur rosace */}
                  <group position={[-side * (leafW * 0.35), -0.05, doorThick / 2 + 0.015]}>
                    <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
                      <cylinderGeometry args={[0.025, 0.025, 0.008, 16]} />
                      <SurfaceMat color="#fbbf24" metalness={0.85} roughness={0.2} />
                    </mesh>
                    <mesh position={[side * 0.05, 0, 0.025]} castShadow>
                      <boxGeometry args={[0.11, 0.018, 0.018]} />
                      <SurfaceMat color="#d4af37" metalness={0.9} roughness={0.18} />
                    </mesh>
                  </group>
                </group>
              );
            })}
          </>
        )}

        {/* 9. PORTE CINTRÉE EN PLEIN CINTRE */}
        {style === 'arch' && (
          <group position={[0, 0, 0]}>
            <mesh castShadow receiveShadow>
              <boxGeometry args={[frameW - frameThickness * 1.2, frameH - frameThickness * 1.2, doorThick]} />
              <meshStandardMaterial color={color ?? '#451a03'} roughness={0.5} />
            </mesh>
            {/* Imposte cintrée : arc plein cintre vitré au-dessus du linteau */}
            <group position={[0, frameH / 2, 0]}>
              <mesh castShadow>
                <torusGeometry args={[frameW / 2 - frameThickness / 2, frameThickness * 0.6, 10, 32, Math.PI]} />
                <meshStandardMaterial color={jambColor} roughness={0.5} />
              </mesh>
              <mesh position={[0, 0, 0]}>
                <circleGeometry args={[frameW / 2 - frameThickness, 32, 0, Math.PI]} />
                <SurfaceMat color="#e0f2fe" finish="glass" opacity={0.35} side={THREE.DoubleSide} />
              </mesh>
              {/* Rayons de l’éventail */}
              {[0.25, 0.5, 0.75].map((t) => (
                <mesh key={t} position={[Math.cos(t * Math.PI) * (frameW / 4), Math.sin(t * Math.PI) * (frameW / 4), 0.01]} rotation={[0, 0, t * Math.PI]}>
                  <boxGeometry args={[frameW / 2 - frameThickness, 0.02, 0.015]} />
                  <meshStandardMaterial color={jambColor} roughness={0.5} />
                </mesh>
              ))}
              {/* Clé de voûte */}
              <mesh position={[0, frameW / 2 + 0.02, 0.03]} castShadow>
                <boxGeometry args={[0.16, 0.18, 0.08]} />
                <meshStandardMaterial color="#a8a29e" roughness={0.7} />
              </mesh>
            </group>
            {/* Heurtoir en fer forgé */}
            <mesh position={[0, frameH * 0.1, doorThick / 2 + 0.02]} castShadow>
              <torusGeometry args={[0.065, 0.012, 10, 20]} />
              <SurfaceMat color="#1c1917" metalness={0.8} roughness={0.3} />
            </mesh>
            {/* Poignée */}
            <mesh position={[frameW * 0.32, -0.1, doorThick / 2 + 0.02]} castShadow>
              <cylinderGeometry args={[0.015, 0.015, 0.16, 12]} />
              <SurfaceMat color="#fbbf24" metalness={0.85} roughness={0.2} />
            </mesh>
          </group>
        )}

        {/* 11. COULISSANTE MODERNE : rail apparent, vantail décalé, poignée cuvette */}
        {style === 'sliding' && (
          <group>
            <mesh position={[frameW * 0.1, frameH / 2 + 0.05, doorThick + 0.03]} castShadow>
              <boxGeometry args={[frameW * 1.3, 0.05, 0.05]} />
              <SurfaceMat color="#27272a" finish="metal" roughness={0.3} />
            </mesh>
            <group position={[frameW * 0.28, -0.02, doorThick + 0.03]}>
              <mesh castShadow receiveShadow>
                <boxGeometry args={[frameW * 0.72, frameH - frameThickness, doorThick]} />
                <meshStandardMaterial color={color ?? '#e7e5e4'} roughness={0.4} />
              </mesh>
              {/* Bande vitrée dépolie */}
              <mesh position={[0, 0.1, doorThick / 2 + 0.002]}>
                <boxGeometry args={[frameW * 0.16, frameH * 0.7, 0.004]} />
                <meshStandardMaterial color="#f1f5f9" roughness={0.2} transparent opacity={0.7} />
              </mesh>
              <mesh position={[-frameW * 0.3, -0.05, doorThick / 2 + 0.01]}>
                <boxGeometry args={[0.03, 0.4, 0.02]} />
                <SurfaceMat color="#52525b" finish="metal" roughness={0.3} />
              </mesh>
            </group>
          </group>
        )}

        {/* 12. BAIE ACCORDÉON : panneaux vitrés repliés en zigzag */}
        {style === 'folding' && (
          <group>
            {Array.from({ length: 4 }).map((_, i) => {
              const panelW = (frameW - frameThickness * 2) / 4;
              const ang = (i % 2 === 0 ? 1 : -1) * 0.35;
              return (
                <group key={i} position={[-frameW / 2 + frameThickness + panelW * (i + 0.5), 0, 0.02 + (i % 2) * 0.06]} rotation={[0, ang, 0]}>
                  {[-1, 1].map((sx) => (
                    <mesh key={sx} position={[sx * (panelW / 2 - 0.02), 0, 0]} castShadow>
                      <boxGeometry args={[0.04, frameH - frameThickness * 1.2, 0.05]} />
                      <SurfaceMat color={color ?? '#3f3f46'} finish="metal" roughness={0.35} />
                    </mesh>
                  ))}
                  {[1, -1].map((sy) => (
                    <mesh key={sy} position={[0, sy * ((frameH - frameThickness * 1.2) / 2 - 0.03), 0]} castShadow>
                      <boxGeometry args={[panelW, 0.06, 0.05]} />
                      <SurfaceMat color={color ?? '#3f3f46'} finish="metal" roughness={0.35} />
                    </mesh>
                  ))}
                  <mesh>
                    <boxGeometry args={[panelW - 0.06, frameH - frameThickness * 1.4, 0.01]} />
                    <SurfaceMat color="#e0f2fe" finish="glass" opacity={0.3} />
                  </mesh>
                </group>
              );
            })}
          </group>
        )}

        {/* 10. PORTE SIMPLE / MOULURÉE PAR DÉFAUT */}
        {style !== 'grandPortal' &&
          style !== 'frenchDoor' &&
          style !== 'barnDoor' &&
          style !== 'velvetCurtain' &&
          style !== 'fireExit' &&
          style !== 'glass' &&
          style !== 'pivot' &&
          style !== 'double' &&
          style !== 'arch' &&
          style !== 'sliding' &&
          style !== 'folding' && (
            <group position={[0, 0, 0]}>
              {/* Vantail principal */}
              <mesh castShadow receiveShadow>
                <boxGeometry args={[frameW - frameThickness * 1.2, frameH - frameThickness * 1.2, doorThick]} />
                <meshStandardMaterial color={color ?? '#ffffff'} roughness={0.38} />
              </mesh>
              {/* Deux panneaux moulurés en léger relief d'ébénisterie */}
              <mesh position={[0, frameH * 0.22, doorThick / 2 + 0.005]} castShadow>
                <boxGeometry args={[(frameW - frameThickness * 2) * 0.8, frameH * 0.38, 0.008]} />
                <meshStandardMaterial color={color ?? '#f8fafc'} roughness={0.45} />
              </mesh>
              <mesh position={[0, -frameH * 0.22, doorThick / 2 + 0.005]} castShadow>
                <boxGeometry args={[(frameW - frameThickness * 2) * 0.8, frameH * 0.38, 0.008]} />
                <meshStandardMaterial color={color ?? '#f8fafc'} roughness={0.45} />
              </mesh>
              {/* Ensemble poignée béquille en L sur rosace circulaire */}
              <group position={[frameW * 0.34, -0.06, doorThick / 2 + 0.015]}>
                <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
                  <cylinderGeometry args={[0.026, 0.026, 0.008, 16]} />
                  <SurfaceMat color="#94a3b8" metalness={0.85} roughness={0.2} />
                </mesh>
                {/* Béquille en L */}
                <mesh position={[-0.05, 0, 0.02]} castShadow>
                  <boxGeometry args={[0.11, 0.018, 0.016]} />
                  <SurfaceMat color="#cbd5e1" metalness={0.9} roughness={0.15} />
                </mesh>
                {/* Trou de serrure sous la rosace */}
                <mesh position={[0, -0.06, 0]} rotation={[Math.PI / 2, 0, 0]}>
                  <cylinderGeometry args={[0.016, 0.016, 0.006, 12]} />
                  <SurfaceMat color="#64748b" metalness={0.8} roughness={0.3} />
                </mesh>
              </group>
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
  ceilingM = 3.4,
}: {
  style?: ChandelierFixtureStyle;
  /** Hauteur sous plafond (m) : le lustre y est suspendu. */
  ceilingM?: number;
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

  const hangStyle = style ?? 'crystalCascade';
  return (
    <group>
      <ChandelierModel style={hangStyle} ceilingM={ceilingM} lightColor={lightColor} selected={selected} />
      {/* Source de lumière ponctuelle scénique */}
      <pointLight
        position={[0, chandelierLightY(hangStyle, ceilingM), 0]}
        intensity={lightIntensity * 0.85}
        color={lightColor}
        distance={lightRadius}
        decay={2}
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
  const isWood = style === 'rusticWood' || style === 'herringbone';
  const isDamask = style === 'damaskGold';
  const isLed = style === 'ledRunway';
  const isBlack = style === 'blackVelvet';
  const isSequin = style === 'sequinGold';
  const isMarble = style === 'marbleInlay';
  const isFairy = style === 'fairyLight';
  const isSilk = style === 'silkIvory';
  const aisleColor = selected
    ? '#c7d2fe'
    : isRed
      ? '#881337'
      : isMirror
        ? '#ffffff'
        : isBotanical || isSilk
          ? '#fef3c7'
          : isWood
            ? '#78350f'
            : isDamask || isSequin
              ? '#d97706'
              : isLed || isFairy
                ? '#0f172a'
                : isBlack
                  ? '#18181b'
                  : isMarble
                    ? '#f5f5f4'
                    : '#881337';

  return (
    <group>
      {/* Tapis principal au sol */}
      <mesh position={[0, 0.015, 0]} receiveShadow>
        <boxGeometry args={[w, 0.025, d]} />
        <meshStandardMaterial
          color={aisleColor}
          roughness={isMirror || isSilk ? 0.08 : isLed ? 0.2 : isWood || isMarble ? 0.55 : isSequin ? 0.18 : 0.94}
          metalness={isMirror ? 0.75 : isDamask || isSequin ? 0.45 : isMarble ? 0.22 : 0.04}
        />
      </mesh>

      {/* Bordures or / ganse de prestige */}
      {(hasGoldBorder || isRed || isDamask) && (
        <>
          <mesh position={[-w / 2 + 0.025, 0.028, 0]} receiveShadow castShadow>
            <boxGeometry args={[0.04, 0.01, d]} />
            <SurfaceMat color="#fbbf24" metalness={0.8} roughness={0.25} />
          </mesh>
          <mesh position={[w / 2 - 0.025, 0.028, 0]} receiveShadow castShadow>
            <boxGeometry args={[0.04, 0.01, d]} />
            <SurfaceMat color="#fbbf24" metalness={0.8} roughness={0.25} />
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
                  <SurfaceMat color="#d4af37" metalness={0.8} roughness={0.25} />
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

      {isWood &&
        Array.from({ length: Math.max(6, Math.round(d / 0.35)) }).map((_, i) => {
          const z = ((i + 0.5) / Math.max(6, Math.round(d / 0.35)) - 0.5) * d;
          return (
            <mesh key={`plank-${i}`} position={[0, 0.028, z]} receiveShadow>
              <boxGeometry args={[w * 0.92, 0.004, 0.018]} />
              <meshStandardMaterial color={i % 2 ? '#92400e' : '#451a03'} roughness={0.7} />
            </mesh>
          );
        })}

      {isDamask &&
        Array.from({ length: 8 }).map((_, i) => {
          const z = ((i + 0.5) / 8 - 0.5) * d * 0.85;
          return (
            <mesh key={`damask-${i}`} position={[0, 0.03, z]} rotation={[-Math.PI / 2, 0, i % 2 ? 0.78 : 0]}>
              <circleGeometry args={[w * 0.12, 4]} />
              <meshStandardMaterial color="#fde68a" metalness={0.45} roughness={0.35} transparent opacity={0.35} />
            </mesh>
          );
        })}

      {isSequin &&
        Array.from({ length: 22 }).map((_, i) => {
          const px = ((i % 5) / 4 - 0.5) * w * 0.7;
          const pz = (Math.floor(i / 5) / 4 - 0.5) * d * 0.85;
          return (
            <mesh key={`sq-${i}`} position={[px, 0.032, pz]} rotation={[-Math.PI / 2, 0, i]}>
              <circleGeometry args={[0.028, 6]} />
              <meshStandardMaterial color="#fbbf24" metalness={0.85} roughness={0.12} emissive="#f59e0b" emissiveIntensity={0.25} />
            </mesh>
          );
        })}

      {isMarble && (
        <>
          <mesh position={[0, 0.028, 0]} receiveShadow>
            <boxGeometry args={[w * 0.18, 0.006, d]} />
            <SurfaceMat color="#d4af37" metalness={0.7} roughness={0.25} />
          </mesh>
          {([-0.22, 0.22] as const).map((x) => (
            <mesh key={x} position={[x * w, 0.026, 0]}>
              <boxGeometry args={[0.02, 0.004, d * 0.95]} />
              <meshStandardMaterial color="#a8a29e" roughness={0.4} />
            </mesh>
          ))}
        </>
      )}

      {isFairy &&
        Array.from({ length: 14 }).map((_, i) => {
          const side = i % 2 === 0 ? -1 : 1;
          const z = ((Math.floor(i / 2) + 0.5) / 7 - 0.5) * d * 0.9;
          return (
            <mesh key={`fairy-${i}`} position={[side * (w / 2 - 0.04), 0.06, z]}>
              <sphereGeometry args={[0.018, 8, 8]} />
              <meshStandardMaterial color="#fef08a" emissive="#fde047" emissiveIntensity={1.15} />
            </mesh>
          );
        })}

      {isLed &&
        Array.from({ length: 9 }).map((_, i) => {
          const z = ((i + 0.5) / 9 - 0.5) * d * 0.88;
          return (
            <mesh key={`led-c-${i}`} position={[0, 0.032, z]}>
              <boxGeometry args={[0.06, 0.008, 0.08]} />
              <meshStandardMaterial color="#38bdf8" emissive="#0ea5e9" emissiveIntensity={1.1} />
            </mesh>
          );
        })}
    </group>
  );
}
