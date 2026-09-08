'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { PodiumStyle, ZoneKind, ZoneMaterial } from '@/lib/roomLayoutUtils';
import { getStairWoodMap, resolveZoneMaterialMap } from '@/lib/roomWebGLMaterials';
import { rowArcZ, rowCurveFactor, rowSeatLocalX } from '@/lib/roomAmphitheaterGeom';

const RISER_TREAD_M = 1.18;
const RISER_FRONT_OVERHANG_M = 0.32;
const RISER_ARC_SEGMENTS = 18;

function buildRiserFootprint(
  seatCount: number,
  spacing: number,
  curveFactor: number,
  aisleSplit: boolean,
  aisleWidthPct: number,
  inset = 0,
) {
  const firstX = rowSeatLocalX(0, seatCount, spacing, aisleSplit, aisleWidthPct);
  const lastX = rowSeatLocalX(seatCount - 1, seatCount, spacing, aisleSplit, aisleWidthPct);
  const pad = Math.max(0.08, 0.42 - inset);
  const x0 = Math.min(firstX, lastX) - pad;
  const x1 = Math.max(firstX, lastX) + pad;
  const shape = new THREE.Shape();

  // Coordonnées 3D :
  // zFront(x) est en avant des sièges (vers la scène, en Z négatif)
  // zBack(x) est en arrière des sièges (vers le fond, en Z positif)
  const zFront = (x: number) => rowArcZ(x, spacing, curveFactor) - (RISER_FRONT_OVERHANG_M - inset);
  const zBack = (x: number) => rowArcZ(x, spacing, curveFactor) + (RISER_TREAD_M - inset);

  // Avec ExtrudeGeometry puis volume.rotateX(-Math.PI / 2) :
  // new_Z = -shape_Y. Pour que new_Z corresponde à nos coordonnées 3D :
  // shape_Y_back = -zBack(x)
  // shape_Y_front = -zFront(x)
  const yBack = (x: number) => -zBack(x);
  const yFront = (x: number) => -zFront(x);

  // Tracé CCW : bord arrière de gauche à droite, puis bord avant de droite à gauche
  shape.moveTo(x0, yBack(x0));
  for (let i = 1; i <= RISER_ARC_SEGMENTS; i += 1) {
    const x = x0 + ((x1 - x0) * i) / RISER_ARC_SEGMENTS;
    shape.lineTo(x, yBack(x));
  }
  for (let i = RISER_ARC_SEGMENTS; i >= 0; i -= 1) {
    const x = x0 + ((x1 - x0) * i) / RISER_ARC_SEGMENTS;
    shape.lineTo(x, yFront(x));
  }
  shape.closePath();
  return { shape, x0, x1, zFront, zBack };
}

