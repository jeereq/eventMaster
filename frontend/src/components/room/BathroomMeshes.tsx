'use client';

/**
 * Salle de bain 3D : baignoires creuses (îlot, encastrée, sabot sur pieds),
 * vasque à poser, WC, douche à l’italienne vitrée et sèche-serviettes.
 *
 * Les cuves sont des volumes de révolution (profil extérieur + rebord + profil
 * intérieur), mis à l’échelle en ovale : on voit le fond, le rebord et l’eau
 * à l’intérieur, comme une vraie baignoire. Origine : centre de l’empreinte,
 * au sol ; la face « usage » regarde +Z.
 */

import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { RoundedBox } from '@react-three/drei';
import { SurfaceMat } from '@/components/room/SurfaceMaterial';
import type { HomeMetalFinish } from '@/lib/roomHomeFurniture';

type Props = { w: number; d: number; color?: string; selected?: boolean; metalFinish?: HomeMetalFinish };

const SEL = '#c7d2fe';
const CERAMIC = '#f8f6f1';
const WATER = '#bfe1e8';

function tint(color: string, selected?: boolean) {
  return selected ? SEL : color;
}

/** Robinetterie : chrome poli, laiton brossé ou noir mat. */
export function MetalMat({ finish = 'chrome' }: { finish?: HomeMetalFinish }) {
  if (finish === 'brass') return <SurfaceMat color="#b08d57" finish="brass" roughness={0.3} metalness={0.95} />;
  if (finish === 'black') return <SurfaceMat color="#1f1f1f" finish="metal" roughness={0.55} metalness={0.6} />;
  return <SurfaceMat color="#e5e7eb" finish="chrome" roughness={0.06} metalness={1} />;
}

function Ceramic({ color = CERAMIC, selected }: { color?: string; selected?: boolean }) {
  return <SurfaceMat color={tint(color, selected)} finish="ceramic" roughness={0.12} clearcoat={0.8} clearcoatRoughness={0.06} side={THREE.DoubleSide} />;
}

function Water() {
  return (
    <meshPhysicalMaterial
      color={WATER}
      roughness={0.03}
      metalness={0}
      ior={1.33}
      transparent
      opacity={0.62}
      clearcoat={1}
      clearcoatRoughness={0.02}
      envMapIntensity={1.6}
      depthWrite={false}
    />
  );
}

/** Géométrie de révolution libérée au démontage. */
function useLathe(profile: Array<[number, number]>, segments = 48) {
  const key = profile.map(([r, y]) => `${r.toFixed(3)},${y.toFixed(3)}`).join(';');
  const geo = useMemo(
    () => new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(Math.max(0.0005, r), y)), segments),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key, segments],
  );
  useEffect(() => () => geo.dispose(), [geo]);
  return geo;
}

/**
 * Profil d’une cuve (rayon 0,5 normalisé, hauteur `h`) : fond, flanc extérieur,
 * rebord arrondi, flanc intérieur jusqu’au fond de cuve.
 */
function tubProfile(h: number, rim = 0.055, wall = 0.045, flare = 0.03): Array<[number, number]> {
  const R = 0.5;
  const inner = R - wall;
  return [
    [0, 0],
    [R - flare - 0.08, 0],
    [R - flare - 0.02, 0.012],
    [R - flare, 0.05],
    [R - 0.004, h * 0.72],
    [R, h - rim * 0.5],
    [R - 0.008, h - 0.004],
    [R - wall * 0.5, h],
    [inner + 0.004, h - 0.006],
    [inner, h - rim],
    [inner - 0.012, h * 0.45],
    [inner - 0.06, 0.09],
    [inner - 0.14, 0.06],
    [0, 0.055],
  ];
}

