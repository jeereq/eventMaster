'use client';

import React, { useMemo } from 'react';
import * as THREE from 'three';
import { getDetailSet, withRepeat, type DetailKind } from '@/lib/roomSurfaceFinish';

/** Finitions réalistes partagées par le mobilier 3D (chaises, tables, bar, instruments, lustres). */
export type SurfaceFinish =
  | 'auto'
  | 'plain'
  | 'wood'
  | 'lacquer'
  | 'metal'
  | 'brass'
  | 'chrome'
  | 'fabric'
  | 'linen'
  | 'velvet'
  | 'leather'
  | 'suede'
  | 'boucle'
  | 'mesh'
  | 'rattan'
  | 'glass'
  | 'crystal'
  | 'ceramic'
  | 'plastic'
  | 'stone';

const DETAIL_BY_FINISH: Partial<Record<SurfaceFinish, DetailKind>> = {
  wood: 'woodGrain',
  metal: 'brushedMetal',
  brass: 'brushedMetal',
  fabric: 'fabricWeave',
  linen: 'linen',
  velvet: 'velvet',
  leather: 'leather',
  suede: 'suede',
  boucle: 'boucle',
  mesh: 'mesh',
  rattan: 'rattan',
  stone: 'stoneGrain',
};

/** Répétition par défaut : grain fin pour tissus, une « planche » par face pour le bois. */
const DEFAULT_REPEAT: Partial<Record<SurfaceFinish, number>> = {
  fabric: 3,
  linen: 3,
  velvet: 1.5,
  leather: 2,
  suede: 2,
  boucle: 2.5,
  mesh: 2,
  rattan: 2,
  stone: 1.5,
};

/** Déduit la finition quand l'appelant ne la précise pas : les métaux gagnent un brossé discret. */
export function inferFinish(color: string, metalness = 0, roughness = 0.5): SurfaceFinish {
  if (metalness >= 0.5) {
    if (roughness <= 0.1) return 'chrome';
    const c = color.toLowerCase();
    if (c === '#d4af37' || c === '#c9a227' || c === '#fbbf24' || c === '#c4a35a' || c === '#fde68a' || c === '#fef08a' || c === '#b45309') return 'brass';
    return 'metal';
  }
  return 'plain';
}

export type SurfaceMatProps = {
  color: string;
  finish?: SurfaceFinish;
  roughness?: number;
  metalness?: number;
  /** Répétition de la texture de détail (nombre ou [x, y]). */
  repeat?: number | [number, number];
  /** Veinage / trame tourné d'un quart de tour (lames et montants verticaux). */
  vertical?: boolean;
  map?: THREE.Texture | null;
  normalMap?: THREE.Texture | null;
  normalScale?: number;
  bumpMap?: THREE.Texture | null;
  bumpScale?: number;
  transparent?: boolean;
  opacity?: number;
  emissive?: string;
  emissiveIntensity?: number;
  envMapIntensity?: number;
  clearcoat?: number;
  clearcoatRoughness?: number;
  side?: THREE.Side;
  depthWrite?: boolean;
};

