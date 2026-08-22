'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { eventsListHref } from '@/lib/eventRoutes';

/**
 * Entrée dédiée au desk protocole.
 * Redirige vers /dashboard/events?mode=protocol (et conserve view=tasks si présent).
 */
function ProtocolEntryInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const view = searchParams.get('view') === 'tasks' ? 'tasks' : 'events';
    router.replace(eventsListHref(true, view));
  }, [router, searchParams]);

  return (
    <div className="flex flex-col items-center justify-center py-24 text-muted gap-3">
      <Loader2 className="w-6 h-6 animate-spin text-primary" />
      <p className="text-sm font-medium">Ouverture du desk protocole…</p>
    </div>
  );
}

export default function ProtocolEntryPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center py-24 text-muted gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <p className="text-sm font-medium">Ouverture du desk protocole…</p>
        </div>
      }
    >
      <ProtocolEntryInner />
    </Suspense>
  );
}
