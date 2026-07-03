export interface TemplatePalette {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  isDark: boolean;
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((v) => Math.min(255, Math.max(0, Math.round(v))).toString(16).padStart(2, '0')).join('')}`;
}

function luminance(r: number, g: number, b: number): number {
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

function saturation(r: number, g: number, b: number): number {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max === 0) return 0;
  return (max - min) / max;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Impossible de charger l\'image pour l\'analyse des couleurs.'));
    img.src = src;
  });
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Lecture du fichier impossible.'));
    reader.readAsDataURL(file);
  });
}

/** Extrait une palette dominante depuis un fichier ou une URL d'image. */
export async function extractPaletteFromSource(source: File | string): Promise<TemplatePalette> {
  const src = source instanceof File ? await readFileAsDataUrl(source) : source;
  const img = await loadImage(src);

  const sampleSize = 120;
  const canvas = document.createElement('canvas');
  canvas.width = sampleSize;
  canvas.height = sampleSize;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas non disponible.');
  }

  const ratio = img.naturalWidth / img.naturalHeight;
  let drawW = sampleSize;
  let drawH = sampleSize;
  if (ratio > 1) {
    drawH = sampleSize / ratio;
  } else {
    drawW = sampleSize * ratio;
  }
  ctx.drawImage(img, (sampleSize - drawW) / 2, (sampleSize - drawH) / 2, drawW, drawH);

  const { data } = ctx.getImageData(0, 0, sampleSize, sampleSize);
  const buckets = new Map<string, { count: number; r: number; g: number; b: number }>();

  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a < 128) continue;

    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    // Ignorer les pixels quasi blancs/noirs pour mieux capturer les couleurs d'accent
    const lum = luminance(r, g, b);
    if (lum > 0.97 || lum < 0.03) continue;

    const qr = Math.round(r / 24) * 24;
    const qg = Math.round(g / 24) * 24;
    const qb = Math.round(b / 24) * 24;
    const key = `${qr},${qg},${qb}`;

    const existing = buckets.get(key);
    if (existing) {
      existing.count += 1;
      existing.r = (existing.r * (existing.count - 1) + r) / existing.count;
      existing.g = (existing.g * (existing.count - 1) + g) / existing.count;
      existing.b = (existing.b * (existing.count - 1) + b) / existing.count;
    } else {
      buckets.set(key, { count: 1, r, g, b });
    }
  }

  const sorted = [...buckets.values()].sort((a, b) => b.count - a.count);

  let accent = sorted[0] || { r: 197, g: 160, b: 89 };
  let secondary = sorted[1] || sorted[0] || { r: 71, g: 85, b: 105 };
  let primary = sorted.find((c) => luminance(c.r, c.g, c.b) < 0.45) || sorted[2] || { r: 30, g: 41, b: 59 };

  // Accent = couleur la plus saturée parmi le top 5
  const topSat = sorted.slice(0, 5).sort(
    (a, b) => saturation(b.r, b.g, b.b) - saturation(a.r, a.g, a.b),
  );
  if (topSat[0]) accent = topSat[0];

  const avgLum =
    sorted.slice(0, 8).reduce((sum, c) => sum + luminance(c.r, c.g, c.b), 0) /
    Math.max(1, Math.min(8, sorted.length));
  const isDark = avgLum < 0.45;

  const background = isDark ? rgbToHex(15, 23, 42) : rgbToHex(250, 248, 245);

  return {
    primary: rgbToHex(primary.r, primary.g, primary.b),
    secondary: rgbToHex(secondary.r, secondary.g, secondary.b),
    accent: rgbToHex(accent.r, accent.g, accent.b),
    background,
    isDark,
  };
}
