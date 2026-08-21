'use client';

import React, { Suspense, useMemo, useRef, useCallback, useEffect } from 'react';
import { Canvas, ThreeEvent, useThree } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import {
  RoomLayoutBlueprint,
  RoomWallSegment,
  RoomWallOpening,
  outlinePolygonPoints,
  resolveBlueprintWalls,
  resolveFurnitureSurfaceAt,
  resolveTableColor,
  type ChairType,
  type ChairStyle,
  type SeatMaterial,
  type TableShape,
  type ZoneMaterial,
} from '@/lib/roomLayoutUtils';
import { resolveDepthAmount } from '@/lib/roomFloorUtils';
import { getRoomTheme } from '@/lib/roomThemeUtils';
import { getTableSeatPlacement3D } from '@/lib/tablePlanUtils';
import {
  getWallTexture,
  resolveChairMap,
  resolveChairVisual,
  resolveFloorMap,
  resolveTableMaterial,
  resolveZoneMaterialMap,
} from '@/lib/roomWebGLMaterials';
import { cn } from '@/lib/cn';

export type WebGLSelectableKind = 'table' | 'row' | 'zone' | 'fixture' | 'wall' | 'chair';

export interface WebGLSelection {
  kind: WebGLSelectableKind;
  id: string;
}

interface RoomWebGLViewerProps {
  blueprint: RoomLayoutBlueprint;
  selected: WebGLSelection | null;
  onSelect: (sel: WebGLSelection | null) => void;
  onMoveItem?: (kind: WebGLSelectableKind, id: string, xPct: number, yPct: number) => void;
  onMoveEnd?: () => void;
  readOnly?: boolean;
  className?: string;
  wallEditMode?: boolean;
  /** Bloque orbit / pan pour déplacer le mobilier sans changer la perspective. */
  lockOrbit?: boolean;
}

function pctToWorld(xPct: number, yPct: number, widthM: number, heightM: number): [number, number] {
  const x = ((xPct / 100) - 0.5) * widthM;
  const z = ((yPct / 100) - 0.5) * heightM;
  return [x, z];
}

function worldToPct(x: number, z: number, widthM: number, heightM: number): { x: number; y: number } {
  return {
    x: Math.max(0, Math.min(100, ((x / widthM) + 0.5) * 100)),
    y: Math.max(0, Math.min(100, ((z / heightM) + 0.5) * 100)),
  };
}

function FloorPlane({
  widthM,
  heightM,
  floorType,
  floorImageUrl,
  outline,
  onPointerMissed,
}: {
  widthM: number;
  heightM: number;
  floorType?: import('@/lib/roomThemeUtils').FloorType;
  floorImageUrl?: string;
  outline?: RoomLayoutBlueprint['roomOutline'];
  onPointerMissed?: () => void;
}) {
  const mat = useMemo(
    () => resolveFloorMap(floorType, floorImageUrl, widthM, heightM),
    [floorType, floorImageUrl, widthM, heightM],
  );

  const shapeGeo = useMemo(() => {
    if (!outline || outline.shape === 'rectangle') return null;
    const pts = outlinePolygonPoints(outline);
    if (pts.length < 3) return null;
    const shape = new THREE.Shape();
    pts.forEach((p, i) => {
      const [wx, wz] = pctToWorld(p.x, p.y, widthM, heightM);
      if (i === 0) shape.moveTo(wx, -wz);
      else shape.lineTo(wx, -wz);
    });
    shape.closePath();
    const geo = new THREE.ShapeGeometry(shape);
    geo.rotateX(-Math.PI / 2);
    return geo;
  }, [outline, widthM, heightM]);

  return (
    <mesh
      geometry={shapeGeo ?? undefined}
      rotation={shapeGeo ? [0, 0, 0] : [-Math.PI / 2, 0, 0]}
      position={[0, 0, 0]}
      receiveShadow
      onClick={(e) => {
        e.stopPropagation();
        onPointerMissed?.();
      }}
    >
      {!shapeGeo && <planeGeometry args={[widthM, heightM]} />}
      <meshStandardMaterial
        color={mat.color}
        map={mat.map ?? undefined}
        roughness={mat.roughness}
        metalness={mat.metalness}
      />
    </mesh>
  );
}

