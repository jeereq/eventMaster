'use client';
import { useMessagingChannels } from '@/hooks/useMessagingChannels';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
import { ArrowRight, CalendarDays, Check, ChevronLeft, LayoutDashboard, Mic, PartyPopper, QrCode, Users } from 'lucide-react';
import { LISTING_EVENT_TYPES, type ListingEventTypeId } from '@/lib/listingDetails';
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

/** Textes courts et photo des cartes « Quel est votre projet ? » (photos locales, pas de dépendance externe). */
const PROFILE_CARDS: Record<LandingProfileId, { eyebrow: string; title: string; desc: string; image: string; alt: string }> = {
  personal: {
    eyebrow: 'Particulier',
    title: 'Mariage, anniversaire, réception',
    desc: 'Invitations WhatsApp, plan de table 3D, suivi des réponses.',
    image: '/images/landing/card-media-souvenirs.jpg',
    alt: 'Cortège de mariage avec la mariée et ses demoiselles d’honneur',
  },
  pro: {
    eyebrow: 'Pro & billetterie',
    title: 'Concerts, conférences, galas',
    desc: 'Billets payés par Mobile Money, contrôle d’accès par QR.',
    image: '/images/landing/card-billetterie-pro.jpg',
    alt: 'Public d’un concert, mains levées devant la scène',
  },
  seeker: {
    eyebrow: 'Recherche & devis',
    title: 'Trouver une salle ou un talent',
    desc: 'Visitez les salles en 3D et demandez des devis en un clic.',
    image: '/images/landing/card-trouver-lieu-talent.jpg',
    alt: 'Photographe en plein reportage pendant un événement',
  },
  vendor: {
    eyebrow: 'Prestataire & salle',
    title: 'Référencer mon activité',
    desc: 'Recevez des demandes de devis de clients qualifiés.',
    image: '/images/landing/card-referencer-activite.jpg',
    alt: 'Traiteur, DJ et sonorisation pendant une réception',
  },
};

