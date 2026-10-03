'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { KeyRound, Mail, MessageSquare } from 'lucide-react';
import { AuthSplitLayout } from '@/components/AuthSplitLayout';
import { Button, Alert, Card, IdentifierInput, identifierValue } from '@/components/ui';
import type { IdentifierMode } from '@/components/ui';
import { DEFAULT_PHONE_COUNTRY_CODE } from '@/lib/phone';
import { usePlatformSite } from '@/context/PlatformSiteContext';
import {
  authOtpMethodOptions,
  defaultAuthOtpMethod,
  defaultPhoneAuthOtpMethod,
  phoneAuthOtpMethods,
  type AuthOtpMethod,
  type PhoneAuthOtpMethod,
} from '@/lib/authOtpChannels';

const STEPS = [
  { icon: Mail, title: 'Indiquez votre identifiant', desc: 'L’e-mail ou le numéro utilisé pour créer votre compte.' },
  { icon: MessageSquare, title: 'Ouvrez le lien reçu', desc: 'Il arrive par e-mail, WhatsApp ou SMS selon votre choix.' },
  { icon: KeyRound, title: 'Choisissez un nouveau mot de passe', desc: 'Vous êtes reconnecté aussitôt, vos événements sont intacts.' },
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
      title="Mot de passe oublié ? Ça arrive."
      description="Trois étapes et vous retrouvez votre compte, sans perdre aucune donnée."
      features={STEPS}
      backHref="/login"
      backLabel="Retour à la connexion"
    >
      <Card padding="lg" className="border-border shadow-sm">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-foreground tracking-tight">Mot de passe oublié</h2>
          <p className="mt-2 text-sm text-muted">
            Le lien de réinitialisation part sur le moyen choisi ci-dessous.
          </p>
        </div>

        {error && <Alert variant="error" className="mb-5">{error}</Alert>}

        {success ? (
          <div className="space-y-4">
            <Alert variant="success" title="Demande envoyée !">{success}</Alert>
            <p className="text-sm text-muted">
              Rien reçu après quelques minutes ? Vérifiez les courriers indésirables ou{' '}
              <button type="button" onClick={() => setSuccess('')} className="font-semibold text-primary hover:underline">
                renvoyez le lien
              </button>
              .
            </p>
            <Button href="/login" fullWidth variant="secondary">Retourner à la connexion</Button>
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
              label="Mon compte utilise"
            />

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
