'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from '@/components/icons';

/**
 * Ancienne page Paramètres : ses deux sections existaient déjà ailleurs
 * (affichage = bouton « Personnaliser la vue » de la barre du haut,
 * alertes de paiement = Notifications › Préférences). On redirige vers les préférences.
 */
export default function SettingsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/notifications?tab=preferences');
  }, [router]);

  return (
    <div className="flex justify-center py-16">
      <Loader2 className="w-6 h-6 animate-spin text-muted" aria-label="Redirection vers les préférences de notification" />
    </div>
  );
}
