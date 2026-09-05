'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

/** Les versements commerciaux org. ont été retirés : on renvoie vers la facturation. */
export default function OrgCommercialPayoutsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/billing');
  }, [router]);

  return (
    <div className="flex justify-center py-16">
      <Loader2 className="w-6 h-6 animate-spin text-muted" aria-label="Redirection vers la facturation" />
    </div>
  );
}
