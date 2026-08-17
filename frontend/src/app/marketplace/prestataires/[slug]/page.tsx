'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import CelebrateMood from '@/components/CelebrateMood';
import MarketplaceInquiryForm from '@/components/MarketplaceInquiryForm';
import MarketplaceBookingForm from '@/components/MarketplaceBookingForm';
import AvailabilityCalendar from '@/components/AvailabilityCalendar';
import MarketplaceLocationsMap from '@/components/MarketplaceLocationsMap';
import { formatFc } from '@/config/landingPricing';
import { formatLocationLine, formatQuotaLabel, isVideoUrl, mediaPosterUrl, type PublicService } from '@/lib/marketplace';
import { ArrowLeft, Loader2, MapPin, Play, Sparkles } from 'lucide-react';

export default function MarketplaceServiceDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [service, setService] = useState<PublicService | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [photoIndex, setPhotoIndex] = useState(0);
  const [pickedDate, setPickedDate] = useState('');

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
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <CelebrateMood />
      <SiteHeader variant="contact" />
      <main className="page-container py-8 flex-1">
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
              <div className="space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">{service.categoryLabel}</p>
                <h1 className="text-2xl sm:text-3xl font-display font-semibold tracking-tight">{service.title}</h1>
                <p className="text-sm text-muted">{service.orgName}</p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-muted">
                {formatLocationLine(service) && (
                  <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-surface-muted border border-border">
                    <MapPin className="w-3.5 h-3.5" />
                    {formatLocationLine(service)}
                    {service.coverageRadiusKm ? ` · rayon ${service.coverageRadiusKm} km` : ''}
                  </span>
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
              {service.latitude != null && service.longitude != null && (
                <MarketplaceLocationsMap
                  markers={[{
                    id: service.slug,
                    lat: service.latitude,
                    lng: service.longitude,
                    title: service.title,
                    href: `/marketplace/prestataires/${service.slug}`,
                    subtitle: formatLocationLine(service) || undefined,
                  }]}
                  height={240}
                />
              )}
              <AvailabilityCalendar
                title="Calendrier des disponibilités"
                bookedDates={service.bookedDates}
                blockedDates={service.blockedDates}
                selectedDate={pickedDate}
                onSelectDate={setPickedDate}
              />
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
                onEventDateChange={setPickedDate}
              />
              <MarketplaceBookingForm
                offeringSlug={service.slug}
                unavailableDates={service.unavailableDates}
                bookedDates={service.bookedDates}
                blockedDates={service.blockedDates}
                priceFromFc={service.priceFromFc}
                eventDate={pickedDate}
                onEventDateChange={setPickedDate}
                showCalendar={false}
              />
            </aside>
          </div>
        )}
      </main>
      <SiteFooter faqHref="/faq" />
    </div>
  );
}
