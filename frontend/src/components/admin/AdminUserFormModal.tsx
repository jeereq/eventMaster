'use client';

import React, { useId, useState } from 'react';
import { CreditCard, Mail, Shield, Users } from 'lucide-react';
import { Alert, Button, Input, Modal, PasswordInput, PhoneInput } from '@/components/ui';
import { cn } from '@/lib/cn';
import type { AuthOtpMethod } from '@/lib/authOtpChannels';

export type AdminUserRole = 'USER' | 'COMMERCIAL' | 'SUPER_ADMIN';

export type AdminCommercialPermissions = {
  canManageTemplates: boolean;
  canManageMessageTemplates: boolean;
  canManageCatalog: boolean;
  canManageEvents: boolean;
  canManageGuests: boolean;
  canManageShowcasePlans: boolean;
};

const ROLE_OPTIONS: Array<{ id: AdminUserRole; label: string; hint: string }> = [
  { id: 'USER', label: 'Membre d’organisation', hint: 'Compte rattaché à une organisation cliente.' },
  { id: 'COMMERCIAL', label: 'Commercial plateforme', hint: 'Portefeuille, demandes et commissions.' },
  { id: 'SUPER_ADMIN', label: 'Super Admin', hint: 'Accès complet à la console EventMaster.' },
];

const DELEGATED_RIGHTS: Array<{
  key: keyof AdminCommercialPermissions;
  label: string;
  hint: string;
}> = [
  { key: 'canManageTemplates', label: 'Modèles d’invitation', hint: 'Conception et publication sur la vitrine.' },
  { key: 'canManageMessageTemplates', label: 'Messages automatiques', hint: 'WhatsApp, SMS et e-mail.' },
  { key: 'canManageCatalog', label: 'Catalogue prestataires', hint: 'Salles, offres et matériel.' },
  { key: 'canManageEvents', label: 'Événements plateforme', hint: 'Supervision de toutes les organisations.' },
  { key: 'canManageGuests', label: 'Listes d’invités', hint: 'Suivi, pointage et exports.' },
  { key: 'canManageShowcasePlans', label: 'Plans 2D / 3D vitrine', hint: 'Édition et publication des plans témoins.' },
];