/** Gradin amphithéâtre : dalle cintrée qui suit l’arc des sièges. */
export function AmphitheaterRiser({
  seatCount,
  spacing,
  elevation,
  curve = 0,
  aisleSplit = false,
  aisleWidthPct = 14,
  selected = false,
}: {
  seatCount: number;
  spacing: number;
  elevation: number;
  curve?: number;
  aisleSplit?: boolean;
  aisleWidthPct?: number;
  selected?: boolean;
}) {
  const wood = useMemo(() => getStairWoodMap(), []);
  const h = Math.max(elevation, 0.14);
  const curveF = rowCurveFactor(curve);
  const selectedTint = selected ? '#c7d2fe' : undefined;

  const { volume, carpet, x0, x1, zFront, zBack } = useMemo(() => {
    // Structure porteuse bois / béton
    const footprint = buildRiserFootprint(seatCount, spacing, curveF, aisleSplit, aisleWidthPct, 0);
    const volume = new THREE.ExtrudeGeometry(footprint.shape, {
      depth: h,
      bevelEnabled: true,
      bevelThickness: 0.014,
      bevelSize: 0.014,
      bevelSegments: 2,
    });
    volume.rotateX(-Math.PI / 2);
    volume.computeVertexNormals();

    // Moquette velours avec léger retrait pour révéler le nez et le pourtour en bois verni
    const carpetFootprint = buildRiserFootprint(seatCount, spacing, curveF, aisleSplit, aisleWidthPct, 0.035);
    const carpet = new THREE.ExtrudeGeometry(carpetFootprint.shape, {
      depth: 0.025,
      bevelEnabled: true,
      bevelThickness: 0.006,
      bevelSize: 0.006,
      bevelSegments: 1,
    });
    carpet.rotateX(-Math.PI / 2);
    carpet.translate(0, h + 0.002, 0);
    carpet.computeVertexNormals();

    return {
      volume,
      carpet,
      x0: footprint.x0,
      x1: footprint.x1,
      zFront: footprint.zFront,
      zBack: footprint.zBack,
    };
  }, [seatCount, spacing, curveF, aisleSplit, aisleWidthPct, h]);

  useEffect(() => () => {
    volume.dispose();
    carpet.dispose();
  }, [volume, carpet]);

  const nosing = useMemo(() => {
    const pts: Array<[number, number, number]> = [];
    for (let i = 0; i <= 12; i += 1) {
      const x = x0 + ((x1 - x0) * i) / 12;
      pts.push([x, h + 0.015, zFront(x) + 0.015]);
    }
    return pts;
  }, [x0, x1, zFront, h]);

  const aisleGap = aisleSplit && seatCount >= 4
    ? spacing * (0.55 + Math.min(30, Math.max(5, aisleWidthPct)) / 20)
    : 0;

  const aisleCenterZ = rowArcZ(0, spacing, curveF) + (RISER_TREAD_M - RISER_FRONT_OVERHANG_M) / 2;
  const aisleDepth = RISER_FRONT_OVERHANG_M + RISER_TREAD_M - 0.04;

  return (
    <group>
      {/* Structure du gradin : bois sombre / chêne verni */}
      <mesh geometry={volume} receiveShadow castShadow>
        <meshStandardMaterial
          color={selectedTint ?? '#5c4e43'}
          map={wood}
          roughness={0.72}
          metalness={0.06}
        />
      </mesh>

      {/* Moquette cintrée de gradin */}
      <mesh geometry={carpet} receiveShadow>
        <meshStandardMaterial color={selectedTint ?? '#3b1220'} roughness={0.97} metalness={0} />
      </mesh>

      {/* Nez de marche laiton / or brossé le long du bord avant */}
      {nosing.map((pos, i) => (
        <mesh key={`nose-${i}`} position={pos} castShadow>
          <boxGeometry args={[Math.max(0.18, (x1 - x0) / 13), 0.02, 0.04]} />
          <meshStandardMaterial color="#c4a35a" metalness={0.65} roughness={0.32} />
        </mesh>
      ))}

      {/* Éclairage LED architectural encastré sous le nez de marche */}
      {Array.from({ length: 9 }).map((_, i) => {
        const x = x0 + 0.2 + ((x1 - x0 - 0.4) * i) / 8;
        const z = zFront(x) - 0.012;
        return (
          <mesh key={`led-${i}`} position={[x, h - 0.02, z]}>
            <boxGeometry args={[Math.max(0.18, (x1 - x0) / 10), 0.016, 0.018]} />
            <meshStandardMaterial
              color="#fef3c7"
              emissive="#f59e0b"
              emissiveIntensity={0.65}
              roughness={0.3}
            />
          </mesh>
        );
      })}

      {/* Liseré décoratif sur la contremarche avant */}
      {h >= 0.22 && Array.from({ length: 9 }).map((_, i) => {
        const x = x0 + 0.2 + ((x1 - x0 - 0.4) * i) / 8;
        const z = zFront(x) - 0.008;
        return (
          <mesh key={`kick-${i}`} position={[x, h * 0.45, z]} castShadow>
            <boxGeometry args={[Math.max(0.18, (x1 - x0) / 10), 0.02, 0.01]} />
            <meshStandardMaterial color="#b8934a" metalness={0.6} roughness={0.35} />
          </mesh>
        );
      })}

      {/* Allée centrale de circulation avec bande de moquette et bordures laiton */}
      {aisleGap > 0 && (
        <group position={[0, 0, aisleCenterZ]}>
          <mesh position={[0, h + 0.03, 0]} receiveShadow>
            <boxGeometry args={[aisleGap * 0.94, 0.02, aisleDepth]} />
            <meshStandardMaterial color="#2d0a14" roughness={0.95} />
          </mesh>
          {([-1, 1] as const).map((side) => (
            <mesh key={`aisle-edge-${side}`} position={[side * (aisleGap * 0.47), h + 0.034, 0]}>
              <boxGeometry args={[0.02, 0.016, aisleDepth]} />
              <meshStandardMaterial color="#c4a35a" metalness={0.65} roughness={0.3} />
            </mesh>
          ))}
          {/* Veilleuse de sécurité d'allée centrale */}
          <mesh position={[0, h + 0.02, -aisleDepth / 2 + 0.06]}>
            <boxGeometry args={[0.12, 0.02, 0.02]} />
            <meshStandardMaterial color="#fef08a" emissive="#eab308" emissiveIntensity={0.7} />
          </mesh>
        </group>
      )}

      {/* Garde-corps architecturaux latéraux complets (poteaux, main courante et lisse) */}
      {h > 0.28 && ([-1, 1] as const).map((side) => {
        const x = side === -1 ? x0 + 0.08 : x1 - 0.08;
        const zF = zFront(x) + 0.12;
        const zB = zBack(x) - 0.10;
        const zMid = (zF + zB) / 2;
        const railLength = Math.max(0.5, zB - zF);
        return (
          <group key={`rail-${side}`}>
            {/* 3 Poteaux verticaux : avant, milieu, arrière */}
            {[zF, zMid, zB].map((zPos, pIdx) => (
              <mesh key={`post-${side}-${pIdx}`} position={[x, h + 0.42, zPos]} castShadow>
                <cylinderGeometry args={[0.016, 0.018, 0.84, 10]} />
                <meshStandardMaterial color="#c5a059" metalness={0.7} roughness={0.25} />
              </mesh>
            ))}
            {/* Main courante supérieure */}
            <mesh position={[x, h + 0.84, zMid]} rotation={[Math.PI / 2, 0, 0]} castShadow>
              <cylinderGeometry args={[0.02, 0.02, railLength, 12]} />
              <meshStandardMaterial color="#e8d9b8" metalness={0.75} roughness={0.2} />
            </mesh>
            {/* Lisse intermédiaire de sécurité */}
            <mesh position={[x, h + 0.44, zMid]} rotation={[Math.PI / 2, 0, 0]} castShadow>
              <cylinderGeometry args={[0.012, 0.012, railLength, 8]} />
              <meshStandardMaterial color="#b8a48a" metalness={0.65} roughness={0.28} />
            </mesh>
          </group>
        );
      })}

      {/* Sécurité arrière sur les gradins hauts */}
      {h > 0.50 && (
        <group>
          {[-0.5, 0, 0.5].map((fraction, bIdx) => {
            const bx = x0 + (x1 - x0) * (0.5 + fraction * 0.4);
            return (
              <mesh key={`back-post-${bIdx}`} position={[bx, h + 0.38, zBack(bx) - 0.06]} castShadow>
                <cylinderGeometry args={[0.015, 0.016, 0.76, 8]} />
                <meshStandardMaterial color="#b8a48a" metalness={0.65} roughness={0.28} />
              </mesh>
            );
          })}
        </group>
      )}
    </group>
  );
}

