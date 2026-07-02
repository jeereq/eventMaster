'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';

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

  return (
    <Modal
      open={open}
      onClose={() => {}}
      dismissible={false}
      title={
        <span className="flex items-center gap-3">
          <span className="p-2 rounded-xl bg-indigo-600 text-white shrink-0">
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
        <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
          <input
            type="checkbox"
            checked={acceptTerms}
            onChange={(e) => setAcceptTerms(e.target.checked)}
            className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
          />
          <span className="text-sm text-slate-700 dark:text-slate-300">
            J&apos;accepte les{' '}
            <Link href="/terms" target="_blank" className="text-indigo-600 font-semibold hover:underline">
              conditions d&apos;utilisation
            </Link>{' '}
            (version {process.env.NEXT_PUBLIC_TERMS_VERSION || '1.0'}).
          </span>
        </label>

        <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
          <input
            type="checkbox"
            checked={acceptPrivacy}
            onChange={(e) => setAcceptPrivacy(e.target.checked)}
            className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
          />
          <span className="text-sm text-slate-700 dark:text-slate-300">
            J&apos;accepte la{' '}
            <Link href="/privacy" target="_blank" className="text-indigo-600 font-semibold hover:underline">
              politique de confidentialité
            </Link>{' '}
            (version {process.env.NEXT_PUBLIC_PRIVACY_VERSION || '1.0'}).
          </span>
        </label>
      </div>
    </Modal>
  );
}
