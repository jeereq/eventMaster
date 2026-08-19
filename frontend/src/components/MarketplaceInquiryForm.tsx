'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Alert, Button, Input } from '@/components/ui';
import { LISTING_EVENT_TYPES } from '@/lib/listingDetails';
import ClientAuthChoice from '@/components/ClientAuthChoice';
import { clientLoginHref, clientRegisterHref } from '@/lib/safeAppPath';
import { Calendar, Send } from 'lucide-react';

export default function MarketplaceInquiryForm({
  endpoint,
  successCopy = 'Demande envoyée.',
  eventDate,
  onEventDateChange,
  defaultGuestCount,
  defaultMessage,
}: {
  endpoint: string;
  successCopy?: string;
  eventDate?: string;
  onEventDateChange?: (value: string) => void;
  defaultGuestCount?: number | string;
  defaultMessage?: string;
}) {
  const pathname = usePathname();
  const { user, token, loading: authLoading } = useAuth();
  const nextPath = pathname || '/marketplace';
  const [guestCheckout, setGuestCheckout] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [internalDate, setInternalDate] = useState(eventDate || '');
  const [eventEndDate, setEventEndDate] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [eventType, setEventType] = useState('');
  const [budget, setBudget] = useState('');
  const [guestCount, setGuestCount] = useState(
    defaultGuestCount != null && String(defaultGuestCount) ? String(defaultGuestCount) : '',
  );
  const [message, setMessage] = useState(defaultMessage || '');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState('');
  const [formError, setFormError] = useState('');
  const selectedDate = onEventDateChange ? (eventDate ?? internalDate) : internalDate;
  const setSelectedDate = onEventDateChange ?? setInternalDate;
  const showAuthChoice = !authLoading && !token && !guestCheckout;

  useEffect(() => {
    if (!user) return;
    setName((prev) => prev || user.name || '');
    setEmail((prev) => prev || user.email || '');
    setPhone((prev) => prev || user.phone || '');
    setGuestCheckout(false);
  }, [user]);

  const composedMessage = () => {
    const extras = [
      eventType ? `Type d’événement : ${LISTING_EVENT_TYPES.find((item) => item.id === eventType)?.label || eventType}` : '',
      selectedDate ? `Date de début : ${selectedDate}` : '',
      eventEndDate ? `Date de fin : ${eventEndDate}` : '',
      eventTime ? `Heure : ${eventTime}` : '',
      budget ? `Budget indicatif : ${budget} FC` : '',
      guestCount ? `Invités estimés : ${guestCount}` : '',
    ].filter(Boolean);
    return extras.length ? `${message.trim()}\n\n—\n${extras.join('\n')}` : message.trim();
  };

  const handleInquire = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSent('');
    setSending(true);
    try {
      const data = await api.post(endpoint, {
        name,
        email,
        phone: phone || undefined,
        eventDate: selectedDate || undefined,
        guestCount: guestCount || undefined,
        message: composedMessage(),
      });
      setSent(data.message || successCopy);
      setMessage('');
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Envoi impossible.');
    } finally {
      setSending(false);
    }
  };

  return (
    <form onSubmit={handleInquire} className="border border-border rounded-[var(--radius-card)] p-4 sm:p-5 bg-surface space-y-3">
      <h2 className="text-sm font-semibold text-foreground">Demander un devis</h2>
      {showAuthChoice ? (
        <ClientAuthChoice
          nextPath={nextPath}
          description="Connectez-vous pour envoyer un devis et suivre vos demandes, ou continuez en invité."
          onGuest={() => setGuestCheckout(true)}
        />
      ) : (
        <>
          <p className="text-xs text-muted leading-relaxed">
            Le professionnel reçoit votre message par e-mail. Pour bloquer une date avec acompte, connectez-vous et
            utilisez Réserver (paiement hors plateforme).
          </p>
          {token && user && (
            <p className="text-[11px] text-muted">
              Connecté en tant que {user.name || user.email}. Après envoi, suivez la demande dans{' '}
              <Link href="/dashboard/bookings?tab=quotes" className="font-semibold text-primary hover:underline">
                Devis & réservations
              </Link>
              .
            </p>
          )}
          {!token && (
            <p className="text-[11px] text-muted">
              Demande invité.{' '}
              <Link href={clientLoginHref(nextPath)} className="font-semibold text-primary hover:underline">Se connecter</Link>
              {' · '}
              <Link href={clientRegisterHref(nextPath)} className="font-semibold text-primary hover:underline">Créer un compte</Link>
            </p>
          )}
          {formError && <Alert variant="error">{formError}</Alert>}
          {sent && <Alert variant="success">{sent}</Alert>}
          <Input label="Votre nom" required value={name} onChange={(e) => setName(e.target.value)} />
          <Input label="E-mail" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input label="Téléphone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-muted">Type d’événement</span>
            <select
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
              className="w-full px-3 py-2 rounded-[var(--radius-button)] border border-border bg-surface-muted text-sm"
            >
              <option value="">À préciser</option>
              {LISTING_EVENT_TYPES.map((item) => (
                <option key={item.id} value={item.id}>{item.label}</option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Date de début"
              type="date"
              leftIcon={<Calendar className="w-4 h-4" />}
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
            <Input
              label="Date de fin"
              type="date"
              value={eventEndDate}
              min={selectedDate || undefined}
              onChange={(e) => setEventEndDate(e.target.value)}
            />
            <Input
              label="Heure souhaitée"
              type="time"
              value={eventTime}
              onChange={(e) => setEventTime(e.target.value)}
            />
            <Input
              label="Budget indicatif (FC)"
              type="number"
              min={0}
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
            />
          </div>
          {selectedDate && (
            <p className="text-[11px] text-muted">
              Alignée sur le calendrier : {new Date(`${selectedDate}T12:00:00`).toLocaleDateString('fr-FR')}
              {eventEndDate ? ` → ${new Date(`${eventEndDate}T12:00:00`).toLocaleDateString('fr-FR')}` : ''}
            </p>
          )}
          <Input
            label="Nombre d’invités (estimé)"
            type="number"
            min={1}
            value={guestCount}
            onChange={(e) => setGuestCount(e.target.value)}
          />
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-muted">Message</span>
            <textarea
              required
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full px-3 py-2 rounded-[var(--radius-button)] border border-border bg-surface-muted text-sm"
              placeholder="Besoins, style, contraintes, questions…"
            />
          </label>
          <Button type="submit" loading={sending} leftIcon={<Send className="w-4 h-4" />} fullWidth className="min-h-11">
            Envoyer la demande
          </Button>
        </>
      )}
    </form>
  );
}
