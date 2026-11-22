'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CreditCard } from '@/components/icons';
import { api } from '@/lib/api';
import { Alert, Button, Input, Modal } from '@/components/ui';
import { cn } from '@/lib/cn';
import { segmentedItem, SEGMENTED_TRACK } from '@/components/ui/segmented';
import { formatFc } from '@/config/landingPricing';

interface SmsCreditPack {
  id: string;
  smsCount: number;
  priceFc: number;
}

interface SmsCreditSummary {
  period: string;
  included: number;
  used: number;
  includedRemaining: number;
  creditBalance: number;
  nextExpiry: string | null;
  available: number;
  validityMonths: number;
  packs: SmsCreditPack[];
  onlinePaymentAvailable: boolean;
}

const nf = (value: number) => value.toLocaleString('fr-FR');

function periodLabel(period: string) {
  return period.includes('-Q') ? 'ce trimestre' : 'ce mois-ci';
}

/** Quota de SMS inclus, solde de crédits achetés et recharge par Mobile Money ou carte. */
export default function SmsCreditsPanel() {
  const searchParams = useSearchParams();
  const [summary, setSummary] = useState<SmsCreditSummary | null>(null);
  const [open, setOpen] = useState(false);
  const [packId, setPackId] = useState<string>('sms_100');
  const [method, setMethod] = useState<'mobile' | 'card'>('mobile');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [watchId, setWatchId] = useState<string | null>(() =>
    searchParams.get('smsCredits') === 'return' ? searchParams.get('orderId') : null,
  );
  const [notice, setNotice] = useState<{ tone: 'info' | 'success' | 'error'; text: string } | null>(() => {
    const state = searchParams.get('smsCredits');
    if (state === 'return') return { tone: 'info', text: 'Paiement des SMS en cours de vérification…' };
    if (state === 'canceled') return { tone: 'info', text: 'Paiement des SMS interrompu.' };
    return null;
  });

  const load = useCallback(async () => {
    try {
      const data = await api.get('/billing/sms-credits');
      setSummary(data.summary as SmsCreditSummary);
    } catch {
      setSummary(null);
    }
  }, []);
  const loadRef = useRef(load);
  useEffect(() => {
    loadRef.current = load;
  });

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!watchId) return;
    let stopped = false;
    let attempts = 0;
    const tick = async () => {
      if (stopped) return;
      attempts += 1;
      try {
        const data = await api.get(`/billing/sms-credits/orders/${watchId}`);
        if (data.status === 'PAID') {
          setNotice({ tone: 'success', text: `${nf(data.order?.smsCount ?? 0)} SMS ajoutés à votre solde. Merci !` });
          setWatchId(null);
          await loadRef.current();
          return;
        }
        if (data.status === 'FAILED') {
          setNotice({ tone: 'error', text: 'Le paiement a échoué ou a été refusé. Vous pouvez réessayer.' });
          setWatchId(null);
          return;
        }
      } catch {
        /* nouvel essai */
      }
      if (attempts >= 40) {
        setNotice({ tone: 'info', text: 'Paiement toujours en attente. Les SMS seront ajoutés dès que l’opérateur le confirme.' });
        setWatchId(null);
        return;
      }
      window.setTimeout(tick, 4000);
    };
    const first = window.setTimeout(tick, 3000);
    return () => {
      stopped = true;
      window.clearTimeout(first);
    };
  }, [watchId]);

  if (!summary) return null;

  const pack = summary.packs.find((p) => p.id === packId) ?? summary.packs[0];
  const lowShare = summary.included > 0 ? summary.used / summary.included : 0;
  const exhausted = summary.available <= 0;

  const submit = async () => {
    setSubmitting(true);
    setError('');
    try {
      const data = await api.post('/billing/sms-credits/checkout', {
        packId,
        paymentMethod: method,
        phone: method === 'mobile' ? phone : undefined,
      });
      if (data.paymentMethod === 'card' && data.redirectUrl) {
        window.location.href = data.redirectUrl;
        return;
      }
      setOpen(false);
      setNotice({ tone: 'info', text: data.message || 'Validez le paiement sur votre téléphone.' });
      setWatchId(data.orderId);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Impossible de lancer le paiement.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="pt-4 border-t border-border space-y-3" aria-labelledby="billing-sms-credits">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-0.5">
          <h3 id="billing-sms-credits" className="text-sm font-semibold text-foreground">SMS</h3>
          <p className="text-xs text-muted">
            {nf(summary.used)} / {nf(summary.included)} SMS inclus utilisés {periodLabel(summary.period)}
            {summary.creditBalance > 0 ? ` · ${nf(summary.creditBalance)} SMS achetés en réserve` : ''}
          </p>
          {summary.creditBalance > 0 && summary.nextExpiry ? (
            <p className="text-xs text-muted">
              Crédits valables jusqu’au {new Date(summary.nextExpiry).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}.
            </p>
          ) : null}
        </div>
        <Button
          size="sm"
          variant={exhausted || lowShare >= 0.8 ? 'primary' : 'secondary'}
          loading={Boolean(watchId)}
          leftIcon={<CreditCard className="w-3.5 h-3.5" />}
          disabled={!summary.onlinePaymentAvailable}
          onClick={() => {
            setOpen(true);
            setError('');
          }}
        >
          Recharger des SMS
        </Button>
      </div>
      {summary.included > 0 ? (
        <div className="h-1.5 rounded-full bg-border overflow-hidden" role="progressbar" aria-valuemin={0} aria-valuemax={summary.included} aria-valuenow={summary.used} aria-label="SMS inclus utilisés">
          <div className={cn('h-full rounded-full', lowShare >= 0.8 ? 'bg-amber-500' : 'bg-primary')} style={{ width: `${Math.min(100, Math.round(lowShare * 100))}%` }} />
        </div>
      ) : null}
      {exhausted ? (
        <Alert variant="error">
          Vos SMS inclus et vos crédits sont épuisés. Les invitations continuent par WhatsApp et e-mail ; rechargez pour reprendre les envois par SMS.
        </Alert>
      ) : lowShare >= 0.8 && summary.creditBalance === 0 ? (
        <Alert variant="info">Plus de 80 % de vos SMS inclus sont utilisés. Rechargez avant d’être bloqué.</Alert>
      ) : null}
      {!summary.onlinePaymentAvailable ? <p className="text-xs text-muted">La recharge en ligne est momentanément indisponible.</p> : null}
      {notice ? <Alert variant={notice.tone}>{notice.text}</Alert> : null}

      <Modal
        open={open}
        onClose={() => {
          if (!submitting) setOpen(false);
        }}
        title="Recharger des SMS"
        description={`Les crédits sont valables ${summary.validityMonths} mois et non remboursables. Ils s’utilisent après vos SMS inclus.`}
        size="md"
        footer={(
          <div className="flex items-center justify-end gap-2 w-full">
            <Button variant="ghost" disabled={submitting} onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button loading={submitting} disabled={!pack || (method === 'mobile' && !phone.trim())} onClick={submit}>
              Payer {pack ? formatFc(pack.priceFc) : ''}
            </Button>
          </div>
        )}
      >
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2" role="radiogroup" aria-label="Pack de SMS">
            {summary.packs.map((p) => (
              <button
                key={p.id}
                type="button"
                role="radio"
                aria-checked={p.id === packId}
                onClick={() => setPackId(p.id)}
                className={cn(
                  'rounded-[var(--radius-card)] border px-3 py-2 text-left transition-colors',
                  p.id === packId ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40',
                )}
              >
                <span className="block text-sm font-semibold text-foreground">{nf(p.smsCount)} SMS</span>
                <span className="block text-xs text-muted">{formatFc(p.priceFc)}</span>
                <span className="block text-[11px] text-muted">{Math.round(p.priceFc / p.smsCount)} FC le SMS</span>
              </button>
            ))}
          </div>
          <div className={cn('inline-flex', SEGMENTED_TRACK)} role="radiogroup" aria-label="Moyen de paiement">
            <button type="button" role="radio" aria-checked={method === 'mobile'} className={segmentedItem(method === 'mobile', 'px-3 py-1.5 text-xs')} onClick={() => setMethod('mobile')}>
              Mobile Money
            </button>
            <button type="button" role="radio" aria-checked={method === 'card'} className={segmentedItem(method === 'card', 'px-3 py-1.5 text-xs')} onClick={() => setMethod('card')}>
              Carte bancaire
            </button>
          </div>
          {method === 'mobile' ? (
            <Input
              label="Numéro M-Pesa, Orange Money ou Airtel Money"
              placeholder="Ex : 0812345678"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          ) : (
            <p className="text-xs text-muted">Vous serez redirigé vers la page de paiement sécurisée (Visa, Mastercard).</p>
          )}
          {error ? <Alert variant="error">{error}</Alert> : null}
        </div>
      </Modal>
    </div>
  );
}
