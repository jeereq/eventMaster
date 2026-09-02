'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { BookmarkPlus, Building2, CalendarPlus, KeyRound, Loader2, Sparkles, UserPlus, Wand2 } from 'lucide-react';
import { api } from '@/lib/api';
import { Alert, Button, Input } from '@/components/ui';
import { cn } from '@/lib/cn';
import { formatFc } from '@/config/landingPricing';
import { LISTING_EVENT_TYPES, type ListingEventTypeId } from '@/lib/listingDetails';
import { isServiceRentalCategory, sizedMediaUrl } from '@/lib/marketplace';
import { communesForCity } from '@/lib/rdcCities';
import type { EventPlanAiPackage, EventPlanAiResult } from '@/lib/eventPlan';
import { snapshotPlanItems } from '@/lib/eventPlan';
import {
  applyServerAllowance,
  AI_ALLOWANCE_CHANGED,
  consumeAiSimulation,
  getAiSimulationAllowance,
  syncDeviceAiTokensWithBackend,
  type AiAllowance,
} from '@/lib/aiTokens';
import { useAuth } from '@/context/AuthContext';
import AiTokenPurchaseModal from '@/components/AiTokenPurchaseModal';
import AiSimulationCounter from '@/components/AiSimulationCounter';
import AiSimulationHistoryList from '@/components/AiSimulationHistoryList';
import {
  claimAiSimulationHistory,
  fetchAiSimulationHistory,
  historyItemToCache,
  readCachedAiSimulation,
  simulationEndpointBody,
  writeCachedAiSimulation,
  type AiSimulationHistoryItem,
} from '@/lib/aiSimulationHistory';

export type EventPrepAiDefaults = {
  eventType?: ListingEventTypeId;
  city?: string;
  commune?: string;
  guestCount?: number;
  eventDate?: string;
  eventTitle?: string;
  prompt?: string;
  budgetMaxFc?: number;
  keepVenueSlug?: string;
  keepServiceSlugs?: string[];
};

