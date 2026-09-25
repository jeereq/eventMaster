'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

/** Émis après une action Super Admin qui change une file (approbation, facture payée…). */
export const ADMIN_COUNTS_CHANGED = 'em-admin-counts-changed';

export interface AdminPendingCounts {
  pendingRequests: number;
  unpaidInvoices: number;
  licensesExpiring: number;
  saasPayoutsDue: number;
}

const EMPTY: AdminPendingCounts = {
  pendingRequests: 0,
  unpaidInvoices: 0,
  licensesExpiring: 0,
  saasPayoutsDue: 0,
};

export function notifyAdminCountsChanged() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(ADMIN_COUNTS_CHANGED));
}

/**
 * Compteurs « à traiter » de la console Super Admin, pour les pastilles
 * du menu latéral et de la barre mobile. Inactif pour les autres rôles.
 */
export function useAdminPendingCounts(enabled: boolean): AdminPendingCounts {
  const [counts, setCounts] = useState<AdminPendingCounts>(EMPTY);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const load = () => {
      api
        .get('/admin/ops-overview')
        .then((data) => {
          if (cancelled) return;
          setCounts({
            pendingRequests: data?.counts?.pendingRequests ?? 0,
            unpaidInvoices: data?.counts?.unpaidInvoices ?? 0,
            licensesExpiring: data?.counts?.licensesExpiring ?? 0,
            saasPayoutsDue: data?.saasPayoutsDue?.count ?? data?.counts?.saasPayoutsDue ?? 0,
          });
        })
        .catch(() => {
          /* pastilles facultatives : on garde les dernières valeurs */
        });
    };
    load();
    const onVisible = () => {
      if (document.visibilityState === 'visible') load();
    };
    window.addEventListener(ADMIN_COUNTS_CHANGED, load);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      window.removeEventListener(ADMIN_COUNTS_CHANGED, load);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [enabled]);

  return enabled ? counts : EMPTY;
}
