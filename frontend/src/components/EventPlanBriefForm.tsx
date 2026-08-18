'use client';

import React, { useMemo, useState } from 'react';
import { ChevronDown, Loader2, Save, Sparkles } from 'lucide-react';
import { Alert, Button, Input } from '@/components/ui';
import { cn } from '@/lib/cn';
import { communesForCity, normalizeRdcCity } from '@/lib/rdcCities';
import { LISTING_EVENT_TYPES, VENUE_AMENITIES, eventTypeLabel, type ListingEventTypeId } from '@/lib/listingDetails';
import { SERVICE_CATEGORIES, SERVICE_CATEGORY_LABELS, type ServiceCategory } from '@/lib/marketplace';
import {
  briefWithEventType,
  cycleSlotPriority,
  defaultShares,
  shareRows,
  type AmenityMode,
  type EventPlanBrief,
  type FavoriteMode,
  type IncludeVenue,
  type MarginPct,
  type MatchMode,
  type MissingStrategy,
  type SavedEventBrief,
  type SlotPriority,
} from '@/lib/eventPlan';

const SLOT_HINT: Record<SlotPriority, string> = {
  required: 'obligatoire',
  optional: 'si le budget reste',
  excluded: 'exclu',
};

function FieldSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="space-y-1.5">
      <span className="block text-xs font-semibold text-muted">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-[var(--radius-button)] border border-border bg-surface-muted text-sm"
      >
        {children}
      </select>
    </label>
  );
}