export default function AdminUserFormModal({
  open,
  mode,
  emailLabel,
  submitting,
  name,
  email,
  password,
  role,
  tenantId,
  tenantOptions,
  isEmailVerified,
  phone,
  phoneCountryCode,
  verificationMethod,
  sendNotification = true,
  commissionRate,
  renewalCommissionRate,
  commercialPermissions,
  plan,
  licenseActive,
  durationDays,
  expiresAt,
  complimentary,
  onClose,
  onSubmit,
  setName,
  setEmail,
  setPassword,
  setRole,
  setTenantId,
  setIsEmailVerified,
  setPhone,
  setPhoneCountryCode,
  setVerificationMethod,
  setSendNotification,
  setCommissionRate,
  setRenewalCommissionRate,
  setCommercialPermissions,
  setPlan,
  setLicenseActive,
  setDurationDays,
  setExpiresAt,
  setComplimentary,
}: {
  open: boolean;
  mode: 'create' | 'edit';
  emailLabel?: string;
  submitting: boolean;
  name: string;
  email: string;
  password: string;
  role: AdminUserRole;
  tenantId: string;
  tenantOptions: Array<{ id: string; name: string }>;
  isEmailVerified: boolean;
  phone?: string;
  phoneCountryCode?: string;
  verificationMethod?: AuthOtpMethod;
  sendNotification?: boolean;
  commissionRate: string;
  renewalCommissionRate: string;
  commercialPermissions: AdminCommercialPermissions;
  plan: string;
  licenseActive: boolean;
  durationDays: number;
  expiresAt: string;
  complimentary: boolean;
  onClose: () => void;
  onSubmit: () => Promise<void>;
  setName: (value: string) => void;
  setEmail: (value: string) => void;
  setPassword: (value: string) => void;
  setRole: (value: AdminUserRole) => void;
  setTenantId: (value: string) => void;
  setIsEmailVerified: (value: boolean) => void;
  setPhone?: (value: string) => void;
  setPhoneCountryCode?: (value: string) => void;
  setVerificationMethod?: (value: AuthOtpMethod) => void;
  setSendNotification?: (value: boolean) => void;
  setCommissionRate: (value: string) => void;
  setRenewalCommissionRate: (value: string) => void;
  setCommercialPermissions: React.Dispatch<React.SetStateAction<AdminCommercialPermissions>>;
  setPlan: (value: string) => void;
  setLicenseActive: (value: boolean) => void;
  setDurationDays: (value: number) => void;
  setExpiresAt: (value: string) => void;
  setComplimentary: (value: boolean) => void;
}) {
  const formId = useId();
  const [formError, setFormError] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim()) {
      setFormError('L’adresse e-mail est requise.');
      return;
    }
    if (mode === 'create' && !password) {
      setFormError('Le mot de passe est requis pour un nouvel utilisateur.');
      return;
    }
    setFormError('');
    try {
      await onSubmit();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Impossible d’enregistrer l’utilisateur.');
    }
  };

  return (
    <Modal
      open={open}
      onClose={() => {
        if (!submitting) {
          setFormError('');
          onClose();
        }
      }}
      size="lg"
      title={mode === 'create' ? 'Créer un utilisateur' : 'Modifier l’utilisateur'}
      description={
        mode === 'create'
          ? 'Compte, rôle et licence. Le mot de passe est exigé à la création.'
          : emailLabel
            ? `Compte ${emailLabel}. Laissez le mot de passe vide pour le conserver.`
            : 'Laissez le mot de passe vide pour le conserver.'
      }
      footer={
        <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" disabled={submitting} onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" form={`${formId}-user`} loading={submitting} leftIcon={<Users className="w-4 h-4" />}>
            {mode === 'create' ? 'Créer le compte' : 'Enregistrer'}
          </Button>
        </div>
      }
    >
      <form id={`${formId}-user`} onSubmit={handleSubmit} className="space-y-5">
        {formError ? <Alert variant="error">{formError}</Alert> : null}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Nom complet"
            placeholder="Ex. Jean Dupont"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
          />
          <Input
            label="Adresse e-mail"
            type="email"
            required
            placeholder="jean.dupont@gmail.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </div>

        {setPhone ? (
          <PhoneInput
            id={`${formId}-phone`}
            label="Téléphone (WhatsApp / SMS - optionnel)"
            countryCode={phoneCountryCode || '+243'}
            national={phone || ''}
            onCountryCodeChange={(code) => setPhoneCountryCode?.(code)}
            onNationalChange={(nat) => setPhone?.(nat)}
            hint="Permet d’envoyer le code ou les alertes sur WhatsApp ou SMS en plus de l’e-mail."
          />
        ) : null}

        <PasswordInput
          label={mode === 'create' ? 'Mot de passe' : 'Nouveau mot de passe'}
          required={mode === 'create'}
          placeholder={mode === 'create' ? 'Définir un mot de passe' : 'Laisser vide pour ne pas changer'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={mode === 'create' ? 'new-password' : 'new-password'}
          hint={mode === 'edit' ? 'Vide = mot de passe inchangé.' : undefined}
        />

        <fieldset className="space-y-2">
          <legend className="text-xs font-semibold text-muted">Rôle</legend>
          <div className="grid grid-cols-1 gap-2">
            {ROLE_OPTIONS.map((option) => (
              <label
                key={option.id}
                className={cn(
                  'flex min-h-11 cursor-pointer items-start gap-3 rounded-[var(--radius-button)] border px-3 py-2.5 transition',
                  role === option.id
                    ? 'border-primary bg-primary/5'
                    : 'border-border bg-surface-muted/60 hover:border-primary/40',
                )}
              >
                <input
                  type="radio"
                  name={`${formId}-role`}
                  value={option.id}
                  checked={role === option.id}
                  onChange={() => setRole(option.id)}
                  className="mt-1 accent-primary"
                />
                <span>
                  <span className="block text-sm font-semibold text-foreground">{option.label}</span>
                  <span className="block text-xs text-muted">{option.hint}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        {role === 'COMMERCIAL' ? (
          <div className="space-y-4 rounded-[var(--radius-card)] border border-border bg-surface-muted/40 p-3.5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Input
                label="1er paiement (%)"
                type="number"
                min={0}
                max={100}
                value={commissionRate}
                onChange={(e) => setCommissionRate(e.target.value)}
              />
              <Input
                label="Paiements suivants (%)"
                type="number"
                min={0}
                max={100}
                value={renewalCommissionRate}
                onChange={(e) => setRenewalCommissionRate(e.target.value)}
              />
            </div>
            <p className="text-xs text-muted">Par défaut : 30 % au premier paiement, puis 20 %.</p>

            <div className="space-y-2">
              <p className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
                <Shield className="h-4 w-4 text-primary" aria-hidden />
                Droits délégués
              </p>
              <div className="grid grid-cols-1 gap-2">
                {DELEGATED_RIGHTS.map((right) => (
                  <label
                    key={right.key}
                    className="flex min-h-11 cursor-pointer items-start gap-3 rounded-[var(--radius-button)] border border-border bg-surface px-3 py-2.5"
                  >
                    <input
                      type="checkbox"
                      checked={commercialPermissions[right.key]}
                      onChange={(e) =>
                        setCommercialPermissions((prev) => ({ ...prev, [right.key]: e.target.checked }))
                      }
                      className="mt-1 accent-primary"
                    />
                    <span>
                      <span className="block text-sm font-semibold text-foreground">{right.label}</span>
                      <span className="block text-xs text-muted">{right.hint}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {role !== 'SUPER_ADMIN' ? (
          <div className="space-y-1.5">
            <label htmlFor={`${formId}-tenant`} className="block text-xs font-semibold text-muted">
              Organisation
            </label>
            <select
              id={`${formId}-tenant`}
              value={tenantId}
              onChange={(e) => setTenantId(e.target.value)}
              className="block min-h-11 w-full rounded-[var(--radius-button)] border border-border bg-surface-muted px-3.5 py-2.5 text-sm font-medium text-foreground focus:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/25"
            >
              <option value="">Aucun rattachement</option>
              {tenantOptions.map((tenant) => (
                <option key={tenant.id} value={tenant.id}>
                  {tenant.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <div className="space-y-3 rounded-[var(--radius-card)] border border-border bg-surface-muted/40 p-3.5">
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
            <CreditCard className="h-4 w-4 text-primary" aria-hidden />
            Abonnement et licence
          </p>
          <div className="space-y-1.5">
            <label htmlFor={`${formId}-plan`} className="block text-xs font-semibold text-muted">
              Forfait attribué
            </label>
            <select
              id={`${formId}-plan`}
              value={plan}
              onChange={(e) => setPlan(e.target.value)}
              className="block min-h-11 w-full rounded-[var(--radius-button)] border border-border bg-surface-muted px-3.5 py-2.5 text-sm font-medium text-foreground focus:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/25"
            >
              <option value="FREE">Essentiel (gratuit)</option>
              <optgroup label="Particuliers (B2C)">
                <option value="PERSONAL_50">Particulier 50</option>
                <option value="PERSONAL_100">Particulier 100</option>
                <option value="PERSONAL_200">Particulier 200</option>
                <option value="PERSONAL_PLUS">Particulier Plus</option>
              </optgroup>
              <optgroup label="Professionnels (B2B)">
                <option value="STANDARD">Business</option>
                <option value="PREMIUM">Premium</option>
                <option value="PREMIUM_PLUS">Premium Plus</option>
                <option value="ENTERPRISE_1">Enterprise 1</option>
                <option value="ENTERPRISE_2">Enterprise 2</option>
                <option value="ENTERPRISE_3">Enterprise 3</option>
              </optgroup>
              <optgroup label="Marketplace">
                <option value="VENUE">Salle uniquement</option>
                <option value="SERVICE">Prestataire uniquement</option>
                <option value="CATALOG">Salle et prestation</option>
              </optgroup>
            </select>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              label="Durée (jours)"
              type="number"
              min={1}
              value={String(durationDays)}
              onChange={(e) => setDurationDays(Number.parseInt(e.target.value, 10) || 30)}
            />
            <Input
              label="Date de fin"
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              hint="Optionnel si la durée suffit."
            />
          </div>
          <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-medium text-foreground">
            <input
              type="checkbox"
              checked={licenseActive}
              onChange={(e) => setLicenseActive(e.target.checked)}
              className="accent-primary"
            />
            Licence contractuelle active
          </label>
          <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-medium text-foreground">
            <input
              type="checkbox"
              checked={complimentary}
              onChange={(e) => setComplimentary(e.target.checked)}
              className="accent-primary"
            />
            Accès gracieux offert
          </label>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-[var(--radius-card)] border border-border bg-surface-muted/40 px-3.5 py-3">
          <div>
            <p className="text-sm font-semibold text-foreground">E-mail déjà confirmé</p>
            <p className="text-xs text-muted">
              {isEmailVerified
                ? 'Le compte sera directement actif sans exiger de code de validation.'
                : 'L’utilisateur devra valider son code OTP pour activer son compte.'}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={isEmailVerified}
            aria-label="E-mail confirmé"
            onClick={() => setIsEmailVerified(!isEmailVerified)}
            className={cn(
              'relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
              isEmailVerified ? 'bg-primary-solid' : 'bg-border',
            )}
          >
            <span
              className={cn(
                'pointer-events-none inline-block h-6 w-6 rounded-full bg-white shadow transition',
                isEmailVerified ? 'translate-x-5' : 'translate-x-0',
              )}
            />
          </button>
        </div>

        {mode === 'create' && setSendNotification && (
          <div className="flex items-center justify-between gap-3 rounded-[var(--radius-card)] border border-primary/25 bg-primary/5 px-3.5 py-3">
            <div>
              <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <Mail className="w-4 h-4 text-primary" />
                Envoyer un e-mail de confirmation
              </p>
              <p className="text-xs text-muted mt-0.5">
                {isEmailVerified
                  ? 'Un e-mail de bienvenue avec identifiants et lien de connexion sera envoyé.'
                  : 'Un code de confirmation (OTP) sera immédiatement envoyé à l’adresse e-mail.'}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={sendNotification}
              aria-label="Envoyer un e-mail de confirmation"
              onClick={() => setSendNotification(!sendNotification)}
              className={cn(
                'relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                sendNotification ? 'bg-primary-solid' : 'bg-border',
              )}
            >
              <span
                className={cn(
                  'pointer-events-none inline-block h-6 w-6 rounded-full bg-white shadow transition',
                  sendNotification ? 'translate-x-5' : 'translate-x-0',
                )}
              />
            </button>
          </div>
        )}
      </form>
    </Modal>
  );
}
