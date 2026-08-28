'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import {
  PageHeader,
  Breadcrumbs,
  Button,
  Alert,
  SkeletonStatsRow,
} from '@/components/ui';
import WorkspaceStatsOverview, { type WorkspaceStats } from '@/components/WorkspaceStatsOverview';
import ProtocolTasksInbox from '@/components/ProtocolTasksInbox';
import { eventDashboardHref } from '@/lib/eventRoutes';
import {
  CalendarCheck,
  ClipboardList,
  Inbox,
  Loader2,
  ScanLine,
  Store,
} from 'lucide-react';

export default function ProtocolDashboardHome() {
  const [workspace, setWorkspace] = useState<WorkspaceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const stats = await api.get('/events/workspace-stats');
        if (!cancelled && stats?.events) setWorkspace(stats as WorkspaceStats);
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Impossible de charger le tableau de bord protocole.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const todayEvent = workspace?.upcoming.find((event) => {
    const day = new Date(event.date);
    const now = new Date();
    return (
      day.getFullYear() === now.getFullYear()
      && day.getMonth() === now.getMonth()
      && day.getDate() === now.getDate()
    );
  }) || workspace?.upcoming[0];

  return (
    <div className="space-y-6 w-full">
      <PageHeader
        title="Accueil & Protocole"
        description="Votre journée en un coup d’œil : événements du jour, émargement et accueil des invités."
        breadcrumbs={<Breadcrumbs items={[{ label: 'Accueil' }]} />}
        action={
          <div className="flex flex-wrap gap-2">
            {todayEvent ? (
              <Link href={eventDashboardHref(todayEvent.id, { tab: 'protocol', protocol: true })}>
                <Button size="sm" leftIcon={<ScanLine className="w-4 h-4" />}>
                  Accueillir les invités
                </Button>
              </Link>
            ) : (
              <Link href="/dashboard/protocol">
                <Button size="sm" leftIcon={<ScanLine className="w-4 h-4" />}>
                  Desk protocole
                </Button>
              </Link>
            )}
            <Link href="/dashboard/protocol?view=tasks">
              <Button size="sm" variant="secondary" leftIcon={<ClipboardList className="w-4 h-4" />}>
                Mes tâches du jour
              </Button>
            </Link>
          </div>
        }
      />

      {error ? <Alert variant="error">{error}</Alert> : null}

      {loading ? (
        <div className="space-y-4">
          <SkeletonStatsRow />
          <div className="flex justify-center py-10 text-muted">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        </div>
      ) : workspace ? (
        <WorkspaceStatsOverview stats={workspace} protocol />
      ) : (
        <p className="text-sm text-muted">Aucune statistique disponible pour le moment.</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <Link
          href="/dashboard/protocol"
          className="rounded-2xl border border-border bg-surface px-3.5 py-3 hover:border-primary/40 hover:bg-primary/5 transition"
        >
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted inline-flex items-center gap-1.5">
            <ScanLine className="w-3.5 h-3.5" /> Accueil
          </p>
          <p className="text-sm font-semibold mt-1">Événements du jour J</p>
        </Link>
        <Link
          href="/dashboard/bookings?tab=quotes"
          className="rounded-2xl border border-border bg-surface px-3.5 py-3 hover:border-primary/40 hover:bg-primary/5 transition"
        >
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted inline-flex items-center gap-1.5">
            <Inbox className="w-3.5 h-3.5" /> Devis
          </p>
          <p className="text-sm font-semibold mt-1">Suivi des demandes</p>
        </Link>
        <Link
          href="/dashboard/bookings?tab=bookings"
          className="rounded-2xl border border-border bg-surface px-3.5 py-3 hover:border-primary/40 hover:bg-primary/5 transition"
        >
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted inline-flex items-center gap-1.5">
            <CalendarCheck className="w-3.5 h-3.5" /> Réservations
          </p>
          <p className="text-sm font-semibold mt-1">Dates confirmées</p>
        </Link>
      </div>

      <div id="protocol-home-tasks">
        <ProtocolTasksInbox protocol />
      </div>

      <p className="text-[11px] text-muted">
        Besoin d’une salle ou d’un prestataire ?{' '}
        <Link href="/dashboard/catalogue" className="font-semibold text-primary hover:underline inline-flex items-center gap-1">
          <Store className="w-3.5 h-3.5" /> Explorer le catalogue
        </Link>
      </p>
    </div>
  );
}
