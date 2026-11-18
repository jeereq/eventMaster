'use client';

import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { PleatedDrape } from '@/components/room/StageDressing';

/**
 * Image projetée simulée : plan large d’un paysage au crépuscule (ciel dégradé, soleil bas,
 * crêtes en silhouettes). Dessinée une fois sur un canvas, sans fichier externe.
 */
function drawProjectedFrame(width: number, height: number): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = width;
  c.height = height;
  const ctx = c.getContext('2d');
  if (!ctx) return null;
  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, '#1e2a52');
  sky.addColorStop(0.45, '#7a4a7a');
  sky.addColorStop(0.68, '#f08a4b');
  sky.addColorStop(0.8, '#ffd08a');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);

  // Soleil bas avec halo
  const sx = width * 0.62;
  const sy = height * 0.7;
  const halo = ctx.createRadialGradient(sx, sy, 0, sx, sy, height * 0.55);
  halo.addColorStop(0, 'rgba(255,240,200,0.95)');
  halo.addColorStop(0.12, 'rgba(255,214,150,0.75)');
  halo.addColorStop(1, 'rgba(255,170,90,0)');
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, width, height);

  // Crêtes successives (perspective atmosphérique)
  const ridges: Array<[string, number, number, number]> = [
    ['#5a3b5e', 0.66, 0.06, 3],
    ['#3b2847', 0.74, 0.08, 5],
    ['#211830', 0.84, 0.07, 7],
    ['#0e0a16', 0.93, 0.05, 11],
  ];
  ridges.forEach(([color, base, amp, freq], k) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, height);
    for (let x = 0; x <= width; x += 4) {
      const t = x / width;
      const y =
        height * base -
        height * amp * (0.6 * Math.sin(t * freq + k * 1.7) + 0.4 * Math.sin(t * freq * 2.3 + k));
      ctx.lineTo(x, y);
    }
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fill();
  });

  return c;
}

const RATIO: Record<string, number> = { '16:9': 16 / 9, '21:9': 2.39, '32:9': 32 / 9, '9:16': 1.85 };

/**
 * Grand écran de cinéma : toile perforée légèrement cintrée (rayon ≈ 1,6 × largeur),
 * cache de velours noir, mur-baffle sombre qui masque les enceintes, rideaux latéraux
 * et lumière réfléchie vers la salle. Repère : centré en x, sol en y = 0, face au public (+Z).
 */
export function CinemaScreenMesh({
  w,
  ratio = '21:9',
  elevationM = 1.2,
  powered = true,
  selected = false,
}: {
  w: number;
  ratio?: string;
  elevationM?: number;
  powered?: boolean;
  selected?: boolean;
}) {
  const sw = Math.max(3, w);
  const sh = sw / (RATIO[ratio] ?? 2.39);
  const bottom = Math.max(0.6, elevationM);
  const radius = sw * 1.6;
  const bend = (x: number) => (x * x) / (2 * radius);

  const screenGeo = useMemo(() => {
    const g = new THREE.PlaneGeometry(sw, sh, 48, 1);
    const p = g.getAttribute('position');
    for (let i = 0; i < p.count; i += 1) p.setZ(i, bend(p.getX(i)));
    g.computeVertexNormals();
    return g;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sw, sh]);
  useEffect(() => () => screenGeo.dispose(), [screenGeo]);

  const frame = useMemo(() => {
    const canvas = drawProjectedFrame(1024, Math.round(1024 / (RATIO[ratio] ?? 2.39)));
    if (!canvas) return null;
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    return tex;
  }, [ratio]);
  useEffect(() => () => frame?.dispose(), [frame]);

  const mask = 0.32;
  const edgeZ = bend(sw / 2);
  const wallW = sw + 2 * mask + 1.4;
  const wallH = bottom + sh + mask + 0.8;
  const drapeW = 1.1;

  return (
    <group>
      {/* Mur-baffle noir mat (enceintes cachées derrière la toile) */}
      <mesh position={[0, wallH / 2, -0.18]} receiveShadow>
        <boxGeometry args={[wallW, wallH, 0.12]} />
        <meshStandardMaterial color={selected ? '#334155' : '#0b0a0d'} roughness={0.95} />
      </mesh>

      {/* Toile perforée cintrée */}
      <mesh geometry={screenGeo} position={[0, bottom + sh / 2, 0]}>
        {powered && frame ? (
          <meshStandardMaterial
            color="#ffffff"
            map={frame}
            emissive="#ffffff"
            emissiveMap={frame}
            emissiveIntensity={0.9}
            roughness={0.9}
            toneMapped={false}
          />
        ) : (
          <meshStandardMaterial color="#d9d9de" roughness={0.9} />
        )}
      </mesh>

      {/* Cache velours noir : haut, bas et côtés (suivent la courbure de la toile) */}
      <mesh position={[0, bottom + sh + mask / 2, 0.02]}>
        <boxGeometry args={[sw + 2 * mask, mask, 0.06]} />
        <meshStandardMaterial color="#050506" roughness={1} />
      </mesh>
      <mesh position={[0, bottom - mask / 2, 0.02]}>
        <boxGeometry args={[sw + 2 * mask, mask, 0.06]} />
        <meshStandardMaterial color="#050506" roughness={1} />
      </mesh>
      {([-1, 1] as const).map((side) => (
        <mesh key={`mask-${side}`} position={[side * (sw / 2 + mask / 2), bottom + sh / 2, edgeZ + 0.02]}>
          <boxGeometry args={[mask, sh + 2 * mask, 0.06]} />
          <meshStandardMaterial color="#050506" roughness={1} />
        </mesh>
      ))}

      {/* Rideaux de velours latéraux, du sol au-dessus de l’écran */}
      {([-1, 1] as const).map((side) => (
        <group key={`drape-${side}`} position={[side * (sw / 2 + mask + drapeW / 2 - 0.15), 0, edgeZ + 0.12]}>
          <PleatedDrape width={drapeW} height={wallH - 0.1} color="#5b0f1a" foldM={0.2} depth={0.06} />
        </group>
      ))}

      {/* Lumière renvoyée par l’image vers les premiers rangs */}
      {powered ? (
        <>
          <pointLight position={[0, bottom + sh * 0.5, 2.5]} intensity={6} distance={sw * 2.2} decay={1.6} color="#ffc9a0" />
          <pointLight position={[0, bottom + sh * 0.6, sw * 0.6]} intensity={3} distance={sw * 2.5} decay={1.6} color="#8fa2ff" />
        </>
      ) : null}
    </group>
  );
}
