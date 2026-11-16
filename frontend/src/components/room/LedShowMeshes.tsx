'use client';

/**
 * Jeux de lumière LED en 3D : uplights au pied des murs (avec leur halo sur le mur) et bandeau
 * LED en corniche tout autour de la salle. Couleurs et intensités viennent de `ledColorAt`,
 * appliquées à chaque image ; pièces identiques dessinées en instances (un appel par famille).
 */

import React, { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { ledColorAt, type LedShowSettings } from '@/lib/roomLedShow';

/** Face intérieure d’un mur, en mètres (repère monde), avec sa normale vers la pièce. */
export type LedWallFace = { ax: number; az: number; bx: number; bz: number; nx: number; nz: number; y0: number; heightM: number };

let gradientCache: { up: THREE.Texture; spot: THREE.Texture } | null = null;
/** Dégradés d’opacité : vertical (bandeau) et en fuseau (halo d’uplight). */
function gradients() {
  if (gradientCache || typeof document === 'undefined') return gradientCache;
  const make = (draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void) => {
    const c = document.createElement('canvas');
    c.width = 64;
    c.height = 128;
    const ctx = c.getContext('2d');
    if (ctx) draw(ctx, c.width, c.height);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.NoColorSpace;
    return t;
  };
  // Masques en niveaux de gris opaques : `alphaMap` lit le canal vert, pas l’alpha du canvas.
  const up = make((ctx, w, h) => {
    const g = ctx.createLinearGradient(0, h, 0, 0);
    g.addColorStop(0, 'rgb(255,255,255)');
    g.addColorStop(0.3, 'rgb(90,90,90)');
    g.addColorStop(0.7, 'rgb(20,20,20)');
    g.addColorStop(1, 'rgb(0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });
  const spot = make((ctx, w, h) => {
    // Fuseau : intense et serré au pied (bas du canvas), s’élargit et s’efface vers le haut.
    const img = ctx.createImageData(w, h);
    for (let y = 0; y < h; y += 1) {
      const fromBottom = 1 - y / (h - 1); // 0 au pied, 1 en haut
      const spread = 0.22 + 0.7 * Math.sqrt(fromBottom);
      const vertical = Math.pow(1 - fromBottom, 1.8);
      for (let x = 0; x < w; x += 1) {
        const dx = Math.abs(x / (w - 1) - 0.5) * 2;
        const lateral = Math.exp(-((dx / spread) ** 2) * 2.4);
        const v = Math.round(Math.min(1, lateral * vertical) * 255);
        const i = (y * w + x) * 4;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
        img.data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  });
  gradientCache = { up, spot };
  return gradientCache;
}

type Piece = { x: number; y: number; z: number; rotY: number; len: number; index: number };

function useInstanced(ref: React.RefObject<THREE.InstancedMesh | null>, pieces: Piece[], scale: (p: Piece) => [number, number, number]) {
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const white = new THREE.Color(1, 1, 1);
    pieces.forEach((p, i) => {
      e.set(0, p.rotY, 0);
      q.setFromEuler(e);
      m.compose(new THREE.Vector3(p.x, p.y, p.z), q, new THREE.Vector3(...scale(p)));
      mesh.setMatrixAt(i, m);
      mesh.setColorAt(i, white);
    });
    mesh.count = pieces.length;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [ref, pieces, scale]);
}

export function LedShowLights({ show, faces, maxPointLights = 6 }: { show: LedShowSettings; faces: LedWallFace[]; maxPointLights?: number }) {
  const tex = gradients();

  // Bandeau : morceaux de ~0,5 m pour que le chenillard et l’arc-en-ciel courent le long des murs.
  const strip = useMemo(() => {
    if (!show.cove) return [] as Piece[];
    const out: Piece[] = [];
    let index = 0;
    for (const f of faces) {
      const len = Math.hypot(f.bx - f.ax, f.bz - f.az);
      const n = Math.max(1, Math.round(len / 0.5));
      const rotY = -Math.atan2(f.bz - f.az, f.bx - f.ax);
      for (let k = 0; k < n; k += 1) {
        const t = (k + 0.5) / n;
        out.push({
          x: f.ax + (f.bx - f.ax) * t + f.nx * 0.05,
          y: f.y0 + f.heightM - 0.22,
          z: f.az + (f.bz - f.az) * t + f.nz * 0.05,
          rotY,
          len: len / n,
          index: index++,
        });
      }
    }
    return out;
  }, [faces, show.cove]);

  // Uplights : un tous les ~2,8 m, décollés du mur de 30 cm.
  const ups = useMemo(() => {
    if (!show.uplights) return [] as Piece[];
    const out: Piece[] = [];
    let index = 0;
    for (const f of faces) {
      const len = Math.hypot(f.bx - f.ax, f.bz - f.az);
      if (len < 1.2) continue;
      const n = Math.max(1, Math.floor(len / 2.8));
      const rotY = -Math.atan2(f.bz - f.az, f.bx - f.ax);
      for (let k = 0; k < n; k += 1) {
        const t = (k + 0.5) / n;
        out.push({ x: f.ax + (f.bx - f.ax) * t, y: f.y0, z: f.az + (f.bz - f.az) * t, rotY, len: f.heightM, index: index++ });
      }
    }
    return out;
  }, [faces, show.uplights]);

  // Normale par uplight (pour décoller le boîtier du mur).
  const upNormals = useMemo(() => {
    const out: Array<[number, number]> = [];
    for (const f of faces) {
      const len = Math.hypot(f.bx - f.ax, f.bz - f.az);
      if (len < 1.2) continue;
      const n = Math.max(1, Math.floor(len / 2.8));
      for (let k = 0; k < n; k += 1) out.push([f.nx, f.nz]);
    }
    return out;
  }, [faces]);

  const upBodies = useMemo(() => ups.map((p, i) => ({ ...p, x: p.x + (upNormals[i]?.[0] ?? 0) * 0.3, z: p.z + (upNormals[i]?.[1] ?? 0) * 0.3 })), [ups, upNormals]);
  const washes = useMemo(() => ups.map((p, i) => ({ ...p, x: p.x + (upNormals[i]?.[0] ?? 0) * 0.012, z: p.z + (upNormals[i]?.[1] ?? 0) * 0.012, y: p.y + p.len * 0.45 })), [ups, upNormals]);
  const coveGlow = useMemo(() => strip.map((p) => ({ ...p, y: p.y + 0.11 })), [strip]);

  const stripRef = useRef<THREE.InstancedMesh>(null);
  const glowRef = useRef<THREE.InstancedMesh>(null);
  const lensRef = useRef<THREE.InstancedMesh>(null);
  const canRef = useRef<THREE.InstancedMesh>(null);
  const washRef = useRef<THREE.InstancedMesh>(null);
  const lightRefs = useRef<Array<THREE.PointLight | null>>([]);

  useInstanced(stripRef, strip, (p) => [p.len * 0.98, 1, 1]);
  useInstanced(glowRef, coveGlow, (p) => [p.len, 1, 1]);
  useInstanced(lensRef, upBodies, () => [1, 1, 1]);
  useInstanced(canRef, upBodies, () => [1, 1, 1]);
  useInstanced(washRef, washes, (p) => [1.5, p.len * 0.9, 1]);

  // Lampes réelles : quelques uplights répartis (les autres ne font que leur halo).
  const lightIdx = useMemo(() => {
    if (!ups.length) return [] as number[];
    const k = Math.min(maxPointLights, ups.length);
    return Array.from({ length: k }, (_, i) => Math.floor(((i + 0.5) / k) * ups.length));
  }, [ups.length, maxPointLights]);

  const tmp = useMemo(() => new THREE.Color(), []);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const paint = (mesh: THREE.InstancedMesh | null, count: number, total: number, gain: number) => {
      if (!mesh || !count) return;
      for (let i = 0; i < count; i += 1) {
        const c = ledColorAt(show, t, i, total);
        tmp.setRGB(c.rgb[0] * c.intensity * gain, c.rgb[1] * c.intensity * gain, c.rgb[2] * c.intensity * gain);
        mesh.setColorAt(i, tmp);
      }
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    };
    paint(stripRef.current, strip.length, strip.length, 1.6);
    paint(glowRef.current, coveGlow.length, coveGlow.length, 0.7);
    paint(lensRef.current, upBodies.length, upBodies.length, 2);
    paint(washRef.current, washes.length, washes.length, 0.6);
    lightIdx.forEach((ui, li) => {
      const light = lightRefs.current[li];
      if (!light) return;
      const c = ledColorAt(show, t, ui, ups.length);
      light.color.setRGB(c.rgb[0], c.rgb[1], c.rgb[2]);
      light.intensity = 1.4 * c.intensity;
    });
  });

  const basic = (map?: THREE.Texture | null) =>
    new THREE.MeshBasicMaterial({
      color: '#ffffff',
      alphaMap: map ?? undefined,
      transparent: Boolean(map),
      depthWrite: !map,
      blending: map ? THREE.AdditiveBlending : THREE.NormalBlending,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
  const materials = useMemo(
    () => ({ strip: basic(), glow: basic(tex?.up), lens: basic(), wash: basic(tex?.spot), can: new THREE.MeshStandardMaterial({ color: '#1f1f22', metalness: 0.6, roughness: 0.4 }) }),
    [tex],
  );
  useEffect(() => () => Object.values(materials).forEach((m) => m.dispose()), [materials]);

  return (
    <group>
      {strip.length ? (
        <>
          <instancedMesh key={`s${strip.length}`} ref={stripRef} args={[undefined, undefined, strip.length]} material={materials.strip}>
            <boxGeometry args={[1, 0.022, 0.03]} />
          </instancedMesh>
          <instancedMesh key={`g${coveGlow.length}`} ref={glowRef} args={[undefined, undefined, coveGlow.length]} material={materials.glow} renderOrder={2}>
            <planeGeometry args={[1, 0.22]} />
          </instancedMesh>
        </>
      ) : null}
      {upBodies.length ? (
        <>
          <instancedMesh key={`c${upBodies.length}`} ref={canRef} args={[undefined, undefined, upBodies.length]} material={materials.can} castShadow>
            <cylinderGeometry args={[0.07, 0.085, 0.12, 14]} />
          </instancedMesh>
          <instancedMesh key={`l${upBodies.length}`} ref={lensRef} args={[undefined, undefined, upBodies.length]} material={materials.lens}>
            <cylinderGeometry args={[0.055, 0.055, 0.125, 14]} />
          </instancedMesh>
          <instancedMesh key={`w${washes.length}`} ref={washRef} args={[undefined, undefined, washes.length]} material={materials.wash} renderOrder={2}>
            <planeGeometry args={[1, 1]} />
          </instancedMesh>
        </>
      ) : null}
      {lightIdx.map((ui, li) => {
        const p = upBodies[ui];
        if (!p) return null;
        return (
          <pointLight
            key={`pl-${li}`}
            ref={(el) => {
              lightRefs.current[li] = el;
            }}
            position={[p.x, p.y + 0.6, p.z]}
            distance={5}
            decay={2}
            intensity={0}
          />
        );
      })}
    </group>
  );
}
