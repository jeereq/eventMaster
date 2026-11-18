'use client';

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import type { SimulatedGuest } from '@/lib/roomGuestSimulation';

/**
 * Avatars des invités simulés : silhouettes aux proportions humaines (tête, cou,
 * buste galbé, bras et jambes articulés, mains, chaussures, coiffures variées,
 * costume avec chemise et cravate, robe évasée ou boubou), assises, debout ou en
 * train de danser. Les membres sont tracés d'articulation en articulation
 * (épaule → coude → poignet, hanche → genou → cheville) pour des poses naturelles.
 *
 * Tout le corps est dessiné en quelques maillages « instanciés », quel que soit
 * le nombre d'invités, pour garder la 3D fluide avec plusieurs centaines de
 * personnes. Un invité personnalisé reçoit en plus sa photo sur le visage.
 * Les avatars ne captent pas les clics : on sélectionne toujours la table ou la chaise.
 */

type PartKind = 'limb' | 'joint' | 'torso' | 'skirt' | 'robe' | 'box';
const PART_KINDS: PartKind[] = ['limb', 'joint', 'torso', 'skirt', 'robe', 'box'];

type Vec3 = [number, number, number];
interface PartSpec {
  kind: PartKind;
  pos: Vec3;
  /** Rotation : quaternion (x, y, z, w). */
  quat?: [number, number, number, number];
  scale: Vec3;
  color: string;
}

const UP = new THREE.Vector3(0, 1, 0);
const tmpDir = new THREE.Vector3();
const tmpQuat = new THREE.Quaternion();

/** Segment de membre (tronc de cône) d'une articulation à l'autre. */
function seg(a: Vec3, b: Vec3, diameter: number, color: string): PartSpec {
  tmpDir.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const len = tmpDir.length() || 0.001;
  tmpQuat.setFromUnitVectors(UP, tmpDir.multiplyScalar(1 / len));
  return {
    kind: 'limb',
    pos: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2],
    quat: [tmpQuat.x, tmpQuat.y, tmpQuat.z, tmpQuat.w],
    scale: [diameter, len, diameter],
    color,
  };
}

/** Rotule sphérique (épaule, coude, genou…) ou petit volume arrondi. */
function ball(pos: Vec3, r: Vec3 | number, color: string): PartSpec {
  const s: Vec3 = typeof r === 'number' ? [r, r, r] : r;
  return { kind: 'joint', pos, scale: s, color };
}

/** Membre en deux segments avec rotules, terminé par une main ou un pied. */
function limb(points: [Vec3, Vec3, Vec3], d0: number, d1: number, color: string): PartSpec[] {
  const [a, b, c] = points;
  return [
    ball(a, d0 * 0.48, color),
    seg(a, b, d0, color),
    // Rotule un peu plus large que les deux segments : pas de scintillement à la jonction.
    ball(b, Math.max(d0 * 0.43, d1 * 0.5) + 0.004, color),
    seg(b, c, d1, color),
  ];
}

function hand(at: Vec3, skin: string): PartSpec {
  return ball(at, [0.027, 0.042, 0.02], skin);
}

function shoe(ankle: Vec3, color: string, forward = 0.05): PartSpec {
  return { kind: 'box', pos: [ankle[0], ankle[1] - 0.035, ankle[2] + forward], scale: [0.085, 0.07, 0.22], color };
}

/** Variante de coiffure tirée de l'identité de l'invité (stable). */
function hairVariant(g: SimulatedGuest): number {
  return Math.floor((g.phase / (Math.PI * 2)) * 997) % 4;
}

const HEAD_R: Vec3 = [0.088, 0.112, 0.1];
const EYE = '#16100d';