function OpeningMesh({
  opening,
  wallLengthM,
  wallHeightM,
  wallThicknessM,
}: {
  opening: RoomWallOpening;
  wallLengthM: number;
  wallHeightM: number;
  wallThicknessM: number;
}) {
  const localX = (opening.t - 0.5) * wallLengthM;
  const sill = opening.sillM ?? (opening.kind === 'door' ? 0 : 0.9);
  const h = Math.min(opening.heightM, Math.max(0.3, wallHeightM - sill - 0.05));
  const w = Math.min(opening.widthM, wallLengthM * 0.85);
  const isDoor = opening.kind === 'door';
  const style = opening.style;
  const material = opening.material ?? (isDoor ? (style === 'glass' ? 'glass' : 'wood') : 'glass');
  const leafColor = opening.color ?? (isDoor ? '#6b4423' : '#93c5fd');
  const frameColor = opening.frameColor ?? (isDoor ? '#3f2a1a' : '#f1f5f9');
  const depth = wallThicknessM + 0.08;
  const frameT = 0.06;
  const woodMap = useMemo(() => {
    if (typeof document === 'undefined') return null;
    if (material === 'wood' || (isDoor && material !== 'glass' && material !== 'metal')) {
      return getWallTexture('wood').map;
    }
    return null;
  }, [material, isDoor]);

  const glassProps = {
    color: '#bfdbfe',
    transparent: true,
    opacity: 0.35,
    roughness: 0.05,
    metalness: 0.4,
  } as const;

  const leafMatProps = (() => {
    if (material === 'glass' || style === 'glass') {
      return { color: '#e0f2fe', transparent: true, opacity: 0.55, roughness: 0.08, metalness: 0.35, map: undefined as THREE.Texture | undefined };
    }
    if (material === 'metal') {
      return { color: leafColor, transparent: false, opacity: 1, roughness: 0.25, metalness: 0.85, map: undefined as THREE.Texture | undefined };
    }
    if (material === 'painted') {
      return { color: leafColor, transparent: false, opacity: 1, roughness: 0.65, metalness: 0.05, map: undefined as THREE.Texture | undefined };
    }
    return {
      color: woodMap ? '#ffffff' : leafColor,
      transparent: false,
      opacity: 1,
      roughness: 0.55,
      metalness: 0.08,
      map: woodMap ?? undefined,
    };
  })();

  const arch = style === 'arch' || style === 'arched';
  const leafH = arch ? h * 0.72 : h;
  const archR = w * 0.48;

  // Position relative to wall center: openings were at y = sill + h/2 with wall at wallH/2
  // Wall group is at wallH/2, OpeningMesh was at localY = sill+h/2 relative to group... 
  // Looking at old code: group position={[localX, y, 0]} where y = sill + h/2, and wall group is at wallH/2.
  // So opening center in wall-local Y is sill + h/2 (from floor), but wall mesh goes from -wallH/2 to +wallH/2.
  // Old code used y = sill + h/2 as child of wall group at wallH/2, so world Y = wallH/2 + (sill+h/2) which is WRONG (too high)!
  // Actually wall group position is [midX, wallH/2, midZ], children with y=sill+h/2 end up at wallH/2+sill+h/2.
  // For door sill=0 h=2.1 wallH=3: center at 1.05+1.5=2.55 from floor, door extends 1.5 to 3.6 - broken.
  // Wait - maybe they intended opening y relative to wall center differently.
  // Fix: opening center should be at sill + h/2 - wallH/2 in wall-local coordinates.
  const localY = sill + h / 2 - wallHeightM / 2;

  return (
    <group position={[localX, localY, 0]}>
      {/* Dormant / cadre */}
      <mesh position={[0, 0, 0]} castShadow>
        <boxGeometry args={[w + frameT * 2, h + frameT * 2, depth * 0.95]} />
        <meshStandardMaterial color={frameColor} roughness={0.7} metalness={material === 'metal' ? 0.6 : 0.05} />
      </mesh>
      {/* Vide intérieur (couleur mur sombre pour simuler l’ouverture) */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[w, h, depth * 1.05]} />
        <meshStandardMaterial color="#1c1917" roughness={1} />
      </mesh>

      {/* Seuil / allège */}
      <mesh position={[0, -h / 2 + 0.03, depth * 0.15]} receiveShadow>
        <boxGeometry args={[w + 0.08, 0.06, depth * 0.7]} />
        <meshStandardMaterial color={isDoor ? '#57534e' : frameColor} roughness={0.55} metalness={0.2} />
      </mesh>

      {/* Arche (linteau courbé) */}
      {arch && (
        <mesh position={[0, -h / 2 + leafH + archR * 0.35, depth * 0.05]} castShadow>
          <cylinderGeometry args={[archR, archR, depth * 0.7, 16, 1, false, 0, Math.PI]} />
          <meshStandardMaterial
            color={leafMatProps.color}
            map={leafMatProps.map}
            transparent={leafMatProps.transparent}
            opacity={leafMatProps.opacity}
            roughness={leafMatProps.roughness}
            metalness={leafMatProps.metalness}
          />
        </mesh>
      )}

      {/* Vantaux de porte */}
      {isDoor && style === 'double' && (
        <>
          {([-1, 1] as const).map((side) => (
            <group key={side} position={[side * (w * 0.25 + 0.01), -h / 2 + leafH / 2, depth * 0.12]}>
              <mesh castShadow>
                <boxGeometry args={[w * 0.46, leafH * 0.98, 0.05]} />
                <meshStandardMaterial {...leafMatProps} />
              </mesh>
              {material === 'glass' && (
                <mesh position={[0, 0.1, 0.03]}>
                  <boxGeometry args={[w * 0.32, leafH * 0.55, 0.02]} />
                  <meshStandardMaterial {...glassProps} />
                </mesh>
              )}
              {material === 'wood' && (
                <>
                  <mesh position={[0, leafH * 0.18, 0.03]}>
                    <boxGeometry args={[w * 0.36, leafH * 0.28, 0.02]} />
                    <meshStandardMaterial color="#4a2f1a" map={woodMap ?? undefined} roughness={0.6} />
                  </mesh>
                  <mesh position={[0, -leafH * 0.22, 0.03]}>
                    <boxGeometry args={[w * 0.36, leafH * 0.28, 0.02]} />
                    <meshStandardMaterial color="#4a2f1a" map={woodMap ?? undefined} roughness={0.6} />
                  </mesh>
                </>
              )}
              <mesh position={[side * -w * 0.15, 0, 0.04]}>
                <sphereGeometry args={[0.035, 10, 10]} />
                <meshStandardMaterial color="#c9a227" metalness={0.9} roughness={0.15} />
              </mesh>
            </group>
          ))}
        </>
      )}

      {isDoor && style === 'sliding' && (
        <>
          <mesh position={[-w * 0.12, -h / 2 + leafH / 2, depth * 0.2]} castShadow>
            <boxGeometry args={[w * 0.55, leafH * 0.98, 0.04]} />
            <meshStandardMaterial {...leafMatProps} />
          </mesh>
          <mesh position={[w * 0.18, -h / 2 + leafH / 2, depth * 0.08]} castShadow>
            <boxGeometry args={[w * 0.55, leafH * 0.98, 0.04]} />
            <meshStandardMaterial {...leafMatProps} transparent opacity={material === 'glass' ? 0.45 : 0.92} />
          </mesh>
          <mesh position={[0, h / 2 - 0.04, depth * 0.15]}>
            <boxGeometry args={[w * 0.95, 0.04, 0.06]} />
            <meshStandardMaterial color="#64748b" metalness={0.7} roughness={0.3} />
          </mesh>
        </>
      )}

      {isDoor && style !== 'double' && style !== 'sliding' && (
        <group position={[style === 'glass' ? 0 : 0, -h / 2 + leafH / 2, depth * 0.12]}>
          <mesh castShadow>
            <boxGeometry args={[w * 0.92, leafH * 0.98, 0.05]} />
            <meshStandardMaterial {...leafMatProps} />
          </mesh>
          {(material === 'glass' || style === 'glass') && (
            <>
              <mesh position={[0, leafH * 0.15, 0.03]}>
                <boxGeometry args={[w * 0.7, leafH * 0.4, 0.02]} />
                <meshStandardMaterial {...glassProps} />
              </mesh>
              <mesh position={[0, -leafH * 0.22, 0.03]}>
                <boxGeometry args={[w * 0.7, leafH * 0.28, 0.02]} />
                <meshStandardMaterial {...glassProps} />
              </mesh>
            </>
          )}
          {material === 'wood' && style !== 'glass' && (
            <>
              <mesh position={[0, leafH * 0.2, 0.03]}>
                <boxGeometry args={[w * 0.7, leafH * 0.32, 0.02]} />
                <meshStandardMaterial color="#4a2f1a" map={woodMap ?? undefined} roughness={0.6} />
              </mesh>
              <mesh position={[0, -leafH * 0.22, 0.03]}>
                <boxGeometry args={[w * 0.7, leafH * 0.32, 0.02]} />
                <meshStandardMaterial color="#4a2f1a" map={woodMap ?? undefined} roughness={0.6} />
              </mesh>
            </>
          )}
          <mesh position={[w * 0.32, 0, 0.04]}>
            <sphereGeometry args={[0.04, 10, 10]} />
            <meshStandardMaterial color="#c9a227" metalness={0.9} roughness={0.15} />
          </mesh>
        </group>
      )}

      {/* Paillasson */}
      {isDoor && opening.hasMat !== false && (
        <mesh position={[0, -h / 2 - sill + 0.01, depth / 2 + 0.35]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[Math.max(0.7, w * 0.85), 0.55]} />
          <meshStandardMaterial color={opening.matColor ?? '#1e3a5f'} roughness={0.95} />
        </mesh>
      )}

      {/* Fenêtres */}
      {!isDoor && (
        <group position={[0, 0, style === 'bay' ? depth * 0.35 : depth * 0.1]}>
          {style === 'bay' && (
            <mesh position={[0, 0, depth * 0.25]} castShadow>
              <boxGeometry args={[w * 1.05, h * 1.05, depth * 0.5]} />
              <meshStandardMaterial color={frameColor} roughness={0.65} />
            </mesh>
          )}
          <mesh castShadow>
            <boxGeometry args={[w * 0.88, h * 0.88, 0.03]} />
            <meshStandardMaterial {...glassProps} color={leafColor} />
          </mesh>
          {/* Croisillons */}
          {(style === 'french' || style === 'rectangular') && (
            <>
              <mesh position={[0, 0, 0.02]}>
                <boxGeometry args={[0.03, h * 0.85, 0.02]} />
                <meshStandardMaterial color={frameColor} />
              </mesh>
              <mesh position={[0, 0, 0.02]}>
                <boxGeometry args={[w * 0.85, 0.03, 0.02]} />
                <meshStandardMaterial color={frameColor} />
              </mesh>
              {style === 'french' && (
                <>
                  <mesh position={[-w * 0.22, 0, 0.02]}>
                    <boxGeometry args={[0.025, h * 0.85, 0.02]} />
                    <meshStandardMaterial color={frameColor} />
                  </mesh>
                  <mesh position={[w * 0.22, 0, 0.02]}>
                    <boxGeometry args={[0.025, h * 0.85, 0.02]} />
                    <meshStandardMaterial color={frameColor} />
                  </mesh>
                  <mesh position={[0, h * 0.2, 0.02]}>
                    <boxGeometry args={[w * 0.85, 0.025, 0.02]} />
                    <meshStandardMaterial color={frameColor} />
                  </mesh>
                  <mesh position={[0, -h * 0.2, 0.02]}>
                    <boxGeometry args={[w * 0.85, 0.025, 0.02]} />
                    <meshStandardMaterial color={frameColor} />
                  </mesh>
                </>
              )}
            </>
          )}
          {style === 'bay' && (
            <>
              <mesh position={[-w * 0.3, 0, 0.02]}>
                <boxGeometry args={[0.03, h * 0.85, 0.02]} />
                <meshStandardMaterial color={frameColor} />
              </mesh>
              <mesh position={[w * 0.3, 0, 0.02]}>
                <boxGeometry args={[0.03, h * 0.85, 0.02]} />
                <meshStandardMaterial color={frameColor} />
              </mesh>
            </>
          )}
          {/* Appui de fenêtre */}
          <mesh position={[0, -h / 2 - 0.02, depth * 0.2]} receiveShadow>
            <boxGeometry args={[w + 0.12, 0.05, 0.18]} />
            <meshStandardMaterial color={frameColor} roughness={0.5} />
          </mesh>
        </group>
      )}
    </group>
  );
}

