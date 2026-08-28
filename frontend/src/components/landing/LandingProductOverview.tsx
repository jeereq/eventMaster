'use client';

import { LayoutGrid, Mail, ScanLine, Store } from 'lucide-react';
import { useLandingReveal } from '@/components/landing/useLandingReveal';

const PILLARS = [
  {
    icon: Mail,
    title: 'Invitations WhatsApp & RSVP',
    text: 'Lien unique par invité, suivi des réponses et choix de repas en temps réel.',
  },
  {
    icon: LayoutGrid,
    title: 'Plan de table 2D & 3D',
    text: 'Placement visuel par glisser-déposer. Vue d’ambiance immersive pour vos invités.',
  },
  {
    icon: ScanLine,
    title: 'Scan QR & Accueil Jour J',
    text: 'Validation des entrées en 2 secondes au smartphone. Zéro file d’attente.',
  },
  {
    icon: Store,
    title: 'Lieux & Prestataires',
    text: 'Explorez et contactez les meilleures salles et prestataires vérifiés en direct.',
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
          <p className="text-xs font-medium uppercase tracking-wider text-muted">Tout-en-un</p>
          <h2 className="text-2xl font-semibold text-foreground tracking-tight">
            Tout votre événement sur un seul écran
          </h2>
          <p className="text-sm text-muted leading-relaxed">
            Invitations, plan de salle, billetterie et scan jour J réunis dans votre navigateur.
          </p>
        </div>

        <ul className="em-landing-hero-grid em-stagger">
          {PILLARS.map(({ icon: Icon, title, text }) => (
            <li
              key={title}
              className="rounded-[var(--radius-card)] border border-border bg-background p-4.5 shadow-[var(--shadow-soft)] em-soft-hover flex flex-col justify-between"
            >
              <div>
                <div className="w-8 h-8 rounded-lg bg-[color:var(--festive-accent-soft)] flex items-center justify-center mb-3">
                  <Icon className="w-4 h-4 text-[color:var(--festive-accent)]" />
                </div>
                <h3 className="text-sm font-semibold text-foreground mb-1.5 leading-snug">{title}</h3>
                <p className="text-xs text-muted leading-relaxed">{text}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
