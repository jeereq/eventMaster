'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Bell, Loader2, Mail, MessageCircle, Save, Smartphone } from 'lucide-react';
import { api } from '@/lib/api';
import { Alert, Button, Card, CardHeader } from '@/components/ui';
import { cn } from '@/lib/cn';
import {
  NOTIFICATION_FAMILY_DESCRIPTIONS,
  NOTIFICATION_FAMILY_LABELS,
  NOTIFICATION_PREF_FAMILIES,
  type NotificationPrefFamily,
} from '@/config/platformNotifications';

type ChannelPreference = {
  email: boolean;
  whatsapp: boolean;
  push: boolean;
};

type PreferencesResponse = {
  hasPhone: boolean;
  families: Record<NotificationPrefFamily, ChannelPreference>;
};

const CHANNELS: Array<{ key: keyof ChannelPreference; label: string; icon: React.ReactNode }> = [
  { key: 'email', label: 'E-mail', icon: <Mail className="w-3.5 h-3.5" aria-hidden /> },
  { key: 'whatsapp', label: 'WhatsApp', icon: <MessageCircle className="w-3.5 h-3.5" aria-hidden /> },
  { key: 'push', label: 'Push', icon: <Smartphone className="w-3.5 h-3.5" aria-hidden /> },
];

function defaultChannels(hasPhone: boolean): ChannelPreference {
  return { email: true, whatsapp: hasPhone, push: true };
}

function familyChannels(data: PreferencesResponse, family: NotificationPrefFamily): ChannelPreference {
  return data.families[family] ?? defaultChannels(data.hasPhone);
}

export default function NotificationPreferencesCard() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [data, setData] = useState<PreferencesResponse | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await api.get('/notifications/preferences');
      setData(result);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Impossible de charger les préférences.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const toggle = (family: NotificationPrefFamily, channel: keyof ChannelPreference) => {
    setData((prev) => {
      if (!prev) return prev;
      if (channel === 'whatsapp' && !prev.hasPhone) return prev;
      setSuccess('');
      const current = familyChannels(prev, family);
      return {
        ...prev,
        families: {
          ...prev.families,
          [family]: {
            ...current,
            [channel]: !current[channel],
          },
        },
      };
    });
  };

  const save = async () => {
    if (!data) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const result = await api.put('/notifications/preferences', { families: data.families });
      setData(result);
      setSuccess('Préférences enregistrées.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Enregistrement impossible.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader
        title={
          <span className="inline-flex items-center gap-2">
            <Bell className="w-4 h-4 text-primary" aria-hidden />
            Canaux d’alerte
          </span>
        }
        description="L’inbox du tableau de bord reste toujours active. Choisissez, pour chaque famille, si e-mail, WhatsApp et push vous suivent."
        action={
          <Button
            size="sm"
            className="hidden sm:inline-flex"
            onClick={() => void save()}
            loading={saving}
            disabled={!data}
            leftIcon={<Save className="w-3.5 h-3.5" />}
          >
            Enregistrer
          </Button>
        }
      />

      {error && <Alert variant="error">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      {loading && !data ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-primary" aria-hidden />
          <span className="sr-only">Chargement des préférences</span>
        </div>
      ) : data ? (
        <div className="space-y-4">
          {!data.hasPhone && (
            <p className="text-sm text-muted leading-relaxed">
              Ajoutez un numéro WhatsApp dans{' '}
              <Link href="/dashboard/profile" className="text-primary font-medium hover:underline">
                Mon profil
              </Link>{' '}
              pour recevoir les alertes WhatsApp.
            </p>
          )}

          <ul className="space-y-3">
            {NOTIFICATION_PREF_FAMILIES.map((family) => {
              const channels = familyChannels(data, family);
              return (
                <li
                  key={family}
                  className="rounded-[var(--radius-card)] border border-border bg-surface-muted/40 p-3.5 sm:p-4 space-y-3"
                >
                  <div>
                    <p className="text-sm font-semibold text-foreground">{NOTIFICATION_FAMILY_LABELS[family]}</p>
                    <p className="text-xs text-muted leading-relaxed mt-0.5">
                      {NOTIFICATION_FAMILY_DESCRIPTIONS[family]}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2" role="group" aria-label={`Canaux ${NOTIFICATION_FAMILY_LABELS[family]}`}>
                    {CHANNELS.map((channel) => {
                      const disabled = channel.key === 'whatsapp' && !data.hasPhone;
                      const checked = channels[channel.key];
                      return (
                        <button
                          key={channel.key}
                          type="button"
                          role="switch"
                          aria-checked={checked}
                          disabled={disabled}
                          onClick={() => toggle(family, channel.key)}
                          className={cn(
                            'inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-button)] border px-3 text-xs font-semibold transition',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                            'disabled:opacity-50 disabled:cursor-not-allowed',
                            checked
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-surface text-foreground border-border hover:bg-card-hover',
                          )}
                        >
                          {channel.icon}
                          {channel.label}
                          <span className="sr-only">{checked ? 'activé' : 'désactivé'}</span>
                        </button>
                      );
                    })}
                  </div>
                </li>
              );
            })}
          </ul>

          <Button
            className="sm:hidden"
            fullWidth
            onClick={() => void save()}
            loading={saving}
            disabled={!data}
            leftIcon={<Save className="w-3.5 h-3.5" />}
          >
            Enregistrer les canaux
          </Button>

          <p className="text-xs text-muted leading-relaxed">
            Les messages envoyés aux invités (invitation, RSVP, PDF de table) restent sur le canal choisi pour
            l’événement — ce panneau ne les concerne pas.
          </p>
        </div>
      ) : null}
    </Card>
  );
}
