'use client';

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  Calendar, Lock, PartyPopper, Sparkles, Table, MessageSquare, Ticket,
} from 'lucide-react';
import { AuthSplitLayout } from '@/components/AuthSplitLayout';
import { Button, Alert, Input, Card, IdentifierInput, identifierValue } from '@/components/ui';
import type { IdentifierMode } from '@/components/ui';
import { DEFAULT_PHONE_COUNTRY_CODE } from '@/lib/phone';
import { safeAppPath } from '@/lib/safeAppPath';

const FEATURES = [
  { icon: Calendar, title: "Gestion d'événements & RSVP", desc: 'Invitations par e-mail ou WhatsApp, suivi des réponses en temps réel.' },
  { icon: Table, title: 'Planificateur de table', desc: 'Placement intuitif par glisser-déposer sur un plan 2D.' },
  { icon: MessageSquare, title: "Fil d'actualité & livre d'or", desc: 'Photos, vidéos et commentaires dans un espace privé.' },
  { icon: Sparkles, title: 'Statistiques & analyses', desc: 'Régimes alimentaires, réponses et exports en un clic.' },
];

const CLIENT_FEATURES = [
  { icon: Ticket, title: 'Billets et inscriptions', desc: 'Retrouvez vos places et votre badge QR dans Mes billets.' },
  { icon: Calendar, title: 'Agenda public', desc: 'Inscrivez-vous aux événements ouverts ou achetez un billet en ligne.' },
  { icon: Table, title: 'Salles et prestataires', desc: 'Favoris, packs budget et demandes de dates dans le marketplace.' },
  { icon: Sparkles, title: 'Compte client', desc: 'Sans abonnement SaaS — réservez et suivez vos inscriptions.' },
];

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <AuthSplitLayout badge="Connexion" title="Chargement…" description="" features={FEATURES} backHref="/" backLabel="Retour au site">
          <Card padding="lg" className="shadow-xl animate-pulse h-96">
            <span className="sr-only">Chargement du formulaire de connexion</span>
          </Card>
        </AuthSplitLayout>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}

function LoginPageContent() {
  const { login } = useAuth();
  const searchParams = useSearchParams();
  const nextPath = safeAppPath(searchParams.get('next'));
  const isClientFlow = Boolean(nextPath?.startsWith('/evenements') || nextPath?.startsWith('/dashboard/tickets'));
  const registerHref = nextPath
    ? `/register?kind=CLIENT&next=${encodeURIComponent(nextPath)}`
    : '/register';
  const [mode, setMode] = useState<IdentifierMode>('email');
  const [email, setEmail] = useState('');
  const [phoneCountryCode, setPhoneCountryCode] = useState(DEFAULT_PHONE_COUNTRY_CODE);
  const [phoneNational, setPhoneNational] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const identifier = identifierValue(mode, email, phoneCountryCode, phoneNational);
    if (!identifier) {
      setError(mode === 'email' ? 'Saisissez votre adresse e-mail.' : 'Saisissez votre numéro de téléphone.');
      return;
    }
    setLoading(true);
    try {
      await login(identifier, password, { next: nextPath });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Identifiants incorrects ou problème de connexion.');
      setLoading(false);
    }
  };

  return (
    <AuthSplitLayout
      badge={isClientFlow ? 'Compte client' : 'Plateforme tout-en-un'}
      title={isClientFlow ? 'Connectez-vous pour retrouver vos billets.' : 'Organisez des événements privés inoubliables.'}
      description={
        isClientFlow
          ? 'Après connexion, vous revenez à l’événement. Le paiement invité reste possible sans compte.'
          : 'EventMaster simplifie chaque étape de l’organisation de vos mariages, anniversaires, conférences et soirées privées.'
      }
      features={isClientFlow ? CLIENT_FEATURES : FEATURES}
      backHref="/"
      backLabel="Retour au site"
    >
      <Card padding="lg" className="border-border shadow-sm">
        <div className="text-center lg:text-left mb-6">
          <div className="inline-flex lg:hidden items-center justify-center bg-primary p-3 rounded-[var(--radius-button)] text-white mb-4">
            <PartyPopper className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-semibold text-foreground tracking-tight">Connexion</h2>
          <p className="mt-2 text-sm text-muted">
            Ravi de vous revoir !{' '}
            <Link href={registerHref} className="font-semibold text-primary hover:underline">
              Créez votre compte
            </Link>
          </p>
        </div>

        {error && <Alert variant="error" className="mb-5">{error}</Alert>}

        <form className="space-y-5" onSubmit={handleSubmit}>
          <IdentifierInput
            mode={mode}
            onModeChange={setMode}
            email={email}
            onEmailChange={setEmail}
            countryCode={phoneCountryCode}
            national={phoneNational}
            onCountryCodeChange={setPhoneCountryCode}
            onNationalChange={setPhoneNational}
          />

          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label htmlFor="password" className="text-xs font-semibold text-muted">
                Mot de passe
              </label>
              <Link href="/ask-reset-password" className="text-xs font-semibold text-primary hover:underline">
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
