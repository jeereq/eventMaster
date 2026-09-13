'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Scale } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import {
  COLLECTION_COMMISSION_MAX_PERCENT,
  COLLECTION_COMMISSION_MIN_PERCENT,
  PRIVACY_VERSION,
  REFUND_VERSION,
  TERMS_VERSION,
} from '@/config/legalConfig';

interface CollectionTermsAcceptanceModalProps {
  open: boolean;
  context: 'ticketing' | 'donations' | 'both';
  submitting?: boolean;
  onClose: () => void;
  onAccept: () => void;
}

function contextLabel(context: CollectionTermsAcceptanceModalProps['context']) {
  if (context === 'ticketing') return 'la billetterie en ligne';
  if (context === 'donations') return 'la collecte de dons';
  return 'la billetterie et la collecte de dons';
}

export default function CollectionTermsAcceptanceModal({
  open,
  context,
  submitting = false,
  onClose,
  onAccept,
}: CollectionTermsAcceptanceModalProps) {
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  const [acceptRefund, setAcceptRefund] = useState(false);
  const [acceptCommission, setAcceptCommission] = useState(false);

  useEffect(() => {
    if (open) {
      setAcceptTerms(false);
      setAcceptPrivacy(false);
      setAcceptRefund(false);
      setAcceptCommission(false);
    }
  }, [open]);

  const canConfirm = acceptTerms && acceptPrivacy && acceptRefund && acceptCommission;

  return (
    <Modal
      open={open}
      onClose={onClose}
      containerClassName="z-[220]"
      size="md"
      title={
        <span className="flex items-center gap-3">
          <span className="p-2 rounded-[var(--radius-button)] bg-primary-solid text-primary-foreground shrink-0">
            <Scale className="w-5 h-5" />
          </span>
          Conditions de collecte
        </span>
      }
      description={`Avant d’activer ${contextLabel(context)}, validez les conditions de la plateforme en vigueur.`}
      footer={
        <div className="flex flex-col-reverse sm:flex-row gap-2 w-full">
          <Button type="button" variant="secondary" fullWidth onClick={onClose} disabled={submitting}>
            Annuler
          </Button>
          <Button type="button" fullWidth disabled={!canConfirm} loading={submitting} onClick={onAccept}>
            J’accepte et j’active
          </Button>
        </div>
      }
    >
      <div className="space-y-3">
        <div className="rounded-[var(--radius-card)] border border-primary/20 bg-primary/5 p-3 text-sm text-foreground">
          <p className="font-semibold">Commission de collecte, en plus de l’abonnement</p>
          <p className="text-xs text-muted mt-1 leading-relaxed">
            EventMaster se réserve le droit de prélever une commission de{' '}
            <strong>
              {COLLECTION_COMMISSION_MIN_PERCENT} à {COLLECTION_COMMISSION_MAX_PERCENT}&nbsp;%
            </strong>{' '}
            du montant global collecté (billets et/ou dons), en plus de l’abonnement déjà payé. Les recettes
            reversées sont donc nettes des frais de transaction FlexPay et de cette commission plateforme.
          </p>
        </div>

        <label className="flex items-start gap-3 p-3 rounded-[var(--radius-card)] border border-border cursor-pointer hover:bg-surface-muted transition">
          <input
            type="checkbox"
            checked={acceptCommission}
            onChange={(e) => setAcceptCommission(e.target.checked)}
            className="mt-0.5 rounded border-border text-primary focus:ring-primary"
          />
          <span className="text-sm text-foreground">
            Je comprends et j’accepte la commission de {COLLECTION_COMMISSION_MIN_PERCENT} à{' '}
            {COLLECTION_COMMISSION_MAX_PERCENT}&nbsp;% sur le montant global collecté, en plus de mon
            abonnement.
          </span>
        </label>

        <label className="flex items-start gap-3 p-3 rounded-[var(--radius-card)] border border-border cursor-pointer hover:bg-surface-muted transition">
          <input
            type="checkbox"
            checked={acceptTerms}
            onChange={(e) => setAcceptTerms(e.target.checked)}
            className="mt-0.5 rounded border-border text-primary focus:ring-primary"
          />
          <span className="text-sm text-foreground">
            J’accepte les{' '}
            <Link href="/terms" target="_blank" className="text-primary font-semibold hover:underline">
              conditions d’utilisation
            </Link>{' '}
            (version {TERMS_VERSION}).
          </span>
        </label>

        <label className="flex items-start gap-3 p-3 rounded-[var(--radius-card)] border border-border cursor-pointer hover:bg-surface-muted transition">
          <input
            type="checkbox"
            checked={acceptPrivacy}
            onChange={(e) => setAcceptPrivacy(e.target.checked)}
            className="mt-0.5 rounded border-border text-primary focus:ring-primary"
          />
          <span className="text-sm text-foreground">
            J’accepte la{' '}
            <Link href="/privacy" target="_blank" className="text-primary font-semibold hover:underline">
              politique de confidentialité
            </Link>{' '}
            (version {PRIVACY_VERSION}).
          </span>
        </label>

        <label className="flex items-start gap-3 p-3 rounded-[var(--radius-card)] border border-border cursor-pointer hover:bg-surface-muted transition">
          <input
            type="checkbox"
            checked={acceptRefund}
            onChange={(e) => setAcceptRefund(e.target.checked)}
            className="mt-0.5 rounded border-border text-primary focus:ring-primary"
          />
          <span className="text-sm text-foreground">
            J’accepte la{' '}
            <Link href="/refund" target="_blank" className="text-primary font-semibold hover:underline">
              politique de remboursement
            </Link>{' '}
            (version {REFUND_VERSION}).
          </span>
        </label>
      </div>
    </Modal>
  );
}
