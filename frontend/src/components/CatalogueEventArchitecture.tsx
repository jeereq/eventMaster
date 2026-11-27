'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { PodiumStyle, ZoneKind, ZoneMaterial } from '@/lib/roomLayoutUtils';
import { deckUsesSkirt, getStairWoodMap, loadTiledTexture, resolveDeckSurface, resolveZoneMaterialMap } from '@/lib/roomWebGLMaterials';
import { rowArcZ, rowCurveFactor, rowSeatLocalX } from '@/lib/roomAmphitheaterGeom';
import { PleatedDrape, StageStairs, usePleatMap } from '@/components/room/StageDressing';

/** Profondeur de marche derrière le siège quand aucune rangée ne suit (dos + passage). */
export const RISER_TREAD_M = 0.78;
export const RISER_FRONT_OVERHANG_M = 0.32;
const RISER_ARC_SEGMENTS = 18;

/** Étendue latérale d’un gradin (repère local du rang), allées latérales comprises. */
export function riserExtentX(
  seatCount: number,
  spacing: number,
  aisleSplit: boolean,
  aisleWidthPct: number,
  sideAisleM = 0,
  inset = 0,
) {
  const firstX = rowSeatLocalX(0, seatCount, spacing, aisleSplit, aisleWidthPct);
  const lastX = rowSeatLocalX(seatCount - 1, seatCount, spacing, aisleSplit, aisleWidthPct);
  const pad = Math.max(0.08, 0.42 - inset) + Math.max(0, sideAisleM);
  return { x0: Math.min(firstX, lastX) - pad, x1: Math.max(firstX, lastX) + pad };
}

function buildRiserFootprint(
  seatCount: number,
  spacing: number,
  curveFactor: number,
  aisleSplit: boolean,
  aisleWidthPct: number,
  inset = 0,
  treadBackM = RISER_TREAD_M,
  sideAisleM = 0,
) {
  const { x0, x1 } = riserExtentX(seatCount, spacing, aisleSplit, aisleWidthPct, sideAisleM, inset);
  const shape = new THREE.Shape();

  // Coordonnées 3D :
  // zFront(x) est en avant des sièges (vers la scène, en Z négatif)
  // zBack(x) est en arrière des sièges (vers le fond, en Z positif)
  const zFront = (x: number) => rowArcZ(x, spacing, curveFactor) - (RISER_FRONT_OVERHANG_M - inset);
  const zBack = (x: number) => rowArcZ(x, spacing, curveFactor) + (treadBackM - inset);

  // Avec ExtrudeGeometry puis volume.rotateX(-Math.PI / 2) :
  // new_Z = -shape_Y. Pour que new_Z corresponde à nos coordonnées 3D :
  // shape_Y_back = -zBack(x)
  // shape_Y_front = -zFront(x)
  const yBack = (x: number) => -zBack(x);
  const yFront = (x: number) => -zFront(x);

  // Tracé CCW : bord arrière de gauche à droite, puis bord avant de droite à gauche
  shape.moveTo(x0, yBack(x0));
  for (let i = 1; i <= RISER_ARC_SEGMENTS; i += 1) {
    const x = x0 + ((x1 - x0) * i) / RISER_ARC_SEGMENTS;
    shape.lineTo(x, yBack(x));
  }
  for (let i = RISER_ARC_SEGMENTS; i >= 0; i -= 1) {
    const x = x0 + ((x1 - x0) * i) / RISER_ARC_SEGMENTS;
    shape.lineTo(x, yFront(x));
  }
  shape.closePath();
  return { shape, x0, x1, zFront, zBack };
}

export type RiserFinish = 'wood' | 'stone' | 'carpet';

/** Pierre calcaire des gradins à ciel ouvert (UV de l’extrusion en mètres). */
function useStoneRiserMaps() {
  return useMemo(
    () => ({
      map: loadTiledTexture('/floors/gen/travertine.jpg', 0.7, 0.7),
      normalMap: loadTiledTexture('/floors/gen/travertine-normal.jpg', 0.7, 0.7, true),
    }),
    [],
  );
}

/**
 * Gradin amphithéâtre : dalle cintrée qui suit l’arc des sièges.
 * `treadBackM` prolonge la marche jusqu’à la rangée suivante : les gradins forment un escalier
 * continu au lieu de plots séparés par des vides.
 * Comme dans une vraie salle, les allées (centrale ou latérales) se montent par des demi-marches
 * balisées de veilleuses, et les garde-corps sont continus le long du bloc
 * (voir `AmphitheaterBankRails`) au lieu d’être répétés sur chaque rang.
 */
