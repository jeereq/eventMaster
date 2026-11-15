'use client';

/**
 * Couloir 3D réglable : sol (matière du catalogue, teinte ou photo importée),
 * murs latéraux optionnels avec hauteur et couleur, plinthes et appliques
 * murales espacées selon la longueur. Le couloir suit toujours son grand côté.
 */

import { useMemo } from 'react';
import type { ZoneMaterial } from '@/lib/roomLayoutUtils';
import { resolveImportedSurface, resolveZoneMaterialMap } from '@/lib/roomWebGLMaterials';
import { tileRepeat } from '@/lib/roomImportedTextureMath';
import { LEGACY_CORRIDOR_GREY, evenlySpacedOffsets } from '@/lib/roomAisleLayout';
import { SurfaceMat } from '@/components/room/SurfaceMaterial';
import { withRepeat } from '@/lib/roomSurfaceFinish';

const SEL = '#c7d2fe';
const WALL_T = 0.1;

export interface CorridorMeshProps {
  w: number;
  d: number;
  material?: ZoneMaterial;
  color?: string;
  imageUrl?: string;
  imageTileM?: number;
  walls?: boolean;
  wallHeightM?: number;
  wallColor?: string;
  plinths?: boolean;
  sconces?: boolean;
  sconceSpacingM?: number;
  selected?: boolean;
}

export function CorridorMesh({
  w,
  d,
  material,
  color,
  imageUrl,
  imageTileM,
  walls = true,
  wallHeightM = 2.2,
  wallColor = '#ece8e1',
  plinths = true,
  sconces = false,
  sconceSpacingM = 3,
  selected = false,
}: CorridorMeshProps) {
  const along = Math.max(w, d);
  const across = Math.min(w, d);
  const turn = w > d ? Math.PI / 2 : 0;
  const wallH = Math.max(0.6, Math.min(6, wallHeightM));

  const zone = resolveZoneMaterialMap(material ?? 'wood');
  // Motif à l’échelle (≈ 2 m par répétition) au lieu d’être étiré sur toute la longueur.
  const q = (v: number) => Math.max(0.25, Math.round(v * 4) / 4);
  const floorMap = withRepeat(zone.map, q(tileRepeat(across, 2)), q(tileRepeat(along, 2)));
  const floorColor = selected ? SEL : color && color.toLowerCase() !== LEGACY_CORRIDOR_GREY ? color : zone.color;
  const imported = useMemo(() => {
    if (!imageUrl) return null;
    const tile = imageTileM && imageTileM > 0 ? imageTileM : 1.2;
    return resolveImportedSurface(imageUrl, tileRepeat(across, tile), tileRepeat(along, tile));
  }, [imageUrl, imageTileM, across, along]);

  const sconceZ = useMemo(() => (walls && sconces ? evenlySpacedOffsets(along, sconceSpacingM) : []), [walls, sconces, along, sconceSpacingM]);
  const inner = across / 2 - (walls ? WALL_T : 0);

  return (
    <group rotation={[0, turn, 0]}>
      <mesh position={[0, 0.015, 0]} receiveShadow>
        <boxGeometry args={[across, 0.03, along]} />
        {imported ? (
          <SurfaceMat
            color={selected ? SEL : '#ffffff'}
            finish="plain"
            map={imported.map}
            normalMap={imported.normalMap}
            roughnessMap={imported.roughnessMap}
            normalScale={0.8}
            roughness={0.8}
            metalness={0}
          />
        ) : (
          <SurfaceMat
            color={floorColor}
            finish="plain"
            map={floorMap}
            roughness={zone.roughness}
            metalness={zone.metalness}
            emissive={zone.emissive}
            emissiveIntensity={zone.emissiveIntensity}
          />
        )}
      </mesh>

      {walls && ([-1, 1] as const).map((side) => (
        <group key={side} position={[side * (across / 2 - WALL_T / 2), 0, 0]}>
          <mesh position={[0, wallH / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[WALL_T, wallH, along]} />
            <SurfaceMat color={wallColor} finish="plain" roughness={0.88} />
          </mesh>
          {plinths && (
            <mesh position={[-side * (WALL_T / 2 + 0.008), 0.05, 0]} receiveShadow>
              <boxGeometry args={[0.016, 0.1, along]} />
              <SurfaceMat color="#f8f7f4" finish="lacquer" roughness={0.35} />
            </mesh>
          )}
          {sconceZ.map((z) => (
            <group key={z} position={[-side * (WALL_T / 2), Math.min(1.75, wallH - 0.3), z]}>
              <mesh position={[-side * 0.01, 0, 0]}>
                <boxGeometry args={[0.02, 0.18, 0.09]} />
                <SurfaceMat color="#b08d57" finish="brass" metalness={0.85} roughness={0.3} />
              </mesh>
              <mesh position={[-side * 0.07, 0.03, 0]}>
                <cylinderGeometry args={[0.055, 0.045, 0.14, 20, 1, true]} />
                <meshStandardMaterial color="#fff7e6" emissive="#fbbf24" emissiveIntensity={0.9} roughness={0.6} side={2} />
              </mesh>
              <mesh position={[-side * 0.07, 0.02, 0]}>
                <sphereGeometry args={[0.022, 12, 10]} />
                <meshStandardMaterial color="#fffbeb" emissive="#fde68a" emissiveIntensity={2.2} toneMapped={false} />
              </mesh>
            </group>
          ))}
        </group>
      ))}
      {/* Sans murs : simple filet de bordure pour lire le passage. */}
      {!walls && plinths && ([-1, 1] as const).map((side) => (
        <mesh key={side} position={[side * (inner - 0.02), 0.035, 0]} receiveShadow>
          <boxGeometry args={[0.04, 0.012, along]} />
          <SurfaceMat color="#a8a29e" finish="stone" roughness={0.6} />
        </mesh>
      ))}
    </group>
  );
}
