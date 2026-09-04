'use client';

import Link from 'next/link';
import { Building2, Mail, MapPin, Phone, ShieldCheck } from 'lucide-react';
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
    'text-sm text-muted hover:text-foreground transition-colors';

  return (
    <footer className={cn('mt-auto border-t border-border bg-surface text-foreground', className)}>
      <div className="page-container py-14 sm:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-8">
          <div className="sm:col-span-2 lg:col-span-4 space-y-4">
            <Link href="/" className="inline-flex items-center gap-2.5 group">
              <div className="bg-primary-solid text-primary-foreground p-2 rounded-[var(--radius-button)] shadow-xs shadow-primary/30 transition group-hover:scale-105">
                <Building2 className="w-4 h-4" />
              </div>
              <span className="text-base font-bold tracking-tight text-foreground">{site.platformName}</span>
            </Link>
            <p className="text-sm text-muted leading-relaxed max-w-sm">
              {FOOTER_BRAND_DESCRIPTION}
            </p>
            <ul className="space-y-1.5 pt-1">
              {FOOTER_FEATURES.slice(0, 4).map((feature) => (
                <li key={feature} className="text-xs text-muted/90 leading-snug">
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-2 space-y-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">
              Produit
            </h4>
            <ul className="space-y-2.5">
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

          <div className="lg:col-span-3 space-y-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">
              Ressources
            </h4>
            <ul className="space-y-2.5">
              {resources.map((item) => (
                <li key={`${item.label}-${item.href}`}>
                  <Link href={item.href} className={linkClass}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-3 space-y-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">
              Contact
            </h4>
            <ul className="space-y-3 text-sm text-muted">
              <li className="flex items-start gap-2.5">
                <Mail className="w-4 h-4 mt-0.5 shrink-0 text-foreground/70" />
                <a
                  href={`mailto:${site.supportEmail}`}
                  className="hover:text-foreground transition-colors break-all"
                >
                  {site.supportEmail}
                </a>
              </li>
              <li className="flex items-start gap-2.5">
                <Phone className="w-4 h-4 mt-0.5 shrink-0 text-foreground/70" />
                <a
                  href={site.supportPhoneHref}
                  className="hover:text-foreground transition-colors"
                >
                  {site.supportPhone}
                </a>
              </li>
              <li className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-foreground/70" />
                <span>{site.addressShort}</span>
              </li>
              <li className="text-xs text-muted pt-1">{site.supportHours}</li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-border flex flex-col lg:flex-row lg:items-center justify-between gap-4 text-xs text-muted">
          <p>
            © {new Date().getFullYear()} {site.platformName}. Tous droits réservés.
          </p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <Link href="/terms" className="hover:text-foreground transition-colors">
              Conditions d&apos;utilisation
            </Link>
            <Link href="/privacy" className="hover:text-foreground transition-colors">
              Confidentialité
            </Link>
            <Link href={faqHref} className="hover:text-foreground transition-colors">
              FAQ
            </Link>
          </div>
          <p className="inline-flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            Données isolées par organisation · HTTPS
          </p>
        </div>
      </div>
    </footer>
  );
}
