'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import type { RoomLayoutBlueprint } from '@/lib/roomLayoutUtils';
import { MAIN_LAYOUT_ID } from '@/lib/venueLayouts';

type LayoutResponse = { id: string; blueprint: RoomLayoutBlueprint };

interface Options {
  venueSlug: string;
  activeLayoutId: string;
  /** Plan de la disposition principale, déjà présent dans la fiche. */
  mainBlueprint: RoomLayoutBlueprint | null;
  /** Ne charge rien tant que la 3D n'est pas lancée. */
  enabled: boolean;
}

/**
 * Charge le plan de la disposition choisie à la demande, avec un cache par disposition.
 * Le plan précédent reste affiché pendant le chargement, pour éviter un écran vide entre deux choix.
 */
export function useVenueLayoutBlueprint({ venueSlug, activeLayoutId, mainBlueprint, enabled }: Options) {
  const cacheRef = useRef(new Map<string, RoomLayoutBlueprint>());
  const inFlightRef = useRef(new Map<string, Promise<RoomLayoutBlueprint | null>>());
  const [shown, setShown] = useState<{ id: string; blueprint: RoomLayoutBlueprint | null }>({
    id: MAIN_LAYOUT_ID,
    blueprint: mainBlueprint,
  });
  const [failure, setFailure] = useState<{ id: string; message: string } | null>(null);

  useEffect(() => {
    if (mainBlueprint) cacheRef.current.set(MAIN_LAYOUT_ID, mainBlueprint);
  }, [mainBlueprint]);

  const load = useCallback(
    (layoutId: string): Promise<RoomLayoutBlueprint | null> => {
      const cached = cacheRef.current.get(layoutId);
      if (cached) return Promise.resolve(cached);
      const pending = inFlightRef.current.get(layoutId);
      if (pending) return pending;

      const request = api
        .get(`/public/venues/${encodeURIComponent(venueSlug)}/layouts/${encodeURIComponent(layoutId)}`)
        .then((data: LayoutResponse | null) => {
          if (!data?.blueprint) return null;
          cacheRef.current.set(layoutId, data.blueprint);
          return data.blueprint;
        })
        .finally(() => {
          inFlightRef.current.delete(layoutId);
        });
      inFlightRef.current.set(layoutId, request);
      return request;
    },
    [venueSlug],
  );

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    load(activeLayoutId)
      .then((blueprint) => {
        if (cancelled) return;
        if (blueprint) {
          setShown({ id: activeLayoutId, blueprint });
          setFailure(null);
        } else setFailure({ id: activeLayoutId, message: 'Cette disposition n’est pas disponible.' });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setFailure({
          id: activeLayoutId,
          message: err instanceof Error ? err.message : 'Impossible de charger la disposition.',
        });
      });
    return () => {
      cancelled = true;
    };
  }, [activeLayoutId, enabled, load]);

  /** Précharge une disposition (survol d'une carte) sans changer l'affichage. */
  const prefetch = useCallback(
    (layoutId: string) => {
      if (!enabled) return;
      void load(layoutId).catch(() => undefined);
    },
    [enabled, load],
  );

  // Une erreur ne concerne que la disposition demandée à ce moment-là.
  const error = failure?.id === activeLayoutId ? failure.message : '';

  return {
    blueprint: shown.blueprint,
    shownLayoutId: shown.id,
    loading: enabled && shown.id !== activeLayoutId && !error,
    error,
    prefetch,
  };
}
