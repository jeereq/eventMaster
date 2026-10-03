'use client';

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  Calendar, Lock, Sparkles, Table, MessageSquare, Ticket, QrCode,
} from 'lucide-react';
import { AuthSplitLayout } from '@/components/AuthSplitLayout';
import { Button, Alert, PasswordInput, Card, IdentifierInput, identifierValue } from '@/components/ui';
import type { IdentifierMode } from '@/components/ui';
import { DEFAULT_PHONE_COUNTRY_CODE } from '@/lib/phone';
import { safeAppPath, isClientReturnPath } from '@/lib/safeAppPath';
import { usePlatformSite } from '@/context/PlatformSiteContext';
import { authOtpMethodOptions } from '@/lib/authOtpChannels';

const FEATURES = [
  { icon: MessageSquare, title: 'Réponses en temps réel', desc: 'Voyez qui a confirmé, relancez les autres sur WhatsApp en un clic.' },
  { icon: Table, title: 'Plan de salle 2D et 3D', desc: 'Placez vos invités à table et partagez la salle avant le jour J.' },
  { icon: QrCode, title: 'Accueil par QR code', desc: 'Votre équipe scanne les invitations à l’entrée, même sur un simple téléphone.' },
  { icon: Calendar, title: 'Tout au même endroit', desc: 'Budget, prestataires, billets et invités : votre événement vous attend.' },
];

const CLIENT_FEATURES = [
  { icon: Ticket, title: 'Billets et inscriptions', desc: 'Retrouvez vos places et votre badge QR dans Mes billets.' },
  { icon: Calendar, title: 'Devis et réservations', desc: 'Envoyez un devis salle ou presta, puis suivez vos demandes.' },
  { icon: Table, title: 'Marketplace', desc: 'Salles, prestataires, matériel & équipements et événements publics — grille, liste ou carte.' },
  { icon: Sparkles, title: 'Compte client', desc: 'Sans abonnement : devis, billets et favoris.' },
];

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <AuthSplitLayout title="Chargement…" description="" features={FEATURES} backHref="/" backLabel="Retour au site">
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
  const { site } = usePlatformSite();
  const authChannels = site.authOtpChannels;
  const searchParams = useSearchParams();
  const nextPath = safeAppPath(searchParams.get('next'));
  const isClientFlow = isClientReturnPath(nextPath);
  const registerHref = nextPath
    ? `/register?kind=CLIENT&next=${encodeURIComponent(nextPath)}`
    : '/register';

  const defaultMode: IdentifierMode =
    !authOtpMethodOptions(authChannels).includes('EMAIL') ? 'phone' : 'email';
  const [mode, setMode] = useState<IdentifierMode>(defaultMode);
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
      title={isClientFlow ? 'Connectez-vous pour retrouver vos demandes et billets.' : 'Heureux de vous revoir !'}
      description={
        isClientFlow
          ? 'Après connexion, vous revenez à la fiche. Un compte est requis pour un devis, une réservation ou un billet.'
          : 'Vos invités, votre salle et vos billets vous attendent là où vous les avez laissés.'
      }
      features={isClientFlow ? CLIENT_FEATURES : FEATURES}
      featureStyle="list"
      backHref="/"
      backLabel="Retour au site"
      hideMobileTitle
    >
      <Card padding="lg" className="border-border shadow-sm">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">Connexion</h1>
          <p className="mt-2 text-sm text-muted">
            Nouveau ici ?{' '}
            <Link href={registerHref} className="font-semibold text-primary hover:underline">
              Créer un compte gratuit
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
            authChannels={authChannels}
          />

          <PasswordInput
            id="password"
            label="Mot de passe"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            leftIcon={<Lock className="w-4 h-4" />}
            labelExtra={
              <Link href="/ask-reset-password" className="text-xs font-semibold text-primary hover:underline min-h-11 inline-flex items-center">
                Mot de passe oublié ?
              </Link>
            }
          />

          <Button type="submit" fullWidth size="lg" loading={loading}>
            Se connecter
          </Button>
        </form>
      </Card>
    </AuthSplitLayout>
  );
}
