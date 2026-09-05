'use client';

import React, { useMemo } from 'react';
import * as THREE from 'three';
import type { ChairType, ChairStyle, SeatMaterial, TableShape } from '@/lib/roomLayoutUtils';
import {
  resolveChairMap,
  resolveChairVisual,
  resolveSeatFabricMap,
  resolveTableMaterial,
} from '@/lib/roomWebGLMaterials';
import { CatalogueArcTable } from '@/components/roomCelebrationMeshes';

type MatProps = {
  color: string;
  map?: THREE.Texture | null;
  roughness?: number;
  metalness?: number;
  transparent?: boolean;
  opacity?: number;
  bumpMap?: THREE.Texture;
  bumpScale?: number;
};

function Mat({ color, map, roughness = 0.6, metalness = 0.05, transparent, opacity, bumpMap, bumpScale }: MatProps) {
  return (
    <meshStandardMaterial
      color={color}
      map={map ?? undefined}
      roughness={roughness}
      metalness={metalness}
      transparent={transparent}
      opacity={opacity}
      bumpMap={bumpMap}
      bumpScale={bumpScale}
    />
  );
}

/** Chaise catalogue — silhouette reconnaissable par type. */
export function CatalogueChair({
  chairType,
  chairStyle,
  seatMaterial,
  imageUrl,
  position,
  rotationY = 0,
  selected = false,
}: {
  chairType: ChairType;
  chairStyle?: ChairStyle;
  seatMaterial?: SeatMaterial;
  imageUrl?: string;
  position: [number, number, number];
  rotationY?: number;
  selected?: boolean;
}) {
  const visual = useMemo(
    () => resolveChairVisual(chairType, chairStyle, seatMaterial),
    [chairType, chairStyle, seatMaterial],
  );
  const fabric = useMemo(
    () => resolveSeatFabricMap(seatMaterial, visual.seatColor),
    [seatMaterial, visual.seatColor],
  );
  const map = useMemo(() => resolveChairMap(imageUrl) ?? fabric.map, [imageUrl, fabric.map]);
  const seatH = 0.42 * visual.scale;
  const [sw0, sh0, sd0] = visual.seatSize;
  const sw = sw0 * visual.scale;
  const sh = sh0 * visual.scale;
  const sd = sd0 * visual.scale;
  const backH = visual.backHeight * visual.scale;
  const seatTint = selected ? '#a5b4fc' : visual.seatColor;
  const style = chairStyle ?? (chairType === 'ARMCHAIR' ? 'classic' : undefined);

  if (chairType === 'STOOL') {
    return (
      <group position={position} rotation={[0, rotationY, 0]}>
        <mesh position={[0, seatH * 0.45, 0]} castShadow>
          <cylinderGeometry args={[0.035, 0.055, seatH * 0.9, 14]} />
          <Mat color={visual.frameColor} metalness={0.55} roughness={0.3} />
        </mesh>
        <mesh position={[0, 0.03, 0]} castShadow>
          <cylinderGeometry args={[0.22, 0.24, 0.05, 20]} />
          <Mat color={visual.frameColor} metalness={0.4} roughness={0.4} />
        </mesh>
        <mesh position={[0, seatH + 0.02, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[sw * 0.48, sw * 0.5, sh * 1.2, 28]} />
          <Mat color={seatTint} map={map} roughness={fabric.roughness} metalness={fabric.metalness} />
        </mesh>
      </group>
    );
  }

  if (chairType === 'FOLDING') {
    return (
      <group position={position} rotation={[0, rotationY, 0]}>
        {([-1, 1] as const).map((side) => (
          <React.Fragment key={side}>
            <mesh position={[side * sw * 0.32, seatH * 0.55, 0]} rotation={[0.15, 0, side * 0.08]} castShadow>
              <boxGeometry args={[0.02, seatH * 1.15, 0.02]} />
              <Mat color={visual.frameColor} metalness={0.15} roughness={0.35} />
            </mesh>
            <mesh position={[side * sw * 0.28, seatH * 0.45, sd * 0.2]} rotation={[-0.35, 0, 0]} castShadow>
              <boxGeometry args={[0.018, seatH * 0.95, 0.018]} />
              <Mat color={visual.frameColor} metalness={0.12} roughness={0.4} />
            </mesh>
          </React.Fragment>
        ))}
        <mesh position={[0, seatH, 0]} castShadow receiveShadow>
          <boxGeometry args={[sw * 0.95, 0.03, sd * 0.9]} />
          <Mat color={seatTint} map={map} roughness={0.45} metalness={0.08} />
        </mesh>
        <mesh position={[0, seatH + backH * 0.45, -sd * 0.4]} castShadow>
          <boxGeometry args={[sw * 0.9, backH, 0.025]} />
          <Mat color={seatTint} map={map} roughness={0.5} metalness={0.08} />
        </mesh>
        <mesh position={[0, seatH + backH * 0.7, -sd * 0.38]} castShadow>
          <boxGeometry args={[sw * 0.75, 0.04, 0.03]} />
          <Mat color={visual.frameColor} metalness={0.12} roughness={0.4} />
        </mesh>
      </group>
    );
  }

  if (chairType === 'THEATER') {
    return (
      <group position={position} rotation={[0, rotationY, 0]}>
        <mesh position={[0, seatH * 0.35, 0]} castShadow>
          <boxGeometry args={[sw * 1.05, seatH * 0.7, sd * 0.95]} />
          <Mat color="#1c1917" metalness={0.2} roughness={0.6} />
        </mesh>
        <mesh position={[0, seatH + 0.04, 0.02]} rotation={[-0.12, 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[sw * 0.92, sh * 1.3, sd * 0.85]} />
          <Mat color={seatTint} map={map} roughness={0.88} metalness={0.04} />
        </mesh>
        <mesh position={[0, seatH + backH * 0.5, -sd * 0.38]} castShadow>
          <boxGeometry args={[sw * 0.95, backH, 0.09]} />
          <Mat color={seatTint} map={map} roughness={0.9} metalness={0.03} />
        </mesh>
        {([-1, 1] as const).map((side) => (
          <group key={side} position={[side * sw * 0.48, seatH + 0.16, 0]}>
            <mesh castShadow>
              <boxGeometry args={[0.07, 0.12, sd * 0.7]} />
              <Mat color={seatTint} map={map} roughness={0.85} />
            </mesh>
            <mesh position={[0, 0.02, sd * 0.15]} castShadow>
              <cylinderGeometry args={[0.035, 0.035, 0.04, 12]} />
              <Mat color="#292524" metalness={0.5} roughness={0.4} />
            </mesh>
          </group>
        ))}
      </group>
    );
  }

  if (chairType === 'WHEELCHAIR') {
    return (
      <group position={position} rotation={[0, rotationY, 0]}>
        <mesh position={[0, seatH, 0]} castShadow receiveShadow>
          <boxGeometry args={[sw, sh, sd]} />
          <Mat color={seatTint} map={map} roughness={fabric.roughness} metalness={fabric.metalness} />
        </mesh>
        <mesh position={[0, seatH + backH * 0.45, -sd * 0.4]} castShadow>
          <boxGeometry args={[sw * 0.9, backH, 0.05]} />
          <Mat color={seatTint} map={map} roughness={fabric.roughness} />
        </mesh>
        {([-1, 1] as const).map((side) => (
          <mesh key={side} position={[side * sw * 0.45, seatH + 0.14, 0]} castShadow>
            <boxGeometry args={[0.05, 0.08, sd * 0.7]} />
            <Mat color="#64748b" metalness={0.55} roughness={0.35} />
          </mesh>
        ))}
        {([-1, 1] as const).map((side) => (
          <mesh key={`w-${side}`} position={[side * sw * 0.42, 0.22, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <torusGeometry args={[0.22, 0.035, 10, 22]} />
            <Mat color="#111827" metalness={0.65} roughness={0.35} />
          </mesh>
        ))}
        <mesh position={[0, 0.08, sd * 0.48]} castShadow>
          <sphereGeometry args={[0.055, 12, 12]} />
          <Mat color="#1f2937" metalness={0.5} roughness={0.4} />
        </mesh>
      </group>
    );
  }

  if (chairType === 'CROSSBACK') {
    return (
      <group position={position} rotation={[0, rotationY, 0]}>
        {([-1, 1] as const).flatMap((sx) =>
          ([-1, 1] as const).map((sz) => (
            <mesh key={`${sx}-${sz}`} position={[sx * sw * 0.36, seatH / 2, sz * sd * 0.34]} castShadow>
              <cylinderGeometry args={[0.018, 0.022, seatH, 10]} />
              <Mat color={visual.frameColor} roughness={0.5} metalness={0.15} />
            </mesh>
          )),
        )}
        <mesh position={[0, seatH, 0]} castShadow receiveShadow>
          <boxGeometry args={[sw, sh * 1.1, sd]} />
          <Mat color={seatTint} map={map} roughness={fabric.roughness} metalness={fabric.metalness} />
        </mesh>
        <mesh position={[0, seatH + backH * 0.45, -sd * 0.38]} castShadow>
          <boxGeometry args={[sw * 0.88, backH, 0.04]} />
          <Mat color={seatTint} map={map} roughness={fabric.roughness} />
        </mesh>
        {/* Cross-back en X */}
        <mesh position={[0, seatH + backH * 0.55, -sd * 0.4]} rotation={[0.15, 0, 0.55]} castShadow>
          <boxGeometry args={[0.025, backH * 0.85, 0.025]} />
          <Mat color={visual.frameColor} roughness={0.48} />
        </mesh>
        <mesh position={[0, seatH + backH * 0.55, -sd * 0.4]} rotation={[0.15, 0, -0.55]} castShadow>
          <boxGeometry args={[0.025, backH * 0.85, 0.025]} />
          <Mat color={visual.frameColor} roughness={0.48} />
        </mesh>
      </group>
    );
  }

  if (chairType === 'GHOST') {
    return (
      <group position={position} rotation={[0, rotationY, 0]}>
        <mesh position={[0, seatH * 0.5, 0]} castShadow>
          <cylinderGeometry args={[0.015, 0.015, seatH, 8]} />
          <meshStandardMaterial color="#e2e8f0" transparent opacity={0.35} roughness={0.1} metalness={0.05} />
        </mesh>
        <mesh position={[0, seatH + 0.02, 0]} castShadow receiveShadow>
          <boxGeometry args={[sw, 0.04, sd]} />
          <meshStandardMaterial color="#f8fafc" transparent opacity={0.42} roughness={0.08} metalness={0.12} />
        </mesh>
        <mesh position={[0, seatH + backH * 0.45, -sd * 0.35]} castShadow>
          <boxGeometry args={[sw * 0.92, backH, 0.035]} />
          <meshStandardMaterial color="#f1f5f9" transparent opacity={0.4} roughness={0.08} metalness={0.1} />
        </mesh>
        <mesh position={[0, seatH + backH * 0.75, -sd * 0.33]} castShadow>
          <torusGeometry args={[sw * 0.3, 0.012, 8, 20, Math.PI]} />
          <meshStandardMaterial color="#e2e8f0" transparent opacity={0.38} roughness={0.1} />
        </mesh>
      </group>
    );
  }

  if (chairType === 'MESH') {
    const meshMat = resolveSeatFabricMap('mesh', visual.seatColor);
    return (
      <group position={position} rotation={[0, rotationY, 0]}>
        <mesh position={[0, seatH * 0.4, 0]} castShadow>
          <boxGeometry args={[sw * 1.02, seatH * 0.8, sd * 0.95]} />
          <Mat color="#1e293b" metalness={0.25} roughness={0.55} />
        </mesh>
        <mesh position={[0, seatH + 0.03, 0.02]} castShadow receiveShadow>
          <boxGeometry args={[sw * 0.92, sh * 1.1, sd * 0.85]} />
          <Mat color={seatTint} map={meshMat.map} roughness={meshMat.roughness} metalness={meshMat.metalness} />
        </mesh>
        <mesh position={[0, seatH + backH * 0.48, -sd * 0.36]} castShadow>
          <boxGeometry args={[sw * 0.95, backH, 0.06]} />
          <Mat color={seatTint} map={meshMat.map} roughness={meshMat.roughness} />
        </mesh>
        {([-1, 1] as const).map((side) => (
          <mesh key={side} position={[side * sw * 0.5, seatH + 0.12, 0]} castShadow>
            <boxGeometry args={[0.04, 0.08, sd * 0.65]} />
            <Mat color="#334155" metalness={0.4} roughness={0.45} />
          </mesh>
        ))}
      </group>
    );
  }

  if (chairType === 'BARSTOOL') {
    return (
      <group position={position} rotation={[0, rotationY, 0]}>
        <mesh position={[0, seatH * 0.5, 0]} castShadow>
          <cylinderGeometry args={[0.028, 0.04, seatH * 1.1, 14]} />
          <Mat color={visual.frameColor} metalness={0.7} roughness={0.25} />
        </mesh>
        <mesh position={[0, 0.35, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <torusGeometry args={[0.24, 0.016, 10, 24]} />
          <Mat color="#52525b" metalness={0.75} roughness={0.22} />
        </mesh>
        <mesh position={[0, 0.04, 0]} castShadow>
          <cylinderGeometry args={[0.26, 0.3, 0.06, 20]} />
          <Mat color="#3f3f46" metalness={0.45} roughness={0.4} />
        </mesh>
        <mesh position={[0, seatH + 0.02, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[sw * 0.48, sw * 0.5, sh * 1.4, 24]} />
          <Mat color={seatTint} map={map} roughness={fabric.roughness} metalness={fabric.metalness} />
        </mesh>
        {backH > 0.1 && (
          <mesh position={[0, seatH + backH * 0.45, -sd * 0.28]} castShadow>
            <boxGeometry args={[sw * 0.75, backH, 0.04]} />
            <Mat color={seatTint} map={map} roughness={fabric.roughness} />
          </mesh>
        )}
      </group>
    );
  }

  if (chairType === 'POUF') {
    return (
      <group position={position} rotation={[0, rotationY, 0]}>
        <mesh position={[0, sh * 0.55, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[sw * 0.5, sw * 0.52, sh * 1.1, 28]} />
          <Mat color={seatTint} map={map} roughness={0.92} metalness={0.02} />
        </mesh>
        <mesh position={[0, sh * 1.05, 0]} castShadow>
          <cylinderGeometry args={[sw * 0.48, sw * 0.5, 0.04, 28]} />
          <Mat color={seatTint} map={map} roughness={0.95} metalness={0.02} />
        </mesh>
      </group>
    );
  }

  // Chiavari / banquet / fauteuil / modern
  const isChiavari = style === 'chiavari' || (chairType === 'BANQUET' && style === 'napoleon');
  const isTolix = style === 'tolix';
  const isArmchair = chairType === 'ARMCHAIR' || style === 'lounge' || style === 'club' || style === 'bergere';
  const isBanquet = chairType === 'BANQUET' && !isChiavari;
  const legR = isChiavari ? 0.011 : isTolix ? 0.014 : isArmchair ? 0.028 : 0.02;

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {([-1, 1] as const).flatMap((sx) =>
        ([-1, 1] as const).map((sz) => (
          <mesh key={`${sx}-${sz}`} position={[sx * sw * 0.38, seatH / 2, sz * sd * 0.36]} castShadow>
            <cylinderGeometry args={[legR, legR * 1.15, seatH, isChiavari ? 8 : 12]} />
            <Mat
              color={visual.frameColor}
              metalness={isChiavari ? 0.85 : isTolix ? 0.82 : 0.35}
              roughness={isChiavari ? 0.2 : isTolix ? 0.25 : 0.45}
            />
          </mesh>
        )),
      )}

      {style === 'louis' || style === 'ovalBack' ? (
        <>
          <mesh position={[0, seatH, 0]} castShadow receiveShadow>
            <boxGeometry args={[sw * 1.02, 0.05, sd]} />
            <Mat color={visual.frameColor} roughness={0.45} metalness={0.15} />
          </mesh>
          <mesh position={[0, seatH + 0.04, 0]} castShadow>
            <boxGeometry args={[sw * 0.9, 0.04, sd * 0.88]} />
            <Mat color={seatTint} map={map} roughness={0.7} />
          </mesh>
          <mesh position={[0, seatH + backH * 0.48, -sd * 0.4]} castShadow>
            <boxGeometry args={[sw * 0.55, backH * 0.85, 0.06]} />
            <Mat color={visual.frameColor} roughness={0.4} metalness={0.12} />
          </mesh>
          <mesh position={[0, seatH + backH * 0.62, -sd * 0.36]} rotation={[0.08, 0, 0]} castShadow>
            <sphereGeometry args={[sw * 0.28, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.72]} />
            <Mat color={seatTint} map={map} roughness={0.65} />
          </mesh>
        </>
      ) : isChiavari ? (
        <>
          <mesh position={[0, seatH, 0]} castShadow receiveShadow>
            <boxGeometry args={[sw, 0.04, sd]} />
            <Mat color={seatTint} map={map} roughness={0.55} metalness={0.1} />
          </mesh>
          {/* Dossier ajouré chiavari */}
          <mesh position={[-sw * 0.38, seatH + backH * 0.5, -sd * 0.42]} castShadow>
            <cylinderGeometry args={[0.01, 0.01, backH, 8]} />
            <Mat color={visual.frameColor} metalness={0.85} roughness={0.2} />
          </mesh>
          <mesh position={[sw * 0.38, seatH + backH * 0.5, -sd * 0.42]} castShadow>
            <cylinderGeometry args={[0.01, 0.01, backH, 8]} />
            <Mat color={visual.frameColor} metalness={0.85} roughness={0.2} />
          </mesh>
          <mesh position={[0, seatH + backH * 0.85, -sd * 0.42]} castShadow>
            <torusGeometry args={[sw * 0.28, 0.01, 8, 20, Math.PI]} />
            <Mat color={visual.frameColor} metalness={0.85} roughness={0.2} />
          </mesh>
          <mesh position={[0, seatH + backH * 0.35, -sd * 0.42]} castShadow>
            <boxGeometry args={[sw * 0.55, 0.015, 0.015]} />
            <Mat color={visual.frameColor} metalness={0.85} roughness={0.2} />
          </mesh>
          <mesh position={[0, seatH + 0.03, 0]} castShadow>
            <boxGeometry args={[sw * 0.85, 0.025, sd * 0.85]} />
            <Mat color="#f8fafc" roughness={0.7} />
          </mesh>
        </>
      ) : isArmchair ? (
        <>
          <mesh position={[0, seatH - 0.02, 0]} castShadow>
            <boxGeometry args={[sw * 1.08, 0.1, sd * 1.05]} />
            <Mat color={visual.frameColor} metalness={0.15} roughness={0.55} />
          </mesh>
          <mesh position={[0, seatH + sh * 0.5, 0.02]} castShadow receiveShadow>
            <boxGeometry args={[sw, sh * 1.35, sd * 0.92]} />
            <Mat color={seatTint} map={map} roughness={fabric.roughness} metalness={fabric.metalness} />
          </mesh>
          <mesh position={[0, seatH + backH * 0.48, -sd * 0.4]} castShadow>
            <boxGeometry args={[sw * 1.05, backH, 0.14]} />
            <Mat color={seatTint} map={map} roughness={fabric.roughness} metalness={fabric.metalness} />
          </mesh>
          {style === 'bergere' && (
            <mesh position={[0, seatH + backH * 0.85, -sd * 0.32]} castShadow>
              <torusGeometry args={[sw * 0.35, 0.025, 8, 16, Math.PI]} />
              <Mat color={visual.frameColor} metalness={0.4} roughness={0.4} />
            </mesh>
          )}
          {([-1, 1] as const).map((side) => (
            <group key={side} position={[side * sw * 0.52, seatH + 0.14, -0.02]}>
              <mesh castShadow>
                <boxGeometry args={[0.11, 0.14 * visual.scale, sd * 0.82]} />
                <Mat color={seatTint} map={map} roughness={fabric.roughness} metalness={fabric.metalness} />
              </mesh>
              <mesh position={[0, -0.12, sd * 0.2]} castShadow>
                <cylinderGeometry args={[0.022, 0.025, 0.26 * visual.scale, 10]} />
                <Mat color={visual.frameColor} metalness={0.35} roughness={0.45} />
              </mesh>
            </group>
          ))}
        </>
      ) : (
        <>
          {/* Banquet classique */}
          <mesh position={[0, seatH - sh * 0.1, 0]} castShadow>
            <boxGeometry args={[sw * 1.02, sh * 0.4, sd * 1.02]} />
            <Mat color={visual.frameColor} metalness={isBanquet ? 0.55 : 0.25} roughness={0.4} />
          </mesh>
          <mesh position={[0, seatH + sh * 0.4, 0]} castShadow receiveShadow>
            <boxGeometry args={[sw, sh * (visual.cushion ? 1.15 : 0.7), sd]} />
            <Mat color={seatTint} map={map} roughness={fabric.roughness} metalness={fabric.metalness} />
          </mesh>
          <mesh position={[0, seatH + backH * 0.48, -sd * 0.42]} castShadow>
            <boxGeometry args={[sw * 0.92, backH, 0.05]} />
            <Mat color={seatTint} map={map} roughness={fabric.roughness} metalness={fabric.metalness} />
          </mesh>
          {isBanquet && (
            <mesh position={[0, seatH + backH * 0.75, -sd * 0.4]} castShadow>
              <torusGeometry args={[sw * 0.26, 0.012, 8, 18, Math.PI]} />
              <Mat color={visual.frameColor} metalness={0.75} roughness={0.25} />
            </mesh>
          )}
          {visual.hasArms && ([-1, 1] as const).map((side) => (
            <group key={side} position={[side * sw * 0.48, seatH + 0.12, 0]}>
              <mesh castShadow>
                <boxGeometry args={[0.05, 0.07, sd * 0.75]} />
                <Mat color={visual.frameColor} metalness={0.5} roughness={0.35} />
              </mesh>
            </group>
          ))}
        </>
      )}
    </group>
  );
}

type TableMat = ReturnType<typeof resolveTableMaterial>;

/** Structure de table catalogue selon la forme. */
export function CatalogueTableStructure({
  shape,
  size,
  topY,
  mat,
  selected,
}: {
  shape: TableShape;
  size: [number, number];
  topY: number;
  mat: TableMat;
  selected: boolean;
}) {
  const topColor = selected ? '#c7d2fe' : mat.color;
  const topMat = {
    map: mat.map,
    roughness: mat.roughness,
    metalness: mat.metalness,
    transparent: mat.transparent,
    opacity: mat.opacity,
    bumpMap: mat.bumpMap,
    bumpScale: mat.bumpScale,
  };
  const isRound = shape === 'round' || shape === 'oval' || shape === 'cocktail' || shape === 'highTop';
  const segments = shape === 'oval' ? 40 : 48;

  if (shape === 'arc') {
    return (
      <CatalogueArcTable
        size={size}
        topY={topY}
        color={topColor}
        selected={selected}
      />
    );
  }

  if (shape === 'cocktail') {
    return (
      <group>
        <mesh position={[0, topY, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[size[0] / 2, size[0] / 2, 0.05, segments]} />
          <Mat
            color={topColor}
            {...topMat}
            roughness={mat.roughness ?? 0.35}
            metalness={mat.metalness ?? 0.12}
          />
        </mesh>
        <mesh position={[0, topY / 2, 0]} castShadow>
          <cylinderGeometry args={[0.04, 0.07, topY - 0.06, 14]} />
          <Mat color="#a8a29e" metalness={0.75} roughness={0.22} />
        </mesh>
        <mesh position={[0, 0.03, 0]} castShadow>
          <cylinderGeometry args={[0.22, 0.26, 0.05, 24]} />
          <Mat color="#57534e" metalness={0.5} roughness={0.4} />
        </mesh>
        {/* Bord chrome */}
        <mesh position={[0, topY + 0.01, 0]}>
          <torusGeometry args={[size[0] / 2 - 0.01, 0.012, 8, 32]} />
          <Mat color="#e2e8f0" metalness={0.85} roughness={0.15} />
        </mesh>
      </group>
    );
  }

  if (shape === 'highTop') {
    return (
      <group>
        <mesh position={[0, topY, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[size[0] / 2, size[0] / 2, 0.055, segments]} />
          <Mat color={topColor} {...topMat} />
        </mesh>
        <mesh position={[0, topY * 0.52, 0]} castShadow>
          <cylinderGeometry args={[0.045, 0.07, topY - 0.1, 16]} />
          <Mat color="#71717a" metalness={0.7} roughness={0.25} />
        </mesh>
        <mesh position={[0, topY * 0.35, 0]} castShadow>
          <torusGeometry args={[0.09, 0.015, 10, 20]} />
          <Mat color="#a1a1aa" metalness={0.8} roughness={0.2} />
        </mesh>
        {/* Repose-pieds */}
        <mesh position={[0, 0.35, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <torusGeometry args={[0.28, 0.018, 10, 28]} />
          <Mat color="#52525b" metalness={0.75} roughness={0.25} />
        </mesh>
        <mesh position={[0, 0.04, 0]} castShadow>
          <cylinderGeometry args={[0.3, 0.34, 0.06, 28]} />
          <Mat color="#3f3f46" metalness={0.45} roughness={0.4} />
        </mesh>
      </group>
    );
  }

  if (shape === 'oval') {
    return (
      <group>
        <mesh position={[0, topY, 0]} scale={[1, 1, size[1] / size[0]]} castShadow receiveShadow>
          <cylinderGeometry args={[size[0] / 2, size[0] / 2, 0.06, segments]} />
          <Mat color={topColor} {...topMat} />
        </mesh>
        <mesh position={[0, topY - 0.04, 0]} scale={[1, 1, size[1] / size[0]]} castShadow>
          <cylinderGeometry args={[size[0] / 2 * 1.01, size[0] / 2 * 0.96, 0.035, segments]} />
          <Mat color="#5c4030" roughness={0.55} metalness={0.08} />
        </mesh>
        {/* Nappe */}
        <mesh position={[0, topY + 0.032, 0]} scale={[1, 1, size[1] / size[0]]} receiveShadow>
          <cylinderGeometry args={[size[0] / 2 * 0.9, size[0] / 2 * 0.9, 0.01, 36]} />
          <meshStandardMaterial color="#faf7f2" transparent opacity={0.55} roughness={0.85} />
        </mesh>
        <mesh position={[0, topY / 2, 0]} castShadow>
          <cylinderGeometry args={[0.06, 0.1, topY - 0.08, 14]} />
          <Mat color="#6b7280" metalness={0.6} roughness={0.3} />
        </mesh>
        <mesh position={[0, 0.035, 0]} castShadow>
          <cylinderGeometry args={[0.34, 0.38, 0.06, 28]} />
          <Mat color="#44403c" metalness={0.35} roughness={0.45} />
        </mesh>
      </group>
    );
  }

  if (isRound) {
    // round banquet
    return (
      <group>
        <mesh position={[0, topY, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[size[0] / 2, size[0] / 2, 0.06, segments]} />
          <Mat color={topColor} {...topMat} />
        </mesh>
        <mesh position={[0, topY - 0.035, 0]} castShadow>
          <cylinderGeometry args={[size[0] / 2 * 1.015, size[0] / 2 * 0.97, 0.03, segments]} />
          <Mat color="#5c4030" roughness={0.55} metalness={0.1} />
        </mesh>
        <mesh position={[0, topY + 0.035, 0]} receiveShadow>
          <cylinderGeometry args={[size[0] / 2 * 0.9, size[0] / 2 * 0.9, 0.012, 40]} />
          <meshStandardMaterial color="#faf7f2" transparent opacity={0.5} roughness={0.85} />
        </mesh>
        {/* Jupe de nappe */}
        <mesh position={[0, topY - 0.12, 0]} castShadow>
          <cylinderGeometry args={[size[0] / 2 * 0.98, size[0] / 2 * 0.98, 0.18, 36]} />
          <meshStandardMaterial color="#f5f0e8" transparent opacity={0.35} roughness={0.9} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, topY / 2, 0]} castShadow>
          <cylinderGeometry args={[0.055, 0.09, topY - 0.08, 16]} />
          <Mat color="#6b7280" metalness={0.65} roughness={0.28} />
        </mesh>
        <mesh position={[0, topY * 0.55, 0]} castShadow>
          <torusGeometry args={[0.1, 0.018, 10, 24]} />
          <Mat color="#9ca3af" metalness={0.8} roughness={0.2} />
        </mesh>
        <mesh position={[0, 0.035, 0]} castShadow>
          <cylinderGeometry args={[0.32, 0.38, 0.07, 28]} />
          <Mat color="#3f3f46" metalness={0.4} roughness={0.45} />
        </mesh>
      </group>
    );
  }

  // rectangular / square
  const legInset = shape === 'square' ? 0.36 : 0.4;
  return (
    <group>
      <mesh position={[0, topY, 0]} castShadow receiveShadow>
        <boxGeometry args={[size[0], 0.055, size[1]]} />
        <Mat color={topColor} {...topMat} />
      </mesh>
      <mesh position={[0, topY - 0.08, 0]} castShadow>
        <boxGeometry args={[size[0] * 0.96, 0.1, size[1] * 0.96]} />
        <Mat color="#4a3728" roughness={0.6} metalness={0.08} />
      </mesh>
      <mesh position={[0, topY + 0.032, 0]} receiveShadow>
        <boxGeometry args={[size[0] * 0.9, 0.012, size[1] * 0.9]} />
        <meshStandardMaterial color="#faf7f2" transparent opacity={0.5} roughness={0.85} />
      </mesh>
      {/* Traverses */}
      <mesh position={[0, topY * 0.35, 0]} castShadow>
        <boxGeometry args={[size[0] * 0.72, 0.04, 0.04]} />
        <Mat color="#57534e" metalness={0.3} roughness={0.5} />
      </mesh>
      <mesh position={[0, topY * 0.35, 0]} castShadow>
        <boxGeometry args={[0.04, 0.04, size[1] * 0.72]} />
        <Mat color="#57534e" metalness={0.3} roughness={0.5} />
      </mesh>
      {([-1, 1] as const).flatMap((sx) =>
        ([-1, 1] as const).map((sz) => (
          <group key={`${sx}-${sz}`} position={[sx * size[0] * legInset, 0, sz * size[1] * legInset]}>
            <mesh position={[0, topY / 2, 0]} castShadow>
              <boxGeometry args={[0.055, topY - 0.05, 0.055]} />
              <Mat color="#57534e" metalness={0.4} roughness={0.4} />
            </mesh>
            <mesh position={[0, 0.03, 0]} castShadow>
              <boxGeometry args={[0.09, 0.05, 0.09]} />
              <Mat color="#44403c" metalness={0.3} roughness={0.5} />
            </mesh>
          </group>
        )),
      )}
    </group>
  );
}

export function CatalogueColumn({
  w,
  d,
  height,
  map,
  selected,
  pickable,
  square = false,
  fluted = false,
}: {
  w: number;
  d: number;
  height: number;
  map: THREE.Texture | null;
  selected: boolean;
  pickable: boolean;
  square?: boolean;
  fluted?: boolean;
}) {
  const r = Math.min(w, d) / 2;
  const raycast = pickable ? undefined : () => null;
  return (
    <group>
      {/* Base */}
      <mesh position={[0, 0.06, 0]} castShadow receiveShadow raycast={raycast}>
        {square ? <boxGeometry args={[r * 2.2, 0.12, r * 2.2]} /> : <cylinderGeometry args={[r * 1.25, r * 1.35, 0.12, 24]} />}
        <Mat color={selected ? '#c7d2fe' : '#d6d3d1'} map={map} roughness={0.8} />
      </mesh>
      {/* Fût */}
      <mesh position={[0, height / 2, 0]} castShadow raycast={raycast}>
        {square
          ? <boxGeometry args={[r * 1.7, height * 0.88, r * 1.7]} />
          : <cylinderGeometry args={[r * 0.92, r, height * 0.88, fluted ? 32 : 24]} />}
        <Mat color={selected ? '#c7d2fe' : '#ffffff'} map={map} roughness={0.82} />
      </mesh>
      {fluted && !square
        ? Array.from({ length: 12 }).map((_, i) => {
            const a = (i / 12) * Math.PI * 2;
            return (
              <mesh key={i} position={[Math.cos(a) * r * 0.9, height / 2, Math.sin(a) * r * 0.9]} castShadow raycast={raycast}>
                <cylinderGeometry args={[r * 0.07, r * 0.075, height * 0.82, 8]} />
                <Mat color={selected ? '#c7d2fe' : '#f5f5f4'} map={map} roughness={0.7} />
              </mesh>
            );
          })
        : null}
      {/* Chapiteau */}
      <mesh position={[0, height - 0.08, 0]} castShadow raycast={raycast}>
        {square ? <boxGeometry args={[r * 2.15, 0.14, r * 2.15]} /> : <cylinderGeometry args={[r * 1.3, r * 1.15, 0.14, 24]} />}
        <Mat color={selected ? '#c7d2fe' : '#e7e5e4'} map={map} roughness={0.75} />
      </mesh>
    </group>
  );
}

export function CatalogueFlower({
  w,
  d,
  height,
  color,
  selected,
  map,
}: {
  w: number;
  d: number;
  height: number;
  color: string;
  selected: boolean;
  map: THREE.Texture | null;
}) {
  const bloom = Math.min(w, d) * 0.32;
  return (
    <group>
      <mesh position={[0, 0.04, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.14, 0.08, 16]} />
        <Mat color="#78716c" roughness={0.7} />
      </mesh>
      <mesh position={[0, height * 0.28, 0]} castShadow>
        <cylinderGeometry args={[0.045, 0.07, height * 0.45, 10]} />
        <Mat color="#166534" roughness={0.85} />
      </mesh>
      {/* Feuillage */}
      {([-0.6, 0, 0.6] as const).map((a, i) => (
        <mesh
          key={i}
          position={[Math.sin(a) * bloom * 0.4, height * 0.42, Math.cos(a) * bloom * 0.3]}
          rotation={[0.4, a, 0.2]}
          castShadow
        >
          <sphereGeometry args={[bloom * 0.35, 10, 10]} />
          <Mat color="#15803d" roughness={0.9} />
        </mesh>
      ))}
      <mesh position={[0, height * 0.62, 0]} castShadow>
        <sphereGeometry args={[bloom, 14, 14]} />
        <Mat color={selected ? '#fda4af' : color} map={map} roughness={0.65} />
      </mesh>
      {[0, 1, 2, 3, 4].map((i) => {
        const a = (i / 5) * Math.PI * 2;
        return (
          <mesh
            key={i}
            position={[Math.cos(a) * bloom * 0.55, height * 0.68, Math.sin(a) * bloom * 0.55]}
            castShadow
          >
            <sphereGeometry args={[bloom * 0.28, 10, 10]} />
            <Mat color={selected ? '#fecdd3' : color} roughness={0.7} />
          </mesh>
        );
      })}
    </group>
  );
}

export function CatalogueBuffet({
  w,
  d,
  height,
  map,
  baseColor,
  selected,
  hasCouverts,
}: {
  w: number;
  d: number;
  height: number;
  map: THREE.Texture | null;
  baseColor: string;
  selected: boolean;
  hasCouverts?: boolean;
}) {
  return (
    <group>
      {/* Corps */}
      <mesh position={[0, height * 0.4, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, height * 0.8, d]} />
        <Mat color={selected ? '#c7d2fe' : map ? '#ffffff' : baseColor} map={map} roughness={0.5} metalness={0.06} />
      </mesh>
      {/* Portes / panneaux */}
      {([-0.28, 0.28] as const).map((x) => (
        <mesh key={x} position={[x * w, height * 0.4, d * 0.501]} castShadow>
          <boxGeometry args={[w * 0.4, height * 0.65, 0.02]} />
          <Mat color="#5c4030" roughness={0.55} metalness={0.08} />
        </mesh>
      ))}
      {([-0.28, 0.28] as const).map((x) => (
        <mesh key={`h-${x}`} position={[x * w + w * 0.12, height * 0.4, d * 0.52]} castShadow>
          <sphereGeometry args={[0.025, 10, 10]} />
          <Mat color="#d4af37" metalness={0.85} roughness={0.2} />
        </mesh>
      ))}
      {/* Plateau */}
      <mesh position={[0, height + 0.02, 0]} receiveShadow castShadow>
        <boxGeometry args={[w * 1.04, 0.05, d * 1.04]} />
        <Mat color="#f5f0e8" roughness={0.35} metalness={0.08} />
      </mesh>
      {/* Nappe / runner */}
      <mesh position={[0, height + 0.05, 0]} receiveShadow>
        <boxGeometry args={[w * 0.35, 0.01, d * 1.02]} />
        <Mat color="#fef3c7" roughness={0.85} />
      </mesh>
      {hasCouverts !== false && Array.from({ length: Math.max(3, Math.round(w * 2)) }).map((_, i) => {
        const n = Math.max(3, Math.round(w * 2));
        const x = ((i + 0.5) / n - 0.5) * w * 0.85;
        return (
          <group key={i} position={[x, height + 0.09, 0]}>
            <mesh>
              <cylinderGeometry args={[0.07, 0.07, 0.015, 16]} />
              <Mat color="#f8fafc" metalness={0.15} roughness={0.35} />
            </mesh>
            <mesh position={[0, 0.04, 0]}>
              <cylinderGeometry args={[0.03, 0.025, 0.07, 12]} />
              <meshStandardMaterial color="#e0f2fe" transparent opacity={0.45} roughness={0.05} metalness={0.3} />
            </mesh>
            <mesh position={[0.08, 0.02, 0]} rotation={[0, 0, 0.2]}>
              <boxGeometry args={[0.1, 0.004, 0.012]} />
              <Mat color="#94a3b8" metalness={0.8} roughness={0.2} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

export { resolveTableMaterial };
