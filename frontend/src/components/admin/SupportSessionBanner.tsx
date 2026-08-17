'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui';

export default function SupportSessionBanner() {
  const { supportSession, tenant, exitSupportSession } = useAuth();

  if (!supportSession) return null;

  const licenseExpired =
    Boolean(tenant?.licenseExpiresAt && new Date(tenant.licenseExpiresAt) < new Date());
  const licenseInactive = tenant && tenant.licenseActive === false;

  return (
    <div className="sticky top-0 z-50 border-b border-amber-700/40 bg-amber-600 text-white">
      <div className="page-container flex flex-wrap items-center justify-between gap-2 py-2">
        <p className="text-xs sm:text-sm font-medium leading-snug">
          Session support — vous voyez l’espace
          {tenant?.name ? ` « ${tenant.name} »` : ' du client'}.
          {licenseInactive ? ' Licence désactivée côté client.' : null}
          {!licenseInactive && licenseExpired ? ' Licence expirée côté client.' : null}
          {' '}Les modifications restent visibles par le client.
        </p>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={exitSupportSession}
          className="bg-white text-amber-900 border-0 hover:bg-amber-50 shrink-0"
        >
          Revenir à la console
        </Button>
      </div>
    </div>
  );
}
