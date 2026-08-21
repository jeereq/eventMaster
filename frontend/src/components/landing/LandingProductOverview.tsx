'use client';

import { LayoutGrid, Mail, ScanLine, Store } from 'lucide-react';
import { useLandingReveal } from '@/components/landing/useLandingReveal';

const PILLARS = [
  {
    icon: Mail,
    title: 'Des invitations qui font de l\'effet',
    text: 'Fini le PDF perdu. Envoyez un lien unique, suivez les confirmations en temps réel et partagez le plan au bon moment.',
  },
  {
    icon: LayoutGrid,
    title: 'Le placement, sans le casse-tête',
    text: 'Un plan interactif et visuel. Placez chaque invité facilement pour que tout le monde sache où s’asseoir avant même d\'arriver.',
  },
  {
    icon: ScanLine,
    title: 'Un accueil fluide et moderne',
    text: 'Scannez le QR Code de vos invités depuis votre smartphone à l\'entrée. Fini la file d\'attente et les listes papier barrées.',
  },
  {
    icon: Store,
    title: 'L\'excellence à portée de clic',
    text: 'Salles, prestataires, locations de matériel. Découvrez et réservez la crème de l\'événementiel sans intermédiaire financier.',
  },
];

export default function LandingProductOverview() {
  const revealRef = useLandingReveal<HTMLElement>();

  return (
    <section
      ref={revealRef}
      id="produit"
      className="em-reveal py-16 sm:py-20 bg-surface border-t border-border scroll-mt-16"
    >
      <div className="page-container space-y-8">
        <div className="max-w-2xl space-y-2">
          <p className="text-xs font-medium uppercase tracking-wider text-muted">La promesse EventMaster</p>
          <h2 className="text-2xl font-semibold text-foreground tracking-tight">
            Votre centre de commande centralisé
          </h2>
          <p className="text-sm text-muted leading-relaxed">
            Dites adieu aux tableurs et aux dizaines d'échanges. EventMaster unifie tout ce qui crée l'angoisse d'un organisateur : 
            les invitations, les réponses, le placement et l'accueil le jour J.
          </p>
        </div>

        <ul className="em-landing-hero-grid em-stagger">
          {PILLARS.map(({ icon: Icon, title, text }) => (
            <li
              key={title}
              className="rounded-[var(--radius-card)] border border-border bg-background p-4 shadow-[var(--shadow-soft)] em-soft-hover"
            >
              <Icon className="w-5 h-5 text-[color:var(--festive-accent)] mb-3" />
              <h3 className="text-sm font-semibold text-foreground mb-1">{title}</h3>
              <p className="text-xs text-muted leading-relaxed">{text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
