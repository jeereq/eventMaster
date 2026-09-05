'use client';

import React, { Suspense, useMemo, useRef, useCallback, useEffect, useState, forwardRef, useImperativeHandle, memo } from 'react';
import { Canvas, ThreeEvent, useThree } from '@react-three/fiber';
import { OrbitControls, Html, ContactShadows, Environment, Sky, Stars } from '@react-three/drei';
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
  type DoorStyle,
  type AisleStyle,
  type ChandelierFixtureStyle,
  type OpeningMaterial,
  type PodiumStyle,
  type InstrumentStyle,
  type BarStyle,
} from '@/lib/roomLayoutUtils';
import { resolveDepthAmount } from '@/lib/roomFloorUtils';
import { isStoryVisible, resolveActiveStoryId, resolveFoundation, resolveStories, stackViewFocusY, worldElevationForStory } from '@/lib/roomBuildingUtils';
import { getRoomTheme } from '@/lib/roomThemeUtils';
import { getTableSeatPlacement3D } from '@/lib/tablePlanUtils';
import {
  getWallTexture,
  getDoorMaterialProps,
  wallTextureForSurface,
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
import { CatalogueInterstoryStairs } from '@/components/CatalogueStairs';
import { CatalogueBalcony } from '@/components/CatalogueBalcony';
import {
  AmphitheaterRiser,
  EventStage,
  EventZoneSurface,
} from '@/components/CatalogueEventArchitecture';
import {
  RoomAmbiance,
  CatalogueDoor,
  CatalogueChandelierFixture,
  CatalogueAisle,
} from '@/components/CatalogueAmbiance';
import { RowSeatsLOD } from '@/components/RowSeatsLOD';
import {
  FloralArchMesh,
  TallCenterpiece,
  CurvedPartitionMesh,
  TentSwagRoof,
  FloorDecalMesh,
  SquarePedestalMesh,
  GreeneryRunnerMesh,
  CandleClusterMesh,
  EdisonStringLightMesh,
  FountainMesh,
  GazeboMesh,
  DjBoothMesh,
  ScreenMesh,
  GabledStageRoof,
} from '@/components/roomCelebrationMeshes';
import { ConcertInstrumentMesh, EventBarMesh } from '@/components/CataloguePodiumBarMeshes';
import { clampRowSeatCount } from '@/lib/roomAmphitheaterGeom';
import RoomWalkthroughCamera from '@/components/RoomWalkthroughCamera';
import RoomShowcasePostProcessing from '@/components/RoomShowcasePostProcessing';
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

function describeRoomScene(blueprint: RoomLayoutBlueprint): string {
  let tables = 0;
  let rows = 0;
  let seats = 0;
  for (const item of blueprint.furniture) {
    if (item.kind === 'table') {
      tables += 1;
      seats += item.capacity;
    } else if (item.kind === 'row') {
      rows += 1;
      seats += item.seatCount;
    } else if (item.kind === 'chair') {
      seats += 1;
    }
  }
  const parts = ['Vue 3D de la salle'];
  if (tables) parts.push(`${tables} table${tables > 1 ? 's' : ''}`);
  if (rows) parts.push(`${rows} rang${rows > 1 ? 's' : ''}`);
  if (seats) parts.push(`${seats} place${seats > 1 ? 's' : ''}`);
  return parts.join(' · ');
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
  /** Visite guidée : entrée par la porte puis tour de la salle. */
  walkthroughActive?: boolean;
  onWalkthroughProgress?: (label: string, progress01: number) => void;
  onWalkthroughComplete?: () => void;
  /** Coupe la boucle de rendu (onglet Identité, panneau masqué). */
  paused?: boolean;
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


function LightingExposure({ exposure }: { exposure: number }) {
  const { gl } = useThree();
  useEffect(() => {
    gl.toneMappingExposure = exposure;
  }, [gl, exposure]);
  return null;
}

/** Midi = ombres dures (Basic) ; crépuscule/nuit = douces si qualité soft. */
function ShadowHardness({ hard, softPreferred }: { hard: boolean; softPreferred: boolean }) {
  const { gl } = useThree();
  const type = hard || !softPreferred ? THREE.BasicShadowMap : THREE.PCFSoftShadowMap;
  useEffect(() => {
    if (gl.shadowMap.type === type) return;
    gl.shadowMap.type = type;
    gl.shadowMap.needsUpdate = true;
  }, [gl, type]);
  return null;
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
  const [sx, sy, sz] = lighting.sunPosition;
  const isNight = lighting.preset === 'night';
  const isDusk = lighting.preset === 'dusk';
  const isDay = lighting.preset === 'day';
  const isDayLike = lighting.showSky && (isDay || isDusk || lighting.preset === 'tent');

  // Réglette LED au sommet du « chevalet » (bord haut / avant de la scène)
  const ledY = Math.max(3.2, extent * 0.22);
  const ledZ = -heightM * 0.48;
  const ledTarget: [number, number, number] = [0, 0.15, -heightM * 0.22];
  const ledSpan = Math.min(widthM * 0.55, 6.5);

  return (
    <>
      {isDayLike ? (
        <Sky
          distance={450000}
          sunPosition={[sx, sy, sz]}
          turbidity={lighting.skyTurbidity}
          rayleigh={lighting.skyRayleigh}
          mieCoefficient={lighting.skyMie}
          mieDirectionalG={isDusk ? 0.95 : 0.72}
        />
      ) : null}

      {lighting.showStars ? (
        <Stars radius={100} depth={60} count={3200} factor={2.6} saturation={0} fade={false} speed={0} />
      ) : null}

      {lighting.showSky && !isNight ? (
        <mesh position={[0, -0.04, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <circleGeometry args={[extent * 2.2, 64]} />
          <meshStandardMaterial color={lighting.hemiGround} roughness={0.96} metalness={0} />
        </mesh>
      ) : null}

      {lighting.showSky && !isNight ? (
        <group position={[sx * 0.88, sy * 0.88, sz * 0.88]}>
          <mesh>
            <sphereGeometry args={[isDusk ? 2.4 : 1.15, 24, 24]} />
            <meshBasicMaterial color={isDusk ? '#ff7a3d' : '#fff4a8'} fog={false} />
          </mesh>
          <mesh scale={isDusk ? 3.2 : 2.2}>
            <sphereGeometry args={[isDusk ? 2.4 : 1.15, 16, 16]} />
            <meshBasicMaterial
              color={isDusk ? '#fb7185' : '#fde68a'}
              transparent
              opacity={isDusk ? 0.28 : 0.14}
              depthWrite={false}
              fog={false}
            />
          </mesh>
        </group>
      ) : null}

      {isNight ? (
        <NightLedStrip
          ledY={ledY}
          ledZ={ledZ}
          ledTarget={ledTarget}
          ledSpan={ledSpan}
          heightM={heightM}
          shadowMapSize={shadowMapSize}
          ambient={lighting.ambient}
          hemiIntensity={lighting.hemiIntensity}
        />
      ) : (
        <>
          <ambientLight intensity={lighting.ambient} color={isDusk ? '#ffc9a8' : '#ffffff'} />
          <directionalLight
            position={[sx, sy, sz]}
            intensity={lighting.keyIntensity}
            castShadow={lighting.keyIntensity > 0.05}
            shadow-mapSize-width={shadowMapSize}
            shadow-mapSize-height={shadowMapSize}
            shadow-bias={isDay ? -0.00008 : -0.00018}
            shadow-normalBias={isDay ? 0.018 : 0.04}
            shadow-camera-far={140}
            shadow-camera-near={0.5}
            shadow-camera-left={-extent * (isDay ? 1.05 : 1.2)}
            shadow-camera-right={extent * (isDay ? 1.05 : 1.2)}
            shadow-camera-top={extent * (isDay ? 1.05 : 1.2)}
            shadow-camera-bottom={-extent * (isDay ? 1.05 : 1.2)}
            color={lighting.keyColor}
          />
          <directionalLight
            position={isDusk ? [-sx * 0.2, 5, -sz * 0.4] : [-sx * 0.5, Math.max(5, sy * 0.25), -sz * 0.5]}
            intensity={lighting.fillIntensity}
            color={lighting.fillColor}
          />
          {lighting.bounceIntensity > 0 ? (
            <directionalLight
              position={[sx * 0.15, 0.8, sz * 0.15]}
              intensity={lighting.bounceIntensity}
              color={lighting.bounceColor}
            />
          ) : null}
          <hemisphereLight args={[lighting.hemiSky, lighting.hemiGround, lighting.hemiIntensity]} />
          {lighting.spotIntensity > 0 ? (
            <spotLight
              position={[0, Math.max(9, extent * 0.55), 0]}
              angle={isDusk ? 0.85 : 0.65}
              penumbra={isDusk ? 0.9 : 0.55}
              intensity={lighting.spotIntensity * lighting.interiorBoost}
              castShadow={false}
              color={lighting.spotColor}
              distance={extent * 2.2}
              decay={1.6}
            />
          ) : null}
          {lighting.warmPoint > 0 ? (
            <>
              <pointLight
                position={[widthM * 0.28, 3.4, heightM * 0.22]}
                intensity={lighting.warmPoint * lighting.interiorBoost}
                color="#ffd89a"
                distance={20}
                decay={2}
              />
              <pointLight
                position={[-widthM * 0.26, 3.4, -heightM * 0.18]}
                intensity={lighting.warmPoint * lighting.interiorBoost * 0.75}
                color="#fde68a"
                distance={18}
                decay={2}
              />
            </>
          ) : null}
          {lighting.coolPoint > 0 ? (
            <pointLight
              position={[-widthM * 0.35, 2.8, heightM * 0.3]}
              intensity={lighting.coolPoint * lighting.interiorBoost}
              color="#e0f2fe"
              distance={16}
              decay={2}
            />
          ) : null}
        </>
      )}
    </>
  );
}

/** Réglette LED au sommet du chevalet — seule source en mode nuit. */
function NightLedStrip({
  ledY,
  ledZ,
  ledTarget,
  ledSpan,
  heightM,
  shadowMapSize,
  ambient,
  hemiIntensity,
}: {
  ledY: number;
  ledZ: number;
  ledTarget: [number, number, number];
  ledSpan: number;
  heightM: number;
  shadowMapSize: number;
  ambient: number;
  hemiIntensity: number;
}) {
  const spotRef = React.useRef<THREE.SpotLight>(null);
  const targetRef = React.useRef<THREE.Object3D>(null);

  useEffect(() => {
    if (spotRef.current && targetRef.current) {
      spotRef.current.target = targetRef.current;
      spotRef.current.target.updateMatrixWorld();
    }
  }, []);

  return (
    <group>
      <ambientLight intensity={ambient} color="#0b1224" />
      <hemisphereLight args={['#020617', '#000000', hemiIntensity]} />

      <group position={[0, ledY, ledZ]}>
        <mesh position={[0, -0.55, 0.08]}>
          <boxGeometry args={[0.08, 1.1, 0.08]} />
          <meshStandardMaterial color="#1c1917" roughness={0.7} metalness={0.2} />
        </mesh>
        <mesh castShadow>
          <boxGeometry args={[ledSpan, 0.06, 0.12]} />
          <meshStandardMaterial color="#111827" roughness={0.45} metalness={0.55} />
        </mesh>
        <mesh position={[0, -0.04, 0.02]}>
          <boxGeometry args={[ledSpan * 0.96, 0.02, 0.04]} />
          <meshStandardMaterial
            color="#f8fafc"
            emissive="#e2e8f0"
            emissiveIntensity={2.4}
            roughness={0.3}
            metalness={0.1}
          />
        </mesh>
      </group>

      <spotLight
        ref={spotRef}
        position={[0, ledY - 0.05, ledZ + 0.05]}
        angle={0.32}
        penumbra={0.22}
        intensity={8.5}
        color="#f1f5f9"
        castShadow
        shadow-mapSize-width={shadowMapSize}
        shadow-mapSize-height={shadowMapSize}
        shadow-bias={-0.0002}
        shadow-normalBias={0.03}
        distance={heightM * 1.4}
        decay={1.75}
      />
      <object3D ref={targetRef} position={ledTarget} />

      {[-0.35, -0.15, 0, 0.15, 0.35].map((t) => (
        <pointLight
          key={t}
          position={[ledSpan * t, ledY - 0.08, ledZ + 0.06]}
          intensity={0.55}
          color="#eef2ff"
          distance={4.5}
          decay={2}
        />
      ))}
    </group>
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
  floorImageFit,
  floorColor,
  outline,
  onPointerMissed,
}: {
  widthM: number;
  heightM: number;
  floorType?: import('@/lib/roomThemeUtils').FloorType;
  floorImageUrl?: string;
  floorImageFit?: 'cover' | 'tile';
  floorColor?: string;
  outline?: RoomLayoutBlueprint['roomOutline'];
  onPointerMissed?: () => void;
}) {
  const mat = useMemo(
    () => resolveFloorMap(floorType, floorImageUrl, widthM, heightM, floorColor, floorImageFit),
    [floorType, floorImageUrl, floorImageFit, floorColor, widthM, heightM],
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
      position={[0, -0.002, 0]}
      receiveShadow
      onClick={(e) => {
        e.stopPropagation();
        onPointerMissed?.();
      }}
    >
      {!shapeGeo && <planeGeometry args={[widthM, heightM]} />}
      <meshPhysicalMaterial
        color={mat.color}
        map={mat.map ?? undefined}
        roughness={mat.roughness}
        metalness={mat.metalness}
        clearcoat={mat.clearcoat}
        clearcoatRoughness={mat.clearcoat > 0 ? 0.2 : 1}
        envMapIntensity={mat.envMapIntensity}
        polygonOffset
        polygonOffsetFactor={1}
        polygonOffsetUnits={1}
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
  baseElevationM = 0,
  roofStyle = 'flat',
}: {
  widthM: number;
  heightM: number;
  wallHeightM: number;
  outline?: RoomLayoutBlueprint['roomOutline'];
  color?: string;
  opacity?: number;
  /** Décalage Y (vue empilée : sommet du dernier étage). */
  baseElevationM?: number;
  roofStyle?: 'flat' | 'tentSwag' | 'gabled' | 'coffered';
}) {
  const y = baseElevationM + wallHeightM + 0.04;
  const shapeGeo = useMemo(() => {
    if (roofStyle === 'tentSwag' || roofStyle === 'gabled') return null;
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
  }, [outline, widthM, heightM, roofStyle]);

  if (roofStyle === 'tentSwag') {
    return (
      <TentSwagRoof
        widthM={widthM}
        heightM={heightM}
        wallHeightM={wallHeightM}
        color={color}
        opacity={Math.max(0.72, opacity)}
        baseElevationM={baseElevationM}
      />
    );
  }

  if (roofStyle === 'gabled') {
    return (
      <group position={[0, y, 0]}>
        <mesh rotation={[0, 0, 0.28]} position={[0, 0.35, 0]} castShadow>
          <boxGeometry args={[widthM * 0.62, 0.08, heightM * 0.92]} />
          <meshStandardMaterial color={color} roughness={0.55} transparent opacity={opacity} />
        </mesh>
        <mesh rotation={[0, 0, -0.28]} position={[0, 0.35, 0]} castShadow>
          <boxGeometry args={[widthM * 0.62, 0.08, heightM * 0.92]} />
          <meshStandardMaterial color={color} roughness={0.55} transparent opacity={opacity} />
        </mesh>
      </group>
    );
  }

  if (roofStyle === 'coffered') {
    const cells = 6;
    return (
      <group position={[0, y, 0]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[widthM, heightM]} />
          <meshStandardMaterial color="#1c1917" roughness={0.7} transparent opacity={Math.max(0.7, opacity)} side={THREE.DoubleSide} />
        </mesh>
        {Array.from({ length: cells + 1 }).map((_, i) => {
          const t = (i / cells - 0.5);
          return (
            <group key={i}>
              <mesh position={[t * widthM, -0.06, 0]}>
                <boxGeometry args={[0.08, 0.12, heightM]} />
                <meshStandardMaterial color="#292524" roughness={0.45} />
              </mesh>
              <mesh position={[0, -0.06, t * heightM]}>
                <boxGeometry args={[widthM, 0.12, 0.08]} />
                <meshStandardMaterial color="#292524" roughness={0.45} />
              </mesh>
            </group>
          );
        })}
      </group>
    );
  }

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

/** Dalles d’étages empilés (vue coupe / bâtiment). */
function StoryStackDecks({
  widthM,
  heightM,
  wallHeightM,
  stories,
  activeStoryId,
  hideLabels,
}: {
  widthM: number;
  heightM: number;
  wallHeightM: number;
  stories: ReturnType<typeof resolveStories>;
  activeStoryId: string;
  hideLabels?: boolean;
}) {
  const slabH = 0.22;
  const colors = ['#e7e5e4', '#d6d3d1', '#c4c0bb', '#b8b2ab', '#a8a29e'];

  return (
    <group>
      {stories.map((story, index) => {
        const active = story.id === activeStoryId;
        const elev = story.elevationM;
        const next = stories[index + 1];
        const storyClear = next ? Math.max(2.4, next.elevationM - elev - slabH) : wallHeightM;
        return (
          <group key={`stack-${story.id}`} position={[0, elev, 0]}>
            {/* Plancher épais */}
            <mesh position={[0, -slabH / 2, 0]} castShadow receiveShadow>
              <boxGeometry args={[widthM * 1.02, slabH, heightM * 1.02]} />
              <meshStandardMaterial
                color={colors[index % colors.length]}
                roughness={0.88}
                metalness={0.04}
              />
            </mesh>
            {/* Surface supérieure (plus claire si étage actif) */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]} receiveShadow>
              <planeGeometry args={[widthM * 0.985, heightM * 0.985]} />
              <meshStandardMaterial
                color={active ? '#fafaf9' : '#f5f5f4'}
                roughness={0.82}
                metalness={0.02}
                transparent={!active}
                opacity={active ? 1 : 0.92}
              />
            </mesh>
            {/* Rebord pour lire la coupe */}
            <mesh position={[0, -slabH / 2, heightM / 2 + 0.02]}>
              <boxGeometry args={[widthM * 1.02, slabH * 0.95, 0.04]} />
              <meshStandardMaterial color={active ? '#4573d2' : '#78716c'} roughness={0.6} metalness={0.15} />
            </mesh>
            {/* Poteaux d’angle entre cet étage et le suivant */}
            {next ? (
              ([[-1, -1], [1, -1], [-1, 1], [1, 1]] as const).map(([sx, sz]) => (
                <mesh
                  key={`col-${sx}-${sz}`}
                  position={[
                    sx * (widthM / 2 - 0.2),
                    storyClear / 2,
                    sz * (heightM / 2 - 0.2),
                  ]}
                  castShadow
                >
                  <boxGeometry args={[0.18, storyClear, 0.18]} />
                  <meshStandardMaterial color="#a8a29e" roughness={0.75} metalness={0.08} />
                </mesh>
              ))
            ) : null}
            {!hideLabels ? (
              <Html
                position={[-widthM / 2 - 0.15, Math.min(1.2, storyClear * 0.35), -heightM / 2]}
                style={{ pointerEvents: 'none', userSelect: 'none' }}
                distanceFactor={14}
              >
                <div
                  style={{
                    padding: '4px 8px',
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                    background: active ? 'rgba(69,115,210,0.92)' : 'rgba(28,25,23,0.78)',
                    color: '#fff',
                    border: active ? '1px solid rgba(255,255,255,0.35)' : '1px solid rgba(255,255,255,0.12)',
                  }}
                >
                  {story.label}
                  <span style={{ opacity: 0.75, fontWeight: 500, marginLeft: 6 }}>
                    {elev.toFixed(1)} m
                  </span>
                </div>
              </Html>
            ) : null}
          </group>
        );
      })}
    </group>
  );
}

/** Découpe le mur en briques autour des ouvertures (trou réel, pas un overlay). */
function wallBricksAroundOpenings(
  length: number,
  wallH: number,
  openings: RoomWallOpening[],
): { x0: number; x1: number; y0: number; y1: number }[] {
  type Hole = { left: number; right: number; bottom: number; top: number };
  const holes: Hole[] = openings.map((op) => {
    const sill = op.sillM ?? (op.kind === 'door' ? 0 : 0.9);
    const h = Math.min(op.heightM, Math.max(0.3, wallH - sill - 0.05));
    const w = Math.min(op.widthM, length * 0.85);
    const cx = (op.t - 0.5) * length;
    return {
      left: Math.max(-length / 2, cx - w / 2),
      right: Math.min(length / 2, cx + w / 2),
      bottom: Math.max(0, sill),
      top: Math.min(wallH, sill + h),
    };
  });

  const xs = new Set<number>([-length / 2, length / 2]);
  for (const hole of holes) {
    xs.add(hole.left);
    xs.add(hole.right);
  }
  const xList = [...xs].sort((a, b) => a - b);
  const bricks: { x0: number; x1: number; y0: number; y1: number }[] = [];

  for (let i = 0; i < xList.length - 1; i++) {
    const x0 = xList[i];
    const x1 = xList[i + 1];
    if (x1 - x0 < 0.015) continue;
    const midX = (x0 + x1) / 2;
    const covering = holes.filter((hole) => hole.left < midX && hole.right > midX);
    const ys = new Set<number>([0, wallH]);
    for (const hole of covering) {
      ys.add(hole.bottom);
      ys.add(hole.top);
    }
    const yList = [...ys].sort((a, b) => a - b);
    for (let j = 0; j < yList.length - 1; j++) {
      const y0 = yList[j];
      const y1 = yList[j + 1];
      if (y1 - y0 < 0.015) continue;
      const midY = (y0 + y1) / 2;
      const inHole = covering.some(
        (hole) => hole.bottom < midY && hole.top > midY && hole.left < midX && hole.right > midX,
      );
      if (!inHole) bricks.push({ x0, x1, y0, y1 });
    }
  }
  return bricks;
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
  const thick = wallThicknessM;
  /** Face extérieure du mur (hors volume) pour que style / couleur soient visibles. */
  const faceZ = thick / 2 + 0.04;
  const frameT = 0.055;
  const doorMat = useMemo(
    () => getDoorMaterialProps(material, leafColor),
    [material, leafColor],
  );
  const woodMap = doorMat.map ?? null;

  const glassProps = {
    color: leafColor,
    transparent: true,
    opacity: 0.42,
    roughness: 0.06,
    metalness: 0.35,
  } as const;

  const leafMatProps = (() => {
    if (material === 'glass' || style === 'glass') {
      return {
        color: doorMat.color,
        transparent: true,
        opacity: doorMat.opacity ?? 0.5,
        roughness: doorMat.roughness,
        metalness: doorMat.metalness,
        map: undefined as THREE.Texture | undefined,
      };
    }
    return {
      color: doorMat.color,
      transparent: doorMat.transparent ?? false,
      opacity: doorMat.opacity ?? 1,
      roughness: doorMat.roughness,
      metalness: doorMat.metalness,
      map: doorMat.map,
    };
  })();

  const arch = style === 'arch' || style === 'arched';
  const leafH = arch ? h * 0.72 : h;
  const archR = w * 0.48;
  const localY = sill + h / 2 - wallHeightM / 2;
  const leafZ = faceZ + 0.01;
  const panelColor = material === 'wood' || material === 'oak' || material === 'walnut' ? leafColor : '#3f2a1a';

  const renderDoorPanels = (leafW: number, leafHeight: number, z: number) => (
    <>
      <mesh position={[0, leafHeight * 0.22, z]}>
        <boxGeometry args={[leafW * 0.78, leafHeight * 0.28, 0.02]} />
        <meshStandardMaterial color={panelColor} map={woodMap ?? undefined} roughness={0.6} />
      </mesh>
      <mesh position={[0, -leafHeight * 0.22, z]}>
        <boxGeometry args={[leafW * 0.78, leafHeight * 0.28, 0.02]} />
        <meshStandardMaterial color={panelColor} map={woodMap ?? undefined} roughness={0.6} />
      </mesh>
    </>
  );

  const renderFrenchPanes = (leafW: number, leafHeight: number, z: number) => (
    <>
      {([-0.22, 0.22] as const).map((tx) =>
        ([-0.2, 0.2] as const).map((ty) => (
          <mesh key={`${tx}-${ty}`} position={[leafW * tx, leafHeight * ty, z]}>
            <boxGeometry args={[leafW * 0.28, leafHeight * 0.28, 0.015]} />
            <meshStandardMaterial {...glassProps} />
          </mesh>
        )),
      )}
    </>
  );

  const jambDepth = thick + 0.06;
  const frameMat = {
    color: frameColor,
    roughness: 0.65,
    metalness: material === 'metal' ? 0.7 : 0.05,
  } as const;

  return (
    <group position={[localX, localY, 0]}>
      {/* Dormant en 4 pièces — ne rebouche pas le trou découpé dans le mur */}
      <mesh position={[-(w / 2 + frameT / 2), 0, 0]} castShadow>
        <boxGeometry args={[frameT, h + frameT * 2, jambDepth]} />
        <meshStandardMaterial {...frameMat} />
      </mesh>
      <mesh position={[w / 2 + frameT / 2, 0, 0]} castShadow>
        <boxGeometry args={[frameT, h + frameT * 2, jambDepth]} />
        <meshStandardMaterial {...frameMat} />
      </mesh>
      <mesh position={[0, h / 2 + frameT / 2, 0]} castShadow>
        <boxGeometry args={[w, frameT, jambDepth]} />
        <meshStandardMaterial {...frameMat} />
      </mesh>
      <mesh position={[0, -(h / 2 + frameT / 2), 0]} castShadow>
        <boxGeometry args={[w, frameT, jambDepth]} />
        <meshStandardMaterial {...frameMat} />
      </mesh>

      {/* Seuil / allège */}
      <mesh position={[0, -h / 2 + 0.03, faceZ * 0.35]} receiveShadow>
        <boxGeometry args={[w + 0.08, 0.06, thick * 0.85]} />
        <meshStandardMaterial color={isDoor ? '#57534e' : frameColor} roughness={0.55} metalness={0.2} />
      </mesh>

      {arch && (
        <mesh position={[0, -h / 2 + leafH + archR * 0.35, leafZ]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[archR, archR, 0.08, 20, 1, false, 0, Math.PI]} />
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

      {isDoor && (style === 'double' || style === 'frenchDoor') && (
        <>
          {([-1, 1] as const).map((side) => (
            <group key={side} position={[side * (w * 0.25 + 0.01), -h / 2 + leafH / 2, leafZ]}>
              <mesh castShadow>
                <boxGeometry args={[w * 0.46, leafH * 0.98, 0.055]} />
                <meshStandardMaterial {...leafMatProps} />
              </mesh>
              {style === 'frenchDoor' && renderFrenchPanes(w * 0.46, leafH, 0.035)}
              {style === 'double' && material === 'glass' && (
                <mesh position={[0, 0.08, 0.035]}>
                  <boxGeometry args={[w * 0.32, leafH * 0.55, 0.02]} />
                  <meshStandardMaterial {...glassProps} />
                </mesh>
              )}
              {(style === 'double') && (material === 'wood' || material === 'oak' || material === 'walnut') && (
                renderDoorPanels(w * 0.46, leafH, 0.035)
              )}
              <mesh position={[side * -w * 0.15, 0, 0.045]}>
                <sphereGeometry args={[0.035, 10, 10]} />
                <meshStandardMaterial color="#c9a227" metalness={0.9} roughness={0.15} />
              </mesh>
            </group>
          ))}
        </>
      )}

      {isDoor && style === 'sliding' && (
        <>
          <mesh position={[-w * 0.12, -h / 2 + leafH / 2, leafZ + 0.02]} castShadow>
            <boxGeometry args={[w * 0.55, leafH * 0.98, 0.045]} />
            <meshStandardMaterial {...leafMatProps} />
          </mesh>
          <mesh position={[w * 0.18, -h / 2 + leafH / 2, leafZ - 0.01]} castShadow>
            <boxGeometry args={[w * 0.55, leafH * 0.98, 0.045]} />
            <meshStandardMaterial
              {...leafMatProps}
              transparent
              opacity={material === 'glass' ? 0.4 : 0.88}
            />
          </mesh>
          <mesh position={[0, h / 2 - 0.04, leafZ]}>
            <boxGeometry args={[w * 0.95, 0.04, 0.06]} />
            <meshStandardMaterial color="#64748b" metalness={0.7} roughness={0.3} />
          </mesh>
        </>
      )}

      {isDoor && style === 'folding' && (
        <>
          {([-1.5, -0.5, 0.5, 1.5] as const).map((slot) => (
            <mesh
              key={slot}
              position={[slot * w * 0.18, -h / 2 + leafH / 2, leafZ + Math.abs(slot) * 0.008]}
              rotation={[0, slot * 0.08, 0]}
              castShadow
            >
              <boxGeometry args={[w * 0.22, leafH * 0.96, 0.04]} />
              <meshStandardMaterial {...leafMatProps} />
            </mesh>
          ))}
        </>
      )}

      {isDoor && style === 'fireExit' && (
        <group position={[0, -h / 2 + leafH / 2, leafZ]}>
          <mesh castShadow>
            <boxGeometry args={[w * 0.92, leafH * 0.98, 0.05]} />
            <meshStandardMaterial {...leafMatProps} />
          </mesh>
          <mesh position={[0, 0, 0.04]}>
            <boxGeometry args={[w * 0.75, 0.06, 0.03]} />
            <meshStandardMaterial color="#c9a227" metalness={0.85} roughness={0.2} />
          </mesh>
          <mesh position={[w * 0.28, 0, 0.05]}>
            <boxGeometry args={[0.08, 0.12, 0.04]} />
            <meshStandardMaterial color="#ef4444" roughness={0.5} />
          </mesh>
        </group>
      )}

      {isDoor && style !== 'double' && style !== 'frenchDoor' && style !== 'sliding' && style !== 'folding' && style !== 'fireExit' && (
        <group position={[0, -h / 2 + leafH / 2, leafZ]} rotation={style === 'pivot' ? [0, 0.35, 0] : [0, 0, 0]}>
          <mesh castShadow>
            <boxGeometry args={[w * 0.92, leafH * 0.98, 0.055]} />
            <meshStandardMaterial {...leafMatProps} />
          </mesh>
          {(material === 'glass' || style === 'glass') && (
            <>
              <mesh position={[0, leafH * 0.15, 0.035]}>
                <boxGeometry args={[w * 0.7, leafH * 0.4, 0.02]} />
                <meshStandardMaterial {...glassProps} />
              </mesh>
              <mesh position={[0, -leafH * 0.22, 0.035]}>
                <boxGeometry args={[w * 0.7, leafH * 0.28, 0.02]} />
                <meshStandardMaterial {...glassProps} />
              </mesh>
            </>
          )}
          {(style === 'panel' || material === 'wood' || material === 'oak' || material === 'walnut') && style !== 'glass' && material !== 'glass' && (
            renderDoorPanels(w * 0.92, leafH, 0.035)
          )}
          {style !== 'pivot' && (
            <mesh position={[w * 0.32, 0, 0.045]}>
              <sphereGeometry args={[0.04, 10, 10]} />
              <meshStandardMaterial color="#c9a227" metalness={0.9} roughness={0.15} />
            </mesh>
          )}
        </group>
      )}

      {isDoor && opening.hasMat !== false && (
        <mesh
          position={[0, -h / 2 - sill + 0.012, faceZ + 0.35]}
          rotation={[-Math.PI / 2, 0, 0]}
          receiveShadow
        >
          <planeGeometry args={[Math.max(0.7, w * 0.85), 0.55]} />
          <meshStandardMaterial color={opening.matColor ?? '#1e3a5f'} roughness={0.95} />
        </mesh>
      )}

      {!isDoor && (
        <group position={[0, 0, style === 'bay' ? faceZ + 0.12 : leafZ]}>
          {style === 'bay' && (
            <mesh position={[0, 0, 0.08]} castShadow>
              <boxGeometry args={[w * 1.05, h * 1.05, 0.22]} />
              <meshStandardMaterial color={frameColor} roughness={0.65} />
            </mesh>
          )}
          <mesh castShadow>
            <boxGeometry args={[w * 0.88, (arch ? leafH : h) * 0.88, 0.035]} />
            <meshPhysicalMaterial
              color={leafColor}
              transparent
              opacity={0.38}
              roughness={0.04}
              metalness={0.12}
              transmission={0.72}
            />
          </mesh>
          {opening.hasCurtains && (
            <>
              {([-1, 1] as const).map((side) => (
                <mesh
                  key={side}
                  position={[side * w * 0.28, 0, leafZ + 0.05]}
                  castShadow
                >
                  <boxGeometry args={[w * 0.34, (arch ? leafH : h) * 0.92, 0.03]} />
                  <meshStandardMaterial
                    color={opening.curtainColor ?? '#7f1d1d'}
                    roughness={0.88}
                  />
                </mesh>
              ))}
            </>
          )}
          {arch && (
            <mesh position={[0, -h / 2 + leafH + archR * 0.3, 0.02]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[archR * 0.92, archR * 0.92, 0.04, 18, 1, false, 0, Math.PI]} />
              <meshStandardMaterial {...glassProps} />
            </mesh>
          )}
          {(style === 'rectangular' || style === 'french' || style === 'arched') && (
            <>
              <mesh position={[0, 0, 0.025]}>
                <boxGeometry args={[0.035, (arch ? leafH : h) * 0.82, 0.025]} />
                <meshStandardMaterial color={frameColor} />
              </mesh>
              <mesh position={[0, arch ? -h * 0.08 : 0, 0.025]}>
                <boxGeometry args={[w * 0.82, 0.035, 0.025]} />
                <meshStandardMaterial color={frameColor} />
              </mesh>
              {style === 'french' && (
                <>
                  <mesh position={[-w * 0.22, 0, 0.025]}>
                    <boxGeometry args={[0.028, h * 0.82, 0.025]} />
                    <meshStandardMaterial color={frameColor} />
                  </mesh>
                  <mesh position={[w * 0.22, 0, 0.025]}>
                    <boxGeometry args={[0.028, h * 0.82, 0.025]} />
                    <meshStandardMaterial color={frameColor} />
                  </mesh>
                  <mesh position={[0, h * 0.2, 0.025]}>
                    <boxGeometry args={[w * 0.82, 0.028, 0.025]} />
                    <meshStandardMaterial color={frameColor} />
                  </mesh>
                  <mesh position={[0, -h * 0.2, 0.025]}>
                    <boxGeometry args={[w * 0.82, 0.028, 0.025]} />
                    <meshStandardMaterial color={frameColor} />
                  </mesh>
                </>
              )}
            </>
          )}
          {style === 'bay' && (
            <>
              <mesh position={[-w * 0.3, 0, 0.03]}>
                <boxGeometry args={[0.035, h * 0.85, 0.025]} />
                <meshStandardMaterial color={frameColor} />
              </mesh>
              <mesh position={[w * 0.3, 0, 0.03]}>
                <boxGeometry args={[0.035, h * 0.85, 0.025]} />
                <meshStandardMaterial color={frameColor} />
              </mesh>
            </>
          )}
          <mesh position={[0, -h / 2 - 0.02, 0.06]} receiveShadow>
            <boxGeometry args={[w + 0.12, 0.05, 0.16]} />
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
  const openings = wall.openings ?? [];

  const mat = useMemo(
    () => wallTextureForSurface(wall.texture, length, wallH, wall.color ?? paintColor),
    [wall.texture, wall.color, paintColor, length, wallH],
  );

  const bricks = useMemo(
    () => wallBricksAroundOpenings(length, wallH, openings),
    [length, wallH, openings],
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
      {bricks.map((brick, idx) => {
        const bw = brick.x1 - brick.x0;
        const bh = brick.y1 - brick.y0;
        const cx = (brick.x0 + brick.x1) / 2;
        const cy = (brick.y0 + brick.y1) / 2 - wallH / 2;
        return (
          <mesh key={`brick-${idx}`} position={[cx, cy, 0]} castShadow receiveShadow>
            <boxGeometry args={[bw, bh, thick]} />
            <meshStandardMaterial
              color={selected ? '#c7d2fe' : mat.color}
              map={mat.map}
              bumpMap={mat.bumpMap}
              bumpScale={mat.bumpScale}
              roughness={mat.roughness}
              metalness={mat.metalness}
              emissive={selected ? '#312e81' : '#000000'}
              emissiveIntensity={selected ? 0.2 : 0}
              envMapIntensity={0.45}
              polygonOffset
              polygonOffsetFactor={1}
              polygonOffsetUnits={1}
            />
          </mesh>
        );
      })}
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
      {openings.map((op) => (
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

function PlaceSetting({
  style = 'classic',
  position,
  rotationY,
}: {
  style?: 'classic' | 'gold' | 'festive';
  position: [number, number, number];
  rotationY: number;
}) {
  const plate = style === 'gold' ? '#f3e6c4' : style === 'festive' ? '#f8e7ee' : '#f8fafc';
  const rim = style === 'gold' ? '#c4a35a' : style === 'festive' ? '#be185d' : '#e2e8f0';
  const metal = style === 'gold' ? '#d4af37' : '#cbd5e1';
  const glass = style === 'festive' ? '#fda4af' : '#f1f5f9';

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh>
        <cylinderGeometry args={[0.068, 0.074, 0.012, 22]} />
        <meshStandardMaterial color={plate} metalness={style === 'gold' ? 0.45 : 0.22} roughness={style === 'gold' ? 0.18 : 0.28} />
      </mesh>
      <mesh position={[0, 0.008, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 0.004, 20]} />
        <meshStandardMaterial color={rim} metalness={style === 'gold' ? 0.7 : 0.15} roughness={0.28} />
      </mesh>
      <mesh position={[0.09, 0.012, 0.01]} rotation={[0, 0, 0.18]}>
        <boxGeometry args={[0.12, 0.004, 0.011]} />
        <meshStandardMaterial color={metal} metalness={0.88} roughness={0.14} />
      </mesh>
      <mesh position={[-0.09, 0.012, -0.01]} rotation={[0, 0, -0.16]}>
        <boxGeometry args={[0.11, 0.004, 0.013]} />
        <meshStandardMaterial color={metal} metalness={0.82} roughness={0.18} />
      </mesh>
      <mesh position={[0.015, 0.024, 0.08]}>
        <cylinderGeometry args={[0.018, 0.014, 0.042, 12]} />
        <meshPhysicalMaterial color={glass} transparent opacity={0.5} roughness={0.04} metalness={0.2} transmission={0.55} />
      </mesh>
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
  tableSurface,
  hasCouverts = false,
  hasCenterpiece = false,
  centerpieceStyle = 'floral',
  couvertStyle = 'classic',
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
  tableSurface?: import('@/lib/roomLayoutUtils').TableSurfaceStyle;
  hasCouverts?: boolean;
  hasCenterpiece?: boolean;
  centerpieceStyle?: 'floral' | 'greeneryRunner' | 'candleCluster';
  couvertStyle?: 'classic' | 'gold' | 'festive';
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
    () => resolveTableMaterial(shape, color, tableImageUrl, tableSurface),
    [shape, color, tableImageUrl, tableSurface],
  );

  const size =
    shape === 'rectangular' ? (capacity >= 14 ? [4.4, 0.95] : capacity >= 10 ? [3.2, 0.92] : [1.8, 0.9]) :
    shape === 'oval' ? [1.7, 1.0] :
    shape === 'square' ? [1.2, 1.2] :
    shape === 'cocktail' ? [0.7, 0.7] :
    shape === 'highTop' ? [0.75, 0.75] :
    shape === 'arc' ? [3.6, 1.8] :
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
      {hasCouverts && Array.from({ length: Math.min(capacity, 10) }).map((_, i) => {
        const a = (i / Math.max(capacity, 1)) * Math.PI * 2;
        const r = Math.max(size[0], size[1]) * 0.28;
        return (
          <PlaceSetting
            key={`c-${i}`}
            style={couvertStyle}
            position={[Math.cos(a) * r, topY + 0.055, Math.sin(a) * r]}
            rotationY={-a}
          />
        );
      })}
      {hasCenterpiece && shape !== 'cocktail' && shape !== 'highTop' ? (
        <group position={[0, topY, 0]}>
          {centerpieceStyle === 'greeneryRunner' ? (
            <GreeneryRunnerMesh length={Math.max(size[0], size[1]) * 0.72} selected={selected} />
          ) : centerpieceStyle === 'candleCluster' ? (
            <CandleClusterMesh selected={selected} />
          ) : (
            <TallCenterpiece selected={selected} />
          )}
        </group>
      ) : null}
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
          <div className="px-2 py-1 rounded-md bg-primary-solid text-primary-foreground text-xs font-bold whitespace-nowrap shadow-sm">
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
          <span className="text-xs font-bold text-background bg-foreground/85 px-1.5 py-0.5 rounded shadow-sm">{label}</span>
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
          <span className="text-xs font-bold bg-primary-solid text-primary-foreground px-1.5 py-0.5 rounded">{label || 'Chaise'}</span>
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
  stairStyle,
  balconySide,
  columnShape,
  doorStyle,
  doorSwing,
  hasMat,
  matColor,
  openingMaterial,
  frameColor,
  aisleStyle,
  hasGoldBorder,
  hasSideLanterns,
  hasPetals,
  chandelierStyle,
  lightWarmth,
  lightIntensity,
  lightRadius,
  stageShape,
  decalKind,
  pedestalStyle,
  stageRoof,
  podiumStyle,
  instrumentStyle,
  barStyle,
  surfaceElevationM = 0,
  widthM,
  roomDepthM,
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
  kind: string;
  label?: string;
  imageUrl?: string;
  color?: string;
  material?: ZoneMaterial;
  podiumHeightM?: number;
  steps?: number;
  hasCouverts?: boolean;
  stairDirection?: 0 | 90 | 180 | 270;
  stairStyle?: 'straight' | 'open' | 'compact';
  balconySide?: 'north' | 'south' | 'east' | 'west';
  columnShape?: 'round' | 'square' | 'fluted';
  doorStyle?: DoorStyle;
  doorSwing?: 'left' | 'right' | 'double' | 'sliding' | 'arch';
  hasMat?: boolean;
  matColor?: string;
  openingMaterial?: OpeningMaterial;
  frameColor?: string;
  aisleStyle?: AisleStyle;
  hasGoldBorder?: boolean;
  hasSideLanterns?: boolean;
  hasPetals?: boolean;
  chandelierStyle?: ChandelierFixtureStyle;
  lightWarmth?: 'warm' | 'candle' | 'neutral' | 'gold' | 'rose' | 'night' | 'golden' | 'cool';
  lightIntensity?: number;
  lightRadius?: number;
  stageShape?: 'rect' | 'semiCircle';
  decalKind?: 'rose' | 'butterfly' | 'custom' | 'path';
  pedestalStyle?: 'squareWhite' | 'columnGold';
  stageRoof?: 'none' | 'gabled';
  podiumStyle?: PodiumStyle;
  instrumentStyle?: InstrumentStyle;
  barStyle?: BarStyle;
  surfaceElevationM?: number;
  widthM: number;
  roomDepthM: number;
  selected: boolean;
  onSelect: (mods?: { shiftKey?: boolean; metaKey?: boolean; ctrlKey?: boolean }) => void;
  onDragStart?: () => void;
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
    kind === 'balcony' ? 0.12 :
    kind === 'column' || kind === 'pillar' ? 2.6 :
    kind === 'flower' ? 0.7 :
    kind === 'arch' ? 2.2 :
    kind === 'partition' ? 0.92 :
    kind === 'pedestal' ? Math.max(0.7, podiumHeightM ?? 1.15) :
    kind === 'stringLight' ? Math.max(2.4, podiumHeightM ?? 3.4) :
    kind === 'fountain' ? 1.2 :
    kind === 'gazebo' ? Math.max(2.4, podiumHeightM ?? 3.2) :
    kind === 'djBooth' ? 1.1 :
    kind === 'screen' ? Math.max(1.4, podiumHeightM ?? 2.4) :
    kind === 'instrument' ? Math.max(0.7, podiumHeightM ?? 0.95) :
    kind === 'bar' ? Math.max(0.95, podiumHeightM ?? 1.15) :
    kind === 'decal' ? 0.02 :
    kind === 'carpet' ? 0.06 :
    kind === 'buffet' ? 0.9 :
    0.35;
  const stairSteps = Math.max(3, Math.min(24, steps ?? (kind === 'stairs' ? 6 : 1)));


  const map = useMemo(() => {
    if (imageUrl) return resolveChairMap(imageUrl);
    if (kind === 'carpet') return resolveZoneMaterialMap(material ?? 'carpet').map;
    if (kind === 'buffet' || kind === 'bar') return resolveZoneMaterialMap(material ?? 'wood').map;
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
      : kind === 'balcony'
        ? '#d6d3d1'
      : kind === 'buffet'
        ? '#8b6914'
      : kind === 'bar'
        ? '#4a3728'
      : kind === 'instrument'
        ? '#171717'
        : kind === 'flower' || kind === 'arch' || kind === 'pedestal'
          ? '#f4e8e4'
        : kind === 'partition' || kind === 'decal'
          ? '#c4a4a4'
          : kind === 'entrance'
            ? '#059669'
            : kind === 'aisle'
              ? '#e7e5e4'
              : kind === 'corridor'
                ? '#d6d3d1'
              : '#78716c');

  const { gl } = useThree();

  return (
    <group
      position={[cx, surfaceElevationM, cz]}
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
      {kind === 'column' || kind === 'pillar' ? (
        <CatalogueColumn
          w={w}
          d={d}
          height={height}
          map={map}
          selected={selected}
          pickable={pickable}
          square={columnShape === 'square'}
          fluted={columnShape === 'fluted'}
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
      ) : kind === 'arch' ? (
        <FloralArchMesh w={w} d={d} color={baseColor} selected={selected} />
      ) : kind === 'partition' ? (
        <CurvedPartitionMesh w={w} d={d} color={baseColor} selected={selected} />
      ) : kind === 'decal' ? (
        <FloorDecalMesh w={w} d={d} kind={decalKind ?? 'rose'} color={baseColor} map={map} selected={selected} />
      ) : kind === 'pedestal' ? (
        <SquarePedestalMesh
          color={color ?? '#f8fafc'}
          flowerColor={baseColor}
          heightM={height}
          gold={pedestalStyle === 'columnGold'}
          selected={selected}
        />
      ) : kind === 'stringLight' ? (
        <EdisonStringLightMesh w={w} d={d} heightM={height} selected={selected} />
      ) : kind === 'fountain' ? (
        <FountainMesh color={baseColor} selected={selected} />
      ) : kind === 'gazebo' ? (
        <GazeboMesh w={w} d={d} heightM={height} selected={selected} />
      ) : kind === 'instrument' ? (
        <ConcertInstrumentMesh style={instrumentStyle ?? 'piano'} selected={selected} />
      ) : kind === 'bar' ? (
        <EventBarMesh
          w={w}
          d={d}
          height={height}
          style={barStyle ?? 'cocktail'}
          color={color ?? baseColor}
          selected={selected}
        />
      ) : kind === 'djBooth' ? (
        <DjBoothMesh w={w} d={d} color={color ?? '#1c1917'} selected={selected} />
      ) : kind === 'screen' ? (
        <ScreenMesh w={w} heightM={height} selected={selected} />
      ) : kind === 'podium' || kind === 'stage' ? (
        <group>
          <EventStage
            w={w}
            d={d}
            height={height}
            steps={stepCount}
            map={map}
            baseColor={baseColor}
            selected={selected}
            kind={kind === 'podium' ? 'podium' : 'stage'}
            shape={stageShape ?? 'rect'}
            podiumStyle={podiumStyle}
          />
          {stageRoof === 'gabled' ? (
            <GabledStageRoof w={w} d={d} heightM={Math.max(2.2, height + 2)} selected={selected} />
          ) : null}
        </group>
      ) : kind === 'stairs' ? (
        <group rotation={[0, ((stairDirection ?? 0) * Math.PI) / 180, 0]}>
          <CatalogueInterstoryStairs
            widthM={Math.max(0.9, w)}
            runM={Math.max(1.8, d)}
            riseM={Math.max(0.8, height)}
            steps={Math.max(4, Math.min(24, stairSteps))}
            selected={selected}
            style={stairStyle ?? 'straight'}
          />
        </group>
      ) : kind === 'balcony' ? (
        <CatalogueBalcony
          w={Math.max(0.8, w)}
          d={Math.max(0.6, d)}
          selected={selected}
          side={balconySide ?? 'south'}
          color={baseColor}
        />
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
      ) : kind === 'door' ? (
        <CatalogueDoor
          w={w}
          d={d}
          height={2.3}
          style={doorStyle ?? 'frenchDoor'}
          doorSwing={doorSwing ?? 'double'}
          hasMat={hasMat ?? true}
          matColor={matColor}
          color={baseColor}
          openingMaterial={openingMaterial}
          frameColor={frameColor}
          selected={selected}
        />
      ) : kind === 'chandelier' ? (
        <CatalogueChandelierFixture
          style={chandelierStyle ?? 'crystalCascade'}
          lightWarmth={lightWarmth ?? 'warm'}
          lightIntensity={lightIntensity ?? 1.5}
          lightRadius={lightRadius ?? 8}
          selected={selected}
        />
      ) : kind === 'aisle' ? (
        <CatalogueAisle
          w={w}
          d={d}
          style={aisleStyle ?? 'royalRed'}
          hasGoldBorder={hasGoldBorder ?? true}
          hasSideLanterns={hasSideLanterns ?? false}
          hasPetals={hasPetals ?? false}
          selected={selected}
        />
      ) : kind === 'corridor' ? (
        <group>
          <mesh position={[0, 0.02, 0]} receiveShadow>
            <boxGeometry args={[w, 0.04, d]} />
            <meshStandardMaterial
              color={selected ? '#c7d2fe' : '#d6d3d1'}
              roughness={0.85}
            />
          </mesh>
          <mesh position={[0, 0.045, 0]} receiveShadow>
            <boxGeometry args={[w * 0.72, 0.015, d * 0.98]} />
            <meshStandardMaterial color="#fafaf9" roughness={0.7} />
          </mesh>
          <mesh position={[-w * 0.48, 1.1, 0]} castShadow>
            <boxGeometry args={[0.08, 2.2, d * 0.98]} />
            <meshStandardMaterial color="#a8a29e" roughness={0.9} />
          </mesh>
          <mesh position={[w * 0.48, 1.1, 0]} castShadow>
            <boxGeometry args={[0.08, 2.2, d * 0.98]} />
            <meshStandardMaterial color="#a8a29e" roughness={0.9} />
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
          <span className="text-xs font-bold bg-foreground/85 text-background px-1.5 py-0.5 rounded">
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
  walkthroughActive = false,
  onWalkthroughProgress,
  onWalkthroughComplete,
  orbitControlsRef,
}: Omit<RoomWebGLViewerProps, 'className' | 'previewMode' | 'renderQuality' | 'lightingPreset' | 'presentationMode'> & {
  qualitySettings: ReturnType<typeof resolveRenderQuality>;
  lighting: ReturnType<typeof resolveLightingPreset>;
  captureApiRef?: React.MutableRefObject<RoomWebGLCaptureApi | null>;
  presentationMode?: boolean;
  hideLabels?: boolean;
  orbitControlsRef?: React.Ref<unknown>;
}) {
  const widthM = blueprint.canvas.widthM;
  const heightM = blueprint.canvas.heightM;
  const depthAmount = resolveDepthAmount(blueprint.metadata);
  const theme = getRoomTheme(blueprint.metadata.roomThemeId, blueprint);
  const floorType = blueprint.metadata.floorType ?? theme.defaultFloorType;
  const walls = resolveBlueprintWalls(blueprint);
  const wallHeightM = walls[0]?.heightM ?? 3;
  const stackView = blueprint.metadata.stackView === true;
  const stories = resolveStories(blueprint);
  const focusY = stackViewFocusY(blueprint, wallHeightM);
  const topStoryElev = stories.reduce((max, s) => Math.max(max, s.elevationM), 0);

  const { camera } = useThree();
  useEffect(() => {
    if (walkthroughActive) return;
    const tilt = (depthAmount / 100) * 55;
    const buildingH = stackView ? topStoryElev + wallHeightM : wallHeightM;
    const dist = Math.max(widthM, heightM, buildingH * 1.2) * (1.15 + (100 - depthAmount) * 0.008);
    const elev = Math.cos((tilt * Math.PI) / 180) * dist + (stackView ? focusY * 0.35 : 0);
    const back = Math.sin((tilt * Math.PI) / 180) * dist;
    camera.position.set(
      stackView ? dist * 0.35 : 0,
      Math.max(elev, stackView ? focusY + 4 : 4),
      back + heightM * (stackView ? 0.35 : 0.15),
    );
    camera.lookAt(0, focusY, 0);
    if ('fov' in camera) {
      (camera as THREE.PerspectiveCamera).fov = qualitySettings.fov;
    }
    camera.updateProjectionMatrix();
  }, [camera, depthAmount, widthM, heightM, qualitySettings.fov, walkthroughActive, stackView, focusY, topStoryElev, wallHeightM]);

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
      <LightingExposure exposure={lighting.exposure * (qualitySettings.exposure / 1.16)} />
      <ShadowHardness hard={lighting.preset === 'day'} softPreferred={qualitySettings.softShadows} />

      {qualitySettings.fog ? (
        <fog
          attach="fog"
          args={[
            lighting.fogColor,
            Math.max(10, Math.max(widthM, heightM) * (lighting.preset === 'night' ? 0.7 : 1.0)),
            Math.max(32, Math.max(widthM, heightM) * (lighting.preset === 'dusk' ? 2.2 : lighting.preset === 'night' ? 2.0 : 3.0)),
          ]}
        />
      ) : null}

      {qualitySettings.environment ? (
        <Environment
          preset={lighting.environmentPreset}
          environmentIntensity={lighting.environmentIntensity * (qualitySettings.environmentIntensity / 0.28)}
        />
      ) : null}

      {walkthroughActive ? (
        <RoomWalkthroughCamera
          blueprint={blueprint}
          active={walkthroughActive}
          onProgress={onWalkthroughProgress}
          onComplete={onWalkthroughComplete}
        />
      ) : null}

      {qualitySettings.contactShadows ? (
        <ContactShadows
          position={[0, 0.028, 0]}
          opacity={
            qualitySettings.contactShadowsOpacity
            * (lighting.preset === 'night' ? 0.45 : lighting.preset === 'dusk' ? 0.75 : 0.85)
            * (blueprint.metadata.floorImageFit === 'cover' || blueprint.metadata.floorImageUrl ? 0.55 : 1)
          }
          scale={Math.max(widthM, heightM) * 1.35}
          blur={qualitySettings.contactShadowsBlur * (lighting.preset === 'dusk' ? 1.15 : 1)}
          far={8}
          resolution={Math.min(qualitySettings.contactShadowsResolution, 1024)}
          color={lighting.preset === 'night' ? '#020617' : lighting.preset === 'dusk' ? '#431407' : '#1c1917'}
          frames={1}
        />
      ) : null}

      {stackView ? (
        <StoryStackDecks
          widthM={widthM}
          heightM={heightM}
          wallHeightM={wallHeightM}
          stories={stories}
          activeStoryId={resolveActiveStoryId(blueprint)}
          hideLabels={hideLabels}
        />
      ) : (
        <FloorPlane
          widthM={widthM}
          heightM={heightM}
          floorType={floorType}
          floorImageUrl={blueprint.metadata.floorImageUrl}
          floorImageFit={blueprint.metadata.floorImageFit}
          floorColor={blueprint.metadata.floorColor}
          outline={blueprint.roomOutline}
          onPointerMissed={() => onSelect(null)}
        />
      )}

      {/* Texture de sol sur l’étage RDC en vue empilée */}
      {stackView ? (
        <group position={[0, (stories[0]?.elevationM ?? 0) + 0.01, 0]}>
          <FloorPlane
            widthM={widthM * 0.98}
            heightM={heightM * 0.98}
            floorType={floorType}
            floorImageUrl={blueprint.metadata.floorImageUrl}
            floorImageFit={blueprint.metadata.floorImageFit}
            floorColor={blueprint.metadata.floorColor}
            outline={blueprint.roomOutline}
            onPointerMissed={() => onSelect(null)}
          />
        </group>
      ) : null}

      {(() => {
        const foundation = resolveFoundation(blueprint);
        if (foundation.kind === 'none' || foundation.heightM <= 0) return null;
        const h = foundation.heightM;
        return (
          <mesh position={[0, -h / 2 - 0.01, 0]} receiveShadow castShadow>
            <boxGeometry args={[widthM * 1.04, h, heightM * 1.04]} />
            <meshStandardMaterial
              color={foundation.color ?? '#78716c'}
              roughness={0.92}
              metalness={0.05}
            />
          </mesh>
        );
      })()}

      {blueprint.metadata.showRoof === true && (
        <RoofMesh
          widthM={widthM}
          heightM={heightM}
          wallHeightM={wallHeightM}
          outline={blueprint.roomOutline}
          color={blueprint.metadata.roofColor ?? '#d6d3d1'}
          opacity={blueprint.metadata.roofOpacity ?? 0.45}
          roofStyle={blueprint.metadata.roofStyle ?? 'flat'}
          baseElevationM={stackView ? topStoryElev : 0}
        />
      )}

      <group position={[0, stackView ? topStoryElev : 0, 0]}>
        <RoomAmbiance
          widthM={widthM}
          heightM={heightM}
          wallHeightM={wallHeightM}
          flags={{
            chandeliers: blueprint.metadata.showChandeliers === true,
            uplights: blueprint.metadata.showUplights === true,
            curtains: blueprint.metadata.showCurtains === true,
            plants: blueprint.metadata.showDecorPlants === true,
          }}
          curtainColor={blueprint.metadata.curtainColor}
          maxChandeliers={qualitySettings.maxChandeliers}
          maxUplights={qualitySettings.maxUplights}
          chandelierPointLights={qualitySettings.chandelierPointLights}
          chandelierType={blueprint.metadata.chandelierType}
          chandelierCount={blueprint.metadata.chandelierCount}
        />
      </group>

      {!presentationMode && !hideLabels && !stackView ? (
        <gridHelper
          args={[Math.max(widthM, heightM), 24, '#64748b', '#334155']}
          position={[0, 0.015, 0]}
        />
      ) : null}

      {walls.filter((wall) => isStoryVisible(blueprint, wall.storyId)).map((wall) => (
        <group key={wall.id} position={[0, worldElevationForStory(blueprint, wall.storyId), 0]}>
          <WallMesh
            wall={wall}
            widthM={widthM}
            heightM={heightM}
            paintColor={blueprint.metadata.wallPaintColor}
            selected={selected.some((s) => s.kind === 'wall' && s.id === wall.id)}
            onSelect={(e) => onSelect({ kind: 'wall', id: wall.id }, { additive: Boolean(e?.shiftKey || e?.metaKey || e?.ctrlKey) })}
          />
        </group>
      ))}

      {blueprint.fixtures.filter((f) => isStoryVisible(blueprint, f.storyId)).map((f) => {
        /** Surfaces plates : ne capturent pas les clics en mode caméra bloquée. */
        const isSurfaceFixture = f.kind === 'carpet' || f.kind === 'aisle' || f.kind === 'corridor' || f.kind === 'perimeter' || f.kind === 'decal';
        const fixturePickable = isSurfaceFixture
          ? surfacePickable || selected.some((s) => s.kind === 'fixture' && s.id === f.id)
          : true;
        const canDragFixture = !readOnly && !wallEditMode && (!isSurfaceFixture || surfacePickable);
        const sitsOnRaisedSurface = f.kind === 'instrument' || f.kind === 'bar';
        const raisedSurface = sitsOnRaisedSurface
          ? resolveFurnitureSurfaceAt(blueprint, f.x + f.w / 2, f.y + f.h / 2)
          : null;
        return (
          <group key={f.id} position={[0, worldElevationForStory(blueprint, f.storyId), 0]}>
          <FixtureMesh
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
            stairStyle={f.stairStyle}
            balconySide={f.balconySide}
            columnShape={f.columnShape}
            doorStyle={f.doorStyle}
            doorSwing={f.doorSwing}
            hasMat={f.hasMat}
            matColor={f.matColor}
            openingMaterial={f.openingMaterial}
            frameColor={f.frameColor}
            aisleStyle={f.aisleStyle}
            hasGoldBorder={f.hasGoldBorder}
            hasSideLanterns={f.hasSideLanterns}
            hasPetals={f.hasPetals}
            chandelierStyle={f.chandelierStyle}
            lightWarmth={f.lightWarmth}
            lightIntensity={f.lightIntensity}
            lightRadius={f.lightRadius}
            stageShape={f.stageShape}
            decalKind={f.decalKind}
            pedestalStyle={f.pedestalStyle}
            stageRoof={f.stageRoof}
            podiumStyle={f.podiumStyle}
            instrumentStyle={f.instrumentStyle}
            barStyle={f.barStyle}
            surfaceElevationM={raisedSurface?.elevationM ?? 0}
            widthM={widthM}
            roomDepthM={heightM}
            selected={selected.some((s) => s.kind === 'fixture' && s.id === f.id)}
            onSelect={(e) => onSelect({ kind: 'fixture', id: f.id }, { additive: Boolean(e?.shiftKey || e?.metaKey || e?.ctrlKey) })}
            onDragStart={canDragFixture ? () => setDragTarget({ kind: 'fixture', id: f.id }) : undefined}
            readOnly={readOnly || wallEditMode}
            pickable={fixturePickable}
            hideLabels={hideLabels}
          />
          </group>
        );
      })}

      {blueprint.furniture.filter((item) => isStoryVisible(blueprint, item.storyId)).map((item) => {
        const storyElev = worldElevationForStory(blueprint, item.storyId);
        if (item.kind === 'zone') {
          return (
            <group key={item.id} position={[0, storyElev, 0]}>
            <ZoneMesh
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
            </group>
          );
        }
        if (item.kind === 'chair') {
          const surface = resolveFurnitureSurfaceAt(blueprint, item.x, item.y);
          return (
            <group key={item.id} position={[0, storyElev, 0]}>
            <FreeChairMesh
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
            </group>
          );
        }
        if (item.kind === 'row') {
          const [wx, wz] = pctToWorld(item.x, item.y, widthM, heightM);
          const count = clampRowSeatCount(item.seatCount);
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
              position={[wx, storyElev, wz]}
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
                  aisleSplit={item.aisleSplit === true}
                  aisleWidthPct={item.aisleWidthPct}
                  selected={selected.some((s) => s.kind === 'row' && s.id === item.id)}
                />
              ) : null}
              {(() => {
                const dx = fx - wx;
                const dz = fz - wz;
                const focusLocal = {
                  x: Math.cos(rowRot) * dx + Math.sin(rowRot) * dz,
                  z: -Math.sin(rowRot) * dx + Math.cos(rowRot) * dz,
                };
                return (
                  <RowSeatsLOD
                    count={count}
                    spacing={spacing}
                    curve={curve}
                    elevation={elevation}
                    focusLocal={focusLocal}
                    chairType={item.chairType}
                    chairStyle={item.chairStyle}
                    seatMaterial={item.seatMaterial}
                    chairImageUrl={item.chairImageUrl}
                    selected={selected.some((s) => s.kind === 'row' && s.id === item.id)}
                    lod={qualitySettings.rowChairLod}
                    castShadow={qualitySettings.rowChairShadows}
                    aisleSplit={item.aisleSplit === true}
                    aisleWidthPct={item.aisleWidthPct}
                    showSeatNumbers={item.showSeatNumbers !== false}
                    rowName={item.rowName || item.label}
                  />
                );
              })()}
              {!hideLabels && (
                <Html center distanceFactor={10} style={{ pointerEvents: 'none' }} position={[0, elevation + 1.1, 0]}>
                  <span className="text-xs font-bold bg-foreground/85 text-background px-1.5 py-0.5 rounded shadow-sm">{item.label}</span>
                </Html>
              )}
            </group>
          );
        }

        const tableColor = resolveTableColor(item.tableColor, blueprint.metadata.defaultTableColor) ?? '#f8fafc';
        const surface = resolveFurnitureSurfaceAt(blueprint, item.x, item.y);
        return (
          <group key={item.id} position={[0, storyElev, 0]}>
          <TableMesh
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
            tableSurface={item.tableSurface ?? blueprint.metadata.defaultTableSurface}
            hasCouverts={item.hasCouverts}
            hasCenterpiece={item.hasCenterpiece}
            centerpieceStyle={item.centerpieceStyle}
            couvertStyle={item.couvertStyle}
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
          </group>
        );
      })}

      <DragPlane
        active={Boolean(dragTarget) && !wallEditMode}
        widthM={widthM}
        heightM={heightM}
        onDrag={(x, y) => {
          if (!dragTarget) return;
          if (dragTarget.kind === 'fixture') {
            const f = blueprint.fixtures.find((fx) => fx.id === dragTarget.id);
            if (!f) return;
            // DragPlane donne le centre ; les fixtures stockent le coin haut-gauche.
            moveAny('fixture', f.id, x - f.w / 2, y - f.h / 2);
            return;
          }
          moveAny(dragTarget.kind, dragTarget.id, x, y);
        }}
        onEnd={() => {
          setDragTarget(null);
          onMoveEnd?.();
        }}
      />

      <OrbitControls
        ref={orbitControlsRef as never}
        key={stackView ? `stack-${stories.length}-${focusY.toFixed(1)}` : 'floor'}
        enablePan={!wallEditMode && !lockOrbit && !dragTarget && !presentationMode && !walkthroughActive}
        enableRotate={(!wallEditMode && !lockOrbit && !dragTarget && !walkthroughActive) || (presentationMode && !walkthroughActive)}
        enableZoom={!walkthroughActive}
        autoRotate={presentationMode && !walkthroughActive}
        autoRotateSpeed={0.55}
        maxPolarAngle={Math.PI / 2.05}
        minDistance={3}
        maxDistance={Math.max(widthM, heightM, stackView ? topStoryElev + wallHeightM : 0) * (stackView ? 4.5 : 3)}
        target={[0, focusY, 0]}
      />

      {qualitySettings.quality === 'showcase' ? (
        <RoomShowcasePostProcessing lighting={lighting} />
      ) : null}
    </>
  );
}

const RoomWebGLViewer = forwardRef<RoomWebGLCaptureApi, RoomWebGLViewerProps>(function RoomWebGLViewer({
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
  walkthroughActive = false,
  onWalkthroughProgress,
  onWalkthroughComplete,
  paused = false,
}, ref) {
  const presentationMode = presentationModeProp ?? blueprint.metadata.presentationMode === true;
  const orbitLocked = previewMode || presentationMode || walkthroughActive ? false : lockOrbit;
  const hideLabels = presentationMode || previewMode || walkthroughActive;
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
  const viewerRootRef = useRef<HTMLDivElement | null>(null);
  const orbitControlsRef = useRef<{
    getAzimuthalAngle: () => number;
    setAzimuthalAngle: (v: number) => void;
    getPolarAngle: () => number;
    setPolarAngle: (v: number) => void;
    getDistance: () => number;
    minDistance: number;
    maxDistance: number;
    object: { position: THREE.Vector3; updateProjectionMatrix?: () => void };
    target: THREE.Vector3;
    update: () => void;
  } | null>(null);
  const [inView, setInView] = useState(true);
  const sceneLabel = useMemo(() => describeRoomScene(blueprint), [blueprint]);
  const freezeFrames = paused || !inView;

  useEffect(() => {
    const node = viewerRootRef.current;
    if (!node) return;
    const stopPageScroll = (event: Event) => {
      event.stopPropagation();
    };
    node.addEventListener('wheel', stopPageScroll, { passive: true });
    node.addEventListener('touchmove', stopPageScroll, { passive: true });
    node.addEventListener('pointerdown', stopPageScroll);
    const io = typeof IntersectionObserver === 'undefined'
      ? null
      : new IntersectionObserver(
        ([entry]) => {
          setInView(Boolean(entry?.isIntersecting && (entry.intersectionRatio ?? 0) > 0.04));
        },
        { threshold: [0, 0.04, 0.2] },
      );
    io?.observe(node);
    return () => {
      node.removeEventListener('wheel', stopPageScroll);
      node.removeEventListener('touchmove', stopPageScroll);
      node.removeEventListener('pointerdown', stopPageScroll);
      io?.disconnect();
    };
  }, []);

  useImperativeHandle(ref, () => ({
    capturePng: (scale) => captureApiRef.current?.capturePng(scale) ?? null,
  }), []);

  return (
    <div
      ref={viewerRootRef}
      role="img"
      tabIndex={0}
      aria-label={`${sceneLabel}. Flèches pour orbiter, plus et moins pour zoomer.`}
      onKeyDown={(event) => {
        const controls = orbitControlsRef.current;
        if (!controls || orbitLocked) return;
        const yaw = 0.12;
        const pitch = 0.08;
        if (event.key === 'ArrowLeft') {
          event.preventDefault();
          controls.setAzimuthalAngle(controls.getAzimuthalAngle() + yaw);
        } else if (event.key === 'ArrowRight') {
          event.preventDefault();
          controls.setAzimuthalAngle(controls.getAzimuthalAngle() - yaw);
        } else if (event.key === 'ArrowUp') {
          event.preventDefault();
          controls.setPolarAngle(Math.max(0.12, controls.getPolarAngle() - pitch));
        } else if (event.key === 'ArrowDown') {
          event.preventDefault();
          controls.setPolarAngle(Math.min(Math.PI / 2.05, controls.getPolarAngle() + pitch));
        } else if (event.key === '+' || event.key === '=') {
          event.preventDefault();
          const next = Math.max(controls.minDistance, controls.getDistance() * 0.9);
          const dir = controls.object.position.clone().sub(controls.target).normalize();
          controls.object.position.copy(controls.target.clone().add(dir.multiplyScalar(next)));
        } else if (event.key === '-' || event.key === '_') {
          event.preventDefault();
          const next = Math.min(controls.maxDistance, controls.getDistance() * 1.1);
          const dir = controls.object.position.clone().sub(controls.target).normalize();
          controls.object.position.copy(controls.target.clone().add(dir.multiplyScalar(next)));
        } else {
          return;
        }
        controls.update();
      }}
      className={cn(
        'relative w-full overflow-hidden rounded-[var(--radius-card)] border border-border bg-foreground touch-none overscroll-none',
        className,
      )}
    >
      <Canvas
        shadows
        style={{ touchAction: 'none' }}
        frameloop={freezeFrames ? 'never' : 'always'}
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
            walkthroughActive={walkthroughActive}
            onWalkthroughProgress={onWalkthroughProgress}
            onWalkthroughComplete={onWalkthroughComplete}
            orbitControlsRef={orbitControlsRef}
          />
        </Suspense>
      </Canvas>
      {walkthroughActive ? (
        <div className="pointer-events-none absolute bottom-2 left-2 right-2 flex items-end justify-between gap-2">
          <div className="rounded-md bg-foreground/85 px-2.5 py-1.5 text-xs font-bold text-background">
            Visite guidée · entrée par la porte
          </div>
        </div>
      ) : presentationMode ? (
        <div className="pointer-events-none absolute bottom-2 left-2">
          <div className="rounded-md bg-foreground/85 px-2 py-1 text-xs font-bold text-background">
            Présentation · orbit automatique
          </div>
        </div>
      ) : qualitySettings.showHints ? (
        <div className="pointer-events-none absolute bottom-2 left-2 right-2 flex items-end justify-between gap-2">
          <div className="rounded-md bg-foreground/85 px-2 py-1 text-xs font-medium text-background">
            {previewMode
              ? 'Rendu 3D réaliste · molette = zoom · glisser = orbit'
              : orbitLocked
                ? 'Caméra bloquée · posez tables/chaises sur moquette, piste, podium · molette = zoom'
                : 'Orbit libre · activez « Caméra bloquée » pour placer le mobilier sur les surfaces'}
          </div>
          {previewMode ? (
            <div className="rounded-md bg-foreground/85 px-2 py-1 text-xs font-bold text-background">
              {blueprint.canvas.widthM}×{blueprint.canvas.heightM} m
            </div>
          ) : null}
        </div>
      ) : (
        <div className="pointer-events-none absolute bottom-2 right-2">
          <div className="rounded-md bg-foreground/85 px-2 py-1 text-xs font-bold text-background">
            Showcase · {renderQualityLabelsSafe(qualitySettings.quality)}
          </div>
        </div>
      )}
    </div>
  );
});

export default memo(RoomWebGLViewer);

function renderQualityLabelsSafe(q: RenderQuality) {
  if (q === 'draft') return 'Brouillon';
  if (q === 'showcase') return 'Showcase';
  return 'Standard';
}
