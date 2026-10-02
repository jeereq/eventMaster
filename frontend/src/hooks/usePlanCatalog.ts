'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { DbPlanCatalogEntry } from '@/lib/planCatalogDb';

export type PlanCatalog = Record<string, DbPlanCatalogEntry>;

let cached: PlanCatalog | null = null;
let pending: Promise<PlanCatalog | null> | null = null;

/** Relit toujours la base (requête partagée entre écrans montés en même temps). */
function fetchCatalog(): Promise<PlanCatalog | null> {
  if (!pending) {
    pending = api
      .get('/public/plans')
      .then((data: PlanCatalog) => {
        if (data && typeof data === 'object') cached = data;
        return cached;
      })
      .catch(() => cached)
      .finally(() => {
        pending = null;
      });
  }
  return pending;
}

/**
 * Catalogue des forfaits tel qu'il est en base (`GET /public/plans`), partagé entre écrans.
 * Chaque écran relit la base à l'ouverture (la dernière valeur connue s'affiche en attendant),
 * pour que les changements faits dans l'admin apparaissent sans recharger l'application.
 * `loading` reste vrai tant qu'aucune réponse n'est connue : afficher un squelette plutôt
 * que des valeurs codées en dur.
 */
export function usePlanCatalog(): { plans: PlanCatalog | null; loading: boolean } {
  const [plans, setPlans] = useState<PlanCatalog | null>(cached);
  const [loading, setLoading] = useState(!cached);

  useEffect(() => {
    let active = true;
    void fetchCatalog().then((data) => {
      if (!active) return;
      setPlans(data);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  return { plans, loading };
}
