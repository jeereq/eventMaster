'use client';

/**
 * Quincaillerie et vitrages de porte partagés par les portes du catalogue et
 * les ouvertures percées dans les murs : béquilles sur rosace des deux côtés,
 * paumelles, verrière d’atelier en acier et panneaux à cassettes moulurés.
 *
 * Repère : origine au centre du vantail, X sur la largeur, Y en hauteur,
 * Z perpendiculaire au vantail (épaisseur `t`).
 */

import { SurfaceMat } from '@/components/room/SurfaceMaterial';
import { MetalMat } from '@/components/room/BathroomMeshes';
import type { HomeMetalFinish } from '@/lib/roomHomeFurniture';

/** Hauteur de poignée réglementaire (≈ 1,05 m du sol) exprimée depuis le centre du vantail. */
export function handleY(leafH: number) {
  return Math.min(leafH / 2 - 0.15, 1.05 - leafH / 2);
}

/** Béquille sur rosace + entrée de clé, sur une face (`face` = +1 devant, −1 derrière). */
function Lever({ face, toward, t, finish }: { face: 1 | -1; toward: 1 | -1; t: number; finish: HomeMetalFinish }) {
  const z = face * (t / 2);
  return (
    <group position={[0, 0, z]}>
      <mesh position={[0, 0, face * 0.004]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.026, 0.026, 0.008, 20]} />
        <MetalMat finish={finish} />
      </mesh>
      <mesh position={[0, 0, face * 0.03]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.009, 0.009, 0.05, 10]} />
        <MetalMat finish={finish} />
      </mesh>
      <mesh position={[toward * 0.055, 0, face * 0.052]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.009, 0.01, 0.12, 10]} />
        <MetalMat finish={finish} />
      </mesh>
      <mesh position={[0, -0.075, face * 0.004]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.016, 0.016, 0.008, 16]} />
        <MetalMat finish={finish} />
      </mesh>
      <mesh position={[0, -0.075, face * 0.0085]}>
        <boxGeometry args={[0.005, 0.016, 0.002]} />
        <meshStandardMaterial color="#111111" />
      </mesh>
    </group>
  );
}

/**
 * Poignées des deux côtés du vantail, à `x` du centre. La béquille pointe
 * vers le centre du vantail (`toward`), comme une vraie porte.
 */
export function DoorHandles({ x, y, t, toward, finish = 'chrome' }: { x: number; y: number; t: number; toward: 1 | -1; finish?: HomeMetalFinish }) {
  return (
    <group position={[x, y, 0]}>
      <Lever face={1} toward={toward} t={t} finish={finish} />
      <Lever face={-1} toward={toward} t={t} finish={finish} />
    </group>
  );
}

