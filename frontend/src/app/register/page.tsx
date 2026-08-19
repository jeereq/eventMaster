'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
 Calendar, Mail, Lock, User, Building, PartyPopper, Phone, MessageSquare, Table, Sparkles, UserCheck,
} from 'lucide-react';
import { AuthSplitLayout, MethodToggle } from '@/components/AuthSplitLayout';
import { Button, Alert, Input, Card, PhoneInput } from '@/components/ui';
import { parseReferralFromSearchParams } from '@/lib/referralLink';
import { usePlatformSite } from '@/context/PlatformSiteContext';
import { interpolateRates } from '@/lib/platformRates';
import { DEFAULT_PHONE_COUNTRY_CODE, composeE164 } from '@/lib/phone';
import { ACCOUNT_KIND_DESCRIPTIONS, ACCOUNT_KIND_LABELS, type TenantAccountKind } from '@/lib/marketplace';
import { safeAppPath, isClientReturnPath } from '@/lib/safeAppPath';

const FEATURES = [
 { icon: Calendar, title: 'Invitations & RSVP', desc: 'Le premier message n’envoie que le lien RSVP. PDF, plan et GPS après acceptation (Premium 1+).' },
 { icon: Table, title: 'Plan de table 2D', desc: 'Placement glisser-déposer. Liez la salle à l’événement pour importer le plan.' },
 { icon: MessageSquare, title: 'Protocole QR web', desc: 'Scan du badge dans le navigateur le jour J. L’app native n’est pas encore déployée.' },
 { icon: Sparkles, title: 'Marketplace & packs', desc: 'Salles, métiers, locations. Favoris, 3 packs budget, acompte {depositPercent} % hors plateforme.' },
];

function featuresForSite(site?: Parameters<typeof interpolateRates>[1]) {
  return FEATURES.map((item) => ({ ...item, desc: interpolateRates(item.desc, site) }));
}

