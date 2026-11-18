'use client';

/**
 * Emplacement sans murs (zone « plot ») : rien n’est posé au sol, on délimite seulement.
 * - marquage : bande peinte sur le pourtour, coins renforcés ;
 * - cordon : potelets chromés sur socle lesté et cordon tendu entre eux ;
 * - teinte : voile coloré léger.
 * Le numéro de l’emplacement est peint au centre, visible aussi en aperçu et en visite.
 */

import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import type { PlotBorderStyle } from '@/lib/roomLayoutUtils';

const LINE_W = 0.08;
const POST_H = 0.95;
const POST_SPACING_M = 2.4;

function labelTexture(text: string, color: string): THREE.CanvasTexture | null {
  if (typeof document === 'undefined' || !text.trim()) return null;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const size = text.length > 8 ? 74 : text.length > 4 ? 110 : 150;
  ctx.font = `800 ${size}px "Helvetica Neue", Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = size * 0.12;
  ctx.strokeStyle = 'rgba(15,23,42,0.55)';
  ctx.strokeText(text, 256, 132, 490);
  ctx.fillStyle = color;
  ctx.fillText(text, 256, 132, 490);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/** Potelets répartis sur le pourtour (coins compris), dans l’ordre du tour. */
function perimeterPosts(w: number, h: number): Array<[number, number]> {
  const corners: Array<[number, number]> = [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]];
  const out: Array<[number, number]> = [];
  for (let i = 0; i < 4; i += 1) {
    const [ax, az] = corners[i];
    const [bx, bz] = corners[(i + 1) % 4];
    const len = Math.hypot(bx - ax, bz - az);
    const n = Math.max(1, Math.round(len / POST_SPACING_M));
    for (let k = 0; k < n; k += 1) {
      const t = k / n;
      out.push([ax + (bx - ax) * t, az + (bz - az) * t]);
    }
  }
  return out;
}

function RopeSpan({ a, b, color }: { a: [number, number]; b: [number, number]; color: string }) {
  const geom = useMemo(() => {
    const y = POST_H - 0.07;
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const sag = Math.min(0.18, 0.05 + len * 0.04);
    const curve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(a[0], y, a[1]),
      new THREE.Vector3((a[0] + b[0]) / 2, y - sag * 2, (a[1] + b[1]) / 2),
      new THREE.Vector3(b[0], y, b[1]),
    );
    return new THREE.TubeGeometry(curve, 16, 0.016, 6, false);
  }, [a, b]);
  useEffect(() => () => geom.dispose(), [geom]);
  return (
    <mesh geometry={geom} castShadow>
      <meshStandardMaterial color={color} roughness={0.75} />
    </mesh>
  );
}

export function PlotMarking({
  w,
  h,
  label,
  border = 'paint',
  color,
  selected,
  pickable,
}: {
  w: number;
  h: number;
  label: string;
  border?: PlotBorderStyle;
  color?: string;
  selected: boolean;
  pickable: boolean;
}) {
  const accent = color ?? (border === 'rope' ? '#9f1239' : '#f8fafc');
  const tint = color ?? '#e2e8f0';
  const text = useMemo(() => labelTexture(label, color ?? '#ffffff'), [label, color]);
  useEffect(() => () => text?.dispose(), [text]);
  const posts = useMemo(() => (border === 'rope' ? perimeterPosts(w, h) : []), [border, w, h]);
  const textW = Math.min(w * 0.8, h * 1.4, 3.2);

  return (
    <group>
      {/* Voile : surface cliquable, très légère pour laisser voir le sol. */}
      <mesh position={[0, 0.004, 0]} rotation={[-Math.PI / 2, 0, 0]} raycast={pickable ? undefined : () => null} receiveShadow>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial
          color={selected ? '#818cf8' : tint}
          transparent
          opacity={selected ? 0.32 : border === 'none' ? 0.28 : 0.12}
          depthWrite={false}
          roughness={0.9}
        />
      </mesh>
      {border === 'paint' ? (
        ([
          [0, -h / 2 + LINE_W / 2, w, LINE_W],
          [0, h / 2 - LINE_W / 2, w, LINE_W],
          [-w / 2 + LINE_W / 2, 0, LINE_W, h - LINE_W * 2],
          [w / 2 - LINE_W / 2, 0, LINE_W, h - LINE_W * 2],
        ] as const).map(([x, z, lw, lh], i) => (
          <mesh key={`line-${i}`} position={[x, 0.006, z]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null} receiveShadow>
            <planeGeometry args={[lw, lh]} />
            <meshStandardMaterial color={selected ? '#6366f1' : accent} roughness={0.6} polygonOffset polygonOffsetFactor={-2} />
          </mesh>
        ))
      ) : null}
      {border === 'rope' ? (
        <>
          {posts.map(([x, z], i) => (
            <group key={`post-${i}`} position={[x, 0, z]}>
              <mesh position={[0, 0.015, 0]} castShadow receiveShadow>
                <cylinderGeometry args={[0.13, 0.15, 0.03, 20]} />
                <meshStandardMaterial color="#d4d4d8" metalness={0.85} roughness={0.25} />
              </mesh>
              <mesh position={[0, POST_H / 2, 0]} castShadow>
                <cylinderGeometry args={[0.022, 0.026, POST_H, 12]} />
                <meshStandardMaterial color="#e4e4e7" metalness={0.9} roughness={0.18} />
              </mesh>
              <mesh position={[0, POST_H + 0.03, 0]} castShadow>
                <sphereGeometry args={[0.045, 14, 10]} />
                <meshStandardMaterial color="#e4e4e7" metalness={0.9} roughness={0.18} />
              </mesh>
            </group>
          ))}
          {posts.map((p, i) => (
            <RopeSpan key={`rope-${i}`} a={p} b={posts[(i + 1) % posts.length]} color={selected ? '#6366f1' : accent} />
          ))}
        </>
      ) : null}
      {text ? (
        <mesh position={[0, 0.008, 0]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
          <planeGeometry args={[textW, textW / 2]} />
          <meshBasicMaterial map={text} transparent depthWrite={false} toneMapped={false} opacity={0.92} />
        </mesh>
      ) : null}
    </group>
  );
}
