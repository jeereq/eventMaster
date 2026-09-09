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
  clearcoat?: number;
  clearcoatRoughness?: number;
  transmission?: number;
  ior?: number;
};

function Mat({
  color,
  map,
  roughness = 0.6,
  metalness = 0.05,
  transparent,
  opacity,
  bumpMap,
  bumpScale,
  clearcoat,
  clearcoatRoughness,
  transmission,
  ior,
}: MatProps) {
  const gold = color === '#c9a227' || color === '#d4af37' || color === '#d97706';
  const hasTransmission = typeof transmission === 'number' && transmission > 0;

  if (hasTransmission) {
    return (
      <meshPhysicalMaterial
        color={color}
        map={map ?? undefined}
        roughness={roughness ?? 0.05}
        metalness={metalness ?? 0.05}
        transmission={transmission ?? 0.92}
        ior={ior ?? 1.52}
        thickness={0.05}
        transparent
        opacity={opacity ?? 0.9}
        clearcoat={clearcoat ?? 1.0}
        clearcoatRoughness={clearcoatRoughness ?? 0.05}
        envMapIntensity={1.5}
      />
    );
  }

  if (typeof clearcoat === 'number' && clearcoat > 0) {
    return (
      <meshPhysicalMaterial
        color={color}
        map={map ?? undefined}
        roughness={gold && roughness > 0.28 ? 0.18 : roughness}
        metalness={gold && metalness < 0.5 ? 0.88 : metalness}
        clearcoat={clearcoat}
        clearcoatRoughness={clearcoatRoughness ?? 0.15}
        envMapIntensity={gold ? 1.35 : 1.15}
        transparent={transparent}
        opacity={opacity}
        bumpMap={bumpMap}
        bumpScale={bumpScale}
      />
    );
  }

  return (
    <meshStandardMaterial
      color={color}
      map={map ?? undefined}
      roughness={gold && roughness > 0.28 ? 0.18 : roughness}
      metalness={gold && metalness < 0.5 ? 0.88 : metalness}
      envMapIntensity={gold ? 1.25 : 1}
      transparent={transparent}
      opacity={opacity}
      bumpMap={bumpMap}
      bumpScale={bumpScale}
    />
  );
}

const SELECT_ACCENT = '#4573d2';

/** Anneau au sol : sélection nette, survol discret — sans teinter le bois ni le tissu. */
export function FurnitureSelectionHalo({
  width,
  depth,
  round,
  selected,
  hovered,
}: {
  width: number;
  depth: number;
  round?: boolean;
  selected?: boolean;
  hovered?: boolean;
}) {
  if (!selected && !hovered) return null;
  const opacity = selected ? 0.92 : 0.42;
  if (round) {
    const r = Math.max(width, depth) / 2 + 0.1;
    return (
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]} renderOrder={3}>
        <ringGeometry args={[r, r + 0.055, 48]} />
        <meshBasicMaterial color={SELECT_ACCENT} transparent opacity={opacity} depthWrite={false} />
      </mesh>
    );
  }
  const hw = width / 2 + 0.08;
  const hd = depth / 2 + 0.08;
  const t = 0.048;
  return (
    <group position={[0, 0.012, 0]} renderOrder={3}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, hd]}>
        <planeGeometry args={[width + 0.16, t]} />
        <meshBasicMaterial color={SELECT_ACCENT} transparent opacity={opacity} depthWrite={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -hd]}>
        <planeGeometry args={[width + 0.16, t]} />
        <meshBasicMaterial color={SELECT_ACCENT} transparent opacity={opacity} depthWrite={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[hw, 0, 0]}>
        <planeGeometry args={[t, depth]} />
        <meshBasicMaterial color={SELECT_ACCENT} transparent opacity={opacity} depthWrite={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-hw, 0, 0]}>
        <planeGeometry args={[t, depth]} />
        <meshBasicMaterial color={SELECT_ACCENT} transparent opacity={opacity} depthWrite={false} />
      </mesh>
    </group>
  );
}

