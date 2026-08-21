'use client';

import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { ZoneKind, ZoneMaterial } from '@/lib/roomLayoutUtils';
import { getStairWoodMap, resolveZoneMaterialMap } from '@/lib/roomWebGLMaterials';

/** Gradin / rangée amphithéâtre. */
export function AmphitheaterRiser({
  seatCount,
  spacing,
  elevation,
  curve = 0,
  selected = false,
}: {
  seatCount: number;
  spacing: number;
  elevation: number;
  curve?: number;
  selected?: boolean;
}) {
  const wood = useMemo(() => getStairWoodMap(), []);
  const width = seatCount * spacing + 0.85;
  const depth = 1.35 + curve * 2.2;
  const h = Math.max(elevation, 0.14);
  const selectedTint = selected ? '#c7d2fe' : undefined;

  return (
    <group>
      {/* Structure béton / bois */}
      <mesh position={[0, h / 2, 0.22]} receiveShadow castShadow>
        <boxGeometry args={[width, h, depth]} />
        <meshStandardMaterial color={selectedTint ?? '#57534e'} map={wood} roughness={0.72} />
      </mesh>
      {/* Contremarche avant */}
      <mesh position={[0, h / 2, 0.22 + depth / 2]} castShadow>
        <boxGeometry args={[width, h, 0.07]} />
        <meshStandardMaterial color={selectedTint ?? '#3f3f46'} roughness={0.65} metalness={0.05} />
      </mesh>
      {/* Bande décorative */}
      <mesh position={[0, h * 0.75, 0.22 + depth / 2 + 0.02]}>
        <boxGeometry args={[width * 0.92, 0.04, 0.02]} />
        <meshStandardMaterial color="#d4af37" metalness={0.55} roughness={0.35} />
      </mesh>
      {/* Moquette de rangée */}
      <mesh position={[0, h + 0.018, 0.12]} receiveShadow>
        <boxGeometry args={[width - 0.2, 0.035, depth * 0.72]} />
        <meshStandardMaterial color="#1e293b" roughness={0.96} metalness={0} />
      </mesh>
      {/* Nez de marche avant */}
      <mesh position={[0, h + 0.01, 0.22 + depth * 0.28]} castShadow>
        <boxGeometry args={[width - 0.15, 0.025, 0.06]} />
        <meshStandardMaterial color="#0f172a" roughness={0.9} />
      </mesh>
      {/* Garde-corps latéraux si hauteur significative */}
      {h > 0.25 && ([-1, 1] as const).map((side) => (
        <group key={side} position={[side * (width / 2 - 0.08), 0, 0.15]}>
          <mesh position={[0, h + 0.35, 0]} castShadow>
            <cylinderGeometry args={[0.02, 0.02, 0.7, 10]} />
            <meshStandardMaterial color="#a8a29e" metalness={0.7} roughness={0.25} />
          </mesh>
          <mesh position={[0, h + 0.68, depth * 0.15]} rotation={[0.15, 0, 0]} castShadow>
            <cylinderGeometry args={[0.015, 0.015, depth * 0.7, 8]} />
            <meshStandardMaterial color="#d6d3d1" metalness={0.75} roughness={0.2} />
          </mesh>
        </group>
      ))}
      {/* Allée / séparateur central si grande rangée */}
      {seatCount >= 12 && (
        <mesh position={[0, h + 0.02, 0.1]} receiveShadow>
          <boxGeometry args={[0.45, 0.02, depth * 0.65]} />
          <meshStandardMaterial color="#e7e5e4" roughness={0.7} />
        </mesh>
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
}: {
  w: number;
  d: number;
  height: number;
  steps: number;
  map: THREE.Texture | null;
  baseColor: string;
  selected: boolean;
  kind: 'stage' | 'podium';
}) {
  const stepCount = Math.max(1, Math.min(4, steps));
  const isStage = kind === 'stage';

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
