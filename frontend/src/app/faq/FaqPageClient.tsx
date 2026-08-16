'use client';

import FaqSection from '@/components/landing/FaqSection';
import SiteFooter from '@/components/SiteFooter';
import SiteHeader from '@/components/SiteHeader';
import Link from 'next/link';
import { Button } from '@/components/ui';
import { ArrowRight } from 'lucide-react';
import { usePlatformSite } from '@/context/PlatformSiteContext';

export default function FaqPageClient() {
  const { site } = usePlatformSite();
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground font-sans antialiased transition-colors duration-200">
      <SiteHeader variant="contact" showServerStatus />

      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,var(--surface-muted)_0%,var(--background)_55%)]" />
        <div className="page-container relative py-14 sm:py-16 lg:py-20">
          <div className="max-w-xl space-y-4">
            <p className="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground">
              {site.platformName}
            </p>
            <h1 className="text-2xl sm:text-3xl font-semibold text-foreground/90 tracking-tight leading-snug">
              Questions fréquentes
            </h1>
            <p className="text-sm text-muted leading-relaxed max-w-md">
              Forfaits, sécurité des données, protocole QR et facturation — les réponses essentielles.
            </p>
          </div>
        </div>
      </section>

      <main className="flex-1">
        <FaqSection
          id="faq"
          className="border-t-0"
          title="Tout savoir sur la plateforme"
          subtitle="Retrouvez les réponses aux questions les plus courantes. Besoin d’un détail précis ? Écrivez-nous."
        />

        <section className="py-16 sm:py-20 bg-foreground text-background">
          <div className="page-container text-center space-y-5">
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight max-w-xl mx-auto">
              Pas trouvé votre réponse ?
            </h2>
            <p className="text-sm text-background/70 max-w-md mx-auto leading-relaxed">
              Notre équipe répond aux questions commerciales, techniques et de facturation.
            </p>
            <div className="flex flex-col sm:flex-row gap-2.5 justify-center pt-2">
              <Link href="/contact">
                <Button size="lg" variant="secondary" rightIcon={<ArrowRight className="w-4 h-4" />}>
                  Nous contacter
                </Button>
              </Link>
              <Link href="/register">
                <Button
                  size="lg"
                  variant="ghost"
                  className="text-background/80 hover:text-background hover:bg-background/10 border border-background/20"
                >
                  Créer mon organisation
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter faqHref="/faq" />
    </div>
  );
}
