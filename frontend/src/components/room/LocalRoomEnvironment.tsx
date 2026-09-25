'use client';

import { useEffect } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

let cachedEnv: { renderer: THREE.WebGLRenderer; texture: THREE.Texture } | null = null;

/**
 * Reflets d'environnement calculés localement (aucun téléchargement HDRI).
 * Sert quand l'HDRI est désactivé (qualité brouillon, mobile) ou n'a pas pu être chargé :
 * sans lui, laiton, chrome, cristal et vernis n'ont rien à refléter et paraissent ternes.
 */
export function LocalRoomEnvironment({ intensity = 0.5 }: { intensity?: number }) {
  const get = useThree((s) => s.get);

  useEffect(() => {
    const { gl, scene } = get();
    if (!cachedEnv || cachedEnv.renderer !== gl) {
      cachedEnv?.texture.dispose();
      const pmrem = new THREE.PMREMGenerator(gl);
      const room = new RoomEnvironment();
      const texture = pmrem.fromScene(room, 0.04).texture;
      room.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        mesh.geometry?.dispose?.();
        const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
        else mat?.dispose?.();
      });
      pmrem.dispose();
      cachedEnv = { renderer: gl, texture };
    }
    const previous = scene.environment;
    const previousIntensity = scene.environmentIntensity;
    scene.environment = cachedEnv.texture;
    scene.environmentIntensity = intensity;
    return () => {
      if (scene.environment === cachedEnv?.texture) {
        scene.environment = previous;
        scene.environmentIntensity = previousIntensity;
      }
    };
  }, [get, intensity]);

  return null;
}
