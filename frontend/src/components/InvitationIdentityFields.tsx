'use client';

import React from 'react';
import { Calendar, User } from 'lucide-react';
import { Input } from '@/components/ui';
import type { InvitationIdentity } from '@/lib/invitationIdentity';

export default function InvitationIdentityFields({
  value,
  onChange,
  disabled,
}: {
  value: InvitationIdentity;
  onChange: (next: InvitationIdentity) => void;
  disabled?: boolean;
}) {
  const title = value.title || '';
  const honorees = value.honorees || '';
  const date = value.date || '';

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-surface-muted/40 p-3">
      <p className="text-xs font-bold uppercase tracking-wider text-muted">
        Textes de cette invitation
      </p>
      <Input
        label="Titre de l’invitation"
        value={title}
        disabled={disabled}
        onChange={(e) => onChange({ ...value, title: e.target.value })}
        placeholder="ex. Mariage princier, 30 ans de Grâce"
        maxLength={120}
      />
      <Input
        label="Cérémonie, couple ou personne"
        value={honorees}
        disabled={disabled}
        onChange={(e) => onChange({ ...value, honorees: e.target.value })}
        placeholder="ex. Amina & Jean-Marc"
        leftIcon={<User className="h-4 w-4" />}
      />
      <Input
        label="Date de la cérémonie"
        type="date"
        value={date}
        disabled={disabled}
        onChange={(e) => onChange({ ...value, date: e.target.value })}
        leftIcon={<Calendar className="h-4 w-4" />}
      />
    </div>
  );
}
