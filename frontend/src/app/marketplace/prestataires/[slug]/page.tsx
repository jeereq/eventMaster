'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import PublicPageShell from '@/components/PublicPageShell';
import MarketplaceInquiryForm from '@/components/MarketplaceInquiryForm';
import MarketplaceBookingForm from '@/components/MarketplaceBookingForm';
import AvailabilityCalendar from '@/components/AvailabilityCalendar';
import MarketplaceLocationsMap, { type MarketplaceMapHandle } from '@/components/MarketplaceLocationsMap';
import ListingPublicDetails from '@/components/ListingPublicDetails';
import { Button } from '@/components/ui';
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
  const mapRef = useRef<MarketplaceMapHandle>(null);
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

  const startRoute = (itemId: string) => {
    setWantRoute(true);
    setTab('map');
    window.setTimeout(() => mapRef.current?.startDirectionsFor(itemId), 80);
  };

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
          (() => {
            const item = serviceToCatalogueItem(service);
            const hero = service.photos[0];
            return (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
            <div className="lg:col-span-3 space-y-5">
              <div className="relative aspect-[16/9] rounded-[1.5rem] overflow-hidden bg-black/80 border border-border shadow-[var(--shadow-soft)]">
                {hero ? (
                  isVideoUrl(hero) ? (
                    <video src={hero} poster={mediaPosterUrl(hero)} className="w-full h-full object-cover" muted playsInline />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={hero} alt="" className="w-full h-full object-cover" />
                  )
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted bg-surface-muted">
                    <Sparkles className="w-12 h-12" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6 text-white space-y-1.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-white/80">{service.categoryLabel}</p>
                  <h1 className="text-2xl sm:text-3xl font-display font-semibold tracking-tight drop-shadow">{service.title}</h1>
                  <p className="text-sm text-white/85">{service.orgName}</p>
                </div>
              </div>

              <MarketplaceFormTabs value={tab} onChange={setTab} />

              {tab === 'medias' && (
                <div className="space-y-3">
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
                </div>
              )}

              {tab === 'details' && (
                <div className="space-y-5">
                  <div className="flex flex-wrap gap-2 text-xs text-muted">
                    {formatLocationLine(service) && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-surface-muted border border-border">
                        <MapPin className="w-3.5 h-3.5" />
                        {formatLocationLine(service)}
                        {` · ${serviceMobilityLabel(service.travels ?? Boolean(service.coverageRadiusKm), service.coverageRadiusKm)}`}
                      </span>
                    )}
                    {formatQuotaLabel(service.quotaMin, service.quotaMax) && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-surface-muted border border-border">
                        {formatQuotaLabel(service.quotaMin, service.quotaMax)}
                      </span>
                    )}
                    {service.latitude != null && service.longitude != null && (
                      <button
                        type="button"
                        onClick={() => startRoute(item.id)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-primary text-white font-semibold hover:opacity-95"
                      >
                        <Navigation className="w-3.5 h-3.5" />
                        Itinéraire
                      </button>
                    )}
                  </div>
                  {service.description && (
                    <p className="text-sm text-muted leading-relaxed whitespace-pre-line">{service.description}</p>
                  )}
                  <ListingPublicDetails details={service.details} kind="service" />
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
                </div>
              )}

              {tab === 'map' && (
                service.latitude != null && service.longitude != null ? (
                  <div className="rounded-[1.35rem] border border-border overflow-hidden bg-surface shadow-[var(--shadow-soft)]">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 sm:p-4 border-b border-border">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-foreground">Mode itinéraire</p>
                        <p className="text-xs text-muted">
                          Une voix féminine lit le guidage. Autorisez la localisation, ou cliquez la carte pour le départ.
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => {
                          setWantRoute(true);
                          mapRef.current?.startDirectionsFor(item.id);
                        }}
                        leftIcon={<Navigation className="w-3.5 h-3.5" />}
                      >
                        Démarrer
                      </Button>
                    </div>
                    <MarketplaceLocationsMap
                      ref={mapRef}
                      markers={[catalogueItemToMapMarker(item)]}
                      height={420}
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
            <aside className="lg:col-span-2 space-y-4 lg:sticky lg:top-24">
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
            );
          })()
        )}
      </main>
    </PublicPageShell>
  );
}
