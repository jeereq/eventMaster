'use client';

import React, { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { ChairType, ChairStyle, SeatMaterial } from '@/lib/roomLayoutUtils';
import { resolveChairVisual } from '@/lib/roomWebGLMaterials';
import { CatalogueChair } from '@/components/CatalogueFurnitureMeshes';
import type { RenderQualitySettings } from '@/lib/roomRenderQuality';

type Lod = RenderQualitySettings['rowChairLod'];

function seatPose(
  i: number,
  count: number,
  spacing: number,
  curve: number,
  elevation: number,
  focusLocal: { x: number; z: number },
) {
  const t = i - (count - 1) / 2;
  const localX = t * spacing;
  const localZ = curve * (t * t) * 0.08;
  const faceY = Math.atan2(focusLocal.x - localX, focusLocal.z - localZ);
  return { localX, localZ, y: elevation, faceY };
}

/** Rangée de sièges avec LOD / instancing selon la qualité. */
export function RowSeatsLOD({
  count,
  spacing,
  curve,
  elevation,
  focusLocal,
  chairType,
  chairStyle,
  seatMaterial,
  chairImageUrl,
  selected,
  lod,
  castShadow,
}: {
  count: number;
  spacing: number;
  curve: number;
  elevation: number;
  /** Focus en coords locales de la rangée (déjà transformé). */
  focusLocal: { x: number; z: number };
  chairType: ChairType;
  chairStyle?: ChairStyle;
  seatMaterial?: SeatMaterial;
  chairImageUrl?: string;
  selected: boolean;
  lod: Lod;
  castShadow: boolean;
}) {
  const visual = useMemo(
    () => resolveChairVisual(chairType, chairStyle, seatMaterial),
    [chairType, chairStyle, seatMaterial],
  );
  const color = selected ? '#a5b4fc' : visual.seatColor;
  const frame = visual.frameColor;

  const seatRef = useRef<THREE.InstancedMesh>(null);
  const backRef = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    if (lod !== 'instanced') return;
    const dummy = new THREE.Object3D();
    for (let i = 0; i < count; i += 1) {
      const p = seatPose(i, count, spacing, curve, elevation, focusLocal);
      if (seatRef.current) {
        dummy.position.set(p.localX, p.y + 0.45, p.localZ);
        dummy.rotation.set(0, p.faceY, 0);
        dummy.updateMatrix();
        seatRef.current.setMatrixAt(i, dummy.matrix);
      }
      if (backRef.current) {
        dummy.position.set(p.localX, p.y + 0.72, p.localZ);
        dummy.rotation.set(0, p.faceY, 0);
        dummy.translateZ(-0.16);
        dummy.updateMatrix();
        backRef.current.setMatrixAt(i, dummy.matrix);
      }
    }
    if (seatRef.current) seatRef.current.instanceMatrix.needsUpdate = true;
    if (backRef.current) backRef.current.instanceMatrix.needsUpdate = true;
  }, [lod, count, spacing, curve, elevation, focusLocal.x, focusLocal.z]);

  if (lod === 'full') {
    return (
      <>
        {Array.from({ length: count }).map((_, i) => {
          const p = seatPose(i, count, spacing, curve, elevation, focusLocal);
          return (
            <CatalogueChair
              key={i}
              chairType={chairType}
              chairStyle={chairStyle}
              seatMaterial={seatMaterial}
              imageUrl={chairImageUrl}
              position={[p.localX, p.y, p.localZ]}
              rotationY={p.faceY}
              selected={selected}
            />
          );
        })}
      </>
    );
  }

  if (lod === 'simple') {
    return (
      <>
        {Array.from({ length: count }).map((_, i) => {
          const p = seatPose(i, count, spacing, curve, elevation, focusLocal);
          return (
            <group key={i} position={[p.localX, p.y, p.localZ]} rotation={[0, p.faceY, 0]}>
              <mesh position={[0, 0.42, 0]} castShadow={castShadow}>
                <boxGeometry args={[0.38, 0.08, 0.38]} />
                <meshStandardMaterial color={color} roughness={0.85} />
              </mesh>
              <mesh position={[0, 0.68, -0.16]} castShadow={castShadow}>
                <boxGeometry args={[0.36, 0.42, 0.05]} />
                <meshStandardMaterial color={color} roughness={0.85} />
              </mesh>
              {([-1, 1] as const).map((s) => (
                <mesh key={s} position={[s * 0.14, 0.22, 0.12]} castShadow={castShadow}>
                  <cylinderGeometry args={[0.018, 0.02, 0.42, 6]} />
                  <meshStandardMaterial color={frame} metalness={0.4} roughness={0.4} />
                </mesh>
              ))}
            </group>
          );
        })}
      </>
    );
  }

  // instanced
  return (
    <group>
      <instancedMesh ref={seatRef} args={[undefined, undefined, count]} castShadow={castShadow}>
        <boxGeometry args={[0.4, 0.12, 0.4]} />
        <meshStandardMaterial color={color} roughness={0.85} />
      </instancedMesh>
      <instancedMesh ref={backRef} args={[undefined, undefined, count]} castShadow={castShadow}>
        <boxGeometry args={[0.38, 0.4, 0.06]} />
        <meshStandardMaterial color={color} roughness={0.85} />
      </instancedMesh>
    </group>
  );
}
