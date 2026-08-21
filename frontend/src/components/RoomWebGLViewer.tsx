'use client';

import React, { Suspense, useMemo, useRef, useCallback, useEffect } from 'react';
import { Canvas, ThreeEvent, useThree } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import {
  RoomLayoutBlueprint,
  RoomWallSegment,
  RoomWallOpening,
  WALL_TEXTURE_COLORS,
  resolveBlueprintWalls,
  resolveTableColor,
  type TableShape,
} from '@/lib/roomLayoutUtils';
import { resolveDepthAmount, resolveFloorStyle } from '@/lib/roomFloorUtils';
import { getRoomTheme } from '@/lib/roomThemeUtils';
import { cn } from '@/lib/cn';

export type WebGLSelectableKind = 'table' | 'row' | 'zone' | 'fixture' | 'wall';

export interface WebGLSelection {
  kind: WebGLSelectableKind;
  id: string;
}

interface RoomWebGLViewerProps {
  blueprint: RoomLayoutBlueprint;
  selected: WebGLSelection | null;
  onSelect: (sel: WebGLSelection | null) => void;
  onMoveItem?: (kind: WebGLSelectableKind, id: string, xPct: number, yPct: number) => void;
  readOnly?: boolean;
  className?: string;
  /** Mode édition de murs : désactive orbit, permet de cliquer les murs */
  wallEditMode?: boolean;
}

