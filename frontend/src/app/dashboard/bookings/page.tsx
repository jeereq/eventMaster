'use client';

import React, { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import MarketplaceRequestsHub from '@/components/dashboard/MarketplaceRequestsHub';

function Spinner() {
  return (
    <div className="flex items-center justify-center py-16 text-muted">
      <Loader2 className="w-6 h-6 animate-spin" />
    </div>
  );
}

function BookingsView() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const legacyQuotes = searchParams.get('tab') === 'quotes';

  // Anciens liens « ?tab=quotes » : les devis ont désormais leur propre vue.
  useEffect(() => {
    if (!legacyQuotes) return;
    const params = new URLSearchParams(searchParams.toString());
    params.delete('tab');
    const qs = params.toString();
    router.replace(qs ? `/dashboard/quotes?${qs}` : '/dashboard/quotes');
  }, [legacyQuotes, searchParams, router]);

  if (legacyQuotes) return <Spinner />;
  return <MarketplaceRequestsHub section="bookings" />;
}

export default function ClientBookingsPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <BookingsView />
    </Suspense>
  );
}
