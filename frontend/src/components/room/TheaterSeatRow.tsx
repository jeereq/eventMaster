'use client';

import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import type { ThreeEvent } from '@react-three/fiber';

/**
 * Rangée de fauteuils de salle (théâtre / amphithéâtre) rendue en instances :
 * assise et dossier capitonnés à arêtes arrondies, coque arrière, joues latérales
 * partagées entre deux sièges avec accoudoir bois, plaque de numéro laiton.
 * Repère d’un siège : face vers +z, sol en y = 0.
 */

export type SeatPose = { localX: number; localZ: number; y: number; faceY: number };
export type TheaterSeatVariant = 'theater' | 'lounge';

const PICKED = '#93c5fd';
const BLOCKED = '#64748b';

type Part = { geometry: THREE.BufferGeometry; material: THREE.Material; matrices: THREE.Matrix4[]; colors?: string[] };

function rounded(w: number, h: number, d: number, r: number, rotX = 0, pos: [number, number, number] = [0, 0, 0]) {
  const g = new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2, h / 2, d / 2) * 0.999);
  if (rotX) g.rotateX(rotX);
  g.translate(...pos);
  return g;
}

function seatGeometries(variant: TheaterSeatVariant, spacing: number) {
  const w = Math.min(0.5, spacing - 0.06);
  if (variant === 'lounge') {
    return {
      cushion: rounded(w, 0.14, 0.52, 0.05, -0.05, [0, 0.42, 0.04]),
      back: rounded(w, 0.42, 0.14, 0.06, -0.22, [0, 0.68, -0.21]),
      shell: rounded(w + 0.02, 0.36, 0.03, 0.012, -0.22, [0, 0.62, -0.29]),
      pan: rounded(w, 0.05, 0.5, 0.012, 0, [0, 0.33, 0.02]),
      standard: rounded(0.06, 0.5, 0.6, 0.02, 0, [0, 0.25, -0.03]),
      arm: rounded(0.09, 0.05, 0.56, 0.02, 0, [0, 0.55, -0.02]),
      plate: rounded(0.07, 0.025, 0.006, 0.002, -0.22, [0, 0.78, -0.305]),
    };
  }
  return {
    cushion: rounded(w - 0.02, 0.1, 0.46, 0.04, -0.08, [0, 0.45, 0.05]),
    back: rounded(w - 0.01, 0.58, 0.1, 0.045, -0.2, [0, 0.8, -0.2]),
    shell: rounded(w + 0.005, 0.62, 0.03, 0.014, -0.2, [0, 0.8, -0.265]),
    pan: rounded(w - 0.03, 0.03, 0.42, 0.01, -0.08, [0, 0.385, 0.04]),
    standard: rounded(0.05, 0.6, 0.5, 0.018, 0, [0, 0.3, -0.07]),
    arm: rounded(0.075, 0.035, 0.46, 0.016, 0, [0, 0.62, -0.04]),
    plate: rounded(0.065, 0.024, 0.006, 0.002, -0.2, [0, 1.05, -0.338]),
  };
}

