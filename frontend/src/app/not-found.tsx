import type { Metadata } from 'next';
import Illustration from '@/components/illustrations/Illustration';
import { Button } from '@/components/ui';

export const metadata: Metadata = {
  title: 'Page introuvable',
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <main className="flex flex-1 min-h-[70vh] flex-col items-center justify-center px-4 py-16 text-center">
      <Illustration name="notFound" className="w-56 sm:w-64" />
      <h1 className="em-dash-title mt-4 text-2xl font-semibold text-foreground">Page introuvable</h1>
      <p className="mt-2 max-w-sm text-sm text-muted leading-relaxed">
        Le lien est peut-être erroné ou la page a été déplacée.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Button href="/" size="md">
          Accueil
        </Button>
        <Button href="/dashboard" size="md" variant="secondary">
          Tableau de bord
        </Button>
      </div>
    </main>
  );
}
