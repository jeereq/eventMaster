'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  Calendar, Mail, Lock, User, Building, PartyPopper, Phone, MessageSquare, Table, Sparkles, UserCheck,
} from 'lucide-react';
import { AuthSplitLayout, MethodToggle } from '@/components/AuthSplitLayout';
import { Button, Alert, Input, Card } from '@/components/ui';
import { parseReferralFromSearchParams } from '@/lib/referralLink';
import { usePlatformSite } from '@/context/PlatformSiteContext';

const FEATURES = [
  { icon: Calendar, title: "Gestion d'événements & RSVP", desc: 'Invitations par e-mail ou WhatsApp, suivi des réponses en temps réel.' },
  { icon: Table, title: 'Planificateur de table', desc: 'Placement intuitif par glisser-déposer sur un plan 2D.' },
  { icon: MessageSquare, title: "Fil d'actualité & livre d'or", desc: 'Photos, vidéos et commentaires dans un espace privé.' },
  { icon: Sparkles, title: 'Statistiques & analyses', desc: 'Régimes alimentaires, réponses et exports en un clic.' },
];

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <AuthSplitLayout badge="Inscription SaaS" title="Chargement…" description="" features={FEATURES} backHref="/" backLabel="Retour au site">
          <Card padding="lg" className="shadow-xl animate-pulse h-96">
            <span className="sr-only">Chargement du formulaire d&apos;inscription</span>
          </Card>
        </AuthSplitLayout>
      }
    >
      <RegisterPageContent />
    </Suspense>
  );
}

function RegisterPageContent() {
  const { register } = useAuth();
  const { site, ready } = usePlatformSite();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [tenantName, setTenantName] = useState('');
  const [phone, setPhone] = useState('');
  const [verificationMethod, setVerificationMethod] = useState<'EMAIL' | 'WHATSAPP'>('EMAIL');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  const [referralCode, setReferralCode] = useState('');
  const [referralFromLink, setReferralFromLink] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fromUrl = parseReferralFromSearchParams(searchParams);
    if (fromUrl) {
      setReferralCode(fromUrl);
      setReferralFromLink(true);
    }
  }, [searchParams]);

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
      description={`Rejoignez ${site.platformName} et profitez d'une interface d'invitation immersive et d'outils de placement de table interactifs.`}
      features={FEATURES}
      backHref="/"
      backLabel="Retour au site"
    >
      <Card padding="lg" className="border-border shadow-sm">
        {ready && !site.allowRegistration ? (
          <div className="text-center space-y-4 py-6">
            <h2 className="text-xl font-semibold text-foreground">Inscriptions fermées</h2>
            <p className="text-sm text-muted leading-relaxed">
              Les créations de compte sont temporairement désactivées. Contactez{' '}
              <a href={`mailto:${site.supportEmail}`} className="font-semibold text-primary hover:underline">
                {site.supportEmail}
              </a>{' '}
              pour ouvrir une organisation.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
              <Link href="/contact">
                <Button>Nous contacter</Button>
              </Link>
              <Link href="/login">
                <Button variant="secondary">Se connecter</Button>
              </Link>
            </div>
          </div>
        ) : successMessage ? (
          <div className="text-center space-y-5 py-2">
            <div className="inline-flex items-center justify-center bg-emerald-100 dark:bg-emerald-950/30 p-4 rounded-full text-emerald-600 dark:text-emerald-400">
              {verificationMethod === 'WHATSAPP' ? <MessageSquare className="w-10 h-10" /> : <Mail className="w-10 h-10" />}
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                {verificationMethod === 'WHATSAPP' ? 'Vérifiez votre WhatsApp' : 'Vérifiez votre boîte mail'}
              </h2>
              <p className="text-sm text-muted mt-2">{successMessage}</p>
            </div>
            <Link href="/login">
              <Button fullWidth>Aller à la connexion</Button>
            </Link>
          </div>
        ) : (
          <>
            <div className="text-center lg:text-left mb-6">
              <div className="inline-flex lg:hidden items-center justify-center bg-primary p-3 rounded-[var(--radius-button)] text-white mb-4">
                <PartyPopper className="w-7 h-7" />
              </div>
              <h2 className="text-2xl font-semibold text-foreground tracking-tight">Créer un compte</h2>
              <p className="mt-2 text-sm text-muted">
                Déjà inscrit ?{' '}
                <Link href="/login" className="font-semibold text-primary hover:underline">
                  Connectez-vous
                </Link>
              </p>
            </div>

            {error && <Alert variant="error" className="mb-5">{error}</Alert>}

            {referralFromLink && referralCode && (
              <div className="mb-5 flex items-start gap-3 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 text-sm">
                <UserCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-emerald-800 dark:text-emerald-300">Parrainage détecté</p>
                  <p className="text-emerald-700 dark:text-emerald-400 text-xs mt-0.5">
                    Code commercial pré-rempli : <span className="font-mono font-bold">{referralCode}</span>
                  </p>
                </div>
              </div>
            )}

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
                hint={
                  referralFromLink
                    ? 'Code transmis par votre commercial — modifiable si besoin.'
                    : 'Si un commercial vous a parrainé, saisissez son code ici.'
                }
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
                  <input type="checkbox" checked={acceptTerms} onChange={(e) => setAcceptTerms(e.target.checked)} className="mt-0.5 rounded text-primary focus:ring-primary" />
                  <span className="text-xs text-slate-600 dark:text-slate-300">
                    J&apos;accepte les <Link href="/terms" target="_blank" className="text-primary font-semibold hover:underline">conditions d&apos;utilisation</Link>.
                  </span>
                </label>
                <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                  <input type="checkbox" checked={acceptPrivacy} onChange={(e) => setAcceptPrivacy(e.target.checked)} className="mt-0.5 rounded text-primary focus:ring-primary" />
                  <span className="text-xs text-slate-600 dark:text-slate-300">
                    J&apos;accepte la <Link href="/privacy" target="_blank" className="text-primary font-semibold hover:underline">politique de confidentialité</Link>.
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
