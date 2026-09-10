'use client';

import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ChevronDown, Sparkles, Wand2, Clock, PlusCircle, Check, ArrowRight, DollarSign } from 'lucide-react';
import { api } from '@/lib/api';
import { Alert, Button, Input } from '@/components/ui';
import { cn } from '@/lib/cn';
import { formatFc } from '@/config/landingPricing';
import { LISTING_EVENT_TYPES, VENUE_AMENITIES, type ListingAmenityId, type ListingEventTypeId } from '@/lib/listingDetails';
import { SERVICE_CATEGORY_LABELS, type ServiceCategory } from '@/lib/marketplace';
import { communesForCity } from '@/lib/rdcCities';
import { enabledMarketplaceCities, resolveUsdExchangeRateCdf } from '@/lib/platformCities';
import type { EventPlanAiPackage, EventPlanAiResult } from '@/lib/eventPlan';
import { snapshotPlanItems } from '@/lib/eventPlan';
import {
  applyServerAllowance,
  AI_ALLOWANCE_CHANGED,
  consumeAiSimulation,
  getAiSimulationAllowance,
  createEmptyAiAllowance,
  aiTokenBalanceLabel,
  syncDeviceAiTokensWithBackend,
  type AiAllowance,
} from '@/lib/aiTokens';
import { useAuth } from '@/context/AuthContext';
import { usePlatformSite } from '@/context/PlatformSiteContext';
import AiTokenPurchaseModal from '@/components/AiTokenPurchaseModal';
import AiTokenBuyButton from '@/components/AiTokenBuyButton';
import { AiBudgetFullscreenLoader } from '@/components/AiComposeFullscreenLoader';
import AiSimulationCounter from '@/components/AiSimulationCounter';
import AiSimulationHistoryList from '@/components/AiSimulationHistoryList';
import AiSimulationPackModal from '@/components/AiSimulationPackModal';
import {
  claimAiSimulationHistory,
  fetchAiSimulationHistory,
  historyItemToCache,
  readCachedAiSimulation,
  simulationEndpointBody,
  writeCachedAiSimulation,
} from '@/lib/aiSimulationHistory';
import {
  AI_AMBIANCES,
  AI_MOMENTS,
  AI_SETTINGS,
  suggestedCategoriesForEvent,
  type AiAmbianceId,
  type AiMomentId,
  type AiSettingId,
} from '@/lib/aiSimulationCriteria';
import { StudioAiTabs, StudioHowTo, studioAiTabPanelId, type StudioAiTabId } from '@/components/StudioAiTabs';
import { EVENT_PREP_PROMPT_MODELS } from '@/config/eventPrepPromptModels';
import { playAiGenerationCompleteSound, unlockAudioNotifications } from '@/lib/audioNotifications';

const VENUE_PARAM_AMENITIES = VENUE_AMENITIES.filter((item) =>
  ['parking', 'ac', 'generator', 'garden', 'sound', 'wifi', 'stage', 'security'].includes(item.id),
);

const FIELD_LABEL = 'text-xs font-semibold text-muted';
const NATIVE_FIELD =
  'w-full min-h-11 rounded-[var(--radius-button)] border border-border bg-surface-muted dark:bg-background px-3.5 py-2.5 text-base sm:text-sm text-foreground placeholder:text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:border-primary';
const CHIP =
  'inline-flex items-center justify-center min-h-11 px-3 rounded-[var(--radius-button)] text-xs font-semibold border transition whitespace-nowrap shrink-0 sm:shrink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40';

function chipTone(active: boolean) {
  return active
    ? 'bg-primary-solid text-primary-foreground border-primary-solid'
    : 'border-border text-muted hover:text-foreground';
}

export type EventPrepAiDefaults = {
  eventType?: ListingEventTypeId;
  city?: string;
  commune?: string;
  guestCount?: number;
  eventDate?: string;
  eventTitle?: string;
  prompt?: string;
  budgetMaxUsd?: number;
  budgetMaxFc?: number;
  keepVenueSlug?: string;
  keepServiceSlugs?: string[];
};

const GUEST_PRESETS = [50, 100, 150, 250, 500];
const BUDGET_PRESETS_USD = [800, 1500, 3000, 5000, 10000];
const BUDGET_PRESETS_CDF = [2500000, 5000000, 8500000, 15000000, 30000000];