/** Cuve ovale creuse mise à l’échelle de l’empreinte (eau à 70 % de la hauteur). */
function OvalTub({ w, d, h, color, selected, waterLevel = 0.68 }: { w: number; d: number; h: number; color?: string; selected?: boolean; waterLevel?: number }) {
  const geo = useLathe(tubProfile(h));
  const inner = 0.5 - 0.045;
  const waterY = h * waterLevel;
  // Rayon de la cuve à la hauteur de l’eau (le flanc intérieur rentre en descendant).
  const waterR = inner - 0.012 * (1 - waterLevel) - 0.004;
  return (
    <group scale={[w, 1, d]}>
      <mesh geometry={geo} castShadow receiveShadow>
        <Ceramic color={color} selected={selected} />
      </mesh>
      <mesh position={[0, waterY, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[waterR, 48]} />
        <Water />
      </mesh>
    </group>
  );
}

/** Mitigeur sur colonne au sol (baignoire îlot). */
function FloorMixer({ h, finish }: { h: number; finish?: HomeMetalFinish }) {
  return (
    <group>
      <mesh position={[0, h * 0.95 / 2 + 0.01, 0]} castShadow>
        <cylinderGeometry args={[0.022, 0.026, h * 0.95, 16]} />
        <MetalMat finish={finish} />
      </mesh>
      <mesh position={[0, 0.006, 0]}>
        <cylinderGeometry args={[0.06, 0.06, 0.012, 24]} />
        <MetalMat finish={finish} />
      </mesh>
      {/* Bec verseur recourbé */}
      <mesh position={[0, h * 0.95 + 0.06, 0.07]} rotation={[0, 0, 0]} castShadow>
        <torusGeometry args={[0.07, 0.016, 10, 24, Math.PI]} />
        <MetalMat finish={finish} />
      </mesh>
      <mesh position={[0, h * 0.95 - 0.02, -0.04]} castShadow>
        <boxGeometry args={[0.015, 0.06, 0.07]} />
        <MetalMat finish={finish} />
      </mesh>
    </group>
  );
}

/** Baignoire îlot ovale, mitigeur sur colonne. */
export function IslandBathtub({ w, d, color, selected, metalFinish }: Props) {
  const h = 0.58;
  return (
    <group>
      <OvalTub w={w} d={d} h={h} color={color} selected={selected} />
      <group position={[w / 2 + 0.12, 0, 0]}>
        <FloorMixer h={h + 0.32} finish={metalFinish} />
      </group>
    </group>
  );
}

/** Baignoire encastrée : tablier carrelé, plage de pose, cuve ovale, robinetterie sur la plage. */
export function BuiltInBathtub({ w, d, color, selected, metalFinish }: Props) {
  const h = 0.56;
  const deckT = 0.04;
  const basinW = Math.max(0.6, w - 0.22);
  const basinD = Math.max(0.45, d - 0.18);
  const deckGeo = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(-w / 2, -d / 2);
    shape.lineTo(w / 2, -d / 2);
    shape.lineTo(w / 2, d / 2);
    shape.lineTo(-w / 2, d / 2);
    shape.closePath();
    const hole = new THREE.Path();
    hole.absellipse(0, 0, basinW / 2 * 0.91, basinD / 2 * 0.91, 0, Math.PI * 2, false, 0);
    shape.holes.push(hole);
    const g = new THREE.ExtrudeGeometry(shape, { depth: deckT, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.006, bevelSegments: 2, curveSegments: 48 });
    g.rotateX(-Math.PI / 2);
    return g;
  }, [w, d, basinW, basinD]);
  useEffect(() => () => deckGeo.dispose(), [deckGeo]);
  return (
    <group>
      {/* Tablier (face avant et côtés) */}
      <mesh position={[0, (h - deckT) / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[w - 0.01, h - deckT, d - 0.01]} />
        <SurfaceMat color={tint('#ece8e1', selected)} finish="stone" roughness={0.35} />
      </mesh>
      <mesh geometry={deckGeo} position={[0, h - deckT, 0]} castShadow receiveShadow>
        <SurfaceMat color={tint('#f1eee8', selected)} finish="stone" roughness={0.22} />
      </mesh>
      <group position={[0, h - deckT - (h - 0.12), 0]}>
        <OvalTub w={basinW} d={basinD} h={h - 0.12} color={color} selected={selected} waterLevel={0.75} />
      </group>
      {/* Mitigeur bain-douche sur la plage, côté tête */}
      <group position={[-w / 2 + 0.11, h, -d / 2 + 0.1]}>
        <mesh position={[0, 0.05, 0]} castShadow>
          <cylinderGeometry args={[0.02, 0.022, 0.1, 14]} />
          <MetalMat finish={metalFinish} />
        </mesh>
        <mesh position={[0.06, 0.09, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.012, 0.012, 0.13, 10]} />
          <MetalMat finish={metalFinish} />
        </mesh>
      </group>
    </group>
  );
}

/** Pied griffe (sabot) : boule + jambe galbée. */
function ClawFoot({ finish }: { finish?: HomeMetalFinish }) {
  return (
    <group>
      <mesh position={[0, 0.03, 0]} castShadow>
        <sphereGeometry args={[0.035, 14, 10]} />
        <MetalMat finish={finish ?? 'brass'} />
      </mesh>
      <mesh position={[0, 0.09, 0]} castShadow>
        <cylinderGeometry args={[0.022, 0.03, 0.1, 12]} />
        <MetalMat finish={finish ?? 'brass'} />
      </mesh>
    </group>
  );
}

