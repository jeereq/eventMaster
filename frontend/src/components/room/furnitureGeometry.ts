/**
 * Formes de mobilier partagées (chaises, tables) : coussins rembourrés, pieds tournés,
 * plateaux chanfreinés, nappes drapées.
 *
 * Chaque géométrie est mise en cache par dimensions (au millimètre) : cent chaises
 * identiques partagent les mêmes tampons GPU au lieu d'en créer un par instance.
 * Ces géométries ne doivent donc jamais être libérées par l'appelant.
 */

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

const cache = new Map<string, THREE.BufferGeometry>();
const MAX_CACHE = 400;

function mm(n: number): number {
  return Math.round(n * 1000);
}

function cached(key: string, make: () => THREE.BufferGeometry): THREE.BufferGeometry {
  const hit = cache.get(key);
  if (hit) return hit;
  const g = make();
  if (cache.size >= MAX_CACHE) {
    // Trop de variantes : on garde la nouvelle hors cache plutôt que de libérer une géométrie encore affichée.
    return g;
  }
  cache.set(key, g);
  return g;
}

/**
 * Coussin rembourré : pavé aux arêtes arrondies dont le dessus se bombe au centre
 * (`crown` = part de l'épaisseur gagnée au milieu) et dont les flancs gonflent légèrement.
 */
export function cushionGeometry(w: number, h: number, d: number, crown = 0.35): THREE.BufferGeometry {
  return cached(`cushion:${mm(w)}:${mm(h)}:${mm(d)}:${Math.round(crown * 100)}`, () => {
    const r = Math.min(h * 0.48, w * 0.2, d * 0.2, 0.035);
    const g = new RoundedBoxGeometry(w, h, d, 3, r);
    const pos = g.attributes.position as THREE.BufferAttribute;
    const hw = w / 2;
    const hd = d / 2;
    const hh = h / 2;
    for (let i = 0; i < pos.count; i += 1) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      const fx = 1 - Math.min(1, (x / hw) ** 2);
      const fz = 1 - Math.min(1, (z / hd) ** 2);
      // Dessus bombé, dessous presque plat.
      const up = y > 0 ? (y / hh) * crown * h * fx * fz : 0;
      // Flancs : léger ventre à mi-hauteur.
      const belly = 1 + 0.035 * (1 - Math.min(1, (y / hh) ** 2));
      pos.setXYZ(i, x * belly, y + up, z * belly);
    }
    g.computeVertexNormals();
    return g;
  });
}

/** Pavé aux arêtes adoucies (dossiers, ceintures, accoudoirs). */
export function softBoxGeometry(w: number, h: number, d: number, radius?: number): THREE.BufferGeometry {
  const r = Math.max(0.002, Math.min(radius ?? Math.min(w, h, d) * 0.25, w / 2, h / 2, d / 2));
  return cached(`soft:${mm(w)}:${mm(h)}:${mm(d)}:${mm(r)}`, () => new RoundedBoxGeometry(w, h, d, 2, r * 0.999));
}

export type LegProfile = 'taper' | 'turned' | 'bamboo' | 'spindle';

/**
 * Pied de chaise ou de table tourné (LatheGeometry), centré sur sa hauteur comme un cylindre.
 * - taper : fuseau droit qui s'affine vers le sol, petit sabot ;
 * - turned : pied Louis XVI cannelé (bague haute, fût en fuseau, toupie au pied) ;
 * - bamboo : façon chiavari, nœuds réguliers ;
 * - spindle : barreau fin légèrement renflé au milieu.
 */
