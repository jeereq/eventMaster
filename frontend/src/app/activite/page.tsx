'use client';

import Link from 'next/link';
import PublicPageShell, { PublicPageHero } from '@/components/PublicPageShell';
import MarketplaceGlobalActivityFeed from '@/components/marketplace/MarketplaceGlobalActivityFeed';
import { PlusCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function ActivitePage() {
  const { user } = useAuth();

  return (
    <PublicPageShell faqHref="/faq" mobileFooterPad>
      {/* En-tête Héros épuré & visuel */}
      <PublicPageHero
        title="L'actualité visuelle des réceptions"
        description="Photos, décors et coulisses partagés en direct par les salles et prestataires en RDC."
        compact
      >
        <div className="pt-1 flex flex-wrap items-center gap-2.5">
          <Link
            href={user ? '/dashboard/publications?tab=create' : '/register?intent=vendor'}
            className="inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-full bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary-hover active:scale-95 transition shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>{user ? 'Publier une story' : 'Publier une photo'}</span>
          </Link>
          <Link
            href="/marketplace"
            className="inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-full bg-surface border border-border text-xs font-semibold text-muted hover:text-foreground hover:bg-surface-muted transition shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            <span>Catalogue</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </PublicPageHero>

      {/* Flux de publications centré, aéré et 100% focalisé sur l'image */}
      <div className="page-container py-3 md:py-10 max-w-2xl mx-auto">
        <MarketplaceGlobalActivityFeed linkBase="public" />
      </div>
    </PublicPageShell>
  );
}
