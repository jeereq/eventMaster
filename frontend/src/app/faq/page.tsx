import FaqSection from '@/components/landing/FaqSection';
import SiteFooter from '@/components/SiteFooter';
import Link from 'next/link';
import { PartyPopper, ArrowLeft } from 'lucide-react';

export const metadata = {
  title: 'FAQ — EventMaster',
  description: 'Questions fréquentes sur EventMaster : forfaits, sécurité, protocole QR, facturation.',
};

export default function FaqPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <header className="border-b border-border bg-surface/90 backdrop-blur-md sticky top-0 z-50">
        <div className="page-container h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 hover:opacity-90 transition">
            <div className="bg-foreground p-1.5 rounded-[var(--radius-button)] text-background">
              <PartyPopper className="w-3.5 h-3.5" />
            </div>
            <span className="font-semibold text-base tracking-tight">EventMaster</span>
          </Link>
          <Link
            href="/"
            className="text-xs font-semibold text-primary flex items-center gap-1 hover:underline"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Accueil
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <FaqSection
          id="faq"
          className="bg-background py-24"
          subtitle="Retrouvez les réponses aux questions les plus courantes sur les forfaits, la sécurité des données, le protocole QR et la facturation."
        />
      </main>

      <SiteFooter faqHref="/faq" />
    </div>
  );
}
