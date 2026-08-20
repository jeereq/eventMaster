'use client';

import { LayoutGrid, Mail, ScanLine, Store } from 'lucide-react';
import { useLandingReveal } from '@/components/landing/useLandingReveal';

const PILLARS = [
  {
    icon: Mail,
    title: 'Inviter',
    text: 'Un lien par personne. Ils répondent. Le PDF et le plan partent après le « oui ».',
  },
  {
    icon: LayoutGrid,
    title: 'Placer',
    text: 'Glissez les invités sur les sièges. Chacun sait où s’asseoir avant d’arriver.',
  },
  {
    icon: ScanLine,
    title: 'Accueillir',
    text: 'Badge QR à l’entrée, scanné depuis le téléphone. Pas d’app à installer.',
  },
  {
    icon: Store,
    title: 'Trouver ou publier',
    text: 'Salles, métiers, locations. Devis et acompte versés au pro, hors plateforme.',
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
          <p className="text-xs font-medium uppercase tracking-wider text-muted">La solution</p>
          <h2 className="text-2xl font-semibold text-foreground tracking-tight">
            Tout l’événement, dans le même espace
          </h2>
          <p className="text-sm text-muted leading-relaxed">
            EventMaster relie ce qui se fait d’habitude en morceaux : l’invitation, les réponses, le plan de table,
            l’accueil le jour J, et un catalogue si vous cherchez (ou publiez) une salle ou un presta.
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
