'use client';

/**
 * Fenêtre complète posée dans l’épaisseur d’un mur : dormant, ouvrants à la
 * française avec petits bois, verre réaliste, crémone, tablette intérieure,
 * appui extérieur en pierre et rideaux plissés sur tringle.
 *
 * Repère : origine au centre de l’ouverture (`w` × `h`), X le long du mur,
 * Y en hauteur, Z perpendiculaire au mur. `inSide` (+1 / −1) désigne la face
 * côté pièce.
 */

import { useMemo } from 'react';
import * as THREE from 'three';
import { SurfaceMat } from '@/components/room/SurfaceMaterial';
import { MetalMat } from '@/components/room/BathroomMeshes';
import type { HomeMetalFinish } from '@/lib/roomHomeFurniture';

export type WindowUnitStyle = 'rectangular' | 'french' | 'arched' | 'bay';

const FRAME_W = 0.055;
const FRAME_D = 0.07;
const SASH_W = 0.05;
const SASH_D = 0.055;
const GLAZING_BAR = 0.022;

function FrameMat({ color }: { color: string }) {
  return <SurfaceMat color={color} finish="lacquer" roughness={0.4} />;
}

function Glass({ tint }: { tint: string }) {
  return <SurfaceMat color={tint} finish="glass" opacity={0.12} envMapIntensity={1.1} />;
}

/**
 * Ouvrant (ou panneau fixe) de `w` × `h`, centré : quatre montants/traverses,
 * vitrage, et `cols` × `rows` carreaux séparés par des petits bois.
 */
function Sash({ w, h, cols = 1, rows = 1, color, tint, depth = SASH_D }: { w: number; h: number; cols?: number; rows?: number; color: string; tint: string; depth?: number }) {
  const innerW = w - 2 * SASH_W;
  const innerH = h - 2 * SASH_W;
  return (
    <group>
      {([-1, 1] as const).map((s) => (
        <mesh key={`v${s}`} position={[s * (w / 2 - SASH_W / 2), 0, 0]} castShadow>
          <boxGeometry args={[SASH_W, h, depth]} />
          <FrameMat color={color} />
        </mesh>
      ))}
      {([-1, 1] as const).map((s) => (
        <mesh key={`h${s}`} position={[0, s * (h / 2 - SASH_W / 2), 0]} castShadow>
          <boxGeometry args={[innerW, SASH_W * (s < 0 ? 1.3 : 1), depth]} />
          <FrameMat color={color} />
        </mesh>
      ))}
      <mesh>
        <boxGeometry args={[innerW + 0.01, innerH + 0.01, 0.006]} />
        <Glass tint={tint} />
      </mesh>
      {Array.from({ length: cols - 1 }, (_, i) => (
        <mesh key={`c${i}`} position={[-innerW / 2 + ((i + 1) * innerW) / cols, 0, 0]}>
          <boxGeometry args={[GLAZING_BAR, innerH, depth * 0.6]} />
          <FrameMat color={color} />
        </mesh>
      ))}
      {Array.from({ length: rows - 1 }, (_, i) => (
        <mesh key={`r${i}`} position={[0, -innerH / 2 + ((i + 1) * innerH) / rows, 0]}>
          <boxGeometry args={[innerW, GLAZING_BAR, depth * 0.6]} />
          <FrameMat color={color} />
        </mesh>
      ))}
    </group>
  );
}

