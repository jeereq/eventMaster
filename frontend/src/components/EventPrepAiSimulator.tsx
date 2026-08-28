'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { Building2, KeyRound, Loader2, Sparkles, Wand2 } from 'lucide-react';
import { api } from '@/lib/api';
import { Alert, Button, Input } from '@/components/ui';
import { cn } from '@/lib/cn';
import { formatFc } from '@/config/landingPricing';
import { LISTING_EVENT_TYPES, type ListingEventTypeId } from '@/lib/listingDetails';
import { isServiceRentalCategory } from '@/lib/marketplace';
import { communesForCity } from '@/lib/rdcCities';
import type { EventPlanAiResult } from '@/lib/eventPlan';

export type EventPrepAiDefaults = {
  eventType?: ListingEventTypeId;
  city?: string;
  commune?: string;
  guestCount?: number;
  eventDate?: string;
  eventTitle?: string;
  budgetMaxFc?: number;
  keepVenueSlug?: string;
  keepServiceSlugs?: string[];
};

export default function EventPrepAiSimulator({
  defaults,
  applyLabel = 'Appliquer à la préparation',
  onApply,
}: {
  defaults?: EventPrepAiDefaults;
  applyLabel?: string;
  onApply: (result: EventPlanAiResult) => void;
}) {
  const [open, setOpen] = useState(false);
  const [eventType, setEventType] = useState<ListingEventTypeId>(defaults?.eventType || 'private');
  const [city, setCity] = useState(defaults?.city || '');
  const [commune, setCommune] = useState(defaults?.commune || '');
  const [guestCount, setGuestCount] = useState(defaults?.guestCount && defaults.guestCount > 0 ? String(defaults.guestCount) : '');
  const [budgetMaxFc, setBudgetMaxFc] = useState(defaults?.budgetMaxFc && defaults.budgetMaxFc > 0 ? String(defaults.budgetMaxFc) : '');
  const [eventDate, setEventDate] = useState(defaults?.eventDate?.slice(0, 10) || '');
  const [prompt, setPrompt] = useState(
    defaults?.eventTitle ? `Préparer « ${defaults.eventTitle} » avec un mix salle / métiers / locations.` : '',
  );
  const [keepVenue, setKeepVenue] = useState(Boolean(defaults?.keepVenueSlug));
  const [includeVenue, setIncludeVenue] = useState(true);
  const [includeTrades, setIncludeTrades] = useState(true);
  const [includeRentals, setIncludeRentals] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<EventPlanAiResult | null>(null);
  const communes = useMemo(() => communesForCity(city), [city]);

  const run = async () => {
    setLoading(true);
    setError('');
    try {
      const data = (await api.post('/marketplace/event-plan-ai', {
        eventType,
        city,
        commune,
        guestCount: guestCount ? Number(guestCount) : undefined,
        budgetMaxFc: budgetMaxFc ? Number(budgetMaxFc) : undefined,
        eventDate: eventDate || undefined,
        prompt: prompt.trim() || undefined,
        includeVenue,
        includeTrades,
        includeRentals,
        keepVenueSlug: keepVenue ? defaults?.keepVenueSlug : undefined,
        keepServiceSlugs: defaults?.keepServiceSlugs || [],
      })) as EventPlanAiResult;
      setResult(data);
    } catch (err: unknown) {
      setResult(null);
      setError(err instanceof Error ? err.message : 'Simulation impossible.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-[var(--radius-card)] border border-border bg-surface p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <h3 className="text-sm font-semibold text-foreground tracking-tight inline-flex items-center gap-2">
            <Wand2 className="w-4 h-4 text-primary" />
            Simulation IA
          </h3>
          <p className="text-xs text-muted leading-relaxed">
            L’IA cherche dans le catalogue EventMaster (salles, métiers, locations) et propose un mix adapté à votre brief.
          </p>
        </div>
        <Button size="sm" variant={open ? 'secondary' : 'primary'} onClick={() => setOpen((value) => !value)}>
          {open ? 'Fermer' : 'Simuler'}
        </Button>
      </div>

      {open ? (
        <div className="space-y-3">
          <label className="space-y-1 block">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">Votre brief</span>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
              placeholder="Ex. mariage 120 personnes à Gombe, ambiance chic, besoin traiteur + DJ + habits…"
              className="w-full rounded-[var(--radius-button)] border border-border bg-surface px-3 py-2 text-sm resize-y min-h-[4.5rem]"
            />
          </label>

          <div className="flex flex-wrap gap-1.5">
            {LISTING_EVENT_TYPES.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setEventType(item.id)}
                className={cn(
                  'px-2.5 py-1 rounded-[var(--radius-button)] text-[11px] font-semibold border transition',
                  eventType === item.id ? 'bg-primary text-white border-primary' : 'border-border text-muted hover:text-foreground',
                )}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            <label className="space-y-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">Ville</span>
              <select
                value={city}
                onChange={(e) => {
                  setCity(e.target.value);
                  setCommune('');
                }}
                className="w-full rounded-[var(--radius-button)] border border-border bg-surface px-3 py-2 text-sm"
              >
                <option value="">Kinshasa & Lubumbashi</option>
                <option value="Kinshasa">Kinshasa</option>
                <option value="Lubumbashi">Lubumbashi</option>
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">Commune</span>
              <select
                value={commune}
                onChange={(e) => setCommune(e.target.value)}
                className="w-full rounded-[var(--radius-button)] border border-border bg-surface px-3 py-2 text-sm"
              >
                <option value="">Toutes</option>
                {communes.map((item) => (
                  <option key={item.name} value={item.name}>{item.name}</option>
                ))}
              </select>
            </label>
            <Input
              label="Invités"
              type="number"
              min={1}
              value={guestCount}
              onChange={(e) => setGuestCount(e.target.value)}
              placeholder="120"
            />
            <Input
              label="Budget max (FC)"
              type="number"
              min={0}
              value={budgetMaxFc}
              onChange={(e) => setBudgetMaxFc(e.target.value)}
              placeholder="1 500 000"
            />
            <div className="sm:col-span-2">
              <Input
                label="Date"
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-3 text-xs font-medium text-foreground">
            <label className="inline-flex items-center gap-1.5">
              <input type="checkbox" checked={includeVenue} onChange={(e) => setIncludeVenue(e.target.checked)} />
              Salle
            </label>
            <label className="inline-flex items-center gap-1.5">
              <input type="checkbox" checked={includeTrades} onChange={(e) => setIncludeTrades(e.target.checked)} />
              Métiers
            </label>
            <label className="inline-flex items-center gap-1.5">
              <input type="checkbox" checked={includeRentals} onChange={(e) => setIncludeRentals(e.target.checked)} />
              Locations
            </label>
            {defaults?.keepVenueSlug ? (
              <label className="inline-flex items-center gap-1.5">
                <input type="checkbox" checked={keepVenue} onChange={(e) => setKeepVenue(e.target.checked)} />
                Garder la salle déjà retenue
              </label>
            ) : null}
          </div>

          {error ? <Alert variant="error">{error}</Alert> : null}

          <Button onClick={() => void run()} loading={loading} leftIcon={<Sparkles className="w-4 h-4" />}>
            Lancer la simulation
          </Button>

          {result ? (
            <div className="rounded-[var(--radius-card)] border border-border bg-surface-muted/40 p-3 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{result.summary}</p>
                  {result.rationale ? <p className="text-xs text-muted mt-1 leading-relaxed">{result.rationale}</p> : null}
                </div>
                <p className="text-sm font-bold shrink-0">{formatFc(result.estimatedTotalFc)}</p>
              </div>
              {result.warnings.length > 0 ? (
                <ul className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 space-y-0.5">
                  {result.warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              ) : null}
              <ul className="space-y-1.5">
                {result.venue ? (
                  <li>
                    <AiPickRow
                      href={result.venue.href}
                      cover={result.venue.coverUrl}
                      icon={<Building2 className="w-4 h-4" />}
                      kind="Salle"
                      title={result.venue.title}
                      meta={[result.venue.orgName, result.venue.location, result.venue.capacity ? `${result.venue.capacity} places` : null]}
                      price={result.venue.estimatedFc}
                    />
                  </li>
                ) : null}
                {result.services.map((item) => {
                  const rental = isServiceRentalCategory(item.category);
                  return (
                    <li key={item.slug}>
                      <AiPickRow
                        href={item.href}
                        cover={item.coverUrl}
                        icon={rental ? <KeyRound className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                        kind={rental ? 'Location' : 'Métier'}
                        title={item.title}
                        meta={[item.categoryLabel, item.orgName, item.location]}
                        price={item.estimatedFc}
                      />
                    </li>
                  );
                })}
              </ul>
              <p className="text-[11px] text-muted">
                Catalogue lu : {result.catalog.venues} salles · {result.catalog.trades} métiers · {result.catalog.rentals} locations.
              </p>
              <Button
                onClick={() => onApply(result)}
                disabled={!result.venue && result.services.length === 0}
              >
                {applyLabel}
              </Button>
            </div>
          ) : loading ? (
            <p className="text-xs text-muted inline-flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Recherche dans le catalogue, puis recommandation…
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function AiPickRow({
  href,
  cover,
  icon,
  kind,
  title,
  meta,
  price,
}: {
  href: string;
  cover?: string | null;
  icon: React.ReactNode;
  kind: string;
  title: string;
  meta: Array<string | null | undefined>;
  price: number;
}) {
  return (
    <div className="flex items-center gap-3 rounded-[var(--radius-button)] border border-border px-2.5 py-2">
      <div className="w-11 h-11 rounded-lg overflow-hidden bg-surface-muted shrink-0">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover}
            alt={title ? `Visuel de ${title}` : 'Visuel du service'}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted">{icon}</div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase tracking-wider text-muted">{kind}</p>
        <Link href={href} className="text-sm font-semibold truncate block hover:text-primary">{title}</Link>
        <p className="text-[11px] text-muted truncate">{meta.filter(Boolean).join(' · ')}</p>
      </div>
      {price > 0 ? <span className="text-[11px] font-semibold shrink-0">{formatFc(price)}</span> : <span className="text-[11px] text-muted shrink-0">Sur devis</span>}
    </div>
  );
}