export default function EventPrepAiSimulator({
  defaults,
  applyLabel = 'Appliquer à la préparation',
  onApply,
  onApplyAll,
  onOpenListing,
  defaultOpen = false,
  embedded = false,
  preferDefaults = false,
  className,
  onAllowanceChange,
}: {
  defaults?: EventPrepAiDefaults;
  applyLabel?: string;
  onApply?: (pack: EventPlanAiPackage) => void;
  onApplyAll?: (packages: EventPlanAiPackage[]) => void;
  onOpenListing?: (target: { kind: 'venue' | 'service'; slug: string }) => void;
  defaultOpen?: boolean;
  embedded?: boolean;
  preferDefaults?: boolean;
  className?: string;
  onAllowanceChange?: (allowance: AiAllowance) => void;
}) {
  const { user, access } = useAuth();
  const isLoggedIn = Boolean(user);
  const canCreateEvents = Boolean(access?.canCreateEvents);
  const [open, setOpen] = useState(defaultOpen || embedded);
  const [eventType, setEventType] = useState<ListingEventTypeId>(defaults?.eventType || 'private');
  const [city, setCity] = useState(defaults?.city || '');
  const [commune, setCommune] = useState(defaults?.commune || '');
  const [guestCount, setGuestCount] = useState(defaults?.guestCount && defaults.guestCount > 0 ? String(defaults.guestCount) : '');
  const [budgetMaxFc, setBudgetMaxFc] = useState(defaults?.budgetMaxFc && defaults.budgetMaxFc > 0 ? String(defaults.budgetMaxFc) : '');
  const [eventDate, setEventDate] = useState(defaults?.eventDate?.slice(0, 10) || '');
  const [prompt, setPrompt] = useState(initialPrompt(defaults));
  const [keepVenue, setKeepVenue] = useState(Boolean(defaults?.keepVenueSlug));
  const [includeVenue, setIncludeVenue] = useState(true);
  const [includeTrades, setIncludeTrades] = useState(true);
  const [includeRentals, setIncludeRentals] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<EventPlanAiResult | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);
  const [allowance, setAllowance] = useState<AiAllowance>(getAiSimulationAllowance);
  const [history, setHistory] = useState<AiSimulationHistoryItem[]>([]);
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);
  const [saveBusy, setSaveBusy] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const communes = useMemo(() => communesForCity(city), [city]);
  const selected = result?.packages.find((pack) => pack.id === selectedId) || result?.packages[0] || null;
  const budgetValue = budgetMaxFc ? Number(budgetMaxFc) : 0;
  const leftover = selected && budgetValue > 0 ? budgetValue - selected.estimatedTotalFc : null;

  const publishAllowance = (next: AiAllowance) => {
    setAllowance(next);
    onAllowanceChange?.(next);
  };

  const applyCached = (
    cached: ReturnType<typeof historyItemToCache>,
    historyId?: string | null,
    openForm = false,
  ) => {
    if (cached.brief.eventType) setEventType(cached.brief.eventType as ListingEventTypeId);
    if (cached.brief.city != null) setCity(cached.brief.city);
    if (cached.brief.commune != null) setCommune(cached.brief.commune);
    if (cached.brief.guestCount) setGuestCount(String(cached.brief.guestCount));
    if (cached.brief.budgetMaxFc) setBudgetMaxFc(String(cached.brief.budgetMaxFc));
    if (cached.brief.eventDate) setEventDate(String(cached.brief.eventDate).slice(0, 10));
    if (cached.brief.prompt != null) setPrompt(cached.brief.prompt);
    setResult(cached.result);
    setSelectedId(cached.selectedId);
    setActiveHistoryId(historyId || null);
    setSaveMessage('');
    if (openForm || defaultOpen || embedded) setOpen(true);
  };

  const applyDefaults = (seed?: EventPrepAiDefaults) => {
    if (!seed) return;
    if (seed.eventType) setEventType(seed.eventType);
    if (seed.city != null) setCity(seed.city);
    if (seed.commune != null) setCommune(seed.commune);
    if (seed.guestCount && seed.guestCount > 0) setGuestCount(String(seed.guestCount));
    if (seed.budgetMaxFc && seed.budgetMaxFc > 0) setBudgetMaxFc(String(seed.budgetMaxFc));
    if (seed.eventDate) setEventDate(seed.eventDate.slice(0, 10));
    if (seed.keepVenueSlug) setKeepVenue(true);
    const nextPrompt = initialPrompt(seed);
    if (nextPrompt) setPrompt(nextPrompt);
  };

  useEffect(() => {
    publishAllowance(getAiSimulationAllowance());
    const cached = preferDefaults ? null : readCachedAiSimulation();
    if (cached) applyCached(cached);
    else if (preferDefaults) applyDefaults(defaults);
    void syncDeviceAiTokensWithBackend(api).then((synced) => {
      if (synced) publishAllowance(synced);
    });
    void (async () => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const items = token ? await claimAiSimulationHistory() : await fetchAiSimulationHistory();
      setHistory(items);
      if (!cached && !preferDefaults && items[0]) applyCached(historyItemToCache(items[0]), items[0].id);
    })();
    const onChange = () => publishAllowance(getAiSimulationAllowance());
    window.addEventListener(AI_ALLOWANCE_CHANGED, onChange);
    return () => window.removeEventListener(AI_ALLOWANCE_CHANGED, onChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!preferDefaults || !defaults) return;
    applyDefaults(defaults);
    setResult(null);
    setSelectedId(null);
    setActiveHistoryId(null);
    setSaveMessage('');
    setOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    preferDefaults,
    defaults?.eventType,
    defaults?.city,
    defaults?.commune,
    defaults?.guestCount,
    defaults?.budgetMaxFc,
    defaults?.eventDate,
    defaults?.eventTitle,
    defaults?.prompt,
  ]);

  const run = async () => {
    const current = getAiSimulationAllowance();
    if (!current.canSimulate) {
      setPurchaseModalOpen(true);
      setError('Plus de simulations disponibles. Rechargez 20 recherches pour continuer.');
      publishAllowance(current);
      return;
    }
    setLoading(true);
    setError('');
    setSaveMessage('');
    try {
      const data = (await api.post('/public/event-plan-ai', simulationEndpointBody({
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
      }))) as EventPlanAiResult & { historyId?: string; remaining?: number; allowance?: AiAllowance };
      const packages = Array.isArray(data.packages) ? data.packages : [];
      const nextResult = { ...data, packages };
      const nextSelected = packages[1]?.id || packages[0]?.id || null;
      setResult(nextResult);
      setSelectedId(nextSelected);
      if (data.allowance) {
        publishAllowance(applyServerAllowance(data.allowance));
      } else {
        publishAllowance(consumeAiSimulation());
      }
      writeCachedAiSimulation({
        brief: {
          prompt,
          eventType,
          city,
          commune,
          guestCount: guestCount ? Number(guestCount) : null,
          budgetMaxFc: budgetMaxFc ? Number(budgetMaxFc) : null,
          eventDate,
        },
        result: nextResult,
        selectedId: nextSelected,
        savedAt: new Date().toISOString(),
      });
      if (data.historyId) setActiveHistoryId(data.historyId);
      void fetchAiSimulationHistory().then(setHistory);
    } catch (err: unknown) {
      const status = err && typeof err === 'object' && 'status' in err
        ? Number((err as { status?: number }).status)
        : 0;
      if (status === 402) {
        setPurchaseModalOpen(true);
        void syncDeviceAiTokensWithBackend(api).then(publishAllowance);
      }
      setResult(null);
      setSelectedId(null);
      setError(err instanceof Error ? err.message : 'Simulation impossible.');
    } finally {
      setLoading(false);
    }
  };

  const saveSelectedPack = async () => {
    if (!selected) return;
    setSaveBusy(true);
    setSaveMessage('');
    try {
      const items = snapshotPlanItems(selected.venue ? [selected.venue, ...selected.services] : selected.services);
      await api.post('/marketplace/event-packs', {
        name: `${selected.label} · ${city || 'EventMaster'}`,
        eventType,
        budgetFc: budgetValue > 0 ? budgetValue : selected.estimatedTotalFc,
        city: city || undefined,
        guestCount: guestCount ? Number(guestCount) : undefined,
        eventDate: eventDate || undefined,
        source: 'search',
        styleLabel: selected.label,
        items,
      });
      setSaveMessage('Pack retenu. Vous le retrouvez dans Catalogue → Packs.');
    } catch (err: unknown) {
      setSaveMessage(err instanceof Error ? err.message : 'Impossible de retenir ce pack.');
    } finally {
      setSaveBusy(false);
    }
  };

  return (
    <section className={cn(
      embedded
        ? 'space-y-3'
        : 'rounded-[var(--radius-card)] border border-border bg-surface p-4 space-y-3',
      className,
    )}>
      {!embedded ? (
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <h3 className="text-sm font-semibold text-foreground tracking-tight inline-flex items-center gap-2">
              <Wand2 className="w-4 h-4 text-primary" />
              Simulation IA
            </h3>
            <p className="text-xs text-muted leading-relaxed">
              L’IA lit le catalogue EventMaster et propose <strong className="font-semibold text-foreground">3 packs</strong> — économique, équilibré, confort — comme la simulation par critères.
            </p>
          </div>
          <Button size="sm" variant={open ? 'secondary' : 'primary'} onClick={() => setOpen((value) => !value)} className="shrink-0">
            {open ? 'Masquer' : 'Brief'}
          </Button>
        </div>
      ) : null}

      <AiSimulationCounter
        allowance={allowance}
        onBuy={() => setPurchaseModalOpen(true)}
      />

      <AiSimulationHistoryList
        items={history}
        activeId={activeHistoryId}
        onRestore={(item) => applyCached(historyItemToCache(item), item.id, true)}
      />

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

          <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0 sm:flex-wrap no-scrollbar -mx-1 px-1">
            {LISTING_EVENT_TYPES.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setEventType(item.id)}
                className={cn(
                  'px-2.5 py-1 rounded-[var(--radius-button)] text-[11px] font-semibold border transition whitespace-nowrap shrink-0 sm:shrink',
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
              Prestataires
            </label>
            <label className="inline-flex items-center gap-1.5">
              <input type="checkbox" checked={includeRentals} onChange={(e) => setIncludeRentals(e.target.checked)} />
              Matériel & Équipements
            </label>
            {defaults?.keepVenueSlug ? (
              <label className="inline-flex items-center gap-1.5">
                <input type="checkbox" checked={keepVenue} onChange={(e) => setKeepVenue(e.target.checked)} />
                Garder la salle déjà retenue
              </label>
            ) : null}
          </div>

          <Button
            onClick={() => void run()}
            loading={loading}
            leftIcon={<Sparkles className="w-4 h-4" />}
            disabled={!allowance.canSimulate && !loading}
          >
            {allowance.canSimulate
              ? `Lancer la simulation (${allowance.totalRemaining} restante${allowance.totalRemaining > 1 ? 's' : ''})`
              : 'Recharger pour simuler'}
          </Button>
        </div>
      ) : null}

      {error ? (
        <Alert variant="error">
          <div className="space-y-2">
            <p>{error}</p>
            {error.toLowerCase().includes('aucune salle') || error.toLowerCase().includes('élargir') ? (
              <p className="text-[11px] opacity-90">
                Essayez une autre commune, toute la ville, ou un budget plus large.
              </p>
            ) : null}
          </div>
        </Alert>
      ) : null}

      {loading && !result?.packages.length ? (
        <p className="text-xs text-muted inline-flex items-center gap-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Recherche dans le catalogue, puis recommandation…
        </p>
      ) : null}

      {result?.packages.length ? (
        <div className="space-y-4 pt-2 border-t border-border">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
            <span className="font-bold text-foreground flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              3 Formules générées par l’IA selon votre budget
            </span>
            <span className="text-[11px] text-muted">
              {result.catalog.venues} salles · {result.catalog.trades} prestataires · {result.catalog.rentals} matériels
            </span>
          </div>

          {result.catalog.widenedCommune || (result.warnings && result.warnings.length > 0) ? (
            <p className="text-[11px] text-amber-800 dark:text-amber-200 bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20">
              {(result.warnings && result.warnings[0]) || 'Recherche élargie à toute la ville faute de fiches dans la commune.'}
            </p>
          ) : null}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3" role="radiogroup" aria-label="Propositions IA">
            {result.packages.map((pack) => {
              const active = (selected?.id || result.packages[0]?.id) === pack.id;
              const packLeftover = budgetValue > 0 ? budgetValue - pack.estimatedTotalFc : null;
              return (
                <button
                  key={pack.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setSelectedId(pack.id)}
                  className={cn(
                    'text-left rounded-2xl border p-4 space-y-2 transition flex flex-col justify-between h-full gap-2 cursor-pointer touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
                    active
                      ? 'border-primary bg-primary/10 shadow-md ring-2 ring-primary/30'
                      : 'border-border bg-surface hover:border-primary/40 opacity-85 hover:opacity-100',
                  )}
                >
                  <div className="space-y-1 w-full">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-surface border border-border text-foreground">
                        {pack.label}
                      </span>
                      {active && (
                        <span className="text-[10px] font-bold text-primary px-1.5 py-0.5 rounded bg-primary/15">
                          Sélectionné
                        </span>
                      )}
                    </div>
                    {pack.summary ? (
                      <p className="text-xs font-bold text-foreground leading-snug mt-1">{pack.summary}</p>
                    ) : null}
                    {pack.blurb ? (
                      <p className="text-[11px] text-muted leading-relaxed line-clamp-2">{pack.blurb}</p>
                    ) : null}
                  </div>

                  <div className="pt-2 border-t border-border/60 w-full mt-auto">
                    <p className="text-base font-black text-foreground tabular-nums">
                      {formatFc(pack.estimatedTotalFc)}
                    </p>
                    <p className="text-[10px] text-muted">
                      {pack.venue ? '1 salle' : 'Sans salle'} + {pack.services.length} prestataire{pack.services.length > 1 ? 's' : ''}
                    </p>
                    {packLeftover != null ? (
                      <p className={cn('text-[10px] font-semibold mt-0.5', packLeftover >= 0 ? 'text-emerald-600' : 'text-amber-700 dark:text-amber-300')}>
                        {packLeftover >= 0
                          ? `Reste ${formatFc(packLeftover)} vs budget`
                          : `Dépassement ${formatFc(Math.abs(packLeftover))}`}
                      </p>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>

          {selected && (
            <div className="p-4 rounded-2xl border border-primary/25 bg-surface space-y-3 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-border">
                <div>
                  <h4 className="text-xs font-bold text-foreground">
                    Composition détaillée du {selected.label}
                  </h4>
                  {selected.rationale && (
                    <p className="text-[11px] text-muted mt-0.5">{selected.rationale}</p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <span className="text-xs font-bold text-primary px-2.5 py-1 rounded-lg bg-primary/10 inline-block">
                    Total : {formatFc(selected.estimatedTotalFc)}
                  </span>
                  {leftover != null ? (
                    <p className={cn('text-[10px] font-semibold mt-1', leftover >= 0 ? 'text-emerald-600' : 'text-amber-700 dark:text-amber-300')}>
                      {leftover >= 0 ? `Reste ${formatFc(leftover)}` : `Dépassement ${formatFc(Math.abs(leftover))}`}
                    </p>
                  ) : null}
                </div>
              </div>

              <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {selected.venue ? (
                  <li>
                    <AiPickRow
                      href={selected.venue.href}
                      cover={selected.venue.coverUrl}
                      icon={<Building2 className="w-4 h-4" />}
                      kind="Salle"
                      title={selected.venue.title}
                      meta={[selected.venue.orgName, selected.venue.location]}
                      price={selected.venue.estimatedFc}
                      onOpen={onOpenListing ? () => onOpenListing({ kind: 'venue', slug: selected.venue!.slug }) : undefined}
                    />
                  </li>
                ) : null}
                {selected.services.map((item) => {
                  const rental = isServiceRentalCategory(item.category);
                  return (
                    <li key={item.slug}>
                      <AiPickRow
                        href={item.href}
                        cover={item.coverUrl}
                        icon={rental ? <KeyRound className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                        kind={rental ? 'Matériel' : 'Prestataire'}
                        title={item.title}
                        meta={[item.categoryLabel, item.orgName]}
                        price={item.estimatedFc}
                        onOpen={onOpenListing ? () => onOpenListing({ kind: 'service', slug: item.slug }) : undefined}
                      />
                    </li>
                  );
                })}
              </ul>

              {selected.warnings.length > 0 && (
                <ul className="space-y-1.5 text-[11px] text-amber-800 dark:text-amber-200 bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20">
                  {selected.warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              )}

              {onApply ? (
                <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-border">
                  <p className="text-[11px] text-muted">
                    Retenez cette formule pour enregistrer le devis et contacter les prestataires.
                  </p>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => selected && onApply(selected)}
                      disabled={!selected || (!selected.venue && selected.services.length === 0)}
                      fullWidth
                    >
                      {applyLabel}
                    </Button>
                    {onApplyAll && result?.packages.length ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => onApplyAll(result.packages)}
                      >
                        Tout appliquer
                      </Button>
                    ) : null}
                  </div>
                </div>
              ) : (
                <div className="pt-2 space-y-3 border-t border-border">
                  <p className="text-[11px] text-muted">
                    Rouvrir cet historique ne consomme pas de jeton. Les actions ci-dessous non plus.
                  </p>
                  {saveMessage ? (
                    <p className="text-[11px] font-medium text-foreground">{saveMessage}</p>
                  ) : null}
                  {isLoggedIn ? (
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button
                        size="sm"
                        variant="primary"
                        leftIcon={<BookmarkPlus className="w-3.5 h-3.5" />}
                        loading={saveBusy}
                        disabled={!selected.venue && selected.services.length === 0}
                        onClick={() => void saveSelectedPack()}
                      >
                        Retenir ce pack
                      </Button>
                      {canCreateEvents ? (
                        <Link href="/dashboard/events?create=1" className="w-full sm:w-auto">
                          <Button size="sm" variant="secondary" fullWidth leftIcon={<CalendarPlus className="w-3.5 h-3.5" />}>
                            Créer l’événement avec ce mix
                          </Button>
                        </Link>
                      ) : null}
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Link href="/register?kind=CLIENT&intent=seeker&action=ai_simulator" className="w-full sm:w-auto">
                        <Button size="sm" variant="primary" fullWidth leftIcon={<UserPlus className="w-3.5 h-3.5" />}>
                          Créer un compte pour retenir ce pack
                        </Button>
                      </Link>
                      <Button size="sm" variant="secondary" onClick={() => setPurchaseModalOpen(true)}>
                        Acheter 20 sims
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      ) : null}

      <AiTokenPurchaseModal
        open={purchaseModalOpen}
        onClose={() => setPurchaseModalOpen(false)}
        onSuccess={() => {
          void syncDeviceAiTokensWithBackend(api).then(publishAllowance);
        }}
      />
    </section>
  );
}

function initialPrompt(defaults?: EventPrepAiDefaults) {
  if (defaults?.prompt) return defaults.prompt;
  if (defaults?.eventTitle) return `Préparer « ${defaults.eventTitle} » avec un mix salle / prestataires / matériel & équipements.`;
  return '';
}

function AiPickRow({
  href,
  cover,
  icon,
  kind,
  title,
  meta,
  price,
  onOpen,
}: {
  href: string;
  cover?: string | null;
  icon: React.ReactNode;
  kind: string;
  title: string;
  meta: Array<string | null | undefined>;
  price: number;
  onOpen?: () => void;
}) {
  const body = (
    <>
      <div className="w-11 h-11 rounded-lg overflow-hidden bg-surface-muted shrink-0">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={sizedMediaUrl(cover, 96)}
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
        {onOpen ? (
          <span className="text-sm font-semibold truncate block hover:text-primary">{title}</span>
        ) : (
          <Link href={href} className="text-sm font-semibold truncate block hover:text-primary">{title}</Link>
        )}
        <p className="text-[11px] text-muted truncate">{meta.filter(Boolean).join(' · ')}</p>
      </div>
      {price > 0 ? <span className="text-[11px] font-semibold shrink-0">{formatFc(price)}</span> : <span className="text-[11px] text-muted shrink-0">Sur devis</span>}
    </>
  );

  if (onOpen) {
    return (
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onOpen();
        }}
        className="w-full flex items-center gap-3 rounded-[var(--radius-button)] border border-border px-2.5 py-2 min-h-11 text-left hover:border-primary/40 hover:bg-surface-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
      >
        {body}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-[var(--radius-button)] border border-border px-2.5 py-2">
      {body}
    </div>
  );
}