export default function EventPrepAiSimulator({
  defaults,
  applyLabel = 'Appliquer à la préparation',
  onApply,
  onApplyAll,
  onOpenListing,
  defaultOpen = false,
  embedded = false,
  preferDefaults = false,
  openPurchaseOnMount = false,
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
  openPurchaseOnMount?: boolean;
  className?: string;
  onAllowanceChange?: (allowance: AiAllowance) => void;
}) {
  const { user, access } = useAuth();
  const isLoggedIn = Boolean(user);
  const canCreateEvents = Boolean(access?.canCreateEvents);
  const tabsId = useId();
  const citySelectRef = useRef<HTMLSelectElement>(null);
  const [open, setOpen] = useState(defaultOpen || embedded);
  const [activeTab, setActiveTab] = useState<StudioAiTabId>('create');
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [packModalOpen, setPackModalOpen] = useState(false);
  const { site } = usePlatformSite();
  const exchangeRate = resolveUsdExchangeRateCdf(site?.usdExchangeRateCdf);
  const marketplaceCities = enabledMarketplaceCities(site);

  const [eventType, setEventType] = useState<ListingEventTypeId>(defaults?.eventType || 'private');
  const [city, setCity] = useState(defaults?.city || '');
  const [commune, setCommune] = useState(defaults?.commune || '');
  const [guestCount, setGuestCount] = useState(defaults?.guestCount && defaults.guestCount > 0 ? String(defaults.guestCount) : '');
  const [budgetCurrency, setBudgetCurrency] = useState<'USD' | 'CDF'>('USD');
  const [budgetInputVal, setBudgetInputVal] = useState(() => {
    if (defaults?.budgetMaxUsd && defaults.budgetMaxUsd > 0) return String(defaults.budgetMaxUsd);
    if (defaults?.budgetMaxFc && defaults.budgetMaxFc > 0) return String(Math.round(defaults.budgetMaxFc / exchangeRate));
    return '';
  });
  const [budgetMinInputVal, setBudgetMinInputVal] = useState('');
  const [eventDate, setEventDate] = useState(defaults?.eventDate?.slice(0, 10) || '');

  useEffect(() => {
    if (city && !marketplaceCities.includes(city as (typeof marketplaceCities)[number])) {
      setCity('');
      setCommune('');
    }
  }, [city, marketplaceCities]);

  const [prompt, setPrompt] = useState(initialPrompt(defaults));
  const [ambiance, setAmbiance] = useState<AiAmbianceId | ''>('');
  const [moment, setMoment] = useState<AiMomentId | ''>('');
  const [setting, setSetting] = useState<AiSettingId | ''>('');
  const [wantedCategories, setWantedCategories] = useState<ServiceCategory[]>([]);
  const [venueAmenities, setVenueAmenities] = useState<ListingAmenityId[]>([]);
  const [keepVenue, setKeepVenue] = useState(Boolean(defaults?.keepVenueSlug));
  const [includeVenue, setIncludeVenue] = useState(true);
  const [includeTrades, setIncludeTrades] = useState(true);
  const [includeRentals, setIncludeRentals] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cityError, setCityError] = useState('');
  const [result, setResult] = useState<EventPlanAiResult | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [purchaseModalOpen, setPurchaseModalOpen] = useState(openPurchaseOnMount);
  const [allowance, setAllowance] = useState<AiAllowance>(createEmptyAiAllowance);
  const [history, setHistory] = useState<Awaited<ReturnType<typeof fetchAiSimulationHistory>>>([]);
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);
  const [saveBusy, setSaveBusy] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const communes = useMemo(() => communesForCity(city), [city]);
  const categoryChoices = useMemo(() => suggestedCategoriesForEvent(eventType), [eventType]);
  const selected = result?.packages.find((pack) => pack.id === selectedId) || result?.packages[0] || null;

  const { budgetMaxUsdCalculated, budgetMaxFcCalculated } = useMemo(() => {
    const raw = String(budgetInputVal || '').replace(/\s+/g, '').replace(',', '.');
    const parsed = parseFloat(raw);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return { budgetMaxUsdCalculated: 0, budgetMaxFcCalculated: 0 };
    }
    if (budgetCurrency === 'USD') {
      return {
        budgetMaxUsdCalculated: Math.round(parsed),
        budgetMaxFcCalculated: Math.round(parsed * exchangeRate),
      };
    } else {
      return {
        budgetMaxUsdCalculated: Math.round(parsed / exchangeRate),
        budgetMaxFcCalculated: Math.round(parsed),
      };
    }
  }, [budgetInputVal, budgetCurrency, exchangeRate]);

  const { budgetMinUsdCalculated, budgetMinFcCalculated } = useMemo(() => {
    const raw = String(budgetMinInputVal || '').replace(/\s+/g, '').replace(',', '.');
    const parsed = parseFloat(raw);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return { budgetMinUsdCalculated: 0, budgetMinFcCalculated: 0 };
    }
    if (budgetCurrency === 'USD') {
      return {
        budgetMinUsdCalculated: Math.round(parsed),
        budgetMinFcCalculated: Math.round(parsed * exchangeRate),
      };
    } else {
      return {
        budgetMinUsdCalculated: Math.round(parsed / exchangeRate),
        budgetMinFcCalculated: Math.round(parsed),
      };
    }
  }, [budgetMinInputVal, budgetCurrency, exchangeRate]);

  const handleCurrencySwitch = (next: 'USD' | 'CDF') => {
    if (next === budgetCurrency) return;
    setBudgetCurrency(next);
    if (budgetMaxUsdCalculated > 0) {
      setBudgetInputVal(next === 'CDF' ? String(budgetMaxFcCalculated) : String(budgetMaxUsdCalculated));
    }
    if (budgetMinUsdCalculated > 0) {
      setBudgetMinInputVal(next === 'CDF' ? String(budgetMinFcCalculated) : String(budgetMinUsdCalculated));
    }
  };

  const parsedGuestCount = Number(guestCount) || 0;
  const guestRatio = useMemo(() => {
    if (parsedGuestCount <= 0 || budgetMaxFcCalculated <= 0) return null;
    const perGuestUsd = Math.round(budgetMaxUsdCalculated / parsedGuestCount);
    const perGuestFc = Math.round(budgetMaxFcCalculated / parsedGuestCount);
    let advice = 'Budget équilibré : buffet complet, sono, déco et reportage';
    let tone: 'emerald' | 'amber' | 'primary' = 'primary';
    if (perGuestUsd < 15) {
      advice = 'Budget serré ou cocktail : idéal pour une réception intime ou salle économique';
      tone = 'amber';
    } else if (perGuestUsd >= 35) {
      advice = 'Budget confort & prestige : dîner assis, déco soignée et prestataires premium';
      tone = 'emerald';
    }
    return { perGuestUsd, perGuestFc, advice, tone };
  }, [parsedGuestCount, budgetMaxUsdCalculated, budgetMaxFcCalculated]);

  const budgetValue = budgetMaxFcCalculated;

  const publishAllowance = (next: AiAllowance) => {
    setAllowance(next);
    onAllowanceChange?.(next);
  };

  const criteriaFromCache = (cached: ReturnType<typeof historyItemToCache>) => {
    const fromResult = cached.result.criteria || {};
    const fromBrief = cached.brief;
    setAmbiance((fromBrief.ambiance || fromResult.ambiance || '') as AiAmbianceId | '');
    setMoment((fromBrief.moment || fromResult.moment || '') as AiMomentId | '');
    setSetting((fromBrief.setting || fromResult.setting || '') as AiSettingId | '');
    const min = fromBrief.budgetMinFc ?? fromResult.budgetMinFc;
    if (min && Number(min) > 0) {
      if (budgetCurrency === 'USD') {
        setBudgetMinInputVal(String(Math.round(Number(min) / exchangeRate)));
      } else {
        setBudgetMinInputVal(String(Math.round(Number(min))));
      }
    } else {
      setBudgetMinInputVal('');
    }
    const cats = fromBrief.wantedCategories || fromResult.wantedCategories || [];
    setWantedCategories(cats.filter((id): id is ServiceCategory => Boolean(id)));
    const amenities = fromBrief.venueAmenities || fromResult.venueAmenities || [];
    setVenueAmenities(amenities.filter((id): id is ListingAmenityId => Boolean(id)));
    if (cats.length || amenities.length) {
      setAdvancedOpen(true);
    }
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
    if (cached.brief.budgetMaxFc) {
      if (budgetCurrency === 'USD') {
        setBudgetInputVal(String(Math.round(Number(cached.brief.budgetMaxFc) / exchangeRate)));
      } else {
        setBudgetInputVal(String(Math.round(Number(cached.brief.budgetMaxFc))));
      }
    } else if (cached.brief.budgetMaxUsd) {
      if (budgetCurrency === 'USD') {
        setBudgetInputVal(String(cached.brief.budgetMaxUsd));
      } else {
        setBudgetInputVal(String(Math.round(Number(cached.brief.budgetMaxUsd) * exchangeRate)));
      }
    }
    if (cached.brief.eventDate) setEventDate(String(cached.brief.eventDate).slice(0, 10));
    if (cached.brief.prompt != null) setPrompt(cached.brief.prompt);
    criteriaFromCache(cached);
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
    if (seed.budgetMaxUsd && seed.budgetMaxUsd > 0) {
      if (budgetCurrency === 'USD') {
        setBudgetInputVal(String(seed.budgetMaxUsd));
      } else {
        setBudgetInputVal(String(Math.round(seed.budgetMaxUsd * exchangeRate)));
      }
    } else if (seed.budgetMaxFc && seed.budgetMaxFc > 0) {
      if (budgetCurrency === 'CDF') {
        setBudgetInputVal(String(seed.budgetMaxFc));
      } else {
        setBudgetInputVal(String(Math.round(seed.budgetMaxFc / exchangeRate)));
      }
    }
    if (seed.eventDate) setEventDate(seed.eventDate.slice(0, 10));
    if (seed.keepVenueSlug) setKeepVenue(true);
    const nextPrompt = initialPrompt(seed);
    if (nextPrompt) setPrompt(nextPrompt);
  };

  const currentCriteria = () => ({
    ambiance: ambiance || undefined,
    moment: moment || undefined,
    setting: setting || undefined,
    neighborhood: undefined,
    budgetMinFc: budgetMinFcCalculated > 0 ? budgetMinFcCalculated : null,
    budgetMinUsd: budgetMinUsdCalculated > 0 ? budgetMinUsdCalculated : undefined,
    wantedCategories,
    venueAmenities,
  });

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
    setPackModalOpen(false);
    setOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    preferDefaults,
    defaults?.eventType,
    defaults?.city,
    defaults?.commune,
    defaults?.guestCount,
    defaults?.budgetMaxUsd,
    defaults?.budgetMaxFc,
    defaults?.eventDate,
    defaults?.eventTitle,
    defaults?.prompt,
    exchangeRate,
  ]);

  const run = async () => {
    if (loading) return;
    if (!city.trim()) {
      setCityError('Choisissez une ville pour composer les packs du catalogue local.');
      setError('');
      setActiveTab('create');
      citySelectRef.current?.focus();
      return;
    }
    setCityError('');
    const current = getAiSimulationAllowance();
    if (!current.canSimulate) {
      setPurchaseModalOpen(true);
      setError('Plus de simulations disponibles. Rechargez des jetons de recherche pour continuer.');
      publishAllowance(current);
      return;
    }
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      setError('Vous semblez hors ligne. Vérifiez votre connexion Internet puis réessayez.');
      return;
    }
    unlockAudioNotifications();
    setLoading(true);
    setError('');
    setSaveMessage('');
    try {
      const criteria = currentCriteria();
      const data = (await api.post('/public/event-plan-ai', simulationEndpointBody({
        eventType,
        city,
        commune,
        guestCount: guestCount ? Number(guestCount) : undefined,
        budgetMaxFc: budgetMaxFcCalculated > 0 ? budgetMaxFcCalculated : undefined,
        budgetMaxUsd: budgetMaxUsdCalculated > 0 ? budgetMaxUsdCalculated : undefined,
        eventDate: eventDate || undefined,
        prompt: prompt.trim() || undefined,
        includeVenue,
        includeTrades,
        includeRentals,
        keepVenueSlug: keepVenue ? defaults?.keepVenueSlug : undefined,
        keepServiceSlugs: defaults?.keepServiceSlugs || [],
        ...criteria,
      }))) as EventPlanAiResult & { historyId?: string; remaining?: number; allowance?: AiAllowance };
      const packages = Array.isArray(data.packages) ? data.packages : [];
      const nextResult = { ...data, packages, criteria };
      const nextSelected = packages[1]?.id || packages[0]?.id || null;
      setResult(nextResult);
      setSelectedId(nextSelected);
      setPackModalOpen(true);
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
          budgetMaxFc: budgetMaxFcCalculated > 0 ? budgetMaxFcCalculated : null,
          budgetMaxUsd: budgetMaxUsdCalculated > 0 ? budgetMaxUsdCalculated : null,
          eventDate,
          ...criteria,
        },
        result: nextResult,
        selectedId: nextSelected,
        savedAt: new Date().toISOString(),
      });
      if (data.historyId) setActiveHistoryId(data.historyId);
      void fetchAiSimulationHistory().then(setHistory);
      playAiGenerationCompleteSound();
    } catch (err: unknown) {
      const status = err && typeof err === 'object' && 'status' in err
        ? Number((err as { status?: number }).status)
        : 0;
      if (status === 402) {
        setPurchaseModalOpen(true);
        void syncDeviceAiTokensWithBackend(api).then(publishAllowance);
        setError('Solde de simulations épuisé. Rechargez pour générer de nouveaux packs.');
      } else if (status === 429) {
        setError('Trop de requêtes simultanées. Veuillez patienter une minute avant de relancer.');
      } else if (status === 503 || status === 504) {
        setError('Le service d’estimation IA est temporairement saturé. Veuillez réessayer dans un instant.');
      } else if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        setError('Connexion interrompue. Vérifiez votre accès Internet puis réessayez.');
      } else {
        setError(err instanceof Error ? err.message : 'Simulation impossible. Réessayez dans un instant.');
      }
      setResult(null);
      setSelectedId(null);
    } finally {
      setLoading(false);
    }
  };

  const saveSelectedPack = async () => {
    if (!selected || saveBusy) return;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      setError('Connexion indisponible. Vérifiez votre accès Internet pour sauvegarder ce pack.');
      return;
    }
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

  const toggleChip = <T extends string>(value: T, current: T | '', set: (next: T | '') => void) => {
    set(current === value ? '' : value);
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
              <Wand2 className="w-4 h-4 text-primary-solid" aria-hidden />
              Simulation IA
            </h3>
            <p className="text-xs text-muted leading-relaxed">
              Ville, date et budget — l’IA propose <strong className="font-semibold text-foreground">3 packs</strong> (éco, équilibré, confort). Ce n’est pas un plan de salle.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
            {!allowance.unlimited ? (
              <AiTokenBuyButton
                compact
                variant={allowance.canSimulate ? 'secondary' : 'primary'}
                onClick={() => setPurchaseModalOpen(true)}
              />
            ) : null}
            <Button
              size="sm"
              variant={open ? 'secondary' : 'primary'}
              onClick={() => setOpen((value) => !value)}
              className="shrink-0"
              aria-expanded={open}
            >
              {open ? 'Masquer le brief' : 'Ouvrir le brief'}
            </Button>
          </div>
        </div>
      ) : null}

      <AiSimulationCounter
        allowance={allowance}
        onBuy={() => setPurchaseModalOpen(true)}
      />

      {/* ─── Barre d'onglets : Création / Historiques / Prompts ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
        <StudioAiTabs
          value={activeTab}
          onChange={setActiveTab}
          historyCount={history.length}
          idPrefix={tabsId}
          className="w-full sm:w-auto sm:min-w-[22rem]"
        />

        {(embedded && !allowance.unlimited) || (activeTab === 'history' && history.length > 0) ? (
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
            {embedded && !allowance.unlimited ? (
              <AiTokenBuyButton
                compact
                variant={allowance.canSimulate ? 'secondary' : 'primary'}
                onClick={() => setPurchaseModalOpen(true)}
              />
            ) : null}
            {activeTab === 'history' && history.length > 0 ? (
              <button
                type="button"
                onClick={() => setActiveTab('create')}
                className="min-h-11 px-3 text-xs font-semibold text-primary-solid hover:underline inline-flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-[var(--radius-button)]"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Nouvelle simulation</span>
              </button>
            ) : null}
        </div>
      ) : null}
      </div>

      {activeTab === 'prompts' ? (
        <div
          role="tabpanel"
          id={studioAiTabPanelId(tabsId, 'prompts')}
          aria-labelledby={`${tabsId}-tab-prompts`}
          className="space-y-3 pt-1"
        >
          <p className="text-xs text-muted">
            Un bouton préremplit le brief, le type d’événement et le budget. Ajustez ensuite ville et date.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {EVENT_PREP_PROMPT_MODELS.map((model) => {
              const selected = prompt.trim() === model.prompt.trim();
              return (
                <button
                  key={model.id}
                  type="button"
                  onClick={() => {
                    setCommune('');
                    applyDefaults({
                      eventType: model.eventType,
                      city: model.city,
                      guestCount: model.guestCount,
                      budgetMaxUsd: model.budgetMaxUsd,
                      prompt: model.prompt,
                    });
                    setActiveTab('create');
                  }}
                  className={cn(
                    'text-left min-h-11 p-3 rounded-[var(--radius-card)] border transition',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                    selected
                      ? 'border-primary bg-primary/10'
                      : 'border-border bg-surface hover:border-primary/40',
                  )}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-foreground">{model.title}</span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/20 shrink-0">
                      {model.badge}
                    </span>
                  </span>
                  <span className="block text-xs text-muted mt-1 leading-snug">{model.summary}</span>
                  <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary">
                    {selected ? <Check className="w-3.5 h-3.5" /> : null}
                    {selected ? 'Prérempli' : 'Préremplir'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : activeTab === 'history' ? (
        <div
          role="tabpanel"
          id={studioAiTabPanelId(tabsId, 'history')}
          aria-labelledby={`${tabsId}-tab-history`}
          className="space-y-3 pt-1"
        >
          {history.length > 0 ? (
            <AiSimulationHistoryList
              items={history}
              activeId={activeHistoryId}
              onOpen={(item) => {
                applyCached(historyItemToCache(item), item.id, true);
                setPackModalOpen(true);
              }}
            />
          ) : (
            <div className="py-10 px-4 text-center rounded-[var(--radius-card)] border border-dashed border-border bg-surface-muted/30 space-y-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
                <Clock className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-foreground">Aucun historique de simulation</h4>
                <p className="text-xs text-muted max-w-sm mx-auto leading-relaxed">
                  Toutes vos simulations passées s’enregistreront automatiquement ici pour vous permettre de réexaminer les packs proposés.
                </p>
              </div>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setActiveTab('create')}
                leftIcon={<Wand2 className="w-3.5 h-3.5" />}
              >
                Créer une première simulation
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div
          role="tabpanel"
          id={studioAiTabPanelId(tabsId, 'create')}
          aria-labelledby={`${tabsId}-tab-create`}
          className="space-y-3"
        >
          <StudioHowTo
            steps={[
              'Indiquez ville, date et budget',
              'Générez 3 packs (éco, équilibré, confort)',
              'Retenez un pack avant de réserver',
            ]}
          />
          {open ? (
        <div className="space-y-3">
          <label className="space-y-1 block">
            <span className={FIELD_LABEL}>Décrivez votre événement</span>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
              placeholder="Ex. mariage 120 personnes à Gombe, ambiance chic, besoin traiteur + DJ + habits…"
              className={cn(NATIVE_FIELD, 'resize-y min-h-[4.5rem] py-2.5')}
            />
            <p className="text-xs text-muted">
              Mariages coutumiers Kongo, Luba, Mongo, Lunda :{' '}
              <button type="button" className="font-bold text-primary hover:underline" onClick={() => setActiveTab('prompts')}>
                onglet Prompts
              </button>
              .
            </p>
          </label>

          <div
            className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0 sm:flex-wrap no-scrollbar -mx-1 px-1"
            role="group"
            aria-label="Type d’événement"
          >
            {LISTING_EVENT_TYPES.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={eventType === item.id}
                onClick={() => setEventType(item.id)}
                className={cn(
                  CHIP,
                  chipTone(eventType === item.id),
                )}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            <label className="space-y-1">
              <span className={FIELD_LABEL}>Ville</span>
              <select
                ref={citySelectRef}
                value={city}
                aria-invalid={cityError ? true : undefined}
                aria-describedby={cityError ? `${tabsId}-city-error` : undefined}
                onChange={(e) => {
                  setCity(e.target.value);
                  setCommune('');
                  setCityError('');
                }}
                className={cn(NATIVE_FIELD, cityError && 'border-danger/40 focus-visible:border-danger')}
              >
                <option value="">Choisir une ville</option>
                {marketplaceCities.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
              {cityError ? (
                <p id={`${tabsId}-city-error`} className="text-xs text-danger font-medium" role="alert">
                  {cityError}
                </p>
              ) : null}
            </label>
            <label className="space-y-1">
              <span className={FIELD_LABEL}>Commune</span>
              <select
                value={commune}
                onChange={(e) => setCommune(e.target.value)}
                className={NATIVE_FIELD}
              >
                <option value="">Toutes</option>
                {communes.map((item) => (
                  <option key={item.name} value={item.name}>{item.name}</option>
                ))}
              </select>
            </label>
            <div className="space-y-1.5">
              <Input
                label="Invités"
                type="number"
                min={1}
                value={guestCount}
                onChange={(e) => setGuestCount(e.target.value)}
                placeholder="120"
              />
              <div className="flex flex-wrap gap-1 items-center" role="group" aria-label="Raccourcis nombre d'invités">
                <span className="text-[11px] text-muted mr-0.5 font-medium">Rapide :</span>
                {GUEST_PRESETS.map((count) => {
                  const active = guestCount === String(count);
                  return (
                    <button
                      key={count}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setGuestCount(String(count))}
                      className={cn(
                        'text-xs font-semibold px-2.5 py-1 min-h-[36px] min-w-[36px] rounded-full border transition cursor-pointer touch-manipulation inline-flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                        active
                          ? 'border-primary bg-primary text-white shadow-2xs'
                          : 'border-border bg-surface-muted/50 text-foreground hover:border-primary/50 hover:bg-surface',
                      )}
                    >
                      {count}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <Input
                label="Date"
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
              />
            </div>
          </div>

          {/* Bloc Budget Max intuitif */}
          <div className="rounded-[var(--radius-card)] border border-border bg-surface p-3.5 space-y-2.5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="space-y-0.5">
                <span className={FIELD_LABEL}>Budget maximum</span>
                <p className="text-[11px] text-muted">
                  Saisissez directement en dollars ou en francs congolais
                </p>
              </div>

              {/* Devise USD / CDF */}
              <div
                className="inline-flex rounded-lg p-0.5 bg-surface-muted border border-border text-xs"
                role="group"
                aria-label="Devise du budget"
              >
                <button
                  type="button"
                  onClick={() => handleCurrencySwitch('USD')}
                  className={cn(
                    'px-2.5 py-1 font-bold rounded-md text-xs transition cursor-pointer',
                    budgetCurrency === 'USD'
                      ? 'bg-primary text-white shadow-2xs'
                      : 'text-muted hover:text-foreground',
                  )}
                >
                  $ USD
                </button>
                <button
                  type="button"
                  onClick={() => handleCurrencySwitch('CDF')}
                  className={cn(
                    'px-2.5 py-1 font-bold rounded-md text-xs transition cursor-pointer',
                    budgetCurrency === 'CDF'
                      ? 'bg-primary text-white shadow-2xs'
                      : 'text-muted hover:text-foreground',
                  )}
                >
                  FC (CDF)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2 items-start">
              <Input
                label=""
                type="number"
                min={1}
                value={budgetInputVal}
                onChange={(e) => setBudgetInputVal(e.target.value)}
                placeholder={budgetCurrency === 'USD' ? 'Ex. 2 500' : 'Ex. 7 000 000'}
                aria-label={budgetCurrency === 'USD' ? 'Budget maximum en dollars' : 'Budget maximum en francs congolais'}
              />
              <div className="sm:self-center px-3 py-2 rounded-[var(--radius-card)] bg-surface-muted border border-border/80 text-xs text-muted flex items-center justify-between sm:justify-start gap-2">
                <span>Équivalent :</span>
                <span className="font-extrabold text-primary-solid tabular-nums">
                  {budgetCurrency === 'USD'
                    ? (budgetMaxFcCalculated > 0 ? `${budgetMaxFcCalculated.toLocaleString('fr-FR')} FC` : '—')
                    : (budgetMaxUsdCalculated > 0 ? `${budgetMaxUsdCalculated.toLocaleString('fr-FR')} $` : '—')}
                </span>
              </div>
            </div>

            {/* Presets rapides de budget */}
            <div className="flex flex-wrap gap-1.5 items-center pt-0.5" role="group" aria-label="Paliers de budget">
              <span className="text-[11px] text-muted mr-0.5 font-medium">Paliers suggérés :</span>
              {(budgetCurrency === 'USD' ? BUDGET_PRESETS_USD : BUDGET_PRESETS_CDF).map((preset) => {
                const active = budgetInputVal === String(preset);
                const label = budgetCurrency === 'USD'
                  ? `${preset.toLocaleString('fr-FR')} $`
                  : `${(preset / 1_000_000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} M FC`;
                return (
                  <button
                    key={preset}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setBudgetInputVal(String(preset))}
                    className={cn(
                      'text-xs font-semibold px-2.5 py-1 min-h-[36px] rounded-full border transition cursor-pointer touch-manipulation inline-flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                      active
                        ? 'border-primary bg-primary text-white shadow-2xs'
                        : 'border-border bg-surface-muted text-foreground hover:border-primary/50 hover:bg-surface',
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Ratio par invité en direct */}
          {guestRatio ? (
            <div className="rounded-[var(--radius-card)] border border-primary/25 bg-primary/5 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-all">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-foreground">Ratio par convive :</span>
                  <span className="text-sm font-extrabold text-primary-solid tabular-nums">
                    ~{guestRatio.perGuestUsd} $ <span className="text-xs font-semibold text-muted">({guestRatio.perGuestFc.toLocaleString('fr-FR')} FC)</span>
                  </span>
                </div>
                <p className="text-xs text-muted leading-relaxed">
                  {guestRatio.advice}
                </p>
              </div>
              <span className={cn(
                'inline-flex items-center text-[11px] font-bold px-2.5 py-1 rounded-full shrink-0 self-start sm:self-center',
                guestRatio.tone === 'emerald'
                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                  : guestRatio.tone === 'amber'
                    ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                    : 'bg-primary/15 text-primary border border-primary/30',
              )}>
                {guestRatio.tone === 'emerald' ? '✨ Grand confort' : guestRatio.tone === 'amber' ? '⚡ Budget serré' : '👍 Équilibré'}
              </span>
            </div>
          ) : null}

          <div className="flex items-center justify-between text-xs text-muted bg-surface-muted/60 px-3 py-1.5 rounded-[var(--radius-card)] border border-border/70">
            <span>Taux de change appliqué :</span>
            <span className="font-semibold text-foreground">
              1 $ = {exchangeRate.toLocaleString('fr-FR')} FC
            </span>
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-medium text-foreground">
            <label className="inline-flex items-center gap-2 min-h-11">
              <input type="checkbox" className="size-4 accent-primary" checked={includeVenue} onChange={(e) => setIncludeVenue(e.target.checked)} />
              Salle
            </label>
            <label className="inline-flex items-center gap-2 min-h-11">
              <input type="checkbox" className="size-4 accent-primary" checked={includeTrades} onChange={(e) => setIncludeTrades(e.target.checked)} />
              Prestataires
            </label>
            <label className="inline-flex items-center gap-2 min-h-11">
              <input type="checkbox" className="size-4 accent-primary" checked={includeRentals} onChange={(e) => setIncludeRentals(e.target.checked)} />
              Matériel & Équipements
            </label>
            {defaults?.keepVenueSlug ? (
              <label className="inline-flex items-center gap-2 min-h-11">
                <input type="checkbox" className="size-4 accent-primary" checked={keepVenue} onChange={(e) => setKeepVenue(e.target.checked)} />
                Garder la salle déjà retenue
              </label>
            ) : null}
          </div>

          <div className="rounded-[var(--radius-card)] border border-border">
            <button
              type="button"
              onClick={() => setAdvancedOpen((value) => !value)}
              aria-expanded={advancedOpen}
              aria-controls={`${tabsId}-advanced`}
              className="w-full flex items-center justify-between gap-2 min-h-11 px-3 py-2 text-left text-xs font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              Plus de paramètres
              <ChevronDown className={cn('w-4 h-4 text-muted transition', advancedOpen && 'rotate-180')} />
            </button>
            {advancedOpen ? (
              <div id={`${tabsId}-advanced`} className="px-3 pb-3 space-y-3 border-t border-border pt-3">
                <div className="space-y-1.5">
                  <p className={FIELD_LABEL}>Ambiance</p>
                  <div className="flex flex-wrap gap-1.5" role="group" aria-label="Ambiance">
                    {AI_AMBIANCES.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        aria-pressed={ambiance === item.id}
                        onClick={() => toggleChip(item.id, ambiance, setAmbiance)}
                        className={cn(CHIP, chipTone(ambiance === item.id))}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <p className={FIELD_LABEL}>Moment</p>
                    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Moment">
                      {AI_MOMENTS.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          aria-pressed={moment === item.id}
                          onClick={() => toggleChip(item.id, moment, setMoment)}
                          className={cn(CHIP, chipTone(moment === item.id))}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <p className={FIELD_LABEL}>Lieu</p>
                    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Cadre du lieu">
                      {AI_SETTINGS.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          aria-pressed={setting === item.id}
                          onClick={() => toggleChip(item.id, setting, setSetting)}
                          className={cn(CHIP, chipTone(setting === item.id))}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="space-y-1">
                  <Input
                    label={budgetCurrency === 'USD' ? 'Budget minimum ($ USD)' : 'Budget minimum (FC CDF)'}
                    type="number"
                    min={0}
                    value={budgetMinInputVal}
                    onChange={(e) => setBudgetMinInputVal(e.target.value)}
                    placeholder={budgetCurrency === 'USD' ? 'Optionnel (ex: 500 $)' : 'Optionnel (ex: 1 400 000 FC)'}
                  />
                  {budgetMinFcCalculated > 0 ? (
                    <p className="text-xs text-muted text-right px-0.5">
                      {budgetCurrency === 'USD' ? (
                        <>Calculé en francs : <span className="font-semibold text-primary-solid">{budgetMinFcCalculated.toLocaleString('fr-FR')} FC</span></>
                      ) : (
                        <>Calculé en dollars : <span className="font-semibold text-primary-solid">{budgetMinUsdCalculated.toLocaleString('fr-FR')} $</span></>
                      )}
                    </p>
                  ) : null}
                </div>
                <div className="space-y-1.5">
                  <p className={FIELD_LABEL}>Prestations souhaitées</p>
                  <div className="flex flex-wrap gap-1.5" role="group" aria-label="Prestations souhaitées">
                    {categoryChoices.map((id) => {
                      const active = wantedCategories.includes(id);
                      return (
                        <button
                          key={id}
                          type="button"
                          aria-pressed={active}
                          onClick={() => setWantedCategories((prev) =>
                            prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
                          )}
                          className={cn(CHIP, chipTone(active))}
                        >
                          {SERVICE_CATEGORY_LABELS[id]}
                        </button>
                      );
                    })}
                  </div>
                </div>
                {includeVenue ? (
                  <div className="space-y-1.5">
                    <p className={FIELD_LABEL}>Équipements salle</p>
                    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Équipements salle">
                      {VENUE_PARAM_AMENITIES.map((item) => {
                        const active = venueAmenities.includes(item.id);
                        return (
                          <button
                            key={item.id}
                            type="button"
                            aria-pressed={active}
                            onClick={() => setVenueAmenities((prev) =>
                              prev.includes(item.id) ? prev.filter((id) => id !== item.id) : [...prev, item.id],
                            )}
                            className={cn(CHIP, chipTone(active))}
                          >
                            {item.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              onClick={() => void run()}
              loading={loading}
              leftIcon={<Sparkles className="w-4 h-4" />}
              disabled={!allowance.canSimulate && !loading}
            >
              {allowance.canSimulate
                ? `Lancer la simulation (${allowance.unlimited ? 'illimité' : `${aiTokenBalanceLabel(allowance)} restante${allowance.totalRemaining > 1 ? 's' : ''}`})`
                : 'Lancer la simulation (0 jeton)'}
            </Button>
            {!allowance.unlimited && !allowance.canSimulate ? (
              <AiTokenBuyButton
                variant="primary"
                size="md"
                onClick={() => setPurchaseModalOpen(true)}
              />
            ) : null}
          </div>
        </div>
      ) : null}

      {error ? (
        <Alert variant="error">
          <div className="space-y-2">
            <p>{error}</p>
            {error.toLowerCase().includes('aucune salle') || error.toLowerCase().includes('élargir') ? (
              <p className="text-xs opacity-90">
                Essayez une autre commune, toute la ville, ou un budget plus large.
              </p>
            ) : null}
            {!allowance.unlimited && /jeton|simulation|recharge/i.test(error) ? (
              <AiTokenBuyButton
                variant="primary"
                size="sm"
                onClick={() => setPurchaseModalOpen(true)}
              />
            ) : null}
          </div>
        </Alert>
      ) : null}

      <AiBudgetFullscreenLoader
        active={loading}
        stageHint={
          result?.packages.length
            ? 'Actualisation des formules à partir du catalogue…'
            : 'Recherche dans le catalogue, puis recommandation…'
        }
      />

      {result?.packages.length ? (
        <div className="space-y-4 pt-2 border-t border-border">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
            <span className="font-bold text-foreground flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              3 formules — touchez-en une pour voir les éléments
            </span>
            <span className="text-xs text-muted">
              {result.catalog.venues} salles · {result.catalog.trades} prestataires · {result.catalog.rentals} matériels
            </span>
          </div>

          {result.catalog.widenedCommune || (result.warnings && result.warnings.length > 0) ? (
            <Alert variant="warning">
              {(result.warnings && result.warnings[0]) || 'Recherche élargie à toute la ville faute de fiches dans la commune.'}
            </Alert>
          ) : null}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {result.packages.map((pack) => {
              const active = (selected?.id || result.packages[0]?.id) === pack.id;
              const packLeftover = budgetValue > 0 ? budgetValue - pack.estimatedTotalFc : null;
              return (
                <button
                  key={pack.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    setSelectedId(pack.id);
                    setPackModalOpen(true);
                  }}
                  className={cn(
                    'text-left rounded-[var(--radius-card)] border p-4 space-y-2 transition flex flex-col justify-between h-full gap-2 cursor-pointer touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
                    active
                      ? 'border-primary bg-primary/10 shadow-md ring-2 ring-primary/30'
                      : 'border-border bg-surface hover:border-primary/40 opacity-85 hover:opacity-100',
                  )}
                >
                  <div className="space-y-1 w-full">
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-surface border border-border text-foreground">
                          {pack.label}
                        </span>
                        {pack.id.includes('equilibre') ? (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/25">
                            Recommandé
                          </span>
                        ) : null}
                      </div>
                      <span className="text-xs font-semibold text-primary-solid">Détails</span>
                    </div>
                    {pack.summary ? (
                      <p className="text-xs font-bold text-foreground leading-snug mt-1">{pack.summary}</p>
                    ) : null}
                    {pack.blurb ? (
                      <p className="text-xs text-muted leading-relaxed line-clamp-2">{pack.blurb}</p>
                    ) : null}
                  </div>

                  <div className="pt-2 border-t border-border/60 w-full mt-auto space-y-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-base font-black text-foreground tabular-nums">
                        {formatFc(pack.estimatedTotalFc)}
                      </p>
                      <p className="text-xs font-semibold text-muted tabular-nums">
                        ≈ {Math.round(pack.estimatedTotalFc / exchangeRate).toLocaleString('fr-FR')} $
                      </p>
                    </div>
                    <p className="text-xs text-muted">
                      {pack.venue ? '1 salle' : 'Sans salle'} + {pack.services.length} prestataire{pack.services.length > 1 ? 's' : ''}
                    </p>
                    {packLeftover != null ? (
                      <p className={cn('text-xs font-semibold mt-0.5', packLeftover >= 0 ? 'text-primary-solid' : 'text-festive-accent')}>
                        {packLeftover >= 0
                          ? `Reste ${formatFc(packLeftover)} vs budget`
                          : `Dépassement ${formatFc(Math.abs(packLeftover))}`}
                      </p>
                    ) : null}
                    <div className="pt-1 flex items-center justify-between text-xs font-semibold text-primary-solid">
                      <span>Explorer la formule</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
        </div>
      )}

      <AiSimulationPackModal
        open={packModalOpen}
        onClose={() => setPackModalOpen(false)}
        result={result}
        selectedId={selectedId}
        onSelectPack={setSelectedId}
        budgetMaxFc={budgetValue}
        eventDate={eventDate}
        guestCount={guestCount ? Number(guestCount) : undefined}
        isLoggedIn={isLoggedIn}
        canCreateEvents={canCreateEvents}
        saveBusy={saveBusy}
        saveMessage={saveMessage}
        onSavePack={onApply ? undefined : () => void saveSelectedPack()}
        onBuyTokens={() => {
          setPackModalOpen(false);
          setPurchaseModalOpen(true);
        }}
        onApply={onApply ? (pack) => {
          onApply(pack);
          setPackModalOpen(false);
        } : undefined}
        applyLabel={applyLabel}
        onApplyAll={onApplyAll ? (packs) => {
          onApplyAll(packs);
          setPackModalOpen(false);
        } : undefined}
        onOpenListing={onOpenListing}
      />

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
