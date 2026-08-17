'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import CelebrateMood from '@/components/CelebrateMood';
import RoomLayoutPreview from '@/components/RoomLayoutPreview';
import { Alert, Button, Input } from '@/components/ui';
import { formatFc } from '@/config/landingPricing';
import type { PublicVenue } from '@/lib/marketplace';
import { roomTypeLabels, type RoomLayoutBlueprint, type RoomType } from '@/lib/roomLayoutUtils';
import {
  ArrowLeft, Building2, Calendar, Loader2, MapPin, Send, Users,
} from 'lucide-react';

export default function MarketplaceVenueDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [venue, setVenue] = useState<PublicVenue | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [guestCount, setGuestCount] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState('');
  const [formError, setFormError] = useState('');
  const [photoIndex, setPhotoIndex] = useState(0);

  useEffect(() => {
    async function load() {
      if (!slug) return;
      try {
        const data = await api.get(`/public/venues/${encodeURIComponent(slug)}`);
        setVenue(data);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Salle introuvable.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [slug]);

  const handleInquire = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!venue) return;
    setFormError('');
    setSent('');
    setSending(true);
    try {
      const data = await api.post(`/public/venues/${encodeURIComponent(venue.slug)}/inquire`, {
        name,
        email,
        phone: phone || undefined,
        eventDate: eventDate || undefined,
        guestCount: guestCount || undefined,
        message,
      });
      setSent(data.message || 'Demande envoyée.');
      setMessage('');
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Envoi impossible.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <CelebrateMood />
      <SiteHeader variant="contact" />

      <main className="page-container py-8 flex-1">
        <Link
          href="/marketplace/salles"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-foreground mb-6"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Toutes les salles
        </Link>

        {loading ? (
          <div className="flex justify-center py-24">
            <Loader2 className="w-7 h-7 animate-spin text-primary" />
          </div>
        ) : error || !venue ? (
          <div className="max-w-md mx-auto text-center py-16 border border-border rounded-[var(--radius-card)] bg-surface">
            <Building2 className="w-10 h-10 text-muted mx-auto mb-3" />
            <p className="text-sm text-muted">{error || 'Salle introuvable.'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            <div className="lg:col-span-3 space-y-5">
              <div className="aspect-[16/9] rounded-[var(--radius-card)] overflow-hidden bg-surface-muted border border-border">
                {venue.photos[photoIndex] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={venue.photos[photoIndex]} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted">
                    <Building2 className="w-12 h-12" />
                  </div>
                )}
              </div>
              {venue.photos.length > 1 && (
                <div className="flex gap-2 overflow-x-auto">
                  {venue.photos.map((url, i) => (
                    <button
                      key={url}
                      type="button"
                      onClick={() => setPhotoIndex(i)}
                      className={`w-16 h-12 rounded-md overflow-hidden border shrink-0 ${
                        i === photoIndex ? 'border-primary' : 'border-border'
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}

              <div className="space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">
                  {roomTypeLabels[venue.roomType as RoomType] || venue.roomType}
                </p>
                <h1 className="text-2xl sm:text-3xl font-display font-semibold tracking-tight">
                  {venue.headline}
                </h1>
                <p className="text-sm text-muted">{venue.orgName}</p>
              </div>

              <div className="flex flex-wrap gap-2 text-xs text-muted">
                {venue.city && (
                  <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-surface-muted border border-border">
                    <MapPin className="w-3.5 h-3.5" /> {venue.city}
                    {venue.address ? ` · ${venue.address}` : ''}
                  </span>
                )}
                {venue.capacity ? (
                  <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-surface-muted border border-border">
                    <Users className="w-3.5 h-3.5" /> {venue.capacity} places
                  </span>
                ) : null}
              </div>

              {venue.description && (
                <p className="text-sm text-muted leading-relaxed whitespace-pre-line">{venue.description}</p>
              )}

              {venue.layoutPreview ? (
                <div className="border border-border rounded-[var(--radius-card)] p-4 bg-surface">
                  <h2 className="text-sm font-semibold mb-3">Plan 2D</h2>
                  <RoomLayoutPreview blueprint={venue.layoutPreview as RoomLayoutBlueprint} />
                </div>
              ) : null}
            </div>

            <aside className="lg:col-span-2 space-y-4">
              <div className="border border-border rounded-[var(--radius-card)] p-5 bg-surface space-y-1">
                <p className="text-xs text-muted">À partir de</p>
                <p className="text-2xl font-semibold text-foreground">
                  {venue.priceFromFc != null ? formatFc(venue.priceFromFc) : 'Sur devis'}
                </p>
                <p className="text-xs text-muted">{venue.priceUnitLabel}</p>
              </div>

              <form
                onSubmit={handleInquire}
                className="border border-border rounded-[var(--radius-card)] p-5 bg-surface space-y-3"
              >
                <h2 className="text-sm font-semibold text-foreground">Demander un devis</h2>
                <p className="text-xs text-muted leading-relaxed">
                  Le propriétaire reçoit votre message par e-mail. Aucun paiement sur la plateforme pour l’instant.
                </p>
                {formError && <Alert variant="error">{formError}</Alert>}
                {sent && <Alert variant="success">{sent}</Alert>}
                <Input label="Votre nom" required value={name} onChange={(e) => setName(e.target.value)} />
                <Input label="E-mail" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                <Input label="Téléphone" value={phone} onChange={(e) => setPhone(e.target.value)} />
                <Input
                  label="Date souhaitée"
                  type="date"
                  leftIcon={<Calendar className="w-4 h-4" />}
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                />
                <Input
                  label="Nombre d’invités (estimé)"
                  type="number"
                  min={1}
                  value={guestCount}
                  onChange={(e) => setGuestCount(e.target.value)}
                />
                <label className="block space-y-1.5">
                  <span className="text-xs font-medium text-muted">Message</span>
                  <textarea
                    required
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full px-3 py-2 rounded-[var(--radius-button)] border border-border bg-surface-muted text-sm"
                    placeholder="Type d’événement, horaires, besoins…"
                  />
                </label>
                <Button type="submit" loading={sending} leftIcon={<Send className="w-4 h-4" />} fullWidth>
                  Envoyer la demande
                </Button>
              </form>
            </aside>
          </div>
        )}
      </main>

      <SiteFooter faqHref="/faq" />
    </div>
  );
}