/** Tête : cou, crâne, nez, oreilles, yeux et coiffure (ou foulard). */
function headParts(g: SimulatedGuest, neckBase: Vec3, tilt = 0): PartSpec[] {
  const [nx, ny, nz] = neckBase;
  const hy = ny + 0.135;
  const hz = nz + tilt;
  const parts: PartSpec[] = [
    seg([nx, ny - 0.04, nz], [nx, ny + 0.06, hz], 0.088, g.skin),
    ball([nx, hy, hz], HEAD_R, g.skin),
    ball([nx - 0.087, hy, hz - 0.005], [0.016, 0.028, 0.02], g.skin),
    ball([nx + 0.087, hy, hz - 0.005], [0.016, 0.028, 0.02], g.skin),
  ];
  if (!g.photoUrl) {
    parts.push(
      ball([nx, hy - 0.012, hz + 0.098], [0.016, 0.026, 0.02], g.skin),
      ball([nx - 0.033, hy + 0.014, hz + 0.088], [0.012, 0.008, 0.006], EYE),
      ball([nx + 0.033, hy + 0.014, hz + 0.088], [0.012, 0.008, 0.006], EYE),
    );
  }
  if (g.headwrap) {
    // Foulard / gele : volume noué et rehaussé au-dessus de la tête.
    parts.push(
      ball([nx, hy + 0.06, hz - 0.012], [0.104, 0.085, 0.112], g.headwrap),
      ball([nx, hy + 0.13, hz - 0.03], [0.09, 0.06, 0.085], g.headwrap),
    );
    return parts;
  }
  const v = hairVariant(g);
  const back = g.photoUrl ? -0.022 : -0.01;
  if (g.style === 'suit' || v === 0) {
    // Cheveux courts, ras sur les tempes.
    parts.push(ball([nx, hy + 0.035, hz + back], [0.092, 0.088, 0.1], g.hair));
  } else if (v === 1) {
    // Chignon haut.
    parts.push(
      ball([nx, hy + 0.035, hz + back], [0.093, 0.09, 0.102], g.hair),
      ball([nx, hy + 0.12, hz - 0.045], 0.05, g.hair),
    );
  } else if (v === 2) {
    // Afro volumineux.
    parts.push(ball([nx, hy + 0.05, hz - 0.02 + back], [0.125, 0.115, 0.125], g.hair));
  } else {
    // Cheveux longs / tresses tombant dans le dos.
    parts.push(
      ball([nx, hy + 0.035, hz + back], [0.094, 0.09, 0.103], g.hair),
      { kind: 'box', pos: [nx, hy - 0.12, hz - 0.075], scale: [0.16, 0.26, 0.05], color: g.hair },
    );
  }
  return parts;
}

/** Chemise et cravate devant le buste (costume). */
function suitFront(y: number, z: number, outfit: string): PartSpec[] {
  const light = outfit === '#f4f1de';
  return [
    // Col de chemise dans l'encolure de la veste, cravate qui descend sur le ventre.
    { kind: 'box', pos: [0, y + 0.05, z - 0.004], scale: [0.08, 0.14, 0.03], color: light ? '#1b1b1f' : '#f2efe8' },
    { kind: 'box', pos: [0, y - 0.005, z + 0.012], scale: [0.028, 0.21, 0.016], color: light ? '#7a1f2b' : '#5a1620' },
  ];
}

