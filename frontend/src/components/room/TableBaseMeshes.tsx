'use client';

/**
 * Piètements de table au choix : pied central, 4 pieds bois fuselés, tréteaux,
 * pieds épingle en acier et croisillon. Origine au sol, au centre de la table ;
 * `topY` = dessous du plateau. Le plateau lui-même reste dessiné par la table.
 */

import { useMemo } from 'react';
import * as THREE from 'three';
import { SurfaceMat, type SurfaceFinish } from '@/components/room/SurfaceMaterial';
import { tableBaseDefaultColor, type TableBaseStyle } from '@/lib/roomLayoutUtils';

const UP = new THREE.Vector3(0, 1, 0);

/** Barre cylindrique d’un point à un autre (pieds inclinés, épingles, croisillons). */
function Rod({ from, to, r, r2, color, finish }: { from: [number, number, number]; to: [number, number, number]; r: number; r2?: number; color: string; finish: SurfaceFinish }) {
  const { pos, quat, len } = useMemo(() => {
    const a = new THREE.Vector3(...from);
    const b = new THREE.Vector3(...to);
    const dir = b.clone().sub(a);
    const length = dir.length();
    const q = new THREE.Quaternion().setFromUnitVectors(UP, dir.normalize());
    return { pos: a.add(b).multiplyScalar(0.5), quat: q, len: length };
  }, [from, to]);
  return (
    <mesh position={pos} quaternion={quat} castShadow>
      <cylinderGeometry args={[r2 ?? r, r, len, 10]} />
      <SurfaceMat color={color} finish={finish} roughness={finish === 'wood' ? 0.5 : 0.3} metalness={finish === 'wood' ? 0 : 0.85} />
    </mesh>
  );
}

function finishFor(base: TableBaseStyle, color: string): SurfaceFinish {
  if (base === 'fourLegs' || base === 'trestle') return 'wood';
  if (base === 'cross' && color.toLowerCase() === tableBaseDefaultColor.cross) return 'brass';
  return 'metal';
}

