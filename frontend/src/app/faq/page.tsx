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
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="page-container h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 hover:opacity-90 transition">
            <div className="bg-indigo-600 p-2 rounded-lg text-white">
              <PartyPopper className="w-4 h-4" />
            </div>
            <span className="font-bold text-slate-900 dark:text-white">EventMaster</span>
          </Link>
          <Link
            href="/"
            className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 hover:underline"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Accueil
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <FaqSection
          id="faq"
          className="bg-white dark:bg-slate-950 py-24"
          subtitle="Retrouvez les réponses aux questions les plus courantes sur les forfaits, la sécurité des données, le protocole QR et la facturation."
        />
      </main>

      <SiteFooter faqHref="/faq" />
    </div>
  );
}
