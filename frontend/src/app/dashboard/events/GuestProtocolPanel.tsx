'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import {
  QrCode, ScanLine, CheckCircle2, XCircle, MessageSquare, Loader2, UserCheck, Armchair,
  Search, Users,
} from 'lucide-react';
import { Button } from '@/components/ui';
import { cn } from '@/lib/cn';
import QrCameraScanner, { QrCameraToggle } from '@/components/QrCameraScanner';

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

type ListFilter = 'queue' | 'in' | 'all';

function rsvpLabel(rsvp: string) {
  if (rsvp === 'ACCEPTED') return 'Confirmé';
  if (rsvp === 'DECLINED') return 'Décliné';
  if (rsvp === 'PENDING') return 'En attente';
  return rsvp;
}

export default function GuestProtocolPanel({ eventId }: { eventId: string }) {
  const { planFeatures, tenant } = useAuth();
  const [guests, setGuests] = useState<ProtocolGuest[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanInput, setScanInput] = useState('');
  const [cameraActive, setCameraActive] = useState(true);
  const [selectedGuest, setSelectedGuest] = useState<ProtocolGuest | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [query, setQuery] = useState('');
  const [listFilter, setListFilter] = useState<ListFilter>('queue');
  const [justCheckedIn, setJustCheckedIn] = useState(false);

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

  const checkedInCount = guests.filter((g) => g.checkedInAt).length;
  const acceptedCount = guests.filter((g) => g.rsvp === 'ACCEPTED').length;

  const filteredGuests = useMemo(() => {
    const q = query.trim().toLowerCase();
    return guests.filter((g) => {
      if (listFilter === 'queue' && g.checkedInAt) return false;
      if (listFilter === 'in' && !g.checkedInAt) return false;
      if (!q) return true;
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
    setCameraActive(true);
  }, []);

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
    return (
      <div className="rounded-[var(--radius-card)] border border-amber-200 bg-amber-50 p-6 text-center space-y-3">
        <QrCode className="w-10 h-10 text-amber-600 mx-auto" />
        <h3 className="font-bold text-amber-900">Protocole QR non inclus</h3>
        <p className="text-sm text-amber-800">
          Le scan QR et la confirmation de présence nécessitent le forfait{' '}
          <strong>Business</strong> ou supérieur. Forfait actuel : {tenant?.plan || 'FREE'}.
        </p>
        <Link href="/dashboard/billing" className="inline-block text-sm font-bold text-primary hover:underline">
          Voir les forfaits →
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-[var(--radius-card)] border border-border bg-surface p-4 sm:p-5 space-y-1">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">Parcours jour J</p>
        <h3 className="font-semibold text-foreground text-base">1. Scanner · 2. Confirmer · 3. Invité suivant</h3>
        <p className="text-xs text-muted leading-relaxed">
          Présentez le badge QR. Après confirmation, le scanner se relance automatiquement.
        </p>
        <div className="grid grid-cols-3 gap-2 pt-3">
          <div className="rounded-[var(--radius-button)] bg-surface-muted border border-border px-3 py-2 text-center">
            <p className="text-lg font-semibold text-foreground tabular-nums">{checkedInCount}</p>
            <p className="text-[10px] text-muted font-medium">Entrés</p>
          </div>
          <div className="rounded-[var(--radius-button)] bg-surface-muted border border-border px-3 py-2 text-center">
            <p className="text-lg font-semibold text-foreground tabular-nums">{Math.max(0, acceptedCount - checkedInCount)}</p>
            <p className="text-[10px] text-muted font-medium">À accueillir</p>
          </div>
          <div className="rounded-[var(--radius-button)] bg-surface-muted border border-border px-3 py-2 text-center">
            <p className="text-lg font-semibold text-foreground tabular-nums">{guests.length}</p>
            <p className="text-[10px] text-muted font-medium">Invités</p>
          </div>
        </div>
      </div>

      <div className="bg-surface border border-border rounded-[var(--radius-card)] p-5 space-y-4">
        <h3 className="font-semibold text-foreground flex items-center gap-2 text-sm">
          <ScanLine className="w-4 h-4 text-primary" />
          Scanner un badge
        </h3>

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

        <div className="relative">
          <div className="absolute inset-0 flex items-center" aria-hidden>
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-surface px-2 text-muted font-semibold tracking-wider">
              ou recherche / saisie
            </span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <input
            value={scanInput}
            onChange={(e) => setScanInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleScan()}
            placeholder="URL RSVP, ID, ou code du badge"
            className="flex-1 px-4 py-2.5 rounded-[var(--radius-button)] border border-border bg-surface-muted text-sm"
          />
          <Button onClick={handleScan} disabled={busy || !scanInput.trim()}>
            <QrCode className="w-4 h-4" />
            Identifier
          </Button>
        </div>

        {message && (
          <p className={`text-sm font-medium ${message.type === 'success' ? 'text-emerald-600' : 'text-rose-600'}`}>
            {message.text}
          </p>
        )}
      </div>

      {selectedGuest && (
        <div
          className={cn(
            'border rounded-[var(--radius-card)] p-5 space-y-4',
            justCheckedIn
              ? 'bg-emerald-50 border-emerald-200'
              : 'bg-primary/10 border-primary/20',
          )}
        >
          {justCheckedIn && (
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
              Entrée confirmée — prochain invité dans un instant
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
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border border-border bg-surface">
                RSVP {rsvpLabel(selectedGuest.rsvp)}
              </span>
              {selectedGuest.category && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border border-border bg-surface">
                  {selectedGuest.category}
                </span>
              )}
              {selectedGuest.checkedInAt && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-600 text-white">
                  Authentifié
                </span>
              )}
            </div>
            {selectedGuest.rsvp !== 'ACCEPTED' && !selectedGuest.checkedInAt && (
              <p className="text-xs text-amber-800 mt-3 bg-amber-50 border border-amber-100 rounded-[var(--radius-button)] px-3 py-2">
                {selectedGuest.rsvp === 'PENDING'
                  ? 'RSVP en attente : l’invité doit confirmer sur son lien avant le check-in.'
                  : selectedGuest.rsvp === 'DECLINED'
                    ? 'Invitation déclinée — le check-in n’est pas possible.'
                    : 'RSVP non accepté — check-in impossible.'}
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
                ? 'Déjà authentifié'
                : selectedGuest.rsvp !== 'ACCEPTED'
                  ? 'Check-in bloqué (RSVP)'
                  : 'Confirmer la présence'}
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
              <p className="text-xs font-bold uppercase text-primary">Notes récentes</p>
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

      <div className="bg-surface border border-border rounded-[var(--radius-card)] overflow-hidden">
        <div className="px-4 py-3 border-b border-border space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
              <Users className="w-4 h-4 text-muted" />
              File d’accueil
            </h3>
            <span className="text-xs text-muted tabular-nums">
              {checkedInCount}/{guests.length} entrés
            </span>
          </div>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher par nom, e-mail ou téléphone"
              className="w-full pl-9 pr-3 py-2 rounded-[var(--radius-button)] border border-border bg-surface-muted text-sm"
            />
          </div>
          <div className="flex gap-1.5">
            {([
              { id: 'queue' as const, label: 'À entrer' },
              { id: 'in' as const, label: 'Entrés' },
              { id: 'all' as const, label: 'Tous' },
            ]).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setListFilter(opt.id)}
                className={cn(
                  'px-2.5 py-1 rounded-full text-[11px] font-semibold border transition',
                  listFilter === opt.id
                    ? 'bg-primary text-white border-primary'
                    : 'border-border text-muted hover:text-foreground',
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <div className="divide-y divide-border max-h-[420px] overflow-y-auto">
          {filteredGuests.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-muted">
              {guests.length === 0 ? 'Votre liste d\'invités est encore vide.' : 'Aucun résultat pour cette recherche.'}
            </p>
          ) : (
            filteredGuests.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => {
                  setSelectedGuest(g);
                  setJustCheckedIn(false);
                  setCameraActive(false);
                }}
                className={cn(
                  'w-full text-left px-5 py-3 hover:bg-surface-muted transition flex items-center justify-between gap-3',
                  selectedGuest?.id === g.id && 'bg-primary/5',
                )}
              >
                <div>
                  <p className="font-semibold text-sm text-foreground">{g.firstName} {g.lastName}</p>
                  <p className="text-xs text-muted">{g.phone || g.email}</p>
                  {g.assignedSeat && (
                    <p className="text-[10px] text-primary mt-0.5">
                      {g.assignedSeat.tableName} · siège {g.assignedSeat.seatIndex + 1}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {g.checkedInAt ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" aria-label="Authentifié" />
                  ) : (
                    <XCircle className="w-4 h-4 text-foreground/80" aria-label="Non authentifié" />
                  )}
                  {g.seatVerified && <Armchair className="w-4 h-4 text-primary" aria-label="Siège vérifié" />}
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
