/**
 * Calculs sur les pixels d’une image importée (sol, plateau, assise, tapis…)
 * pour qu’elle se comporte comme une vraie matière en 3D :
 *
 * - `makeSeamless` fond les bords pour que la photo boucle sans quadrillage ;
 * - `reliefFromRgba` isole le relief de détail (grain, joints, fibres) en
 *   retirant l’éclairage d’ensemble de la photo ;
 * - `normalMapFromHeight` en tire une carte de normales (Sobel, bords bouclés) ;
 * - `roughnessFromRelief` donne une rugosité qui varie : creux plus mats,
 *   reliefs plus brillants, comme un parquet ou un carrelage réel.
 *
 * Module pur (tableaux de pixels), testé avec `node --test`.
 */

const smooth = (t: number) => {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
};

/**
 * Rend une image bouclable : on la superpose à sa copie décalée d’une
 * demi-tuile (dont les bords se raccordent par construction) et on passe
 * de l’une à l’autre près des bords. `band` = largeur du fondu, en fraction
 * de la tuile (0,05 à 0,45).
 */
export function makeSeamless(rgba: Uint8ClampedArray, width: number, height: number, band = 0.18): Uint8ClampedArray {
  const out = new Uint8ClampedArray(rgba.length);
  const b = Math.max(0.05, Math.min(0.45, band));
  const halfW = Math.floor(width / 2);
  const halfH = Math.floor(height / 2);
  for (let y = 0; y < height; y += 1) {
    const ey = Math.min(y + 0.5, height - y - 0.5) / height;
    const wy = smooth(ey / b);
    const sy = (y + halfH) % height;
    for (let x = 0; x < width; x += 1) {
      const ex = Math.min(x + 0.5, width - x - 0.5) / width;
      // Poids de l’image d’origine : 1 au centre, 0 sur les bords.
      const w = Math.min(smooth(ex / b), wy);
      const sx = (x + halfW) % width;
      const i = (y * width + x) * 4;
      const j = (sy * width + sx) * 4;
      for (let c = 0; c < 4; c += 1) out[i + c] = rgba[i + c] * w + rgba[j + c] * (1 - w);
    }
  }
  return out;
}

/** Luminance (0–1) de chaque pixel. */
export function luminance(rgba: Uint8ClampedArray, width: number, height: number): Float32Array {
  const out = new Float32Array(width * height);
  for (let p = 0, i = 0; p < out.length; p += 1, i += 4) {
    out[p] = (0.2126 * rgba[i] + 0.7152 * rgba[i + 1] + 0.0722 * rgba[i + 2]) / 255;
  }
  return out;
}

/** Flou boîte séparable, bords bouclés (la texture se répète). */
export function boxBlurWrap(src: Float32Array, width: number, height: number, radius: number): Float32Array {
  const r = Math.max(0, Math.floor(radius));
  if (r === 0) return Float32Array.from(src);
  const tmp = new Float32Array(src.length);
  const out = new Float32Array(src.length);
  const norm = 1 / (2 * r + 1);
  const wrap = (v: number, n: number) => ((v % n) + n) % n;
  for (let y = 0; y < height; y += 1) {
    const row = y * width;
    let acc = 0;
    for (let k = -r; k <= r; k += 1) acc += src[row + wrap(k, width)];
    for (let x = 0; x < width; x += 1) {
      tmp[row + x] = acc * norm;
      acc += src[row + wrap(x + r + 1, width)] - src[row + wrap(x - r, width)];
    }
  }
  for (let x = 0; x < width; x += 1) {
    let acc = 0;
    for (let k = -r; k <= r; k += 1) acc += tmp[wrap(k, height) * width + x];
    for (let y = 0; y < height; y += 1) {
      out[y * width + x] = acc * norm;
      acc += tmp[wrap(y + r + 1, height) * width + x] - tmp[wrap(y - r, height) * width + x];
    }
  }
  return out;
}

/**
 * Relief de détail (−1…1 environ) : luminance moins sa version floue. Une
 * photo prise avec une ombre ou un dégradé ne devient pas une « bosse » géante ;
 * seuls le grain, les joints et les fibres creusent.
 */
export function reliefFromRgba(rgba: Uint8ClampedArray, width: number, height: number): Float32Array {
  const lum = luminance(rgba, width, height);
  const radius = Math.max(2, Math.round(Math.min(width, height) / 48));
  const low = boxBlurWrap(lum, width, height, radius);
  const fine = boxBlurWrap(lum, width, height, 1);
  const out = new Float32Array(lum.length);
  let maxAbs = 1e-6;
  for (let p = 0; p < out.length; p += 1) {
    out[p] = fine[p] - low[p];
    maxAbs = Math.max(maxAbs, Math.abs(out[p]));
  }
  // Normalisation douce : un relief faible reste faible, un relief marqué ne sature pas.
  const k = 1 / Math.max(0.08, maxAbs);
  for (let p = 0; p < out.length; p += 1) out[p] = Math.max(-1, Math.min(1, out[p] * k));
  return out;
}

/** Carte de normales RGBA (espace tangent, bords bouclés) depuis une hauteur. */
export function normalMapFromHeight(height: Float32Array, width: number, h: number, strength = 2.5): Uint8ClampedArray {
  const out = new Uint8ClampedArray(width * h * 4);
  const at = (x: number, y: number) => height[(((y % h) + h) % h) * width + (((x % width) + width) % width)];
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const dx = (at(x + 1, y - 1) + 2 * at(x + 1, y) + at(x + 1, y + 1)) - (at(x - 1, y - 1) + 2 * at(x - 1, y) + at(x - 1, y + 1));
      const dy = (at(x - 1, y + 1) + 2 * at(x, y + 1) + at(x + 1, y + 1)) - (at(x - 1, y - 1) + 2 * at(x, y - 1) + at(x + 1, y - 1));
      // Convention OpenGL (Y vers le haut de l’image, comme les cartes maison).
      let nx = -dx * strength * 0.125;
      let ny = dy * strength * 0.125;
      let nz = 1;
      const len = Math.hypot(nx, ny, nz);
      nx /= len;
      ny /= len;
      nz /= len;
      const i = (y * width + x) * 4;
      out[i] = Math.round((nx * 0.5 + 0.5) * 255);
      out[i + 1] = Math.round((ny * 0.5 + 0.5) * 255);
      out[i + 2] = Math.round((nz * 0.5 + 0.5) * 255);
      out[i + 3] = 255;
    }
  }
  return out;
}

/**
 * Carte de rugosité (canal vert lu par three.js, multiplié par `roughness`) :
 * 1 dans les creux (joints, fibres), `1 - spread` sur les reliefs.
 */
export function roughnessFromRelief(relief: Float32Array, width: number, height: number, spread = 0.35): Uint8ClampedArray {
  const out = new Uint8ClampedArray(width * height * 4);
  const s = Math.max(0, Math.min(0.9, spread));
  for (let p = 0, i = 0; p < relief.length; p += 1, i += 4) {
    const v = 1 - s * (relief[p] * 0.5 + 0.5);
    const byte = Math.round(Math.max(0, Math.min(1, v)) * 255);
    out[i] = byte;
    out[i + 1] = byte;
    out[i + 2] = byte;
    out[i + 3] = 255;
  }
  return out;
}

/** Répétitions d’une texture de `tileM` mètres sur une surface de `lengthM` mètres. */
export function tileRepeat(lengthM: number, tileM: number): number {
  if (!(lengthM > 0) || !(tileM > 0)) return 1;
  return Math.max(0.25, lengthM / tileM);
}