export function TableBase({
  base,
  w,
  d,
  topY,
  round,
  color,
}: {
  base: TableBaseStyle;
  /** Largeur (X) et profondeur (Z) du plateau, en mètres. */
  w: number;
  d: number;
  topY: number;
  round: boolean;
  color?: string;
}) {
  const c = color ?? tableBaseDefaultColor[base];
  const finish = finishFor(base, c);
  const h = Math.max(0.3, topY - 0.03);

  if (base === 'pedestal') {
    const foot = Math.min(0.42, Math.min(w, d) * 0.3);
    return (
      <group>
        <mesh position={[0, h / 2, 0]} castShadow>
          <cylinderGeometry args={[0.05, 0.075, h, 18]} />
          <SurfaceMat color={c} finish={finish} metalness={0.8} roughness={0.3} />
        </mesh>
        <mesh position={[0, h - 0.02, 0]} castShadow>
          <cylinderGeometry args={[0.16, 0.12, 0.04, 20]} />
          <SurfaceMat color={c} finish={finish} metalness={0.8} roughness={0.3} />
        </mesh>
        <mesh position={[0, 0.025, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[foot * 0.92, foot, 0.05, 32]} />
          <SurfaceMat color={c} finish={finish} metalness={0.8} roughness={0.32} />
        </mesh>
      </group>
    );
  }

  if (base === 'fourLegs') {
    // Pieds fuselés légèrement évasés + ceinture sous plateau.
    const px = round ? Math.min(w, d) * 0.3 : w / 2 - 0.08;
    const pz = round ? Math.min(w, d) * 0.3 : d / 2 - 0.08;
    const splay = 0.04;
    return (
      <group>
        {([-1, 1] as const).flatMap((sx) =>
          ([-1, 1] as const).map((sz) => (
            <Rod key={`${sx}${sz}`} from={[sx * (px + splay), 0, sz * (pz + splay)]} to={[sx * px, h, sz * pz]} r={0.022} r2={0.034} color={c} finish={finish} />
          )),
        )}
        {round ? (
          <mesh position={[0, h - 0.04, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <torusGeometry args={[Math.hypot(px, pz) * 0.98, 0.02, 8, 40]} />
            <SurfaceMat color={c} finish={finish} roughness={0.5} />
          </mesh>
        ) : (
          <mesh position={[0, h - 0.045, 0]} castShadow>
            <boxGeometry args={[px * 2, 0.08, pz * 2]} />
            <SurfaceMat color={c} finish={finish} roughness={0.5} />
          </mesh>
        )}
      </group>
    );
  }

  if (base === 'trestle') {
    // Deux chevalets en A le long de la longueur, reliés par une traverse.
    const alongX = w >= d;
    const L = alongX ? w : d;
    const T = alongX ? d : w;
    const at = L / 2 - Math.min(0.35, L * 0.18);
    const foot = T * 0.36;
    const top = T * 0.18;
    const place = (along: number, across: number, y: number): [number, number, number] => (alongX ? [along, y, across] : [across, y, along]);
    return (
      <group>
        {([-1, 1] as const).map((side) => (
          <group key={side}>
            <Rod from={place(side * at, -foot, 0)} to={place(side * at, -top, h)} r={0.024} color={c} finish={finish} />
            <Rod from={place(side * at, foot, 0)} to={place(side * at, top, h)} r={0.024} color={c} finish={finish} />
            <Rod from={place(side * at, -foot * 0.62, h * 0.35)} to={place(side * at, foot * 0.62, h * 0.35)} r={0.016} color={c} finish={finish} />
            <Rod from={place(side * at, -T * 0.42, h - 0.03)} to={place(side * at, T * 0.42, h - 0.03)} r={0.028} color={c} finish={finish} />
          </group>
        ))}
        <Rod from={place(-at, 0, h * 0.35)} to={place(at, 0, h * 0.35)} r={0.02} color={c} finish={finish} />
      </group>
    );
  }

  if (base === 'hairpin') {
    // Chaque pied : deux tiges qui se rejoignent au sol, en V.
    const px = round ? Math.min(w, d) * 0.3 : w / 2 - 0.1;
    const pz = round ? Math.min(w, d) * 0.3 : d / 2 - 0.1;
    const spread = 0.07;
    return (
      <group>
        {([-1, 1] as const).flatMap((sx) =>
          ([-1, 1] as const).map((sz) => {
            const foot: [number, number, number] = [sx * px, 0.01, sz * pz];
            return (
              <group key={`${sx}${sz}`}>
                <Rod from={foot} to={[sx * px - spread * sx, h, sz * pz]} r={0.006} color={c} finish={finish} />
                <Rod from={foot} to={[sx * px, h, sz * pz - spread * sz]} r={0.006} color={c} finish={finish} />
                <mesh position={[foot[0], 0.008, foot[2]]}>
                  <sphereGeometry args={[0.014, 10, 8]} />
                  <SurfaceMat color="#3f3f46" finish="plain" roughness={0.8} />
                </mesh>
              </group>
            );
          }),
        )}
      </group>
    );
  }

  // Croisillon : fût central sur une croix au sol (rond) ; deux X en bout (rectangulaire).
  if (round) {
    const arm = Math.min(w, d) * 0.36;
    return (
      <group>
        <mesh position={[0, h / 2, 0]} castShadow>
          <cylinderGeometry args={[0.045, 0.06, h, 16]} />
          <SurfaceMat color={c} finish={finish} metalness={0.85} roughness={0.3} />
        </mesh>
        {[0, Math.PI / 2].map((rot) => (
          <mesh key={rot} position={[0, 0.03, 0]} rotation={[0, rot + Math.PI / 4, 0]} castShadow receiveShadow>
            <boxGeometry args={[arm * 2, 0.05, 0.07]} />
            <SurfaceMat color={c} finish={finish} metalness={0.85} roughness={0.3} />
          </mesh>
        ))}
      </group>
    );
  }
  const alongX = w >= d;
  const L = alongX ? w : d;
  const T = alongX ? d : w;
  const at = L / 2 - Math.min(0.3, L * 0.15);
  const half = T * 0.38;
  const place = (along: number, across: number, y: number): [number, number, number] => (alongX ? [along, y, across] : [across, y, along]);
  return (
    <group>
      {([-1, 1] as const).map((side) => (
        <group key={side}>
          <Rod from={place(side * at, -half, 0.02)} to={place(side * at, half, h)} r={0.02} color={c} finish={finish} />
          <Rod from={place(side * at, half, 0.02)} to={place(side * at, -half, h)} r={0.02} color={c} finish={finish} />
        </group>
      ))}
      <Rod from={place(-at, 0, h * 0.5)} to={place(at, 0, h * 0.5)} r={0.016} color={c} finish={finish} />
    </group>
  );
}
