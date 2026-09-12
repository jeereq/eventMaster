'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Bell,
  Ticket,
  Heart,
  Users,
  Shield,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Lock,
  UserCheck,
  AlertTriangle,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { cn } from '@/lib/cn';

export type TenantNotificationRecipientMode = 'OWNER_ONLY' | 'OWNER_AND_MANAGERS' | 'CUSTOM';

export interface TenantNotificationSettings {
  ticketsEnabled: boolean;
  donationsEnabled: boolean;
  recipientMode: TenantNotificationRecipientMode;
  customUserIds: string[];
  includeEventStaff: boolean;
  notifyOnPaymentFailed: boolean;
}

interface TeamMemberItem {
  id: string;
  name: string | null;
  email: string;
  orgRole: string | null;
  isOwner?: boolean;
}

interface OrgNotificationSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (settings: TenantNotificationSettings) => void;
}

export default function OrgNotificationSettingsModal({
  isOpen,
  onClose,
  onSaved,
}: OrgNotificationSettingsModalProps) {
  const { user, access, tenant } = useAuth();
  const isOwner = Boolean(access?.isOwner) || (Boolean(user?.id) && user?.id === tenant?.managerId);

  const [settings, setSettings] = useState<TenantNotificationSettings>({
    ticketsEnabled: true,
    donationsEnabled: true,
    recipientMode: 'OWNER_AND_MANAGERS',
    customUserIds: [],
    includeEventStaff: true,
    notifyOnPaymentFailed: true,
  });

  const [members, setMembers] = useState<TeamMemberItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadData = useCallback(async () => {
    if (!isOpen) return;
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const [settingsRes, teamRes] = await Promise.all([
        api.get('/team/notification-settings'),
        api.get('/team'),
      ]);

      if (settingsRes?.settings) {
        setSettings(settingsRes.settings);
      }
      if (Array.isArray(teamRes?.members)) {
        setMembers(teamRes.members);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Impossible de charger les paramètres de notification.');
    } finally {
      setLoading(false);
    }
  }, [isOpen]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleToggleCustomUser = (userId: string) => {
    if (!isOwner) return;
    setSettings((prev) => {
      const exists = prev.customUserIds.includes(userId);
      const next = exists
        ? prev.customUserIds.filter((id) => id !== userId)
        : [...prev.customUserIds, userId];
      return { ...prev, customUserIds: next };
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOwner) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const res = await api.put('/team/notification-settings', settings);
      setSuccess(res.message || 'Paramètres enregistrés avec succès.');
      if (onSaved && res.settings) {
        onSaved(res.settings);
      }
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title="Alertes & Notifications Billetterie et Dons"
      description="Configurez les alertes d'encaissement et définissez précisément qui a le droit de les recevoir."
      size="lg"
    >
      <form onSubmit={handleSave} className="space-y-6">
        {error && (
          <div className="p-3.5 rounded-xl bg-danger/10 border border-danger/25 text-danger text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{success}</span>
          </div>
        )}

        {!isOwner && (
          <div className="p-3 rounded-xl bg-surface border border-border text-foreground text-xs flex items-center gap-2 shadow-2xs">
            <Lock className="w-4 h-4 shrink-0 text-muted" aria-hidden />
            <span className="text-muted">
              <strong className="text-foreground font-semibold">Mode consultation :</strong> seul le propriétaire de l’organisation peut modifier ces autorisations.
            </span>
          </div>
        )}

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-xs text-muted font-medium">Chargement des configurations...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Section 1 : Types de notifications activées */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-muted uppercase tracking-wider flex items-center gap-1.5">
                <Bell className="w-3.5 h-3.5 text-primary" />
                1. Types d&apos;alertes de paiement
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Billets */}
                <label
                  className={cn(
                    'p-3.5 rounded-2xl border flex items-start justify-between gap-3 cursor-pointer transition select-none',
                    settings.ticketsEnabled
                      ? 'bg-primary/5 border-primary/40 shadow-2xs'
                      : 'bg-surface border-border opacity-70'
                  )}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="p-1 rounded-md bg-primary/15 text-primary">
                        <Ticket className="w-3.5 h-3.5" />
                      </span>
                      <span className="text-sm font-bold text-foreground">Ventes de billets</span>
                    </div>
                    <p className="text-xs text-muted leading-relaxed">
                      Alerte dès qu&apos;un billet ou pass est payé via Mobile Money ou carte.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.ticketsEnabled}
                    disabled={!isOwner}
                    onChange={(e) =>
                      setSettings((prev) => ({ ...prev, ticketsEnabled: e.target.checked }))
                    }
                    className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary accent-primary"
                  />
                </label>

                {/* Dons */}
                <label
                  className={cn(
                    'p-3.5 rounded-2xl border flex items-start justify-between gap-3 cursor-pointer transition select-none',
                    settings.donationsEnabled
                      ? 'bg-rose-500/5 border-rose-500/40 shadow-2xs'
                      : 'bg-surface border-border opacity-70'
                  )}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="p-1 rounded-md bg-rose-500/15 text-rose-600 dark:text-rose-400">
                        <Heart className="w-3.5 h-3.5" />
                      </span>
                      <span className="text-sm font-bold text-foreground">Dons solidaires</span>
                    </div>
                    <p className="text-xs text-muted leading-relaxed">
                      Alerte avec montant, note de soutien et identité du donateur.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.donationsEnabled}
                    disabled={!isOwner}
                    onChange={(e) =>
                      setSettings((prev) => ({ ...prev, donationsEnabled: e.target.checked }))
                    }
                    className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary accent-primary"
                  />
                </label>
              </div>

              {/* Échecs de paiement */}
              <label
                className={cn(
                  'p-3 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition select-none',
                  settings.notifyOnPaymentFailed
                    ? 'bg-surface-muted/60 border-border'
                    : 'bg-surface border-border opacity-60'
                )}
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                  <span className="text-xs font-semibold text-foreground">
                    Alerter également en cas d’échec ou abandon de paiement Mobile Money
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.notifyOnPaymentFailed}
                  disabled={!isOwner}
                  onChange={(e) =>
                    setSettings((prev) => ({ ...prev, notifyOnPaymentFailed: e.target.checked }))
                  }
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary accent-primary"
                />
              </label>
            </div>

            {/* Section 2 : Qui a le droit de recevoir les notifications ? */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-muted uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-primary" />
                2. Destinataires autorisés
              </h3>

              <div className="space-y-2">
                {/* Option A : Propriétaire uniquement */}
                <label
                  className={cn(
                    'p-3.5 rounded-2xl border flex items-start gap-3 cursor-pointer transition',
                    settings.recipientMode === 'OWNER_ONLY'
                      ? 'bg-primary/5 border-primary shadow-2xs'
                      : 'bg-surface border-border hover:border-border/80'
                  )}
                >
                  <input
                    type="radio"
                    name="recipientMode"
                    value="OWNER_ONLY"
                    checked={settings.recipientMode === 'OWNER_ONLY'}
                    disabled={!isOwner}
                    onChange={() => setSettings((prev) => ({ ...prev, recipientMode: 'OWNER_ONLY' }))}
                    className="mt-1 h-4 w-4 border-border text-primary focus:ring-primary accent-primary"
                  />
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-foreground">
                        Propriétaire du compte uniquement (Direction)
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-surface-muted text-muted">
                        Confidentiel
                      </span>
                    </div>
                    <p className="text-xs text-muted">
                      Seul le titulaire principal reçoit les notifications relatives aux paiements et dons.
                    </p>
                  </div>
                </label>

                {/* Option B : Propriétaire + Tous les Managers */}
                <label
                  className={cn(
                    'p-3.5 rounded-2xl border flex items-start gap-3 cursor-pointer transition',
                    settings.recipientMode === 'OWNER_AND_MANAGERS'
                      ? 'bg-primary/5 border-primary shadow-2xs'
                      : 'bg-surface border-border hover:border-border/80'
                  )}
                >
                  <input
                    type="radio"
                    name="recipientMode"
                    value="OWNER_AND_MANAGERS"
                    checked={settings.recipientMode === 'OWNER_AND_MANAGERS'}
                    disabled={!isOwner}
                    onChange={() =>
                      setSettings((prev) => ({ ...prev, recipientMode: 'OWNER_AND_MANAGERS' }))
                    }
                    className="mt-1 h-4 w-4 border-border text-primary focus:ring-primary accent-primary"
                  />
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-foreground">
                        Propriétaire + Tous les Managers de l&apos;organisation
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-primary/10 text-primary">
                        Recommandé
                      </span>
                    </div>
                    <p className="text-xs text-muted">
                      Permet à tous les managers de suivre les encaissements en temps réel.
                    </p>
                  </div>
                </label>

                {/* Option C : Personnalisé */}
                <label
                  className={cn(
                    'p-3.5 rounded-2xl border flex items-start gap-3 cursor-pointer transition',
                    settings.recipientMode === 'CUSTOM'
                      ? 'bg-primary/5 border-primary shadow-2xs'
                      : 'bg-surface border-border hover:border-border/80'
                  )}
                >
                  <input
                    type="radio"
                    name="recipientMode"
                    value="CUSTOM"
                    checked={settings.recipientMode === 'CUSTOM'}
                    disabled={!isOwner}
                    onChange={() => setSettings((prev) => ({ ...prev, recipientMode: 'CUSTOM' }))}
                    className="mt-1 h-4 w-4 border-border text-primary focus:ring-primary accent-primary"
                  />
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-foreground">
                        Membres spécifiques sélectionnés
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                        Sur-mesure
                      </span>
                    </div>
                    <p className="text-xs text-muted">
                      Cochez nominativement les personnes de l&apos;équipe qui ont le droit de recevoir les notifications.
                    </p>
                  </div>
                </label>
              </div>

              {/* Liste de sélection si mode CUSTOM */}
              {settings.recipientMode === 'CUSTOM' && (
                <div className="mt-3 p-3.5 rounded-2xl border border-border bg-surface-muted/50 space-y-2.5 animate-in fade-in">
                  <p className="text-xs font-semibold text-foreground flex items-center justify-between">
                    <span>Sélectionnez les membres autorisés :</span>
                    <span className="text-[11px] text-muted">
                      {settings.customUserIds.length} sélectionné{settings.customUserIds.length > 1 ? 's' : ''}
                    </span>
                  </p>

                  <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1">
                    {members.length === 0 ? (
                      <p className="text-xs text-muted py-2 italic text-center">Aucun autre membre dans l&apos;équipe.</p>
                    ) : (
                      members.map((m) => {
                        const isSelected = settings.customUserIds.includes(m.id);
                        return (
                          <div
                            key={m.id}
                            onClick={() => handleToggleCustomUser(m.id)}
                            className={cn(
                              'p-2.5 rounded-xl border flex items-center justify-between gap-2 cursor-pointer transition text-xs',
                              isSelected
                                ? 'bg-primary/10 border-primary/30 text-foreground font-medium'
                                : 'bg-surface border-border text-muted hover:border-border/80'
                            )}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-7 h-7 rounded-full bg-surface-muted border border-border flex items-center justify-center font-bold text-[10px] text-foreground shrink-0">
                                {m.name ? m.name.charAt(0).toUpperCase() : m.email.charAt(0).toUpperCase()}
                              </div>
                              <div className="truncate">
                                <p className="font-bold text-foreground truncate">{m.name || m.email}</p>
                                <p className="text-[10px] text-muted truncate">{m.email} · {m.orgRole || 'Membre'}</p>
                              </div>
                            </div>

                            <input
                              type="checkbox"
                              checked={isSelected}
                              disabled={!isOwner}
                              onChange={() => {}} // géré par le parent div onClick
                              className="h-4 w-4 rounded border-border text-primary focus:ring-primary accent-primary"
                            />
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Section 3 : Équipe dédiée à l'événement */}
            <div className="space-y-2 pt-2 border-t border-border">
              <label
                className={cn(
                  'p-3 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition select-none',
                  settings.includeEventStaff
                    ? 'bg-primary/5 border-primary/30'
                    : 'bg-surface border-border opacity-70'
                )}
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-primary" />
                    <span className="text-xs font-bold text-foreground">
                      Inclure également l’équipe assignée à l’événement (Staff Jour J)
                    </span>
                  </div>
                  <p className="text-[11px] text-muted">
                    Notifie automatiquement les collaborateurs affectés spécifiquement à cet événement.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.includeEventStaff}
                  disabled={!isOwner}
                  onChange={(e) =>
                    setSettings((prev) => ({ ...prev, includeEventStaff: e.target.checked }))
                  }
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary accent-primary"
                />
              </label>
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
            Fermer
          </Button>
          {isOwner && (
            <Button
              type="submit"
              variant="primary"
              disabled={loading || saving}
              leftIcon={saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            >
              {saving ? 'Enregistrement...' : 'Enregistrer les autorisations'}
            </Button>
          )}
        </div>
      </form>
    </Modal>
  );
}
