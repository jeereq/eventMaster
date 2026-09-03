'use client';

import Link from 'next/link';
import PublicPageShell, { PublicPageHero } from '@/components/PublicPageShell';
import MarketplaceGlobalActivityFeed from '@/components/marketplace/MarketplaceGlobalActivityFeed';
import { Building2, Sparkles, Store } from 'lucide-react';

export default function ActivitePage() {
  return (
    <PublicPageShell faqHref="/faq" mobileFooterPad>
      <div className="page-container py-6 sm:py-10 space-y-6 max-w-3xl">
        <PublicPageHero
          chip="Fil d’actualité"
          title="Activité des pros"
          description="Nouveautés, réalisations et coulisses des salles et prestataires — hors catalogue marketplace."
          compact
        >
          <div className="flex flex-wrap gap-2 pt-1">
            <Link
              href="/marketplace/salles"
              className="inline-flex items-center gap-1.5 min-h-10 px-3 rounded-xl border border-border bg-surface text-xs font-semibold text-foreground hover:bg-surface-muted transition"
            >
              <Building2 className="w-3.5 h-3.5 text-primary" aria-hidden />
              Salles
            </Link>
            <Link
              href="/marketplace/prestataires"
              className="inline-flex items-center gap-1.5 min-h-10 px-3 rounded-xl border border-border bg-surface text-xs font-semibold text-foreground hover:bg-surface-muted transition"
            >
              <Sparkles className="w-3.5 h-3.5 text-primary" aria-hidden />
              Prestataires
            </Link>
            <Link
              href="/marketplace"
              className="inline-flex items-center gap-1.5 min-h-10 px-3 rounded-xl text-xs font-semibold text-muted hover:text-foreground transition"
            >
              <Store className="w-3.5 h-3.5" aria-hidden />
              Marketplace
            </Link>
          </div>
        </PublicPageHero>
        <MarketplaceGlobalActivityFeed linkBase="public" />
      </div>
    </PublicPageShell>
  );
}
