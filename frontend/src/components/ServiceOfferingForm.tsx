'use client';

import React, { useId, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Camera,
  CheckCircle2,
  ChevronDown,
  Info,
  MapPin,
} from 'lucide-react';
import { Alert, Button, Input } from '@/components/ui';
import { cn } from '@/lib/cn';
import {
  PRICE_UNIT_OPTIONS,
  SERVICE_CATEGORY_LABELS,
  SERVICE_RENTAL_CATEGORIES,
  SERVICE_TRADE_CATEGORIES,
  defaultUnitForServiceCategory,
  isServiceRentalCategory,
  missingPublishLocation,
  unitsForServiceCategory,
  type ServiceCategory,
  type VenuePriceUnit,
} from '@/lib/marketplace';
import type { ListingDetails } from '@/lib/listingDetails';
import ListingDetailsFields from '@/components/ListingDetailsFields';
import BlockedDatesField from '@/components/BlockedDatesField';
import MarketplaceMediaField from '@/components/MarketplaceMediaField';
import MarketplaceFormTabs, { listingTabPanelId, type MarketplaceFormTab } from '@/components/MarketplaceFormTabs';
import LocationPickerMap from '@/components/LocationPickerMap';
import CityLocationFields from '@/components/CityLocationFields';
import { communesForCity } from '@/lib/rdcCities';

export const OFFERING_TITLE_FIELD_ID = 'offering-title';
export const OFFERING_PRICE_FIELD_ID = 'offering-price';
export const OFFERING_PROMO_FIELD_ID = 'offering-promo-price';
export const OFFERING_DELIVERY_FIELD_ID = 'offering-delivery-price';
export const OFFERING_RADIUS_FIELD_ID = 'offering-radius';
export const OFFERING_CITY_SECTION_ID = 'offering-city';

const FIELD_CONTROL_CLASS =
  'w-full min-h-11 px-3.5 py-2.5 rounded-[var(--radius-button)] border border-border bg-surface-muted text-base sm:text-sm text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:border-primary';

const EDITOR_TABS: MarketplaceFormTab[] = ['details', 'map', 'medias'];

export type ServiceOfferingDraft = {
  title: string;
  description: string;
  category: ServiceCategory;
  city: string;
  commune: string;
  neighborhood: string;
  coverageRadiusKm: string;
  travels: boolean;
  deliveryMode: '' | 'included' | 'extra_fee';
  deliveryPriceFc: string;
  latitude: string;
  longitude: string;
  priceFromFc: string;
  priceUnit: VenuePriceUnit;
  promoPriceFc: string;
  promoLabel: string;
  promoEndsAt: string;
  quotaMin: string;
  quotaMax: string;
  photos: string[];
  blockedDates: string[];
  bookedDates: string[];
  isPublic: boolean;
  details: ListingDetails;
};

export type OfferingPublishGap = {
  tab: MarketplaceFormTab;
  message: string;
  fieldId?: string;
};

export function getOfferingPublishGaps(draft: ServiceOfferingDraft): OfferingPublishGap[] {
  const gaps: OfferingPublishGap[] = [];
  if (!draft.title.trim()) {
    gaps.push({ tab: 'details', message: 'Ajoutez un titre.', fieldId: OFFERING_TITLE_FIELD_ID });
  }
  const missing = missingPublishLocation(draft);
  if (missing === 'city') {
    gaps.push({ tab: 'map', message: 'Choisissez la ville.', fieldId: OFFERING_CITY_SECTION_ID });
  } else if (missing === 'commune') {
    gaps.push({ tab: 'map', message: 'Choisissez la commune.', fieldId: OFFERING_CITY_SECTION_ID });
  } else if (missing === 'neighborhood') {
    gaps.push({ tab: 'map', message: 'Choisissez le quartier.', fieldId: OFFERING_CITY_SECTION_ID });
  } else if (missing === 'map') {
    gaps.push({ tab: 'map', message: 'Placez le point sur la carte.' });
  }
  if (isServiceRentalCategory(draft.category) && draft.travels) {
    if (draft.deliveryMode !== 'included' && draft.deliveryMode !== 'extra_fee') {
      gaps.push({
        tab: 'map',
        message: 'Livraison : incluse ou en supplément ?',
        fieldId: OFFERING_DELIVERY_FIELD_ID,
      });
    } else if (!(Number(draft.deliveryPriceFc) > 0)) {
      gaps.push({
        tab: 'map',
        message: 'Indiquez le prix de la livraison.',
        fieldId: OFFERING_DELIVERY_FIELD_ID,
      });
    }
  }
  if (draft.travels && !(Number(draft.coverageRadiusKm) > 0)) {
    gaps.push({
      tab: 'map',
      message: isServiceRentalCategory(draft.category)
        ? 'Indiquez jusqu’où vous livrez (km).'
        : 'Indiquez jusqu’où vous vous déplacez (km).',
      fieldId: OFFERING_RADIUS_FIELD_ID,
    });
  }
  const promo = offeringPromoMessage(draft);
  if (promo) {
    gaps.push({ tab: 'details', message: promo, fieldId: OFFERING_PROMO_FIELD_ID });
  }
  return gaps;
}

