'use client';

import React, { useId, useMemo } from 'react';
import {
  AlertCircle,
  CalendarDays,
  Camera,
  CheckCircle2,
  Info,
  MapPin,
  ShieldCheck,
  Tag,
} from 'lucide-react';
import { Alert, Button, Input } from '@/components/ui';
import { cn } from '@/lib/cn';
import {
  PRICE_UNIT_OPTIONS,
  SERVICE_CATEGORY_LABELS,
  SERVICE_CATEGORY_META,
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

export const OFFERING_TITLE_FIELD_ID = 'offering-title';
export const OFFERING_PRICE_FIELD_ID = 'offering-price';
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
  latitude: string;
  longitude: string;
  priceFromFc: string;
  priceUnit: VenuePriceUnit;
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
    gaps.push({ tab: 'details', message: 'Donnez un titre visible aux clients.', fieldId: OFFERING_TITLE_FIELD_ID });
  }
  const missing = missingPublishLocation(draft);
  if (missing === 'city') {
    gaps.push({ tab: 'map', message: 'Choisissez une ville active.', fieldId: OFFERING_CITY_SECTION_ID });
  } else if (missing === 'commune') {
    gaps.push({ tab: 'map', message: 'Choisissez la commune.', fieldId: OFFERING_CITY_SECTION_ID });
  } else if (missing === 'neighborhood') {
    gaps.push({ tab: 'map', message: 'Choisissez le quartier.', fieldId: OFFERING_CITY_SECTION_ID });
  } else if (missing === 'map') {
    gaps.push({ tab: 'map', message: 'Placez le point GPS sur la carte.' });
  }
  if (draft.travels && !(Number(draft.coverageRadiusKm) > 0)) {
    gaps.push({
      tab: 'map',
      message: isServiceRentalCategory(draft.category)
        ? 'Indiquez le rayon de livraison ou de dépôt.'
        : 'Indiquez le rayon d’intervention si vous vous déplacez.',
      fieldId: OFFERING_RADIUS_FIELD_ID,
    });
  }
  return gaps;
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
    <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Catégorie">
      {options.map((id) => {
        const selected = category === id;
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={selected}
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
}: {
  draft: ServiceOfferingDraft;
  onChange: React.Dispatch<React.SetStateAction<ServiceOfferingDraft>>;
  tab: MarketplaceFormTab;
  onTabChange: (tab: MarketplaceFormTab) => void;
  error?: string;
}) {
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

  return (
    <div className="space-y-4">
      {error ? <Alert variant="error">{error}</Alert> : null}

      <div className="rounded-[var(--radius-card)] border border-border bg-surface p-3 sm:p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-foreground inline-flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-primary" aria-hidden />
            Pour publier ({completedRequiredCount}/{requiredCount})
          </p>
          <p className={cn('text-xs font-semibold', ready ? 'text-primary' : 'text-festive-accent')}>
            {ready ? 'Fiche prête' : `${gaps.length} élément${gaps.length > 1 ? 's' : ''} à compléter`}
          </p>
        </div>
        <div className="h-1.5 rounded-full bg-surface-muted overflow-hidden" aria-hidden>
          <div
            className="h-full rounded-full bg-primary-solid transition-[width] duration-200"
            style={{ width: `${Math.round((completedRequiredCount / requiredCount) * 100)}%` }}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {[
            {
              id: 'title',
              label: 'Titre',
              valid: hasTitle,
              required: true,
              tab: 'details' as const,
              fieldId: OFFERING_TITLE_FIELD_ID,
              detail: draft.title.trim() || 'Ex. Traiteur mariage 200 couverts',
            },
            {
              id: 'place',
              label: 'Ville & quartier',
              valid: hasPlace,
              required: true,
              tab: 'map' as const,
              fieldId: OFFERING_CITY_SECTION_ID,
              detail: hasPlace ? `${draft.city} · ${draft.commune}` : 'Ville, commune et quartier',
            },
            {
              id: 'gps',
              label: 'Point GPS',
              valid: hasGps,
              required: true,
              tab: 'map' as const,
              detail: hasGps ? 'Repère placé' : 'Cliquez la carte pour pointer',
            },
            {
              id: 'photos',
              label: rental ? 'Photos du matériel' : 'Photos de prestation',
              valid: hasPhotos,
              required: false,
              tab: 'medias' as const,
              detail: hasPhotos ? `${draft.photos.length} média${draft.photos.length > 1 ? 's' : ''}` : 'Fortement conseillé',
            },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => goTo(item.tab, item.fieldId)}
              className={cn(
                'min-h-11 text-left px-2.5 py-2 rounded-[var(--radius-button)] border text-xs transition flex items-start gap-2',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                item.valid
                  ? 'border-primary/25 bg-primary/5 text-foreground'
                  : item.required
                    ? 'border-festive-accent/35 bg-festive-accent/8 text-foreground'
                    : 'border-border bg-surface text-muted',
              )}
            >
              {item.valid ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" aria-hidden />
              ) : item.required ? (
                <AlertCircle className="w-3.5 h-3.5 text-festive-accent shrink-0 mt-0.5" aria-hidden />
              ) : (
                <Info className="w-3.5 h-3.5 text-muted shrink-0 mt-0.5" aria-hidden />
              )}
              <span className="min-w-0">
                <span className="font-semibold block">{item.label}</span>
                <span className="text-muted line-clamp-1">{item.detail}</span>
              </span>
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
          details: 'Offre',
          map: 'Zone',
          medias: 'Photos',
        }}
        badges={{
          details: hasTitle ? undefined : 1,
          map: hasGps ? undefined : 1,
          medias: draft.photos.length || undefined,
        }}
      />

      {tab === 'details' ? (
        <div id={listingTabPanelId('details')} role="tabpanel" aria-labelledby="listing-tab-details" className="space-y-6">
          <FormSection
            title="Identité"
            hint={rental
              ? 'Nommez l’équipement comme le client le chercherait : type, marque, usage.'
              : 'Un titre clair attire les bons devis. La catégorie oriente les filtres du catalogue.'}
          >
            <Input
              id={OFFERING_TITLE_FIELD_ID}
              label="Titre"
              required
              value={draft.title}
              onChange={(e) => onChange((current) => ({ ...current, title: e.target.value }))}
              placeholder={rental ? 'Ex. Sono 12 enceintes + table de mixage' : 'Ex. Traiteur mariage 150–300 convives'}
            />
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-muted">Catégorie</p>
              <CategoryPills category={draft.category} rental={rental} onChange={setCategory} />
              <p className="text-xs text-muted">
                {SERVICE_CATEGORY_META[draft.category].hint}
                {rental ? ' Précisez parc, tailles et caution dans la fiche.' : ''}
              </p>
              {!categoryOptions.includes(draft.category) ? (
                <p className="text-xs text-danger">Cette catégorie n’appartient pas à cet onglet. Choisissez-en une ci-dessus.</p>
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
                placeholder={rental
                  ? 'Parc, modèles, conditions de caution, livraison, ce qui est inclus…'
                  : 'Style, équipe, déroulement type, ce qui est inclus dans le tarif de départ…'}
              />
            </label>
          </FormSection>

          <FormSection
            title="Tarif"
            hint={hasPrice
              ? `À partir de ${priceNum.toLocaleString('fr-FR')} FC · ${PRICE_UNIT_OPTIONS.find((opt) => opt.id === draft.priceUnit)?.label || draft.priceUnit}`
              : 'Sans tarif, la fiche reste sur devis. Un prix de départ accélère les réservations.'}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                id={OFFERING_PRICE_FIELD_ID}
                label="Tarif de départ (FC)"
                type="number"
                min={0}
                value={draft.priceFromFc}
                onChange={(e) => onChange((current) => ({ ...current, priceFromFc: e.target.value }))}
                hint="Laissez vide pour « sur devis »."
              />
              <label className="block space-y-1.5" htmlFor={unitId}>
                <span className="text-xs font-semibold text-muted">Unité</span>
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
                <p className="text-xs text-muted">
                  {PRICE_UNIT_OPTIONS.find((opt) => opt.id === draft.priceUnit)?.hint || 'Unité affichée aux clients.'}
                </p>
              </label>
              <Input
                label={rental ? 'Quantité min. (parc)' : 'Quota min. invités'}
                type="number"
                min={0}
                value={draft.quotaMin}
                onChange={(e) => onChange((current) => ({ ...current, quotaMin: e.target.value }))}
                hint={rental ? 'Plus petite commande acceptée.' : 'Minimum de convives pour ce tarif.'}
              />
              <Input
                label={rental ? 'Quantité max. (parc)' : 'Quota max. invités'}
                type="number"
                min={0}
                value={draft.quotaMax}
                onChange={(e) => onChange((current) => ({ ...current, quotaMax: e.target.value }))}
                hint={rental ? 'Stock ou capacité maximale.' : 'Au-delà, le client doit demander un devis.'}
              />
            </div>
          </FormSection>

          <FormSection
            title={rental ? 'Fiche matériel' : 'Fiche prestation'}
            hint="Ces infos apparaissent sur la vitrine. Remplissez surtout le contact et ce qui est inclus."
          >
            <ListingDetailsFields
              kind="service"
              hideDescription
              category={draft.category}
              value={draft.details}
              onChange={(details) => onChange((current) => ({ ...current, details }))}
            />
          </FormSection>

          <FormSection
            title="Indisponibilités"
            hint="Bloquez les jours déjà pris hors EventMaster. Les réservations confirmées restent en rouge."
          >
            <BlockedDatesField
              value={draft.blockedDates}
              bookedDates={draft.bookedDates}
              onChange={(blockedDates) => onChange((current) => ({ ...current, blockedDates }))}
            />
          </FormSection>
        </div>
      ) : null}

      {tab === 'map' ? (
        <div id={listingTabPanelId('map')} role="tabpanel" aria-labelledby="listing-tab-map" className="space-y-6">
          <FormSection
            title="Adresse de référence"
            hint="Ville, commune et quartier sont obligatoires pour apparaître dans le catalogue."
          >
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

          <FormSection
            title={rental ? 'Livraison ou retrait' : 'Zone d’intervention'}
            hint={rental
              ? 'Indiquez si le client vient chercher le matériel, ou si vous livrez.'
              : 'Les clients filtrent les pros qui se déplacent dans leur commune.'}
          >
            <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={rental ? 'Livraison' : 'Intervention'}>
              {[
                { id: false, label: rental ? 'Retrait sur place' : 'Sur place uniquement' },
                { id: true, label: rental ? 'Je livre / je dépose' : 'Je me déplace' },
              ].map((opt) => (
                <button
                  key={String(opt.id)}
                  type="button"
                  role="radio"
                  aria-checked={draft.travels === opt.id}
                  onClick={() => onChange((current) => ({
                    ...current,
                    travels: opt.id,
                    coverageRadiusKm: opt.id ? current.coverageRadiusKm : '',
                  }))}
                  className={cn(
                    'min-h-11 px-3 py-2 rounded-full text-xs font-semibold border transition',
                    draft.travels === opt.id
                      ? 'bg-primary-solid text-primary-foreground border-primary-solid'
                      : 'bg-surface text-muted border-border hover:text-foreground',
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {draft.travels ? (
              <Input
                id={OFFERING_RADIUS_FIELD_ID}
                label={rental ? 'Rayon de livraison (km)' : 'Rayon d’intervention (km)'}
                type="number"
                min={1}
                required
                value={draft.coverageRadiusKm}
                onChange={(e) => onChange((current) => ({ ...current, coverageRadiusKm: e.target.value }))}
              />
            ) : (
              <p className="text-xs text-muted">
                {rental
                  ? 'Les clients viennent retirer le matériel à l’adresse pointée sur la carte.'
                  : 'Les clients viennent à votre adresse. Aucun rayon n’est affiché.'}
              </p>
            )}
          </FormSection>

          <FormSection
            title="Pointage GPS"
            hint="Un clic sur la carte suffit. Sans point GPS, la fiche reste en brouillon."
          >
            <LocationPickerMap
              latitude={draft.latitude}
              longitude={draft.longitude}
              city={draft.city}
              commune={draft.commune}
              required
              onChange={({ latitude, longitude }) => onChange((current) => ({ ...current, latitude, longitude }))}
            />
          </FormSection>
        </div>
      ) : null}

      {tab === 'medias' ? (
        <div id={listingTabPanelId('medias')} role="tabpanel" aria-labelledby="listing-tab-medias" className="space-y-3">
          <FormSection
            title={rental ? 'Photos et vidéos du matériel' : 'Photos et vidéos de réalisation'}
            hint="La première image devient la couverture du catalogue. Ajoutez au moins une photo nette."
          >
            <MarketplaceMediaField
              urls={draft.photos}
              onChange={(photos) => onChange((current) => ({ ...current, photos }))}
            />
          </FormSection>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <div className="flex items-center gap-1.5 text-xs text-muted">
          {tab === 'details' ? <Tag className="w-3.5 h-3.5" aria-hidden /> : null}
          {tab === 'map' ? <MapPin className="w-3.5 h-3.5" aria-hidden /> : null}
          {tab === 'medias' ? <Camera className="w-3.5 h-3.5" aria-hidden /> : null}
          {tab === 'details' ? 'Étape 1 sur 3 · Offre' : null}
          {tab === 'map' ? 'Étape 2 sur 3 · Zone' : null}
          {tab === 'medias' ? 'Étape 3 sur 3 · Photos' : null}
        </div>
        <div className="flex gap-2">
          {prevTab ? (
            <Button type="button" variant="ghost" size="sm" onClick={() => onTabChange(prevTab)}>
              Retour
            </Button>
          ) : null}
          {nextTab ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => onTabChange(nextTab)}
              leftIcon={nextTab === 'map' ? <MapPin className="w-4 h-4" /> : <Camera className="w-4 h-4" />}
            >
              {nextTab === 'map' ? 'Continuer vers la zone' : 'Continuer vers les photos'}
            </Button>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs text-muted">
              <CalendarDays className="w-3.5 h-3.5" aria-hidden />
              Enregistrez en brouillon ou publiez ci-dessous.
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
