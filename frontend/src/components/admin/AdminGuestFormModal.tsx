'use client';

import React, { useId, useState } from 'react';
import { Users } from 'lucide-react';
import { Alert, Button, Input, Modal, PhoneInput } from '@/components/ui';

const SELECT_CLASS =
  'block min-h-11 w-full rounded-[var(--radius-button)] border border-border bg-surface-muted px-3.5 py-2.5 text-sm font-medium text-foreground focus:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/25';

export default function AdminGuestFormModal({
  open,
  mode,
  submitting,
  events,
  eventId,
  firstName,
  lastName,
  email,
  category,
  rsvp,
  phoneCountryCode,
  phoneNational,
  onClose,
  onSubmit,
  setEventId,
  setFirstName,
  setLastName,
  setEmail,
  setCategory,
  setRsvp,
  setPhoneCountryCode,
  setPhoneNational,
}: {
  open: boolean;
  mode: 'create' | 'edit';
  submitting: boolean;
  events: Array<{ id: string; title: string; tenantName?: string }>;
  eventId: string;
  firstName: string;
  lastName: string;
  email: string;
  category: string;
  rsvp: string;
  phoneCountryCode: string;
  phoneNational: string;
  onClose: () => void;
  onSubmit: () => Promise<void>;
  setEventId: (value: string) => void;
  setFirstName: (value: string) => void;
  setLastName: (value: string) => void;
  setEmail: (value: string) => void;
  setCategory: (value: string) => void;
  setRsvp: (value: string) => void;
  setPhoneCountryCode: (value: string) => void;
  setPhoneNational: (value: string) => void;
}) {
  const formId = useId();
  const [formError, setFormError] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!eventId || !firstName.trim() || !lastName.trim() || !email.trim()) {
      setFormError('Événement, prénom, nom et e-mail sont requis.');
      return;
    }
    setFormError('');
    try {
      await onSubmit();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Impossible d’enregistrer l’invité.');
    }
  };

  return (
    <Modal
      open={open}
      onClose={() => {
        if (!submitting) {
          setFormError('');
          onClose();
        }
      }}
      size="md"
      title={mode === 'create' ? 'Créer un invité' : 'Modifier l’invité'}
      description={
        mode === 'create'
          ? 'Ajoutez un invité à un événement, avec contact et statut de réponse.'
          : 'Mettez à jour l’identité, le contact et le statut RSVP.'
      }
      footer={
        <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" disabled={submitting} onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" form={`${formId}-guest`} loading={submitting} leftIcon={<Users className="w-4 h-4" />}>
            {mode === 'create' ? 'Créer l’invité' : 'Enregistrer'}
          </Button>
        </div>
      }
    >
      <form id={`${formId}-guest`} onSubmit={handleSubmit} className="space-y-4">
        {formError ? <Alert variant="error">{formError}</Alert> : null}

        <div className="space-y-1.5">
          <label htmlFor={`${formId}-event`} className="block text-xs font-semibold text-muted">
            Événement <span className="text-danger">*</span>
          </label>
          <select
            id={`${formId}-event`}
            required
            value={eventId}
            onChange={(e) => setEventId(e.target.value)}
            className={SELECT_CLASS}
          >
            <option value="">Sélectionner un événement</option>
            {events.map((evt) => (
              <option key={evt.id} value={evt.id}>
                {evt.title}
                {evt.tenantName ? ` · ${evt.tenantName}` : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Prénom"
            required
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            autoComplete="given-name"
          />
          <Input
            label="Nom"
            required
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            autoComplete="family-name"
          />
        </div>

        <Input
          label="Adresse e-mail"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />

        <PhoneInput
          label="Téléphone (WhatsApp)"
          countryCode={phoneCountryCode}
          national={phoneNational}
          onCountryCodeChange={setPhoneCountryCode}
          onNationalChange={setPhoneNational}
          hint="Indicatif + numéro national (sans le 0)."
        />

        <Input
          label="Catégorie"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="Famille, VIP, collègue…"
        />

        <div className="space-y-1.5">
          <label htmlFor={`${formId}-rsvp`} className="block text-xs font-semibold text-muted">
            Statut de réponse
          </label>
          <select
            id={`${formId}-rsvp`}
            value={rsvp}
            onChange={(e) => setRsvp(e.target.value)}
            className={SELECT_CLASS}
          >
            <option value="PENDING">En attente</option>
            <option value="ACCEPTED">Accepté</option>
            <option value="DECLINED">Décliné</option>
          </select>
        </div>
      </form>
    </Modal>
  );
}
