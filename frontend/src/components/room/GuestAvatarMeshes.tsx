'use client';

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import type { SimulatedGuest } from '@/lib/roomGuestSimulation';

/**
 * Avatars des invités simulés, façon personnages de jeu réaliste :
 * - visage sculpté (front, arcades, pommettes, mâchoire, menton), nez, yeux avec
 *   iris et paupières, sourcils, lèvres, oreilles ; tête un peu tournée, comme en conversation ;
 * - morphologie d'homme ou de femme (épaules, poitrine, taille, hanches),
 *   bras et jambes galbés, mains dans le prolongement des bras, chaussures ou escarpins ;
 * - coiffures avec une vraie ligne de cheveux (court, ras, crâne rasé, chignon,
 *   afro, longs), barbe taillée pour certains hommes, gele noué ou kufi ;
 * - tenues détaillées : costume (revers, chemise, cravate, pochette, poignets,
 *   basques), robe bustier longue ou midi, boubou à manches évasées et plastron brodé ;
 * - matières distinctes : peau satinée, tissu au reflet doux, cuir / satin / or brillants ;
 * - debout, certains tiennent une flûte de champagne ; les danseurs sont animés.
 *
 * Tout est dessiné en maillages « instanciés » (une série par forme et par matière),
 * quel que soit le nombre d'invités, pour rester fluide avec des centaines de
 * personnes. Un invité personnalisé reçoit sa photo sur le visage.
 * Les avatars ne captent pas les clics : on sélectionne toujours la table ou la chaise.
 */

type GeoKind =
  | 'head' | 'hair' | 'beard' | 'nose' | 'ball' | 'hand' | 'shoe' | 'box' | 'deltoid'
  | 'torsoM' | 'torsoF' | 'bodice' | 'skirt' | 'robe'
  | 'upperArm' | 'forearm' | 'thigh' | 'calf' | 'tube' | 'bell';
type MatKind = 'skin' | 'cloth' | 'shiny';

type Vec3 = [number, number, number];
type Quat = [number, number, number, number];
interface PartSpec {
  geo: GeoKind;
  mat: MatKind;
  pos: Vec3;
  /** Rotation : quaternion (x, y, z, w). */
  quat?: Quat;
  scale: Vec3;
  color: string;
}

const UP = new THREE.Vector3(0, 1, 0);
const tmpDir = new THREE.Vector3();
const tmpQuat = new THREE.Quaternion();
const tmpQuat2 = new THREE.Quaternion();
const headQuat = new THREE.Quaternion();
const tmpVec = new THREE.Vector3();
const tmpEuler = new THREE.Euler();

/* ------------------------------------------------------------------ */
/* Traits stables tirés de l'invité                                    */
/* ------------------------------------------------------------------ */

/** Nombre pseudo-aléatoire stable dans [0, 1[ pour un trait donné de l'invité. */
function trait(g: SimulatedGuest, k: number): number {
  const v = Math.sin(g.phase * 12.9898 + k * 78.233) * 43758.5453;
  return v - Math.floor(v);
}

function isFemale(g: SimulatedGuest): boolean {
  if (g.style === 'dress') return true;
  if (g.style === 'suit') return false;
  return Boolean(g.headwrap) || trait(g, 1) < 0.5;
}

const colorCache = new Map<string, string>();
function mixColor(a: string, b: string, t: number): string {
  const key = `${a}|${b}|${t}`;
  let out = colorCache.get(key);
  if (!out) {
    out = `#${new THREE.Color(a).lerp(new THREE.Color(b), t).getHexString()}`;
    colorCache.set(key, out);
  }
  return out;
}

function lightness(color: string): number {
  return new THREE.Color(color).getHSL({ h: 0, s: 0, l: 0 }).l;
}

function quatFromEuler(x: number, y: number, z: number): Quat {
  tmpQuat.setFromEuler(tmpEuler.set(x, y, z));
  return [tmpQuat.x, tmpQuat.y, tmpQuat.z, tmpQuat.w];
}

/* ------------------------------------------------------------------ */
/* Pièces élémentaires                                                 */
/* ------------------------------------------------------------------ */

/** Segment de membre (profil galbé) d'une articulation à l'autre. */
function seg(a: Vec3, b: Vec3, diameter: number, color: string, geo: GeoKind = 'tube', mat: MatKind = 'cloth'): PartSpec {
  tmpDir.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const len = tmpDir.length() || 0.001;
  tmpQuat.setFromUnitVectors(UP, tmpDir.multiplyScalar(1 / len));
  return {
    geo,
    mat,
    pos: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2],
    quat: [tmpQuat.x, tmpQuat.y, tmpQuat.z, tmpQuat.w],
    scale: [diameter, len, diameter],
    color,
  };
}

/** Volume arrondi (rotule, cheveux, accessoire…). */
function ball(pos: Vec3, r: Vec3 | number, color: string, mat: MatKind = 'cloth', quat?: Quat): PartSpec {
  const s: Vec3 = typeof r === 'number' ? [r, r, r] : r;
  return { geo: 'ball', mat, pos, scale: s, color, quat };
}

function box(pos: Vec3, scale: Vec3, color: string, mat: MatKind = 'cloth', quat?: Quat): PartSpec {
  return { geo: 'box', mat, pos, scale, color, quat };
}

interface LimbLook {
  upper: GeoKind;
  lower: GeoKind;
  upperMat: MatKind;
  lowerMat: MatKind;
  upperColor: string;
  lowerColor: string;
}

/** Membre en deux segments, avec rotules aux articulations (deltoïde galbé à l'épaule). */
function limb(points: [Vec3, Vec3, Vec3], d0: number, d1: number, look: LimbLook, shoulder = false): PartSpec[] {
  const [a, b, c] = points;
  let start: PartSpec;
  if (shoulder) {
    // Deltoïde : volume allongé dans l'axe du bras, qui se fond dans le haut du buste
    // au lieu d'une rotule de mannequin.
    tmpDir.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]).normalize();
    tmpQuat.setFromUnitVectors(UP, tmpDir);
    start = {
      geo: 'deltoid',
      mat: look.upperMat,
      pos: [a[0] + tmpDir.x * d0 * 0.3, a[1] + tmpDir.y * d0 * 0.3, a[2] + tmpDir.z * d0 * 0.3],
      quat: [tmpQuat.x, tmpQuat.y, tmpQuat.z, tmpQuat.w],
      scale: [d0 * 0.53, d0 * 0.95, d0 * 0.53],
      color: look.upperColor,
    };
  } else {
    start = ball(a, d0 * 0.44, look.upperColor, look.upperMat);
  }
  return [
    start,
    seg(a, b, d0, look.upperColor, look.upper, look.upperMat),
    // Rotule à peine plus large que les deux segments : pas de scintillement à la jonction.
    ball(b, Math.max(d0 * 0.38, d1 * 0.44) + 0.0015, look.lowerColor, look.lowerMat),
    seg(b, c, d1, look.lowerColor, look.lower, look.lowerMat),
  ];
}