export default function EventPlanBriefForm({
  brief,
  onChange,
  planning,
  error,
  onSubmit,
  briefs,
  onSaveBrief,
  onLoadBrief,
  onDeleteBrief,
}: {
  brief: EventPlanBrief;
  onChange: (next: EventPlanBrief) => void;
  planning: boolean;
  error: string;
  onSubmit: () => void;
  briefs: SavedEventBrief[];
  onSaveBrief: (name: string) => Promise<void>;
  onLoadBrief: (item: SavedEventBrief) => void;
  onDeleteBrief: (id: string) => Promise<void>;
}) {
  const [advanced, setAdvanced] = useState(false);
  const [briefName, setBriefName] = useState('');
  const [saving, setSaving] = useState(false);
  const communes = communesForCity(brief.city);
  const rows = useMemo(() => shareRows(brief), [brief]);
  const shareSum = rows.reduce((sum, row) => sum + row.pct, 0);

  const patch = (partial: Partial<EventPlanBrief>) => onChange({ ...brief, ...partial });

  const setIncludeVenue = (includeVenue: IncludeVenue) => {
    patch({ includeVenue, shares: defaultShares(brief.eventType, includeVenue, brief.slots) });
  };

  const setSlot = (category: ServiceCategory) => {
    const slots = { ...brief.slots, [category]: cycleSlotPriority(brief.slots[category] || 'excluded') };
    const shares = { ...defaultShares(brief.eventType, brief.includeVenue, slots), ...brief.shares };
    onChange({ ...brief, slots, shares });
  };

  const saveBrief = async () => {
    setSaving(true);
    try {
      await onSaveBrief(briefName.trim() || `Brief · ${eventTypeLabel(brief.eventType)}`);
      setBriefName('');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-surface border border-border rounded-[var(--radius-card)] p-4 sm:p-5 space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-foreground">Brief budget</h2>
        <p className="text-xs text-muted mt-1 leading-relaxed">
          Définissez l’enveloppe, les métiers obligatoires et la répartition. Trois packs distincts sont proposés dans cette enveloppe.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <FieldSelect
          label="Type d’événement"
          value={brief.eventType}
          onChange={(value) => onChange(briefWithEventType(brief, value as ListingEventTypeId))}
        >
          {LISTING_EVENT_TYPES.map((item) => (
            <option key={item.id} value={item.id}>{item.label}</option>
          ))}
        </FieldSelect>
        <Input
          label="Budget min (FC)"
          type="number"
          min={0}
          step={50000}
          value={brief.budgetMinFc || ''}
          onChange={(e) => patch({ budgetMinFc: Number(e.target.value) || 0 })}
          hint="0 = pas de minimum"
        />
        <Input
          label="Budget max (FC)"
          type="number"
          min={50000}
          step={50000}
          value={brief.budgetMaxFc}
          onChange={(e) => patch({ budgetMaxFc: Number(e.target.value) || 0 })}
          required
        />
        <FieldSelect
          label="Marge de sécurité"
          value={String(brief.marginPct)}
          onChange={(value) => patch({ marginPct: Number(value) as MarginPct })}
        >
          <option value="0">0 % — tout dépenser</option>
          <option value="5">5 % — recommandé</option>
          <option value="10">10 % — marge confort</option>
        </FieldSelect>
        <FieldSelect
          label="Ville"
          value={brief.city}
          onChange={(value) => patch({ city: normalizeRdcCity(value) || '', commune: '' })}
        >
          <option value="">Toutes</option>
          <option value="Kinshasa">Kinshasa</option>
          <option value="Lubumbashi">Lubumbashi</option>
        </FieldSelect>
        <FieldSelect
          label="Commune"
          value={brief.commune}
          onChange={(value) => patch({ commune: value })}
        >
          <option value="">Toutes</option>
          {communes.map((item) => (
            <option key={item.name} value={item.name}>{item.name}</option>
          ))}
        </FieldSelect>
        <Input
          label="Invités"
          type="number"
          min={1}
          value={brief.guestCount || ''}
          onChange={(e) => patch({ guestCount: Number(e.target.value) || 0 })}
        />
        <Input
          label="Date"
          type="date"
          value={brief.eventDate}
          onChange={(e) => patch({ eventDate: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted">Salle</p>
        <div className="flex flex-wrap gap-1.5">
          {([
            ['yes', 'Obligatoire'],
            ['if_fits', 'Si ça rentre'],
            ['no', 'Sans salle'],
          ] as Array<[IncludeVenue, string]>).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setIncludeVenue(id)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-semibold border',
                brief.includeVenue === id ? 'bg-primary text-white border-primary' : 'border-border text-muted hover:text-foreground',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted">
          Prestations · clic = obligatoire → souhaité → exclu
        </p>
        <div className="flex flex-wrap gap-1.5">
          {SERVICE_CATEGORIES.map((category) => {
            const priority = brief.slots[category] || 'excluded';
            return (
              <button
                key={category}
                type="button"
                onClick={() => setSlot(category)}
                title={SLOT_HINT[priority]}
                className={cn(
                  'px-2.5 py-1 rounded-full text-[11px] font-semibold border transition',
                  priority === 'required' && 'bg-primary text-white border-primary',
                  priority === 'optional' && 'bg-primary/10 text-primary border-primary/40',
                  priority === 'excluded' && 'bg-surface text-muted border-border line-through decoration-muted/70',
                )}
              >
                {SERVICE_CATEGORY_LABELS[category]}
                <span className="opacity-70"> · {SLOT_HINT[priority]}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-xl border border-border">
        <button
          type="button"
          onClick={() => setAdvanced((value) => !value)}
          className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-sm font-semibold"
        >
          Affiner la recherche
          <ChevronDown className={cn('w-4 h-4 text-muted transition', advanced && 'rotate-180')} />
        </button>
        {advanced ? (
          <div className="px-3 pb-4 space-y-4 border-t border-border pt-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-muted">Répartition du budget {shareSum !== 100 ? `· ${shareSum} % (renormalisé à la recherche)` : ''}</p>
                <button
                  type="button"
                  className="text-[11px] font-semibold text-primary"
                  onClick={() => patch({ shares: defaultShares(brief.eventType, brief.includeVenue, brief.slots) })}
                >
                  Preset {eventTypeLabel(brief.eventType)}
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {rows.map((row) => (
                  <label key={row.key} className="space-y-1">
                    <span className="flex justify-between text-[11px] font-semibold text-muted">
                      <span>{row.label}</span>
                      <span>{row.pct} %</span>
                    </span>
                    <input
                      type="range"
                      min={1}
                      max={70}
                      value={row.pct}
                      onChange={(e) => patch({ shares: { ...brief.shares, [row.key]: Number(e.target.value) } })}
                      className="w-full"
                    />
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FieldSelect
                label="Favoris"
                value={brief.favoriteMode}
                onChange={(value) => patch({ favoriteMode: value as FavoriteMode })}
              >
                <option value="bonus">Bonus si égalité</option>
                <option value="force">Forcer s’ils tiennent dans le poste</option>
                <option value="ignore">Ignorer</option>
              </FieldSelect>
              <FieldSelect
                label="Catalogue"
                value={brief.matchMode}
                onChange={(value) => patch({ matchMode: value as MatchMode })}
              >
                <option value="widen">Élargir si trop peu d’offres</option>
                <option value="exact">Uniquement adapté au type</option>
              </FieldSelect>
              <FieldSelect
                label="Métier introuvable"
                value={brief.missingStrategy}
                onChange={(value) => patch({ missingStrategy: value as MissingStrategy })}
              >
                <option value="reallocate">Réallouer le poste</option>
                <option value="gap">Laisser un trou explicite</option>
                <option value="widen_city">Élargir la ville / commune</option>
              </FieldSelect>
              <FieldSelect
                label="Équipements salle"
                value={brief.amenityMode}
                onChange={(value) => patch({ amenityMode: value as AmenityMode })}
              >
                <option value="preferred">Préférés (bonus)</option>
                <option value="blocking">Obligatoires</option>
              </FieldSelect>
            </div>

            <label className="flex items-center gap-2 text-xs font-medium text-foreground">
              <input
                type="checkbox"
                checked={brief.distinctVenues}
                onChange={(e) => patch({ distinctVenues: e.target.checked })}
              />
              Trois salles distinctes si le catalogue le permet
            </label>

            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted">Équipements souhaités pour la salle</p>
              <div className="flex flex-wrap gap-1.5">
                {VENUE_AMENITIES.map((item) => {
                  const active = brief.venueAmenities.includes(item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => patch({
                        venueAmenities: active
                          ? brief.venueAmenities.filter((id) => id !== item.id)
                          : [...brief.venueAmenities, item.id],
                      })}
                      className={cn(
                        'px-2.5 py-1 rounded-full text-[11px] font-semibold border',
                        active ? 'bg-primary text-white border-primary' : 'border-border text-muted hover:text-foreground',
                      )}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {error ? <Alert variant="error">{error}</Alert> : null}

      <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2">
        <Button onClick={onSubmit} disabled={planning} leftIcon={planning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}>
          {planning ? 'Recherche…' : 'Lancer la recherche'}
        </Button>
        <div className="flex flex-1 min-w-[12rem] gap-2">
          <Input
            value={briefName}
            onChange={(e) => setBriefName(e.target.value)}
            placeholder="Nom du brief"
          />
          <Button variant="secondary" loading={saving} onClick={() => void saveBrief()} leftIcon={<Save className="w-4 h-4" />}>
            Sauver
          </Button>
        </div>
      </div>

      {briefs.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted">Briefs enregistrés</p>
          <ul className="flex flex-wrap gap-1.5">
            {briefs.map((item) => (
              <li key={item.id} className="inline-flex items-center rounded-full border border-border bg-surface-muted">
                <button
                  type="button"
                  onClick={() => onLoadBrief(item)}
                  className="px-2.5 py-1 text-[11px] font-semibold hover:text-primary"
                >
                  {item.name}
                </button>
                <button
                  type="button"
                  onClick={() => void onDeleteBrief(item.id)}
                  className="px-2 text-[11px] text-muted hover:text-rose-600"
                  aria-label={`Supprimer ${item.name}`}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
