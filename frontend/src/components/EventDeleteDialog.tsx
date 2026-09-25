'use client';

import React, { useState } from 'react';
import { AlertTriangle, Calendar, MapPin, Ticket, Trash2 } from 'lucide-react';
import { Button, Input, Modal } from '@/components/ui';

export type EventDeleteTarget = {
  id: string;
  title: string;
  date?: string | null;
  placeLabel?: string | null;
  ticketsSold?: number | null;
  guestCount?: number | null;
};

const CONFIRM_WORD = 'SUPPRIMER';

/**
 * Confirmation de suppression d’un événement : rappelle ce qui sera perdu et,
 * si des billets ont été vendus, exige la saisie d’un mot de confirmation.
 */
export default function EventDeleteDialog({
  target,
  loading = false,
  onClose,
  onConfirm,
}: {
  target: EventDeleteTarget | null;
  loading?: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
}) {
  const [typed, setTyped] = useState('');
  const ticketsSold = target?.ticketsSold ?? 0;
  const needsTypedConfirm = ticketsSold > 0;
  const canConfirm = !needsTypedConfirm || typed.trim().toUpperCase() === CONFIRM_WORD;

  // Repartir d’un champ vide à chaque nouvel événement ciblé.
  const [typedFor, setTypedFor] = useState(target?.id);
  if (typedFor !== target?.id) {
    setTypedFor(target?.id);
    setTyped('');
  }

  const dateLabel = target?.date
    ? new Date(target.date).toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null;

  const lost = [
    'la fiche et la configuration de l’événement',
    target?.guestCount != null
      ? `${target.guestCount} invité${target.guestCount > 1 ? 's' : ''} et leurs réponses`
      : 'la liste des invités et leurs réponses',
    'les invitations, le plan de table et le protocole',
    ...(ticketsSold > 0 ? [`${ticketsSold} billet${ticketsSold > 1 ? 's' : ''} vendu${ticketsSold > 1 ? 's' : ''} et les accès des acheteurs`] : []),
  ];

  return (
    <Modal
      open={target !== null}
      onClose={loading ? () => undefined : onClose}
      dismissible={!loading}
      size="sm"
      title="Supprimer l’événement ?"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading} data-modal-initial-focus>
            Garder l’événement
          </Button>
          <Button
            type="button"
            variant="danger"
            loading={loading}
            disabled={!canConfirm}
            leftIcon={<Trash2 className="w-4 h-4" />}
            onClick={() => void onConfirm()}
          >
            Supprimer définitivement
          </Button>
        </>
      }
    >
      {target ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-surface-muted/50 p-3 space-y-1">
            <p className="text-sm font-semibold text-foreground break-words">{target.title}</p>
            {dateLabel ? (
              <p className="flex items-center gap-1.5 text-xs text-muted">
                <Calendar className="w-3.5 h-3.5 shrink-0 text-primary" aria-hidden />
                <span className="first-letter:uppercase">{dateLabel}</span>
              </p>
            ) : null}
            {target.placeLabel ? (
              <p className="flex items-center gap-1.5 text-xs text-muted min-w-0">
                <MapPin className="w-3.5 h-3.5 shrink-0 text-primary" aria-hidden />
                <span className="truncate">{target.placeLabel}</span>
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <p className="text-sm text-foreground">Seront supprimés définitivement :</p>
            <ul className="list-disc pl-5 space-y-0.5 text-sm text-muted">
              {lost.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          {needsTypedConfirm ? (
            <div className="rounded-xl border border-danger/25 bg-danger/5 p-3 space-y-3">
              <p className="flex items-start gap-2 text-sm text-danger">
                <Ticket className="w-4 h-4 shrink-0 mt-0.5" aria-hidden />
                <span>
                  Des acheteurs ont déjà payé leur billet. Pensez à les prévenir et à gérer les remboursements avant de
                  supprimer.
                </span>
              </p>
              <Input
                label={`Tapez ${CONFIRM_WORD} pour confirmer`}
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                placeholder={CONFIRM_WORD}
              />
            </div>
          ) : (
            <p className="flex items-center gap-2 text-xs text-muted">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-600" aria-hidden />
              Cette action est irréversible.
            </p>
          )}
        </div>
      ) : null}
    </Modal>
  );
}