/** Pièces d'un invité, dans son repère (sol à y = 0, regard vers +Z). */
function guestParts(g: SimulatedGuest, t: number): PartSpec[] {
  const shoeColor = g.style === 'suit' ? '#121214' : g.style === 'dress' ? '#2a1c18' : '#3b2a20';
  const sleeve = g.style === 'boubou' ? 0.11 : 0.088;
  const forearm = g.style === 'boubou' ? 0.1 : 0.074;

  if (g.pose === 'seated') {
    const legColor = g.style === 'suit' ? g.bottom : g.style === 'dress' ? g.skin : g.outfit;
    const thighColor = g.style === 'suit' ? g.bottom : g.outfit;
    const thighD = g.style === 'boubou' ? 0.16 : 0.135;
    const parts: PartSpec[] = [];
    for (const side of [-1, 1]) {
      const hip: Vec3 = [side * 0.09, 0.55, -0.1];
      const knee: Vec3 = [side * 0.1, 0.56, 0.3];
      const ankle: Vec3 = [side * 0.1, 0.1, 0.33];
      parts.push(
        ball(hip, thighD / 2, thighColor),
        seg(hip, knee, thighD, thighColor),
        ball(knee, 0.058, thighColor),
        seg(knee, ankle, g.style === 'boubou' ? 0.13 : 0.1, legColor),
        shoe(ankle, shoeColor),
      );
    }
    // Bassin, buste légèrement penché vers la table.
    parts.push(
      { kind: 'torso', pos: [0, 0.6, -0.08], scale: [0.185, 0.56, 0.12], color: g.outfit },
    );
    if (g.style === 'dress') {
      // Jupe drapée sur les cuisses.
      parts.push({ kind: 'box', pos: [0, 0.57, 0.12], scale: [0.36, 0.1, 0.46], color: g.outfit });
    }
    if (g.style === 'suit') parts.push(...suitFront(0.99, 0.035, g.outfit));
    for (const side of [-1, 1]) {
      const shoulder: Vec3 = [side * 0.19, 1.06, -0.07];
      const elbow: Vec3 = [side * 0.22, 0.82, 0.02];
      const wrist: Vec3 = [side * 0.16, 0.79, 0.27];
      parts.push(...limb([shoulder, elbow, wrist], sleeve, forearm, g.outfit), hand([wrist[0] * 0.95, wrist[1], wrist[2] + 0.035], g.skin));
    }
    parts.push(...headParts(g, [0, 1.13, -0.06], 0.02));
    return parts;
  }

  const dancing = g.pose === 'dancing';
  const beat = dancing ? Math.sin(t * 4.2 + g.phase) : 0;
  const beat2 = dancing ? Math.sin(t * 2.1 + g.phase * 1.7) : 0;
  const lift = dancing ? Math.abs(beat) * 0.045 : 0;
  const hipY = 0.9 + lift;
  const parts: PartSpec[] = [];

  // Jambes : genoux qui fléchissent en rythme pour les danseurs.
  for (const side of [-1, 1]) {
    const bend = dancing ? Math.max(0, side * beat) * 0.1 : 0;
    const hip: Vec3 = [side * 0.085, hipY, 0];
    const knee: Vec3 = [side * 0.09, 0.48 + lift * 0.5 + bend * 0.3, 0.03 + bend];
    const ankle: Vec3 = [side * 0.09, 0.08 + (dancing ? Math.max(0, side * beat) * 0.06 : 0), 0];
    const legColor = g.style === 'suit' ? g.bottom : g.skin;
    if (g.style === 'boubou') {
      // Le boubou couvre les jambes : seules les chaussures dépassent.
      parts.push(shoe(ankle, shoeColor, 0.045));
      continue;
    }
    parts.push(
      ...limb([hip, knee, ankle], g.style === 'suit' ? 0.125 : 0.095, g.style === 'suit' ? 0.11 : 0.08, legColor),
      shoe(ankle, shoeColor),
    );
  }

  parts.push({ kind: 'torso', pos: [0, hipY - 0.04, 0], scale: [0.19, 0.6, 0.12], color: g.outfit });
  if (g.style === 'suit') {
    parts.push(...suitFront(hipY + 0.4, 0.106, g.outfit));
  } else if (g.style === 'dress') {
    parts.push({ kind: 'skirt', pos: [0, hipY - 0.46, 0], scale: [0.27, 0.56, 0.24], color: g.outfit });
  } else {
    parts.push({ kind: 'robe', pos: [0, 0.07, 0], scale: [0.26, hipY + 0.06, 0.21], color: g.outfit });
  }

  // Bras : le long du corps (légèrement fléchis), levés et balancés pour les danseurs.
  for (const side of [-1, 1]) {
    const shoulder: Vec3 = [side * 0.195, hipY + 0.49, -0.01];
    let elbow: Vec3;
    let wrist: Vec3;
    if (dancing) {
      const raise = 0.55 + (side * beat2 + 1) * 0.35;
      const swing = side * beat * 0.12;
      elbow = [side * (0.32 + raise * 0.05), shoulder[1] + 0.05 + raise * 0.12, 0.06 + swing];
      wrist = [side * (0.3 + raise * 0.02), elbow[1] + 0.18 + raise * 0.06, 0.12 - swing];
    } else {
      elbow = [side * 0.235, shoulder[1] - 0.28, -0.02];
      wrist = [side * 0.23, elbow[1] - 0.23, 0.06];
    }
    const dir = new THREE.Vector3(wrist[0] - elbow[0], wrist[1] - elbow[1], wrist[2] - elbow[2]).normalize();
    parts.push(
      ...limb([shoulder, elbow, wrist], sleeve, forearm, g.outfit),
      hand([wrist[0] + dir.x * 0.032, wrist[1] + dir.y * 0.032, wrist[2] + dir.z * 0.032], g.skin),
    );
  }
  parts.push(...headParts(g, [0, hipY + 0.56, -0.005]));
  return parts;
}

