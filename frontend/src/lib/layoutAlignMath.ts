export type AlignMode =
  | 'left'
  | 'right'
  | 'centerX'
  | 'top'
  | 'bottom'
  | 'centerY'
  | 'distributeX'
  | 'distributeY'
  | 'centerRoomX'
  | 'centerRoomY'
  | 'gridTidy';

export type AlignBox = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  isCenter: boolean;
};

export const IMPORT_SNAP_STEP = 0.5;
export const IMPORT_ALIGN_TOLERANCE = 2.2;
export const IMPORT_ROTATION_SNAP = 90;
export const IMPORT_ROTATION_TOLERANCE = 8;

export function clampPct(value: number, min = 1, max = 99): number {
  return Math.max(min, Math.min(max, value));
}

export function snapPct(value: number, step = IMPORT_SNAP_STEP): number {
  if (!Number.isFinite(value) || step <= 0) return value;
  return Math.round(value / step) * step;
}

export function snapRotationDeg(
  rotation: number | undefined,
  snap = IMPORT_ROTATION_SNAP,
  tolerance = IMPORT_ROTATION_TOLERANCE,
): number | undefined {
  if (rotation == null || !Number.isFinite(rotation)) return rotation;
  const normalized = ((rotation % 360) + 360) % 360;
  const nearest = Math.round(normalized / snap) * snap;
  const folded = nearest % 360;
  const delta = Math.min(Math.abs(normalized - nearest), 360 - Math.abs(normalized - nearest));
  if (delta <= tolerance) return folded;
  return Math.round(normalized * 10) / 10;
}

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** Groupes d’indices dont les valeurs sont proches (tolérance autour de la médiane du groupe). */
export function clusterIndices(values: number[], tolerance: number): number[][] {
  const order = values.map((_, index) => index).sort((a, b) => values[a] - values[b]);
  const groups: number[][] = [];
  for (const index of order) {
    const last = groups[groups.length - 1];
    if (last && Math.abs(values[index] - median(last.map((i) => values[i]))) <= tolerance) {
      last.push(index);
    } else {
      groups.push([index]);
    }
  }
  return groups;
}

export function leftOf(box: AlignBox): number {
  return box.isCenter ? box.x - box.w / 2 : box.x;
}
export function rightOf(box: AlignBox): number {
  return box.isCenter ? box.x + box.w / 2 : box.x + box.w;
}
export function topOf(box: AlignBox): number {
  return box.isCenter ? box.y - box.h / 2 : box.y;
}
export function bottomOf(box: AlignBox): number {
  return box.isCenter ? box.y + box.h / 2 : box.y + box.h;
}
export function cxOf(box: AlignBox): number {
  return box.isCenter ? box.x : box.x + box.w / 2;
}
export function cyOf(box: AlignBox): number {
  return box.isCenter ? box.y : box.y + box.h / 2;
}

export function setLeft(box: AlignBox, left: number): { x: number; y: number } {
  return box.isCenter ? { x: left + box.w / 2, y: box.y } : { x: left, y: box.y };
}
export function setRight(box: AlignBox, right: number): { x: number; y: number } {
  return box.isCenter ? { x: right - box.w / 2, y: box.y } : { x: right - box.w, y: box.y };
}
export function setTop(box: AlignBox, top: number): { x: number; y: number } {
  return box.isCenter ? { x: box.x, y: top + box.h / 2 } : { x: box.x, y: top };
}
export function setBottom(box: AlignBox, bottom: number): { x: number; y: number } {
  return box.isCenter ? { x: box.x, y: bottom - box.h / 2 } : { x: box.x, y: bottom - box.h };
}
export function setCx(box: AlignBox, cx: number): { x: number; y: number } {
  return box.isCenter ? { x: cx, y: box.y } : { x: cx - box.w / 2, y: box.y };
}
export function setCy(box: AlignBox, cy: number): { x: number; y: number } {
  return box.isCenter ? { x: box.x, y: cy } : { x: box.x, y: cy - box.h / 2 };
}

