'use client';

import Link from 'next/link';
import { PartyPopper, ShieldCheck } from 'lucide-react';
import {
  FOOTER_BRAND_DESCRIPTION,
  FOOTER_FEATURES,
  FOOTER_RESOURCES,
} from '@/config/siteContent';
import { usePlatformSite } from '@/context/PlatformSiteContext';

interface SiteFooterProps {
  /** Lien FAQ : ancre sur l'accueil ou page contact */
  faqHref?: string;
}

export default function SiteFooter({ faqHref = '/#faq' }: SiteFooterProps) {
  const { site } = usePlatformSite();
  const resources = FOOTER_RESOURCES.map((item) =>
    item.label === 'FAQ' ? { ...item, href: faqHref } : item,
  );

  return (
    <footer className="bg-slate-950 text-slate-400 py-16 border-t border-slate-900 mt-auto">
      <div className="page-container space-y-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="bg-primary p-2 rounded-xl text-white">
                <PartyPopper className="w-5 h-5" />
              </div>
              <span className="text-white font-black text-lg">{site.platformName}</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">{FOOTER_BRAND_DESCRIPTION}</p>
          </div>

          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Fonctionnalités</h4>
            <ul className="space-y-2 text-xs">
              {FOOTER_FEATURES.map((feature) => (
                <li key={feature}>
                  <span className="hover:text-white transition cursor-default">{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Ressources</h4>
            <ul className="space-y-2 text-xs">
              {resources.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="hover:text-white transition">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Contact & Support</h4>
            <ul className="space-y-2 text-xs text-slate-500">
              <li>
                E-mail :{' '}
                <a
                  href={`mailto:${site.supportEmail}`}
                  className="text-slate-400 hover:text-white transition font-medium"
                >
                  {site.supportEmail}
                </a>
              </li>
              <li>
                Téléphone / WhatsApp :{' '}
                <a
                  href={site.supportPhoneHref}
                  className="text-slate-400 hover:text-white transition font-medium"
                >
                  {site.supportPhone}
                </a>
              </li>
              <li>
                Adresse : <span className="text-slate-400">{site.addressShort}</span>
              </li>
              <li>
                Horaires : <span className="text-slate-400">{site.supportHours}</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-900 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-slate-600">
          <p>© {new Date().getFullYear()} {site.platformName} SaaS. Tous droits réservés.</p>
          <div className="flex flex-wrap gap-4">
            <Link href="/terms" className="hover:text-slate-400 transition">
              Conditions d&apos;utilisation
            </Link>
            <Link href="/privacy" className="hover:text-slate-400 transition">
              Confidentialité
            </Link>
            <Link href={faqHref} className="hover:text-slate-400 transition">
              FAQ
            </Link>
          </div>
          <p className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            Données isolées par organisation · chiffrement HTTPS
          </p>
        </div>
      </div>
    </footer>
  );
}
