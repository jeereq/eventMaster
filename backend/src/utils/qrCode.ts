import QRCode from 'qrcode';
import { PNG } from 'pngjs';
import { DEFAULT_TENANT_BRANDING } from './brandingUtils.ts';
import { QR_LOGO_PNG_BASE64 } from './qrLogoAsset.ts';

const DEFAULT_COLOR = DEFAULT_TENANT_BRANDING.primary;
const DEFAULT_BG = '#ffffff';

/** Base URL publique de l’API (QR WhatsApp / e-mail doivent être joignables). */
export function getPublicApiBaseUrl(): string {
  const explicit =
    process.env.PUBLIC_API_URL ||
    process.env.API_PUBLIC_URL ||
    process.env.BACKEND_PUBLIC_URL;
  if (explicit?.trim()) {
    return explicit.replace(/\/$/, '').replace(/\/api$/, '') + '/api';
  }
  const port = process.env.PORT || '5001';
  return `http://localhost:${port}/api`;
}

export function buildGuestQrImageUrl(guestId: string, size = 300): string {
  const base = getPublicApiBaseUrl();
  return `${base}/rsvp/${guestId}/qr.png?size=${size}`;
}

type Rgba = [number, number, number, number];

/** Part de la largeur utile du QR occupée par le médaillon du logo (≈ 5 % de la surface). */
const LOGO_BADGE_RATIO = 0.22;
/** Marge intérieure du médaillon autour du logo. */
const LOGO_BADGE_PADDING_RATIO = 0.14;
const QR_MARGIN_MODULES = 2;

function parseHexColor(hex: string, fallback: Rgba): Rgba {
  const raw = hex.trim().replace(/^#/, '');
  const full = raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw;
  if (!/^[0-9a-f]{6}([0-9a-f]{2})?$/i.test(full)) return fallback;
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
    full.length === 8 ? parseInt(full.slice(6, 8), 16) : 255,
  ];
}

let cachedLogo: PNG | null = null;
function getLogo(): PNG {
  if (!cachedLogo) cachedLogo = PNG.sync.read(Buffer.from(QR_LOGO_PNG_BASE64, 'base64'));
  return cachedLogo;
}

/** Échantillonnage bilinéaire du logo (coordonnées normalisées 0..1). */
function sampleLogo(logo: PNG, u: number, v: number): Rgba {
  const x = Math.min(Math.max(u * logo.width - 0.5, 0), logo.width - 1);
  const y = Math.min(Math.max(v * logo.height - 0.5, 0), logo.height - 1);
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = Math.min(x0 + 1, logo.width - 1);
  const y1 = Math.min(y0 + 1, logo.height - 1);
  const fx = x - x0;
  const fy = y - y0;
  const out: Rgba = [0, 0, 0, 0];
  const d = logo.data;
  for (let k = 0; k < 4; k++) {
    const a = d[(y0 * logo.width + x0) * 4 + k] * (1 - fx) + d[(y0 * logo.width + x1) * 4 + k] * fx;
    const b = d[(y1 * logo.width + x0) * 4 + k] * (1 - fx) + d[(y1 * logo.width + x1) * 4 + k] * fx;
    out[k] = a * (1 - fy) + b * fy;
  }
  return out;
}

/** Couverture (0..1) d'un pixel par un carré arrondi centré, avec anticrénelage simple. */
function roundedSquareCoverage(px: number, py: number, cx: number, cy: number, half: number, radius: number): number {
  const dx = Math.max(Math.abs(px - cx) - (half - radius), 0);
  const dy = Math.max(Math.abs(py - cy) - (half - radius), 0);
  const dist = Math.sqrt(dx * dx + dy * dy) - radius;
  return Math.min(Math.max(0.5 - dist, 0), 1);
}

