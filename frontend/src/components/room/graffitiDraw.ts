/**
 * Lettrage graffiti dessiné dans le navigateur (canvas 2D), sans image à fournir.
 * Sert à la fois à la texture 3D du mur et à l’aperçu de la vue de face.
 *
 * Tout passe par `drawGraffiti(options)` : style, police, couleurs (dégradé possible),
 * inclinaison, texte en arc, fond peint et effets (relief, coulures, étincelles, halo).
 */

import {
  graffitiEffects,
  type GraffitiBackdrop,
  type GraffitiFont,
  type GraffitiStyle,
  type RoomWallArt,
} from '@/lib/roomWallArt';

export interface GraffitiDrawOptions {
  text: string;
  style: GraffitiStyle;
  fill: string;
  outline: string;
  fill2?: string;
  font: GraffitiFont;
  tiltDeg: number;
  curve: number;
  outlineScale: number;
  backdrop: GraffitiBackdrop;
  backdropColor?: string;
  effects: { depth: boolean; drips: boolean; sparkles: boolean; spray: boolean };
  aspect: number;
}

export function graffitiOptions(art: RoomWallArt): GraffitiDrawOptions {
  return {
    text: art.text ?? 'LOVE',
    style: art.graffitiStyle ?? 'bubble',
    fill: art.fillColor ?? '#ff6b35',
    outline: art.outlineColor ?? '#2b1055',
    fill2: art.fillColor2,
    font: art.graffitiFont ?? 'auto',
    tiltDeg: art.tiltDeg ?? 0,
    curve: art.curve ?? 0,
    outlineScale: art.outlineScale ?? 1,
    backdrop: art.backdrop ?? 'none',
    backdropColor: art.backdropColor,
    effects: graffitiEffects(art),
    aspect: art.aspect,
  };
}

export function graffitiKey(o: GraffitiDrawOptions): string {
  return JSON.stringify(o);
}

/* ------------------------------------------------------------------ */
/* Couleurs et hasard stable                                           */
/* ------------------------------------------------------------------ */

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

