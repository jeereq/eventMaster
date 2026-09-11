'use client';

import React, { useId, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Globe, GlobeLock, CheckCircle2, AlertCircle, MapPin, Sparkles,
  Camera, Calendar, Layers, Eye, ExternalLink, ShieldCheck, Tag, Info,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { Input, Badge, Button } from '@/components/ui';
import CityLocationFields from '@/components/CityLocationFields';
import LocationPickerMap from '@/components/LocationPickerMap';
import MarketplaceMediaField from '@/components/MarketplaceMediaField';
import BlockedDatesField from '@/components/BlockedDatesField';
import ListingDetailsFields from '@/components/ListingDetailsFields';
import {
  PRICE_UNIT_OPTIONS,
  missingPublishLocation,
  type VenuePriceUnit,
} from '@/lib/marketplace';
import type { ListingDetails } from '@/lib/listingDetails';
import { formatFc } from '@/config/landingPricing';

export interface RoomPublicationDraft {
  isPublic: boolean;
  headline: string;
  city: string;
  commune: string;
  neighborhood: string;
  address: string;
  priceFromFc: string;
  priceUnit: VenuePriceUnit;
  quotaMin: string;
  quotaMax: string;
  photos: string[];
  blockedDates: string[];
  bookedDates?: string[];
  latitude: string;
  longitude: string;
  details: ListingDetails;
}

export type PublicationSubTab = 'pricing' | 'location' | 'medias' | 'amenities' | 'preview';

export interface RoomPublicPublicationFormProps {
  draft: RoomPublicationDraft;
  onChange: React.Dispatch<React.SetStateAction<RoomPublicationDraft>>;
  roomName?: string;
  roomType?: string;
  roomCapacity?: number | null;
  calculatedCapacity?: number | null;
  slug?: string | null;
  publicSlug?: string | null;
  error?: string | null;
  compact?: boolean;
}

export default function RoomPublicPublicationForm({
  draft,
  onChange,
  roomName,
  roomType,
  roomCapacity,
  calculatedCapacity,
  slug,
  publicSlug,
  error,
  compact = false,
}: RoomPublicPublicationFormProps) {
  const effectiveSlug = slug || publicSlug;
  const effectiveCapacity = calculatedCapacity ?? roomCapacity;
  const displayName = roomName || draft.headline || '';
  const [activeTab, setActiveTab] = useState<PublicationSubTab>('pricing');
  const headlineInputId = useId();
  const addressInputId = useId();
  const priceInputId = useId();
  const priceUnitSelectId = useId();
  const quotaMinInputId = useId();
  const quotaMaxInputId = useId();
  const descriptionTextareaId = useId();
  const visibilitySwitchId = useId();
  const visibilityStatusId = useId();

  // Focus helper when user clicks on a checklist item
  const handleChecklistNavigate = (tab: PublicationSubTab, targetInputId?: string) => {
    setActiveTab(tab);
    if (targetInputId && typeof window !== 'undefined') {
      window.requestAnimationFrame(() => {
        const el = document.getElementById(targetInputId);
        if (el) {
          el.focus();
        }
      });
    }
  };

  // Validation criteria checklist for public publishing
  const hasTitle = Boolean((draft.headline || displayName).trim());
  const locationMissing = missingPublishLocation(draft);
  const hasCityCommuneNeighborhood =
    Boolean(draft.city?.trim() && draft.commune?.trim() && draft.neighborhood?.trim()) &&
    locationMissing !== 'city' &&
    locationMissing !== 'commune' &&
    locationMissing !== 'neighborhood';
  const hasGps = Boolean(draft.latitude && draft.longitude) && locationMissing !== 'map';
  const priceNum = Number(draft.priceFromFc);
  const hasPrice = Number.isFinite(priceNum) && priceNum > 0;
  const hasPhotos = draft.photos && draft.photos.length > 0;

  const checklistItems = useMemo(
    () => [
      {
        id: 'title',
        label: 'Titre public',
        valid: hasTitle,
        required: true,
        tab: 'pricing' as const,
        targetInputId: headlineInputId,
        detail: draft.headline.trim() || displayName || 'À renseigner',
      },
      {
        id: 'price',
        label: 'Tarif en FC',
        valid: hasPrice,
        required: true,
        tab: 'pricing' as const,
        targetInputId: priceInputId,
        detail: hasPrice ? `${formatFc(priceNum)} · ${PRICE_UNIT_OPTIONS.find((o) => o.id === draft.priceUnit)?.label || draft.priceUnit}` : 'Indiquez un tarif en FC',
      },
      {
        id: 'place',
        label: 'Ville & quartier',
        valid: hasCityCommuneNeighborhood,
        required: true,
        tab: 'location' as const,
        targetInputId: undefined,
        detail: hasCityCommuneNeighborhood ? `${draft.city} (${draft.commune} · ${draft.neighborhood})` : 'Ville, commune & quartier requis',
      },
      {
        id: 'gps',
        label: 'Pointage carte GPS',
        valid: hasGps,
        required: true,
        tab: 'location' as const,
        targetInputId: undefined,
        detail: hasGps ? 'Coordonnées GPS enregistrées' : 'Placez le repère sur la carte',
      },
      {
        id: 'photos',
        label: 'Photos vitrine',
        valid: hasPhotos,
        required: false,
        tab: 'medias' as const,
        targetInputId: undefined,
        detail: hasPhotos ? `${draft.photos.length} média(s) ajouté(s)` : 'Fortement conseillé pour recevoir des devis',
      },
    ],
    [hasTitle, draft.headline, displayName, headlineInputId, hasPrice, priceNum, draft.priceUnit, priceInputId, hasCityCommuneNeighborhood, draft.city, draft.commune, draft.neighborhood, hasGps, hasPhotos, draft.photos.length],
  );

  const requiredCount = checklistItems.filter((i) => i.required).length;
  const completedRequiredCount = checklistItems.filter((i) => i.required && i.valid).length;
  const isReadyToPublish = completedRequiredCount === requiredCount;

  const TABS = [
    { id: 'pricing' as const, label: 'Tarifs & Capacité', icon: Tag, completed: hasTitle && hasPrice },
    { id: 'location' as const, label: 'Localisation & GPS', icon: MapPin, completed: hasCityCommuneNeighborhood && hasGps },
    { id: 'medias' as const, label: 'Photos & Médias', icon: Camera, completed: hasPhotos },
    { id: 'amenities' as const, label: 'Équipements & Dates', icon: Layers, completed: draft.details.amenities.length > 0 },
    { id: 'preview' as const, label: 'Aperçu vitrine', icon: Eye, completed: isReadyToPublish },
  ];

  const handleTabKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const currentIndex = TABS.findIndex((t) => t.id === activeTab);
    const nextIndex = (currentIndex + (e.key === 'ArrowRight' ? 1 : -1) + TABS.length) % TABS.length;
    const nextTab = TABS[nextIndex].id;
    setActiveTab(nextTab);
    window.requestAnimationFrame(() => {
      document.getElementById(`publication-subtab-${nextTab}`)?.focus();
    });
  };

  return (
    <div className="space-y-5">
      {error && (
        <div className="p-3.5 rounded-lg border border-rose-300 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="flex-1">{error}</div>
        </div>
      )}

      {/* Main Publication Visibility Switch Card */}
      <div
        className={cn(
          'p-4 sm:p-5 rounded-xl border transition-all duration-200',
          draft.isPublic
            ? 'bg-emerald-500/5 border-emerald-500/30 dark:bg-emerald-950/20'
            : 'bg-surface-muted/60 border-border dark:bg-surface/50',
        )}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-foreground text-sm sm:text-base">
                Visibilité sur le marketplace public
              </span>
              <Badge variant={draft.isPublic ? 'success' : 'default'} className="gap-1 text-xs">
                {draft.isPublic ? (
                  <>
                    <Globe className="w-3.5 h-3.5" />
                    En ligne (Public)
                  </>
                ) : (
                  <>
                    <GlobeLock className="w-3.5 h-3.5" />
                    Brouillon privé
                  </>
                )}
              </Badge>
              {effectiveSlug && draft.isPublic && (
                <Link
                  href={`/marketplace/salles/${effectiveSlug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary font-medium hover:underline ml-1"
                >
                  <ExternalLink className="w-3 h-3" />
                  Voir la fiche publique
                </Link>
              )}
            </div>
            <p className="text-xs text-muted leading-relaxed max-w-2xl">
              {draft.isPublic
                ? 'Cette salle est visible sur le catalogue public. Les clients peuvent explorer vos équipements, demander un devis et réserver. Vos plans de table et vos événements privés restent strictement confidentiels.'
                : 'La salle est actuellement en mode privé. Elle n’apparaît pas dans les résultats de recherche du marketplace. Vous pouvez préparer votre fiche à votre rythme.'}
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0 self-start sm:self-center">
            <button
              type="button"
              id={visibilitySwitchId}
              role="switch"
              aria-checked={draft.isPublic}
              aria-describedby={visibilityStatusId}
              onClick={() => onChange((d) => ({ ...d, isPublic: !d.isPublic }))}
              className={cn(
                'relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                draft.isPublic ? 'bg-primary' : 'bg-border dark:bg-surface-muted',
              )}
            >
              <span className="sr-only">Visibilité publique sur le catalogue marketplace</span>
              <span
                aria-hidden="true"
                className={cn(
                  'pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out',
                  draft.isPublic ? 'translate-x-7' : 'translate-x-0',
                )}
              />
            </button>
            <span id={visibilityStatusId} className="text-xs font-semibold text-foreground">
              {draft.isPublic ? 'Publiée' : 'Privée'}
            </span>
          </div>
        </div>

        {/* Readiness Checklist */}
        <div className="mt-4 pt-4 border-t border-border/60">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-primary" />
              Checklist de publication ({completedRequiredCount}/{requiredCount} critères obligatoires)
            </span>
            <span className="text-[11px] font-medium text-muted">
              {isReadyToPublish ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Fiche prête pour le public
                </span>
              ) : (
                <span className="text-amber-600 dark:text-amber-400 font-medium">
                  {requiredCount - completedRequiredCount} critère(s) obligatoire(s) manquant(s)
                </span>
              )}
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-surface-muted rounded-full h-1.5 mb-3 overflow-hidden">
            <div
              className={cn(
                'h-full transition-all duration-300 rounded-full',
                isReadyToPublish ? 'bg-emerald-500' : 'bg-primary',
              )}
              style={{ width: `${Math.round((completedRequiredCount / requiredCount) * 100)}%` }}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {checklistItems.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-label={`Accéder à ${item.label} : ${item.valid ? 'valide' : 'à compléter'}`}
                onClick={() => handleChecklistNavigate(item.tab, item.targetInputId)}
                className={cn(
                  'text-left p-2.5 rounded-lg border text-xs transition flex items-start gap-2 group min-h-[44px]',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                  item.valid
                    ? 'border-emerald-500/25 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-800 dark:text-emerald-200'
                    : item.required
                      ? 'border-amber-400/40 bg-amber-500/5 hover:bg-amber-500/10 text-amber-900 dark:text-amber-200'
                      : 'border-border bg-surface hover:bg-surface-muted text-muted',
                )}
              >
                {item.valid ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                ) : item.required ? (
                  <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                ) : (
                  <Info className="w-3.5 h-3.5 text-muted shrink-0 mt-0.5" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="font-semibold flex items-center justify-between">
                    <span>{item.label}</span>
                    <span className="text-[10px] opacity-70 group-hover:underline">Modifier &rarr;</span>
                  </div>
                  <div className="text-[11px] truncate opacity-90">{item.detail}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs with ARIA tablist & keyboard controls */}
      <div
        role="tablist"
        aria-label="Sections de la fiche commerciale"
        onKeyDown={handleTabKeyDown}
        className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-border"
      >
        {TABS.map((tab) => {
          const active = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              role="tab"
              id={`publication-subtab-${tab.id}`}
              aria-selected={active}
              aria-controls={`publication-panel-${tab.id}`}
              tabIndex={active ? 0 : -1}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'min-h-11 px-3.5 py-2 rounded-lg text-xs font-semibold inline-flex items-center gap-2 shrink-0 transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                active
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted hover:text-foreground hover:bg-surface-muted',
              )}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.completed && tab.id !== 'preview' && (
                <span className={cn('w-1.5 h-1.5 rounded-full', active ? 'bg-primary-foreground' : 'bg-emerald-500')} aria-hidden="true" />
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: Tarifs & Capacité */}
      {activeTab === 'pricing' && (
        <div
          role="tabpanel"
          id="publication-panel-pricing"
          aria-labelledby="publication-subtab-pricing"
          tabIndex={0}
          className="space-y-4 animate-in fade-in-50 duration-150 focus-visible:outline-none"
        >
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-foreground">
              Identité commerciale & Tarification
            </h4>
            <p className="text-xs text-muted">
              Le titre et le tarif sont les premiers critères scrutés par les organisateurs d’événements en RDC.
            </p>
          </div>

          <div className="space-y-3">
            <div>
              <label htmlFor={headlineInputId} className="block text-xs font-semibold text-foreground mb-1.5">
                Titre public de la salle <span className="text-rose-500">*</span>
              </label>
              <Input
                id={headlineInputId}
                value={draft.headline}
                onChange={(e) => onChange((d) => ({ ...d, headline: e.target.value }))}
                placeholder={displayName ? `Ex. ${displayName} — Vue Panoramique` : 'Ex. Grand Salon Victoria — Climatisation & Scène'}
                className="text-base sm:text-sm min-h-11"
              />
              <p className="text-[11px] text-muted mt-1">
                Laissez vide pour utiliser par défaut le nom de la salle (« {displayName || 'Sans titre'} »).
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label htmlFor={priceInputId} className="block text-xs font-semibold text-foreground mb-1.5">
                  Tarif de départ en FC <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Input
                    id={priceInputId}
                    type="number"
                    min={0}
                    step={1000}
                    value={draft.priceFromFc}
                    onChange={(e) => onChange((d) => ({ ...d, priceFromFc: e.target.value }))}
                    placeholder="Ex. 150000"
                    className="text-base sm:text-sm min-h-11 pr-12 font-semibold"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-xs font-bold text-muted">
                    FC
                  </div>
                </div>
                <p className="text-[11px] text-muted mt-1">
                  Aperçu : <strong className="text-foreground">{formatFc(Number(draft.priceFromFc) || 0)}</strong>
                </p>
              </div>

              <div>
                <label htmlFor={priceUnitSelectId} className="block text-xs font-semibold text-foreground mb-1.5">
                  Unité de tarification
                </label>
                <select
                  id={priceUnitSelectId}
                  value={draft.priceUnit}
                  onChange={(e) => onChange((d) => ({ ...d, priceUnit: e.target.value as VenuePriceUnit }))}
                  className="w-full min-h-11 px-3 py-2 rounded-lg border border-border bg-surface-muted text-base sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary"
                >
                  {PRICE_UNIT_OPTIONS.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label} — {opt.hint}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-muted mt-1">
                  Ex: « Par événement » couvre toute la soirée ou journée.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label htmlFor={quotaMinInputId} className="block text-xs font-semibold text-foreground mb-1.5">
                  Capacité minimale d'invités
                </label>
                <Input
                  id={quotaMinInputId}
                  type="number"
                  min={0}
                  value={draft.quotaMin}
                  onChange={(e) => onChange((d) => ({ ...d, quotaMin: e.target.value }))}
                  placeholder="Ex. 50"
                  className="text-base sm:text-sm min-h-11"
                />
              </div>

              <div>
                <label htmlFor={quotaMaxInputId} className="block text-xs font-semibold text-foreground mb-1.5">
                  Capacité maximale d'invités
                </label>
                <Input
                  id={quotaMaxInputId}
                  type="number"
                  min={0}
                  value={draft.quotaMax}
                  onChange={(e) => onChange((d) => ({ ...d, quotaMax: e.target.value }))}
                  placeholder={effectiveCapacity ? `Ex. ${effectiveCapacity}` : 'Ex. 500'}
                  className="text-base sm:text-sm min-h-11"
                />
                {effectiveCapacity ? (
                  <div className="flex items-center justify-between gap-2 mt-1">
                    <p className="text-[11px] text-muted">
                      Capacité plan calculée : {effectiveCapacity} places assises.
                    </p>
                    {!draft.quotaMax && (
                      <button
                        type="button"
                        onClick={() => onChange((d) => ({ ...d, quotaMax: String(effectiveCapacity) }))}
                        className="text-[11px] font-semibold text-primary hover:underline"
                      >
                        Appliquer {effectiveCapacity}
                      </button>
                    )}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="pt-2">
              <label htmlFor={descriptionTextareaId} className="block text-xs font-semibold text-foreground mb-1.5">
                Description publique & Argumentaire de vente
              </label>
              <textarea
                id={descriptionTextareaId}
                rows={3}
                value={draft.details.description}
                onChange={(e) => {
                  const desc = e.target.value;
                  onChange((d) => ({
                    ...d,
                    details: { ...d.details, description: desc },
                  }));
                }}
                placeholder="Décrivez l'acoustique, les lumières tamisées, la hauteur sous plafond, la vue extérieure ou les avantages exclusifs..."
                className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-surface-muted text-base sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary"
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Localisation & Carte GPS */}
      {activeTab === 'location' && (
        <div
          role="tabpanel"
          id="publication-panel-location"
          aria-labelledby="publication-subtab-location"
          tabIndex={0}
          className="space-y-4 animate-in fade-in-50 duration-150 focus-visible:outline-none"
        >
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-foreground">
              Localisation & Coordonnées GPS
            </h4>
            <p className="text-xs text-muted">
              Une localisation précise permet d'orienter vos clients avec le guidage GPS et d'apparaître dans les recherches par commune.
            </p>
          </div>

          <div className="space-y-3">
            <CityLocationFields
              city={draft.city}
              commune={draft.commune}
              neighborhood={draft.neighborhood}
              onChange={({ city, commune, neighborhood }) =>
                onChange((d) => ({ ...d, city, commune, neighborhood }))
              }
            />

            <div>
              <label htmlFor={addressInputId} className="block text-xs font-semibold text-foreground mb-1.5">
                Adresse physique & Repères d'accès
              </label>
              <Input
                id={addressInputId}
                value={draft.address}
                onChange={(e) => onChange((d) => ({ ...d, address: e.target.value }))}
                placeholder="Ex. 12, Boulevard du 30 Juin (Réf. en face de la banque)"
                className="text-base sm:text-sm min-h-11"
              />
            </div>

            <div className="pt-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-primary" />
                  Positionnement GPS sur la carte <span className="text-rose-500">*</span>
                </span>
                <span className="text-[11px] text-muted">
                  {hasGps ? (
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                      ✓ Position enregistrée ({Number(draft.latitude).toFixed(4)}, {Number(draft.longitude).toFixed(4)})
                    </span>
                  ) : (
                    <span className="text-amber-600 dark:text-amber-400">
                      Cliquez sur la carte pour placer le repère exact
                    </span>
                  )}
                </span>
              </div>
              <LocationPickerMap
                latitude={draft.latitude}
                longitude={draft.longitude}
                city={draft.city}
                commune={draft.commune}
                required
                onChange={({ latitude, longitude }) =>
                  onChange((d) => ({ ...d, latitude, longitude }))
                }
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Photos & Galerie vitrine */}
      {activeTab === 'medias' && (
        <div
          role="tabpanel"
          id="publication-panel-medias"
          aria-labelledby="publication-subtab-medias"
          tabIndex={0}
          className="space-y-4 animate-in fade-in-50 duration-150 focus-visible:outline-none"
        >
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-foreground">
              Photos & Médias de la salle
            </h4>
            <p className="text-xs text-muted">
              Les salles avec au moins 3 photos réalistes reçoivent 5 fois plus de demandes de réservation.
            </p>
          </div>

          <div className="p-3.5 rounded-lg border border-primary/20 bg-primary/5 text-xs text-foreground flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold text-primary">Conseil de mise en valeur</span>
              <p className="text-muted leading-relaxed">
                La 1ère image sert d’image de couverture sur le marketplace. Ajoutez des photos en grand angle, des prises de vue de jour et des ambiances nocturnes illuminées.
              </p>
            </div>
          </div>

          <MarketplaceMediaField
            urls={draft.photos}
            onChange={(photos) => onChange((d) => ({ ...d, photos }))}
          />
        </div>
      )}

      {/* TAB 4: Commodités & Calendrier */}
      {activeTab === 'amenities' && (
        <div
          role="tabpanel"
          id="publication-panel-amenities"
          aria-labelledby="publication-subtab-amenities"
          tabIndex={0}
          className="space-y-4 animate-in fade-in-50 duration-150 focus-visible:outline-none"
        >
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-foreground">
              Commodités, Équipements & Dates indisponibles
            </h4>
            <p className="text-xs text-muted">
              Cochez les équipements inclus et bloquez les dates où la salle n'est pas disponible.
            </p>
          </div>

          <ListingDetailsFields
            kind="venue"
            hideDescription
            value={draft.details}
            onChange={(details: ListingDetails) => onChange((d) => ({ ...d, details }))}
          />

          <div className="pt-3 border-t border-border">
            <h5 className="text-xs font-bold text-foreground mb-2 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-primary" />
              Calendrier des disponibilités & Dates bloquées
            </h5>
            <BlockedDatesField
              value={draft.blockedDates}
              bookedDates={draft.bookedDates}
              onChange={(blockedDates) => onChange((d) => ({ ...d, blockedDates }))}
            />
          </div>
        </div>
      )}

      {/* TAB 5: Live Marketplace Card Preview */}
      {activeTab === 'preview' && (
        <div
          role="tabpanel"
          id="publication-panel-preview"
          aria-labelledby="publication-subtab-preview"
          tabIndex={0}
          className="space-y-4 animate-in fade-in-50 duration-150 focus-visible:outline-none"
        >
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-foreground">
              Aperçu en direct sur le Marketplace
            </h4>
            <p className="text-xs text-muted">
              Voici comment votre salle apparaît aux visiteurs et futurs clients dans le catalogue public.
            </p>
          </div>

          <div className="max-w-md mx-auto rounded-xl border border-border bg-surface overflow-hidden shadow-xs">
            {/* Preview Photo */}
            <div className="relative aspect-video w-full bg-surface-muted overflow-hidden">
              {draft.photos && draft.photos[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={draft.photos[0]}
                  alt={draft.headline || displayName || 'Aperçu salle'}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-muted gap-2 bg-gradient-to-br from-surface to-surface-muted">
                  <Camera className="w-8 h-8 opacity-40" />
                  <span className="text-xs font-medium">Aucune photo de couverture</span>
                </div>
              )}
              <div className="absolute top-2.5 left-2.5">
                <Badge variant={draft.isPublic ? 'success' : 'default'} className="shadow-xs backdrop-blur-md">
                  {draft.isPublic ? 'En ligne' : 'Brouillon'}
                </Badge>
              </div>
              {hasPrice && (
                <div className="absolute bottom-2.5 right-2.5 bg-background/90 backdrop-blur-md px-3 py-1 rounded-lg shadow-xs text-xs font-extrabold text-foreground border border-border/60">
                  {formatFc(priceNum)}
                  <span className="text-[10px] font-normal text-muted ml-1">
                    / {PRICE_UNIT_OPTIONS.find((o) => o.id === draft.priceUnit)?.label.toLowerCase().replace('par ', '') || 'événement'}
                  </span>
                </div>
              )}
            </div>

            {/* Preview Card Body */}
            <div className="p-4 space-y-2.5">
              <div>
                <h5 className="font-bold text-foreground text-sm truncate">
                  {draft.headline || displayName || 'Titre de la salle'}
                </h5>
                <p className="text-xs text-muted flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3 h-3 shrink-0 text-primary" />
                  {draft.city ? (
                    <span>
                      {draft.city}
                      {draft.commune ? ` · ${draft.commune}` : ''}
                      {draft.neighborhood ? ` (${draft.neighborhood})` : ''}
                    </span>
                  ) : (
                    <span>Emplacement non renseigné</span>
                  )}
                </p>
              </div>

              {/* Capacité & Typologie */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                {(draft.quotaMin || draft.quotaMax || effectiveCapacity) && (
                  <span className="text-[11px] px-2 py-0.5 rounded-md bg-surface-muted border border-border text-foreground font-medium">
                    {draft.quotaMin && draft.quotaMax
                      ? `${draft.quotaMin} à ${draft.quotaMax} invités`
                      : draft.quotaMax
                        ? `Jusqu'à ${draft.quotaMax} invités`
                        : effectiveCapacity
                          ? `${effectiveCapacity} places`
                          : ''}
                  </span>
                )}
                {roomType && (
                  <span className="text-[11px] px-2 py-0.5 rounded-md bg-primary/10 border border-primary/20 text-primary font-medium">
                    {roomType}
                  </span>
                )}
              </div>

              {/* Equipements */}
              {draft.details.amenities.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {draft.details.amenities.slice(0, 4).map((amenity) => (
                    <span
                      key={amenity}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-surface border border-border text-muted"
                    >
                      {amenity}
                    </span>
                  ))}
                  {draft.details.amenities.length > 4 && (
                    <span className="text-[10px] text-muted self-center">
                      +{draft.details.amenities.length - 4}
                    </span>
                  )}
                </div>
              )}

              {draft.details.description && (
                <p className="text-xs text-muted line-clamp-2 pt-1 leading-relaxed">
                  {draft.details.description}
                </p>
              )}

              <div className="pt-2 border-t border-border flex items-center justify-between">
                <span className="text-[11px] font-semibold text-primary">
                  Demande de devis & réservation
                </span>
                <span className="text-[11px] text-muted">EventMaster Marketplace</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
