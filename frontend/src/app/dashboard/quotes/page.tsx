'use client';

import React, { Suspense } from 'react';
import { Loader2 } from '@/components/icons';
import MarketplaceRequestsHub from '@/components/dashboard/MarketplaceRequestsHub';
import { PageHero } from '@/components/ui';

export default function QuotesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-16 text-muted">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      }
    >
      <div className="space-y-6">
        <PageHero
          eyebrow="Marketplace"
          title="Demandes de devis"
          subtitle="Envoyez vos demandes et comparez les offres reçues."
          image="/images/pages/devis.jpg"
        />
        <MarketplaceRequestsHub section="quotes" />
      </div>
    </Suspense>
  );
}
