'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';
import { Bell, BellRing } from '@/components/icons';
import { GuestPortalCard } from '@/components/GuestPortalShell';
import { NotificationSwitch } from '@/components/EventNotificationSettingsFields';
import { DEFAULT_GUEST_NOTIFICATION_PREFS, type GuestNotificationPrefs } from '@/lib/eventNotifications';

function hasEmail(value?: string | null) {
  return Boolean(value && /.+@.+\..+/.test(value));
}

function hasPhone(value?: string | null) {
  return Boolean(value && value.replace(/\D/g, '').length >= 8);
}

/**
 * L’invité active (ou coupe) les nouvelles de l’événement : à chaque publication
 * de l’organisateur, un e-mail et / ou un WhatsApp, selon les canaux choisis.
 */
export default function GuestEventNotificationsCard({
  guestId,
  eventTitle,
  initialPrefs,
  email,
  phone,
}: {
  guestId: string;
  eventTitle: string;
  initialPrefs?: GuestNotificationPrefs | null;
  email?: string | null;
  phone?: string | null;
}) {
  const [prefs, setPrefs] = useState<GuestNotificationPrefs>(initialPrefs ?? DEFAULT_GUEST_NOTIFICATION_PREFS);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const canEmail = hasEmail(email);
  const canWhatsApp = hasPhone(phone);

  const save = async (patch: Partial<GuestNotificationPrefs>) => {
    const previous = prefs;
    const optimistic = { ...prefs, ...patch };
    setPrefs(optimistic);
    setSaving(true);
    setError('');
    try {
      const res = await api.put(`/rsvp/${guestId}/notifications`, {
        enabled: optimistic.enabled,
        email: optimistic.email,
        whatsapp: optimistic.whatsapp,
      });
      if (res?.notificationPrefs) setPrefs(res.notificationPrefs as GuestNotificationPrefs);
    } catch (err) {
      setPrefs(previous);
      setError(err instanceof Error && err.message ? err.message : 'Impossible d’enregistrer pour le moment.');
    } finally {
      setSaving(false);
    }
  };

  const channelChip = (key: 'email' | 'whatsapp', label: string, available: boolean) => {
    const on = prefs[key] && available;
    return (
      <button
        type="button"
        role="switch"
        aria-checked={on}
        disabled={!available || saving}
        onClick={() => save({ [key]: !prefs[key] })}
        title={available ? undefined : key === 'email' ? 'Aucune adresse e-mail sur votre invitation' : 'Aucun numéro sur votre invitation'}
        className={cn(
          'inline-flex min-h-11 items-center gap-2 rounded-full border px-3.5 text-xs font-semibold transition touch-manipulation',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
          'disabled:cursor-not-allowed disabled:opacity-45',
          on ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-surface text-muted',
        )}
      >
        <span className={cn('h-2 w-2 rounded-full', on ? 'bg-primary' : 'bg-border')} aria-hidden />
        {label}
      </button>
    );
  };

  return (
    <GuestPortalCard padding="sm" className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="em-guest-icon">
          {prefs.enabled ? <BellRing className="h-5 w-5" aria-hidden /> : <Bell className="h-5 w-5" aria-hidden />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">Notifications de l’événement</p>
          <p className="text-xs text-muted">
            {prefs.enabled
              ? `Vous recevez les nouvelles de « ${eventTitle} ».`
              : 'Recevez les annonces et photos publiées par l’organisateur.'}
          </p>
        </div>
        <NotificationSwitch
          checked={prefs.enabled}
          label="Activer les notifications de l’événement"
          disabled={saving || (!canEmail && !canWhatsApp)}
          onChange={(next) => save({ enabled: next })}
        />
      </div>
      {prefs.enabled ? (
        <div className="flex flex-wrap items-center gap-2" aria-label="Canaux de notification">
          {channelChip('email', 'E-mail', canEmail)}
          {channelChip('whatsapp', 'WhatsApp', canWhatsApp)}
        </div>
      ) : null}
      {!canEmail && !canWhatsApp ? (
        <p className="text-xs text-muted">Ajoutez un e-mail ou un numéro à votre invitation pour recevoir les notifications.</p>
      ) : null}
      {error ? (
        <p className="text-xs font-semibold text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}
    </GuestPortalCard>
  );
}
