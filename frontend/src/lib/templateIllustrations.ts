/**
 * Bibliothèque d’illustrations vectorielles pour les modèles d’invitation.
 *
 * Chaque illustration est générée en SVG avec la couleur choisie (ou un dégradé de
 * deux couleurs) puis stockée comme data URI dans `imageUrl` : elle s’affiche donc
 * partout (éditeur, invitation, impression, vitrine) sans dépendance réseau et peut
 * être superposée aux photos, recadrée, masquée ou fondue comme n’importe quelle image.
 */

export interface TemplateIllustration {
  id: string;
  label: string;
  category: 'Végétal' | 'Amour' | 'Fête' | 'Ornement' | 'Céleste' | 'Spirituel';
  /** Proportions conseillées (largeur / hauteur). */
  aspect: number;
  /** Corps SVG ; `P` = peinture (couleur ou dégradé), `S` = couleur secondaire douce. */
  body: (paint: string) => string;
}

const f = (n: number) => Number(n.toFixed(2));

/** Feuille en amande posée en (x, y), orientée selon `angle` (degrés), longueur `len`. */
function leaf(x: number, y: number, angle: number, len: number, paint: string, opacity = 1): string {
  const w = len * 0.32;
  return `<path transform="translate(${f(x)} ${f(y)}) rotate(${f(angle)})" d="M0 0 C${f(len * 0.25)} ${f(-w)} ${f(len * 0.75)} ${f(-w)} ${f(len)} 0 C${f(len * 0.75)} ${f(w)} ${f(len * 0.25)} ${f(w)} 0 0Z" fill="${paint}" fill-opacity="${opacity}"/>`;
}

/** Point d’une courbe de Bézier cubique. */
function bezier(t: number, p0: number[], p1: number[], p2: number[], p3: number[]): [number, number, number] {
  const u = 1 - t;
  const x = u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0];
  const y = u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1];
  const dx = 3 * u * u * (p1[0] - p0[0]) + 6 * u * t * (p2[0] - p1[0]) + 3 * t * t * (p3[0] - p2[0]);
  const dy = 3 * u * u * (p1[1] - p0[1]) + 6 * u * t * (p2[1] - p1[1]) + 3 * t * t * (p3[1] - p2[1]);
  return [x, y, (Math.atan2(dy, dx) * 180) / Math.PI];
}

/** Fleur à n pétales. */
function flower(cx: number, cy: number, r: number, paint: string, petals = 5, centerPaint = paint): string {
  let out = '';
  for (let i = 0; i < petals; i++) {
    const a = (360 / petals) * i - 90;
    out += `<ellipse cx="${f(cx)}" cy="${f(cy - r * 0.55)}" rx="${f(r * 0.36)}" ry="${f(r * 0.55)}" transform="rotate(${f(a + 90)} ${f(cx)} ${f(cy)})" fill="${paint}" fill-opacity="0.85"/>`;
  }
  out += `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r * 0.24)}" fill="${centerPaint}"/>`;
  return out;
}

/** Étoile scintillante à 4 branches. */
function sparkle(cx: number, cy: number, r: number, paint: string): string {
  const k = r * 0.14;
  return `<path d="M${f(cx)} ${f(cy - r)} C${f(cx + k)} ${f(cy - k)} ${f(cx + k)} ${f(cy - k)} ${f(cx + r)} ${f(cy)} C${f(cx + k)} ${f(cy + k)} ${f(cx + k)} ${f(cy + k)} ${f(cx)} ${f(cy + r)} C${f(cx - k)} ${f(cy + k)} ${f(cx - k)} ${f(cy + k)} ${f(cx - r)} ${f(cy)} C${f(cx - k)} ${f(cy - k)} ${f(cx - k)} ${f(cy - k)} ${f(cx)} ${f(cy - r)}Z" fill="${paint}"/>`;
}

/** Étoile à 5 branches pleine. */
function star5(cx: number, cy: number, r: number, paint: string): string {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const a = (Math.PI / 5) * i - Math.PI / 2;
    const rr = i % 2 === 0 ? r : r * 0.42;
    pts.push(`${f(cx + rr * Math.cos(a))},${f(cy + rr * Math.sin(a))}`);
  }
  return `<polygon points="${pts.join(' ')}" fill="${paint}"/>`;
}

const HEART = 'M0 -12 C-4 -22 -20 -22 -20 -8 C-20 4 -6 12 0 20 C6 12 20 4 20 -8 C20 -22 4 -22 0 -12Z';

