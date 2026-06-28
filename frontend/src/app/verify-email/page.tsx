'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { CheckCircle, XCircle, Loader2, Calendar, ArrowRight } from 'lucide-react';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Vérification de votre adresse e-mail en cours...');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Jeton de vérification manquant.');
      return;
    }

    const verify = async () => {
      try {
        const res = await api.get(`/auth/verify-email?token=${token}`);
        setStatus('success');
        setMessage(res.message || 'Votre e-mail a été vérifié avec succès !');
      } catch (err: any) {
        setStatus('error');
        setMessage(err.message || 'Le lien de vérification est invalide ou a expiré.');
      }
    };

    verify();
  }, [token]);

  return (
    <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl border border-slate-200 shadow-xl relative z-10 my-8">
      <div className="text-center">
        <div className="inline-flex items-center justify-center bg-indigo-600 p-3 rounded-2xl text-white mb-6 shadow-lg shadow-indigo-100">
          <Calendar className="w-8 h-8" />
        </div>
        
        {status === 'loading' && (
          <div className="space-y-4 py-4">
            <div className="flex justify-center">
              <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Vérification en cours</h2>
            <p className="text-slate-600 text-sm">{message}</p>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-6 py-4">
            <div className="flex justify-center">
              <div className="bg-emerald-100 p-4 rounded-full text-emerald-600 shadow-inner">
                <CheckCircle className="w-12 h-12" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Compte activé !</h2>
            <p className="text-slate-600 text-sm leading-relaxed">{message}</p>
            <div className="pt-4">
              <Link
                href="/login"
                className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl text-base font-semibold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition shadow-lg shadow-indigo-100"
              >
                Se connecter <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-6 py-4">
            <div className="flex justify-center">
              <div className="bg-rose-100 p-4 rounded-full text-rose-600 shadow-inner">
                <XCircle className="w-12 h-12" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Échec de la vérification</h2>
            <p className="text-rose-600 text-sm leading-relaxed">{message}</p>
            <div className="pt-4 space-y-3">
              <Link
                href="/register"
                className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl text-base font-semibold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition shadow-lg shadow-indigo-100"
              >
                Créer un nouveau compte
              </Link>
              <Link
                href="/login"
                className="block text-sm font-semibold text-indigo-600 hover:text-indigo-500 transition"
              >
                Retour à la page de connexion
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))]" />
      <Suspense fallback={
        <div className="max-w-md w-full bg-white p-8 rounded-2xl border border-slate-200 shadow-xl relative z-10 text-center py-12">
          <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Chargement...</p>
        </div>
      }>
        <VerifyEmailContent />
      </Suspense>
    </div>
  );
}
