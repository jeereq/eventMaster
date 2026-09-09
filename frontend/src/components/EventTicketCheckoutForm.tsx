'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Alert, Button, Input } from '@/components/ui';
import { formatFc } from '@/config/landingPricing';
import { Ticket, Plus, Minus, X, Check, Users, Loader2, Heart } from 'lucide-react';
import { cn } from '@/lib/cn';
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

const ZONE_COLOR_FALLBACK = 'var(--festive-accent)';

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

  const donationsConfig = event.donations;
  const hasDonations = Boolean(donationsConfig?.enabled);
  const [checkoutTab, setCheckoutTab] = useState<'ticket' | 'donation'>(
    hasDonations && !event.ticketingEnabled ? 'donation' : 'ticket',
  );

  const defaultDonationAmt = donationsConfig?.suggestedAmountsFc?.[0] || donationsConfig?.minAmountFc || 5000;
  const [donationAmountFc, setDonationAmountFc] = useState(String(defaultDonationAmt));
  const [isAnonymousDonation, setIsAnonymousDonation] = useState(false);
  const [donationNote, setDonationNote] = useState('');
  const effectiveDonationFc = Math.max(0, Number(donationAmountFc) || 0);

  const submitDonation = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const cleanBuyerName = isAnonymousDonation ? 'Donateur anonyme' : buyerName.trim();
      const cleanBuyerPhone = buyerPhone.trim().replace(/\s+/g, '');
      const rawMobilePhone = (mmPhone.trim() || buyerPhone.trim()).replace(/\s+/g, '').replace(/^\+/, '');
      const parsedAmount = Math.round(Number(donationAmountFc));
      const minAmount = donationsConfig?.minAmountFc ?? 1000;

      if (!isAnonymousDonation && !cleanBuyerName) {
        setError('Veuillez renseigner votre nom pour le reçu de don.');
        setBusy(false);
        return;
      }
      if (!cleanBuyerPhone) {
        setError('Veuillez renseigner votre numéro de téléphone ou WhatsApp.');
        setBusy(false);
        return;
      }
      if (!Number.isFinite(parsedAmount) || parsedAmount < minAmount) {
        setError(`Le montant minimum du don est de ${formatFc(minAmount)}.`);
        setBusy(false);
        return;
      }
      if (paymentMethod === 'mobile' && !rawMobilePhone) {
        setError('Indiquez un numéro Mobile Money valide (ex: 24389XXXXXXX).');
        setBusy(false);
        return;
      }

      const data = await api.post(`/public/events/${slug}/checkout`, {
        isDonation: true,
        donationAmountFc: parsedAmount,
        isAnonymous: isAnonymousDonation,
        donationNote: donationNote.trim() || undefined,
        buyerName: cleanBuyerName,
        buyerPhone: cleanBuyerPhone,
        paymentMethod,
        ...(paymentMethod === 'mobile'
          ? { phone: rawMobilePhone, operator, currency }
          : {}),
      });

      if (data.checkoutUrl) {
        if (data.orderId) {
          writePendingTicketPayment({
            orderId: data.orderId,
            slug,
            method: 'card',
            eventTitle: `Don : ${event.title}`,
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
          eventTitle: `Don : ${event.title}`,
        });
        setPendingOrder({ orderId: data.orderId, method });
        return;
      }
      const rsvp = data.rsvpUrl ? `&rsvp=${encodeURIComponent(data.rsvpUrl)}` : '';
      router.push(
        `${eventPublicHref(slug)}/succes?order=${data.orderId || ''}${rsvp}`,
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Impossible d’enregistrer le don.');
    } finally {
      setBusy(false);
    }
  };

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
    <div className="border border-border rounded-[var(--radius-card)] p-4 sm:p-5 bg-surface space-y-3.5">
      {/* Switcher Billets / Don si les deux sont disponibles */}
      {hasDonations && (event.ticketingEnabled || !event.paid) && (
        <div
          role="tablist"
          aria-label="Mode de contribution"
          className="grid grid-cols-2 p-1 bg-surface-muted rounded-xl border border-border gap-1"
        >
          <button
            type="button"
            role="tab"
            id="checkout-tab-ticket"
            aria-selected={checkoutTab === 'ticket'}
            aria-controls="checkout-panel-ticket"
            onClick={() => setCheckoutTab('ticket')}
            className={cn(
              'py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5',
              checkoutTab === 'ticket'
                ? 'bg-surface text-foreground shadow-2xs border border-border'
                : 'text-muted hover:text-foreground',
            )}
          >
            <Ticket className="w-3.5 h-3.5 text-primary" />
            <span>Billets & Accès</span>
          </button>
          <button
            type="button"
            role="tab"
            id="checkout-tab-donation"
            aria-selected={checkoutTab === 'donation'}
            aria-controls="checkout-panel-donation"
            onClick={() => setCheckoutTab('donation')}
            className={cn(
              'py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5',
              checkoutTab === 'donation'
                ? 'bg-surface text-rose-700 dark:text-rose-400 shadow-2xs border border-border'
                : 'text-muted hover:text-foreground',
            )}
          >
            <Heart className="w-3.5 h-3.5 fill-rose-500/20 text-rose-500" />
            <span>Faire un don libre</span>
          </button>
        </div>
      )}

      {/* Titre selon le tab actif */}
      {checkoutTab === 'donation' ? (
        <h2 className="text-sm font-semibold text-foreground inline-flex items-center gap-2">
          <Heart className="w-4 h-4 text-rose-500 fill-rose-500/20" />
          Faire un don solidaire à montant libre
        </h2>
      ) : (
        <h2 className="text-sm font-semibold text-foreground inline-flex items-center gap-2">
          <Ticket className="w-4 h-4" />
          {event.paid ? 'Acheter un billet' : 'S’inscrire'}
        </h2>
      )}

      {checkoutTab === 'ticket' && zonePricing && event.priceFromFc != null && (
        <p className="text-xs text-muted">
          Tarifs à partir de {formatFc(event.priceFromFc)}
          {pricingZones.length > 0 && (
            <span className="ml-1">
              ({pricingZones.map((z) => `${z.name} ${formatFc(z.priceFc)}`).join(' · ')})
            </span>
          )}
        </p>
      )}
      {checkoutTab === 'ticket' && programHint && (
        <p className="text-xs text-muted">Ambiance programme actuelle : {programHint}</p>
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
          <Alert variant="success">Paiement confirmé. Votre réservation est validée.</Alert>
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
      ) : showAuthChoice ? (
        <ClientAuthChoice
          nextPath={nextPath}
          description="Un compte est requis pour réserver une place ou effectuer un don. Après connexion, vous revenez à cette fiche."
        />
      ) : checkoutTab === 'donation' ? (
        <div
          id="checkout-panel-donation"
          role="tabpanel"
          aria-labelledby="checkout-tab-donation"
          className="space-y-4"
        >
          {/* Cause soutenue */}
          {donationsConfig?.cause && (
            <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-3 space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 block">
                Cause soutenue
              </span>
              <p className="text-xs text-foreground leading-relaxed">{donationsConfig.cause}</p>
            </div>
          )}

          {/* Jauge de collecte */}
          {donationsConfig && (
            <div className="rounded-xl border border-border bg-surface-muted/50 p-3.5 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-foreground flex items-center gap-1.5">
                  <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500/30" />
                  {formatFc(donationsConfig.collectedAmountFc || 0)} récoltés
                </span>
                {donationsConfig.targetAmountFc ? (
                  <span className="text-muted font-medium">
                    Objectif : {formatFc(donationsConfig.targetAmountFc)} (
                    {Math.min(
                      100,
                      Math.round(
                        ((donationsConfig.collectedAmountFc || 0) / donationsConfig.targetAmountFc) * 100,
                      ),
                    )}
                    %)
                  </span>
                ) : (
                  <span className="text-muted text-[11px]">
                    {donationsConfig.donorsCount || 0} donateur
                    {(donationsConfig.donorsCount || 0) > 1 ? 's' : ''}
                  </span>
                )}
              </div>

              {donationsConfig.targetAmountFc && (
                <div
                  role="progressbar"
                  aria-label="Progression de la collecte de dons"
                  aria-valuenow={donationsConfig.collectedAmountFc || 0}
                  aria-valuemin={0}
                  aria-valuemax={donationsConfig.targetAmountFc}
                  aria-valuetext={`${formatFc(donationsConfig.collectedAmountFc || 0)} récoltés sur un objectif de ${formatFc(donationsConfig.targetAmountFc)}`}
                  className="h-2 w-full bg-surface rounded-full overflow-hidden border border-border"
                >
                  <div
                    className="h-full bg-gradient-to-r from-rose-500 to-amber-500 transition-all duration-500 rounded-full"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.max(
                          4,
                          Math.round(
                            ((donationsConfig.collectedAmountFc || 0) /
                              donationsConfig.targetAmountFc) *
                              100,
                          ),
                        ),
                      )}%`,
                    }}
                  />
                </div>
              )}

              <div className="flex items-center justify-between text-[11px] text-muted">
                <span>
                  {donationsConfig.donorsCount || 0} donateur
                  {(donationsConfig.donorsCount || 0) > 1 ? 's' : ''} solidaire
                  {(donationsConfig.donorsCount || 0) > 1 ? 's' : ''}
                </span>
                {donationsConfig.targetAmountFc && (
                  <span>
                    {formatFc(
                      Math.max(
                        0,
                        donationsConfig.targetAmountFc - (donationsConfig.collectedAmountFc || 0),
                      ),
                    )}{' '}
                    restant
                  </span>
                )}
              </div>
            </div>
          )}

          <form onSubmit={submitDonation} className="space-y-3.5">
            {/* Montants suggérés */}
            {donationsConfig?.suggestedAmountsFc &&
              donationsConfig.suggestedAmountsFc.length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground block">
                    Suggestions rapides de montant
                  </label>
                  <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 gap-2">
                    {donationsConfig.suggestedAmountsFc.map((amt) => {
                      const active = Number(donationAmountFc) === amt;
                      return (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setDonationAmountFc(String(amt))}
                          className={cn(
                            'min-h-11 px-2.5 py-2 text-xs font-bold rounded-lg border transition flex items-center justify-center text-center touch-manipulation active:scale-95',
                            active
                              ? 'bg-rose-700 text-white border-rose-700 shadow-xs'
                              : 'bg-surface hover:bg-surface-muted text-foreground border-border',
                          )}
                        >
                          {formatFc(amt)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

            {/* Saisie montant libre */}
            <div className="space-y-1">
              <Input
                label={`Montant libre du don en FC (min ${formatFc(donationsConfig?.minAmountFc ?? 1000)})`}
                type="number"
                min={donationsConfig?.minAmountFc ?? 1000}
                step={500}
                value={donationAmountFc}
                onChange={(e) => setDonationAmountFc(e.target.value)}
                required
              />
              <p className="text-[11px] text-muted">
                Paiement direct sécurisé via Mobile Money (M-Pesa, Orange, Airtel, Afrimoney) ou Carte bancaire.
              </p>
            </div>

            {/* Identité donateur */}
            <div className="space-y-2 pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-xs">
                <input
                  type="checkbox"
                  checked={isAnonymousDonation}
                  onChange={(e) => setIsAnonymousDonation(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary/30 w-4 h-4"
                />
                <span className="font-medium text-foreground">
                  Faire ce don de manière anonyme (votre nom ne sera pas rendu public)
                </span>
              </label>

              {!isAnonymousDonation && (
                <Input
                  label="Nom complet pour le reçu"
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  required
                />
              )}

              <Input
                label="Numéro de téléphone ou WhatsApp (pour le reçu de paiement)"
                value={buyerPhone}
                onChange={(e) => setBuyerPhone(e.target.value)}
                required
              />

              <Input
                label="Message d’encouragement ou note (optionnel)"
                value={donationNote}
                onChange={(e) => setDonationNote(e.target.value)}
                placeholder="Un mot pour l'organisateur ou les bénéficiaires…"
              />
            </div>

            {/* Pass donateur */}
            {donationsConfig?.donorAttendancePass !== false && (
              <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 text-xs flex items-start gap-2 text-foreground">
                <Ticket className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">Pass d’accès invité inclus</span>
                  <span className="text-[11px] text-muted">
                    Votre don vous ouvre automatiquement un pass d&apos;accès invité « Donateur » avec badge QR pour entrer à l&apos;événement.
                  </span>
                </div>
              </div>
            )}

            {/* Paiement Mobile Money ou Carte */}
            <PaymentAccountPicker
              method={paymentMethod}
              onMethodChange={setPaymentMethod}
              operator={operator}
              onOperatorChange={setOperator}
              phone={mmPhone}
              onPhoneChange={setMmPhone}
              amountFc={effectiveDonationFc}
              amountHint="Montant du don à débiter"
              currency={currency}
              onCurrencyChange={setCurrency}
            />

            <Button type="submit" loading={busy} fullWidth className="min-h-11 bg-rose-700 hover:bg-rose-800 text-white font-bold">
              Confirmer et verser mon don de {formatFc(effectiveDonationFc)}
            </Button>
          </form>
        </div>
      ) : event.soldOut ? (
        <p className="text-sm text-muted">Plus de places disponibles pour la billetterie.</p>
      ) : (
        <form
          id="checkout-panel-ticket"
          role="tabpanel"
          aria-labelledby="checkout-tab-ticket"
          onSubmit={submit}
          className="space-y-3"
        >
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
                          style={{ backgroundColor: zone.color || ZONE_COLOR_FALLBACK }}
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
                  <p className="text-xs text-muted">
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
                      className="text-xs text-danger hover:underline font-semibold px-3 min-h-11 rounded-[var(--radius-button)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
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
                              <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-black flex items-center justify-center">
                                {idx + 1}
                              </span>
                              <span>
                                {s.tableName} · Siège {s.seatIndex + 1}
                              </span>
                              {s.pricingZoneName && (
                                <span
                                  className="text-xs px-1 py-0.2 rounded font-semibold"
                                  style={{
                                    backgroundColor: zoneColor ? `${zoneColor}22` : undefined,
                                    color: zoneColor || undefined,
                                  }}
                                >
                                  {s.pricingZoneName}
                                </span>
                              )}
                              {zonePricing && s.priceFc > 0 && (
                                <span className="text-xs text-muted font-mono tabular-nums">
                                  {formatFc(s.priceFc)}
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => removeSeat(s.tableId, s.seatIndex)}
                                className="text-muted hover:text-danger ml-1 rounded-md min-w-11 min-h-11 inline-flex items-center justify-center touch-manipulation active:scale-95 hover:bg-danger/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
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
                          <p className="text-xs font-bold text-foreground mb-1.5">{info.name}</p>
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
                                        ? 'bg-primary-solid text-primary-foreground border-primary-solid shadow-xs'
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
                  className="w-11 h-11 rounded-lg border border-border bg-surface text-foreground flex items-center justify-center hover:bg-surface-muted disabled:opacity-40 active:scale-95 transition touch-manipulation"
                  aria-label="Diminuer"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <div className="w-16 h-11 rounded-lg border border-border bg-surface flex items-center justify-center font-bold text-sm text-foreground tabular-nums">
                  {quantity}
                </div>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.min(8, q + 1))}
                  disabled={quantity >= 8}
                  className="w-11 h-11 rounded-lg border border-border bg-surface text-foreground flex items-center justify-center hover:bg-surface-muted disabled:opacity-40 active:scale-95 transition touch-manipulation"
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
