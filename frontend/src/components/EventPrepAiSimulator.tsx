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
import type { EventPlanAiPackage, EventPlanAiResult } from '@/lib/eventPlan';

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
  onApplyAll,
  defaultOpen = false,
}: {
  defaults?: EventPrepAiDefaults;
  applyLabel?: string;
  onApply: (pack: EventPlanAiPackage) => void;
  onApplyAll?: (packages: EventPlanAiPackage[]) => void;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
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
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const communes = useMemo(() => communesForCity(city), [city]);
  const selected = result?.packages.find((pack) => pack.id === selectedId) || result?.packages[0] || null;

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
      const packages = Array.isArray(data.packages) ? data.packages : [];
      setResult({ ...data, packages });
      setSelectedId(packages[1]?.id || packages[0]?.id || null);
      if (packages.length && onApplyAll) onApplyAll(packages);
    } catch (err: unknown) {
      setResult(null);
      setSelectedId(null);
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
            L’IA lit le catalogue EventMaster et propose <strong className="font-semibold text-foreground">3 packs</strong> — économique, équilibré, confort — comme la simulation par critères.
          </p>
        </div>
        <Button size="sm" variant={open ? 'secondary' : 'primary'} onClick={() => setOpen((value) => !value)}>
          {open ? 'Masquer le brief' : 'Ouvrir le brief'}
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

          <Button onClick={() => void run()} loading={loading} leftIcon={<Sparkles className="w-4 h-4" />}>
            Lancer la simulation
          </Button>
        </div>
      ) : null}

      {error ? <Alert variant="error">{error}</Alert> : null}

      {loading && !result?.packages.length ? (
        <p className="text-xs text-muted inline-flex items-center gap-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Recherche dans le catalogue, puis recommandation…
        </p>
      ) : null}

      {result?.packages.length ? (
        <div className="space-y-3">
          <p className="text-xs text-muted">
            {result.packages.length} proposition{result.packages.length > 1 ? 's' : ''} · catalogue : {result.catalog.venues} salles · {result.catalog.trades} métiers · {result.catalog.rentals} locations.
          </p>
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-3" role="radiogroup" aria-label="Propositions IA">
            {result.packages.map((pack) => {
              const active = selected?.id === pack.id;
              return (
                <article
                  key={pack.id}
                  role="radio"
                  aria-checked={active}
                  tabIndex={0}
                  onClick={() => setSelectedId(pack.id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      setSelectedId(pack.id);
                    }
                  }}
                  className={cn(
                    'text-left rounded-2xl border p-3.5 space-y-2.5 transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
                    active
                      ? 'border-primary bg-primary/8 ring-1 ring-primary/25'
                      : 'border-border bg-surface hover:border-primary/40',
                  )}
                >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-foreground">{pack.label}</p>
                          {pack.blurb ? <p className="text-[11px] text-muted mt-0.5 leading-relaxed">{pack.blurb}</p> : null}
                        </div>
                        <p className="text-sm font-bold shrink-0 tabular-nums">{formatFc(pack.estimatedTotalFc)}</p>
                      </div>
                      {pack.summary ? (
                        <p className="text-xs text-foreground leading-relaxed line-clamp-3">{pack.summary}</p>
                      ) : null}
                      <ul className="space-y-1">
                        {pack.venue ? (
                          <li>
                            <AiPickRow
                              href={pack.venue.href}
                              cover={pack.venue.coverUrl}
                              icon={<Building2 className="w-4 h-4" />}
                              kind="Salle"
                              title={pack.venue.title}
                              meta={[pack.venue.orgName, pack.venue.location]}
                              price={pack.venue.estimatedFc}
                            />
                          </li>
                        ) : null}
                        {pack.services.slice(0, 4).map((item) => {
                          const rental = isServiceRentalCategory(item.category);
                          return (
                            <li key={item.slug}>
                              <AiPickRow
                                href={item.href}
                                cover={item.coverUrl}
                                icon={rental ? <KeyRound className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                                kind={rental ? 'Location' : 'Métier'}
                                title={item.title}
                                meta={[item.categoryLabel, item.orgName]}
                                price={item.estimatedFc}
                              />
                            </li>
                          );
                        })}
                        {pack.services.length > 4 ? (
                          <li className="text-[11px] text-muted px-1">+{pack.services.length - 4} autre{pack.services.length - 4 > 1 ? 's' : ''}</li>
                        ) : null}
                      </ul>
                      {pack.warnings.length > 0 ? (
                        <p className="text-[11px] text-amber-800 dark:text-amber-200 line-clamp-2">{pack.warnings[0]}</p>
                      ) : null}
                    </article>
                  );
                })}
              </div>
          {selected?.rationale ? (
            <p className="text-xs text-muted leading-relaxed">{selected.rationale}</p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => selected && onApply(selected)}
              disabled={!selected || (!selected.venue && selected.services.length === 0)}
            >
              {applyLabel}
            </Button>
            {onApplyAll && result.packages.length > 1 ? (
              <Button variant="secondary" onClick={() => onApplyAll(result.packages)}>
                Retenir les {result.packages.length} propositions
              </Button>
            ) : null}
          </div>
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
