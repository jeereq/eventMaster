'use client';

/**
 * Décor mural en 3D : images encadrées ou peintes et graffitis dessinés à la volée.
 * Rendu dans le repère du mur (x le long du mur, y centré sur la mi-hauteur, z = épaisseur),
 * collé sur la face côté salle (`inSide`) ou, si l’élément le demande, sur la face extérieure.
 */

import React, { useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import { wallArtFace, wallArtHeightM, type RoomWallArt, type WallArtFrame } from '@/lib/roomWallArt';
import { drawGraffiti, graffitiKey, graffitiOptions } from './graffitiDraw';

function useImageTexture(url?: string): THREE.Texture | null {
  const [tex, setTex] = useState<THREE.Texture | null>(null);
  useEffect(() => {
    if (!url) return;
    let alive = true;
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin('anonymous');
    let loaded: THREE.Texture | null = null;
    loader.load(
      url,
      (t) => {
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = 8;
        loaded = t;
        if (alive) setTex(t);
        else t.dispose();
      },
      undefined,
      () => {
        if (alive) setTex(null);
      },
    );
    return () => {
      alive = false;
      loaded?.dispose();
    };
  }, [url]);
  return url ? tex : null;
}

/** Bordure de cadre : quatre baguettes autour d’un rectangle w × h. */
function FrameBorder({ w, h, band, depth, material }: { w: number; h: number; band: number; depth: number; material: THREE.Material }) {
  return (
    <group>
      <mesh position={[0, h / 2 + band / 2, depth / 2]} material={material} castShadow>
        <boxGeometry args={[w + band * 2, band, depth]} />
      </mesh>
      <mesh position={[0, -h / 2 - band / 2, depth / 2]} material={material} castShadow>
        <boxGeometry args={[w + band * 2, band, depth]} />
      </mesh>
      <mesh position={[-w / 2 - band / 2, 0, depth / 2]} material={material} castShadow>
        <boxGeometry args={[band, h, depth]} />
      </mesh>
      <mesh position={[w / 2 + band / 2, 0, depth / 2]} material={material} castShadow>
        <boxGeometry args={[band, h, depth]} />
      </mesh>
    </group>
  );
}

function ImageArt({ art, selected }: { art: RoomWallArt; selected: boolean }) {
  const tex = useImageTexture(art.imageUrl);
  const frame: WallArtFrame = art.frame ?? 'gallery';
  const w = art.widthM;
  const h = wallArtHeightM(art);
  const frameMat = useMemo(() => {
    if (frame === 'gold') return new THREE.MeshStandardMaterial({ color: '#c9a227', metalness: 0.9, roughness: 0.3 });
    if (frame === 'thin' || frame === 'gallery') return new THREE.MeshStandardMaterial({ color: '#141414', metalness: 0.1, roughness: 0.45 });
    return new THREE.MeshStandardMaterial({ color: '#f3f1ec', roughness: 0.85 });
  }, [frame]);
  useEffect(() => () => frameMat.dispose(), [frameMat]);

  const band = frame === 'gold' ? Math.max(0.05, w * 0.06) : frame === 'gallery' ? Math.max(0.03, w * 0.025) : frame === 'thin' ? 0.018 : 0;
  const mat = frame === 'gallery' ? Math.max(0.05, w * 0.09) : 0;
  const depth = frame === 'canvas' ? 0.035 : frame === 'none' ? 0 : frame === 'gold' ? 0.05 : 0.03;
  // Image intérieure (le passe-partout la réduit dans le cadre galerie).
  const iw = Math.max(0.05, w - band * 2 - mat * 2);
  const ih = Math.max(0.05, h - band * 2 - mat * 2);
  const imgMaterial = (
    <meshStandardMaterial
      map={tex}
      color={tex ? '#ffffff' : '#d6d3d1'}
      roughness={frame === 'none' ? 0.9 : 0.55}
      transparent={(art.opacity ?? 1) < 1}
      opacity={art.opacity ?? 1}
      emissive={selected ? '#4f46e5' : '#000000'}
      emissiveIntensity={selected ? 0.25 : 0}
      polygonOffset
      polygonOffsetFactor={-2}
    />
  );
  return (
    <group>
      {frame === 'canvas' ? (
        <mesh position={[0, 0, depth / 2]} material={frameMat} castShadow>
          <boxGeometry args={[w, h, depth]} />
        </mesh>
      ) : null}
      {band > 0 ? <FrameBorder w={w - band * 2} h={h - band * 2} band={band} depth={depth} material={frameMat} /> : null}
      {mat > 0 ? (
        <mesh position={[0, 0, 0.004]}>
          <planeGeometry args={[w - band * 2, h - band * 2]} />
          <meshStandardMaterial color="#fbfaf7" roughness={0.9} />
        </mesh>
      ) : null}
      <mesh position={[0, 0, frame === 'canvas' ? depth + 0.001 : frame === 'none' ? 0.002 : 0.008]}>
        <planeGeometry args={frame === 'canvas' || frame === 'none' ? [w, h] : [iw, ih]} />
        {imgMaterial}
      </mesh>
      {frame === 'gallery' || frame === 'thin' || frame === 'gold' ? (
        // Vitre légèrement réfléchissante.
        <mesh position={[0, 0, depth * 0.7]}>
          <planeGeometry args={[w - band * 2, h - band * 2]} />
          <meshPhysicalMaterial color="#ffffff" transparent opacity={0.06} roughness={0.05} metalness={0} clearcoat={1} depthWrite={false} />
        </mesh>
      ) : null}
    </group>
  );
}

function GraffitiArt({ art, selected }: { art: RoomWallArt; selected: boolean }) {
  const options = graffitiOptions(art);
  const key = graffitiKey(options);
  const texture = useMemo(() => {
    if (typeof document === 'undefined') return null;
    const t = new THREE.CanvasTexture(drawGraffiti(JSON.parse(key)));
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  }, [key]);
  useEffect(() => () => texture?.dispose(), [texture]);
  const w = art.widthM;
  const h = wallArtHeightM(art);
  const neon = options.style === 'neon';
  return (
    <group>
      <mesh position={[0, 0, neon ? 0.03 : 0.003]}>
        <planeGeometry args={[w, h]} />
        {neon ? (
          <meshStandardMaterial
            map={texture}
            emissiveMap={texture}
            emissive="#ffffff"
            emissiveIntensity={selected ? 2.2 : 1.6}
            transparent
            depthWrite={false}
            toneMapped={false}
          />
        ) : (
          <meshStandardMaterial
            map={texture}
            transparent
            alphaTest={0.02}
            roughness={options.style === 'chrome' ? 0.35 : 0.75}
            metalness={options.style === 'chrome' ? 0.35 : 0}
            emissive={selected ? '#4f46e5' : '#000000'}
            emissiveIntensity={selected ? 0.25 : 0}
            polygonOffset
            polygonOffsetFactor={-2}
          />
        )}
      </mesh>
      {neon ? <pointLight position={[0, 0, 0.5]} color={options.fill} intensity={0.9} distance={Math.max(2.5, w * 1.4)} decay={2} /> : null}
    </group>
  );
}

/** Les éléments d’une face du mur. */
function FaceArt({
  art,
  lengthM,
  wallHeightM,
  thicknessM,
  side,
  selectedId,
}: {
  art: RoomWallArt[];
  lengthM: number;
  wallHeightM: number;
  thicknessM: number;
  side: 1 | -1;
  selectedId?: string | null;
}) {
  if (!art.length) return null;
  return (
    <group position={[0, 0, side * (thicknessM / 2 + 0.004)]} rotation={[0, side === 1 ? 0 : Math.PI, 0]}>
      {art.map((a) => {
        // Face −z : l’axe x est inversé, on recale pour que t = 0 reste au début du mur.
        const x = (a.t - 0.5) * lengthM * side;
        const y = a.yM - wallHeightM / 2;
        return (
          <group key={a.id} position={[x, y, 0]}>
            {a.kind === 'graffiti' ? <GraffitiArt art={a} selected={selectedId === a.id} /> : <ImageArt art={a} selected={selectedId === a.id} />}
          </group>
        );
      })}
    </group>
  );
}

/** Tous les éléments d’un mur : côté salle (`inSide`) et côté extérieur (face opposée). */
export function WallArtLayer({
  art,
  lengthM,
  wallHeightM,
  thicknessM,
  inSide,
  selectedId,
}: {
  art: RoomWallArt[];
  lengthM: number;
  wallHeightM: number;
  thicknessM: number;
  inSide: 1 | -1;
  selectedId?: string | null;
}) {
  if (!art.length) return null;
  const inner = art.filter((a) => wallArtFace(a) === 'inside');
  const outer = art.filter((a) => wallArtFace(a) === 'outside');
  const common = { lengthM, wallHeightM, thicknessM, selectedId };
  return (
    <>
      <FaceArt art={inner} side={inSide} {...common} />
      <FaceArt art={outer} side={inSide === 1 ? -1 : 1} {...common} />
    </>
  );
}