export function AmphitheaterRiser({
  seatCount,
  spacing,
  elevation,
  curve = 0,
  aisleSplit = false,
  aisleWidthPct = 14,
  sideAisleM = 0,
  riseM,
  selected = false,
  treadBackM = RISER_TREAD_M,
  finish = 'wood',
}: {
  seatCount: number;
  spacing: number;
  elevation: number;
  curve?: number;
  aisleSplit?: boolean;
  aisleWidthPct?: number;
  /** Largeur des allées en escalier de chaque côté du rang (m). */
  sideAisleM?: number;
  /** Hauteur de la contremarche par rapport au rang inférieur (défaut : hauteur du gradin, 30 cm max). */
  riseM?: number;
  selected?: boolean;
  treadBackM?: number;
  finish?: RiserFinish;
}) {
  const wood = useMemo(() => getStairWoodMap(), []);
  const stone = useStoneRiserMaps();
  const isStone = finish === 'stone';
  const isCarpet = finish === 'carpet';
  const h = Math.max(elevation, 0.14);
  const rise = Math.max(0.1, Math.min(h, riseM ?? Math.min(h, 0.3)));
  const curveF = rowCurveFactor(curve);
  const selectedTint = selected ? '#c7d2fe' : undefined;

  const { volume, carpet, x0, x1, zFront } = useMemo(() => {
    // Structure porteuse bois / béton
    const footprint = buildRiserFootprint(seatCount, spacing, curveF, aisleSplit, aisleWidthPct, 0, treadBackM, sideAisleM);
    const volume = new THREE.ExtrudeGeometry(footprint.shape, {
      depth: h,
      bevelEnabled: true,
      bevelThickness: 0.014,
      bevelSize: 0.014,
      bevelSegments: 2,
    });
    volume.rotateX(-Math.PI / 2);
    volume.computeVertexNormals();

    // Moquette avec léger retrait pour révéler le nez de marche et le pourtour
    const carpetFootprint = buildRiserFootprint(seatCount, spacing, curveF, aisleSplit, aisleWidthPct, 0.035, treadBackM, sideAisleM);
    const carpet = new THREE.ExtrudeGeometry(carpetFootprint.shape, {
      depth: 0.025,
      bevelEnabled: true,
      bevelThickness: 0.006,
      bevelSize: 0.006,
      bevelSegments: 1,
    });
    carpet.rotateX(-Math.PI / 2);
    carpet.translate(0, h + 0.002, 0);
    carpet.computeVertexNormals();

    return {
      volume,
      carpet,
      x0: footprint.x0,
      x1: footprint.x1,
      zFront: footprint.zFront,
    };
  }, [seatCount, spacing, curveF, aisleSplit, aisleWidthPct, h, treadBackM, sideAisleM]);

  useEffect(() => () => {
    volume.dispose();
    carpet.dispose();
  }, [volume, carpet]);

  // Nez de marche continu qui épouse l’arc du gradin.
  const nosingGeo = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= RISER_ARC_SEGMENTS; i += 1) {
      const x = x0 + ((x1 - x0) * i) / RISER_ARC_SEGMENTS;
      pts.push(new THREE.Vector3(x, h + 0.012, zFront(x) + 0.012));
    }
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 48, isStone ? 0.03 : 0.014, 6, false);
  }, [x0, x1, zFront, h, isStone]);

  useEffect(() => () => nosingGeo.dispose(), [nosingGeo]);

  const aisleGap = aisleSplit && seatCount >= 4
    ? spacing * (0.55 + Math.min(30, Math.max(5, aisleWidthPct)) / 20)
    : 0;

  // Allées en escalier : centrale (rang coupé en deux) et/ou latérales (cinéma).
  const aisles = useMemo(() => {
    const list: Array<{ x: number; w: number }> = [];
    if (aisleGap > 0) list.push({ x: 0, w: aisleGap * 0.94 });
    if (sideAisleM > 0.3) {
      list.push({ x: x0 + sideAisleM / 2 + 0.04, w: sideAisleM - 0.12 });
      list.push({ x: x1 - sideAisleM / 2 - 0.04, w: sideAisleM - 0.12 });
    }
    return list;
  }, [aisleGap, sideAisleM, x0, x1]);

  // Demi-marche d’allée : deux hauteurs confortables au lieu d’une contremarche de gradin.
  const halfStep = rise > 0.2 ? rise / 2 : 0;
  const halfStepDepth = Math.min(0.55, Math.max(0.3, rise * 1.2));

  const bodyMaterial = isStone ? (
    <meshStandardMaterial
      color={selectedTint ?? '#e6d6bc'}
      map={stone.map}
      normalMap={stone.normalMap}
      normalScale={new THREE.Vector2(0.6, 0.6)}
      roughness={0.9}
      metalness={0}
    />
  ) : isCarpet ? (
    <meshStandardMaterial color={selectedTint ?? '#2b2730'} roughness={0.98} metalness={0} />
  ) : (
    <meshStandardMaterial color={selectedTint ?? '#4a3d33'} map={wood} roughness={0.72} metalness={0.06} />
  );

  return (
    <group>
      {/* Structure du gradin : bois verni, moquette acoustique (cinéma) ou pierre à ciel ouvert */}
      <mesh geometry={volume} receiveShadow castShadow>
        {bodyMaterial}
      </mesh>

      {/* Moquette de la marche (la pierre reste nue) */}
      {!isStone && (
        <mesh geometry={carpet} receiveShadow>
          <meshStandardMaterial
            color={selectedTint ?? (isCarpet ? '#3a3340' : '#3b1220')}
            roughness={0.97}
            metalness={0}
          />
        </mesh>
      )}

      {/* Nez de marche : pierre adoucie, profilé alu antidérapant (cinéma) ou laiton brossé */}
      <mesh geometry={nosingGeo} castShadow={isStone} receiveShadow>
        {isStone ? (
          <meshStandardMaterial color="#e2d6c1" map={stone.map} roughness={0.85} />
        ) : isCarpet ? (
          <meshStandardMaterial color="#8a8f98" metalness={0.7} roughness={0.35} />
        ) : (
          <meshStandardMaterial color="#b8975a" metalness={0.6} roughness={0.35} />
        )}
      </mesh>

      {aisles.map((a, i) => {
        const zEdge = zFront(a.x);
        return (
          <group key={`aisle-${i}`}>
            {halfStep > 0 && (
              <mesh position={[a.x, (h - halfStep) / 2, zEdge - halfStepDepth / 2]} receiveShadow castShadow>
                <boxGeometry args={[a.w, h - halfStep, halfStepDepth]} />
                {bodyMaterial}
              </mesh>
            )}
            {/* Veilleuses d’allée encastrées dans les contremarches (balisage de sécurité) */}
            {!isStone && (
              <>
                <mesh position={[a.x, h - 0.06, zEdge - 0.003]}>
                  <boxGeometry args={[Math.min(0.32, a.w * 0.4), 0.025, 0.01]} />
                  <meshStandardMaterial color="#fff7d6" emissive="#fbbf24" emissiveIntensity={1.4} toneMapped={false} />
                </mesh>
                {halfStep > 0 && (
                  <mesh position={[a.x, h - halfStep - 0.06, zEdge - halfStepDepth - 0.003]}>
                    <boxGeometry args={[Math.min(0.32, a.w * 0.4), 0.025, 0.01]} />
                    <meshStandardMaterial color="#fff7d6" emissive="#fbbf24" emissiveIntensity={1.4} toneMapped={false} />
                  </mesh>
                )}
              </>
            )}
          </group>
        );
      })}
    </group>
  );
}

