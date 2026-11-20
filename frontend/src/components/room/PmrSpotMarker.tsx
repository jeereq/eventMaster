'use client';

import React, { useEffect, useMemo } from 'react';
import * as THREE from 'three';

/**
 * Emplacement réservé à un fauteuil roulant dans une rangée : marquage bleu au sol
 * (0,80 × 1,30 m, arrêté accessibilité) avec le pictogramme international, à la place du siège.
 */
function drawPictogram(): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 208;
  const g = c.getContext('2d');
  if (!g) return c;
  g.fillStyle = '#1d4ed8';
  g.fillRect(0, 0, 128, 208);
  g.strokeStyle = '#ffffff';
  g.lineWidth = 6;
  g.strokeRect(6, 6, 116, 196);
  // Pictogramme (vu de dessus, lisible depuis l’entrée de la rangée).
  g.save();
  g.translate(64, 108);
  g.fillStyle = '#ffffff';
  g.strokeStyle = '#ffffff';
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.beginPath();
  g.arc(-4, -48, 9, 0, Math.PI * 2);
  g.fill();
  g.lineWidth = 10;
  g.beginPath();
  g.moveTo(-6, -32);
  g.lineTo(-6, 2);
  g.lineTo(20, 2);
  g.lineTo(30, 30);
  g.moveTo(-6, -18);
  g.lineTo(16, -18);
  g.stroke();
  g.lineWidth = 7;
  g.beginPath();
  g.arc(-6, 18, 26, -Math.PI * 0.15, Math.PI * 1.35);
  g.stroke();
  g.restore();
  return c;
}

export function PmrSpotMarker({ position, rotationY }: { position: [number, number, number]; rotationY: number }) {
  const texture = useMemo(() => {
    const canvas = drawPictogram();
    if (!canvas) return null;
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  }, []);
  useEffect(() => () => texture?.dispose(), [texture]);
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, -0.2]} receiveShadow>
        <planeGeometry args={[0.8, 1.3]} />
        <meshStandardMaterial map={texture ?? undefined} color={texture ? '#ffffff' : '#1d4ed8'} roughness={0.7} />
      </mesh>
    </group>
  );
}
