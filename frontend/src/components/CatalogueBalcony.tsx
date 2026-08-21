'use client';

import React from 'react';
import type { BalconySide } from '@/lib/roomBuildingUtils';

/** Plateforme de balcon avec garde-corps. */
export function CatalogueBalcony({
  w,
  d,
  selected = false,
  side = 'south',
  color = '#d6d3d1',
}: {
  w: number;
  d: number;
  selected?: boolean;
  side?: BalconySide | string;
  color?: string;
}) {
  const deckH = 0.12;
  const railH = 1.05;
  const deckColor = selected ? '#c7d2fe' : color;
  const railColor = selected ? '#93c5fd' : '#a8a29e';

  // Orientation : le garde-corps ouvert est du côté « extérieur ».
  const openEdge =
    side === 'north' ? 'negZ' :
    side === 'east' ? 'posX' :
    side === 'west' ? 'negX' :
    'posZ';

  const posts: [number, number][] = [];
  const nx = Math.max(2, Math.ceil(w / 0.9));
  const nz = Math.max(2, Math.ceil(d / 0.9));
  for (let i = 0; i <= nx; i += 1) {
    const x = -w / 2 + (i / nx) * w;
    posts.push([x, -d / 2]);
    posts.push([x, d / 2]);
  }
  for (let j = 1; j < nz; j += 1) {
    const z = -d / 2 + (j / nz) * d;
    posts.push([-w / 2, z]);
    posts.push([w / 2, z]);
  }

  const uniquePosts = posts.filter((p, i, arr) =>
    arr.findIndex((q) => Math.abs(q[0] - p[0]) < 0.01 && Math.abs(q[1] - p[1]) < 0.01) === i,
  );

  return (
    <group>
      {/* Dalle */}
      <mesh position={[0, deckH / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, deckH, d]} />
        <meshStandardMaterial color={deckColor} roughness={0.88} metalness={0.05} />
      </mesh>
      {/* Sous-face / consoles */}
      {([-0.28, 0, 0.28] as const).map((t, i) => (
        <mesh
          key={i}
          position={[
            openEdge === 'posX' || openEdge === 'negX' ? (openEdge === 'posX' ? -w * 0.15 : w * 0.15) : t * w,
            -0.08,
            openEdge === 'posZ' || openEdge === 'negZ' ? (openEdge === 'posZ' ? -d * 0.15 : d * 0.15) : t * d,
          ]}
          castShadow
        >
          <boxGeometry
            args={
              openEdge === 'posX' || openEdge === 'negX'
                ? [w * 0.55, 0.08, 0.12]
                : [0.12, 0.08, d * 0.55]
            }
          />
          <meshStandardMaterial color="#78716c" roughness={0.8} />
        </mesh>
      ))}

      {/* Montants garde-corps */}
      {uniquePosts.map(([x, z], i) => (
        <mesh key={i} position={[x, deckH + railH / 2, z]} castShadow>
          <cylinderGeometry args={[0.025, 0.025, railH, 8]} />
          <meshStandardMaterial color={railColor} metalness={0.7} roughness={0.28} />
        </mesh>
      ))}

      {/* Lisses horizontales */}
      {(
        [
          { pos: [0, deckH + railH, -d / 2] as [number, number, number], len: w, rotY: 0 },
          { pos: [0, deckH + railH, d / 2] as [number, number, number], len: w, rotY: 0 },
          { pos: [-w / 2, deckH + railH, 0] as [number, number, number], len: d, rotY: Math.PI / 2 },
          { pos: [w / 2, deckH + railH, 0] as [number, number, number], len: d, rotY: Math.PI / 2 },
          { pos: [0, deckH + railH * 0.45, -d / 2] as [number, number, number], len: w, rotY: 0 },
          { pos: [0, deckH + railH * 0.45, d / 2] as [number, number, number], len: w, rotY: 0 },
          { pos: [-w / 2, deckH + railH * 0.45, 0] as [number, number, number], len: d, rotY: Math.PI / 2 },
          { pos: [w / 2, deckH + railH * 0.45, 0] as [number, number, number], len: d, rotY: Math.PI / 2 },
        ] as const
      ).map((rail, i) => (
        <mesh key={i} position={rail.pos} rotation={[0, rail.rotY, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.018, 0.018, rail.len, 8]} />
          <meshStandardMaterial color={railColor} metalness={0.75} roughness={0.25} />
        </mesh>
      ))}
    </group>
  );
}
