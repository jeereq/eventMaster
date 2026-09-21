'use client';

import PublicPageShell, { PublicPageHero } from '@/components/PublicPageShell';
import MarketplacePublicNav, { type MarketplaceNavId } from '@/components/MarketplacePublicNav';
import { CatalogueResultsSkeleton } from '@/components/CatalogueResults';
import { Skeleton } from '@/components/ui/Skeleton';

/** Première peinture des onglets marketplace, identique d’un onglet à l’autre. */
export default function MarketplaceCatalogueSkeleton({
  active,
  title,
  description,
  label = 'Chargement du marketplace',
}: {
  active: MarketplaceNavId;
  title: string;
  description?: string;
  label?: string;
}) {
  return (
    <PublicPageShell faqHref="/faq">
      <PublicPageHero compact title={title} description={description}>
        <div className="flex flex-wrap items-center gap-2">
          <MarketplacePublicNav active={active} />
        </div>
      </PublicPageHero>
      <div className="page-container py-3 md:py-10 flex-1 space-y-3 md:space-y-6">
        <div
          className="sticky top-[var(--em-site-header)] z-20 -mx-1 px-1 py-0 md:py-1 bg-background/90 backdrop-blur-md"
          aria-hidden
        >
          <div className="rounded-[var(--radius-card)] border border-border bg-surface p-1.5 sm:p-4 shadow-[var(--shadow-soft)]">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Skeleton className="h-9 sm:h-11 flex-1 rounded-[var(--radius-button)]" />
              <Skeleton className="h-9 w-11 sm:h-11 sm:w-28 rounded-[var(--radius-button)]" />
              <Skeleton className="hidden sm:block h-11 w-36 rounded-[var(--radius-button)]" />
            </div>
          </div>
        </div>
        <CatalogueResultsSkeleton count={8} label={label} />
      </div>
    </PublicPageShell>
  );
}
