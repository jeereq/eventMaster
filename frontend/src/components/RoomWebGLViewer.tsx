'use client';

import React, { Suspense, useMemo, useRef, useCallback, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Canvas, ThreeEvent, useThree } from '@react-three/fiber';
import { OrbitControls, Html, ContactShadows } from '@react-three/drei';
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
  type ZoneKind,
} from '@/lib/roomLayoutUtils';
import { resolveDepthAmount } from '@/lib/roomFloorUtils';
import { getRoomTheme } from '@/lib/roomThemeUtils';
import { getTableSeatPlacement3D } from '@/lib/tablePlanUtils';
import {
  getWallTexture,
  getStairWoodMap,
  resolveChairMap,
  resolveFloorMap,
  resolveTableMaterial,
  resolveZoneMaterialMap,
} from '@/lib/roomWebGLMaterials';
import { cn } from '@/lib/cn';
import {
  CatalogueBuffet,
  CatalogueChair,
  CatalogueColumn,
  CatalogueFlower,
  CatalogueTableStructure,
} from '@/components/CatalogueFurnitureMeshes';
import {
  AmphitheaterRiser,
  EventStage,
  EventZoneSurface,
} from '@/components/CatalogueEventArchitecture';
import { RoomAmbiance } from '@/components/CatalogueAmbiance';
import {
  resolveLightingPreset,
  resolveRenderQuality,
  type LightingPreset,
  type RenderQuality,
} from '@/lib/roomRenderQuality';

export type WebGLSelectableKind = 'table' | 'row' | 'zone' | 'fixture' | 'wall' | 'chair';

export interface WebGLSelection {
  kind: WebGLSelectableKind;
  id: string;
}

export type RoomWebGLCaptureApi = {
  capturePng: (scale?: number) => string | null;
};

