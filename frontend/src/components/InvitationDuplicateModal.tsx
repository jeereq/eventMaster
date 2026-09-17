'use client';

import React, { useEffect, useState } from 'react';
import { Calendar, Copy, Sparkles, User } from 'lucide-react';
import { Button, Input, Modal } from '@/components/ui';

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

  const canSubmit = title.trim().length >= 2 || honorees.trim().length >= 2;

  const submit = (openEditor: boolean) => {
    if (!canSubmit || loading) return;
    onConfirm({
      title: title.trim() || honorees.trim(),
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
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Copy className="h-4.5 w-4.5" aria-hidden />
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
          <Button type="button" loading={loading} disabled={!canSubmit} onClick={() => submit(true)} leftIcon={<Sparkles className="h-4 w-4" />}>
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
        <Input
          label="Titre de l’invitation"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="ex. Mariage princier, 30 ans de Grâce, Gala de l’indépendance"
          maxLength={120}
          required
        />
        <Input
          label="Cérémonie, couple ou personne"
          value={honorees}
          onChange={(e) => setHonorees(e.target.value)}
          placeholder="ex. Amina & Jean-Marc, Famille Kabongo, Grâce Mujinga"
          leftIcon={<User className="h-4 w-4" />}
          hint="Nom affiché sur le carton à la place de {{title}}."
        />
        <Input
          label="Date de la cérémonie"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          leftIcon={<Calendar className="h-4 w-4" />}
          hint="Remplace {{date}} sur le faire-part."
        />
      </div>
    </Modal>
  );
}
