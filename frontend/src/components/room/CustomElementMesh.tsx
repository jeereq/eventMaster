'use client';

/**
 * Rendu 3D d’un élément personnalisé créé à partir d’une image ou d’une vidéo
 * (voir `lib/roomCustomElements.ts`). Origine : centre de l’empreinte, au sol.
 */

import React, { useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import type { CustomElementDefinition } from '@/lib/roomCustomElements';

const textureCache = new Map<string, THREE.Texture>();

function useImageTexture(url: string | undefined): THREE.Texture | null {
  const [loaded, setLoaded] = useState<{ url: string; tex: THREE.Texture | null } | null>(null);
  useEffect(() => {
    if (!url || textureCache.has(url)) return;
    let alive = true;
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin('anonymous');
    loader.load(
      url,
      (t) => {
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = 8;
        textureCache.set(url, t);
        if (alive) setLoaded({ url, tex: t });
      },
      undefined,
      () => {
        if (alive) setLoaded({ url, tex: null });
      },
    );
    return () => {
      alive = false;
    };
  }, [url]);
  if (!url) return null;
  return textureCache.get(url) ?? (loaded?.url === url ? loaded.tex : null);
}

function useVideoElementTexture(url: string | undefined): THREE.VideoTexture | null {
  const [state, setState] = useState<{ url: string; tex: THREE.VideoTexture } | null>(null);
  useEffect(() => {
    if (!url || typeof document === 'undefined') return;
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.loop = true;
    video.muted = true;
    video.playsInline = true;
    video.autoplay = true;
    let tex: THREE.VideoTexture | null = null;
    // La texture n’est créée qu’une fois la première image décodée (sinon écran noir).
    const onReady = () => {
      if (tex) return;
      tex = new THREE.VideoTexture(video);
      tex.colorSpace = THREE.SRGBColorSpace;
      setState({ url, tex });
    };
    video.addEventListener('loadeddata', onReady);
    video.src = url;
    void video.play().catch(() => {
      /* lecture bloquée (économie d’énergie) : l’affiche reste visible */
    });
    return () => {
      video.removeEventListener('loadeddata', onReady);
      video.pause();
      tex?.dispose();
      video.removeAttribute('src');
      video.load();
    };
  }, [url]);
  return url && state?.url === url ? state.tex : null;
}

/** Géométrie extrudée de la silhouette, UV des faces calées sur l’image. */
function useCutoutGeometry(outline: number[] | undefined, w: number, h: number, depth: number) {
  return useMemo(() => {
    const pts = outline && outline.length >= 6 ? outline : [0, 0, 1, 0, 1, 1, 0, 1];
    const shape = new THREE.Shape();
    for (let i = 0; i < pts.length; i += 2) {
      const x = (pts[i] - 0.5) * w;
      const y = (1 - pts[i + 1]) * h;
      if (i === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    }
    shape.closePath();
    const bevel = Math.min(0.012, depth * 0.2);
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: Math.max(0.004, depth - bevel * 2),
      bevelEnabled: bevel > 0.001,
      bevelThickness: bevel,
      bevelSize: bevel,
      bevelSegments: 1,
      curveSegments: 1,
    });
    geo.translate(0, 0, -(depth - bevel * 2) / 2);
    // Faces avant/arrière (groupe 0) : UV = position dans l’image.
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const uv = geo.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i += 1) {
      uv.setXY(i, pos.getX(i) / w + 0.5, pos.getY(i) / h);
    }
    uv.needsUpdate = true;
    geo.computeVertexNormals();
    return geo;
  }, [outline, w, h, depth]);
}

function CutoutBody({ def, w, h, texture }: { def: CustomElementDefinition; w: number; h: number; texture: THREE.Texture | null }) {
  const geo = useCutoutGeometry(def.outline, w, h, def.depthM);
  const faceMat = useMemo(
    () => new THREE.MeshStandardMaterial({
      map: texture,
      color: texture ? '#ffffff' : '#cbd5e1',
      roughness: 0.6,
      metalness: 0.02,
      alphaTest: def.outline ? 0.02 : 0.4,
      transparent: false,
    }),
    [texture, def.outline],
  );
  const sideMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: def.edgeColor ?? '#9ca3af', roughness: 0.7 }),
    [def.edgeColor],
  );
  return <mesh geometry={geo} material={[faceMat, sideMat]} castShadow receiveShadow />;
}