/** Dormant rectangulaire de `w` × `h` (cadre fixe scellé dans le mur). */
function OuterFrame({ w, h, color }: { w: number; h: number; color: string }) {
  return (
    <group>
      {([-1, 1] as const).map((s) => (
        <mesh key={`v${s}`} position={[s * (w / 2 - FRAME_W / 2), 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[FRAME_W, h, FRAME_D]} />
          <FrameMat color={color} />
        </mesh>
      ))}
      {([-1, 1] as const).map((s) => (
        <mesh key={`h${s}`} position={[0, s * (h / 2 - FRAME_W / 2), 0]} castShadow receiveShadow>
          <boxGeometry args={[w - 2 * FRAME_W, FRAME_W, FRAME_D]} />
          <FrameMat color={color} />
        </mesh>
      ))}
    </group>
  );
}

/** Crémone : poignée sur platine, côté pièce, sur le montant de battement. */
function Espagnolette({ x, z, finish }: { x: number; z: number; finish: HomeMetalFinish }) {
  return (
    <group position={[x, 0, z]}>
      <mesh>
        <boxGeometry args={[0.03, 0.11, 0.008]} />
        <MetalMat finish={finish} />
      </mesh>
      <mesh position={[0, 0.02, 0.022 * Math.sign(z || 1)]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.008, 0.008, 0.04, 10]} />
        <MetalMat finish={finish} />
      </mesh>
      <mesh position={[0, -0.025, 0.04 * Math.sign(z || 1)]}>
        <boxGeometry args={[0.016, 0.1, 0.014]} />
        <MetalMat finish={finish} />
      </mesh>
    </group>
  );
}

/** Imposte en demi-cercle (fenêtre cintrée) : arc de dormant, vitrage et rayons. */
function Fanlight({ r, span, color, tint }: { r: number; span: number; color: string; tint: string }) {
  const glassGeo = useMemo(() => new THREE.CircleGeometry(r - SASH_W, 32, 0, Math.PI), [r]);
  const ringGeo = useMemo(() => {
    const shape = new THREE.Shape();
    shape.absarc(0, 0, r, 0, Math.PI, false);
    shape.lineTo(-(r - SASH_W), 0);
    shape.absarc(0, 0, r - SASH_W, Math.PI, 0, true);
    shape.lineTo(r, 0);
    const g = new THREE.ExtrudeGeometry(shape, { depth: SASH_D, bevelEnabled: false, curveSegments: 32 });
    g.translate(0, 0, -SASH_D / 2);
    return g;
  }, [r]);
  // Écoinçons : le dormant reste rectangulaire, on comble les angles au-dessus de l’arc.
  const spandrelGeo = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(-r, 0);
    shape.lineTo(-r, r);
    shape.lineTo(r, r);
    shape.lineTo(r, 0);
    shape.absarc(0, 0, r, 0, Math.PI, false);
    const g = new THREE.ExtrudeGeometry(shape, { depth: 0.03, bevelEnabled: false, curveSegments: 32 });
    g.translate(0, 0, -0.015);
    return g;
  }, [r]);
  return (
    <group>
      <mesh geometry={ringGeo} castShadow>
        <FrameMat color={color} />
      </mesh>
      <mesh geometry={spandrelGeo}>
        <FrameMat color={color} />
      </mesh>
      <mesh geometry={glassGeo}>
        <Glass tint={tint} />
      </mesh>
      {[Math.PI / 4, Math.PI / 2, (3 * Math.PI) / 4].map((a) => (
        <mesh key={a} position={[Math.cos(a) * (r - SASH_W) * 0.5, Math.sin(a) * (r - SASH_W) * 0.5, 0]} rotation={[0, 0, a - Math.PI / 2]}>
          <boxGeometry args={[GLAZING_BAR, r - SASH_W, SASH_D * 0.6]} />
          <FrameMat color={color} />
        </mesh>
      ))}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[span, SASH_W, SASH_D]} />
        <FrameMat color={color} />
      </mesh>
      {span / 2 - r > 0.005
        ? ([-1, 1] as const).map((s) => (
          <mesh key={`fill${s}`} position={[s * (r + (span / 2 - r) / 2), r / 2, 0]}>
            <boxGeometry args={[span / 2 - r, r, 0.03]} />
            <FrameMat color={color} />
          </mesh>
        ))
        : null}
    </group>
  );
}

