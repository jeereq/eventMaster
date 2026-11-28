'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import {
  QrCode, ScanLine, XCircle, MessageSquare, Loader2, UserCheck, Armchair,
  Search, ClipboardList, ChevronRight, Maximize2, X,
} from '@/components/icons';
import { Button, StatusPill } from '@/components/ui';
import UserAvatar from '@/components/UserAvatar';
import StatFilters from '@/components/events/StatFilters';
import { CARD_SHADOW } from '@/components/dashboard/KpiCard';
import PlanLimitCallout from '@/components/PlanLimitCallout';
import { cn } from '@/lib/cn';
import QrCameraScanner, { QrCameraToggle } from '@/components/QrCameraScanner';
import { eventDashboardHref } from '@/lib/eventRoutes';
import OverlayLayer from '@/components/ui/OverlayLayer';

interface ProtocolGuest {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  rsvp: string;
  category?: string | null;
  checkedInAt?: string | null;
  seatVerified?: boolean;
  assignedSeat?: { tableId: string; tableName: string; seatIndex: number } | null;
  protocolNotes?: Array<{ id: string; content: string; createdAt: string; user?: { name: string | null } }>;
}

type ListFilter = 'expected' | 'in' | 'pending' | 'all';

const PANEL = cn('rounded-[20px] bg-surface', CARD_SHADOW);
const FIELD =
  'w-full min-h-11 rounded-xl border border-border bg-surface px-3 text-base sm:text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30';

/** Un seul état par invité : l’arrivée l’emporte sur la réponse. */
function guestState(guest: ProtocolGuest): { label: string; tone: 'emerald' | 'sky' | 'amber' | 'rose' } {
  if (guest.checkedInAt) return { label: 'Arrivé', tone: 'emerald' };
  if (guest.rsvp === 'ACCEPTED') return { label: 'Attendu', tone: 'sky' };
  if (guest.rsvp === 'DECLINED') return { label: 'Décliné', tone: 'rose' };
  return { label: 'Sans réponse', tone: 'amber' };
}

