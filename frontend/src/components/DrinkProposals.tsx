'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Wine } from 'lucide-react';
import { api } from '@/lib/api';
import { formatFc } from '@/config/landingPricing';
import { cn } from '@/lib/cn';
import { Button, Modal } from '@/components/ui';
import { BEVERAGE_SALE_UNIT_LABELS, formatBeverageSale, type PublicBeverageOffer } from '@/lib/beverageBrands';

const fieldClass = 'w-full min-h-[44px] rounded-[var(--radius-button)] border border-border bg-surface px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40';

export default function DrinkProposals({
  offers,
  layout,
  gridClass,
}: {
  offers: PublicBeverageOffer[];
  layout: 'grid' | 'list';
  gridClass: string;
}) {
  const pathname = usePathname() || '/marketplace/boissons';
  const [selected, setSelected] = useState<PublicBeverageOffer | null>(null);
  const [packs, setPacks] = useState('1');
  const [eventDate, setEventDate] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState<'inquire' | 'book' | ''>('');
  const [notice, setNotice] = useState('');
  const [formError, setFormError] = useState('');
  const [loggedIn, setLoggedIn] = useState(false);
  const loginHref = `/login?next=${encodeURIComponent(pathname)}`;

  React.useEffect(() => {
    setLoggedIn(Boolean(localStorage.getItem('token')));
  }, []);

  const open = (offer: PublicBeverageOffer) => {
    setSelected(offer);
    setPacks('1');
    setNotice('');
    setFormError('');
  };

  const packCount = Math.round(Number(packs));
  const validCount = Number.isFinite(packCount) && packCount >= 1 && packCount <= 500;

  const send = async (mode: 'inquire' | 'book') => {
    if (!selected || !validCount) {
      setFormError('Indiquez une quantité entre 1 et 500.');
      return;
    }
    if (mode === 'book' && !eventDate) {
      setFormError('Indiquez la date de l’événement pour réserver.');
      return;
    }
    setBusy(mode);
    setFormError('');
    setNotice('');
    try {
      const data = await api.post(`/public/beverage-offers/${selected.id}/${mode === 'book' ? 'book' : 'inquire'}`, {
        packCount,
        eventDate: eventDate || undefined,
        message,
        notes: message,
      }) as { message?: string };
      setNotice(data.message || (mode === 'book' ? 'Réservation envoyée.' : 'Demande envoyée.'));
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Envoi impossible.');
    } finally {
      setBusy('');
    }
  };

  return (
    <>
      <ul className={layout === 'list' ? 'space-y-2' : gridClass}>
        {offers.map((offer) => (
          <li key={offer.id}>
            <article className={cn(
              'h-full rounded-[var(--radius-card)] border border-border bg-surface',
              layout === 'list' ? 'flex flex-wrap items-center gap-3 p-3' : 'flex flex-col',
            )}>
              <div className={cn(
                'bg-surface-muted shrink-0 overflow-hidden',
                layout === 'list' ? 'w-20 h-16 sm:w-28 sm:h-20 rounded-md' : 'aspect-[4/3] rounded-t-[var(--radius-card)]',
              )}>
                {offer.imageUrl ? (
                  <img
                    src={offer.imageUrl}
                    alt=""
                    width={640}
                    height={480}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted">
                    <Wine className="w-6 h-6" aria-hidden="true" />
                  </div>
                )}
              </div>
              <div className={cn('min-w-0', layout === 'list' ? 'flex-1 basis-40' : 'p-3 space-y-1 flex-1')}>
                <p className="text-sm font-semibold text-muted">{offer.brandName} · {offer.kindLabel}</p>
                <h2 className="text-base font-semibold text-foreground truncate">{offer.vendorName}</h2>
                <p className="text-sm text-muted truncate">
                  {formatBeverageSale(offer)} · {BEVERAGE_SALE_UNIT_LABELS[offer.unitKind]}
                </p>
              </div>
              <div className={cn(
                'flex flex-wrap items-center gap-2',
                layout === 'list' ? 'w-full sm:w-auto' : 'mt-auto w-full px-3 pb-3',
              )}>
                <p className="min-w-0 text-base font-semibold tabular-nums text-foreground">
                  <span className="sr-only">Prix actuel </span>
                  {formatFc(offer.payableFc)}
                  {offer.promoPriceFc != null ? (
                    <span className="ml-2 text-sm text-muted line-through">
                      <span className="sr-only">, tarif habituel </span>
                      {formatFc(offer.priceFc)}
                    </span>
                  ) : null}
                </p>
                <button
                  type="button"
                  onClick={() => open(offer)}
                  aria-label={`Détail de l’offre ${offer.vendorName}, ${offer.brandName}`}
                  className="min-h-[44px] shrink-0 px-3 rounded-[var(--radius-button)] border border-border text-sm font-semibold text-foreground hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  Détail
                </button>
              </div>
            </article>
          </li>
        ))}
      </ul>

      <Modal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        size="md"
        title={selected ? selected.vendorName : 'Proposition'}
        description={selected ? `${selected.brandName} · ${formatBeverageSale(selected)}` : undefined}
      >
        {selected ? (
          <div className="space-y-3">
            <p className="text-sm text-foreground">
              {formatFc(selected.payableFc)} / {selected.unitLabel}
              {selected.promoPriceFc != null ? ` · tarif habituel ${formatFc(selected.priceFc)}` : ''}
            </p>
            {selected.notes ? <p className="text-sm text-muted leading-relaxed">{selected.notes}</p> : null}
            {selected.description ? <p className="text-sm text-muted leading-relaxed">{selected.description}</p> : null}
            <label className="space-y-1 block">
              <span className="text-sm font-semibold text-muted">Quantité ({selected.unitLabel})</span>
              <input
                className={fieldClass}
                inputMode="numeric"
                min={1}
                max={500}
                value={packs}
                onChange={(event) => setPacks(event.target.value)}
                aria-label={`Nombre de ${selected.unitLabel}`}
                aria-invalid={!validCount}
                aria-describedby="drink-offer-quantity"
              />
            </label>
            <p id="drink-offer-quantity" className={cn('text-sm font-semibold tabular-nums', validCount ? 'text-foreground' : 'text-danger')}>
              {validCount ? `Total ${formatFc(selected.payableFc * packCount)}` : 'Quantité entre 1 et 500.'}
            </p>
            <label className="space-y-1 block">
              <span className="text-sm font-semibold text-muted">Date de l’événement</span>
              <span className="block text-sm text-muted">Requise pour réserver.</span>
              <input
                className={fieldClass}
                type="date"
                value={eventDate}
                onChange={(event) => setEventDate(event.target.value)}
                aria-required="true"
              />
            </label>
            <label className="space-y-1 block">
              <span className="text-sm font-semibold text-muted">Message</span>
              <textarea className={cn(fieldClass, 'min-h-24 py-2')} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Précisez le lieu ou le retrait." />
            </label>
            {formError ? <p className="text-sm text-danger" role="alert">{formError}</p> : null}
            {notice ? <p className="text-sm text-foreground" role="status">{notice}</p> : null}
            {loggedIn ? (
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="secondary" loading={busy === 'inquire'} disabled={Boolean(busy)} aria-busy={busy === 'inquire'} onClick={() => send('inquire')}>
                  {busy === 'inquire' ? 'Envoi…' : 'Demander un devis'}
                </Button>
                <Button type="button" loading={busy === 'book'} disabled={Boolean(busy)} aria-busy={busy === 'book'} onClick={() => send('book')}>
                  {busy === 'book' ? 'Envoi…' : 'Réserver cette quantité'}
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted">
                <Link href={loginHref} className="font-semibold text-primary-solid underline">Connectez-vous</Link>
                {' '}pour demander un devis ou réserver cette quantité.
              </p>
            )}
          </div>
        ) : null}
      </Modal>
    </>
  );
}