export function CustomElementMesh({
  def,
  w,
  d,
  selected = false,
}: {
  def: CustomElementDefinition;
  /** Empreinte réelle (m) : largeur et profondeur du fixture. */
  w: number;
  d: number;
  selected?: boolean;
}) {
  const texture = useImageTexture(def.imageUrl);
  const video = useVideoElementTexture(def.mode === 'video' ? def.videoUrl : undefined);
  const h = Math.max(0.05, def.heightM);
  const width = Math.max(0.05, w);
  const elev = def.elevationM ?? 0;
  const edge = def.edgeColor ?? '#9ca3af';
  const texKey = texture?.uuid ?? 'none';

  const ring = selected ? (
    <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[Math.max(width, d) * 0.55, Math.max(width, d) * 0.6, 48]} />
      <meshBasicMaterial color="#6366f1" transparent opacity={0.8} />
    </mesh>
  ) : null;

  if (def.mode === 'cutout') {
    return (
      <group>
        <group position={[0, elev, 0]}>
          <CutoutBody def={{ ...def, depthM: Math.min(def.depthM, d) }} w={width} h={h} texture={texture} />
        </group>
        {ring}
      </group>
    );
  }

  if (def.mode === 'panel') {
    const standD = Math.max(0.25, Math.min(d, 0.6));
    const panelT = Math.min(0.04, Math.max(0.01, def.depthM));
    return (
      <group>
        <group position={[0, elev + 0.04, 0]}>
          <mesh key={texKey} position={[0, h / 2, 0]} castShadow>
            <boxGeometry args={[width, h, panelT]} />
            <meshStandardMaterial attach="material-0" color={edge} roughness={0.6} />
            <meshStandardMaterial attach="material-1" color={edge} roughness={0.6} />
            <meshStandardMaterial attach="material-2" color={edge} roughness={0.6} />
            <meshStandardMaterial attach="material-3" color={edge} roughness={0.6} />
            <meshStandardMaterial attach="material-4" map={texture} color={texture ? '#ffffff' : '#e2e8f0'} roughness={0.5} alphaTest={0.3} />
            <meshStandardMaterial attach="material-5" color="#e5e7eb" roughness={0.7} />
          </mesh>
        </group>
        {elev < 0.05 ? (
          // Pied lesté.
          <mesh position={[0, 0.02, 0]} castShadow receiveShadow>
            <boxGeometry args={[Math.min(width, 0.9), 0.04, standD]} />
            <meshStandardMaterial color="#27272a" roughness={0.4} metalness={0.5} />
          </mesh>
        ) : null}
        {ring}
      </group>
    );
  }

  if (def.mode === 'box') {
    const depth = Math.max(0.05, d);
    return (
      <group>
        {/* La clé recrée les matières quand la texture arrive (le shader doit inclure la carte). */}
        <mesh key={texKey} position={[0, elev + h / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[width, h, depth]} />
          <meshStandardMaterial attach="material-0" color={edge} roughness={0.65} />
          <meshStandardMaterial attach="material-1" color={edge} roughness={0.65} />
          <meshStandardMaterial attach="material-2" color={edge} roughness={0.55} />
          <meshStandardMaterial attach="material-3" color={edge} roughness={0.65} />
          <meshStandardMaterial attach="material-4" map={texture} color={texture ? '#ffffff' : '#e2e8f0'} roughness={0.55} />
          <meshStandardMaterial attach="material-5" map={texture} color={texture ? '#ffffff' : '#e2e8f0'} roughness={0.55} />
        </mesh>
        {ring}
      </group>
    );
  }

  if (def.mode === 'cylinder') {
    const r = Math.max(0.03, Math.min(width, d) / 2);
    return (
      <group>
        <mesh key={texKey} position={[0, elev + h / 2, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[r, r, h, 48, 1]} />
          <meshStandardMaterial attach="material-0" map={texture} color={texture ? '#ffffff' : '#e2e8f0'} roughness={0.55} />
          <meshStandardMaterial attach="material-1" color={edge} roughness={0.6} />
          <meshStandardMaterial attach="material-2" color={edge} roughness={0.6} />
        </mesh>
        {ring}
      </group>
    );
  }

  // Écran vidéo : cadre noir, dalle émissive qui diffuse la vidéo (l’affiche tant qu’elle charge).
  const screenMap = video ?? texture;
  const frame = 0.03;
  const onWall = elev > 0.3;
  const screenY = onWall ? elev : Math.max(elev, 0.9);
  return (
    <group>
      <group position={[0, screenY, 0]}>
        <mesh position={[0, h / 2, 0]} castShadow>
          <boxGeometry args={[width + frame * 2, h + frame * 2, Math.max(0.03, Math.min(0.08, def.depthM))]} />
          <meshStandardMaterial color="#0a0a0a" roughness={0.35} metalness={0.4} />
        </mesh>
        <mesh key={screenMap?.uuid ?? 'none'} position={[0, h / 2, Math.max(0.03, Math.min(0.08, def.depthM)) / 2 + 0.002]}>
          <planeGeometry args={[width, h]} />
          <meshBasicMaterial map={screenMap} color={screenMap ? '#ffffff' : '#111827'} toneMapped={false} />
        </mesh>
      </group>
      {!onWall ? (
        <>
          <mesh position={[0, screenY / 2, -0.05]} castShadow>
            <boxGeometry args={[0.08, screenY, 0.06]} />
            <meshStandardMaterial color="#27272a" roughness={0.4} metalness={0.6} />
          </mesh>
          <mesh position={[0, 0.015, -0.05]} receiveShadow castShadow>
            <boxGeometry args={[Math.min(width * 0.6, 1.2), 0.03, 0.5]} />
            <meshStandardMaterial color="#27272a" roughness={0.4} metalness={0.6} />
          </mesh>
        </>
      ) : null}
      {ring}
    </group>
  );
}
