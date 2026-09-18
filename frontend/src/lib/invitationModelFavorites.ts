'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { getOrCreateDeviceId } from '@/lib/aiTokens';
import { useAuth } from '@/context/AuthContext';

const STORAGE_KEY = 'em-invitation-model-favorites-v1';

function readLocalIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is string => typeof id === 'string' && id.length > 0);
  } catch {
    return [];
  }
}

function writeLocalIds(ids: string[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...new Set(ids)]));
  } catch {
    /* private mode */
  }
}

function normalizeIds(payload: unknown): string[] {
  if (!payload || typeof payload !== 'object') return [];
  const ids = (payload as { templateIds?: unknown }).templateIds;
  if (!Array.isArray(ids)) return [];
  return ids.filter((id): id is string => typeof id === 'string' && id.length > 0);
}

/**
 * Favoris modèles d’invitation :
 * - non connecté → sync serveur par deviceId (+ cache local)
 * - connecté → favoris compte ; claim des favoris appareil à la connexion
 */
export function useInvitationModelFavorites() {
  const { user, token } = useAuth();
  const [ids, setIds] = useState<Set<string>>(() => new Set());
  const [hydrated, setHydrated] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const claimedForUserRef = useRef<string | null>(null);

  const applyIds = useCallback((next: string[], persistLocal: boolean) => {
    const unique = [...new Set(next)];
    setIds(new Set(unique));
    if (persistLocal) writeLocalIds(unique);
  }, []);

  const reload = useCallback(async () => {
    const local = readLocalIds();
    if (!token || !user) {
      const deviceId = getOrCreateDeviceId();
      try {
        const data = await api.get(
          `/public/invitation-favorites?deviceId=${encodeURIComponent(deviceId)}`,
        );
        const remote = normalizeIds(data);
        // Union locale + serveur tant que hors ligne n’a pas tout poussé
        const merged = [...new Set([...remote, ...local])];
        applyIds(merged, true);

        // Pousse les ids locaux absents du serveur
        const missing = local.filter((id) => !remote.includes(id));
        if (missing.length) {
          await Promise.allSettled(
            missing.map((templateId) =>
              api.post('/public/invitation-favorites', { deviceId, templateId }),
            ),
          );
          const refreshed = await api.get(
            `/public/invitation-favorites?deviceId=${encodeURIComponent(deviceId)}`,
          );
          applyIds(normalizeIds(refreshed), true);
        }
      } catch {
        applyIds(local, false);
      }
      return;
    }

    try {
      const deviceId = getOrCreateDeviceId();
      if (claimedForUserRef.current !== user.id) {
        claimedForUserRef.current = user.id;
        const claimed = await api.post('/public/invitation-favorites/claim', { deviceId });
        applyIds(normalizeIds(claimed), true);
        return;
      }
      const data = await api.get('/public/invitation-favorites/mine');
      applyIds(normalizeIds(data), true);
    } catch {
      applyIds(local, false);
    }
  }, [applyIds, token, user]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setSyncing(true);
      try {
        if (!cancelled) await reload();
      } finally {
        if (!cancelled) {
          setHydrated(true);
          setSyncing(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reload]);

  useEffect(() => {
    if (!user) claimedForUserRef.current = null;
  }, [user]);

  const isFavorite = useCallback((id: string) => ids.has(id), [ids]);

  const toggleFavorite = useCallback(
    async (templateId: string) => {
      const wasActive = ids.has(templateId);
      const optimistic = new Set(ids);
      if (wasActive) optimistic.delete(templateId);
      else optimistic.add(templateId);
      setIds(optimistic);
      writeLocalIds([...optimistic]);

      try {
        setSyncing(true);
        if (token && user) {
          const data = wasActive
            ? await api.delete(`/public/invitation-favorites/mine/${encodeURIComponent(templateId)}`)
            : await api.post('/public/invitation-favorites/mine', { templateId });
          applyIds(normalizeIds(data), true);
        } else {
          const deviceId = getOrCreateDeviceId();
          const data = wasActive
            ? await api.delete(
                `/public/invitation-favorites/${encodeURIComponent(templateId)}?deviceId=${encodeURIComponent(deviceId)}`,
              )
            : await api.post('/public/invitation-favorites', { deviceId, templateId });
          applyIds(normalizeIds(data), true);
        }
      } catch {
        // rollback
        setIds(ids);
        writeLocalIds([...ids]);
      } finally {
        setSyncing(false);
      }
    },
    [applyIds, ids, token, user],
  );

  return useMemo(
    () => ({
      ids,
      count: ids.size,
      hydrated,
      syncing,
      isFavorite,
      toggleFavorite,
      reload,
    }),
    [ids, hydrated, syncing, isFavorite, toggleFavorite, reload],
  );
}
