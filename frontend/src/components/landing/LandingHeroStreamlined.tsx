'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
import { ArrowRight, CalendarDays, Check, ChevronLeft, LayoutDashboard, Mic, PartyPopper, QrCode, Users, Video } from 'lucide-react';
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

/** Maquette décorative : l’invitation telle qu’elle arrive sur WhatsApp (exemple, pas de données réelles). */
function HeroWhatsAppMock() {
  const bubble = 'shadow-[0_1px_0.5px_rgba(11,20,26,0.13)]';
  return (
    <div aria-hidden className="relative flex justify-center select-none py-2 lg:pl-16">
      <span className="absolute left-1/2 top-1/2 w-[420px] h-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(251,191,36,0.28)_0,rgba(16,185,129,0.12)_45%,transparent_70%)]" />

      <div className="relative w-[284px] h-[560px] rounded-[46px] bg-[#0d1512] p-2 shadow-[inset_0_0_0_1.5px_#2b3a35,0_40px_80px_rgba(2,30,22,0.55)]">
        <div className="em-light-island relative h-full rounded-[38px] overflow-hidden bg-[#efeae2] text-[#111b21] flex flex-col text-[12px] leading-[1.35]">
          <span className="absolute left-1/2 top-2 w-[84px] h-[22px] -translate-x-1/2 rounded-full bg-[#0d1512] z-10" />
          <div className="shrink-0 bg-[#ffffff] pb-2 shadow-[0_1px_0_#e9edef]">
            <div className="h-9 flex items-center justify-between px-6 pt-1 text-[11px] font-semibold">
              <span>18:42</span>
              <span className="inline-flex items-end gap-[3px]">
                <span className="w-[3px] h-[5px] rounded-[1px] bg-[#111b21]" />
                <span className="w-[3px] h-[7px] rounded-[1px] bg-[#111b21]" />
                <span className="w-[3px] h-[9px] rounded-[1px] bg-[#111b21]" />
                <span className="ml-1 w-[17px] h-2 rounded-[3px] border border-[#111b21] p-px">
                  <span className="block w-[70%] h-full rounded-[1px] bg-[#111b21]" />
                </span>
              </span>
            </div>
            <div className="flex items-center gap-2.5 px-3 pt-0.5">
              <ChevronLeft className="w-4 h-4" strokeWidth={2.4} />
              <span className="w-[34px] h-[34px] shrink-0 rounded-full bg-[radial-gradient(circle_at_50%_30%,#6b1f53,#3b0d2e)] text-[#f5d48a] flex items-center justify-center font-display italic font-semibold text-[13px]">
                G&amp;P
              </span>
              <span className="flex-1 min-w-0 flex flex-col">
                <b className="text-[14px]">Grâce &amp; Patrick</b>
                <span className="text-[11px] text-[#667781]">en ligne</span>
              </span>
              <Video className="w-4 h-4" />
            </div>
          </div>

          <div className="flex-1 min-h-0 px-2.5 pt-2.5 pb-2 flex flex-col gap-[7px] bg-[radial-gradient(circle,rgba(17,27,33,0.05)_1.2px,transparent_1.6px)] [background-size:16px_16px]">
            <span className={cn('self-center bg-[#ffffff] text-[#54656f] text-[10px] font-semibold px-2.5 py-0.5 rounded-[7px]', bubble)}>
              AUJOURD’HUI
            </span>
            <div className="self-start w-[88%] flex flex-col gap-0.5">
              <div className={cn('bg-[#ffffff] rounded-[4px_10px_10px_10px] p-1', bubble)}>
                <div className="rounded-[7px] p-1.5 bg-[radial-gradient(circle_at_50%_15%,#6b1f53_0,#3b0d2e_65%)]">
                  <div className="border border-[rgba(245,212,138,0.6)] rounded px-2 pt-3.5 pb-3 text-center text-[#f5d48a] flex flex-col items-center gap-1">
                    <span className="text-[8px] font-semibold tracking-[0.3em]">MARIAGE</span>
                    <span className="font-display italic font-semibold text-[26px] leading-none">Grâce &amp; Patrick</span>
                    <span className="flex items-center gap-1.5 w-[64%]">
                      <span className="flex-1 h-px bg-[rgba(245,212,138,0.5)]" />
                      <span className="w-[5px] h-[5px] bg-[#f5d48a] rotate-45" />
                      <span className="flex-1 h-px bg-[rgba(245,212,138,0.5)]" />
                    </span>
                    <span className="text-[10px] text-[#f7e9c8]">Sam. 14 déc. · 18:00 · Kinshasa</span>
                  </div>
                </div>
                <div className="px-1.5 pt-1.5">Chère Esther, vous êtes invitée ! Répondez en un geste.</div>
                <div className="text-right text-[10px] text-[#667781] px-1">18:40</div>
              </div>
              {['Oui, je viens', 'Je ne pourrai pas'].map((label) => (
                <div key={label} className={cn('bg-[#ffffff] rounded-lg text-[#027eb5] font-semibold text-center py-[7px]', bubble)}>
                  {label}
                </div>
              ))}
            </div>
            <div className={cn('self-end bg-[#d9fdd3] rounded-[10px_4px_10px_10px] px-2 pt-1.5 pb-1 flex items-end gap-2', bubble)}>
              <span>Oui, je viens !</span>
              <span className="text-[10px] text-[#667781] whitespace-nowrap">
                18:41 <span className="text-[#53bdeb]">✓✓</span>
              </span>
            </div>
            <div className={cn('self-start w-[80%] bg-[#ffffff] rounded-[4px_10px_10px_10px] px-2 pt-[7px] pb-1 flex gap-2 items-center', bubble)}>
              <span className="w-10 h-10 shrink-0 rounded-md border border-[#e9edef] flex items-center justify-center">
                <QrCode className="w-7 h-7 text-[#111b21]" strokeWidth={1.6} />
              </span>
              <span className="flex-1 min-w-0 flex flex-col">
                <b className="text-[#047857]">Votre badge QR est prêt</b>
                <span className="text-[#54656f]">Table 3 · 2 places</span>
                <span className="self-end text-[10px] text-[#667781]">18:42</span>
              </span>
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-[7px] px-2 pt-1.5 pb-3.5">
            <span className={cn('flex-1 h-[34px] rounded-full bg-[#ffffff] text-[#8696a0] flex items-center px-3.5', bubble)}>Message</span>
            <span className="w-[34px] h-[34px] rounded-full bg-[#00a884] flex items-center justify-center">
              <Mic className="w-4 h-4 text-[#ffffff]" />
            </span>
          </div>
        </div>
      </div>

      <div className="em-light-island absolute left-0 bottom-12 hidden lg:flex w-[214px] bg-[#ffffff] text-[#1e1f21] rounded-[18px] p-4 flex-col gap-2.5 shadow-[0_24px_48px_rgba(2,30,22,0.45)]">
        <div className="flex justify-between items-baseline">
          <span className="text-xs font-semibold text-[#5d5f62]">Réponses</span>
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#047857]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#047857]" />
            En direct
          </span>
        </div>
        <span className="font-display font-semibold text-[30px] leading-none tracking-[-0.02em]">
          86 <span className="text-[15px] font-medium text-[#5d5f62]">confirmés sur 120</span>
        </span>
        <span className="h-2 rounded-full bg-[#ededee] overflow-hidden">
          <span className="block w-[72%] h-full rounded-full bg-[#047857]" />
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
        <PartyPopper className="w-5 h-5 shrink-0 text-[#047857]" aria-hidden />
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
        <Users className="w-5 h-5 shrink-0 text-[#047857]" aria-hidden />
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
        <CalendarDays className="w-5 h-5 shrink-0 text-[#047857]" aria-hidden />
        <span className="flex flex-col min-w-0 flex-1">
          <label htmlFor="hero-date" className="text-xs font-semibold text-[#5d5f62]">Date</label>
          <input id="hero-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className={control} />
        </span>
      </div>
      <button
        type="submit"
        className="flex-1 basis-[200px] whitespace-nowrap min-h-14 px-5 rounded-[13px] bg-[#fbbf24] text-[#171614] text-base font-semibold inline-flex items-center justify-center gap-2 hover:bg-[#f59e0b] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#047857] focus-visible:ring-offset-2"
      >
        Estimer mon budget
        <ArrowRight className="w-[18px] h-[18px]" aria-hidden />
      </button>
    </form>
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
      <section className="bg-[#064e3b] text-[#ffffff]">
        <div className="page-container grid lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] gap-10 lg:gap-12 items-center pt-10 pb-12 sm:pt-16 sm:pb-16 lg:py-16">
          <div className="flex flex-col gap-5 sm:gap-6 min-w-0">
            {citySentence ? (
              <span className="self-start inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#0b5e48] text-[#d1fae5] text-xs sm:text-sm font-semibold">
                <span className="w-2 h-2 rounded-full bg-[#fbbf24]" />
                Disponible à {citySentence}
              </span>
            ) : null}
            <h1 className="em-landing-heading text-[2.5rem] min-[400px]:text-[2.75rem] sm:text-[3.4rem] xl:text-[3.6rem] leading-[1.05] text-balance max-w-[620px]">
              Votre fête, de l’invitation jusqu’à l’entrée.
            </h1>
            <p className="text-base sm:text-lg leading-relaxed text-[#d1fae5] max-w-[520px]">
              Salle, budget, invitations WhatsApp et contrôle des entrées, au même endroit. Payé par Mobile Money.
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
                <span key={item} className="inline-flex items-center gap-1.5 text-sm text-[#a7f3d0]">
                  <Check className="w-4 h-4 text-[#fbbf24] shrink-0" strokeWidth={2.6} />
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="hidden sm:block">
            <HeroWhatsAppMock />
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
                    <span className="relative w-28 min-[420px]:w-32 sm:w-full shrink-0 sm:aspect-[4/3] overflow-hidden bg-[#064e3b]">
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
                      <span className="hidden sm:inline-flex absolute left-4 bottom-4 items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-full bg-white/95 text-[#065f46] text-xs font-bold tracking-[0.04em] uppercase">
                        <span className="w-6 h-6 rounded-full bg-[#ecfdf5] flex items-center justify-center">
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
                      <span className="text-sm sm:text-[15px] leading-relaxed text-muted">{card.desc}</span>
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