/** Scène / podium avec jupe, bande LED et spots. */
export function EventStage({
  w,
  d,
  height,
  steps,
  map,
  baseColor,
  selected,
  kind,
  shape = 'rect',
  podiumStyle,
}: {
  w: number;
  d: number;
  height: number;
  steps: number;
  map: THREE.Texture | null;
  baseColor: string;
  selected: boolean;
  kind: 'stage' | 'podium';
  shape?: 'rect' | 'semiCircle';
  podiumStyle?: PodiumStyle;
}) {
  const stepCount = Math.max(1, Math.min(4, steps));
  const isStage = kind === 'stage';
  const radius = Math.max(w, d) * 0.5;
  const style = podiumStyle ?? 'speaker';
  const isCircular = kind === 'podium' && style === 'circular';
  const isCouple = kind === 'podium' && style === 'couple';
  const isRunway = kind === 'podium' && style === 'runway';
  const isBand = kind === 'podium' && style === 'bandRiser';
  const showLectern = kind === 'podium' && (style === 'speaker' || style === 'lectern');
  const wood = selected ? '#c7d2fe' : map ? '#ffffff' : baseColor;

  if (isCircular || isCouple) {
    const r = Math.min(w, d) * 0.5;
    return (
      <group>
        <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[r, r * 1.02, height, 36]} />
          <meshStandardMaterial color={wood} map={map ?? undefined} roughness={0.45} metalness={0.06} />
        </mesh>
        <mesh position={[0, height + 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <circleGeometry args={[r * 0.96, 36]} />
          <meshStandardMaterial color={selected ? '#e0e7ff' : '#f8fafc'} roughness={0.5} />
        </mesh>
        {isCouple ? (
          <>
            {([-0.22, 0.22] as const).map((side) => (
              <mesh key={side} position={[side * r, height + 0.08, r * 0.15]} castShadow>
                <sphereGeometry args={[0.08, 10, 10]} />
                <meshStandardMaterial color="#f4a4b8" roughness={0.65} />
              </mesh>
            ))}
            <mesh position={[0, height + 0.06, 0]} castShadow>
              <torusGeometry args={[0.16, 0.018, 8, 20]} />
              <meshStandardMaterial color="#d4af37" metalness={0.7} roughness={0.25} />
            </mesh>
          </>
        ) : null}
        <mesh position={[0, 0.05, r + 0.03]}>
          <boxGeometry args={[r * 1.2, 0.03, 0.03]} />
          <meshStandardMaterial color="#fbbf24" emissive="#d97706" emissiveIntensity={0.4} />
        </mesh>
      </group>
    );
  }

  if (isBand) {
    return (
      <group>
        {([-0.33, 0, 0.33] as const).map((side, i) => {
          const riserH = height * (0.55 + i * 0.22);
          return (
            <mesh key={side} position={[side * w * 0.34, riserH / 2, 0]} castShadow receiveShadow>
              <boxGeometry args={[w * 0.3, riserH, d * (0.72 + i * 0.08)]} />
              <meshStandardMaterial color={wood} map={map ?? undefined} roughness={0.5} metalness={0.08} />
            </mesh>
          );
        })}
        <mesh position={[0, 0.05, d * 0.5 + 0.04]}>
          <boxGeometry args={[w * 0.92, 0.03, 0.03]} />
          <meshStandardMaterial color="#fbbf24" emissive="#d97706" emissiveIntensity={0.4} />
        </mesh>
      </group>
    );
  }

  if (shape === 'semiCircle') {
    return (
      <group>
        <mesh position={[0, height / 2, 0]} rotation={[0, Math.PI, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[radius, radius, height, 32, 1, false, 0, Math.PI]} />
          <meshStandardMaterial
            color={selected ? '#c7d2fe' : map ? '#ffffff' : baseColor}
            map={map ?? undefined}
            roughness={0.45}
            metalness={0.06}
          />
        </mesh>
        <mesh position={[0, height + 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <circleGeometry args={[radius * 0.98, 32, 0, Math.PI]} />
          <meshStandardMaterial color={selected ? '#e0e7ff' : '#f8fafc'} roughness={0.55} />
        </mesh>
      </group>
    );
  }

  return (
    <group>
      {Array.from({ length: stepCount }).map((_, i) => {
        const stepH = height / stepCount;
        const shrink = 1 - i * 0.07;
        return (
          <group key={i} position={[0, stepH * i, (1 - shrink) * d * 0.1]}>
            <mesh position={[0, stepH / 2, 0]} castShadow receiveShadow>
              <boxGeometry args={[w * shrink, stepH * 0.92, d * shrink]} />
              <meshStandardMaterial
                color={selected ? '#c7d2fe' : map ? '#ffffff' : baseColor}
                map={map ?? undefined}
                roughness={0.5}
                metalness={0.08}
              />
            </mesh>
            <mesh position={[0, stepH + 0.012, d * shrink * 0.45]} castShadow>
              <boxGeometry args={[w * shrink * 0.98, 0.022, 0.045]} />
              <meshStandardMaterial color="#1c1917" roughness={0.9} />
            </mesh>
          </group>
        );
      })}
      {/* Jupe de scène */}
      <mesh position={[0, height * 0.35, d * 0.5 + 0.02]} castShadow>
        <boxGeometry args={[w * 0.98, height * 0.7, 0.04]} />
        <meshStandardMaterial
          color={isStage ? '#7f1d1d' : '#44403c'}
          roughness={0.75}
          metalness={0.05}
        />
      </mesh>
      {/* Bande LED avant */}
      <mesh position={[0, 0.06, d * 0.5 + 0.05]}>
        <boxGeometry args={[w * 0.9, 0.03, 0.03]} />
        <meshStandardMaterial
          color="#fbbf24"
          emissive="#d97706"
          emissiveIntensity={0.4}
          roughness={0.2}
          metalness={0.4}
        />
      </mesh>
      {/* Spots de scène */}
      {isStage && ([-0.35, 0, 0.35] as const).map((x, i) => (
        <group key={i} position={[x * w, height + 0.15, -d * 0.35]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.06, 0.08, 0.12, 12]} />
            <meshStandardMaterial color="#292524" metalness={0.6} roughness={0.35} />
          </mesh>
          <mesh position={[0, -0.08, 0.05]} rotation={[0.6, 0, 0]}>
            <coneGeometry args={[0.12, 0.35, 16]} />
            <meshStandardMaterial
              color="#fef3c7"
              transparent
              opacity={0.15}
              emissive="#fbbf24"
              emissiveIntensity={0.4}
              depthWrite={false}
            />
          </mesh>
          <pointLight position={[0, -0.2, 0.15]} intensity={0.35} color="#fde68a" distance={6} />
        </group>
      ))}
      {/* Rideau / fond léger pour grande scène */}
      {isStage && w > 3 && (
        <mesh position={[0, height + 1.1, -d * 0.48]} castShadow>
          <boxGeometry args={[w * 0.85, 2.2, 0.06]} />
          <meshStandardMaterial color="#450a0a" roughness={0.9} metalness={0.02} />
        </mesh>
      )}
      {isRunway ? (
        <>
          {([-0.48, 0.48] as const).map((side) => (
            <mesh key={side} position={[side * w, 0.05, 0]}>
              <boxGeometry args={[0.04, 0.03, d * 0.96]} />
              <meshStandardMaterial color="#f472b6" emissive="#ec4899" emissiveIntensity={0.7} />
            </mesh>
          ))}
        </>
      ) : null}
      {showLectern ? (
        <group position={[0, height, style === 'lectern' ? 0 : -d * 0.12]}>
          <mesh position={[0, 0.55, 0]} castShadow>
            <boxGeometry args={[0.52, 1.05, 0.28]} />
            <meshStandardMaterial color={selected ? '#c7d2fe' : '#3f2a1d'} roughness={0.45} />
          </mesh>
          <mesh position={[0, 1.12, 0.12]} rotation={[-0.35, 0, 0]} castShadow>
            <boxGeometry args={[0.62, 0.04, 0.38]} />
            <meshStandardMaterial color="#1c1917" roughness={0.4} />
          </mesh>
          <mesh position={[0, 1.42, 0.02]} castShadow>
            <cylinderGeometry args={[0.012, 0.012, 0.42, 8]} />
            <meshStandardMaterial color="#d4d4d8" metalness={0.7} roughness={0.25} />
          </mesh>
          <mesh position={[0, 1.64, 0.04]} rotation={[0.4, 0, 0]} castShadow>
            <cylinderGeometry args={[0.018, 0.03, 0.08, 10]} />
            <meshStandardMaterial color="#171717" roughness={0.4} />
          </mesh>
        </group>
      ) : null}
      {kind === 'podium' && style === 'honor' ? (
        <mesh position={[0, height + 0.38, 0]} castShadow receiveShadow>
          <boxGeometry args={[w * 0.72, 0.72, d * 0.42]} />
          <meshStandardMaterial color="#f5f0e8" roughness={0.4} />
        </mesh>
      ) : null}
    </group>
  );
}

/** Zone événement : piste, moquette, VIP. */
export function EventZoneSurface({
  w,
  h,
  thickness,
  material,
  zoneKind,
  color,
  selected,
  pickable,
}: {
  w: number;
  h: number;
  thickness: number;
  material?: ZoneMaterial;
  zoneKind?: ZoneKind;
  color?: string;
  selected: boolean;
  pickable: boolean;
}) {
  const mat = useMemo(() => resolveZoneMaterialMap(material), [material]);
  const isDance = material === 'vinyl' || material === 'led' || zoneKind === 'dance';
  const isCarpet = material === 'carpet' || zoneKind === 'carpet';
  const isVip = zoneKind === 'vip';
  const ledRef = useRef<THREE.MeshStandardMaterial>(null);

  useFrame(({ clock }) => {
    if (!ledRef.current || material !== 'led') return;
    const pulse = 0.28 + Math.sin(clock.elapsedTime * 1.8) * 0.18;
    ledRef.current.emissiveIntensity = pulse;
  });

  return (
    <group>
      <mesh
        receiveShadow
        castShadow={isCarpet}
        raycast={pickable ? undefined : () => null}
      >
        <boxGeometry args={[w, thickness, h]} />
        <meshStandardMaterial
          ref={material === 'led' ? ledRef : undefined}
          color={
            selected
              ? '#c7d2fe'
              : isDance && material !== 'led'
                ? '#ffffff'
                : (color ?? mat.color)
          }
          map={mat.map ?? undefined}
          roughness={mat.roughness}
          metalness={mat.metalness}
          emissive={mat.emissive ?? '#000000'}
          emissiveIntensity={mat.emissiveIntensity ?? 0}
        />
      </mesh>

      {/* Sous-couche / frange */}
      <mesh position={[0, -thickness * 0.15, 0]} receiveShadow>
        <boxGeometry args={[w + (isCarpet ? 0.12 : 0.08), thickness * 0.45, h + (isCarpet ? 0.12 : 0.08)]} />
        <meshStandardMaterial
          color={isCarpet ? '#0f172a' : isDance ? '#1c1917' : '#44403c'}
          roughness={isDance ? 0.55 : 0.92}
          metalness={isDance ? 0.12 : 0.05}
        />
      </mesh>

      {isDance && (
        <>
          {/* Bordure chrome / laiton */}
          {([
            [0, h / 2 + 0.015, w + 0.04, 0.05],
            [0, -h / 2 - 0.015, w + 0.04, 0.05],
            [w / 2 + 0.015, 0, 0.05, h + 0.04],
            [-w / 2 - 0.015, 0, 0.05, h + 0.04],
          ] as const).map(([x, z, bw, bd], i) => (
            <mesh key={`trim-${i}`} position={[x, thickness / 2 + 0.008, z]}>
              <boxGeometry args={[bw, 0.02, bd]} />
              <meshStandardMaterial
                color="#a8a29e"
                emissive="#000000"
                emissiveIntensity={0}
                roughness={0.35}
                metalness={0.75}
              />
            </mesh>
          ))}
          {/* LED ambre discrètes aux coins (ambiance club, pas piscine) */}
          {([
            [w / 2 - 0.08, h / 2 - 0.08],
            [-w / 2 + 0.08, h / 2 - 0.08],
            [w / 2 - 0.08, -h / 2 + 0.08],
            [-w / 2 + 0.08, -h / 2 + 0.08],
          ] as const).map(([x, z], i) => (
            <mesh key={`corner-${i}`} position={[x, thickness / 2 + 0.02, z]}>
              <boxGeometry args={[0.12, 0.03, 0.12]} />
              <meshStandardMaterial
                color="#fbbf24"
                emissive="#d97706"
                emissiveIntensity={0.55}
                roughness={0.3}
                metalness={0.4}
              />
            </mesh>
          ))}
          {/* Spot chaud au-dessus du centre (léger) */}
          <pointLight
            position={[0, 2.4, 0]}
            intensity={0.35}
            distance={Math.max(w, h) * 1.4}
            color="#fde68a"
            castShadow={false}
          />
        </>
      )}

      {isCarpet && (
        <>
          {/* Frange courte */}
          {([-1, 1] as const).map((side) => (
            <mesh key={side} position={[0, 0.005, side * (h / 2 + 0.04)]}>
              <boxGeometry args={[w * 0.95, 0.01, 0.06]} />
              <meshStandardMaterial color="#334155" roughness={1} />
            </mesh>
          ))}
        </>
      )}

      {isVip && (
        <>
          {/* Potelets + corde */}
          {([
            [-0.45, -0.45],
            [0.45, -0.45],
            [-0.45, 0.45],
            [0.45, 0.45],
          ] as const).map(([fx, fz], i) => (
            <group key={i} position={[fx * w, 0, fz * h]}>
              <mesh position={[0, 0.45, 0]} castShadow>
                <cylinderGeometry args={[0.03, 0.04, 0.9, 12]} />
                <meshStandardMaterial color="#d4af37" metalness={0.8} roughness={0.25} />
              </mesh>
              <mesh position={[0, 0.9, 0]} castShadow>
                <sphereGeometry args={[0.05, 12, 12]} />
                <meshStandardMaterial color="#fbbf24" metalness={0.85} roughness={0.2} />
              </mesh>
            </group>
          ))}
          {/* Corde approximative */}
          <mesh position={[0, 0.72, -h * 0.45]} castShadow>
            <boxGeometry args={[w * 0.88, 0.025, 0.025]} />
            <meshStandardMaterial color="#7f1d1d" roughness={0.7} />
          </mesh>
          <mesh position={[0, 0.72, h * 0.45]} castShadow>
            <boxGeometry args={[w * 0.88, 0.025, 0.025]} />
            <meshStandardMaterial color="#7f1d1d" roughness={0.7} />
          </mesh>
          <mesh position={[-w * 0.45, 0.72, 0]} castShadow>
            <boxGeometry args={[0.025, 0.025, h * 0.88]} />
            <meshStandardMaterial color="#7f1d1d" roughness={0.7} />
          </mesh>
          <mesh position={[w * 0.45, 0.72, 0]} castShadow>
            <boxGeometry args={[0.025, 0.025, h * 0.88]} />
            <meshStandardMaterial color="#7f1d1d" roughness={0.7} />
          </mesh>
        </>
      )}
    </group>
  );
}
