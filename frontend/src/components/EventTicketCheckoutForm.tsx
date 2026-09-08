'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Alert, Button, Input } from '@/components/ui';
import { formatFc } from '@/config/landingPricing';
import { Ticket, Plus, Minus, X, Check, Users, Box, Loader2 } from 'lucide-react';
import ClientAuthChoice from '@/components/ClientAuthChoice';
import { eventPublicHref } from '@/lib/safeAppPath';
import type { PublicEventCard } from '@/lib/marketplace';
import { resolveLightingFromProgram, normalizeEventProgram } from '@/lib/eventProgram';
import { lightingPresetLabels } from '@/lib/roomRenderQuality';
import { normalizeTicketPricingMode, type PricingZone } from '@/lib/ticketPricing';
import { resolveBlueprintWalls } from '@/lib/roomLayoutUtils';
import SeatSelectionPlanCanvas, { type SeatSelectionPlanCanvasProps } from '@/components/SeatSelectionPlanCanvas';
import SeatSelection3DViewer from '@/components/SeatSelection3DViewer';
import { PlanViewToggle, type PlanViewMode } from '@/components/PlanViewChrome';
import PaymentAccountPicker from '@/components/PaymentAccountPicker';
import PaymentPendingView from '@/components/PaymentPendingView';
import {
  clearPendingTicketPayment,
  readPendingTicketPayment,
  writePendingTicketPayment,
} from '@/lib/pendingTicketPayment';
import type { FlexPayChargeCurrency } from '@/lib/flexPayCurrency';
import type { FlexPayMobileOperatorId } from '@/lib/flexPayOperators';

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
  pricingZones?: unknown[];
  roomLayoutBlueprint?: any;
  roomType?: string | null;
};

