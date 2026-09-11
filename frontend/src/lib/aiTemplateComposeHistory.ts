import { api } from '@/lib/api';
import { getOrCreateDeviceId } from '@/lib/aiTokens';
import type { TemplateAiComposeContent } from '@/lib/templateAiCompose';

export type AiTemplateComposeHistoryItem = {
  id: string;
  userId: string | null;
  deviceId: string | null;
  source: string;
  prompt: string | null;
  referenceUrls: string[];
  previewImageUrl: string | null;
  variants?: string[];
  content: TemplateAiComposeContent;
  stage: {
    structureReady?: boolean;
    backgroundReady?: boolean;
    imageMode?: 'edit' | 'generate' | null;
    variants?: string[];
    speedMode?: 'fast' | 'quality';
    safetyFallbackTriggered?: boolean;
  } | null;
  createdAt: string;
};

export function extractItemVariants(item: AiTemplateComposeHistoryItem): string[] {
  const global = (item?.content?.global || {}) as Record<string, unknown>;
  const list: unknown[] =
    item.variants && item.variants.length > 0
      ? item.variants
      : item.stage?.variants && item.stage.variants.length > 0
      ? item.stage.variants
      : Array.isArray(global.variants) && global.variants.length > 0
      ? global.variants
      : Array.isArray(global.aiVariants) && global.aiVariants.length > 0
      ? global.aiVariants
      : item.previewImageUrl
      ? [item.previewImageUrl]
      : [];

  const valid = list.filter(
    (u): u is string => typeof u === 'string' && /^https?:\/\//i.test(u.trim()),
  );
  return Array.from(new Set(valid));
}

function isValidHistoryItem(item: unknown): item is AiTemplateComposeHistoryItem {
  if (!item || typeof item !== 'object') return false;
  const row = item as AiTemplateComposeHistoryItem;
  return Boolean(row.id && row.content && typeof row.content === 'object');
}

export async function fetchAiTemplateComposeHistory(): Promise<AiTemplateComposeHistoryItem[]> {
  const deviceId = getOrCreateDeviceId();
  try {
    const data = await api.get(
      `/public/templates/ai/history?deviceId=${encodeURIComponent(deviceId)}`,
    );
    const items = Array.isArray(data?.items) ? data.items : [];
    return items.filter(isValidHistoryItem);
  } catch {
    return [];
  }
}

export async function fetchAiTemplateComposeHistoryStudio(): Promise<AiTemplateComposeHistoryItem[]> {
  const deviceId = getOrCreateDeviceId();
  try {
    const data = await api.get(
      `/templates/ai/history?deviceId=${encodeURIComponent(deviceId)}`,
    );
    const items = Array.isArray(data?.items) ? data.items : [];
    return items.filter(isValidHistoryItem);
  } catch {
    return [];
  }
}

export async function claimAiTemplateComposeHistory(): Promise<AiTemplateComposeHistoryItem[]> {
  const deviceId = getOrCreateDeviceId();
  try {
    const data = await api.post('/public/templates/ai/history/claim', { deviceId });
    const items = Array.isArray(data?.items) ? data.items : [];
    return items.filter(isValidHistoryItem);
  } catch {
    return [];
  }
}
