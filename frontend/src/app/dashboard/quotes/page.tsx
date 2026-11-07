'use client';

import React, { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import MarketplaceRequestsHub from '@/components/dashboard/MarketplaceRequestsHub';

export default function QuotesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-16 text-muted">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      }
    >
      <MarketplaceRequestsHub section="quotes" />
    </Suspense>
  );
}
