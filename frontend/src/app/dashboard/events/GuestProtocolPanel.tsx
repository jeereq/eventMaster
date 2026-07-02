'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import {
  QrCode, ScanLine, CheckCircle2, XCircle, MessageSquare, Loader2, UserCheck, Armchair,
} from 'lucide-react';
import { Button } from '@/components/ui';
import QrCameraScanner, { QrCameraToggle } from '@/components/QrCameraScanner';

interface ProtocolGuest {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  rsvp: string;
  checkedInAt?: string | null;
  seatVerified?: boolean;
  assignedSeat?: { tableId: string; tableName: string; seatIndex: number } | null;
  protocolNotes?: Array<{ id: string; content: string; createdAt: string; user?: { name: string | null } }>;
}

export default function GuestProtocolPanel({ eventId }: { eventId: string }) {
  const [guests, setGuests] = useState<ProtocolGuest[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanInput, setScanInput] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const [selectedGuest, setSelectedGuest] = useState<ProtocolGuest | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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

  const resolvePayload = useCallback(async (payload: string, fromCamera = false) => {
    const trimmed = payload.trim();
    if (!trimmed) return;

    setBusy(true);
    setMessage(null);
    if (fromCamera) setCameraActive(false);

    try {
      const data = await api.post(`/events/${eventId}/protocol/scan`, { payload: trimmed });
      setSelectedGuest(data.guest);
      setScanInput(trimmed);
      setMessage({
        type: 'success',
        text: `Invité identifié : ${data.guest.firstName} ${data.guest.lastName}`,
      });
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.data?.error || 'Scan invalide.' });
    } finally {
      setBusy(false);
    }
  }, [eventId]);

  const handleScan = () => resolvePayload(scanInput);

  const handleCameraScan = useCallback((payload: string) => {
    resolvePayload(payload, true);
  }, [resolvePayload]);

  const handleCheckIn = async (guestId: string) => {
    setBusy(true);
    setMessage(null);
    try {
      const data = await api.post(`/events/${eventId}/guests/${guestId}/check-in`, {});
      setMessage({ type: 'success', text: data.message });
      await loadGuests();
      if (selectedGuest?.id === guestId) {
        setSelectedGuest({ ...selectedGuest, checkedInAt: new Date().toISOString() });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.data?.error || 'Émargement impossible.' });
    } finally {
      setBusy(false);
    }
  };

  const handleVerifySeat = async (guestId: string) => {
    setBusy(true);
    setMessage(null);
    try {
      const data = await api.post(`/events/${eventId}/guests/${guestId}/verify-seat`, {});
      const notif = data.notification as { sent?: boolean; channels?: string[] } | undefined;
      let text = data.message as string;
      if (data.seatMatch && notif?.sent && notif.channels?.length) {
        text += ` L'invité a été notifié par ${notif.channels.join(', ')}.`;
      }
      setMessage({ type: data.seatMatch ? 'success' : 'error', text });
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

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4">
        <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <ScanLine className="w-5 h-5 text-indigo-600" />
          Scanner QR / identifier un invité
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
            <div className="w-full border-t border-slate-200 dark:border-slate-700" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white dark:bg-slate-900 px-2 text-slate-400 font-semibold tracking-wider">
              ou saisie manuelle
            </span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <input
            value={scanInput}
            onChange={(e) => setScanInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleScan()}
            placeholder="Coller l'URL RSVP ou l'ID invité du QR code"
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm"
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
        <div className="bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 rounded-2xl p-5 space-y-4">
          <div>
            <h4 className="font-bold text-lg text-slate-900 dark:text-white">
              {selectedGuest.firstName} {selectedGuest.lastName}
            </h4>
            <p className="text-sm text-slate-500">{selectedGuest.email}</p>
            <p className="text-xs text-slate-400 mt-1">
              RSVP : {selectedGuest.rsvp === 'ACCEPTED' ? 'Confirmé' : selectedGuest.rsvp}
            </p>
            {selectedGuest.assignedSeat && (
              <p className="text-sm text-indigo-700 dark:text-indigo-300 mt-1">
                Siège assigné : {selectedGuest.assignedSeat.tableName} — n°{selectedGuest.assignedSeat.seatIndex + 1}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => handleCheckIn(selectedGuest.id)} disabled={busy || !!selectedGuest.checkedInAt}>
              <UserCheck className="w-4 h-4" />
              {selectedGuest.checkedInAt ? 'Déjà authentifié' : 'Authentifier (émargement)'}
            </Button>
            <Button size="sm" variant="secondary" onClick={() => handleVerifySeat(selectedGuest.id)} disabled={busy}>
              <Armchair className="w-4 h-4" />
              Vérifier le siège
            </Button>
            {!cameraActive && (
              <Button size="sm" variant="ghost" onClick={() => setCameraActive(true)} disabled={busy}>
                <ScanLine className="w-4 h-4" />
                Rescanner
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddNote(selectedGuest.id)}
              placeholder="Commentaire protocole…"
              className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
            />
            <Button size="sm" variant="secondary" onClick={() => handleAddNote(selectedGuest.id)} disabled={busy}>
              <MessageSquare className="w-4 h-4" />
              Commenter
            </Button>
          </div>
          {selectedGuest.protocolNotes && selectedGuest.protocolNotes.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-indigo-100 dark:border-indigo-900/40">
              <p className="text-xs font-bold uppercase text-indigo-400">Commentaires récents</p>
              {selectedGuest.protocolNotes.map((n) => (
                <div key={n.id} className="text-sm bg-white/60 dark:bg-slate-900/40 rounded-lg px-3 py-2">
                  <span className="font-semibold text-slate-700 dark:text-slate-200">{n.user?.name || 'Protocole'}</span>
                  <span className="text-slate-400 text-xs ml-2">
                    {new Date(n.createdAt).toLocaleString('fr-FR')}
                  </span>
                  <p className="text-slate-600 dark:text-slate-300 mt-0.5">{n.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 dark:text-white">Invités — suivi protocole</h3>
          <span className="text-xs text-slate-400">
            {guests.filter((g) => g.checkedInAt).length}/{guests.length} authentifiés
          </span>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[420px] overflow-y-auto">
          {guests.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-slate-400">Aucun invité pour cet événement.</p>
          ) : (
            guests.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => setSelectedGuest(g)}
                className={`w-full text-left px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition flex items-center justify-between gap-3 ${
                  selectedGuest?.id === g.id ? 'bg-indigo-50/50 dark:bg-indigo-950/20' : ''
                }`}
              >
                <div>
                  <p className="font-semibold text-sm text-slate-800 dark:text-slate-100">{g.firstName} {g.lastName}</p>
                  <p className="text-xs text-slate-500">{g.email}</p>
                  {g.assignedSeat && (
                    <p className="text-[10px] text-indigo-500 mt-0.5">
                      {g.assignedSeat.tableName} · siège {g.assignedSeat.seatIndex + 1}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {g.checkedInAt ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" aria-label="Authentifié" />
                  ) : (
                    <XCircle className="w-4 h-4 text-slate-300" aria-label="Non authentifié" />
                  )}
                  {g.seatVerified && <Armchair className="w-4 h-4 text-indigo-500" aria-label="Siège vérifié" />}
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