/** Trois paumelles (charnières à fiche) sur le chant côté gonds. */
export function Hinges({ x, leafH, t, finish = 'chrome' }: { x: number; leafH: number; t: number; finish?: HomeMetalFinish }) {
  const ys = [leafH / 2 - 0.22, 0, -leafH / 2 + 0.22];
  return (
    <group position={[x, 0, 0]}>
      {ys.map((y) => (
        <group key={y} position={[0, y, t / 2 + 0.004]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.009, 0.009, 0.1, 10]} />
            <MetalMat finish={finish} />
          </mesh>
          <mesh position={[0, 0.054, 0]}>
            <sphereGeometry args={[0.009, 8, 6]} />
            <MetalMat finish={finish} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** Vitrage d’atelier : profils acier fins en grille, verre clair entre les deux. */
export function AtelierGlazing({ w, h, t, cols = 3, rows = 4, frameColor = '#1f1f1f' }: { w: number; h: number; t: number; cols?: number; rows?: number; frameColor?: string }) {
  const bar = 0.03;
  return (
    <group>
      <mesh>
        <boxGeometry args={[w - bar, h - bar, 0.008]} />
        <SurfaceMat color="#e6f1f2" finish="glass" opacity={0.12} envMapIntensity={1.2} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={`v${s}`} position={[s * (w / 2 - bar / 2), 0, 0]} castShadow>
          <boxGeometry args={[bar, h, t]} />
          <SurfaceMat color={frameColor} finish="metal" roughness={0.45} metalness={0.7} />
        </mesh>
      ))}
      {[-1, 1].map((s) => (
        <mesh key={`h${s}`} position={[0, s * (h / 2 - bar / 2), 0]} castShadow>
          <boxGeometry args={[w, bar, t]} />
          <SurfaceMat color={frameColor} finish="metal" roughness={0.45} metalness={0.7} />
        </mesh>
      ))}
      {Array.from({ length: cols - 1 }, (_, i) => (
        <mesh key={`c${i}`} position={[-w / 2 + ((i + 1) * w) / cols, 0, 0]}>
          <boxGeometry args={[0.018, h - bar, t * 0.8]} />
          <SurfaceMat color={frameColor} finish="metal" roughness={0.45} metalness={0.7} />
        </mesh>
      ))}
      {Array.from({ length: rows - 1 }, (_, i) => (
        <mesh key={`r${i}`} position={[0, -h / 2 + ((i + 1) * h) / rows, 0]}>
          <boxGeometry args={[w - bar, 0.018, t * 0.8]} />
          <SurfaceMat color={frameColor} finish="metal" roughness={0.45} metalness={0.7} />
        </mesh>
      ))}
    </group>
  );
}

/**
 * Panneaux à cassettes sur les deux faces : chaque cassette = panneau en creux
 * entouré d’une moulure saillante, comme une porte d’appartement haussmannien.
 */
export function CassettePanels({ w, h, t, color, cols = 2, rows = 3 }: { w: number; h: number; t: number; color: string; cols?: number; rows?: number }) {
  const margin = 0.09;
  const gap = 0.07;
  // Cassettes du haut plus hautes que celle du bas (proportions classiques).
  const weights = rows === 3 ? [1.25, 0.7, 1] : Array.from({ length: rows }, () => 1);
  const totalW = weights.reduce((a, b) => a + b, 0);
  const innerH = h - margin * 2 - gap * (rows - 1);
  const cellW = (w - margin * 2 - gap * (cols - 1)) / cols;
  const cells: Array<{ x: number; y: number; ch: number }> = [];
  let yTop = h / 2 - margin;
  weights.forEach((wt) => {
    const ch = (innerH * wt) / totalW;
    for (let c = 0; c < cols; c += 1) {
      cells.push({ x: -w / 2 + margin + cellW / 2 + c * (cellW + gap), y: yTop - ch / 2, ch });
    }
    yTop -= ch + gap;
  });
  return (
    <group>
      {[1, -1].map((face) =>
        cells.map((cell, i) => (
          <group key={`${face}-${i}`} position={[cell.x, cell.y, face * (t / 2)]}>
            {/* Panneau en léger retrait */}
            <mesh position={[0, 0, -face * 0.004]}>
              <boxGeometry args={[cellW - 0.03, cell.ch - 0.03, 0.006]} />
              <SurfaceMat color={color} finish="lacquer" roughness={0.42} />
            </mesh>
            {/* Moulure : quatre baguettes en relief */}
            {[-1, 1].map((s) => (
              <mesh key={`mv${s}`} position={[s * (cellW / 2 - 0.008), 0, face * 0.006]} castShadow>
                <boxGeometry args={[0.016, cell.ch, 0.012]} />
                <SurfaceMat color={color} finish="lacquer" roughness={0.35} />
              </mesh>
            ))}
            {[-1, 1].map((s) => (
              <mesh key={`mh${s}`} position={[0, s * (cell.ch / 2 - 0.008), face * 0.006]} castShadow>
                <boxGeometry args={[cellW, 0.016, 0.012]} />
                <SurfaceMat color={color} finish="lacquer" roughness={0.35} />
              </mesh>
            ))}
          </group>
        )),
      )}
    </group>
  );
}
