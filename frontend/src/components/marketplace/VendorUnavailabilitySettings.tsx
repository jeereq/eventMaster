'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { CalendarOff } from 'lucide-react';
import { api } from '@/lib/api';
import { Alert, Button, Modal } from '@/components/ui';
import BlockedDatesField from '@/components/BlockedDatesField';
import { parseBlockedDates } from '@/lib/marketplace';

function todayKey() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function formatDay(key: string) {
  return new Date(`${key}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

/**
 * Jours où le prestataire n'est pas disponible, toutes fiches confondues.
 * Ces jours bloquent les nouveaux devis datés et les réservations.
 */
export default function VendorUnavailabilitySettings({
  bookedDates = [],
  onSaved,
}: {
  /** Jours déjà pris par des réservations, affichés en rouge dans l'éditeur. */
  bookedDates?: string[];
  onSaved?: () => void;
}) {
  const [dates, setDates] = useState<string[] | null>(null);
  const [canEdit, setCanEdit] = useState(false);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    api
      .get('/marketplace/unavailable-dates')
      .then((data) => {
        if (cancelled) return;
        setDates(parseBlockedDates(data.dates));
        setCanEdit(Boolean(data.canEdit));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const upcoming = useMemo(() => {
    const today = todayKey();
    return (dates || []).filter((key) => key >= today);
  }, [dates]);

  if (!dates) return null;

  const openEditor = () => {
    setDraft(upcoming);
    setError('');
    setOpen(true);
  };

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      const data = await api.put('/marketplace/unavailable-dates', { dates: draft });
      setDates(parseBlockedDates(data.dates));
      setOpen(false);
      onSaved?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Impossible d’enregistrer.');
    } finally {
      setSaving(false);
    }
  };

  const preview = upcoming.slice(0, 4).map(formatDay).join(', ');

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 border border-border rounded-[var(--radius-card)] bg-surface px-4 py-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-foreground inline-flex items-center gap-1.5">
            <CalendarOff className="w-3.5 h-3.5 text-amber-600" aria-hidden />
            Mes indisponibilités
            {upcoming.length ? (
              <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400">
                {upcoming.length} jour{upcoming.length > 1 ? 's' : ''}
              </span>
            ) : null}
          </p>
          <p className="text-[11px] text-muted mt-0.5">
            {upcoming.length
              ? `Aucun devis ni réservation possible ces jours-là sur vos fiches : ${preview}${upcoming.length > 4 ? '…' : ''}`
              : 'Marquez les jours où vous ne travaillez pas : vos clients ne pourront ni réserver ni demander de devis à ces dates.'}
          </p>
        </div>
        {canEdit ? (
          <Button size="sm" variant="secondary" onClick={openEditor}>
            {upcoming.length ? 'Modifier' : 'Ajouter des jours'}
          </Button>
        ) : null}
      </div>

      <Modal
        open={open}
        onClose={() => {
          if (!saving) setOpen(false);
        }}
        title="Mes jours d’indisponibilité"
        description="Ces jours s’appliquent à toutes vos fiches (salles, prestations, matériel, boissons). Les réservations déjà acceptées ne sont pas annulées."
        size="md"
        footer={(
          <div className="flex items-center justify-between gap-2 w-full">
            <Button variant="ghost" disabled={saving || !draft.length} onClick={() => setDraft([])}>
              Tout effacer
            </Button>
            <div className="flex items-center gap-2">
              <Button variant="ghost" disabled={saving} onClick={() => setOpen(false)}>
                Annuler
              </Button>
              <Button loading={saving} onClick={save}>
                Enregistrer
              </Button>
            </div>
          </div>
        )}
      >
        <div className="space-y-3 py-2">
          <BlockedDatesField value={draft} onChange={setDraft} bookedDates={bookedDates} />
          {error ? <Alert variant="error">{error}</Alert> : null}
        </div>
      </Modal>
    </>
  );
}
