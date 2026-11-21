/**
 * Image affichée sur un écran (cinéma, mur LED, télévision) : quelle partie de l'image
 * on montre sur la dalle. Fonctions pures, sans Three.js, pour être testées.
 */
import type { ImageCropRect } from './roomLayoutUtils.ts';

export interface ScreenImageWindow {
  /** Part de la largeur de l'image visible (0–1), décalage depuis la gauche. */
  repeatX: number;
  offsetX: number;
  /** Part de la hauteur visible ; décalage compté depuis le bas (convention des textures). */
  repeatY: number;
  offsetY: number;
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

/**
 * Zone de l'image à poser sur l'écran : le recadrage choisi dans l'éditeur, puis un
 * remplissage sans déformation (« cover ») au format de l'écran, centré.
 */
export function screenImageWindow(
  image: { width: number; height: number },
  crop: ImageCropRect | undefined,
  screenAspect: number,
): ScreenImageWindow {
  let x = clamp01(crop?.x ?? 0);
  let y = clamp01(crop?.y ?? 0);
  let w = Math.max(0.01, Math.min(1 - x, crop?.w ?? 1));
  let h = Math.max(0.01, Math.min(1 - y, crop?.h ?? 1));
  const imgW = image.width > 0 ? image.width : 1;
  const imgH = image.height > 0 ? image.height : 1;
  const aspect = (w * imgW) / (h * imgH);
  const target = screenAspect > 0 ? screenAspect : aspect;
  if (aspect > target) {
    const nextW = w * (target / aspect);
    x += (w - nextW) / 2;
    w = nextW;
  } else if (aspect < target) {
    const nextH = h * (aspect / target);
    y += (h - nextH) / 2;
    h = nextH;
  }
  return { repeatX: w, offsetX: x, repeatY: h, offsetY: 1 - y - h };
}

/** Format de la dalle (largeur / hauteur) d'après le ratio choisi pour l'écran. */
export function screenRatioAspect(ratio: string | undefined, fallback = 16 / 9): number {
  switch (ratio) {
    case '16:9':
      return 16 / 9;
    case '21:9':
      return 21 / 9;
    case '32:9':
      return 32 / 9;
    case '9:16':
      return 9 / 16;
    default:
      return fallback;
  }
}