const LOGGED_IN_TARGETS: Record<LandingProfileId, { href: string; label: string }> = {
  personal: { href: '/dashboard/events', label: 'Mes événements' },
  pro: { href: '/dashboard/events', label: 'Ma billetterie' },
  seeker: { href: '/marketplace', label: 'Explorer le marketplace' },
  vendor: { href: '/dashboard/catalogue', label: 'Mon catalogue' },
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

/** Maquette décorative : l’invitation telle que l’invité la reçoit sur son téléphone (exemple, pas de données réelles). */
function HeroInvitationMock() {
  const bubble = 'shadow-[0_1px_2px_rgba(16,40,28,0.08),0_4px_12px_rgba(16,40,28,0.06)]';
  return (
    <div aria-hidden className="relative flex justify-center select-none py-6 lg:pl-16">
      <span className="absolute left-1/2 top-1/2 w-[460px] h-[460px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(110,230,182,0.32)_0,rgba(49,113,76,0.16)_45%,transparent_70%)] blur-[2px]" />

      {/* Coque : bord métal, boutons latéraux, reflet. */}
      <div className="relative w-[288px] h-[580px] rounded-[50px] bg-[linear-gradient(145deg,#3a4a43_0%,#121a16_35%,#0b110e_70%,#2c3833_100%)] p-[9px] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12),0_50px_90px_rgba(2,24,16,0.6),0_12px_24px_rgba(2,24,16,0.35)]">
        <span className="absolute -left-[3px] top-[118px] w-[3px] h-9 rounded-l bg-[#26322d]" />
        <span className="absolute -left-[3px] top-[166px] w-[3px] h-14 rounded-l bg-[#26322d]" />
        <span className="absolute -right-[3px] top-[150px] w-[3px] h-[72px] rounded-r bg-[#26322d]" />

        <div className="em-light-island relative h-full rounded-[41px] overflow-hidden bg-[#f2f6f3] text-[#13201a] flex flex-col text-[12px] leading-[1.38]">
          <span className="absolute left-1/2 top-2.5 w-[88px] h-[24px] -translate-x-1/2 rounded-full bg-[#0b110e] z-20" />
          <span className="pointer-events-none absolute inset-0 z-10 rounded-[41px] bg-[linear-gradient(120deg,rgba(255,255,255,0.22)_0%,transparent_28%)]" />

          {/* En-tête de conversation */}
          <div className="shrink-0 bg-[#ffffff]/95 backdrop-blur pb-2.5 border-b border-[#e3ebe6]">
            <div className="h-10 flex items-center justify-between px-7 pt-1.5 text-[11px] font-semibold">
              <span>18:42</span>
              <span className="inline-flex items-end gap-[3px]">
                <span className="w-[3px] h-[5px] rounded-[1px] bg-[#13201a]" />
                <span className="w-[3px] h-[7px] rounded-[1px] bg-[#13201a]" />
                <span className="w-[3px] h-[9px] rounded-[1px] bg-[#13201a]" />
                <span className="ml-1 w-[18px] h-[9px] rounded-[3px] border border-[#13201a] p-px">
                  <span className="block w-[70%] h-full rounded-[1px] bg-[#13201a]" />
                </span>
              </span>
            </div>
            <div className="flex items-center gap-2.5 px-3.5">
              <ChevronLeft className="w-4 h-4 text-[#31714c]" strokeWidth={2.4} />
              <span className="relative w-9 h-9 shrink-0 rounded-full bg-[linear-gradient(140deg,#31714c,#1f4a33)] text-[#f5d48a] flex items-center justify-center font-display italic font-semibold text-[12px] ring-2 ring-[#6ee6b6]/50">
                G&amp;P
                <span className="absolute -right-0.5 -bottom-0.5 w-3 h-3 rounded-full bg-[#6ee6b6] border-2 border-[#ffffff]" />
              </span>
              <span className="flex-1 min-w-0 flex flex-col">
                <b className="text-[14px] leading-tight">Grâce &amp; Patrick</b>
                <span className="text-[11px] text-[#31714c] font-medium">Invitation officielle</span>
              </span>
              <span className="w-7 h-7 rounded-full bg-[#eef6f1] flex items-center justify-center">
                <CalendarDays className="w-3.5 h-3.5 text-[#31714c]" />
              </span>
            </div>
          </div>

          {/* Fil de messages */}
          <div className="flex-1 min-h-0 px-3 pt-3 pb-2 flex flex-col gap-2 bg-[radial-gradient(circle,rgba(49,113,76,0.07)_1.2px,transparent_1.6px)] [background-size:16px_16px]">
            <span className="self-center bg-[#e3ede7] text-[#4a6356] text-[9.5px] font-bold tracking-[0.08em] px-2.5 py-0.5 rounded-full">
              AUJOURD’HUI
            </span>

            <div className={cn('self-start w-[90%] bg-[#ffffff] rounded-[6px_16px_16px_16px] p-1.5', bubble)}>
              <div className="relative h-[128px] rounded-[11px] overflow-hidden">
                <Image
                  src="/images/landing/card-media-souvenirs.jpg"
                  alt=""
                  fill
                  sizes="240px"
                  className="object-cover object-[50%_28%]"
                />
                <span className="absolute inset-0 bg-[linear-gradient(180deg,rgba(31,74,51,0.1)_0%,rgba(31,74,51,0.55)_45%,rgba(16,40,28,0.92)_100%)]" />
                <span className="absolute inset-1.5 rounded-[8px] border border-[rgba(245,212,138,0.55)]" />
                <span className="absolute inset-x-0 bottom-2.5 flex flex-col items-center gap-0.5 text-center text-[#f5d48a]">
                  <span className="text-[7.5px] font-bold tracking-[0.32em]">MARIAGE</span>
                  <span className="font-display italic font-semibold text-[23px] leading-none drop-shadow-[0_1px_6px_rgba(0,0,0,0.35)]">
                    Grâce &amp; Patrick
                  </span>
                  <span className="mt-0.5 text-[9.5px] text-[#f7ecd2]">Sam. 14 déc. · 18:00 · Kinshasa</span>
                </span>
              </div>
              <div className="px-1.5 pt-2">Chère Esther, vous êtes invitée ! Répondez en un geste.</div>
              <div className="flex gap-1.5 px-1 pt-2 pb-0.5 text-[11px] whitespace-nowrap">
                <span className="flex-1 rounded-full bg-[#31714c] text-[#ffffff] font-semibold text-center py-[6px]">Oui, je viens</span>
                <span className="flex-1 rounded-full border border-[#cfe0d6] text-[#31714c] font-semibold text-center py-[5px]">
                  Je ne pourrai pas
                </span>
              </div>
              <div className="text-right text-[9.5px] text-[#7d8f86] px-1 pt-1">18:40</div>
            </div>

            <div className={cn('self-end bg-[linear-gradient(135deg,#31714c,#285e3f)] text-[#ffffff] rounded-[16px_6px_16px_16px] px-3 pt-1.5 pb-1 flex items-end gap-2', bubble)}>
              <span>Oui, je viens !</span>
              <span className="text-[9.5px] text-[#c7f3df] whitespace-nowrap inline-flex items-center gap-0.5">
                18:41 <Check className="w-3 h-3 text-[#6ee6b6]" strokeWidth={3} />
              </span>
            </div>

            <div className={cn('self-start w-[84%] bg-[#ffffff] rounded-[6px_16px_16px_16px] overflow-hidden flex', bubble)}>
              <span className="w-[54px] shrink-0 bg-[#eef6f1] flex items-center justify-center border-r border-dashed border-[#c5d9cd]">
                <span className="w-9 h-9 rounded-lg bg-[#ffffff] border border-[#d8e6dd] flex items-center justify-center">
                  <QrCode className="w-6 h-6 text-[#1f4a33]" strokeWidth={1.7} />
                </span>
              </span>
              <span className="flex-1 min-w-0 flex flex-col px-2.5 py-2">
                <b className="text-[#1f4a33]">Votre badge QR est prêt</b>
                <span className="text-[#5b6f65]">Table 3 · 2 places</span>
                <span className="self-end text-[9.5px] text-[#7d8f86]">18:42</span>
              </span>
            </div>
          </div>

          {/* Barre de saisie */}
          <div className="shrink-0 flex items-center gap-2 px-2.5 pt-1.5 pb-4 bg-[#f2f6f3]">
            <span className="flex-1 h-[34px] rounded-full bg-[#ffffff] border border-[#e0e9e3] text-[#8a9b92] flex items-center px-3.5">Message</span>
            <span className="w-[34px] h-[34px] rounded-full bg-[#31714c] flex items-center justify-center shadow-[0_4px_10px_rgba(49,113,76,0.35)]">
              <Mic className="w-4 h-4 text-[#ffffff]" />
            </span>
          </div>
          <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-[96px] h-1 rounded-full bg-[#13201a]/80" />
        </div>
      </div>

      {/* Pastille : entrée validée le jour J */}
      <div className="em-light-island absolute -right-2 top-0 hidden xl:flex items-center gap-2.5 bg-[#ffffff] text-[#13201a] rounded-2xl pl-2 pr-3.5 py-2 shadow-[0_18px_36px_rgba(2,30,22,0.4)]">
        <span className="w-8 h-8 rounded-xl bg-[#6ee6b6] flex items-center justify-center">
          <Check className="w-4 h-4 text-[#1f4a33]" strokeWidth={3} />
        </span>
        <span className="flex flex-col leading-tight">
          <b className="text-[13px]">Entrée validée</b>
          <span className="text-[11px] text-[#5d5f62]">Esther · Table 3 · 19:02</span>
        </span>
      </div>

      <div className="em-light-island absolute left-0 bottom-0 hidden lg:flex w-[214px] bg-[#ffffff] text-[#1e1f21] rounded-[18px] p-4 flex-col gap-2.5 shadow-[0_24px_48px_rgba(2,30,22,0.45)]">
        <div className="flex justify-between items-baseline">
          <span className="text-xs font-semibold text-[#5d5f62]">Réponses</span>
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#31714c]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#31714c]" />
            En direct
          </span>
        </div>
        <span className="font-display font-semibold text-[30px] leading-none tracking-[-0.02em]">
          86 <span className="text-[15px] font-medium text-[#5d5f62]">confirmés sur 120</span>
        </span>
        <span className="h-2 rounded-full bg-[#ededee] overflow-hidden">
          <span className="block w-[72%] h-full rounded-full bg-[linear-gradient(90deg,#31714c,#6ee6b6)]" />
        </span>
        <span className="text-[13px] text-[#5d5f62]">12 en attente · relance en un clic</span>
      </div>
    </div>
  );
}

/** Formulaire du haut de page : pré-remplit le simulateur budget avec le type, les invités et la date. */
function HeroBriefForm() {
  const router = useRouter();
  const [eventType, setEventType] = useState<ListingEventTypeId>('wedding');
  const [guests, setGuests] = useState('150');
  const [date, setDate] = useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams({ studio: 'budget', type: eventType });
    const count = Number(guests);
    if (Number.isFinite(count) && count > 0) params.set('guests', String(Math.round(count)));
    if (date) params.set('date', date);
    router.push(`/simulateur?${params.toString()}`);
  };

  const field = 'flex-1 basis-[130px] min-w-0 flex items-center gap-2.5 px-3.5 py-1.5';
  const control =
    'w-full min-w-0 min-h-6 p-0 border-0 bg-transparent text-base font-semibold text-[#1e1f21] focus:outline-none';

  return (
    <form
      onSubmit={submit}
      aria-label="Estimer le budget de mon événement"
      className="em-light-island max-w-[680px] bg-[#ffffff] text-[#1e1f21] rounded-[18px] p-1.5 flex flex-wrap gap-1 shadow-[0_20px_40px_rgba(2,30,22,0.35)]"
    >
      <div className={cn(field, 'sm:border-r sm:border-[#eeeff0]')}>
        <PartyPopper className="w-5 h-5 shrink-0 text-[#31714c]" aria-hidden />
        <span className="flex flex-col min-w-0 flex-1">
          <label htmlFor="hero-type" className="text-xs font-semibold text-[#5d5f62]">Je prépare</label>
          <select id="hero-type" value={eventType} onChange={(e) => setEventType(e.target.value as ListingEventTypeId)} className={control}>
            {LISTING_EVENT_TYPES.map((t) => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>
        </span>
      </div>
      <div className={cn(field, 'basis-[110px] sm:border-r sm:border-[#eeeff0]')}>
        <Users className="w-5 h-5 shrink-0 text-[#31714c]" aria-hidden />
        <span className="flex flex-col min-w-0 flex-1">
          <label htmlFor="hero-guests" className="text-xs font-semibold text-[#5d5f62]">Invités</label>
          <input
            id="hero-guests"
            type="number"
            inputMode="numeric"
            min={1}
            max={100000}
            value={guests}
            onChange={(e) => setGuests(e.target.value)}
            className={control}
          />
        </span>
      </div>
      <div className={cn(field, 'basis-[160px]')}>
        <CalendarDays className="w-5 h-5 shrink-0 text-[#31714c]" aria-hidden />
        <span className="flex flex-col min-w-0 flex-1">
          <label htmlFor="hero-date" className="text-xs font-semibold text-[#5d5f62]">Date</label>
          <input id="hero-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className={control} />
        </span>
      </div>
      <button
        type="submit"
        className="flex-1 basis-[200px] whitespace-nowrap min-h-14 px-5 rounded-[13px] bg-[#fbbf24] text-[#171614] text-base font-semibold inline-flex items-center justify-center gap-2 hover:bg-[#f59e0b] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#31714c] focus-visible:ring-offset-2"
      >
        Estimer mon budget
        <ArrowRight className="w-[18px] h-[18px]" aria-hidden />
      </button>
    </form>
  );
}

export default function LandingHeroStreamlined() {
  const messaging = useMessagingChannels();
  const { user } = useAuth();
  const { site } = usePlatformSite();
  const cities = enabledPublicCities(site);
  const citySentence = formatCitySentence(cities);
  const isLoggedIn = Boolean(user);

  return (
    <>
      <section className="relative isolate overflow-hidden bg-[#1f4a33] text-[#ffffff]">
        {/* Photo d’ambiance (réception sous guirlandes) teintée aux couleurs de la charte verte. */}
        <Image
          src="/images/landing/hero-reception-soiree.webp"
          alt=""
          aria-hidden
          fill
          priority
          sizes="100vw"
          className="-z-20 object-cover object-[60%_center]"
        />
        <span aria-hidden className="absolute inset-0 -z-10 bg-[#0b6b50]/45 mix-blend-color" />
        <span
          aria-hidden
          className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(31,74,51,0.55)_0%,rgba(31,74,51,0.78)_38%,rgba(31,74,51,0.7)_70%,rgba(4,47,36,0.92)_100%)] lg:bg-[linear-gradient(90deg,rgba(4,47,36,0.95)_0%,rgba(31,74,51,0.85)_38%,rgba(31,74,51,0.35)_68%,rgba(31,74,51,0.15)_100%)]"
        />
        <span
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-24 -z-10 bg-gradient-to-t from-[#042f24]/70 to-transparent"
        />
        <div className="page-container grid lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] gap-10 lg:gap-12 items-center pt-10 pb-12 sm:pt-16 sm:pb-16 lg:py-16">
          <div className="flex flex-col gap-5 sm:gap-6 min-w-0">
            {citySentence ? (
              <span className="self-start inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#0b5e48] text-[#d7f6e9] text-xs sm:text-sm font-semibold">
                <span className="w-2 h-2 rounded-full bg-[#fbbf24]" />
                Disponible à {citySentence}
              </span>
            ) : null}
            <h1 className="em-landing-heading text-[2.5rem] min-[400px]:text-[2.75rem] sm:text-[3.4rem] xl:text-[3.6rem] leading-[1.05] text-balance max-w-[620px]">
              Votre fête, de l’invitation jusqu’à l’entrée.
            </h1>
            <p className="text-base sm:text-lg leading-relaxed text-[#d7f6e9] max-w-[520px]">
              {messaging.adapt('Salle, budget, invitations WhatsApp et contrôle des entrées, au même endroit. Payé par Mobile Money.')}
            </p>

            <HeroBriefForm />

            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              {isLoggedIn ? (
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2 min-h-11 px-4 rounded-xl border border-[#0f6b52] text-[#ffffff] font-semibold hover:bg-[#0b5e48] transition max-w-full"
                >
                  <LayoutDashboard className="w-4 h-4 shrink-0" />
                  <span className="min-w-0 truncate">Ouvrir mon espace · {user?.name || user?.email}</span>
                </Link>
              ) : site.allowRegistration ? (
                <Link
                  href="/register?kind=ORGANIZER&intent=personal&action=event"
                  className="inline-flex items-center min-h-11 px-4 rounded-xl border border-[#0f6b52] text-[#ffffff] font-semibold hover:bg-[#0b5e48] transition"
                >
                  Créer mon compte gratuit
                </Link>
              ) : null}
              {['Sans carte bancaire', 'Aucune appli à installer'].map((item) => (
                <span key={item} className="inline-flex items-center gap-1.5 text-sm text-[#b0eed5]">
                  <Check className="w-4 h-4 text-[#fbbf24] shrink-0" strokeWidth={2.6} />
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="hidden sm:block">
            <HeroInvitationMock />
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

          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5" role="list">
            {LANDING_PROFILES.map((profile, index) => {
              const card = PROFILE_CARDS[profile.id];
              const target = isLoggedIn ? LOGGED_IN_TARGETS[profile.id] : profile.cta;
              const Icon = profile.icon;
              return (
                <li key={profile.id}>
                  <Link
                    href={target.href}
                    className="group h-full overflow-hidden rounded-3xl bg-surface text-foreground border border-border flex sm:flex-col transition duration-200 hover:-translate-y-[3px] hover:border-primary/30 hover:shadow-[0_14px_32px_rgba(15,31,26,0.12)] motion-reduce:transition-none motion-reduce:hover:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  >
                    <span className="relative w-28 min-[420px]:w-32 sm:w-full shrink-0 sm:aspect-[4/3] overflow-hidden bg-[#1f4a33]">
                      <Image
                        src={card.image}
                        alt={card.alt}
                        fill
                        sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 128px"
                        priority={index < 2}
                        className="object-cover transition-transform duration-500 group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                      />
                      <span
                        aria-hidden
                        className="hidden sm:block absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/45 to-transparent"
                      />
                      <span className="hidden sm:inline-flex absolute left-4 bottom-4 items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-full bg-white/95 text-[#275a3d] text-xs font-bold tracking-[0.04em] uppercase">
                        <span className="w-6 h-6 rounded-full bg-[#effbf6] flex items-center justify-center">
                          <Icon className="w-3.5 h-3.5" aria-hidden />
                        </span>
                        {card.eyebrow}
                      </span>
                    </span>
                    <span className="min-w-0 flex-1 p-4 sm:p-6 flex flex-col gap-1.5 sm:gap-3">
                      <span className="sm:hidden text-[11px] font-bold tracking-[0.05em] uppercase text-primary">
                        {card.eyebrow}
                      </span>
                      <span className="font-display text-lg sm:text-[22px] font-semibold leading-[1.2]">{card.title}</span>
                      <span className="text-sm sm:text-[15px] leading-relaxed text-muted">{messaging.adapt(card.desc)}</span>
                      <span className="mt-auto pt-1 sm:pt-2 inline-flex items-center gap-2 text-sm sm:text-base font-semibold text-primary">
                        {target.label}
                        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                      </span>
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