/** Profil de révolution (rayon, hauteur) normalisé sur [0, 1]. */
function lathe(profile: Array<[number, number]>, segments: number): THREE.BufferGeometry {
  const geo = new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), segments);
  geo.computeVertexNormals();
  return geo;
}

let sharedGeometries: Record<PartKind, THREE.BufferGeometry> | null = null;
function geometries(): Record<PartKind, THREE.BufferGeometry> {
  if (!sharedGeometries) {
    sharedGeometries = {
      // Membre légèrement fuselé (plus large côté épaule / hanche).
      limb: new THREE.CylinderGeometry(0.43, 0.5, 1, 10),
      joint: new THREE.SphereGeometry(1, 16, 12),
      // Buste : hanches, taille marquée, poitrine, épaules arrondies, base du cou.
      torso: lathe([
        [0, 0], [0.84, 0.0], [0.9, 0.1], [0.86, 0.24], [0.78, 0.4], [0.86, 0.58],
        [0.97, 0.74], [1.0, 0.84], [0.88, 0.94], [0.5, 0.99], [0.3, 1.0], [0, 1.0],
      ], 16),
      // Jupe évasée qui tombe en corolle.
      skirt: lathe([
        [0, 0], [1.0, 0.0], [0.97, 0.12], [0.86, 0.4], [0.68, 0.75], [0.6, 1.0], [0, 1.0],
      ], 18),
      // Boubou : longue robe ample, des chevilles aux épaules.
      robe: lathe([
        [0, 0], [1.0, 0.0], [0.97, 0.3], [0.86, 0.66], [0.74, 0.9], [0.68, 1.0], [0, 1.0],
      ], 18),
      box: new RoundedBoxGeometry(1, 1, 1, 3, 0.35),
    };
  }
  return sharedGeometries;
}

const noRaycast = () => null;

type CrowdRefs = Record<PartKind, React.RefObject<THREE.InstancedMesh | null>>;

interface Scratch {
  guest: THREE.Matrix4;
  part: THREE.Matrix4;
  pos: THREE.Vector3;
  quat: THREE.Quaternion;
  scale: THREE.Vector3;
  color: THREE.Color;
}

function makeScratch(): Scratch {
  return {
    guest: new THREE.Matrix4(),
    part: new THREE.Matrix4(),
    pos: new THREE.Vector3(),
    quat: new THREE.Quaternion(),
    scale: new THREE.Vector3(),
    color: new THREE.Color(),
  };
}

/** Repère d'un invité dans la salle (position, orientation, taille, balancement). */
function guestMatrix(g: SimulatedGuest, t: number, s: Scratch, out: THREE.Matrix4): THREE.Matrix4 {
  const sway = g.pose === 'dancing' ? Math.sin(t * 1.6 + g.phase) * 0.45 : 0;
  s.quat.setFromAxisAngle(UP, g.rotY + sway);
  return out.compose(s.pos.set(g.x, g.y, g.z), s.quat, s.scale.setScalar(g.scale));
}

