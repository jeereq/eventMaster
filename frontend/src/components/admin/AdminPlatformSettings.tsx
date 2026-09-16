'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import {
  Check, Globe, Loader2, Mail, MapPin, MessageSquare, Percent, ShieldAlert, Volume2, Wallet, X, Heart, Sparkles, Wand2, Building2, Eye, EyeOff,
} from 'lucide-react';
import { Button, Modal } from '@/components/ui';
import { cn } from '@/lib/cn';
import {
  DEFAULT_ENABLED_CITIES,
  MARKETPLACE_GPS_CITIES,
  PLATFORM_CITY_CATALOG,
} from '@/lib/platformCities';
import {
  DEFAULT_WELCOME_AI_GRANTS,
  WELCOME_GRANT_KEYS,
  WELCOME_GRANT_LABELS,
  WELCOME_MOMENT_LABELS,
  WELCOME_MOMENTS_BY_KEY,
  sanitizeWelcomeAiGrants,
  type WelcomeGrantKey,
  type WelcomeGrantMoment,
  type WelcomeGrantUnit,
} from '@/lib/welcomeAiGrants';
import {
  AUDIO_NOTIFICATION_FAMILIES,
  AUDIO_NOTIFICATION_PRESETS,
  AUDIO_PRESET_LABELS,
  DEFAULT_AUDIO_NOTIFICATIONS,
  playAudioNotificationPreset,
  sanitizeAudioNotifications,
  type AudioNotificationFamily,
  type AudioNotificationPreset,
} from '@/lib/audioNotifications';

import {
  DEFAULT_DONATIONS_ACCESS,
  type DonationsAccess,
  type DonationAccessMode,
} from '@/lib/donationsAccess';

export type AdminPlatformSettingsValues = Record<string, unknown> & {
  platformName?: string;
  platformTagline?: string;
  brandPrimary?: string;
  brandAccent?: string;
  maintenanceMode?: boolean;
  maintenanceMessage?: string;
  allowRegistration?: boolean;
  onlinePaymentsEnabled?: boolean;
  saasPaymentMode?: string;
  flexPayCardToken?: string;
  flexPayCardMerchant?: string;
  marketplaceCommissionRate?: number;
  marketplaceDepositRate?: number;
  commercialFirstCommissionRate?: number;
  commercialRenewalCommissionRate?: number;
  usdExchangeRateCdf?: number;
  aiTokenPriceCdf?: number;
  aiTokenMinPurchaseCdf?: number;
  welcomeAiGrants?: typeof DEFAULT_WELCOME_AI_GRANTS;
  enabledCities?: string[];
  authOtpChannels?: 'EMAIL' | 'WHATSAPP' | 'BOTH';
  supportEmail?: string;
  supportWhatsApp?: string;
  supportPhone?: string;
  whatsappNote?: string;
  addressLine1?: string;
  addressLine2?: string;
  addressShort?: string;
  supportHours?: string;
  ultramsgInstanceId?: string;
  ultramsgToken?: string;
  sendgridApiKey?: string;
  sendgridFrom?: string;
  twilioAccountSid?: string;
  twilioAuthToken?: string;
  twilioPhoneNumber?: string;
  audioNotifications?: typeof DEFAULT_AUDIO_NOTIFICATIONS;
  studioVisibility?: {
    budget?: boolean;
    invite?: boolean;
    room?: boolean;
  };
  aiStudioModels?: {
    invitationModel?: string;
    roomPlanModel?: string;
  };
  subscriptionDiscountAccess?: {
    enabled?: boolean;
    periodStart?: string | null;
    periodEnd?: string | null;
    tenantIds?: string[];
  };
  donationsAccess?: DonationsAccess;
};

type SettingsSectionId =
  | 'identity'
  | 'access'
  | 'studios'
  | 'payments'
  | 'marketplace'
  | 'cities'
  | 'contact'
  | 'messaging'
  | 'audio';

const SECTIONS: Array<{ id: SettingsSectionId; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'identity', label: 'Identité', icon: Globe },
  { id: 'access', label: 'Accès', icon: ShieldAlert },
  { id: 'studios', label: 'Studios IA', icon: Sparkles },
  { id: 'payments', label: 'Paiements', icon: Wallet },
  { id: 'marketplace', label: 'Marketplace', icon: Wallet },
  { id: 'cities', label: 'Villes', icon: MapPin },
  { id: 'contact', label: 'Contact', icon: Mail },
  { id: 'messaging', label: 'Messagerie', icon: MessageSquare },
  { id: 'audio', label: 'Sons', icon: Volume2 },
];

const fieldClass =
  'w-full px-4 py-2.5 bg-surface border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition';
const labelClass = 'text-xs font-bold text-muted uppercase tracking-wider';
const sectionCardClass = 'bg-surface-muted border border-border rounded-[var(--radius-card)] p-3.5 sm:p-5 space-y-4';

function SectionTitle({
  icon: Icon,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 border-b border-border pb-3">
      <Icon className="w-4 h-4 text-primary" />
      {children}
    </h3>
  );
}

