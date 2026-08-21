'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Alert, Button, Input } from '@/components/ui';
import { formatFc } from '@/config/landingPricing';
import { Ticket } from 'lucide-react';
import ClientAuthChoice from '@/components/ClientAuthChoice';
import { eventPublicHref } from '@/lib/safeAppPath';
import type { PublicEventCard } from '@/lib/marketplace';
import { resolveLightingFromProgram, normalizeEventProgram } from '@/lib/eventProgram';
import { lightingPresetLabels } from '@/lib/roomRenderQuality';

type SeatRow = {
  tableId: string;
  tableName: string;
  seatIndex: number;
  available: boolean;
  x: number;
  y: number;
};

export default function EventTicketCheckoutForm({ event }: { event: PublicEventCard }) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const { user, token, loading: authLoading } = useAuth();
  const slug = event.slug || '';
  const nextPath = pathname || eventPublicHref(slug);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [buyerName, setBuyerName] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [seats, setSeats] = useState<SeatRow[]>([]);
  const [selected, setSelected] = useState<{ tableId: string; seatIndex: number } | null>(null);
  const [seatsLoading, setSeatsLoading] = useState(false);

  const seatMode = Boolean(event.seatSelectionEnabled);
  const programHint = useMemo(() => {
    const lighting = resolveLightingFromProgram(
      normalizeEventProgram(event.eventProgram),
      new Date(),
      event.date,
    );
    return lightingPresetLabels[lighting];
  }, [event.eventProgram, event.date]);

  useEffect(() => {
    if (!user) return;
    setBuyerName((prev) => prev || user.name || '');
    setBuyerPhone((prev) => prev || user.phone || '');
  }, [user]);

  useEffect(() => {
    if (!seatMode || !slug) return;
    let cancelled = false;
    setSeatsLoading(true);
    api.get(`/public/events/${slug}/seats`)
      .then((data) => {
        if (cancelled) return;
        setSeats(Array.isArray(data.seats) ? data.seats : []);
      })
      .catch(() => {
        if (!cancelled) setError('Impossible de charger les places disponibles.');
      })
      .finally(() => {
        if (!cancelled) setSeatsLoading(false);
      });
    return () => { cancelled = true; };
  }, [seatMode, slug]);

  const tables = useMemo(() => {
    const map = new Map<string, { name: string; seats: SeatRow[] }>();
    for (const s of seats) {
      const cur = map.get(s.tableId) ?? { name: s.tableName, seats: [] };
      cur.seats.push(s);
      map.set(s.tableId, cur);
    }
    return [...map.entries()];
  }, [seats]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (seatMode && !selected) {
        setError('Sélectionnez une place sur le plan.');
        setBusy(false);
        return;
      }
      const data = await api.post(`/public/events/${slug}/checkout`, {
        buyerName,
        buyerPhone,
        quantity: seatMode ? 1 : quantity,
        ...(selected ? { tableId: selected.tableId, seatIndex: selected.seatIndex } : {}),
      });
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }
      const rsvp = data.rsvpUrl ? `&rsvp=${encodeURIComponent(data.rsvpUrl)}` : '';
      router.push(`${eventPublicHref(slug)}/succes?order=${data.orderId || ''}${rsvp}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Inscription impossible.');
    } finally {
      setBusy(false);
    }
  };

  const showAuthChoice = !authLoading && !token;

  return (
    <form onSubmit={submit} className="border border-border rounded-[var(--radius-card)] p-4 sm:p-5 bg-surface space-y-3">
      <h2 className="text-sm font-semibold text-foreground inline-flex items-center gap-2">
        <Ticket className="w-4 h-4" />
        {event.paid ? 'Acheter un billet' : 'S’inscrire'}
      </h2>
      {programHint && (
        <p className="text-[10px] text-muted">Ambiance programme actuelle : {programHint}</p>
      )}
      {search.get('canceled') && (
        <Alert variant="error">Paiement annulé. Vous pouvez réessayer.</Alert>
      )}
      {error && <Alert variant="error">{error}</Alert>}
      {event.soldOut ? (
        <p className="text-sm text-muted">Plus de places disponibles.</p>
      ) : showAuthChoice ? (
        <ClientAuthChoice
          nextPath={nextPath}
          description="Un compte est requis pour réserver une place ou acheter un billet. Après connexion, vous revenez à cette fiche."
        />
      ) : (
        <>
          {token && user && (
            <p className="text-xs text-muted">
              Connecté en tant que {user.name || user.email}. Les billets apparaîtront dans{' '}
              <Link href="/dashboard/tickets" className="text-primary font-semibold underline">Mes billets</Link>.
            </p>
          )}
          <Input label="Nom complet" value={buyerName} onChange={(e) => setBuyerName(e.target.value)} required />
          <Input label="Téléphone" value={buyerPhone} onChange={(e) => setBuyerPhone(e.target.value)} />
          {seatMode ? (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-foreground">Choisissez votre place</p>
              {seatsLoading ? (
                <p className="text-xs text-muted">Chargement du plan…</p>
              ) : tables.length === 0 ? (
                <p className="text-xs text-muted">Aucune place libre sur le plan.</p>
              ) : (
                <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                  {tables.map(([tableId, info]) => (
                    <div key={tableId} className="rounded border border-border p-2">
                      <p className="text-[11px] font-bold text-foreground mb-1.5">{info.name}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {info.seats.map((s) => {
                          const active = selected?.tableId === s.tableId && selected.seatIndex === s.seatIndex;
                          return (
                            <button
                              key={`${s.tableId}-${s.seatIndex}`}
                              type="button"
                              disabled={!s.available}
                              onClick={() => setSelected({ tableId: s.tableId, seatIndex: s.seatIndex })}
                              className={`min-w-[2rem] px-2 py-1 rounded text-[10px] font-bold border transition ${
                                !s.available
                                  ? 'opacity-40 cursor-not-allowed border-border text-muted'
                                  : active
                                    ? 'bg-primary text-white border-primary'
                                    : 'border-border hover:border-primary text-foreground'
                              }`}
                            >
                              {s.seatIndex + 1}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {selected && (
                <p className="text-[11px] text-primary font-semibold">
                  Place sélectionnée : siège {selected.seatIndex + 1}
                </p>
              )}
            </div>
          ) : (
            <Input
              label="Quantité"
              type="number"
              min={1}
              max={8}
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value) || 1)}
            />
          )}
          {event.paid && (
            <p className="text-xs text-muted">
              Total : {formatFc(event.ticketPriceFc * (seatMode ? 1 : quantity))}
            </p>
          )}
          <Button type="submit" loading={busy} fullWidth className="min-h-11">
            {event.paid ? 'Payer et réserver' : 'Confirmer l’inscription'}
          </Button>
        </>
      )}
    </form>
  );
}