/** Écrit la pose (et, au besoin, la couleur) de chaque pièce dans les maillages instanciés. */
function writeCrowd(guests: SimulatedGuest[], refs: CrowdRefs, s: Scratch, t: number, withColors: boolean) {
  const idx: Record<PartKind, number> = { limb: 0, joint: 0, torso: 0, skirt: 0, robe: 0, box: 0 };
  for (const g of guests) {
    guestMatrix(g, t, s, s.guest);
    for (const p of guestParts(g, t)) {
      const mesh = refs[p.kind].current;
      if (!mesh) continue;
      if (p.quat) s.quat.set(p.quat[0], p.quat[1], p.quat[2], p.quat[3]);
      else s.quat.identity();
      s.part.compose(s.pos.set(p.pos[0], p.pos[1], p.pos[2]), s.quat, s.scale.set(p.scale[0], p.scale[1], p.scale[2]));
      s.part.premultiply(s.guest);
      const i = idx[p.kind];
      mesh.setMatrixAt(i, s.part);
      if (withColors) mesh.setColorAt(i, s.color.set(p.color));
      idx[p.kind] = i + 1;
    }
  }
  for (const kind of PART_KINDS) {
    const mesh = refs[kind].current;
    if (!mesh) continue;
    mesh.instanceMatrix.needsUpdate = true;
    if (withColors && mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }
}

function GuestCrowd({
  guests,
  animate,
  castShadow,
}: {
  guests: SimulatedGuest[];
  animate: boolean;
  castShadow: boolean;
}) {
  const geo = geometries();
  const material = useMemo(() => new THREE.MeshStandardMaterial({ roughness: 0.72, metalness: 0.03 }), []);
  useLayoutEffect(() => () => material.dispose(), [material]);
  const limbRef = useRef<THREE.InstancedMesh>(null);
  const jointRef = useRef<THREE.InstancedMesh>(null);
  const torsoRef = useRef<THREE.InstancedMesh>(null);
  const skirtRef = useRef<THREE.InstancedMesh>(null);
  const robeRef = useRef<THREE.InstancedMesh>(null);
  const boxRef = useRef<THREE.InstancedMesh>(null);
  const refs = useMemo<CrowdRefs>(
    () => ({ limb: limbRef, joint: jointRef, torso: torsoRef, skirt: skirtRef, robe: robeRef, box: boxRef }),
    [],
  );
  const scratch = useMemo(() => makeScratch(), []);
  const counts = useMemo(() => {
    const c: Record<PartKind, number> = { limb: 0, joint: 0, torso: 0, skirt: 0, robe: 0, box: 0 };
    for (const g of guests) for (const p of guestParts(g, 0)) c[p.kind] += 1;
    return c;
  }, [guests]);

  // Les maillages sont recréés quand le nombre de pièces change : on réécrit tout à ce moment-là.
  useLayoutEffect(() => {
    writeCrowd(guests, refs, scratch, 0, true);
  }, [guests, counts, refs, scratch]);

  useFrame(({ clock }) => {
    if (animate) writeCrowd(guests, refs, scratch, clock.elapsedTime, false);
  });

  return (
    <>
      {PART_KINDS.map((kind) => (counts[kind] > 0 ? (
        <instancedMesh
          key={`${kind}-${counts[kind]}`}
          ref={refs[kind]}
          args={[geo[kind], material, counts[kind]]}
          castShadow={castShadow}
          frustumCulled={false}
          raycast={noRaycast}
        />
      ) : null))}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Photo de la personne sur le visage                                  */
/* ------------------------------------------------------------------ */

/** Calotte de sphère devant le visage (front → menton), où l'on pose la photo. */
let faceGeometry: THREE.BufferGeometry | null = null;
function portraitFaceGeometry(): THREE.BufferGeometry {
  if (!faceGeometry) {
    const phiLength = 2.1;
    // phi = π/2 regarde vers +Z (le devant de l'avatar) ; la photo n'est pas inversée.
    faceGeometry = new THREE.SphereGeometry(1, 28, 20, Math.PI / 2 - phiLength / 2, phiLength, 0.32, 1.95);
  }
  return faceGeometry;
}

const textureCache = new Map<string, Promise<THREE.Texture | null>>();

/** Photo recadrée au centre, bords fondus vers la teinte de peau pour se mêler à la tête. */
function loadPortraitTexture(url: string, skin: string): Promise<THREE.Texture | null> {
  const cacheKey = `${skin}|${url}`;
  const cached = textureCache.get(cacheKey);
  if (cached) return cached;
  const promise = new Promise<THREE.Texture | null>((resolve) => {
    if (typeof document === 'undefined') {
      resolve(null);
      return;
    }
    const img = new Image();
    if (/^https?:/i.test(url)) img.crossOrigin = 'anonymous';
    img.onload = () => {
      const size = 256;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(null);
        return;
      }
      // Photo déjà recadrée sur le visage : on resserre un peu pour qu'il remplisse la tête.
      const side = Math.min(img.width, img.height) * 0.8;
      ctx.drawImage(img, (img.width - side) / 2, (img.height - side) * 0.42, side, side, 0, 0, size, size);
      // Le fond de la photo s'efface vers la peau de l'avatar sur le pourtour.
      const c = new THREE.Color(skin);
      const rgb = `${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)}`;
      ctx.save();
      ctx.translate(size / 2, size / 2);
      ctx.scale(1, 1.12);
      const fade = ctx.createRadialGradient(0, 0, size * 0.27, 0, 0, size * 0.42);
      fade.addColorStop(0, `rgba(${rgb},0)`);
      fade.addColorStop(1, `rgba(${rgb},1)`);
      ctx.fillStyle = fade;
      ctx.fillRect(-size / 2, -size / 2, size, size);
      ctx.restore();
      ctx.globalCompositeOperation = 'destination-in';
      ctx.save();
      ctx.translate(size / 2, size / 2);
      ctx.scale(1, 1.12);
      const mask = ctx.createRadialGradient(0, 0, size * 0.4, 0, 0, size * 0.5);
      mask.addColorStop(0, 'rgba(0,0,0,1)');
      mask.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = mask;
      ctx.fillRect(-size / 2, -size / 2, size, size);
      ctx.restore();
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = 4;
      resolve(texture);
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
  textureCache.set(cacheKey, promise);
  return promise;
}

/** Matrice du visage d'un invité : même place que le crâne dessiné dans la foule. */
function faceMatrix(g: SimulatedGuest, s: Scratch, out: THREE.Matrix4): THREE.Matrix4 {
  const parts = guestParts(g, 0);
  // Le crâne est la première rotule de la tête après le cou (rayons HEAD_R).
  const skull = parts.find((p) => p.kind === 'joint' && p.scale[0] === HEAD_R[0] && p.scale[1] === HEAD_R[1]);
  guestMatrix(g, 0, s, s.guest);
  const pos = skull?.pos ?? [0, 1.6, 0];
  out.compose(
    s.pos.set(pos[0], pos[1], pos[2] + 0.004),
    s.quat.identity(),
    s.scale.set(HEAD_R[0] * 1.035, HEAD_R[1] * 1.03, HEAD_R[2] * 1.04),
  );
  return out.premultiply(s.guest);
}

function PortraitFace({ guest }: { guest: SimulatedGuest }) {
  const url = guest.photoUrl ?? '';
  const [loaded, setLoaded] = useState<{ url: string; texture: THREE.Texture | null } | null>(null);
  useEffect(() => {
    let alive = true;
    void loadPortraitTexture(url, guest.skin).then((texture) => {
      if (alive) setLoaded({ url, texture });
    });
    return () => {
      alive = false;
    };
  }, [url, guest.skin]);
  const texture = loaded?.url === url ? loaded.texture : null;
  const material = useMemo(() => {
    if (!texture) return null;
    return new THREE.MeshStandardMaterial({
      map: texture,
      emissiveMap: texture,
      emissive: new THREE.Color('#ffffff'),
      emissiveIntensity: 0.22,
      roughness: 0.8,
      transparent: true,
      alphaTest: 0.04,
      polygonOffset: true,
      polygonOffsetFactor: -2,
    });
  }, [texture]);
  useEffect(() => () => material?.dispose(), [material]);
  const matrix = useMemo(() => faceMatrix(guest, makeScratch(), new THREE.Matrix4()), [guest]);
  if (!material) return null;
  return (
    <mesh
      geometry={portraitFaceGeometry()}
      material={material}
      matrix={matrix}
      matrixAutoUpdate={false}
      raycast={noRaycast}
    />
  );
}

/** Invités simulés : assis et debout (fixes) + danseurs (animés) + visages en photo. */
export const GuestAvatars = React.memo(function GuestAvatars({
  guests,
  animate = true,
  castShadow = true,
}: {
  guests: SimulatedGuest[];
  animate?: boolean;
  castShadow?: boolean;
}) {
  const still = useMemo(() => guests.filter((g) => g.pose !== 'dancing'), [guests]);
  const dancers = useMemo(() => guests.filter((g) => g.pose === 'dancing'), [guests]);
  const portraits = useMemo(() => still.filter((g) => g.photoUrl), [still]);
  return (
    <group name="simulated-guests">
      {still.length > 0 ? <GuestCrowd guests={still} animate={false} castShadow={castShadow} /> : null}
      {dancers.length > 0 ? <GuestCrowd guests={dancers} animate={animate} castShadow={castShadow} /> : null}
      {portraits.map((g) => <PortraitFace key={g.id} guest={g} />)}
    </group>
  );
});
