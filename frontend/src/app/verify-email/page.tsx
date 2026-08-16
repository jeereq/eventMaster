'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { CheckCircle, XCircle, Loader2, Sparkles, Calendar, Table, MessageSquare } from 'lucide-react';
import { AuthSplitLayout } from '@/components/AuthSplitLayout';
import { Button, Alert, Card } from '@/components/ui';

const FEATURES = [
  { icon: Calendar, title: "Gestion d'événements & RSVP", desc: 'Invitations par e-mail ou WhatsApp, suivi des réponses en temps réel.' },
  { icon: Table, title: 'Planificateur de table', desc: 'Placement intuitif par glisser-déposer sur un plan 2D.' },
  { icon: MessageSquare, title: "Fil d'actualité & livre d'or", desc: 'Photos, vidéos et commentaires dans un espace privé.' },
  { icon: Sparkles, title: 'Statistiques & analyses', desc: 'Régimes alimentaires, réponses et exports en un clic.' },
];

function VerifyEmailContent() {
  const searchParams = useSearchParams();
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

        if (res.token && res.user) {
          localStorage.setItem('token', res.token);
          localStorage.setItem('user', JSON.stringify(res.user));
          if (res.tenant) {
            localStorage.setItem('tenant', JSON.stringify(res.tenant));
          }

          setTimeout(() => {
            window.location.href = '/dashboard';
          }, 2500);
        }
      } catch (err: unknown) {
        setStatus('error');
        setMessage(err instanceof Error ? err.message : 'Le lien de vérification est invalide ou a expiré.');
      }
    };

    verify();
  }, [token]);

  return (
    <Card padding="lg" className="border-border shadow-sm text-center">
      {status === 'loading' && (
        <div className="space-y-4 py-4">
          <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
          <h2 className="text-2xl font-semibold text-foreground">Vérification en cours</h2>
          <p className="text-muted text-sm">{message}</p>
        </div>
      )}

      {status === 'success' && (
        <div className="space-y-5 py-2">
          <div className="inline-flex bg-emerald-100 dark:bg-emerald-950/40 p-4 rounded-full text-emerald-600">
            <CheckCircle className="w-12 h-12" />
          </div>
          <h2 className="text-2xl font-semibold text-foreground">Compte activé !</h2>
          <p className="text-muted text-sm leading-relaxed">{message}</p>
          <div className="flex items-center justify-center gap-2 text-primary font-semibold text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            Redirection vers le tableau de bord…
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="space-y-5 py-2">
          <div className="inline-flex bg-rose-100 dark:bg-rose-950/40 p-4 rounded-full text-rose-600">
            <XCircle className="w-12 h-12" />
          </div>
          <h2 className="text-2xl font-semibold text-foreground">Échec de la vérification</h2>
          <Alert variant="error">{message}</Alert>
          <div className="space-y-3 pt-1">
            <Link href="/register">
              <Button fullWidth>Créer un nouveau compte</Button>
            </Link>
            <Link href="/login" className="block text-sm font-semibold text-primary hover:underline">
              Retour à la connexion
            </Link>
          </div>
        </div>
      )}
    </Card>
  );
}

export default function VerifyEmailPage() {
  return (
    <AuthSplitLayout
      badge="Confirmation"
      title="Activez votre compte EventMaster."
      description="Nous vérifions votre adresse e-mail pour sécuriser l'accès à votre organisation."
      features={FEATURES}
      backHref="/login"
      backLabel="Retour à la connexion"
    >
      <Suspense
        fallback={
          <Card padding="lg" className="border-border shadow-sm text-center py-12">
            <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto mb-3" />
            <p className="text-sm text-muted">Chargement…</p>
          </Card>
        }
      >
        <VerifyEmailContent />
      </Suspense>
    </AuthSplitLayout>
  );
}