export function legGeometry(h: number, rTop: number, rBottom: number, profile: LegProfile = 'taper'): THREE.BufferGeometry {
  return cached(`leg:${profile}:${mm(h)}:${Math.round(rTop * 10000)}:${Math.round(rBottom * 10000)}`, () => {
    const pts: THREE.Vector2[] = [];
    const add = (r: number, y: number) => pts.push(new THREE.Vector2(Math.max(0.0005, r), y - h / 2));
    if (profile === 'turned') {
      add(0, 0);
      add(rBottom * 0.85, 0);
      add(rBottom * 1.05, h * 0.015);
      add(rBottom * 0.8, h * 0.05);
      add(rBottom * 1.1, h * 0.085);
      add(rBottom * 0.9, h * 0.11);
      const steps = 8;
      for (let i = 0; i <= steps; i += 1) {
        const t = i / steps;
        add(rBottom * 0.9 + (rTop * 0.92 - rBottom * 0.9) * t, h * (0.12 + 0.66 * t));
      }
      add(rTop * 1.18, h * 0.8);
      add(rTop * 0.95, h * 0.83);
      add(rTop * 1.12, h * 0.86);
      add(rTop, h * 0.88);
      add(rTop, h);
      add(0, h);
    } else if (profile === 'bamboo') {
      add(0, 0);
      add(rBottom, 0);
      const knots = 4;
      for (let k = 0; k < knots; k += 1) {
        const y0 = (k / knots) * h;
        const y1 = ((k + 1) / knots) * h;
        const r0 = rBottom + (rTop - rBottom) * (k / knots);
        const r1 = rBottom + (rTop - rBottom) * ((k + 1) / knots);
        add(r0 * 0.92, y0 + (y1 - y0) * 0.12);
        add(r1 * 0.94, y1 - (y1 - y0) * 0.12);
        if (k < knots - 1) {
          add(r1 * 1.25, y1 - (y1 - y0) * 0.03);
          add(r1 * 1.25, y1 + (y1 - y0) * 0.03);
        }
      }
      add(rTop, h);
      add(0, h);
    } else if (profile === 'spindle') {
      add(0, 0);
      const steps = 8;
      for (let i = 0; i <= steps; i += 1) {
        const t = i / steps;
        const r = rBottom + (rTop - rBottom) * t;
        add(r * (1 + 0.28 * Math.sin(Math.PI * t)), h * t);
      }
      add(0, h);
    } else {
      add(0, 0);
      add(rBottom * 1.08, 0);
      add(rBottom * 1.08, h * 0.03);
      add(rBottom * 0.95, h * 0.045);
      add(rTop, h * 0.97);
      add(rTop * 0.96, h);
      add(0, h);
    }
    const g = new THREE.LatheGeometry(pts, 10);
    g.computeVertexNormals();
    return g;
  });
}

/**
 * Disque de plateau à chant mouluré (quart-de-rond dessus, chanfrein dessous),
 * centré sur son épaisseur comme un cylindre.
 */
export function moldedDiscGeometry(r: number, thick: number, segments = 48): THREE.BufferGeometry {
  return cached(`disc:${mm(r)}:${mm(thick)}:${segments}`, () => {
    const e = Math.min(thick * 0.45, 0.018);
    const pts: THREE.Vector2[] = [];
    const add = (x: number, y: number) => pts.push(new THREE.Vector2(Math.max(0, x), y - thick / 2));
    add(0, 0);
    add(r - e * 1.2, 0);
    add(r - e * 0.2, e * 0.5);
    add(r, e * 1.1);
    const steps = 5;
    for (let i = 0; i <= steps; i += 1) {
      const a = (i / steps) * (Math.PI / 2);
      add(r - e + Math.cos(a) * e, thick - e + Math.sin(a) * e);
    }
    add(0, thick);
    const g = new THREE.LatheGeometry(pts, segments);
    g.computeVertexNormals();
    return g;
  });
}

/**
 * Retombée de nappe drapée autour d'un plateau rond ou ovale (rayons rx, rz) :
 * le tissu part du bord du plateau, s'évase un peu et forme des plis souples
 * dont l'amplitude grandit vers l'ourlet. Origine au bord supérieur, le tissu descend sur `drop`.
 */
