'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import {
  Calendar, MessageSquare, Table, Sparkles,
} from 'lucide-react';
import { AuthSplitLayout } from '@/components/AuthSplitLayout';
import { Button, Alert, Card, IdentifierInput, identifierValue } from '@/components/ui';
import type { IdentifierMode } from '@/components/ui';
import { DEFAULT_PHONE_COUNTRY_CODE } from '@/lib/phone';
import { usePlatformSite } from '@/context/PlatformSiteContext';
import {
  allowsAuthOtpChoice,
  authOtpMethodOptions,
  defaultAuthOtpMethod,
  defaultPhoneAuthOtpMethod,
  phoneAuthOtpMethods,
  type AuthOtpMethod,
  type PhoneAuthOtpMethod,
} from '@/lib/authOtpChannels';

const FEATURES = [
  { icon: Calendar, title: "Gestion d'événements et réponses à l’invitation", desc: 'Invitations par e-mail ou WhatsApp, suivi des réponses en temps réel.' },
  { icon: Table, title: 'Planificateur de table', desc: 'Placement intuitif par glisser-déposer sur un plan 2D.' },
  { icon: MessageSquare, title: "Fil d'actualité & livre d'or", desc: 'Photos, vidéos et commentaires dans un espace privé.' },
  { icon: Sparkles, title: 'Statistiques & analyses', desc: 'Régimes alimentaires, réponses et exports en un clic.' },
];

export default function AskResetPasswordPage() {
  const { site } = usePlatformSite();
  const authChannels = site.authOtpChannels;
  const allowsEmail = authOtpMethodOptions(authChannels).includes('EMAIL');
  const allowedPhoneMethods = phoneAuthOtpMethods(authChannels);

  const initialMode: IdentifierMode = !allowsEmail && allowedPhoneMethods.length > 0 ? 'phone' : 'email';
  const [mode, setMode] = useState<IdentifierMode>(initialMode);
  const [email, setEmail] = useState('');
  const [phoneCountryCode, setPhoneCountryCode] = useState(DEFAULT_PHONE_COUNTRY_CODE);
  const [phoneNational, setPhoneNational] = useState('');
  const [method, setMethod] = useState<AuthOtpMethod>(() => {
    if (initialMode === 'phone') {
      return defaultPhoneAuthOtpMethod(authChannels);
    }
    return defaultAuthOtpMethod(authChannels);
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (mode === 'phone') {
      const pMethods = phoneAuthOtpMethods(authChannels);
      if (!pMethods.includes(method as PhoneAuthOtpMethod)) {
        setMethod(defaultPhoneAuthOtpMethod(authChannels));
      }
    } else {
      setMethod('EMAIL');
    }
  }, [authChannels, mode]);

  const handleModeChange = (next: IdentifierMode) => {
    setMode(next);
    if (next === 'phone') {
      setMethod(defaultPhoneAuthOtpMethod(authChannels));
    } else {
      setMethod('EMAIL');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    const identifier = identifierValue(mode, email, phoneCountryCode, phoneNational);
    if (!identifier) {
      setError(mode === 'email' ? 'Saisissez votre adresse e-mail.' : 'Saisissez votre numéro de téléphone.');
      return;
    }
    setLoading(true);

    try {
      const deliveryMethod = mode === 'phone' ? method : 'EMAIL';
      const response = await api.post('/auth/forgot-password', { email: identifier, method: deliveryMethod });
      setSuccess(response.message || 'Si le compte existe, un lien de réinitialisation a été envoyé.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue lors de la demande de réinitialisation.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthSplitLayout
      title="Récupérez l'accès à votre compte en toute sécurité."
      description="Recevez un lien de réinitialisation sur le même canal que votre identifiant (e-mail, WhatsApp ou SMS)."
      features={FEATURES}
      backHref="/login"
      backLabel="Retour à la connexion"
    >
      <Card padding="lg" className="border-border shadow-sm">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-foreground tracking-tight">Mot de passe oublié</h2>
          <p className="mt-2 text-sm text-muted">
            Choisissez e-mail ou téléphone : le lien part sur ce même moyen.
          </p>
        </div>

        {error && <Alert variant="error" className="mb-5">{error}</Alert>}

        {success ? (
          <div className="space-y-4">
            <Alert variant="success" title="Demande envoyée !">{success}</Alert>
            <Link href="/login">
              <Button fullWidth>Retourner à la connexion</Button>
            </Link>
          </div>
        ) : (
          <form className="space-y-5" onSubmit={handleSubmit}>
            <IdentifierInput
              mode={mode}
              onModeChange={handleModeChange}
              email={email}
              onEmailChange={setEmail}
              countryCode={phoneCountryCode}
              national={phoneNational}
              onCountryCodeChange={setPhoneCountryCode}
              onNationalChange={setPhoneNational}
              authChannels={authChannels}
              selectedPhoneMethod={method === 'SMS' ? 'SMS' : 'WHATSAPP'}
              onPhoneMethodChange={(next) => setMethod(next)}
              showPhoneMethodSelector={true}
            />

            <p className="text-xs text-muted">
              Lien envoyé {method === 'WHATSAPP' ? 'sur WhatsApp' : method === 'SMS' ? 'par SMS' : 'par e-mail'}
              {allowsAuthOtpChoice(authChannels)
                ? mode === 'phone'
                  ? ` (numéro choisi via ${method === 'SMS' ? 'SMS' : 'WhatsApp'}).`
                  : ' (adresse e-mail choisie).'
                : ' (réglage plateforme).'}
            </p>

            <Button type="submit" fullWidth size="lg" loading={loading}>
              {method === 'WHATSAPP'
                ? 'Envoyer le lien par WhatsApp'
                : method === 'SMS'
                  ? 'Envoyer le lien par SMS'
                  : 'Envoyer le lien par e-mail'}
            </Button>
          </form>
        )}
      </Card>
    </AuthSplitLayout>
  );
}
