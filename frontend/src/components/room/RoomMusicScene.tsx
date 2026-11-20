'use client';

/**
 * Musique, côté 3D : position de l'auditeur (la caméra), horloge des danseurs calée
 * sur le tempo, et ondes sonores qui battent autour des haut-parleurs qui jouent.
 */
import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Billboard } from '@react-three/drei';
import type { MusicEmitter } from '@/lib/roomMusic';

/** Oreilles de l'auditeur : position, regard et haut de la tête (repère monde). */
export interface MusicListener {
  x: number;
  y: number;
  z: number;
  fx: number;
  fy: number;
  fz: number;
  ux: number;
  uy: number;
  uz: number;
}

export function createMusicListener(): MusicListener {
  return { x: 0, y: 1.6, z: 0, fx: 0, fy: 0, fz: -1, ux: 0, uy: 1, uz: 0 };
}

const tmpDir = new THREE.Vector3();
const tmpUp = new THREE.Vector3();

/** Recopie la caméra (vue d'ensemble, visite ou yeux d'un invité) dans l'auditeur à chaque image. */
export function MusicListenerProbe({ listenerRef }: { listenerRef: React.RefObject<MusicListener> }) {
  useFrame(({ camera }) => {
    const l = listenerRef.current;
    if (!l) return;
    l.x = camera.position.x;
    l.y = camera.position.y;
    l.z = camera.position.z;
    camera.getWorldDirection(tmpDir);
    l.fx = tmpDir.x;
    l.fy = tmpDir.y;
    l.fz = tmpDir.z;
    tmpUp.copy(camera.up).applyQuaternion(camera.quaternion);
    l.ux = tmpUp.x;
    l.uy = tmpUp.y;
    l.uz = tmpUp.z;
  });
  return null;
}

/**
 * Horloge des danseurs : sans musique elle suit le temps réel (pas de base),
 * avec la musique elle accélère ou ralentit en douceur jusqu'au tempo du morceau.
 */
export function MusicDanceClock({ danceTimeRef, rate }: { danceTimeRef: React.RefObject<number>; rate: number }) {
  const current = useRef(rate);
  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1);
    current.current += (rate - current.current) * Math.min(1, dt * 2.5);
    danceTimeRef.current = (danceTimeRef.current ?? 0) + dt * current.current;
  });
  return null;
}

const RING_GEOMETRY = new THREE.RingGeometry(0.86, 1, 48);

/** Deux ondes par haut-parleur, qui partent à chaque temps et s'effacent en s'éloignant. */
function EmitterPulse({ emitter, beatRef, color }: { emitter: MusicEmitter; beatRef: React.RefObject<number>; color: string }) {
  const rings = useRef<Array<THREE.Mesh | null>>([]);
  const material = useMemo(
    () => [0, 1].map(() => new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, toneMapped: false })),
    [color],
  );
  useFrame(() => {
    const beats = beatRef.current ?? 0;
    rings.current.forEach((mesh, i) => {
      if (!mesh) return;
      const p = (beats + i * 0.5) % 1;
      const s = 0.25 + p * 1.1;
      mesh.scale.set(s, s, s);
      material[i].opacity = 0.55 * (1 - p) * (1 - p);
    });
  });
  return (
    <Billboard position={[emitter.x, emitter.y, emitter.z]}>
      {[0, 1].map((i) => (
        <mesh
          key={i}
          ref={(m) => { rings.current[i] = m; }}
          geometry={RING_GEOMETRY}
          material={material[i]}
          renderOrder={20}
          raycast={() => null}
        />
      ))}
    </Billboard>
  );
}

/** Ondes sonores sur les haut-parleurs actifs, au rythme de la musique. */
export function MusicEmitterPulses({ emitters, bpm, color = '#fbbf24' }: { emitters: MusicEmitter[]; bpm: number; color?: string }) {
  const beatRef = useRef(0);
  useFrame((_, delta) => {
    beatRef.current += Math.min(delta, 0.1) * (bpm / 60);
  });
  return (
    <group name="music-emitters">
      {emitters.map((e) => <EmitterPulse key={e.id} emitter={e} beatRef={beatRef} color={color} />)}
    </group>
  );
}