/** Positions après alignement / répartition. Vide si moins de 2 boîtes, ou < 3 pour distribute. */
export function alignedPositions(
  boxes: AlignBox[],
  mode: AlignMode,
): Map<string, { x: number; y: number }> {
  const next = new Map<string, { x: number; y: number }>();
  if (boxes.length < 2) return next;

  if (mode === 'distributeX' || mode === 'distributeY') {
    if (boxes.length < 3) return next;
    const sorted = [...boxes].sort((a, b) =>
      mode === 'distributeX' ? cxOf(a) - cxOf(b) : cyOf(a) - cyOf(b),
    );
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const start = mode === 'distributeX' ? cxOf(first) : cyOf(first);
    const end = mode === 'distributeX' ? cxOf(last) : cyOf(last);
    const step = (end - start) / (sorted.length - 1);
    sorted.forEach((box, index) => {
      const target = start + step * index;
      next.set(box.id, mode === 'distributeX' ? setCx(box, target) : setCy(box, target));
    });
    return next;
  }

  if (mode === 'centerRoomX') {
    const currentCx = (Math.min(...boxes.map(leftOf)) + Math.max(...boxes.map(rightOf))) / 2;
    const shiftX = 50 - currentCx;
    for (const box of boxes) {
      next.set(box.id, { x: clampPct(box.x + shiftX), y: box.y });
    }
    return next;
  }

  if (mode === 'centerRoomY') {
    const currentCy = (Math.min(...boxes.map(topOf)) + Math.max(...boxes.map(bottomOf))) / 2;
    const shiftY = 50 - currentCy;
    for (const box of boxes) {
      next.set(box.id, { x: box.x, y: clampPct(box.y + shiftY) });
    }
    return next;
  }

  if (mode === 'gridTidy') {
    const count = boxes.length;
    const cols = Math.max(2, Math.ceil(Math.sqrt(count)));
    const rows = Math.ceil(count / cols);

    const minL = Math.min(...boxes.map(leftOf));
    const maxR = Math.max(...boxes.map(rightOf));
    const minT = Math.min(...boxes.map(topOf));
    const maxB = Math.max(...boxes.map(bottomOf));

    // Conserver l'ordre spatial naturel (haut vers bas, gauche vers droite)
    const sorted = [...boxes].sort((a, b) => {
      const dy = cyOf(a) - cyOf(b);
      if (Math.abs(dy) > 4) return dy;
      return cxOf(a) - cxOf(b);
    });

    const stepX = cols > 1 ? (maxR - minL) / (cols - 1) : 0;
    const stepY = rows > 1 ? (maxB - minT) / (rows - 1) : 0;

    sorted.forEach((box, idx) => {
      const c = idx % cols;
      const r = Math.floor(idx / cols);
      const targetCx = cols > 1 ? minL + c * stepX : (minL + maxR) / 2;
      const targetCy = rows > 1 ? minT + r * stepY : (minT + maxB) / 2;
      const nextX = box.isCenter ? targetCx : targetCx - box.w / 2;
      const nextY = box.isCenter ? targetCy : targetCy - box.h / 2;
      next.set(box.id, { x: nextX, y: nextY });
    });
    return next;
  }

  const targetLeft = Math.min(...boxes.map(leftOf));
  const targetRight = Math.max(...boxes.map(rightOf));
  const targetTop = Math.min(...boxes.map(topOf));
  const targetBottom = Math.max(...boxes.map(bottomOf));
  const targetCx = (targetLeft + targetRight) / 2;
  const targetCy = (targetTop + targetBottom) / 2;

  for (const box of boxes) {
    let pos = { x: box.x, y: box.y };
    if (mode === 'left') pos = setLeft(box, targetLeft);
    if (mode === 'right') pos = setRight(box, targetRight);
    if (mode === 'centerX') pos = setCx(box, targetCx);
    if (mode === 'top') pos = setTop(box, targetTop);
    if (mode === 'bottom') pos = setBottom(box, targetBottom);
    if (mode === 'centerY') pos = setCy(box, targetCy);
    next.set(box.id, pos);
  }
  return next;
}
