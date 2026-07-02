export interface ImageCropRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const DEFAULT_IMAGE_CROP: ImageCropRect = { x: 0, y: 0, w: 1, h: 1 };

export function readImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function cropImageToDataUrl(sourceUrl: string, crop: ImageCropRect, maxSize = 800): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const sx = Math.round(crop.x * img.width);
      const sy = Math.round(crop.y * img.height);
      const sw = Math.max(1, Math.round(crop.w * img.width));
      const sh = Math.max(1, Math.round(crop.h * img.height));

      let dw = sw;
      let dh = sh;
      if (Math.max(dw, dh) > maxSize) {
        const scale = maxSize / Math.max(dw, dh);
        dw = Math.round(dw * scale);
        dh = Math.round(dh * scale);
      }

      const canvas = document.createElement('canvas');
      canvas.width = dw;
      canvas.height = dh;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas indisponible'));
        return;
      }
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, dw, dh);
      resolve(canvas.toDataURL('image/jpeg', 0.88));
    };
    img.onerror = () => reject(new Error('Impossible de charger l\'image'));
    img.src = sourceUrl;
  });
}

export function getCroppedBackgroundStyle(
  imageUrl: string,
  crop?: ImageCropRect,
): Record<string, string | number> {
  const c = crop ?? DEFAULT_IMAGE_CROP;
  const px = (c.x / c.w) * 100;
  const py = (c.y / c.h) * 100;
  return {
    backgroundImage: `url(${imageUrl})`,
    backgroundSize: `${100 / c.w}% ${100 / c.h}%`,
    backgroundPosition: `${px}% ${py}%`,
    backgroundRepeat: 'no-repeat',
  };
}