interface RoomWebGLViewerProps {
  blueprint: RoomLayoutBlueprint;
  /** Sélection simple ou multiple. */
  selected: WebGLSelection[];
  onSelect: (sel: WebGLSelection | null, opts?: { additive?: boolean }) => void;
  onMoveItem?: (kind: WebGLSelectableKind, id: string, xPct: number, yPct: number) => void;
  onMoveEnd?: () => void;
  readOnly?: boolean;
  className?: string;
  wallEditMode?: boolean;
  /** Bloque orbit / pan pour déplacer le mobilier sans changer la perspective. */
  lockOrbit?: boolean;
  /** Mode aperçu (marketplace / fiches) : pas de hints d’édition, orbit libre. */
  previewMode?: boolean;
  /** Override qualité (sinon metadata / défaut). */
  renderQuality?: RenderQuality;
  /** Override éclairage (sinon metadata / auto). */
  lightingPreset?: LightingPreset;
  /** Mode présentation (orbit auto, sans labels). */
  presentationMode?: boolean;
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


function ScenicLights({
  widthM,
  heightM,
  lighting,
  shadowMapSize,
}: {
  widthM: number;
  heightM: number;
  lighting: ReturnType<typeof resolveLightingPreset>;
  shadowMapSize: number;
}) {
  const extent = Math.max(widthM, heightM);
  return (
    <>
      <ambientLight intensity={lighting.ambient} />
      <directionalLight
        position={[widthM * 0.4, 16, heightM * 0.2]}
        intensity={lighting.keyIntensity}
        castShadow
        shadow-mapSize-width={shadowMapSize}
        shadow-mapSize-height={shadowMapSize}
        shadow-bias={-0.0002}
        shadow-camera-far={90}
        shadow-camera-left={-extent}
        shadow-camera-right={extent}
        shadow-camera-top={extent}
        shadow-camera-bottom={-extent}
        color={lighting.keyColor}
      />
      <directionalLight
        position={[-widthM * 0.5, 8, -heightM * 0.3]}
        intensity={lighting.fillIntensity}
        color={lighting.fillColor}
      />
      <hemisphereLight args={[lighting.hemiSky, lighting.hemiGround, lighting.hemiIntensity]} />
      <spotLight
        position={[0, 12, 0]}
        angle={0.6}
        penumbra={0.65}
        intensity={lighting.spotIntensity}
        castShadow={false}
        color={lighting.spotColor}
      />
      <pointLight
        position={[widthM * 0.3, 3.2, heightM * 0.25]}
        intensity={lighting.warmPoint}
        color="#fde68a"
        distance={18}
      />
      <pointLight
        position={[-widthM * 0.25, 3.2, -heightM * 0.2]}
        intensity={lighting.coolPoint}
        color="#e0f2fe"
        distance={16}
      />
    </>
  );
}

function CaptureBridge({
  apiRef,
}: {
  apiRef: React.MutableRefObject<RoomWebGLCaptureApi | null>;
}) {
  const { gl, scene, camera, size } = useThree();
  useEffect(() => {
    apiRef.current = {
      capturePng: (scale = 1) => {
        try {
          const w = Math.max(1, Math.floor(size.width * scale));
          const h = Math.max(1, Math.floor(size.height * scale));
          const prevPr = gl.getPixelRatio();
          gl.setPixelRatio(1);
          gl.setSize(w, h, false);
          gl.render(scene, camera);
          const url = gl.domElement.toDataURL('image/png');
          gl.setPixelRatio(prevPr);
          gl.setSize(size.width, size.height, false);
          gl.render(scene, camera);
          return url;
        } catch {
          return null;
        }
      },
    };
    return () => {
      apiRef.current = null;
    };
  }, [apiRef, camera, gl, scene, size.height, size.width]);
  return null;
}

function FloorPlane({
  widthM,
  heightM,
  floorType,
  floorImageUrl,
  floorColor,
  outline,
  onPointerMissed,
}: {
  widthM: number;
  heightM: number;
  floorType?: import('@/lib/roomThemeUtils').FloorType;
  floorImageUrl?: string;
  floorColor?: string;
  outline?: RoomLayoutBlueprint['roomOutline'];
  onPointerMissed?: () => void;
}) {
  const mat = useMemo(
    () => resolveFloorMap(floorType, floorImageUrl, widthM, heightM, floorColor),
    [floorType, floorImageUrl, floorColor, widthM, heightM],
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

function RoofMesh({
  widthM,
  heightM,
  wallHeightM,
  outline,
  color = '#e7e5e4',
  opacity = 0.55,
}: {
  widthM: number;
  heightM: number;
  wallHeightM: number;
  outline?: RoomLayoutBlueprint['roomOutline'];
  color?: string;
  opacity?: number;
}) {
  const y = wallHeightM + 0.04;
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
    geo.rotateX(Math.PI / 2);
    return geo;
  }, [outline, widthM, heightM]);

  return (
    <mesh
      geometry={shapeGeo ?? undefined}
      position={[0, y, 0]}
      rotation={shapeGeo ? [0, 0, 0] : [Math.PI / 2, 0, 0]}
      receiveShadow
    >
      {!shapeGeo && <planeGeometry args={[widthM * 0.98, heightM * 0.98]} />}
      <meshStandardMaterial
        color={color}
        transparent
        opacity={opacity}
        roughness={0.9}
        metalness={0.02}
        side={THREE.DoubleSide}
        depthWrite={opacity > 0.85}
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
  paintColor,
}: {
  wall: RoomWallSegment;
  widthM: number;
  heightM: number;
  selected: boolean;
  onSelect: (mods?: { shiftKey?: boolean; metaKey?: boolean; ctrlKey?: boolean }) => void;
  paintColor?: string;
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
    () => getWallTexture(wall.texture, wall.color ?? paintColor),
    [wall.texture, wall.color, paintColor],
  );

  if (length < 0.05) return null;

  return (
    <group
      position={[midX, wallH / 2, midZ]}
      rotation={[0, -angle, 0]}
      onClick={(e) => {
        e.stopPropagation();
        onSelect({ shiftKey: e.shiftKey, metaKey: e.metaKey, ctrlKey: e.ctrlKey });
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
      {/* Plinthe */}
      <mesh position={[0, -wallH / 2 + 0.06, thick * 0.55]} castShadow receiveShadow>
        <boxGeometry args={[length * 0.995, 0.12, 0.04]} />
        <meshStandardMaterial color="#3f3f46" roughness={0.7} metalness={0.05} />
      </mesh>
      {/* Corniche haute */}
      <mesh position={[0, wallH / 2 - 0.04, thick * 0.45]} castShadow>
        <boxGeometry args={[length * 0.995, 0.06, 0.05]} />
        <meshStandardMaterial color="#e7e5e4" roughness={0.85} metalness={0.02} />
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

function RealisticChair(props: {
  chairType: ChairType;
  chairStyle?: ChairStyle;
  seatMaterial?: SeatMaterial;
  imageUrl?: string;
  position: [number, number, number];
  rotationY?: number;
  selected?: boolean;
}) {
  return <CatalogueChair {...props} />;
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
  hideLabels = false,
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
  onSelect: (mods?: { shiftKey?: boolean; metaKey?: boolean; ctrlKey?: boolean }) => void;
  onDragStart?: () => void;
  readOnly?: boolean;
  hideLabels?: boolean;
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
  const topY = shape === 'highTop' ? 1.05 : shape === 'cocktail' ? 0.55 : 0.72;

  return (
    <group
      position={[wx, elevationM, wz]}
      rotation={[0, ((rotation ?? 0) * Math.PI) / 180, 0]}
      onClick={(e) => {
        e.stopPropagation();
        onSelect({ shiftKey: e.shiftKey, metaKey: e.metaKey, ctrlKey: e.ctrlKey });
      }}
      onPointerDown={(e) => {
        if (readOnly || !onDragStart) return;
        e.stopPropagation();
        onSelect({ shiftKey: e.shiftKey, metaKey: e.metaKey, ctrlKey: e.ctrlKey });
        onDragStart();
        gl.domElement.style.cursor = 'grabbing';
      }}
    >
      <CatalogueTableStructure
        shape={shape}
        size={size as [number, number]}
        topY={topY}
        mat={mat}
        selected={selected}
      />
      {/* Couverts / assiettes */}
      {hasCouverts && Array.from({ length: Math.min(capacity, 10) }).map((_, i) => {
        const a = (i / Math.max(capacity, 1)) * Math.PI * 2;
        const r = Math.max(size[0], size[1]) * 0.28;
        return (
          <group key={`c-${i}`} position={[Math.cos(a) * r, topY + 0.055, Math.sin(a) * r]} rotation={[0, -a, 0]}>
            <mesh>
              <cylinderGeometry args={[0.065, 0.07, 0.012, 20]} />
              <meshStandardMaterial color="#f8fafc" metalness={0.25} roughness={0.25} />
            </mesh>
            <mesh position={[0, 0.01, 0]}>
              <cylinderGeometry args={[0.035, 0.035, 0.008, 16]} />
              <meshStandardMaterial color="#e2e8f0" metalness={0.15} roughness={0.3} />
            </mesh>
            <mesh position={[0.09, 0.012, 0]} rotation={[0, 0, 0.15]}>
              <boxGeometry args={[0.11, 0.004, 0.012]} />
              <meshStandardMaterial color="#cbd5e1" metalness={0.85} roughness={0.15} />
            </mesh>
            <mesh position={[-0.09, 0.012, 0]} rotation={[0, 0, -0.15]}>
              <boxGeometry args={[0.1, 0.004, 0.014]} />
              <meshStandardMaterial color="#94a3b8" metalness={0.8} roughness={0.2} />
            </mesh>
            <mesh position={[0.02, 0.02, 0.08]}>
              <cylinderGeometry args={[0.018, 0.015, 0.04, 10]} />
              <meshStandardMaterial color="#f1f5f9" transparent opacity={0.55} roughness={0.05} metalness={0.3} />
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
      {selected && !hideLabels && (
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
  zoneKind,
  color,
  rotation = 0,
  widthM,
  heightM,
  selected,
  onSelect,
  onDragStart,
  readOnly,
  pickable = true,
  hideLabels = false,
}: {
  xPct: number;
  yPct: number;
  wPct: number;
  hPct: number;
  label: string;
  material?: ZoneMaterial;
  zoneKind?: ZoneKind;
  color?: string;
  rotation?: number;
  widthM: number;
  heightM: number;
  selected: boolean;
  onSelect: (mods?: { shiftKey?: boolean; metaKey?: boolean; ctrlKey?: boolean }) => void;
  onDragStart?: () => void;
  readOnly?: boolean;
  pickable?: boolean;
  hideLabels?: boolean;
}) {
  const w = (wPct / 100) * widthM;
  const h = (hPct / 100) * heightM;
  const [cx, cz] = pctToWorld(xPct + wPct / 2, yPct + hPct / 2, widthM, heightM);
  const mat = useMemo(() => resolveZoneMaterialMap(material), [material]);
  const { gl } = useThree();
  const rot = ((rotation ?? 0) * Math.PI) / 180;
  const thickness = mat.thicknessM ?? 0.03;

  return (
    <group
      position={[cx, thickness / 2, cz]}
      rotation={[0, rot, 0]}
      onClick={(e) => {
        if (!pickable) return;
        e.stopPropagation();
        onSelect({ shiftKey: e.shiftKey, metaKey: e.metaKey, ctrlKey: e.ctrlKey });
      }}
      onPointerDown={(e) => {
        if (!pickable || readOnly || !onDragStart) return;
        e.stopPropagation();
        onSelect({ shiftKey: e.shiftKey, metaKey: e.metaKey, ctrlKey: e.ctrlKey });
        onDragStart();
        gl.domElement.style.cursor = 'grabbing';
      }}
    >
      <EventZoneSurface
        w={w}
        h={h}
        thickness={thickness}
        material={material}
        zoneKind={zoneKind}
        color={color}
        selected={selected}
        pickable={pickable}
      />
      <mesh position={[0, thickness + 0.04, -h * 0.35]} rotation={[-Math.PI / 2, 0, Math.PI]}>
        <coneGeometry args={[Math.min(w, h) * 0.06, Math.min(w, h) * 0.14, 3]} />
        <meshStandardMaterial color="#fef3c7" emissive="#f59e0b" emissiveIntensity={0.45} />
      </mesh>
      {!hideLabels && (
        <Html center distanceFactor={12} style={{ pointerEvents: 'none' }} position={[0, thickness + 0.22, 0]}>
          <span className="text-[10px] font-bold text-white bg-black/55 px-1.5 py-0.5 rounded shadow-sm">{label}</span>
        </Html>
      )}
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
  hideLabels = false,
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
  onSelect: (mods?: { shiftKey?: boolean; metaKey?: boolean; ctrlKey?: boolean }) => void;
  onDragStart?: () => void;
  readOnly?: boolean;
  label?: string;
  hideLabels?: boolean;
}) {
  const [wx, wz] = pctToWorld(xPct, yPct, widthM, heightM);
  const { gl } = useThree();
  return (
    <group
      position={[wx, elevationM, wz]}
      onClick={(e) => {
        e.stopPropagation();
        onSelect({ shiftKey: e.shiftKey, metaKey: e.metaKey, ctrlKey: e.ctrlKey });
      }}
      onPointerDown={(e) => {
        if (readOnly || !onDragStart) return;
        e.stopPropagation();
        onSelect({ shiftKey: e.shiftKey, metaKey: e.metaKey, ctrlKey: e.ctrlKey });
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
      {selected && !hideLabels && (
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
  stairDirection = 0,
  columnShape,
  widthM,
  roomDepthM,
  selected,
  onSelect,
  onDrag,
  readOnly,
  pickable = true,
  hideLabels = false,
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
  stairDirection?: 0 | 90 | 180 | 270;
  columnShape?: 'round' | 'square';
  widthM: number;
  roomDepthM: number;
  selected: boolean;
  onSelect: (mods?: { shiftKey?: boolean; metaKey?: boolean; ctrlKey?: boolean }) => void;
  onDrag?: (xPct: number, yPct: number) => void;
  readOnly?: boolean;
  pickable?: boolean;
  hideLabels?: boolean;
}) {
  const w = (wPct / 100) * widthM;
  const d = (hPct / 100) * roomDepthM;
  const [cx, cz] = pctToWorld(xPct + wPct / 2, yPct + hPct / 2, widthM, roomDepthM);
  const podiumH = podiumHeightM ?? (kind === 'podium' ? 0.6 : kind === 'stage' ? 0.45 : 0.35);
  const stepCount = Math.max(1, Math.min(4, steps ?? (kind === 'podium' ? 2 : 1)));
  const height =
    kind === 'stage' || kind === 'podium' || kind === 'stairs' ? podiumH :
    kind === 'column' || kind === 'pillar' ? 2.6 :
    kind === 'flower' ? 0.7 :
    kind === 'carpet' ? 0.06 :
    kind === 'buffet' ? 0.9 :
    0.35;
  const stairSteps = Math.max(3, Math.min(16, steps ?? (kind === 'stairs' ? 6 : 1)));


  const map = useMemo(() => {
    if (imageUrl) return resolveChairMap(imageUrl);
    if (kind === 'carpet') return resolveZoneMaterialMap(material ?? 'carpet').map;
    if (kind === 'buffet') return resolveZoneMaterialMap(material ?? 'wood').map;
    if (kind === 'stage' || kind === 'podium' || kind === 'stairs') return resolveZoneMaterialMap(material ?? 'wood').map;
    if (kind === 'column' || kind === 'pillar') return getWallTexture('stone').map;
    if (kind === 'perimeter') return getWallTexture('concrete').map;
    return null;
  }, [imageUrl, kind, material]);

  const baseColor =
    color ??
    (kind === 'stage' || kind === 'podium'
      ? '#b45309'
      : kind === 'stairs'
        ? '#a8a29e'
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
        onSelect({ shiftKey: e.shiftKey, metaKey: e.metaKey, ctrlKey: e.ctrlKey });
      }}
      onPointerDown={(e) => {
        if (!pickable || readOnly || !onDrag) return;
        e.stopPropagation();
        dragging.current = true;
        onSelect({ shiftKey: e.shiftKey, metaKey: e.metaKey, ctrlKey: e.ctrlKey });
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
        <CatalogueColumn
          w={w}
          d={d}
          height={height}
          map={map}
          selected={selected}
          pickable={pickable}
          square={columnShape === 'square'}
        />
      ) : kind === 'flower' ? (
        <CatalogueFlower
          w={w}
          d={d}
          height={height}
          color={baseColor}
          selected={selected}
          map={map}
        />
      ) : kind === 'podium' || kind === 'stage' ? (
        <EventStage
          w={w}
          d={d}
          height={height}
          steps={stepCount}
          map={map}
          baseColor={baseColor}
          selected={selected}
          kind={kind === 'podium' ? 'podium' : 'stage'}
        />
      ) : kind === 'stairs' ? (
        <group rotation={[0, ((stairDirection ?? 0) * Math.PI) / 180, 0]}>
          {Array.from({ length: stairSteps }).map((_, i) => {
            const stepH = height / stairSteps;
            const tread = d / stairSteps;
            const woodMap = map ?? getStairWoodMap();
            return (
              <group key={i} position={[0, stepH * i, -d / 2 + tread * (i + 0.5)]}>
                {/* Contremarche */}
                <mesh position={[0, stepH / 2, -tread * 0.35]} castShadow receiveShadow raycast={pickable ? undefined : () => null}>
                  <boxGeometry args={[w * 0.96, stepH, tread * 0.35]} />
                  <meshStandardMaterial color={selected ? '#c7d2fe' : '#78716c'} map={woodMap} roughness={0.75} />
                </mesh>
                {/* Marche (nez débordant) */}
                <mesh position={[0, stepH + 0.015, 0]} castShadow receiveShadow>
                  <boxGeometry args={[w * 0.98, 0.04, tread * 0.95]} />
                  <meshStandardMaterial color={selected ? '#c7d2fe' : '#ffffff'} map={woodMap} roughness={0.55} metalness={0.05} />
                </mesh>
                {/* Bande antidérapante */}
                <mesh position={[0, stepH + 0.038, tread * 0.35]}>
                  <boxGeometry args={[w * 0.9, 0.008, 0.04]} />
                  <meshStandardMaterial color="#1c1917" roughness={0.95} />
                </mesh>
              </group>
            );
          })}
          {/* Rampes tubulaires */}
          {([-1, 1] as const).map((side) => (
            <group key={side}>
              <mesh
                position={[side * w * 0.48, height * 0.55, 0]}
                rotation={[Math.atan2(height, d) - Math.PI / 2, 0, 0]}
                castShadow
              >
                <cylinderGeometry args={[0.025, 0.025, Math.hypot(height, d) * 0.95, 12]} />
                <meshStandardMaterial color="#a8a29e" metalness={0.7} roughness={0.25} />
              </mesh>
              {Array.from({ length: Math.max(3, Math.ceil(stairSteps / 2)) }).map((_, pi) => {
                const t = (pi + 0.5) / Math.max(3, Math.ceil(stairSteps / 2));
                return (
                  <mesh
                    key={pi}
                    position={[side * w * 0.48, height * t * 0.85 + 0.15, -d / 2 + d * t]}
                    castShadow
                  >
                    <cylinderGeometry args={[0.018, 0.018, height * t * 0.85 + 0.15, 8]} />
                    <meshStandardMaterial color="#78716c" metalness={0.65} roughness={0.3} />
                  </mesh>
                );
              })}
            </group>
          ))}
          {/* Palier haut */}
          <mesh position={[0, height + 0.03, d / 2 - 0.15]} castShadow receiveShadow>
            <boxGeometry args={[w * 0.98, 0.06, 0.35]} />
            <meshStandardMaterial
              color={selected ? '#c7d2fe' : '#ffffff'}
              map={(map ?? getStairWoodMap()) || undefined}
              roughness={0.5}
            />
          </mesh>
        </group>
      ) : kind === 'buffet' ? (
        <CatalogueBuffet
          w={w}
          d={d}
          height={height}
          map={map}
          baseColor={baseColor}
          selected={selected}
          hasCouverts={hasCouverts}
        />
      ) : kind === 'aisle' ? (
        <group>
          <mesh position={[0, 0.02, 0]} receiveShadow>
            <boxGeometry args={[w, 0.04, d]} />
            <meshStandardMaterial color={selected ? '#c7d2fe' : '#e7e5e4'} roughness={0.85} />
          </mesh>
          <mesh position={[0, 0.045, 0]} receiveShadow>
            <boxGeometry args={[w * 0.55, 0.015, d * 0.98]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.7} />
          </mesh>
        </group>
      ) : kind === 'entrance' ? (
        <group>
          <mesh position={[0, 0.03, 0]} receiveShadow castShadow>
            <boxGeometry args={[w, 0.06, d]} />
            <meshStandardMaterial color={selected ? '#c7d2fe' : '#059669'} roughness={0.75} />
          </mesh>
          {([-1, 1] as const).map((side) => (
            <mesh key={side} position={[side * w * 0.4, 0.55, 0]} castShadow>
              <cylinderGeometry args={[0.04, 0.05, 1.1, 12]} />
              <meshStandardMaterial color="#d4af37" metalness={0.7} roughness={0.3} />
            </mesh>
          ))}
          <mesh position={[0, 1.05, 0]} castShadow>
            <boxGeometry args={[w * 0.85, 0.08, 0.08]} />
            <meshStandardMaterial color="#b45309" metalness={0.4} roughness={0.4} />
          </mesh>
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
      {(selected || label) && !hideLabels && (
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
  qualitySettings,
  lighting,
  captureApiRef,
  presentationMode = false,
  hideLabels = false,
}: Omit<RoomWebGLViewerProps, 'className' | 'previewMode' | 'renderQuality' | 'lightingPreset' | 'presentationMode'> & {
  qualitySettings: ReturnType<typeof resolveRenderQuality>;
  lighting: ReturnType<typeof resolveLightingPreset>;
  captureApiRef?: React.MutableRefObject<RoomWebGLCaptureApi | null>;
  presentationMode?: boolean;
  hideLabels?: boolean;
}) {
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
    if ('fov' in camera) {
      (camera as THREE.PerspectiveCamera).fov = qualitySettings.fov;
    }
    camera.updateProjectionMatrix();
  }, [camera, depthAmount, widthM, heightM, qualitySettings.fov]);

  const [dragTarget, setDragTarget] = React.useState<{ kind: WebGLSelectableKind; id: string } | null>(null);
  /** En mode caméra bloquée (placement mobilier), les surfaces ne capturent pas les clics. */
  const surfacePickable = !lockOrbit && !dragTarget;

  const moveAny = useCallback(
    (kind: WebGLSelectableKind, id: string, x: number, y: number) => onMoveItem?.(kind, id, x, y),
    [onMoveItem],
  );

  return (
    <>
      {captureApiRef ? <CaptureBridge apiRef={captureApiRef} /> : null}
      <ScenicLights
        widthM={widthM}
        heightM={heightM}
        lighting={lighting}
        shadowMapSize={qualitySettings.shadowMapSize}
      />

      {qualitySettings.contactShadows ? (
        <ContactShadows
          position={[0, 0.02, 0]}
          opacity={qualitySettings.contactShadowsOpacity}
          scale={Math.max(widthM, heightM) * 1.35}
          blur={qualitySettings.contactShadowsBlur}
          far={10}
          resolution={qualitySettings.contactShadowsResolution}
          color="#1c1917"
        />
      ) : null}

      <FloorPlane
        widthM={widthM}
        heightM={heightM}
        floorType={floorType}
        floorImageUrl={blueprint.metadata.floorImageUrl}
        floorColor={blueprint.metadata.floorColor}
        outline={blueprint.roomOutline}
        onPointerMissed={() => onSelect(null)}
      />

      {blueprint.metadata.showRoof === true && (
        <RoofMesh
          widthM={widthM}
          heightM={heightM}
          wallHeightM={walls[0]?.heightM ?? 3}
          outline={blueprint.roomOutline}
          color={blueprint.metadata.roofColor ?? '#d6d3d1'}
          opacity={blueprint.metadata.roofOpacity ?? 0.45}
        />
      )}

      <RoomAmbiance
        widthM={widthM}
        heightM={heightM}
        wallHeightM={walls[0]?.heightM ?? 3}
        flags={{
          chandeliers: blueprint.metadata.showChandeliers === true,
          uplights: blueprint.metadata.showUplights === true,
          curtains: blueprint.metadata.showCurtains === true,
          plants: blueprint.metadata.showDecorPlants === true,
        }}
      />

      {!presentationMode && !hideLabels ? (
        <gridHelper
          args={[Math.max(widthM, heightM), 24, '#64748b', '#334155']}
          position={[0, 0.015, 0]}
        />
      ) : null}

      {walls.map((wall) => (
        <WallMesh
          key={wall.id}
          wall={wall}
          widthM={widthM}
          heightM={heightM}
          paintColor={blueprint.metadata.wallPaintColor}
          selected={selected.some((s) => s.kind === 'wall' && s.id === wall.id)}
          onSelect={(e) => onSelect({ kind: 'wall', id: wall.id }, { additive: Boolean(e?.shiftKey || e?.metaKey || e?.ctrlKey) })}
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
          stairDirection={f.stairDirection}
          columnShape={f.columnShape}
          widthM={widthM}
          roomDepthM={heightM}
          selected={selected.some((s) => s.kind === 'fixture' && s.id === f.id)}
          onSelect={(e) => onSelect({ kind: 'fixture', id: f.id }, { additive: Boolean(e?.shiftKey || e?.metaKey || e?.ctrlKey) })}
          onDrag={wallEditMode || !surfacePickable ? undefined : (x, y) => moveAny('fixture', f.id, x, y)}
          readOnly={readOnly || wallEditMode}
          pickable={surfacePickable || selected.some((s) => s.kind === 'fixture' && s.id === f.id)}
          hideLabels={hideLabels}
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
              zoneKind={item.zoneKind}
              color={item.color}
              rotation={item.rotation}
              widthM={widthM}
              heightM={heightM}
              selected={selected.some((s) => s.kind === 'zone' && s.id === item.id)}
              onSelect={(e) => onSelect({ kind: 'zone', id: item.id }, { additive: Boolean(e?.shiftKey || e?.metaKey || e?.ctrlKey) })}
              onDragStart={wallEditMode || readOnly || !surfacePickable ? undefined : () => setDragTarget({ kind: 'zone', id: item.id })}
              readOnly={readOnly || wallEditMode}
              pickable={surfacePickable || selected.some((s) => s.kind === 'zone' && s.id === item.id)}
              hideLabels={hideLabels}
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
              selected={selected.some((s) => s.kind === 'chair' && s.id === item.id)}
              onSelect={(e) => onSelect({ kind: 'chair', id: item.id }, { additive: Boolean(e?.shiftKey || e?.metaKey || e?.ctrlKey) })}
              onDragStart={wallEditMode || readOnly || item.locked ? undefined : () => setDragTarget({ kind: 'chair', id: item.id })}
              readOnly={readOnly || wallEditMode || item.locked}
              hideLabels={hideLabels}
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
              onClick={(e) => {
                e.stopPropagation();
                onSelect({ kind: 'row', id: item.id }, { additive: e.shiftKey || e.metaKey || e.ctrlKey });
              }}
              onPointerDown={(e) => {
                if (readOnly || wallEditMode) return;
                e.stopPropagation();
                onSelect({ kind: 'row', id: item.id }, { additive: e.shiftKey || e.metaKey || e.ctrlKey });
                setDragTarget({ kind: 'row', id: item.id });
              }}
            >
              {/* Plateforme / gradin amphithéâtre */}
              {(item.elevationM ?? 0) > 0.05 || item.tier > 0 ? (
                <AmphitheaterRiser
                  seatCount={count}
                  spacing={spacing}
                  elevation={elevation}
                  curve={curve}
                  selected={selected.some((s) => s.kind === 'row' && s.id === item.id)}
                />
              ) : null}
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
                    selected={selected.some((s) => s.kind === 'row' && s.id === item.id)}
                  />
                );
              })}
              {!hideLabels && (
                <Html center distanceFactor={10} style={{ pointerEvents: 'none' }} position={[0, elevation + 1.1, 0]}>
                  <span className="text-[9px] font-bold bg-white/90 px-1.5 py-0.5 rounded shadow-sm">{item.label}</span>
                </Html>
              )}
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
            selected={selected.some((s) => s.kind === 'table' && s.id === item.id)}
            onSelect={(e) => onSelect({ kind: 'table', id: item.id }, { additive: Boolean(e?.shiftKey || e?.metaKey || e?.ctrlKey) })}
            onDragStart={wallEditMode || readOnly || item.locked ? undefined : () => setDragTarget({ kind: 'table', id: item.id })}
            readOnly={readOnly || wallEditMode || item.locked}
            hideLabels={hideLabels}
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
        enablePan={!wallEditMode && !lockOrbit && !dragTarget && !presentationMode}
        enableRotate={(!wallEditMode && !lockOrbit && !dragTarget) || presentationMode}
        enableZoom
        autoRotate={presentationMode}
        autoRotateSpeed={0.55}
        maxPolarAngle={Math.PI / 2.05}
        minDistance={3}
        maxDistance={Math.max(widthM, heightM) * 3}
        target={[0, 0, 0]}
      />
    </>
  );
}

export default forwardRef<RoomWebGLCaptureApi, RoomWebGLViewerProps>(function RoomWebGLViewer({
  blueprint,
  selected,
  onSelect,
  onMoveItem,
  onMoveEnd,
  readOnly = false,
  className,
  wallEditMode = false,
  lockOrbit = false,
  previewMode = false,
  renderQuality: renderQualityProp,
  lightingPreset: lightingPresetProp,
  presentationMode: presentationModeProp,
}, ref) {
  const presentationMode = presentationModeProp ?? blueprint.metadata.presentationMode === true;
  const orbitLocked = previewMode || presentationMode ? false : lockOrbit;
  const hideLabels = presentationMode || previewMode;
  const qualitySettings = useMemo(
    () => resolveRenderQuality(
      renderQualityProp ?? blueprint.metadata.renderQuality,
      { preview: previewMode },
    ),
    [renderQualityProp, blueprint.metadata.renderQuality, previewMode],
  );
  const lighting = useMemo(
    () => resolveLightingPreset(
      lightingPresetProp ?? blueprint.metadata.lightingPreset,
      blueprint.roomType,
    ),
    [lightingPresetProp, blueprint.metadata.lightingPreset, blueprint.roomType],
  );
  const captureApiRef = useRef<RoomWebGLCaptureApi | null>(null);

  useImperativeHandle(ref, () => ({
    capturePng: (scale) => captureApiRef.current?.capturePng(scale) ?? null,
  }), []);

  return (
    <div
      className={cn(
        'relative w-full overflow-hidden rounded-[var(--radius-card)] border border-border',
        previewMode ? 'bg-gradient-to-b from-[#1c1917] to-[#0c0a09]' : 'bg-[#1a1410]',
        className,
      )}
    >
      <Canvas
        shadows
        dpr={qualitySettings.dpr}
        gl={{
          antialias: true,
          alpha: false,
          preserveDrawingBuffer: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: qualitySettings.exposure,
        }}
        camera={{ position: [0, 18, 12], fov: qualitySettings.fov, near: 0.1, far: 200 }}
        onPointerMissed={() => onSelect(null)}
        onCreated={({ gl }) => {
          gl.shadowMap.type = qualitySettings.softShadows
            ? THREE.PCFSoftShadowMap
            : THREE.BasicShadowMap;
          gl.outputColorSpace = THREE.SRGBColorSpace;
        }}
      >
        <color attach="background" args={[lighting.background]} />
        <Suspense fallback={null}>
          <SceneContent
            blueprint={blueprint}
            selected={selected}
            onSelect={onSelect}
            onMoveItem={onMoveItem}
            onMoveEnd={onMoveEnd}
            readOnly={readOnly || previewMode}
            wallEditMode={wallEditMode}
            lockOrbit={orbitLocked}
            qualitySettings={qualitySettings}
            lighting={lighting}
            captureApiRef={captureApiRef}
            presentationMode={presentationMode}
            hideLabels={hideLabels || !qualitySettings.showHints}
          />
        </Suspense>
      </Canvas>
      {presentationMode ? (
        <div className="pointer-events-none absolute bottom-2 left-2">
          <div className="rounded-md bg-black/40 px-2 py-1 text-[9px] font-bold text-amber-100/90 backdrop-blur-sm">
            Présentation · orbit automatique
          </div>
        </div>
      ) : qualitySettings.showHints ? (
        <div className="pointer-events-none absolute bottom-2 left-2 right-2 flex items-end justify-between gap-2">
          <div className="rounded-md bg-black/55 px-2 py-1 text-[9px] font-medium text-white/85 backdrop-blur-sm">
            {previewMode
              ? 'Rendu 3D réaliste · molette = zoom · glisser = orbit'
              : orbitLocked
                ? 'Caméra bloquée · posez tables/chaises sur moquette, piste, podium · molette = zoom'
                : 'Orbit libre · activez « Caméra bloquée » pour placer le mobilier sur les surfaces'}
          </div>
          {previewMode ? (
            <div className="rounded-md bg-black/45 px-2 py-1 text-[9px] font-bold text-amber-100/90 backdrop-blur-sm">
              {blueprint.canvas.widthM}×{blueprint.canvas.heightM} m
            </div>
          ) : null}
        </div>
      ) : (
        <div className="pointer-events-none absolute bottom-2 right-2">
          <div className="rounded-md bg-black/40 px-2 py-1 text-[9px] font-bold text-white/80 backdrop-blur-sm">
            Showcase · {renderQualityLabelsSafe(qualitySettings.quality)}
          </div>
        </div>
      )}
    </div>
  );
});

function renderQualityLabelsSafe(q: RenderQuality) {
  if (q === 'draft') return 'Brouillon';
  if (q === 'showcase') return 'Showcase';
  return 'Standard';
}