const palmN = new THREE.Vector3();
const palmW = new THREE.Vector3();
const basis = new THREE.Matrix4();

/** Main dans le prolongement de l'avant-bras (doigts vers `dir`), paume tournée vers le corps, pouce en avant. */
function hand(wrist: Vec3, dir: THREE.Vector3, skin: string, female: boolean): PartSpec[] {
  // Paume face à la cuisse : normale = axe X ramené perpendiculaire aux doigts.
  palmN.set(1, 0, 0).addScaledVector(dir, -dir.x);
  if (palmN.lengthSq() < 1e-4) palmN.set(0, 0, 1).addScaledVector(dir, -dir.z);
  palmN.normalize();
  palmW.crossVectors(dir, palmN);
  if (palmW.z < 0) {
    palmW.negate();
    palmN.negate();
  }
  basis.makeBasis(palmW, dir, palmN);
  tmpQuat.setFromRotationMatrix(basis);
  const len = female ? 0.074 : 0.084;
  const width = female ? 0.032 : 0.038;
  const at = (k: number, w: number): Vec3 => [
    wrist[0] + dir.x * k + palmW.x * w,
    wrist[1] + dir.y * k + palmW.y * w,
    wrist[2] + dir.z * k + palmW.z * w,
  ];
  const thumbBase = at(len * 0.22, width * 0.42);
  const thumbTip = at(len * 0.62, width * 0.62);
  return [
    {
      geo: 'hand',
      mat: 'skin',
      pos: at(len * 0.52, 0),
      quat: [tmpQuat.x, tmpQuat.y, tmpQuat.z, tmpQuat.w],
      scale: [width, len, female ? 0.017 : 0.021],
      color: skin,
    },
    seg(thumbBase, thumbTip, female ? 0.016 : 0.019, skin, 'tube', 'skin'),
  ];
}

/** Chaussure (bout effilé) ; escarpin à talon, pointe posée au sol. */
function shoe(ankle: Vec3, color: string, heels: boolean, forward = 0.05): PartSpec[] {
  if (heels) {
    return [
      { geo: 'shoe', mat: 'shiny', pos: [ankle[0], ankle[1] - 0.035, ankle[2] + forward], quat: quatFromEuler(0.35, 0, 0), scale: [0.068, 0.055, 0.2], color },
      box([ankle[0], ankle[1] - 0.062, ankle[2] - 0.035], [0.02, 0.075, 0.024], color, 'shiny'),
    ];
  }
  return [{ geo: 'shoe', mat: 'shiny', pos: [ankle[0], ankle[1] - 0.035, ankle[2] + forward], scale: [0.09, 0.075, 0.24], color }];
}

/* ------------------------------------------------------------------ */
/* Tête                                                                */
/* ------------------------------------------------------------------ */

const HEAD_R: Vec3 = [0.086, 0.11, 0.098];
const SCLERA = '#ece6dc';
const IRIS = '#2a1a10';

/** Profondeur de la peau du visage (repère tête), pour y poser yeux, nez et lèvres. */
const faceZCache = new Map<string, number>();
function faceZ(x: number, y: number): number {
  const key = `${x}|${y}`;
  const cached = faceZCache.get(key);
  if (cached !== undefined) return cached;
  const nx = x / HEAD_R[0];
  const ny = y / HEAD_R[1];
  const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
  const z = sculptHead(new THREE.Vector3(nx, ny, nz)).z * HEAD_R[2];
  faceZCache.set(key, z);
  return z;
}

/** Tourne une pièce du visage avec la tête (autour du centre de la tête). */
function placeOnHead(p: PartSpec, center: Vec3, q: THREE.Quaternion): PartSpec {
  tmpVec.set(p.pos[0], p.pos[1], p.pos[2]).applyQuaternion(q);
  if (p.quat) tmpQuat2.set(p.quat[0], p.quat[1], p.quat[2], p.quat[3]);
  else tmpQuat2.identity();
  tmpQuat2.premultiply(q);
  return {
    ...p,
    pos: [center[0] + tmpVec.x, center[1] + tmpVec.y, center[2] + tmpVec.z],
    quat: [tmpQuat2.x, tmpQuat2.y, tmpQuat2.z, tmpQuat2.w],
  };
}

type HairStyle = 'short' | 'buzz' | 'bald' | 'bun' | 'afro' | 'long';

/** Coiffure tirée de l'identité de l'invité (stable). */
function hairStyle(g: SimulatedGuest, female: boolean): HairStyle {
  const v = trait(g, 2);
  if (!female) return v < 0.55 ? 'short' : v < 0.85 ? 'buzz' : 'bald';
  return v < 0.3 ? 'bun' : v < 0.55 ? 'afro' : 'long';
}

