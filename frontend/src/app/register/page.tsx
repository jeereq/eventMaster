'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  Calendar,
  Compass,
  Mail,
  MessageSquare,
  Smartphone,
  ScanLine,
  LayoutGrid,
  Wallet,
  CalendarCheck,
  Store,
  ArrowRight,
  CheckCircle2,
  Scale, WhatsAppIcon,
} from '@/components/icons';
import { MethodToggle } from '@/components/AuthSplitLayout';
import { AuthPhotoLayout } from '@/components/AuthPhotoLayout';
import { Button, Alert, Input, PasswordInput, PhoneInput } from '@/components/ui';
import { TERMS_VERSION, PRIVACY_VERSION, REFUND_VERSION } from '@/config/legalConfig';
import LegalConsentChecklist from '@/components/LegalConsentChecklist';
import { parseReferralFromSearchParams } from '@/lib/referralLink';
import { usePlatformSite } from '@/context/PlatformSiteContext';
import {
  allowsAuthOtpChoice,
  authOtpMethodOptions,
  defaultAuthOtpMethod,
  phoneFieldLabel,
  phoneFieldHint,
  type AuthOtpMethod,
} from '@/lib/authOtpChannels';
import { interpolateRates } from '@/lib/platformRates';
import { DEFAULT_PHONE_COUNTRY_CODE, composeE164 } from '@/lib/phone';
import {
  SERVICE_CATEGORIES,
  SERVICE_CATEGORY_LABELS,
  type ServiceCategory,
  type TenantAccountKind,
} from '@/lib/marketplace';
import {
  registerAccountShortLabel,
  registerAccountSummary,
} from '@/lib/registerAccountKinds';
import { safeAppPath, isClientReturnPath } from '@/lib/safeAppPath';
import { LANDING_PLANS } from '@/config/landingPricing';
import { usePlanCatalog } from '@/hooks/usePlanCatalog';
import { planDisplayName } from '@/lib/planCatalogDb';
import RegisterAccountKindPicker from '@/components/register/RegisterAccountKindPicker';
import RegisterReferralGate from '@/components/register/RegisterReferralGate';
import RegisterVendorTrackPicker from '@/components/register/RegisterVendorTrackPicker';
import {
  planForVendorTrack,
  resolveVendorTrackFromParams,
  saveRegisterVendorIntent,
  serviceGroupForCategory,
  type VendorRegisterTrack,
  type VendorServiceGroup,
} from '@/lib/registerVendorIntent';
import { cn } from '@/lib/cn';
import {
  resolveActionConfig,
  type RegistrationActionConfig,
} from '@/lib/registerActionConfig';

const LegalTermsPreviewModal = dynamic(
  () => import('@/components/LegalTermsPreviewModal'),
);

const AUTH_TEXT_LINK_CLASS =
  'font-semibold text-primary hover:underline rounded-[var(--radius-button)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50';

