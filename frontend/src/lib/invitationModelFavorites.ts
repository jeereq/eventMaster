'use client';

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';

const STORAGE_KEY = 'em-invitation-model-favorites-v1';

function readIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((id): id is string => typeof id === 'string' && id.length > 0));
  } catch {
    return new Set();
  }
}

function writeIds(ids: Set<string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
  } catch {
    /* private mode */
  }
  window.dispatchEvent(new Event('em-invitation-model-favorites'));
}

function subscribe(onChange: () => void) {
  const handler = () => onChange();
  window.addEventListener('storage', handler);
  window.addEventListener('em-invitation-model-favorites', handler);
  return () => {
    window.removeEventListener('storage', handler);
    window.removeEventListener('em-invitation-model-favorites', handler);
  };
}

function getSnapshot() {
  return localStorage.getItem(STORAGE_KEY) || '';
}

function getServerSnapshot() {
  return '';
}

/** Favoris modèles d’invitation (local, sans compte requis). */
export function useInvitationModelFavorites() {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const ids = useMemo(() => {
    if (!raw) return new Set<string>();
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) return new Set<string>();
      return new Set(parsed.filter((id): id is string => typeof id === 'string' && id.length > 0));
    } catch {
      return new Set<string>();
    }
  }, [raw]);

  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(true);
    // Assure une sync initiale si le store était vide côté SSR
    if (!raw && typeof window !== 'undefined') {
      const existing = readIds();
      if (existing.size > 0) writeIds(existing);
    }
  }, [raw]);

  const isFavorite = useCallback((id: string) => ids.has(id), [ids]);

  const toggleFavorite = useCallback((id: string) => {
    const next = readIds();
    if (next.has(id)) next.delete(id);
    else next.add(id);
    writeIds(next);
  }, []);

  return useMemo(
    () => ({
      ids,
      count: ids.size,
      hydrated,
      isFavorite,
      toggleFavorite,
    }),
    [ids, hydrated, isFavorite, toggleFavorite],
  );
}
