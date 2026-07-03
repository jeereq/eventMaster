export interface OcrTextLine {
  text: string;
  confidence: number;
  bbox: { x0: number; y0: number; x1: number; y1: number };
}

export interface OcrImportResult {
  lines: OcrTextLine[];
  fullText: string;
}

/** Niveau 3 : OCR du texte présent sur l'image de maquette (français + anglais). */
export async function extractTextFromImageSource(
  source: File | string,
  onProgress?: (progress: number) => void,
): Promise<OcrImportResult> {
  const { createWorker } = await import('tesseract.js');

  let imageInput: string;
  if (source instanceof File) {
    imageInput = URL.createObjectURL(source);
  } else {
    imageInput = source;
  }

  const worker = await createWorker('fra+eng', 1, {
    logger: (m) => {
      if (m.status === 'recognizing text' && typeof m.progress === 'number') {
        onProgress?.(m.progress);
      }
    },
  });

  try {
    const { data } = await worker.recognize(imageInput);
    const lines: OcrTextLine[] = (data.lines ?? [])
      .map((line) => ({
        text: (line.text || '').trim(),
        confidence: line.confidence,
        bbox: line.bbox,
      }))
      .filter((line) => line.text.length > 1 && line.confidence > 35);

    if (lines.length === 0 && data.text?.trim()) {
      data.text
        .split('\n')
        .map((t) => t.trim())
        .filter((t) => t.length > 1)
        .forEach((text, i) => {
          lines.push({
            text,
            confidence: 50,
            bbox: { x0: 0, y0: i * 40, x1: 100, y1: (i + 1) * 40 },
          });
        });
    }

    return { lines, fullText: data.text?.trim() ?? '' };
  } finally {
    await worker.terminate();
    if (source instanceof File) {
      URL.revokeObjectURL(imageInput);
    }
  }
}

/** Applique les lignes OCR aux blocs texte existants du modèle importé. */
export function mergeOcrIntoMockupElements<T extends { id: string; type: string; text: string }>(
  elements: T[],
  ocrLines: OcrTextLine[],
): T[] {
  if (ocrLines.length === 0) return elements;

  const textElements = elements.filter((el) => el.type === 'text');
  const sortedLines = [...ocrLines].sort((a, b) => a.bbox.y0 - b.bbox.y0);

  let lineIndex = 0;
  return elements.map((el) => {
    if (el.type !== 'text' || lineIndex >= sortedLines.length) return el;
    const next = { ...el, text: sortedLines[lineIndex].text };
    lineIndex += 1;
    return next;
  });
}
