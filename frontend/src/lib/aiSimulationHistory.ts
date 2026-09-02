import { api } from '@/lib/api';
import { getOrCreateDeviceId } from '@/lib/aiTokens';
import type { EventPlanAiResult, EventPlanAiPackage } from '@/lib/eventPlan';
import type { ListingEventTypeId } from '@/lib/listingDetails';

export const STORAGE_KEY_LAST_AI_SIMULATION = 'em_ai_last_simulation';

export type AiSimulationBrief = {
  prompt?: string;
  eventType?: ListingEventTypeId | string;
  city?: string;
  commune?: string;
  guestCount?: number | null;
  budgetMaxFc?: number | null;
  eventDate?: string | null;
};

export type AiSimulationHistoryItem = {
  id: string;
  userId: string | null;
  deviceId: string | null;
  source: string;
  prompt: string | null;
  eventType: string | null;
  city: string | null;
  commune: string | null;
  guestCount: number | null;
  budgetMaxFc: number | null;
  eventDate: string | null;
  result: EventPlanAiResult;
  createdAt: string;
};

export type CachedAiSimulation = {
  brief: AiSimulationBrief;
  result: EventPlanAiResult;
  selectedId: string | null;
  savedAt: string;
};

export function readCachedAiSimulation(): CachedAiSimulation | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LAST_AI_SIMULATION);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedAiSimulation;
    if (!parsed?.result?.packages || !Array.isArray(parsed.result.packages)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeCachedAiSimulation(payload: CachedAiSimulation) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_LAST_AI_SIMULATION, JSON.stringify(payload));
  } catch {
    /* quota */
  }
}

export function historyItemToCache(item: AiSimulationHistoryItem): CachedAiSimulation {
  const packages = Array.isArray(item.result?.packages) ? item.result.packages : [];
  const selected = (packages[1] || packages[0] || null) as EventPlanAiPackage | null;
  return {
    brief: {
      prompt: item.prompt || '',
      eventType: item.eventType || 'private',
      city: item.city || '',
      commune: item.commune || '',
      guestCount: item.guestCount,
      budgetMaxFc: item.budgetMaxFc,
      eventDate: item.eventDate,
    },
    result: { catalog: item.result?.catalog || { venues: 0, trades: 0, rentals: 0 }, packages },
    selectedId: selected?.id || null,
    savedAt: item.createdAt,
  };
}

export async function fetchAiSimulationHistory(): Promise<AiSimulationHistoryItem[]> {
  const deviceId = getOrCreateDeviceId();
  try {
    const data = await api.get(`/public/ai-simulations?deviceId=${encodeURIComponent(deviceId)}`);
    const items = Array.isArray(data?.items) ? data.items : [];
    return items.filter((item: AiSimulationHistoryItem) => Array.isArray(item?.result?.packages));
  } catch {
    return [];
  }
}

export async function claimAiSimulationHistory(): Promise<AiSimulationHistoryItem[]> {
  const deviceId = getOrCreateDeviceId();
  try {
    const data = await api.post('/public/ai-simulations/claim', { deviceId });
    const items = Array.isArray(data?.items) ? data.items : [];
    return items.filter((item: AiSimulationHistoryItem) => Array.isArray(item?.result?.packages));
  } catch {
    return [];
  }
}

export function simulationEndpointBody(brief: AiSimulationBrief & Record<string, unknown>) {
  return {
    ...brief,
    deviceId: getOrCreateDeviceId(),
  };
}
