/**
 * Guirlandes lumineuses : styles d’ampoules, tracés (canopée, lignes parallèles, zigzag, étoile)
 * et accroche (poteaux ou plafond). Géométrie pure, en mètres, centrée sur l’emprise w × d.
 */

export type StringLightStyle = 'edison' | 'globe' | 'guinguette' | 'fairy' | 'lanterns';
export type StringLightLayout = 'canopy' | 'parallel' | 'zigzag' | 'star';
export type StringLightMount = 'poles' | 'ceiling';

export const STRING_LIGHT_STYLE_LABELS: Record<StringLightStyle, string> = {
  edison: 'Ampoules Edison ambrées',
  globe: 'Globes givrés',
  guinguette: 'Guinguette multicolore',
  fairy: 'Micro-LED féeriques',
  lanterns: 'Lanternes en papier',
};

export const STRING_LIGHT_LAYOUT_LABELS: Record<StringLightLayout, string> = {
  canopy: 'Canopée (côtés et diagonales)',
  parallel: 'Lignes parallèles',
  zigzag: 'Zigzag',
  star: 'Étoile depuis un mât central',
};

export const STRING_LIGHT_MOUNT_LABELS: Record<StringLightMount, string> = {
  poles: 'Sur poteaux',
  ceiling: 'Accrochées au plafond',
};

export type P2 = [number, number];
export type Span = { a: P2; b: P2; /** Le point a est le mât central (plus haut). */ fromMast?: boolean };

/** Écart entre ampoules (m) selon le style. */
export function bulbSpacing(style: StringLightStyle): number {
  if (style === 'fairy') return 0.12;
  if (style === 'lanterns') return 0.9;
  if (style === 'globe') return 0.55;
  return 0.45;
}

/** Flèche de la guirlande au milieu d’une portée (m) : ~8 % de la longueur, plafonnée. */
export function spanSag(lengthM: number): number {
  return Math.min(0.6, Math.max(0.08, lengthM * 0.08));
}

/** Poteaux et portées du tracé. */
export function stringLightPlan(layout: StringLightLayout, w: number, d: number): { poles: P2[]; mast: P2 | null; spans: Span[] } {
  const hx = w * 0.42;
  const hz = d * 0.42;
  if (layout === 'star') {
    const ring: P2[] = [[-hx, -hz], [0, -hz], [hx, -hz], [hx, 0], [hx, hz], [0, hz], [-hx, hz], [-hx, 0]];
    return { poles: ring, mast: [0, 0], spans: ring.map((p) => ({ a: [0, 0] as P2, b: p, fromMast: true })) };
  }
  if (layout === 'parallel' || layout === 'zigzag') {
    // Lignes tendues à travers le petit côté, poteaux le long des deux grands côtés.
    const alongX = w >= d;
    const long = alongX ? hx : hz;
    const short = alongX ? hz : hx;
    const n = Math.max(2, Math.min(8, Math.round((long * 2) / 2.6) + 1));
    const at = (i: number) => -long + (2 * long * i) / (n - 1);
    const pt = (u: number, v: number): P2 => (alongX ? [u, v] : [v, u]);
    const sideA = Array.from({ length: n }, (_, i) => pt(at(i), -short));
    const sideB = Array.from({ length: n }, (_, i) => pt(at(i), short));
    const spans: Span[] = [];
    if (layout === 'parallel') {
      for (let i = 0; i < n; i += 1) spans.push({ a: sideA[i], b: sideB[i] });
    } else {
      for (let i = 0; i < n - 1; i += 1) {
        spans.push({ a: sideA[i], b: sideB[i] });
        spans.push({ a: sideB[i], b: sideA[i + 1] });
      }
      spans.push({ a: sideA[n - 1], b: sideB[n - 1] });
    }
    return { poles: [...sideA, ...sideB], mast: null, spans };
  }
  const c: P2[] = [[-hx, -hz], [hx, -hz], [-hx, hz], [hx, hz]];
  return {
    poles: c,
    mast: null,
    spans: [
      { a: c[0], b: c[1] },
      { a: c[0], b: c[2] },
      { a: c[1], b: c[3] },
      { a: c[2], b: c[3] },
      { a: c[0], b: c[3] },
      { a: c[1], b: c[2] },
    ],
  };
}

/** Points d’ampoules le long d’une portée (x, y, z), en suivant la chaînette. */
export function bulbsAlongSpan(span: Span, heightM: number, mastExtraM: number, style: StringLightStyle): Array<[number, number, number]> {
  const [ax, az] = span.a;
  const [bx, bz] = span.b;
  const len = Math.hypot(bx - ax, bz - az);
  if (len < 0.2) return [];
  const n = Math.max(2, Math.round(len / bulbSpacing(style)));
  const sag = spanSag(len);
  const ya = heightM + (span.fromMast ? mastExtraM : 0);
  const yb = heightM;
  const out: Array<[number, number, number]> = [];
  for (let i = 0; i < n; i += 1) {
    const t = (i + 0.5) / n;
    out.push([ax + (bx - ax) * t, ya + (yb - ya) * t - sag * 4 * t * (1 - t), az + (bz - az) * t]);
  }
  return out;
}

/** Couleurs des ampoules (guinguette et lanternes alternent, les autres restent chaudes). */
export function bulbColor(style: StringLightStyle, index: number): string {
  if (style === 'guinguette') return ['#ff3b30', '#ffcc00', '#34c759', '#0a84ff', '#ff9500', '#ff2d92'][index % 6];
  if (style === 'lanterns') return ['#ffd6e0', '#fff1b8', '#c9f2ff', '#e3d7ff', '#ffdcc2'][index % 5];
  if (style === 'globe') return '#fff6e0';
  if (style === 'fairy') return '#fff2c4';
  return '#ffb347';
}