function leafyBranch(P: string): string {
  const p0 = [24, 180];
  const p1 = [60, 130];
  const p2 = [110, 80];
  const p3 = [178, 24];
  let out = `<path d="M${p0} C${p1} ${p2} ${p3}" fill="none" stroke="${P}" stroke-width="3" stroke-linecap="round"/>`;
  for (let i = 1; i <= 9; i++) {
    const t = i / 10;
    const [x, y, a] = bezier(t, p0, p1, p2, p3);
    const len = 34 - i * 1.6;
    out += leaf(x, y, a - 50, len, P, 0.9);
    out += leaf(x, y, a + 50, len, P, 0.65);
  }
  out += leaf(p3[0], p3[1], -40, 22, P);
  return out;
}

function laurelWreath(P: string): string {
  let out = '';
  const cx = 100;
  const cy = 100;
  const r = 72;
  const pt = (deg: number): [number, number] => {
    const rad = (deg * Math.PI) / 180;
    return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
  };
  for (const mirror of [false, true]) {
    const mx = (x: number) => (mirror ? 200 - x : x);
    const ma = (a: number) => (mirror ? 180 - a : a);
    const [sx, sy] = pt(100);
    const [ex, ey] = pt(255);
    out += `<path d="M${f(mx(sx))} ${f(sy)} A${r} ${r} 0 0 ${mirror ? 0 : 1} ${f(mx(ex))} ${f(ey)}" fill="none" stroke="${P}" stroke-width="2.4" stroke-linecap="round"/>`;
    for (let deg = 108; deg <= 250; deg += 13) {
      const [x, y] = pt(deg);
      const tangent = deg + 90;
      out += leaf(mx(x), y, ma(tangent - 38), 24, P, 0.9);
      out += leaf(mx(x), y, ma(tangent + 38), 21, P, 0.6);
    }
  }
  return out;
}

function roseIllu(P: string): string {
  return [
    `<path d="M100 118 C98 140 96 160 100 192" fill="none" stroke="${P}" stroke-width="3" stroke-linecap="round"/>`,
    leaf(99, 158, 200, 34, P, 0.85),
    leaf(100, 172, -20, 30, P, 0.65),
    `<path d="M100 40 C132 40 152 62 148 90 C144 116 124 128 100 128 C76 128 56 116 52 90 C48 62 68 40 100 40Z" fill="${P}" fill-opacity="0.22" stroke="${P}" stroke-width="2.5"/>`,
    `<path d="M70 72 C66 96 80 116 100 116 C120 116 134 96 130 72" fill="none" stroke="${P}" stroke-width="2.5" stroke-linecap="round"/>`,
    `<path d="M100 58 C120 58 128 76 120 90 C112 104 90 104 84 90 C78 78 88 68 100 72 C110 75 110 88 101 90" fill="none" stroke="${P}" stroke-width="2.5" stroke-linecap="round"/>`,
  ].join('');
}

function heartsIllu(P: string): string {
  return [
    `<path transform="translate(78 104) scale(3)" d="${HEART}" fill="none" stroke="${P}" stroke-width="1.4"/>`,
    `<path transform="translate(124 96) scale(3) rotate(10)" d="${HEART}" fill="${P}" fill-opacity="0.85"/>`,
  ].join('');
}

function ringsIllu(P: string): string {
  return [
    `<circle cx="78" cy="118" r="44" fill="none" stroke="${P}" stroke-width="9"/>`,
    `<circle cx="124" cy="118" r="44" fill="none" stroke="${P}" stroke-width="9" stroke-opacity="0.75"/>`,
    `<path d="M66 70 L78 56 L90 70 L78 82Z" fill="${P}"/>`,
    sparkle(104, 40, 10, P),
    sparkle(150, 56, 7, P),
  ].join('');
}

function sparklesIllu(P: string): string {
  return [
    sparkle(80, 86, 46, P),
    sparkle(146, 52, 22, P),
    sparkle(148, 146, 28, P),
    sparkle(52, 160, 14, P),
    `<circle cx="120" cy="104" r="4" fill="${P}"/>`,
    `<circle cx="40" cy="40" r="3" fill="${P}"/>`,
  ].join('');
}

function cornerFloral(P: string): string {
  const out: string[] = [
    `<path d="M8 8 C70 12 120 40 190 120" fill="none" stroke="${P}" stroke-width="2.5" stroke-linecap="round"/>`,
    `<path d="M8 8 C12 70 40 120 120 190" fill="none" stroke="${P}" stroke-width="2.5" stroke-linecap="round"/>`,
  ];
  for (const [t, flip] of [[0.25, 1], [0.45, -1], [0.65, 1], [0.82, -1]] as const) {
    const [x1, y1, a1] = bezier(t, [8, 8], [70, 12], [120, 40], [190, 120]);
    out.push(leaf(x1, y1, a1 + 45 * flip, 22, P, 0.8));
    const [x2, y2, a2] = bezier(t, [8, 8], [12, 70], [40, 120], [120, 190]);
    out.push(leaf(x2, y2, a2 - 45 * flip, 22, P, 0.8));
  }
  out.push(flower(34, 34, 26, P, 6));
  out.push(flower(92, 40, 12, P, 5));
  out.push(flower(40, 92, 12, P, 5));
  return out.join('');
}