const REGISTRATION_KIND_CONFIGS: Record<string, RegistrationActionConfig> = {
  ORGANIZER: {
    key: 'ORGANIZER',
    heroTitle: 'Votre espace organisateur',
    heroDescription:
      'Créez l’événement, invitez, accueillez le jour J. Avec un forfait Business, publiez aussi salles et prestations.',
    defaultAccountKind: 'ORGANIZER',
    defaultNextPath: '/dashboard/events',
    submitButtonLabel: 'Créer mon compte organisateur',
    orgLabel: 'Nom de l’événement ou de l’organisation',
    orgPlaceholder: 'Ex: Mariage Sarah & David / Famille Dupont',
    features: [
      { step: 1, icon: Calendar, title: 'Organiser', desc: 'Invitations, réponse à l’invitation, plan de table et protocole QR.' },
      { step: 2, icon: Store, title: 'Vendre (Business+)', desc: 'Salles publiables et prestations marketplace illimitées.' },
      { step: 3, icon: ScanLine, title: 'Accueillir', desc: 'Scannez vos invités à l’entrée, depuis votre smartphone.' },
    ],
  },
  CLIENT: {
    key: 'CLIENT',
    heroTitle: 'Trouvez salle, métiers et matériel',
    heroDescription:
      'Compte gratuit. Comparez salles, métiers et Matériel & Équipements, favoris et devis sans engagement.',
    defaultAccountKind: 'CLIENT',
    defaultNextPath: '/marketplace',
    submitButtonLabel: 'Créer mon compte gratuit',
    orgLabel: '',
    orgPlaceholder: '',
    features: [
      { step: 1, icon: LayoutGrid, title: 'Explorer', desc: 'Salles 3D, métiers et Matériel & Équipements.' },
      { step: 2, icon: Wallet, title: 'Comparer', desc: 'Favoris et pack budget. Rien n’est réservé tant que le devis n’est pas envoyé.' },
      { step: 3, icon: CalendarCheck, title: 'Demander un devis', desc: 'Écrivez au pro. L’acompte se verse ensuite, directement.' },
    ],
  },
  VENDOR: {
    key: 'VENDOR',
    heroTitle: 'Publiez votre activité',
    heroDescription:
      'Salle à réserver, ou métier (prestations / Matériel & Équipements) — sans événements ni invités.',
    defaultAccountKind: 'VENDOR',
    defaultNextPath: '/dashboard/catalogue',
    submitButtonLabel: 'Créer mon compte professionnel',
    orgLabel: 'Nom de l’établissement ou de l’enseigne',
    orgPlaceholder: 'Ex: Espace Prestige Kinshasa',
    features: [
      { step: 1, icon: Store, title: 'Publier', desc: 'Salle, métier ou locations — photos, tarifs, éventuellement visite 3D.' },
      { step: 2, icon: MessageSquare, title: 'Répondre', desc: 'Demandes de devis d’organisateurs, sans commission cachée.' },
      { step: 3, icon: CalendarCheck, title: 'Confirmer', desc: 'Bloquez la date et suivez les acomptes.' },
    ],
  },
};

export default function RegisterPage() {
 return (
 <Suspense
 fallback={
        <AuthPhotoLayout title="Créez votre compte." description="" cardTitle="Créer un compte" cardWidthClassName="lg:max-w-xl">
          <div className="h-96 rounded-2xl bg-surface-muted animate-pulse">
            <span className="sr-only">Chargement du formulaire d&apos;inscription</span>
          </div>
        </AuthPhotoLayout>
 }
 >
 <RegisterPageContent />
 </Suspense>
 );
}

function applyRegisterError(
  message: string,
  setters: {
    setError: (value: string) => void;
    setEmailError: (value: string) => void;
    setOrgError: (value: string) => void;
    setPhoneError: (value: string) => void;
    setReferralError: (value: string) => void;
  },
) {
  const lower = message.toLowerCase();
  if (lower.includes('email')) {
    setters.setEmailError(message);
    window.setTimeout(() => document.getElementById('email')?.focus(), 0);
    return;
  }
  if (lower.includes('parrain')) {
    setters.setReferralError(message);
    window.setTimeout(() => document.getElementById('referralCode')?.focus(), 0);
    return;
  }
  if (lower.includes('téléphone') || lower.includes('whatsapp')) {
    setters.setPhoneError(message);
    window.setTimeout(() => document.getElementById('phone')?.focus(), 0);
    return;
  }
  if (
    lower.includes('organisation')
    || lower.includes('enseigne')
    || lower.includes('salle')
    || lower.includes('complexe')
    || lower.includes('établissement')
  ) {
    setters.setOrgError(message);
    window.setTimeout(() => document.getElementById('tenantName')?.focus(), 0);
    return;
  }
  setters.setError(message);
}