export function offeringDeliveryMessage(
  draft: Pick<ServiceOfferingDraft, 'category' | 'travels' | 'deliveryMode' | 'deliveryPriceFc'>,
): string {
  if (!isServiceRentalCategory(draft.category) || !draft.travels) return '';
  const modeChosen = draft.deliveryMode === 'included' || draft.deliveryMode === 'extra_fee';
  if (!modeChosen) return '';
  if (!(Number(draft.deliveryPriceFc) > 0)) return 'Indiquez le prix de la livraison.';
  return '';
}

export function offeringPromoMessage(draft: Pick<ServiceOfferingDraft, 'priceFromFc' | 'promoPriceFc'>): string {
  if (!draft.promoPriceFc.trim()) return '';
  const price = Number(draft.priceFromFc);
  const promo = Number(draft.promoPriceFc);
  if (!draft.priceFromFc.trim() || !Number.isFinite(price) || price <= 0) {
    return 'Indiquez d’abord le prix normal.';
  }
  if (!Number.isFinite(promo) || promo < 0) return 'Montant invalide.';
  if (promo >= price) return 'Le prix promo doit être plus bas que le prix normal.';
  return '';
}

export function focusOfferingField(fieldId?: string) {
  if (!fieldId || typeof window === 'undefined') return;
  window.requestAnimationFrame(() => {
    document.getElementById(fieldId)?.focus();
  });
}

function FormSection({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {hint ? <p className="text-xs text-muted leading-relaxed">{hint}</p> : null}
      </div>
      {children}
    </section>
  );
}

/** Bloc facultatif replié par défaut : garde le formulaire court. */
function OptionalSection({
  title,
  summary,
  defaultOpen = false,
  children,
}: {
  title: string;
  summary?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details
      open={defaultOpen || undefined}
      className="group rounded-[var(--radius-card)] border border-border bg-surface"
    >
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-3 py-2.5 [&::-webkit-details-marker]:hidden">
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-foreground">{title}</span>
          {summary ? <span className="block text-xs text-muted truncate">{summary}</span> : null}
        </span>
        <span className="text-[11px] font-medium text-muted">Facultatif</span>
        <ChevronDown className="w-4 h-4 text-muted transition-transform group-open:rotate-180" aria-hidden />
      </summary>
      <div className="space-y-3 border-t border-border px-3 pb-3 pt-3">{children}</div>
    </details>
  );
}

function CategoryPills({
  category,
  rental,
  onChange,
}: {
  category: ServiceCategory;
  rental: boolean;
  onChange: (category: ServiceCategory) => void;
}) {
  const options = rental ? SERVICE_RENTAL_CATEGORIES : SERVICE_TRADE_CATEGORIES;
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Catégorie">
      {options.map((id) => {
        const selected = category === id;
        return (
          <button
            key={id}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(id)}
            className={cn(
              'min-h-11 px-3 py-2 rounded-[var(--radius-button)] text-xs font-semibold border transition',
              selected
                ? 'bg-primary-solid text-primary-foreground border-primary-solid'
                : 'bg-surface-muted text-muted border-border hover:text-foreground hover:border-primary/30',
            )}
          >
            {SERVICE_CATEGORY_LABELS[id]}
          </button>
        );
      })}
    </div>
  );
}

