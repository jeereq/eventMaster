'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Loader2, ShieldCheck } from 'lucide-react';

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

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-lg w-full p-6 sm:p-8 space-y-5">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-600 text-white shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white">{title}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{subtitle}</p>
          </div>
        </div>

        {error && (
          <div className="text-sm text-rose-600 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-xl px-4 py-3">
            {error}
          </div>
        )}

        <div className="space-y-3">
          <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
            <input
              type="checkbox"
              checked={acceptTerms}
              onChange={(e) => setAcceptTerms(e.target.checked)}
              className="mt-1 rounded text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-sm text-slate-700 dark:text-slate-300">
              J&apos;accepte les{' '}
              <Link href="/terms" target="_blank" className="text-indigo-600 font-bold hover:underline">
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
              className="mt-1 rounded text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-sm text-slate-700 dark:text-slate-300">
              J&apos;accepte la{' '}
              <Link href="/privacy" target="_blank" className="text-indigo-600 font-bold hover:underline">
                politique de confidentialité
              </Link>{' '}
              (version {process.env.NEXT_PUBLIC_PRIVACY_VERSION || '1.0'}).
            </span>
          </label>
        </div>

        <button
          type="button"
          disabled={!acceptTerms || !acceptPrivacy || submitting}
          onClick={() => onAccept(acceptTerms, acceptPrivacy)}
          className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-bold rounded-xl transition flex items-center justify-center gap-2"
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Enregistrement...
            </>
          ) : (
            'Continuer'
          )}
        </button>
      </div>
    </div>
  );
}
