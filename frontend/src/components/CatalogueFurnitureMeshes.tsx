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
import { SurfaceMat, type SurfaceFinish } from '@/components/room/SurfaceMaterial';
import { withRepeat } from '@/lib/roomSurfaceFinish';

type MatProps = {
  color: string;
  map?: THREE.Texture | null;
  roughness?: number;
  metalness?: number;
  transparent?: boolean;
  opacity?: number;
  bumpMap?: THREE.Texture;
  bumpScale?: number;
  normalMap?: THREE.Texture | null;
  normalScale?: number;
  clearcoat?: number;
  clearcoatRoughness?: number;
  transmission?: number;
  ior?: number;
  finish?: SurfaceFinish;
  side?: THREE.Side;
};

/** Teintes « bois » (brun orangé, pas trop clair) : les montants reçoivent alors un vrai veinage. */
function isWoodTone(hex: string): boolean {
  const h = hex.replace('#', '');
  if (h.length !== 6) return false;
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min || l > 0.6 || l < 0.08) return false;
  const d = max - min;
  const sat = d / (1 - Math.abs(2 * l - 1));
  let hue = 0;
  if (max === r) hue = ((g - b) / d) % 6;
  else if (max === g) hue = (b - r) / d + 2;
  else hue = (r - g) / d + 4;
  hue *= 60;
  if (hue < 0) hue += 360;
  return hue >= 10 && hue <= 45 && sat >= 0.25;
}