function flowerIllu(P: string): string {
  return flower(100, 100, 84, P, 6) + `<circle cx="100" cy="100" r="26" fill="none" stroke="#ffffff" stroke-opacity="0.6" stroke-width="2"/>`;
}

function balloonsIllu(P: string): string {
  const balloon = (cx: number, cy: number, rx: number, op: number) =>
    `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${f(rx * 1.22)}" fill="${P}" fill-opacity="${op}"/>` +
    `<path d="M${cx - 4} ${f(cy + rx * 1.22 + 6)} L${cx} ${f(cy + rx * 1.22 - 1)} L${cx + 4} ${f(cy + rx * 1.22 + 6)}Z" fill="${P}" fill-opacity="${op}"/>` +
    `<ellipse cx="${f(cx - rx * 0.35)}" cy="${f(cy - rx * 0.45)}" rx="${f(rx * 0.18)}" ry="${f(rx * 0.3)}" fill="#ffffff" fill-opacity="0.45" transform="rotate(-25 ${f(cx - rx * 0.35)} ${f(cy - rx * 0.45)})"/>`;
  return [
    `<path d="M62 106 C66 140 92 160 100 196 M138 96 C132 140 108 160 100 196 M100 82 C96 130 104 160 100 196" fill="none" stroke="${P}" stroke-width="1.6"/>`,
    balloon(62, 64, 30, 0.75),
    balloon(138, 56, 30, 0.6),
    balloon(100, 40, 32, 0.95),
  ].join('');
}

function champagneIllu(P: string): string {
  const glass = (rot: number, tx: number) =>
    `<g transform="translate(${tx} 0) rotate(${rot} 100 190)">` +
    `<path d="M84 30 L116 30 C118 70 112 96 100 104 C88 96 82 70 84 30Z" fill="${P}" fill-opacity="0.25" stroke="${P}" stroke-width="3" stroke-linejoin="round"/>` +
    `<path d="M86 52 L114 52" stroke="${P}" stroke-width="2"/>` +
    `<path d="M100 104 L100 172 M82 176 L118 176" stroke="${P}" stroke-width="3.5" stroke-linecap="round"/>` +
    `</g>`;
  return [
    glass(14, -22),
    glass(-14, 22),
    `<circle cx="98" cy="30" r="4" fill="${P}"/><circle cx="108" cy="16" r="3" fill="${P}"/><circle cx="92" cy="10" r="2.5" fill="${P}"/>`,
    sparkle(100, 46, 8, P),
  ].join('');
}

function crossIllu(P: string): string {
  let rays = '';
  for (let i = 0; i < 16; i++) {
    const a = (Math.PI * 2 * i) / 16;
    const r1 = 58;
    const r2 = i % 2 ? 76 : 88;
    rays += `<line x1="${f(100 + r1 * Math.cos(a))}" y1="${f(78 + r1 * Math.sin(a))}" x2="${f(100 + r2 * Math.cos(a))}" y2="${f(78 + r2 * Math.sin(a))}" stroke="${P}" stroke-width="2" stroke-linecap="round" stroke-opacity="0.6"/>`;
  }
  return rays + `<path d="M92 20 H108 V62 H140 V78 H108 V180 H92 V78 H60 V62 H92Z" fill="${P}" stroke="${P}" stroke-width="2" stroke-linejoin="round"/>`;
}

function crownIllu(P: string): string {
  return [
    `<path d="M30 150 L22 64 L64 100 L100 44 L136 100 L178 64 L170 150Z" fill="${P}" fill-opacity="0.9" stroke="${P}" stroke-width="3" stroke-linejoin="round"/>`,
    `<rect x="30" y="152" width="140" height="16" rx="4" fill="${P}"/>`,
    `<circle cx="22" cy="60" r="8" fill="${P}"/><circle cx="100" cy="38" r="9" fill="${P}"/><circle cx="178" cy="60" r="8" fill="${P}"/>`,
    `<circle cx="100" cy="122" r="9" fill="#ffffff" fill-opacity="0.55"/><circle cx="62" cy="128" r="6" fill="#ffffff" fill-opacity="0.45"/><circle cx="138" cy="128" r="6" fill="#ffffff" fill-opacity="0.45"/>`,
  ].join('');
}

