'use client';

import { useEffect } from 'react';
import Illustration from '@/components/illustrations/Illustration';
import { Button } from '@/components/ui';

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  const offline = typeof navigator !== 'undefined' && navigator.onLine === false;

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex flex-1 min-h-[70vh] flex-col items-center justify-center px-4 py-16 text-center">
      <Illustration name={offline ? 'offline' : 'error'} className="w-56 sm:w-64" />
      <h1 className="em-dash-title mt-4 text-2xl font-semibold text-foreground">
        {offline ? 'Connexion perdue' : 'Une erreur est survenue'}
      </h1>
      <p className="mt-2 max-w-sm text-sm text-muted leading-relaxed">
        {offline ? 'Vérifiez votre connexion internet.' : 'Réessayez dans quelques instants.'}
      </p>
      {error.digest && <p className="mt-2 text-xs text-muted font-mono">{error.digest}</p>}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Button size="md" onClick={() => unstable_retry()}>
          Réessayer
        </Button>
        <Button href="/" size="md" variant="secondary">
          Accueil
        </Button>
      </div>
    </main>
  );
}
