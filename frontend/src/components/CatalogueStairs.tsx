'use client';

import React, { useMemo } from 'react';
import { getStairWoodMap } from '@/lib/roomWebGLMaterials';

/** Escalier d’étage : marches, limons, garde-corps et palier haut. */
export function CatalogueInterstoryStairs({
  widthM,
  runM,
  riseM,
  steps = 12,
  selected = false,
  openRisers = false,
}: {
  /** Largeur utile des marches (m). */
  widthM: number;
  /** Longueur de la course (m). */
  runM: number;
  /** Hauteur totale à franchir (m). */
  riseM: number;
  steps?: number;
  selected?: boolean;
  /** Contremarches ouvertes (style loft). */
  openRisers?: boolean;
}) {
  const wood = useMemo(() => getStairWoodMap(), []);
  const n = Math.max(4, Math.min(24, Math.round(steps)));
  const rise = Math.max(0.6, riseM);
  const run = Math.max(1.6, runM);
  const w = Math.max(0.85, widthM);
  const stepH = rise / n;
  const tread = run / n;
  const railH = 0.92;
  const selectedTint = selected ? '#c7d2fe' : undefined;
  const treadColor = selectedTint ?? '#f5f5f4';
  const riserColor = selectedTint ?? '#78716c';
  const stringerColor = selectedTint ?? '#57534e';
  const metalColor = '#a8a29e';

  const incline = Math.atan2(rise, run);
  const hypotenuse = Math.hypot(rise, run);

  const posts = useMemo(() => {
    const count = Math.max(4, Math.ceil(n / 2) + 1);
    return Array.from({ length: count }).map((_, i) => {
      const t = i / (count - 1);
      return {
        z: -run / 2 + run * t,
        y: stepH * Math.min(n, Math.round(t * n)) + 0.04,
        t,
      };
    });
  }, [n, run, stepH]);

  return (
    <group>
      {/* Limons latéraux */}
      {([-1, 1] as const).map((side) => (
        <mesh
          key={`stringer-${side}`}
          position={[side * (w / 2 + 0.04), rise / 2, 0]}
          rotation={[incline, 0, 0]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[0.08, 0.28, hypotenuse + 0.15]} />
          <meshStandardMaterial color={stringerColor} map={wood} roughness={0.7} metalness={0.05} />
        </mesh>
      ))}

      {/* Marches */}
      {Array.from({ length: n }).map((_, i) => {
        const y = stepH * i;
        const z = -run / 2 + tread * (i + 0.5);
        return (
          <group key={i} position={[0, y, z]}>
            {!openRisers ? (
              <mesh position={[0, stepH / 2, -tread * 0.42]} castShadow receiveShadow>
                <boxGeometry args={[w * 0.96, stepH, Math.max(0.04, tread * 0.28)]} />
                <meshStandardMaterial color={riserColor} map={wood} roughness={0.78} />
              </mesh>
            ) : null}
            {/* Marche + nez */}
            <mesh position={[0, stepH + 0.018, tread * 0.05]} castShadow receiveShadow>
              <boxGeometry args={[w * 0.98, 0.045, tread * 0.92]} />
              <meshStandardMaterial color={treadColor} map={wood} roughness={0.52} metalness={0.04} />
            </mesh>
            {/* Nez de marche */}
            <mesh position={[0, stepH + 0.03, tread * 0.42]} castShadow>
              <boxGeometry args={[w * 0.98, 0.02, 0.035]} />
              <meshStandardMaterial color="#44403c" roughness={0.55} metalness={0.15} />
            </mesh>
            {/* Bande antidérapante */}
            <mesh position={[0, stepH + 0.042, tread * 0.32]}>
              <boxGeometry args={[w * 0.88, 0.006, 0.035]} />
              <meshStandardMaterial color="#1c1917" roughness={0.95} />
            </mesh>
          </group>
        );
      })}

      {/* Palier haut (arrivée étage) */}
      <mesh position={[0, rise + 0.04, run / 2 + 0.28]} castShadow receiveShadow>
        <boxGeometry args={[w * 1.05, 0.08, 0.65]} />
        <meshStandardMaterial color={treadColor} map={wood} roughness={0.5} />
      </mesh>
      {/* Rebord du palier */}
      <mesh position={[0, rise + 0.09, run / 2 + 0.55]} castShadow>
        <boxGeometry args={[w * 1.05, 0.04, 0.06]} />
        <meshStandardMaterial color={stringerColor} roughness={0.65} />
      </mesh>

      {/* Garde-corps */}
      {([-1, 1] as const).map((side) => (
        <group key={`rail-${side}`}>
          {/* Main courante inclinée */}
          <mesh
            position={[side * (w * 0.5 + 0.02), rise * 0.5 + railH * 0.55, 0]}
            rotation={[incline - Math.PI / 2, 0, 0]}
            castShadow
          >
            <cylinderGeometry args={[0.028, 0.028, hypotenuse * 0.98, 12]} />
            <meshStandardMaterial color={metalColor} metalness={0.78} roughness={0.22} />
          </mesh>
          {/* Lisse basse */}
          <mesh
            position={[side * (w * 0.5 + 0.02), rise * 0.5 + railH * 0.22, 0]}
            rotation={[incline - Math.PI / 2, 0, 0]}
            castShadow
          >
            <cylinderGeometry args={[0.016, 0.016, hypotenuse * 0.92, 10]} />
            <meshStandardMaterial color="#78716c" metalness={0.7} roughness={0.28} />
          </mesh>
          {/* Montants */}
          {posts.map((p, pi) => (
            <mesh
              key={pi}
              position={[side * (w * 0.5 + 0.02), p.y + railH * 0.45, p.z]}
              castShadow
            >
              <cylinderGeometry args={[0.016, 0.016, Math.max(0.35, railH * 0.9), 8]} />
              <meshStandardMaterial color="#78716c" metalness={0.68} roughness={0.3} />
            </mesh>
          ))}
          {/* Poteau sommet palier */}
          <mesh position={[side * (w * 0.5 + 0.02), rise + railH / 2 + 0.08, run / 2 + 0.35]} castShadow>
            <cylinderGeometry args={[0.03, 0.03, railH, 12]} />
            <meshStandardMaterial color={metalColor} metalness={0.75} roughness={0.25} />
          </mesh>
          {/* Main courante palier */}
          <mesh
            position={[side * (w * 0.5 + 0.02), rise + railH + 0.04, run / 2 + 0.28]}
            rotation={[0, 0, Math.PI / 2]}
            castShadow
          >
            <cylinderGeometry args={[0.022, 0.022, 0.55, 10]} />
            <meshStandardMaterial color={metalColor} metalness={0.78} roughness={0.22} />
          </mesh>
        </group>
      ))}

      {/* Ombre / volume sous escalier (caisson) */}
      <mesh position={[0, rise * 0.28, -run * 0.08]} rotation={[incline, 0, 0]} receiveShadow>
        <boxGeometry args={[w * 0.88, 0.04, hypotenuse * 0.75]} />
        <meshStandardMaterial color="#44403c" roughness={0.9} transparent opacity={0.55} />
      </mesh>
    </group>
  );
}

/** Dimensions recommandées pour un escalier entre deux élévations. */
export function suggestStairDimensions(opts: {
  riseM: number;
  canvasWidthM: number;
  canvasDepthM: number;
}): { widthM: number; runM: number; steps: number; wPct: number; hPct: number } {
  const riseM = Math.max(0.8, opts.riseM);
  const steps = Math.max(6, Math.min(22, Math.round(riseM / 0.175)));
  const treadIdeal = 0.28;
  const runM = Math.min(
    opts.canvasDepthM * 0.55,
    Math.max(2.2, steps * treadIdeal),
  );
  const widthM = Math.min(2.2, Math.max(1.05, opts.canvasWidthM * 0.1));
  return {
    widthM,
    runM,
    steps,
    wPct: Math.max(6, Math.min(28, (widthM / opts.canvasWidthM) * 100)),
    hPct: Math.max(12, Math.min(55, (runM / opts.canvasDepthM) * 100)),
  };
}

/** Utilitaire : angle d’inclinaison (debug / UI). */
export function stairInclineDeg(riseM: number, runM: number): number {
  return (Math.atan2(riseM, runM) * 180) / Math.PI;
}
