'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { PageHeader, Breadcrumbs, Alert, Button } from '@/components/ui';
import type { MarketplaceBookingItem } from '@/lib/marketplace';
import MarketplaceBookingsPanel from '@/components/MarketplaceBookingsPanel';
import { useRememberListReturn } from '@/lib/catalogueQuery';
import { Loader2, Store } from 'lucide-react';

export default function ClientBookingsPage() {
  useRememberListReturn();
  const { access, tenant } = useAuth();
  const [bookings, setBookings] = useState<MarketplaceBookingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.get('/marketplace/bookings?role=organizer');
      setBookings(data.bookings || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Impossible de charger vos réservations.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tenant?.id) load();
    else setLoading(false);
  }, [tenant?.id, load]);

  return (
    <div className="space-y-6 w-full">
      <PageHeader
        title="Mes réservations"
        description="Demandes de dates envoyées aux salles et prestataires. L’acompte (30 %) se verse hors plateforme."
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: access?.level === 'client' ? 'Réservations' : 'Accueil', href: access?.level === 'client' ? '/dashboard/bookings' : '/dashboard' },
              { label: 'Mes réservations' },
            ]}
          />
        }
        action={
          <Link href="/dashboard/catalogue" className="inline-flex">
            <Button size="sm" leftIcon={<Store className="w-4 h-4" />}>
              Marketplace
            </Button>
          </Link>
        }
      />

      {error && <Alert variant="error">{error}</Alert>}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : (
        <MarketplaceBookingsPanel
          bookings={bookings}
          commissionDueFc={0}
          onChanged={load}
          organizerView
        />
      )}
    </div>
  );
}
