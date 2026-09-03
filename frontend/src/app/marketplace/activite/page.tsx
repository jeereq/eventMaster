'use client';

import PublicPageShell, { PublicPageHero } from '@/components/PublicPageShell';
import MarketplacePublicNav from '@/components/MarketplacePublicNav';
import MarketplaceGlobalActivityFeed from '@/components/marketplace/MarketplaceGlobalActivityFeed';

export default function MarketplaceActivityPage() {
  return (
    <PublicPageShell faqHref="/faq" mobileFooterPad>
      <div className="page-container py-6 sm:py-10 space-y-6 max-w-3xl">
        <MarketplacePublicNav active="activity" />
        <PublicPageHero
          chip="Marketplace"
          title="Activité"
          description="Publications des salles et prestataires : nouveautés, réalisations et coulisses."
          compact
        />
        <MarketplaceGlobalActivityFeed linkBase="public" />
      </div>
    </PublicPageShell>
  );
}
