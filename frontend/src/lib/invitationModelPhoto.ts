export type InvitationModelPhoto = {
  id: string;
  name: string;
  imageUrl: string;
  aiTokenCost?: number;
};

const HTTP_IMAGE = /^https?:\/\//i;

export function isHttpImageUrl(value: unknown): value is string {
  return typeof value === 'string' && HTTP_IMAGE.test(value.trim());
}

export function extractInvitationModelImageUrl(content: unknown): string | null {
  if (!content || typeof content !== 'object' || Array.isArray(content)) return null;
  const record = content as {
    global?: { bgImageUrl?: unknown };
    elements?: Array<{ imageUrl?: unknown }>;
  };
  const fromGlobal = record.global?.bgImageUrl;
  if (isHttpImageUrl(fromGlobal)) return fromGlobal.trim();
  const fromElement = Array.isArray(record.elements)
    ? record.elements.find((element) => isHttpImageUrl(element?.imageUrl))?.imageUrl
    : null;
  return isHttpImageUrl(fromElement) ? fromElement.trim() : null;
}

export function invitationModelPhotoFromContent(
  id: string,
  name: string,
  content: unknown,
  aiTokenCost?: number,
): InvitationModelPhoto | null {
  const imageUrl = extractInvitationModelImageUrl(content);
  if (!imageUrl || !id) return null;
  const label = String(name || '').trim() || 'Modèle';
  const cost =
    typeof aiTokenCost === 'number' && Number.isFinite(aiTokenCost)
      ? Math.min(50, Math.max(1, Math.round(aiTokenCost)))
      : undefined;
  return { id, name: label, imageUrl, ...(cost ? { aiTokenCost: cost } : {}) };
}

export function invitationModelPhotosFromItems(
  items: Array<{ id: string; name: string; content?: unknown; previewContent?: unknown; aiTokenCost?: number }>,
): InvitationModelPhoto[] {
  const seen = new Set<string>();
  const photos: InvitationModelPhoto[] = [];
  for (const item of items) {
    const photo =
      invitationModelPhotoFromContent(item.id, item.name, item.previewContent, item.aiTokenCost) ||
      invitationModelPhotoFromContent(item.id, item.name, item.content, item.aiTokenCost);
    if (!photo || seen.has(photo.imageUrl)) continue;
    seen.add(photo.imageUrl);
    photos.push(photo);
  }
  return photos;
}
