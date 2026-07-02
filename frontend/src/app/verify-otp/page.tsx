'use client';

import React, { useState, useRef, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  Loader2, AlertCircle, CheckCircle2, Mail, MessageSquare, ArrowLeft, RefreshCw,
} from 'lucide-react';

function VerifyOtpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { verifyOtp, resendOtp } = useAuth();

  const initialEmail = searchParams.get('email') || '';
  const initialMethod = (searchParams.get('method') as 'EMAIL' | 'WHATSAPP') || 'EMAIL';

  const [email] = useState(initialEmail);
  const [verificationMethod, setVerificationMethod] = useState<'EMAIL' | 'WHATSAPP'>(initialMethod);
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (!email) return;
    inputRefs.current[0]?.focus();
  }, [email]);

  const otpValue = digits.join('');

  const handleDigitChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[index] = digit;
    setDigits(next);
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const next = [...digits];
    for (let i = 0; i < 6; i++) next[i] = pasted[i] || '';
    setDigits(next);
    inputRefs.current[Math.min(pasted.length, 5)]?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Adresse e-mail manquante. Recommencez l\'inscription.');
      return;
    }
    if (otpValue.length !== 6) {
      setError('Saisissez les 6 chiffres du code OTP.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await verifyOtp(email, otpValue);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Code invalide.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) return;
    setResending(true);
    setError('');
    setSuccess('');
    try {
      const msg = await resendOtp(email, verificationMethod);
      setSuccess(msg);
      setDigits(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch (err: any) {
      setError(err.message || 'Impossible de renvoyer le code.');
    } finally {
      setResending(false);
    }
  };

  if (!email) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-950">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl border p-8 text-center space-y-4">
          <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
          <p className="text-sm text-slate-600">Aucune adresse e-mail fournie.</p>
          <Link href="/register" className="inline-block text-indigo-600 font-bold text-sm">Retour à l&apos;inscription</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-950">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl p-8 space-y-6">
        <Link href="/register" className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-indigo-600">
          <ArrowLeft className="w-3.5 h-3.5" /> Retour
        </Link>

        <div className="text-center space-y-2">
          <div className="inline-flex p-4 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600">
            {verificationMethod === 'WHATSAPP' ? <MessageSquare className="w-10 h-10" /> : <Mail className="w-10 h-10" />}
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">Validez votre compte</h1>
          <p className="text-sm text-slate-500">
            Saisissez le code à 6 chiffres envoyé {verificationMethod === 'WHATSAPP' ? 'sur WhatsApp' : 'par e-mail'} à{' '}
            <span className="font-bold text-slate-700 dark:text-slate-300">{email}</span>
          </p>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center gap-2 text-xs">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}
        {success && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center gap-2 text-xs">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex justify-center gap-2" onPaste={handlePaste}>
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => { inputRefs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={d}
                onChange={(e) => handleDigitChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                className="w-11 h-14 text-center text-xl font-black border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 bg-slate-50 dark:bg-slate-950"
              />
            ))}
          </div>

          <button
            type="submit"
            disabled={loading || otpValue.length !== 6}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Valider mon compte'}
          </button>
        </form>

        <div className="flex flex-col items-center gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          <p className="text-xs text-slate-500">Code expiré ou non reçu ?</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setVerificationMethod('EMAIL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${verificationMethod === 'EMAIL' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'border-slate-200 text-slate-600'}`}
            >
              E-mail
            </button>
            <button
              type="button"
              onClick={() => setVerificationMethod('WHATSAPP')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${verificationMethod === 'WHATSAPP' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'border-slate-200 text-slate-600'}`}
            >
              WhatsApp
            </button>
          </div>
          <button
            type="button"
            onClick={handleResend}
            disabled={resending}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700 disabled:opacity-50"
          >
            {resending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Renvoyer le code
          </button>
        </div>

        <p className="text-center text-xs text-slate-400">
          Déjà validé ?{' '}
          <Link href="/login" className="text-indigo-600 font-bold hover:underline">Se connecter</Link>
        </p>
      </div>
    </div>
  );
}

export default function VerifyOtpPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>}>
      <VerifyOtpForm />
    </Suspense>
  );
}