/** Baignoire sabot rétro sur pieds de lion : extérieur peint (couleur choisie), intérieur émaillé blanc. */
export function ClawfootBathtub({ w, d, color, selected, metalFinish }: Props) {
  const h = 0.6;
  const lift = 0.13;
  const outer = useLathe(tubProfile(h, 0.07, 0.04, 0.06));
  const inside = useLathe(
    [
      [0.5 - 0.04, h - 0.002],
      [0.5 - 0.04 - 0.004, h - 0.07],
      [0.5 - 0.06, h * 0.45],
      [0.5 - 0.11, 0.09],
      [0.2, 0.065],
      [0, 0.064],
    ],
  );
  const finish = metalFinish ?? 'brass';
  return (
    <group>
      <group position={[0, lift, 0]} scale={[w * 0.96, 1, d * 0.94]}>
        <mesh geometry={outer} castShadow receiveShadow>
          <SurfaceMat color={tint(color ?? '#1f3a4d', selected)} finish="lacquer" roughness={0.28} side={THREE.DoubleSide} />
        </mesh>
        <mesh geometry={inside} position={[0, 0.001, 0]}>
          <Ceramic selected={selected} />
        </mesh>
        <mesh position={[0, h * 0.66, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.5 - 0.07, 48]} />
          <Water />
        </mesh>
      </group>
      {([-1, 1] as const).flatMap((sx) => ([-1, 1] as const).map((sz) => (
        <group key={`${sx}${sz}`} position={[sx * w * 0.33, 0, sz * d * 0.3]}>
          <ClawFoot finish={finish} />
        </group>
      )))}
      {/* Robinet col de cygne en bout de baignoire */}
      <group position={[-w * 0.47, lift + h, 0]}>
        <mesh position={[0, 0.08, 0]} castShadow>
          <cylinderGeometry args={[0.014, 0.016, 0.16, 12]} />
          <MetalMat finish={finish} />
        </mesh>
        <mesh position={[0.06, 0.16, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <torusGeometry args={[0.06, 0.012, 8, 20, Math.PI]} />
          <MetalMat finish={finish} />
        </mesh>
      </group>
    </group>
  );
}

/** Vasque à poser creuse (bol en céramique) avec bonde et mitigeur haut. */
export function VesselSink({ radius = 0.2, finish }: { radius?: number; finish?: HomeMetalFinish }) {
  const geo = useLathe(
    [
      [0, 0],
      [radius * 0.55, 0],
      [radius * 0.92, 0.04],
      [radius, 0.1],
      [radius * 0.99, 0.13],
      [radius * 0.94, 0.135],
      [radius * 0.9, 0.11],
      [radius * 0.82, 0.05],
      [radius * 0.45, 0.022],
      [0, 0.018],
    ],
    40,
  );
  return (
    <group>
      <mesh geometry={geo} castShadow receiveShadow>
        <Ceramic />
      </mesh>
      <mesh position={[0, 0.021, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.022, 20]} />
        <MetalMat finish={finish} />
      </mesh>
    </group>
  );
}

/** WC au sol à réservoir attenant : cuvette, abattant, réservoir et bouton de chasse. */
export function Toilet({ w, d, color, selected, metalFinish }: Props) {
  const bowlH = 0.4;
  const bowlD = Math.min(d * 0.7, 0.5);
  const bowlW = Math.min(w * 0.95, 0.38);
  const pedestal = useLathe([[0, 0], [0.12, 0], [0.13, 0.02], [0.1, 0.2], [0.14, 0.3], [0, 0.3]], 32);
  const bowl = useLathe([[0, 0.12], [0.3, 0.13], [0.46, 0.22], [0.5, 0.37], [0.49, 0.4], [0.45, 0.4], [0.42, 0.33], [0.3, 0.2], [0.1, 0.17], [0, 0.17]], 40);
  const zBowl = d / 2 - bowlD / 2 - 0.02;
  return (
    <group>
      <group position={[0, 0, zBowl]} scale={[bowlW * 1.0, 1, bowlD]}>
        <mesh geometry={pedestal} scale={[1.4, 1, 1.4]} castShadow receiveShadow>
          <Ceramic color={color} selected={selected} />
        </mesh>
        <mesh geometry={bowl} castShadow receiveShadow>
          <Ceramic color={color} selected={selected} />
        </mesh>
        {/* Eau au fond de la cuvette */}
        <mesh position={[0, 0.22, 0.05]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.2, 28]} />
          <Water />
        </mesh>
        {/* Abattant fermé */}
        <mesh position={[0, bowlH + 0.012, 0]} scale={[1, 1, 1]} castShadow>
          <cylinderGeometry args={[0.49, 0.49, 0.022, 40]} />
          <SurfaceMat color={tint('#fbfaf7', selected)} finish="lacquer" roughness={0.25} />
        </mesh>
      </group>
      {/* Réservoir */}
      <RoundedBox args={[Math.min(w, 0.4), 0.38, 0.17]} radius={0.03} smoothness={3} position={[0, bowlH + 0.2, -d / 2 + 0.1]} castShadow receiveShadow>
        <Ceramic color={color} selected={selected} />
      </RoundedBox>
      <mesh position={[0, bowlH + 0.395, -d / 2 + 0.1]} castShadow>
        <cylinderGeometry args={[0.025, 0.025, 0.012, 20]} />
        <MetalMat finish={metalFinish} />
      </mesh>
    </group>
  );
}

/** Douche à l’italienne : receveur extra-plat, caniveau, paroi vitrée fixe, pomme de pluie et mitigeur. */
export function WalkInShower({ w, d, color, selected, metalFinish }: Props) {
  const trayH = 0.035;
  const glassW = Math.max(0.6, w * 0.62);
  const glassH = 2;
  const profileColor = metalFinish === 'black' ? 'black' : metalFinish;
  return (
    <group>
      {/* Receveur */}
      <RoundedBox args={[w, trayH, d]} radius={0.012} smoothness={2} position={[0, trayH / 2, 0]} receiveShadow>
        <SurfaceMat color={tint(color ?? '#e9e6df', selected)} finish="stone" roughness={0.55} />
      </RoundedBox>
      {/* Caniveau linéaire le long du mur */}
      <mesh position={[0, trayH + 0.001, -d / 2 + 0.08]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[w * 0.8, 0.06]} />
        <MetalMat finish={metalFinish} />
      </mesh>
      {/* Paroi vitrée fixe côté entrée, avec profilé et barre de maintien au plafond */}
      <group position={[w / 2 - glassW / 2, trayH, d / 2 - 0.02]}>
        <mesh position={[0, glassH / 2, 0]}>
          <boxGeometry args={[glassW, glassH, 0.008]} />
          <SurfaceMat color="#d8ecee" finish="glass" opacity={0.1} envMapIntensity={0.9} />
        </mesh>
        <mesh position={[0, 0.01, 0]}>
          <boxGeometry args={[glassW, 0.02, 0.02]} />
          <MetalMat finish={profileColor} />
        </mesh>
        <mesh position={[-glassW / 2, glassH - 0.02, -d / 2 + 0.01]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.008, 0.008, d - 0.02, 8]} />
          <MetalMat finish={profileColor} />
        </mesh>
      </group>
      {/* Pomme de pluie carrée sur bras mural */}
      <group position={[0, 2.08, -d / 2]}>
        <mesh position={[0, 0, 0.18]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.011, 0.011, 0.36, 10]} />
          <MetalMat finish={metalFinish} />
        </mesh>
        <mesh position={[0, -0.02, 0.36]} castShadow>
          <boxGeometry args={[0.3, 0.012, 0.3]} />
          <MetalMat finish={metalFinish} />
        </mesh>
      </group>
      {/* Mitigeur thermostatique */}
      <group position={[w * 0.25, 1.05, -d / 2 + 0.02]}>
        <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.05, 0.05, 0.03, 24]} />
          <MetalMat finish={metalFinish} />
        </mesh>
        <mesh position={[0, 0, 0.03]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.01, 0.01, 0.1, 10]} />
          <MetalMat finish={metalFinish} />
        </mesh>
      </group>
    </group>
  );
}

