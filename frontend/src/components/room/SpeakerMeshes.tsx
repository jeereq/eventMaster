'use client';

/**
 * Enceintes de sonorisation posées dans la salle : sur trépied, gros baffle au sol
 * (deux boomers et un tweeter, typique des fêtes), ou colonne fine.
 * Repère local : sol à y = 0, façade (grille) vers +Z.
 */
import React from 'react';
import type { SpeakerStyle } from '@/lib/roomMusic';

const CABINET = '#18181b';
const GRILLE = '#27272a';
const CONE = '#0a0a0a';
const METAL = '#3f3f46';

function Driver({ r, z, y, x = 0 }: { r: number; z: number; y: number; x?: number }) {
  return (
    <group position={[x, y, z]}>
      {/* Bague, membrane, cache-noyau */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[r, r, 0.012, 32]} />
        <meshStandardMaterial color={METAL} roughness={0.4} metalness={0.6} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.004]}>
        <cylinderGeometry args={[r * 0.86, r * 0.6, 0.02, 32]} />
        <meshStandardMaterial color={CONE} roughness={0.85} />
      </mesh>
      <mesh position={[0, 0, 0.014]}>
        <sphereGeometry args={[r * 0.22, 16, 12]} />
        <meshStandardMaterial color="#111113" roughness={0.35} metalness={0.3} />
      </mesh>
    </group>
  );
}

function Led({ y, z, x = 0 }: { y: number; z: number; x?: number }) {
  return (
    <mesh position={[x, y, z]}>
      <sphereGeometry args={[0.012, 8, 6]} />
      <meshStandardMaterial color="#60a5fa" emissive="#3b82f6" emissiveIntensity={1.4} toneMapped={false} />
    </mesh>
  );
}

/** Enceinte sur trépied : caisson trapézoïdal posé sur un mât, trois pieds écartés. */
function ColumnSpeaker({ body, scale }: { body: string; scale: number }) {
  const boxW = 0.36 * scale;
  const boxH = 0.58 * scale;
  const boxD = 0.32 * scale;
  const top = 2.05 * scale;
  const boxY = top - boxH / 2;
  const mastTop = boxY - boxH / 2;
  return (
    <group>
      {/* Trépied */}
      {[0, 1, 2].map((i) => {
        const a = (i / 3) * Math.PI * 2 + Math.PI / 6;
        return (
          <mesh key={i} position={[Math.sin(a) * 0.2, 0.32, Math.cos(a) * 0.2]} rotation={[-Math.cos(a) * 0.55, 0, Math.sin(a) * 0.55]} castShadow>
            <cylinderGeometry args={[0.012, 0.014, 0.76, 8]} />
            <meshStandardMaterial color="#111113" roughness={0.45} metalness={0.5} />
          </mesh>
        );
      })}
      <mesh position={[0, mastTop / 2 + 0.3, 0]} castShadow>
        <cylinderGeometry args={[0.018, 0.022, mastTop - 0.6, 10]} />
        <meshStandardMaterial color={METAL} roughness={0.35} metalness={0.7} />
      </mesh>
      <mesh position={[0, 0.62, 0]}>
        <cylinderGeometry args={[0.035, 0.035, 0.08, 12]} />
        <meshStandardMaterial color="#111113" roughness={0.5} metalness={0.4} />
      </mesh>
      {/* Caisson */}
      <mesh position={[0, boxY, 0]} castShadow receiveShadow>
        <boxGeometry args={[boxW, boxH, boxD]} />
        <meshStandardMaterial color={body} roughness={0.7} />
      </mesh>
      <mesh position={[0, boxY, boxD / 2 + 0.002]}>
        <boxGeometry args={[boxW * 0.9, boxH * 0.92, 0.006]} />
        <meshStandardMaterial color={GRILLE} roughness={0.95} />
      </mesh>
      <Driver r={0.13 * scale} y={boxY - boxH * 0.14} z={boxD / 2 + 0.006} />
      <mesh position={[0, boxY + boxH * 0.3, boxD / 2 + 0.008]}>
        <boxGeometry args={[boxW * 0.5, 0.06 * scale, 0.02]} />
        <meshStandardMaterial color={CONE} roughness={0.5} />
      </mesh>
      <Led y={boxY - boxH * 0.44} z={boxD / 2 + 0.01} />
    </group>
  );
}

