'use client';

import React, { useId, useState } from 'react';
import { Calendar } from 'lucide-react';
import { Alert, Button, Input, Modal } from '@/components/ui';

const SELECT_CLASS =
  'block min-h-11 w-full rounded-[var(--radius-button)] border border-border bg-surface-muted px-3.5 py-2.5 text-sm font-medium text-foreground focus:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/25';

export default function AdminEventFormModal({
  open,
  mode,
  titleLabel,
  submitting,
  tenantOptions,
  tenantId,
  title,
  description,
  date,
  location,
  reminderFrequency,
  latitude,
  longitude,
  onClose,
  onSubmit,
  setTenantId,
  setTitle,
  setDescription,
  setDate,
  setLocation,
  setReminderFrequency,
  setLatitude,
  setLongitude,
  onLatitudeChange,
  onLongitudeChange,
}: {
  open: boolean;
  mode: 'create' | 'edit';
  titleLabel?: string;
  submitting: boolean;
  tenantOptions: Array<{ id: string; name: string }>;
  tenantId: string;
  title: string;
  description: string;
  date: string;
  location: string;
  reminderFrequency: string;
  latitude: string;
  longitude: string;
  onClose: () => void;
  onSubmit: () => Promise<void>;
  setTenantId: (value: string) => void;
  setTitle: (value: string) => void;
  setDescription: (value: string) => void;
  setDate: (value: string) => void;
  setLocation: (value: string) => void;
  setReminderFrequency: (value: string) => void;
  setLatitude: (value: string) => void;
  setLongitude: (value: string) => void;
  onLatitudeChange?: (value: string) => void;
  onLongitudeChange?: (value: string) => void;
}) {
  const formId = useId();
  const [formError, setFormError] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!tenantId || !title.trim() || !date || !location.trim()) {
      setFormError('Organisation, titre, date et lieu sont requis.');
      return;
    }
    setFormError('');
    try {
      await onSubmit();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Impossible d’enregistrer l’événement.');
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
      size="lg"
      title={mode === 'create' ? 'Créer un événement' : 'Modifier l’événement'}
      description={
        mode === 'create'
          ? 'Rattachez l’événement à une organisation, puis précisez date et lieu.'
          : titleLabel
            ? `Événement « ${titleLabel} ».`
            : 'Mettez à jour le titre, la date, le lieu et les coordonnées.'
      }
      footer={
        <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" disabled={submitting} onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" form={`${formId}-event`} loading={submitting} leftIcon={<Calendar className="w-4 h-4" />}>
            {mode === 'create' ? 'Créer l’événement' : 'Enregistrer'}
          </Button>
        </div>
      }
    >
      <form id={`${formId}-event`} onSubmit={handleSubmit} className="space-y-4">
        {formError ? <Alert variant="error">{formError}</Alert> : null}

        <div className="space-y-1.5">
          <label htmlFor={`${formId}-tenant`} className="block text-xs font-semibold text-muted">
            Organisation <span className="text-danger">*</span>
          </label>
          <select
            id={`${formId}-tenant`}
            required
            value={tenantId}
            onChange={(e) => setTenantId(e.target.value)}
            className={SELECT_CLASS}
          >
            <option value="">Sélectionner une organisation</option>
            {tenantOptions.map((tenant) => (
              <option key={tenant.id} value={tenant.id}>
                {tenant.name}
              </option>
            ))}
          </select>
        </div>

        <Input
          label="Titre"
          required
          maxLength={160}
          placeholder="Ex. Mariage de Marc et Sophie"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <div className="space-y-1.5">
          <label htmlFor={`${formId}-desc`} className="block text-xs font-semibold text-muted">
            Description
          </label>
          <textarea
            id={`${formId}-desc`}
            rows={3}
            maxLength={2000}
            placeholder="Détails de l’événement…"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="block min-h-20 w-full rounded-[var(--radius-button)] border border-border bg-surface-muted px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted focus:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/25"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Date et heure"
            type="datetime-local"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <Input
            label="Lieu"
            required
            maxLength={200}
            placeholder="Ex. Salle Palace, Kinshasa"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor={`${formId}-reminder`} className="block text-xs font-semibold text-muted">
            Rappels automatiques
          </label>
          <select
            id={`${formId}-reminder`}
            value={reminderFrequency}
            onChange={(e) => setReminderFrequency(e.target.value)}
            className={SELECT_CLASS}
          >
            <option value="NONE">Aucun rappel</option>
            <option value="DAILY">Quotidien</option>
            <option value="WEEKLY">Hebdomadaire</option>
          </select>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted">Position sur la carte</p>
          <div
            id="admin-map-picker"
            role="img"
            aria-label="Carte de localisation de l’événement"
            className="relative h-48 min-h-[11.25rem] w-full overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface-muted"
          >
            <div className="absolute inset-0 flex items-center justify-center text-xs text-muted">
              Chargement de la carte…
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Latitude"
            type="number"
            step="any"
            placeholder="-4.325"
            value={latitude}
            onChange={(e) => (onLatitudeChange || setLatitude)(e.target.value)}
          />
          <Input
            label="Longitude"
            type="number"
            step="any"
            placeholder="15.305"
            value={longitude}
            onChange={(e) => (onLongitudeChange || setLongitude)(e.target.value)}
          />
        </div>
      </form>
    </Modal>
  );
}