/** Tête complète (cou, visage, cheveux ou foulard), tournée de `yaw` / `pitch`. */
function headParts(g: SimulatedGuest, neckBase: Vec3, yaw: number, pitch: number, female: boolean): PartSpec[] {
  const [nx, ny, nz] = neckBase;
  const center: Vec3 = [nx, ny + 0.13, nz + 0.01];
  headQuat.setFromEuler(tmpEuler.set(pitch, yaw, 0, 'YXZ'));
  const lipColor = mixColor(g.skin, female ? '#7a2630' : '#4a2420', female ? 0.42 : 0.3);
  const local: PartSpec[] = [
    { geo: 'head', mat: 'skin', pos: [0, 0, 0], scale: HEAD_R, color: g.skin },
    // Oreilles.
    ball([-0.084, -0.004, -0.008], [0.013, 0.026, 0.019], g.skin, 'skin'),
    ball([0.084, -0.004, -0.008], [0.013, 0.026, 0.019], g.skin, 'skin'),
  ];
  if (!g.photoUrl) {
    const eyeY = 0.012;
    const eyeX = 0.03;
    const eyeZ = faceZ(eyeX, eyeY);
    const lid = mixColor(g.skin, '#000000', 0.2);
    local.push(
      { geo: 'nose', mat: 'skin', pos: [0, -0.019, faceZ(0, -0.019) - 0.005], scale: [0.0155, 0.0245, 0.0145], color: g.skin },
      // Ailes du nez.
      ball([-0.0115, -0.035, faceZ(0.0115, -0.035) - 0.001], [0.0085, 0.0065, 0.008], g.skin, 'skin'),
      ball([0.0115, -0.035, faceZ(0.0115, -0.035) - 0.001], [0.0085, 0.0065, 0.008], g.skin, 'skin'),
      ball([0, -0.054, faceZ(0, -0.054) - 0.0055], [0.021, 0.006, 0.008], lipColor, 'skin'),
      ball([0, -0.065, faceZ(0, -0.065) - 0.006], [0.019, 0.007, 0.0085], lipColor, 'skin'),
    );
    for (const side of [-1, 1]) {
      local.push(
        ball([side * eyeX, eyeY, eyeZ - 0.0075], [0.0125, 0.0082, 0.009], SCLERA, 'shiny'),
        ball([side * eyeX, eyeY, eyeZ + 0.0008], [0.0062, 0.0062, 0.0032], IRIS, 'shiny'),
        // Paupière supérieure : l'ombre qui donne le regard.
        ball([side * eyeX, eyeY + 0.0066, eyeZ - 0.0032], [0.0136, 0.0042, 0.0076], lid, 'skin'),
        ball([side * 0.031, 0.036, faceZ(0.031, 0.036) - 0.0015], [0.019, 0.0045, 0.0055], g.hair, 'cloth', quatFromEuler(0, 0, -side * 0.12)),
      );
    }
  }

  if (female && trait(g, 12) < 0.75) {
    // Boucles d'oreilles : perle ou petite goutte dorée sous le lobe.
    const drop = trait(g, 14) < 0.5;
    for (const side of [-1, 1]) {
      local.push(ball([side * 0.083, drop ? -0.04 : -0.031, 0.004], drop ? [0.006, 0.011, 0.006] : 0.0065, trait(g, 13) < 0.7 ? '#d8b25a' : '#efece4', 'shiny'));
    }
  }

  if (g.headwrap) {
    // Gele : bandeau ajusté, couronne de plis et éventail noué au sommet.
    const fold = mixColor(g.headwrap, '#000000', 0.15);
    local.push(
      { geo: 'hair', mat: 'shiny', pos: [0, 0.006, -0.004], scale: [HEAD_R[0] * 1.12, HEAD_R[1] * 1.08, HEAD_R[2] * 1.12], color: g.headwrap },
      ball([0, 0.08, -0.03], [0.108, 0.07, 0.1], g.headwrap, 'shiny'),
      box([0, 0.13, -0.045], [0.21, 0.085, 0.028], g.headwrap, 'shiny', quatFromEuler(-0.55, 0, 0)),
      box([0.06, 0.115, 0.0], [0.09, 0.06, 0.02], fold, 'shiny', quatFromEuler(-0.3, 0.6, 0.4)),
    );
  } else if (g.style === 'boubou' && !female && trait(g, 3) < 0.45) {
    // Kufi brodé.
    local.push(box([0, 0.085, -0.006], [0.172, 0.068, 0.19], trait(g, 4) < 0.5 ? g.outfit : '#f4f1de'));
  } else {
    const style = hairStyle(g, female);
    const back = g.photoUrl ? -0.012 : 0;
    const cap = (sx: number, sy: number, sz: number, dy = 0.006, dz = 0): PartSpec => ({
      geo: 'hair', mat: 'cloth', pos: [0, dy, back + dz], scale: [HEAD_R[0] * sx, HEAD_R[1] * sy, HEAD_R[2] * sz], color: g.hair,
    });
    if (style === 'short') local.push(cap(1.05, 1.035, 1.05));
    else if (style === 'buzz') local.push(cap(1.018, 1.012, 1.02, 0.002));
    else if (style === 'bun') local.push(cap(1.05, 1.04, 1.05), ball([0, 0.1, -0.07], 0.046, g.hair));
    else if (style === 'afro') local.push(cap(1.38, 1.28, 1.34, 0.03, -0.012));
    else if (style === 'long') {
      // Longs cheveux / tresses : calotte, mèches sur les côtés et chevelure dans le dos.
      local.push(
        cap(1.07, 1.05, 1.07),
        box([0, -0.12, -0.07], [0.17, 0.27, 0.055], g.hair),
        box([-0.084, -0.075, -0.03], [0.026, 0.17, 0.06], g.hair),
        box([0.084, -0.075, -0.03], [0.026, 0.17, 0.06], g.hair),
      );
    }
    if (!female && !g.photoUrl && trait(g, 5) < 0.32) {
      // Barbe courte taillée et moustache.
      local.push(
        { geo: 'beard', mat: 'cloth', pos: [0, 0, 0.002], scale: [HEAD_R[0] * 1.03, HEAD_R[1] * 1.02, HEAD_R[2] * 1.04], color: g.hair },
        ball([0, -0.045, faceZ(0, -0.045) - 0.002], [0.022, 0.0048, 0.006], g.hair),
      );
    }
  }

  const parts = local.map((p) => placeOnHead(p, center, headQuat));
  // Cou (fixe, sous la tête).
  parts.unshift(seg([nx, ny - 0.05, nz - 0.005], [nx, ny + 0.075, nz + 0.005], female ? 0.075 : 0.088, g.skin, 'tube', 'skin'));
  return parts;
}

/* ------------------------------------------------------------------ */
/* Corps et tenues                                                     */
/* ------------------------------------------------------------------ */

/** Costume : revers, chemise, cravate, pochette et bouton sur le buste. */
function suitFront(chestY: number, z: number, outfit: string): PartSpec[] {
  const light = lightness(outfit) > 0.72;
  const shirt = light ? '#1b1b1f' : '#f2efe8';
  const tie = light ? '#7a1f2b' : '#5a1620';
  const lapel = mixColor(outfit, '#000000', 0.22);
  return [
    box([0, chestY + 0.05, z - 0.012], [0.085, 0.16, 0.03], shirt),
    box([-0.05, chestY + 0.03, z + 0.002], [0.038, 0.2, 0.014], lapel, 'shiny', quatFromEuler(0, 0, 0.32)),
    box([0.05, chestY + 0.03, z + 0.002], [0.038, 0.2, 0.014], lapel, 'shiny', quatFromEuler(0, 0, -0.32)),
    box([0, chestY - 0.13, z + 0.004], [0.014, 0.014, 0.01], lapel, 'shiny'),
    box([0, chestY + 0.0, z + 0.008], [0.028, 0.2, 0.012], tie, 'shiny'),
    box([0.078, chestY + 0.04, z - 0.002], [0.04, 0.016, 0.014], '#f4f1de'),
  ];
}

/** Plastron brodé du boubou. */
function boubouFront(chestY: number, z: number, outfit: string): PartSpec[] {
  const gold = lightness(outfit) > 0.7 ? '#b08a3a' : '#d4b05a';
  // Encolure en V brodée et bande centrale.
  return [
    box([0, chestY - 0.02, z], [0.035, 0.22, 0.01], gold, 'shiny'),
    box([-0.035, chestY + 0.07, z], [0.016, 0.11, 0.01], gold, 'shiny', quatFromEuler(0, 0, 0.45)),
    box([0.035, chestY + 0.07, z], [0.016, 0.11, 0.01], gold, 'shiny', quatFromEuler(0, 0, -0.45)),
  ];
}

