'use client';

import React, { useMemo } from 'react';
import * as THREE from 'three';
import { getStairWoodMap } from '@/lib/roomWebGLMaterials';
import type { StairStyle } from '@/lib/roomStairsUtils';

/** Escalier d’étage : marches, limons, garde-corps et palier haut avec rendu réaliste. */
export function CatalogueInterstoryStairs({
  widthM,
  runM,
  riseM,
  steps = 12,
  selected = false,
  style = 'straight',
}: {
  /** Largeur utile des marches (m). */
  widthM: number;
  /** Longueur de la course (m). */
  runM: number;
  /** Hauteur totale à franchir (m). */
  riseM: number;
  steps?: number;
  selected?: boolean;
  style?: StairStyle;
}) {
  const wood = useMemo(() => getStairWoodMap(), []);
  const rise = Math.max(0.6, riseM);
  const run = Math.max(1.6, runM);
  const w = Math.max(0.85, widthM);
  const railH = 0.94;
  const selectedTint = selected ? '#c7d2fe' : undefined;

  // 1. ESCALIER HÉLICOÏDAL (COLIMAÇON DESIGN AVEC MÂT CENTRAL ET MARCHES EN ÉVENTAIL)
  if (style === 'spiral') {
    const spiralRadius = Math.max(0.9, Math.min(w, run) * 0.5);
    const n = Math.max(12, Math.min(26, Math.round(steps ?? 16)));
    const stepH = rise / n;
    const totalAngle = Math.PI * 1.5; // 270 degrés de rotation
    const stepAngle = totalAngle / n;
    const mastRadius = 0.08;

    return (
      <group>
        {/* Mât central vertical en acier brossé / graphite */}
        <mesh position={[0, rise / 2, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[mastRadius, mastRadius, rise + 0.1, 24]} />
          <meshStandardMaterial
            color={selectedTint ?? '#292524'}
            metalness={0.82}
            roughness={0.25}
          />
        </mesh>

        {/* Marches rayonnantes en éventail */}
        {Array.from({ length: n }).map((_, i) => {
          const y = stepH * (i + 0.5);
          const angle = i * stepAngle;
          const outerR = spiralRadius;
          const treadMidAngle = angle + stepAngle * 0.5;
          const cos = Math.cos(treadMidAngle);
          const sin = Math.sin(treadMidAngle);
          const stepLength = outerR - mastRadius;
          const midR = mastRadius + stepLength * 0.5;

          return (
            <group key={`spiral-step-${i}`}>
              {/* Marche trapézoïdale rayonnante */}
              <mesh
                position={[cos * midR, y, sin * midR]}
                rotation={[0, -treadMidAngle, 0]}
                castShadow
                receiveShadow
              >
                <boxGeometry args={[0.045, 0.038, stepLength]} />
                <meshStandardMaterial
                  color={selectedTint ?? '#f5f5f4'}
                  map={wood}
                  roughness={0.48}
                  metalness={0.05}
                />
              </mesh>
              {/* Nez de marche contrasté en laiton */}
              <mesh
                position={[cos * (outerR - 0.02), y + 0.02, sin * (outerR - 0.02)]}
                rotation={[0, -treadMidAngle, 0]}
                castShadow
              >
                <boxGeometry args={[0.015, 0.01, stepLength * 0.9]} />
                <meshStandardMaterial color="#c4a35a" metalness={0.7} roughness={0.3} />
              </mesh>
              {/* Balustre extérieur vertical montant vers la rampe */}
              <mesh
                position={[Math.cos(angle + stepAngle * 0.9) * (outerR - 0.03), y + railH * 0.45, Math.sin(angle + stepAngle * 0.9) * (outerR - 0.03)]}
                castShadow
              >
                <cylinderGeometry args={[0.012, 0.012, railH * 0.9, 10]} />
                <meshStandardMaterial color="#57534e" metalness={0.75} roughness={0.25} />
              </mesh>
              {/* Segment de main courante hélicoïdale incurvée */}
              <mesh
                position={[Math.cos(treadMidAngle) * (outerR - 0.03), y + railH, Math.sin(treadMidAngle) * (outerR - 0.03)]}
                rotation={[0, -treadMidAngle, (stepH / (outerR * stepAngle))]}
                castShadow
              >
                <cylinderGeometry args={[0.024, 0.024, outerR * stepAngle * 1.05, 10]} />
                <meshStandardMaterial color={selectedTint ?? '#1c1917'} metalness={0.78} roughness={0.22} />
              </mesh>
            </group>
          );
        })}

        {/* Palier haut d'arrivée hélicoïdal */}
        <mesh
          position={[
            Math.cos(totalAngle) * spiralRadius * 0.5,
            rise + 0.02,
            Math.sin(totalAngle) * spiralRadius * 0.5,
          ]}
          castShadow
          receiveShadow
        >
          <cylinderGeometry args={[spiralRadius * 0.65, spiralRadius * 0.65, 0.05, 16, 1, false, 0, Math.PI * 0.65]} />
          <meshStandardMaterial color={selectedTint ?? '#f5f5f4'} map={wood} roughness={0.45} />
        </mesh>
      </group>
    );
  }

  // 2. ESCALIER QUART-TOURNANT AVEC PALIER INTERMÉDIAIRE (90°)
  if (style === 'quarterTurn') {
    const flightSteps = Math.max(4, Math.floor((steps ?? 12) / 2));
    const landingH = rise * 0.5;
    const landingSize = Math.max(0.9, w * 0.9);
    const stepH1 = landingH / flightSteps;
    const tread1 = (run * 0.5) / flightSteps;
    const stepH2 = (rise - landingH) / flightSteps;
    const tread2 = (run * 0.45) / flightSteps;

    return (
      <group>
        {/* Volée 1 : du sol au palier intermédiaire */}
        {Array.from({ length: flightSteps }).map((_, i) => {
          const y = stepH1 * i;
          const z = -run * 0.45 + tread1 * (i + 0.5);
          return (
            <group key={`qt1-${i}`} position={[-w * 0.15, y, z]}>
              <mesh position={[0, stepH1 / 2, -tread1 * 0.4]} castShadow receiveShadow>
                <boxGeometry args={[w * 0.85, stepH1, 0.04]} />
                <meshStandardMaterial color="#57534e" roughness={0.7} />
              </mesh>
              <mesh position={[0, stepH1 + 0.018, 0]} castShadow receiveShadow>
                <boxGeometry args={[w * 0.88, 0.04, tread1 * 0.95]} />
                <meshStandardMaterial color={selectedTint ?? '#f5f5f4'} map={wood} roughness={0.5} />
              </mesh>
              {/* Nez de marche */}
              <mesh position={[0, stepH1 + 0.028, tread1 * 0.45]} castShadow>
                <boxGeometry args={[w * 0.88, 0.015, 0.025]} />
                <meshStandardMaterial color="#c4a35a" metalness={0.7} roughness={0.3} />
              </mesh>
            </group>
          );
        })}

        {/* Palier intermédiaire carré */}
        <group position={[-w * 0.15, landingH, 0]}>
          <mesh position={[0, -0.04, 0]} castShadow receiveShadow>
            <boxGeometry args={[landingSize, 0.08, landingSize]} />
            <meshStandardMaterial color={selectedTint ?? '#e7e5e4'} map={wood} roughness={0.45} />
          </mesh>
          {/* Poteau porteur sous le palier */}
          <mesh position={[landingSize * 0.42, -landingH / 2, landingSize * 0.42]} castShadow>
            <cylinderGeometry args={[0.05, 0.05, landingH, 12]} />
            <meshStandardMaterial color="#292524" metalness={0.8} roughness={0.25} />
          </mesh>
        </group>

        {/* Volée 2 : du palier vers l'étage supérieur (tournant à 90°) */}
        {Array.from({ length: flightSteps }).map((_, i) => {
          const y = landingH + stepH2 * i;
          const x = -w * 0.15 + (landingSize * 0.5) + tread2 * (i + 0.5);
          return (
            <group key={`qt2-${i}`} position={[x, y, 0]}>
              <mesh position={[-tread2 * 0.4, stepH2 / 2, 0]} castShadow receiveShadow>
                <boxGeometry args={[0.04, stepH2, w * 0.85]} />
                <meshStandardMaterial color="#57534e" roughness={0.7} />
              </mesh>
              <mesh position={[0, stepH2 + 0.018, 0]} castShadow receiveShadow>
                <boxGeometry args={[tread2 * 0.95, 0.04, w * 0.88]} />
                <meshStandardMaterial color={selectedTint ?? '#f5f5f4'} map={wood} roughness={0.5} />
              </mesh>
              {/* Nez de marche */}
              <mesh position={[tread2 * 0.45, stepH2 + 0.028, 0]} castShadow>
                <boxGeometry args={[0.025, 0.015, w * 0.88]} />
                <meshStandardMaterial color="#c4a35a" metalness={0.7} roughness={0.3} />
              </mesh>
            </group>
          );
        })}

        {/* Poteau d'angle supérieur de garde-corps */}
        <mesh position={[-w * 0.15 + landingSize * 0.5, landingH + railH * 0.5, landingSize * 0.5]} castShadow>
          <cylinderGeometry args={[0.028, 0.028, railH, 12]} />
          <meshStandardMaterial color="#292524" metalness={0.8} roughness={0.22} />
        </mesh>
      </group>
    );
  }

  // 3. ESCALIER MONUMENTAL D'APPARAT / GRAND GALA (TAPIS ROUGE & OR, BALUSTRES SCULPTÉS)
  if (style === 'monumental') {
    const n = Math.max(6, Math.min(22, Math.round(steps ?? 12)));
    const grandW = Math.max(2.2, w * 1.35);
    const stepH = rise / n;
    const tread = run / n;
    const carpetW = grandW * 0.55;

    return (
      <group>
        {/* Marches monumentales en marbre noble ou bois clair */}
        {Array.from({ length: n }).map((_, i) => {
          const y = stepH * i;
          const z = -run / 2 + tread * (i + 0.5);
          // Effet évasé vers le bas (les marches du bas sont plus larges)
          const flare = 1 + (1 - i / n) * 0.18;
          const currentW = grandW * flare;

          return (
            <group key={`monumental-${i}`} position={[0, y, z]}>
              {/* Contremarche avec moulure en creux */}
              <mesh position={[0, stepH / 2, -tread * 0.44]} castShadow receiveShadow>
                <boxGeometry args={[currentW * 0.98, stepH, 0.05]} />
                <meshStandardMaterial color="#e7e5e4" roughness={0.4} metalness={0.08} />
              </mesh>
              {/* Marche en marbre clair / pierre de comblanchien */}
              <mesh position={[0, stepH + 0.02, 0]} castShadow receiveShadow>
                <boxGeometry args={[currentW, 0.05, tread * 0.96]} />
                <meshStandardMaterial color={selectedTint ?? '#f5f5f4'} roughness={0.28} metalness={0.12} />
              </mesh>
              {/* Nez de marche galbé en laiton poli */}
              <mesh position={[0, stepH + 0.035, tread * 0.46]} rotation={[0, 0, Math.PI / 2]} castShadow>
                <cylinderGeometry args={[0.016, 0.016, currentW, 12]} />
                <meshStandardMaterial color="#d4af37" metalness={0.85} roughness={0.18} />
              </mesh>

              {/* Tapis rouge de gala d'apparat au centre */}
              <mesh position={[0, stepH + 0.046, 0]} receiveShadow>
                <boxGeometry args={[carpetW, 0.012, tread * 0.98]} />
                <meshStandardMaterial color="#881337" roughness={0.92} metalness={0.02} />
              </mesh>
              {/* Tringle de maintien de tapis en laiton doré à l'angle contremarche */}
              <mesh position={[0, stepH + 0.02, -tread * 0.42]} rotation={[0, 0, Math.PI / 2]} castShadow>
                <cylinderGeometry args={[0.012, 0.012, carpetW * 1.05, 12]} />
                <meshStandardMaterial color="#fbbf24" metalness={0.9} roughness={0.15} />
              </mesh>
            </group>
          );
        })}

        {/* Garde-corps royal / d'apparat des deux côtés (balustres sculptés dorés & main courante acajou) */}
        {([-1, 1] as const).map((side) => {
          const hypotenuse = Math.hypot(rise, run);
          const incline = Math.atan2(rise, run);

          return (
            <group key={`monumental-rail-${side}`}>
              {/* Volute / départ de rampe sculpté en bas */}
              <group position={[side * (grandW * 0.58), stepH * 1.5, -run / 2 - 0.1]}>
                <mesh castShadow>
                  <cylinderGeometry args={[0.06, 0.08, railH * 1.1, 16]} />
                  <meshStandardMaterial color="#d4af37" metalness={0.85} roughness={0.2} />
                </mesh>
                {/* Pommeau de départ sculpté en boule dorée */}
                <mesh position={[0, railH * 0.55 + 0.06, 0]} castShadow>
                  <sphereGeometry args={[0.07, 16, 16]} />
                  <meshStandardMaterial color="#fbbf24" metalness={0.92} roughness={0.12} />
                </mesh>
              </group>

              {/* Main courante bombée en acajou / laiton */}
              <mesh
                position={[side * (grandW * 0.52), rise * 0.5 + railH * 0.9, 0]}
                rotation={[incline - Math.PI / 2, 0, 0]}
                castShadow
              >
                <cylinderGeometry args={[0.038, 0.038, hypotenuse * 1.02, 16]} />
                <meshStandardMaterial color="#78350f" roughness={0.3} metalness={0.15} />
              </mesh>
              {/* Lisse basse laiton */}
              <mesh
                position={[side * (grandW * 0.52), rise * 0.5 + railH * 0.15, 0]}
                rotation={[incline - Math.PI / 2, 0, 0]}
                castShadow
              >
                <cylinderGeometry args={[0.018, 0.018, hypotenuse * 0.98, 12]} />
                <meshStandardMaterial color="#d4af37" metalness={0.8} roughness={0.22} />
              </mesh>
              {/* Rangée de balustres ouvragés */}
              {Array.from({ length: Math.ceil(n * 0.75) }).map((_, bi) => {
                const t = bi / Math.ceil(n * 0.75);
                const pz = -run / 2 + run * t;
                const py = rise * t + railH * 0.48;
                return (
                  <mesh key={bi} position={[side * (grandW * 0.52), py, pz]} castShadow>
                    <cylinderGeometry args={[0.016, 0.016, railH * 0.75, 10]} />
                    <meshStandardMaterial color="#d4af37" metalness={0.82} roughness={0.2} />
                  </mesh>
                );
              })}
            </group>
          );
        })}
      </group>
    );
  }

  // 4. ESCALIER FLOTTANT / LOFT MODERNE (CRÉMAILLÈRE CENTRALE & PANNEAUX DE VERRE TRANSLUCIDES)
  if (style === 'open') {
    const n = Math.max(5, Math.min(24, Math.round(steps ?? 12)));
    const stepH = rise / n;
    const tread = run / n;
    const hypotenuse = Math.hypot(rise, run);
    const incline = Math.atan2(rise, run);

    return (
      <group>
        {/* Poutre centrale crémaillère massive en acier noir mat */}
        <mesh position={[0, rise / 2 - 0.08, 0]} rotation={[incline, 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.22, 0.28, hypotenuse + 0.1]} />
          <meshStandardMaterial color="#18181b" metalness={0.85} roughness={0.3} />
        </mesh>

        {/* Marches flottantes épaisses en chêne massif naturel */}
        {Array.from({ length: n }).map((_, i) => {
          const y = stepH * (i + 1);
          const z = -run / 2 + tread * (i + 0.5);

          return (
            <group key={`open-step-${i}`} position={[0, y, z]}>
              {/* Marche suspendue biseautée */}
              <mesh castShadow receiveShadow>
                <boxGeometry args={[w * 0.98, 0.065, tread * 0.94]} />
                <meshStandardMaterial
                  color={selectedTint ?? '#e7e5e4'}
                  map={wood}
                  roughness={0.45}
                  metalness={0.06}
                />
              </mesh>
              {/* Rainure antidérapante encastrée */}
              <mesh position={[0, 0.034, tread * 0.3]}>
                <boxGeometry args={[w * 0.85, 0.005, 0.02]} />
                <meshStandardMaterial color="#09090b" roughness={0.9} />
              </mesh>
            </group>
          );
        })}

        {/* Garde-corps en verre trempé translucide avec pinces inox de fixation */}
        {([-1, 1] as const).map((side) => (
          <group key={`open-glass-${side}`} position={[side * (w * 0.5 + 0.03), rise * 0.5 + railH * 0.48, 0]}>
            {/* Panneau de verre feuilleté sécurit */}
            <mesh rotation={[incline, 0, 0]}>
              <boxGeometry args={[0.016, railH * 0.82, hypotenuse * 0.96]} />
              <meshPhysicalMaterial
                color="#f8fafc"
                transmission={0.88}
                opacity={0.35}
                transparent
                roughness={0.06}
                metalness={0.08}
              />
            </mesh>
            {/* Main courante supérieure plate en inox brossé */}
            <mesh
              position={[0, railH * 0.44, 0]}
              rotation={[incline - Math.PI / 2, 0, 0]}
              castShadow
            >
              <boxGeometry args={[0.04, 0.025, hypotenuse * 0.98]} />
              <meshStandardMaterial color="#d4d4d8" metalness={0.88} roughness={0.18} />
            </mesh>
          </group>
        ))}
      </group>
    );
  }

  // 5. ESCALIER DROIT CLASSIQUE CONTEMPORAIN (OU COMPACT)
  const isCompact = style === 'compact';
  const n = Math.max(4, Math.min(24, Math.round(steps ?? 12)));
  const stepH = rise / n;
  const tread = run / n;
  const hypotenuse = Math.hypot(rise, run);
  const incline = Math.atan2(rise, run);

  const posts = useMemo(() => {
    const count = Math.max(4, Math.ceil(n / 2) + 1);
    return Array.from({ length: count }).map((_, i) => {
      const t = i / (count - 1);
      return {
        z: -run / 2 + run * t,
        y: stepH * Math.min(n, Math.round(t * n)) + 0.04,
      };
    });
  }, [n, run, stepH]);

  return (
    <group>
      {/* Limons latéraux massifs usinés en acier ou bois noble */}
      {([-1, 1] as const).map((side) => (
        <mesh
          key={`stringer-${side}`}
          position={[side * (w / 2 + 0.04), rise / 2, 0]}
          rotation={[incline, 0, 0]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[0.08, 0.28, hypotenuse + 0.15]} />
          <meshStandardMaterial
            color={selectedTint ?? (isCompact ? '#18181b' : '#3f3f46')}
            map={wood}
            roughness={0.65}
            metalness={isCompact ? 0.4 : 0.08}
          />
        </mesh>
      ))}

      {/* Marches complètes avec contremarches & nez de marche */}
      {Array.from({ length: n }).map((_, i) => {
        const y = stepH * i;
        const z = -run / 2 + tread * (i + 0.5);

        return (
          <group key={i} position={[0, y, z]}>
            {/* Contremarche avec léger retrait */}
            <mesh position={[0, stepH / 2, -tread * 0.42]} castShadow receiveShadow>
              <boxGeometry args={[w * 0.96, stepH, Math.max(0.04, tread * 0.28)]} />
              <meshStandardMaterial color={selectedTint ?? '#71717a'} map={wood} roughness={0.75} />
            </mesh>
            {/* Marche en chêne avec chanfrein */}
            <mesh position={[0, stepH + 0.018, tread * 0.05]} castShadow receiveShadow>
              <boxGeometry args={[w * 0.98, 0.045, tread * 0.92]} />
              <meshStandardMaterial
                color={selectedTint ?? '#f4f4f5'}
                map={wood}
                roughness={0.48}
                metalness={0.06}
              />
            </mesh>
            {/* Nez de marche contrasté architectural */}
            <mesh position={[0, stepH + 0.032, tread * 0.45]} castShadow>
              <boxGeometry args={[w * 0.98, 0.018, 0.03]} />
              <meshStandardMaterial color="#27272a" roughness={0.6} metalness={0.3} />
            </mesh>
            {/* Profilé antidérapant intégré */}
            <mesh position={[0, stepH + 0.042, tread * 0.32]}>
              <boxGeometry args={[w * 0.88, 0.006, 0.035]} />
              <meshStandardMaterial color="#18181b" roughness={0.95} />
            </mesh>
          </group>
        );
      })}

      {/* Palier haut d'arrivée à l'étage */}
      <mesh position={[0, rise + 0.04, run / 2 + 0.28]} castShadow receiveShadow>
        <boxGeometry args={[w * 1.05, 0.08, 0.65]} />
        <meshStandardMaterial color={selectedTint ?? '#f4f4f5'} map={wood} roughness={0.48} />
      </mesh>
      {/* Rebord de finition du palier */}
      <mesh position={[0, rise + 0.09, run / 2 + 0.55]} castShadow>
        <boxGeometry args={[w * 1.05, 0.04, 0.06]} />
        <meshStandardMaterial color="#3f3f46" roughness={0.6} metalness={0.2} />
      </mesh>

      {/* Garde-corps contemporain des deux côtés */}
      {([-1, 1] as const).map((side) => (
        <group key={`rail-${side}`}>
          {/* Main courante tubulaire ergonomique */}
          <mesh
            position={[side * (w * 0.5 + 0.02), rise * 0.5 + railH * 0.55, 0]}
            rotation={[incline - Math.PI / 2, 0, 0]}
            castShadow
          >
            <cylinderGeometry args={[0.026, 0.026, hypotenuse * 0.98, 14]} />
            <meshStandardMaterial color="#d4d4d8" metalness={0.82} roughness={0.2} />
          </mesh>
          {/* Lisse intermédiaire basse */}
          <mesh
            position={[side * (w * 0.5 + 0.02), rise * 0.5 + railH * 0.22, 0]}
            rotation={[incline - Math.PI / 2, 0, 0]}
            castShadow
          >
            <cylinderGeometry args={[0.014, 0.014, hypotenuse * 0.92, 10]} />
            <meshStandardMaterial color="#71717a" metalness={0.75} roughness={0.25} />
          </mesh>
          {/* Montants verticaux */}
          {posts.map((p, pi) => (
            <mesh
              key={pi}
              position={[side * (w * 0.5 + 0.02), p.y + railH * 0.45, p.z]}
              castShadow
            >
              <cylinderGeometry args={[0.016, 0.016, Math.max(0.35, railH * 0.9), 10]} />
              <meshStandardMaterial color="#71717a" metalness={0.75} roughness={0.25} />
            </mesh>
          ))}
          {/* Poteau d'arrivée palier */}
          <mesh position={[side * (w * 0.5 + 0.02), rise + railH / 2 + 0.08, run / 2 + 0.35]} castShadow>
            <cylinderGeometry args={[0.028, 0.028, railH, 12]} />
            <meshStandardMaterial color="#d4d4d8" metalness={0.8} roughness={0.2} />
          </mesh>
          {/* Main courante horizontale du palier */}
          <mesh
            position={[side * (w * 0.5 + 0.02), rise + railH + 0.04, run / 2 + 0.28]}
            rotation={[0, 0, Math.PI / 2]}
            castShadow
          >
            <cylinderGeometry args={[0.022, 0.022, 0.55, 12]} />
            <meshStandardMaterial color="#d4d4d8" metalness={0.82} roughness={0.2} />
          </mesh>
        </group>
      ))}
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