function Mat({
  color,
  map,
  roughness = 0.6,
  metalness = 0.05,
  transparent,
  opacity,
  bumpMap,
  bumpScale,
  normalMap,
  normalScale,
  clearcoat,
  clearcoatRoughness,
  transmission,
  finish,
  side,
}: MatProps) {
  const gold = color === '#c9a227' || color === '#d4af37' || color === '#d97706';
  const hasTransmission = typeof transmission === 'number' && transmission > 0;

  if (hasTransmission) {
    // Verre sans passe de transmission (coût GPU élevé sur mobile) : reflets + transparence.
    return <SurfaceMat color={color} finish="glass" roughness={roughness ?? 0.04} opacity={0.4} />;
  }

  // Un montant « bois » réglé très métallique reste du métal (choix de l'auteur du modèle).
  const requested = finish === 'wood' && metalness >= 0.5 ? undefined : finish;
  const resolvedFinish: SurfaceFinish = requested ?? (gold ? 'brass' : 'auto');
  const dielectric = resolvedFinish === 'wood' || resolvedFinish === 'lacquer';
  return (
    <SurfaceMat
      color={color}
      finish={resolvedFinish}
      map={map}
      normalMap={normalMap}
      normalScale={normalScale}
      bumpMap={bumpMap}
      bumpScale={bumpScale}
      roughness={gold && roughness > 0.28 ? 0.2 : roughness}
      metalness={dielectric ? 0 : gold && metalness < 0.5 ? 0.9 : metalness}
      clearcoat={clearcoat}
      clearcoatRoughness={clearcoatRoughness}
      envMapIntensity={gold ? 1.3 : undefined}
      transparent={transparent}
      opacity={opacity}
      side={side}
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
  // Relief tissu / cuir seulement sur la texture maison (pas sur une photo importée).
  const seatNormal = imageUrl ? null : fabric.normalMap;
  const frameFinish: SurfaceFinish = isWoodTone(visual.frameColor) ? 'wood' : 'auto';
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
          <Mat finish={frameFinish} color={visual.frameColor} metalness={0.55} roughness={0.3} />
        </mesh>
        <mesh position={[0, 0.03, 0]} castShadow>
          <cylinderGeometry args={[0.22, 0.24, 0.05, 20]} />
          <Mat finish={frameFinish} color={visual.frameColor} metalness={0.4} roughness={0.4} />
        </mesh>
        <mesh position={[0, seatH + 0.02, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[sw * 0.48, sw * 0.5, sh * 1.2, 28]} />
          <Mat color={seatTint} map={map} normalMap={seatNormal} normalScale={fabric.normalScale} roughness={fabric.roughness} metalness={fabric.metalness} />
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
              <Mat finish={frameFinish} color={visual.frameColor} metalness={0.15} roughness={0.35} />
            </mesh>
            <mesh position={[side * sw * 0.28, seatH * 0.45, sd * 0.2]} rotation={[-0.35, 0, 0]} castShadow>
              <boxGeometry args={[0.018, seatH * 0.95, 0.018]} />
              <Mat finish={frameFinish} color={visual.frameColor} metalness={0.12} roughness={0.4} />
            </mesh>
          </React.Fragment>
        ))}
        <mesh position={[0, seatH, 0]} castShadow receiveShadow>
          <boxGeometry args={[sw * 0.95, 0.03, sd * 0.9]} />
          <Mat color={seatTint} map={map} normalMap={seatNormal} normalScale={fabric.normalScale} roughness={0.45} metalness={0.08} />
        </mesh>
        <mesh position={[0, seatH + backH * 0.45, -sd * 0.4]} castShadow>
          <boxGeometry args={[sw * 0.9, backH, 0.025]} />
          <Mat color={seatTint} map={map} normalMap={seatNormal} normalScale={fabric.normalScale} roughness={0.5} metalness={0.08} />
        </mesh>
        <mesh position={[0, seatH + backH * 0.7, -sd * 0.38]} castShadow>
          <boxGeometry args={[sw * 0.75, 0.04, 0.03]} />
          <Mat finish={frameFinish} color={visual.frameColor} metalness={0.12} roughness={0.4} />
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
          <Mat color={seatTint} map={map} normalMap={seatNormal} normalScale={fabric.normalScale} roughness={0.88} metalness={0.04} />
        </mesh>
        {/* Dossier rembourré face avant */}
        <mesh position={[0, seatH + backH * 0.5, -sd * 0.37]} rotation={[0.06, 0, 0]} castShadow>
          <boxGeometry args={[sw * 0.94, backH * 0.98, 0.08]} />
          <Mat color={seatTint} map={map} normalMap={seatNormal} normalScale={fabric.normalScale} roughness={0.9} metalness={0.03} />
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
              <Mat color={seatTint} map={map} normalMap={seatNormal} normalScale={fabric.normalScale} roughness={0.82} />
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
          <Mat color={seatTint} map={map} normalMap={seatNormal} normalScale={fabric.normalScale} roughness={fabric.roughness} metalness={fabric.metalness} />
        </mesh>
        <mesh position={[0, seatH + backH * 0.45, -sd * 0.4]} castShadow>
          <boxGeometry args={[sw * 0.9, backH, 0.05]} />
          <Mat color={seatTint} map={map} normalMap={seatNormal} normalScale={fabric.normalScale} roughness={fabric.roughness} />
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
              <Mat finish={frameFinish} color={visual.frameColor} roughness={0.5} metalness={0.15} />
            </mesh>
          )),
        )}
        <mesh position={[0, seatH, 0]} castShadow receiveShadow>
          <boxGeometry args={[sw, sh * 1.1, sd]} />
          <Mat color={seatTint} map={map} normalMap={seatNormal} normalScale={fabric.normalScale} roughness={fabric.roughness} metalness={fabric.metalness} />
        </mesh>
        <mesh position={[0, seatH + backH * 0.45, -sd * 0.38]} castShadow>
          <boxGeometry args={[sw * 0.88, backH, 0.04]} />
          <Mat color={seatTint} map={map} normalMap={seatNormal} normalScale={fabric.normalScale} roughness={fabric.roughness} />
        </mesh>
        {/* Cross-back en X */}
        <mesh position={[0, seatH + backH * 0.55, -sd * 0.4]} rotation={[0.15, 0, 0.55]} castShadow>
          <boxGeometry args={[0.025, backH * 0.85, 0.025]} />
          <Mat finish={frameFinish} color={visual.frameColor} roughness={0.48} />
        </mesh>
        <mesh position={[0, seatH + backH * 0.55, -sd * 0.4]} rotation={[0.15, 0, -0.55]} castShadow>
          <boxGeometry args={[0.025, backH * 0.85, 0.025]} />
          <Mat finish={frameFinish} color={visual.frameColor} roughness={0.48} />
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
          <Mat color={seatTint} map={meshMat.map} normalMap={meshMat.normalMap} normalScale={meshMat.normalScale} roughness={meshMat.roughness} metalness={meshMat.metalness} />
        </mesh>
        <mesh position={[0, seatH + backH * 0.48, -sd * 0.36]} castShadow>
          <boxGeometry args={[sw * 0.95, backH, 0.06]} />
          <Mat color={seatTint} map={meshMat.map} normalMap={meshMat.normalMap} normalScale={meshMat.normalScale} roughness={meshMat.roughness} />
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
          <Mat finish={frameFinish} color={visual.frameColor} metalness={0.7} roughness={0.25} />
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
          <Mat color={seatTint} map={map} normalMap={seatNormal} normalScale={fabric.normalScale} roughness={fabric.roughness} metalness={fabric.metalness} />
        </mesh>
        {backH > 0.1 && (
          <mesh position={[0, seatH + backH * 0.45, -sd * 0.28]} castShadow>
            <boxGeometry args={[sw * 0.75, backH, 0.04]} />
            <Mat color={seatTint} map={map} normalMap={seatNormal} normalScale={fabric.normalScale} roughness={fabric.roughness} />
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
              <Mat finish={frameFinish} color={visual.frameColor} roughness={0.48} metalness={0.12} />
            </mesh>
          )),
        )}
        <mesh position={[0, seatH, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[sw * 0.48, sw * 0.5, 0.04, 22]} />
          <Mat color={seatTint} map={map} normalMap={seatNormal} normalScale={fabric.normalScale} roughness={0.7} />
        </mesh>
        <mesh position={[0, seatH + backH * 0.55, -sd * 0.34]} rotation={[0.12, 0, 0.45]} castShadow>
          <cylinderGeometry args={[0.012, 0.012, backH, 8]} />
          <Mat finish={frameFinish} color={visual.frameColor} roughness={0.45} />
        </mesh>
        <mesh position={[0, seatH + backH * 0.55, -sd * 0.34]} rotation={[0.12, 0, -0.45]} castShadow>
          <cylinderGeometry args={[0.012, 0.012, backH, 8]} />
          <Mat finish={frameFinish} color={visual.frameColor} roughness={0.45} />
        </mesh>
        <mesh position={[0, seatH + backH * 0.88, -sd * 0.36]} castShadow>
          <torusGeometry args={[sw * 0.18, 0.012, 8, 16, Math.PI]} />
          <Mat finish={frameFinish} color={visual.frameColor} roughness={0.42} />
        </mesh>
      </group>
    );
  }

  if (chairType === 'POUF') {
    return (
      <group position={position} rotation={[0, rotationY, 0]}>
        <mesh position={[0, sh * 0.55, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[sw * 0.5, sw * 0.52, sh * 1.1, 28]} />
          <Mat color={seatTint} map={map} normalMap={seatNormal} normalScale={fabric.normalScale} roughness={0.92} metalness={0.02} />
        </mesh>
        <mesh position={[0, sh * 1.05, 0]} castShadow>
          <cylinderGeometry args={[sw * 0.48, sw * 0.5, 0.04, 28]} />
          <Mat color={seatTint} map={map} normalMap={seatNormal} normalScale={fabric.normalScale} roughness={0.95} metalness={0.02} />
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
            <Mat finish={frameFinish} color={visual.frameColor} roughness={0.45} metalness={0.15} />
          </mesh>
          <mesh position={[0, seatH + 0.04, 0]} castShadow>
            <boxGeometry args={[sw * 0.9, 0.04, sd * 0.88]} />
            <Mat color={seatTint} map={map} normalMap={seatNormal} normalScale={fabric.normalScale} roughness={0.7} />
          </mesh>
          {/* Dossier médaillon : cadre ovale mouluré + garniture capitonnée plate (pas de boule) */}
          {(() => {
            const ovalR = sw * 0.3;
            const ovalScaleY = style === 'phoenix' ? 1.55 : 1.3;
            const cy = seatH + 0.06 + ovalR * ovalScaleY;
            return (
              <group position={[0, cy, -sd * 0.42]} rotation={[-0.1, 0, 0]}>
                {/* Pieds arrière prolongés jusqu’au médaillon */}
                {([-1, 1] as const).map((side) => (
                  <mesh key={side} position={[side * ovalR * 0.92, -ovalR * ovalScaleY * 0.62, 0]} castShadow>
                    <boxGeometry args={[0.03, ovalR * ovalScaleY * 0.9, 0.03]} />
                    <Mat finish={frameFinish} color={visual.frameColor} roughness={0.4} metalness={0.12} />
                  </mesh>
                ))}
                <mesh scale={[1, ovalScaleY, 1]} castShadow>
                  <torusGeometry args={[ovalR, 0.02, 10, 36]} />
                  <Mat finish={frameFinish} color={visual.frameColor} roughness={0.4} metalness={0.12} />
                </mesh>
                <mesh scale={[1, ovalScaleY, 1]} rotation={[Math.PI / 2, 0, 0]} castShadow>
                  <cylinderGeometry args={[ovalR * 0.96, ovalR * 0.96, 0.045, 36]} />
                  <Mat color={seatTint} map={map} normalMap={seatNormal} normalScale={fabric.normalScale} roughness={0.65} />
                </mesh>
                {style === 'phoenix' ? (
                  <mesh position={[0, ovalR * ovalScaleY + 0.03, 0]} rotation={[0, 0, Math.PI / 4]} castShadow>
                    <boxGeometry args={[0.05, 0.05, 0.03]} />
                    <Mat finish={frameFinish} color={visual.frameColor} roughness={0.35} metalness={0.2} />
                  </mesh>
                ) : null}
              </group>
            );
          })()}
        </>
      ) : isChiavari ? (
        <>
          <mesh position={[0, seatH, 0]} castShadow receiveShadow>
            <boxGeometry args={[sw, 0.04, sd]} />
            <Mat color={seatTint} map={map} normalMap={seatNormal} normalScale={fabric.normalScale} roughness={0.55} metalness={0.1} />
          </mesh>
          {/* Dossier ajouré chiavari */}
          <mesh position={[-sw * 0.38, seatH + backH * 0.5, -sd * 0.42]} castShadow>
            <cylinderGeometry args={[0.01, 0.01, backH, 8]} />
            <Mat finish={frameFinish} color={visual.frameColor} metalness={0.85} roughness={0.2} />
          </mesh>
          <mesh position={[sw * 0.38, seatH + backH * 0.5, -sd * 0.42]} castShadow>
            <cylinderGeometry args={[0.01, 0.01, backH, 8]} />
            <Mat finish={frameFinish} color={visual.frameColor} metalness={0.85} roughness={0.2} />
          </mesh>
          <mesh position={[0, seatH + backH * 0.85, -sd * 0.42]} castShadow>
            <torusGeometry args={[sw * 0.28, 0.01, 8, 20, Math.PI]} />
            <Mat finish={frameFinish} color={visual.frameColor} metalness={0.85} roughness={0.2} />
          </mesh>
          <mesh position={[0, seatH + backH * 0.35, -sd * 0.42]} castShadow>
            <boxGeometry args={[sw * 0.55, 0.015, 0.015]} />
            <Mat finish={frameFinish} color={visual.frameColor} metalness={0.85} roughness={0.2} />
          </mesh>
          <mesh position={[0, seatH + 0.03, 0]} castShadow>
            <boxGeometry args={[sw * 0.85, 0.025, sd * 0.85]} />
            <Mat color="#f8fafc" roughness={0.7} />
          </mesh>
          {style === 'tiffany' && (
            <>
              {/* Barreaux verticaux du dossier Tiffany */}
              {[-0.18, -0.06, 0.06, 0.18].map((t) => (
                <mesh key={t} position={[t * sw, seatH + backH * 0.55, -sd * 0.42]} castShadow>
                  <cylinderGeometry args={[0.007, 0.007, backH * 0.6, 6]} />
                  <Mat finish={frameFinish} color={visual.frameColor} metalness={0.85} roughness={0.2} />
                </mesh>
              ))}
              {/* Nœud en organza au dos */}
              {([-1, 1] as const).map((side) => (
                <mesh key={side} position={[side * 0.05, seatH + backH * 0.62, -sd * 0.46]} rotation={[0, 0, side * 0.5]} scale={[1, 0.55, 0.3]} castShadow>
                  <sphereGeometry args={[0.05, 10, 8]} />
                  <Mat color="#f5d0dc" finish="linen" roughness={0.75} />
                </mesh>
              ))}
              {([-1, 1] as const).map((side) => (
                <mesh key={`tail-${side}`} position={[side * 0.03, seatH + backH * 0.42, -sd * 0.465]} rotation={[0, 0, side * 0.18]} castShadow>
                  <boxGeometry args={[0.035, backH * 0.32, 0.004]} />
                  <Mat color="#f5d0dc" finish="linen" roughness={0.75} />
                </mesh>
              ))}
            </>
          )}
        </>
      ) : isArmchair ? (
        <>
          <mesh position={[0, seatH - 0.02, 0]} castShadow>
            <boxGeometry args={[sw * 1.08, 0.1, sd * 1.05]} />
            <Mat finish={frameFinish} color={visual.frameColor} metalness={0.15} roughness={0.55} />
          </mesh>
          <mesh position={[0, seatH + sh * 0.5, 0.02]} castShadow receiveShadow>
            <boxGeometry args={[sw, sh * 1.35, sd * 0.92]} />
            <Mat color={seatTint} map={map} normalMap={seatNormal} normalScale={fabric.normalScale} roughness={fabric.roughness} metalness={fabric.metalness} />
          </mesh>
          {style === 'club' ? (
            // Club : dossier bas enveloppant, arrondi (demi-tonneau).
            <mesh position={[0, seatH + backH * 0.34, -sd * 0.08]} rotation={[0, Math.PI, 0]} castShadow>
              <cylinderGeometry args={[sw * 0.58, sw * 0.58, backH * 0.72, 24, 1, true, -Math.PI / 2, Math.PI]} />
              <Mat color={seatTint} map={map} normalMap={seatNormal} normalScale={fabric.normalScale} roughness={fabric.roughness} metalness={fabric.metalness} side={THREE.DoubleSide} />
            </mesh>
          ) : (
            <mesh
              position={[0, seatH + backH * 0.48, -sd * (style === 'lounge' ? 0.46 : 0.4)]}
              rotation={[style === 'lounge' ? -0.26 : style === 'modern' ? -0.1 : 0, 0, 0]}
              castShadow
            >
              <boxGeometry args={[sw * 1.05, style === 'lounge' ? backH * 0.9 : backH, style === 'modern' ? 0.08 : 0.14]} />
              <Mat color={seatTint} map={map} normalMap={seatNormal} normalScale={fabric.normalScale} roughness={fabric.roughness} metalness={fabric.metalness} />
            </mesh>
          )}
          {style === 'classic' && (
            // Classique : galon capitonné (boutons) sur le dossier.
            <>
              {[-0.25, 0, 0.25].flatMap((bx) => [0.35, 0.65].map((by) => (
                <mesh key={`${bx}-${by}`} position={[bx * sw, seatH + backH * by, -sd * 0.4 + 0.072]} castShadow>
                  <sphereGeometry args={[0.012, 8, 6]} />
                  <Mat color={visual.frameColor} roughness={0.5} />
                </mesh>
              )))}
            </>
          )}
          {style === 'bergere' && (
            <mesh position={[0, seatH + backH * 0.85, -sd * 0.32]} castShadow>
              <torusGeometry args={[sw * 0.35, 0.025, 8, 16, Math.PI]} />
              <Mat finish={frameFinish} color={visual.frameColor} metalness={0.4} roughness={0.4} />
            </mesh>
          )}
          {([-1, 1] as const).map((side) => (
            <group key={side} position={[side * sw * (style === 'club' ? 0.56 : 0.52), seatH + (style === 'club' ? 0.1 : 0.14), -0.02]}>
              <mesh castShadow>
                <boxGeometry args={[style === 'club' ? 0.17 : style === 'modern' ? 0.05 : 0.11, (style === 'club' ? 0.26 : 0.14) * visual.scale, sd * 0.82]} />
                <Mat color={seatTint} map={map} normalMap={seatNormal} normalScale={fabric.normalScale} roughness={fabric.roughness} metalness={fabric.metalness} />
              </mesh>
              <mesh position={[0, -0.12, sd * 0.2]} castShadow>
                <cylinderGeometry args={[0.022, 0.025, 0.26 * visual.scale, 10]} />
                <Mat finish={frameFinish} color={visual.frameColor} metalness={0.35} roughness={0.45} />
              </mesh>
            </group>
          ))}
        </>
      ) : (
        <>
          {/* Banquet classique — assise ronde, dossier légèrement cambré */}
          <mesh position={[0, seatH * 0.12, 0]} castShadow>
            <cylinderGeometry args={[0.018, 0.022, 0.04, 10]} />
            <Mat finish={frameFinish} color={visual.frameColor} metalness={0.55} roughness={0.35} />
          </mesh>
          <mesh position={[0, seatH - sh * 0.08, 0]} castShadow>
            <cylinderGeometry args={[sw * 0.5, sw * 0.52, sh * 0.45, 24]} />
            <Mat finish={frameFinish} color={visual.frameColor} metalness={isBanquet ? 0.55 : 0.25} roughness={0.4} />
          </mesh>
          <mesh position={[0, seatH + sh * 0.38, 0.01]} rotation={[-0.06, 0, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[sw * 0.46, sw * 0.48, sh * (visual.cushion ? 1.05 : 0.65), 28]} />
            <Mat color={seatTint} map={map} normalMap={seatNormal} normalScale={fabric.normalScale} roughness={fabric.roughness} metalness={fabric.metalness} />
          </mesh>
          <mesh position={[0, seatH + backH * 0.48, -sd * 0.4]} rotation={[0.08, 0, 0]} castShadow>
            <boxGeometry args={[sw * 0.9, backH, 0.055]} />
            <Mat color={seatTint} map={map} normalMap={seatNormal} normalScale={fabric.normalScale} roughness={fabric.roughness} metalness={fabric.metalness} />
          </mesh>
          <mesh position={[0, seatH + backH * 0.5, -sd * 0.43]} rotation={[0.08, 0, 0]} castShadow>
            <boxGeometry args={[sw * 0.94, backH * 1.02, 0.02]} />
            <Mat finish={frameFinish} color={visual.frameColor} metalness={0.45} roughness={0.4} />
          </mesh>
          {isBanquet && (
            <mesh position={[0, seatH + backH * 0.75, -sd * 0.4]} castShadow>
              <torusGeometry args={[sw * 0.26, 0.012, 8, 18, Math.PI]} />
              <Mat finish={frameFinish} color={visual.frameColor} metalness={0.75} roughness={0.25} />
            </mesh>
          )}
          {visual.hasArms && ([-1, 1] as const).map((side) => (
            <group key={side} position={[side * sw * 0.48, seatH + 0.12, 0]}>
              <mesh castShadow>
                <boxGeometry args={[0.05, 0.07, sd * 0.75]} />
                <Mat finish={frameFinish} color={visual.frameColor} metalness={0.5} roughness={0.35} />
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
  cornerRadiusM,
}: {
  shape: TableShape;
  size: [number, number];
  topY: number;
  mat: TableMat;
  selected: boolean;
  cornerRadiusM?: number;
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
    normalMap: mat.normalMap,
    normalScale: mat.normalScale,
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
          <Mat color="#5c4030" finish="wood" roughness={0.5} />
        </mesh>
        {mat.isCloth ? (
          <mesh position={[0, topY - 0.17, 0]} scale={[1, 1, size[1] / size[0]]} castShadow receiveShadow>
            <cylinderGeometry args={[size[0] / 2 * 1.01, size[0] / 2 * 1.035, 0.34, 48, 1, true]} />
            <SurfaceMat
              color={topColor}
              map={withRepeat(mat.map, 6, 1)}
              normalMap={withRepeat(mat.normalMap ?? null, 6, 1)}
              normalScale={0.6}
              roughness={0.92}
              metalness={0}
              finish="plain"
              side={THREE.DoubleSide}
            />
          </mesh>
        ) : null}
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
          <Mat color="#5c4030" finish="wood" roughness={0.5} />
        </mesh>
        {mat.isCloth ? (
          // Nappe : retombée opaque en lin (même trame que le plateau), plus de voiles translucides.
          <mesh position={[0, topY - 0.17, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[size[0] / 2 * 1.01, size[0] / 2 * 1.035, 0.34, 48, 1, true]} />
            <SurfaceMat
              color={topColor}
              map={withRepeat(mat.map, 6, 1)}
              normalMap={withRepeat(mat.normalMap ?? null, 6, 1)}
              normalScale={0.6}
              roughness={0.92}
              metalness={0}
              finish="plain"
              side={THREE.DoubleSide}
            />
          </mesh>
        ) : null}
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

function createRoundedRectShape(w: number, d: number, r: number): THREE.Shape {
  const shape = new THREE.Shape();
  const x = -w / 2;
  const y = -d / 2;
  shape.moveTo(x + r, y);
  shape.lineTo(x + w - r, y);
  shape.quadraticCurveTo(x + w, y, x + w, y + r);
  shape.lineTo(x + w, y + d - r);
  shape.quadraticCurveTo(x + w, y + d, x + w - r, y + d);
  shape.lineTo(x + r, y + d);
  shape.quadraticCurveTo(x, y + d, x, y + d - r);
  shape.lineTo(x, y + r);
  shape.quadraticCurveTo(x, y, x + r, y);
  return shape;
}

  // rectangular / square
  const legInset = shape === 'square' ? 0.36 : 0.4;
  const roundedTopGeom = useMemo(() => {
    if (!cornerRadiusM || cornerRadiusM <= 0.01 || isRound) return null;
    const w = size[0];
    const d = size[1];
    const maxR = Math.min(w / 2 - 0.02, d / 2 - 0.02);
    const r = Math.min(cornerRadiusM, maxR);
    if (r <= 0.01) return null;
    const s = createRoundedRectShape(w, d, r);
    const geom = new THREE.ExtrudeGeometry(s, {
      depth: 0.055,
      bevelEnabled: true,
      bevelSegments: 2,
      steps: 1,
      bevelSize: 0.005,
      bevelThickness: 0.005,
    });
    geom.rotateX(-Math.PI / 2);
    return geom;
  }, [cornerRadiusM, isRound, size]);

  return (
    <group>
      {roundedTopGeom ? (
        <mesh position={[0, topY + 0.0275, 0]} geometry={roundedTopGeom} castShadow receiveShadow>
          <Mat color={topColor} {...topMat} />
        </mesh>
      ) : (
        <mesh position={[0, topY, 0]} castShadow receiveShadow>
          <boxGeometry args={[size[0], 0.055, size[1]]} />
          <Mat color={topColor} {...topMat} />
        </mesh>
      )}
      <mesh position={[0, topY - 0.08, 0]} castShadow>
        <boxGeometry args={[size[0] * 0.96, 0.1, size[1] * 0.96]} />
        <Mat color="#4a3728" finish="wood" roughness={0.5} />
      </mesh>
      {mat.isCloth ? (
        <mesh position={[0, topY - 0.16, 0]} castShadow receiveShadow>
          <boxGeometry args={[size[0] * 1.01, 0.3, size[1] * 1.01]} />
          <SurfaceMat
            color={topColor}
            map={withRepeat(mat.map, 4, 1)}
            normalMap={withRepeat(mat.normalMap ?? null, 4, 1)}
            normalScale={0.6}
            roughness={0.92}
            metalness={0}
            finish="plain"
          />
        </mesh>
      ) : null}
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

/** Pseudo-aléatoire stable pour disposer les fleurs sans « clignoter » à chaque rendu. */
function flowerRand(i: number, k: number) {
  const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Composition florale en pot : vasque céramique, feuillage et fleurs selon l’espèce
 * (roses, tulipes, orchidées, tournesols, lavande ou bouquet mixte) et la couleur choisies.
 */
export function CatalogueFlower({
  w,
  d,
  height,
  color,
  selected,
  flowerType = 'boquet',
}: {
  w: number;
  d: number;
  height: number;
  color: string;
  selected: boolean;
  map?: THREE.Texture | null;
  flowerType?: string;
}) {
  // Taille réelle bornée : une jardinière reste entre 35 cm et 1,2 m de diamètre.
  const span = Math.max(0.35, Math.min(1.2, Math.min(w, d)));
  const potR = span * 0.32;
  const potH = Math.max(0.28, Math.min(0.6, height * 0.5));
  const crownY = potH + Math.max(0.12, span * 0.22);
  const tint = selected ? '#fda4af' : color;
  const type = flowerType;
  const bloomCount = type === 'orchidee' ? 9 : type === 'tournesol' ? 5 : type === 'lavande' ? 16 : 14;
  const mixed = ['#fdf2f8', tint, '#fffbeb', '#f9a8d4', tint];

  return (
    <group>
      {/* Vasque céramique évasée */}
      <mesh position={[0, potH / 2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[potR, potR * 0.72, potH, 28]} />
        <SurfaceMat color="#ece7df" finish="ceramic" roughness={0.35} />
      </mesh>
      <mesh position={[0, potH, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[potR, 0.012, 8, 32]} />
        <SurfaceMat color="#e2dccf" finish="ceramic" roughness={0.3} />
      </mesh>
      <mesh position={[0, potH - 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[potR * 0.97, 24]} />
        <meshStandardMaterial color="#3f2d20" roughness={1} />
      </mesh>
      {/* Feuillage en couronne */}
      {Array.from({ length: 9 }).map((_, i) => {
        const a = (i / 9) * Math.PI * 2 + flowerRand(i, 1);
        const r = potR * (0.55 + flowerRand(i, 2) * 0.45);
        return (
          <mesh
            key={`leaf-${i}`}
            position={[Math.cos(a) * r, potH + 0.05 + flowerRand(i, 3) * 0.06, Math.sin(a) * r]}
            rotation={[flowerRand(i, 4) * 0.8, -a, 0.6]}
            scale={[1.6, 0.35, 0.8]}
            castShadow
          >
            <sphereGeometry args={[span * 0.1, 8, 6]} />
            <Mat color={i % 2 ? '#3f6b3f' : '#4f7d46'} roughness={0.85} />
          </mesh>
        );
      })}
      {Array.from({ length: bloomCount }).map((_, i) => {
        const a = (i / bloomCount) * Math.PI * 2 + flowerRand(i, 5) * 0.6;
        const r = potR * (type === 'lavande' ? 0.2 + flowerRand(i, 6) * 0.6 : 0.1 + flowerRand(i, 6) * 0.75);
        const y = crownY + flowerRand(i, 7) * span * (type === 'orchidee' ? 0.45 : 0.14);
        const x = Math.cos(a) * r;
        const z = Math.sin(a) * r;
        const stemH = y - potH;
        const bloomColor = type === 'boquet' ? mixed[i % mixed.length] : type === 'tournesol' ? '#facc15' : tint;
        return (
          <group key={`b-${i}`}>
            <mesh position={[x * 0.6, potH + stemH / 2, z * 0.6]} rotation={[z * 0.6, 0, -x * 0.6]}>
              <cylinderGeometry args={[0.005, 0.006, stemH, 5]} />
              <meshStandardMaterial color="#4d7c3a" roughness={0.8} />
            </mesh>
            {type === 'lavande' ? (
              <mesh position={[x, y + 0.05, z]} castShadow>
                <capsuleGeometry args={[0.012, 0.12, 4, 8]} />
                <meshStandardMaterial color={tint} roughness={0.9} />
              </mesh>
            ) : type === 'tulipe' ? (
              <mesh position={[x, y, z]} castShadow>
                <sphereGeometry args={[span * 0.045, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.62]} />
                <meshStandardMaterial color={bloomColor} roughness={0.55} side={THREE.DoubleSide} />
              </mesh>
            ) : type === 'tournesol' ? (
              <group position={[x, y, z]} rotation={[-0.9 + flowerRand(i, 8) * 0.4, a, 0]}>
                <mesh castShadow>
                  <cylinderGeometry args={[span * 0.075, span * 0.075, 0.012, 16]} />
                  <meshStandardMaterial color="#facc15" roughness={0.7} />
                </mesh>
                <mesh position={[0, 0.008, 0]}>
                  <cylinderGeometry args={[span * 0.035, span * 0.035, 0.014, 14]} />
                  <meshStandardMaterial color="#4a2c16" roughness={0.9} />
                </mesh>
              </group>
            ) : type === 'orchidee' ? (
              <mesh position={[x, y, z]} rotation={[0.3, a, 0.2]} scale={[1.2, 0.5, 1]} castShadow>
                <sphereGeometry args={[span * 0.035, 10, 8]} />
                <meshStandardMaterial color={bloomColor} roughness={0.5} />
              </mesh>
            ) : (
              // Rose / bouquet : tête pleine légèrement aplatie
              <mesh position={[x, y, z]} scale={[1, 0.8, 1]} castShadow>
                <sphereGeometry args={[span * 0.05, 12, 10]} />
                <meshStandardMaterial color={bloomColor} roughness={0.7} />
              </mesh>
            )}
          </group>
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
  // Buffet traiteur réaliste : table nappée jusqu’au sol, réchauds (chafing dishes), piles d’assiettes.
  void map;
  const topY = Math.max(0.76, Math.min(0.95, height));
  const clothColor = selected ? '#c7d2fe' : '#f7f3ea';
  const skirtColor = selected ? '#c7d2fe' : baseColor && baseColor !== '#8b6914' ? baseColor : '#e9e1d2';
  const usable = Math.max(0.6, w - 0.5);
  const chafers = Math.max(1, Math.min(8, Math.floor(usable / 0.62)));
  return (
    <group>
      {/* Plateau nappé */}
      <mesh position={[0, topY - 0.02, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, 0.04, d]} />
        <Mat color={clothColor} finish="linen" roughness={0.85} />
      </mesh>
      {/* Juponnage plissé jusqu’au sol */}
      <mesh position={[0, (topY - 0.04) / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[w * 0.995, topY - 0.04, d * 0.99]} />
        <Mat color={skirtColor} finish="velvet" roughness={0.9} />
      </mesh>
      {Array.from({ length: Math.max(4, Math.round(w / 0.18)) }).map((_, i, arr) => (
        <mesh key={`pli-${i}`} position={[(-0.5 + (i + 0.5) / arr.length) * w, (topY - 0.04) / 2, d * 0.5]} castShadow>
          <cylinderGeometry args={[0.018, 0.024, topY - 0.06, 6]} />
          <Mat color={skirtColor} finish="velvet" roughness={0.9} />
        </mesh>
      ))}
      {/* Runner doré */}
      <mesh position={[0, topY + 0.003, 0]} receiveShadow>
        <boxGeometry args={[w * 0.98, 0.004, Math.min(0.36, d * 0.4)]} />
        <Mat color="#d6c08a" finish="linen" roughness={0.6} />
      </mesh>
      {hasCouverts !== false && (
        <>
          {/* Réchauds inox : cuve, couvercle bombé, pieds */}
          {Array.from({ length: chafers }).map((_, i) => {
            const x = ((i + 0.5) / chafers - 0.5) * usable - 0.2;
            return (
              <group key={`ch-${i}`} position={[x, topY, 0]}>
                {([-1, 1] as const).flatMap((sx) => ([-1, 1] as const).map((sz) => (
                  <mesh key={`${sx}${sz}`} position={[sx * 0.22, 0.05, sz * 0.14]}>
                    <cylinderGeometry args={[0.008, 0.008, 0.1, 6]} />
                    <Mat color="#cbd5e1" finish="chrome" roughness={0.1} metalness={0.95} />
                  </mesh>
                )))}
                <mesh position={[0, 0.12, 0]} castShadow>
                  <boxGeometry args={[0.5, 0.07, 0.32]} />
                  <Mat color="#d4d4d8" finish="chrome" roughness={0.12} metalness={0.95} />
                </mesh>
                <mesh position={[0, 0.16, 0]} scale={[1, 0.28, 0.64]} castShadow>
                  <sphereGeometry args={[0.25, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
                  <Mat color="#e4e4e7" finish="chrome" roughness={0.08} metalness={0.95} />
                </mesh>
                <mesh position={[0, 0.235, 0]}>
                  <boxGeometry args={[0.1, 0.018, 0.02]} />
                  <Mat color="#18181b" roughness={0.4} />
                </mesh>
              </group>
            );
          })}
          {/* Pile d’assiettes + couverts roulés en bout de buffet */}
          <group position={[w / 2 - 0.2, topY, 0]}>
            {Array.from({ length: 8 }).map((_, i) => (
              <mesh key={i} position={[0, 0.008 + i * 0.012, 0]} castShadow>
                <cylinderGeometry args={[0.13, 0.12, 0.01, 24]} />
                <Mat color="#fafaf9" finish="ceramic" roughness={0.25} />
              </mesh>
            ))}
            {[-0.06, 0, 0.06].map((z) => (
              <mesh key={z} position={[0, 0.02, 0.2 + z * 0.4]} rotation={[0, 0, Math.PI / 2]} castShadow>
                <cylinderGeometry args={[0.018, 0.018, 0.2, 8]} />
                <Mat color="#f5f5f4" finish="linen" roughness={0.85} />
              </mesh>
            ))}
          </group>
        </>
      )}
    </group>
  );
}
