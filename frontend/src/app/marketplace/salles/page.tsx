'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import CelebrateMood from '@/components/CelebrateMood';
import { Button, Input } from '@/components/ui';
import { formatFc } from '@/config/landingPricing';
import type { PublicVenue } from '@/lib/marketplace';
import { roomTypeLabels, type RoomType } from '@/lib/roomLayoutUtils';
import { Building2, MapPin, Search, Users, ArrowRight, Loader2 } from 'lucide-react';

const ROOM_FILTERS: Array<{ id: string; label: string }> = [
  { id: '', label: 'Tous les types' },
  { id: 'BANQUET', label: roomTypeLabels.BANQUET },
  { id: 'CONFERENCE', label: roomTypeLabels.CONFERENCE },
  { id: 'AMPHITHEATER', label: roomTypeLabels.AMPHITHEATER },
  { id: 'TENT', label: roomTypeLabels.TENT },
  { id: 'CUSTOM', label: roomTypeLabels.CUSTOM },
];

export default function MarketplaceVenuesPage() {
  const [venues, setVenues] = useState<PublicVenue[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [city, setCity] = useState('');
  const [roomType, setRoomType] = useState('');
  const [error, setError] = useState('');

  const load = async (params?: { q?: string; city?: string; roomType?: string }) => {
    setLoading(true);
    setError('');
    try {
      const search = new URLSearchParams();
      const nextQ = params?.q ?? q;
      const nextCity = params?.city ?? city;
      const nextType = params?.roomType ?? roomType;
      if (nextQ.trim()) search.set('q', nextQ.trim());
      if (nextCity.trim()) search.set('city', nextCity.trim());
      if (nextType) search.set('roomType', nextType);
      const data = await api.get(`/public/venues${search.toString() ? `?${search}` : ''}`);
      setVenues(data.venues || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Impossible de charger les salles.');
      setVenues([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chargement initial
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    load();
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <CelebrateMood />
      <SiteHeader variant="contact" />

      <section className="border-b border-border">
        <div className="page-container py-12 sm:py-16 space-y-4 max-w-2xl">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[color:var(--festive-accent)]">
            Marketplace
          </p>
          <h1 className="text-3xl sm:text-4xl font-display font-semibold tracking-tight">
            Trouvez une salle pour votre événement
          </h1>
          <p className="text-sm text-muted leading-relaxed">
            Capacité, plan 2D et tarif de départ. Envoyez une demande de devis au propriétaire —
            sans quitter EventMaster.
          </p>
        </div>
      </section>

      <main className="page-container py-8 flex-1 space-y-6">
        <form onSubmit={handleSearch} className="flex flex-col lg:flex-row gap-3">
          <div className="flex-1">
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Nom, organisation…"
              leftIcon={<Search className="w-4 h-4" />}
            />
          </div>
          <div className="lg:w-48">
            <Input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Ville"
              leftIcon={<MapPin className="w-4 h-4" />}
            />
          </div>
          <select
            value={roomType}
            onChange={(e) => setRoomType(e.target.value)}
            className="lg:w-48 px-3 py-2.5 rounded-[var(--radius-button)] border border-border bg-surface-muted text-sm"
          >
            {ROOM_FILTERS.map((opt) => (
              <option key={opt.id || 'all'} value={opt.id}>{opt.label}</option>
            ))}
          </select>
          <Button type="submit">Rechercher</Button>
        </form>

        {error && (
          <p className="text-sm text-rose-600">{error}</p>
        )}

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-7 h-7 animate-spin text-primary" />
          </div>
        ) : venues.length === 0 ? (
          <div className="text-center py-16 px-6 border border-border rounded-[var(--radius-card)] bg-surface">
            <Building2 className="w-10 h-10 text-muted mx-auto mb-3" />
            <h2 className="font-semibold text-foreground">Aucune salle publiée pour l’instant</h2>
            <p className="text-sm text-muted mt-2 max-w-md mx-auto leading-relaxed">
              Les organisations peuvent publier leurs salles depuis Mon compte → Salles.
              Revenez bientôt, ou créez votre espace pour proposer les vôtres.
            </p>
            <Link href="/register" className="inline-block mt-5">
              <Button size="sm">Publier une salle</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {venues.map((venue) => (
              <Link
                key={venue.slug}
                href={`/marketplace/salles/${venue.slug}`}
                className="group bg-surface border border-border rounded-[var(--radius-card)] overflow-hidden hover:border-primary/40 transition"
              >
                <div className="aspect-[16/10] bg-surface-muted overflow-hidden">
                  {venue.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={venue.coverUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted">
                      <Building2 className="w-8 h-8" />
                    </div>
                  )}
                </div>
                <div className="p-4 space-y-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">
                    {roomTypeLabels[venue.roomType as RoomType] || venue.roomType}
                  </p>
                  <h2 className="font-display font-semibold text-foreground group-hover:text-primary transition">
                    {venue.headline}
                  </h2>
                  <p className="text-xs text-muted truncate">{venue.orgName}</p>
                  <div className="flex flex-wrap gap-2 text-xs text-muted">
                    {venue.city && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {venue.city}
                      </span>
                    )}
                    {venue.capacity ? (
                      <span className="inline-flex items-center gap-1">
                        <Users className="w-3 h-3" /> {venue.capacity} places
                      </span>
                    ) : null}
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-border">
                    <span className="text-sm font-semibold text-foreground">
                      {venue.priceFromFc != null ? `Dès ${formatFc(venue.priceFromFc)}` : 'Sur devis'}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
                      Voir <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      <SiteFooter faqHref="/faq" />
    </div>
  );
}
