'use client';

import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ChevronDown, Sparkles, Wand2, Clock, PlusCircle, Check, MapPin, Lightbulb } from '@/components/icons';
import { api } from '@/lib/api';
import { Alert, Button, Input } from '@/components/ui';
import { cn } from '@/lib/cn';
import { formatFc } from '@/config/landingPricing';
import { LISTING_EVENT_TYPES, VENUE_AMENITIES, type ListingAmenityId, type ListingEventTypeId } from '@/lib/listingDetails';
import { type ServiceCategory } from '@/lib/marketplace';
import BudgetSimulationCriteria, {
  BudgetScopeTabs,
  CHOICE_CHIP as CHIP,
  choiceChipTone as chipTone,
} from '@/components/BudgetSimulationCriteria';
import { SEGMENTED_TRACK, segmentedItem } from '@/components/ui/segmented';
import type { BudgetSimulationScope } from '@/lib/budgetSimulation';
import { parseDrinkOrderLines, type BeverageSaleUnit, type DrinkOrderLine } from '@/lib/beverageBrands';
import { communesForCity, neighborhoodsFor } from '@/lib/rdcCities';
import { enabledMarketplaceCities, resolveUsdExchangeRateCdf } from '@/lib/platformCities';
import type { EventPlanAiPackage, EventPlanAiResult } from '@/lib/eventPlan';
import { snapshotPlanItems } from '@/lib/eventPlan';
import {
  applyServerAllowance,
  AI_ALLOWANCE_CHANGED,
  consumeAiSimulation,
  getAiSimulationAllowance,
  createEmptyAiAllowance,
  AI_SIMULATION_TOKEN_COST,
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
import PriceSourcePicker, { type PriceSource } from '@/components/PriceSourcePicker';
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
  type AiAmbianceId,
  type AiMomentId,
  type AiSettingId,
} from '@/lib/aiSimulationCriteria';
import {
  StudioAiTabs,
  studioAiTabPanelId,
  type StudioAiTabId,
} from '@/components/StudioAiTabs';
import { EVENT_PREP_PROMPT_MODELS } from '@/config/eventPrepPromptModels';
import { playAiGenerationCompleteSound, unlockAudioNotifications } from '@/lib/audioNotifications';
import { getAuthToken } from '@/lib/authSession';

const VENUE_PARAM_AMENITIES = VENUE_AMENITIES.filter((item) =>
  ['parking', 'ac', 'generator', 'garden', 'sound', 'wifi', 'stage', 'security'].includes(item.id),
);

const FIELD_LABEL = 'text-xs font-semibold text-muted';
const NATIVE_FIELD =
  'w-full min-h-11 rounded-[var(--radius-button)] border border-border bg-surface-muted dark:bg-background px-3.5 py-2.5 text-base sm:text-sm text-foreground placeholder:text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:border-primary';