export default function RegisterPage() {
 return (
 <Suspense
 fallback={
 <AuthSplitLayout badge="Inscription" title="Chargement…" description="" features={featuresForSite()} backHref="/" backLabel="Retour au site">
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
 const [phoneCountryCode, setPhoneCountryCode] = useState(DEFAULT_PHONE_COUNTRY_CODE);
 const [phoneNational, setPhoneNational] = useState('');
 const [verificationMethod, setVerificationMethod] = useState<'EMAIL' | 'WHATSAPP'>('EMAIL');
 const [acceptTerms, setAcceptTerms] = useState(false);
 const [acceptPrivacy, setAcceptPrivacy] = useState(false);
 const [referralCode, setReferralCode] = useState('');
 const [referralFromLink, setReferralFromLink] = useState(false);
 const [accountKind, setAccountKind] = useState<TenantAccountKind>('ORGANIZER');
 const [error, setError] = useState('');
 const [successMessage, setSuccessMessage] = useState('');
 const [loading, setLoading] = useState(false);
 const nextPath = safeAppPath(searchParams.get('next'));
 const isClientFlow = accountKind === 'CLIENT' || isClientReturnPath(nextPath);

 useEffect(() => {
 const fromUrl = parseReferralFromSearchParams(searchParams);
 if (fromUrl) {
 setReferralCode(fromUrl);
 setReferralFromLink(true);
 }
 const kind = searchParams.get('kind');
 if (kind === 'CLIENT' || kind === 'VENDOR' || kind === 'BOTH' || kind === 'ORGANIZER') {
 setAccountKind(kind);
 }
 }, [searchParams]);

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 setError('');
 setLoading(true);

 if (verificationMethod === 'WHATSAPP' && !phoneNational.trim()) {
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
 const e164 = composeE164(phoneCountryCode, phoneNational) || undefined;
 const orgName = accountKind === 'CLIENT' ? name.trim() : tenantName.trim();
 if (accountKind !== 'CLIENT' && !orgName) {
 setError('Le nom de l’organisation est obligatoire.');
 setLoading(false);
 return;
 }
 const res = await register(
 email,
 password,
 name,
 orgName,
 e164,
 verificationMethod,
 acceptTerms,
 acceptPrivacy,
 referralCode || undefined,
 phoneCountryCode,
 phoneNational,
 accountKind,
 );
 if (res.requiresVerification && res.email) {
 const nextQ = nextPath ? `&next=${encodeURIComponent(nextPath)}` : '';
 router.push(`/verify-otp?email=${encodeURIComponent(res.email)}&method=${res.verificationMethod || verificationMethod}${nextQ}`);
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
 badge="Inscription"
 title={isClientFlow ? 'Créez un compte pour vos devis et billets.' : 'Créez votre compte en quelques secondes.'}
 description={
 isClientFlow
 ? `Rejoignez ${site.platformName} : devis, réservations et badges QR dans votre tableau de bord. Vous pouvez aussi continuer en invité sans compte.`
 : `Rejoignez ${site.platformName} : organisez un événement, publiez une offre, ou réservez une salle sans espace SaaS.`
 }
 features={featuresForSite(site)}
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
 <Link href={nextPath ? `/login?next=${encodeURIComponent(nextPath)}` : '/login'}>
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
 <h2 className="text-xl font-bold text-foreground dark:text-foreground">
 {verificationMethod === 'WHATSAPP' ? 'Vérifiez votre WhatsApp' : 'Vérifiez votre boîte mail'}
 </h2>
 <p className="text-sm text-muted mt-2">{successMessage}</p>
 </div>
 <Link href={nextPath ? `/login?next=${encodeURIComponent(nextPath)}` : '/login'}>
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
 <Link href={nextPath ? `/login?next=${encodeURIComponent(nextPath)}` : '/login'} className="font-semibold text-primary hover:underline">
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
 {accountKind !== 'CLIENT' && (
 <Input label="Organisation" id="tenantName" required value={tenantName} onChange={(e) => setTenantName(e.target.value)} placeholder="Dupont Événements" leftIcon={<Building className="w-4 h-4" />} />
 )}
 </div>

 <fieldset className="space-y-2">
 <legend className="text-xs font-medium text-muted">Vous êtes plutôt…</legend>
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
 {(['CLIENT', 'ORGANIZER', 'VENDOR', 'BOTH'] as TenantAccountKind[]).map((kind) => (
 <label
 key={kind}
 className={`flex flex-col gap-0.5 px-3 py-2.5 rounded-[var(--radius-button)] border text-xs font-medium cursor-pointer ${
 accountKind === kind ? 'border-primary bg-primary/5 text-foreground' : 'border-border text-muted'
 }`}
 >
 <input
 type="radio"
 name="accountKind"
 className="sr-only"
 checked={accountKind === kind}
 onChange={() => setAccountKind(kind)}
 />
 <span>{ACCOUNT_KIND_LABELS[kind]}</span>
 <span className="font-normal opacity-80 leading-snug">{ACCOUNT_KIND_DESCRIPTIONS[kind]}</span>
 </label>
 ))}
 </div>
 </fieldset>

 <Input label="Adresse email" id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jean@exemple.com" leftIcon={<Mail className="w-4 h-4" />} />

 <PhoneInput
 id="phone"
 label="Téléphone WhatsApp"
 countryCode={phoneCountryCode}
 national={phoneNational}
 onCountryCodeChange={setPhoneCountryCode}
 onNationalChange={setPhoneNational}
 required={verificationMethod === 'WHATSAPP'}
 hint={
 verificationMethod === 'WHATSAPP'
 ? 'Indicatif pays + numéro national (sans le 0).'
 : 'Optionnel si validation par e-mail.'
 }
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
 <label className="flex items-start gap-3 p-3 rounded-xl border border-border dark:border-border cursor-pointer hover:bg-surface-muted hover:bg-surface-muted transition">
 <input type="checkbox" checked={acceptTerms} onChange={(e) => setAcceptTerms(e.target.checked)} className="mt-0.5 rounded text-primary focus:ring-primary" />
 <span className="text-xs text-muted dark:text-foreground">
 J&apos;accepte les <Link href="/terms" target="_blank" className="text-primary font-semibold hover:underline">conditions d&apos;utilisation</Link>.
 </span>
 </label>
 <label className="flex items-start gap-3 p-3 rounded-xl border border-border dark:border-border cursor-pointer hover:bg-surface-muted hover:bg-surface-muted transition">
 <input type="checkbox" checked={acceptPrivacy} onChange={(e) => setAcceptPrivacy(e.target.checked)} className="mt-0.5 rounded text-primary focus:ring-primary" />
 <span className="text-xs text-muted dark:text-foreground">
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