function hexToRgb(hex: string): [number, number, number] {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return [128, 128, 128];
  let h = m[1];
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Éclaircit (amount > 0) ou assombrit (amount < 0) une couleur. */
export function shade(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  const t = amount >= 0 ? 255 : 0;
  const k = Math.min(1, Math.abs(amount) * 1.6);
  const mix = (c: number) => Math.round(c + (t - c) * k);
  return `rgb(${mix(r)},${mix(g)},${mix(b)})`;
}

function rgba(hex: string, a: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}

/* ------------------------------------------------------------------ */
/* Polices                                                             */
/* ------------------------------------------------------------------ */

const FONTS: Record<Exclude<GraffitiFont, 'auto'>, string> = {
  block: "900 {size}px 'Arial Black', 'Helvetica Neue', Impact, sans-serif",
  round: "900 {size}px 'Arial Rounded MT Bold', 'Varela Round', 'Nunito', 'Arial Black', sans-serif",
  condensed: "900 {size}px Impact, Haettenschweiler, 'Arial Narrow', 'Arial Black', sans-serif",
  script: "italic 700 {size}px 'Brush Script MT', 'Segoe Script', 'Lucida Handwriting', cursive",
  marker: "700 {size}px 'Permanent Marker', 'Marker Felt', 'Comic Sans MS', 'Chalkboard SE', cursive",
  serif: "900 {size}px Georgia, 'Times New Roman', serif",
};

const STYLE_FONT: Record<GraffitiStyle, Exclude<GraffitiFont, 'auto'>> = {
  bubble: 'round',
  drip: 'block',
  neon: 'round',
  stencil: 'condensed',
  wild: 'block',
  chrome: 'block',
  retro: 'block',
  tag: 'script',
  throwup: 'round',
  comic: 'block',
};

function fontFor(o: GraffitiDrawOptions, size: number): string {
  const key = o.font === 'auto' ? STYLE_FONT[o.style] ?? 'block' : o.font;
  return FONTS[key].replace('{size}', String(Math.round(size)));
}

/* ------------------------------------------------------------------ */
/* Placement des lettres (droit ou en arc)                             */
/* ------------------------------------------------------------------ */

interface Glyph {
  ch: string;
  x: number;
  y: number;
  rot: number;
}

/** Lettres à dessiner : un seul bloc pour un texte droit, une lettre à la fois en arc. */
function layoutGlyphs(ctx: CanvasRenderingContext2D, text: string, cx: number, cy: number, curve: number, textW: number): Glyph[] {
  if (Math.abs(curve) < 0.02 || text.length < 2) return [{ ch: text, x: cx, y: cy, rot: 0 }];
  // Arc de cercle : plus |curve| est grand, plus l’angle total est ouvert (jusqu’à ~140°).
  const sweep = Math.abs(curve) * 2.4;
  const radius = textW / sweep;
  const dir = curve > 0 ? 1 : -1;
  // L'arc est recentré verticalement : flèche de l'arc partagée entre le haut et le bas.
  const sag = radius * (1 - Math.cos(sweep / 2));
  const centreY = cy + dir * radius - dir * sag / 2;
  const widths = [...text].map((ch) => ctx.measureText(ch).width);
  const total = widths.reduce((a, b) => a + b, 0) || 1;
  let acc = 0;
  const out: Glyph[] = [];
  [...text].forEach((ch, i) => {
    const mid = acc + widths[i] / 2;
    acc += widths[i];
    const a = ((mid / total) - 0.5) * sweep;
    out.push({
      ch,
      x: cx + Math.sin(a) * radius,
      y: centreY - dir * Math.cos(a) * radius,
      rot: a * dir,
    });
  });
  return out;
}

/* ------------------------------------------------------------------ */
/* Fonds peints                                                        */
/* ------------------------------------------------------------------ */

function drawBackdrop(ctx: CanvasRenderingContext2D, o: GraffitiDrawOptions, W: number, H: number, textW: number, size: number, rand: () => number) {
  if (o.backdrop === 'none') return;
  const color = o.backdropColor ?? shade(o.outline, 0.55);
  const cx = W / 2;
  const cy = H / 2;
  const bw = Math.min(W * 0.98, textW + size * 0.9);
  const bh = Math.min(H * 0.94, size * 1.55);
  ctx.save();
  ctx.fillStyle = color;
  if (o.backdrop === 'panel') {
    const r = size * 0.12;
    ctx.beginPath();
    ctx.roundRect(cx - bw / 2, cy - bh / 2, bw, bh, r);
    ctx.fill();
    ctx.lineWidth = size * 0.05;
    ctx.strokeStyle = shade(color, -0.25);
    ctx.stroke();
  } else if (o.backdrop === 'banner') {
    const h = bh * 0.72;
    const notch = h * 0.35;
    ctx.beginPath();
    ctx.moveTo(cx - bw / 2, cy - h / 2);
    ctx.lineTo(cx + bw / 2, cy - h / 2);
    ctx.lineTo(cx + bw / 2 - notch, cy);
    ctx.lineTo(cx + bw / 2, cy + h / 2);
    ctx.lineTo(cx - bw / 2, cy + h / 2);
    ctx.lineTo(cx - bw / 2 + notch, cy);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = shade(color, -0.2);
    ctx.fillRect(cx - bw / 2 + notch, cy + h / 2 - h * 0.08, bw - notch * 2, h * 0.08);
  } else if (o.backdrop === 'cloud') {
    const n = Math.max(5, Math.round(bw / (size * 0.45)));
    for (let i = 0; i < n; i += 1) {
      const x = cx - bw / 2 + size * 0.35 + (i / (n - 1)) * (bw - size * 0.7);
      const top = cy - bh * 0.18 + (i % 2 === 0 ? -1 : 1) * bh * 0.08;
      ctx.beginPath();
      ctx.arc(x, top, size * (0.42 + rand() * 0.12), 0, Math.PI * 2);
      ctx.arc(x, cy + bh * 0.2, size * (0.38 + rand() * 0.1), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillRect(cx - bw / 2 + size * 0.35, cy - bh * 0.18, bw - size * 0.7, bh * 0.38);
  } else {
    // Éclaboussure : tache irrégulière, gouttes et projections.
    const pts = 28;
    ctx.beginPath();
    for (let i = 0; i <= pts; i += 1) {
      const a = (i / pts) * Math.PI * 2;
      const wobble = 0.82 + rand() * 0.3 + (i % 5 === 0 ? 0.18 : 0);
      const x = cx + Math.cos(a) * (bw / 2) * wobble;
      const y = cy + Math.sin(a) * (bh / 2) * wobble;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    for (let i = 0; i < 18; i += 1) {
      const a = rand() * Math.PI * 2;
      const d = 0.55 + rand() * 0.45;
      ctx.beginPath();
      ctx.arc(cx + Math.cos(a) * (bw / 2) * (1 + d * 0.15), cy + Math.sin(a) * (bh / 2) * (1 + d * 0.2), size * (0.02 + rand() * 0.05), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

/* ------------------------------------------------------------------ */
/* Lettrage                                                            */
/* ------------------------------------------------------------------ */

/** Dessine le lettrage sur un canvas transparent, au format `aspect`. */
export function drawGraffiti(o: GraffitiDrawOptions, height = 384): HTMLCanvasElement {
  const H = height;
  const W = Math.min(4096, Math.round(H * Math.max(0.5, o.aspect)));
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  const text = o.text;
  const { style, fill, outline } = o;
  const fx = o.effects;
  const rand = seeded(`${text}|${style}|${o.backdrop}`);
  const tilt = (o.tiltDeg * Math.PI) / 180;

  // Taille : le texte (incliné, en arc) doit tenir dans le cadre avec son contour.
  let size = H * (o.backdrop !== 'none' ? 0.5 : 0.56);
  ctx.font = fontFor(o, size);
  const fit = () => {
    const tw = ctx.measureText(text).width;
    const archH = Math.abs(o.curve) * tw * 0.28;
    const bw = tw * Math.abs(Math.cos(tilt)) + (size + archH) * Math.abs(Math.sin(tilt));
    const bh = tw * Math.abs(Math.sin(tilt)) + (size + archH) * Math.abs(Math.cos(tilt));
    return Math.min((W * (style === 'wild' ? 0.8 : 0.88)) / bw, (H * 0.86) / bh, 1);
  };
  size *= fit();
  ctx.font = fontFor(o, size);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.miterLimit = 2;
  const textW = ctx.measureText(text).width;
  const cx = W / 2;
  const cy = H * (fx.drips ? 0.44 : 0.5);

  drawBackdrop(ctx, o, W, H, textW, size, rand);

  // Repère du lettrage : inclinaison, puis biais du wildstyle.
  ctx.translate(cx, cy);
  ctx.rotate(-tilt);
  if (style === 'wild') ctx.transform(1, -0.06, -0.28, 1, 0, 0);
  if (style === 'tag') ctx.transform(1, 0, -0.18, 1, 0, 0);
  ctx.translate(-cx, -cy);

  const glyphs = layoutGlyphs(ctx, text, cx, cy, o.curve, textW);
  const each = (op: (ch: string) => void, dx = 0, dy = 0) => {
    for (const g of glyphs) {
      ctx.save();
      ctx.translate(g.x + dx, g.y + dy);
      if (g.rot) ctx.rotate(g.rot);
      op(g.ch);
      ctx.restore();
    }
  };
  const fillText = (dx = 0, dy = 0) => each((ch) => ctx.fillText(ch, 0, 0), dx, dy);
  const strokeText = (dx = 0, dy = 0) => each((ch) => ctx.strokeText(ch, 0, 0), dx, dy);
  const lw = (k: number) => size * k * o.outlineScale;

  const vertical = (stops: Array<[number, string]>) => {
    const g = ctx.createLinearGradient(0, cy - size / 2, 0, cy + size / 2);
    for (const [at, c] of stops) g.addColorStop(at, c);
    return g;
  };
  const letterFill = () => (o.fill2
    ? vertical([[0, fill], [1, o.fill2]])
    : vertical([[0, shade(fill, 0.22)], [0.5, fill], [1, shade(fill, -0.18)]]));

  if (style === 'neon') {
    // Tube lumineux : halo large, puis cœur presque blanc.
    ctx.lineWidth = lw(0.07);
    for (const [blur, alpha] of [[size * 0.5, 0.55], [size * 0.25, 0.8], [size * 0.08, 1]] as const) {
      ctx.shadowColor = fill;
      ctx.shadowBlur = blur;
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = o.fill2 ? vertical([[0, fill], [1, o.fill2]]) : fill;
      strokeText();
    }
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
    ctx.lineWidth = lw(0.025);
    ctx.strokeStyle = shade(fill, 0.38);
    strokeText();
    return canvas;
  }

  // Brume de bombe autour des lettres.
  if (fx.spray) {
    ctx.save();
    ctx.shadowColor = style === 'stencil' ? 'rgba(0,0,0,0.35)' : fill;
    ctx.shadowBlur = size * 0.32;
    ctx.globalAlpha = style === 'stencil' ? 0.5 : 0.3;
    ctx.fillStyle = fill;
    fillText();
    ctx.restore();
  }

  if (style === 'stencil') {
    ctx.fillStyle = o.fill2 ? letterFill() : fill;
    fillText();
    ctx.globalCompositeOperation = 'destination-out';
    for (const k of [-0.18, 0.16]) ctx.fillRect(cx - textW / 2 - 10, cy + k * size - size * 0.025, textW + 20, size * 0.05);
    ctx.globalCompositeOperation = 'source-over';
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
    if (fx.drips) drawDrips(ctx, glyphs, cx, cy, textW, size, fill, rand, text);
    return canvas;
  }

  // Relief : couches décalées (rétro : copies franches en dégradé de couleurs).
  if (fx.depth) {
    if (style === 'retro') {
      const layers = [o.fill2 ?? shade(fill, -0.3), outline, shade(outline, -0.3)];
      layers.forEach((c, i) => {
        const k = (layers.length - i) * size * 0.045;
        ctx.fillStyle = c;
        ctx.strokeStyle = c;
        ctx.lineWidth = lw(0.12);
        strokeText(k, k);
        fillText(k, k);
      });
    } else if (style === 'comic') {
      ctx.fillStyle = '#111111';
      ctx.strokeStyle = '#111111';
      ctx.lineWidth = lw(0.2);
      strokeText(size * 0.07, size * 0.08);
      fillText(size * 0.07, size * 0.08);
    } else {
      const depth = Math.round(size * 0.09);
      const c = style === 'chrome' ? '#3a3f47' : shade(outline, -0.08);
      ctx.fillStyle = c;
      ctx.strokeStyle = c;
      ctx.lineWidth = lw(0.16);
      for (let k = depth; k > 0; k -= 2) {
        strokeText(k * 0.8, k);
        fillText(k * 0.8, k);
      }
    }
  }

  // Contour épais, liseré clair, puis remplissage.
  const outlineK = style === 'tag' ? 0.07 : style === 'bubble' || style === 'throwup' ? 0.2 : style === 'comic' ? 0.18 : 0.14;
  ctx.strokeStyle = style === 'comic' ? '#111111' : outline;
  ctx.lineWidth = lw(outlineK);
  strokeText();
  if (style === 'wild' || style === 'retro') {
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = lw(0.06);
    strokeText();
  }
  if (style === 'chrome') {
    ctx.fillStyle = vertical([
      [0, '#ffffff'], [0.3, '#d9dee4'], [0.47, '#6b7480'], [0.5, '#2f353d'], [0.56, '#e8ecf0'], [0.8, '#a3acb6'], [1, '#ffffff'],
    ]);
    fillText();
    // Légère teinte de la couleur choisie par-dessus le métal.
    ctx.save();
    ctx.globalCompositeOperation = 'source-atop';
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = o.fill2 ? vertical([[0, fill], [1, o.fill2]]) : fill;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  } else if (style === 'throwup') {
    ctx.fillStyle = o.fill2 ? letterFill() : fill;
    fillText();
  } else if (style === 'retro') {
    // Coucher de soleil années 80 : jaune en haut, couleur au milieu, contour en bas, et lignes horizontales.
    ctx.fillStyle = o.fill2
      ? letterFill()
      : vertical([[0.15, '#fff6a5'], [0.4, fill], [0.62, shade(fill, -0.25)], [0.9, outline]]);
    fillText();
    ctx.save();
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    for (const k of [0.12, 0.24, 0.34]) ctx.fillRect(0, cy + k * size, W, Math.max(1, size * 0.03));
    ctx.restore();
  } else {
    ctx.fillStyle = letterFill();
    fillText();
  }

  if (style === 'comic') {
    // Trame de points à la manière des BD.
    ctx.save();
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = rgba('#ffffff', 0.35);
    const step = Math.max(5, size * 0.06);
    for (let y = cy - size; y < cy + size; y += step) {
      for (let x = cx - textW / 2 - size; x < cx + textW / 2 + size; x += step) {
        ctx.beginPath();
        ctx.arc(x + ((y / step) % 2) * step * 0.5, y, step * 0.22, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  if (fx.drips) drawDrips(ctx, glyphs, cx, cy, textW, size, o.fill2 ?? fill, rand, text);

  if (style !== 'tag' && style !== 'throwup') {
    // Reflet brillant sur le haut des lettres.
    ctx.save();
    ctx.globalCompositeOperation = 'source-atop';
    const shine = ctx.createLinearGradient(0, cy - size / 2, 0, cy);
    shine.addColorStop(0, 'rgba(255,255,255,0.45)');
    shine.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = shine;
    ctx.fillRect(0, cy - size / 2, W, size / 2);
    ctx.restore();
  }

  if (fx.sparkles) {
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

/** Coulures qui partent du bas des lettres. */
function drawDrips(
  ctx: CanvasRenderingContext2D,
  glyphs: Glyph[],
  cx: number,
  cy: number,
  textW: number,
  size: number,
  color: string,
  rand: () => number,
  text: string,
) {
  ctx.fillStyle = color;
  const n = Math.max(4, Math.round(text.length * 1.6));
  const arc = glyphs.length > 1;
  for (let i = 0; i < n; i += 1) {
    let x = cx - textW / 2 + rand() * textW;
    let y0 = cy + size * 0.26;
    if (arc) {
      const g = glyphs[Math.floor(rand() * glyphs.length)];
      x = g.x;
      y0 = g.y + size * 0.26;
    }
    const w = size * (0.025 + rand() * 0.035);
    const len = size * (0.15 + rand() * 0.55);
    ctx.beginPath();
    ctx.moveTo(x - w / 2, y0);
    ctx.lineTo(x - w / 2, y0 + len);
    ctx.arc(x, y0 + len, w * 0.75, Math.PI, 0, true);
    ctx.lineTo(x + w / 2, y0);
    ctx.closePath();
    ctx.fill();
  }
}

const previewCache = new Map<string, string>();
/** Aperçu PNG (data URL) d’un graffiti, mis en cache : utilisé par la vue de face du mur. */
export function graffitiPreviewUrl(art: RoomWallArt): string | null {
  if (typeof document === 'undefined') return null;
  const o = graffitiOptions(art);
  const key = graffitiKey(o);
  let url = previewCache.get(key);
  if (!url) {
    url = drawGraffiti(o, 160).toDataURL('image/png');
    if (previewCache.size > 60) previewCache.clear();
    previewCache.set(key, url);
  }
  return url;
}
