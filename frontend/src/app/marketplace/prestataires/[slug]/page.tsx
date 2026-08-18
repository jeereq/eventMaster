'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import PublicPageShell from '@/components/PublicPageShell';
import MarketplaceInquiryForm from '@/components/MarketplaceInquiryForm';
import MarketplaceBookingForm from '@/components/MarketplaceBookingForm';
import AvailabilityCalendar from '@/components/AvailabilityCalendar';
import MarketplaceLocationsMap from '@/components/MarketplaceLocationsMap';
import { formatFc } from '@/config/landingPricing';
import {
  catalogueItemToMapMarker,
  formatLocationLine,
  formatQuotaLabel,
  isVideoUrl,
  mediaPosterUrl,
  serviceMobilityLabel,
  serviceToCatalogueItem,
  type PublicService,
} from '@/lib/marketplace';
import MarketplaceFormTabs, { type MarketplaceFormTab } from '@/components/MarketplaceFormTabs';
import { ArrowLeft, Loader2, MapPin, Navigation, Play, Sparkles } from 'lucide-react';

export default function MarketplaceServiceDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [service, setService] = useState<PublicService | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [photoIndex, setPhotoIndex] = useState(0);
  const [pickedDate, setPickedDate] = useState('');
  const [pickedEndDate, setPickedEndDate] = useState('');
  const [tab, setTab] = useState<MarketplaceFormTab>('details');
  const [wantRoute, setWantRoute] = useState(false);

  useEffect(() => {
    async function load() {
      if (!slug) return;
      try {
        const data = await api.get(`/public/services/${encodeURIComponent(slug)}`);
        setService(data);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Prestation introuvable.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [slug]);

  return (
    <PublicPageShell faqHref="/faq">
      <main className="page-container py-8 sm:py-10 flex-1">
        <Link
          href="/marketplace/prestataires"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-foreground mb-6"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Tous les prestataires
        </Link>

        {loading ? (
          <div className="flex justify-center py-24">
            <Loader2 className="w-7 h-7 animate-spin text-primary" />
          </div>
        ) : error || !service ? (
          <div className="max-w-md mx-auto text-center py-16 border border-border rounded-[var(--radius-card)] bg-surface">
            <Sparkles className="w-10 h-10 text-muted mx-auto mb-3" />
            <p className="text-sm text-muted">{error || 'Prestation introuvable.'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            <div className="lg:col-span-3 space-y-5">
              <div className="space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">{service.categoryLabel}</p>
                <h1 className="text-2xl sm:text-3xl font-display font-semibold tracking-tight">{service.title}</h1>
                <p className="text-sm text-muted">{service.orgName}</p>
              </div>
              <MarketplaceFormTabs value={tab} onChange={setTab} />
              {tab === 'medias' && (
                <>
              <div className="aspect-[16/9] rounded-[var(--radius-card)] overflow-hidden bg-black/80 border border-border">
                {service.photos[photoIndex] ? (
                  isVideoUrl(service.photos[photoIndex]) ? (
                    <video
                      key={service.photos[photoIndex]}
                      src={service.photos[photoIndex]}
                      poster={mediaPosterUrl(service.photos[photoIndex])}
                      controls
                      playsInline
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={service.photos[photoIndex]} alt="" className="w-full h-full object-cover" />
                  )
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted bg-surface-muted">
                    <Sparkles className="w-12 h-12" />
                  </div>
                )}
              </div>
              {service.photos.length > 1 && (
                <div className="grid grid-cols-6 sm:grid-cols-8 gap-2">
                  {service.photos.map((url, i) => (
                    <button
                      key={url}
                      type="button"
                      onClick={() => setPhotoIndex(i)}
                      className={`relative aspect-[4/3] rounded-md overflow-hidden border bg-surface-muted ${
                        i === photoIndex ? 'border-primary' : 'border-border'
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={mediaPosterUrl(url)} alt="" className="w-full h-full object-cover" />
                      {isVideoUrl(url) && (
                        <span className="absolute inset-0 flex items-center justify-center bg-black/35">
                          <Play className="w-3.5 h-3.5 text-white fill-white" />
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
                </>
              )}
              {tab === 'details' && (
                <>
              <div className="flex flex-wrap gap-2 text-xs text-muted">
                {formatLocationLine(service) && (
                  <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-surface-muted border border-border">
                    <MapPin className="w-3.5 h-3.5" />
                    {formatLocationLine(service)}
                    {` · ${serviceMobilityLabel(service.travels ?? Boolean(service.coverageRadiusKm), service.coverageRadiusKm)}`}
                  </span>
                )}
                {service.latitude != null && service.longitude != null && (
                  <button
                    type="button"
                    onClick={() => {
                      setWantRoute(true);
                      setTab('map');
                    }}
                    className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-surface-muted border border-border text-primary font-semibold hover:bg-primary/5"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    Itinéraire
                  </button>
                )}
                {formatQuotaLabel(service.quotaMin, service.quotaMax) && (
                  <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-surface-muted border border-border">
                    {formatQuotaLabel(service.quotaMin, service.quotaMax)}
                  </span>
                )}
              </div>
              {service.description && (
                <p className="text-sm text-muted leading-relaxed whitespace-pre-line">{service.description}</p>
              )}
              <AvailabilityCalendar
                title="Calendrier des disponibilités"
                bookedDates={service.bookedDates}
                blockedDates={service.blockedDates}
                selectedDate={pickedDate}
                selectedEndDate={pickedEndDate}
                onSelectRange={(from, to) => {
                  setPickedDate(from);
                  setPickedEndDate(to);
                }}
              />
                </>
              )}
              {tab === 'map' && (
                service.latitude != null && service.longitude != null ? (
                  <div className="space-y-3">
                    <p className="text-xs text-muted">
                      Cliquez <strong>Lancer la navigation</strong> : l’itinéraire se calcule sur EventMaster, puis votre position est suivie. Vous pouvez aussi indiquer un départ en cliquant la carte.
                    </p>
                    <MarketplaceLocationsMap
                      markers={[catalogueItemToMapMarker(serviceToCatalogueItem(service))]}
                      height={360}
                      navigateOnClick={false}
                      autoDirections={wantRoute}
                      city={service.city}
                    />
                  </div>
                ) : (
                  <p className="text-sm text-muted">Aucune position n’a encore été indiquée pour cette prestation.</p>
                )
              )}
            </div>
            <aside className="lg:col-span-2 space-y-4">
              <div className="border border-border rounded-[var(--radius-card)] p-5 bg-surface space-y-1">
                <p className="text-xs text-muted">À partir de</p>
                <p className="text-2xl font-semibold">
                  {service.priceFromFc != null ? formatFc(service.priceFromFc) : 'Sur devis'}
                </p>
                <p className="text-xs text-muted">{service.priceUnitLabel}</p>
                {formatQuotaLabel(service.quotaMin, service.quotaMax) && (
                  <p className="text-xs text-muted">{formatQuotaLabel(service.quotaMin, service.quotaMax)}</p>
                )}
              </div>
              <MarketplaceInquiryForm
                endpoint={`/public/services/${encodeURIComponent(service.slug)}/inquire`}
                successCopy="Demande transmise au prestataire."
                eventDate={pickedDate}
                onEventDateChange={(value) => {
                  setPickedDate(value);
                  setPickedEndDate(value);
                }}
              />
              <MarketplaceBookingForm
                offeringSlug={service.slug}
                unavailableDates={service.unavailableDates}
                bookedDates={service.bookedDates}
                blockedDates={service.blockedDates}
                priceFromFc={service.priceFromFc}
                priceUnit={service.priceUnit}
                eventDate={pickedDate}
                eventEndDate={pickedEndDate}
                onEventDateChange={setPickedDate}
                onEventEndDateChange={setPickedEndDate}
                showCalendar={false}
              />
            </aside>
          </div>
        )}
      </main>
    </PublicPageShell>
  );
}
