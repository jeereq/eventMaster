'use client';

import React, { useEffect, useState } from 'react';
import { Smartphone } from '@/components/icons';
import { api } from '@/lib/api';
import { Alert, Button, Input, Modal } from '@/components/ui';
import { cn } from '@/lib/cn';
import { segmentedItem, SEGMENTED_TRACK } from '@/components/ui/segmented';

export interface VendorDepositSettings {
  enabled: boolean;
  payoutPhone: string | null;
  payoutPhoneMasked: string | null;
  payoutHolder: string | null;
  platformAvailable: boolean;
  /** Taux propre au prestataire (0 à 1), null : taux par défaut de la plateforme. */
  depositRate?: number | null;
  defaultDepositRate?: number;
}

/**
 * Réglage du prestataire : proposer ou non le paiement de l'acompte en ligne.
 * Désactivé, l'acompte se règle hors plateforme comme avant.
 */
export default function OnlineDepositSettings({
  depositPct,
  commissionPct,
  onSaved,
}: {
  depositPct: number;
  commissionPct: number;
  onSaved?: () => void;
}) {
  const [settings, setSettings] = useState<VendorDepositSettings | null>(null);
  const [canEdit, setCanEdit] = useState(false);
  const [open, setOpen] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [phone, setPhone] = useState('');
  const [holder, setHolder] = useState('');
  const [ratePercent, setRatePercent] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    api
      .get('/marketplace/deposit-settings')
      .then((data) => {
        if (cancelled) return;
        setSettings(data.settings);
        setCanEdit(Boolean(data.canEdit));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  if (!settings) return null;

  const openEditor = () => {
    setEnabled(settings.enabled);
    setPhone(settings.payoutPhone || '');
    setHolder(settings.payoutHolder || '');
    setRatePercent(settings.depositRate != null ? String(Math.round(settings.depositRate * 1000) / 10) : '');
    setError('');
    setOpen(true);
  };

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      const data = await api.put('/marketplace/deposit-settings', {
        enabled,
        payoutPhone: phone,
        payoutHolder: holder,
        depositRatePercent: ratePercent.trim() === '' ? null : ratePercent,
      });
      setSettings(data.settings);
      setOpen(false);
      onSaved?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Impossible d’enregistrer.');
    } finally {
      setSaving(false);
    }
  };

  const active = settings.enabled && settings.platformAvailable;
  const defaultPct = Math.round((settings.defaultDepositRate ?? depositPct / 100) * 1000) / 10;
  const ownPct = settings.depositRate != null ? Math.round(settings.depositRate * 1000) / 10 : defaultPct;

  return (
    <>
      <div className="h-full flex flex-wrap items-center justify-between gap-3 border border-border rounded-[var(--radius-card)] bg-surface px-4 py-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-foreground inline-flex items-center gap-1.5">
            <Smartphone className="w-3.5 h-3.5 text-primary" aria-hidden />
            Acompte {ownPct} % · paiement en ligne {active ? 'activé' : 'désactivé'}
          </p>
          <p className="text-xs text-muted mt-0.5">
            {settings.depositRate != null ? `Taux d’acompte fixé par vous (défaut plateforme : ${defaultPct} %). ` : `Taux d’acompte par défaut de la plateforme. `}
            {active
              ? `Vos clients peuvent payer l’acompte par Mobile Money ou carte, versé sur le ${settings.payoutPhoneMasked}.`
              : settings.enabled && !settings.platformAvailable
                ? 'Activé, mais le paiement en ligne est momentanément indisponible sur la plateforme. L’acompte se règle hors plateforme.'
                : 'Vos clients vous versent l’acompte directement, puis vous le marquez reçu.'}
          </p>
        </div>
        {canEdit ? (
          <Button size="sm" variant="secondary" onClick={openEditor}>
            Modifier
          </Button>
        ) : null}
      </div>

      <Modal
        open={open}
        onClose={() => {
          if (!saving) setOpen(false);
        }}
        title="Acompte"
        description={commissionPct > 0
          ? `Fixez votre taux d’acompte. En ligne, le client paie l’acompte sur EventMaster, la commission (${commissionPct} % du total) est retenue dessus et le reste vous est reversé sur Mobile Money.`
          : 'Fixez votre taux d’acompte. En ligne, le client paie l’acompte sur EventMaster et il vous est reversé sur Mobile Money, sans commission.'}
        size="md"
        footer={(
          <div className="flex items-center justify-end gap-2 w-full">
            <Button variant="ghost" disabled={saving} onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button loading={saving} onClick={save}>
              Enregistrer
            </Button>
          </div>
        )}
      >
        <div className="space-y-4 py-2">
          <div className={cn('inline-flex', SEGMENTED_TRACK)} role="radiogroup" aria-label="Paiement de l’acompte">
            <button type="button" role="radio" aria-checked={!enabled} className={segmentedItem(!enabled, 'px-3 py-1.5 text-xs')} onClick={() => setEnabled(false)}>
              Hors plateforme
            </button>
            <button type="button" role="radio" aria-checked={enabled} className={segmentedItem(enabled, 'px-3 py-1.5 text-xs')} onClick={() => setEnabled(true)}>
              En ligne
            </button>
          </div>
          <Input
            label={`Taux d’acompte en % (5 à 90, vide = ${defaultPct} % par défaut)`}
            placeholder={String(defaultPct)}
            inputMode="decimal"
            value={ratePercent}
            onChange={(e) => setRatePercent(e.target.value)}
          />
          <Input
            label="Numéro Mobile Money qui reçoit les acomptes"
            placeholder="Ex : 0812345678"
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <Input
            label="Nom du titulaire (facultatif)"
            value={holder}
            onChange={(e) => setHolder(e.target.value)}
          />
          <p className="text-xs text-muted leading-relaxed">
            Même activé, vos clients peuvent toujours vous payer directement et vous marquez l’acompte reçu comme avant.
          </p>
          {error ? <Alert variant="error">{error}</Alert> : null}
        </div>
      </Modal>
    </>
  );
}
