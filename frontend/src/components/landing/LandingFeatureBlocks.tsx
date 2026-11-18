'use client';

import React, { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, QrCode } from '@/components/icons';
import { cn } from '@/lib/cn';
import { useMessagingChannels } from '@/hooks/useMessagingChannels';
import { usePlatformSite } from '@/context/PlatformSiteContext';
import LandingLoopVideo from '@/components/landing/LandingLoopVideo';
import LandingBudgetForm from '@/components/landing/LandingBudgetForm';
import Landing3DViewer from '@/components/landing/Landing3DViewer';

type Feature = {
  id: string;
  nav: string;
  lead: string;
  strong: string;
  text: string;
  /** Teinte du bloc, prise dans la palette d'origine (verts EventMaster). */
  tone: string;
  /** Texte centré au-dessus du visuel, qui prend toute la largeur. */
  wide?: boolean;
  media: ReactNode;
  actions: ReactNode;
};

// em-light-island : le bouton blanc reste blanc en mode sombre.
const pillLight =
  'em-light-island inline-flex items-center justify-center gap-2 min-h-11 px-5 rounded-full bg-white text-[#1f4a33] font-semibold hover:bg-[#effbf6] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#1f4a33]';
const pillOutline =
  'inline-flex items-center justify-center gap-2 min-h-11 px-5 rounded-full border border-white/70 text-white font-semibold hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white';

/**
 * Photo de fête avec la capture du produit sur téléphone posée devant.
 * `cutout` : objet détouré (PNG/WebP transparent) qui flotte librement au lieu d'une photo cadrée.
 */
function PhotoWithPhone({ photo, photoPosition, cutout, video, poster, alt }: { photo?: string; photoPosition?: string; cutout?: string; video: string; poster: string; alt: string }) {
  return (
    <div className="relative w-full max-w-[460px] pr-[14%] pb-[10%]">
      {cutout ? (
        <div className="relative aspect-[4/5] flex items-start justify-center pt-[12%]">
          <div className="em-photo-hover w-[96%] -ml-[6%]">
            <Image
              src={cutout}
              alt=""
              aria-hidden
              width={1000}
              height={794}
              sizes="(min-width: 1024px) 420px, 85vw"
              className="w-full h-auto -rotate-[8deg] drop-shadow-[0_28px_32px_rgba(0,0,0,0.38)]"
            />
          </div>
        </div>
      ) : (
        <div className="relative aspect-[4/5] overflow-hidden rounded-[1.75rem] bg-black/20">
          <Image src={photo ?? ''} alt="" aria-hidden fill sizes="(min-width: 1024px) 380px, 80vw" className="object-cover" style={{ objectPosition: photoPosition ?? 'center' }} />
        </div>
      )}
      {/* Cadre noir autour d'un écran exactement en 1:2, le format des vidéos (390 × 780) : rien n'est recadré. */}
      <div className="absolute right-0 bottom-0 w-[42%] rounded-[1.6rem] bg-[#0b1512] p-[5px] shadow-[0_24px_48px_rgba(0,0,0,0.35)]">
        <div className="relative aspect-[1/2] overflow-hidden rounded-[1.1rem] bg-[#0b1512]">
          <LandingLoopVideo src={video} poster={poster} alt={alt} sizes="200px" pauseClassName="bottom-1.5 right-1.5 h-9 w-9" />
        </div>
      </div>
    </div>
  );
}

