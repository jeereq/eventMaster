'use client';

import Link from 'next/link';
import { Mail, MapPin, Phone, ShieldCheck } from 'lucide-react';
import SiteBrandMark from '@/components/SiteBrandMark';
import PWAInstallCta from '@/components/PWAInstallCta';
import {
  FOOTER_BRAND_DESCRIPTION,
  FOOTER_FEATURES,
  FOOTER_PRODUCT,
  FOOTER_RESOURCES,
} from '@/config/siteContent';
import { usePlatformSite } from '@/context/PlatformSiteContext';
import { cn } from '@/lib/cn';

interface SiteFooterProps {
  /** Lien FAQ : ancre sur l'accueil ou page contact */
  faqHref?: string;
  className?: string;
}

export default function SiteFooter({ faqHref = '/#faq', className }: SiteFooterProps) {
  const { site } = usePlatformSite();
  const product = FOOTER_PRODUCT.map((item) =>
    item.label === 'FAQ' ? { ...item, href: faqHref } : item,
  );
  const resources = FOOTER_RESOURCES;

  const linkClass =
    'inline-flex items-center min-h-8 sm:min-h-0 text-sm text-muted hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-sm';

  return (
    <footer className={cn('mt-auto border-t border-border bg-surface text-foreground', className)}>
      <div className="page-container py-10 sm:py-14 lg:py-16">
        <div className="grid grid-cols-1 min-[440px]:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-8">
          <div className="min-[440px]:col-span-2 lg:col-span-4 space-y-4">
            <SiteBrandMark />
            <p className="text-xs sm:text-sm text-muted leading-relaxed max-w-sm">
              {FOOTER_BRAND_DESCRIPTION}
            </p>
            <PWAInstallCta variant="footer" />
            <ul className="space-y-1.5 pt-1">
              {FOOTER_FEATURES.slice(0, 4).map((feature) => (
                <li key={feature} className="text-xs text-muted/90 leading-snug">
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          <div className="col-span-1 lg:col-span-2 space-y-3.5 sm:space-y-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">
              Produit
            </h4>
            <ul className="space-y-2 sm:space-y-2.5">
              {product.map((item) => (
                <li key={item.href}>
                  {item.href.startsWith('/#') || item.href.startsWith('#') ? (
                    <a href={item.href} className={linkClass}>
                      {item.label}
                    </a>
                  ) : (
                    <Link href={item.href} className={linkClass}>
                      {item.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div className="col-span-1 lg:col-span-3 space-y-3.5 sm:space-y-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">
              Ressources
            </h4>
            <ul className="space-y-2 sm:space-y-2.5">
              {resources.map((item) => (
                <li key={`${item.label}-${item.href}`}>
                  <Link href={item.href} className={linkClass}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="min-[440px]:col-span-2 lg:col-span-3 space-y-3.5 sm:space-y-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">
              Contact
            </h4>
            <ul className="space-y-2.5 sm:space-y-3 text-sm text-muted">
              <li className="flex items-start gap-2.5">
                <Mail className="w-4 h-4 mt-1 shrink-0 text-foreground/70" />
                <a
                  href={`mailto:${site.supportEmail}`}
                  className="hover:text-foreground transition-colors break-all min-h-8 inline-flex items-center"
                >
                  {site.supportEmail}
                </a>
              </li>
              <li className="flex items-start gap-2.5">
                <Phone className="w-4 h-4 mt-1 shrink-0 text-foreground/70" />
                <a
                  href={site.supportPhoneHref}
                  className="hover:text-foreground transition-colors min-h-8 inline-flex items-center"
                >
                  {site.supportPhone}
                </a>
              </li>
              <li className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 mt-1 shrink-0 text-foreground/70" />
                <span className="min-h-8 inline-flex items-center">{site.addressShort}</span>
              </li>
              <li className="text-xs text-muted pt-0.5">{site.supportHours}</li>
            </ul>
          </div>
        </div>

        <div className="mt-8 sm:mt-12 pt-6 sm:pt-8 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-muted">
          <p>
            © {new Date().getFullYear()} {site.platformName}. Tous droits réservés.
          </p>
          <div className="flex flex-wrap items-center gap-x-4 sm:gap-x-5 gap-y-2">
            <Link href="/terms" className="hover:text-foreground transition-colors rounded-sm min-h-8 inline-flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
              Conditions d&apos;utilisation
            </Link>
            <Link href="/privacy" className="hover:text-foreground transition-colors rounded-sm min-h-8 inline-flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
              Confidentialité
            </Link>
            <Link href={faqHref} className="hover:text-foreground transition-colors rounded-sm min-h-8 inline-flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
              FAQ
            </Link>
          </div>
          <p className="inline-flex items-center gap-1.5 min-h-8">
            <ShieldCheck className="w-3.5 h-3.5 text-primary" />
            Données isolées par organisation · HTTPS
          </p>
        </div>
      </div>
    </footer>
  );
}
