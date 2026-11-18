'use client';

import React, { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import type { SimulatedGuest } from '@/lib/roomGuestSimulation';

/**
 * Avatars des invités simulés : silhouettes stylisées (tête, foulard ou cheveux,
 * buste, bras, jambes, robe ou boubou), assises, debout ou en train de danser.
 * Tout est dessiné en 4 maillages « instanciés » quel que soit le nombre d’invités,
 * pour garder la 3D fluide même avec plusieurs centaines de personnes.
 * Les avatars ne captent pas les clics : on sélectionne toujours la table ou la chaise.
 */

type PartKind = 'box' | 'torso' | 'skirt' | 'sphere';
const PART_KINDS: PartKind[] = ['box', 'torso', 'skirt', 'sphere'];

type Vec3 = [number, number, number];
interface PartSpec {
  kind: PartKind;
  pos: Vec3;
  rot?: Vec3;
  scale: Vec3;
  color: string;
}

/** Bras accroché à l’épaule : le centre du segment tourne autour de l’épaule. */
function arm(shoulder: Vec3, length: number, rot: Vec3, color: string): PartSpec {
  const e = new THREE.Euler(rot[0], rot[1], rot[2]);
  const offset = new THREE.Vector3(0, -length / 2, 0).applyEuler(e);
  return {
    kind: 'box',
    pos: [shoulder[0] + offset.x, shoulder[1] + offset.y, shoulder[2] + offset.z],
    rot,
    scale: [0.085, length, 0.1],
    color,
  };
}

function head(g: SimulatedGuest, y: number, z: number): PartSpec[] {
  const parts: PartSpec[] = [{ kind: 'sphere', pos: [0, y, z], scale: [0.1, 0.112, 0.105], color: g.skin }];
  if (g.headwrap) {
    // Foulard / gele : volume noué au-dessus de la tête.
    parts.push({ kind: 'sphere', pos: [0, y + 0.075, z - 0.012], scale: [0.132, 0.1, 0.13], color: g.headwrap });
  } else {
    parts.push({ kind: 'sphere', pos: [0, y + 0.04, z - 0.014], scale: [0.106, 0.08, 0.11], color: g.hair });
  }
  return parts;
}

/** Pièces d’un invité, dans son repère (sol à y = 0, regard vers +Z). */
function guestParts(g: SimulatedGuest, t: number): PartSpec[] {
  if (g.pose === 'seated') {
    const legColor = g.style === 'dress' ? g.skin : g.bottom;
    return [
      // Cuisses sur l’assise, tibias vers le sol.
      { kind: 'box', pos: [0, 0.53, 0.1], scale: [0.34, 0.13, 0.42], color: g.style === 'dress' ? g.outfit : g.bottom },
      { kind: 'box', pos: [0, 0.26, 0.3], scale: [0.27, 0.5, 0.12], color: legColor },
      { kind: 'torso', pos: [0, 0.86, -0.04], scale: [0.19, 0.56, 0.135], color: g.outfit },
      arm([-0.215, 1.08, -0.03], 0.46, [-0.55, 0, 0.06], g.outfit),
      arm([0.215, 1.08, -0.03], 0.46, [-0.55, 0, -0.06], g.outfit),
      ...head(g, 1.255, -0.03),
    ];
  }
  const dancing = g.pose === 'dancing';
  const beat = dancing ? Math.sin(t * 4.2 + g.phase) : 0;
  const lift = dancing ? Math.abs(beat) * 0.05 : 0;
  // Bras levés et balancés pour les danseurs, le long du corps sinon.
  const armSwing = dancing ? 2.1 + beat * 0.45 : 0.1;
  const parts: PartSpec[] = [
    { kind: 'torso', pos: [0, 1.24 + lift, 0], scale: [0.19, 0.5, 0.13], color: g.outfit },
    arm([-0.225, 1.46 + lift, 0], 0.52, [0, 0, -armSwing], g.outfit),
    arm([0.225, 1.46 + lift, 0], 0.52, [0, 0, armSwing], g.outfit),
    ...head(g, 1.625 + lift, 0),
  ];
  if (g.style === 'suit') {
    const step = dancing ? Math.sin(t * 4.2 + g.phase) * 0.18 : 0;
    parts.push(
      { kind: 'box', pos: [-0.085, 0.43 + lift, 0], rot: [step, 0, 0], scale: [0.12, 0.86, 0.14], color: g.bottom },
      { kind: 'box', pos: [0.085, 0.43 + lift, 0], rot: [-step, 0, 0], scale: [0.12, 0.86, 0.14], color: g.bottom },
    );
  } else if (g.style === 'dress') {
    parts.push(
      { kind: 'skirt', pos: [0, 0.72 + lift, 0], scale: [0.25, 0.62, 0.22], color: g.outfit },
      { kind: 'box', pos: [-0.07, 0.22 + lift, 0], scale: [0.09, 0.44, 0.1], color: g.skin },
      { kind: 'box', pos: [0.07, 0.22 + lift, 0], scale: [0.09, 0.44, 0.1], color: g.skin },
    );
  } else {
    // Boubou : robe longue jusqu’aux chevilles.
    parts.push({ kind: 'skirt', pos: [0, 0.6 + lift, 0], scale: [0.27, 1.04, 0.24], color: g.outfit });
  }
  return parts;
}

let sharedGeometries: Record<PartKind, THREE.BufferGeometry> | null = null;
function geometries(): Record<PartKind, THREE.BufferGeometry> {
  if (!sharedGeometries) {
    sharedGeometries = {
      // Arêtes très arrondies : bras et jambes en forme de « pilule », pas de blocs.
      box: new RoundedBoxGeometry(1, 1, 1, 3, 0.4),
      // Buste légèrement plus étroit à la taille qu’aux épaules.
      torso: new THREE.CylinderGeometry(1, 0.82, 1, 12),
      skirt: new THREE.CylinderGeometry(0.55, 1, 1, 14),
      sphere: new THREE.SphereGeometry(1, 14, 10),
    };
  }
  return sharedGeometries;
}

const noRaycast = () => null;

type CrowdRefs = Record<PartKind, React.RefObject<THREE.InstancedMesh | null>>;

interface Scratch {
  guest: THREE.Matrix4;
  part: THREE.Matrix4;
  pos: THREE.Vector3;
  quat: THREE.Quaternion;
  scale: THREE.Vector3;
  euler: THREE.Euler;
  color: THREE.Color;
  up: THREE.Vector3;
}

function makeScratch(): Scratch {
  return {
    guest: new THREE.Matrix4(),
    part: new THREE.Matrix4(),
    pos: new THREE.Vector3(),
    quat: new THREE.Quaternion(),
    scale: new THREE.Vector3(),
    euler: new THREE.Euler(),
    color: new THREE.Color(),
    up: new THREE.Vector3(0, 1, 0),
  };
}

/** Écrit la pose (et, au besoin, la couleur) de chaque pièce dans les maillages instanciés. */
function writeCrowd(guests: SimulatedGuest[], refs: CrowdRefs, s: Scratch, t: number, withColors: boolean) {
  const idx: Record<PartKind, number> = { box: 0, torso: 0, skirt: 0, sphere: 0 };
  for (const g of guests) {
    const sway = g.pose === 'dancing' ? Math.sin(t * 1.6 + g.phase) * 0.45 : 0;
    s.quat.setFromAxisAngle(s.up, g.rotY + sway);
    s.guest.compose(s.pos.set(g.x, g.y, g.z), s.quat, s.scale.setScalar(g.scale));
    for (const p of guestParts(g, t)) {
      const mesh = refs[p.kind].current;
      if (!mesh) continue;
      s.euler.set(p.rot?.[0] ?? 0, p.rot?.[1] ?? 0, p.rot?.[2] ?? 0);
      s.part.compose(
        s.pos.set(p.pos[0], p.pos[1], p.pos[2]),
        s.quat.setFromEuler(s.euler),
        s.scale.set(p.scale[0], p.scale[1], p.scale[2]),
      );
      s.part.premultiply(s.guest);
      const i = idx[p.kind];
      mesh.setMatrixAt(i, s.part);
      if (withColors) mesh.setColorAt(i, s.color.set(p.color));
      idx[p.kind] = i + 1;
    }
  }
  for (const kind of PART_KINDS) {
    const mesh = refs[kind].current;
    if (!mesh) continue;
    mesh.instanceMatrix.needsUpdate = true;
    if (withColors && mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }
}

function GuestCrowd({
  guests,
  animate,
  castShadow,
}: {
  guests: SimulatedGuest[];
  animate: boolean;
  castShadow: boolean;
}) {
  const geo = geometries();
  const material = useMemo(() => new THREE.MeshStandardMaterial({ roughness: 0.78, metalness: 0.02 }), []);
  useLayoutEffect(() => () => material.dispose(), [material]);
  const boxRef = useRef<THREE.InstancedMesh>(null);
  const torsoRef = useRef<THREE.InstancedMesh>(null);
  const skirtRef = useRef<THREE.InstancedMesh>(null);
  const sphereRef = useRef<THREE.InstancedMesh>(null);
  const refs = useMemo<CrowdRefs>(() => ({ box: boxRef, torso: torsoRef, skirt: skirtRef, sphere: sphereRef }), []);
  const scratch = useMemo(() => makeScratch(), []);
  const counts = useMemo(() => {
    const c: Record<PartKind, number> = { box: 0, torso: 0, skirt: 0, sphere: 0 };
    for (const g of guests) for (const p of guestParts(g, 0)) c[p.kind] += 1;
    return c;
  }, [guests]);

  // Les maillages sont recréés quand le nombre de pièces change : on réécrit tout à ce moment-là.
  useLayoutEffect(() => {
    writeCrowd(guests, refs, scratch, 0, true);
  }, [guests, counts, refs, scratch]);

  useFrame(({ clock }) => {
    if (animate) writeCrowd(guests, refs, scratch, clock.elapsedTime, false);
  });

  return (
    <>
      {PART_KINDS.map((kind) => (counts[kind] > 0 ? (
        <instancedMesh
          key={`${kind}-${counts[kind]}`}
          ref={refs[kind]}
          args={[geo[kind], material, counts[kind]]}
          castShadow={castShadow}
          frustumCulled={false}
          raycast={noRaycast}
        />
      ) : null))}
    </>
  );
}

/** Invités simulés : assis et debout (fixes) + danseurs (animés). */
export const GuestAvatars = React.memo(function GuestAvatars({
  guests,
  animate = true,
  castShadow = true,
}: {
  guests: SimulatedGuest[];
  animate?: boolean;
  castShadow?: boolean;
}) {
  const still = useMemo(() => guests.filter((g) => g.pose !== 'dancing'), [guests]);
  const dancers = useMemo(() => guests.filter((g) => g.pose === 'dancing'), [guests]);
  return (
    <group name="simulated-guests">
      {still.length > 0 ? <GuestCrowd guests={still} animate={false} castShadow={castShadow} /> : null}
      {dancers.length > 0 ? <GuestCrowd guests={dancers} animate={animate} castShadow={castShadow} /> : null}
    </group>
  );
});