/** Bouton texte discret (historique, exemples, jetons) : pas de cadre, teinte au survol. */
const QUIET_BUTTON =
  'inline-flex items-center gap-1.5 min-h-11 xl:min-h-9 px-2.5 rounded-[var(--radius-button)] text-sm transition-colors touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40';

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
  examples,
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
  /** Exemples de projets posés par la page : en haut sur mobile, dans la colonne de droite sur ordinateur. */
  examples?: React.ReactNode;
}) {
  const { user, access } = useAuth();
  const isLoggedIn = Boolean(user);
  const canCreateEvents = Boolean(access?.canCreateEvents);
  const tabsId = useId();
  const citySelectRef = useRef<HTMLSelectElement>(null);
  // Le brief est toujours déplié : plus de bouton pour le replier.
  const [open, setOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<StudioAiTabId>('create');
  const [refineOpen, setRefineOpen] = useState(false);
  // Mobile : une question par écran, puis l’écran des formules.
  const [mobileStep, setMobileStep] = useState(0);
  const [mobileReview, setMobileReview] = useState(false);
  const briefCardRef = useRef<HTMLDivElement>(null);
  const [packModalOpen, setPackModalOpen] = useState(false);
  const { site } = usePlatformSite();
  const exchangeRate = resolveUsdExchangeRateCdf(site?.usdExchangeRateCdf);
  const marketplaceCities = enabledMarketplaceCities(site);

  const [eventType, setEventType] = useState<ListingEventTypeId>(defaults?.eventType || 'private');
  const [city, setCity] = useState(defaults?.city || '');
  const [commune, setCommune] = useState(defaults?.commune || '');
  const [neighborhood, setNeighborhood] = useState('');
  const [origin, setOrigin] = useState<{ lat: number; lng: number } | null>(null);
  const [geoBusy, setGeoBusy] = useState(false);
  const [geoError, setGeoError] = useState('');
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
  const [budgetScope, setBudgetScope] = useState<BudgetSimulationScope>('complete');
  const [priceSource, setPriceSource] = useState<PriceSource>('all');
  const [wantedBrandIds, setWantedBrandIds] = useState<string[]>([]);
  const [wantedSaleUnits, setWantedSaleUnits] = useState<BeverageSaleUnit[]>([]);
  const [wantedDrinkLines, setWantedDrinkLines] = useState<DrinkOrderLine[]>([]);
  const [guestError, setGuestError] = useState('');
  const completeFlags = useRef({ venue: true, trades: true, rentals: true });
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
  const neighborhoods = useMemo(() => neighborhoodsFor(city, commune), [city, commune]);
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
    const brandIds = fromBrief.wantedBrandIds || fromResult.wantedBrandIds || [];
    setWantedBrandIds(brandIds.filter((id): id is string => typeof id === 'string' && id.length > 0));
    const saleUnits = fromBrief.wantedSaleUnits || fromResult.wantedSaleUnits || [];
    setWantedSaleUnits(saleUnits.filter((unit): unit is BeverageSaleUnit => unit === 'BOTTLE' || unit === 'CRATE' || unit === 'PACK' || unit === 'OTHER'));
    setWantedDrinkLines(parseDrinkOrderLines(fromBrief.wantedDrinkLines || fromResult.wantedDrinkLines));
    const amenities = fromBrief.venueAmenities || fromResult.venueAmenities || [];
    setVenueAmenities(amenities.filter((id): id is ListingAmenityId => Boolean(id)));
  };

  const applyCached = (
    cached: ReturnType<typeof historyItemToCache>,
    historyId?: string | null,
    openForm = false,
  ) => {
    if (cached.brief.eventType) setEventType(cached.brief.eventType as ListingEventTypeId);
    if (cached.brief.city != null) setCity(cached.brief.city);
    if (cached.brief.commune != null) setCommune(cached.brief.commune);
    if (cached.brief.neighborhood != null) setNeighborhood(cached.brief.neighborhood);
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
    neighborhood: neighborhood || undefined,
    budgetMinFc: budgetMinFcCalculated > 0 ? budgetMinFcCalculated : null,
    budgetMinUsd: budgetMinUsdCalculated > 0 ? budgetMinUsdCalculated : undefined,
    wantedCategories,
    wantedBrandIds,
    wantedSaleUnits,
    wantedDrinkLines,
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
      const token = getAuthToken();
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

  const applyBudgetScope = (next: BudgetSimulationScope) => {
    if (next === budgetScope) return;
    if (budgetScope === 'complete' && next !== 'complete') {
      completeFlags.current = { venue: includeVenue, trades: includeTrades, rentals: includeRentals };
    }
    setBudgetScope(next);
    setGuestError('');
    setCityError('');
    if (next === 'drinks') {
      setIncludeVenue(false);
      setIncludeTrades(false);
      setIncludeRentals(false);
      setRefineOpen(true);
      return;
    }
    if (next === 'rentals') {
      setIncludeVenue(false);
      setIncludeTrades(false);
      setIncludeRentals(true);
      return;
    }
    if (next === 'services') {
      setIncludeVenue(false);
      setIncludeTrades(true);
      setIncludeRentals(false);
      return;
    }
    setIncludeVenue(completeFlags.current.venue);
    setIncludeTrades(completeFlags.current.trades);
    setIncludeRentals(completeFlags.current.rentals);
  };

  const run = async () => {
    if (loading) return;
    if (budgetScope === 'drinks') {
      if (!(Number(guestCount) > 0) && wantedDrinkLines.length === 0) {
        setGuestError('Indiquez le nombre d’invités pour chiffrer les boissons.');
        setMobileStep(1);
        setMobileReview(false);
        setCityError('');
        setError('');
        setActiveTab('create');
        return;
      }
    } else if (!city.trim()) {
      setCityError('Choisissez une ville pour composer les packs du catalogue local.');
      setMobileStep(1);
      setMobileReview(false);
      setGuestError('');
      setError('');
      setActiveTab('create');
      citySelectRef.current?.focus();
      return;
    }
    setCityError('');
    setGuestError('');
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
        latitude: origin?.lat,
        longitude: origin?.lng,
        guestCount: guestCount ? Number(guestCount) : undefined,
        budgetMaxFc: budgetMaxFcCalculated > 0 ? budgetMaxFcCalculated : undefined,
        budgetMaxUsd: budgetMaxUsdCalculated > 0 ? budgetMaxUsdCalculated : undefined,
        eventDate: eventDate || undefined,
        prompt: prompt.trim() || undefined,
        includeVenue,
        includeTrades,
        includeRentals,
        budgetScope,
        priceSource,
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
      setMobileReview(packages.length > 0);
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

  const isBudgetBlocked = site?.studioVisibility?.budget === false;
  const launchLabel = allowance.unlimited
    ? 'Lancer la simulation'
    : `Lancer la simulation · ${AI_SIMULATION_TOKEN_COST} jeton${AI_SIMULATION_TOKEN_COST > 1 ? 's' : ''}`;
  const wizardKeys = budgetScope === 'drinks'
    ? (['type', 'guests'] as const)
    : (['type', 'place', 'guests', 'wishes'] as const);
  const wizardStep = Math.min(mobileStep, wizardKeys.length - 1);
  const wizardLast = wizardStep === wizardKeys.length - 1;
  const showMobileReview = embedded && mobileReview && Boolean(result?.packages.length);
  /** Masque sur mobile les blocs qui ne sont pas la question en cours (l’ordinateur garde tout le formulaire). */
  const mobileHidden = (key: (typeof wizardKeys)[number]) =>
    embedded && (showMobileReview || wizardKeys[wizardStep] !== key) ? 'max-lg:hidden' : undefined;
  const goToWizardStep = (next: number) => {
    setMobileStep(next);
    const top = briefCardRef.current?.getBoundingClientRect().top;
    if (top != null && top < 80) briefCardRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  };
  const goWizardNext = () => {
    if (wizardKeys[wizardStep] === 'place' && !city.trim()) {
      setCityError('Choisissez une ville pour composer les packs du catalogue local.');
      citySelectRef.current?.focus();
      return;
    }
    goToWizardStep(wizardStep + 1);
  };
  const recalcLabel = allowance.unlimited
    ? 'Recalculer'
    : `Recalculer · ${AI_SIMULATION_TOKEN_COST} jeton${AI_SIMULATION_TOKEN_COST > 1 ? 's' : ''}`;
  // Étapes du brief réellement affichées (la ville ne compte pas pour les boissons).
  const briefSteps = budgetScope === 'drinks'
    ? [true, Number(guestCount) > 0]
    : [true, Boolean(city), Number(guestCount) > 0, Boolean(prompt.trim())];
  const briefDone = briefSteps.filter(Boolean).length;
  const placeLabel = [neighborhood, commune, city].filter(Boolean).join(', ');
  const recapRows: Array<{ label: string; value: string; empty: boolean; optional?: boolean }> = [
    {
      label: 'Événement',
      value: LISTING_EVENT_TYPES.find((item) => item.id === eventType)?.label || 'À choisir',
      empty: false,
    },
    ...(budgetScope === 'drinks'
      ? []
      : [{ label: 'Lieu', value: placeLabel || 'À choisir', empty: !placeLabel }]),
    { label: 'Invités', value: Number(guestCount) > 0 ? guestCount : 'À choisir', empty: !(Number(guestCount) > 0) },
    {
      label: 'Date',
      value: eventDate ? new Date(`${eventDate}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '',
      empty: !eventDate,
      optional: true,
    },
    {
      label: 'Budget max',
      value: budgetMaxUsdCalculated > 0 ? `${budgetMaxUsdCalculated.toLocaleString('fr-FR')} $` : '',
      empty: !(budgetMaxUsdCalculated > 0),
      optional: true,
    },
  ].filter((row) => !(row.optional && row.empty));
  // Ce qui manque encore au brief, en quelques mots ; rien quand il est prêt.
  const briefHint = budgetScope === 'drinks'
    ? (wantedDrinkLines.length > 0 || Number(guestCount) > 0
      ? ''
      : 'Indiquez le nombre d’invités ou une commande précise.')
    : !city.trim()
      ? 'Choisissez une ville.'
      : budgetMaxFcCalculated <= 0
        ? 'Indiquez un budget maximum.'
        : Number(guestCount) > 0
          ? ''
          : 'Indiquez le nombre d’invités.';
  const blockedHint = 'Plus de jetons disponibles.';
  const footerHint = allowance.canSimulate || loading ? briefHint : blockedHint;
  // Précisions actives, comptées sur le bouton « Affiner le calcul » quand il est replié.
  const refineCount = wantedBrandIds.length
    + wantedSaleUnits.length
    + wantedDrinkLines.length
    + wantedCategories.length
    + (budgetScope !== 'drinks'
      ? Number(Boolean(ambiance)) + Number(Boolean(moment)) + Number(Boolean(setting))
        + Number(budgetMinFcCalculated > 0) + (includeVenue ? venueAmenities.length : 0)
      : 0)
    + Number(priceSource !== 'all' && !embedded);

  const briefReady = budgetScope === 'drinks'
    ? Number(guestCount) > 0 || wantedDrinkLines.length > 0
    : Boolean(city.trim()) && budgetMaxFcCalculated > 0 && Number(guestCount) > 0;

  const newSimulationButton = activeTab === 'history' && history.length > 0 ? (
    <button
      type="button"
      onClick={() => setActiveTab('create')}
      className={cn(QUIET_BUTTON, 'self-start sm:self-center font-semibold text-primary hover:bg-surface-muted')}
    >
      <PlusCircle className="w-3.5 h-3.5" aria-hidden />
      <span>Nouvelle simulation</span>
    </button>
  ) : null;

  const errorAlert = error ? (
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
  ) : null;

  if (isBudgetBlocked) {
    return (
      <section
        aria-label="Simulateur budget IA - Fonctionnalité à venir"
        className={cn(
          'rounded-[var(--radius-card)] border border-border bg-surface px-6 py-10 space-y-4 text-center',
          className,
        )}
      >
        <Clock className="w-8 h-8 text-muted mx-auto" aria-hidden />
        <h3 className="text-lg font-semibold text-foreground">
          Simulateur de budget bientôt disponible
        </h3>
        <Button href="/marketplace" variant="primary" size="sm">
          Explorer le catalogue
        </Button>
      </section>
    );
  }

  return (
    <section className={cn(
      embedded
        ? 'min-w-0'
        : 'rounded-[var(--radius-card)] border border-border bg-surface p-4 space-y-3',
      className,
    )}>
      <div className={cn(embedded ? 'space-y-4' : 'contents')}>
      <AiSimulationCounter
        allowance={allowance}
        onBuy={() => setPurchaseModalOpen(true)}
      />

      {/* Embarqué : onglets Composer / Historique / Exemples. Dashboard : « À chiffrer » souligné, actions discrètes à droite. */}
      {embedded ? (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
          <StudioAiTabs
            value={activeTab}
            onChange={setActiveTab}
            historyCount={history.length}
            idPrefix={tabsId}
            className="w-full sm:w-auto sm:min-w-[22rem]"
          />
          {newSimulationButton}
        </div>
      ) : (
        <BudgetScopeTabs
          className="mb-5"
          value={budgetScope}
          inactive={activeTab !== 'create'}
          onChange={(next) => {
            applyBudgetScope(next);
            setActiveTab('create');
          }}
          action={(
            <>
              {(['history', 'prompts'] as const).map((id) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={activeTab === id}
                  onClick={() => setActiveTab(activeTab === id ? 'create' : id)}
                  className={cn(
                    QUIET_BUTTON,
                    activeTab === id ? 'bg-surface-muted text-foreground font-semibold' : 'font-medium text-muted hover:text-foreground',
                  )}
                >
                  {id === 'history' ? 'Historique' : 'Exemples'}
                  {id === 'history' && history.length > 0 ? (
                    <span className="text-xs font-medium tabular-nums text-muted">{history.length}</span>
                  ) : null}
                </button>
              ))}
              {!allowance.unlimited && activeTab !== 'history' ? (
                <AiTokenBuyButton
                  compact
                  onClick={() => setPurchaseModalOpen(true)}
                  className="border-0 bg-transparent shadow-none px-2.5 xl:min-h-9 text-sm font-semibold text-primary hover:bg-surface-muted"
                />
              ) : null}
              {newSimulationButton}
            </>
          )}
        />
      )}

      {activeTab === 'prompts' ? (
        <div
          role="tabpanel"
          id={studioAiTabPanelId(tabsId, 'prompts')}
          aria-labelledby={embedded ? `${tabsId}-tab-prompts` : undefined}
          className="space-y-3 pt-1"
        >
          <ul className="divide-y divide-border">
            {EVENT_PREP_PROMPT_MODELS.map((model) => {
              const selected = prompt.trim() === model.prompt.trim();
              return (
                <li key={model.id}>
                <button
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
                    'w-full text-left min-h-11 px-2 py-3 flex items-center gap-3 rounded-[var(--radius-button)] transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40',
                    selected ? 'bg-primary/5' : 'hover:bg-surface-muted/60',
                  )}
                >
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-baseline gap-x-2">
                      <span className="text-sm font-semibold text-foreground">{model.title}</span>
                      <span className="text-xs text-muted">{model.badge}</span>
                    </span>
                    <span className="block text-xs text-muted mt-0.5 leading-snug">{model.summary}</span>
                  </span>
                  <span className="shrink-0 inline-flex items-center gap-1 text-xs font-semibold text-primary">
                    {selected ? <Check className="w-3.5 h-3.5" aria-hidden /> : null}
                    {selected ? 'Prérempli' : 'Préremplir'}
                  </span>
                </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : activeTab === 'history' ? (
        <div
          role="tabpanel"
          id={studioAiTabPanelId(tabsId, 'history')}
          aria-labelledby={embedded ? `${tabsId}-tab-history` : undefined}
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
            <div className="py-10 px-4 text-center space-y-3">
              <Clock className="w-6 h-6 text-muted mx-auto" aria-hidden />
              <h4 className="text-sm font-semibold text-foreground">Aucune simulation pour le moment</h4>
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
          aria-labelledby={embedded ? `${tabsId}-tab-create` : undefined}
          className="space-y-3"
        >
          {open && embedded && examples && wizardStep === 0 && !showMobileReview ? <div className="lg:hidden">{examples}</div> : null}
          {open ? (
        <div className={cn(
          'grid grid-cols-1 lg:items-start',
          embedded
            ? 'lg:grid-cols-[minmax(0,1fr)_minmax(19rem,22rem)] lg:gap-x-6'
            : '',
        )}>
        <div
          ref={briefCardRef}
          className={cn(
            'order-1 lg:col-start-1 lg:row-start-1 min-w-0',
            embedded
              ? 'scroll-mt-24 rounded-[18px] border border-border bg-surface divide-y divide-border/70 overflow-hidden'
              : 'lg:columns-2 lg:gap-x-10 [&>*]:mb-6 [&>*]:[break-inside:avoid]',
            showMobileReview && 'max-lg:hidden',
          )}
        >
          {embedded ? (
            <div className="lg:hidden px-4 pt-4 pb-3 space-y-2">
              <p className="text-sm text-muted tabular-nums">Question {wizardStep + 1} sur {wizardKeys.length}</p>
              <div className="h-1.5 rounded-full bg-surface-muted overflow-hidden" aria-hidden>
                <span
                  className="block h-full rounded-full bg-primary-solid transition-[width] duration-300"
                  style={{ width: `${Math.round(((wizardStep + 1) / wizardKeys.length) * 100)}%` }}
                />
              </div>
            </div>
          ) : null}
          {embedded ? (
            <div className={cn('px-4 sm:px-6 pt-2 pb-4 space-y-3', wizardStep !== 0 && 'max-lg:hidden')}>
              <BudgetScopeTabs value={budgetScope} onChange={applyBudgetScope} bordered={false} />
              <PriceSourcePicker value={priceSource} onChange={setPriceSource} />
            </div>
          ) : null}
          <BudgetFormGroup title={embedded ? 'Quel événement ?' : 'Votre événement'} flat={embedded} done={embedded} className={mobileHidden('type')}>
            <div className="space-y-1.5">
              <p className={cn(FIELD_LABEL, embedded && 'sr-only')}>Type d’événement</p>
              {!embedded ? (
                <select
                  value={eventType}
                  aria-label="Type d’événement"
                  onChange={(e) => setEventType(e.target.value as typeof eventType)}
                  className={NATIVE_FIELD}
                >
                  {LISTING_EVENT_TYPES.map((item) => (
                    <option key={item.id} value={item.id}>{item.label}</option>
                  ))}
                </select>
              ) : null}
              {embedded ? (
              <div
                className="flex flex-wrap gap-1.5"
                role="group"
                aria-label="Type d’événement"
              >
                {LISTING_EVENT_TYPES.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={eventType === item.id}
                    onClick={() => setEventType(item.id)}
                    className={cn(CHIP, chipTone(eventType === item.id))}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              ) : null}
            </div>

          </BudgetFormGroup>

          {budgetScope !== 'drinks' ? (
          <BudgetFormGroup title={embedded ? 'Où ?' : 'Le lieu'} flat={embedded} done={Boolean(city)} className={mobileHidden('place')}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
                  setNeighborhood('');
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
                onChange={(e) => {
                  setCommune(e.target.value);
                  setNeighborhood('');
                }}
                className={NATIVE_FIELD}
              >
                <option value="">Toutes</option>
                {communes.map((item) => (
                  <option key={item.name} value={item.name}>{item.name}</option>
                ))}
              </select>
            </label>
            <label className="space-y-1 sm:col-span-2">
              <span className={FIELD_LABEL}>Quartier</span>
              <select
                value={neighborhood}
                disabled={!commune}
                aria-describedby={`${tabsId}-place-hint`}
                onChange={(e) => setNeighborhood(e.target.value)}
                className={NATIVE_FIELD}
              >
                <option value="">{commune ? 'Tous les quartiers' : 'D’abord la commune'}</option>
                {neighborhoods.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </label>
            <div className="sm:col-span-2 flex flex-col sm:flex-row sm:items-center gap-2">
              <button
                type="button"
                disabled={geoBusy}
                aria-pressed={Boolean(origin)}
                aria-busy={geoBusy || undefined}
                aria-describedby={`${tabsId}-place-hint`}
                onClick={() => {
                  setGeoError('');
                  if (!navigator.geolocation) {
                    setGeoError('Cet appareil ne partage pas sa position.');
                    return;
                  }
                  setGeoBusy(true);
                  navigator.geolocation.getCurrentPosition(
                    (position) => {
                      setOrigin({ lat: position.coords.latitude, lng: position.coords.longitude });
                      setGeoBusy(false);
                    },
                    () => {
                      setOrigin(null);
                      setGeoError('Position refusée. Les prestataires restent classés par ville et commune.');
                      setGeoBusy(false);
                    },
                    { enableHighAccuracy: true, timeout: 8000 },
                  );
                }}
                className={cn(CHIP, 'w-full sm:w-auto whitespace-normal', chipTone(Boolean(origin)))}
              >
                <MapPin className="w-3.5 h-3.5 mr-1 shrink-0" aria-hidden />
                {geoBusy ? 'Localisation…' : origin ? 'Position GPS utilisée' : 'Utiliser ma position GPS'}
              </button>
              {origin ? (
                <button
                  type="button"
                  onClick={() => setOrigin(null)}
                  className="min-h-11 px-2 text-xs font-semibold text-muted hover:text-foreground rounded-[var(--radius-button)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                >
                  Retirer le GPS
                </button>
              ) : null}
            </div>
            <p
              id={`${tabsId}-place-hint`}
              hidden={!geoError}
              className={cn('sm:col-span-2 text-xs', geoError ? 'text-danger font-medium' : 'text-muted')}
              role={geoError ? 'alert' : undefined}
            >
              {geoError
                || (origin
                  ? 'Les services et locations les plus proches passent devant.'
                  : commune
                    ? 'Le quartier et le GPS classent les prestataires et le matériel.'
                    : 'Choisissez une commune pour afficher les quartiers. Le GPS classe aussi sans quartier.')}
            </p>
            </div>
          </BudgetFormGroup>
          ) : null}

          <BudgetFormGroup title="Invités, date et budget" flat={embedded} done={Number(guestCount) > 0} className={mobileHidden('guests')}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Input
                label="Invités"
                type="number"
                min={1}
                value={guestCount}
                onChange={(e) => {
                  setGuestCount(e.target.value);
                  setGuestError('');
                }}
                placeholder="120"
                aria-invalid={guestError ? true : undefined}
                aria-describedby={guestError ? `${tabsId}-guest-error` : undefined}
              />
              {guestError ? (
                <p id={`${tabsId}-guest-error`} className="text-xs text-danger font-medium" role="alert">
                  {guestError}
                </p>
              ) : budgetScope === 'drinks' && wantedDrinkLines.length === 0 ? (
                <p className="text-xs text-muted">Obligatoire</p>
              ) : null}
              {embedded ? (
              <div className="flex flex-wrap gap-1.5 items-center" role="group" aria-label="Raccourcis nombre d'invités">
                {GUEST_PRESETS.map((count) => {
                  const active = guestCount === String(count);
                  return (
                    <button
                      key={count}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setGuestCount(String(count))}
                      className={cn(CHIP, 'min-w-11 tabular-nums', chipTone(active))}
                    >
                      {count}
                    </button>
                  );
                })}
              </div>
              ) : null}
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

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className={FIELD_LABEL}>Budget maximum</span>
                <div
                  className={cn('inline-flex', SEGMENTED_TRACK, 'gap-0.5 p-[3px]')}
                  role="group"
                  aria-label="Devise du budget"
                >
                  {([
                    ['USD', '$ USD'],
                    ['CDF', 'FC'],
                  ] as const).map(([code, label]) => (
                    <button
                      key={code}
                      type="button"
                      aria-pressed={budgetCurrency === code}
                      onClick={() => handleCurrencySwitch(code)}
                      className={segmentedItem(budgetCurrency === code, 'min-h-11 sm:min-h-8 px-3 text-xs')}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <Input
                label=""
                type="number"
                min={1}
                value={budgetInputVal}
                onChange={(e) => setBudgetInputVal(e.target.value)}
                placeholder={budgetCurrency === 'USD' ? 'Ex. 2 500' : 'Ex. 7 000 000'}
                aria-label={budgetCurrency === 'USD' ? 'Budget maximum en dollars' : 'Budget maximum en francs congolais'}
              />
              <p className="text-xs text-muted tabular-nums">
                {budgetMaxFcCalculated > 0
                  ? `Soit ${budgetCurrency === 'USD'
                    ? `${budgetMaxFcCalculated.toLocaleString('fr-FR')} FC`
                    : `${budgetMaxUsdCalculated.toLocaleString('fr-FR')} $`} · `
                  : ''}
                <span title="Taux de change appliqué">1 $ = {exchangeRate.toLocaleString('fr-FR')} FC</span>
                {guestRatio
                  ? ` · ~${guestRatio.perGuestUsd} $ par invité${embedded
                    ? ` (${guestRatio.perGuestFc.toLocaleString('fr-FR')} FC)`
                    : `, ${guestRatio.tone === 'emerald' ? 'grand confort' : guestRatio.tone === 'amber' ? 'budget serré' : 'équilibré'}`}`
                  : ''}
              </p>

              {embedded ? (
              <div className="flex flex-wrap gap-1.5 items-center" role="group" aria-label="Paliers de budget">
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
                      className={cn(CHIP, 'tabular-nums', chipTone(active))}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
              ) : null}
            </div>

            {guestRatio && embedded ? (
              <p className="text-xs text-muted leading-relaxed">{guestRatio.advice}</p>
            ) : null}

          </BudgetFormGroup>

          {budgetScope !== 'drinks' ? (
          <BudgetFormGroup title="Vos envies" flat={embedded} done={Boolean(prompt.trim())} className={mobileHidden('wishes')}>
            {budgetScope === 'complete' ? (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-foreground" role="group" aria-label="Inclure">
              <span className={FIELD_LABEL}>Inclure</span>
              <label className="inline-flex items-center gap-2 min-h-11">
                <input type="checkbox" className="size-5 accent-primary shrink-0" checked={includeVenue} onChange={(e) => setIncludeVenue(e.target.checked)} />
                Salle
              </label>
              <label className="inline-flex items-center gap-2 min-h-11">
                <input type="checkbox" className="size-5 accent-primary shrink-0" checked={includeTrades} onChange={(e) => setIncludeTrades(e.target.checked)} />
                Prestataires
              </label>
              <label className="inline-flex items-center gap-2 min-h-11">
                <input type="checkbox" className="size-5 accent-primary shrink-0" checked={includeRentals} onChange={(e) => setIncludeRentals(e.target.checked)} />
                Matériel & Équipements
              </label>
              {defaults?.keepVenueSlug ? (
                <label className="inline-flex items-center gap-2 min-h-11">
                  <input type="checkbox" className="size-5 accent-primary shrink-0" checked={keepVenue} onChange={(e) => setKeepVenue(e.target.checked)} />
                  Garder la salle déjà retenue
                </label>
              ) : null}
            </div>
            ) : null}

            <label className="space-y-1 block">
              <span className={FIELD_LABEL}>Décrivez votre événement</span>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={3}
                placeholder="Ex. mariage 120 personnes à Gombe, ambiance chic, besoin traiteur + DJ + habits…"
                className={cn(NATIVE_FIELD, 'resize-y min-h-[4.5rem] py-2.5')}
              />
              <p className={cn('text-xs text-muted', !embedded && 'hidden')}>
                Mariages coutumiers Kongo, Luba, Mongo, Lunda :{' '}
                <button type="button" className="font-bold text-primary-solid hover:underline min-h-11 inline-flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-sm" onClick={() => setActiveTab('prompts')}>
                  voir les exemples
                </button>
                .
              </p>
            </label>
          </BudgetFormGroup>
          ) : null}
          {embedded && recapRows.some((row) => !row.empty) ? (
            <p className="lg:hidden px-4 py-3 flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted">
              {recapRows.filter((row) => !row.empty).map((row) => (
                <span key={row.label}>
                  {row.label} : <b className="font-semibold text-foreground">{row.value}</b>
                </span>
              ))}
            </p>
          ) : null}
        </div>

        <aside className={cn(
          embedded && (!wizardLast || showMobileReview) && 'max-lg:hidden',
          embedded
            ? 'order-2 lg:col-start-2 lg:row-start-1 lg:row-span-2 mt-3 lg:mt-0 min-w-0 lg:sticky lg:top-24 lg:max-h-[calc(100dvh-7rem)] lg:overflow-y-auto lg:overscroll-contain lg:pr-1'
            : 'order-2 mt-3 min-w-0',
        )}>
          <button
            type="button"
            className={cn(
              'inline-flex items-center gap-1.5 min-h-11 mb-2 text-sm font-semibold text-primary rounded-[var(--radius-button)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
              embedded && 'lg:hidden',
            )}
            aria-expanded={refineOpen}
            aria-controls={`${tabsId}-refine`}
            onClick={() => setRefineOpen((value) => !value)}
          >
            Affiner le calcul
            {refineCount > 0 && !refineOpen ? (
              <span className="text-xs font-medium tabular-nums text-muted">
                <span aria-hidden>{refineCount}</span>
                <span className="sr-only">{`${refineCount} précision${refineCount > 1 ? 's' : ''} active${refineCount > 1 ? 's' : ''}`}</span>
              </span>
            ) : null}
            <ChevronDown className={cn('w-4 h-4 transition', refineOpen && 'rotate-180')} aria-hidden />
          </button>
          {embedded ? (
            <div className="hidden lg:flex flex-col gap-4 mb-4">
              <div className="rounded-[18px] border border-border bg-surface p-5 flex flex-col gap-3.5">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-display text-lg font-semibold text-foreground">Récapitulatif</span>
                  <span className="text-sm text-muted tabular-nums">{briefDone} sur {briefSteps.length}</span>
                </div>
                <div className="h-1.5 rounded-full bg-surface-muted overflow-hidden" aria-hidden>
                  <span
                    className="block h-full rounded-full bg-primary-solid transition-[width] duration-300"
                    style={{ width: `${Math.round((briefDone / briefSteps.length) * 100)}%` }}
                  />
                </div>
                <dl className="text-sm">
                  {recapRows.map((row) => (
                    <div key={row.label} className="flex justify-between gap-3 py-2 border-b border-border/70">
                      <dt className="text-muted">{row.label}</dt>
                      <dd className={cn('text-right font-semibold', row.empty ? 'text-muted/70' : 'text-foreground')}>{row.value}</dd>
                    </div>
                  ))}
                </dl>
                {errorAlert ? <div className="max-h-40 overflow-y-auto">{errorAlert}</div> : null}
                {allowance.canSimulate || loading ? (
                  <Button
                    onClick={() => void run()}
                    loading={loading}
                    leftIcon={<Sparkles className="w-4 h-4" />}
                    className="w-full min-h-[52px] text-base"
                  >
                    {result?.packages.length && !loading ? recalcLabel : launchLabel}
                  </Button>
                ) : (
                  <AiTokenBuyButton
                    variant="primary"
                    size="md"
                    className="w-full min-h-[52px]"
                    onClick={() => setPurchaseModalOpen(true)}
                  />
                )}
                <p className={cn('text-sm text-muted text-center', !footerHint && 'sr-only')} aria-live="polite">
                  {footerHint}
                </p>
              </div>
              {examples}
            </div>
          ) : null}
          <div id={`${tabsId}-refine`} className={cn('space-y-5', !refineOpen && (embedded ? 'max-lg:hidden' : 'hidden'))}>
          {embedded ? <p className="hidden lg:block text-sm font-semibold text-foreground">Affiner le calcul</p> : null}
          {!embedded ? <PriceSourcePicker value={priceSource} onChange={setPriceSource} /> : null}
          <BudgetSimulationCriteria
            scope={budgetScope}
            selectedBrandIds={wantedBrandIds}
            onToggleBrand={(id) => setWantedBrandIds((prev) => prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id])}
            selectedSaleUnits={wantedSaleUnits}
            onToggleSaleUnit={(unit) => setWantedSaleUnits((prev) => prev.includes(unit) ? prev.filter((item) => item !== unit) : [...prev, unit])}
            orderLines={wantedDrinkLines}
            onChangeOrderLines={setWantedDrinkLines}
            onClearCatalog={() => {
              setWantedBrandIds([]);
              setWantedSaleUnits([]);
            }}
            selectedCategories={wantedCategories}
            onToggleCategory={(id) => setWantedCategories((prev) => prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id])}
          />
          {budgetScope !== 'drinks' ? (
              <>
                <div className="space-y-2">
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-2">
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
                  <div className="space-y-2">
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
                    placeholder={budgetCurrency === 'USD' ? 'Ex. 500' : 'Ex. 1 400 000'}
                  />
                  {budgetMinFcCalculated > 0 ? (
                    <p className="text-xs text-muted tabular-nums">
                      Soit {budgetCurrency === 'USD'
                        ? `${budgetMinFcCalculated.toLocaleString('fr-FR')} FC`
                        : `${budgetMinUsdCalculated.toLocaleString('fr-FR')} $`}
                    </p>
                  ) : null}
                </div>
                {includeVenue ? (
                  <div className="space-y-2">
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
              </>
          ) : null}
          </div>
        </aside>

          {embedded ? (
            <div
              className={cn(
                'order-3 lg:hidden mt-3 sticky z-30 bottom-[calc(var(--em-site-bottom-nav)+var(--em-site-install-bar))] md:bottom-0',
                '-mx-3 sm:mx-0 px-3 sm:px-4 py-3 pb-5 md:pb-3 border-t sm:border border-border bg-surface sm:rounded-xl',
                'shadow-[0_-10px_28px_-16px_rgba(0,0,0,0.2)]',
              )}
            >
              {/* L’erreur s’affiche ici, à côté du bouton : plus bas dans la page, personne ne la voyait. */}
              {errorAlert ? <div className="mb-2.5 max-h-40 overflow-y-auto">{errorAlert}</div> : null}
              {showMobileReview ? (
                <div className="flex gap-2.5">
                  <Button
                    variant="secondary"
                    className="min-h-[52px] px-4"
                    onClick={() => {
                      setMobileReview(false);
                      goToWizardStep(0);
                    }}
                  >
                    Modifier
                  </Button>
                  <Button
                    className="flex-1 min-h-[52px] text-base"
                    onClick={() => {
                      const packs = result?.packages || [];
                      const pick = packs.find((pack) => pack.id.includes('equilibre')) || packs[1] || packs[0];
                      if (pick) setSelectedId(pick.id);
                      setPackModalOpen(true);
                    }}
                  >
                    Voir la formule conseillée
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2.5">
                  <Button
                    variant="secondary"
                    className="min-h-[52px] px-4"
                    disabled={wizardStep === 0 || loading}
                    onClick={() => goToWizardStep(wizardStep - 1)}
                  >
                    Retour
                  </Button>
                  {!wizardLast ? (
                    <Button className="flex-1 min-h-[52px] text-base" onClick={goWizardNext}>
                      Suivant
                    </Button>
                  ) : allowance.canSimulate || loading ? (
                    <Button
                      onClick={() => void run()}
                      loading={loading}
                      leftIcon={<Sparkles className="w-4 h-4" />}
                      className="flex-1 min-h-[52px] text-base"
                    >
                      {result?.packages.length && !loading ? recalcLabel : launchLabel}
                    </Button>
                  ) : (
                    <AiTokenBuyButton
                      variant="primary"
                      size="md"
                      className="flex-1 min-h-[52px]"
                      onClick={() => setPurchaseModalOpen(true)}
                    />
                  )}
                </div>
              )}
              {wizardLast && !showMobileReview ? (
                <p className={cn('mt-1.5 flex items-start justify-center gap-1.5 text-xs text-muted text-center', !footerHint && 'sr-only')} aria-live="polite">
                  {footerHint ? <Lightbulb className="w-3.5 h-3.5 text-muted shrink-0 mt-px" aria-hidden /> : null}
                  <span>{footerHint}</span>
                </p>
              ) : null}
            </div>
          ) : (
          <div className="order-3 mt-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
            <Button
              onClick={() => void run()}
              loading={loading}
              leftIcon={<Sparkles className="w-4 h-4" />}
              disabled={!allowance.canSimulate && !loading}
              className="w-full sm:w-auto"
            >
              {launchLabel}
            </Button>
            {!allowance.unlimited && !allowance.canSimulate ? (
              <AiTokenBuyButton
                variant="primary"
                size="md"
                onClick={() => setPurchaseModalOpen(true)}
              />
            ) : null}
            <p className="text-xs text-muted" aria-live="polite">{briefReady ? '' : briefHint}</p>
          </div>
          )}
        </div>
      ) : null}

      {error && !embedded ? errorAlert : null}

      <AiBudgetFullscreenLoader
        active={loading}
        stageHint={
          result?.packages.length
            ? 'Actualisation des formules à partir du catalogue…'
            : 'Recherche dans le catalogue, puis recommandation…'
        }
      />

      {result?.packages.length ? (
        <div className={cn('space-y-4', embedded && 'pt-4')}>
          {/* Dashboard : les trois formules s’ouvrent dans la fenêtre dès la fin du calcul (ou depuis l’historique). */}
          {embedded ? (
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <h2 className="font-display text-xl sm:text-2xl font-semibold text-foreground">Vos 3 formules</h2>
            <span className="text-sm text-muted tabular-nums">
              {[
                [result.catalog.venues, 'salles'],
                [result.catalog.trades, 'prestataires'],
                [result.catalog.rentals, 'matériels'],
              ].filter(([count]) => Number(count) > 0).map(([count, label]) => `${count} ${label}`).join(' · ')}
            </span>
          </div>
          ) : null}

          {result.catalog.widenedCommune || (result.warnings && result.warnings.length > 0) ? (
            <Alert variant="warning">
              {(result.warnings && result.warnings[0]) || 'Recherche élargie à toute la ville faute de fiches dans la commune.'}
            </Alert>
          ) : null}

          {embedded ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
            {result.packages.map((pack) => {
              const recommended = pack.id.includes('equilibre');
              const packLeftover = budgetValue > 0 ? budgetValue - pack.estimatedTotalFc : null;
              return (
                <button
                  key={pack.id}
                  type="button"
                  aria-pressed={selected?.id === pack.id}
                  onClick={() => {
                    setSelectedId(pack.id);
                    setPackModalOpen(true);
                  }}
                  className={cn(
                    'group text-left rounded-[18px] bg-surface p-4 sm:p-5 flex flex-col gap-2.5 h-full transition cursor-pointer touch-manipulation',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                    recommended ? 'border-2 border-primary-solid' : 'border border-border hover:border-primary/40',
                  )}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="font-display text-lg font-semibold text-foreground">{pack.label}</span>
                    {recommended ? (
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#e3f3ec] text-[#275a3d] dark:bg-primary/15 dark:text-primary">
                        Conseillée
                      </span>
                    ) : null}
                  </span>
                  <span className="flex flex-wrap items-baseline gap-x-2">
                    <span className="font-display text-2xl sm:text-3xl leading-tight font-semibold text-foreground tabular-nums">
                      {formatFc(pack.estimatedTotalFc)}
                    </span>
                    <span className="text-sm text-muted tabular-nums">
                      ≈ {Math.round(pack.estimatedTotalFc / exchangeRate).toLocaleString('fr-FR')} $
                    </span>
                  </span>
                  <span className="text-sm text-muted">
                    {`${pack.venue ? '1 salle' : 'Sans salle'} · ${pack.services.length} prestataire${pack.services.length > 1 ? 's' : ''}`}
                  </span>
                  {packLeftover != null ? (
                    <span className={cn('text-xs', packLeftover >= 0 ? 'text-muted' : 'font-semibold text-amber-700 dark:text-amber-300')}>
                      {packLeftover >= 0
                        ? `Reste ${formatFc(packLeftover)} sur le budget`
                        : `Dépasse le budget de ${formatFc(Math.abs(packLeftover))}`}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
          ) : null}
        </div>
      ) : null}
        </div>
      )}

      </div>

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

/**
 * Bloc du formulaire. `flat` le pose dans la carte unique du studio, avec sa question et une coche une fois rempli ;
 * sinon (dashboard) le titre reste pour les lecteurs d’écran : les libellés des champs suffisent à l’écran.
 */
function BudgetFormGroup({
  title,
  flat = false,
  done = false,
  className,
  children,
}: {
  title: string;
  flat?: boolean;
  done?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  if (flat) {
    return (
      <fieldset className={cn('px-4 sm:px-6 py-5 space-y-3 min-w-0', className)}>
        <legend className="sr-only">{title}</legend>
        <p aria-hidden className="flex items-center gap-2">
          <span className="font-display text-lg font-semibold text-foreground">{title}</span>
          {done ? <Check className="w-4 h-4 text-primary" strokeWidth={3} /> : null}
        </p>
        <div className="space-y-3">{children}</div>
      </fieldset>
    );
  }
  return (
    <fieldset className={cn('space-y-3 min-w-0', className)}>
      <legend className="sr-only">{title}</legend>
      {children}
    </fieldset>
  );
}

function initialPrompt(defaults?: EventPrepAiDefaults) {
  if (defaults?.prompt) return defaults.prompt;
  if (defaults?.eventTitle) return `Préparer « ${defaults.eventTitle} » avec un mix salle / prestataires / matériel & équipements.`;
  return '';
}