/** Garde-corps d’un bloc de gradins : main courante continue qui suit la pente de l’escalier. */
export type AmphitheaterBankRail = {
  /** Points (repère monde) du haut de la main courante, du bas vers le haut du bloc. */
  points: Array<[number, number, number]>;
  /** Poteaux : pied (x, y, z) et hauteur. */
  posts: Array<[number, number, number, number]>;
};

export function AmphitheaterBankRails({ rails, finish = 'wood' }: { rails: AmphitheaterBankRail[]; finish?: RiserFinish }) {
  const geos = useMemo(
    () =>
      rails
        .filter((r) => r.points.length >= 2)
        .map((r) => {
          const path = new THREE.CurvePath<THREE.Vector3>();
          const top = r.points.map((p) => new THREE.Vector3(p[0], p[1], p[2]));
          const mid = r.points.map((p) => new THREE.Vector3(p[0], p[1] - 0.45, p[2]));
          for (let i = 1; i < top.length; i += 1) path.add(new THREE.LineCurve3(top[i - 1], top[i]));
          const midPath = new THREE.CurvePath<THREE.Vector3>();
          for (let i = 1; i < mid.length; i += 1) midPath.add(new THREE.LineCurve3(mid[i - 1], mid[i]));
          const segs = Math.max(8, top.length * 4);
          return {
            hand: new THREE.TubeGeometry(path, segs, 0.022, 10, false),
            mid: new THREE.TubeGeometry(midPath, segs, 0.012, 8, false),
          };
        }),
    [rails],
  );
  useEffect(() => () => geos.forEach((g) => { g.hand.dispose(); g.mid.dispose(); }), [geos]);
  const metal = finish === 'carpet' ? '#9ca3af' : finish === 'stone' ? '#57534e' : '#b8975a';
  return (
    <group>
      {geos.map((g, i) => (
        <group key={`rail-${i}`}>
          <mesh geometry={g.hand} castShadow>
            <meshStandardMaterial color={metal} metalness={0.75} roughness={0.25} />
          </mesh>
          <mesh geometry={g.mid}>
            <meshStandardMaterial color={metal} metalness={0.7} roughness={0.3} />
          </mesh>
        </group>
      ))}
      {rails.flatMap((r, i) =>
        r.posts.map(([x, y, z, len], k) => (
          <mesh key={`post-${i}-${k}`} position={[x, y + len / 2, z]} castShadow>
            <cylinderGeometry args={[0.018, 0.02, len, 10]} />
            <meshStandardMaterial color={metal} metalness={0.75} roughness={0.25} />
          </mesh>
        )),
      )}
    </group>
  );
}

/** Scène / podium avec jupe, bande LED et spots. */
const STAGE_SKIRT = '#1c1a19';

