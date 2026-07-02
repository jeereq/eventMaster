'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import {
  Calendar, Mail, Lock, PartyPopper, Sparkles, Table, MessageSquare,
} from 'lucide-react';
import { AuthSplitLayout } from '@/components/AuthSplitLayout';
import { Button, Alert, Input, Card } from '@/components/ui';

const FEATURES = [
  { icon: Calendar, title: "Gestion d'événements & RSVP", desc: 'Invitations par e-mail ou WhatsApp, suivi des réponses en temps réel.' },
  { icon: Table, title: 'Planificateur de table', desc: 'Placement intuitif par glisser-déposer sur un plan 2D.' },
  { icon: MessageSquare, title: "Fil d'actualité & livre d'or", desc: 'Photos, vidéos et commentaires dans un espace privé.' },
  { icon: Sparkles, title: 'Statistiques & analyses', desc: 'Régimes alimentaires, réponses et exports en un clic.' },
];

export default function LoginPage() {
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(identifier, password);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Identifiants incorrects ou problème de connexion.');
      setLoading(false);
    }
  };

  return (
    <AuthSplitLayout
      badge="Plateforme tout-en-un"
      title="Organisez des événements privés inoubliables."
      description="EventMaster simplifie chaque étape de l'organisation de vos mariages, anniversaires, conférences et soirées privées."
      features={FEATURES}
      backHref="/"
      backLabel="Retour au site"
    >
      <Card padding="lg" className="shadow-xl dark:ring-1 dark:ring-slate-800">
        <div className="text-center lg:text-left mb-6">
          <div className="inline-flex lg:hidden items-center justify-center bg-indigo-600 p-3 rounded-2xl text-white mb-4 shadow-lg shadow-indigo-500/20">
            <PartyPopper className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Connexion</h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Ravi de vous revoir !{' '}
            <Link href="/register" className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
              Créez votre compte
            </Link>
          </p>
        </div>

        {error && <Alert variant="error" className="mb-5">{error}</Alert>}

        <form className="space-y-5" onSubmit={handleSubmit}>
          <Input
            label="Email ou numéro WhatsApp"
            id="identifier"
            required
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="nom@exemple.com ou +243…"
            hint="Utilisez votre e-mail d'inscription ou votre numéro WhatsApp."
            leftIcon={<Mail className="w-4 h-4" />}
          />

          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label htmlFor="password" className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                Mot de passe
              </label>
              <Link href="/ask-reset-password" className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
                Mot de passe oublié ?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              leftIcon={<Lock className="w-4 h-4" />}
            />
          </div>

          <Button type="submit" fullWidth size="lg" loading={loading}>
            Se connecter
          </Button>
        </form>
      </Card>
    </AuthSplitLayout>
  );
}