/** Rideau plissé (ondes régulières), double face, accroché en haut. */
function Drape({ width, height, color }: { width: number; height: number; color: string }) {
  const geo = useMemo(() => {
    const segX = Math.max(16, Math.round(width / 0.02));
    const g = new THREE.PlaneGeometry(width, height, segX, 1);
    const pos = g.getAttribute('position') as THREE.BufferAttribute;
    const pleat = 0.11;
    for (let i = 0; i < pos.count; i += 1) {
      const x = pos.getX(i);
      pos.setZ(i, Math.sin(((x + width / 2) / pleat) * Math.PI * 2) * 0.03);
    }
    g.computeVertexNormals();
    return g;
  }, [width, height]);
  return (
    <mesh geometry={geo} castShadow receiveShadow>
      <SurfaceMat color={color} finish="velvet" side={THREE.DoubleSide} />
    </mesh>
  );
}

/** Tringle à embouts boules et deux rideaux plissés qui tombent jusqu’au sol. */
function CurtainSet({ w, rodY, rodZ, drapeW, drapeH, color, hardware }: { w: number; rodY: number; rodZ: number; drapeW: number; drapeH: number; color: string; hardware: HomeMetalFinish }) {
  return (
    <group>
      <mesh position={[0, rodY, rodZ]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.012, 0.012, w + 0.5, 12]} />
        <MetalMat finish={hardware} />
      </mesh>
      {([-1, 1] as const).map((s) => (
        <mesh key={`f${s}`} position={[s * (w / 2 + 0.25), rodY, rodZ]}>
          <sphereGeometry args={[0.026, 14, 10]} />
          <MetalMat finish={hardware} />
        </mesh>
      ))}
      {([-1, 1] as const).map((s) => (
        <group key={s} position={[s * (w / 2 + 0.2 - drapeW / 2), rodY - 0.03 - drapeH / 2, rodZ]}>
          <Drape width={drapeW} height={drapeH} color={color} />
        </group>
      ))}
    </group>
  );
}