export default function EventTicketCheckoutForm({
  event,
  onPaymentActivityChange,
}: {
  event: PublicEventCard;
  onPaymentActivityChange?: (active: boolean) => void;
}) {
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
  const [selectedSeats, setSelectedSeats] = useState<Array<{ tableId: string; seatIndex: number }>>([]);
  const [selectedZoneId, setSelectedZoneId] = useState('');
  const [activeTableId, setActiveTableId] = useState<string | null>(null);
  const [seatsLoading, setSeatsLoading] = useState(false);
  const [planViewMode, setPlanViewMode] = useState<PlanViewMode>('3d');
  const [pendingOrder, setPendingOrder] = useState<{
    orderId: string;
    method: 'card' | 'mobile';
  } | null>(null);
  const [paidResult, setPaidResult] = useState<{ rsvpUrl?: string } | null>(null);

  const pricingMode = normalizeTicketPricingMode(event.ticketPricingMode);
  const zonePricing = pricingMode === 'by_zone';
  const seatMode = Boolean(event.seatSelectionEnabled);
  const pricingZones = event.pricingZones ?? [];

  const planWalls = useMemo(() => {
    if (planMeta?.roomLayoutBlueprint) {
      return resolveBlueprintWalls(planMeta.roomLayoutBlueprint);
    }
    return [];
  }, [planMeta?.roomLayoutBlueprint]);

  const planCanvasWidthM = planMeta?.roomLayoutBlueprint?.canvas?.widthM ?? 20;
  const planCanvasHeightM = planMeta?.roomLayoutBlueprint?.canvas?.heightM ?? 16;

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
    const stored = readPendingTicketPayment(slug);
    const queryOrder = search.get('order');
    const paused = search.get('payment') === 'paused' || search.get('canceled') === '1' || search.get('declined') === '1';
    if (stored) {
      setPendingOrder({ orderId: stored.orderId, method: stored.method });
      return;
    }
    if (paused && queryOrder) {
      const method = search.get('method') === 'card' ? 'card' : 'mobile';
      setPendingOrder({ orderId: queryOrder, method });
      writePendingTicketPayment({ orderId: queryOrder, slug, method, eventTitle: event.title });
    }
  }, [slug, search, event.title]);

  useEffect(() => {
    onPaymentActivityChange?.(Boolean(pendingOrder) && !paidResult);
  }, [pendingOrder, paidResult, onPaymentActivityChange]);

  const reloadSeats = React.useCallback(async () => {
    if (!seatMode || !slug) return;
    try {
      const data = await api.get(`/public/events/${slug}/seats`);
      setSeats(Array.isArray(data.seats) ? data.seats : []);
      setPlanMeta({
        fixtures: Array.isArray(data.fixtures) ? data.fixtures : [],
        roomOutline: data.roomOutline ?? null,
        roomThemeId: data.roomThemeId ?? null,
        floorType: data.floorType ?? null,
        floorImageUrl: data.floorImageUrl ?? null,
        pricingZones: Array.isArray(data.pricingZones) ? data.pricingZones : [],
        roomLayoutBlueprint: data.roomLayoutBlueprint ?? null,
        roomType: data.roomType ?? null,
      });
    } catch {
      // Ignorer
    }
  }, [seatMode, slug]);

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
          pricingZones: Array.isArray(data.pricingZones) ? data.pricingZones : [],
          roomLayoutBlueprint: data.roomLayoutBlueprint ?? null,
          roomType: data.roomType ?? null,
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

  const toggleSeat = (tableId: string, seatIndex: number) => {
    setSelectedSeats((prev) => {
      const exists = prev.some((s) => s.tableId === tableId && s.seatIndex === seatIndex);
      if (exists) {
        return prev.filter((s) => !(s.tableId === tableId && s.seatIndex === seatIndex));
      }
      if (prev.length >= 8) {
        setError('Vous pouvez sélectionner au maximum 8 places à la fois.');
        return prev;
      }
      setError('');
      return [...prev, { tableId, seatIndex }];
    });
  };

  const removeSeat = (tableId: string, seatIndex: number) => {
    setSelectedSeats((prev) => prev.filter((s) => !(s.tableId === tableId && s.seatIndex === seatIndex)));
  };

  const selectedSeatObjects = useMemo(() => {
    return selectedSeats
      .map((sel) => seats.find((s) => s.tableId === sel.tableId && s.seatIndex === sel.seatIndex))
      .filter((s): s is SeatRow => Boolean(s));
  }, [seats, selectedSeats]);

  const selectedZone = useMemo(
    () => pricingZones.find((z) => z.id === selectedZoneId) ?? null,
    [pricingZones, selectedZoneId],
  );

  const totalFc = useMemo(() => {
    if (seatMode) {
      return selectedSeatObjects.reduce(
        (acc, s) => acc + (s.priceFc > 0 ? s.priceFc : Math.max(0, event.ticketPriceFc)),
        0,
      );
    }
    if (zonePricing && selectedZone) {
      return selectedZone.priceFc * quantity;
    }
    if (zonePricing && event.priceFromFc) {
      return event.priceFromFc * quantity;
    }
    return Math.max(0, event.ticketPriceFc) * quantity;
  }, [seatMode, selectedSeatObjects, zonePricing, selectedZone, quantity, event.priceFromFc, event.ticketPriceFc]);

  const zoneColorById = useMemo(() => {
    const map = new Map<string, string>();
    for (const z of pricingZones) {
      if (z.color) map.set(z.id, z.color);
    }
    return map;
  }, [pricingZones]);

  const [paymentMethod, setPaymentMethod] = useState<'card' | 'mobile'>('mobile');
  const [currency, setCurrency] = useState<FlexPayChargeCurrency>('CDF');
  const [mmPhone, setMmPhone] = useState('');
  const [operator, setOperator] = useState<FlexPayMobileOperatorId>('orange');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const cleanBuyerName = buyerName.trim();
      const cleanBuyerPhone = buyerPhone.trim().replace(/\s+/g, '');
      const rawMobilePhone = (mmPhone.trim() || buyerPhone.trim()).replace(/\s+/g, '').replace(/^\+/, '');

      if (!cleanBuyerName) {
        setError('Veuillez renseigner votre nom complet.');
        setBusy(false);
        return;
      }
      if (!cleanBuyerPhone) {
        setError('Veuillez renseigner votre numéro de téléphone ou WhatsApp.');
        setBusy(false);
        return;
      }
      if (seatMode && selectedSeats.length === 0) {
        setError('Sélectionnez au moins une place sur le plan.');
        setBusy(false);
        return;
      }
      if (zonePricing && !seatMode && !selectedZoneId) {
        setError('Choisissez une zone tarifaire.');
        setBusy(false);
        return;
      }
      if (event.paid && paymentMethod === 'mobile' && !rawMobilePhone) {
        setError('Indiquez un numéro Mobile Money valide (ex: 24389XXXXXXX).');
        setBusy(false);
        return;
      }

      // Règle d'or : vérifier la disponibilité des places en temps réel AVANT d'initier le paiement
      if (seatMode && selectedSeats.length > 0) {
        try {
          const check = await api.post(`/public/events/${slug}/check-seats`, {
            seats: selectedSeats,
          });
          if (check && check.allAvailable === false) {
            setError(
              'Une ou plusieurs places sélectionnées viennent d’être réservées par un autre participant. Le plan a été actualisé.',
            );
            await reloadSeats();
            if (Array.isArray(check.unavailable)) {
              const unavailKeys = new Set(check.unavailable.map((u: any) => `${u.tableId}:${u.seatIndex}`));
              setSelectedSeats((prev) => prev.filter((s) => !unavailKeys.has(`${s.tableId}:${s.seatIndex}`)));
            }
            setBusy(false);
            return;
          }
        } catch {
          // Si le pre-check échoue, le backend re-vérifie strictement avant de créer la commande
        }
      }

      const data = await api.post(`/public/events/${slug}/checkout`, {
        buyerName: cleanBuyerName,
        buyerPhone: cleanBuyerPhone,
        quantity: seatMode ? selectedSeats.length : quantity,
        ...(event.paid ? { paymentMethod } : {}),
        ...(event.paid && paymentMethod === 'mobile'
          ? { phone: rawMobilePhone, operator, currency }
          : {}),
        ...(seatMode && selectedSeats.length > 0 ? { seats: selectedSeats } : {}),
        ...(zonePricing && !seatMode && selectedZoneId ? { pricingZoneId: selectedZoneId } : {}),
      });
      if (data.checkoutUrl) {
        if (data.orderId) {
          writePendingTicketPayment({
            orderId: data.orderId,
            slug,
            method: 'card',
            eventTitle: event.title,
          });
          setPendingOrder({ orderId: data.orderId, method: 'card' });
        }
        window.location.href = data.checkoutUrl;
        return;
      }
      const isFlex =
        data.provider === 'flexpay_mobile' || data.provider === 'flexpay_card';
      if (isFlex && data.orderId && !data.rsvpUrl) {
        const method = data.provider === 'flexpay_card' ? 'card' : 'mobile';
        writePendingTicketPayment({
          orderId: data.orderId,
          slug,
          method,
          eventTitle: event.title,
        });
        setPendingOrder({ orderId: data.orderId, method });
        return;
      }
      const rsvp = data.rsvpUrl ? `&rsvp=${encodeURIComponent(data.rsvpUrl)}` : '';
      router.push(
        `${eventPublicHref(slug)}/succes?order=${data.orderId || ''}${rsvp}`,
      );
    } catch (err: unknown) {
      void reloadSeats();
      setError(err instanceof Error ? err.message : 'Inscription impossible.');
    } finally {
      setBusy(false);
    }
  };

  const pollPending = async () => {
    if (!pendingOrder) return { status: 'error' as const, message: 'Commande manquante.' };
    const data = await api.get(`/public/payments/flexpay/orders/${pendingOrder.orderId}/verify`);
    if (data.paid) {
      clearPendingTicketPayment(pendingOrder.orderId);
      setPaidResult({ rsvpUrl: data.rsvpUrl || '' });
      return { status: 'paid' as const };
    }
    if (data.status === 'failed') {
      return { status: 'failed' as const, message: data.message || 'Le paiement a échoué ou a été refusé.' };
    }
    return { status: 'pending' as const, message: data.message || 'En attente de confirmation FlexPay…' };
  };

  const retryPending = async () => {
    if (!pendingOrder) return;
    const phone = (mmPhone.trim() || buyerPhone.trim()).replace(/\s+/g, '').replace(/^\+/, '');
    const data = await api.post(`/public/payments/flexpay/orders/${pendingOrder.orderId}/retry`, {
      paymentMethod: pendingOrder.method,
      ...(pendingOrder.method === 'mobile' ? { phone, operator, currency } : {}),
    });
    if (data.checkoutUrl) {
      window.location.href = data.checkoutUrl;
    }
  };

  const cancelPending = async () => {
    if (!pendingOrder) return;
    await api.post(`/public/payments/flexpay/orders/${pendingOrder.orderId}/cancel`, {});
    clearPendingTicketPayment(pendingOrder.orderId);
    setPendingOrder(null);
    setError('Commande annulée. Vous pouvez en créer une nouvelle.');
  };

  const showAuthChoice = !authLoading && !token;

  return (
    <div className="border border-border rounded-[var(--radius-card)] p-4 sm:p-5 bg-surface space-y-3">
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
      {(search.get('canceled') || search.get('payment') === 'paused') && !pendingOrder && (
        <Alert variant="info">
          Paiement interrompu. La commande reste ouverte quelques heures : vous pouvez la reprendre ou en créer une nouvelle.
        </Alert>
      )}
      {search.get('declined') && (
        <Alert variant="error">Le paiement a été refusé par l’opérateur. Relancez ou changez de moyen.</Alert>
      )}
      {error && <Alert variant="error">{error}</Alert>}
      {paidResult ? (
        <div className="space-y-3">
          <Alert variant="success">Paiement confirmé. Votre place est réservée.</Alert>
          {paidResult.rsvpUrl ? (
            <Link href={paidResult.rsvpUrl} className="inline-flex">
              <Button type="button">Ouvrir mon espace invité</Button>
            </Link>
          ) : (
            <Link href="/dashboard/tickets" className="inline-flex">
              <Button type="button">Voir mes billets</Button>
            </Link>
          )}
        </div>
      ) : pendingOrder ? (
        <PaymentPendingView
          method={pendingOrder.method}
          title="Paiement en cours"
          description={
            pendingOrder.method === 'mobile'
              ? 'Validez la demande sur votre téléphone. Fermer cette fenêtre ne l’annule pas.'
              : 'Terminez le paiement chez FlexPay, ou reprenez-le ici si vous avez fermé la page.'
          }
          onPoll={pollPending}
          onRetry={retryPending}
          onCancelPayment={cancelPending}
          onPaid={() => {
            /* pollPending already sets paidResult */
          }}
        />
      ) : event.soldOut ? (
        <p className="text-sm text-muted">Plus de places disponibles.</p>
      ) : showAuthChoice ? (
        <ClientAuthChoice
          nextPath={nextPath}
          description="Un compte est requis pour réserver une place ou acheter un billet. Après connexion, vous revenez à cette fiche."
        />
      ) : (
        <form onSubmit={submit} className="space-y-3">
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
                      className={`flex items-center justify-between gap-2 p-2.5 min-h-11 rounded border text-left text-sm transition ${
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
            <div className="space-y-3.5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
                <div>
                  <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-primary" />
                    Choisissez vos places sur le plan interactif
                  </p>
                  <p className="text-[11px] text-muted">
                    {selectedSeats.length === 0
                      ? 'Touchez un ou plusieurs sièges libres sur le plan (jusqu’à 8 places)'
                      : `${selectedSeats.length} place${selectedSeats.length > 1 ? 's' : ''} sélectionnée${selectedSeats.length > 1 ? 's' : ''} (max 8)`}
                  </p>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <PlanViewToggle
                    value={planViewMode}
                    onChange={setPlanViewMode}
                  />
                  {selectedSeats.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedSeats([])}
                      className="text-xs text-rose-600 hover:underline font-semibold px-3 min-h-11 rounded-[var(--radius-button)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                    >
                      Tout désélectionner
                    </button>
                  )}
                </div>
              </div>

              {seatsLoading ? (
                <div className="p-8 rounded-2xl border border-dashed border-border bg-surface text-center space-y-2">
                  <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />
                  <p className="text-xs text-muted">Chargement du plan de salle interactif…</p>
                </div>
              ) : seats.length === 0 ? (
                <p className="text-xs text-muted">Aucune place libre sur le plan.</p>
              ) : (
                <>
                  {planViewMode === '3d' ? (
                    <SeatSelection3DViewer
                      seats={seats}
                      selectedSeats={selectedSeats}
                      onToggleSeat={(tableId, seatIndex) => toggleSeat(tableId, seatIndex)}
                      pricingZones={pricingZones.length > 0 ? pricingZones : (planMeta?.pricingZones as PricingZone[]) || []}
                      zoneColorById={zoneColorById}
                      planMeta={planMeta}
                      activeTableId={activeTableId}
                      onActiveTableChange={setActiveTableId}
                      lightingPreset={resolveLightingFromProgram(
                        normalizeEventProgram(event.eventProgram),
                        new Date(),
                        event.date,
                      )}
                    />
                  ) : (
                    <SeatSelectionPlanCanvas
                      seats={seats}
                      fixtures={planMeta?.fixtures as SeatSelectionPlanCanvasProps['fixtures']}
                      roomOutline={planMeta?.roomOutline as SeatSelectionPlanCanvasProps['roomOutline']}
                      walls={planWalls}
                      canvasWidthM={planCanvasWidthM}
                      canvasHeightM={planCanvasHeightM}
                      roomThemeId={planMeta?.roomThemeId}
                      floorType={planMeta?.floorType}
                      floorImageUrl={planMeta?.floorImageUrl}
                      pricingZones={pricingZones.length > 0 ? pricingZones : (planMeta?.pricingZones as PricingZone[]) || []}
                      activeTableId={activeTableId}
                      onSelectTable={setActiveTableId}
                      selectedSeats={selectedSeats}
                      onSelect={(tableId, seatIndex) => toggleSeat(tableId, seatIndex)}
                      zoneColorById={zoneColorById}
                      showZonePricing={zonePricing}
                      height={420}
                    />
                  )}

                  {/* Badges des places sélectionnées */}
                  {selectedSeatObjects.length > 0 && (
                    <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2">
                      <p className="text-xs font-bold text-foreground flex items-center justify-between">
                        <span>Places sélectionnées ({selectedSeatObjects.length})</span>
                        <span className="text-primary">{formatFc(totalFc)}</span>
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedSeatObjects.map((s, idx) => {
                          const zoneColor = s.pricingZoneId ? zoneColorById.get(s.pricingZoneId) : undefined;
                          return (
                            <span
                              key={`${s.tableId}-${s.seatIndex}`}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface border border-border text-xs font-medium text-foreground shadow-xs"
                            >
                              <span className="w-4 h-4 rounded-full bg-primary text-white text-[9px] font-black flex items-center justify-center">
                                {idx + 1}
                              </span>
                              <span>
                                {s.tableName} · Siège {s.seatIndex + 1}
                              </span>
                              {s.pricingZoneName && (
                                <span
                                  className="text-[10px] px-1 py-0.2 rounded font-semibold"
                                  style={{
                                    backgroundColor: zoneColor ? `${zoneColor}22` : undefined,
                                    color: zoneColor || undefined,
                                  }}
                                >
                                  {s.pricingZoneName}
                                </span>
                              )}
                              {zonePricing && s.priceFc > 0 && (
                                <span className="text-[10px] text-muted font-mono">
                                  {formatFc(s.priceFc)}
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => removeSeat(s.tableId, s.seatIndex)}
                                className="text-muted hover:text-rose-600 ml-1 p-1.5 -mr-1 rounded-md min-w-[36px] min-h-[36px] sm:min-w-[28px] sm:min-h-[28px] inline-flex items-center justify-center touch-manipulation active:scale-95 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                                title="Retirer ce siège"
                                aria-label={`Retirer le siège ${s.tableName} n°${s.seatIndex + 1}`}
                              >
                                <X className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                              </button>
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <details className="text-xs">
                    <summary className="cursor-pointer text-muted hover:text-foreground font-medium py-1">
                      Liste des places par table ({seats.filter((s) => s.available).length} disponibles)
                    </summary>
                    <div className="mt-2 max-h-40 overflow-y-auto space-y-2 pr-1">
                      {tables.map(([tableId, info]) => (
                        <div key={tableId} className="rounded border border-border p-2">
                          <p className="text-[11px] font-bold text-foreground mb-1.5">{info.name}</p>
                          <div className="flex flex-wrap gap-1.5">
                            {info.seats.map((s) => {
                              const active = selectedSeats.some(
                                (sel) => sel.tableId === s.tableId && sel.seatIndex === s.seatIndex,
                              );
                              const zoneColor = s.pricingZoneId ? zoneColorById.get(s.pricingZoneId) : undefined;
                              return (
                                <button
                                  key={`${s.tableId}-${s.seatIndex}`}
                                  type="button"
                                  disabled={!s.available}
                                  onClick={() => toggleSeat(s.tableId, s.seatIndex)}
                                  className={`min-w-[2.25rem] min-h-[2.25rem] px-2.5 py-1.5 rounded-lg text-xs font-bold border transition touch-manipulation active:scale-95 ${
                                    !s.available
                                      ? 'opacity-40 cursor-not-allowed border-border text-muted'
                                      : active
                                        ? 'bg-primary text-white border-primary shadow-xs'
                                        : 'border-border hover:border-primary text-foreground'
                                  }`}
                                  style={!active && zoneColor ? { borderColor: zoneColor } : undefined}
                                >
                                  {s.seatIndex + 1}
                                  {active && <Check className="w-2.5 h-2.5 inline-block ml-0.5" />}
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
            </div>
          ) : (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Nombre de billets</label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={quantity <= 1}
                  className="w-10 h-10 sm:w-9 sm:h-9 rounded-lg border border-border bg-surface text-foreground flex items-center justify-center hover:bg-surface-muted disabled:opacity-40 active:scale-95 transition touch-manipulation"
                  aria-label="Diminuer"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <div className="w-16 h-10 sm:h-9 rounded-lg border border-border bg-surface flex items-center justify-center font-bold text-sm text-foreground tabular-nums">
                  {quantity}
                </div>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.min(8, q + 1))}
                  disabled={quantity >= 8}
                  className="w-10 h-10 sm:w-9 sm:h-9 rounded-lg border border-border bg-surface text-foreground flex items-center justify-center hover:bg-surface-muted disabled:opacity-40 active:scale-95 transition touch-manipulation"
                  aria-label="Augmenter"
                >
                  <Plus className="w-4 h-4" />
                </button>
                <span className="text-xs text-muted">
                  {quantity > 1 ? `(${quantity} places)` : '(1 place)'}
                </span>
              </div>
            </div>
          )}

          {event.paid && (
            <PaymentAccountPicker
              method={paymentMethod}
              onMethodChange={setPaymentMethod}
              operator={operator}
              onOperatorChange={setOperator}
              phone={mmPhone}
              onPhoneChange={setMmPhone}
              amountFc={totalFc}
              amountHint="Montant du billet prélevé"
              currency={currency}
              onCurrencyChange={setCurrency}
            />
          )}
          <Button type="submit" loading={busy} fullWidth className="min-h-11">
            {event.paid ? 'Payer et réserver' : 'Confirmer l’inscription'}
          </Button>
        </form>
      )}
    </div>
  );
}
