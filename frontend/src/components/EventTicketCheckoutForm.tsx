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
import { normalizeTicketPricingMode } from '@/lib/ticketPricing';
import SeatSelectionPlanCanvas, { type SeatSelectionPlanCanvasProps } from '@/components/SeatSelectionPlanCanvas';

type SeatRow = {
  tableId: string;
  tableName: string;
  seatIndex: number;
  available: boolean;
  x: number;
  y: number;
  shape: string;
  capacity: number;
  priceFc: number;
  pricingZoneId: string | null;
  pricingZoneName: string | null;
};

type SeatInventoryMeta = {
  fixtures: unknown[];
  roomOutline: unknown;
  roomThemeId: string | null;
  floorType: string | null;
  floorImageUrl: string | null;
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
  const [planMeta, setPlanMeta] = useState<SeatInventoryMeta | null>(null);
  const [selected, setSelected] = useState<{ tableId: string; seatIndex: number } | null>(null);
  const [selectedZoneId, setSelectedZoneId] = useState('');
  const [seatsLoading, setSeatsLoading] = useState(false);

  const pricingMode = normalizeTicketPricingMode(event.ticketPricingMode);
  const zonePricing = pricingMode === 'by_zone';
  const seatMode = Boolean(event.seatSelectionEnabled);
  const pricingZones = event.pricingZones ?? [];

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
        setPlanMeta({
          fixtures: Array.isArray(data.fixtures) ? data.fixtures : [],
          roomOutline: data.roomOutline ?? null,
          roomThemeId: data.roomThemeId ?? null,
          floorType: data.floorType ?? null,
          floorImageUrl: data.floorImageUrl ?? null,
        });
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

  const selectedSeat = useMemo(() => {
    if (!selected) return null;
    return seats.find((s) => s.tableId === selected.tableId && s.seatIndex === selected.seatIndex) ?? null;
  }, [seats, selected]);

  const selectedZone = useMemo(
    () => pricingZones.find((z) => z.id === selectedZoneId) ?? null,
    [pricingZones, selectedZoneId],
  );

  const unitPriceFc = useMemo(() => {
    if (seatMode && selectedSeat) return selectedSeat.priceFc;
    if (zonePricing && !seatMode && selectedZone) return selectedZone.priceFc;
    if (zonePricing && event.priceFromFc) return event.priceFromFc;
    return event.ticketPriceFc;
  }, [seatMode, selectedSeat, zonePricing, selectedZone, event.priceFromFc, event.ticketPriceFc]);

  const totalFc = unitPriceFc * (seatMode ? 1 : quantity);

  const zoneColorById = useMemo(() => {
    const map = new Map<string, string>();
    for (const z of pricingZones) {
      if (z.color) map.set(z.id, z.color);
    }
    return map;
  }, [pricingZones]);

  const [paymentMethod, setPaymentMethod] = useState<'card' | 'mobile'>('card');
  const [mmPhone, setMmPhone] = useState('');

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
      if (zonePricing && !seatMode && !selectedZoneId) {
        setError('Choisissez une zone tarifaire.');
        setBusy(false);
        return;
      }
      if (event.paid && paymentMethod === 'mobile' && !mmPhone.trim() && !buyerPhone.trim()) {
        setError('Indiquez un numéro Mobile Money (243…).');
        setBusy(false);
        return;
      }
      const data = await api.post(`/public/events/${slug}/checkout`, {
        buyerName,
        buyerPhone,
        quantity: seatMode ? 1 : quantity,
        ...(event.paid ? { paymentMethod } : {}),
        ...(event.paid && paymentMethod === 'mobile'
          ? { phone: mmPhone.trim() || buyerPhone.trim() }
          : {}),
        ...(selected ? { tableId: selected.tableId, seatIndex: selected.seatIndex } : {}),
        ...(zonePricing && !seatMode && selectedZoneId ? { pricingZoneId: selectedZoneId } : {}),
      });
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }
      const rsvp = data.rsvpUrl ? `&rsvp=${encodeURIComponent(data.rsvpUrl)}` : '';
      const provider = data.provider === 'flexpay_mobile' ? '&provider=flexpay' : '';
      router.push(`${eventPublicHref(slug)}/succes?order=${data.orderId || ''}${rsvp}${provider}`);
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
      {zonePricing && event.priceFromFc != null && (
        <p className="text-[11px] text-muted">
          Tarifs à partir de {formatFc(event.priceFromFc)}
          {pricingZones.length > 0 && (
            <span className="ml-1">
              ({pricingZones.map((z) => `${z.name} ${formatFc(z.priceFc)}`).join(' · ')})
            </span>
          )}
        </p>
      )}
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

          {zonePricing && !seatMode && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-foreground">Catégorie de place</p>
              <div className="grid gap-2">
                {pricingZones.map((zone) => {
                  const active = selectedZoneId === zone.id;
                  return (
                    <button
                      key={zone.id}
                      type="button"
                      onClick={() => setSelectedZoneId(zone.id)}
                      className={`flex items-center justify-between gap-2 p-2.5 rounded border text-left text-sm transition ${
                        active ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <span className="inline-flex items-center gap-2 font-medium">
                        <span
                          className="w-3 h-3 rounded-full shrink-0 border border-border"
                          style={{ backgroundColor: zone.color || '#c4a35a' }}
                        />
                        {zone.name}
                      </span>
                      <span className="text-xs font-bold text-primary">{formatFc(zone.priceFc)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {seatMode ? (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-foreground">Choisissez votre place sur le plan</p>
              {seatsLoading ? (
                <p className="text-xs text-muted">Chargement du plan…</p>
              ) : seats.length === 0 ? (
                <p className="text-xs text-muted">Aucune place libre sur le plan.</p>
              ) : (
                <>
                  <SeatSelectionPlanCanvas
                    seats={seats}
                    fixtures={planMeta?.fixtures as SeatSelectionPlanCanvasProps['fixtures']}
                    roomOutline={planMeta?.roomOutline as SeatSelectionPlanCanvasProps['roomOutline']}
                    roomThemeId={planMeta?.roomThemeId}
                    floorType={planMeta?.floorType}
                    floorImageUrl={planMeta?.floorImageUrl}
                    pricingZones={pricingZones}
                    selected={selected}
                    onSelect={(tableId, seatIndex) => setSelected({ tableId, seatIndex })}
                    zoneColorById={zoneColorById}
                    showZonePricing={zonePricing}
                    height={320}
                  />
                  <details className="text-xs">
                    <summary className="cursor-pointer text-muted hover:text-foreground font-medium">
                      Liste des places par table
                    </summary>
                    <div className="mt-2 max-h-40 overflow-y-auto space-y-2 pr-1">
                      {tables.map(([tableId, info]) => (
                        <div key={tableId} className="rounded border border-border p-2">
                          <p className="text-[11px] font-bold text-foreground mb-1.5">{info.name}</p>
                          <div className="flex flex-wrap gap-1.5">
                            {info.seats.map((s) => {
                              const active = selected?.tableId === s.tableId && selected.seatIndex === s.seatIndex;
                              const zoneColor = s.pricingZoneId ? zoneColorById.get(s.pricingZoneId) : undefined;
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
                                  style={!active && zoneColor ? { borderColor: zoneColor } : undefined}
                                >
                                  {s.seatIndex + 1}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </details>
                </>
              )}
              {selectedSeat && (
                <p className="text-[11px] text-primary font-semibold">
                  Place : siège {selectedSeat.seatIndex + 1}
                  {selectedSeat.pricingZoneName ? ` · ${selectedSeat.pricingZoneName}` : ''}
                  {zonePricing && selectedSeat.priceFc > 0 ? ` · ${formatFc(selectedSeat.priceFc)}` : ''}
                </p>
              )}
            </div>
          ) : !zonePricing ? (
            <Input
              label="Quantité"
              type="number"
              min={1}
              max={8}
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value) || 1)}
            />
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
            <div className="space-y-2">
              <p className="text-xs font-semibold text-foreground">Mode de paiement</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('card')}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${
                    paymentMethod === 'card' ? 'bg-primary text-white border-primary' : 'border-border text-muted'
                  }`}
                >
                  Visa / Mastercard
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('mobile')}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${
                    paymentMethod === 'mobile' ? 'bg-primary text-white border-primary' : 'border-border text-muted'
                  }`}
                >
                  Mobile Money
                </button>
              </div>
              {paymentMethod === 'mobile' && (
                <Input
                  label="Numéro Mobile Money"
                  value={mmPhone}
                  onChange={(e) => setMmPhone(e.target.value)}
                  placeholder="243XXXXXXXXX"
                />
              )}
              <p className="text-xs text-muted">Total : {formatFc(totalFc)}</p>
            </div>
          )}
          <Button type="submit" loading={busy} fullWidth className="min-h-11">
            {event.paid ? 'Payer et réserver' : 'Confirmer l’inscription'}
          </Button>
        </>
      )}
    </form>
  );
}
