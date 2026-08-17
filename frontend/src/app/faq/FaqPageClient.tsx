'use client';

import FaqSection from '@/components/landing/FaqSection';
import PublicPageShell, { PublicPageHero } from '@/components/PublicPageShell';
import PublicCtaBand from '@/components/PublicCtaBand';

export default function FaqPageClient() {
  return (
    <PublicPageShell faqHref="/faq">
      <PublicPageHero
        chip="FAQ"
        title="Questions fréquentes"
        description="Forfaits, sécurité, protocole QR et facturation."
      />

      <main className="flex-1">
        <FaqSection
          id="faq"
          className="border-t-0"
          title="Tout savoir sur la plateforme"
          subtitle="Retrouvez les réponses aux questions les plus courantes. Besoin d’un détail précis ? Écrivez-nous."
        />

        <PublicCtaBand
          title="Pas trouvé votre réponse ?"
          description="Notre équipe répond aux questions commerciales, techniques et de facturation."
          primaryHref="/contact"
          primaryLabel="Nous contacter"
          secondaryHref="/register"
          secondaryLabel="Créer mon organisation"
        />
      </main>
    </PublicPageShell>
  );
}
