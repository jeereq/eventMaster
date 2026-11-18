import Link from 'next/link';
import { ArrowRight, Building2, Speaker, Ticket, Users, Wine, type LucideIcon } from '@/components/icons';

const CATEGORIES: { href: string; label: string; icon: LucideIcon }[] = [
  { href: '/marketplace/salles', label: 'Salles', icon: Building2 },
  { href: '/marketplace/prestataires', label: 'Prestataires', icon: Users },
  { href: '/marketplace/locations', label: 'Matériel', icon: Speaker },
  { href: '/marketplace/evenements', label: 'Événements', icon: Ticket },
  { href: '/marketplace/boissons', label: 'Boissons', icon: Wine },
];

/** Accès direct aux rayons du marketplace : un rond par catégorie. */
export default function LandingMarketplaceCategories({ showVendorLink }: { showVendorLink: boolean }) {
  return (
    <section id="catalogue" className="bg-surface border-y border-border py-14 sm:py-20 scroll-mt-16 md:scroll-mt-24">
      <div className="page-container">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <h2 data-reveal className="em-landing-heading text-3xl sm:text-4xl text-foreground">
            <span className="font-normal">Explorez le marketplace</span> par catégorie
          </h2>
          <Link
            href="/marketplace"
            className="inline-flex items-center gap-1.5 min-h-11 text-sm font-semibold text-primary hover:underline rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            Tout le marketplace
            <ArrowRight className="w-4 h-4" aria-hidden />
          </Link>
        </div>

        <ul role="list" className="mt-8 sm:mt-10 grid grid-cols-3 sm:grid-cols-5 gap-y-8 gap-x-4">
          {CATEGORIES.map(({ href, label, icon: Icon }) => (
            <li key={href}>
              <Link
                href={href}
                className="group flex flex-col items-center gap-3 rounded-xl py-1 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
              >
                <span className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-primary-solid text-primary-foreground flex items-center justify-center transition-transform duration-200 group-hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-y-0">
                  <Icon className="w-7 h-7 sm:w-8 sm:h-8" strokeWidth={1.6} aria-hidden />
                </span>
                <span className="text-sm sm:text-base font-semibold text-foreground">{label}</span>
              </Link>
            </li>
          ))}
        </ul>

        {showVendorLink ? (
          <p className="mt-10 text-sm text-muted">
            Vous êtes une salle ou un prestataire ?{' '}
            <Link
              href="/register?kind=VENDOR&intent=vendor"
              className="font-semibold text-primary hover:underline rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              Référencer mon activité
            </Link>
          </p>
        ) : null}
      </div>
    </section>
  );
}