export function drapedSkirtGeometry(rx: number, rz: number, drop: number, options: { folds?: number; amp?: number; flare?: number } = {}): THREE.BufferGeometry {
  const perimeter = Math.PI * (rx + rz);
  const folds = options.folds ?? Math.max(10, Math.round(perimeter / 0.16));
  const amp = options.amp ?? Math.min(0.03, 0.012 + drop * 0.03);
  const flare = options.flare ?? Math.min(0.06, drop * 0.08);
  return cached(`skirt:${mm(rx)}:${mm(rz)}:${mm(drop)}:${folds}:${mm(amp)}:${mm(flare)}`, () => {
    const radial = Math.max(64, folds * 8);
    const rows = 10;
    const positions: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    for (let j = 0; j <= rows; j += 1) {
      const v = j / rows;
      // Arrondi du tissu sur l'arête du plateau, puis chute presque verticale.
      const ease = v < 0.12 ? Math.sin((v / 0.12) * (Math.PI / 2)) * 0.12 : v;
      const y = -drop * v;
      const grow = Math.pow(ease, 1.4);
      for (let i = 0; i <= radial; i += 1) {
        const u = i / radial;
        const a = u * Math.PI * 2;
        // Plis irréguliers : deux harmoniques déphasées, pour éviter un plissé trop mécanique.
        const fold = Math.sin(a * folds) * 0.75 + Math.sin(a * folds * 0.5 + 1.3) * 0.25;
        const off = flare * grow + amp * grow * fold + 0.004;
        const px = Math.sin(a) * (rx + off);
        const pz = Math.cos(a) * (rz + off);
        positions.push(px, y, pz);
        uvs.push(u * Math.max(1, Math.round(perimeter * 2)), 1 - v);
      }
    }
    const stride = radial + 1;
    for (let j = 0; j < rows; j += 1) {
      for (let i = 0; i < radial; i += 1) {
        const a = j * stride + i;
        const b = a + stride;
        indices.push(a, b, a + 1, a + 1, b, b + 1);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    g.setIndex(indices);
    g.computeVertexNormals();
    return g;
  });
}

/**
 * Retombée de nappe d'une table rectangulaire : quatre pans qui tombent du plateau,
 * coins arrondis et plis plus marqués aux angles (là où le tissu s'accumule).
 */
export function drapedRectSkirtGeometry(w: number, d: number, drop: number, cornerR = 0.04): THREE.BufferGeometry {
  return cached(`rectskirt:${mm(w)}:${mm(d)}:${mm(drop)}:${mm(cornerR)}`, () => {
    const hw = w / 2;
    const hd = d / 2;
    const r = Math.min(cornerR, hw * 0.5, hd * 0.5);
    // Contour du plateau (rectangle arrondi) échantillonné à pas régulier.
    const outline: Array<{ x: number; z: number; nx: number; nz: number; corner: number }> = [];
    const straight = (x0: number, z0: number, x1: number, z1: number, nx: number, nz: number) => {
      const len = Math.hypot(x1 - x0, z1 - z0);
      const n = Math.max(2, Math.round(len / 0.03));
      for (let i = 0; i < n; i += 1) {
        const t = i / n;
        outline.push({ x: x0 + (x1 - x0) * t, z: z0 + (z1 - z0) * t, nx, nz, corner: 0 });
      }
    };
    const arc = (cx: number, cz: number, a0: number) => {
      const n = 6;
      for (let i = 0; i < n; i += 1) {
        const a = a0 + (i / n) * (Math.PI / 2);
        outline.push({ x: cx + Math.cos(a) * r, z: cz + Math.sin(a) * r, nx: Math.cos(a), nz: Math.sin(a), corner: 1 });
      }
    };
    straight(-hw + r, hd, hw - r, hd, 0, 1);
    arc(hw - r, hd - r, 0);
    straight(hw, hd - r, hw, -hd + r, 1, 0);
    arc(hw - r, -hd + r, -Math.PI / 2);
    straight(hw - r, -hd, -hw + r, -hd, 0, -1);
    arc(-hw + r, -hd + r, Math.PI);
    straight(-hw, -hd + r, -hw, hd - r, -1, 0);
    arc(-hw + r, hd - r, Math.PI / 2);
    // Contour convexe : trier par angle autour du centre donne l'ordre de parcours.
    outline.sort((p, q) => Math.atan2(p.x, p.z) - Math.atan2(q.x, q.z));
    const rows = 8;
    const positions: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    let s = 0;
    const along: number[] = [0];
    for (let i = 1; i <= outline.length; i += 1) {
      const p = outline[i - 1];
      const q = outline[i % outline.length];
      s += Math.hypot(q.x - p.x, q.z - p.z);
      along.push(s);
    }
    for (let j = 0; j <= rows; j += 1) {
      const v = j / rows;
      const ease = v < 0.15 ? Math.sin((v / 0.15) * (Math.PI / 2)) * 0.15 : v;
      const grow = Math.pow(ease, 1.3);
      for (let i = 0; i <= outline.length; i += 1) {
        const p = outline[i % outline.length];
        const dist = along[i];
        // Petites ondulations sur les pans, gros plis aux angles.
        const ripple = Math.sin(dist / 0.11) * 0.006 * grow;
        const off = 0.005 + 0.025 * grow * (0.4 + p.corner) + ripple;
        positions.push(p.x + p.nx * off, -drop * v, p.z + p.nz * off);
        uvs.push(dist * 2, 1 - v);
      }
    }
    const stride = outline.length + 1;
    for (let j = 0; j < rows; j += 1) {
      for (let i = 0; i < outline.length; i += 1) {
        const a = j * stride + i;
        const b = a + stride;
        indices.push(a, b, a + 1, a + 1, b, b + 1);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    g.setIndex(indices);
    g.computeVertexNormals();
    return g;
  });
}
