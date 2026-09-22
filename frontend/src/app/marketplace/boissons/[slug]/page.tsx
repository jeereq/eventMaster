'use client';

import React, { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { Wine } from 'lucide-react';
import { api } from '@/lib/api';
import { formatFc } from '@/config/landingPricing';
import { useAuth } from '@/context/AuthContext';
import PublicPageShell, { PublicPageHero } from '@/components/PublicPageShell';
import MarketplacePublicNav from '@/components/MarketplacePublicNav';
import ClientAuthChoice from '@/components/ClientAuthChoice';
import { Button } from '@/components/ui';
import { cn } from '@/lib/cn';
import {
  BEVERAGE_KIND_LABELS,
  BEVERAGE_KINDS,
  BEVERAGE_SALE_UNIT_LABELS,
  formatBeverageSale,
  type BeverageKind,
  type PublicBeverageOffer,
} from '@/lib/beverageBrands';

type VendorDrinkPage = {
  vendor: { slug: string; displayName: string; city: string | null; bio: string | null };
  offers: PublicBeverageOffer[];
};

const fieldClass = 'w-full min-h-[44px] rounded-[var(--radius-button)] border border-border bg-surface px-3 text-base sm:text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40';

function packCountOf(value: string): number {
  const amount = Math.round(Number(value));
  if (!Number.isFinite(amount) || amount < 1) return 0;
  return Math.min(500, amount);
}

function VendorDrinksPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = String(params.slug || '');
  const focusOfferId = searchParams.get('offre') || '';
  const { token, loading: authLoading } = useAuth();
  const [page, setPage] = useState<VendorDrinkPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [eventDate, setEventDate] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState<'inquire' | 'book' | ''>('');
  const [formError, setFormError] = useState('');
  const [sent, setSent] = useState<{ kind: 'inquire' | 'book'; id: string; text: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    api.get(`/public/beverage-vendors/${encodeURIComponent(slug)}`)
      .then((data: VendorDrinkPage) => {
        if (cancelled) return;
        setPage(data);
        const initial: Record<string, string> = {};
        if (focusOfferId && data.offers.some((offer) => offer.id === focusOfferId)) {
          initial[focusOfferId] = '1';
        }
        setQuantities(initial);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Impossible de charger les marques.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [slug, focusOfferId]);

  useEffect(() => {
    if (!focusOfferId || loading) return;
    document.getElementById(`offre-${focusOfferId}`)?.scrollIntoView({ block: 'center' });
  }, [focusOfferId, loading]);

  const offers = page?.offers ?? [];
  const selected = useMemo(
    () => offers
      .map((offer) => ({ offer, packs: packCountOf(quantities[offer.id] || '') }))
      .filter((row) => row.packs > 0),
    [offers, quantities],
  );
  const totalFc = selected.reduce((sum, row) => sum + row.offer.payableFc * row.packs, 0);
  const grouped = useMemo(() => BEVERAGE_KINDS
    .map((kind) => ({ kind, offers: offers.filter((offer) => offer.kind === kind) }))
    .filter((group) => group.offers.length > 0), [offers]);

  const send = async (mode: 'inquire' | 'book') => {
    if (!selected.length) {
      setFormError('Indiquez une quantité pour au moins une marque.');
      return;
    }
    if (!eventDate) {
      setFormError(mode === 'book'
        ? 'Indiquez la date de l’événement pour réserver.'
        : 'Indiquez la date de l’événement pour que le devis puisse être accepté.');
      return;
    }
    setBusy(mode);
    setFormError('');
    try {
      const data = await api.post(`/public/beverage-vendors/${encodeURIComponent(slug)}/${mode === 'book' ? 'book' : 'inquire'}`, {
        lines: selected.map((row) => ({ priceId: row.offer.id, packCount: row.packs })),
        eventDate,
        message,
        notes: message,
      }) as { message?: string; inquiryId?: string; booking?: { id?: string } };
      const id = mode === 'book' ? (data.booking?.id || '') : (data.inquiryId || '');
      setSent({
        kind: mode,
        id,
        text: data.message || (mode === 'book' ? 'Réservation envoyée.' : 'Demande envoyée.'),
      });
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Envoi impossible.');
    } finally {
      setBusy('');
    }
  };

  const followHref = sent?.kind === 'book'
    ? `/dashboard/bookings?tab=bookings${sent.id ? `&bookingId=${sent.id}` : ''}`
    : `/dashboard/bookings?tab=quotes${sent?.id ? `&inquiryId=${sent.id}` : ''}`;

  return (
    <PublicPageShell faqHref="/faq">
      <PublicPageHero
        compact
        title={page?.vendor.displayName || 'Boissons'}
        description="Toutes les marques publiées par ce prestataire. Choisissez les quantités, puis demandez un devis ou réservez."
      >
        <MarketplacePublicNav active="drinks" />
      </PublicPageHero>

      <div className="page-container py-6 md:py-10 space-y-6">
        <Link href="/marketplace/boissons" className="inline-flex items-center min-h-[44px] text-sm font-semibold text-primary-solid underline">
          Retour aux propositions
        </Link>

        {error ? <p className="text-sm text-danger" role="alert">{error}</p> : null}
        {loading ? <p className="text-sm text-muted">Chargement des marques…</p> : null}

        {!loading && page && offers.length === 0 ? (
          <div className="text-center py-16 px-6 border border-dashed border-border rounded-[var(--radius-card)] bg-surface">
            <Wine className="w-10 h-10 text-muted mx-auto mb-3" aria-hidden="true" />
            <h2 className="font-semibold text-foreground">Aucune marque publiée</h2>
            <p className="text-sm text-muted mt-2">Ce prestataire n’a pas encore de tarif de boisson en ligne.</p>
          </div>
        ) : null}

        {!loading && page && offers.length > 0 ? (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
            <div className="space-y-8">
              {page.vendor.bio ? <p className="text-sm text-muted leading-relaxed max-w-2xl">{page.vendor.bio}</p> : null}
              {grouped.map((group) => (
                <section key={group.kind} className="space-y-3" aria-labelledby={`famille-${group.kind}`}>
                  <h2 id={`famille-${group.kind}`} className="text-base font-semibold text-foreground">
                    {BEVERAGE_KIND_LABELS[group.kind as BeverageKind]}
                  </h2>
                  <ul className="space-y-3">
                    {group.offers.map((offer) => {
                      const packs = packCountOf(quantities[offer.id] || '');
                      return (
                        <li key={offer.id} id={`offre-${offer.id}`}>
                          <article className={cn(
                            'flex flex-wrap items-center gap-3 rounded-[var(--radius-card)] border bg-surface p-3',
                            offer.id === focusOfferId ? 'border-primary' : 'border-border',
                          )}>
                            <div className="w-16 h-16 shrink-0 overflow-hidden rounded-md bg-surface-muted">
                              {offer.imageUrl ? (
                                <img src={offer.imageUrl} alt="" width={128} height={128} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-muted">
                                  <Wine className="w-5 h-5" aria-hidden="true" />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1 basis-40">
                              <h3 className="text-base font-semibold text-foreground">{offer.brandName}</h3>
                              <p className="text-sm text-muted">
                                {formatBeverageSale(offer)} · {BEVERAGE_SALE_UNIT_LABELS[offer.unitKind]}
                              </p>
                              <p className="text-sm font-semibold tabular-nums text-foreground">
                                {formatFc(offer.payableFc)}
                                {offer.promoPriceFc != null ? (
                                  <span className="ml-2 text-muted line-through font-normal">
                                    <span className="sr-only">tarif habituel </span>
                                    {formatFc(offer.priceFc)}
                                  </span>
                                ) : null}
                              </p>
                            </div>
                            <label className="space-y-1">
                              <span className="block text-sm font-semibold text-muted">Quantité</span>
                              <input
                                className={cn(fieldClass, 'w-24')}
                                inputMode="numeric"
                                min={0}
                                max={500}
                                value={quantities[offer.id] ?? ''}
                                onChange={(event) => setQuantities((current) => ({ ...current, [offer.id]: event.target.value }))}
                                aria-label={`Quantité de ${offer.brandName}, ${offer.unitLabel}`}
                                aria-invalid={Boolean(quantities[offer.id]) && packs === 0}
                              />
                            </label>
                          </article>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}
            </div>

            <form
              className="rounded-[var(--radius-card)] border border-border bg-surface p-4 space-y-3 lg:sticky lg:top-[calc(var(--em-site-header)+1rem)]"
              onSubmit={(event) => event.preventDefault()}
            >
              <h2 className="text-base font-semibold text-foreground">Votre sélection</h2>
              {selected.length === 0 ? (
                <p className="text-sm text-muted">Indiquez une quantité sur les marques à commander.</p>
              ) : (
                <ul className="space-y-1 text-sm text-foreground">
                  {selected.map((row) => (
                    <li key={row.offer.id} className="flex justify-between gap-3">
                      <span className="min-w-0">{row.packs} × {row.offer.unitLabel} · {row.offer.brandName}</span>
                      <span className="shrink-0 tabular-nums">{formatFc(row.offer.payableFc * row.packs)}</span>
                    </li>
                  ))}
                </ul>
              )}
              <p className="text-base font-semibold tabular-nums text-foreground">Total indicatif {formatFc(totalFc)}</p>
              <label className="space-y-1 block">
                <span className="text-sm font-semibold text-muted">Date de l’événement</span>
                <span className="block text-sm text-muted">Requise pour le devis et la réservation.</span>
                <input className={fieldClass} type="date" value={eventDate} onChange={(event) => setEventDate(event.target.value)} aria-required="true" />
              </label>
              <label className="space-y-1 block">
                <span className="text-sm font-semibold text-muted">Message</span>
                <textarea className={cn(fieldClass, 'min-h-24 py-2')} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Précisez le lieu ou le retrait." />
              </label>
              {formError ? <p className="text-sm text-danger" role="alert">{formError}</p> : null}
              {sent ? (
                <div className="space-y-2" role="status">
                  <p className="text-sm text-foreground">{sent.text}</p>
                  <p className="text-sm text-muted">
                    {sent.kind === 'inquire'
                      ? 'Le prestataire répond dans la conversation du devis. Vous pouvez préciser les quantités avant d’accepter le montant.'
                      : 'Le prestataire accepte ou décline la réservation depuis ses réservations.'}
                  </p>
                  <Link href={followHref} className="inline-flex items-center min-h-[44px] text-sm font-semibold text-primary-solid underline">
                    {sent.kind === 'inquire' ? 'Ouvrir la conversation du devis' : 'Voir la réservation'}
                  </Link>
                </div>
              ) : authLoading ? (
                <p className="text-sm text-muted">Vérification du compte…</p>
              ) : token ? (
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="secondary" loading={busy === 'inquire'} disabled={Boolean(busy)} aria-busy={busy === 'inquire'} onClick={() => send('inquire')}>
                    {busy === 'inquire' ? 'Envoi…' : 'Demander un devis'}
                  </Button>
                  <Button type="button" loading={busy === 'book'} disabled={Boolean(busy)} aria-busy={busy === 'book'} onClick={() => send('book')}>
                    {busy === 'book' ? 'Envoi…' : 'Réserver'}
                  </Button>
                </div>
              ) : (
                <ClientAuthChoice
                  nextPath={`/marketplace/boissons/${slug}${focusOfferId ? `?offre=${encodeURIComponent(focusOfferId)}` : ''}`}
                  description="Connectez-vous pour envoyer le devis ou la réservation. La conversation reste dans vos devis."
                />
              )}
            </form>
          </div>
        ) : null}
      </div>
    </PublicPageShell>
  );
}

export default function VendorDrinksRoute() {
  return (
    <Suspense fallback={(
      <PublicPageShell faqHref="/faq">
        <PublicPageHero compact title="Boissons" description="Chargement des marques du prestataire.">
          <MarketplacePublicNav active="drinks" />
        </PublicPageHero>
        <p className="page-container py-6 text-sm text-muted">Chargement des marques…</p>
      </PublicPageShell>
    )}>
      <VendorDrinksPage />
    </Suspense>
  );
}