export default function GuestProtocolPanel({ eventId }: { eventId: string }) {
  const { planFeatures } = useAuth();
  const [guests, setGuests] = useState<ProtocolGuest[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanInput, setScanInput] = useState('');
  /** Le scanner (caméra et saisie du code) ne s’ouvre qu’à la demande. */
  const [scanning, setScanning] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [selectedGuest, setSelectedGuest] = useState<ProtocolGuest | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [query, setQuery] = useState('');
  const [listFilter, setListFilter] = useState<ListFilter>('expected');
  const [justCheckedIn, setJustCheckedIn] = useState(false);
  const [isKioskMode, setIsKioskMode] = useState(false);
  const selectedRef = useRef<HTMLDivElement>(null);

  const loadGuests = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get(`/events/${eventId}/protocol/guests`);
      setGuests(data);
    } catch {
      setMessage({ type: 'error', text: 'Impossible de charger les invités protocole.' });
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    loadGuests();
  }, [loadGuests]);

  const matchesFilter = (g: ProtocolGuest, filter: ListFilter) => {
    if (filter === 'expected') return !g.checkedInAt && g.rsvp === 'ACCEPTED';
    if (filter === 'in') return Boolean(g.checkedInAt);
    if (filter === 'pending') return !g.checkedInAt && g.rsvp === 'PENDING';
    return true;
  };
  const countOf = (filter: ListFilter) => guests.filter((g) => matchesFilter(g, filter)).length;

  const filteredGuests = useMemo(() => {
    const q = query.trim().toLowerCase();
    return guests.filter((g) => {
      // Une recherche par nom porte sur toute la liste.
      if (!q) return matchesFilter(g, listFilter);
      const hay = `${g.firstName} ${g.lastName} ${g.email || ''} ${g.phone || ''} ${g.category || ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [guests, query, listFilter]);

  const resolvePayload = useCallback(async (payload: string, fromCamera = false) => {
    const trimmed = payload.trim();
    if (!trimmed) return;

    setBusy(true);
    setMessage(null);
    setJustCheckedIn(false);
    if (fromCamera) setCameraActive(false);

    try {
      const data = await api.post(`/events/${eventId}/protocol/scan`, { payload: trimmed });
      setSelectedGuest(data.guest);
      setScanInput('');
      setMessage({
        type: 'success',
        text: `Invité identifié : ${data.guest.firstName} ${data.guest.lastName}`,
      });
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.data?.error || 'Scan invalide.' });
      if (fromCamera) setCameraActive(true);
    } finally {
      setBusy(false);
    }
  }, [eventId]);

  const handleScan = () => resolvePayload(scanInput);

  const handleCameraScan = useCallback((payload: string) => {
    resolvePayload(payload, true);
  }, [resolvePayload]);

  const resetToScan = useCallback(() => {
    setSelectedGuest(null);
    setJustCheckedIn(false);
    setNote('');
    setCameraActive(scanning);
  }, [scanning]);

  const handleCheckIn = async (guestId: string) => {
    setBusy(true);
    setMessage(null);
    try {
      const data = await api.post(`/events/${eventId}/guests/${guestId}/check-in`, {});
      setMessage({ type: 'success', text: data.message as string });
      setJustCheckedIn(true);
      await loadGuests();
      if (selectedGuest?.id === guestId) {
        setSelectedGuest({ ...selectedGuest, checkedInAt: new Date().toISOString() });
      }
      window.setTimeout(() => resetToScan(), 2200);
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.data?.error || 'Confirmation de présence impossible.' });
    } finally {
      setBusy(false);
    }
  };

  const handleVerifySeat = async (guestId: string) => {
    setBusy(true);
    setMessage(null);
    try {
      const data = await api.post(`/events/${eventId}/guests/${guestId}/verify-seat`, {});
      setMessage({ type: data.seatMatch ? 'success' : 'error', text: data.message as string });
      await loadGuests();
      if (selectedGuest?.id === guestId) {
        setSelectedGuest({ ...selectedGuest, seatVerified: data.seatMatch });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.data?.error || 'Vérification impossible.' });
    } finally {
      setBusy(false);
    }
  };

  const handleAddNote = async (guestId: string) => {
    if (!note.trim()) return;
    setBusy(true);
    try {
      await api.post(`/events/${eventId}/guests/${guestId}/protocol-notes`, { content: note.trim() });
      setNote('');
      setMessage({ type: 'success', text: 'Commentaire enregistré.' });
      await loadGuests();
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.data?.error || 'Erreur commentaire.' });
    } finally {
      setBusy(false);
    }
  };

  if (planFeatures && !planFeatures.protocolQr) {
    return <PlanLimitCallout feature="protocolQr" />;
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const kioskClasses = isKioskMode 
    ? "fixed inset-0 bg-background/95 overflow-y-auto p-4 sm:p-8 flex flex-col xl:flex-row gap-6 animate-fade-in items-start" 
    : "space-y-5";

  const content = (
    <>
      {isKioskMode && (
        <button 
          onClick={() => setIsKioskMode(false)}
          className="absolute top-4 right-4 p-2 text-muted hover:text-foreground bg-surface border border-border rounded-full shadow-sm z-50 transition"
          title="Quitter le mode Kiosk"
        >
          <XCircle className="w-6 h-6" />
        </button>
      )}

      <div className={cn('space-y-4', isKioskMode && 'w-full xl:w-96 shrink-0 xl:sticky xl:top-8')}>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button
            type="button"
            onClick={() => {
              const next = !scanning;
              setScanning(next);
              setCameraActive(next);
              setMessage(null);
            }}
            aria-expanded={scanning}
            leftIcon={scanning ? <X className="w-4 h-4" /> : <ScanLine className="w-4 h-4" />}
            className="rounded-full px-5"
          >
            {scanning ? 'Fermer le scanner' : 'Scanner un badge'}
          </Button>
          <Link
            href={eventDashboardHref(eventId, { tab: 'tasks', protocol: true })}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-border bg-surface px-4 text-sm font-semibold transition hover:border-primary/40"
          >
            <ClipboardList className="w-4 h-4" />
            Tâches
          </Link>
          {!isKioskMode && (
            <button
              type="button"
              onClick={() => setIsKioskMode(true)}
              aria-label="Plein écran"
              title="Plein écran"
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-border bg-surface transition hover:border-primary/40"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          )}
        </div>
        <StatFilters
          label="Filtrer les invités"
          value={listFilter}
          onChange={(next) => {
            setListFilter(next);
            setQuery('');
          }}
          options={[
            { id: 'expected', label: 'Attendus', count: countOf('expected') },
            { id: 'in', label: 'Arrivés', count: countOf('in') },
            { id: 'pending', label: 'Sans réponse', count: countOf('pending') },
            { id: 'all', label: 'Tous', count: guests.length },
          ]}
          className={isKioskMode ? 'xl:[&>div]:grid-cols-2' : undefined}
        />
      </div>

      <div className={cn("flex-1 min-w-0 space-y-4", isKioskMode && "w-full max-w-2xl mx-auto")}>
        {scanning ? (
          <div className={cn(PANEL, 'space-y-4 p-4 sm:p-5')}>
            <QrCameraToggle
              cameraActive={cameraActive}
              onToggle={() => setCameraActive((v) => !v)}
            />
            {cameraActive && (
              <QrCameraScanner
                active={cameraActive}
                onScan={handleCameraScan}
                onError={(text) => setMessage({ type: 'error', text })}
              />
            )}
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                value={scanInput}
                onChange={(e) => setScanInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleScan()}
                aria-label="Code ou lien du badge"
                placeholder="Code ou lien du badge"
                className={cn(FIELD, 'flex-1')}
              />
              <Button
                variant="secondary"
                onClick={handleScan}
                disabled={busy || !scanInput.trim()}
              >
                <QrCode className="w-4 h-4" />
                Identifier
              </Button>
            </div>
          </div>
        ) : null}

        {message && (
          <p role="status" className={cn(PANEL, 'px-4 py-3 text-sm font-medium', message.type === 'success' ? 'text-emerald-600' : 'text-rose-600')}>
            {message.text}
          </p>
        )}

      {selectedGuest && (
        <div
          ref={selectedRef}
          className={cn(
            'border rounded-[20px] p-4 sm:p-5 space-y-4',
            justCheckedIn
              ? 'bg-emerald-50 border-emerald-200'
              : 'bg-primary/10 border-primary/20',
          )}
        >
          {justCheckedIn && (
            <p className="text-xs font-semibold text-emerald-700">
              Arrivée confirmée
            </p>
          )}
          <div>
            <h4 className="font-display font-semibold text-xl text-foreground">
              {selectedGuest.firstName} {selectedGuest.lastName}
            </h4>
            <p className="text-sm text-muted mt-0.5">
              {selectedGuest.email}
              {selectedGuest.phone ? ` · ${selectedGuest.phone}` : ''}
            </p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              <StatusPill tone={guestState(selectedGuest).tone}>{guestState(selectedGuest).label}</StatusPill>
              {selectedGuest.category && (
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full border border-border bg-surface">
                  {selectedGuest.category}
                </span>
              )}
            </div>
            {selectedGuest.rsvp !== 'ACCEPTED' && !selectedGuest.checkedInAt && (
              <p className="text-xs text-muted mt-3 bg-surface-muted border border-border rounded-[var(--radius-button)] px-3 py-2">
                {selectedGuest.rsvp === 'PENDING'
                  ? 'Sans réponse : l’invité doit confirmer sur son lien avant d’entrer.'
                  : selectedGuest.rsvp === 'DECLINED'
                    ? 'Invitation déclinée : entrée impossible.'
                    : 'Présence non confirmée : entrée impossible.'}
              </p>
            )}
            {selectedGuest.assignedSeat && (
              <p className="text-sm text-primary mt-2 font-medium">
                Table {selectedGuest.assignedSeat.tableName} · siège n°{selectedGuest.assignedSeat.seatIndex + 1}
              </p>
            )}
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              className="sm:flex-1"
              onClick={() => handleCheckIn(selectedGuest.id)}
              disabled={busy || !!selectedGuest.checkedInAt || selectedGuest.rsvp !== 'ACCEPTED'}
            >
              <UserCheck className="w-4 h-4" />
              {selectedGuest.checkedInAt
                ? 'Déjà arrivé'
                : selectedGuest.rsvp !== 'ACCEPTED'
                  ? 'Entrée bloquée'
                  : 'Valider l’arrivée'}
            </Button>
            <Button variant="secondary" onClick={() => handleVerifySeat(selectedGuest.id)} disabled={busy}>
              <Armchair className="w-4 h-4" />
              Siège
            </Button>
            <Button variant="ghost" onClick={resetToScan} disabled={busy}>
              Invité suivant
            </Button>
          </div>
          <div className="flex gap-2">
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddNote(selectedGuest.id)}
              placeholder="Note (VIP, +1, incident…)"
              className="flex-1 px-3 py-2 rounded-[var(--radius-button)] border border-border bg-surface text-sm"
            />
            <Button size="sm" variant="secondary" onClick={() => handleAddNote(selectedGuest.id)} disabled={busy}>
              <MessageSquare className="w-4 h-4" />
              Noter
            </Button>
          </div>
          {selectedGuest.protocolNotes && selectedGuest.protocolNotes.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-primary/20">
              <p className="text-xs font-semibold text-primary">Notes récentes</p>
              {selectedGuest.protocolNotes.map((n) => (
                <div key={n.id} className="text-sm bg-surface/60 rounded-lg px-3 py-2">
                  <span className="font-semibold text-foreground">{n.user?.name || 'Protocole'}</span>
                  <span className="text-muted text-xs ml-2">
                    {new Date(n.createdAt).toLocaleString('fr-FR')}
                  </span>
                  <p className="text-muted mt-0.5">{n.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className={cn(PANEL, 'overflow-hidden')}>
        <div className="relative p-3 sm:p-4">
          <Search className="w-4 h-4 text-muted absolute left-6 sm:left-7 top-1/2 -translate-y-1/2" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Rechercher un invité"
            placeholder="Nom, e-mail ou téléphone"
            className={cn(FIELD, 'pl-10')}
          />
        </div>
        <ul className="divide-y divide-border border-t border-border">
          {filteredGuests.length === 0 ? (
            <li className="px-5 py-8 text-center text-sm text-muted">
              {guests.length === 0 ? 'Votre liste d’invités est encore vide.' : 'Aucun invité ici.'}
            </li>
          ) : (
            filteredGuests.map((g) => {
              const state = guestState(g);
              const name = `${g.firstName} ${g.lastName}`;
              return (
                <li key={g.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedGuest(g);
                      setJustCheckedIn(false);
                      setCameraActive(false);
                      setMessage(null);
                      window.setTimeout(() => selectedRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 60);
                    }}
                    className={cn(
                      'flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-surface-muted',
                      selectedGuest?.id === g.id && 'bg-primary/5',
                    )}
                  >
                    <UserAvatar name={name} size="lg" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-semibold text-foreground">{name}</span>
                      <span className="block truncate text-[13px] text-muted">
                        {g.assignedSeat
                          ? `${g.assignedSeat.tableName} · siège ${g.assignedSeat.seatIndex + 1}`
                          : 'Sans place'}
                      </span>
                    </span>
                    {g.seatVerified && <Armchair className="w-4 h-4 shrink-0 text-primary" aria-label="Siège vérifié" />}
                    <StatusPill tone={state.tone} className="shrink-0">{state.label}</StatusPill>
                    <ChevronRight className="w-4 h-4 shrink-0 text-muted" aria-hidden />
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </div>
      </div>
    </>
  );

  // Mode kiosque : rendu dans <body>, au-dessus du header et de la barre latérale.
  if (isKioskMode) return <OverlayLayer className={kioskClasses}>{content}</OverlayLayer>;
  return <div className={kioskClasses}>{content}</div>;
}
