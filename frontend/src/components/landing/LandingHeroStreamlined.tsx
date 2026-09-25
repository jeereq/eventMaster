'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { ArrowRight, Check, LayoutDashboard, MessageCircle, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui';
import { cn } from '@/lib/cn';
import { LANDING_PROFILES, type LandingProfileId } from '@/lib/landingProfiles';
import { usePlatformSite } from '@/context/PlatformSiteContext';
import { enabledPublicCities } from '@/lib/platformCities';
import { revealAndScrollToSection, scrollToPageSection } from '@/lib/aiFabPlacement';

/** Sommaire de la page : chaque lien fait défiler jusqu’à sa section (montée à la demande si besoin). */
const PAGE_SECTIONS = [
  { id: 'profils', label: 'Pour qui ?' },
  { id: 'etapes', label: 'Comment ça marche' },
  { id: 'outils', label: 'Les outils' },
  { id: 'catalogue', label: 'Salles & prestataires' },
  { id: 'simulateur-ia', label: 'Simulateur IA' },
  { id: 'tarifs', label: 'Tarifs' },
  { id: 'faq', label: 'FAQ' },
];

/** Textes courts des cartes « Quel est votre projet ? ». */
const PROFILE_CARDS: Record<LandingProfileId, { eyebrow: string; title: string; desc: string }> = {
  personal: {
    eyebrow: 'Particulier',
    title: 'Mariage, anniversaire, réception',
    desc: 'Invitations WhatsApp, plan de table 3D, suivi des réponses.',
  },
  pro: {
    eyebrow: 'Pro & billetterie',
    title: 'Concerts, conférences, galas',
    desc: 'Billets payés par Mobile Money, contrôle d’accès par QR.',
  },
  seeker: {
    eyebrow: 'Recherche & devis',
    title: 'Trouver une salle ou un talent',
    desc: 'Visitez les salles en 3D et demandez des devis en un clic.',
  },
  vendor: {
    eyebrow: 'Prestataire & salle',
    title: 'Référencer mon activité',
    desc: 'Recevez des demandes de devis de clients qualifiés.',
  },
};

const LOGGED_IN_TARGETS: Record<LandingProfileId, { href: string; label: string }> = {
  personal: { href: '/dashboard/events', label: 'Mes événements' },
  pro: { href: '/dashboard/events', label: 'Ma billetterie' },
  seeker: { href: '/marketplace', label: 'Explorer le marketplace' },
  vendor: { href: '/dashboard/catalogue', label: 'Mon catalogue' },
};

const DEMO_GUESTS = [
  { initials: 'JK', name: 'Jean-Marc K.', detail: 'Table 3 · 2 places', status: 'Confirmé', pending: false },
  { initials: 'SM', name: 'Sarah M.', detail: 'Table 5 · 1 place', status: 'Confirmé', pending: false },
  { initials: 'DL', name: 'Didier L.', detail: 'Relancé hier', status: 'En attente', pending: true },
  { initials: 'EI', name: 'Esther I.', detail: 'Table 1 · 4 places', status: 'Confirmé', pending: false },
];

/** Exemple chiffré du hero : 120 invités, budget moyen à Kinshasa (taux 1 $ = 2 800 FC). */
const DEMO_BUDGET = {
  total: '4 200 000 FC',
  usd: '≈ 1 500 $',
  guests: 120,
  lines: [
    { label: 'Salle', share: 35, tone: 'bg-[#065f46]' },
    { label: 'Traiteur', share: 30, tone: 'bg-brand-accent' },
    { label: 'Déco', share: 20, tone: 'bg-[#6ee7b7]' },
    { label: 'Photo & DJ', share: 15, tone: 'bg-[#c7d6cf]' },
  ],
};

/**
 * Les sections du bas se montent à la demande et changent de hauteur en chargeant :
 * on recale la cible quelques fois, sauf si le visiteur a repris la main entre-temps.
 */
function goToSection(id: string) {
  revealAndScrollToSection(id);
  let userMoved = false;
  const stop = () => {
    userMoved = true;
  };
  const events = ['wheel', 'touchstart', 'keydown', 'pointerdown'] as const;
  events.forEach((name) => window.addEventListener(name, stop, { once: true, passive: true }));
  [350, 900, 1600].forEach((delay) =>
    window.setTimeout(() => {
      if (!userMoved) scrollToPageSection(id);
    }, delay),
  );
  window.setTimeout(() => events.forEach((name) => window.removeEventListener(name, stop)), 1700);
}

function formatCitySentence(cities: string[]): string {
  if (cities.length === 0) return '';
  if (cities.length === 1) return cities[0];
  return `${cities.slice(0, -1).join(', ')} et ${cities[cities.length - 1]}`;
}

