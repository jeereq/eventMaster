'use client';

import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useScreenImageTexture } from '@/components/room/useScreenImage';
import { useDefaultScreenPicture, type ScreenPicture } from '@/components/room/screenPictures';
import type { ImageCropRect, ScreenRatio } from '@/lib/roomLayoutUtils';
import { screenRatioAspect } from '@/lib/roomLayoutUtils';

/**
 * Écrans du catalogue (hors cinéma, télévision murale et écrans de bureau) : mur LED incurvé,
 * mur d'images, toile motorisée avec vidéoprojecteur, écran sur trépied, totem LED,
 * télévision sur pied roulant et écran gonflable de plein air.
 *
 * Repère commun : centré en x, sol en y = 0, image tournée vers le public (+Z).
 * Chaque écran affiche l'image choisie dans l'éditeur, sinon une image par défaut,
 * et s'éteint quand `powered` vaut false.
 */

type CommonScreenProps = {
  w: number;
  ratio?: ScreenRatio | string;
  /** Hauteur du bas de l'image (m). */
  elevationM?: number;
  powered?: boolean;
  selected?: boolean;
  imageUrl?: string;
  imageCrop?: ImageCropRect;
};

const SELECT = '#60a5fa';

/** Dalle d'image : image choisie, sinon image par défaut ; noir brillant éteint. */
function ScreenSurface({
  width,
  height,
  geometry,
  picture,
  imageUrl,
  imageCrop,
  powered,
  glow = 0.9,
  matte = false,
}: {
  width: number;
  height: number;
  geometry?: THREE.BufferGeometry;
  picture: ScreenPicture;
  imageUrl?: string;
  imageCrop?: ImageCropRect;
  powered: boolean;
  glow?: number;
  /** Toile de projection (blanc mat) plutôt que dalle émissive vitrée. */
  matte?: boolean;
}) {
  const aspect = width / Math.max(0.01, height);
  const image = useScreenImageTexture(imageUrl, imageCrop, aspect);
  const fallback = useDefaultScreenPicture(picture, aspect);
  const shown = image ?? fallback;
  return (
    <mesh geometry={geometry}>
      {geometry ? null : <planeGeometry args={[width, height]} />}
      {powered && shown ? (
        <meshStandardMaterial
          key={shown.uuid}
          color="#ffffff"
          map={shown}
          emissive="#ffffff"
          emissiveMap={shown}
          emissiveIntensity={glow}
          roughness={matte ? 0.9 : 0.25}
          toneMapped={false}
        />
      ) : (
        <meshStandardMaterial
          color={matte ? '#d9d9de' : '#07090f'}
          roughness={matte ? 0.9 : 0.12}
          metalness={matte ? 0 : 0.35}
        />
      )}
    </mesh>
  );
}

/**
 * Faisceau lumineux d'un projecteur : pyramide additive très légère, plus dense
 * près de l'objectif, qui s'ouvre jusqu'aux quatre coins de l'image.
 */