export default function ServiceOfferingForm({
  draft,
  onChange,
  tab,
  onTabChange,
  error,
  onUploadingChange,
}: {
  draft: ServiceOfferingDraft;
  onChange: React.Dispatch<React.SetStateAction<ServiceOfferingDraft>>;
  tab: MarketplaceFormTab;
  onTabChange: (tab: MarketplaceFormTab) => void;
  error?: string;
  /** Vrai tant que des photos sont en cours d’envoi. */
  onUploadingChange?: (uploading: boolean) => void;
}) {
  const [communePriceQuery, setCommunePriceQuery] = useState('');
  const descriptionId = useId();
  const unitId = useId();
  const rental = isServiceRentalCategory(draft.category);
  const categoryOptions = rental ? SERVICE_RENTAL_CATEGORIES : SERVICE_TRADE_CATEGORIES;
  const gaps = useMemo(() => getOfferingPublishGaps(draft), [draft]);
  const hasTitle = Boolean(draft.title.trim());
  const locationMissing = missingPublishLocation(draft);
  const hasPlace = !locationMissing || locationMissing === 'map';
  const hasGps = locationMissing === null;
  const hasPhotos = draft.photos.length > 0;
  const priceNum = Number(draft.priceFromFc);
  const hasPrice = Number.isFinite(priceNum) && priceNum > 0;
  const requiredCount = 3;
  const completedRequiredCount = [hasTitle, hasPlace, hasGps].filter(Boolean).length;
  const ready = gaps.length === 0;
  const kinshasaCommunes = communesForCity('Kinshasa');
  const communeNeedle = communePriceQuery.trim().toLowerCase();
  const visibleDeliveryCommunes = communeNeedle
    ? kinshasaCommunes.filter((item) => item.name.toLowerCase().includes(communeNeedle))
    : kinshasaCommunes;
  const pricedDeliveryCount = kinshasaCommunes.filter((item) => {
    const amount = Number(String(draft.details.deliveryByCommune?.[item.name] || '').replace(/\s/g, ''));
    return Number.isFinite(amount) && amount > 0;
  }).length;

  const goTo = (next: MarketplaceFormTab, fieldId?: string) => {
    onTabChange(next);
    focusOfferingField(fieldId);
  };

  const setCategory = (category: ServiceCategory) => {
    onChange((current) => ({
      ...current,
      category,
      priceUnit: unitsForServiceCategory(category).includes(current.priceUnit)
        ? current.priceUnit
        : defaultUnitForServiceCategory(category),
    }));
  };

  const tabIndex = EDITOR_TABS.indexOf(tab);
  const nextTab = tabIndex >= 0 && tabIndex < EDITOR_TABS.length - 1 ? EDITOR_TABS[tabIndex + 1] : null;
  const prevTab = tabIndex > 0 ? EDITOR_TABS[tabIndex - 1] : null;
  const tabLabels: Record<'details' | 'map' | 'medias', string> = {
    details: 'Offre',
    map: 'Lieu',
    medias: 'Photos',
  };
  const unitLabel = PRICE_UNIT_OPTIONS.find((opt) => opt.id === draft.priceUnit)?.label || draft.priceUnit;
  const hasPromo = Boolean(draft.promoPriceFc.trim() || draft.promoLabel.trim() || draft.promoEndsAt);
  const hasQuota = Boolean(draft.quotaMin.trim() || draft.quotaMax.trim());
  const hasContact = Boolean(draft.details.contactPhone?.trim() || draft.details.contactWhatsapp?.trim());
  const pillClass = (active: boolean) => cn(
    'min-h-11 px-3.5 py-2 rounded-full text-sm font-semibold border transition',
    active
      ? 'bg-primary-solid text-primary-foreground border-primary-solid'
      : 'bg-surface text-muted border-border hover:text-foreground hover:border-primary/30',
  );

  const checklist = [
    { id: 'title', label: 'Titre', valid: hasTitle, required: true, tab: 'details' as const, fieldId: OFFERING_TITLE_FIELD_ID },
    { id: 'place', label: 'Ville et quartier', valid: hasPlace, required: true, tab: 'map' as const, fieldId: OFFERING_CITY_SECTION_ID },
    { id: 'gps', label: 'Point sur la carte', valid: hasGps, required: true, tab: 'map' as const },
    { id: 'photos', label: 'Photos (conseillé)', valid: hasPhotos, required: false, tab: 'medias' as const },
  ];

  return (
    <div className="space-y-4">
      {error ? <Alert variant="error">{error}</Alert> : null}

      <div className="rounded-[var(--radius-card)] border border-border bg-surface p-3 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-foreground">
            {ready ? 'Prêt à publier' : 'Avant de publier'}
          </p>
          <p className={cn('text-xs font-semibold tabular-nums', ready ? 'text-primary' : 'text-muted')}>
            {completedRequiredCount}/{requiredCount} obligatoires
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {checklist.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => goTo(item.tab, item.fieldId)}
              className={cn(
                'min-h-9 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                item.valid
                  ? 'border-primary/25 bg-primary/5 text-foreground'
                  : item.required
                    ? 'border-festive-accent/40 bg-festive-accent/8 text-foreground hover:border-festive-accent'
                    : 'border-border bg-surface text-muted hover:text-foreground',
              )}
            >
              {item.valid ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-primary" aria-hidden />
              ) : item.required ? (
                <AlertCircle className="w-3.5 h-3.5 text-festive-accent" aria-hidden />
              ) : (
                <Info className="w-3.5 h-3.5" aria-hidden />
              )}
              {item.label}
              {item.id === 'photos' && hasPhotos ? ` · ${draft.photos.length}` : ''}
            </button>
          ))}
        </div>
      </div>

      <MarketplaceFormTabs
        value={tab}
        onChange={onTabChange}
        include={EDITOR_TABS}
        labelledPanels
        labels={{
          details: `1. ${tabLabels.details}`,
          map: `2. ${tabLabels.map}`,
          medias: `3. ${tabLabels.medias}`,
        }}
        badges={{
          medias: draft.photos.length || undefined,
        }}
      />

      {tab === 'details' ? (
        <div id={listingTabPanelId('details')} role="tabpanel" aria-labelledby="listing-tab-details" className="space-y-6">
          <FormSection title={rental ? 'Votre matériel' : 'Votre prestation'}>
            <Input
              id={OFFERING_TITLE_FIELD_ID}
              label="Titre"
              required
              value={draft.title}
              onChange={(e) => onChange((current) => ({ ...current, title: e.target.value }))}
              placeholder={rental ? 'Ex. Sono 12 enceintes + table de mixage' : 'Ex. Traiteur mariage, 150 à 300 invités'}
              hint="Écrivez ce que le client chercherait."
            />
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-muted">Catégorie</p>
              <CategoryPills category={draft.category} rental={rental} onChange={setCategory} />
              {!categoryOptions.includes(draft.category) ? (
                <p className="text-xs text-danger">Choisissez une catégorie dans la liste.</p>
              ) : null}
            </div>
            <label className="block space-y-1.5" htmlFor={descriptionId}>
              <span className="text-xs font-semibold text-muted">Description</span>
              <textarea
                id={descriptionId}
                rows={4}
                value={draft.description}
                onChange={(e) => onChange((current) => ({ ...current, description: e.target.value }))}
                className={FIELD_CONTROL_CLASS}
                placeholder={draft.category === 'RENTAL_CHAIRS'
                  ? 'Modèles, couleurs, housses, livraison, caution…'
                  : rental
                  ? 'Ce que vous louez, modèles, caution, livraison…'
                  : 'Ce que vous proposez, ce qui est inclus, votre équipe…'}
              />
            </label>
          </FormSection>

          <FormSection
            title="Prix"
            hint={hasPrice
              ? `Affiché : à partir de ${priceNum.toLocaleString('fr-FR')} FC, ${unitLabel.toLowerCase()}.`
              : 'Sans prix, les clients vous demandent un devis.'}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                id={OFFERING_PRICE_FIELD_ID}
                label="Prix de départ (FC)"
                type="number"
                inputMode="numeric"
                min={0}
                value={draft.priceFromFc}
                onChange={(e) => onChange((current) => ({ ...current, priceFromFc: e.target.value }))}
                placeholder="Sur devis"
              />
              <label className="block space-y-1.5" htmlFor={unitId}>
                <span className="text-xs font-semibold text-muted">Par</span>
                <select
                  id={unitId}
                  value={draft.priceUnit}
                  onChange={(e) => onChange((current) => ({ ...current, priceUnit: e.target.value as VenuePriceUnit }))}
                  className={FIELD_CONTROL_CLASS}
                >
                  {unitsForServiceCategory(draft.category).map((id) => {
                    const opt = PRICE_UNIT_OPTIONS.find((item) => item.id === id);
                    return (
                      <option key={id} value={id}>{opt?.label || id}</option>
                    );
                  })}
                </select>
              </label>
            </div>
          </FormSection>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Pour aller plus loin</p>

            <OptionalSection
              title="Promotion"
              summary={draft.promoPriceFc.trim()
                ? `${Number(draft.promoPriceFc).toLocaleString('fr-FR')} FC${draft.promoLabel.trim() ? ` · ${draft.promoLabel.trim()}` : ''}`
                : 'Un prix réduit pour une durée limitée.'}
              defaultOpen={hasPromo || Boolean(offeringPromoMessage(draft))}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  id={OFFERING_PROMO_FIELD_ID}
                  label="Prix promo (FC)"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={draft.promoPriceFc}
                  onChange={(e) => onChange((current) => ({ ...current, promoPriceFc: e.target.value }))}
                  error={offeringPromoMessage(draft)}
                />
                <Input
                  label="Fin de la promo"
                  type="date"
                  value={draft.promoEndsAt}
                  onChange={(e) => onChange((current) => ({ ...current, promoEndsAt: e.target.value }))}
                />
                <div className="sm:col-span-2">
                  <Input
                    label="Nom de la promo"
                    value={draft.promoLabel}
                    onChange={(e) => onChange((current) => ({ ...current, promoLabel: e.target.value }))}
                    placeholder="Ex. Offre mariage -10 %"
                  />
                </div>
              </div>
            </OptionalSection>

            <OptionalSection
              title={rental ? 'Quantités' : 'Nombre d’invités'}
              summary={hasQuota
                ? `${draft.quotaMin || '…'} à ${draft.quotaMax || '…'}`
                : rental ? 'Commande minimum et stock disponible.' : 'Minimum et maximum pour ce prix.'}
              defaultOpen={hasQuota}
            >
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Minimum"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={draft.quotaMin}
                  onChange={(e) => onChange((current) => ({ ...current, quotaMin: e.target.value }))}
                />
                <Input
                  label="Maximum"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={draft.quotaMax}
                  onChange={(e) => onChange((current) => ({ ...current, quotaMax: e.target.value }))}
                />
              </div>
            </OptionalSection>

            <OptionalSection
              title="Contact et infos pratiques"
              summary={hasContact ? 'Contact renseigné.' : 'Téléphone, WhatsApp, ce qui est inclus…'}
            >
              <ListingDetailsFields
                kind="service"
                hideDescription
                category={draft.category}
                value={draft.details}
                onChange={(details) => onChange((current) => ({ ...current, details }))}
              />
            </OptionalSection>

            <OptionalSection
              title="Jours indisponibles"
              summary={draft.blockedDates.length
                ? `${draft.blockedDates.length} jour${draft.blockedDates.length > 1 ? 's' : ''} bloqué${draft.blockedDates.length > 1 ? 's' : ''}.`
                : 'Bloquez les jours déjà pris ailleurs.'}
            >
              <BlockedDatesField
                value={draft.blockedDates}
                bookedDates={draft.bookedDates}
                onChange={(blockedDates) => onChange((current) => ({ ...current, blockedDates }))}
              />
            </OptionalSection>
          </div>
        </div>
      ) : null}

      {tab === 'map' ? (
        <div id={listingTabPanelId('map')} role="tabpanel" aria-labelledby="listing-tab-map" className="space-y-6">
          <FormSection title="Où êtes-vous ?" hint="Obligatoire pour apparaître dans les recherches.">
            <div id={OFFERING_CITY_SECTION_ID} tabIndex={-1}>
              <CityLocationFields
                city={draft.city}
                commune={draft.commune}
                neighborhood={draft.neighborhood}
                onChange={({ city, commune, neighborhood }) =>
                  onChange((current) => ({ ...current, city, commune, neighborhood }))
                }
              />
            </div>
          </FormSection>

          <FormSection title="Point sur la carte" hint="Touchez la carte à votre adresse.">
            <LocationPickerMap
              latitude={draft.latitude}
              longitude={draft.longitude}
              city={draft.city}
              commune={draft.commune}
              required
              onChange={({ latitude, longitude }) => onChange((current) => ({ ...current, latitude, longitude }))}
            />
          </FormSection>

          <FormSection title={rental ? 'Livraison' : 'Déplacement'}>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label={rental ? 'Livraison' : 'Déplacement'}>
              {[
                { id: false, label: rental ? 'Le client vient chercher' : 'Chez moi uniquement' },
                { id: true, label: rental ? 'Je livre' : 'Je me déplace' },
              ].map((opt) => (
                <button
                  key={String(opt.id)}
                  type="button"
                  aria-pressed={draft.travels === opt.id}
                  onClick={() => onChange((current) => ({
                    ...current,
                    travels: opt.id,
                    coverageRadiusKm: opt.id ? current.coverageRadiusKm : '',
                    deliveryMode: opt.id ? current.deliveryMode : '',
                    deliveryPriceFc: opt.id ? current.deliveryPriceFc : '',
                  }))}
                  className={pillClass(draft.travels === opt.id)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {draft.travels ? (
              <>
                <Input
                  id={OFFERING_RADIUS_FIELD_ID}
                  label={rental ? 'Je livre jusqu’à (km)' : 'Je me déplace jusqu’à (km)'}
                  type="number"
                  inputMode="numeric"
                  min={1}
                  required
                  value={draft.coverageRadiusKm}
                  onChange={(e) => onChange((current) => ({ ...current, coverageRadiusKm: e.target.value }))}
                />
                {rental ? (
                  <>
                    <div className="space-y-1.5">
                      <p className="text-xs font-semibold text-muted">Prix de la livraison</p>
                      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Prix de la livraison">
                        {([
                          { id: 'included' as const, label: 'Inclus dans le prix' },
                          { id: 'extra_fee' as const, label: 'En supplément' },
                        ]).map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            aria-pressed={draft.deliveryMode === opt.id}
                            onClick={() => onChange((current) => ({
                              ...current,
                              deliveryMode: current.deliveryMode === opt.id ? '' : opt.id,
                            }))}
                            className={pillClass(draft.deliveryMode === opt.id)}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    {draft.deliveryMode === 'included' || draft.deliveryMode === 'extra_fee' ? (
                      <>
                        <Input
                          id={OFFERING_DELIVERY_FIELD_ID}
                          label={draft.deliveryMode === 'extra_fee' ? 'Supplément livraison (FC)' : 'Valeur de la livraison incluse (FC)'}
                          type="number"
                          inputMode="numeric"
                          min={1}
                          value={draft.deliveryPriceFc}
                          onChange={(e) => onChange((current) => ({ ...current, deliveryPriceFc: e.target.value }))}
                          error={offeringDeliveryMessage(draft)}
                          hint={draft.deliveryMode === 'extra_fee'
                            ? 'Ajouté une fois au prix de location.'
                            : 'Affiché au client, jamais ajouté au total.'}
                        />
                        {draft.deliveryMode === 'extra_fee' && (!draft.city || draft.city.toLowerCase() === 'kinshasa') ? (
                          <OptionalSection
                            title="Prix par commune de Kinshasa"
                            summary={pricedDeliveryCount === 0
                              ? 'Sinon, le supplément ci-dessus s’applique.'
                              : `${pricedDeliveryCount} commune${pricedDeliveryCount > 1 ? 's' : ''} avec un prix.`}
                            defaultOpen={pricedDeliveryCount > 0}
                          >
                            <label className="block space-y-1.5">
                              <span className="text-xs font-semibold text-muted">Chercher une commune</span>
                              <input
                                type="search"
                                value={communePriceQuery}
                                onChange={(event) => setCommunePriceQuery(event.target.value)}
                                placeholder="Gombe, Lemba…"
                                className={FIELD_CONTROL_CLASS}
                              />
                            </label>
                            {visibleDeliveryCommunes.length === 0 ? (
                              <p className="text-sm text-muted" role="status">Aucune commune pour « {communePriceQuery.trim()} ».</p>
                            ) : (
                              <div className="max-h-80 space-y-2 overflow-y-auto overscroll-y-contain pr-1">
                                {visibleDeliveryCommunes.map((commune) => (
                                  <label key={commune.name} className="grid grid-cols-[minmax(0,1fr)_8.5rem] items-center gap-2">
                                    <span className="text-sm text-foreground">{commune.name}</span>
                                    <input
                                      type="number"
                                      min={1}
                                      inputMode="numeric"
                                      aria-label={`Livraison vers ${commune.name}, en FC`}
                                      placeholder="FC"
                                      value={draft.details.deliveryByCommune?.[commune.name] || ''}
                                      onChange={(e) => onChange((current) => ({
                                        ...current,
                                        details: {
                                          ...current.details,
                                          deliveryByCommune: {
                                            ...(current.details.deliveryByCommune || {}),
                                            [commune.name]: e.target.value,
                                          },
                                        },
                                      }))}
                                      className={cn(FIELD_CONTROL_CLASS, 'tabular-nums')}
                                    />
                                  </label>
                                ))}
                              </div>
                            )}
                          </OptionalSection>
                        ) : null}
                      </>
                    ) : (
                      <p id={OFFERING_DELIVERY_FIELD_ID} tabIndex={-1} className="text-sm text-muted">
                        Choisissez une option ci-dessus.
                      </p>
                    )}
                  </>
                ) : null}
              </>
            ) : (
              <p className="text-sm text-muted">
                {rental
                  ? 'Le client récupère le matériel à votre adresse.'
                  : 'Le client vient à votre adresse.'}
              </p>
            )}
          </FormSection>
        </div>
      ) : null}

      {/* Toujours monté : les envois de photos continuent même si l’on change d’onglet. */}
      <div
        id={listingTabPanelId('medias')}
        role="tabpanel"
        aria-labelledby="listing-tab-medias"
        hidden={tab !== 'medias'}
        className="space-y-3"
      >
        <FormSection
          title={rental ? 'Photos du matériel' : 'Photos de vos réalisations'}
          hint="Les offres avec photos reçoivent beaucoup plus de demandes."
        >
          <MarketplaceMediaField
            urls={draft.photos}
            onChange={(photos) => onChange((current) => ({ ...current, photos }))}
            onUploadingChange={onUploadingChange}
          />
        </FormSection>
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-border pt-3">
        {prevTab ? (
          <Button type="button" variant="ghost" size="sm" onClick={() => onTabChange(prevTab)} leftIcon={<ArrowLeft className="w-4 h-4" />}>
            {tabLabels[prevTab as keyof typeof tabLabels]}
          </Button>
        ) : (
          <span className="text-xs text-muted">Étape {tabIndex + 1} sur {EDITOR_TABS.length}</span>
        )}
        {nextTab ? (
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => onTabChange(nextTab)}
            rightIcon={<ArrowRight className="w-4 h-4" />}
            leftIcon={nextTab === 'map' ? <MapPin className="w-4 h-4" /> : <Camera className="w-4 h-4" />}
          >
            Suivant : {tabLabels[nextTab as keyof typeof tabLabels]}
          </Button>
        ) : (
          <span className="text-xs text-muted text-right">Dernière étape. Publiez ci-dessous.</span>
        )}
      </div>
    </div>
  );
}
