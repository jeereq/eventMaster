'use client';

import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { PleatedDrape } from '@/components/room/StageDressing';
import { useScreenImageTexture } from '@/components/room/useScreenImage';
import { drawLandscapeFrame } from '@/components/room/screenPictures';
import { ProjectionBeam } from '@/components/room/ScreenModelMeshes';
import type { ImageCropRect } from '@/lib/roomLayoutUtils';

const RATIO: Record<string, number> = { '16:9': 16 / 9, '21:9': 2.39, '32:9': 32 / 9, '9:16': 1.85, '1.43:1': 1.43 };

/**
 * Grand écran de cinéma : toile perforée légèrement cintrée (rayon ≈ 1,6 × largeur),
 * cache de velours noir, mur-baffle sombre qui masque les enceintes, rideaux latéraux
 * et lambrequin, avant-scène basse à nez lumineux, lumière réfléchie vers la salle et,
 * quand le mur d'en face est connu, cabine de projection avec son faisceau.
 * Repère : centré en x, sol en y = 0, face au public (+Z).
 */
export function CinemaScreenMesh({
  w,
  ratio = '21:9',
  elevationM = 1.2,
  powered = true,
  selected = false,
  imageUrl,
  imageCrop,
  throwM,
  ceilingM = 8,
  curtainColor = '#5b0f1a',
}: {
  w: number;
  ratio?: string;
  elevationM?: number;
  powered?: boolean;
  selected?: boolean;
  /** Image choisie dans l'éditeur, projetée à la place du paysage par défaut. */
  imageUrl?: string;
  imageCrop?: ImageCropRect;
  /** Distance jusqu'au mur d'en face (m) : la cabine de projection y est percée. */
  throwM?: number;
  /** Hauteur sous plafond (m), pour placer la cabine. */
  ceilingM?: number;
  /** Velours des rideaux et du lambrequin. */
  curtainColor?: string;
}) {
  const sw = Math.max(3, w);
  const sh = sw / (RATIO[ratio] ?? 2.39);
  const bottom = Math.max(0.6, elevationM);
  const radius = sw * 1.6;
  const bend = (x: number) => (x * x) / (2 * radius);

  const screenGeo = useMemo(() => {
    const g = new THREE.PlaneGeometry(sw, sh, 48, 1);
    const p = g.getAttribute('position');
    for (let i = 0; i < p.count; i += 1) p.setZ(i, bend(p.getX(i)));
    g.computeVertexNormals();
    return g;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sw, sh]);
  useEffect(() => () => screenGeo.dispose(), [screenGeo]);

  const frame = useMemo(() => {
    const canvas = drawLandscapeFrame(1024, Math.round(1024 / (RATIO[ratio] ?? 2.39)));
    if (!canvas) return null;
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    return tex;
  }, [ratio]);
  useEffect(() => () => frame?.dispose(), [frame]);
  const image = useScreenImageTexture(imageUrl, imageCrop, sw / sh);
  const shown = image ?? frame;

  const mask = 0.32;
  const edgeZ = bend(sw / 2);
  const wallW = sw + 2 * mask + 1.4;
  const wallH = bottom + sh + mask + 0.8;
  const drapeW = 1.1;
  const apronH = Math.min(0.6, bottom - 0.45);
  const apronD = 1.1;
  // La cabine n’a de sens que dans une vraie salle (mur d’en face assez loin).
  const booth = throwM && throwM > 6
    ? {
      z: throwM - 0.16,
      y: Math.min(Math.max(1.8, ceilingM - 0.9), Math.max(bottom + sh + 0.4, ceilingM - 1.4)),
    }
    : null;

  return (
    <group>
      {/* Mur-baffle noir mat (enceintes cachées derrière la toile) */}
      <mesh position={[0, wallH / 2, -0.18]} receiveShadow>
        <boxGeometry args={[wallW, wallH, 0.12]} />
        <meshStandardMaterial color={selected ? '#334155' : '#0b0a0d'} roughness={0.95} />
      </mesh>

      {/* Toile perforée cintrée */}
      <mesh geometry={screenGeo} position={[0, bottom + sh / 2, 0]}>
        {powered && shown ? (
          <meshStandardMaterial
            key={shown.uuid}
            color="#ffffff"
            map={shown}
            emissive="#ffffff"
            emissiveMap={shown}
            emissiveIntensity={0.9}
            roughness={0.9}
            toneMapped={false}
          />
        ) : (
          <meshStandardMaterial color="#d9d9de" roughness={0.9} />
        )}
      </mesh>

      {/* Cache velours noir : haut, bas et côtés (suivent la courbure de la toile) */}
      <mesh position={[0, bottom + sh + mask / 2, 0.02]}>
        <boxGeometry args={[sw + 2 * mask, mask, 0.06]} />
        <meshStandardMaterial color="#050506" roughness={1} />
      </mesh>
      <mesh position={[0, bottom - mask / 2, 0.02]}>
        <boxGeometry args={[sw + 2 * mask, mask, 0.06]} />
        <meshStandardMaterial color="#050506" roughness={1} />
      </mesh>
      {([-1, 1] as const).map((side) => (
        <mesh key={`mask-${side}`} position={[side * (sw / 2 + mask / 2), bottom + sh / 2, edgeZ + 0.02]}>
          <boxGeometry args={[mask, sh + 2 * mask, 0.06]} />
          <meshStandardMaterial color="#050506" roughness={1} />
        </mesh>
      ))}

      {/* Rideaux de velours latéraux, du sol au-dessus de l’écran */}
      {([-1, 1] as const).map((side) => (
        <group key={`drape-${side}`} position={[side * (sw / 2 + mask + drapeW / 2 - 0.15), 0, edgeZ + 0.12]}>
          <PleatedDrape width={drapeW} height={wallH - 0.1} color={curtainColor} foldM={0.2} depth={0.06} />
        </group>
      ))}

      {/* Lambrequin plissé au-dessus de la toile */}
      <group position={[0, bottom + sh + mask * 0.4, edgeZ + 0.16]}>
        <PleatedDrape width={sw + 2 * mask + 2 * drapeW - 0.3} height={Math.max(0.3, wallH - (bottom + sh + mask * 0.4) - 0.1)} color={curtainColor} foldM={0.16} depth={0.04} />
      </group>

      {/* Avant-scène basse en moquette noire, nez lumineux */}
      {apronH > 0.12 ? (
        <group position={[0, 0, edgeZ + 0.2 + apronD / 2]}>
          <mesh position={[0, apronH / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[sw + 2 * mask, apronH, apronD]} />
            <meshStandardMaterial color="#121014" roughness={0.95} />
          </mesh>
          <mesh position={[0, apronH - 0.035, apronD / 2 + 0.004]}>
            <planeGeometry args={[sw + 2 * mask - 0.1, 0.018]} />
            <meshStandardMaterial color="#ffffff" emissive="#fbbf24" emissiveIntensity={powered ? 1.2 : 0.5} toneMapped={false} />
          </mesh>
        </group>
      ) : null}

      {/* Lumière renvoyée par l’image vers les premiers rangs */}
      {powered ? (
        <>
          <pointLight position={[0, bottom + sh * 0.5, 2.5]} intensity={6} distance={sw * 2.2} decay={1.6} color="#ffc9a0" />
          <pointLight position={[0, bottom + sh * 0.6, sw * 0.6]} intensity={3} distance={sw * 2.5} decay={1.6} color="#8fa2ff" />
        </>
      ) : null}

      {/* Cabine de projection dans le mur d’en face et faisceau vers la toile */}
      {booth ? (
        <group>
          <group position={[0, booth.y, booth.z]}>
            <mesh>
              <boxGeometry args={[1.4, 0.7, 0.06]} />
              <meshStandardMaterial color="#0c0b0e" roughness={0.6} />
            </mesh>
            {([-0.34, 0.34] as const).map((x) => (
              <mesh key={x} position={[x, 0, -0.035]}>
                <planeGeometry args={[0.5, 0.34]} />
                <meshStandardMaterial
                  color="#1b2333"
                  emissive={powered ? '#9fb7ff' : '#111827'}
                  emissiveIntensity={powered ? (x < 0 ? 0.25 : 0.9) : 0.1}
                  roughness={0.1}
                  side={THREE.DoubleSide}
                  toneMapped={false}
                />
              </mesh>
            ))}
          </group>
          {powered ? (
            <ProjectionBeam
              apex={[0.34, booth.y, booth.z - 0.05]}
              corners={[
                [-sw / 2, bottom, edgeZ],
                [sw / 2, bottom, edgeZ],
                [sw / 2, bottom + sh, edgeZ],
                [-sw / 2, bottom + sh, edgeZ],
              ]}
              strength={0.011}
            />
          ) : null}
        </group>
      ) : null}
    </group>
  );
}