/** Maquette décorative : suivi des invités, budget IA et scan à l’entrée (exemple, pas de données réelles). */
function HeroPhoneMock() {
  const cardClass =
    'em-light-island bg-[#ffffff] text-[#0f1f1a] rounded-[18px] shadow-[0_16px_40px_rgba(2,44,34,0.35)]';
  return (
    <div
      aria-hidden
      className="relative h-[460px] lg:h-[540px] rounded-[2rem] bg-[#064e3b] overflow-hidden select-none"
    >
      <div className="absolute -right-20 -top-20 w-80 h-80 rounded-full border-[48px] border-brand-accent opacity-20" />
      <div className="absolute -left-24 -bottom-28 w-72 h-72 rounded-full border-[40px] border-[#065f46]" />

      {/* Téléphone : liste des invités */}
      <div className="absolute right-5 lg:right-4 xl:right-8 top-8 w-[236px] xl:w-[252px] h-[400px] lg:h-[476px] rounded-[2.25rem] bg-[#0b1512] p-2.5 shadow-[0_24px_60px_rgba(2,44,34,0.45)]">
        <div className="em-light-island w-full h-full rounded-[1.75rem] bg-[#f4f7f5] text-[#0f1f1a] px-3.5 pt-3 pb-3.5 flex flex-col gap-2.5 overflow-hidden">
          <div className="mx-auto w-16 h-1.5 rounded-full bg-[#dfe8e3]" />
          <div className="flex flex-col">
            <span className="text-[9px] font-bold tracking-[0.06em] text-primary-solid">MARIAGE · SAM. 14 DÉC.</span>
            <span className="font-display text-[15px] font-semibold leading-tight">Grâce &amp; Patrick</span>
            <span className="text-[10px] text-[#4b5c56]">Salle Le Palmier · Kinshasa</span>
          </div>
          <div className="bg-[#ffffff] rounded-[10px] p-2.5 flex flex-col gap-1.5">
            <span className="flex items-baseline justify-between text-[10px] text-[#4b5c56]">
              <span className="font-semibold text-[#0f1f1a]">Réponses</span>
              <span>
                <span className="font-semibold text-[#0f1f1a]">108</span> / {DEMO_BUDGET.guests}
              </span>
            </span>
            <span className="flex h-1.5 rounded-full overflow-hidden bg-[#edf2ef]">
              <span className="w-[72%] bg-primary-solid" />
              <span className="w-[18%] bg-amber-400" />
            </span>
            <span className="grid grid-cols-3 gap-1 pt-0.5">
              {[
                ['86', 'Confirmés', 'text-primary-solid'],
                ['12', 'En attente', 'text-amber-700'],
                ['10', 'Déclinés', 'text-[#4b5c56]'],
              ].map(([value, label, tone]) => (
                <span key={label} className="flex flex-col">
                  <span className={cn('font-display text-[15px] font-semibold leading-none', tone)}>{value}</span>
                  <span className="text-[8.5px] text-[#4b5c56]">{label}</span>
                </span>
              ))}
            </span>
          </div>
          <div className="bg-[#ffffff] rounded-xl flex flex-col">
            {DEMO_GUESTS.map((guest, index) => (
              <div
                key={guest.initials}
                className={cn(
                  'flex items-center gap-2 px-2.5 py-[7px]',
                  index < DEMO_GUESTS.length - 1 && 'border-b border-[#edf2ef]',
                )}
              >
                <span className="w-[26px] h-[26px] shrink-0 rounded-full bg-[#ecfdf5] text-[10px] font-semibold text-[#065f46] flex items-center justify-center">
                  {guest.initials}
                </span>
                <span className="grow min-w-0 flex flex-col">
                  <span className="text-[11px] font-semibold leading-tight truncate">{guest.name}</span>
                  <span className="text-[9px] text-[#4b5c56] leading-tight truncate">{guest.detail}</span>
                </span>
                <span
                  className={cn(
                    'shrink-0 text-[9px] font-semibold px-1.5 py-0.5 rounded-full',
                    guest.pending ? 'text-amber-800 bg-amber-100' : 'text-[#065f46] bg-[#d1fae5]',
                  )}
                >
                  {guest.status}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-auto h-10 shrink-0 rounded-[10px] bg-primary-solid text-white text-[11px] font-semibold flex items-center justify-center gap-1.5">
            <MessageCircle className="w-3.5 h-3.5" />
            Relancer 12 invités
          </div>
        </div>
      </div>

      {/* Carte budget IA */}
      <div className={cn(cardClass, 'absolute left-5 lg:left-4 xl:left-8 top-10 lg:top-12 w-[208px] lg:w-[192px] xl:w-[228px] p-4 flex flex-col gap-2.5')}>
        <span className="flex items-center justify-between text-[10px] font-bold tracking-[0.05em] text-primary-solid">
          <span className="inline-flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            BUDGET IA
          </span>
          <span className="text-[#4b5c56] font-semibold tracking-normal">{DEMO_BUDGET.guests} invités</span>
        </span>
        <span className="flex flex-col">
          <span className="font-display text-[24px] lg:text-[22px] xl:text-[26px] font-semibold leading-none tabular-nums">
            {DEMO_BUDGET.total}
          </span>
          <span className="mt-1 text-[11px] text-[#4b5c56]">{DEMO_BUDGET.usd} · formule Équilibre</span>
        </span>
        <span className="flex h-2 rounded overflow-hidden gap-0.5">
          {DEMO_BUDGET.lines.map((line) => (
            <span key={line.label} className={line.tone} style={{ width: `${line.share}%` }} />
          ))}
        </span>
        <span className="grid grid-cols-2 gap-x-2 gap-y-1">
          {DEMO_BUDGET.lines.map((line) => (
            <span key={line.label} className="inline-flex items-center gap-1.5 text-[10px] text-[#4b5c56]">
              <span className={cn('w-2 h-2 rounded-full shrink-0', line.tone)} />
              {line.label}
            </span>
          ))}
        </span>
      </div>

      {/* Carte scan à l’entrée */}
      <div className={cn(cardClass, 'absolute left-5 lg:left-4 xl:left-8 bottom-10 lg:bottom-14 w-[208px] lg:w-[192px] xl:w-[228px] p-3.5 flex items-center gap-3')}>
        <span className="w-11 h-11 rounded-full bg-primary-solid text-white flex items-center justify-center shrink-0">
          <Check className="w-5 h-5" strokeWidth={2.6} />
        </span>
        <span className="flex flex-col gap-0.5 min-w-0">
          <span className="text-[10px] font-bold text-primary-solid tracking-[0.04em]">QR SCANNÉ · ENTRÉE</span>
          <span className="text-sm font-semibold">Jean-Marc K.</span>
          <span className="text-[11px] text-[#4b5c56]">Table 3 · 2 places</span>
        </span>
      </div>
    </div>
  );
}

export default function LandingHeroStreamlined() {
  const { user } = useAuth();
  const { site } = usePlatformSite();
  const cities = enabledPublicCities(site);
  const citySentence = formatCitySentence(cities);
  const isLoggedIn = Boolean(user);

  return (
    <>
      <section className="bg-surface">
        <div className="page-container grid lg:grid-cols-2 gap-10 lg:gap-16 items-center pt-8 pb-12 sm:pt-14 sm:pb-20 lg:pt-[72px] lg:pb-24">
          <div className="flex flex-col gap-5 sm:gap-7 min-w-0">
            {citySentence ? (
              <span className="self-start inline-flex items-center gap-2 pl-2 pr-3.5 py-1.5 rounded-full bg-[#ecfdf5] dark:bg-primary/15 text-[#065f46] dark:text-brand-accent text-xs sm:text-sm font-semibold">
                <span className="w-2 h-2 rounded-full bg-brand-accent ml-1.5" />
                Disponible à {citySentence}
              </span>
            ) : null}
            <h1 className="em-landing-heading text-4xl min-[400px]:text-[2.6rem] sm:text-6xl lg:text-5xl xl:text-[4rem] leading-[1.04] text-foreground text-balance">
              Votre événement, de A à Z, parfaitement orchestré.
            </h1>
            <p className="text-base sm:text-[19px] leading-relaxed text-muted max-w-[540px]">
              Trouvez la salle, estimez le budget, invitez sur WhatsApp et contrôlez les entrées par QR code.
              Tout se fait dans le navigateur, et on paie par Mobile Money.
            </p>

            {isLoggedIn ? (
              <div className="flex flex-col min-[420px]:flex-row min-[420px]:flex-wrap gap-3">
                <Button
                  href="/dashboard"
                  size="lg"
                  className="min-h-14 px-7 text-base sm:text-[17px] justify-center whitespace-nowrap"
                  rightIcon={<ArrowRight className="w-5 h-5" />}
                >
                  Ouvrir mon espace
                </Button>
                <Link
                  href="/dashboard"
                  className="inline-flex items-center justify-center gap-2 min-h-14 px-5 rounded-[14px] border border-primary/25 bg-primary/10 text-sm text-primary font-semibold hover:bg-primary/15 transition max-w-full"
                >
                  <LayoutDashboard className="w-4 h-4 shrink-0" />
                  <span className="min-w-0 truncate">Connecté · {user?.name || user?.email}</span>
                </Link>
              </div>
            ) : (
              <div className="flex flex-col min-[420px]:flex-row min-[420px]:flex-wrap gap-3">
                {site.allowRegistration ? (
                  <Button
                    href="/register?kind=ORGANIZER&intent=personal&action=event"
                    size="lg"
                    className="min-h-14 px-7 text-base sm:text-[17px] justify-center whitespace-nowrap"
                    rightIcon={<ArrowRight className="w-5 h-5" />}
                  >
                    Créer mon compte gratuit
                  </Button>
                ) : null}
                <Button
                  href="/marketplace/salles"
                  size="lg"
                  variant="secondary"
                  className="min-h-14 px-6 text-base sm:text-[17px] justify-center whitespace-nowrap border-[1.5px] border-[#c9d6d0] dark:border-border"
                >
                  Voir les salles
                </Button>
              </div>
            )}

            <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
              {['Sans carte bancaire', 'Aucune appli à installer', 'Compte prêt en 1 minute'].map((item) => (
                <li key={item} className="inline-flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-primary shrink-0" strokeWidth={2.5} />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="hidden sm:block">
            <HeroPhoneMock />
          </div>
        </div>
      </section>

      <nav aria-label="Sur cette page" className="border-y border-border bg-background">
        <div className="page-container py-3 sm:py-4 flex items-center gap-3">
          <span className="hidden md:inline shrink-0 text-sm font-semibold text-muted">Sur cette page</span>
          <ul
            className="flex items-center gap-2 min-w-0 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:flex-wrap"
            role="list"
          >
            {PAGE_SECTIONS.map((section) => (
              <li key={section.id} className="shrink-0">
                <a
                  href={`/#${section.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    goToSection(section.id);
                  }}
                  className="inline-flex items-center min-h-10 px-3.5 rounded-full border border-border bg-surface text-sm font-semibold text-foreground hover:border-primary/40 hover:text-primary transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  {section.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      <section id="profils" className="bg-background scroll-mt-16 md:scroll-mt-24">
        <div className="page-container pt-10 pb-8 sm:pt-20 sm:pb-12 lg:pt-24 flex flex-col gap-8 sm:gap-12">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3 lg:gap-8">
            <div className="flex flex-col gap-3">
              <span className="text-xs sm:text-sm font-bold text-primary tracking-[0.06em] uppercase">Pour qui ?</span>
              <h2 className="em-landing-heading text-3xl sm:text-[44px] text-foreground">Quel est votre projet ?</h2>
            </div>
            <p className="text-base sm:text-[17px] text-muted max-w-[420px]">
              Choisissez votre profil : {site.platformName || 'EventMaster'} vous montre directement les outils dont vous avez besoin.
            </p>
          </div>

          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5" role="list">
            {LANDING_PROFILES.map((profile, index) => {
              const card = PROFILE_CARDS[profile.id];
              const target = isLoggedIn ? LOGGED_IN_TARGETS[profile.id] : profile.cta;
              const featured = index === 0;
              const Icon = profile.icon;
              return (
                <li key={profile.id}>
                  <Link
                    href={target.href}
                    className={cn(
                      'group h-full sm:min-h-[300px] rounded-3xl p-5 sm:p-7 flex flex-col gap-3 sm:gap-4 transition duration-200 hover:-translate-y-[3px] hover:shadow-[0_14px_32px_rgba(15,31,26,0.12)] motion-reduce:transition-none motion-reduce:hover:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                      featured
                        ? 'bg-[#064e3b] text-white'
                        : 'bg-surface text-foreground border border-border',
                    )}
                  >
                    <span className="flex items-center gap-2.5">
                      <span
                        className={cn(
                          'w-9 h-9 rounded-xl flex items-center justify-center shrink-0',
                          featured ? 'bg-white/10 text-[#6ee7b7]' : 'bg-primary/10 text-primary',
                        )}
                      >
                        <Icon className="w-[18px] h-[18px]" aria-hidden />
                      </span>
                      <span
                        className={cn(
                          'text-xs sm:text-[13px] font-bold tracking-[0.05em] uppercase',
                          featured ? 'text-[#6ee7b7]' : 'text-primary',
                        )}
                      >
                        {card.eyebrow}
                      </span>
                    </span>
                    <span className="font-display text-[22px] sm:text-[26px] font-semibold leading-[1.15]">{card.title}</span>
                    <span className={cn('text-[15px] leading-relaxed', featured ? 'text-[#d1fae5]' : 'text-muted')}>
                      {card.desc}
                    </span>
                    <span
                      className={cn(
                        'mt-auto pt-2 inline-flex items-center gap-2 font-semibold',
                        featured ? 'text-white' : 'text-primary',
                      )}
                    >
                      {target.label}
                      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </section>
    </>
  );
}
