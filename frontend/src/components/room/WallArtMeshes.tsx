'use client';

/**
 * Décor mural en 3D : images encadrées ou peintes et graffitis dessinés à la volée.
 * Rendu dans le repère du mur (x le long du mur, y centré sur la mi-hauteur, z = épaisseur),
 * collé sur la face intérieure (`inSide`).
 */

import React, { useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import { wallArtHeightM, type GraffitiStyle, type RoomWallArt, type WallArtFrame } from '@/lib/roomWallArt';

/** Petit générateur pseudo-aléatoire stable : un graffiti garde ses coulures d’un rendu à l’autre. */
function seeded(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

function shade(hex: string, amount: number): string {
  const c = new THREE.Color(hex);
  const hsl = { h: 0, s: 0, l: 0 };
  c.getHSL(hsl);
  c.setHSL(hsl.h, hsl.s, Math.min(1, Math.max(0, hsl.l + amount)));
  return `#${c.getHexString()}`;
}

const GRAFFITI_FONT = "900 {size}px 'Arial Black', 'Helvetica Neue', Impact, sans-serif";

/** Dessine le lettrage sur un canvas transparent, au format `aspect`. */
export function drawGraffiti(text: string, style: GraffitiStyle, fill: string, outline: string, aspect: number): HTMLCanvasElement {
  const H = 384;
  const W = Math.min(4096, Math.round(H * aspect));
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  const rand = seeded(`${text}|${style}`);
  let size = H * 0.56;
  ctx.font = GRAFFITI_FONT.replace('{size}', String(size));
  const measured = ctx.measureText(text).width;
  const maxW = W * (style === 'wild' ? 0.8 : 0.88);
  if (measured > maxW) size *= maxW / measured;
  ctx.font = GRAFFITI_FONT.replace('{size}', String(size));
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.miterLimit = 2;
  const cx = W / 2;
  const cy = H * (style === 'drip' ? 0.42 : 0.5);
  const textW = ctx.measureText(text).width;

  if (style === 'wild') {
    ctx.translate(cx, cy);
    ctx.transform(1, -0.06, -0.28, 1, 0, 0);
    ctx.translate(-cx, -cy);
  }

  const gradient = (top: string, mid: string, bottom: string) => {
    const g = ctx.createLinearGradient(0, cy - size / 2, 0, cy + size / 2);
    g.addColorStop(0, top);
    g.addColorStop(0.5, mid);
    g.addColorStop(1, bottom);
    return g;
  };

  if (style === 'neon') {
    // Tube lumineux : halo large, puis cœur presque blanc.
    ctx.lineWidth = size * 0.07;
    for (const [blur, alpha] of [[size * 0.5, 0.55], [size * 0.25, 0.8], [size * 0.08, 1]] as const) {
      ctx.shadowColor = fill;
      ctx.shadowBlur = blur;
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = fill;
      ctx.strokeText(text, cx, cy);
    }
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
    ctx.lineWidth = size * 0.025;
    ctx.strokeStyle = shade(fill, 0.38);
    ctx.strokeText(text, cx, cy);
    return canvas;
  }

  // Brume de bombe autour des lettres.
  ctx.save();
  ctx.shadowColor = style === 'stencil' ? 'rgba(0,0,0,0.35)' : fill;
  ctx.shadowBlur = size * 0.32;
  ctx.globalAlpha = style === 'stencil' ? 0.5 : 0.32;
  ctx.fillStyle = style === 'stencil' ? fill : fill;
  ctx.fillText(text, cx, cy);
  ctx.restore();

  if (style === 'stencil') {
    ctx.fillStyle = fill;
    ctx.fillText(text, cx, cy);
    // Ponts de pochoir : bandes découpées dans les lettres.
    ctx.globalCompositeOperation = 'destination-out';
    for (const k of [-0.18, 0.16]) ctx.fillRect(cx - textW / 2 - 10, cy + k * size - size * 0.025, textW + 20, size * 0.05);
    ctx.globalCompositeOperation = 'source-over';
    // Postillons de peinture.
    ctx.fillStyle = fill;
    for (let i = 0; i < 260; i += 1) {
      const x = cx + (rand() - 0.5) * (textW + size * 0.6);
      const y = cy + (rand() - 0.5) * size * 1.4;
      ctx.globalAlpha = 0.15 + rand() * 0.4;
      ctx.beginPath();
      ctx.arc(x, y, 0.8 + rand() * 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    return canvas;
  }

  // Relief 3D (bubble, wildstyle) : couches décalées en couleur de contour assombrie.
  if (style === 'bubble' || style === 'wild') {
    const depth = Math.round(size * 0.09);
    ctx.fillStyle = shade(outline, -0.08);
    ctx.strokeStyle = shade(outline, -0.08);
    ctx.lineWidth = size * 0.16;
    for (let k = depth; k > 0; k -= 2) {
      ctx.strokeText(text, cx + k * 0.8, cy + k);
      ctx.fillText(text, cx + k * 0.8, cy + k);
    }
  }

  // Contour épais, puis liseré clair (wildstyle), puis remplissage dégradé.
  ctx.strokeStyle = outline;
  ctx.lineWidth = size * (style === 'bubble' ? 0.18 : 0.14);
  ctx.strokeText(text, cx, cy);
  if (style === 'wild') {
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = size * 0.07;
    ctx.strokeText(text, cx, cy);
  }
  ctx.fillStyle = gradient(shade(fill, 0.22), fill, shade(fill, -0.18));
  ctx.fillText(text, cx, cy);

  if (style === 'drip') {
    // Coulures qui partent du bas des lettres.
    ctx.fillStyle = fill;
    const n = Math.max(4, Math.round(text.length * 1.6));
    for (let i = 0; i < n; i += 1) {
      const x = cx - textW / 2 + rand() * textW;
      const w = size * (0.025 + rand() * 0.035);
      const len = size * (0.15 + rand() * 0.55);
      const y0 = cy + size * 0.26;
      ctx.beginPath();
      ctx.moveTo(x - w / 2, y0);
      ctx.lineTo(x - w / 2, y0 + len);
      ctx.arc(x, y0 + len, w * 0.75, Math.PI, 0, true);
      ctx.lineTo(x + w / 2, y0);
      ctx.closePath();
      ctx.fill();
    }
  }

  // Reflets brillants sur le haut des lettres.
  ctx.save();
  ctx.globalCompositeOperation = 'source-atop';
  const shine = ctx.createLinearGradient(0, cy - size / 2, 0, cy);
  shine.addColorStop(0, 'rgba(255,255,255,0.45)');
  shine.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = shine;
  ctx.fillRect(0, cy - size / 2, W, size / 2);
  ctx.restore();

  if (style === 'bubble' || style === 'wild') {
    // Étincelles.
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 3; i += 1) {
      const x = cx - textW / 2 + rand() * textW;
      const y = cy - size * 0.35 + rand() * size * 0.2;
      const r = size * (0.05 + rand() * 0.04);
      ctx.beginPath();
      for (let k = 0; k < 8; k += 1) {
        const a = (k / 8) * Math.PI * 2;
        const rr = k % 2 === 0 ? r : r * 0.28;
        ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
      }
      ctx.closePath();
      ctx.fill();
    }
  }
  return canvas;
}

function useImageTexture(url?: string): THREE.Texture | null {
  const [tex, setTex] = useState<THREE.Texture | null>(null);
  useEffect(() => {
    if (!url) return;
    let alive = true;
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin('anonymous');
    let loaded: THREE.Texture | null = null;
    loader.load(
      url,
      (t) => {
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = 8;
        loaded = t;
        if (alive) setTex(t);
        else t.dispose();
      },
      undefined,
      () => {
        if (alive) setTex(null);
      },
    );
    return () => {
      alive = false;
      loaded?.dispose();
    };
  }, [url]);
  return url ? tex : null;
}

/** Bordure de cadre : quatre baguettes autour d’un rectangle w × h. */
function FrameBorder({ w, h, band, depth, material }: { w: number; h: number; band: number; depth: number; material: THREE.Material }) {
  return (
    <group>
      <mesh position={[0, h / 2 + band / 2, depth / 2]} material={material} castShadow>
        <boxGeometry args={[w + band * 2, band, depth]} />
      </mesh>
      <mesh position={[0, -h / 2 - band / 2, depth / 2]} material={material} castShadow>
        <boxGeometry args={[w + band * 2, band, depth]} />
      </mesh>
      <mesh position={[-w / 2 - band / 2, 0, depth / 2]} material={material} castShadow>
        <boxGeometry args={[band, h, depth]} />
      </mesh>
      <mesh position={[w / 2 + band / 2, 0, depth / 2]} material={material} castShadow>
        <boxGeometry args={[band, h, depth]} />
      </mesh>
    </group>
  );
}

function ImageArt({ art, selected }: { art: RoomWallArt; selected: boolean }) {
  const tex = useImageTexture(art.imageUrl);
  const frame: WallArtFrame = art.frame ?? 'gallery';
  const w = art.widthM;
  const h = wallArtHeightM(art);
  const frameMat = useMemo(() => {
    if (frame === 'gold') return new THREE.MeshStandardMaterial({ color: '#c9a227', metalness: 0.9, roughness: 0.3 });
    if (frame === 'thin' || frame === 'gallery') return new THREE.MeshStandardMaterial({ color: '#141414', metalness: 0.1, roughness: 0.45 });
    return new THREE.MeshStandardMaterial({ color: '#f3f1ec', roughness: 0.85 });
  }, [frame]);
  useEffect(() => () => frameMat.dispose(), [frameMat]);

  const band = frame === 'gold' ? Math.max(0.05, w * 0.06) : frame === 'gallery' ? Math.max(0.03, w * 0.025) : frame === 'thin' ? 0.018 : 0;
  const mat = frame === 'gallery' ? Math.max(0.05, w * 0.09) : 0;
  const depth = frame === 'canvas' ? 0.035 : frame === 'none' ? 0 : frame === 'gold' ? 0.05 : 0.03;
  // Image intérieure (le passe-partout la réduit dans le cadre galerie).
  const iw = Math.max(0.05, w - band * 2 - mat * 2);
  const ih = Math.max(0.05, h - band * 2 - mat * 2);
  const imgMaterial = (
    <meshStandardMaterial
      map={tex}
      color={tex ? '#ffffff' : '#d6d3d1'}
      roughness={frame === 'none' ? 0.9 : 0.55}
      transparent={(art.opacity ?? 1) < 1}
      opacity={art.opacity ?? 1}
      emissive={selected ? '#4f46e5' : '#000000'}
      emissiveIntensity={selected ? 0.25 : 0}
      polygonOffset
      polygonOffsetFactor={-2}
    />
  );
  return (
    <group>
      {frame === 'canvas' ? (
        <mesh position={[0, 0, depth / 2]} material={frameMat} castShadow>
          <boxGeometry args={[w, h, depth]} />
        </mesh>
      ) : null}
      {band > 0 ? <FrameBorder w={w - band * 2} h={h - band * 2} band={band} depth={depth} material={frameMat} /> : null}
      {mat > 0 ? (
        <mesh position={[0, 0, 0.004]}>
          <planeGeometry args={[w - band * 2, h - band * 2]} />
          <meshStandardMaterial color="#fbfaf7" roughness={0.9} />
        </mesh>
      ) : null}
      <mesh position={[0, 0, frame === 'canvas' ? depth + 0.001 : frame === 'none' ? 0.002 : 0.008]}>
        <planeGeometry args={frame === 'canvas' || frame === 'none' ? [w, h] : [iw, ih]} />
        {imgMaterial}
      </mesh>
      {frame === 'gallery' || frame === 'thin' || frame === 'gold' ? (
        // Vitre légèrement réfléchissante.
        <mesh position={[0, 0, depth * 0.7]}>
          <planeGeometry args={[w - band * 2, h - band * 2]} />
          <meshPhysicalMaterial color="#ffffff" transparent opacity={0.06} roughness={0.05} metalness={0} clearcoat={1} depthWrite={false} />
        </mesh>
      ) : null}
    </group>
  );
}

function GraffitiArt({ art, selected }: { art: RoomWallArt; selected: boolean }) {
  const style = art.graffitiStyle ?? 'bubble';
  const text = art.text ?? 'LOVE';
  const fill = art.fillColor ?? '#ff6b35';
  const outline = art.outlineColor ?? '#2b1055';
  const texture = useMemo(() => {
    if (typeof document === 'undefined') return null;
    const t = new THREE.CanvasTexture(drawGraffiti(text, style, fill, outline, art.aspect));
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  }, [text, style, fill, outline, art.aspect]);
  useEffect(() => () => texture?.dispose(), [texture]);
  const w = art.widthM;
  const h = wallArtHeightM(art);
  const neon = style === 'neon';
  return (
    <group>
      <mesh position={[0, 0, neon ? 0.03 : 0.003]}>
        <planeGeometry args={[w, h]} />
        {neon ? (
          <meshStandardMaterial
            map={texture}
            emissiveMap={texture}
            emissive="#ffffff"
            emissiveIntensity={selected ? 2.2 : 1.6}
            transparent
            depthWrite={false}
            toneMapped={false}
          />
        ) : (
          <meshStandardMaterial
            map={texture}
            transparent
            alphaTest={0.02}
            roughness={0.75}
            emissive={selected ? '#4f46e5' : '#000000'}
            emissiveIntensity={selected ? 0.25 : 0}
            polygonOffset
            polygonOffsetFactor={-2}
          />
        )}
      </mesh>
      {neon ? <pointLight position={[0, 0, 0.5]} color={fill} intensity={0.9} distance={Math.max(2.5, w * 1.4)} decay={2} /> : null}
    </group>
  );
}

/** Tous les éléments d’un mur, posés sur sa face côté pièce. */
export function WallArtLayer({
  art,
  lengthM,
  wallHeightM,
  thicknessM,
  inSide,
  selectedId,
}: {
  art: RoomWallArt[];
  lengthM: number;
  wallHeightM: number;
  thicknessM: number;
  inSide: 1 | -1;
  selectedId?: string | null;
}) {
  if (!art.length) return null;
  return (
    <group position={[0, 0, inSide * (thicknessM / 2 + 0.004)]} rotation={[0, inSide === 1 ? 0 : Math.PI, 0]}>
      {art.map((a) => {
        // Face −z : l’axe x est inversé, on recale pour que t = 0 reste au début du mur.
        const x = (a.t - 0.5) * lengthM * inSide;
        const y = a.yM - wallHeightM / 2;
        return (
          <group key={a.id} position={[x, y, 0]}>
            {a.kind === 'graffiti' ? <GraffitiArt art={a} selected={selectedId === a.id} /> : <ImageArt art={a} selected={selectedId === a.id} />}
          </group>
        );
      })}
    </group>
  );
}
