import Link from 'next/link';
import { PartyPopper, ArrowLeft } from 'lucide-react';

interface LegalPageShellProps {
  title: string;
  subtitle: string;
  lastUpdated?: string;
  children: React.ReactNode;
}

export function LegalPageShell({ title, subtitle, lastUpdated = '2 juillet 2026', children }: LegalPageShellProps) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="page-container h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 hover:opacity-90 transition">
            <div className="bg-indigo-600 p-2 rounded-lg text-white">
              <PartyPopper className="w-4 h-4" />
            </div>
            <span className="font-bold text-slate-900 dark:text-white">EventMaster</span>
          </Link>
          <Link href="/" className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 hover:underline">
            <ArrowLeft className="w-3.5 h-3.5" />
            Retour à l&apos;accueil
          </Link>
        </div>
      </header>

      <main className="page-container py-12 space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-extrabold tracking-tight">{title}</h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm">{subtitle}</p>
          <p className="text-xs text-slate-400">Dernière mise à jour : {lastUpdated}</p>
        </div>

        <article className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 sm:p-10 space-y-6 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
          {children}
        </article>

        <div className="flex flex-wrap gap-4 text-xs text-slate-500">
          <Link href="/terms" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition">Conditions d&apos;utilisation</Link>
          <Link href="/privacy" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition">Politique de confidentialité</Link>
          <Link href="/contact" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition">Contact</Link>
        </div>
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

export { Section };