function pctToWorld(xPct: number, yPct: number, widthM: number, heightM: number): [number, number] {
  // Plan XZ : origine au centre de la salle
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
  floorColor,
  floorImageUrl,
  onPointerMissed,
  onFloorPointer,
}: {
  widthM: number;
  heightM: number;
  floorColor: string;
  floorImageUrl?: string;
  onPointerMissed?: () => void;
  onFloorPointer?: (point: THREE.Vector3) => void;
}) {
  const texture = useMemo(() => {
    if (!floorImageUrl) return null;
    const loader = new THREE.TextureLoader();
    const tex = loader.load(floorImageUrl);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(Math.max(1, widthM / 4), Math.max(1, heightM / 4));
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, [floorImageUrl, widthM, heightM]);

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0, 0]}
      receiveShadow
      onClick={(e) => {
        e.stopPropagation();
        onPointerMissed?.();
      }}
      onPointerMove={(e) => {
        if (onFloorPointer) {
          e.stopPropagation();
          onFloorPointer(e.point);
        }
      }}
    >
      <planeGeometry args={[widthM, heightM]} />
      <meshStandardMaterial
        color={floorColor}
        map={texture ?? undefined}
        roughness={0.85}
        metalness={0.05}
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
  const halfLen = wallLengthM / 2;
  const localX = (opening.t - 0.5) * wallLengthM;
  const sill = opening.sillM ?? (opening.kind === 'door' ? 0 : 0.9);
  const h = Math.min(opening.heightM, wallHeightM - sill - 0.05);
  const w = Math.min(opening.widthM, wallLengthM * 0.45);
  const y = sill + h / 2;
  const isDoor = opening.kind === 'door';
  const color = opening.color ?? (isDoor ? '#5c4033' : '#93c5fd');
  const depth = wallThicknessM + 0.06;

  // Cadre
  return (
    <group position={[localX, y, 0]}>
      <mesh castShadow>
        <boxGeometry args={[w, h, depth]} />
        <meshStandardMaterial
          color={color}
          transparent={!isDoor}
          opacity={isDoor ? 1 : 0.55}
          roughness={isDoor ? 0.7 : 0.2}
          metalness={isDoor ? 0.1 : 0.3}
        />
      </mesh>
      {isDoor && opening.style === 'double' && (
        <mesh position={[0, 0, depth / 2 + 0.01]}>
          <boxGeometry args={[0.04, h * 0.95, 0.02]} />
          <meshStandardMaterial color="#2a1810" />
        </mesh>
      )}
      {isDoor && (
        <mesh position={[w * 0.35, 0, depth / 2 + 0.02]}>
          <sphereGeometry args={[0.04, 8, 8]} />
          <meshStandardMaterial color="#c9a227" metalness={0.8} roughness={0.2} />
        </mesh>
      )}
      {!isDoor && (
        <mesh position={[0, 0, depth / 2 + 0.01]}>
          <boxGeometry args={[w * 0.9, h * 0.9, 0.01]} />
          <meshStandardMaterial color="#bfdbfe" transparent opacity={0.35} roughness={0.1} metalness={0.4} />
        </mesh>
      )}
      {/* Masquer un peu le mur derrière (encoche visuelle) */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[Math.min(w + 0.08, Math.abs(localX) < halfLen ? w + 0.08 : w), h + 0.08, wallThicknessM + 0.02]} />
        <meshBasicMaterial color="#111827" transparent opacity={0.15} depthWrite={false} />
      </mesh>
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
  const color = wall.color ?? WALL_TEXTURE_COLORS[wall.texture] ?? '#e8e4df';

  // Roughness / metalness selon texture
  const matProps = useMemo(() => {
    switch (wall.texture) {
      case 'brick':
        return { roughness: 0.95, metalness: 0 };
      case 'wood':
        return { roughness: 0.75, metalness: 0.05 };
      case 'concrete':
        return { roughness: 0.9, metalness: 0.1 };
      case 'stone':
        return { roughness: 0.92, metalness: 0.05 };
      case 'wallpaper':
        return { roughness: 0.8, metalness: 0 };
      default:
        return { roughness: 0.85, metalness: 0 };
    }
  }, [wall.texture]);

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
          color={selected ? '#6366f1' : color}
          {...matProps}
          emissive={selected ? '#312e81' : '#000000'}
          emissiveIntensity={selected ? 0.25 : 0}
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

function TableMesh({
  id,
  xPct,
  yPct,
  shape,
  color,
  name,
  capacity,
  rotation,
  widthM,
  heightM,
  selected,
  onSelect,
  onDrag,
  readOnly,
}: {
  id: string;
  xPct: number;
  yPct: number;
  shape: TableShape;
  color: string;
  name: string;
  capacity: number;
  rotation?: number;
  widthM: number;
  heightM: number;
  selected: boolean;
  onSelect: () => void;
  onDrag?: (xPct: number, yPct: number) => void;
  readOnly?: boolean;
}) {
  const [wx, wz] = pctToWorld(xPct, yPct, widthM, heightM);
  const dragging = useRef(false);
  const { gl } = useThree();

  const size = shape === 'rectangular' ? [1.6, 0.75] : shape === 'oval' ? [1.5, 0.9] : shape === 'square' ? [1.1, 1.1] : [1.2, 1.2];
  const isRound = shape === 'round' || shape === 'oval';

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    if (readOnly || !onDrag) return;
    e.stopPropagation();
    dragging.current = true;
    onSelect();
    (e.target as HTMLElement)?.setPointerCapture?.(e.pointerId);
    gl.domElement.style.cursor = 'grabbing';
  };

  const handlePointerUp = () => {
    dragging.current = false;
    gl.domElement.style.cursor = 'auto';
  };

  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (!dragging.current || !onDrag) return;
    e.stopPropagation();
    const pct = worldToPct(e.point.x, e.point.z, widthM, heightM);
    onDrag(pct.x, pct.y);
  };

  return (
    <group
      position={[wx, 0.4, wz]}
      rotation={[0, ((rotation ?? 0) * Math.PI) / 180, 0]}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerUp}
    >
      {isRound ? (
        <mesh castShadow receiveShadow>
          <cylinderGeometry args={[size[0] / 2, size[0] / 2, 0.12, shape === 'oval' ? 24 : 32]} />
          <meshStandardMaterial
            color={selected ? '#a5b4fc' : color}
            roughness={0.4}
            metalness={0.15}
          />
        </mesh>
      ) : (
        <mesh castShadow receiveShadow>
          <boxGeometry args={[size[0], 0.12, size[1]]} />
          <meshStandardMaterial
            color={selected ? '#a5b4fc' : color}
            roughness={0.4}
            metalness={0.15}
          />
        </mesh>
      )}
      {/* Pied */}
      <mesh position={[0, -0.25, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.12, 0.4, 12]} />
        <meshStandardMaterial color="#4b5563" metalness={0.4} roughness={0.5} />
      </mesh>
      {/* Chaises autour */}
      {Array.from({ length: Math.min(capacity, 12) }).map((_, i) => {
        const a = (i / capacity) * Math.PI * 2;
        const r = (size[0] / 2) + 0.35;
        return (
          <mesh key={i} position={[Math.cos(a) * r, -0.15, Math.sin(a) * r]} castShadow>
            <boxGeometry args={[0.28, 0.45, 0.28]} />
            <meshStandardMaterial color="#1e3a5f" roughness={0.7} />
          </mesh>
        );
      })}
      {selected && (
        <Html center distanceFactor={8} style={{ pointerEvents: 'none' }}>
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
  widthM,
  heightM,
  selected,
  onSelect,
}: {
  xPct: number;
  yPct: number;
  wPct: number;
  hPct: number;
  label: string;
  widthM: number;
  heightM: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const w = (wPct / 100) * widthM;
  const h = (hPct / 100) * heightM;
  const [cx, cz] = pctToWorld(xPct + wPct / 2, yPct + hPct / 2, widthM, heightM);
  return (
    <group position={[cx, 0.02, cz]} onClick={(e) => { e.stopPropagation(); onSelect(); }}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial
          color={selected ? '#818cf8' : '#a78bfa'}
          transparent
          opacity={0.35}
          depthWrite={false}
        />
      </mesh>
      <Html center distanceFactor={12} style={{ pointerEvents: 'none' }}>
        <span className="text-[10px] font-bold text-primary bg-white/80 px-1.5 py-0.5 rounded">{label}</span>
      </Html>
    </group>
  );
}

function FixtureMesh({
  xPct,
  yPct,
  wPct,
  hPct,
  kind,
  label,
  widthM,
  heightM,
  selected,
  onSelect,
  onDrag,
  readOnly,
}: {
  xPct: number;
  yPct: number;
  wPct: number;
  hPct: number;
  kind: string;
  label?: string;
  widthM: number;
  heightM: number;
  selected: boolean;
  onSelect: () => void;
  onDrag?: (xPct: number, yPct: number) => void;
  readOnly?: boolean;
}) {
  const w = (wPct / 100) * widthM;
  const d = (hPct / 100) * heightM;
  const [cx, cz] = pctToWorld(xPct + wPct / 2, yPct + hPct / 2, widthM, heightM);
  const height = kind === 'stage' || kind === 'podium' ? 0.45 : kind === 'column' || kind === 'pillar' ? 2.4 : 0.35;
  const color =
    kind === 'stage' || kind === 'podium'
      ? '#d97706'
      : kind === 'flower'
        ? '#fb7185'
        : kind === 'entrance'
          ? '#34d399'
          : '#78716c';
  const dragging = useRef(false);
  const { gl } = useThree();

  return (
    <group
      position={[cx, height / 2, cz]}
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
      onPointerDown={(e) => {
        if (readOnly || !onDrag) return;
        e.stopPropagation();
        dragging.current = true;
        onSelect();
        gl.domElement.style.cursor = 'grabbing';
      }}
      onPointerUp={() => { dragging.current = false; gl.domElement.style.cursor = 'auto'; }}
      onPointerMove={(e) => {
        if (!dragging.current || !onDrag) return;
        e.stopPropagation();
        const pct = worldToPct(e.point.x - w / 2, e.point.z - d / 2, widthM, heightM);
        onDrag(pct.x, pct.y);
      }}
    >
      {kind === 'column' || kind === 'pillar' ? (
        <mesh castShadow>
          <cylinderGeometry args={[Math.min(w, d) / 2, Math.min(w, d) / 2, height, 16]} />
          <meshStandardMaterial color={selected ? '#a5b4fc' : color} roughness={0.8} />
        </mesh>
      ) : (
        <mesh castShadow receiveShadow>
          <boxGeometry args={[w, height, d]} />
          <meshStandardMaterial color={selected ? '#a5b4fc' : color} roughness={0.7} />
        </mesh>
      )}
      {(selected || label) && (
        <Html center distanceFactor={10} style={{ pointerEvents: 'none' }}>
          <span className="text-[9px] font-bold bg-black/60 text-white px-1.5 py-0.5 rounded">
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
  readOnly,
  wallEditMode,
}: Omit<RoomWebGLViewerProps, 'className'>) {
  const widthM = blueprint.canvas.widthM;
  const heightM = blueprint.canvas.heightM;
  const depthAmount = resolveDepthAmount(blueprint.metadata);
  const theme = getRoomTheme(blueprint.metadata.roomThemeId, blueprint);
  const floorStyle = resolveFloorStyle(
    blueprint.metadata.floorType ?? theme.defaultFloorType,
    blueprint.metadata.floorImageUrl,
    theme.accentColor,
  );
  const floorColor =
    typeof floorStyle.background === 'string' && floorStyle.background.startsWith('#')
      ? floorStyle.background
      : '#d4c4a8';
  const walls = resolveBlueprintWalls(blueprint);

  const { camera } = useThree();
  useEffect(() => {
    // Incliner la caméra selon depthAmount (0 = dessus, 100 = perspective immersives)
    const tilt = (depthAmount / 100) * 55; // degrés depuis le haut
    const dist = Math.max(widthM, heightM) * (1.1 + (100 - depthAmount) * 0.008);
    const elev = Math.cos((tilt * Math.PI) / 180) * dist;
    const back = Math.sin((tilt * Math.PI) / 180) * dist;
    camera.position.set(0, Math.max(elev, 4), back + heightM * 0.15);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  }, [camera, depthAmount, widthM, heightM]);

  const moveTable = useCallback(
    (id: string, x: number, y: number) => onMoveItem?.('table', id, x, y),
    [onMoveItem],
  );
  const moveFixture = useCallback(
    (id: string, x: number, y: number) => onMoveItem?.('fixture', id, x, y),
    [onMoveItem],
  );

  return (
    <>
      <ambientLight intensity={0.55} />
      <directionalLight
        position={[widthM * 0.4, 12, heightM * 0.2]}
        intensity={1.1}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <hemisphereLight args={['#f8fafc', '#78716c', 0.35]} />

      <FloorPlane
        widthM={widthM}
        heightM={heightM}
        floorColor={floorColor}
        floorImageUrl={blueprint.metadata.floorImageUrl}
        onPointerMissed={() => onSelect(null)}
      />

      {/* Grille discrète */}
      <gridHelper args={[Math.max(widthM, heightM), 20, '#94a3b8', '#e2e8f0']} position={[0, 0.01, 0]} />

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
          widthM={widthM}
          heightM={heightM}
          selected={selected?.kind === 'fixture' && selected.id === f.id}
          onSelect={() => onSelect({ kind: 'fixture', id: f.id })}
          onDrag={wallEditMode ? undefined : (x, y) => moveFixture(f.id, x, y)}
          readOnly={readOnly || wallEditMode}
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
              widthM={widthM}
              heightM={heightM}
              selected={selected?.kind === 'zone' && selected.id === item.id}
              onSelect={() => onSelect({ kind: 'zone', id: item.id })}
            />
          );
        }
        if (item.kind === 'row') {
          const [wx, wz] = pctToWorld(item.x, item.y, widthM, heightM);
          return (
            <group
              key={item.id}
              position={[wx, 0.2, wz]}
              onClick={(e) => { e.stopPropagation(); onSelect({ kind: 'row', id: item.id }); }}
            >
              {Array.from({ length: Math.min(item.seatCount, 16) }).map((_, i) => (
                <mesh key={i} position={[(i - item.seatCount / 2) * 0.45, 0, 0]} castShadow>
                  <boxGeometry args={[0.35, 0.4, 0.35]} />
                  <meshStandardMaterial
                    color={selected?.kind === 'row' && selected.id === item.id ? '#a5b4fc' : '#1e3a5f'}
                  />
                </mesh>
              ))}
              <Html center distanceFactor={10} style={{ pointerEvents: 'none' }}>
                <span className="text-[9px] font-bold bg-white/90 px-1 rounded">{item.label}</span>
              </Html>
            </group>
          );
        }
        // table
        const tableColor = resolveTableColor(item.tableColor, blueprint.metadata.defaultTableColor) ?? '#f8fafc';
        return (
          <TableMesh
            key={item.id}
            id={item.id}
            xPct={item.x}
            yPct={item.y}
            shape={item.shape}
            color={tableColor}
            name={item.name}
            capacity={item.capacity}
            rotation={item.rotation}
            widthM={widthM}
            heightM={heightM}
            selected={selected?.kind === 'table' && selected.id === item.id}
            onSelect={() => onSelect({ kind: 'table', id: item.id })}
            onDrag={wallEditMode || item.locked ? undefined : (x, y) => moveTable(item.id, x, y)}
            readOnly={readOnly || wallEditMode || item.locked}
          />
        );
      })}

      <OrbitControls
        enablePan={!wallEditMode}
        enableRotate={!wallEditMode}
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
  readOnly = false,
  className,
  wallEditMode = false,
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
            readOnly={readOnly}
            wallEditMode={wallEditMode}
          />
        </Suspense>
      </Canvas>
      <div className="pointer-events-none absolute bottom-2 left-2 rounded-md bg-black/50 px-2 py-1 text-[9px] font-medium text-white/80">
        WebGL · molette = zoom · glisser = orbit{wallEditMode ? ' · mode murs' : ''}
      </div>
    </div>
  );
}
