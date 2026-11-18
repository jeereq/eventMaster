import type { CSSProperties } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight } from '@/components/icons';

/** Les six outils, en grille séparée par des filets fins ; chaque carte mène à sa page. */
const TOOLS: { href: string; title: string; text: string; image: string; position?: string; chip: string; alt: string; screen?: boolean }[] = [
  {
    href: '/simulateur',
    title: 'Simulateur de budget',
    text: '3 formules chiffrées en francs congolais.',
    image: '/videos/landing/simulateur.jpg',
    position: 'center top',
    screen: true,
    chip: '3 formules',
    alt: 'Simulateur sur téléphone : trois formules chiffrées pour un mariage',
  },
  {
    href: '/modeles',
    title: 'Invitations WhatsApp',
    text: 'Chaque invité répond en un geste.',
    image: '/images/landing/photo-faire-part.jpg',
    position: 'center 40%',
    chip: 'Oui, je viens',
    alt: 'Faire-part de mariage posé sur une table',
  },
  {
    href: '/plans-3d',
    title: 'Plan de salle 3D',
    text: 'Tables, scène et allée avant le jour J.',
    image: '/images/landing/salle-3d-mariage.webp',
    chip: 'Table 3 · 8 places',
    alt: 'Plan 3D d’une salle de mariage avec tables rondes',
  },
  {
    href: '/faq#protocol-qr',
    title: 'Contrôle d’accès',
    text: 'Le pass QR est scanné à l’entrée.',
    image: '/videos/landing/jour-j.jpg',
    position: 'center top',
    screen: true,
    chip: 'Entrée validée',
    alt: 'Écran d’accueil du jour J avec le scanner de badges',
  },
  {
    href: '/marketplace/evenements',
    title: 'Billetterie',
    text: 'Places payées par Mobile Money.',
    image: '/images/landing/card-billetterie-pro.jpg',
    position: 'center 35%',
    chip: 'Billet payé',
    alt: 'Public d’un concert, mains levées devant la scène',
  },
  {
    href: '/marketplace',
    title: 'Salles et prestataires',
    text: 'Visites 3D et demandes de devis.',
    image: '/images/landing/photo-table-reception.jpg',
    position: 'center 55%',
    chip: 'Devis en ligne',
    alt: 'Salle de réception dressée : longue table, chaises cannées et fleurs',
  },
];

export default function LandingToolsGrid() {
  return (
    <section id="outils" className="bg-background border-b border-border scroll-mt-16 md:scroll-mt-24">
      <div className="page-container lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,3fr)]">
        <div className="py-12 sm:py-16 lg:pr-10 flex items-center">
          <h2 data-reveal className="em-landing-heading text-4xl sm:text-5xl text-foreground max-w-[12ch]">
            <span className="font-normal">Tout pour préparer</span> votre fête
          </h2>
        </div>
        {/* gap-px sur fond de bordure : filets d'un pixel entre les cartes. */}
        <ul role="list" className="grid grid-cols-2 lg:grid-cols-3 gap-px bg-border border-t border-border lg:border-t-0 lg:border-l">
          {TOOLS.map((tool, index) => (
            <li
              key={tool.href}
              data-reveal
              style={{ '--i': index % 3 } as CSSProperties}
              className="group relative bg-surface p-3.5 sm:p-6 flex flex-col has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-inset has-[a:focus-visible]:ring-primary"
            >
              <h3 className="text-base sm:text-lg font-semibold leading-snug text-foreground">
                <Link
                  href={tool.href}
                  className="inline-flex items-center gap-1.5 after:absolute after:inset-0 after:content-[''] focus-visible:outline-none"
                >
                  {tool.title}
                  <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden />
                </Link>
              </h3>
              <p className="mt-1 text-sm text-muted">{tool.text}</p>
              <span className="relative mt-auto pt-3 sm:pt-4 block"><span className={`relative block aspect-[4/3] overflow-hidden rounded-2xl ${tool.screen ? 'bg-[#1f4a33]' : 'bg-surface-muted'}`}>
                {tool.screen ? (
                  /* Capture d'écran blanche : posée dans un téléphone sur fond vert pour se détacher de la carte. */
                  <span className="absolute right-[8%] top-[14%] -bottom-2 w-[58%] overflow-hidden rounded-t-[1.1rem] border-[3px] border-b-0 border-[#0b1512] bg-[#0b1512] shadow-[0_12px_28px_rgba(0,0,0,0.35)] transition-transform duration-300 group-hover:-translate-y-1 motion-reduce:transition-none motion-reduce:group-hover:translate-y-0">
                    <Image
                      src={tool.image}
                      alt={tool.alt}
                      fill
                      sizes="(min-width: 1024px) 16vw, 30vw"
                      className="object-cover rounded-t-[0.9rem]"
                      style={{ objectPosition: tool.position ?? 'center' }}
                    />
                  </span>
                ) : (
                  <Image
                    src={tool.image}
                    alt={tool.alt}
                    fill
                    sizes="(min-width: 1024px) 26vw, 50vw"
                    className="object-cover transition-transform duration-300 group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                    style={{ objectPosition: tool.position ?? 'center' }}
                  />
                )}
                <span
                  aria-hidden
                  className="em-light-island absolute left-2 top-2 sm:left-3 sm:top-3 max-w-[calc(100%-1rem)] truncate rounded-full bg-[#ffffff] px-2.5 sm:px-3 py-1 text-xs font-semibold text-[#1e1f21] shadow-sm"
                >
                  {tool.chip}
                </span>
              </span></span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