export function WindowUnit({
  w,
  h,
  wallThickness,
  inSide,
  style,
  frameColor,
  glassTint,
  hardware = 'chrome',
  sillToFloor,
  headroom,
  curtains,
  curtainColor,
}: {
  w: number;
  h: number;
  wallThickness: number;
  inSide: 1 | -1;
  style: WindowUnitStyle;
  frameColor: string;
  glassTint: string;
  hardware?: HomeMetalFinish;
  /** Distance entre le bas de la fenêtre et le sol (m). */
  sillToFloor: number;
  /** Hauteur libre entre le haut de la fenêtre et le plafond (m). */
  headroom: number;
  curtains?: boolean;
  curtainColor?: string;
}) {
  const t = wallThickness;
  // Fenêtre posée en tableau, à 4 cm du nu intérieur : profondeur d’ébrasement visible dehors.
  const frameZ = t > 0.14 ? inSide * (t / 2 - FRAME_D / 2 - 0.04) : 0;
  const sashZ = frameZ + inSide * 0.012;
  const innerW = w - 2 * FRAME_W;
  const innerH = h - 2 * FRAME_W;
  const arched = style === 'arched';
  const fanR = arched ? Math.min(innerW / 2, innerH * 0.45) : 0;
  const leafH = innerH - fanR;
  const leafY = -innerH / 2 + leafH / 2;
  const french = style === 'french';
  const leafW = innerW / 2;
  const cols = french ? 2 : 1;
  const rows = french ? Math.max(3, Math.round(leafH / 0.4)) : 1;

  const interiorFace = inSide * (t / 2);
  const exteriorFace = -inSide * (t / 2);

  const rodY = h / 2 + Math.max(0.06, Math.min(0.18, headroom - 0.06));
  const drapeH = rodY + h / 2 + sillToFloor - 0.015;
  const drapeW = Math.max(0.35, w * 0.32 + 0.12);
  const rodZ = interiorFace + inSide * 0.1;
  const curtainSet = curtains ? (
    <CurtainSet w={w} rodY={rodY} rodZ={rodZ} drapeW={drapeW} drapeH={drapeH} color={curtainColor ?? '#7f1d1d'} hardware={hardware} />
  ) : null;

  if (style === 'bay') {
    // Oriel : avancée en trapèze vers l’extérieur, trois châssis fixes, toit et tablette-banquette.
    const depth = Math.min(0.55, w * 0.3);
    const front = w * 0.62;
    const sideLen = Math.hypot((w - front) / 2, depth);
    const sideAng = Math.atan2(depth, (w - front) / 2);
    const z0 = exteriorFace;
    const out = -inSide;
    return (
      <group>
        <group position={[0, 0, z0 + out * depth]}>
          <Sash w={front} h={h} cols={1} rows={1} color={frameColor} tint={glassTint} />
        </group>
        {([-1, 1] as const).map((s) => (
          <group key={s} position={[s * (front / 2 + (w - front) / 4), 0, z0 + out * depth / 2]} rotation={[0, s * out * sideAng, 0]}>
            <Sash w={sideLen} h={h} color={frameColor} tint={glassTint} />
          </group>
        ))}
        {/* Toit et fond de l’avancée */}
        {([1, -1] as const).map((s) => (
          <mesh key={s} position={[0, s * (h / 2 + 0.03), z0 + out * depth / 2]} castShadow receiveShadow>
            <boxGeometry args={[w + 0.06, 0.06, depth + 0.04]} />
            <SurfaceMat color={s > 0 ? '#57534e' : frameColor} finish={s > 0 ? 'stone' : 'lacquer'} roughness={0.6} />
          </mesh>
        ))}
        {/* Banquette côté pièce */}
        <mesh position={[0, -h / 2 + 0.02, interiorFace - inSide * (t / 2)]} receiveShadow castShadow>
          <boxGeometry args={[w + 0.04, 0.04, t + 0.06]} />
          <SurfaceMat color={frameColor} finish="wood" roughness={0.5} />
        </mesh>
        {curtainSet}
      </group>
    );
  }

  return (
    <group>
      <group position={[0, 0, frameZ]}>
        <OuterFrame w={w} h={h} color={frameColor} />
      </group>
      <group position={[0, 0, sashZ]}>
        {([-1, 1] as const).map((s) => (
          <group key={s} position={[s * (leafW / 2), leafY, 0]}>
            <Sash w={leafW} h={leafH} cols={cols} rows={rows} color={frameColor} tint={glassTint} />
          </group>
        ))}
        {arched ? (
          <group position={[0, -innerH / 2 + leafH, 0]}>
            <Fanlight r={fanR} span={innerW} color={frameColor} tint={glassTint} />
          </group>
        ) : null}
        <group position={[0, leafY, 0]}>
          <Espagnolette x={SASH_W * 0.5} z={inSide * (SASH_D / 2 + 0.004)} finish={hardware} />
        </group>
      </group>

      {/* Tablette intérieure (bois) et appui extérieur en pierre, légèrement en pente */}
      <mesh position={[0, -h / 2 - 0.012, (frameZ + interiorFace) / 2 + inSide * 0.02]} castShadow receiveShadow>
        <boxGeometry args={[w + 0.14, 0.024, Math.abs(interiorFace - frameZ) + 0.04]} />
        <SurfaceMat color={frameColor} finish="lacquer" roughness={0.4} />
      </mesh>
      <mesh
        position={[0, -h / 2 - 0.03, (frameZ + exteriorFace) / 2 - inSide * 0.03]}
        rotation={[inSide * 0.08, 0, 0]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[w + 0.1, 0.05, Math.abs(exteriorFace - frameZ) + 0.06]} />
        <SurfaceMat color="#d6d1c7" finish="stone" roughness={0.75} />
      </mesh>

      {curtainSet}
    </group>
  );
}
