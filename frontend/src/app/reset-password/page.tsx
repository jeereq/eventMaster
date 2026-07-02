'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import {
  Calendar, Lock, Loader2, MessageSquare, Table, Sparkles,
} from 'lucide-react';
import { AuthSplitLayout } from '@/components/AuthSplitLayout';
import { Button, Alert, Input, Card } from '@/components/ui';

const FEATURES = [
  { icon: Calendar, title: "Gestion d'événements & RSVP", desc: 'Invitations par e-mail ou WhatsApp, suivi des réponses en temps réel.' },
  { icon: Table, title: 'Planificateur de table', desc: 'Placement intuitif par glisser-déposer sur un plan 2D.' },
  { icon: MessageSquare, title: "Fil d'actualité & livre d'or", desc: 'Photos, vidéos et commentaires dans un espace privé.' },
  { icon: Sparkles, title: 'Statistiques & analyses', desc: 'Régimes alimentaires, réponses et exports en un clic.' },
];

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!token) {
      setError('Le jeton de réinitialisation est manquant ou invalide.');
      return;
    }
    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/auth/reset-password', { token, password });
      setSuccess(response.message || 'Votre mot de passe a été réinitialisé avec succès !');
      setTimeout(() => router.push('/login'), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue lors de la réinitialisation.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <Card padding="lg" className="shadow-xl dark:ring-1 dark:ring-slate-800 space-y-4">
        <Alert variant="error" title="Lien invalide">
          Ce lien de réinitialisation est invalide ou a expiré. Veuillez effectuer une nouvelle demande.
        </Alert>
        <Link href="/ask-reset-password">
          <Button fullWidth>Faire une nouvelle demande</Button>
        </Link>
      </Card>
    );
  }

  return (
    <Card padding="lg" className="shadow-xl dark:ring-1 dark:ring-slate-800">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Nouveau mot de passe</h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Définissez votre nouveau mot de passe sécurisé.
        </p>
      </div>

      {error && <Alert variant="error" className="mb-5">{error}</Alert>}

      {success ? (
        <Alert variant="success" title="Mot de passe réinitialisé !">
          {success} Redirection vers la connexion…
        </Alert>
      ) : (
        <form className="space-y-5" onSubmit={handleSubmit}>
          <Input
            label="Nouveau mot de passe"
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            leftIcon={<Lock className="w-4 h-4" />}
          />
          <Input
            label="Confirmer le mot de passe"
            id="confirmPassword"
            type="password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            leftIcon={<Lock className="w-4 h-4" />}
          />
          <Button type="submit" fullWidth size="lg" loading={loading}>
            Réinitialiser le mot de passe
          </Button>
        </form>
      )}
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <AuthSplitLayout
      badge="Sécurité"
      title="Récupérez l'accès à votre compte."
      description="Définissez un nouveau mot de passe pour reprendre le contrôle de votre espace d'organisation."
      features={FEATURES}
      backHref="/login"
      backLabel="Retour à la connexion"
    >
      <Suspense fallback={
        <Card padding="lg" className="flex flex-col items-center py-12 gap-3">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          <p className="text-xs text-slate-500">Chargement…</p>
        </Card>
      }>
        <ResetPasswordForm />
      </Suspense>
    </AuthSplitLayout>
  );
}
