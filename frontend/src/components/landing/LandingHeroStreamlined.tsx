'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { ArrowRight, Check, LayoutDashboard } from 'lucide-react';
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
  { initials: 'JK', name: 'Jean-Marc K.', status: 'Confirmé', pending: false },
  { initials: 'SM', name: 'Sarah M.', status: 'Confirmé', pending: false },
  { initials: 'DL', name: 'Didier L.', status: 'En attente', pending: true },
  { initials: 'EI', name: 'Esther I.', status: 'Confirmé', pending: false },
];

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

/** Maquette décorative du tableau des invités (exemple, pas de données réelles). */
function HeroPhoneMock() {
  return (
    <div
      aria-hidden
      className="relative h-[460px] lg:h-[540px] rounded-[2rem] bg-[#064e3b] overflow-hidden select-none"
    >
      <div className="absolute -right-20 -top-20 w-80 h-80 rounded-full border-[48px] border-brand-accent opacity-20" />
      <div className="absolute left-1/2 -translate-x-[30%] top-10 w-[240px] lg:w-[250px] h-[400px] lg:h-[480px] rounded-[2.25rem] bg-[#0b1512] p-2.5">
        <div className="w-full h-full rounded-[1.75rem] bg-[#f4f7f5] text-[#0f1f1a] px-3.5 py-4 flex flex-col gap-3">
          <div className="font-display text-[15px] font-semibold">Invités</div>
          <div className="grid grid-cols-3 gap-1.5">
            {[
              ['186', 'Confirmés', 'text-primary-solid'],
              ['41', 'En attente', 'text-amber-700'],
              ['23', 'Déclinés', 'text-[#4b5c56]'],
            ].map(([value, label, tone]) => (
              <div key={label} className="bg-white rounded-[10px] p-2 flex flex-col gap-0.5">
                <span className={cn('font-display text-[17px] font-semibold', tone)}>{value}</span>
                <span className="text-[9px] text-[#4b5c56]">{label}</span>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-xl flex flex-col">
            {DEMO_GUESTS.map((guest, index) => (
              <div
                key={guest.initials}
                className={cn(
                  'flex items-center gap-2 px-2.5 py-2',
                  index < DEMO_GUESTS.length - 1 && 'border-b border-[#edf2ef]',
                )}
              >
                <span className="w-[26px] h-[26px] rounded-full bg-[#ecfdf5] text-[10px] font-semibold text-[#065f46] flex items-center justify-center">
                  {guest.initials}
                </span>
                <span className="grow text-[11px] font-semibold">{guest.name}</span>
                <span
                  className={cn(
                    'text-[9px] font-semibold px-1.5 py-0.5 rounded-full',
                    guest.pending ? 'text-amber-800 bg-amber-100' : 'text-[#065f46] bg-[#d1fae5]',
                  )}
                >
                  {guest.status}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-auto h-10 rounded-[10px] bg-primary-solid text-white text-[11px] font-semibold flex items-center justify-center">
            Relancer sur WhatsApp
          </div>
        </div>
      </div>
      <div className="absolute left-6 lg:left-8 top-24 lg:top-28 w-[200px] lg:w-[220px] bg-white text-[#0f1f1a] rounded-[18px] p-4 flex flex-col gap-2.5 shadow-[0_16px_40px_rgba(2,44,34,0.35)]">
        <span className="text-[11px] font-bold text-primary-solid tracking-[0.05em]">BUDGET IA</span>
        <span className="font-display text-[28px] font-semibold leading-none">12 400 $</span>
        <span className="flex h-2 rounded overflow-hidden gap-0.5">
          <span className="w-[34%] bg-[#065f46]" />
          <span className="w-[28%] bg-brand-accent" />
          <span className="w-[22%] bg-[#6ee7b7]" />
          <span className="w-[16%] bg-[#e5ece8]" />
        </span>
        <span className="text-xs text-[#4b5c56]">Salle, traiteur, déco, photo, DJ</span>
      </div>
      <div className="absolute right-5 lg:right-7 top-[17rem] lg:top-[19rem] w-[210px] lg:w-[230px] bg-white text-[#0f1f1a] rounded-[18px] p-3.5 flex items-center gap-3 shadow-[0_16px_40px_rgba(2,44,34,0.35)]">
        <span className="w-11 h-11 rounded-full bg-primary-solid text-white flex items-center justify-center shrink-0">
          <Check className="w-5 h-5" strokeWidth={2.6} />
        </span>
        <span className="flex flex-col gap-0.5">
          <span className="text-[11px] font-bold text-primary-solid">QR SCANNÉ · ENTRÉE</span>
          <span className="text-sm font-semibold">Table 3 · 2 places</span>
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