/** Sèche-serviettes échelle, fixé au mur, avec une serviette pliée. */
export function TowelRail({ w, d, color, selected, metalFinish }: Props) {
  const h = 1.2;
  const rails = 9;
  const z = -d / 2 + 0.05;
  return (
    <group>
      {([-1, 1] as const).map((s) => (
        <mesh key={s} position={[s * (w / 2 - 0.02), 0.15 + h / 2, z]} castShadow>
          <cylinderGeometry args={[0.016, 0.016, h, 12]} />
          <MetalMat finish={metalFinish} />
        </mesh>
      ))}
      {Array.from({ length: rails }).map((_, i) => (
        <mesh key={i} position={[0, 0.2 + (i * (h - 0.1)) / (rails - 1), z]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.01, 0.01, w - 0.04, 10]} />
          <MetalMat finish={metalFinish} />
        </mesh>
      ))}
      {/* Serviette pliée sur un barreau */}
      <RoundedBox args={[w * 0.8, 0.42, 0.03]} radius={0.012} smoothness={2} position={[0, 0.15 + h * 0.62, z + 0.025]} castShadow>
        <SurfaceMat color={tint(color ?? '#e9e2d6', selected)} finish="fabric" roughness={0.95} />
      </RoundedBox>
    </group>
  );
}
