'use client';

import FaqExplorer from '@/components/landing/FaqExplorer';
import PublicPageShell, { PublicPageHero } from '@/components/PublicPageShell';
import PublicCtaBand from '@/components/PublicCtaBand';

export default function FaqPageClient() {
  return (
    <PublicPageShell faqHref="/faq">
      <PublicPageHero
        title="Questions fréquentes"
        description="Cherchez un mot ou choisissez un thème : invitations, jour J, billetterie, salles, forfaits et sécurité."
      />

      <div className="flex-1">
        <FaqExplorer />

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