/**
 * Matériaux d’un bloc d’estrade : plateau texturé à l’échelle réelle sur chaque face,
 * ou jupe de scène sombre sur les flancs pour les plateaux bois / moquette.
 */
function DeckMaterials({
  w,
  h,
  d,
  material,
  selected,
  skirtColor = STAGE_SKIRT,
}: {
  w: number;
  h: number;
  d: number;
  material?: ZoneMaterial;
  selected: boolean;
  skirtColor?: string;
}) {
  const top = useMemo(() => resolveDeckSurface(material, w, d), [material, w, d]);
  const sideX = useMemo(() => resolveDeckSurface(material, d, h), [material, d, h]);
  const sideZ = useMemo(() => resolveDeckSurface(material, w, h), [material, w, h]);
  const skirt = deckUsesSkirt(material);
  // Jupe de scène en molleton plissé : un pli tous les ~12 cm sur chaque flanc.
  const pleatX = usePleatMap(d);
  const pleatZ = usePleatMap(w);
  // Ordre des faces BoxGeometry : +X, -X, +Y, -Y, +Z, -Z.
  const faces = [sideX, sideX, top, top, sideZ, sideZ];
  return (
    <>
      {faces.map((m, i) => {
        const isTop = i === 2 || i === 3;
        if (skirt && !isTop) {
          return (
            <meshStandardMaterial
              key={i}
              attach={`material-${i}`}
              color={selected ? '#c7d2fe' : skirtColor}
              map={(i < 2 ? pleatX : pleatZ) ?? undefined}
              roughness={0.88}
              metalness={0}
            />
          );
        }
        return (
          <meshStandardMaterial
            key={i}
            attach={`material-${i}`}
            color={selected ? '#c7d2fe' : m.color}
            map={m.map ?? undefined}
            normalMap={m.normalMap ?? undefined}
            roughnessMap={m.roughnessMap ?? undefined}
            roughness={m.roughness}
            metalness={m.metalness}
            emissive={m.emissive}
            emissiveIntensity={m.emissiveIntensity}
          />
        );
      })}
    </>
  );
}

/** Plateau d’un cylindre (podium rond, demi-lune) : texture à l’échelle réelle. */
function DeckTopMaterial({
  attach,
  material,
  size,
  selected,
}: {
  attach: string;
  material?: ZoneMaterial;
  size: number;
  selected: boolean;
}) {
  const top = useMemo(() => resolveDeckSurface(material, size, size), [material, size]);
  return (
    <meshStandardMaterial
      attach={attach}
      color={selected ? '#c7d2fe' : top.color}
      map={top.map ?? undefined}
      normalMap={top.normalMap ?? undefined}
      roughnessMap={top.roughnessMap ?? undefined}
      roughness={top.roughness}
      metalness={top.metalness}
    />
  );
}