/**
 * Génère le PNG d'un code QR avec le logo EventMaster au centre.
 * Le QR est encodé en correction d'erreur « H » (30 % de redondance) ; le médaillon
 * du logo n'en masque qu'environ 5 %, ce qui garde le code lisible par les scanners.
 */
export async function generateQrPngBuffer(
  data: string,
  options?: { size?: number; color?: string; background?: string; withLogo?: boolean },
): Promise<Buffer> {
  const size = Math.max(64, Math.round(options?.size ?? 300));
  const color = options?.color ?? DEFAULT_COLOR;
  const background = options?.background ?? DEFAULT_BG;
  const withLogo = options?.withLogo ?? true;

  if (!withLogo) {
    return QRCode.toBuffer(data, {
      type: 'png',
      width: size,
      margin: QR_MARGIN_MODULES,
      errorCorrectionLevel: 'M',
      color: { dark: color, light: background },
    });
  }

  const qr = QRCode.create(data, { errorCorrectionLevel: 'H' });
  const n = qr.modules.size;
  const bits = qr.modules.data;
  const total = n + QR_MARGIN_MODULES * 2;
  // Taille de module entière pour des modules nets (le PNG peut être légèrement plus grand que demandé).
  const scale = Math.max(1, Math.ceil(size / total));
  const width = total * scale;
  const dark = parseHexColor(color, parseHexColor(DEFAULT_COLOR, [0, 0, 0, 255]));
  const light = parseHexColor(background, [255, 255, 255, 255]);

  const png = new PNG({ width, height: width });
  const out = png.data;
  for (let y = 0; y < width; y++) {
    const my = Math.floor(y / scale) - QR_MARGIN_MODULES;
    for (let x = 0; x < width; x++) {
      const mx = Math.floor(x / scale) - QR_MARGIN_MODULES;
      const isDark = my >= 0 && my < n && mx >= 0 && mx < n && bits[my * n + mx] === 1;
      const c = isDark ? dark : light;
      const i = (y * width + x) * 4;
      out[i] = c[0];
      out[i + 1] = c[1];
      out[i + 2] = c[2];
      out[i + 3] = c[3];
    }
  }

  // Médaillon centré : taille alignée sur un nombre impair de modules pour rester symétrique.
  let badgeModules = Math.max(3, Math.round(n * LOGO_BADGE_RATIO));
  if (badgeModules % 2 === 0) badgeModules += 1;
  const badgePx = badgeModules * scale;
  const center = width / 2;
  const half = badgePx / 2;
  const radius = badgePx * 0.22;
  const logoHalf = half * (1 - LOGO_BADGE_PADDING_RATIO * 2);
  const logo = getLogo();
  const x0 = Math.floor(center - half) - 1;
  const x1 = Math.ceil(center + half) + 1;

  for (let y = x0; y < x1; y++) {
    for (let x = x0; x < x1; x++) {
      const px = x + 0.5;
      const py = y + 0.5;
      const cover = roundedSquareCoverage(px, py, center, center, half, radius);
      if (cover <= 0) continue;
      const i = (y * width + x) * 4;
      let r = light[0];
      let g = light[1];
      let b = light[2];
      const lu = (px - (center - logoHalf)) / (logoHalf * 2);
      const lv = (py - (center - logoHalf)) / (logoHalf * 2);
      if (lu >= 0 && lu <= 1 && lv >= 0 && lv <= 1) {
        const s = sampleLogo(logo, lu, lv);
        const a = s[3] / 255;
        r = s[0] * a + r * (1 - a);
        g = s[1] * a + g * (1 - a);
        b = s[2] * a + b * (1 - a);
      }
      out[i] = Math.round(r * cover + out[i] * (1 - cover));
      out[i + 1] = Math.round(g * cover + out[i + 1] * (1 - cover));
      out[i + 2] = Math.round(b * cover + out[i + 2] * (1 - cover));
      out[i + 3] = Math.max(out[i + 3], light[3]);
    }
  }

  return PNG.sync.write(png);
}