export function ChairSelectionHalo({
  selected,
  hovered,
  radius = 0.34,
}: {
  selected?: boolean;
  hovered?: boolean;
  radius?: number;
}) {
  if (!selected && !hovered) return null;
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.014, 0]} renderOrder={3}>
      <ringGeometry args={[radius * 0.72, radius, 36]} />
      <meshBasicMaterial
        color={SELECT_ACCENT}
        transparent
        opacity={selected ? 0.95 : 0.45}
        depthWrite={false}
      />
    </mesh>
  );
}

/** Volume invisible : la chaise reste cliquable même en vue zénithale. */
export function ChairPickVolume() {
  return (
    <mesh position={[0, 0.46, 0]}>
      <cylinderGeometry args={[0.32, 0.32, 0.96, 12]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  );
}

function CatalogueChairMesh({
  chairType,
  chairStyle,
  seatMaterial,
  imageUrl,
  position,
  rotationY = 0,
}: {
  chairType: ChairType;
  chairStyle?: ChairStyle;
  seatMaterial?: SeatMaterial;
  imageUrl?: string;
  position: [number, number, number];
  rotationY?: number;
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
  const seatTint = visual.seatColor;
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
        {/* Pied central en fonte d'acier & platine de fixation au sol */}
        <mesh position={[0, seatH * 0.45, -sd * 0.05]} castShadow>
          <cylinderGeometry args={[0.032, 0.042, seatH * 0.9, 12]} />
          <Mat color="#1f2937" metalness={0.65} roughness={0.35} />
        </mesh>
        <mesh position={[0, 0.015, -sd * 0.05]} castShadow receiveShadow>
          <cylinderGeometry args={[0.12, 0.14, 0.03, 14]} />
          <Mat color="#111827" metalness={0.7} roughness={0.3} />
        </mesh>
        {/* Mécanisme d'articulation sous assise */}
        <mesh position={[0, seatH - 0.02, -sd * 0.12]} castShadow>
          <boxGeometry args={[sw * 0.78, 0.045, sd * 0.32]} />
          <Mat color="#1f2937" metalness={0.6} roughness={0.4} />
        </mesh>
        {/* Coque inférieure d'assise */}
        <mesh position={[0, seatH + 0.01, 0.02]} rotation={[-0.1, 0, 0]} castShadow>
          <boxGeometry args={[sw * 0.94, 0.025, sd * 0.86]} />
          <Mat color="#1c1917" metalness={0.2} roughness={0.55} />
        </mesh>
        {/* Coussin d'assise rembourré ergonomique */}
        <mesh position={[0, seatH + 0.04, 0.02]} rotation={[-0.1, 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[sw * 0.92, sh * 1.35, sd * 0.85]} />
          <Mat color={seatTint} map={map} roughness={0.88} metalness={0.04} />
        </mesh>
        {/* Dossier rembourré face avant */}
        <mesh position={[0, seatH + backH * 0.5, -sd * 0.37]} rotation={[0.06, 0, 0]} castShadow>
          <boxGeometry args={[sw * 0.94, backH * 0.98, 0.08]} />
          <Mat color={seatTint} map={map} roughness={0.9} metalness={0.03} />
        </mesh>
        {/* Coque arrière rigide de protection acoustique */}
        <mesh position={[0, seatH + backH * 0.5, -sd * 0.42]} rotation={[0.06, 0, 0]} castShadow>
          <boxGeometry args={[sw * 0.96, backH, 0.025]} />
          <Mat color="#1c1917" metalness={0.25} roughness={0.45} />
        </mesh>
        {/* Plaque numéro de siège en laiton au dos */}
        <mesh position={[0, seatH + backH * 0.92, -sd * 0.435]} rotation={[0.06, 0, 0]}>
          <boxGeometry args={[0.065, 0.026, 0.006]} />
          <Mat color="#c4a35a" metalness={0.75} roughness={0.2} />
        </mesh>
        {/* Accoudoirs latéraux avec porte-gobelet intégré */}
        {([-1, 1] as const).map((side) => (
          <group key={side}>
            {/* Montant vertical d'accoudoir */}
            <mesh position={[side * sw * 0.48, seatH * 0.65, -sd * 0.05]} castShadow>
              <boxGeometry args={[0.045, seatH * 0.7, sd * 0.42]} />
              <Mat color="#1f2937" metalness={0.6} roughness={0.35} />
            </mesh>
            {/* Coussin d'accoudoir */}
            <mesh position={[side * sw * 0.48, seatH + 0.18, -sd * 0.05]} castShadow>
              <boxGeometry args={[0.065, 0.04, sd * 0.65]} />
              <Mat color={seatTint} map={map} roughness={0.82} />
            </mesh>
            {/* Porte-gobelet avant */}
            <mesh position={[side * sw * 0.48, seatH + 0.17, sd * 0.24]} castShadow>
              <cylinderGeometry args={[0.032, 0.032, 0.035, 12]} />
              <Mat color="#111827" metalness={0.65} roughness={0.3} />
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
          <group key={`w-${side}`}>
            <mesh position={[side * sw * 0.42, 0.22, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
              <torusGeometry args={[0.22, 0.035, 10, 22]} />
              <Mat color="#111827" metalness={0.65} roughness={0.35} />
            </mesh>
            <mesh position={[side * sw * 0.42, 0.22, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.03, 0.03, 0.04, 10]} />
              <Mat color="#94a3b8" metalness={0.55} roughness={0.3} />
            </mesh>
          </group>
        ))}
        <mesh position={[0, 0.08, sd * 0.48]} castShadow>
          <sphereGeometry args={[0.055, 12, 12]} />
          <Mat color="#1f2937" metalness={0.5} roughness={0.4} />
        </mesh>
        <mesh position={[0, 0.12, sd * 0.55]} castShadow>
          <boxGeometry args={[sw * 0.55, 0.02, 0.16]} />
          <Mat color="#334155" metalness={0.45} roughness={0.4} />
        </mesh>
        {([-1, 1] as const).map((side) => (
          <mesh key={`h-${side}`} position={[side * sw * 0.28, seatH + backH * 0.85, -sd * 0.52]} castShadow>
            <torusGeometry args={[0.04, 0.012, 8, 14, Math.PI]} />
            <Mat color="#334155" metalness={0.5} roughness={0.35} />
          </mesh>
        ))}
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

  if (chairType === 'GHOST' || style === 'ghost') {
    const ghostMat = { color: '#f8fafc', transparent: true, opacity: 0.38, roughness: 0.08, metalness: 0.12 };
    return (
      <group position={position} rotation={[0, rotationY, 0]}>
        {([-1, 1] as const).flatMap((sx) =>
          ([-1, 1] as const).map((sz) => (
            <mesh key={`${sx}-${sz}`} position={[sx * sw * 0.34, seatH * 0.5, sz * sd * 0.32]} castShadow>
              <cylinderGeometry args={[0.012, 0.014, seatH, 8]} />
              <meshStandardMaterial {...ghostMat} />
            </mesh>
          )),
        )}
        <mesh position={[0, seatH + 0.02, 0]} castShadow receiveShadow>
          <boxGeometry args={[sw, 0.04, sd]} />
          <meshStandardMaterial {...ghostMat} opacity={0.42} />
        </mesh>
        <mesh position={[0, seatH + backH * 0.45, -sd * 0.35]} castShadow>
          <boxGeometry args={[sw * 0.92, backH, 0.035]} />
          <meshStandardMaterial {...ghostMat} opacity={0.4} />
        </mesh>
        <mesh position={[0, seatH + backH * 0.75, -sd * 0.33]} castShadow>
          <torusGeometry args={[sw * 0.3, 0.012, 8, 20, Math.PI]} />
          <meshStandardMaterial {...ghostMat} />
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

  if (style === 'panton') {
    return (
      <group position={position} rotation={[0, rotationY, 0]}>
        <mesh position={[0, seatH * 0.35, 0.04]} rotation={[0.35, 0, 0]} castShadow>
          <boxGeometry args={[sw * 0.85, 0.06, seatH * 0.9]} />
          <Mat color={seatTint} roughness={0.28} metalness={0.08} />
        </mesh>
        <mesh position={[0, seatH + 0.02, 0.02]} castShadow receiveShadow>
          <boxGeometry args={[sw, sh * 1.2, sd]} />
          <Mat color={seatTint} roughness={0.32} metalness={0.08} />
        </mesh>
        <mesh position={[0, seatH + backH * 0.48, -sd * 0.28]} rotation={[0.28, 0, 0]} castShadow>
          <boxGeometry args={[sw * 0.92, backH, 0.06]} />
          <Mat color={seatTint} roughness={0.3} metalness={0.08} />
        </mesh>
      </group>
    );
  }

  if (style === 'wishbone') {
    return (
      <group position={position} rotation={[0, rotationY, 0]}>
        {([-1, 1] as const).flatMap((sx) =>
          ([-1, 1] as const).map((sz) => (
            <mesh key={`${sx}-${sz}`} position={[sx * sw * 0.34, seatH / 2, sz * sd * 0.32]} castShadow>
              <cylinderGeometry args={[0.014, 0.016, seatH, 10]} />
              <Mat color={visual.frameColor} roughness={0.48} metalness={0.12} />
            </mesh>
          )),
        )}
        <mesh position={[0, seatH, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[sw * 0.48, sw * 0.5, 0.04, 22]} />
          <Mat color={seatTint} map={map} roughness={0.7} />
        </mesh>
        <mesh position={[0, seatH + backH * 0.55, -sd * 0.34]} rotation={[0.12, 0, 0.45]} castShadow>
          <cylinderGeometry args={[0.012, 0.012, backH, 8]} />
          <Mat color={visual.frameColor} roughness={0.45} />
        </mesh>
        <mesh position={[0, seatH + backH * 0.55, -sd * 0.34]} rotation={[0.12, 0, -0.45]} castShadow>
          <cylinderGeometry args={[0.012, 0.012, backH, 8]} />
          <Mat color={visual.frameColor} roughness={0.45} />
        </mesh>
        <mesh position={[0, seatH + backH * 0.88, -sd * 0.36]} castShadow>
          <torusGeometry args={[sw * 0.18, 0.012, 8, 16, Math.PI]} />
          <Mat color={visual.frameColor} roughness={0.42} />
        </mesh>
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
  const isChiavari = style === 'chiavari' || style === 'tiffany' || (chairType === 'BANQUET' && style === 'napoleon');
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

      {style === 'louis' || style === 'ovalBack' || style === 'phoenix' ? (
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
          {style === 'tiffany' && (
            <mesh position={[0, seatH + backH * 0.55, -sd * 0.38]} rotation={[0.1, 0, 0.4]} castShadow>
              <boxGeometry args={[0.06, backH * 0.7, 0.012]} />
              <Mat color="#be185d" roughness={0.65} />
            </mesh>
          )}
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
          {/* Banquet classique — assise ronde, dossier légèrement cambré */}
          <mesh position={[0, seatH * 0.12, 0]} castShadow>
            <cylinderGeometry args={[0.018, 0.022, 0.04, 10]} />
            <Mat color={visual.frameColor} metalness={0.55} roughness={0.35} />
          </mesh>
          <mesh position={[0, seatH - sh * 0.08, 0]} castShadow>
            <cylinderGeometry args={[sw * 0.5, sw * 0.52, sh * 0.45, 24]} />
            <Mat color={visual.frameColor} metalness={isBanquet ? 0.55 : 0.25} roughness={0.4} />
          </mesh>
          <mesh position={[0, seatH + sh * 0.38, 0.01]} rotation={[-0.06, 0, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[sw * 0.46, sw * 0.48, sh * (visual.cushion ? 1.05 : 0.65), 28]} />
            <Mat color={seatTint} map={map} roughness={fabric.roughness} metalness={fabric.metalness} />
          </mesh>
          <mesh position={[0, seatH + backH * 0.48, -sd * 0.4]} rotation={[0.08, 0, 0]} castShadow>
            <boxGeometry args={[sw * 0.9, backH, 0.055]} />
            <Mat color={seatTint} map={map} roughness={fabric.roughness} metalness={fabric.metalness} />
          </mesh>
          <mesh position={[0, seatH + backH * 0.5, -sd * 0.43]} rotation={[0.08, 0, 0]} castShadow>
            <boxGeometry args={[sw * 0.94, backH * 1.02, 0.02]} />
            <Mat color={visual.frameColor} metalness={0.45} roughness={0.4} />
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

/** Chaise catalogue — halo de sélection + volume de picking. */
export function CatalogueChair({
  chairType,
  chairStyle,
  seatMaterial,
  imageUrl,
  position,
  rotationY = 0,
  selected = false,
  muted = false,
}: {
  chairType: ChairType;
  chairStyle?: ChairStyle;
  seatMaterial?: SeatMaterial;
  imageUrl?: string;
  position: [number, number, number];
  rotationY?: number;
  selected?: boolean;
  muted?: boolean;
}) {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <ChairSelectionHalo selected={selected} />
      {muted ? (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.016, 0]}>
          <circleGeometry args={[0.2, 20]} />
          <meshBasicMaterial color="#1c1917" transparent opacity={0.5} depthWrite={false} />
        </mesh>
      ) : (
        <ChairPickVolume />
      )}
      <CatalogueChairMesh
        chairType={chairType}
        chairStyle={chairStyle}
        seatMaterial={seatMaterial}
        imageUrl={imageUrl}
        position={[0, 0, 0]}
        rotationY={0}
      />
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
  const topColor = mat.color;
  const topMat = {
    map: mat.map,
    roughness: mat.roughness,
    metalness: mat.metalness,
    transparent: mat.transparent,
    opacity: mat.opacity,
    bumpMap: mat.bumpMap,
    bumpScale: mat.bumpScale,
    clearcoat: mat.clearcoat,
    clearcoatRoughness: mat.clearcoatRoughness,
    transmission: mat.transmission,
    ior: mat.ior,
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
        {/* Jupe de nappe — plis */}
        {([0.98, 0.94, 0.9] as const).map((r, i) => (
          <mesh key={r} position={[0, topY - 0.14 - i * 0.05, 0]} castShadow>
            <cylinderGeometry args={[size[0] / 2 * r, size[0] / 2 * (r - 0.01), 0.16 + i * 0.04, 36]} />
            <meshStandardMaterial color={i === 0 ? '#f5f0e8' : '#efe8dc'} transparent opacity={0.32 - i * 0.04} roughness={0.9} side={THREE.DoubleSide} />
          </mesh>
        ))}
        <mesh position={[0, topY + 0.008, 0]}>
          <torusGeometry args={[size[0] / 2 - 0.01, 0.01, 8, 36]} />
          <Mat color="#d6c4b0" metalness={0.25} roughness={0.4} />
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
      <mesh position={[0, topY - 0.18, 0]} castShadow>
        <boxGeometry args={[size[0] * 0.98, 0.16, size[1] * 0.98]} />
        <meshStandardMaterial color="#efe8dc" transparent opacity={0.28} roughness={0.9} side={THREE.DoubleSide} />
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
