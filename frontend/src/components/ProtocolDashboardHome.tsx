'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import {
  PageHeader,
  Button,
  Alert,
  SkeletonStatsRow,
} from '@/components/ui';
import WorkspaceStatsOverview, { type WorkspaceStats } from '@/components/WorkspaceStatsOverview';
import ProtocolTasksInbox from '@/components/ProtocolTasksInbox';
import { eventDashboardHref } from '@/lib/eventRoutes';
import {
  Loader2,
  ScanLine,
} from '@/components/icons';

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

      <div id="protocol-home-tasks">
        <ProtocolTasksInbox protocol />
      </div>

    </div>
  );
}
