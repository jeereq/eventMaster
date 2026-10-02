'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { DbPlanCatalogEntry } from '@/lib/planCatalogDb';

export type PlanCatalog = Record<string, DbPlanCatalogEntry>;

let cached: PlanCatalog | null = null;
let pending: Promise<PlanCatalog | null> | null = null;

function loadCatalog(): Promise<PlanCatalog | null> {
  if (cached) return Promise.resolve(cached);
  if (!pending) {
    pending = api
      .get('/public/plans')
      .then((data: PlanCatalog) => {
        cached = data && typeof data === 'object' ? data : null;
        return cached;
      })
      .catch(() => null)
      .finally(() => {
        pending = null;
      });
  }
  return pending;
}

/**
 * Catalogue des forfaits tel qu'il est en base (`GET /public/plans`), partagé entre écrans.
 * `loading` reste vrai tant que la base n'a pas répondu : afficher un squelette plutôt
 * que des valeurs codées en dur.
 */
export function usePlanCatalog(): { plans: PlanCatalog | null; loading: boolean } {
  const [plans, setPlans] = useState<PlanCatalog | null>(cached);
  const [loading, setLoading] = useState(!cached);

  useEffect(() => {
    if (cached) return;
    let active = true;
    void loadCatalog().then((data) => {
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
