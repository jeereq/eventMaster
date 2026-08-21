'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { RoomLayoutBlueprint } from '@/lib/roomLayoutUtils';
import { buildRoomWalkthrough, type WalkthroughWaypoint } from '@/lib/roomWalkthrough';

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function lerpVec3(
  out: THREE.Vector3,
  a: [number, number, number],
  b: [number, number, number],
  t: number,
) {
  out.set(
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  );
}

export default function RoomWalkthroughCamera({
  blueprint,
  active,
  onProgress,
  onComplete,
}: {
  blueprint: RoomLayoutBlueprint;
  active: boolean;
  onProgress?: (label: string, progress01: number) => void;
  onComplete?: () => void;
}) {
  const { camera } = useThree();
  const waypoints = useMemo(() => buildRoomWalkthrough(blueprint), [blueprint]);
  const elapsedRef = useRef(0);
  const doneRef = useRef(false);
  const pos = useMemo(() => new THREE.Vector3(), []);
  const look = useMemo(() => new THREE.Vector3(), []);
  const lastLabelRef = useRef('');

  useEffect(() => {
    if (!active) return;
    elapsedRef.current = 0;
    doneRef.current = false;
    lastLabelRef.current = '';
    const first = waypoints[0];
    if (first) {
      camera.position.set(...first.position);
      camera.lookAt(...first.lookAt);
    }
  }, [active, waypoints, camera]);

  useFrame((_, delta) => {
    if (!active || doneRef.current || waypoints.length < 2) return;
    elapsedRef.current += delta;
    const t = elapsedRef.current;

    let acc = 0;
    let from: WalkthroughWaypoint = waypoints[0];
    let to: WalkthroughWaypoint = waypoints[1];
    let segT = 0;
    let found = false;
    let total = 0;
    for (const w of waypoints) total += w.duration;

    for (let i = 0; i < waypoints.length - 1; i += 1) {
      const dur = waypoints[i + 1].duration;
      if (t <= acc + dur) {
        from = waypoints[i];
        to = waypoints[i + 1];
        segT = easeInOutCubic(Math.min(1, Math.max(0, (t - acc) / dur)));
        found = true;
        break;
      }
      acc += dur;
    }

    if (!found) {
      const last = waypoints[waypoints.length - 1];
      camera.position.set(...last.position);
      camera.lookAt(...last.lookAt);
      doneRef.current = true;
      onProgress?.(last.label ?? 'Fin', 1);
      onComplete?.();
      return;
    }

    lerpVec3(pos, from.position, to.position, segT);
    lerpVec3(look, from.lookAt, to.lookAt, segT);
    camera.position.copy(pos);
    camera.lookAt(look);

    const label = to.label ?? from.label ?? 'Visite';
    const progress = Math.min(1, t / Math.max(0.01, total));
    const progressBucket = Math.floor(progress * 20);
    const key = `${label}|${progressBucket}`;
    if (key !== lastLabelRef.current) {
      lastLabelRef.current = key;
      onProgress?.(label, progress);
    }
  });

  return null;
}
