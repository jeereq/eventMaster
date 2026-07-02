export type MediaKind = 'IMAGE' | 'VIDEO';

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function getMediaExtension(url: string, type: MediaKind = 'IMAGE'): string {
  if (type === 'VIDEO') {
    if (url.startsWith('data:video/')) {
      const match = url.match(/^data:video\/([^;]+)/);
      if (match?.[1]) return `.${match[1].split('+')[0]}`;
    }
    return '.mp4';
  }

  if (url.startsWith('data:image/')) {
    const match = url.match(/^data:image\/([^;]+)/);
    if (match?.[1]) return `.${match[1].split('+')[0]}`;
  }

  try {
    const pathname = new URL(url, window.location.origin).pathname;
    const ext = pathname.match(/(\.[a-zA-Z0-9]+)$/)?.[1];
    if (ext) return ext.toLowerCase();
  } catch {
    // ignore invalid URLs (e.g. raw base64 without data: prefix)
  }

  return '.jpg';
}

export function sanitizeFilenamePart(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9-_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase() || 'media';
}

export async function downloadMedia(url: string, filename: string): Promise<void> {
  if (url.startsWith('data:')) {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return;
  }

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('fetch failed');
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(blobUrl);
  } catch {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

export async function downloadMediaBatch(
  items: Array<{ url: string; filename: string }>,
  delayMs = 350
): Promise<void> {
  for (let i = 0; i < items.length; i++) {
    await downloadMedia(items[i].url, items[i].filename);
    if (i < items.length - 1) await sleep(delayMs);
  }
}
