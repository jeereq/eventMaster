import Link from 'next/link';
import { PartyPopper, ArrowLeft } from 'lucide-react';

interface LegalPageShellProps {
  title: string;
  subtitle: string;
  lastUpdated?: string;
  version?: string;
  children: React.ReactNode;
}

export function LegalPageShell({
  title,
  subtitle,
  lastUpdated = '17 août 2026',
  version,
  children,
}: LegalPageShellProps) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-surface/90 backdrop-blur-md sticky top-0 z-50">
        <div className="page-container h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 hover:opacity-90 transition">
            <div className="bg-foreground p-1.5 rounded-[var(--radius-button)] text-background">
              <PartyPopper className="w-3.5 h-3.5" />
            </div>
            <span className="font-semibold text-base tracking-tight">EventMaster</span>
          </Link>
          <Link href="/" className="text-xs font-semibold text-primary flex items-center gap-1 hover:underline">
            <ArrowLeft className="w-3.5 h-3.5" />
            Retour à l&apos;accueil
          </Link>
        </div>
      </header>

      <main className="page-container py-12 space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
          <p className="text-muted text-sm">{subtitle}</p>
          <p className="text-xs text-muted">
            Dernière mise à jour : {lastUpdated}
            {version ? ` · version ${version}` : ''}
          </p>
        </div>

        <article className="bg-surface border border-border rounded-[var(--radius-card)] p-8 sm:p-10 space-y-6 text-sm leading-relaxed text-foreground/90">
          {children}
        </article>

        <div className="flex flex-wrap gap-4 text-xs text-muted">
          <Link href="/terms" className="hover:text-primary transition">Conditions d&apos;utilisation</Link>
          <Link href="/privacy" className="hover:text-primary transition">Politique de confidentialité</Link>
          <Link href="/contact" className="hover:text-primary transition">Contact</Link>
        </div>
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

export { Section };
