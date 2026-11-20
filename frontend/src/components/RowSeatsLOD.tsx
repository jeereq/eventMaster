'use client';

import React, { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import type { ChairType, ChairStyle, SeatMaterial } from '@/lib/roomLayoutUtils';
import { resolveChairVisual } from '@/lib/roomWebGLMaterials';
import { CatalogueChair, ChairSelectionHalo } from '@/components/CatalogueFurnitureMeshes';
import type { RenderQualitySettings } from '@/lib/roomRenderQuality';
import { computeRowSeatPose, rowSeatCode } from '@/lib/roomAmphitheaterGeom';
import { TheaterSeatRow, type SeatPose } from '@/components/room/TheaterSeatRow';
import { PmrSpotMarker } from '@/components/room/PmrSpotMarker';

type Lod = RenderQualitySettings['rowChairLod'];

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
  chairSeatColor,
  chairFrameColor,
  chairImageUrl,
  selected,
  selectedSeatIndices = [],
  blockedSeatIndices = [],
  onSelectSeat,
  lod,
  castShadow,
  aisleSplit,
  aisleWidthPct,
  showSeatNumbers,
  rowName,
  pmrSeatIndices,
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
  chairSeatColor?: string;
  chairFrameColor?: string;
  chairImageUrl?: string;
  selected: boolean;
  selectedSeatIndices?: number[];
  blockedSeatIndices?: number[];
  onSelectSeat?: (seatIndex: number, mods?: { shiftKey?: boolean; metaKey?: boolean; ctrlKey?: boolean }) => void;
  lod: Lod;
  castShadow: boolean;
  aisleSplit?: boolean;
  aisleWidthPct?: number;
  showSeatNumbers?: boolean;
  rowName?: string;
  /** Places pour fauteuil roulant : le siège laisse la place à un marquage au sol. */
  pmrSeatIndices?: number[];
}) {
  const visual = useMemo(
    () => resolveChairVisual(chairType, chairStyle, seatMaterial, { seat: chairSeatColor, frame: chairFrameColor }),
    [chairType, chairStyle, seatMaterial, chairSeatColor, chairFrameColor],
  );
  const color = visual.seatColor;
  const frame = visual.frameColor;
  const picked = selectedSeatIndices;
  const blocked = useMemo(() => new Set(blockedSeatIndices), [blockedSeatIndices]);
  const pmrKey = (pmrSeatIndices ?? []).join(',');
  const pmr = useMemo(
    () => new Set((pmrSeatIndices ?? []).filter((i) => i >= 0 && i < count)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pmrKey, count],
  );
  const pmrSpots = pmr.size > 0 ? (
    <>
      {[...pmr].map((i) => {
        const p = computeRowSeatPose(i, count, spacing, curve, elevation, focusLocal, aisleSplit, aisleWidthPct);
        return <PmrSpotMarker key={`pmr-${i}`} position={[p.localX, p.y, p.localZ]} rotationY={p.faceY} />;
      })}
    </>
  ) : null;

  const emitSeat = (i: number, e: { stopPropagation: () => void; shiftKey: boolean; metaKey: boolean; ctrlKey: boolean }) => {
    if (!onSelectSeat || blocked.has(i)) return;
    e.stopPropagation();
    onSelectSeat(i, { shiftKey: e.shiftKey, metaKey: e.metaKey, ctrlKey: e.ctrlKey });
  };

  const seatRef = useRef<THREE.InstancedMesh>(null);
  const backRef = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    if (lod !== 'instanced') return;
    const dummy = new THREE.Object3D();
    for (let i = 0; i < count; i += 1) {
      const p = computeRowSeatPose(i, count, spacing, curve, elevation, focusLocal, aisleSplit, aisleWidthPct);
      dummy.scale.setScalar(pmr.has(i) ? 0 : 1);
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
  }, [lod, count, spacing, curve, elevation, focusLocal.x, focusLocal.z, aisleSplit, aisleWidthPct, pmr]);

  const numberLabel = useMemo(() => {
    if (!showSeatNumbers || (!selected && picked.length === 0) || count < 1) return null;
    if (picked.length === 1) {
      const p = computeRowSeatPose(picked[0], count, spacing, curve, elevation, focusLocal, aisleSplit, aisleWidthPct);
      return {
        mid: { x: p.localX, y: p.y + 0.98, z: p.localZ },
        text: rowSeatCode(rowName, picked[0]),
      };
    }
    const first = computeRowSeatPose(0, count, spacing, curve, elevation, focusLocal, aisleSplit, aisleWidthPct);
    const last = computeRowSeatPose(count - 1, count, spacing, curve, elevation, focusLocal, aisleSplit, aisleWidthPct);
    const mid = {
      x: (first.localX + last.localX) / 2,
      y: Math.max(first.y, last.y) + 0.98,
      z: (first.localZ + last.localZ) / 2,
    };
    const start = rowSeatCode(rowName, 0);
    const end = rowSeatCode(rowName, count - 1);
    return { mid, text: count === 1 ? start : `${start} – ${end}` };
  }, [
    showSeatNumbers,
    selected,
    picked,
    count,
    spacing,
    curve,
    elevation,
    focusLocal.x,
    focusLocal.z,
    aisleSplit,
    aisleWidthPct,
    rowName,
  ]);

  const numbers = numberLabel ? (
    <Html
      zIndexRange={[20, 0]}
      center
      distanceFactor={10}
      style={{ pointerEvents: 'none' }}
      position={[numberLabel.mid.x, numberLabel.mid.y, numberLabel.mid.z]}
    >
      <span className="block rounded bg-foreground/85 px-2 py-1 text-center text-xs font-semibold tabular-nums text-background shadow-sm">
        {numberLabel.text}
      </span>
    </Html>
  ) : null;

  // Fauteuils de salle : modèle capitonné instancié (joues partagées entre voisins, coque,
  // accoudoirs) à toutes les qualités : c’est la forme réelle d’un rang de théâtre ou de cinéma,
  // là où des chaises individuelles sur pieds donnaient un rendu de salle polyvalente.
  const upholsteredRow = chairType === 'THEATER' || chairType === 'ARMCHAIR' || chairStyle === 'cinema';
  const poses = useMemo<SeatPose[]>(
    () =>
      upholsteredRow
        ? Array.from({ length: count }, (_, i) =>
            computeRowSeatPose(i, count, spacing, curve, elevation, focusLocal, aisleSplit, aisleWidthPct),
          )
        : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [upholsteredRow, count, spacing, curve, elevation, focusLocal.x, focusLocal.z, aisleSplit, aisleWidthPct],
  );

  if (upholsteredRow) {
    // Les places PMR sont retirées du rang ; les index sélectionnés suivent les sièges restants.
    const kept = poses.map((_, i) => i).filter((i) => !pmr.has(i));
    const toKept = new Map(kept.map((orig, k) => [orig, k]));
    return (
      <group>
        <TheaterSeatRow
          poses={pmr.size ? kept.map((i) => poses[i]) : poses}
          spacing={spacing}
          seatColor={color}
          frameColor={frame}
          variant={chairStyle === 'cinema' ? 'cinema' : chairType === 'ARMCHAIR' ? 'lounge' : 'theater'}
          picked={pmr.size ? picked.filter((i) => toKept.has(i)).map((i) => toKept.get(i) as number) : picked}
          blocked={pmr.size ? new Set([...blocked].filter((i) => toKept.has(i)).map((i) => toKept.get(i) as number)) : blocked}
          castShadow={castShadow}
          onSeat={(i, e) => emitSeat(pmr.size ? kept[i] : i, e)}
        />
        {pmrSpots}
        {picked.map((i) => (
          <group key={`sel-${i}`} position={[poses[i]?.localX ?? 0, poses[i]?.y ?? 0, poses[i]?.localZ ?? 0]}>
            <ChairSelectionHalo selected />
          </group>
        ))}
        {numbers}
      </group>
    );
  }

  if (lod === 'full') {
    return (
      <group>
        {Array.from({ length: count }).map((_, i) => {
          const p = computeRowSeatPose(i, count, spacing, curve, elevation, focusLocal, aisleSplit, aisleWidthPct);
          if (pmr.has(i)) return null;
          const chairSelected = picked.includes(i);
          const chairBlocked = blocked.has(i);
          return (
            <group
              key={i}
              onClick={(e) => emitSeat(i, e)}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <CatalogueChair
                chairType={chairType}
                chairStyle={chairStyle}
                seatMaterial={seatMaterial}
                seatColor={chairSeatColor}
                frameColor={chairFrameColor}
                imageUrl={chairImageUrl}
                position={[p.localX, p.y, p.localZ]}
                rotationY={p.faceY}
                selected={chairSelected}
              />
              {chairBlocked ? (
                <mesh position={[p.localX, p.y + 0.55, p.localZ]} rotation={[0, p.faceY, 0]}>
                  <boxGeometry args={[0.42, 0.9, 0.42]} />
                  <meshStandardMaterial color="#0f172a" transparent opacity={0.28} />
                </mesh>
              ) : null}
            </group>
          );
        })}
        {pmrSpots}
        {numbers}
      </group>
    );
  }

  if (lod === 'simple') {
    return (
      <group>
        {Array.from({ length: count }).map((_, i) => {
          if (pmr.has(i)) return null;
          const p = computeRowSeatPose(i, count, spacing, curve, elevation, focusLocal, aisleSplit, aisleWidthPct);
          return (
            <group
              key={i}
              position={[p.localX, p.y, p.localZ]}
              rotation={[0, p.faceY, 0]}
              onClick={(e) => emitSeat(i, e)}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <ChairSelectionHalo selected={picked.includes(i)} />
              {/* Assise rembourrée */}
              <mesh position={[0, 0.44, 0.01]} castShadow={castShadow}>
                <boxGeometry args={[0.38, 0.08, 0.36]} />
                <meshStandardMaterial
                  color={blocked.has(i) ? '#64748b' : picked.includes(i) ? '#93c5fd' : color}
                  roughness={0.85}
                />
              </mesh>
              {/* Dossier rembourré */}
              <mesh position={[0, 0.70, -0.16]} castShadow={castShadow}>
                <boxGeometry args={[0.36, 0.44, 0.06]} />
                <meshStandardMaterial color={color} roughness={0.85} />
              </mesh>
              {/* Coque arrière de dossier */}
              <mesh position={[0, 0.70, -0.195]} castShadow={castShadow}>
                <boxGeometry args={[0.37, 0.44, 0.015]} />
                <meshStandardMaterial color="#1c1917" roughness={0.5} />
              </mesh>
              {/* Pied central et platine */}
              <mesh position={[0, 0.21, -0.02]} castShadow={castShadow}>
                <cylinderGeometry args={[0.025, 0.035, 0.42, 8]} />
                <meshStandardMaterial color={frame} metalness={0.55} roughness={0.35} />
              </mesh>
              <mesh position={[0, 0.01, -0.02]} receiveShadow>
                <cylinderGeometry args={[0.10, 0.12, 0.02, 10]} />
                <meshStandardMaterial color="#111827" metalness={0.65} roughness={0.3} />
              </mesh>
              {/* Accoudoirs latéraux */}
              {([-1, 1] as const).map((s) => (
                <group key={s}>
                  <mesh position={[s * 0.19, 0.48, -0.04]} castShadow={castShadow}>
                    <boxGeometry args={[0.025, 0.22, 0.04]} />
                    <meshStandardMaterial color={frame} metalness={0.5} roughness={0.35} />
                  </mesh>
                  <mesh position={[s * 0.19, 0.58, -0.04]} castShadow={castShadow}>
                    <boxGeometry args={[0.045, 0.025, 0.28]} />
                    <meshStandardMaterial color="#1c1917" roughness={0.8} />
                  </mesh>
                </group>
              ))}
            </group>
          );
        })}
        {pmrSpots}
        {numbers}
      </group>
    );
  }

  return (
    <group>
      <instancedMesh
        ref={seatRef}
        args={[undefined, undefined, count]}
        castShadow={castShadow}
        onClick={(e) => {
          if (e.instanceId == null) return;
          emitSeat(e.instanceId, e);
        }}
        onPointerDown={(e) => {
          e.stopPropagation();
        }}
      >
        <boxGeometry args={[0.4, 0.12, 0.4]} />
        <meshStandardMaterial color={color} roughness={0.85} />
      </instancedMesh>
      <instancedMesh ref={backRef} args={[undefined, undefined, count]} castShadow={castShadow}>
        <boxGeometry args={[0.38, 0.4, 0.06]} />
        <meshStandardMaterial color={color} roughness={0.85} />
      </instancedMesh>
      {picked.map((i) => {
        const p = computeRowSeatPose(i, count, spacing, curve, elevation, focusLocal, aisleSplit, aisleWidthPct);
        return (
          <group key={`sel-${i}`} position={[p.localX, p.y, p.localZ]}>
            <ChairSelectionHalo selected />
          </group>
        );
      })}
      {pmrSpots}
      {numbers}
    </group>
  );
}
