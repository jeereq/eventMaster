'use client';

import FaqSection from '@/components/landing/FaqSection';
import SiteFooter from '@/components/SiteFooter';
import SiteHeader from '@/components/SiteHeader';
import Link from 'next/link';
import { Button } from '@/components/ui';
import { ArrowRight } from 'lucide-react';

export default function FaqPageClient() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground font-sans antialiased transition-colors duration-200">
      <SiteHeader variant="contact" />

      <section className="border-b border-border bg-background">
        <div className="page-container py-12 sm:py-16">
          <div className="max-w-xl space-y-3">
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
              Questions fréquentes
            </h1>
            <p className="text-sm text-muted leading-relaxed max-w-md">
              Forfaits, sécurité, protocole QR et facturation.
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
