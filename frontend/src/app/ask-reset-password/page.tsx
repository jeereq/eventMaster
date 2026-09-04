'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import {
  Calendar, Mail, MessageSquare, Table, Sparkles,
} from 'lucide-react';
import { AuthSplitLayout, MethodToggle } from '@/components/AuthSplitLayout';
import { Button, Alert, Card, IdentifierInput, identifierValue } from '@/components/ui';
import type { IdentifierMode } from '@/components/ui';
import { DEFAULT_PHONE_COUNTRY_CODE } from '@/lib/phone';

const FEATURES = [
  { icon: Calendar, title: "Gestion d'événements & RSVP", desc: 'Invitations par e-mail ou WhatsApp, suivi des réponses en temps réel.' },
  { icon: Table, title: 'Planificateur de table', desc: 'Placement intuitif par glisser-déposer sur un plan 2D.' },
  { icon: MessageSquare, title: "Fil d'actualité & livre d'or", desc: 'Photos, vidéos et commentaires dans un espace privé.' },
  { icon: Sparkles, title: 'Statistiques & analyses', desc: 'Régimes alimentaires, réponses et exports en un clic.' },
];

export default function AskResetPasswordPage() {
  const [mode, setMode] = useState<IdentifierMode>('email');
  const [email, setEmail] = useState('');
  const [phoneCountryCode, setPhoneCountryCode] = useState(DEFAULT_PHONE_COUNTRY_CODE);
  const [phoneNational, setPhoneNational] = useState('');
  const [method, setMethod] = useState<'EMAIL' | 'WHATSAPP'>('EMAIL');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

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
      const response = await api.post('/auth/forgot-password', { email: identifier, method });
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
      description="Recevez un lien de réinitialisation par e-mail ou directement sur WhatsApp."
      features={FEATURES}
      backHref="/login"
      backLabel="Retour à la connexion"
    >
      <Card padding="lg" className="border-border shadow-sm">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-foreground tracking-tight">Mot de passe oublié</h2>
          <p className="mt-2 text-sm text-muted">
            Choisissez e-mail ou téléphone, puis le canal de réception du lien.
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
              onModeChange={setMode}
              email={email}
              onEmailChange={setEmail}
              countryCode={phoneCountryCode}
              national={phoneNational}
              onCountryCodeChange={setPhoneCountryCode}
              onNationalChange={setPhoneNational}
            />

            <MethodToggle
              label="Recevoir le lien par"
              value={method}
              onChange={setMethod}
              options={[
                { value: 'EMAIL' as const, label: 'E-mail', icon: <Mail className="w-4 h-4" /> },
                { value: 'WHATSAPP' as const, label: 'WhatsApp', icon: <MessageSquare className="w-4 h-4" /> },
              ]}
            />

            <Button type="submit" fullWidth size="lg" loading={loading}>
              Envoyer le lien de réinitialisation
            </Button>
          </form>
        )}
      </Card>
    </AuthSplitLayout>
  );
}
