'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Bell, Loader2, Mail, MessageCircle, Save, Smartphone } from 'lucide-react';
import { api } from '@/lib/api';
import { Alert, Button, Card, CardHeader } from '@/components/ui';
import { NOTIFICATION_FAMILY_LABELS, type NotificationPrefFamily } from '@/config/platformNotifications';

type ChannelPreference = {
  email: boolean;
  whatsapp: boolean;
  push: boolean;
};

type PreferencesResponse = {
  hasPhone: boolean;
  families: Record<NotificationPrefFamily, ChannelPreference>;
};

const FAMILIES: NotificationPrefFamily[] = ['billing', 'commissions', 'catalog'];

const CHANNELS: Array<{ key: keyof ChannelPreference; label: string; icon: React.ReactNode }> = [
  { key: 'email', label: 'E-mail', icon: <Mail className="w-3.5 h-3.5" /> },
  { key: 'whatsapp', label: 'WhatsApp', icon: <MessageCircle className="w-3.5 h-3.5" /> },
  { key: 'push', label: 'Push', icon: <Smartphone className="w-3.5 h-3.5" /> },
];

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
      return {
        ...prev,
        families: {
          ...prev.families,
          [family]: {
            ...prev.families[family],
            [channel]: !prev.families[family][channel],
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
            <Bell className="w-4 h-4 text-primary" />
            Canaux d’alerte
          </span>
        }
        description="L’inbox in-app reste toujours active. E-mail, WhatsApp et push se règlent par famille."
        action={
          <Button size="sm" onClick={() => void save()} loading={saving} disabled={!data} leftIcon={<Save className="w-3.5 h-3.5" />}>
            Enregistrer
          </Button>
        }
      />

      {error && <Alert variant="error">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      {loading && !data ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </div>
      ) : data ? (
        <div className="space-y-4">
          {!data.hasPhone && (
            <p className="text-xs text-muted leading-relaxed">
              Ajoutez un numéro WhatsApp dans{' '}
              <Link href="/dashboard/profile" className="text-primary font-medium hover:underline">
                Mon profil
              </Link>{' '}
              pour recevoir les alertes WhatsApp.
            </p>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-muted">
                  <th className="pb-2 pr-3 font-semibold">Famille</th>
                  {CHANNELS.map((channel) => (
                    <th key={channel.key} className="pb-2 px-2 font-semibold">
                      <span className="inline-flex items-center gap-1">
                        {channel.icon}
                        {channel.label}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {FAMILIES.map((family) => (
                  <tr key={family} className="border-t border-border">
                    <td className="py-3 pr-3 font-medium text-foreground">{NOTIFICATION_FAMILY_LABELS[family]}</td>
                    {CHANNELS.map((channel) => {
                      const disabled = channel.key === 'whatsapp' && !data.hasPhone;
                      const checked = data.families[family][channel.key];
                      return (
                        <td key={channel.key} className="py-3 px-2">
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={disabled}
                            onChange={() => toggle(family, channel.key)}
                            className="rounded border-border"
                            aria-label={`${NOTIFICATION_FAMILY_LABELS[family]} — ${channel.label}`}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-muted">
            Les invitations invités (RSVP, PDF de table) restent sur le canal choisi pour l’événement — ce panneau ne les concerne pas.
          </p>
        </div>
      ) : null}
    </Card>
  );
}
