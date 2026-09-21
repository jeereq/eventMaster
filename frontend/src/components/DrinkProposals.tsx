'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Wine } from 'lucide-react';
import { api } from '@/lib/api';
import { formatFc } from '@/config/landingPricing';
import { cn } from '@/lib/cn';
import { Button, Modal } from '@/components/ui';
import { BEVERAGE_SALE_UNIT_LABELS, formatBeverageSale, type PublicBeverageOffer } from '@/lib/beverageBrands';

const fieldClass = 'w-full min-h-11 rounded-[var(--radius-button)] border border-border bg-surface px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40';

export default function DrinkProposals({ offers }: { offers: PublicBeverageOffer[] }) {
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

  const groups = useMemo(() => {
    const map = new Map<string, PublicBeverageOffer[]>();
    for (const offer of offers) {
      const rows = map.get(offer.brandId) || [];
      rows.push(offer);
      map.set(offer.brandId, rows);
    }
    return [...map.entries()].map(([brandId, rows]) => ({
      brandId,
      brandName: rows[0].brandName,
      kindLabel: rows[0].kindLabel,
      imageUrl: rows[0].imageUrl,
      meta: [rows[0].volumeLabel, rows[0].producer, rows[0].country].filter(Boolean).join(' · '),
      rows,
    }));
  }, [offers]);

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
      <div className="space-y-4">
        {groups.map((group) => (
          <section key={group.brandId} className="rounded-[var(--radius-card)] border border-border bg-surface overflow-hidden">
            <header className="flex items-center gap-3 p-3 border-b border-border">
              <div className="w-16 h-16 rounded-md overflow-hidden bg-surface-muted shrink-0">
                {group.imageUrl ? (
                  <img src={group.imageUrl} alt={`Visuel de ${group.brandName}`} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted"><Wine className="w-6 h-6" aria-hidden="true" /></div>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-muted">{group.kindLabel}</p>
                <h2 className="text-base font-semibold text-foreground">{group.brandName}</h2>
                <p className="text-xs text-muted">{group.meta || `${group.rows.length} proposition${group.rows.length > 1 ? 's' : ''}`}</p>
              </div>
            </header>
            <ul>
              {group.rows.map((offer) => (
                <li key={offer.id} className="flex flex-col sm:flex-row sm:items-center gap-2 px-3 py-3 border-b border-border last:border-b-0">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground">{offer.vendorName}</p>
                    <p className="text-xs text-muted">{formatBeverageSale(offer)} · {BEVERAGE_SALE_UNIT_LABELS[offer.unitKind]}</p>
                  </div>
                  <p className="text-sm font-semibold tabular-nums text-foreground">
                    {formatFc(offer.payableFc)}
                    {offer.promoPriceFc != null ? <span className="ml-2 text-xs text-muted line-through">{formatFc(offer.priceFc)}</span> : null}
                  </p>
                  <button type="button" onClick={() => open(offer)} className="min-h-11 px-3 rounded-[var(--radius-button)] border border-border text-xs font-semibold text-foreground hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
                    Détail
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <Modal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        size="md"
        title={selected ? selected.brandName : 'Proposition'}
        description={selected ? `${selected.vendorName} · ${formatBeverageSale(selected)}` : undefined}
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
              <span className="text-xs font-semibold text-muted">Quantité ({selected.unitLabel})</span>
              <input className={fieldClass} inputMode="numeric" min={1} max={500} value={packs} onChange={(event) => setPacks(event.target.value)} aria-label={`Nombre de ${selected.unitLabel}`} />
            </label>
            <p className="text-sm font-semibold tabular-nums text-foreground">
              {validCount ? `Total ${formatFc(selected.payableFc * packCount)}` : 'Quantité entre 1 et 500.'}
            </p>
            <label className="space-y-1 block">
              <span className="text-xs font-semibold text-muted">Date de l’événement</span>
              <input className={fieldClass} type="date" value={eventDate} onChange={(event) => setEventDate(event.target.value)} />
            </label>
            <label className="space-y-1 block">
              <span className="text-xs font-semibold text-muted">Message</span>
              <textarea className={cn(fieldClass, 'min-h-24 py-2')} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Précisez le lieu ou le retrait." />
            </label>
            {formError ? <p className="text-xs text-danger" role="alert">{formError}</p> : null}
            {notice ? <p className="text-xs text-foreground" role="status">{notice}</p> : null}
            {loggedIn ? (
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="secondary" disabled={Boolean(busy)} onClick={() => send('inquire')}>
                  {busy === 'inquire' ? 'Envoi…' : 'Demander un devis'}
                </Button>
                <Button type="button" disabled={Boolean(busy)} onClick={() => send('book')}>
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
