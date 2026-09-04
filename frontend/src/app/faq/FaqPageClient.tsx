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
        description="Forfaits (annuel −10 % y compris Particulier), protocole QR web, marketplace et facturation."
      />

      <div className="flex-1">
        <FaqSection
          id="faq"
          className="border-t-0"
          title="Tout savoir sur la plateforme"
          subtitle="Retrouvez les réponses aux questions les plus courantes. Besoin d’un détail précis ? Écrivez-nous."
        />

        <PublicCtaBand
          title="Toujours une question ?"
          description="On vous répond sur les forfaits, le protocole QR, le marketplace et la facturation."
          primaryHref="/contact"
          primaryLabel="Écrire au support"
          secondaryHref="/register"
          secondaryLabel="Lancer mon premier événement"
        />
      </div>
    </PublicPageShell>
  );
}
