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
  content: TemplateAiComposeContent;
  stage: {
    structureReady?: boolean;
    backgroundReady?: boolean;
    imageMode?: 'edit' | 'generate' | null;
  } | null;
  createdAt: string;
};

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
