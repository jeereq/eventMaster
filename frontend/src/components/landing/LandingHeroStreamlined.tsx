'use client';
import { useMessagingChannels } from '@/hooks/useMessagingChannels';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, LayoutDashboard } from '@/components/icons';
import { useAuth } from '@/context/AuthContext';
import { usePlatformSite } from '@/context/PlatformSiteContext';
import { enabledPublicCities } from '@/lib/platformCities';
import LandingLoopVideo from '@/components/landing/LandingLoopVideo';

function formatCitySentence(cities: string[]): string {
  if (cities.length === 0) return '';
  if (cities.length === 1) return cities[0];
  return `${cities.slice(0, -1).join(', ')} et ${cities[cities.length - 1]}`;
}

/* Vidéo Pexels 11084952 (https://www.pexels.com/video/11084952/), crédit facultatif.
 * La mariée filmée ne doit pas sembler recommander le service : ni citation ni nom dessus. */

const pill =
  'inline-flex items-center justify-center gap-2 min-h-12 px-6 rounded-full text-base font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black/40';

/** Haut de page : vidéo d'une mariée en plein écran, titre centré, deux actions. */
export default function LandingHeroStreamlined() {
  const messaging = useMessagingChannels();
  const { user } = useAuth();
  const { site } = usePlatformSite();
  const citySentence = formatCitySentence(enabledPublicCities(site));

  return (
    <section className="relative isolate overflow-hidden bg-[#0b1512] text-white">
      <LandingLoopVideo
        src="/videos/landing/mariee-voiture.mp4"
        poster="/videos/landing/mariee-voiture.jpg"
        alt=""
        sizes="100vw"
        priority
        className="-z-10"
        pauseClassName="bottom-3 right-3"
        overlay={<span aria-hidden className="absolute inset-0 bg-[linear-gradient(180deg,rgba(11,21,18,0.35)_0%,rgba(11,21,18,0.55)_60%,rgba(11,21,18,0.75)_100%)]" />}
      />
      {/* Le calque de texte laisse passer les clics vers le bouton pause de la vidéo. */}
      <div className="pointer-events-none [&>*]:pointer-events-auto page-container min-h-[78svh] sm:min-h-[82svh] flex flex-col items-center justify-center text-center gap-5 sm:gap-6 py-20">
        <h1 data-reveal className="em-landing-heading text-5xl sm:text-6xl xl:text-7xl leading-[1.08] text-balance max-w-[16ch]">
          Votre fête, de l’invitation jusqu’à l’entrée
        </h1>
        <p data-reveal style={{ '--i': 1 } as React.CSSProperties} className="text-base sm:text-lg leading-relaxed text-white/85 max-w-[560px]">
          {messaging.adapt('Salle, budget, invitations WhatsApp et contrôle des entrées, au même endroit. Payé par Mobile Money.')}
          {citySentence ? ` Disponible à ${citySentence}.` : null}
        </p>
        <div data-reveal style={{ '--i': 2 } as React.CSSProperties} className="mt-2 flex flex-col min-[440px]:flex-row gap-3 w-full min-[440px]:w-auto">
          {user ? (
            <Link href="/dashboard" className={`${pill} em-light-island bg-white text-[#1f4a33] hover:bg-[#effbf6]`}>
              <LayoutDashboard className="w-4 h-4" aria-hidden />
              Ouvrir mon espace
            </Link>
          ) : site.allowRegistration ? (
            <Link href="/register?kind=ORGANIZER&intent=personal&action=event" className={`${pill} em-light-island bg-white text-[#1f4a33] hover:bg-[#effbf6]`}>
              Créer mon événement
              <ArrowRight className="w-4 h-4" aria-hidden />
            </Link>
          ) : null}
          <Link href="/simulateur" className={`${pill} border border-white/70 text-white hover:bg-white/10`}>
            Estimer mon budget
          </Link>
        </div>
      </div>
    </section>
  );
}