export default function AdminPlatformSettings({
  value,
  onChange,
  onSave,
  saving,
}: {
  value: AdminPlatformSettingsValues;
  onChange: (next: AdminPlatformSettingsValues) => void;
  onSave: (e: React.FormEvent) => void | Promise<void>;
  saving: boolean;
}) {
  const [section, setSection] = useState<SettingsSectionId>('identity');
  const [maintenanceConfirmOpen, setMaintenanceConfirmOpen] = useState(false);
  const [pendingMaintenance, setPendingMaintenance] = useState(false);

  const enabledCities = useMemo(() => {
    return Array.isArray(value.enabledCities) && value.enabledCities.length > 0
      ? value.enabledCities
      : [...DEFAULT_ENABLED_CITIES];
  }, [value.enabledCities]);

  const patch = (partial: Partial<AdminPlatformSettingsValues>) => {
    onChange({ ...value, ...partial });
  };

  const requestMaintenanceToggle = (checked: boolean) => {
    if (checked && !value.maintenanceMode) {
      setPendingMaintenance(true);
      setMaintenanceConfirmOpen(true);
      return;
    }
    patch({ maintenanceMode: checked });
  };

  const confirmMaintenance = () => {
    patch({ maintenanceMode: pendingMaintenance });
    setMaintenanceConfirmOpen(false);
  };

  const toggleCity = (cityName: string) => {
    const selected = enabledCities.includes(cityName);
    const next = selected
      ? enabledCities.filter((item) => item !== cityName)
      : [...enabledCities, cityName];
    patch({ enabledCities: next.length > 0 ? next : [cityName] });
  };

  return (
    <>
      <form
        onSubmit={(e) => {
          void onSave(e);
        }}
        className="space-y-6 animate-in fade-in duration-200"
      >
        <nav
          className="flex gap-1.5 p-1 rounded-xl border border-border bg-surface-muted/50 overflow-x-auto [scrollbar-width:none] shrink-0"
          aria-label="Sections des réglages plateforme"
        >
          {SECTIONS.map((item) => {
            const Icon = item.icon;
            const active = section === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSection(item.id)}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3 py-2 text-xs sm:text-sm font-medium transition whitespace-nowrap shrink-0',
                  active
                    ? 'bg-surface text-foreground shadow-[var(--shadow-soft)]'
                    : 'text-muted hover:bg-surface/70 hover:text-foreground',
                )}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                {item.label}
              </button>
            );
          })}
        </nav>

        {section === 'identity' && (
          <div className={sectionCardClass}>
            <SectionTitle icon={Globe}>Identité de la plateforme</SectionTitle>
            <p className="text-xs text-muted -mt-2">
              Ces valeurs alimentent la landing, le contact, le footer, les e-mails et les inscriptions.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className={labelClass}>Nom de la plateforme</label>
                <input
                  type="text"
                  value={value.platformName || ''}
                  onChange={(e) => patch({ platformName: e.target.value })}
                  className={cn(fieldClass, 'font-medium')}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className={labelClass}>Accroche (hero)</label>
                <input
                  type="text"
                  value={value.platformTagline || ''}
                  onChange={(e) => patch({ platformTagline: e.target.value })}
                  className={fieldClass}
                  placeholder="Organisez vos événements…"
                />
              </div>
              <div className="space-y-1.5">
                <label className={labelClass}>Couleur primaire (hex)</label>
                <input
                  type="text"
                  value={value.brandPrimary || ''}
                  onChange={(e) => patch({ brandPrimary: e.target.value })}
                  className={cn(fieldClass, 'font-mono')}
                  placeholder="#059669"
                />
              </div>
              <div className="space-y-1.5">
                <label className={labelClass}>Couleur accent (hex)</label>
                <input
                  type="text"
                  value={value.brandAccent || ''}
                  onChange={(e) => patch({ brandAccent: e.target.value })}
                  className={cn(fieldClass, 'font-mono')}
                  placeholder="#10b981"
                />
              </div>
            </div>
          </div>
        )}

        {section === 'access' && (
          <div className={sectionCardClass}>
            <SectionTitle icon={ShieldAlert}>Accès critique</SectionTitle>
            <p className="text-xs text-muted -mt-2">
              Maintenance et inscriptions. L’activation du mode maintenance demande une confirmation.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex items-center gap-3 cursor-pointer bg-surface p-4 border border-border rounded-xl hover:bg-surface-muted/50 transition">
                <input
                  type="checkbox"
                  checked={Boolean(value.maintenanceMode)}
                  onChange={(e) => requestMaintenanceToggle(e.target.checked)}
                  className="w-4.5 h-4.5 text-primary border-border rounded focus:ring-primary"
                />
                <div>
                  <span className="text-sm font-bold text-foreground block">Mode maintenance</span>
                  <span className="text-xs text-muted font-medium">
                    Bloque l&apos;API (sauf Super Admin, login, réponse à l’invitation, site public).
                  </span>
                </div>
              </label>
              <label className="flex items-center gap-3 cursor-pointer bg-surface p-4 border border-border rounded-xl hover:bg-surface-muted/50 transition">
                <input
                  type="checkbox"
                  checked={value.allowRegistration !== false}
                  onChange={(e) => patch({ allowRegistration: e.target.checked })}
                  className="w-4.5 h-4.5 text-primary border-border rounded focus:ring-primary"
                />
                <div>
                  <span className="text-sm font-bold text-foreground block">Inscriptions ouvertes</span>
                  <span className="text-xs text-muted font-medium">
                    Autorise la création de nouvelles organisations.
                  </span>
                </div>
              </label>
            </div>
            {value.maintenanceMode && (
              <div className="space-y-1.5">
                <label className={labelClass}>Message de maintenance</label>
                <textarea
                  value={value.maintenanceMessage || ''}
                  onChange={(e) => patch({ maintenanceMessage: e.target.value })}
                  rows={2}
                  className={cn(fieldClass, 'resize-none')}
                />
              </div>
            )}
            <div className="space-y-2 pt-2 border-t border-border">
              <label className={labelClass}>Authentification OTP</label>
              <p className="text-[11px] text-muted">
                Canal pour les codes d’inscription, validation de compte et réinitialisation de mot de passe.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {(
                  [
                    { id: 'EMAIL' as const, label: 'E-mail', hint: 'SendGrid uniquement' },
                    { id: 'WHATSAPP' as const, label: 'WhatsApp', hint: 'UltraMsg uniquement' },
                    { id: 'BOTH' as const, label: 'Les deux', hint: 'L’utilisateur choisit' },
                  ] as const
                ).map((opt) => {
                  const active = (value.authOtpChannels || 'BOTH') === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => patch({ authOtpChannels: opt.id })}
                      className={cn(
                        'min-h-11 px-3 py-2.5 rounded-xl border text-left transition',
                        active
                          ? 'bg-primary/10 border-primary/40 text-foreground'
                          : 'bg-surface border-border text-muted hover:text-foreground',
                      )}
                    >
                      <span className="block text-sm font-semibold">{opt.label}</span>
                      <span className="block text-[11px] mt-0.5 opacity-80">{opt.hint}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {section === 'studios' && (
          <div className={sectionCardClass}>
            <SectionTitle icon={Sparkles}>Visibilité des Studios IA & Simulateurs</SectionTitle>
            <p className="text-xs text-muted -mt-2">
              Contrôlez la disponibilité des studios créatifs pour tous les utilisateurs de la plateforme (clients, organisateurs, prestataires et vitrine publique). Les onglets, menus et raccourcis s’ajustent automatiquement.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              {/* Studio Budget */}
              <div
                className={cn(
                  'rounded-2xl border p-4 transition flex flex-col justify-between gap-4',
                  (value.studioVisibility?.budget ?? true)
                    ? 'border-primary/40 bg-surface shadow-xs'
                    : 'border-border bg-surface-muted/60 opacity-80',
                )}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                      <Wand2 className="w-5 h-5" />
                    </div>
                    <span
                      className={cn(
                        'inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full',
                        (value.studioVisibility?.budget ?? true)
                          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                          : 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
                      )}
                    >
                      {(value.studioVisibility?.budget ?? true) ? (
                        <>
                          <Eye className="w-3.5 h-3.5" />
                          Visible
                        </>
                      ) : (
                        <>
                          <EyeOff className="w-3.5 h-3.5" />
                          Masqué
                        </>
                      )}
                    </span>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-foreground">Simulateur Budget IA</h4>
                    <p className="text-xs text-muted mt-1 leading-relaxed">
                      Chiffrage automatique en 3 formules clés en main (Éco, Recommandée, Confort), estimation CDF/USD et devis.
                    </p>
                  </div>
                </div>

                <label className="pt-3 border-t border-border flex items-center justify-between cursor-pointer min-h-11 select-none">
                  <span className="text-xs font-semibold text-foreground">Afficher ce studio</span>
                  <input
                    type="checkbox"
                    aria-label="Afficher le Simulateur Budget IA"
                    checked={value.studioVisibility?.budget ?? true}
                    onChange={(e) =>
                      patch({
                        studioVisibility: {
                          budget: e.target.checked,
                          invite: value.studioVisibility?.invite ?? true,
                          room: value.studioVisibility?.room ?? true,
                        },
                      })
                    }
                    className="w-5 h-5 text-primary border-border rounded focus:ring-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
                  />
                </label>
              </div>

              {/* Studio Invitations */}
              <div
                className={cn(
                  'rounded-2xl border p-4 transition flex flex-col justify-between gap-4',
                  (value.studioVisibility?.invite ?? true)
                    ? 'border-pink-500/40 bg-surface shadow-xs'
                    : 'border-border bg-surface-muted/60 opacity-80',
                )}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-pink-500/10 text-pink-600 dark:text-pink-400 flex items-center justify-center">
                      <Mail className="w-5 h-5" />
                    </div>
                    <span
                      className={cn(
                        'inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full',
                        (value.studioVisibility?.invite ?? true)
                          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                          : 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
                      )}
                    >
                      {(value.studioVisibility?.invite ?? true) ? (
                        <>
                          <Eye className="w-3.5 h-3.5" />
                          Visible
                        </>
                      ) : (
                        <>
                          <EyeOff className="w-3.5 h-3.5" />
                          Masqué
                        </>
                      )}
                    </span>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-foreground">Studio Invitations IA</h4>
                    <p className="text-xs text-muted mt-1 leading-relaxed">
                      Concepteur et générateur d’invitations graphiques 9:16 pour WhatsApp avec lien de réponse à l’invitation et confirmations instantanées.
                    </p>
                  </div>
                </div>

                <label className="pt-3 border-t border-border flex items-center justify-between cursor-pointer min-h-11 select-none">
                  <span className="text-xs font-semibold text-foreground">Afficher ce studio</span>
                  <input
                    type="checkbox"
                    aria-label="Afficher le Studio Invitations IA"
                    checked={value.studioVisibility?.invite ?? true}
                    onChange={(e) =>
                      patch({
                        studioVisibility: {
                          budget: value.studioVisibility?.budget ?? true,
                          invite: e.target.checked,
                          room: value.studioVisibility?.room ?? true,
                        },
                      })
                    }
                    className="w-5 h-5 text-primary border-border rounded focus:ring-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
                  />
                </label>
              </div>

              {/* Studio Plans 3D */}
              <div
                className={cn(
                  'rounded-2xl border p-4 transition flex flex-col justify-between gap-4',
                  (value.studioVisibility?.room ?? true)
                    ? 'border-sky-500/40 bg-surface shadow-xs'
                    : 'border-border bg-surface-muted/60 opacity-80',
                )}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <span
                      className={cn(
                        'inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full',
                        (value.studioVisibility?.room ?? true)
                          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                          : 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
                      )}
                    >
                      {(value.studioVisibility?.room ?? true) ? (
                        <>
                          <Eye className="w-3.5 h-3.5" />
                          Visible
                        </>
                      ) : (
                        <>
                          <EyeOff className="w-3.5 h-3.5" />
                          Masqué
                        </>
                      )}
                    </span>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-foreground">Studio Plans 3D IA</h4>
                    <p className="text-xs text-muted mt-1 leading-relaxed">
                      Aménagement interactif de salle de réception : disposition des tables, pistes de danse, podiums et visite 3D immersive.
                    </p>
                  </div>
                </div>

                <label className="pt-3 border-t border-border flex items-center justify-between cursor-pointer min-h-11 select-none">
                  <span className="text-xs font-semibold text-foreground">Afficher ce studio</span>
                  <input
                    type="checkbox"
                    aria-label="Afficher le Studio Plans 3D IA"
                    checked={value.studioVisibility?.room ?? true}
                    onChange={(e) =>
                      patch({
                        studioVisibility: {
                          budget: value.studioVisibility?.budget ?? true,
                          invite: value.studioVisibility?.invite ?? true,
                          room: e.target.checked,
                        },
                      })
                    }
                    className="w-5 h-5 text-primary border-border rounded focus:ring-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
                  />
                </label>
              </div>
            </div>

            {/* Sélection des Modèles IA Principaux */}
            <div className="pt-6 border-t border-border space-y-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary shrink-0" />
                <h4 className="text-sm font-bold text-foreground">
                  Modèles IA Principaux (Moteurs de génération)
                </h4>
              </div>
              <p className="text-xs text-muted -mt-2 leading-relaxed">
                Configurez les modèles d’intelligence artificielle prioritaires appelés lors de la composition des invitations graphiques et de l’agencement automatique des plans de salle 2D/3D.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                {/* Modèle Invitation */}
                <div className="p-4 rounded-xl border border-border bg-surface-muted/40 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <label htmlFor="ai-invitation-model" className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-pink-500" />
                      Génération d&apos;Invitations (Image 9:16)
                    </label>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                      {value.aiStudioModels?.invitationModel?.includes('flash')
                        ? 'Rapide'
                        : value.aiStudioModels?.invitationModel?.includes('imagen')
                        ? 'Imagen'
                        : 'Haute Définition'}
                    </span>
                  </div>

                  <select
                    id="ai-invitation-model"
                    value={value.aiStudioModels?.invitationModel || 'gemini-3-pro-image'}
                    onChange={(e) =>
                      patch({
                        aiStudioModels: {
                          invitationModel: e.target.value,
                          roomPlanModel: value.aiStudioModels?.roomPlanModel || 'gemini-3.1-pro-preview',
                        },
                      })
                    }
                    className="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-xs font-bold text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary min-h-11 cursor-pointer transition shadow-2xs"
                  >
                    <option value="gemini-3-pro-image">
                      Gemini 3 Pro Image (Nano Banana Pro · 2K Haute Définition)
                    </option>
                    <option value="gemini-3.1-flash-image">
                      Gemini 3.1 Flash Image (Nano Banana Flash · Rendu rapide 4-8s)
                    </option>
                    <option value="imagen-3.0-generate-002">
                      Google Imagen 3.0 (Photoréaliste standard)
                    </option>
                    <option value="imagen-3.0-fast-generate-001">
                      Google Imagen 3.0 Fast (Économique &amp; rapide)
                    </option>
                  </select>

                  <p className="text-[11px] text-muted leading-relaxed">
                    Priorité au modèle sélectionné pour concevoir les visuels d&apos;invitation. Le moteur applique un repli automatique en cas d&apos;indisponibilité.
                  </p>
                </div>

                {/* Modèle Salles 2D/3D */}
                <div className="p-4 rounded-xl border border-border bg-surface-muted/40 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <label htmlFor="ai-room-plan-model" className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-sky-500" />
                      Plans &amp; Salles 2D / 3D (Raisonnement)
                    </label>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-700 dark:text-sky-300">
                      {value.aiStudioModels?.roomPlanModel?.includes('flash')
                        ? 'Agile'
                        : value.aiStudioModels?.roomPlanModel?.includes('2.5')
                        ? 'Gemini 2.5'
                        : 'Spatial Pro'}
                    </span>
                  </div>

                  <select
                    id="ai-room-plan-model"
                    value={value.aiStudioModels?.roomPlanModel || 'gemini-3.1-pro-preview'}
                    onChange={(e) =>
                      patch({
                        aiStudioModels: {
                          invitationModel: value.aiStudioModels?.invitationModel || 'gemini-3-pro-image',
                          roomPlanModel: e.target.value,
                        },
                      })
                    }
                    className="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-xs font-bold text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary min-h-11 cursor-pointer transition shadow-2xs"
                  >
                    <option value="gemini-3.1-pro-preview">
                      Gemini 3.1 Pro Preview (Raisonnement spatial &amp; cotation métrique)
                    </option>
                    <option value="gemini-3-flash">
                      Gemini 3 Flash (Génération agile &amp; rapide)
                    </option>
                    <option value="gemini-2.5-pro">
                      Gemini 2.5 Pro (Haute précision textuelle)
                    </option>
                    <option value="gemini-2.5-flash">
                      Gemini 2.5 Flash (Standard stable)
                    </option>
                  </select>

                  <p className="text-[11px] text-muted leading-relaxed">
                    Modèle d&apos;analyse textuelle et topologique pour convertir les briefs et photos en blueprints de salle avec distances de circulation.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {section === 'payments' && (
          <div className={sectionCardClass}>
            <SectionTitle icon={Wallet}>Paiements</SectionTitle>
            <label className="flex items-center gap-3 cursor-pointer bg-surface p-4 border border-border rounded-xl hover:bg-surface-muted/50 transition">
              <input
                type="checkbox"
                checked={value.onlinePaymentsEnabled !== false}
                onChange={(e) => patch({ onlinePaymentsEnabled: e.target.checked })}
                className="w-4.5 h-4.5 text-primary border-border rounded focus:ring-primary"
              />
              <div>
                <span className="text-sm font-bold text-foreground block">Paiements en ligne</span>
                <span className="text-xs text-muted font-medium">
                  Billets événements publics et abonnements forfaits. Désactivé = inscriptions gratuites uniquement.
                </span>
              </div>
            </label>
            {value.onlinePaymentsEnabled !== false && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5 md:col-span-2">
                  <label className={labelClass}>Forfaits SaaS — mode d’achat</label>
                  <select
                    value={value.saasPaymentMode === 'flexpay' ? 'flexpay' : 'manual'}
                    onChange={(e) =>
                      patch({ saasPaymentMode: e.target.value === 'flexpay' ? 'flexpay' : 'manual' })
                    }
                    className={fieldClass}
                  >
                    <option value="manual">Demande manuelle (approbation Super Admin)</option>
                    <option value="flexpay">Paiement FlexPay (Visa / Mobile Money)</option>
                  </select>
                  <p className="text-xs text-muted">
                    Les billets publics sont toujours payés via FlexPay. Ce réglage concerne uniquement les forfaits SaaS.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <label className={labelClass}>FlexPay — token API</label>
                  <input
                    type="password"
                    autoComplete="off"
                    value={value.flexPayCardToken || ''}
                    onChange={(e) => patch({ flexPayCardToken: e.target.value })}
                    placeholder="Bearer … ou jeton"
                    className={fieldClass}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className={labelClass}>FlexPay — code marchand</label>
                  <input
                    type="text"
                    value={value.flexPayCardMerchant || ''}
                    onChange={(e) => patch({ flexPayCardMerchant: e.target.value })}
                    placeholder="MERCHANT"
                    className={fieldClass}
                  />
                </div>
                <p className="text-xs text-muted md:col-span-2">
                  Sans credentials, les paiements FlexPay sont simulés. Env :{' '}
                  <code className="font-mono text-xs">FLEXPAY_CARD_TOKEN</code>,{' '}
                  <code className="font-mono text-xs">FLEXPAY_CARD_MERCHANT</code>.
                </p>
              </div>
            )}
            <DiscountAccessEditor
              value={value.subscriptionDiscountAccess}
              onChange={(subscriptionDiscountAccess) => patch({ subscriptionDiscountAccess })}
            />
            <DonationsAccessEditor
              value={value.donationsAccess}
              onChange={(donationsAccess) => patch({ donationsAccess })}
            />
            <div className="pt-4 mt-2 border-t border-border space-y-4">
                <SectionTitle icon={Wallet}>Jetons IA</SectionTitle>
                <p className="text-xs text-muted -mt-2">
                  Prix unitaire et montant minimum d’achat. Appliqués immédiatement au checkout FlexPay.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className={labelClass}>Prix d’un jeton (FC)</label>
                    <input
                      type="number"
                      min={1}
                      max={1000000}
                      step={1}
                      value={Number(value.aiTokenPriceCdf ?? 416)}
                      onChange={(e) => patch({ aiTokenPriceCdf: Math.max(1, Number(e.target.value) || 416) })}
                      className={cn(fieldClass, 'font-medium')}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className={labelClass}>Seuil d’achat (FC)</label>
                    <input
                      type="number"
                      min={1}
                      max={100000000}
                      step={100}
                      value={Number(value.aiTokenMinPurchaseCdf ?? 2500)}
                      onChange={(e) => patch({ aiTokenMinPurchaseCdf: Math.max(1, Number(e.target.value) || 2500) })}
                      className={cn(fieldClass, 'font-medium')}
                    />
                  </div>
                </div>
                <p className="text-xs text-muted">
                  Exemple : {Math.max(1, Math.floor(Number(value.aiTokenMinPurchaseCdf || 2500) / Number(value.aiTokenPriceCdf || 416)))} jeton
                  {Math.floor(Number(value.aiTokenMinPurchaseCdf || 2500) / Number(value.aiTokenPriceCdf || 416)) > 1 ? 's' : ''} pour{' '}
                  {Number(value.aiTokenMinPurchaseCdf || 2500).toLocaleString('fr-FR')} FC.
                </p>
                <WelcomeAiGrantsEditor
                  value={sanitizeWelcomeAiGrants(value.welcomeAiGrants)}
                  priceCdf={Number(value.aiTokenPriceCdf || 416)}
                  onChange={(welcomeAiGrants) => patch({ welcomeAiGrants })}
                />
            </div>
          </div>
        )}

        {section === 'marketplace' && (
          <div className={sectionCardClass}>
            <SectionTitle icon={Wallet}>Marketplace & change</SectionTitle>
            <p className="text-xs text-muted -mt-2">
              Taux pour nouvelles réservations, landing, FAQ et commissions commerciales. Les réservations déjà
              confirmées conservent leur taux historique.
            </p>
            <div className="space-y-1.5 pb-2 border-b border-border">
              <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <span>Taux de change Dollar vers Franc Congolais (1 $ en FC)</span>
                <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-semibold">
                  Simulateur & Devis
                </span>
              </label>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="relative flex-1">
                  <input
                    type="number"
                    min={1000}
                    max={5000}
                    step={10}
                    value={Number(value.usdExchangeRateCdf ?? 2800)}
                    onChange={(e) => patch({ usdExchangeRateCdf: Number(e.target.value) || 2800 })}
                    className={cn(fieldClass, 'font-medium')}
                    placeholder="2800"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-muted pointer-events-none">
                    FC / 1 USD
                  </span>
                </div>
                <div className="text-xs text-muted whitespace-nowrap bg-surface px-3 py-2.5 rounded-xl border border-border">
                  Exemple :{' '}
                  <strong>
                    100 $ = {(100 * Number(value.usdExchangeRateCdf || 2800)).toLocaleString('fr-FR')} FC
                  </strong>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className={labelClass}>Commission vendeur marketplace (%)</label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  step={0.5}
                  value={Math.round(Number(value.marketplaceCommissionRate ?? 0.08) * 1000) / 10}
                  onChange={(e) => patch({ marketplaceCommissionRate: (Number(e.target.value) || 0) / 100 })}
                  className={cn(fieldClass, 'font-medium')}
                />
                <p className="text-[11px] text-muted">Due par le vendeur. Défaut 8 %.</p>
              </div>
              <div className="space-y-1.5">
                <label className={labelClass}>Acompte hors plateforme (%)</label>
                <input
                  type="number"
                  min={5}
                  max={90}
                  step={1}
                  value={Math.round(Number(value.marketplaceDepositRate ?? 0.3) * 1000) / 10}
                  onChange={(e) => patch({ marketplaceDepositRate: (Number(e.target.value) || 0) / 100 })}
                  className={cn(fieldClass, 'font-medium')}
                />
                <p className="text-[11px] text-muted">Versé au professionnel. Défaut 30 %.</p>
              </div>
              <div className="space-y-1.5">
                <label className={labelClass}>Commission commerciale — 1er paiement (%)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={Math.round(Number(value.commercialFirstCommissionRate ?? 0.3) * 1000) / 10}
                  onChange={(e) =>
                    patch({ commercialFirstCommissionRate: (Number(e.target.value) || 0) / 100 })
                  }
                  className={cn(fieldClass, 'font-medium')}
                />
              </div>
              <div className="space-y-1.5">
                <label className={labelClass}>Commission commerciale — suivants (%)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={Math.round(Number(value.commercialRenewalCommissionRate ?? 0.2) * 1000) / 10}
                  onChange={(e) =>
                    patch({ commercialRenewalCommissionRate: (Number(e.target.value) || 0) / 100 })
                  }
                  className={cn(fieldClass, 'font-medium')}
                />
              </div>
            </div>
          </div>
        )}

        {section === 'cities' && (
          <div className={sectionCardClass}>
            <SectionTitle icon={MapPin}>Villes</SectionTitle>
            <div className="space-y-3">
              <div>
                <p className="text-xs font-semibold text-foreground">Mentionnées sur le site</p>
                <p className="text-[11px] text-muted mt-0.5">
                  Villes cochées affichées sur l’accueil, le footer et les pages publiques.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {PLATFORM_CITY_CATALOG.map((cityName) => {
                  const selected = enabledCities.includes(cityName);
                  const hasGps = MARKETPLACE_GPS_CITIES.includes(cityName as (typeof MARKETPLACE_GPS_CITIES)[number]);
                  return (
                    <label
                      key={cityName}
                      className={cn(
                        'inline-flex items-center gap-2 min-h-11 px-3 rounded-xl border text-sm font-semibold cursor-pointer touch-manipulation',
                        selected
                          ? 'bg-primary-solid text-primary-foreground border-primary-solid'
                          : 'bg-surface text-muted border-border hover:text-foreground',
                      )}
                    >
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={selected}
                        onChange={() => toggleCity(cityName)}
                      />
                      <MapPin className="w-3.5 h-3.5" />
                      {cityName}
                      {hasGps ? (
                        <span
                          className={cn(
                            'text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md',
                            selected ? 'bg-white/20' : 'bg-surface-muted border border-border',
                          )}
                        >
                          GPS
                        </span>
                      ) : null}
                    </label>
                  );
                })}
              </div>
              <div className="rounded-xl border border-border bg-surface p-3 space-y-1">
                <p className="text-xs font-semibold text-foreground">Catalogue & carte (données GPS)</p>
                <p className="text-[11px] text-muted leading-relaxed">
                  Seules {MARKETPLACE_GPS_CITIES.join(' et ')} ont des communes et bornes géo. Si elles sont
                  cochées ci-dessus, elles ouvrent le marketplace, la carte et le simulateur budget IA. Les autres
                  villes restent des mentions publiques uniquement.
                </p>
              </div>
            </div>
          </div>
        )}

        {section === 'contact' && (
          <div className={sectionCardClass}>
            <SectionTitle icon={Mail}>Contact & support (site public)</SectionTitle>
            <p className="text-xs text-muted -mt-2">
              Affiché sur Contact, Footer, FAQ et utilisés comme destinataires du formulaire.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className={labelClass}>E-mail support</label>
                <input
                  type="email"
                  value={value.supportEmail || ''}
                  onChange={(e) => patch({ supportEmail: e.target.value })}
                  className={fieldClass}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className={labelClass}>WhatsApp (destinataire contact)</label>
                <input
                  type="text"
                  value={value.supportWhatsApp || ''}
                  onChange={(e) => patch({ supportWhatsApp: e.target.value })}
                  className={cn(fieldClass, 'font-mono')}
                  placeholder="+243817125577"
                />
              </div>
              <div className="space-y-1.5">
                <label className={labelClass}>Téléphone affiché</label>
                <input
                  type="text"
                  value={value.supportPhone || ''}
                  onChange={(e) => patch({ supportPhone: e.target.value })}
                  className={fieldClass}
                />
              </div>
              <div className="space-y-1.5">
                <label className={labelClass}>Note WhatsApp</label>
                <input
                  type="text"
                  value={value.whatsappNote || ''}
                  onChange={(e) => patch({ whatsappNote: e.target.value })}
                  className={fieldClass}
                />
              </div>
              <div className="space-y-1.5">
                <label className={labelClass}>Adresse ligne 1</label>
                <input
                  type="text"
                  value={value.addressLine1 || ''}
                  onChange={(e) => patch({ addressLine1: e.target.value })}
                  className={fieldClass}
                />
              </div>
              <div className="space-y-1.5">
                <label className={labelClass}>Adresse ligne 2</label>
                <input
                  type="text"
                  value={value.addressLine2 || ''}
                  onChange={(e) => patch({ addressLine2: e.target.value })}
                  className={fieldClass}
                />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <label className={labelClass}>Adresse courte (footer)</label>
                <input
                  type="text"
                  value={value.addressShort || ''}
                  onChange={(e) => patch({ addressShort: e.target.value })}
                  className={fieldClass}
                />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <label className={labelClass}>Horaires support</label>
                <input
                  type="text"
                  value={value.supportHours || ''}
                  onChange={(e) => patch({ supportHours: e.target.value })}
                  className={fieldClass}
                />
              </div>
            </div>
          </div>
        )}

        {section === 'messaging' && (
          <div className="space-y-6">
            <div className={sectionCardClass}>
              <SectionTitle icon={MessageSquare}>WhatsApp (UltraMsg)</SectionTitle>
              <p className="text-xs text-muted -mt-2">
                Requis pour OTP WhatsApp, invitations et rappels via WhatsApp.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className={labelClass}>UltraMsg Instance ID</label>
                  <input
                    type="text"
                    value={value.ultramsgInstanceId || ''}
                    onChange={(e) => patch({ ultramsgInstanceId: e.target.value })}
                    className={cn(fieldClass, 'font-mono')}
                    placeholder="ex: instance12345"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className={labelClass}>UltraMsg Token</label>
                  <input
                    type="password"
                    value={value.ultramsgToken || ''}
                    onChange={(e) => patch({ ultramsgToken: e.target.value })}
                    className={cn(fieldClass, 'font-mono')}
                    placeholder="••••••••••••••••••••••••••••••••"
                  />
                </div>
              </div>
            </div>

            <div className={sectionCardClass}>
              <SectionTitle icon={Mail}>E-mail (SendGrid)</SectionTitle>
              <p className="text-xs text-muted -mt-2">
                Requis pour OTP e-mail, invitations et notifications transactionnelles.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5 md:col-span-2">
                  <label className={labelClass}>SendGrid API Key</label>
                  <input
                    type="password"
                    value={value.sendgridApiKey || ''}
                    onChange={(e) => patch({ sendgridApiKey: e.target.value })}
                    className={cn(fieldClass, 'font-mono')}
                    placeholder="ex: SG.••••••••••••••••••••••••••••••••"
                  />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <label className={labelClass}>Expéditeur (From)</label>
                  <input
                    type="email"
                    value={value.sendgridFrom || ''}
                    onChange={(e) => patch({ sendgridFrom: e.target.value })}
                    className={fieldClass}
                    placeholder="no-reply@votredomaine.com"
                  />
                  <p className="text-[11px] text-muted">Doit être un domaine vérifié dans SendGrid.</p>
                </div>
              </div>
            </div>

            <div className={sectionCardClass}>
              <SectionTitle icon={MessageSquare}>SMS (Twilio)</SectionTitle>
              <p className="text-xs text-muted -mt-2">
                Optionnel. Utilisé si un canal SMS est branché. Les secrets sont masqués à la relecture.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className={labelClass}>Account SID</label>
                  <input
                    type="text"
                    value={value.twilioAccountSid || ''}
                    onChange={(e) => patch({ twilioAccountSid: e.target.value })}
                    className={cn(fieldClass, 'font-mono')}
                    placeholder="ACxxxxxxxx"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className={labelClass}>Auth Token</label>
                  <input
                    type="password"
                    autoComplete="off"
                    value={value.twilioAuthToken || ''}
                    onChange={(e) => patch({ twilioAuthToken: e.target.value })}
                    className={cn(fieldClass, 'font-mono')}
                    placeholder="••••••••••••••••"
                  />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <label className={labelClass}>Numéro Twilio</label>
                  <input
                    type="text"
                    value={value.twilioPhoneNumber || ''}
                    onChange={(e) => patch({ twilioPhoneNumber: e.target.value })}
                    className={cn(fieldClass, 'font-mono')}
                    placeholder="+243…"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {section === 'audio' && (() => {
          const audio = sanitizeAudioNotifications(value.audioNotifications);
          const familyLabels: Record<AudioNotificationFamily, string> = {
            events: 'Événements (Réponse à l’invitation, billets)',
            billing: 'Facturation & abonnements',
            commissions: 'Commissions',
            catalog: 'Catalogue / marketplace',
            tasks: 'Tâches événement',
            studio: 'Studio IA (Invitations, Plans 3D, Budgets)',
          };
          const patchAudio = (partial: Partial<typeof audio>) => {
            patch({ audioNotifications: { ...audio, ...partial } });
          };
          return (
            <div className={sectionCardClass}>
              <SectionTitle icon={Volume2}>Notifications audio in-app</SectionTitle>
              <p className="text-xs text-muted -mt-2 leading-relaxed">
                Quand une nouvelle notification arrive dans la cloche du tableau de bord, EventMaster joue un son court.
                Les utilisateurs peuvent encore couper le son localement. Aucun fichier audio n’est hébergé : les sons sont
                synthétisés dans le navigateur.
              </p>
              <label className="flex items-center justify-between gap-3 min-h-11">
                <span className="text-sm font-medium text-foreground">Activer les sons plateforme</span>
                <input
                  type="checkbox"
                  checked={audio.enabled}
                  onChange={(e) => patchAudio({ enabled: e.target.checked })}
                  className="accent-primary w-4 h-4"
                />
              </label>
              <div className="space-y-1.5">
                <label className={labelClass}>Volume ({audio.volume} %)</label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={audio.volume}
                  onChange={(e) => patchAudio({ volume: Number(e.target.value) })}
                  className="w-full accent-primary"
                  disabled={!audio.enabled}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {AUDIO_NOTIFICATION_FAMILIES.map((family) => (
                  <div key={family} className="space-y-1.5">
                    <label className={labelClass}>{familyLabels[family]}</label>
                    <div className="flex gap-2">
                      <select
                        value={audio[family]}
                        onChange={(e) => patchAudio({ [family]: e.target.value as AudioNotificationPreset })}
                        className={fieldClass}
                        disabled={!audio.enabled}
                      >
                        {AUDIO_NOTIFICATION_PRESETS.map((preset) => (
                          <option key={preset} value={preset}>
                            {AUDIO_PRESET_LABELS[preset]}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="px-3 min-h-11 rounded-xl border border-border text-xs font-semibold text-foreground hover:bg-surface-muted"
                        onClick={() => playAudioNotificationPreset(audio[family], audio.volume)}
                      >
                        Écouter
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="space-y-1.5">
                <label className={labelClass}>Son par défaut (autres notifications)</label>
                <div className="flex gap-2">
                  <select
                    value={audio.default}
                    onChange={(e) => patchAudio({ default: e.target.value as AudioNotificationPreset })}
                    className={fieldClass}
                    disabled={!audio.enabled}
                  >
                    {AUDIO_NOTIFICATION_PRESETS.map((preset) => (
                      <option key={preset} value={preset}>
                        {AUDIO_PRESET_LABELS[preset]}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="px-3 min-h-11 rounded-xl border border-border text-xs font-semibold text-foreground hover:bg-surface-muted"
                    onClick={() => playAudioNotificationPreset(audio.default, audio.volume)}
                  >
                    Écouter
                  </button>
                </div>
              </div>

              <div className="pt-3 border-t border-border space-y-2">
                <label className="flex items-center justify-between gap-3 min-h-11 cursor-pointer">
                  <div>
                    <span className="text-sm font-medium text-foreground block">Tintement d’étape des loaders de studio</span>
                    <span className="text-xs text-muted block leading-relaxed">
                      Émet un son discret lors du passage de chaque étape de génération IA (lecture du brief, modélisation 3D, composition graphique, finitions).
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={audio.studioStepSound}
                    onChange={(e) => patchAudio({ studioStepSound: e.target.checked })}
                    className="accent-primary w-4 h-4 shrink-0 rounded"
                    disabled={!audio.enabled}
                  />
                </label>
              </div>
            </div>
          );
        })()}

        <div className="flex justify-end gap-3 sticky bottom-[calc(var(--em-site-bottom-nav,4rem)+0.75rem)] md:bottom-4 z-20 bg-surface/85 md:bg-transparent backdrop-blur-md md:backdrop-blur-none p-2 md:p-0 rounded-2xl border md:border-0 border-border/60 shadow-lg md:shadow-none">
          <Button
            type="submit"
            disabled={saving}
            loading={saving}
            className="w-full sm:w-auto min-h-11"
            leftIcon={!saving ? <Check className="w-4 h-4" /> : undefined}
          >
            {saving ? 'Enregistrement…' : 'Sauvegarder les configurations'}
          </Button>
        </div>
      </form>

      <Modal
        open={maintenanceConfirmOpen}
        onClose={() => setMaintenanceConfirmOpen(false)}
        title="Activer le mode maintenance ?"
        description="Les utilisateurs hors Super Admin ne pourront plus utiliser l’API. Login, réponse à l’invitation et pages publiques restent accessibles."
        size="sm"
        footer={
          <div className="flex w-full justify-end gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setMaintenanceConfirmOpen(false)}>
              Annuler
            </Button>
            <Button type="button" variant="danger" size="sm" onClick={confirmMaintenance}>
              Activer la maintenance
            </Button>
          </div>
        }
      >
        <p className="text-sm text-muted leading-relaxed">
          Vérifiez le message affiché aux visiteurs avant de confirmer. Vous pourrez le modifier dans Accès critique.
        </p>
      </Modal>
    </>
  );
}

function WelcomeAiGrantsEditor({
  value,
  priceCdf,
  onChange,
}: {
  value: typeof DEFAULT_WELCOME_AI_GRANTS;
  priceCdf: number;
  onChange: (next: typeof DEFAULT_WELCOME_AI_GRANTS) => void;
}) {
  const patchRow = (key: WelcomeGrantKey, partial: Partial<(typeof value)[WelcomeGrantKey]>) => {
    const nextRule = { ...value[key], ...partial };
    if (nextRule.moment === 'never') nextRule.enabled = false;
    onChange({ ...value, [key]: nextRule });
  };

  return (
    <div className="space-y-3 pt-2">
      <p className="text-xs font-semibold text-foreground">Offres de bienvenue</p>
      <p className="text-xs text-muted -mt-1">
        Montant et moment par type de compte. Un changement ne s’applique qu’aux prochains crédits.
        L’entreprise est créditée à l’activation du forfait payant par défaut.
      </p>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-xs min-w-[640px]">
          <thead className="bg-surface-muted text-muted">
            <tr>
              <th className="text-left font-semibold px-3 py-2">Audience</th>
              <th className="text-left font-semibold px-3 py-2">Actif</th>
              <th className="text-left font-semibold px-3 py-2">Montant</th>
              <th className="text-left font-semibold px-3 py-2">Unité</th>
              <th className="text-left font-semibold px-3 py-2">Moment</th>
            </tr>
          </thead>
          <tbody>
            {WELCOME_GRANT_KEYS.map((key) => {
              const rule = value[key];
              const tokensApprox =
                rule.unit === 'fc' && priceCdf > 0
                  ? Math.max(0, Math.floor(rule.amount / priceCdf))
                  : rule.amount;
              return (
                <tr key={key} className="border-t border-border">
                  <td className="px-3 py-2">
                    <p className="font-semibold text-foreground">{WELCOME_GRANT_LABELS[key]}</p>
                    <p className="text-[11px] text-muted">
                      {rule.unit === 'fc' && rule.amount > 0
                        ? `≈ ${tokensApprox} jeton${tokensApprox > 1 ? 's' : ''} au tarif actuel`
                        : WELCOME_MOMENT_LABELS[rule.moment]}
                    </p>
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={rule.enabled && rule.moment !== 'never'}
                      onChange={(e) => patchRow(key, { enabled: e.target.checked })}
                      disabled={rule.moment === 'never'}
                      className="accent-primary"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min={0}
                      step={rule.unit === 'fc' ? 1000 : 1}
                      value={rule.amount}
                      onChange={(e) => patchRow(key, { amount: Math.max(0, Number(e.target.value) || 0) })}
                      className={cn(fieldClass, 'py-1.5')}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={rule.unit}
                      onChange={(e) => patchRow(key, { unit: e.target.value as WelcomeGrantUnit })}
                      className={cn(fieldClass, 'py-1.5')}
                    >
                      <option value="fc">FC</option>
                      <option value="tokens">Jetons</option>
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={rule.moment}
                      onChange={(e) => patchRow(key, { moment: e.target.value as WelcomeGrantMoment })}
                      className={cn(fieldClass, 'py-1.5')}
                    >
                      {WELCOME_MOMENTS_BY_KEY[key].map((moment) => (
                        <option key={moment} value={moment}>
                          {WELCOME_MOMENT_LABELS[moment]}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

type DiscountAccessValue = NonNullable<AdminPlatformSettingsValues['subscriptionDiscountAccess']>;

function DiscountAccessEditor({
  value,
  onChange,
}: {
  value?: DiscountAccessValue;
  onChange: (next: DiscountAccessValue) => void;
}) {
  const access = {
    enabled: value?.enabled !== false,
    periodStart: value?.periodStart ?? '',
    periodEnd: value?.periodEnd ?? '',
    tenantIds: value?.tenantIds ?? [],
  };
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Array<{ id: string; name: string; plan: string }>>([]);
  const [named, setNamed] = useState<Record<string, string>>({});
  const [searching, setSearching] = useState(false);

  const patch = (partial: Partial<DiscountAccessValue>) => {
    onChange({
      enabled: access.enabled,
      periodStart: access.periodStart || null,
      periodEnd: access.periodEnd || null,
      tenantIds: access.tenantIds,
      ...partial,
    });
  };

  const allowlistedIds = access.tenantIds.join('|');
  useEffect(() => {
    const ids = allowlistedIds ? allowlistedIds.split('|') : [];
    if (ids.length === 0) return;
    let cancelled = false;
    void Promise.all(
      ids.map((id) =>
        api
          .get(`/admin/tenants?q=${encodeURIComponent(id)}&pageSize=1`)
          .then((data: { items?: Array<{ id: string; name: string }> }) => {
            const item = data.items?.find((tenant) => tenant.id === id);
            return item ? ([id, item.name] as const) : null;
          })
          .catch(() => null),
      ),
    ).then((pairs) => {
      if (cancelled) return;
      setNamed((prev) => {
        const next = { ...prev };
        for (const pair of pairs) {
          if (pair) next[pair[0]] = pair[1];
        }
        return next;
      });
    });
    return () => {
      cancelled = true;
    };
  }, [allowlistedIds]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    const handle = window.setTimeout(() => {
      setSearching(true);
      void api
        .get(`/admin/tenants?q=${encodeURIComponent(q)}&pageSize=8`)
        .then((data: { items?: Array<{ id: string; name: string; plan: string }> }) => {
          setResults(Array.isArray(data.items) ? data.items : []);
        })
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 280);
    return () => window.clearTimeout(handle);
  }, [query]);

  const addTenant = (id: string, name: string) => {
    if (access.tenantIds.includes(id)) return;
    setNamed((prev) => ({ ...prev, [id]: name }));
    patch({ tenantIds: [...access.tenantIds, id] });
    setQuery('');
    setResults([]);
  };

  return (
    <div className="pt-4 mt-2 border-t border-border space-y-4">
      <SectionTitle icon={Percent}>Paiement au rabais</SectionTitle>
      <p className="text-xs text-muted -mt-2 leading-relaxed">
        Ouvert pour tout le monde si aucune période ni organisation n’est renseignée. Une organisation listée
        reste éligible hors campagne. Une période ouvre le rabais à toutes les organisations.
      </p>
      <label className="flex items-center justify-between gap-3 min-h-11 cursor-pointer">
        <span className="text-sm font-medium text-foreground">Autoriser les demandes de rabais</span>
        <input
          type="checkbox"
          checked={access.enabled}
          onChange={(e) => patch({ enabled: e.target.checked })}
          className="accent-primary w-5 h-5"
        />
      </label>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className={labelClass} htmlFor="discount-period-start">Début de campagne</label>
          <input
            id="discount-period-start"
            type="date"
            value={access.periodStart}
            onChange={(e) => patch({ periodStart: e.target.value || null })}
            disabled={!access.enabled}
            className={fieldClass}
          />
        </div>
        <div className="space-y-1.5">
          <label className={labelClass} htmlFor="discount-period-end">Fin de campagne</label>
          <input
            id="discount-period-end"
            type="date"
            value={access.periodEnd}
            onChange={(e) => patch({ periodEnd: e.target.value || null })}
            disabled={!access.enabled}
            className={fieldClass}
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <label className={labelClass} htmlFor="discount-tenant-search">Organisations toujours éligibles</label>
        <input
          id="discount-tenant-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          disabled={!access.enabled}
          placeholder="Rechercher une organisation…"
          className={fieldClass}
        />
        {searching ? <p className="text-xs text-muted">Recherche…</p> : null}
        {results.length > 0 && (
          <ul className="border border-border rounded-xl overflow-hidden bg-surface">
            {results.map((tenant) => (
              <li key={tenant.id}>
                <button
                  type="button"
                  onClick={() => addTenant(tenant.id, tenant.name)}
                  className="w-full min-h-11 px-3 text-left text-sm hover:bg-surface-muted"
                >
                  {tenant.name} <span className="text-muted">· {tenant.plan}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {access.tenantIds.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {access.tenantIds.map((id) => (
              <span
                key={id}
                className="inline-flex items-center gap-1 min-h-11 pl-3 pr-1 rounded-full bg-primary/10 text-primary text-xs font-semibold"
              >
                {named[id] || id.slice(0, 8)}
                <button
                  type="button"
                  aria-label={`Retirer ${named[id] || 'cette organisation'}`}
                  onClick={() => patch({ tenantIds: access.tenantIds.filter((item) => item !== id) })}
                  className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-full hover:bg-primary/15"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

type DonationsAccessValue = NonNullable<AdminPlatformSettingsValues['donationsAccess']>;

function DonationsAccessEditor({
  value,
  onChange,
}: {
  value?: DonationsAccessValue;
  onChange: (next: DonationsAccessValue) => void;
}) {
  const access: DonationsAccessValue = {
    enabled: value?.enabled !== false,
    mode: value?.mode === 'restricted' ? 'restricted' : 'all',
    tenantIds: value?.tenantIds ?? [],
    minAmountFc: Number(value?.minAmountFc) || 1000,
    defaultSuggestedAmountsFc: value?.defaultSuggestedAmountsFc ?? [2500, 5000, 10000, 25000, 50000, 100000],
  };

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Array<{ id: string; name: string; plan: string }>>([]);
  const [named, setNamed] = useState<Record<string, string>>({});
  const [searching, setSearching] = useState(false);
  const [suggestedInput, setSuggestedInput] = useState(
    access.defaultSuggestedAmountsFc.join(', '),
  );

  const patch = (partial: Partial<DonationsAccessValue>) => {
    onChange({
      enabled: access.enabled,
      mode: access.mode,
      tenantIds: access.tenantIds,
      minAmountFc: access.minAmountFc,
      defaultSuggestedAmountsFc: access.defaultSuggestedAmountsFc,
      ...partial,
    });
  };

  const allowlistedIds = access.tenantIds.join('|');
  useEffect(() => {
    const ids = allowlistedIds ? allowlistedIds.split('|') : [];
    if (ids.length === 0) return;
    let cancelled = false;
    void Promise.all(
      ids.map((id) =>
        api
          .get(`/admin/tenants?q=${encodeURIComponent(id)}&pageSize=1`)
          .then((data: { items?: Array<{ id: string; name: string }> }) => {
            const item = data.items?.find((tenant) => tenant.id === id);
            return item ? ([id, item.name] as const) : null;
          })
          .catch(() => null),
      ),
    ).then((pairs) => {
      if (cancelled) return;
      setNamed((prev) => {
        const next = { ...prev };
        for (const pair of pairs) {
          if (pair) next[pair[0]] = pair[1];
        }
        return next;
      });
    });
    return () => {
      cancelled = true;
    };
  }, [allowlistedIds]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    const handle = window.setTimeout(() => {
      setSearching(true);
      void api
        .get(`/admin/tenants?q=${encodeURIComponent(q)}&pageSize=8`)
        .then((data: { items?: Array<{ id: string; name: string; plan: string }> }) => {
          setResults(Array.isArray(data.items) ? data.items : []);
        })
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 280);
    return () => window.clearTimeout(handle);
  }, [query]);

  const addTenant = (id: string, name: string) => {
    if (access.tenantIds.includes(id)) return;
    setNamed((prev) => ({ ...prev, [id]: name }));
    patch({ tenantIds: [...access.tenantIds, id] });
    setQuery('');
    setResults([]);
  };

  const handleApplySuggested = (str: string) => {
    setSuggestedInput(str);
    const parsed = str
      .split(/[,;\s]+/)
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isFinite(n) && n >= access.minAmountFc);
    if (parsed.length > 0) {
      patch({ defaultSuggestedAmountsFc: [...new Set(parsed)].sort((a, b) => a - b) });
    }
  };

  return (
    <div className="pt-4 mt-2 border-t border-border space-y-4">
      <SectionTitle icon={Heart}>Donations & Financement solidaire</SectionTitle>
      <p className="text-xs text-muted -mt-2 leading-relaxed">
        Permet aux organisateurs d’activer des collectes de dons à montant libre lors de leurs événements.
        Vous pouvez autoriser tout le monde sans restrictions ou restreindre l’accès à une ou plusieurs organisations spécifiques.
      </p>

      <label className="flex items-center justify-between gap-3 min-h-11 cursor-pointer bg-surface p-3.5 border border-border rounded-xl">
        <div>
          <span className="text-sm font-semibold text-foreground block">Activer la fonctionnalité de dons libres</span>
          <span className="text-xs text-muted">Désactivé = aucun événement ne peut proposer de collecte de dons sur la plateforme</span>
        </div>
        <input
          type="checkbox"
          checked={access.enabled}
          onChange={(e) => patch({ enabled: e.target.checked })}
          className="accent-primary w-5 h-5 shrink-0"
        />
      </label>

      {access.enabled && (
        <div className="space-y-4 pl-1">
          <div className="space-y-2">
            <label className={labelClass} id="donations-mode-label">Politique d’éligibilité des organisations</label>
            <div
              className="grid grid-cols-1 sm:grid-cols-2 gap-3"
              role="radiogroup"
              aria-labelledby="donations-mode-label"
            >
              <button
                type="button"
                role="radio"
                aria-checked={access.mode === 'all'}
                onClick={() => patch({ mode: 'all' })}
                className={cn(
                  'p-3.5 rounded-xl border text-left transition flex items-start gap-3',
                  access.mode === 'all'
                    ? 'bg-primary/10 border-primary text-foreground ring-1 ring-primary/20'
                    : 'bg-surface border-border text-muted hover:text-foreground',
                )}
              >
                <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-sm font-bold', access.mode === 'all' ? 'bg-primary text-primary-foreground' : 'bg-surface-muted text-muted')}>
                  🌍
                </div>
                <div>
                  <span className="block text-sm font-bold text-foreground">Tout le monde (Sans restriction)</span>
                  <span className="block text-xs text-muted mt-0.5">Toutes les organisations peuvent proposer des dons sur leurs événements.</span>
                </div>
              </button>

              <button
                type="button"
                role="radio"
                aria-checked={access.mode === 'restricted'}
                onClick={() => patch({ mode: 'restricted' })}
                className={cn(
                  'p-3.5 rounded-xl border text-left transition flex items-start gap-3',
                  access.mode === 'restricted'
                    ? 'bg-primary/10 border-primary text-foreground ring-1 ring-primary/20'
                    : 'bg-surface border-border text-muted hover:text-foreground',
                )}
              >
                <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-sm font-bold', access.mode === 'restricted' ? 'bg-primary text-primary-foreground' : 'bg-surface-muted text-muted')}>
                  🔒
                </div>
                <div>
                  <span className="block text-sm font-bold text-foreground">Organisations autorisées uniquement</span>
                  <span className="block text-xs text-muted mt-0.5">Seuls les gestionnaires des organisations approuvées ci-dessous ont accès à la collecte.</span>
                </div>
              </button>
            </div>
          </div>

          {access.mode === 'restricted' && (
            <div className="space-y-2 bg-surface p-4 border border-border rounded-xl">
              <label className={labelClass} htmlFor="donations-tenant-search">
                Organisations expressément autorisées ({access.tenantIds.length})
              </label>
              <p className="text-xs text-muted">
                Recherchez et ajoutez les organisations autorisées à activer des dons libres.
              </p>
              <input
                id="donations-tenant-search"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Rechercher une organisation par nom…"
                aria-label="Rechercher une organisation à autoriser"
                className={fieldClass}
              />
              {searching ? <p className="text-xs text-muted">Recherche en cours…</p> : null}
              {results.length > 0 && (
                <ul className="border border-border rounded-xl overflow-hidden bg-surface shadow-md">
                  {results.map((tenant) => (
                    <li key={tenant.id}>
                      <button
                        type="button"
                        onClick={() => addTenant(tenant.id, tenant.name)}
                        className="w-full min-h-11 px-3 text-left text-sm hover:bg-surface-muted flex items-center justify-between"
                      >
                        <span className="font-semibold text-foreground">{tenant.name}</span>
                        <span className="text-xs text-muted">Forfait : {tenant.plan}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {access.tenantIds.length > 0 ? (
                <div className="flex flex-wrap gap-2 pt-2">
                  {access.tenantIds.map((id) => (
                    <span
                      key={id}
                      className="inline-flex items-center gap-1.5 min-h-11 pl-3.5 pr-1 rounded-full bg-primary/10 text-primary text-xs font-semibold border border-primary/20"
                    >
                      {named[id] || id.slice(0, 8)}
                      <button
                        type="button"
                        aria-label={`Retirer ${named[id] || 'cette organisation'}`}
                        onClick={() => patch({ tenantIds: access.tenantIds.filter((item) => item !== id) })}
                        className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-full hover:bg-primary/20 text-primary touch-manipulation active:scale-95 transition"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-amber-600 dark:text-amber-400 font-medium pt-1">
                  Aucune organisation sélectionnée. Le mode restreint est actif mais aucune organisation n'est autorisée.
                </p>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div className="space-y-1.5">
              <label className={labelClass}>Montant minimum d'un don (FC)</label>
              <input
                type="number"
                min={100}
                step={500}
                value={access.minAmountFc}
                onChange={(e) => patch({ minAmountFc: Math.max(100, Number(e.target.value) || 1000) })}
                className={fieldClass}
              />
              <p className="text-[11px] text-muted">Seuil plancher appliqué par défaut aux collectes.</p>
            </div>

            <div className="space-y-1.5">
              <label className={labelClass}>Montants suggérés par défaut (FC, séparés par virgules)</label>
              <input
                type="text"
                value={suggestedInput}
                onChange={(e) => handleApplySuggested(e.target.value)}
                placeholder="2500, 5000, 10000, 25000, 50000"
                className={fieldClass}
              />
              <div className="flex flex-wrap gap-1 pt-1">
                {access.defaultSuggestedAmountsFc.map((amt) => (
                  <span key={amt} className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-surface-muted text-foreground border border-border">
                    {amt.toLocaleString('fr-FR')} FC
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
