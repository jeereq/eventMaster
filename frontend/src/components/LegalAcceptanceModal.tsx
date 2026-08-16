'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';
import { TERMS_VERSION, PRIVACY_VERSION } from '@/config/legalConfig';

interface LegalAcceptanceModalProps {
  open: boolean;
  title?: string;
  subtitle?: string;
  submitting?: boolean;
  error?: string;
  onAccept: (acceptTerms: boolean, acceptPrivacy: boolean) => void;
}

export default function LegalAcceptanceModal({
  open,
  title = 'Conditions d\'utilisation',
  subtitle = 'Pour accéder à EventMaster, vous devez accepter nos conditions et notre politique de confidentialité.',
  submitting = false,
  error = '',
  onAccept,
}: LegalAcceptanceModalProps) {
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);

  useEffect(() => {
    if (open) {
      setAcceptTerms(false);
      setAcceptPrivacy(false);
    }
  }, [open]);

  return (
    <Modal
      open={open}
      onClose={() => {}}
      dismissible={false}
      containerClassName="z-[200]"
      title={
        <span className="flex items-center gap-3">
          <span className="p-2 rounded-[var(--radius-button)] bg-primary text-white shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </span>
          {title}
        </span>
      }
      description={subtitle}
      size="md"
      footer={
        <Button
          fullWidth
          disabled={!acceptTerms || !acceptPrivacy}
          loading={submitting}
          onClick={() => onAccept(acceptTerms, acceptPrivacy)}
        >
          Continuer
        </Button>
      }
    >
      {error && <Alert variant="error" className="mb-4">{error}</Alert>}

      <div className="space-y-3">
        <label className="flex items-start gap-3 p-3 rounded-[var(--radius-card)] border border-border cursor-pointer hover:bg-surface-muted transition">
          <input
            type="checkbox"
            checked={acceptTerms}
            onChange={(e) => setAcceptTerms(e.target.checked)}
            className="mt-0.5 rounded border-border text-primary focus:ring-primary"
          />
          <span className="text-sm text-foreground">
            J&apos;accepte les{' '}
            <Link href="/terms" target="_blank" className="text-primary font-semibold hover:underline">
              conditions d&apos;utilisation
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
            J&apos;accepte la{' '}
            <Link href="/privacy" target="_blank" className="text-primary font-semibold hover:underline">
              politique de confidentialité
            </Link>{' '}
            (version {PRIVACY_VERSION}).
          </span>
        </label>
      </div>
    </Modal>
  );
}