function WallMesh({
  wall,
  widthM,
  heightM,
  selected,
  onSelect,
}: {
  wall: RoomWallSegment;
  widthM: number;
  heightM: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const [sx, sz] = pctToWorld(wall.start.x, wall.start.y, widthM, heightM);
  const [ex, ez] = pctToWorld(wall.end.x, wall.end.y, widthM, heightM);
  const dx = ex - sx;
  const dz = ez - sz;
  const length = Math.hypot(dx, dz);
  const angle = Math.atan2(dz, dx);
  const midX = (sx + ex) / 2;
  const midZ = (sz + ez) / 2;
  const wallH = wall.heightM;
  const thick = wall.thicknessM;

  const mat = useMemo(
    () => getWallTexture(wall.texture, wall.color),
    [wall.texture, wall.color],
  );

  if (length < 0.05) return null;

  return (
    <group
      position={[midX, wallH / 2, midZ]}
      rotation={[0, -angle, 0]}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      <mesh castShadow receiveShadow>
        <boxGeometry args={[length, wallH, thick]} />
        <meshStandardMaterial
          color={selected ? '#c7d2fe' : mat.color}
          map={mat.map}
          roughness={mat.roughness}
          metalness={mat.metalness}
          emissive={selected ? '#312e81' : '#000000'}
          emissiveIntensity={selected ? 0.2 : 0}
        />
      </mesh>
      {(wall.openings ?? []).map((op) => (
        <OpeningMesh
          key={op.id}
          opening={op}
          wallLengthM={length}
          wallHeightM={wallH}
          wallThicknessM={thick}
        />
      ))}
    </group>
  );
}

function RealisticChair({
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
  const map = useMemo(() => resolveChairMap(imageUrl), [imageUrl]);
  const seatH = 0.42 * visual.scale;
  const [sw0, sh0, sd0] = visual.seatSize;
  const sw = sw0 * visual.scale;
  const sh = sh0 * visual.scale;
  const sd = sd0 * visual.scale;
  const backH = visual.backHeight * visual.scale;

  return (
    <group position={position} rotation={[0, rotationY, 0]} scale={visual.scale > 1.2 ? 1 : 1}>
      {([-1, 1] as const).flatMap((sx) =>
        ([-1, 1] as const).map((sz) => (
          <mesh key={`${sx}-${sz}`} position={[sx * sw * 0.35, seatH / 2, sz * sd * 0.35]} castShadow>
            <cylinderGeometry args={[0.025, 0.03, seatH, 8]} />
            <meshStandardMaterial color={visual.frameColor} metalness={0.55} roughness={0.35} />
          </mesh>
        )),
      )}
      <mesh position={[0, seatH, 0]} castShadow receiveShadow>
        <boxGeometry args={[sw, sh, sd]} />
        <meshStandardMaterial
          color={selected ? '#a5b4fc' : visual.seatColor}
          map={map ?? undefined}
          roughness={visual.cushion ? 0.9 : 0.5}
          metalness={seatMaterial === 'leather' ? 0.15 : 0.05}
        />
      </mesh>
      {backH > 0 && (
        <mesh position={[0, seatH + backH / 2, -sd * 0.42]} castShadow>
          <boxGeometry args={[sw * (chairStyle === 'bergere' ? 1 : 0.92), backH, chairStyle === 'lounge' ? 0.12 : 0.05]} />
          <meshStandardMaterial
            color={selected ? '#a5b4fc' : visual.seatColor}
            map={map ?? undefined}
            roughness={0.8}
          />
        </mesh>
      )}
      {visual.hasArms && (
        <>
          <mesh position={[-sw * 0.48, seatH + 0.14 * visual.scale, 0]} castShadow>
            <boxGeometry args={[0.06, 0.1 * visual.scale, sd * 0.85]} />
            <meshStandardMaterial color={visual.frameColor} metalness={0.4} roughness={0.4} />
          </mesh>
          <mesh position={[sw * 0.48, seatH + 0.14 * visual.scale, 0]} castShadow>
            <boxGeometry args={[0.06, 0.1 * visual.scale, sd * 0.85]} />
            <meshStandardMaterial color={visual.frameColor} metalness={0.4} roughness={0.4} />
          </mesh>
        </>
      )}
      {chairType === 'WHEELCHAIR' && (
        <>
          <mesh position={[-sw * 0.4, 0.22, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <torusGeometry args={[0.2, 0.03, 8, 16]} />
            <meshStandardMaterial color="#111827" metalness={0.6} roughness={0.4} />
          </mesh>
          <mesh position={[sw * 0.4, 0.22, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <torusGeometry args={[0.2, 0.03, 8, 16]} />
            <meshStandardMaterial color="#111827" metalness={0.6} roughness={0.4} />
          </mesh>
        </>
      )}
    </group>
  );
}

function TableMesh({
  xPct,
  yPct,
  shape,
  color,
  name,
  capacity,
  chairType,
  chairStyle,
  seatMaterial,
  chairImageUrl,
  tableImageUrl,
  hasCouverts = false,
  attachedChairs = true,
  rotation,
  elevationM = 0,
  widthM,
  heightM,
  selected,
  onSelect,
  onDragStart,
  readOnly,
}: {
  xPct: number;
  yPct: number;
  shape: TableShape;
  color: string;
  name: string;
  capacity: number;
  chairType: ChairType;
  chairStyle?: ChairStyle;
  seatMaterial?: SeatMaterial;
  chairImageUrl?: string;
  tableImageUrl?: string;
  hasCouverts?: boolean;
  attachedChairs?: boolean;
  rotation?: number;
  elevationM?: number;
  widthM: number;
  heightM: number;
  selected: boolean;
  onSelect: () => void;
  onDragStart?: () => void;
  readOnly?: boolean;
}) {
  const [wx, wz] = pctToWorld(xPct, yPct, widthM, heightM);
  const { gl } = useThree();
  const mat = useMemo(
    () => resolveTableMaterial(shape, color, tableImageUrl),
    [shape, color, tableImageUrl],
  );

  const size =
    shape === 'rectangular' ? [1.8, 0.9] :
    shape === 'oval' ? [1.7, 1.0] :
    shape === 'square' ? [1.2, 1.2] :
    shape === 'cocktail' ? [0.7, 0.7] :
    shape === 'highTop' ? [0.75, 0.75] :
    [1.35, 1.35];
  const isRound = shape === 'round' || shape === 'oval' || shape === 'cocktail' || shape === 'highTop';
  const topY = shape === 'highTop' ? 1.05 : shape === 'cocktail' ? 0.55 : 0.72;

  return (
    <group
      position={[wx, elevationM, wz]}
      rotation={[0, ((rotation ?? 0) * Math.PI) / 180, 0]}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onPointerDown={(e) => {
        if (readOnly || !onDragStart) return;
        e.stopPropagation();
        onSelect();
        onDragStart();
        gl.domElement.style.cursor = 'grabbing';
      }}
    >
      {isRound ? (
        <mesh position={[0, topY, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[size[0] / 2, size[0] / 2, 0.08, shape === 'oval' ? 28 : 36]} />
          <meshStandardMaterial
            color={selected ? '#c7d2fe' : mat.color}
            map={mat.map ?? undefined}
            roughness={mat.roughness}
            metalness={mat.metalness}
          />
        </mesh>
      ) : (
        <mesh position={[0, topY, 0]} castShadow receiveShadow>
          <boxGeometry args={[size[0], 0.08, size[1]]} />
          <meshStandardMaterial
            color={selected ? '#c7d2fe' : mat.color}
            map={mat.map ?? undefined}
            roughness={mat.roughness}
            metalness={mat.metalness}
          />
        </mesh>
      )}
      <mesh position={[0, topY + 0.045, 0]} receiveShadow>
        {isRound ? (
          <cylinderGeometry args={[size[0] / 2 * 0.92, size[0] / 2 * 0.92, 0.01, 32]} />
        ) : (
          <boxGeometry args={[size[0] * 0.92, 0.01, size[1] * 0.92]} />
        )}
        <meshStandardMaterial color="#faf7f2" transparent opacity={0.55} roughness={0.9} />
      </mesh>
      {isRound ? (
        <>
          <mesh position={[0, topY / 2, 0]} castShadow>
            <cylinderGeometry args={[0.07, 0.11, topY, 12]} />
            <meshStandardMaterial color="#57534e" metalness={0.45} roughness={0.4} />
          </mesh>
          <mesh position={[0, 0.04, 0]} castShadow>
            <cylinderGeometry args={[0.35, 0.35, 0.06, 24]} />
            <meshStandardMaterial color="#44403c" metalness={0.3} roughness={0.5} />
          </mesh>
        </>
      ) : (
        ([-1, 1] as const).flatMap((sx) =>
          ([-1, 1] as const).map((sz) => (
            <mesh key={`${sx}-${sz}`} position={[sx * size[0] * 0.38, topY / 2, sz * size[1] * 0.38]} castShadow>
              <boxGeometry args={[0.07, topY, 0.07]} />
              <meshStandardMaterial color="#57534e" metalness={0.35} roughness={0.45} />
            </mesh>
          )),
        )
      )}
      {/* Couverts / assiettes */}
      {hasCouverts && Array.from({ length: Math.min(capacity, 10) }).map((_, i) => {
        const a = (i / Math.max(capacity, 1)) * Math.PI * 2;
        const r = Math.max(size[0], size[1]) * 0.28;
        return (
          <group key={`c-${i}`} position={[Math.cos(a) * r, topY + 0.06, Math.sin(a) * r]}>
            <mesh>
              <cylinderGeometry args={[0.06, 0.06, 0.01, 16]} />
              <meshStandardMaterial color="#f8fafc" metalness={0.2} roughness={0.3} />
            </mesh>
            <mesh position={[0.08, 0.01, 0]} rotation={[0, 0, 0.2]}>
              <boxGeometry args={[0.1, 0.005, 0.015]} />
              <meshStandardMaterial color="#94a3b8" metalness={0.8} roughness={0.2} />
            </mesh>
          </group>
        );
      })}
      {attachedChairs !== false && shape !== 'cocktail' && shape !== 'highTop' && Array.from({ length: Math.min(capacity, 14) }).map((_, i) => {
        const seat = getTableSeatPlacement3D(shape, capacity, i, size as [number, number]);
        return (
          <RealisticChair
            key={i}
            chairType={chairType}
            chairStyle={chairStyle}
            seatMaterial={seatMaterial}
            imageUrl={chairImageUrl}
            position={[seat.x, 0, seat.z]}
            rotationY={seat.rotationY}
            selected={selected}
          />
        );
      })}
      {selected && (
        <Html center distanceFactor={8} style={{ pointerEvents: 'none' }} position={[0, topY + 0.35, 0]}>
          <div className="px-2 py-0.5 rounded-md bg-primary text-white text-[10px] font-bold whitespace-nowrap shadow">
            {name} · {capacity} pl.
          </div>
        </Html>
      )}
    </group>
  );
}

function ZoneMesh({
  xPct,
  yPct,
  wPct,
  hPct,
  label,
  material,
  color,
  widthM,
  heightM,
  selected,
  onSelect,
  onDragStart,
  readOnly,
  pickable = true,
}: {
  xPct: number;
  yPct: number;
  wPct: number;
  hPct: number;
  label: string;
  material?: ZoneMaterial;
  color?: string;
  widthM: number;
  heightM: number;
  selected: boolean;
  onSelect: () => void;
  onDragStart?: () => void;
  readOnly?: boolean;
  /** Si false, le mobilier au-dessus reste cliquable / déplaçable. */
  pickable?: boolean;
}) {
  const w = (wPct / 100) * widthM;
  const h = (hPct / 100) * heightM;
  const [cx, cz] = pctToWorld(xPct + wPct / 2, yPct + hPct / 2, widthM, heightM);
  const mat = useMemo(() => resolveZoneMaterialMap(material), [material]);
  const { gl } = useThree();

  return (
    <group
      position={[cx, 0.04, cz]}
      onClick={(e) => {
        if (!pickable) return;
        e.stopPropagation();
        onSelect();
      }}
      onPointerDown={(e) => {
        if (!pickable || readOnly || !onDragStart) return;
        e.stopPropagation();
        onSelect();
        onDragStart();
        gl.domElement.style.cursor = 'grabbing';
      }}
    >
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
        raycast={pickable ? undefined : () => null}
      >
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial
          color={selected ? '#c7d2fe' : (color ?? mat.color)}
          map={mat.map ?? undefined}
          roughness={mat.roughness}
          metalness={mat.metalness}
          emissive={mat.emissive}
          emissiveIntensity={mat.emissiveIntensity ?? 0}
        />
      </mesh>
      <Html center distanceFactor={12} style={{ pointerEvents: 'none' }} position={[0, 0.2, 0]}>
        <span className="text-[10px] font-bold text-white bg-black/55 px-1.5 py-0.5 rounded shadow-sm">{label}</span>
      </Html>
    </group>
  );
}

function FreeChairMesh({
  xPct,
  yPct,
  chairType,
  chairStyle,
  seatMaterial,
  chairImageUrl,
  rotation,
  elevationM = 0,
  widthM,
  heightM,
  selected,
  onSelect,
  onDragStart,
  readOnly,
  label,
}: {
  xPct: number;
  yPct: number;
  chairType: ChairType;
  chairStyle?: ChairStyle;
  seatMaterial?: SeatMaterial;
  chairImageUrl?: string;
  rotation?: number;
  elevationM?: number;
  widthM: number;
  heightM: number;
  selected: boolean;
  onSelect: () => void;
  onDragStart?: () => void;
  readOnly?: boolean;
  label?: string;
}) {
  const [wx, wz] = pctToWorld(xPct, yPct, widthM, heightM);
  const { gl } = useThree();
  return (
    <group
      position={[wx, elevationM, wz]}
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
      onPointerDown={(e) => {
        if (readOnly || !onDragStart) return;
        e.stopPropagation();
        onSelect();
        onDragStart();
        gl.domElement.style.cursor = 'grabbing';
      }}
    >
      <RealisticChair
        chairType={chairType}
        chairStyle={chairStyle}
        seatMaterial={seatMaterial}
        imageUrl={chairImageUrl}
        position={[0, 0, 0]}
        rotationY={((rotation ?? 0) * Math.PI) / 180}
        selected={selected}
      />
      {selected && (
        <Html center distanceFactor={9} style={{ pointerEvents: 'none' }} position={[0, 1.05, 0]}>
          <span className="text-[9px] font-bold bg-primary text-white px-1.5 py-0.5 rounded">{label || 'Chaise'}</span>
        </Html>
      )}
    </group>
  );
}

function DragPlane({
  active,
  widthM,
  heightM,
  onDrag,
  onEnd,
}: {
  active: boolean;
  widthM: number;
  heightM: number;
  onDrag: (xPct: number, yPct: number) => void;
  onEnd: () => void;
}) {
  const { gl } = useThree();
  if (!active) return null;
  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0.05, 0]}
      onPointerMove={(e) => {
        e.stopPropagation();
        const pct = worldToPct(e.point.x, e.point.z, widthM, heightM);
        onDrag(pct.x, pct.y);
      }}
      onPointerUp={(e) => {
        e.stopPropagation();
        gl.domElement.style.cursor = 'auto';
        onEnd();
      }}
      onPointerLeave={() => {
        gl.domElement.style.cursor = 'auto';
        onEnd();
      }}
    >
      <planeGeometry args={[widthM * 3, heightM * 3]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  );
}

function FixtureMesh({
  xPct,
  yPct,
  wPct,
  hPct,
  kind,
  label,
  imageUrl,
  color,
  material,
  podiumHeightM,
  steps,
  hasCouverts,
  widthM,
  roomDepthM,
  selected,
  onSelect,
  onDrag,
  readOnly,
  pickable = true,
}: {
  xPct: number;
  yPct: number;
  wPct: number;
  hPct: number;
  kind: string;
  label?: string;
  imageUrl?: string;
  color?: string;
  material?: ZoneMaterial;
  podiumHeightM?: number;
  steps?: number;
  hasCouverts?: boolean;
  widthM: number;
  roomDepthM: number;
  selected: boolean;
  onSelect: () => void;
  onDrag?: (xPct: number, yPct: number) => void;
  readOnly?: boolean;
  pickable?: boolean;
}) {
  const w = (wPct / 100) * widthM;
  const d = (hPct / 100) * roomDepthM;
  const [cx, cz] = pctToWorld(xPct + wPct / 2, yPct + hPct / 2, widthM, roomDepthM);
  const podiumH = podiumHeightM ?? (kind === 'podium' ? 0.6 : kind === 'stage' ? 0.45 : 0.35);
  const stepCount = Math.max(1, Math.min(4, steps ?? (kind === 'podium' ? 2 : 1)));
  const height =
    kind === 'stage' || kind === 'podium' ? podiumH :
    kind === 'column' || kind === 'pillar' ? 2.6 :
    kind === 'flower' ? 0.7 :
    kind === 'carpet' ? 0.06 :
    kind === 'buffet' ? 0.9 :
    0.35;

  const map = useMemo(() => {
    if (imageUrl) return resolveChairMap(imageUrl);
    if (kind === 'carpet') return resolveZoneMaterialMap(material ?? 'carpet').map;
    if (kind === 'buffet') return resolveZoneMaterialMap(material ?? 'wood').map;
    if (kind === 'stage' || kind === 'podium') return resolveZoneMaterialMap(material ?? 'wood').map;
    if (kind === 'column' || kind === 'pillar') return getWallTexture('stone').map;
    if (kind === 'perimeter') return getWallTexture('concrete').map;
    return null;
  }, [imageUrl, kind, material]);

  const baseColor =
    color ??
    (kind === 'stage' || kind === 'podium'
      ? '#b45309'
      : kind === 'buffet'
        ? '#8b6914'
        : kind === 'flower'
          ? '#fb7185'
          : kind === 'entrance'
            ? '#059669'
            : kind === 'aisle'
              ? '#e7e5e4'
              : '#78716c');

  const dragging = useRef(false);
  const { gl } = useThree();

  return (
    <group
      position={[cx, 0, cz]}
      onClick={(e) => {
        if (!pickable) return;
        e.stopPropagation();
        onSelect();
      }}
      onPointerDown={(e) => {
        if (!pickable || readOnly || !onDrag) return;
        e.stopPropagation();
        dragging.current = true;
        onSelect();
        gl.domElement.style.cursor = 'grabbing';
      }}
      onPointerUp={() => { dragging.current = false; gl.domElement.style.cursor = 'auto'; }}
      onPointerMove={(e) => {
        if (!dragging.current || !onDrag) return;
        e.stopPropagation();
        const pct = worldToPct(e.point.x - w / 2, e.point.z - d / 2, widthM, roomDepthM);
        onDrag(pct.x, pct.y);
      }}
    >
      {kind === 'column' || kind === 'pillar' ? (
        <mesh position={[0, height / 2, 0]} castShadow raycast={pickable ? undefined : () => null}>
          <cylinderGeometry args={[Math.min(w, d) / 2, Math.min(w, d) / 2, height, 20]} />
          <meshStandardMaterial color={selected ? '#c7d2fe' : '#ffffff'} map={map ?? undefined} roughness={0.85} />
        </mesh>
      ) : kind === 'flower' ? (
        <group>
          <mesh position={[0, height * 0.2, 0]} castShadow>
            <cylinderGeometry args={[0.08, 0.12, height * 0.5, 8]} />
            <meshStandardMaterial color="#166534" />
          </mesh>
          <mesh position={[0, height * 0.55, 0]} castShadow>
            <sphereGeometry args={[Math.min(w, d) * 0.35, 12, 12]} />
            <meshStandardMaterial color={selected ? '#fda4af' : baseColor} map={map ?? undefined} roughness={0.7} />
          </mesh>
        </group>
      ) : kind === 'podium' || kind === 'stage' ? (
        <group>
          {Array.from({ length: stepCount }).map((_, i) => {
            const t = (i + 1) / stepCount;
            const stepH = height / stepCount;
            const shrink = 1 - i * 0.08;
            return (
              <mesh
                key={i}
                position={[0, stepH * i + stepH / 2, (1 - shrink) * d * 0.15]}
                castShadow
                receiveShadow
              >
                <boxGeometry args={[w * shrink, stepH * 0.95, d * shrink]} />
                <meshStandardMaterial
                  color={selected ? '#c7d2fe' : map ? '#ffffff' : baseColor}
                  map={map ?? undefined}
                  roughness={0.65}
                />
              </mesh>
            );
          })}
        </group>
      ) : kind === 'buffet' ? (
        <group>
          <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[w, height, d]} />
            <meshStandardMaterial color={selected ? '#c7d2fe' : map ? '#ffffff' : baseColor} map={map ?? undefined} roughness={0.55} />
          </mesh>
          <mesh position={[0, height + 0.02, 0]} receiveShadow>
            <boxGeometry args={[w * 1.02, 0.04, d * 1.02]} />
            <meshStandardMaterial color="#f5f0e8" roughness={0.4} />
          </mesh>
          {hasCouverts !== false && Array.from({ length: Math.max(3, Math.round(w * 2)) }).map((_, i) => {
            const n = Math.max(3, Math.round(w * 2));
            const x = ((i + 0.5) / n - 0.5) * w * 0.85;
            return (
              <group key={i} position={[x, height + 0.08, 0]}>
                <mesh>
                  <cylinderGeometry args={[0.07, 0.07, 0.015, 16]} />
                  <meshStandardMaterial color="#f8fafc" metalness={0.15} roughness={0.35} />
                </mesh>
                <mesh position={[0.09, 0.01, 0.02]}>
                  <boxGeometry args={[0.12, 0.004, 0.014]} />
                  <meshStandardMaterial color="#94a3b8" metalness={0.85} roughness={0.15} />
                </mesh>
                <mesh position={[-0.09, 0.01, 0.02]}>
                  <boxGeometry args={[0.1, 0.004, 0.012]} />
                  <meshStandardMaterial color="#cbd5e1" metalness={0.7} roughness={0.2} />
                </mesh>
                <mesh position={[0, 0.04, 0]}>
                  <cylinderGeometry args={[0.035, 0.03, 0.06, 12]} />
                  <meshStandardMaterial color="#e2e8f0" transparent opacity={0.55} roughness={0.1} metalness={0.2} />
                </mesh>
              </group>
            );
          })}
        </group>
      ) : (
        <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[w, height, d]} />
          <meshStandardMaterial
            color={selected ? '#c7d2fe' : map ? '#ffffff' : baseColor}
            map={map ?? undefined}
            roughness={0.75}
          />
        </mesh>
      )}
      {(selected || label) && (
        <Html center distanceFactor={10} style={{ pointerEvents: 'none' }} position={[0, height + 0.35, 0]}>
          <span className="text-[9px] font-bold bg-black/65 text-white px-1.5 py-0.5 rounded">
            {label || kind}
          </span>
        </Html>
      )}
    </group>
  );
}

function SceneContent({
  blueprint,
  selected,
  onSelect,
  onMoveItem,
  onMoveEnd,
  readOnly,
  wallEditMode,
  lockOrbit = false,
}: Omit<RoomWebGLViewerProps, 'className'>) {
  const widthM = blueprint.canvas.widthM;
  const heightM = blueprint.canvas.heightM;
  const depthAmount = resolveDepthAmount(blueprint.metadata);
  const theme = getRoomTheme(blueprint.metadata.roomThemeId, blueprint);
  const floorType = blueprint.metadata.floorType ?? theme.defaultFloorType;
  const walls = resolveBlueprintWalls(blueprint);

  const { camera } = useThree();
  useEffect(() => {
    const tilt = (depthAmount / 100) * 55;
    const dist = Math.max(widthM, heightM) * (1.1 + (100 - depthAmount) * 0.008);
    const elev = Math.cos((tilt * Math.PI) / 180) * dist;
    const back = Math.sin((tilt * Math.PI) / 180) * dist;
    camera.position.set(0, Math.max(elev, 4), back + heightM * 0.15);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  }, [camera, depthAmount, widthM, heightM]);

  const [dragTarget, setDragTarget] = React.useState<{ kind: WebGLSelectableKind; id: string } | null>(null);
  /** En mode caméra bloquée (placement mobilier), les surfaces ne capturent pas les clics. */
  const surfacePickable = !lockOrbit && !dragTarget;

  const moveAny = useCallback(
    (kind: WebGLSelectableKind, id: string, x: number, y: number) => onMoveItem?.(kind, id, x, y),
    [onMoveItem],
  );

  return (
    <>
      <ambientLight intensity={0.45} />
      <directionalLight
        position={[widthM * 0.45, 14, heightM * 0.25]}
        intensity={1.25}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={80}
        shadow-camera-left={-Math.max(widthM, heightM)}
        shadow-camera-right={Math.max(widthM, heightM)}
        shadow-camera-top={Math.max(widthM, heightM)}
        shadow-camera-bottom={-Math.max(widthM, heightM)}
      />
      <hemisphereLight args={['#f8fafc', '#78716c', 0.4]} />
      <spotLight
        position={[0, 10, 0]}
        angle={0.55}
        penumbra={0.5}
        intensity={0.35}
        castShadow={false}
      />

      <FloorPlane
        widthM={widthM}
        heightM={heightM}
        floorType={floorType}
        floorImageUrl={blueprint.metadata.floorImageUrl}
        outline={blueprint.roomOutline}
        onPointerMissed={() => onSelect(null)}
      />

      <gridHelper
        args={[Math.max(widthM, heightM), 24, '#64748b', '#334155']}
        position={[0, 0.015, 0]}
      />

      {walls.map((wall) => (
        <WallMesh
          key={wall.id}
          wall={wall}
          widthM={widthM}
          heightM={heightM}
          selected={selected?.kind === 'wall' && selected.id === wall.id}
          onSelect={() => onSelect({ kind: 'wall', id: wall.id })}
        />
      ))}

      {blueprint.fixtures.map((f) => (
        <FixtureMesh
          key={f.id}
          xPct={f.x}
          yPct={f.y}
          wPct={f.w}
          hPct={f.h}
          kind={f.kind}
          label={f.label}
          imageUrl={f.imageUrl}
          color={f.color ?? f.flowerColor}
          material={f.material}
          podiumHeightM={f.heightM}
          steps={f.steps}
          hasCouverts={f.hasCouverts}
          widthM={widthM}
          roomDepthM={heightM}
          selected={selected?.kind === 'fixture' && selected.id === f.id}
          onSelect={() => onSelect({ kind: 'fixture', id: f.id })}
          onDrag={wallEditMode || !surfacePickable ? undefined : (x, y) => moveAny('fixture', f.id, x, y)}
          readOnly={readOnly || wallEditMode}
          pickable={surfacePickable || (selected?.kind === 'fixture' && selected.id === f.id)}
        />
      ))}

      {blueprint.furniture.map((item) => {
        if (item.kind === 'zone') {
          return (
            <ZoneMesh
              key={item.id}
              xPct={item.x}
              yPct={item.y}
              wPct={item.w}
              hPct={item.h}
              label={item.label}
              material={item.material}
              color={item.color}
              widthM={widthM}
              heightM={heightM}
              selected={selected?.kind === 'zone' && selected.id === item.id}
              onSelect={() => onSelect({ kind: 'zone', id: item.id })}
              onDragStart={wallEditMode || readOnly || !surfacePickable ? undefined : () => setDragTarget({ kind: 'zone', id: item.id })}
              readOnly={readOnly || wallEditMode}
              pickable={surfacePickable || (selected?.kind === 'zone' && selected.id === item.id)}
            />
          );
        }
        if (item.kind === 'chair') {
          const surface = resolveFurnitureSurfaceAt(blueprint, item.x, item.y);
          return (
            <FreeChairMesh
              key={item.id}
              xPct={item.x}
              yPct={item.y}
              chairType={item.chairType}
              chairStyle={item.chairStyle}
              seatMaterial={item.seatMaterial}
              chairImageUrl={item.chairImageUrl}
              rotation={item.rotation}
              elevationM={surface?.elevationM ?? 0}
              label={item.label}
              widthM={widthM}
              heightM={heightM}
              selected={selected?.kind === 'chair' && selected.id === item.id}
              onSelect={() => onSelect({ kind: 'chair', id: item.id })}
              onDragStart={wallEditMode || readOnly || item.locked ? undefined : () => setDragTarget({ kind: 'chair', id: item.id })}
              readOnly={readOnly || wallEditMode || item.locked}
            />
          );
        }
        if (item.kind === 'row') {
          const [wx, wz] = pctToWorld(item.x, item.y, widthM, heightM);
          const count = Math.min(item.seatCount, 24);
          const surface = resolveFurnitureSurfaceAt(blueprint, item.x, item.y);
          const elevation = Math.max(
            item.elevationM ?? (item.tier > 0 ? item.tier * 0.38 : 0),
            surface?.elevationM ?? 0,
          );
          const curve = item.curve ?? 0;
          const spacing = 0.55;
          const [fx, fz] = pctToWorld(item.focusX ?? item.x, item.focusY ?? Math.max(4, item.y - 25), widthM, heightM);
          const rowRot = ((item.rotation ?? 0) * Math.PI) / 180;

          return (
            <group
              key={item.id}
              position={[wx, 0, wz]}
              rotation={[0, rowRot, 0]}
              onClick={(e) => { e.stopPropagation(); onSelect({ kind: 'row', id: item.id }); }}
              onPointerDown={(e) => {
                if (readOnly || wallEditMode) return;
                e.stopPropagation();
                onSelect({ kind: 'row', id: item.id });
                setDragTarget({ kind: 'row', id: item.id });
              }}
            >
              {/* Plateforme / gradin (seulement si élévation propre, pas juste moquette) */}
              {(item.elevationM ?? 0) > 0.05 && (
                <mesh position={[0, (item.elevationM ?? 0) / 2, 0.15]} receiveShadow castShadow>
                  <boxGeometry args={[count * spacing + 0.6, item.elevationM ?? 0, 1.1 + curve * 2]} />
                  <meshStandardMaterial color={selected ? '#c7d2fe' : '#78716c'} roughness={0.85} />
                </mesh>
              )}
              {Array.from({ length: count }).map((_, i) => {
                const t = i - (count - 1) / 2;
                const localX = t * spacing;
                const localZ = curve * (t * t) * 0.08;
                const worldX = wx + Math.cos(rowRot) * localX - Math.sin(rowRot) * localZ;
                const worldZ = wz + Math.sin(rowRot) * localX + Math.cos(rowRot) * localZ;
                const faceY = Math.atan2(fx - worldX, fz - worldZ) - rowRot;
                return (
                  <RealisticChair
                    key={i}
                    chairType={item.chairType}
                    chairStyle={item.chairStyle}
                    seatMaterial={item.seatMaterial}
                    imageUrl={item.chairImageUrl}
                    position={[localX, elevation, localZ]}
                    rotationY={faceY}
                    selected={selected?.kind === 'row' && selected.id === item.id}
                  />
                );
              })}
              <Html center distanceFactor={10} style={{ pointerEvents: 'none' }} position={[0, elevation + 1.1, 0]}>
                <span className="text-[9px] font-bold bg-white/90 px-1.5 py-0.5 rounded shadow-sm">{item.label}</span>
              </Html>
            </group>
          );
        }

        const tableColor = resolveTableColor(item.tableColor, blueprint.metadata.defaultTableColor) ?? '#f8fafc';
        const surface = resolveFurnitureSurfaceAt(blueprint, item.x, item.y);
        return (
          <TableMesh
            key={item.id}
            xPct={item.x}
            yPct={item.y}
            shape={item.shape}
            color={tableColor}
            name={item.name}
            capacity={item.capacity}
            chairType={item.chairType}
            chairStyle={item.chairStyle}
            seatMaterial={item.seatMaterial}
            chairImageUrl={item.chairImageUrl}
            tableImageUrl={item.tableImageUrl}
            hasCouverts={item.hasCouverts}
            attachedChairs={item.attachedChairs}
            rotation={item.rotation}
            elevationM={surface?.elevationM ?? 0}
            widthM={widthM}
            heightM={heightM}
            selected={selected?.kind === 'table' && selected.id === item.id}
            onSelect={() => onSelect({ kind: 'table', id: item.id })}
            onDragStart={wallEditMode || readOnly || item.locked ? undefined : () => setDragTarget({ kind: 'table', id: item.id })}
            readOnly={readOnly || wallEditMode || item.locked}
          />
        );
      })}

      <DragPlane
        active={Boolean(dragTarget) && !wallEditMode}
        widthM={widthM}
        heightM={heightM}
        onDrag={(x, y) => {
          if (!dragTarget) return;
          moveAny(dragTarget.kind, dragTarget.id, x, y);
        }}
        onEnd={() => {
          setDragTarget(null);
          onMoveEnd?.();
        }}
      />

      <OrbitControls
        enablePan={!wallEditMode && !lockOrbit && !dragTarget}
        enableRotate={!wallEditMode && !lockOrbit && !dragTarget}
        enableZoom
        maxPolarAngle={Math.PI / 2.05}
        minDistance={3}
        maxDistance={Math.max(widthM, heightM) * 3}
        target={[0, 0, 0]}
      />
    </>
  );
}

export default function RoomWebGLViewer({
  blueprint,
  selected,
  onSelect,
  onMoveItem,
  onMoveEnd,
  readOnly = false,
  className,
  wallEditMode = false,
  lockOrbit = false,
}: RoomWebGLViewerProps) {
  return (
    <div className={cn('relative w-full overflow-hidden rounded-[var(--radius-card)] border border-border bg-[#1a1410]', className)}>
      <Canvas
        shadows
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: false }}
        camera={{ position: [0, 18, 12], fov: 45, near: 0.1, far: 200 }}
        onPointerMissed={() => onSelect(null)}
      >
        <color attach="background" args={['#1a1410']} />
        <Suspense fallback={null}>
          <SceneContent
            blueprint={blueprint}
            selected={selected}
            onSelect={onSelect}
            onMoveItem={onMoveItem}
            onMoveEnd={onMoveEnd}
            readOnly={readOnly}
            wallEditMode={wallEditMode}
            lockOrbit={lockOrbit}
          />
        </Suspense>
      </Canvas>
      <div className="pointer-events-none absolute bottom-2 left-2 rounded-md bg-black/50 px-2 py-1 text-[9px] font-medium text-white/80">
        {lockOrbit
          ? 'Caméra bloquée · posez tables/chaises sur moquette, piste, podium · molette = zoom'
          : 'Orbit libre · activez « Caméra bloquée » pour placer le mobilier sur les surfaces'}
      </div>
    </div>
  );
}