function RegisterPageContent() {
 const { register } = useAuth();
 const { plans: planCatalog } = usePlanCatalog();
 const { site, ready } = usePlatformSite();
  const authChannels = site.authOtpChannels;
  const canChooseOtpChannel = allowsAuthOtpChoice(authChannels);
 const router = useRouter();
 const searchParams = useSearchParams();

  const nextParam = searchParams.get('next');
  const nextPath = safeAppPath(nextParam);
  const intentParam = searchParams.get('intent');
  const actionParam = searchParams.get('action');
  const planParam = searchParams.get('plan');
  const templateIdParam = searchParams.get('templateId');
  const kindFromUrl = Boolean(actionParam || intentParam || planParam || searchParams.get('kind'));

 const [email, setEmail] = useState('');
 const [password, setPassword] = useState('');
 const [name, setName] = useState('');
 const [tenantName, setTenantName] = useState('');
 const [phoneCountryCode, setPhoneCountryCode] = useState(DEFAULT_PHONE_COUNTRY_CODE);
 const [phoneNational, setPhoneNational] = useState('');
  const [verificationMethod, setVerificationMethod] = useState<AuthOtpMethod>(defaultAuthOtpMethod(authChannels));
 const [acceptTerms, setAcceptTerms] = useState(false);
 const [acceptPrivacy, setAcceptPrivacy] = useState(false);
 const [acceptRefund, setAcceptRefund] = useState(false);
 const [referralCode, setReferralCode] = useState('');
 const [referralFromLink, setReferralFromLink] = useState(false);
  const [referralChoice, setReferralChoice] = useState<'yes' | 'no' | null>(null);
 const [accountKind, setAccountKind] = useState<TenantAccountKind>('ORGANIZER');
  const [vendorTrack, setVendorTrack] = useState<VendorRegisterTrack | null>(null);
  const [serviceGroup, setServiceGroup] = useState<VendorServiceGroup | null>(null);
  const [serviceCategory, setServiceCategory] = useState<ServiceCategory | null>(null);
 const [error, setError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [orgError, setOrgError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [referralError, setReferralError] = useState('');
 const [successMessage, setSuccessMessage] = useState('');
 const [loading, setLoading] = useState(false);
  const [legalModalOpen, setLegalModalOpen] = useState(false);
  const [legalModalTab, setLegalModalTab] = useState<'summary' | 'terms' | 'privacy' | 'refund'>('summary');
  const [kindConfirmed, setKindConfirmed] = useState(kindFromUrl);
  const [intentConfigs, setIntentConfigs] = useState<Record<string, RegistrationActionConfig>>({});

  useEffect(() => {
    setVerificationMethod(defaultAuthOtpMethod(authChannels));
  }, [authChannels]);

  useEffect(() => {
    if (!error) return;
    document.getElementById('register-form-error')?.focus();
  }, [error]);

  const isClientFlow = accountKind === 'CLIENT' || isClientReturnPath(nextPath);

  useEffect(() => {
    if (kindFromUrl) setKindConfirmed(true);
  }, [kindFromUrl]);

  // Détection et pré-sélection intelligente des paramètres URL
 useEffect(() => {
   const fromUrl = parseReferralFromSearchParams(searchParams);
   if (fromUrl) {
     setReferralCode(fromUrl);
     setReferralFromLink(true);
      setReferralChoice('yes');
   }
   const kind = searchParams.get('kind');
   // BOTH n’est plus proposé : les forfaits Business couvrent déjà salle + prestations.
   if (kind === 'BOTH') {
     setAccountKind('ORGANIZER');
   } else if (kind === 'CLIENT' || kind === 'VENDOR' || kind === 'ORGANIZER') {
     setAccountKind(kind);
    } else if (actionParam === 'venue' || actionParam === 'services' || actionParam === 'quotes' || actionParam === 'rentals' || actionParam === 'ai_recommendation' || intentParam === 'vendor') {
     setAccountKind('VENDOR');
    } else if (actionParam === 'venues' || actionParam === 'packs' || intentParam === 'seeker') {
     setAccountKind('CLIENT');
    } else if (actionParam || intentParam === 'personal' || intentParam === 'pro') {
     setAccountKind('ORGANIZER');
   }

    const track = resolveVendorTrackFromParams({ action: actionParam, plan: planParam });
    if (track) setVendorTrack(track);
    if (actionParam === 'rentals') {
      setServiceGroup('rental');
    }
    const categoryParam = searchParams.get('category');
    if (categoryParam && (SERVICE_CATEGORIES as string[]).includes(categoryParam)) {
      const category = categoryParam as ServiceCategory;
      setServiceCategory(category);
      setServiceGroup(serviceGroupForCategory(category));
    }
  }, [searchParams, actionParam, intentParam, planParam]);

  useEffect(() => {
    if (!actionParam && !intentParam && !planParam) return;
    let cancelled = false;
    void import('@/config/registerIntentConfigs').then((mod) => {
      if (!cancelled) setIntentConfigs(mod.REGISTER_INTENT_CONFIGS);
    });
    return () => {
      cancelled = true;
    };
  }, [actionParam, intentParam, planParam]);

  const effectiveAction = vendorTrack === 'venue'
    ? 'venue'
    : vendorTrack === 'service'
      ? 'services'
      : actionParam;

  // Résolution de la configuration éditoriale contextuelle
  const config = useMemo(() => {
    return resolveActionConfig(
      { ...REGISTRATION_KIND_CONFIGS, ...intentConfigs },
      effectiveAction,
      intentParam,
      accountKind,
      isClientFlow,
      planParam,
    );
  }, [effectiveAction, intentParam, accountKind, isClientFlow, planParam, intentConfigs]);

  const vendorPlanLocked = planParam === 'VENUE' || planParam === 'SERVICE' || planParam === 'CATALOG';
  const kindReady = kindFromUrl || kindConfirmed;
  const showKindChooser = !kindReady;
  const showVendorChooser = kindReady && accountKind === 'VENDOR' && !vendorTrack;
  const showAccountForm = kindReady && !showVendorChooser;

  const goBackToKind = () => {
    if (kindFromUrl) return;
    setKindConfirmed(false);
    setVendorTrack(null);
    setServiceGroup(null);
    setServiceCategory(null);
    setError('');
  };

  const goBackToVendorTrack = () => {
    if (vendorPlanLocked) return;
    setVendorTrack(null);
    setServiceGroup(actionParam === 'rentals' ? 'rental' : null);
    setServiceCategory(null);
    setError('');
  };

  // Résolution des détails du forfait éventuel
  const matchedPlan = useMemo(() => {
    if (!planParam) return null;
    return LANDING_PLANS.find((p) => p.id === planParam) ?? null;
  }, [planParam]);

  // Destination intelligente de redirection après validation
  const targetNextPath = useMemo(() => {
    if (nextPath) return nextPath;
    if (matchedPlan && matchedPlan.id !== 'FREE') {
      return `/dashboard/billing?plan=${encodeURIComponent(matchedPlan.id)}`;
    }
    if (templateIdParam && config.key === 'template') {
      return `/dashboard/templates?templateId=${encodeURIComponent(templateIdParam)}`;
    }
    return config.defaultNextPath;
  }, [nextPath, templateIdParam, config, matchedPlan]);

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 setError('');
    setEmailError('');
    setOrgError('');
    setPhoneError('');
    setReferralError('');

    if (!acceptTerms || !acceptPrivacy || !acceptRefund) {
      setLegalModalTab(!acceptTerms ? 'terms' : !acceptPrivacy ? 'privacy' : 'refund');
      setLegalModalOpen(true);
      setError('Cochez les conditions, la confidentialité et la politique de remboursement après lecture, ou utilisez « Tout lire & accepter ».');
      return;
    }

 setLoading(true);

 if ((verificationMethod === 'WHATSAPP' || verificationMethod === 'SMS') && !phoneNational.trim()) {
      const phoneMsg = `Le numéro de téléphone est obligatoire pour la confirmation par ${verificationMethod === 'WHATSAPP' ? 'WhatsApp' : 'SMS'}.`;
      setPhoneError(phoneMsg);
      setLoading(false);
      window.setTimeout(() => document.getElementById('phone')?.focus(), 0);
 return;
 }

 try {
 const e164 = composeE164(phoneCountryCode, phoneNational) || undefined;
 const orgName = accountKind === 'CLIENT' ? name.trim() : tenantName.trim();
 if (accountKind !== 'CLIENT' && !orgName) {
        const orgMsg = vendorTrack === 'venue'
          ? 'Le nom de la salle ou du complexe est obligatoire.'
          : vendorTrack === 'service'
            ? 'Le nom de l’enseigne est obligatoire.'
            : 'Le nom de l’organisation ou établissement est obligatoire.';
        setOrgError(orgMsg);
 setLoading(false);
        window.setTimeout(() => document.getElementById('tenantName')?.focus(), 0);
 return;
 }

      if (accountKind === 'VENDOR' && vendorTrack) {
        saveRegisterVendorIntent({
          track: vendorTrack,
          serviceGroup: serviceCategory ? serviceGroupForCategory(serviceCategory) : serviceGroup || undefined,
          category: serviceCategory || undefined,
        });
      }

      const resolvedPlan = accountKind === 'VENDOR' && vendorTrack
        ? planForVendorTrack(vendorTrack, planParam)
        : planParam || undefined;
      const shouldSendReferral = referralChoice === 'yes' || referralFromLink;
      const referralToSend = shouldSendReferral ? (referralCode.trim() || undefined) : undefined;

 const res = await register(
 email,
 password,
 name,
 orgName,
 e164,
 verificationMethod,
 acceptTerms,
 acceptPrivacy,
        referralToSend,
 phoneCountryCode,
 phoneNational,
 accountKind,
        intentParam || undefined,
        resolvedPlan,
 );

 if (res.requiresVerification && res.email) {
        const nextQ = targetNextPath ? `&next=${encodeURIComponent(targetNextPath)}` : '';
        const welcomeQ = res.welcomeTokens?.offer === 'error' ? '&welcome=failed' : '';
        router.push(
          `/verify-otp?email=${encodeURIComponent(res.email)}&method=${res.verificationMethod || verificationMethod}${nextQ}${welcomeQ}`,
        );
 return;
 }

 setSuccessMessage(res.message);
 setLoading(false);
 } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Une erreur est survenue lors de la création du compte.';
      applyRegisterError(message, {
        setError,
        setEmailError,
        setOrgError,
        setPhoneError,
        setReferralError,
      });
 setLoading(false);
 }
 };

  const layoutTitle = showKindChooser
    ? 'Que voulez-vous faire ?'
    : showVendorChooser
      ? 'Salle à réserver, ou métier de service ?'
      : config.heroTitle;
  const layoutDescription = showKindChooser
    ? 'Trois usages, un compte. Choisissez d’abord : le formulaire s’adapte ensuite.'
    : showVendorChooser
      ? 'Une salle est un lieu. Un métier se déplace ou loue du matériel. Choisissez pour commencer.'
      : interpolateRates(config.heroDescription, site);


  const loginHref = targetNextPath ? `/login?next=${encodeURIComponent(targetNextPath)}` : '/login';

 return (
 <AuthPhotoLayout
      title={layoutTitle}
      description={layoutDescription}
      cardTitle="Créer un compte"
      cardWidthClassName="lg:max-w-xl"
 >
      <div>
 {ready && !site.allowRegistration ? (
 <div className="text-center space-y-4 py-6">
            <h2 className="text-xl font-semibold text-foreground">Inscriptions temporairement fermées</h2>
 <p className="text-sm text-muted leading-relaxed">
              Les nouvelles créations de compte sont temporairement suspendues. Contactez{' '}
 <a href={`mailto:${site.supportEmail}`} className={AUTH_TEXT_LINK_CLASS}>
 {site.supportEmail}
 </a>{' '}
 pour ouvrir une organisation.
 </p>
 <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
 <Link href="/contact">
 <Button>Nous contacter</Button>
 </Link>
              <Link href={targetNextPath ? `/login?next=${encodeURIComponent(targetNextPath)}` : '/login'}>
 <Button variant="secondary">Se connecter</Button>
 </Link>
 </div>
 </div>
 ) : successMessage ? (
          <div className="text-center space-y-4 py-2">
            <div className="inline-flex items-center justify-center bg-primary/15 p-3.5 rounded-full text-primary">
              {verificationMethod === 'WHATSAPP' ? (
                <WhatsAppIcon className="w-8 h-8" />
              ) : verificationMethod === 'SMS' ? (
                <Smartphone className="w-8 h-8" aria-hidden />
              ) : (
                <Mail className="w-8 h-8" aria-hidden />
              )}
 </div>
 <div>
              <h2 className="text-lg sm:text-xl font-bold text-foreground">
 {verificationMethod === 'WHATSAPP' ? 'Vérifiez votre WhatsApp' : verificationMethod === 'SMS' ? 'Vérifiez vos SMS' : 'Vérifiez votre boîte mail'}
 </h2>
              <p className="text-xs sm:text-sm text-muted mt-1.5 leading-relaxed">{successMessage}</p>
 </div>
            <Link href={targetNextPath ? `/login?next=${encodeURIComponent(targetNextPath)}` : '/login'}>
              <Button fullWidth>
                Aller à la connexion
              </Button>
 </Link>
 </div>
 ) : (
 <>
            {error && (
              <Alert variant="error" className="mb-3 py-2 text-xs" id="register-form-error">
                {error}
              </Alert>
            )}

            {showKindChooser && (
              <RegisterAccountKindPicker
                loginHref={loginHref}
                onSelect={(kind) => {
                  setAccountKind(kind);
                  setKindConfirmed(true);
                  setError('');
                  if (kind !== 'VENDOR') {
                    setVendorTrack(null);
                    setServiceGroup(null);
                    setServiceCategory(null);
                  }
                }}
              />
            )}

            {showVendorChooser && (
              <RegisterVendorTrackPicker
                onSelect={setVendorTrack}
                onBack={kindFromUrl ? undefined : goBackToKind}
                loginHref={loginHref}
              />
            )}

            {showAccountForm && (
            <>
            <div className="text-left mb-3 space-y-1.5">
              {/* En-tête de l’étape : l’usage choisi, et où l’on en est. */}
              <div className="flex items-center gap-3 pb-1">
                <span
                  aria-hidden
                  className="w-10 h-10 shrink-0 rounded-[10px] bg-[#e3f3ec] text-[#275a3d] dark:bg-primary/15 dark:text-primary inline-flex items-center justify-center"
                >
                  {accountKind === 'CLIENT' ? (
                    <Compass className="w-5 h-5" />
                  ) : accountKind === 'VENDOR' ? (
                    <Store className="w-5 h-5" />
                  ) : (
                    <Calendar className="w-5 h-5" />
                  )}
                </span>
                <span className="min-w-0 flex flex-col">
                  <span className="text-sm text-muted">Étape 2 sur 3 · Vos coordonnées</span>
                  <h2 className="font-display text-lg sm:text-xl font-semibold text-foreground tracking-tight leading-tight">
                    {registerAccountShortLabel(accountKind, vendorTrack)}
                  </h2>
                </span>
              </div>
              <p className="text-sm text-muted leading-relaxed">
                {registerAccountSummary(accountKind, vendorTrack)}
              </p>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
                {!kindFromUrl ? (
                  <button
                    type="button"
                    onClick={vendorTrack && !vendorPlanLocked ? goBackToVendorTrack : goBackToKind}
                    className={cn(AUTH_TEXT_LINK_CLASS, 'min-h-11 inline-flex items-center')}
                  >
                    Changer le type de compte
                  </button>
                ) : vendorTrack && !vendorPlanLocked ? (
                  <button
                    type="button"
                    onClick={goBackToVendorTrack}
                    className={cn(AUTH_TEXT_LINK_CLASS, 'min-h-11 inline-flex items-center')}
                  >
                    Choisir salle ou métier
                  </button>
                ) : null}
                <p className="text-xs text-muted inline-flex items-center min-h-11">
                  Déjà un compte ?{' '}
                  <Link href={loginHref} className={AUTH_TEXT_LINK_CLASS}>
                    Connexion
                  </Link>
                </p>
              </div>
              {matchedPlan && matchedPlan.id !== 'FREE' && (
                <p className="text-xs text-muted">
                  Forfait choisi :{' '}
                  <span className="font-semibold text-foreground">
                    {planDisplayName(matchedPlan.id, planCatalog?.[matchedPlan.id], matchedPlan.ms365Name)}
                  </span>
                  {' — vous pourrez le valider après confirmation.'}
                </p>
              )}
              {templateIdParam && (
                <p className="text-xs text-muted">Le modèle d’invitation reste réservé après confirmation.</p>
              )}
              {vendorTrack === 'service' && serviceCategory && (
                <p className="text-xs text-muted">
                  Métier : {SERVICE_CATEGORY_LABELS[serviceCategory]}. Vous pourrez le préciser après connexion.
                </p>
              )}
            </div>

            <form className="space-y-3" onSubmit={handleSubmit}>
              <div className={cn('grid gap-2.5', accountKind === 'CLIENT' ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2')}>
                <Input
                  label={accountKind === 'CLIENT' ? 'Votre nom complet' : 'Votre nom & prénom'}
                  id="name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jean Dupont"
                />
                {accountKind !== 'CLIENT' && (
                  <Input
                    label={config.orgLabel || 'Nom organisation / Événement'}
                    id="tenantName"
                    required
                    value={tenantName}
                    onChange={(e) => {
                      setTenantName(e.target.value);
                      if (orgError) setOrgError('');
                    }}
                    placeholder={config.orgPlaceholder || 'Dupont Événements'}
                    error={orgError || undefined}
                  />
                )}
              </div>

              {/* ─── CONTACT : E-MAIL & WHATSAPP (2 COLONNES) ─── */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <Input
                  label="Adresse email"
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (emailError) setEmailError('');
                  }}
                  placeholder="jean@exemple.com"
                  error={emailError || undefined}
                />

                <PhoneInput
                  id="phone"
                  label={
                    verificationMethod === 'EMAIL'
                      ? 'Téléphone (optionnel)'
                      : phoneFieldLabel(authChannels, verificationMethod)
                  }
                  countryCode={phoneCountryCode}
                  national={phoneNational}
                  onCountryCodeChange={setPhoneCountryCode}
                  onNationalChange={(next) => {
                    setPhoneNational(next);
                    if (phoneError) setPhoneError('');
                  }}
                  required={verificationMethod === 'WHATSAPP' || verificationMethod === 'SMS'}
                  placeholder="812345678"
                  error={phoneError || undefined}
                  hint={phoneFieldHint(authChannels, verificationMethod)}
                />
              </div>

 <PasswordInput
                label="Mot de passe"
                id="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                hint="Au moins 8 caractères."
              />

              <RegisterReferralGate
                choice={referralChoice}
                onChoice={(next) => {
                  setReferralChoice(next);
                  setReferralFromLink(false);
                  if (next === 'no') setReferralCode('');
                  if (referralError) setReferralError('');
                }}
                code={referralCode}
                onCodeChange={(next) => {
                  setReferralCode(next);
                  if (referralError) setReferralError('');
                }}
                fromLink={referralFromLink}
                error={referralError || undefined}
              />

              {/* ─── CHOIX DE MÉTHODE DE VALIDATION OTP ─── */}
              {canChooseOtpChannel ? (
 <MethodToggle
                  label="Recevoir le code de confirmation"
 value={verificationMethod}
 onChange={setVerificationMethod}
 options={[
                    ...(authOtpMethodOptions(authChannels).includes('EMAIL')
                      ? [{ value: 'EMAIL' as const, label: 'E-mail', icon: <Mail className="w-3.5 h-3.5" aria-hidden /> }]
                      : []),
                    ...(authOtpMethodOptions(authChannels).includes('WHATSAPP')
                      ? [{ value: 'WHATSAPP' as const, label: 'WhatsApp', icon: <WhatsAppIcon className="w-3.5 h-3.5" /> }]
                      : []),
                    ...(authOtpMethodOptions(authChannels).includes('SMS')
                      ? [{ value: 'SMS' as const, label: 'SMS', icon: <Smartphone className="w-3.5 h-3.5" aria-hidden /> }]
                      : []),
                  ]}
                />
              ) : (
                <p className="text-xs text-muted">
                  Code de confirmation envoyé{' '}
                  {verificationMethod === 'WHATSAPP' ? 'par WhatsApp' : verificationMethod === 'SMS' ? 'par SMS' : 'par e-mail'}
                  {' '}(réglage plateforme).
                </p>
              )}

              {/* ─── ENGAGEMENTS : liste groupée, libellés complets, lecture du texte ─── */}
              <LegalConsentChecklist
                items={[
                  { id: 'terms', label: 'les conditions d’utilisation', version: TERMS_VERSION, checked: acceptTerms, onChange: setAcceptTerms },
                  { id: 'privacy', label: 'la politique de confidentialité', version: PRIVACY_VERSION, checked: acceptPrivacy, onChange: setAcceptPrivacy },
                  { id: 'refund', label: 'la politique de remboursement', version: REFUND_VERSION, checked: acceptRefund, onChange: setAcceptRefund },
                ]}
                onRead={(id) => {
                  setLegalModalTab(id);
                  setLegalModalOpen(true);
                }}
                onReadAll={() => {
                  setLegalModalTab('summary');
                  setLegalModalOpen(true);
                }}
              />

              {/* ─── BOUTON D'ACTION PRINCIPAL DYNAMIQUE ─── */}
              <div className="pt-1.5 space-y-1.5">
                <Button
                  type="submit"
                  fullWidth
                  loading={loading}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                  className="shadow-md shadow-primary/20 font-bold py-2.5"
                >
                  {config.submitButtonLabel}
 </Button>

                <p className="text-center text-xs text-muted">
                  Sans carte. Un code de confirmation, puis l’accès.
                </p>
              </div>
 </form>
            </>
            )}
 </>
 )}
 </div>

      {/* ─── MODALE DE PRÉVISUALISATION ET VALIDATION LÉGALE FORCÉE ─── */}
      {legalModalOpen ? (
      <LegalTermsPreviewModal
        open={legalModalOpen}
        onClose={() => setLegalModalOpen(false)}
        initialTab={legalModalTab}
        acceptedTerms={acceptTerms}
        acceptedPrivacy={acceptPrivacy}
        acceptedRefund={acceptRefund}
        onAcceptAll={() => {
          setAcceptTerms(true);
          setAcceptPrivacy(true);
          setAcceptRefund(true);
          setError('');
        }}
      />
      ) : null}
 </AuthPhotoLayout>
 );
}
