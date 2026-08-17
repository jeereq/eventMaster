'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import CelebrateMood from '@/components/CelebrateMood';
import MarketplacePublicNav from '@/components/MarketplacePublicNav';
import { Button, Input } from '@/components/ui';
import { formatFc } from '@/config/landingPricing';
import {
  SERVICE_CATEGORIES,
  SERVICE_CATEGORY_LABELS,
  type PublicService,
} from '@/lib/marketplace';
import { ArrowRight, Loader2, MapPin, Search, Sparkles } from 'lucide-react';

export default function MarketplaceServicesPage() {
  const [services, setServices] = useState<PublicService[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [city, setCity] = useState('');
  const [category, setCategory] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const search = new URLSearchParams();
      if (q.trim()) search.set('q', q.trim());
      if (city.trim()) search.set('city', city.trim());
      if (category) search.set('category', category);
      const data = await api.get(`/public/services${search.toString() ? `?${search}` : ''}`);
      setServices(data.services || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Impossible de charger les prestataires.');
      setServices([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
            Trouvez un prestataire
          </h1>
          <p className="text-sm text-muted leading-relaxed">
            Traiteur, photographie, DJ, décoration, sécurité… Demandez un devis directement.
          </p>
          <MarketplacePublicNav active="services" />
        </div>
      </section>

      <main className="page-container py-8 flex-1 space-y-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            load();
          }}
          className="flex flex-col lg:flex-row gap-3"
        >
          <div className="flex-1">
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nom, prestataire…" leftIcon={<Search className="w-4 h-4" />} />
          </div>
          <div className="lg:w-48">
            <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Ville" leftIcon={<MapPin className="w-4 h-4" />} />
          </div>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="lg:w-52 px-3 py-2.5 rounded-[var(--radius-button)] border border-border bg-surface-muted text-sm"
          >
            <option value="">Toutes les catégories</option>
            {SERVICE_CATEGORIES.map((id) => (
              <option key={id} value={id}>{SERVICE_CATEGORY_LABELS[id]}</option>
            ))}
          </select>
          <Button type="submit">Rechercher</Button>
        </form>

        {error && <p className="text-sm text-rose-600">{error}</p>}

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-7 h-7 animate-spin text-primary" />
          </div>
        ) : services.length === 0 ? (
          <div className="text-center py-16 px-6 border border-border rounded-[var(--radius-card)] bg-surface">
            <Sparkles className="w-10 h-10 text-muted mx-auto mb-3" />
            <h2 className="font-semibold">Aucun prestataire publié</h2>
            <p className="text-sm text-muted mt-2 max-w-md mx-auto">
              Les organisations publient leurs services depuis Marketplace dans le tableau de bord.
            </p>
            <Link href="/register" className="inline-block mt-5">
              <Button size="sm">Proposer mes services</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {services.map((service) => (
              <Link
                key={service.slug}
                href={`/marketplace/prestataires/${service.slug}`}
                className="group bg-surface border border-border rounded-[var(--radius-card)] overflow-hidden hover:border-primary/40 transition"
              >
                <div className="aspect-[16/10] bg-surface-muted overflow-hidden">
                  {service.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={service.coverUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted">
                      <Sparkles className="w-8 h-8" />
                    </div>
                  )}
                </div>
                <div className="p-4 space-y-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">
                    {service.categoryLabel}
                  </p>
                  <h2 className="font-display font-semibold group-hover:text-primary transition">{service.title}</h2>
                  <p className="text-xs text-muted truncate">{service.orgName}</p>
                  <div className="flex items-center justify-between pt-2 border-t border-border">
                    <span className="text-sm font-semibold">
                      {service.priceFromFc != null ? `Dès ${formatFc(service.priceFromFc)}` : 'Sur devis'}
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
