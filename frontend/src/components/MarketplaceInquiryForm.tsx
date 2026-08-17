'use client';

import React, { useState } from 'react';
import { api } from '@/lib/api';
import { Alert, Button, Input } from '@/components/ui';
import { Calendar, Send } from 'lucide-react';

export default function MarketplaceInquiryForm({
  endpoint,
  successCopy = 'Demande envoyée.',
}: {
  endpoint: string;
  successCopy?: string;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [guestCount, setGuestCount] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState('');
  const [formError, setFormError] = useState('');

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
        eventDate: eventDate || undefined,
        guestCount: guestCount || undefined,
        message,
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
    <form onSubmit={handleInquire} className="border border-border rounded-[var(--radius-card)] p-5 bg-surface space-y-3">
      <h2 className="text-sm font-semibold text-foreground">Demander un devis</h2>
      <p className="text-xs text-muted leading-relaxed">
        Le professionnel reçoit votre message par e-mail. Pour bloquer une date avec acompte, connectez-vous et
        utilisez Réserver (paiement hors plateforme).
      </p>
      {formError && <Alert variant="error">{formError}</Alert>}
      {sent && <Alert variant="success">{sent}</Alert>}
      <Input label="Votre nom" required value={name} onChange={(e) => setName(e.target.value)} />
      <Input label="E-mail" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      <Input label="Téléphone" value={phone} onChange={(e) => setPhone(e.target.value)} />
      <Input
        label="Date souhaitée"
        type="date"
        leftIcon={<Calendar className="w-4 h-4" />}
        value={eventDate}
        onChange={(e) => setEventDate(e.target.value)}
      />
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
          placeholder="Type d’événement, horaires, besoins…"
        />
      </label>
      <Button type="submit" loading={sending} leftIcon={<Send className="w-4 h-4" />} fullWidth>
        Envoyer la demande
      </Button>
    </form>
  );
}
