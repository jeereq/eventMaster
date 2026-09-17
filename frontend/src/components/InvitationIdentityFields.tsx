'use client';

import React, { useId } from 'react';
import { Calendar, User } from 'lucide-react';
import { Input } from '@/components/ui';
import type { InvitationIdentity } from '@/lib/invitationIdentity';

export default function InvitationIdentityFields({
  value,
  onChange,
  disabled,
  description = 'Ces textes s’écrivent sur le carton : le titre, les hôtes et la date de la cérémonie.',
  titleRequired,
}: {
  value: InvitationIdentity;
  onChange: (next: InvitationIdentity) => void;
  disabled?: boolean;
  description?: string;
  titleRequired?: boolean;
}) {
  const headingId = useId();
  const descriptionId = useId();
  const title = value.title || '';
  const honorees = value.honorees || '';
  const date = value.date || '';

  return (
    <fieldset
      disabled={disabled}
      aria-labelledby={headingId}
      aria-describedby={descriptionId}
      className="space-y-4 rounded-[var(--radius-card)] border border-border bg-surface-muted/40 p-4 sm:p-5"
    >
      <legend id={headingId} className="px-0.5 text-xs font-semibold text-foreground">
        Textes de cette invitation
      </legend>
      <p id={descriptionId} className="text-xs leading-relaxed text-muted">
        {description}
      </p>
      <Input
        label="Titre de l’invitation"
        value={title}
        required={titleRequired}
        autoComplete="off"
        onChange={(e) => onChange({ ...value, title: e.target.value })}
        placeholder="ex. Mariage princier, 30 ans de Grâce"
        maxLength={120}
      />
      <Input
        label="Cérémonie, couple ou personne"
        value={honorees}
        autoComplete="name"
        onChange={(e) => onChange({ ...value, honorees: e.target.value })}
        placeholder="ex. Amina & Jean-Marc"
        leftIcon={<User className="h-4 w-4" aria-hidden />}
        hint="Nom affiché en grand sur le carton."
      />
      <Input
        label="Date de la cérémonie"
        type="date"
        value={date}
        onChange={(e) => onChange({ ...value, date: e.target.value })}
        leftIcon={<Calendar className="h-4 w-4" aria-hidden />}
        hint="Affichée en toutes lettres sur le faire-part."
      />
    </fieldset>
  );
}