interface Look {
  female: boolean;
  shoeColor: string;
  heels: boolean;
  /** Robe longue (jusqu'au sol) plutôt que midi. */
  longDress: boolean;
  arm: LimbLook;
  sleeveD: number;
  forearmD: number;
}

function lookOf(g: SimulatedGuest): Look {
  const female = isFemale(g);
  const dress = g.style === 'dress';
  const boubou = g.style === 'boubou';
  const shoeColor = g.style === 'suit'
    ? '#111114'
    : dress
      ? (trait(g, 6) < 0.5 ? '#1a1414' : mixColor(g.outfit, '#000000', 0.25))
      : '#3b2a20';
  return {
    female,
    shoeColor,
    heels: female && !boubou,
    longDress: dress && trait(g, 7) < 0.55,
    arm: {
      upper: dress ? 'upperArm' : 'tube',
      lower: dress ? 'forearm' : boubou ? 'bell' : 'tube',
      upperMat: dress ? 'skin' : 'cloth',
      lowerMat: dress ? 'skin' : 'cloth',
      upperColor: dress ? g.skin : g.outfit,
      lowerColor: dress ? g.skin : g.outfit,
    },
    sleeveD: dress ? 0.078 : boubou ? 0.105 : female ? 0.082 : 0.094,
    forearmD: dress ? 0.062 : boubou ? 0.14 : female ? 0.07 : 0.078,
  };
}

/** Bras complet (épaule → coude → poignet) avec la main et, pour le costume, le poignet de chemise. */
function arm(g: SimulatedGuest, look: Look, shoulder: Vec3, elbow: Vec3, wrist: Vec3): PartSpec[] {
  const dir = new THREE.Vector3(wrist[0] - elbow[0], wrist[1] - elbow[1], wrist[2] - elbow[2]).normalize();
  const parts = limb([shoulder, elbow, wrist], look.sleeveD, look.forearmD, look.arm, true);
  if (g.style === 'suit') {
    parts.push(ball([wrist[0] - dir.x * 0.01, wrist[1] - dir.y * 0.01, wrist[2] - dir.z * 0.01], 0.036, '#f2efe8'));
  }
  parts.push(...hand(wrist, dir, g.skin, look.female));
  return parts;
}

/** Flûte de champagne tenue à la main. */
function flute(at: Vec3): PartSpec[] {
  return [
    seg([at[0], at[1] - 0.02, at[2]], [at[0], at[1] + 0.06, at[2]], 0.008, '#e8e4da', 'tube', 'shiny'),
    seg([at[0], at[1] + 0.06, at[2]], [at[0], at[1] + 0.16, at[2]], 0.04, '#f0dc9a', 'calf', 'shiny'),
  ];
}

interface TorsoFrame {
  base: Vec3;
  height: number;
  w: number;
  d: number;
}

/**
 * Finitions qui font « vrai » : collier et bretelles sur les robes, col de chemise sous la veste,
 * trapèzes qui relient le cou aux épaules.
 */
function outfitDetails(g: SimulatedGuest, look: Look, torso: TorsoFrame, neck: Vec3): PartSpec[] {
  const parts: PartSpec[] = [];
  const { female } = look;
  const [nx, ny, nz] = neck;
  const top = torso.base[1] + torso.height;
  const gold = trait(g, 13) < 0.7 ? '#d8b25a' : '#e6e3dc';
  const neckD = female ? 0.075 : 0.088;
  if (g.style === 'suit') {
    const shirt = lightness(g.outfit) > 0.72 ? '#1b1b1f' : '#f2efe8';
    parts.push(seg([nx, ny - 0.03, nz], [nx, ny + 0.022, nz + 0.004], neckD + 0.016, shirt));
  }
  if (g.style === 'dress') {
    const bodiceTop = torso.base[1] + torso.height * 0.8;
    if (trait(g, 11) < 0.5) {
      // Fines bretelles : du haut du bustier, par-dessus l'épaule.
      for (const side of [-1, 1]) {
        const fx = side * torso.w * 0.45;
        const front: Vec3 = [fx, bodiceTop - 0.006, torsoSurfaceZ(female, torso, fx, bodiceTop) + 0.003];
        const midY = torso.base[1] + torso.height * 0.9;
        const mx = side * torso.w * 0.5;
        const mid: Vec3 = [mx, midY, torsoSurfaceZ(female, torso, mx, midY) + 0.004];
        const over: Vec3 = [side * torso.w * 0.52, top - torso.height * 0.02, torso.base[2] - 0.01];
        parts.push(seg(front, mid, 0.011, g.outfit, 'tube', 'shiny'), seg(mid, over, 0.011, g.outfit, 'tube', 'shiny'));
      }
    }
    if (trait(g, 10) < 0.65) {
      // Collier de perles qui épouse le haut de la poitrine, pendentif au centre.
      const beads = 11;
      for (let i = 0; i < beads; i += 1) {
        const a = ((i / (beads - 1)) * 2 - 1) * 1.15;
        const x = Math.sin(a) * neckD * 0.95;
        const y = ny - 0.045 + (1 - Math.cos(a)) * 0.04;
        parts.push(ball([x, y, torsoSurfaceZ(female, torso, x, y) + 0.004], 0.0068, gold, 'shiny'));
      }
      const py = ny - 0.06;
      parts.push(ball([0, py, torsoSurfaceZ(female, torso, 0, py) + 0.006], [0.011, 0.014, 0.007], gold, 'shiny'));
    }
  }
  return parts;
}

