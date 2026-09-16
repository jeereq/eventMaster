'use client';

import React, { useId, useState } from 'react';
import { Building2 } from 'lucide-react';
import { Alert, Button, Input, Modal } from '@/components/ui';
import { cn } from '@/lib/cn';
import BillingDiscountFields from '@/components/BillingDiscountFields';
import {
  ANNUAL_DISCOUNT_PERCENT,
  LANDING_PLANS,
  PLAN_IDS,
  durationDaysForPlan,
  durationPresetsForPlan,
  isB2cPlanId,
  type PlanId,
} from '@/config/landingPricing';
import { ACCOUNT_KIND_LABELS, type TenantAccountKind } from '@/lib/marketplace';

export type AdminTenantBillingAction = 'AUTO' | 'RENEWAL' | 'PLAN_CHANGE' | 'ACTIVATION';

function planOptionLabel(id: PlanId): string {
  const name = LANDING_PLANS.find((plan) => plan.id === id)?.ms365Name;
  return name ? `${name} · ${id}` : id;
}

function generateLicenseKey(): string {
  const left = Math.random().toString(36).substring(2, 11).toUpperCase();
  const right = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `LIC-${left}-${right}`;
}

export default function AdminTenantFormModal({
  open,
  mode,
  nameLabel,
  submitting,
  canManageAccountKind,
  name,
  plan,
  accountKind,
  licenseActive,
  licenseExpiresAt,
  licenseKey,
  issueInvoice,
  extendLicense,
  billingAction,
  billingDurationDays,
  discountMode,
  discountPercent,
  approvedAmount,
  catalogPriceFc,
  onClose,
  onSubmit,
  setName,
  setPlan,
  setAccountKind,
  setLicenseActive,
  setLicenseExpiresAt,
  setLicenseKey,
  setIssueInvoice,
  setExtendLicense,
  setBillingAction,
  setBillingDurationDays,
  setDiscountMode,
  setDiscountPercent,
  setApprovedAmount,
}: {
  open: boolean;
  mode: 'create' | 'edit';
  nameLabel?: string;
  submitting: boolean;
  canManageAccountKind: boolean;
  name: string;
  plan: PlanId;
  accountKind: TenantAccountKind;
  licenseActive: boolean;
  licenseExpiresAt: string;
  licenseKey: string;
  issueInvoice: boolean;
  extendLicense: boolean;
  billingAction: AdminTenantBillingAction;
  billingDurationDays: string;
  discountMode: 'percent' | 'amount';
  discountPercent: string;
  approvedAmount: string;
  catalogPriceFc?: number;
  onClose: () => void;
  onSubmit: () => Promise<void>;
  setName: (value: string) => void;
  setPlan: (value: PlanId) => void;
  setAccountKind: (value: TenantAccountKind) => void;
  setLicenseActive: (value: boolean) => void;
  setLicenseExpiresAt: (value: string) => void;
  setLicenseKey: (value: string) => void;
  setIssueInvoice: (value: boolean) => void;
  setExtendLicense: (value: boolean) => void;
  setBillingAction: (value: AdminTenantBillingAction) => void;
  setBillingDurationDays: (value: string) => void;
  setDiscountMode: (value: 'percent' | 'amount') => void;
  setDiscountPercent: (value: string) => void;
  setApprovedAmount: (value: string) => void;
}) {
  const formId = useId();
  const [formError, setFormError] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      setFormError('Le nom de l’organisation est requis.');
      return;
    }
    setFormError('');
    try {
      await onSubmit();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Impossible d’enregistrer l’organisation.');
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
      title={mode === 'create' ? 'Créer une organisation' : 'Modifier l’organisation'}
      description={
        mode === 'create'
          ? 'Définissez le nom, le forfait et la licence de la nouvelle organisation.'
          : nameLabel
            ? `Organisation « ${nameLabel} ».`
            : 'Mettez à jour le forfait, la licence et la facturation.'
      }
      footer={
        <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" disabled={submitting} onClick={onClose}>
            Annuler
          </Button>
          <Button
            type="submit"
            form={`${formId}-tenant`}
            loading={submitting}
            leftIcon={<Building2 className="w-4 h-4" />}
          >
            {mode === 'create' ? 'Créer l’organisation' : 'Enregistrer'}
          </Button>
        </div>
      }
    >
      <form id={`${formId}-tenant`} onSubmit={handleSubmit} className="space-y-4">
        {formError ? <Alert variant="error">{formError}</Alert> : null}

        <Input
          label="Nom de l’organisation"
          required
          maxLength={160}
          placeholder="Ex. ITM Africa, Agence événementielle…"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <div className="space-y-1.5">
          <label htmlFor={`${formId}-plan`} className="block text-xs font-semibold text-muted">
            Forfait d’abonnement
          </label>
          <select
            id={`${formId}-plan`}
            value={plan}
            onChange={(e) => {
              const next = e.target.value as PlanId;
              setPlan(next);
              setBillingDurationDays(String(durationDaysForPlan(next)));
              setDiscountPercent('0');
            }}
            className="block min-h-11 w-full rounded-[var(--radius-button)] border border-border bg-surface-muted px-3.5 py-2.5 text-sm font-medium text-foreground focus:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/25"
          >
            {PLAN_IDS.map((id) => (
              <option key={id} value={id}>
                {planOptionLabel(id)}
              </option>
            ))}
          </select>
        </div>

        {canManageAccountKind ? (
          <div className="space-y-1.5">
            <label htmlFor={`${formId}-kind`} className="block text-xs font-semibold text-muted">
              Type de compte
            </label>
            <select
              id={`${formId}-kind`}
              value={accountKind}
              onChange={(e) => setAccountKind(e.target.value as TenantAccountKind)}
              className="block min-h-11 w-full rounded-[var(--radius-button)] border border-border bg-surface-muted px-3.5 py-2.5 text-sm font-medium text-foreground focus:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/25"
            >
              {(Object.keys(ACCOUNT_KIND_LABELS) as TenantAccountKind[]).map((kind) => (
                <option key={kind} value={kind}>
                  {ACCOUNT_KIND_LABELS[kind]}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted">Seul le Super Admin peut modifier ce champ. Le forfait n’y est plus couplé automatiquement.</p>
          </div>
        ) : null}

        <div className="flex items-center justify-between gap-4 rounded-[var(--radius-card)] border border-border bg-surface-muted/60 px-3.5 py-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">Statut de la licence</p>
            <p className="text-xs text-muted">Activer ou suspendre l’accès de l’organisation.</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={licenseActive}
            aria-label="Statut de la licence de l’organisation"
            onClick={() => setLicenseActive(!licenseActive)}
            className={cn(
              'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary',
              licenseActive ? 'bg-primary' : 'bg-surface-muted border-border',
            )}
          >
            <span
              className={cn(
                'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition',
                licenseActive ? 'translate-x-5' : 'translate-x-0',
              )}
            />
          </button>
        </div>

        <Input
          label="Date d’expiration"
          type="date"
          value={licenseExpiresAt}
          onChange={(e) => setLicenseExpiresAt(e.target.value)}
          hint="Laissez vide pour une licence à durée illimitée."
        />

        <div className="space-y-1.5">
          <label htmlFor={`${formId}-key`} className="block text-xs font-semibold text-muted">
            Clé de licence
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              id={`${formId}-key`}
              type="text"
              placeholder="Générer ou saisir une clé…"
              value={licenseKey}
              onChange={(e) => setLicenseKey(e.target.value)}
              className="block min-h-11 w-full rounded-[var(--radius-button)] border border-border bg-surface-muted px-3.5 py-2.5 font-mono text-sm text-foreground placeholder:text-muted focus:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/25"
            />
            <Button type="button" variant="secondary" onClick={() => setLicenseKey(generateLicenseKey())}>
              Générer
            </Button>
          </div>
        </div>

        {mode === 'edit' && plan !== 'FREE' ? (
          <div className="space-y-4 rounded-[var(--radius-card)] border border-primary/20 bg-primary/5 p-3.5">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">Facturation</p>
                <p className="text-xs text-muted">Renouvellement ou changement de forfait.</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={issueInvoice}
                aria-label="Émettre une facture"
                onClick={() => setIssueInvoice(!issueInvoice)}
                className={cn(
                  'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                  issueInvoice ? 'bg-primary' : 'bg-surface-muted border-border',
                )}
              >
                <span
                  className={cn(
                    'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition',
                    issueInvoice ? 'translate-x-5' : 'translate-x-0',
                  )}
                />
              </button>
            </div>

            {issueInvoice ? (
              <>
                <div className="space-y-1.5">
                  <label htmlFor={`${formId}-billing-action`} className="block text-xs font-semibold text-muted">
                    Type d’opération
                  </label>
                  <select
                    id={`${formId}-billing-action`}
                    value={billingAction}
                    onChange={(e) => setBillingAction(e.target.value as AdminTenantBillingAction)}
                    className="block min-h-11 w-full rounded-[var(--radius-button)] border border-border bg-surface px-3.5 py-2.5 text-sm font-medium text-foreground focus:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/25"
                  >
                    <option value="AUTO">Automatique (selon changement)</option>
                    <option value="RENEWAL">Renouvellement</option>
                    <option value="PLAN_CHANGE">Changement de forfait</option>
                    <option value="ACTIVATION">Activation</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted">Durée (jours)</p>
                    <div className="flex flex-wrap gap-1.5">
                      {durationPresetsForPlan(plan).map((preset) => {
                        const selected = Number(billingDurationDays) === preset.days;
                        return (
                          <button
                            key={preset.days}
                            type="button"
                            onClick={() => {
                              setBillingDurationDays(String(preset.days));
                              setDiscountMode('percent');
                              setDiscountPercent(preset.annual ? String(ANNUAL_DISCOUNT_PERCENT) : '0');
                              setApprovedAmount('');
                            }}
                            className={cn(
                              'min-h-9 rounded-[var(--radius-button)] border px-2.5 py-1 text-xs font-semibold transition',
                              selected
                                ? 'border-primary-solid bg-primary-solid text-primary-foreground'
                                : 'border-border bg-surface text-muted hover:text-foreground',
                            )}
                          >
                            {preset.label}
                            {preset.annual ? ` · −${ANNUAL_DISCOUNT_PERCENT} %` : ''}
                          </button>
                        );
                      })}
                    </div>
                    <Input
                      type="number"
                      min={1}
                      value={billingDurationDays}
                      onChange={(e) => setBillingDurationDays(e.target.value)}
                      aria-label="Durée en jours"
                    />
                    {Number(billingDurationDays) === 365 ? (
                      <p className="text-xs font-medium text-primary">
                        Paiement annuel : catalogue {isB2cPlanId(plan) ? '4 trimestres' : '12 mois'} puis −
                        {ANNUAL_DISCOUNT_PERCENT} % prérempli.
                      </p>
                    ) : null}
                    {isB2cPlanId(plan) && Number(billingDurationDays) === 90 ? (
                      <p className="text-xs text-muted">Période de base Particulier : trimestre 90 jours.</p>
                    ) : null}
                  </div>
                  <label className="flex min-h-11 cursor-pointer items-center gap-2 text-xs font-semibold text-muted sm:items-end sm:pb-2">
                    <input
                      type="checkbox"
                      checked={extendLicense}
                      onChange={(e) => setExtendLicense(e.target.checked)}
                      className="accent-primary"
                    />
                    Prolonger la licence
                  </label>
                </div>

                <BillingDiscountFields
                  planId={plan}
                  catalogPriceFc={catalogPriceFc}
                  durationDays={parseInt(billingDurationDays, 10) || durationDaysForPlan(plan)}
                  discountMode={discountMode}
                  onDiscountModeChange={setDiscountMode}
                  discountPercent={discountPercent}
                  onDiscountPercentChange={setDiscountPercent}
                  approvedAmount={approvedAmount}
                  onApprovedAmountChange={setApprovedAmount}
                  compact
                />
                <p className="text-xs text-muted">Facture au propriétaire et managers. Commerciaux liés informés par e-mail.</p>
              </>
            ) : null}
          </div>
        ) : null}
      </form>
    </Modal>
  );
}