/** Gros baffle au sol : deux boomers, un pavillon d'aigu, poignées et roulettes. */
function BaffleSpeaker({ body, w, d }: { body: string; w: number; d: number }) {
  const boxW = Math.max(0.5, Math.min(w, 0.9));
  const boxD = Math.max(0.4, Math.min(d, 0.75));
  const boxH = 1.2;
  const front = boxD / 2;
  const r = Math.min(boxW * 0.38, 0.22);
  return (
    <group>
      {[-1, 1].flatMap((sx) => [-1, 1].map((sz) => (
        <mesh key={`${sx}${sz}`} position={[sx * (boxW / 2 - 0.06), 0.03, sz * (boxD / 2 - 0.06)]}>
          <cylinderGeometry args={[0.03, 0.03, 0.05, 12]} />
          <meshStandardMaterial color="#111113" roughness={0.6} />
        </mesh>
      )))}
      <mesh position={[0, 0.05 + boxH / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[boxW, boxH, boxD]} />
        <meshStandardMaterial color={body} roughness={0.75} />
      </mesh>
      {/* Coins métal */}
      {[-1, 1].flatMap((sx) => [0.08, 0.05 + boxH - 0.03].map((y) => (
        <mesh key={`${sx}${y}`} position={[sx * (boxW / 2 - 0.02), y, front - 0.02]}>
          <boxGeometry args={[0.05, 0.05, 0.05]} />
          <meshStandardMaterial color={METAL} roughness={0.3} metalness={0.8} />
        </mesh>
      )))}
      <mesh position={[0, 0.05 + boxH / 2, front + 0.002]}>
        <boxGeometry args={[boxW * 0.92, boxH * 0.94, 0.006]} />
        <meshStandardMaterial color={GRILLE} roughness={0.95} />
      </mesh>
      <Driver r={r} y={0.05 + boxH * 0.24} z={front + 0.006} />
      <Driver r={r} y={0.05 + boxH * 0.58} z={front + 0.006} />
      {/* Pavillon d'aigu */}
      <mesh position={[0, 0.05 + boxH * 0.86, front + 0.02]}>
        <boxGeometry args={[boxW * 0.5, 0.12, 0.04]} />
        <meshStandardMaterial color={CONE} roughness={0.4} metalness={0.2} />
      </mesh>
      {/* Poignées latérales */}
      {[-1, 1].map((sx) => (
        <mesh key={sx} position={[sx * (boxW / 2 + 0.01), 0.05 + boxH * 0.72, 0]}>
          <boxGeometry args={[0.02, 0.05, 0.16]} />
          <meshStandardMaterial color={METAL} roughness={0.3} metalness={0.8} />
        </mesh>
      ))}
      <Led y={0.05 + boxH * 0.06} z={front + 0.01} />
    </group>
  );
}

/** Colonne fine : socle carré, colonne de petits haut-parleurs. */
function TowerSpeaker({ body }: { body: string }) {
  const colH = 1.85;
  return (
    <group>
      <mesh position={[0, 0.015, 0]} receiveShadow castShadow>
        <boxGeometry args={[0.36, 0.03, 0.36]} />
        <meshStandardMaterial color="#111113" roughness={0.4} metalness={0.4} />
      </mesh>
      <mesh position={[0, 0.03 + colH / 2, 0]} castShadow>
        <boxGeometry args={[0.13, colH, 0.14]} />
        <meshStandardMaterial color={body} roughness={0.6} />
      </mesh>
      {Array.from({ length: 6 }).map((_, i) => (
        <Driver key={i} r={0.04} y={0.95 + i * 0.13} z={0.075} />
      ))}
      <Led y={0.12} z={0.075} />
    </group>
  );
}

export function SpeakerMesh({
  style,
  w,
  d,
  color,
  selected = false,
}: {
  style: SpeakerStyle;
  w: number;
  d: number;
  color?: string;
  selected?: boolean;
}) {
  const body = selected ? '#c7d2fe' : color ?? CABINET;
  if (style === 'baffle') return <BaffleSpeaker body={body} w={w} d={d} />;
  if (style === 'tower') return <TowerSpeaker body={body} />;
  return <ColumnSpeaker body={body} scale={1} />;
}
