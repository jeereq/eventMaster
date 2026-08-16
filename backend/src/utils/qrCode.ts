import QRCode from 'qrcode';

const DEFAULT_COLOR = '#4f46e5';
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

export async function generateQrPngBuffer(
  data: string,
  options?: { size?: number; color?: string; background?: string },
): Promise<Buffer> {
  const size = options?.size ?? 300;
  const color = options?.color ?? DEFAULT_COLOR;
  const background = options?.background ?? DEFAULT_BG;

  return QRCode.toBuffer(data, {
    type: 'png',
    width: size,
    margin: 2,
    errorCorrectionLevel: 'M',
    color: {
      dark: color,
      light: background,
    },
  });
}