export function ProjectionBeam({
  apex,
  corners,
  color = '#cfe0ff',
  strength = 0.03,
}: {
  apex: [number, number, number];
  /** Coins de l'image : bas gauche, bas droit, haut droit, haut gauche. */
  corners: [[number, number, number], [number, number, number], [number, number, number], [number, number, number]];
  color?: string;
  strength?: number;
}) {
  const key = [...apex, ...corners.flat()].map((v) => v.toFixed(2)).join(',');
  const geo = useMemo(() => {
    const c = new THREE.Color(color);
    // Couleurs linéaires, additionnées sur les deux faces traversées par le regard.
    const near = c.clone().multiplyScalar(strength);
    const far = c.clone().multiplyScalar(strength * 0.18);
    const pos: number[] = [];
    const col: number[] = [];
    for (let i = 0; i < 4; i += 1) {
      const a = corners[i];
      const b = corners[(i + 1) % 4];
      pos.push(...apex, ...a, ...b);
      col.push(near.r, near.g, near.b, far.r, far.g, far.b, far.r, far.g, far.b);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    return g;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, color, strength]);
  useEffect(() => () => geo.dispose(), [geo]);
  return (
    <mesh geometry={geo} renderOrder={5} raycast={() => null}>
      <meshBasicMaterial
        vertexColors
        transparent
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        side={THREE.DoubleSide}
        toneMapped={false}
      />
    </mesh>
  );
}

/** Tube droit entre deux points (pieds de trépied, jambes de force). */
function Rod({
  from,
  to,
  radius,
  radiusTop,
  color,
  metal = 0.8,
  roughness = 0.3,
  segments = 10,
}: {
  from: [number, number, number];
  to: [number, number, number];
  radius: number;
  radiusTop?: number;
  color: string;
  metal?: number;
  roughness?: number;
  segments?: number;
}) {
  const a = new THREE.Vector3(...from);
  const b = new THREE.Vector3(...to);
  const dir = b.clone().sub(a);
  const len = dir.length();
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  const mid = a.add(b).multiplyScalar(0.5);
  return (
    <mesh position={mid} quaternion={q} castShadow>
      <cylinderGeometry args={[radiusTop ?? radius, radius, len, segments]} />
      <meshStandardMaterial color={color} metalness={metal} roughness={roughness} />
    </mesh>
  );
}

/** Grille de joints entre modules LED (traits sombres sur fond transparent). */
function useModuleGridTexture(): THREE.Texture | null {
  const tex = useMemo(() => {
    if (typeof document === 'undefined') return null;
    const c = document.createElement('canvas');
    c.width = 64;
    c.height = 64;
    const ctx = c.getContext('2d');
    if (!ctx) return null;
    ctx.clearRect(0, 0, 64, 64);
    ctx.fillStyle = 'rgba(0,0,0,0.32)';
    ctx.fillRect(0, 0, 64, 1);
    ctx.fillRect(0, 0, 1, 64);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    return t;
  }, []);
  useEffect(() => () => tex?.dispose(), [tex]);
  return tex;
}

/**
 * Plan cintré : l'abscisse curviligne devient un arc de rayon `radius`, bords vers le public.
 * `offset` > 0 recule la surface (caissons arrière), < 0 l'avance (joints devant l'image).
 */
function curvedPlane(width: number, height: number, radius: number, offset = 0): THREE.BufferGeometry {
  const g = new THREE.PlaneGeometry(width, height, 64, 1);
  const p = g.getAttribute('position');
  // Le centre de courbure est côté public (z = radius) : un rayon plus grand recule vers le mur.
  const r = radius + offset;
  for (let i = 0; i < p.count; i += 1) {
    const a = p.getX(i) / radius;
    p.setX(i, r * Math.sin(a));
    p.setZ(i, radius - r * Math.cos(a));
  }
  g.computeVertexNormals();
  return g;
}

/* ------------------------------------------------------------------ */
/* Mur LED incurvé                                                      */
/* ------------------------------------------------------------------ */

export function LedCurvedWallMesh({
  w,
  ratio = '21:9',
  elevationM = 0.5,
  powered = true,
  selected = false,
  imageUrl,
  imageCrop,
}: CommonScreenProps) {
  const sw = Math.max(2, w);
  const sh = Math.min(5.5, sw / screenRatioAspect(ratio, 21 / 9));
  const bottom = Math.max(0.2, elevationM);
  const radius = sw * 0.95;
  const span = sw / radius;
  const front = useMemo(() => curvedPlane(sw, sh, radius), [sw, sh, radius]);
  const back = useMemo(() => curvedPlane(sw, sh + 0.08, radius, 0.14), [sw, sh, radius]);
  const seams = useMemo(() => curvedPlane(sw, sh, radius, -0.004), [sw, sh, radius]);
  useEffect(() => () => { front.dispose(); back.dispose(); seams.dispose(); }, [front, back, seams]);
  const grid = useModuleGridTexture();
  const gridTex = useMemo(() => {
    if (!grid) return null;
    const t = grid.clone();
    t.repeat.set(sw / 0.5, sh / 0.5);
    t.needsUpdate = true;
    return t;
  }, [grid, sw, sh]);
  useEffect(() => () => gridTex?.dispose(), [gridTex]);

  const feet = Math.max(3, Math.round(sw / 1.5) + 1);
  const at = (s: number, off: number) => {
    const a = s / radius;
    const r = radius + off;
    return { x: r * Math.sin(a), z: radius - r * Math.cos(a), rot: -a };
  };

  return (
    <group>
      <group position={[0, bottom + sh / 2, 0]}>
        {/* Caissons arrière */}
        <mesh geometry={back}>
          <meshStandardMaterial color={selected ? '#334155' : '#16181d'} roughness={0.7} metalness={0.4} side={THREE.DoubleSide} />
        </mesh>
        <ScreenSurface width={sw} height={sh} geometry={front} picture="stage" imageUrl={imageUrl} imageCrop={imageCrop} powered={powered} glow={1} />
        {gridTex ? (
          <mesh geometry={seams} raycast={() => null}>
            <meshBasicMaterial map={gridTex} transparent depthWrite={false} toneMapped={false} />
          </mesh>
        ) : null}
        {/* Joues latérales */}
        {([-1, 1] as const).map((side) => {
          const p = at((side * sw) / 2, 0.07);
          return (
            <mesh key={side} position={[p.x, 0, p.z]} rotation={[0, p.rot, 0]}>
              <boxGeometry args={[0.04, sh + 0.08, 0.16]} />
              <meshStandardMaterial color={selected ? SELECT : '#0f1115'} roughness={0.5} metalness={0.5} />
            </mesh>
          );
        })}
      </group>
      {/* Pieds de structure au sol (ground stack) */}
      {Array.from({ length: feet }).map((_, i) => {
        const s = -sw / 2 + (sw * i) / (feet - 1);
        const p = at(s, 0.3);
        return (
          <group key={i} position={[p.x, 0, p.z]} rotation={[0, p.rot, 0]}>
            <mesh position={[0, (bottom + sh * 0.6) / 2, 0]} castShadow>
              <boxGeometry args={[0.06, bottom + sh * 0.6, 0.06]} />
              <meshStandardMaterial color="#2a2d33" metalness={0.8} roughness={0.35} />
            </mesh>
            <mesh position={[0, 0.02, -0.25]} receiveShadow>
              <boxGeometry args={[0.12, 0.04, 0.9]} />
              <meshStandardMaterial color="#1f2227" metalness={0.75} roughness={0.4} />
            </mesh>
            <Rod from={[0, 0.04, -0.68]} to={[0, bottom + sh * 0.55, -0.02]} radius={0.02} color="#2a2d33" />
          </group>
        );
      })}
      {powered ? (
        <>
          <pointLight position={[0, bottom + sh * 0.5, radius * (1 - Math.cos(span / 2)) + 1.5]} intensity={2.2} distance={sw * 1.6} decay={1.6} color="#c4b5fd" />
          <pointLight position={[sw * 0.3, bottom + sh * 0.4, 2]} intensity={1.2} distance={sw} decay={1.6} color="#67e8f9" />
        </>
      ) : null}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Mur d'images 3 × 3                                                   */
/* ------------------------------------------------------------------ */

export function VideoWallMesh({
  w,
  elevationM = 0.9,
  powered = true,
  selected = false,
  imageUrl,
  imageCrop,
}: CommonScreenProps) {
  const cols = 3;
  const rows = 3;
  const sw = Math.max(1.6, w);
  const pw = sw / cols;
  const ph = pw * (9 / 16);
  const sh = ph * rows;
  const bottom = Math.max(0.3, elevationM);
  const bezel = 0.012;
  const frame = selected ? SELECT : '#0b0c0f';
  return (
    <group>
      <group position={[0, bottom + sh / 2, 0]}>
        <mesh position={[0, 0, -0.05]} castShadow>
          <boxGeometry args={[sw + 0.02, sh + 0.02, 0.09]} />
          <meshStandardMaterial color={frame} roughness={0.45} metalness={0.5} />
        </mesh>
        <group position={[0, 0, 0.002]}>
          <ScreenSurface width={sw} height={sh} picture="stage" imageUrl={imageUrl} imageCrop={imageCrop} powered={powered} glow={0.85} />
        </group>
        {/* Bords fins entre les dalles */}
        {Array.from({ length: cols - 1 }).map((_, i) => (
          <mesh key={`v${i}`} position={[-sw / 2 + pw * (i + 1), 0, 0.005]}>
            <boxGeometry args={[bezel, sh, 0.004]} />
            <meshStandardMaterial color="#050608" roughness={0.4} />
          </mesh>
        ))}
        {Array.from({ length: rows - 1 }).map((_, i) => (
          <mesh key={`h${i}`} position={[0, -sh / 2 + ph * (i + 1), 0.005]}>
            <boxGeometry args={[sw, bezel, 0.004]} />
            <meshStandardMaterial color="#050608" roughness={0.4} />
          </mesh>
        ))}
      </group>
      {/* Pied double colonne avec semelles */}
      {([-1, 1] as const).map((side) => (
        <group key={side} position={[side * sw * 0.28, 0, -0.14]}>
          <mesh position={[0, (bottom + sh * 0.9) / 2, 0]} castShadow>
            <boxGeometry args={[0.1, bottom + sh * 0.9, 0.06]} />
            <meshStandardMaterial color="#25272c" metalness={0.75} roughness={0.35} />
          </mesh>
          <mesh position={[0, 0.03, 0.05]} receiveShadow castShadow>
            <boxGeometry args={[0.12, 0.06, 0.75]} />
            <meshStandardMaterial color="#1c1e22" metalness={0.7} roughness={0.4} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, bottom * 0.5, -0.14]}>
        <boxGeometry args={[sw * 0.56, 0.06, 0.05]} />
        <meshStandardMaterial color="#25272c" metalness={0.75} roughness={0.35} />
      </mesh>
      {powered ? <pointLight position={[0, bottom + sh * 0.5, 1.2]} intensity={1} distance={6} decay={1.6} color="#c7d2fe" /> : null}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Toile motorisée + vidéoprojecteur au plafond                         */
/* ------------------------------------------------------------------ */

export function MotorizedScreenMesh({
  w,
  ratio = '16:9',
  elevationM = 1,
  ceilingM = 3.2,
  powered = true,
  selected = false,
  imageUrl,
  imageCrop,
}: CommonScreenProps & { ceilingM?: number }) {
  const sw = Math.max(1.2, w);
  const sh = sw / screenRatioAspect(ratio, 16 / 9);
  const ceiling = Math.max(elevationM + sh + 0.5, ceilingM);
  const caseY = ceiling - 0.12;
  const bottom = Math.max(0.4, Math.min(elevationM, caseY - sh - 0.25));
  const top = bottom + sh;
  const border = Math.max(0.04, sw * 0.025);
  const throwM = Math.max(2.4, Math.min(7, sw * 1.45));
  const projY = Math.min(caseY - 0.15, Math.max(top + 0.15, caseY - 0.5));
  const apex: [number, number, number] = [0, projY, throwM - 0.2];
  return (
    <group>
      {/* Carter au plafond */}
      <mesh position={[0, caseY, 0]} castShadow>
        <boxGeometry args={[sw + 2 * border + 0.3, 0.13, 0.14]} />
        <meshStandardMaterial color={selected ? SELECT : '#eef0f3'} roughness={0.4} metalness={0.3} />
      </mesh>
      {/* Retombée noire entre le carter et l'image */}
      <mesh position={[0, (caseY + top) / 2, 0]}>
        <planeGeometry args={[sw + 2 * border, Math.max(0.01, caseY - top)]} />
        <meshStandardMaterial color="#0a0a0c" roughness={0.95} side={THREE.DoubleSide} />
      </mesh>
      {/* Bordures noires de la toile */}
      <mesh position={[0, bottom + sh / 2, -0.004]}>
        <planeGeometry args={[sw + 2 * border, sh + 2 * border]} />
        <meshStandardMaterial color="#0a0a0c" roughness={0.95} side={THREE.DoubleSide} />
      </mesh>
      <group position={[0, bottom + sh / 2, 0]}>
        <ScreenSurface width={sw} height={sh} picture="landscape" imageUrl={imageUrl} imageCrop={imageCrop} powered={powered} glow={0.75} matte />
      </group>
      {/* Barre de lestage */}
      <mesh position={[0, bottom - border - 0.015, 0]}>
        <boxGeometry args={[sw + 2 * border, 0.03, 0.03]} />
        <meshStandardMaterial color="#1f2125" metalness={0.6} roughness={0.35} />
      </mesh>
      {/* Vidéoprojecteur suspendu */}
      <group position={[0, projY, throwM]}>
        <mesh position={[0, (ceiling - projY) / 2 + 0.05, 0]}>
          <cylinderGeometry args={[0.018, 0.018, Math.max(0.05, ceiling - projY - 0.1), 10]} />
          <meshStandardMaterial color="#d4d4d8" metalness={0.7} roughness={0.3} />
        </mesh>
        <mesh position={[0, 0.02, 0]} castShadow>
          <boxGeometry args={[0.44, 0.15, 0.36]} />
          <meshStandardMaterial color={selected ? SELECT : '#f4f4f5'} roughness={0.35} metalness={0.15} />
        </mesh>
        <mesh position={[0.1, 0.02, -0.19]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.05, 0.055, 0.05, 20]} />
          <meshStandardMaterial color="#18181b" metalness={0.6} roughness={0.2} />
        </mesh>
        <mesh position={[0.1, 0.02, -0.216]}>
          <circleGeometry args={[0.04, 20]} />
          <meshStandardMaterial color="#bfdbfe" emissive={powered ? '#bfdbfe' : '#000000'} emissiveIntensity={powered ? 1.6 : 0} toneMapped={false} />
        </mesh>
      </group>
      {powered ? (
        <ProjectionBeam
          apex={[apex[0] + 0.1, apex[1] + 0.02, apex[2]]}
          corners={[[-sw / 2, bottom, 0.02], [sw / 2, bottom, 0.02], [sw / 2, top, 0.02], [-sw / 2, top, 0.02]]}
          strength={0.016}
        />
      ) : null}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Écran de projection sur trépied                                       */
/* ------------------------------------------------------------------ */

export function TripodScreenMesh({
  w,
  ratio = '16:9',
  elevationM = 0.9,
  powered = true,
  selected = false,
  imageUrl,
  imageCrop,
}: CommonScreenProps) {
  const sw = Math.max(1, Math.min(3.6, w));
  const sh = sw / screenRatioAspect(ratio, 16 / 9);
  const bottom = Math.max(0.5, elevationM);
  const top = bottom + sh;
  const poleTop = top + 0.12;
  const border = 0.035;
  const metal = selected ? SELECT : '#2b2d31';
  return (
    <group>
      {/* Mât central et trépied */}
      <mesh position={[0, poleTop / 2, -0.06]} castShadow>
        <cylinderGeometry args={[0.016, 0.02, poleTop, 12]} />
        <meshStandardMaterial color={metal} metalness={0.8} roughness={0.3} />
      </mesh>
      {[0, 1, 2].map((k) => {
        const a = (k / 3) * Math.PI * 2 - Math.PI / 2;
        return (
          <Rod
            key={k}
            from={[Math.cos(a) * 0.55, 0, -0.06 + Math.sin(a) * 0.55]}
            to={[0, 0.62, -0.06]}
            radius={0.012}
            color={metal}
          />
        );
      })}
      {/* Potence et crochet en haut */}
      <mesh position={[0, poleTop, -0.03]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.012, 0.012, sw + 2 * border, 8]} />
        <meshStandardMaterial color={metal} metalness={0.8} roughness={0.3} />
      </mesh>
      {/* Toile avec bordure noire */}
      <mesh position={[0, bottom + sh / 2, -0.012]}>
        <planeGeometry args={[sw + 2 * border, sh + 2 * border + 0.1]} />
        <meshStandardMaterial color="#0a0a0c" roughness={0.95} side={THREE.DoubleSide} />
      </mesh>
      <group position={[0, bottom + sh / 2, -0.008]}>
        <ScreenSurface width={sw} height={sh} picture="landscape" imageUrl={imageUrl} imageCrop={imageCrop} powered={powered} glow={0.7} matte />
      </group>
      {/* Carter d'enroulement en bas */}
      <mesh position={[0, bottom - border - 0.04, -0.02]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.045, 0.045, sw + 0.12, 16]} />
        <meshStandardMaterial color={selected ? SELECT : '#3a3d43'} metalness={0.6} roughness={0.35} />
      </mesh>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Totem LED vertical                                                   */
/* ------------------------------------------------------------------ */

export function LedTotemMesh({
  w,
  elevationM = 0.08,
  powered = true,
  selected = false,
  imageUrl,
  imageCrop,
}: CommonScreenProps) {
  const pw = Math.max(0.45, Math.min(1.1, w * 0.92));
  const ph = pw * (16 / 9);
  const base = Math.max(0.05, Math.min(0.3, elevationM));
  const plinth = 0.32;
  const bodyH = plinth + ph + 0.1;
  const body = selected ? SELECT : '#15171c';
  return (
    <group>
      <mesh position={[0, base / 2, 0]} receiveShadow castShadow>
        <boxGeometry args={[pw + 0.2, base, 0.42]} />
        <meshStandardMaterial color="#1b1d21" metalness={0.7} roughness={0.35} />
      </mesh>
      <mesh position={[0, base + bodyH / 2, -0.02]} castShadow>
        <boxGeometry args={[pw + 0.06, bodyH, 0.1]} />
        <meshStandardMaterial color={body} metalness={0.5} roughness={0.4} />
      </mesh>
      <group position={[0, base + plinth + ph / 2, 0.032]}>
        <ScreenSurface width={pw} height={ph} picture="signage" imageUrl={imageUrl} imageCrop={imageCrop} powered={powered} glow={0.95} />
      </group>
      {/* Bandeau lumineux du socle */}
      <mesh position={[0, base + plinth * 0.5, 0.032]}>
        <planeGeometry args={[pw * 0.7, 0.025]} />
        <meshStandardMaterial color="#ffffff" emissive={powered ? '#a5b4fc' : '#000000'} emissiveIntensity={powered ? 1.4 : 0} toneMapped={false} />
      </mesh>
      {powered ? <pointLight position={[0, base + plinth + ph * 0.5, 0.6]} intensity={0.6} distance={3} decay={1.8} color="#f0abfc" /> : null}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Télévision sur pied roulant                                          */
/* ------------------------------------------------------------------ */

export function TvCartMesh({
  w,
  ratio = '16:9',
  elevationM = 1.05,
  powered = true,
  selected = false,
  imageUrl,
  imageCrop,
}: CommonScreenProps) {
  const tw = Math.max(0.9, Math.min(2.2, w * 0.97));
  const th = tw / screenRatioAspect(ratio === '9:16' ? '16:9' : ratio, 16 / 9);
  const bottom = Math.max(0.6, elevationM);
  const metal = selected ? SELECT : '#2a2c30';
  const postX = Math.min(0.3, tw * 0.22);
  const postH = bottom + th * 0.75;
  return (
    <group>
      {/* Châssis : deux semelles, traverse et roulettes */}
      {([-1, 1] as const).map((side) => (
        <group key={side} position={[side * postX, 0, -0.08]}>
          <mesh position={[0, 0.09, 0]} castShadow>
            <boxGeometry args={[0.07, 0.05, 0.72]} />
            <meshStandardMaterial color={metal} metalness={0.75} roughness={0.35} />
          </mesh>
          {([-1, 1] as const).map((end) => (
            <group key={end} position={[0, 0.035, end * 0.33]}>
              <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
                <cylinderGeometry args={[0.035, 0.035, 0.03, 14]} />
                <meshStandardMaterial color="#111214" roughness={0.6} />
              </mesh>
            </group>
          ))}
          <mesh position={[0, postH / 2, 0]} castShadow>
            <boxGeometry args={[0.06, postH, 0.04]} />
            <meshStandardMaterial color={metal} metalness={0.75} roughness={0.35} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 0.11, -0.08]}>
        <boxGeometry args={[postX * 2, 0.04, 0.04]} />
        <meshStandardMaterial color={metal} metalness={0.75} roughness={0.35} />
      </mesh>
      {/* Tablette pour le boîtier de visioconférence */}
      <mesh position={[0, bottom * 0.62, -0.02]} castShadow receiveShadow>
        <boxGeometry args={[postX * 2 + 0.16, 0.02, 0.32]} />
        <meshStandardMaterial color="#3a3d43" metalness={0.5} roughness={0.4} />
      </mesh>
      <mesh position={[0, bottom * 0.62 + 0.04, 0]} castShadow>
        <boxGeometry args={[0.26, 0.06, 0.2]} />
        <meshStandardMaterial color="#111214" roughness={0.5} />
      </mesh>
      {/* Téléviseur */}
      <group position={[0, bottom + th / 2, 0]}>
        <mesh position={[0, 0, -0.03]} castShadow>
          <boxGeometry args={[tw, th, 0.05]} />
          <meshStandardMaterial color="#0d0f12" roughness={0.35} metalness={0.6} />
        </mesh>
        <group position={[0, 0, 0.0]}>
          <ScreenSurface width={tw * 0.985} height={th * 0.975} picture="stage" imageUrl={imageUrl} imageCrop={imageCrop} powered={powered} glow={0.8} />
        </group>
      </group>
      {/* Caméra de visioconférence au-dessus */}
      <mesh position={[0, bottom + th + 0.05, -0.01]} castShadow>
        <boxGeometry args={[0.32, 0.06, 0.07]} />
        <meshStandardMaterial color="#1b1d21" roughness={0.4} />
      </mesh>
      <mesh position={[0, bottom + th + 0.05, 0.026]}>
        <circleGeometry args={[0.018, 16]} />
        <meshStandardMaterial color="#0b1220" metalness={0.8} roughness={0.1} />
      </mesh>
      {powered ? <pointLight position={[0, bottom + th / 2, 0.7]} intensity={0.5} distance={3.2} decay={1.8} color="#a5b4fc" /> : null}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Écran gonflable de plein air                                         */
/* ------------------------------------------------------------------ */

export function InflatableScreenMesh({
  w,
  d = 3,
  ratio = '16:9',
  elevationM = 1.3,
  powered = true,
  selected = false,
  imageUrl,
  imageCrop,
}: CommonScreenProps & { d?: number }) {
  const sw = Math.max(3, w * 0.82);
  const sh = sw / screenRatioAspect(ratio, 16 / 9);
  const r = Math.max(0.18, Math.min(0.42, sw * 0.04));
  const bottom = Math.max(r * 2 + 0.2, elevationM);
  const top = bottom + sh;
  const zFront = Math.min(d / 2 - r, d * 0.3);
  const zBack = zFront - Math.max(1.2, d * 0.75);
  const tube = selected ? SELECT : '#1f2024';
  const accent = '#3f3f46';
  const ox = sw / 2 + r;
  return (
    <group>
      {/* Cadre gonflé : traverses haute et basse */}
      {[top + r, bottom - r].map((y) => (
        <mesh key={y} position={[0, y, zFront]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[r, r, sw + 2 * r, 24]} />
          <meshStandardMaterial color={tube} roughness={0.55} />
        </mesh>
      ))}
      {/* Montants latéraux jusqu'au sol */}
      {([-1, 1] as const).map((side) => (
        <group key={side}>
          <mesh position={[side * ox, (top + r) / 2, zFront]} castShadow>
            <cylinderGeometry args={[r, r * 1.15, top + r, 24]} />
            <meshStandardMaterial color={tube} roughness={0.55} />
          </mesh>
          <mesh position={[side * ox, top + r, zFront]}>
            <sphereGeometry args={[r, 20, 16]} />
            <meshStandardMaterial color={tube} roughness={0.55} />
          </mesh>
          {/* Jambe de force arrière inclinée */}
          <Rod
            from={[side * ox, r * 0.8, zBack]}
            to={[side * ox, top + r * 0.4, zFront - r * 0.5]}
            radius={r * 0.95}
            radiusTop={r * 0.8}
            color={accent}
            metal={0}
            roughness={0.6}
            segments={20}
          />
          {/* Sangle et piquet */}
          <mesh position={[side * (ox + 0.5), 0.6, zBack - 0.3]} rotation={[0.5, 0, side * -0.6]}>
            <cylinderGeometry args={[0.008, 0.008, 1.5, 4]} />
            <meshStandardMaterial color="#f59e0b" roughness={0.7} />
          </mesh>
        </group>
      ))}
      {/* Boudin arrière au sol */}
      <mesh position={[0, r * 0.8, zBack]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[r * 0.8, r * 0.8, sw + 2 * r, 20]} />
        <meshStandardMaterial color={accent} roughness={0.6} />
      </mesh>
      {/* Jupe noire sous l'image */}
      <mesh position={[0, (bottom - r) / 2, zFront - 0.02]}>
        <planeGeometry args={[sw, Math.max(0.05, bottom - 2 * r)]} />
        <meshStandardMaterial color="#111114" roughness={0.9} side={THREE.DoubleSide} />
      </mesh>
      {/* Toile */}
      <group position={[0, bottom + sh / 2, zFront + 0.01]}>
        <ScreenSurface width={sw} height={sh} picture="landscape" imageUrl={imageUrl} imageCrop={imageCrop} powered={powered} glow={0.8} matte />
      </group>
      {/* Souffleur */}
      <group position={[sw * 0.3, 0, zBack + 0.4]}>
        <mesh position={[0, 0.2, 0]} castShadow>
          <cylinderGeometry args={[0.2, 0.22, 0.4, 18]} />
          <meshStandardMaterial color="#dc2626" roughness={0.5} />
        </mesh>
        <mesh position={[0, 0.3, (zFront - zBack - 0.4) / 2]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.08, 0.08, Math.max(0.2, zFront - zBack - 0.6), 12]} />
          <meshStandardMaterial color="#27272a" roughness={0.8} />
        </mesh>
      </group>
      {powered ? (
        <pointLight position={[0, bottom + sh * 0.5, zFront + 3]} intensity={3.5} distance={sw * 2.2} decay={1.6} color="#ffd9b0" />
      ) : null}
    </group>
  );
}
