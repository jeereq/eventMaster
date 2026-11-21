'use client';

import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { SimulatedGuest } from '@/lib/roomGuestSimulation';
import { clampAvatarPitch, planSeatFlight } from '@/lib/roomAvatarView';
import { guestEyePose } from '@/components/room/GuestAvatarMeshes';

/** Regard libre de l'avatar : cap relatif au corps et inclinaison de la tête (rad). */
export interface AvatarLook {
  yaw: number;
  pitch: number;
}

/** Tête un peu baissée au départ : on voit la table et la salle, pas le plafond. */
export const AVATAR_START_PITCH = -0.12;

const MIN_FOV = 24;
const MAX_FOV = 80;

/**
 * Caméra posée dans les yeux d'un invité simulé.
 * Glisser tourne la tête, la molette (ou le pincement) zoome comme un regard qui se concentre.
 * Au changement d'invité, la caméra vole jusqu'à ses yeux : elle prend de la hauteur
 * au-dessus des tables, survole la salle puis redescend s'asseoir, comme dans une billetterie 3D.
 */
export default function AvatarEyeCamera({
  guest,
  lookRef,
  reduceMotion = false,
  danceTimeRef,
  ceilingM = null,
}: {
  guest: SimulatedGuest;
  lookRef: React.MutableRefObject<AvatarLook>;
  reduceMotion?: boolean;
  /** Horloge musicale des danseurs (même tempo que la foule). */
  danceTimeRef?: React.RefObject<number>;
  /** Hauteur sous plafond (m, depuis le sol de l'invité) : le vol reste dans la salle. Absent en plein air. */
  ceilingM?: number | null;
}) {
  const { camera, gl } = useThree();
  const target = useMemo(() => new THREE.Vector3(), []);
  const eye = useMemo(() => new THREE.Vector3(), []);
  const fromPos = useMemo(() => new THREE.Vector3(), []);
  const fromDir = useMemo(() => new THREE.Vector3(), []);
  const dir = useMemo(() => new THREE.Vector3(), []);
  const midDir = useMemo(() => new THREE.Vector3(), []);
  const finalDir = useMemo(() => new THREE.Vector3(), []);
  const p1 = useMemo(() => new THREE.Vector3(), []);
  const p2 = useMemo(() => new THREE.Vector3(), []);
  const transitionRef = useRef(1);
  const flightRef = useRef<{ durationS: number; peakY: number } | null>(null);
  const fovRef = useRef<number | null>(null);

  // Nouvel invité : on part de là où se trouve la caméra et on rejoint ses yeux.
  useLayoutEffect(() => {
    fromPos.copy(camera.position);
    camera.getWorldDirection(fromDir);
    transitionRef.current = reduceMotion ? 1 : 0;
    flightRef.current = null;
  }, [guest.id, camera, fromPos, fromDir, reduceMotion]);

  // Champ de vision rendu tel quel en sortant.
  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    if (!cam.isPerspectiveCamera) return undefined;
    const initial = cam.fov;
    fovRef.current = initial;
    return () => {
      cam.fov = initial;
      cam.updateProjectionMatrix();
    };
  }, [camera]);

  // Glisser pour tourner la tête (souris, stylet ou doigt), molette / pincement pour zoomer.
  useEffect(() => {
    const dom = gl.domElement;
    const pointers = new Map<number, { x: number; y: number }>();
    let pinch = 0;
    const setFov = (next: number) => {
      const cam = camera as THREE.PerspectiveCamera;
      if (!cam.isPerspectiveCamera) return;
      cam.fov = Math.max(MIN_FOV, Math.min(MAX_FOV, next));
      cam.updateProjectionMatrix();
    };
    const onDown = (e: PointerEvent) => {
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        pinch = Math.hypot(a.x - b.x, a.y - b.y);
      }
      try {
        dom.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    };
    const onMove = (e: PointerEvent) => {
      const prev = pointers.get(e.pointerId);
      if (!prev) return;
      const next = { x: e.clientX, y: e.clientY };
      pointers.set(e.pointerId, next);
      if (pointers.size >= 2) {
        const [a, b] = [...pointers.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinch > 0 && d > 0) setFov((camera as THREE.PerspectiveCamera).fov * (pinch / d));
        pinch = d;
        return;
      }
      // Même sens qu'une vue à 360° : on « attrape » la salle et on la fait tourner.
      const speed = ((camera as THREE.PerspectiveCamera).fov / 60) * (Math.PI / Math.max(320, dom.clientHeight));
      lookRef.current.yaw += (next.x - prev.x) * speed;
      lookRef.current.pitch = clampAvatarPitch(lookRef.current.pitch + (next.y - prev.y) * speed);
    };
    const onUp = (e: PointerEvent) => {
      pointers.delete(e.pointerId);
      if (pointers.size < 2) pinch = 0;
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setFov((camera as THREE.PerspectiveCamera).fov * Math.exp(e.deltaY * 0.0012));
    };
    dom.addEventListener('pointerdown', onDown);
    dom.addEventListener('pointermove', onMove);
    dom.addEventListener('pointerup', onUp);
    dom.addEventListener('pointercancel', onUp);
    dom.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      dom.removeEventListener('pointerdown', onDown);
      dom.removeEventListener('pointermove', onMove);
      dom.removeEventListener('pointerup', onUp);
      dom.removeEventListener('pointercancel', onUp);
      dom.removeEventListener('wheel', onWheel);
    };
  }, [gl, camera, lookRef]);

  // Après les contrôles d'orbite (désactivés) et le travelling : la caméra suit les yeux à chaque image.
  useFrame(({ clock }, delta) => {
    const pose = guestEyePose(guest, danceTimeRef ? danceTimeRef.current : clock.elapsedTime);
    eye.set(pose.x, pose.y, pose.z);
    const yaw = pose.yaw + lookRef.current.yaw;
    const pitch = lookRef.current.pitch;
    dir.set(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));

    if (transitionRef.current < 1) {
      // Plan de vol calculé à la première image, quand on connaît les yeux d'arrivée.
      const flight = flightRef.current
        ?? (flightRef.current = planSeatFlight(fromPos, eye, ceilingM != null ? guest.y + ceilingM - 0.35 : null));
      // Pas de saut sur un appareil lent : chaque image avance d’au plus 0,1 s de vol.
      transitionRef.current = Math.min(1, transitionRef.current + Math.min(delta, 0.1) / flight.durationS);
      const t = transitionRef.current;
      const k = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      // Courbe de Bézier cubique : deux points d'appui à l'altitude de croisière.
      p1.set(fromPos.x + (eye.x - fromPos.x) * 0.25, flight.peakY, fromPos.z + (eye.z - fromPos.z) * 0.25);
      p2.set(fromPos.x + (eye.x - fromPos.x) * 0.75, flight.peakY, fromPos.z + (eye.z - fromPos.z) * 0.75);
      const u = 1 - k;
      camera.position
        .copy(fromPos).multiplyScalar(u * u * u)
        .addScaledVector(p1, 3 * u * u * k)
        .addScaledVector(p2, 3 * u * k * k)
        .addScaledVector(eye, k * k * k);
      // Regard : on part de l'ancien cadrage, on fixe la place visée pendant le survol, puis on s'assoit face à la salle.
      finalDir.copy(dir);
      midDir.set(
        eye.x - (fromPos.x + eye.x) / 2,
        eye.y - flight.peakY,
        eye.z - (fromPos.z + eye.z) / 2,
      );
      if (midDir.lengthSq() < 1e-6) midDir.copy(finalDir);
      midDir.normalize();
      if (k < 0.5) dir.lerpVectors(fromDir, midDir, k * 2);
      else dir.lerpVectors(midDir, finalDir, (k - 0.5) * 2);
      if (dir.lengthSq() < 1e-6) dir.copy(finalDir);
      dir.normalize();
    } else {
      camera.position.copy(eye);
    }
    target.copy(camera.position).add(dir);
    camera.up.set(0, 1, 0);
    camera.lookAt(target);
  });

  return null;
}
