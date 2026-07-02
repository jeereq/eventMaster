'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  Calendar, Mail, Lock, User, Building, PartyPopper, Phone, MessageSquare, Table, Sparkles,
} from 'lucide-react';
import { AuthSplitLayout, MethodToggle } from '@/components/AuthSplitLayout';
import { Button, Alert, Input, Card } from '@/components/ui';

const FEATURES = [
  { icon: Calendar, title: "Gestion d'événements & RSVP", desc: 'Invitations par e-mail ou WhatsApp, suivi des réponses en temps réel.' },
  { icon: Table, title: 'Planificateur de table', desc: 'Placement intuitif par glisser-déposer sur un plan 2D.' },
  { icon: MessageSquare, title: "Fil d'actualité & livre d'or", desc: 'Photos, vidéos et commentaires dans un espace privé.' },
  { icon: Sparkles, title: 'Statistiques & analyses', desc: 'Régimes alimentaires, réponses et exports en un clic.' },
];

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [tenantName, setTenantName] = useState('');
  const [phone, setPhone] = useState('');
  const [verificationMethod, setVerificationMethod] = useState<'EMAIL' | 'WHATSAPP'>('EMAIL');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  const [referralCode, setReferralCode] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (verificationMethod === 'WHATSAPP' && !phone) {
      setError('Le numéro de téléphone est obligatoire pour la confirmation par WhatsApp.');
      setLoading(false);
      return;
    }

    if (!acceptTerms || !acceptPrivacy) {
      setError('Vous devez accepter les conditions d\'utilisation et la politique de confidentialité.');
      setLoading(false);
      return;
    }

    try {
      const res = await register(email, password, name, tenantName, phone, verificationMethod, acceptTerms, acceptPrivacy, referralCode || undefined);
      if (res.requiresVerification && res.email) {
        router.push(`/verify-otp?email=${encodeURIComponent(res.email)}&method=${res.verificationMethod || verificationMethod}`);
        return;
      }
      setSuccessMessage(res.message);
      setLoading(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue lors de la création du compte.');
      setLoading(false);
    }
  };

  return (
    <AuthSplitLayout
      badge="Inscription SaaS"
      title="Créez votre espace d'organisation en quelques secondes."
      description="Rejoignez EventMaster et profitez d'une interface d'invitation immersive et d'outils de placement de table interactifs."
      features={FEATURES}
      backHref="/"
      backLabel="Retour au site"
    >
      <Card padding="lg" className="shadow-xl dark:ring-1 dark:ring-slate-800">
        {successMessage ? (
          <div className="text-center space-y-5 py-2">
            <div className="inline-flex items-center justify-center bg-emerald-100 dark:bg-emerald-950/30 p-4 rounded-full text-emerald-600 dark:text-emerald-400">
              {verificationMethod === 'WHATSAPP' ? <MessageSquare className="w-10 h-10" /> : <Mail className="w-10 h-10" />}
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                {verificationMethod === 'WHATSAPP' ? 'Vérifiez votre WhatsApp' : 'Vérifiez votre boîte mail'}
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">{successMessage}</p>
            </div>
            <Link href="/login">
              <Button fullWidth>Aller à la connexion</Button>
            </Link>
          </div>
        ) : (
          <>
            <div className="text-center lg:text-left mb-6">
              <div className="inline-flex lg:hidden items-center justify-center bg-indigo-600 p-3 rounded-2xl text-white mb-4 shadow-lg shadow-indigo-500/20">
                <PartyPopper className="w-7 h-7" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Créer un compte</h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                Déjà inscrit ?{' '}
                <Link href="/login" className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
                  Connectez-vous
                </Link>
              </p>
            </div>

            {error && <Alert variant="error" className="mb-5">{error}</Alert>}

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="Votre nom" id="name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Jean Dupont" leftIcon={<User className="w-4 h-4" />} />
                <Input label="Organisation" id="tenantName" required value={tenantName} onChange={(e) => setTenantName(e.target.value)} placeholder="Dupont Événements" leftIcon={<Building className="w-4 h-4" />} />
              </div>

              <Input label="Adresse email" id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jean@exemple.com" leftIcon={<Mail className="w-4 h-4" />} />

              <Input
                label="Téléphone WhatsApp"
                id="phone"
                type="tel"
                required={verificationMethod === 'WHATSAPP'}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+243812345678"
                hint={verificationMethod === 'WHATSAPP' ? 'Obligatoire pour la validation par WhatsApp.' : 'Optionnel si validation par e-mail.'}
                leftIcon={<Phone className="w-4 h-4" />}
              />

              <Input label="Mot de passe" id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" leftIcon={<Lock className="w-4 h-4" />} />

              <Input
                label="Code parrainage commercial (optionnel)"
                id="referralCode"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                placeholder="EM-XXXX-XXXX"
                hint="Si un commercial vous a parrainé, saisissez son code ici."
              />

              <MethodToggle
                label="Code OTP de validation"
                value={verificationMethod}
                onChange={setVerificationMethod}
                options={[
                  { value: 'EMAIL' as const, label: 'Par e-mail', icon: <Mail className="w-4 h-4" /> },
                  { value: 'WHATSAPP' as const, label: 'Par WhatsApp', icon: <MessageSquare className="w-4 h-4" /> },
                ]}
              />

              <div className="space-y-2">
                <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                  <input type="checkbox" checked={acceptTerms} onChange={(e) => setAcceptTerms(e.target.checked)} className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500" />
                  <span className="text-xs text-slate-600 dark:text-slate-300">
                    J&apos;accepte les <Link href="/terms" target="_blank" className="text-indigo-600 font-semibold hover:underline">conditions d&apos;utilisation</Link>.
                  </span>
                </label>
                <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                  <input type="checkbox" checked={acceptPrivacy} onChange={(e) => setAcceptPrivacy(e.target.checked)} className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500" />
                  <span className="text-xs text-slate-600 dark:text-slate-300">
                    J&apos;accepte la <Link href="/privacy" target="_blank" className="text-indigo-600 font-semibold hover:underline">politique de confidentialité</Link>.
                  </span>
                </label>
              </div>

              <Button type="submit" fullWidth size="lg" loading={loading} disabled={!acceptTerms || !acceptPrivacy}>
                S&apos;inscrire gratuitement
              </Button>
            </form>
          </>
        )}
      </Card>
    </AuthSplitLayout>
  );
}