/** Pièces d'un invité, dans son repère (sol à y = 0, regard vers +Z). */
function guestParts(g: SimulatedGuest, t: number): PartSpec[] {
  const look = lookOf(g);
  const { female } = look;
  const torsoGeo: GeoKind = female ? 'torsoF' : 'torsoM';
  const torsoW = female ? 0.172 : 0.19;
  const torsoD = female ? 0.115 : 0.122;
  const yaw = (trait(g, 8) - 0.5) * 0.7;
  const bareTorso = g.style === 'dress';
  const torsoColor = bareTorso ? g.skin : g.outfit;
  const torsoMat: MatKind = bareTorso ? 'skin' : 'cloth';

  if (g.pose === 'seated') {
    const parts: PartSpec[] = [];
    const trouser = g.style === 'suit' ? g.bottom : g.outfit;
    const bareLeg = g.style === 'dress' && !look.longDress;
    for (const side of [-1, 1]) {
      const hip: Vec3 = [side * 0.09, 0.55, -0.1];
      const knee: Vec3 = [side * 0.1, 0.56, 0.3];
      const ankle: Vec3 = [side * 0.1, look.heels ? 0.12 : 0.1, 0.33];
      const thighD = g.style === 'boubou' ? 0.16 : female ? 0.13 : 0.14;
      parts.push(
        ball(hip, thighD / 2, trouser),
        seg(hip, knee, thighD, trouser, g.style === 'suit' ? 'tube' : 'thigh'),
        ball(knee, 0.056, bareLeg ? g.skin : trouser, bareLeg ? 'skin' : 'cloth'),
        seg(knee, ankle, g.style === 'boubou' ? 0.13 : 0.095, bareLeg ? g.skin : trouser, bareLeg ? 'calf' : 'tube', bareLeg ? 'skin' : 'cloth'),
        ...shoe(ankle, look.shoeColor, look.heels),
      );
    }
    parts.push({ geo: torsoGeo, mat: torsoMat, pos: [0, 0.6, -0.08], scale: [torsoW, 0.56, torsoD], color: torsoColor });
    if (g.style === 'dress') {
      parts.push(
        { geo: 'bodice', mat: 'cloth', pos: [0, 0.6, -0.08], scale: [torsoW * 1.04, 0.56, torsoD * 1.05], color: g.outfit },
        box([0, 0.57, 0.12], [0.36, 0.1, 0.46], g.outfit),
      );
      if (look.longDress) parts.push(box([0, 0.32, 0.36], [0.36, 0.46, 0.05], g.outfit));
    } else if (g.style === 'suit') {
      parts.push(...suitFront(0.93, 0.05, g.outfit));
    } else {
      parts.push(...boubouFront(0.93, 0.05, g.outfit));
    }
    for (const side of [-1, 1]) {
      const shoulder: Vec3 = [side * torsoW * 0.86, 1.04, -0.075];
      const elbow: Vec3 = [side * (torsoW + 0.03), 0.82, 0.02];
      const wrist: Vec3 = [side * 0.15, 0.79, 0.26];
      parts.push(...arm(g, look, shoulder, elbow, wrist));
    }
    parts.push(...outfitDetails(g, look, { base: [0, 0.6, -0.08], height: 0.56, w: torsoW, d: torsoD }, [0, 1.12, -0.06]));
    parts.push(...headParts(g, [0, 1.12, -0.06], yaw, -0.08, female));
    return parts;
  }

  const dancing = g.pose === 'dancing';
  const beat = dancing ? Math.sin(t * 4.2 + g.phase) : 0;
  const beat2 = dancing ? Math.sin(t * 2.1 + g.phase * 1.7) : 0;
  const lift = dancing ? Math.abs(beat) * 0.045 : 0;
  const hipY = 0.9 + lift + (look.heels ? 0.03 : 0);
  const parts: PartSpec[] = [];
  const legsHidden = g.style === 'boubou' || (g.style === 'dress' && look.longDress);

  // Jambes : genoux qui fléchissent en rythme pour les danseurs.
  for (const side of [-1, 1]) {
    const bend = dancing ? Math.max(0, side * beat) * 0.1 : 0;
    const groundY = look.heels ? 0.11 : 0.08;
    const hip: Vec3 = [side * 0.085, hipY, 0];
    const knee: Vec3 = [side * 0.09, 0.5 + lift * 0.5 + bend * 0.3, 0.03 + bend];
    const ankle: Vec3 = [side * 0.09, groundY + (dancing ? Math.max(0, side * beat) * 0.06 : 0), 0];
    if (legsHidden) {
      // La robe longue / le boubou couvre les jambes : seules les chaussures dépassent.
      parts.push(...shoe([ankle[0], groundY, 0.04], look.shoeColor, look.heels, 0.05));
      continue;
    }
    const suit = g.style === 'suit';
    parts.push(
      ...limb([hip, knee, ankle], suit ? 0.13 : 0.11, suit ? 0.112 : 0.088, {
        upper: suit ? 'tube' : 'thigh',
        lower: suit ? 'tube' : 'calf',
        upperMat: suit ? 'cloth' : 'skin',
        lowerMat: suit ? 'cloth' : 'skin',
        upperColor: suit ? g.bottom : g.skin,
        lowerColor: suit ? g.bottom : g.skin,
      }),
      ...shoe(ankle, look.shoeColor, look.heels),
    );
  }

  parts.push({ geo: torsoGeo, mat: torsoMat, pos: [0, hipY - 0.05, 0], scale: [torsoW, 0.6, torsoD], color: torsoColor });
  if (g.style === 'suit') {
    // Basques de la veste sur les hanches.
    parts.push({ geo: 'skirt', mat: 'cloth', pos: [0, hipY - 0.17, 0], scale: [torsoW * 1.06, 0.2, torsoD * 1.18], color: g.outfit });
    parts.push(...suitFront(hipY + 0.33, torsoD + 0.006, g.outfit));
  } else if (g.style === 'dress') {
    parts.push({ geo: 'bodice', mat: 'cloth', pos: [0, hipY - 0.05, 0], scale: [torsoW * 1.04, 0.6, torsoD * 1.05], color: g.outfit });
    const hem = look.longDress ? 0.02 : 0.38;
    parts.push({
      geo: 'skirt',
      mat: 'cloth',
      pos: [0, hem, 0],
      scale: [look.longDress ? 0.3 : 0.25, hipY - hem + 0.02, look.longDress ? 0.27 : 0.22],
      color: g.outfit,
    });
  } else {
    parts.push({ geo: 'robe', mat: 'cloth', pos: [0, 0.07, 0], scale: [0.27, hipY + 0.06, 0.22], color: g.outfit });
    parts.push(...boubouFront(hipY + 0.33, torsoD + 0.004, g.outfit));
  }

  // Bras : le long du corps, levés et balancés pour les danseurs ; certains tiennent un verre.
  const holdsGlass = !dancing && trait(g, 9) < 0.35;
  for (const side of [-1, 1]) {
    const shoulder: Vec3 = [side * torsoW * 0.86, hipY + 0.465, -0.012];
    let elbow: Vec3;
    let wrist: Vec3;
    if (dancing) {
      const raise = 0.55 + (side * beat2 + 1) * 0.35;
      const swing = side * beat * 0.12;
      elbow = [side * (0.32 + raise * 0.05), shoulder[1] + 0.05 + raise * 0.12, 0.06 + swing];
      wrist = [side * (0.3 + raise * 0.02), elbow[1] + 0.18 + raise * 0.06, 0.12 - swing];
    } else if (holdsGlass && side === 1) {
      elbow = [torsoW + 0.03, shoulder[1] - 0.27, 0.0];
      wrist = [torsoW - 0.05, shoulder[1] - 0.24, 0.22];
    } else {
      elbow = [side * (torsoW + 0.04), shoulder[1] - 0.28, -0.025];
      wrist = [side * (torsoW + 0.035), elbow[1] - 0.24, 0.04];
    }
    parts.push(...arm(g, look, shoulder, elbow, wrist));
    if (holdsGlass && side === 1) parts.push(...flute([wrist[0] - 0.005, wrist[1] + 0.02, wrist[2] + 0.06]));
  }
  parts.push(...outfitDetails(g, look, { base: [0, hipY - 0.05, 0], height: 0.6, w: torsoW, d: torsoD }, [0, hipY + 0.55, -0.005]));
  parts.push(...headParts(g, [0, hipY + 0.55, -0.005], dancing ? 0 : yaw, dancing ? 0.1 * beat2 : 0, female));
  return parts;
}