export default function LandingFeatureBlocks() {
  const messaging = useMessagingChannels();
  const { site } = usePlatformSite();
  const budgetBlocked = site?.studioVisibility?.budget === false;
  const [activeId, setActiveId] = useState('simulateur-ia');

  const features: Feature[] = [
    {
      id: 'simulateur-ia',
      nav: 'Budget',
      lead: 'Votre budget,',
      strong: 'chiffré en 3 formules',
      text: 'Indiquez vos invités et votre ville : l’IA compose 3 formules (Éco, Équilibré, Confort) avec les prestataires certifiés.',
      tone: 'bg-[#1f4a33]',
      media: (
        <PhotoWithPhone
          photo="/images/landing/photo-table-reception.jpg"
          photoPosition="center 55%"
          video="/videos/landing/simulateur.mp4"
          poster="/videos/landing/simulateur.jpg"
          alt="Simulateur sur téléphone : trois formules chiffrées pour un mariage de 150 invités"
        />
      ),
      actions: budgetBlocked ? (
        <Link href="/simulateur" className={pillLight}>Découvrir le simulateur</Link>
      ) : (
        <LandingBudgetForm className="shadow-[0_20px_40px_rgba(0,0,0,0.25)]" />
      ),
    },
    {
      id: 'invitations',
      nav: 'Invitations',
      lead: 'Des invitations',
      strong: messaging.adapt('envoyées sur WhatsApp'),
      text: 'Chaque invité reçoit son lien, répond en un geste et reçoit son pass QR.',
      tone: 'bg-[#275a3d]',
      media: (
        <PhotoWithPhone
          cutout="/images/landing/enveloppe-cachet.webp"
          video="/videos/landing/invitation.mp4"
          poster="/videos/landing/invitation.jpg"
          alt="Invitation ouverte sur un téléphone : l’invité confirme sa venue et reçoit son pass QR"
        />
      ),
      actions: (
        <Link href="/modeles" className={pillLight}>
          Voir les modèles
          <ArrowRight className="w-4 h-4" aria-hidden />
        </Link>
      ),
    },
    {
      id: 'plan-3d',
      nav: 'Plan de salle 3D',
      lead: 'Votre salle,',
      strong: 'en 3D avant le jour J',
      text: 'Placez tables, scène et allée, puis faites visiter la salle à vos proches.',
      tone: 'bg-[#13201a]',
      wide: true,
      media: <Landing3DViewer />,
      actions: (
        <Link href="/plans-3d" className={pillLight}>
          Essayer le plan 3D
          <ArrowRight className="w-4 h-4" aria-hidden />
        </Link>
      ),
    },
    {
      id: 'jour-j',
      nav: 'Accueil jour J',
      lead: 'À l’entrée,',
      strong: 'un scan suffit',
      text: 'Le pass QR de chaque invité est scanné à l’entrée et les arrivées s’affichent en direct.',
      tone: 'bg-[#31714c]',
      media: (
        <PhotoWithPhone
          photo="/images/landing/photo-cortege-entree.jpg"
          photoPosition="center 40%"
          video="/videos/landing/jour-j.mp4"
          poster="/videos/landing/jour-j.jpg"
          alt="Accueil le jour J : le pass QR d’une invitée est scanné et son entrée confirmée"
        />
      ),
      actions: (
        <Link href="/faq#protocol-qr" className={pillOutline}>Comment ça marche</Link>
      ),
    },
    {
      id: 'billetterie',
      nav: 'Billetterie',
      lead: 'Vos billets,',
      strong: 'payés par Mobile Money',
      text: 'Concerts, conférences, galas : vendez vos places en ligne et contrôlez les entrées par QR.',
      tone: 'bg-[#1f4a33]',
      media: (
        <div className="relative w-full max-w-[460px] pb-[8%]">
          <div className="relative aspect-[4/5] overflow-hidden rounded-[1.75rem] bg-black/20">
            <Image
              src="/images/landing/card-billetterie-pro.jpg"
              alt="Public d’un concert, mains levées devant la scène"
              fill
              sizes="(min-width: 1024px) 400px, 80vw"
              className="object-cover"
            />
          </div>
          <div aria-hidden className="em-light-island absolute -left-3 bottom-0 flex items-center gap-3 rounded-2xl bg-[#ffffff] text-[#1e1f21] px-4 py-3 shadow-[0_16px_32px_rgba(0,0,0,0.25)]">
            <span className="w-10 h-10 rounded-xl bg-[#eef6f1] flex items-center justify-center">
              <QrCode className="w-5 h-5 text-[#1f4a33]" />
            </span>
            <span className="flex flex-col">
              <b className="text-sm">Billet payé</b>
              <span className="text-xs text-[#5d5f62]">Mobile Money · pass QR envoyé</span>
            </span>
          </div>
        </div>
      ),
      actions: (
        <Link href="/marketplace/evenements" className={pillLight}>
          Voir les événements
          <ArrowRight className="w-4 h-4" aria-hidden />
        </Link>
      ),
    },
  ];

  // Le menu latéral suit le bloc qui occupe le milieu de l'écran.
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((entry) => entry.isIntersecting);
        if (visible) setActiveId(visible.target.id);
      },
      { rootMargin: '-45% 0px -50% 0px' },
    );
    document.querySelectorAll<HTMLElement>('[data-feature-block]').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <section aria-label="Les outils en détail" className="lg:grid lg:grid-cols-[minmax(0,1fr)_15rem] bg-surface">
      <div>
        {features.map((feature) => (
          <div
            key={feature.id}
            id={feature.id}
            data-feature-block
            className={cn(feature.tone, 'text-white scroll-mt-16 md:scroll-mt-24')}
          >
            <div
              className={cn(
                'mx-auto w-full max-w-[1200px] px-4 sm:px-8 lg:px-[max(4vw,2rem)] py-16 sm:py-20 lg:py-24 lg:min-h-[86svh] gap-10 lg:gap-12',
                // Bloc large : texte centré au-dessus, visionneuse sur toute la largeur en dessous.
                feature.wide ? 'flex flex-col justify-center' : 'grid md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] items-center lg:gap-14',
              )}
            >
              <div data-reveal className={cn('flex justify-center md:justify-start', feature.wide && 'order-2 md:justify-center')}>{feature.media}</div>
              <div
                data-reveal
                style={{ '--i': 1 } as React.CSSProperties}
                className={cn('flex flex-col gap-5 min-w-0', feature.wide && 'order-1 items-center text-center')}
              >
                <h2 className="em-landing-heading text-4xl sm:text-5xl xl:text-6xl leading-[1.08]">
                  <span className="font-normal">{feature.lead}</span>{' '}
                  <span className="text-[#b0eed5]">{feature.strong}</span>
                </h2>
                <p className="text-base sm:text-lg leading-relaxed text-white/85 max-w-[46ch]">{feature.text}</p>
                <div className="pt-1 flex flex-wrap gap-3">{feature.actions}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <nav aria-label="Outils" className="hidden lg:block">
        <ul role="list" className="sticky top-28 px-6 py-10">
          {features.map((feature) => {
            const active = feature.id === activeId;
            return (
              <li key={feature.id}>
                <a
                  href={`#${feature.id}`}
                  aria-current={active ? 'true' : undefined}
                  className={cn(
                    'flex items-center min-h-11 border-b text-sm transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-sm',
                    active ? 'border-foreground text-foreground font-semibold' : 'border-border text-muted hover:text-foreground',
                  )}
                >
                  {feature.nav}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>
    </section>
  );
}
