'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CreditCard } from 'lucide-react';
import { api } from '@/lib/api';
import { Alert, Button, Input, Modal } from '@/components/ui';
import { cn } from '@/lib/cn';
import { segmentedItem, SEGMENTED_TRACK } from '@/components/ui/segmented';
import { formatFc } from '@/config/landingPricing';

/** Règlement en ligne de la commission due (Mobile Money ou carte), avec suivi du paiement. */
export default function CommissionPayButton({
  commissionDueFc,
  onPaid,
}: {
  commissionDueFc: number;
  onPaid: () => Promise<void> | void;
}) {
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState<'mobile' | 'card'>('mobile');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [watchId, setWatchId] = useState<string | null>(() =>
    searchParams.get('commission') === 'return' ? searchParams.get('paymentId') : null,
  );
  const [notice, setNotice] = useState<{ tone: 'info' | 'success' | 'error'; text: string } | null>(() => {
    const state = searchParams.get('commission');
    if (state === 'return') return { tone: 'info', text: 'Paiement de la commission en cours de vérification…' };
    if (state === 'canceled') return { tone: 'info', text: 'Paiement de la commission interrompu.' };
    return null;
  });
  const onPaidRef = useRef(onPaid);
  useEffect(() => {
    onPaidRef.current = onPaid;
  });

  useEffect(() => {
    if (!watchId) return;
    let stopped = false;
    let attempts = 0;
    const tick = async () => {
      if (stopped) return;
      attempts += 1;
      try {
        const data = await api.get(`/marketplace/commission-payment/${watchId}`);
        if (data.payment?.status === 'PAID') {
          setNotice({ tone: 'success', text: `Commission réglée (${formatFc(data.payment.amountFc)}). Merci !` });
          setWatchId(null);
          await onPaidRef.current();
          return;
        }
        if (data.payment?.status === 'FAILED') {
          setNotice({ tone: 'error', text: 'Le paiement a échoué ou a été refusé. Vous pouvez réessayer.' });
          setWatchId(null);
          return;
        }
      } catch {
        /* nouvel essai */
      }
      if (attempts >= 40) {
        setNotice({ tone: 'info', text: 'Paiement toujours en attente. Il sera pris en compte dès que l’opérateur le confirme.' });
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

  const submit = async () => {
    setSubmitting(true);
    setError('');
    try {
      const data = await api.post('/marketplace/commission-payment', {
        paymentMethod: method,
        phone: method === 'mobile' ? phone : undefined,
      });
      if (data.paymentMethod === 'card' && data.redirectUrl) {
        window.location.href = data.redirectUrl;
        return;
      }
      setOpen(false);
      setNotice({ tone: 'info', text: data.message || 'Validez le paiement sur votre téléphone.' });
      setWatchId(data.paymentId);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Impossible de lancer le paiement.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {commissionDueFc > 0 ? (
        <Button
          size="sm"
          loading={Boolean(watchId)}
          leftIcon={<CreditCard className="w-3.5 h-3.5" />}
          onClick={() => {
            setOpen(true);
            setError('');
          }}
        >
          Régler en ligne
        </Button>
      ) : null}
      {notice ? <Alert variant={notice.tone} className="basis-full">{notice.text}</Alert> : null}

      <Modal
        open={open}
        onClose={() => {
          if (!submitting) setOpen(false);
        }}
        title="Régler la commission"
        description={`Commission due sur vos réservations confirmées : ${formatFc(commissionDueFc)}.`}
        size="md"
        footer={(
          <div className="flex items-center justify-end gap-2 w-full">
            <Button variant="ghost" disabled={submitting} onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button loading={submitting} disabled={method === 'mobile' && !phone.trim()} onClick={submit}>
              Payer {formatFc(commissionDueFc)}
            </Button>
          </div>
        )}
      >
        <div className="space-y-4 py-2">
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
            <p className="text-[11px] text-muted">Vous serez redirigé vers la page de paiement sécurisée (Visa, Mastercard).</p>
          )}
          <p className="text-[11px] text-muted leading-relaxed">
            Dès que le paiement est confirmé, la commission de ces réservations est marquée payée automatiquement.
          </p>
          {error ? <Alert variant="error">{error}</Alert> : null}
        </div>
      </Modal>
    </>
  );
}