export function SurfaceMat({
  color,
  finish = 'auto',
  roughness,
  metalness,
  repeat,
  vertical = false,
  map,
  normalMap,
  normalScale,
  bumpMap,
  bumpScale,
  transparent,
  opacity,
  emissive,
  emissiveIntensity,
  envMapIntensity,
  clearcoat,
  clearcoatRoughness,
  side,
  depthWrite,
}: SurfaceMatProps) {
  const resolved = finish === 'auto' ? inferFinish(color, metalness, roughness) : finish;
  const [rx, ry] = typeof repeat === 'number' ? [repeat, repeat] : repeat ?? [DEFAULT_REPEAT[resolved] ?? 1, DEFAULT_REPEAT[resolved] ?? 1];

  const detail = useMemo(() => {
    const kind = DETAIL_BY_FINISH[resolved];
    if (!kind) return null;
    const set = getDetailSet(kind);
    return {
      map: withRepeat(set.map, rx, ry, vertical),
      normalMap: withRepeat(set.normalMap, rx, ry, vertical),
      roughnessMap: withRepeat(set.roughnessMap, rx, ry, vertical),
      normalScale: set.normalScale,
    };
  }, [resolved, rx, ry, vertical]);

  const nScale = normalScale ?? detail?.normalScale ?? 1;
  const normalScaleVec = useMemo(() => new THREE.Vector2(nScale, nScale), [nScale]);

  // Métaux : brossé = variation de rugosité + micro-relief ; aucune albédo ajoutée (la teinte reste exacte).
  // Bois et tissus : albédo neutre multiplié par la couleur choisie.
  const colorMap = map ?? (resolved === 'metal' || resolved === 'brass' ? null : detail?.map ?? null);
  const nMap = normalMap ?? detail?.normalMap ?? null;

  if (resolved === 'crystal') {
    // Cristal taillé sans « transmission » : pas de passe de rendu supplémentaire (mobile),
    // l'éclat vient des reflets d'environnement, de l'IOR élevé et d'une légère irisation.
    return (
      <meshPhysicalMaterial
        color={color}
        roughness={roughness ?? 0.02}
        metalness={0}
        ior={2}
        specularIntensity={1}
        clearcoat={1}
        clearcoatRoughness={0.02}
        iridescence={0.35}
        iridescenceIOR={1.6}
        transparent
        opacity={opacity ?? 0.62}
        envMapIntensity={envMapIntensity ?? 2.6}
        emissive={emissive}
        emissiveIntensity={emissiveIntensity}
        depthWrite={depthWrite ?? false}
        side={side}
      />
    );
  }

  if (resolved === 'glass') {
    return (
      <meshPhysicalMaterial
        color={color}
        roughness={roughness ?? 0.04}
        metalness={0}
        ior={1.5}
        specularIntensity={1}
        clearcoat={0.6}
        clearcoatRoughness={0.03}
        transparent
        opacity={opacity ?? 0.38}
        envMapIntensity={envMapIntensity ?? 1.8}
        emissive={emissive}
        emissiveIntensity={emissiveIntensity}
        depthWrite={depthWrite ?? false}
        side={side}
      />
    );
  }

  const physical = resolved === 'lacquer' || resolved === 'ceramic' || (clearcoat ?? 0) > 0;
  if (physical) {
    return (
      <meshPhysicalMaterial
        color={color}
        map={colorMap ?? undefined}
        normalMap={nMap ?? undefined}
        normalScale={nMap ? normalScaleVec : undefined}
        bumpMap={bumpMap ?? undefined}
        bumpScale={bumpScale}
        roughness={roughness ?? (resolved === 'lacquer' ? 0.22 : 0.3)}
        metalness={metalness ?? 0}
        clearcoat={clearcoat ?? (resolved === 'lacquer' ? 1 : 0.6)}
        clearcoatRoughness={clearcoatRoughness ?? (resolved === 'lacquer' ? 0.05 : 0.12)}
        envMapIntensity={envMapIntensity ?? 1.1}
        transparent={transparent}
        opacity={opacity}
        emissive={emissive}
        emissiveIntensity={emissiveIntensity}
        side={side}
        depthWrite={depthWrite}
      />
    );
  }

  const isMetal = resolved === 'metal' || resolved === 'brass' || resolved === 'chrome';
  return (
    <meshStandardMaterial
      color={color}
      map={colorMap ?? undefined}
      normalMap={nMap ?? undefined}
      normalScale={nMap ? normalScaleVec : undefined}
      roughnessMap={detail?.roughnessMap ?? undefined}
      bumpMap={bumpMap ?? undefined}
      bumpScale={bumpScale}
      roughness={roughness ?? (isMetal ? 0.28 : resolved === 'wood' ? 0.55 : 0.6)}
      metalness={metalness ?? (isMetal ? 0.9 : 0)}
      envMapIntensity={envMapIntensity ?? (resolved === 'brass' ? 1.3 : isMetal ? 1.15 : 1)}
      transparent={transparent}
      opacity={opacity}
      emissive={emissive}
      emissiveIntensity={emissiveIntensity}
      side={side}
      depthWrite={depthWrite}
    />
  );
}
