import { encodePathSlug } from './share.ts';

export const EMBED_VENUE_PATH_PREFIX = '/embed/salles';
const EMBED_FRAME_HEIGHT_PX = 560;

export function buildEmbedPath(slug: string): string {
  return `${EMBED_VENUE_PATH_PREFIX}/${encodePathSlug(slug)}`;
}

function escapeHtmlAttribute(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** Code à coller sur le site du propriétaire pour y afficher la visionneuse 3D de la salle. */
export function buildEmbedSnippet(origin: string, slug: string, title: string): string {
  const base = origin.replace(/\/$/, '');
  const src = `${base}${buildEmbedPath(slug)}`;
  const safeTitle = escapeHtmlAttribute(title.trim() || 'Visite 3D de la salle');
  return [
    '<iframe',
    `  src="${escapeHtmlAttribute(src)}"`,
    `  title="${safeTitle}"`,
    `  width="100%" height="${EMBED_FRAME_HEIGHT_PX}"`,
    '  style="border:0;border-radius:12px"',
    '  loading="lazy" allow="fullscreen" allowfullscreen',
    '></iframe>',
  ].join('\n');
}
