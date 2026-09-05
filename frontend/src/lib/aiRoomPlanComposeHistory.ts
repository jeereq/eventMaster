import { api } from '@/lib/api';
import { getOrCreateDeviceId } from '@/lib/aiTokens';
import type { RoomPlanVisionDraft } from '@/lib/roomPlanAi';

export type AiRoomPlanComposeHistoryItem = {
  id: string;
  userId: string | null;
  deviceId: string | null;
  source: string;
  prompt: string | null;
  imageUrl: string | null;
  roomType: string | null;
  widthM: number | null;
  heightM: number | null;
  itemCount: number;
  draft: RoomPlanVisionDraft;
  createdAt: string;
};

function isValidHistoryItem(item: unknown): item is AiRoomPlanComposeHistoryItem {
  if (!item || typeof item !== 'object') return false;
  const row = item as AiRoomPlanComposeHistoryItem;
  return Boolean(row.id && row.draft && Array.isArray(row.draft.items));
}

export async function fetchAiRoomPlanComposeHistory(): Promise<AiRoomPlanComposeHistoryItem[]> {
  const deviceId = getOrCreateDeviceId();
  try {
    const data = await api.get(
      `/public/rooms/ai/history?deviceId=${encodeURIComponent(deviceId)}`,
    );
    const items = Array.isArray(data?.items) ? data.items : [];
    return items.filter(isValidHistoryItem);
  } catch {
    return [];
  }
}

export async function fetchAiRoomPlanComposeHistoryStudio(): Promise<AiRoomPlanComposeHistoryItem[]> {
  const deviceId = getOrCreateDeviceId();
  try {
    const data = await api.get(
      `/rooms/ai/history?deviceId=${encodeURIComponent(deviceId)}`,
    );
    const items = Array.isArray(data?.items) ? data.items : [];
    return items.filter(isValidHistoryItem);
  } catch {
    return [];
  }
}

export async function claimAiRoomPlanComposeHistory(): Promise<AiRoomPlanComposeHistoryItem[]> {
  const deviceId = getOrCreateDeviceId();
  try {
    const data = await api.post('/public/rooms/ai/history/claim', { deviceId });
    const items = Array.isArray(data?.items) ? data.items : [];
    return items.filter(isValidHistoryItem);
  } catch {
    return [];
  }
}