/* ------------------------------------------------------------------ */
/* Géométries partagées                                                */
/* ------------------------------------------------------------------ */

function gauss(v: number, mu: number, sigma: number): number {
  const d = (v - mu) / sigma;
  return Math.exp(-0.5 * d * d);
}

function smooth(a: number, b: number, v: number): number {
  const t = Math.max(0, Math.min(1, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

/** Sculpte une sphère unité en tête : crâne, arcades, pommettes, mâchoire et menton. */
function sculptHead(v: THREE.Vector3): THREE.Vector3 {
  let { x, y, z } = v;
  const front = Math.max(0, z);
  if (y > 0) y *= 1.05;
  if (z < 0 && y > -0.35) z *= 1.07;
  if (y < 0) {
    const t = Math.min(1, -y);
    x *= 1 - 0.2 * t * t;
    if (z < 0) z *= 1 - 0.35 * t;
    if (z > 0) z += 0.15 * smooth(0.25, 0.9, t) * front;
  }
  z += 0.05 * gauss(y, 0.33, 0.1) * front ** 4;
  x += Math.sign(x) * 0.035 * gauss(y, -0.05, 0.18) * front * smooth(0.3, 0.8, Math.abs(x));
  return v.set(x, y, z);
}

function sculpted(geo: THREE.BufferGeometry, fn: (v: THREE.Vector3) => void): THREE.BufferGeometry {
  const pos = geo.getAttribute('position') as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i += 1) {
    v.fromBufferAttribute(pos, i);
    fn(v);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  return geo;
}

/**
 * Normales lissées, y compris sur la couture des profils de révolution
 * (sommets dédoublés au même endroit) : plus de ligne d'ombre au milieu des bras et des jambes.
 */
function smoothNormals(geo: THREE.BufferGeometry): THREE.BufferGeometry {
  geo.computeVertexNormals();
  const pos = geo.getAttribute('position') as THREE.BufferAttribute;
  const nrm = geo.getAttribute('normal') as THREE.BufferAttribute;
  const sums = new Map<string, [number, number, number]>();
  // Arrondi entier : « -0 » et « 0 » (sin 2π) tombent sur la même clé.
  const keyOf = (i: number) => `${Math.round(pos.getX(i) * 1e4)}|${Math.round(pos.getY(i) * 1e4)}|${Math.round(pos.getZ(i) * 1e4)}`;
  for (let i = 0; i < pos.count; i += 1) {
    const k = keyOf(i);
    const acc = sums.get(k);
    if (acc) {
      acc[0] += nrm.getX(i);
      acc[1] += nrm.getY(i);
      acc[2] += nrm.getZ(i);
    } else sums.set(k, [nrm.getX(i), nrm.getY(i), nrm.getZ(i)]);
  }
  for (let i = 0; i < pos.count; i += 1) {
    const [x, y, z] = sums.get(keyOf(i))!;
    const len = Math.hypot(x, y, z) || 1;
    nrm.setXYZ(i, x / len, y / len, z / len);
  }
  nrm.needsUpdate = true;
  return geo;
}

function interp(points: Array<[number, number]>, a: number): number {
  for (let i = 1; i < points.length; i += 1) {
    if (a <= points[i][0]) {
      const [a0, v0] = points[i - 1];
      const [a1, v1] = points[i];
      return v0 + ((a - a0) / (a1 - a0)) * (v1 - v0);
    }
  }
  return points[points.length - 1][1];
}

/** Ligne des cheveux : haute sur le front, au-dessus des oreilles, basse sur la nuque. */
const HAIRLINE: Array<[number, number]> = [[0, 0.46], [0.22, 0.34], [0.42, 0.15], [0.55, -0.1], [0.75, -0.42], [1, -0.58]];
/** Contour de la barbe : sous la lèvre inférieure, le long de la mâchoire jusqu'aux pattes. */
const BEARD_LINE: Array<[number, number]> = [[0, -0.68], [0.15, -0.62], [0.3, -0.36], [0.45, -0.02], [0.55, 0.06]];

function hairGeometry(): THREE.BufferGeometry {
  return sculpted(new THREE.SphereGeometry(1, 32, 22), (v) => {
    const ang = Math.atan2(v.x, v.z);
    const line = interp(HAIRLINE, Math.abs(ang) / Math.PI);
    if (v.y < line) {
      const r = Math.sqrt(1 - line * line);
      v.set(r * Math.sin(ang), line, r * Math.cos(ang));
    }
    sculptHead(v);
  });
}

function beardGeometry(): THREE.BufferGeometry {
  return sculpted(new THREE.SphereGeometry(1, 32, 22), (v) => {
    let ang = Math.atan2(v.x, v.z);
    const maxA = 0.55 * Math.PI;
    if (Math.abs(ang) > maxA) ang = Math.sign(ang) * maxA;
    const line = interp(BEARD_LINE, Math.abs(ang) / Math.PI);
    const y = Math.min(v.y, line);
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    v.set(r * Math.sin(ang), y, r * Math.cos(ang));
    sculptHead(v);
  });
}

function noseGeometry(): THREE.BufferGeometry {
  return sculpted(new THREE.SphereGeometry(1, 14, 12), (v) => {
    const down = (1 - v.y) / 2; // 0 en haut (arête), 1 en bas (pointe)
    v.x *= 0.5 + 0.55 * down;
    if (v.z > 0) v.z *= 0.45 + 0.75 * down;
    if (v.y < -0.6) v.z -= 0.15;
  });
}

function handGeometry(): THREE.BufferGeometry {
  return sculpted(new THREE.SphereGeometry(1, 16, 14), (v) => {
    // Paume plate et large aux jointures, doigts effilés et légèrement repliés vers la paume.
    v.z *= 0.8;
    if (v.y < -0.4) v.x *= 0.78 + 0.22 * (1 + v.y) / 0.6;
    if (v.y > 0.1) {
      const f = v.y - 0.1;
      v.x *= 1 - 0.32 * f;
      v.z += 0.38 * f * f;
    }
  });
}

function shoeGeometry(): THREE.BufferGeometry {
  return sculpted(new RoundedBoxGeometry(1, 1, 1, 3, 0.3), (v) => {
    const toe = Math.max(0, v.z * 2); // 0 au talon / milieu, 1 au bout
    v.y -= toe * toe * 0.18 * (v.y + 0.5);
    v.x *= 1 - 0.25 * toe * toe;
  });
}

/** Buste paramétrique (section arrondie) : hanches, taille, poitrine, épaules, dos. */
// [hauteur, demi-largeur, avant, arrière]
const TORSO_M: Array<[number, number, number, number]> = [
    [0, 0.8, 0.82, 0.95], [0.12, 0.84, 0.86, 0.98], [0.35, 0.78, 0.86, 0.84], [0.6, 0.9, 1.05, 0.95],
    [0.78, 0.98, 1.0, 0.95], [0.86, 1.0, 0.85, 0.88], [0.92, 0.9, 0.62, 0.72], [0.97, 0.55, 0.45, 0.55], [1, 0.34, 0.4, 0.42],
];
const TORSO_F: Array<[number, number, number, number]> = [
    [0, 0.88, 0.8, 1.02], [0.1, 0.92, 0.84, 1.08], [0.38, 0.68, 0.74, 0.8], [0.55, 0.8, 0.98, 0.86],
    [0.64, 0.84, 1.22, 0.88], [0.76, 0.88, 0.98, 0.9], [0.86, 0.92, 0.8, 0.84], [0.92, 0.84, 0.6, 0.7], [0.97, 0.52, 0.44, 0.52], [1, 0.32, 0.38, 0.42],
];

/** Point de la face avant (side = 1) ou arrière (-1) du buste, à la hauteur `y` et au décalage latéral `x`. */
function torsoSurfaceZ(female: boolean, torso: TorsoFrame, x: number, y: number, side: 1 | -1 = 1): number {
  const table = female ? TORSO_F : TORSO_M;
  const t = Math.min(1, Math.max(0, (y - torso.base[1]) / torso.height));
  const w = interp(table.map((r) => [r[0], r[1]] as [number, number]), t) * torso.w;
  const d = interp(table.map((r) => [r[0], side === 1 ? r[2] : r[3]] as [number, number]), t) * torso.d;
  const sRaw = Math.min(1, (Math.abs(x) / Math.max(1e-3, w)) ** 1.25);
  const c = Math.sqrt(Math.max(0, 1 - sRaw * sRaw));
  return torso.base[2] + side * d * c ** 0.85;
}

function torsoGeometry(female: boolean, topT = 1): THREE.BufferGeometry {
  const table = female ? TORSO_F : TORSO_M;
  const col = (c: 1 | 2 | 3) => table.map((r) => [r[0], r[c]] as [number, number]);
  const width = col(1);
  const fore = col(2);
  const aft = col(3);
  const rings = 22;
  const around = 20;
  const positions: number[] = [];
  const indices: number[] = [];
  for (let j = 0; j <= rings; j += 1) {
    const t = (j / rings) * topT;
    const w = interp(width, t);
    const f = interp(fore, t);
    const b = interp(aft, t);
    for (let i = 0; i < around; i += 1) {
      const a = (i / around) * Math.PI * 2;
      const s = Math.sin(a);
      const c = Math.cos(a);
      positions.push(w * Math.sign(s) * Math.abs(s) ** 0.8, t, (c > 0 ? f : b) * Math.sign(c) * Math.abs(c) ** 0.85);
    }
  }
  const bottom = positions.length / 3;
  positions.push(0, 0, 0);
  const top = positions.length / 3;
  positions.push(0, topT, 0);
  for (let j = 0; j < rings; j += 1) {
    for (let i = 0; i < around; i += 1) {
      const a = j * around + i;
      const b = j * around + ((i + 1) % around);
      const c = (j + 1) * around + i;
      const d = (j + 1) * around + ((i + 1) % around);
      indices.push(a, b, c, b, d, c);
    }
  }
  for (let i = 0; i < around; i += 1) {
    indices.push(bottom, (i + 1) % around, i);
    indices.push(top, rings * around + i, rings * around + ((i + 1) % around));
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/** Profil de révolution (rayon, hauteur). */
function lathe(profile: Array<[number, number]>, segments: number): THREE.BufferGeometry {
  return smoothNormals(new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), segments));
}

let sharedGeometries: Record<GeoKind, THREE.BufferGeometry> | null = null;
function geometries(): Record<GeoKind, THREE.BufferGeometry> {
  if (!sharedGeometries) {
    sharedGeometries = {
      head: sculpted(new THREE.SphereGeometry(1, 30, 24), sculptHead),
      hair: hairGeometry(),
      beard: beardGeometry(),
      nose: noseGeometry(),
      ball: new THREE.SphereGeometry(1, 14, 10),
      hand: handGeometry(),
      // Épaule : ovoïde plus plein vers le haut (côté buste), qui s'affine vers le bras.
      deltoid: sculpted(new THREE.SphereGeometry(1, 16, 12), (v) => {
        if (v.y < 0) v.x *= 1 + 0.1 * v.y;
        v.z *= 1 - 0.12 * Math.max(0, -v.y);
      }),
      shoe: shoeGeometry(),
      box: new RoundedBoxGeometry(1, 1, 1, 2, 0.3),
      torsoM: torsoGeometry(false),
      torsoF: torsoGeometry(true),
      // Bustier : la robe s'arrête sous les aisselles, épaules nues.
      bodice: torsoGeometry(true, 0.8),
      // Jupe / basques : évasées vers le bas.
      skirt: lathe([[0, 0], [1.0, 0.0], [0.97, 0.12], [0.86, 0.4], [0.68, 0.75], [0.6, 1.0], [0, 1.0]], 20),
      // Boubou : longue robe ample, des chevilles aux épaules.
      robe: lathe([[0, 0], [1.0, 0.0], [0.97, 0.3], [0.86, 0.66], [0.74, 0.9], [0.68, 1.0], [0, 1.0]], 20),
      // Membres : y = -0,5 à l'articulation de départ, +0,5 à l'arrivée ; rayon 0,5 = diamètre nominal.
      upperArm: lathe([[0, -0.5], [0.24, -0.49], [0.38, -0.46], [0.46, -0.41], [0.5, -0.32], [0.5, -0.15], [0.44, 0.1], [0.4, 0.32], [0.38, 0.47], [0, 0.5]], 12),
      forearm: lathe([[0, -0.5], [0.24, -0.49], [0.38, -0.46], [0.47, -0.4], [0.5, -0.3], [0.46, -0.05], [0.36, 0.3], [0.31, 0.47], [0, 0.5]], 12),
      thigh: lathe([[0, -0.5], [0.26, -0.49], [0.42, -0.46], [0.5, -0.36], [0.5, -0.3], [0.46, 0], [0.4, 0.3], [0.36, 0.46], [0, 0.5]], 12),
      calf: lathe([[0, -0.5], [0.4, -0.47], [0.49, -0.25], [0.45, -0.05], [0.32, 0.3], [0.27, 0.46], [0, 0.5]], 12),
      tube: lathe([[0, -0.5], [0.26, -0.49], [0.42, -0.46], [0.49, -0.4], [0.5, -0.3], [0.47, 0.3], [0.44, 0.49], [0, 0.5]], 16),
      bell: lathe([[0, -0.5], [0.34, -0.49], [0.38, -0.2], [0.48, 0.35], [0.5, 0.49], [0, 0.5]], 14),
    };
  }
  return sharedGeometries;
}

/* ------------------------------------------------------------------ */
/* Foule instanciée                                                    */
/* ------------------------------------------------------------------ */

const noRaycast = () => null;

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

const bucketKey = (p: Pick<PartSpec, 'geo' | 'mat'>) => `${p.geo}|${p.mat}`;

/** Écrit la pose (et, au besoin, la couleur) de chaque pièce dans les maillages instanciés. */
function writeCrowd(guests: SimulatedGuest[], meshes: Map<string, THREE.InstancedMesh>, s: Scratch, t: number, withColors: boolean) {
  const idx = new Map<string, number>();
  for (const g of guests) {
    guestMatrix(g, t, s, s.guest);
    for (const p of guestParts(g, t)) {
      const key = bucketKey(p);
      const mesh = meshes.get(key);
      if (!mesh) continue;
      const i = idx.get(key) ?? 0;
      if (i >= mesh.count) continue;
      if (p.quat) s.quat.set(p.quat[0], p.quat[1], p.quat[2], p.quat[3]);
      else s.quat.identity();
      s.part.compose(s.pos.set(p.pos[0], p.pos[1], p.pos[2]), s.quat, s.scale.set(p.scale[0], p.scale[1], p.scale[2]));
      s.part.premultiply(s.guest);
      mesh.setMatrixAt(i, s.part);
      if (withColors) mesh.setColorAt(i, s.color.set(p.color));
      idx.set(key, i + 1);
    }
  }
  for (const mesh of meshes.values()) {
    mesh.instanceMatrix.needsUpdate = true;
    if (withColors && mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }
}

/** Peau satinée, tissu au reflet doux, finitions brillantes (cuir, satin, or). */
function makeMaterials(): Record<MatKind, THREE.Material> {
  return {
    // Peau : reflet velouté chaud sur les bords (évoque la diffusion sous la peau) et léger vernis.
    skin: new THREE.MeshPhysicalMaterial({
      roughness: 0.5,
      metalness: 0,
      sheen: 0.45,
      sheenRoughness: 0.5,
      sheenColor: new THREE.Color('#ffb08a'),
      clearcoat: 0.08,
      clearcoatRoughness: 0.6,
    }),
    cloth: new THREE.MeshPhysicalMaterial({
      roughness: 0.82,
      metalness: 0,
      sheen: 0.35,
      sheenRoughness: 0.65,
      sheenColor: new THREE.Color('#ffffff'),
    }),
    shiny: new THREE.MeshStandardMaterial({ roughness: 0.28, metalness: 0.08 }),
  };
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
  const materials = useMemo(() => makeMaterials(), []);
  useLayoutEffect(() => () => Object.values(materials).forEach((m) => m.dispose()), [materials]);
  const meshes = useRef(new Map<string, THREE.InstancedMesh>());
  const scratch = useMemo(() => makeScratch(), []);
  const buckets = useMemo(() => {
    const c = new Map<string, { geo: GeoKind; mat: MatKind; count: number }>();
    for (const g of guests) {
      for (const p of guestParts(g, 0)) {
        const key = bucketKey(p);
        const entry = c.get(key);
        if (entry) entry.count += 1;
        else c.set(key, { geo: p.geo, mat: p.mat, count: 1 });
      }
    }
    return [...c.entries()];
  }, [guests]);

  // Les maillages sont recréés quand le nombre de pièces change : on réécrit tout à ce moment-là.
  useLayoutEffect(() => {
    writeCrowd(guests, meshes.current, scratch, 0, true);
  }, [guests, buckets, scratch]);

  useFrame(({ clock }) => {
    if (animate) writeCrowd(guests, meshes.current, scratch, clock.elapsedTime, false);
  });

  return (
    <>
      {buckets.map(([key, b]) => (
        <instancedMesh
          key={`${key}-${b.count}`}
          ref={(mesh: THREE.InstancedMesh | null) => {
            if (mesh) meshes.current.set(key, mesh);
            else if (meshes.current.get(key)?.count === b.count) meshes.current.delete(key);
          }}
          args={[geo[b.geo], materials[b.mat], b.count]}
          castShadow={castShadow}
          frustumCulled={false}
          raycast={noRaycast}
        />
      ))}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Photo de la personne sur le visage                                  */
/* ------------------------------------------------------------------ */

/** Calotte du visage (front → menton), sculptée comme la tête, où l'on pose la photo. */
let faceGeometry: THREE.BufferGeometry | null = null;
function portraitFaceGeometry(): THREE.BufferGeometry {
  if (!faceGeometry) {
    const phiLength = 2.1;
    // phi = π/2 regarde vers +Z (le devant de l'avatar) ; la photo n'est pas inversée.
    faceGeometry = sculpted(new THREE.SphereGeometry(1, 28, 20, Math.PI / 2 - phiLength / 2, phiLength, 0.32, 1.95), sculptHead);
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

/** Matrice du visage d'un invité : même place et même orientation que la tête dessinée dans la foule. */
function faceMatrix(g: SimulatedGuest, s: Scratch, out: THREE.Matrix4): THREE.Matrix4 {
  const head = guestParts(g, 0).find((p) => p.geo === 'head');
  guestMatrix(g, 0, s, s.guest);
  const pos = head?.pos ?? [0, 1.6, 0];
  const q = head?.quat;
  if (q) s.quat.set(q[0], q[1], q[2], q[3]);
  else s.quat.identity();
  const offset = new THREE.Vector3(0, 0, 0.004).applyQuaternion(s.quat);
  out.compose(
    s.pos.set(pos[0] + offset.x, pos[1] + offset.y, pos[2] + offset.z),
    s.quat,
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