function palmIllu(P: string): string {
  const p0 = [40, 190];
  const p1 = [70, 120];
  const p2 = [120, 60];
  const p3 = [176, 26];
  let out = `<path d="M${p0} C${p1} ${p2} ${p3}" fill="none" stroke="${P}" stroke-width="3.2" stroke-linecap="round"/>`;
  for (let i = 1; i <= 16; i++) {
    const t = 0.08 + (i / 16) * 0.9;
    const [x, y, a] = bezier(t, p0, p1, p2, p3);
    const len = 58 - t * 40;
    for (const side of [-1, 1]) {
      const ang = ((a + side * 62) * Math.PI) / 180;
      const ex = x + len * Math.cos(ang);
      const ey = y + len * Math.sin(ang) + len * 0.18;
      out += `<path d="M${f(x)} ${f(y)} Q${f((x + ex) / 2 + side * 4)} ${f((y + ey) / 2 - 6)} ${f(ex)} ${f(ey)}" fill="none" stroke="${P}" stroke-width="3" stroke-linecap="round" stroke-opacity="${side > 0 ? 0.95 : 0.7}"/>`;
    }
  }
  return out;
}

function moonStars(P: string): string {
  return [
    `<path d="M118 28 C78 34 52 70 58 110 C64 150 102 178 142 170 C110 162 88 134 88 100 C88 66 104 40 118 28Z" fill="${P}"/>`,
    star5(150, 70, 14, P),
    star5(132, 118, 8, P),
    sparkle(168, 120, 10, P),
    sparkle(40, 50, 8, P),
  ].join('');
}

function waxMotif(P: string): string {
  let out = `<circle cx="100" cy="100" r="88" fill="none" stroke="${P}" stroke-width="6"/>`;
  out += `<circle cx="100" cy="100" r="62" fill="${P}" fill-opacity="0.18" stroke="${P}" stroke-width="4"/>`;
  out += `<circle cx="100" cy="100" r="24" fill="${P}"/>`;
  for (let i = 0; i < 24; i++) {
    const a = (Math.PI * 2 * i) / 24;
    out += `<circle cx="${f(100 + 75 * Math.cos(a))}" cy="${f(100 + 75 * Math.sin(a))}" r="4.2" fill="${P}"/>`;
  }
  for (let i = 0; i < 8; i++) {
    const a = (360 / 8) * i;
    out += `<path transform="rotate(${a} 100 100)" d="M100 44 C108 54 108 64 100 74 C92 64 92 54 100 44Z" fill="${P}"/>`;
  }
  return out;
}

function ribbonIllu(P: string): string {
  return [
    `<path d="M6 92 L36 92 L36 130 L6 130 L18 111Z" fill="${P}" fill-opacity="0.7"/>`,
    `<path d="M194 92 L164 92 L164 130 L194 130 L182 111Z" fill="${P}" fill-opacity="0.7"/>`,
    `<path d="M26 78 C70 66 130 66 174 78 L174 118 C130 106 70 106 26 118Z" fill="${P}"/>`,
    `<path d="M26 118 L36 130 L36 115Z M174 118 L164 130 L164 115Z" fill="${P}" fill-opacity="0.45"/>`,
  ].join('');
}

function confettiIllu(P: string): string {
  let seed = 7;
  const rnd = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  let out = '';
  for (let i = 0; i < 34; i++) {
    const x = 10 + rnd() * 180;
    const y = 10 + rnd() * 180;
    const op = f(0.45 + rnd() * 0.55);
    const kind = i % 3;
    if (kind === 0) out += `<rect x="${f(x)}" y="${f(y)}" width="10" height="5" rx="1.5" fill="${P}" fill-opacity="${op}" transform="rotate(${f(rnd() * 180)} ${f(x)} ${f(y)})"/>`;
    else if (kind === 1) out += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(2.5 + rnd() * 3)}" fill="${P}" fill-opacity="${op}"/>`;
    else out += `<path d="M${f(x)} ${f(y)} q6 -6 12 0 t12 0" fill="none" stroke="${P}" stroke-width="2.5" stroke-linecap="round" stroke-opacity="${op}"/>`;
  }
  return out;
}

function heartIllu(P: string): string {
  return `<path transform="translate(100 96) scale(4.4)" d="${HEART}" fill="${P}"/>`;
}

