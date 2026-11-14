/**
 * Sols dessinés au canvas (miroir noir, piste LED, parquet Versailles).
 * Les mêmes fonctions servent à la texture 3D et au plan 2D, pour que le sol
 * soit identique dans les deux vues.
 *
 * Module sans three.js.
 */

export type ProceduralFloorType = 'miroirNoir' | 'dancefloorLed' | 'parquetVersailles';
type Draw = (ctx: CanvasRenderingContext2D, size: number) => void;

function noise(ctx: CanvasRenderingContext2D, size: number, alpha = 0.08) {
  const img = ctx.getImageData(0, 0, size, size);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 255 * alpha;
    img.data[i] = Math.min(255, Math.max(0, img.data[i] + n));
    img.data[i + 1] = Math.min(255, Math.max(0, img.data[i + 1] + n));
    img.data[i + 2] = Math.min(255, Math.max(0, img.data[i + 2] + n));
  }
  ctx.putImageData(img, 0, 0);
}

function seededRandom(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const PROCEDURAL_FLOOR_DRAW: Record<ProceduralFloorType, Draw> = {
  miroirNoir: (ctx, size) => {
    ctx.fillStyle = '#08080a';
    ctx.fillRect(0, 0, size, size);
    // Joints fins biseautés de dalles miroir
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, size - 2, size - 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.02)';
    ctx.lineWidth = 1;
    ctx.strokeRect(size * 0.08, size * 0.08, size * 0.84, size * 0.84);
    const g = ctx.createRadialGradient(size * 0.5, size * 0.5, size * 0.1, size * 0.5, size * 0.5, size * 0.7);
    g.addColorStop(0, 'rgba(28,28,38,0.4)');
    g.addColorStop(1, 'rgba(4,4,6,0.9)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  },
  dancefloorLed: (ctx, size) => {
    ctx.fillStyle = '#07090e';
    ctx.fillRect(0, 0, size, size);
    const cols = 4;
    const step = size / cols;
    ctx.strokeStyle = 'rgba(212,175,55,0.4)';
    ctx.lineWidth = 3;
    for (let i = 0; i <= cols; i++) {
      ctx.beginPath();
      ctx.moveTo(i * step, 0); ctx.lineTo(i * step, size); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * step); ctx.lineTo(size, i * step); ctx.stroke();
    }
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < cols; r++) {
        const cx = c * step;
        const cy = r * step;
        ctx.strokeStyle = 'rgba(255,255,255,0.06)';
        ctx.lineWidth = 1;
        ctx.strokeRect(cx + 4, cy + 4, step - 8, step - 8);
        for (let dx = 0.22; dx < 0.9; dx += 0.28) {
          for (let dy = 0.22; dy < 0.9; dy += 0.28) {
            const lx = cx + dx * step;
            const ly = cy + dy * step;
            const rad = ctx.createRadialGradient(lx, ly, 0.5, lx, ly, 6);
            rad.addColorStop(0, '#ffffff');
            rad.addColorStop(0.35, 'rgba(240,230,200,0.85)');
            rad.addColorStop(1, 'rgba(250,204,21,0)');
            ctx.fillStyle = rad;
            ctx.beginPath();
            ctx.arc(lx, ly, 6, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    }
  },
  parquetVersailles: (ctx, size) => {
    // Panneau Versailles : cadre périphérique + treillis diagonal entrelacé, lames veinées.
    const rand = seededRandom(29);
    const grainFill = (angle: number) => {
      ctx.save();
      ctx.translate(size / 2, size / 2);
      ctx.rotate(angle);
      for (let i = -size; i < size; i += 3) {
        const t = rand();
        ctx.fillStyle = `rgba(${t > 0.5 ? '255,236,200' : '70,40,15'},${0.05 + rand() * 0.08})`;
        ctx.fillRect(-size, i, size * 2, 1 + rand() * 2);
      }
      ctx.restore();
    };
    ctx.fillStyle = '#b07d45';
    ctx.fillRect(0, 0, size, size);
    grainFill(Math.PI / 4);
    const b = size * 0.09;
    const band = size * 0.07;
    // Treillis : deux diagonales de lames.
    ctx.save();
    ctx.beginPath();
    ctx.rect(b, b, size - 2 * b, size - 2 * b);
    ctx.clip();
    for (const dir of [1, -1]) {
      ctx.save();
      ctx.translate(size / 2, size / 2);
      ctx.rotate((dir * Math.PI) / 4);
      ctx.fillStyle = dir > 0 ? 'rgba(150,100,50,0.55)' : 'rgba(120,78,36,0.5)';
      for (const off of [-size * 0.35, 0, size * 0.35]) {
        ctx.fillRect(-size, off - band / 2, size * 2, band);
        ctx.strokeStyle = 'rgba(60,35,15,0.55)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(-size, off - band / 2, size * 2, band);
      }
      ctx.restore();
    }
    ctx.restore();
    // Cadre : quatre lames de bordure, joints d'onglet.
    ctx.fillStyle = 'rgba(135,90,45,0.6)';
    ctx.fillRect(0, 0, size, b);
    ctx.fillRect(0, size - b, size, b);
    ctx.fillStyle = 'rgba(120,80,38,0.6)';
    ctx.fillRect(0, b, b, size - 2 * b);
    ctx.fillRect(size - b, b, b, size - 2 * b);
    ctx.strokeStyle = 'rgba(55,32,12,0.6)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(b, b, size - 2 * b, size - 2 * b);
    ctx.strokeRect(0.75, 0.75, size - 1.5, size - 1.5);
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(b, b);
    ctx.moveTo(size, 0); ctx.lineTo(size - b, b);
    ctx.moveTo(0, size); ctx.lineTo(b, size - b);
    ctx.moveTo(size, size); ctx.lineTo(size - b, size - b);
    ctx.stroke();
    noise(ctx, size, 0.05);
  },
};

export function isProceduralFloor(type: string | undefined): type is ProceduralFloorType {
  return type === 'miroirNoir' || type === 'dancefloorLed' || type === 'parquetVersailles';
}

const dataUrlCache = new Map<ProceduralFloorType, string>();

/** Image (data URL) du sol dessiné, pour le plan 2D. Navigateur uniquement. */
export function proceduralFloorDataUrl(type: ProceduralFloorType, size = 512): string | null {
  const cached = dataUrlCache.get(type);
  if (cached) return cached;
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  PROCEDURAL_FLOOR_DRAW[type](ctx, size);
  const url = canvas.toDataURL('image/jpeg', 0.86);
  dataUrlCache.set(type, url);
  return url;
}
