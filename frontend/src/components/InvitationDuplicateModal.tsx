'use client';

import React, { useEffect, useState } from 'react';
import { Copy, Sparkles } from 'lucide-react';
import { Button, Modal } from '@/components/ui';
import InvitationIdentityFields from '@/components/InvitationIdentityFields';

export type InvitationDuplicateValues = {
  title: string;
  honorees: string;
  date: string;
  openEditor: boolean;
};

export default function InvitationDuplicateModal({
  open,
  sourceName,
  loading,
  onClose,
  onConfirm,
}: {
  open: boolean;
  sourceName: string;
  loading?: boolean;
  onClose: () => void;
  onConfirm: (values: InvitationDuplicateValues) => void;
}) {
  const [title, setTitle] = useState('');
  const [honorees, setHonorees] = useState('');
  const [date, setDate] = useState('');

  useEffect(() => {
    if (!open) return;
    setTitle(sourceName && !/\(copie\)$/i.test(sourceName) ? sourceName : '');
    setHonorees('');
    setDate('');
  }, [open, sourceName]);

  const canSubmit = title.trim().length >= 2;

  const submit = (openEditor: boolean) => {
    if (!canSubmit || loading) return;
    onConfirm({
      title: title.trim(),
      honorees: honorees.trim(),
      date: date.trim(),
      openEditor,
    });
  };

  return (
    <Modal
      open={open}
      onClose={loading ? () => undefined : onClose}
      size="md"
      title={
        <div className="flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-button)] bg-primary/10 text-primary">
            <Copy className="h-4 w-4" aria-hidden />
          </span>
          <div>
            <span className="block text-base font-semibold text-foreground">Personnaliser la copie</span>
            <span className="block text-xs font-normal text-muted">Titre, hôtes et date de cette invitation</span>
          </div>
        </div>
      }
      footer={
        <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" disabled={loading} onClick={onClose}>
            Annuler
          </Button>
          <Button type="button" variant="secondary" loading={loading} disabled={!canSubmit} onClick={() => submit(false)}>
            Dupliquer seulement
          </Button>
          <Button type="button" loading={loading} disabled={!canSubmit} onClick={() => submit(true)} leftIcon={<Sparkles className="h-4 w-4" aria-hidden />}>
            Dupliquer et ouvrir
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="text-sm leading-relaxed text-muted">
          Le modèle « <span className="font-semibold text-foreground">{sourceName}</span> » sera copié
          dans votre organisation. Indiquez les textes propres à cette cérémonie.
        </p>
        <InvitationIdentityFields
          titleRequired
          disabled={loading}
          description="Le titre nomme la copie. Les hôtes et la date s’écrivent sur le carton."
          value={{ title, honorees, date }}
          onChange={(next) => {
            setTitle(next.title || '');
            setHonorees(next.honorees || '');
            setDate(next.date || '');
          }}
        />
      </div>
    </Modal>
  );
}
