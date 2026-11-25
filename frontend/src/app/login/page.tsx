'use client';

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { AuthPhotoLayout } from '@/components/AuthPhotoLayout';
import { Button, Alert, PasswordInput, IdentifierInput, identifierValue } from '@/components/ui';
import type { IdentifierMode } from '@/components/ui';
import { DEFAULT_PHONE_COUNTRY_CODE } from '@/lib/phone';
import { safeAppPath, isClientReturnPath } from '@/lib/safeAppPath';
import { usePlatformSite } from '@/context/PlatformSiteContext';
import { authOtpMethodOptions, defaultPhoneAuthOtpMethod, phoneAuthOtpMethods, type PhoneAuthOtpMethod } from '@/lib/authOtpChannels';

/** Identifiants préremplis en développement (frontend/.env.local), jamais en production. */
const DEV_LOGIN =
  process.env.NODE_ENV === 'development'
    ? {
        email: process.env.NEXT_PUBLIC_DEV_LOGIN_EMAIL ?? '',
        password: process.env.NEXT_PUBLIC_DEV_LOGIN_PASSWORD ?? '',
      }
    : { email: '', password: '' };

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <AuthPhotoLayout title="Heureux de vous revoir." description="" cardTitle="Connexion">
          <div className="h-96 rounded-2xl bg-surface-muted animate-pulse">
            <span className="sr-only">Chargement du formulaire de connexion</span>
          </div>
        </AuthPhotoLayout>
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
  const [mode, setMode] = useState<IdentifierMode>(DEV_LOGIN.email ? 'email' : defaultMode);
  const [phoneMethod, setPhoneMethod] = useState<PhoneAuthOtpMethod>(() => defaultPhoneAuthOtpMethod(authChannels));
  const [email, setEmail] = useState(DEV_LOGIN.email);
  const [phoneCountryCode, setPhoneCountryCode] = useState(DEFAULT_PHONE_COUNTRY_CODE);
  const [phoneNational, setPhoneNational] = useState('');
  const [password, setPassword] = useState(DEV_LOGIN.password);
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
    <AuthPhotoLayout
      title={isClientFlow ? 'Vos billets et vos demandes.' : 'Heureux de vous revoir.'}
      cardTitle="Connexion"
      cardSubtitle={
        <>
          Nouveau ici ?{' '}
          <Link href={registerHref} className="font-semibold text-[#a6f04d] hover:underline">
            Créer un compte gratuit
          </Link>
        </>
      }
      description={
        isClientFlow
          ? 'Après connexion, vous revenez à la fiche.'
          : 'Vos invités, votre salle et vos billets vous attendent.'
      }
    >
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
            channelModes
            selectedPhoneMethod={phoneMethod}
            onPhoneMethodChange={setPhoneMethod}
            customPhoneLabel={phoneMethod === 'WHATSAPP' && phoneAuthOtpMethods(authChannels).includes('WHATSAPP') ? 'Numéro WhatsApp' : 'Numéro de téléphone'}
            customPhoneHint=""
            showPhoneRecorded={false}
          />

          <PasswordInput
            id="password"
            label="Mot de passe"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            labelExtra={
              <Link href="/ask-reset-password" className="text-xs font-semibold text-primary hover:underline min-h-11 inline-flex items-center">
                Mot de passe oublié ?
              </Link>
            }
          />

          <Button type="submit" fullWidth size="lg" loading={loading} className="rounded-2xl">
            Se connecter
          </Button>
        </form>
    </AuthPhotoLayout>
  );
}