function ovalFrame(P: string): string {
  return [
    `<ellipse cx="100" cy="100" rx="70" ry="90" fill="none" stroke="${P}" stroke-width="4"/>`,
    `<ellipse cx="100" cy="100" rx="62" ry="82" fill="none" stroke="${P}" stroke-width="1.5"/>`,
    flower(100, 12, 14, P, 6),
    flower(100, 188, 14, P, 6),
    leaf(100, 12, 200, 26, P, 0.8),
    leaf(100, 12, -20, 26, P, 0.8),
    leaf(100, 188, 160, 26, P, 0.8),
    leaf(100, 188, 20, 26, P, 0.8),
  ].join('');
}

function doveIllu(P: string): string {
  return [
    `<path d="M40 120 C60 96 96 92 120 104 C132 82 152 70 176 72 C164 80 156 92 152 106 C150 132 128 150 98 152 C78 154 58 146 40 120Z" fill="${P}"/>`,
    `<path d="M96 104 C84 74 90 44 116 24 C118 56 124 80 136 98Z" fill="${P}" fill-opacity="0.75"/>`,
    `<path d="M40 120 L14 112 L26 128 L12 140 L44 132Z" fill="${P}" fill-opacity="0.85"/>`,
    `<circle cx="160" cy="82" r="2.6" fill="#ffffff"/>`,
    `<path d="M176 72 L190 76 L176 80Z" fill="${P}"/>`,
    leaf(176, 84, 40, 22, P, 0.8),
  ].join('');
}

export const TEMPLATE_ILLUSTRATIONS: TemplateIllustration[] = [
  { id: 'leafy-branch', label: 'Branche feuillue', category: 'Végétal', aspect: 1, body: leafyBranch },
  { id: 'laurel', label: 'Couronne de laurier', category: 'Végétal', aspect: 1, body: laurelWreath },
  { id: 'palm', label: 'Palme', category: 'Végétal', aspect: 1, body: palmIllu },
  { id: 'rose', label: 'Rose', category: 'Végétal', aspect: 1, body: roseIllu },
  { id: 'flower', label: 'Fleur', category: 'Végétal', aspect: 1, body: flowerIllu },
  { id: 'corner-floral', label: 'Coin floral', category: 'Ornement', aspect: 1, body: cornerFloral },
  { id: 'oval-frame', label: 'Cadre ovale', category: 'Ornement', aspect: 0.8, body: ovalFrame },
  { id: 'ribbon', label: 'Banderole', category: 'Ornement', aspect: 2, body: ribbonIllu },
  { id: 'wax', label: 'Motif wax', category: 'Ornement', aspect: 1, body: waxMotif },
  { id: 'heart', label: 'Cœur', category: 'Amour', aspect: 1, body: heartIllu },
  { id: 'hearts', label: 'Deux cœurs', category: 'Amour', aspect: 1, body: heartsIllu },
  { id: 'rings', label: 'Alliances', category: 'Amour', aspect: 1, body: ringsIllu },
  { id: 'dove', label: 'Colombe', category: 'Spirituel', aspect: 1, body: doveIllu },
  { id: 'cross', label: 'Croix', category: 'Spirituel', aspect: 1, body: crossIllu },
  { id: 'crown', label: 'Couronne', category: 'Fête', aspect: 1, body: crownIllu },
  { id: 'balloons', label: 'Ballons', category: 'Fête', aspect: 1, body: balloonsIllu },
  { id: 'champagne', label: 'Coupes', category: 'Fête', aspect: 1, body: champagneIllu },
  { id: 'confetti', label: 'Confettis', category: 'Fête', aspect: 1, body: confettiIllu },
  { id: 'sparkles', label: 'Étincelles', category: 'Céleste', aspect: 1, body: sparklesIllu },
  { id: 'moon-stars', label: 'Lune et étoiles', category: 'Céleste', aspect: 1, body: moonStars },
];

const safeColor = (c: string | undefined, fallback: string) =>
  c && /^#[0-9a-f]{3,8}$/i.test(c.trim()) ? c.trim() : fallback;

/** SVG complet d’une illustration, en couleur unie ou en dégradé (color → color2). */
export function illustrationSvg(id: string, color?: string, color2?: string): string | null {
  const illu = TEMPLATE_ILLUSTRATIONS.find((i) => i.id === id);
  if (!illu) return null;
  const c1 = safeColor(color, '#c5a059');
  const c2 = color2 ? safeColor(color2, '') : '';
  const defs = c2
    ? `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs>`
    : '';
  const paint = c2 ? 'url(#g)' : c1;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">${defs}${illu.body(paint)}</svg>`;
}

/** Data URI utilisable directement dans `imageUrl`. */
export function illustrationDataUri(id: string, color?: string, color2?: string): string | null {
  const svg = illustrationSvg(id, color, color2);
  return svg ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}` : null;
}