/** Petite composition florale basse (bord d’estrade, podium des mariés). */
export function StageFlowerCluster({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  const blooms: Array<[number, number, number, string]> = [
    [0, 0.1, 0, '#fdf2f8'],
    [0.09, 0.07, 0.03, '#f9d5e0'],
    [-0.09, 0.07, 0.02, '#fffbeb'],
    [0.04, 0.06, -0.08, '#fdf2f8'],
    [-0.05, 0.05, 0.08, '#f4c2c2'],
  ];
  return (
    <group position={position} scale={scale}>
      {[[-0.12, 0.03, 0.05], [0.13, 0.03, -0.02], [0, 0.02, 0.12], [0.02, 0.03, -0.12]].map(([x, y, z], i) => (
        <mesh key={`l-${i}`} position={[x, y, z]} scale={[1.4, 0.4, 0.8]} rotation={[0, i * 0.8, 0]} castShadow>
          <sphereGeometry args={[0.06, 7, 5]} />
          <meshStandardMaterial color="#5f7f5f" roughness={0.85} />
        </mesh>
      ))}
      {blooms.map(([x, y, z, c], i) => (
        <mesh key={i} position={[x, y, z]} castShadow>
          <sphereGeometry args={[0.065, 12, 10]} />
          <meshStandardMaterial color={c} roughness={0.75} />
        </mesh>
      ))}
    </group>
  );
}

export function EventStage({
  w,
  d,
  height,
  steps,
  map,
  baseColor,
  selected,
  kind,
  shape = 'rect',
  podiumStyle,
  material,
  skirtColor,
  stairs = true,
  dressed = false,
}: {
  w: number;
  d: number;
  height: number;
  steps: number;
  map: THREE.Texture | null;
  baseColor: string;
  selected: boolean;
  kind: 'stage' | 'podium';
  /** Escalier d’accès (scènes de 30 cm et plus). */
  stairs?: boolean;
  /** Un habillage complet (truss, concert, mariage) remplace le rideau et les spots de base. */
  dressed?: boolean;
  shape?: 'rect' | 'semiCircle';
  podiumStyle?: PodiumStyle;
  /** Matière du plateau (texture à l’échelle réelle). */
  material?: ZoneMaterial;
  /** Couleur de la jupe de scène (flancs) ; défaut anthracite. */
  skirtColor?: string;
}) {
  const stepCount = Math.max(1, Math.min(4, steps));
  const isStage = kind === 'stage';
  const style = podiumStyle ?? 'speaker';
  const isCircular = kind === 'podium' && style === 'circular';
  const isCouple = kind === 'podium' && style === 'couple';
  const isRunway = kind === 'podium' && style === 'runway';
  const isBand = kind === 'podium' && style === 'bandRiser';
  const showLectern = kind === 'podium' && (style === 'speaker' || style === 'lectern');
  const withStairs = (isStage || style === 'honor') && stairs && height >= 0.3;
  const roundPleat = usePleatMap(Math.PI * Math.min(w, d));
  const halfPleat = usePleatMap((Math.PI * w) / 2);


  if (isCircular || isCouple) {
    const r = Math.min(w, d) * 0.5;
    return (
      <group>
        <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[r, r * 1.02, height, 48]} />
          <meshStandardMaterial attach="material-0" color={selected ? '#c7d2fe' : skirtColor ?? STAGE_SKIRT} map={roundPleat ?? undefined} roughness={0.88} />
          <DeckTopMaterial attach="material-1" material={material} size={r * 2} selected={selected} />
          <meshStandardMaterial attach="material-2" color="#111" />
        </mesh>
        {/* Liseré laiton sur le nez de marche */}
        <mesh position={[0, height, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[r * 1.005, 0.012, 8, 64]} />
          <meshStandardMaterial color="#c9a227" metalness={0.85} roughness={0.25} />
        </mesh>
        {isCouple ? (
          <>
            {/* Tapis ivoire rond + couronne florale sur l’arrière pour les mariés */}
            <mesh position={[0, height + 0.008, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
              <circleGeometry args={[r * 0.8, 48]} />
              <meshStandardMaterial color={selected ? '#e0e7ff' : '#f5f0e6'} roughness={0.9} />
            </mesh>
            {Array.from({ length: 7 }).map((_, i) => {
              const a = Math.PI * (0.62 + (i / 6) * 0.76);
              return <StageFlowerCluster key={i} position={[Math.cos(a) * r * 0.9, height, Math.sin(a) * r * 0.9 * -1]} scale={1.1} />;
            })}
          </>
        ) : null}
        <mesh position={[0, 0.05, r + 0.03]}>
          <boxGeometry args={[r * 1.2, 0.03, 0.03]} />
          <meshStandardMaterial color="#fbbf24" emissive="#d97706" emissiveIntensity={0.4} />
        </mesh>
      </group>
    );
  }

  if (isBand) {
    return (
      <group>
        {([-0.33, 0, 0.33] as const).map((side, i) => {
          const riserH = height * (0.55 + i * 0.22);
          return (
            <mesh key={side} position={[side * w * 0.34, riserH / 2, 0]} castShadow receiveShadow>
              <boxGeometry args={[w * 0.3, riserH, d * (0.72 + i * 0.08)]} />
              <DeckMaterials w={w * 0.3} h={riserH} d={d * (0.72 + i * 0.08)} material={material} selected={selected} skirtColor={skirtColor} />
            </mesh>
          );
        })}
        <mesh position={[0, 0.05, d * 0.44 + 0.03]}>
          <boxGeometry args={[w * 0.92, 0.03, 0.03]} />
          <meshStandardMaterial color="#fbbf24" emissive="#d97706" emissiveIntensity={0.4} />
        </mesh>
      </group>
    );
  }

  if (shape === 'semiCircle') {
    // Demi-ellipse inscrite dans l’emprise : bord droit au fond (-Z), arrondi vers le public (+Z).
    const half = w / 2;
    return (
      <group position={[0, 0, -d / 2]} scale={[1, 1, d / Math.max(0.01, half)]}>
        <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[half, half, height, 48, 1, false, -Math.PI / 2, Math.PI]} />
          <meshStandardMaterial
            attach="material-0"
            color={selected ? '#c7d2fe' : deckUsesSkirt(material) ? skirtColor ?? STAGE_SKIRT : map ? '#ffffff' : baseColor}
            map={deckUsesSkirt(material) ? halfPleat ?? undefined : map ?? undefined}
            roughness={0.85}
          />
          <DeckTopMaterial attach="material-1" material={material} size={half * 2} selected={selected} />
          <meshStandardMaterial attach="material-2" color="#111" />
          <meshStandardMaterial attach="material-3" color={selected ? '#c7d2fe' : skirtColor ?? STAGE_SKIRT} roughness={0.9} />
        </mesh>
        {withStairs ? (
          // Escalier au centre de l’arrondi, face au public (repère non étiré).
          <group scale={[1, 1, Math.max(0.01, half) / d]} position={[0, 0, half]}>
            <group rotation={[0, -Math.PI / 2, 0]}>
              <StageStairs height={height} width={Math.min(1.4, w * 0.25)} material={material} skirtColor={deckUsesSkirt(material) ? skirtColor : undefined} selected={selected} />
            </group>
          </group>
        ) : null}
      </group>
    );
  }

  return (
    <group>
      {Array.from({ length: stepCount }).map((_, i) => {
        const stepH = height / stepCount;
        const shrink = 1 - i * 0.07;
        return (
          <group key={i} position={[0, stepH * i, (1 - shrink) * d * 0.1]}>
            <mesh position={[0, stepH / 2, 0]} castShadow receiveShadow>
              <boxGeometry args={[w * shrink, stepH * 0.92, d * shrink]} />
              <DeckMaterials w={w * shrink} h={stepH * 0.92} d={d * shrink} material={material} selected={selected} skirtColor={skirtColor} />
            </mesh>
            {/* Nez de marche aluminium (sécurité) */}
            <mesh position={[0, stepH * 0.92 + 0.004, d * shrink * 0.5 - 0.02]} castShadow>
              <boxGeometry args={[w * shrink * 0.995, 0.012, 0.04]} />
              <meshStandardMaterial color="#a8a29e" metalness={0.7} roughness={0.35} />
            </mesh>
          </group>
        );
      })}
      {/* Bande LED avant */}
      <mesh position={[0, 0.06, d * 0.5 + 0.05]}>
        <boxGeometry args={[w * 0.9, 0.03, 0.03]} />
        <meshStandardMaterial
          color="#fbbf24"
          emissive="#d97706"
          emissiveIntensity={0.4}
          roughness={0.2}
          metalness={0.4}
        />
      </mesh>
      {withStairs ? (
        <group position={[w / 2, 0, d * 0.18]}>
          <StageStairs height={height} width={Math.min(1.3, d * 0.4)} material={material} skirtColor={deckUsesSkirt(material) ? skirtColor : undefined} selected={selected} />
        </group>
      ) : null}
      {/* Spots de scène */}
      {isStage && !dressed && ([-0.35, 0, 0.35] as const).map((x, i) => (
        <group key={i} position={[x * w, height + 0.15, -d * 0.35]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.06, 0.08, 0.12, 12]} />
            <meshStandardMaterial color="#292524" metalness={0.6} roughness={0.35} />
          </mesh>
          <mesh position={[0, -0.08, 0.05]} rotation={[0.6, 0, 0]}>
            <coneGeometry args={[0.12, 0.35, 16]} />
            <meshStandardMaterial
              color="#fef3c7"
              transparent
              opacity={0.15}
              emissive="#fbbf24"
              emissiveIntensity={0.4}
              depthWrite={false}
            />
          </mesh>
          <pointLight position={[0, -0.2, 0.15]} intensity={0.35} color="#fde68a" distance={6} />
        </group>
      ))}
      {/* Rideau / fond léger pour grande scène */}
      {isStage && !dressed && w > 3 && (
        <group position={[0, height, -d * 0.47]}>
          <PleatedDrape width={w * 0.85} height={2.4} color="#5b0f12" />
          {/* Tringle */}
          <mesh position={[0, 2.42, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.02, 0.02, w * 0.87, 8]} />
            <meshStandardMaterial color="#1c1917" metalness={0.7} roughness={0.3} />
          </mesh>
        </group>
      )}
      {isRunway ? (
        <>
          {([-0.48, 0.48] as const).map((side) => (
            <mesh key={side} position={[side * w, 0.05, 0]}>
              <boxGeometry args={[0.04, 0.03, d * 0.96]} />
              <meshStandardMaterial color="#f472b6" emissive="#ec4899" emissiveIntensity={0.7} />
            </mesh>
          ))}
        </>
      ) : null}
      {showLectern ? (
        <group position={[0, height, style === 'lectern' ? 0 : -d * 0.12]}>
          {/* Fût principal du pupitre moderne en bois noble ou verre fumé */}
          <mesh position={[0, 0.55, 0]} castShadow>
            <boxGeometry args={[0.52, 1.05, 0.28]} />
            <meshStandardMaterial color={selected ? '#c7d2fe' : '#292524'} roughness={0.35} metalness={0.15} />
          </mesh>
          {/* Parement de façade du pupitre avec panneau texturé */}
          <mesh position={[0, 0.55, 0.145]} castShadow>
            <boxGeometry args={[0.46, 0.95, 0.015]} />
            <meshStandardMaterial color="#451a03" roughness={0.4} />
          </mesh>
          {/* Tablette orateur inclinée pour documents / tablette tactile */}
          <mesh position={[0, 1.12, 0.04]} rotation={[-0.32, 0, 0]} castShadow>
            <boxGeometry args={[0.62, 0.035, 0.42]} />
            <meshStandardMaterial color="#18181b" roughness={0.3} metalness={0.25} />
          </mesh>
          {/* Butée basse pour maintenir les notes */}
          <mesh position={[0, 1.06, 0.21]} rotation={[-0.32, 0, 0]} castShadow>
            <boxGeometry args={[0.58, 0.02, 0.015]} />
            <meshStandardMaterial color="#c4a35a" metalness={0.75} roughness={0.25} />
          </mesh>
          {/* Double microphone col-de-cygne de conférence */}
          {[-0.14, 0.14].map((mx, mi) => (
            <group key={mi} position={[mx, 1.18, 0.02]}>
              <mesh castShadow>
                <cylinderGeometry args={[0.005, 0.005, 0.38, 8]} />
                <meshStandardMaterial color="#d4d4d8" metalness={0.85} roughness={0.2} />
              </mesh>
              {/* Bonnette micro noire inclinée vers l'orateur */}
              <mesh position={[0, 0.2, 0.04]} rotation={[0.45, 0, 0]} castShadow>
                <cylinderGeometry args={[0.014, 0.022, 0.06, 12]} />
                <meshStandardMaterial color="#09090b" roughness={0.9} />
              </mesh>
            </group>
          ))}
          {/* Lampe liseuse LED encastrée sur le dessus du pupitre */}
          <mesh position={[0, 1.25, -0.1]} rotation={[0.2, 0, 0]}>
            <boxGeometry args={[0.28, 0.015, 0.025]} />
            <meshStandardMaterial color="#fef3c7" emissive="#fbbf24" emissiveIntensity={0.8} />
          </mesh>
        </group>
      ) : null}

      {/* Garde-corps arrière de sécurité pour scènes hautes */}
      {isStage && height >= 0.55 && (
        <group position={[0, height, -d * 0.48]}>
          {/* Main courante arrière */}
          <mesh position={[0, 0.95, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.022, 0.022, w * 0.94, 12]} />
            <meshStandardMaterial color="#292524" metalness={0.8} roughness={0.25} />
          </mesh>
          {/* Lisse basse */}
          <mesh position={[0, 0.48, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.014, 0.014, w * 0.94, 10]} />
            <meshStandardMaterial color="#57534e" metalness={0.7} roughness={0.3} />
          </mesh>
          {/* Poteaux verticaux de sécurité */}
          {[-w * 0.45, -w * 0.15, w * 0.15, w * 0.45].map((px, pi) => (
            <mesh key={pi} position={[px, 0.48, 0]} castShadow>
              <cylinderGeometry args={[0.02, 0.02, 0.96, 10]} />
              <meshStandardMaterial color="#292524" metalness={0.8} roughness={0.25} />
            </mesh>
          ))}
        </group>
      )}
      {kind === 'podium' && style === 'honor' ? (
        // Estrade de la table d’honneur : guirlande florale au nez de l’estrade (la table se pose dessus).
        <group>
          {Array.from({ length: Math.max(4, Math.round(w / 0.45)) }).map((_, i, arr) => (
            <StageFlowerCluster
              key={i}
              position={[(-0.5 + (i + 0.5) / arr.length) * w * 0.94, height * 0.55, d * 0.5 + 0.08]}
              scale={0.9}
            />
          ))}
        </group>
      ) : null}
    </group>
  );
}

/** Zone événement : piste, moquette, VIP. */
export function EventZoneSurface({
  w,
  h,
  thickness,
  material,
  zoneKind,
  color,
  selected,
  pickable,
}: {
  w: number;
  h: number;
  thickness: number;
  material?: ZoneMaterial;
  zoneKind?: ZoneKind;
  color?: string;
  selected: boolean;
  pickable: boolean;
}) {
  // Matières « réelles » (bois, marbre, béton, pelouse…) : texture à l’échelle métrique, sans teinte
  // multipliée qui salit le rendu ; moquette / vinyle / LED gardent leur rendu procédural teinté.
  const metric = material !== undefined && material !== 'carpet' && material !== 'vinyl' && material !== 'led';
  const mat = useMemo(
    () => (metric ? resolveDeckSurface(material, w, h) : { normalMap: null, ...resolveZoneMaterialMap(material) }),
    [metric, material, w, h],
  );
  const isDance = material === 'vinyl' || material === 'led' || zoneKind === 'dance';
  const isCarpet = material === 'carpet' || zoneKind === 'carpet';
  const isVip = zoneKind === 'vip';
  const ledRef = useRef<THREE.MeshStandardMaterial>(null);

  useFrame(({ clock }) => {
    if (!ledRef.current || material !== 'led') return;
    const pulse = 0.28 + Math.sin(clock.elapsedTime * 1.8) * 0.18;
    ledRef.current.emissiveIntensity = pulse;
  });

  return (
    <group>
      <mesh
        receiveShadow
        castShadow={isCarpet}
        raycast={pickable ? undefined : () => null}
      >
        <boxGeometry args={[w, thickness, h]} />
        <meshStandardMaterial
          ref={material === 'led' ? ledRef : undefined}
          color={
            selected
              ? '#c7d2fe'
              : (isDance && material !== 'led') || metric
                ? '#ffffff'
                : (color ?? mat.color)
          }
          map={mat.map ?? undefined}
          normalMap={mat.normalMap ?? undefined}
          roughnessMap={'roughnessMap' in mat ? (mat.roughnessMap ?? undefined) : undefined}
          roughness={mat.roughness}
          metalness={mat.metalness}
          emissive={mat.emissive ?? '#000000'}
          emissiveIntensity={mat.emissiveIntensity ?? 0}
        />
      </mesh>

      {/* Sous-couche / frange */}
      <mesh position={[0, -thickness * 0.15, 0]} receiveShadow>
        <boxGeometry args={[w + (isCarpet ? 0.12 : 0.08), thickness * 0.45, h + (isCarpet ? 0.12 : 0.08)]} />
        <meshStandardMaterial
          color={isCarpet ? '#0f172a' : isDance ? '#1c1917' : '#44403c'}
          roughness={isDance ? 0.55 : 0.92}
          metalness={isDance ? 0.12 : 0.05}
        />
      </mesh>

      {isDance && (
        <>
          {/* Bordure chrome / laiton */}
          {([
            [0, h / 2 + 0.015, w + 0.04, 0.05],
            [0, -h / 2 - 0.015, w + 0.04, 0.05],
            [w / 2 + 0.015, 0, 0.05, h + 0.04],
            [-w / 2 - 0.015, 0, 0.05, h + 0.04],
          ] as const).map(([x, z, bw, bd], i) => (
            <mesh key={`trim-${i}`} position={[x, thickness / 2 + 0.008, z]}>
              <boxGeometry args={[bw, 0.02, bd]} />
              <meshStandardMaterial
                color="#a8a29e"
                emissive="#000000"
                emissiveIntensity={0}
                roughness={0.35}
                metalness={0.75}
              />
            </mesh>
          ))}
          {/* LED ambre discrètes aux coins (ambiance club, pas piscine) */}
          {([
            [w / 2 - 0.08, h / 2 - 0.08],
            [-w / 2 + 0.08, h / 2 - 0.08],
            [w / 2 - 0.08, -h / 2 + 0.08],
            [-w / 2 + 0.08, -h / 2 + 0.08],
          ] as const).map(([x, z], i) => (
            <mesh key={`corner-${i}`} position={[x, thickness / 2 + 0.02, z]}>
              <boxGeometry args={[0.12, 0.03, 0.12]} />
              <meshStandardMaterial
                color="#fbbf24"
                emissive="#d97706"
                emissiveIntensity={0.55}
                roughness={0.3}
                metalness={0.4}
              />
            </mesh>
          ))}
          {/* Spot chaud au-dessus du centre (léger) */}
          <pointLight
            position={[0, 2.4, 0]}
            intensity={0.35}
            distance={Math.max(w, h) * 1.4}
            color="#fde68a"
            castShadow={false}
          />
        </>
      )}

      {isCarpet && (
        <>
          {/* Frange courte */}
          {([-1, 1] as const).map((side) => (
            <mesh key={side} position={[0, 0.005, side * (h / 2 + 0.04)]}>
              <boxGeometry args={[w * 0.95, 0.01, 0.06]} />
              <meshStandardMaterial color="#334155" roughness={1} />
            </mesh>
          ))}
        </>
      )}

      {isVip && (
        <>
          {/* Potelets + corde */}
          {([
            [-0.45, -0.45],
            [0.45, -0.45],
            [-0.45, 0.45],
            [0.45, 0.45],
          ] as const).map(([fx, fz], i) => (
            <group key={i} position={[fx * w, 0, fz * h]}>
              <mesh position={[0, 0.45, 0]} castShadow>
                <cylinderGeometry args={[0.03, 0.04, 0.9, 12]} />
                <meshStandardMaterial color="#d4af37" metalness={0.8} roughness={0.25} />
              </mesh>
              <mesh position={[0, 0.9, 0]} castShadow>
                <sphereGeometry args={[0.05, 12, 12]} />
                <meshStandardMaterial color="#fbbf24" metalness={0.85} roughness={0.2} />
              </mesh>
            </group>
          ))}
          {/* Corde approximative */}
          <mesh position={[0, 0.72, -h * 0.45]} castShadow>
            <boxGeometry args={[w * 0.88, 0.025, 0.025]} />
            <meshStandardMaterial color="#7f1d1d" roughness={0.7} />
          </mesh>
          <mesh position={[0, 0.72, h * 0.45]} castShadow>
            <boxGeometry args={[w * 0.88, 0.025, 0.025]} />
            <meshStandardMaterial color="#7f1d1d" roughness={0.7} />
          </mesh>
          <mesh position={[-w * 0.45, 0.72, 0]} castShadow>
            <boxGeometry args={[0.025, 0.025, h * 0.88]} />
            <meshStandardMaterial color="#7f1d1d" roughness={0.7} />
          </mesh>
          <mesh position={[w * 0.45, 0.72, 0]} castShadow>
            <boxGeometry args={[0.025, 0.025, h * 0.88]} />
            <meshStandardMaterial color="#7f1d1d" roughness={0.7} />
          </mesh>
        </>
      )}
    </group>
  );
}