function Instanced({ part, castShadow, onPick }: { part: Part; castShadow: boolean; onPick?: (e: ThreeEvent<MouseEvent>) => void }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const col = new THREE.Color();
    part.matrices.forEach((m, i) => {
      mesh.setMatrixAt(i, m);
      if (part.colors) mesh.setColorAt(i, col.set(part.colors[i]));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [part]);
  if (!part.matrices.length) return null;
  return (
    <instancedMesh
      key={part.matrices.length}
      ref={ref}
      args={[part.geometry, part.material, part.matrices.length]}
      castShadow={castShadow}
      receiveShadow
      onClick={onPick}
      onPointerDown={onPick ? (e) => e.stopPropagation() : undefined}
    />
  );
}

export function TheaterSeatRow({
  poses,
  spacing,
  seatColor,
  frameColor,
  variant = 'theater',
  picked = [],
  blocked,
  castShadow = false,
  onSeat,
}: {
  poses: SeatPose[];
  spacing: number;
  seatColor: string;
  frameColor: string;
  variant?: TheaterSeatVariant;
  picked?: number[];
  blocked?: Set<number>;
  castShadow?: boolean;
  onSeat?: (index: number, e: ThreeEvent<MouseEvent>) => void;
}) {
  const geos = useMemo(() => seatGeometries(variant, spacing), [variant, spacing]);
  useLayoutEffect(() => () => Object.values(geos).forEach((g) => g.dispose()), [geos]);

  const mats = useMemo(() => {
    const upholstery = new THREE.MeshPhysicalMaterial({
      color: '#ffffff',
      roughness: 0.92,
      sheen: variant === 'theater' ? 0.8 : 0.4,
      sheenRoughness: 0.55,
      sheenColor: new THREE.Color('#ffffff'),
    });
    const shell = new THREE.MeshStandardMaterial({
      color: variant === 'theater' ? '#1c1917' : frameColor,
      roughness: variant === 'theater' ? 0.45 : 0.6,
      metalness: 0.05,
    });
    const standard = new THREE.MeshStandardMaterial({
      color: variant === 'theater' ? '#23201d' : frameColor,
      roughness: 0.5,
      metalness: variant === 'theater' ? 0.35 : 0.05,
    });
    const arm = new THREE.MeshStandardMaterial({ color: variant === 'theater' ? '#5b3a22' : frameColor, roughness: 0.45 });
    const brass = new THREE.MeshStandardMaterial({ color: '#c4a35a', metalness: 0.8, roughness: 0.25 });
    return { upholstery, shell, standard, arm, brass };
  }, [variant, frameColor]);
  useLayoutEffect(() => () => Object.values(mats).forEach((m) => m.dispose()), [mats]);

  const parts = useMemo(() => {
    const seatM: THREE.Matrix4[] = [];
    const colors: string[] = [];
    const standM: THREE.Matrix4[] = [];
    const q = new THREE.Quaternion();
    const up = new THREE.Vector3(0, 1, 0);
    const one = new THREE.Vector3(1, 1, 1);
    const pickedSet = new Set(picked);
    const at = (p: SeatPose, dx = 0) => {
      q.setFromAxisAngle(up, p.faceY);
      const off = new THREE.Vector3(dx, 0, 0).applyQuaternion(q);
      return new THREE.Matrix4().compose(new THREE.Vector3(p.localX + off.x, p.y, p.localZ + off.z), q.clone(), one);
    };
    poses.forEach((p, i) => {
      seatM.push(at(p));
      colors.push(blocked?.has(i) ? BLOCKED : pickedSet.has(i) ? PICKED : seatColor);
      // Joue gauche partagée avec le voisin ; joue droite en bout de bloc (allée ou fin de rang).
      standM.push(at(p, -spacing / 2));
      const next = poses[i + 1];
      const gap = next ? Math.hypot(next.localX - p.localX, next.localZ - p.localZ) : Infinity;
      if (gap > spacing * 1.35) standM.push(at(p, spacing / 2));
    });
    const list: Record<string, Part> = {
      cushion: { geometry: geos.cushion, material: mats.upholstery, matrices: seatM, colors },
      back: { geometry: geos.back, material: mats.upholstery, matrices: seatM, colors },
      shell: { geometry: geos.shell, material: mats.shell, matrices: seatM },
      pan: { geometry: geos.pan, material: mats.shell, matrices: seatM },
      plate: { geometry: geos.plate, material: mats.brass, matrices: seatM },
      standard: { geometry: geos.standard, material: mats.standard, matrices: standM },
      arm: { geometry: geos.arm, material: mats.arm, matrices: standM },
    };
    return list;
  }, [poses, spacing, picked, blocked, seatColor, geos, mats]);

  const pick = onSeat
    ? (e: ThreeEvent<MouseEvent>) => {
        if (e.instanceId == null) return;
        onSeat(e.instanceId, e);
      }
    : undefined;

  return (
    <group>
      <Instanced part={parts.cushion} castShadow={castShadow} onPick={pick} />
      <Instanced part={parts.back} castShadow={castShadow} onPick={pick} />
      <Instanced part={parts.shell} castShadow={castShadow} />
      <Instanced part={parts.pan} castShadow={false} />
      <Instanced part={parts.plate} castShadow={false} />
      <Instanced part={parts.standard} castShadow={castShadow} />
      <Instanced part={parts.arm} castShadow={castShadow} />
    </group>
  );
}
