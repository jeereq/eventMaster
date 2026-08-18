'use client';

import React from 'react';
import { Input } from '@/components/ui';
import { cn } from '@/lib/cn';
import {
  LISTING_EVENT_TYPES,
  RENTAL_AMENITIES,
  SERVICE_AMENITIES,
  VENUE_AMENITIES,
  type ListingAmenityId,
  type ListingDetails,
  type ListingEventTypeId,
} from '@/lib/listingDetails';
import { isServiceRentalCategory } from '@/lib/marketplace';

function MultiPills({
  options,
  selected,
  onToggle,
}: {
  options: Array<{ id: string; label: string }>;
  selected: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => {
        const active = selected.includes(opt.id);
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onToggle(opt.id)}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-medium border transition',
              active
                ? 'bg-primary text-white border-primary'
                : 'bg-surface-muted text-muted border-border hover:text-foreground hover:border-primary/30',
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export default function ListingDetailsFields({
  value,
  onChange,
  kind,
  hideDescription = false,
  category,
}: {
  value: ListingDetails;
  onChange: (next: ListingDetails) => void;
  kind: 'venue' | 'service';
  hideDescription?: boolean;
  category?: string;
}) {
  const isRental = kind === 'service' && isServiceRentalCategory(category);
  const amenities = kind === 'venue' ? VENUE_AMENITIES : isRental ? [...SERVICE_AMENITIES, ...RENTAL_AMENITIES] : SERVICE_AMENITIES;

  return (
    <div className="space-y-4">
      {!hideDescription && (
      <label className="block space-y-1.5">
        <span className="text-xs font-medium text-muted">Description publique</span>
        <textarea
          rows={4}
          value={value.description}
          onChange={(e) => onChange({ ...value, description: e.target.value })}
          className="w-full px-3 py-2 rounded-[var(--radius-button)] border border-border bg-surface-muted text-sm"
          placeholder={kind === 'venue'
            ? 'Ambiance, capacité réelle, horaires, ce qui rend la salle unique…'
            : isRental
              ? 'Parc, tailles / modèles, conditions de caution, livraison, ce qui est inclus…'
              : 'Style, matériel, équipe, déroulement type d’une prestation…'}
        />
      </label>
      )}
      <div className="space-y-1.5">
        <span className="text-xs font-semibold text-foreground">Équipements et atouts</span>
        {isRental ? (
          <p className="text-[11px] text-muted">
            Précisez tailles, livraison, chauffeur ou ce qui est fourni avec la location.
          </p>
        ) : null}
        <MultiPills
          options={amenities}
          selected={value.amenities}
          onToggle={(id) => {
            const key = id as ListingAmenityId;
            const has = value.amenities.includes(key);
            onChange({
              ...value,
              amenities: has ? value.amenities.filter((item) => item !== key) : [...value.amenities, key],
              parking: key === 'parking' ? !has : value.parking,
            });
          }}
        />
      </div>
      <div className="space-y-1.5">
        <span className="text-xs font-semibold text-foreground">Types d’événements</span>
        <MultiPills
          options={LISTING_EVENT_TYPES}
          selected={value.eventTypes}
          onToggle={(id) => {
            const key = id as ListingEventTypeId;
            const has = value.eventTypes.includes(key);
            onChange({
              ...value,
              eventTypes: has ? value.eventTypes.filter((item) => item !== key) : [...value.eventTypes, key],
            });
          }}
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input
          label="Téléphone de contact"
          value={value.contactPhone}
          onChange={(e) => onChange({ ...value, contactPhone: e.target.value })}
          placeholder="+243…"
        />
        <Input
          label="WhatsApp"
          value={value.contactWhatsapp}
          onChange={(e) => onChange({ ...value, contactWhatsapp: e.target.value })}
          placeholder="+243…"
        />
        <Input
          label="Langues"
          value={value.languages}
          onChange={(e) => onChange({ ...value, languages: e.target.value })}
          placeholder="Français, lingala…"
        />
        <Input
          label="Préavis minimum (heures)"
          type="number"
          min={0}
          value={value.minNoticeHours}
          onChange={(e) => onChange({ ...value, minNoticeHours: e.target.value })}
        />
      </div>
      <label className="block space-y-1.5">
        <span className="text-xs font-medium text-muted">Inclus dans le tarif de départ</span>
        <textarea
          rows={3}
          value={value.included}
          onChange={(e) => onChange({ ...value, included: e.target.value })}
          className="w-full px-3 py-2 rounded-[var(--radius-button)] border border-border bg-surface-muted text-sm"
          placeholder="Tables, chaises, éclairage, équipe, essai…"
        />
      </label>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {kind === 'venue' ? (
          <>
            <Input
              label="Ouverture"
              type="time"
              value={value.openingHours}
              onChange={(e) => onChange({ ...value, openingHours: e.target.value })}
            />
            <Input
              label="Fermeture"
              type="time"
              value={value.closingHours}
              onChange={(e) => onChange({ ...value, closingHours: e.target.value })}
            />
            <Input
              label="Surface (m²)"
              type="number"
              min={0}
              value={value.surfaceM2}
              onChange={(e) => onChange({ ...value, surfaceM2: e.target.value })}
            />
          </>
        ) : (
          <>
            <Input
              label="Taille de l’équipe"
              type="number"
              min={1}
              value={value.teamSize}
              onChange={(e) => onChange({ ...value, teamSize: e.target.value })}
            />
            <Input
              label="Années d’expérience"
              type="number"
              min={0}
              value={value.experienceYears}
              onChange={(e) => onChange({ ...value, experienceYears: e.target.value })}
            />
          </>
        )}
        <Input
          label="Acompte demandé (%)"
          type="number"
          min={0}
          max={100}
          value={value.depositPercent}
          onChange={(e) => onChange({ ...value, depositPercent: e.target.value })}
        />
        <Input
          label="Instagram"
          value={value.instagram}
          onChange={(e) => onChange({ ...value, instagram: e.target.value })}
          placeholder="@votrecompte"
        />
      </div>
      <label className="block space-y-1.5">
        <span className="text-xs font-medium text-muted">Accès et repères</span>
        <textarea
          rows={2}
          value={value.accessNotes}
          onChange={(e) => onChange({ ...value, accessNotes: e.target.value })}
          className="w-full px-3 py-2 rounded-[var(--radius-button)] border border-border bg-surface-muted text-sm"
          placeholder="Entrée, parking, étage, point de rendez-vous…"
        />
      </label>
      <label className="block space-y-1.5">
        <span className="text-xs font-medium text-muted">Suppléments possibles</span>
        <textarea
          rows={2}
          value={value.extraFees}
          onChange={(e) => onChange({ ...value, extraFees: e.target.value })}
          className="w-full px-3 py-2 rounded-[var(--radius-button)] border border-border bg-surface-muted text-sm"
          placeholder="Décoration, heures supplémentaires, déplacement hors zone…"
        />
      </label>
      <label className="block space-y-1.5">
        <span className="text-xs font-medium text-muted">Règles / conditions</span>
        <textarea
          rows={2}
          value={value.houseRules}
          onChange={(e) => onChange({ ...value, houseRules: e.target.value })}
          className="w-full px-3 py-2 rounded-[var(--radius-button)] border border-border bg-surface-muted text-sm"
          placeholder="Horaires, bruit, décoration, matériel interdit…"
        />
      </label>
      <label className="block space-y-1.5">
        <span className="text-xs font-medium text-muted">Annulation</span>
        <textarea
          rows={2}
          value={value.cancellation}
          onChange={(e) => onChange({ ...value, cancellation: e.target.value })}
          className="w-full px-3 py-2 rounded-[var(--radius-button)] border border-border bg-surface-muted text-sm"
          placeholder="Délai, remboursement de l’acompte…"
        />
      </label>
    </div>
  );
}
