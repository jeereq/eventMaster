'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { ZoneKind, ZoneMaterial } from '@/lib/roomLayoutUtils';
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
) {
  const firstX = rowSeatLocalX(0, seatCount, spacing, aisleSplit, aisleWidthPct);
  const lastX = rowSeatLocalX(seatCount - 1, seatCount, spacing, aisleSplit, aisleWidthPct);
  const pad = 0.42;
  const x0 = Math.min(firstX, lastX) - pad;
  const x1 = Math.max(firstX, lastX) + pad;
  const shape = new THREE.Shape();
  const zFront = (x: number) => rowArcZ(x, spacing, curveFactor) - RISER_FRONT_OVERHANG_M;
  const zBack = (x: number) => rowArcZ(x, spacing, curveFactor) + RISER_TREAD_M;

  shape.moveTo(x0, zFront(x0));
  for (let i = 1; i <= RISER_ARC_SEGMENTS; i += 1) {
    const x = x0 + ((x1 - x0) * i) / RISER_ARC_SEGMENTS;
    shape.lineTo(x, zFront(x));
  }
  for (let i = RISER_ARC_SEGMENTS; i >= 0; i -= 1) {
    const x = x0 + ((x1 - x0) * i) / RISER_ARC_SEGMENTS;
    shape.lineTo(x, zBack(x));
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

  const { volume, carpet, x0, x1, zFront } = useMemo(() => {
    const footprint = buildRiserFootprint(seatCount, spacing, curveF, aisleSplit, aisleWidthPct);
    const volume = new THREE.ExtrudeGeometry(footprint.shape, {
      depth: h,
      bevelEnabled: true,
      bevelThickness: 0.012,
      bevelSize: 0.012,
      bevelSegments: 1,
    });
    volume.rotateX(-Math.PI / 2);

    const carpetShape = footprint.shape.clone();
    const carpet = new THREE.ExtrudeGeometry(carpetShape, {
      depth: 0.028,
      bevelEnabled: false,
    });
    carpet.rotateX(-Math.PI / 2);
    carpet.translate(0, h + 0.002, 0);

    return { volume, carpet, x0: footprint.x0, x1: footprint.x1, zFront: footprint.zFront };
  }, [seatCount, spacing, curveF, aisleSplit, aisleWidthPct, h]);

  useEffect(() => () => {
    volume.dispose();
    carpet.dispose();
  }, [volume, carpet]);

  const nosing = useMemo(() => {
    const pts: Array<[number, number, number]> = [];
    for (let i = 0; i <= 10; i += 1) {
      const x = x0 + ((x1 - x0) * i) / 10;
      pts.push([x, h + 0.02, zFront(x) + 0.03]);
    }
    return pts;
  }, [x0, x1, zFront, h]);

  const aisleGap = aisleSplit && seatCount >= 4
    ? spacing * (0.55 + Math.min(30, Math.max(5, aisleWidthPct)) / 20)
    : 0;

  return (
    <group>
      <mesh geometry={volume} receiveShadow castShadow>
        <meshStandardMaterial
          color={selectedTint ?? '#6b5e52'}
          map={wood}
          roughness={0.74}
          metalness={0.04}
        />
      </mesh>
      <mesh geometry={carpet} receiveShadow>
        <meshStandardMaterial color={selectedTint ?? '#3b1220'} roughness={0.97} metalness={0} />
      </mesh>
      {nosing.map((pos, i) => (
        <mesh key={i} position={pos} castShadow>
          <boxGeometry args={[Math.max(0.18, (x1 - x0) / 11), 0.02, 0.05]} />
          <meshStandardMaterial color="#c4a35a" metalness={0.52} roughness={0.38} />
        </mesh>
      ))}
      {aisleGap > 0 && (
        <mesh position={[0, h + 0.03, rowArcZ(0, spacing, curveF) + 0.28]} receiveShadow>
          <boxGeometry args={[aisleGap * 0.92, 0.018, RISER_TREAD_M * 0.78]} />
          <meshStandardMaterial color="#d6c7a8" roughness={0.82} />
        </mesh>
      )}
      {h > 0.28 && ([-1, 1] as const).map((side) => {
        const x = side === -1 ? x0 + 0.06 : x1 - 0.06;
        const z = rowArcZ(x, spacing, curveF);
        return (
          <group key={side} position={[x, 0, z]}>
            <mesh position={[0, h + 0.38, 0]} castShadow>
              <cylinderGeometry args={[0.018, 0.02, 0.76, 10]} />
              <meshStandardMaterial color="#b8a48a" metalness={0.62} roughness={0.28} />
            </mesh>
            <mesh position={[0, h + 0.74, 0.22]} rotation={[0.18, 0, 0]} castShadow>
              <cylinderGeometry args={[0.014, 0.014, 0.7, 8]} />
              <meshStandardMaterial color="#e8d9b8" metalness={0.7} roughness={0.22} />
            </mesh>
          </group>
        );
      })}
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
}) {
  const stepCount = Math.max(1, Math.min(4, steps));
  const isStage = kind === 'stage';
  const radius = Math.max(w, d) * 0.5;

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
          color="#38bdf8"
          emissive="#0ea5e9"
          emissiveIntensity={0.65}
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
