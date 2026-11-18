import type { Metadata } from 'next';
import Illustration, { type IllustrationName } from '@/components/illustrations/Illustration';
import { Button } from '@/components/ui';

export const metadata: Metadata = {
  title: 'Illustrations',
  robots: { index: false, follow: false },
};

const ITEMS: { name: IllustrationName; title: string; description: string; action: string }[] = [
  { name: 'invoices', title: 'Aucune facture pour l’instant', description: 'Elles apparaissent après approbation ou paiement.', action: 'Voir les forfaits' },
  { name: 'inbox', title: 'Aucun message', description: 'Les messages de vos invités arriveront ici.', action: 'Retour' },
  { name: 'notifications', title: 'Aucune notification', description: 'Rien de nouveau pour le moment.', action: 'Actualiser' },
  { name: 'search', title: 'Aucun résultat', description: 'Essayez d’autres mots ou retirez des filtres.', action: 'Effacer les filtres' },
  { name: 'notFound', title: 'Page introuvable', description: 'Le lien est peut-être erroné ou la page a été déplacée.', action: 'Accueil' },
  { name: 'error', title: 'Une erreur est survenue', description: 'Réessayez dans quelques instants.', action: 'Réessayer' },
  { name: 'offline', title: 'Connexion perdue', description: 'Vérifiez votre connexion internet.', action: 'Réessayer' },
  { name: 'events', title: 'Aucun événement', description: 'Créez votre premier événement.', action: 'Nouvel événement' },
  { name: 'guests', title: 'Aucun invité', description: 'Ajoutez vos invités ou importez une liste.', action: 'Ajouter des invités' },
  { name: 'tickets', title: 'Aucun billet vendu', description: 'Partagez la billetterie pour lancer les ventes.', action: 'Partager' },
  { name: 'favorites', title: 'Aucun favori', description: 'Touchez le cœur d’une annonce pour la garder ici.', action: 'Explorer' },
  { name: 'success', title: 'C’est fait !', description: 'Vos modifications sont enregistrées.', action: 'Continuer' },
  { name: 'payments', title: 'Aucun paiement', description: 'Les encaissements s’afficheront ici.', action: 'Configurer' },
  { name: 'rooms', title: 'Aucune salle', description: 'Dessinez le plan de votre première salle.', action: 'Créer une salle' },
  { name: 'chat', title: 'Aucune conversation', description: 'Choisissez un contact pour commencer.', action: 'Nouvelle discussion' },
  { name: 'media', title: 'Aucune photo', description: 'Ajoutez des images à votre galerie.', action: 'Importer' },
  { name: 'tasks', title: 'Aucune tâche', description: 'Tout est à jour.', action: 'Ajouter une tâche' },
];

export default function IllustrationsPage() {
  return (
    <main className="min-h-screen bg-background px-4 py-10 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <h1 className="em-dash-title text-3xl font-semibold text-foreground">Illustrations</h1>
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {ITEMS.map((item) => (
            <article
              key={item.name}
              className="flex flex-col items-center rounded-[var(--radius-card)] border border-border bg-surface px-5 pb-6 pt-4 text-center shadow-[var(--shadow-soft)]"
            >
              <Illustration name={item.name} className="w-44" />
              <h2 className="mt-2 text-base font-semibold text-foreground">{item.title}</h2>
              <p className="mt-1 text-sm text-muted leading-relaxed">{item.description}</p>
              <div className="mt-4">
                <Button size="md">{item.action}</Button>
              </div>
              <code className="mt-4 text-xs text-muted">{item.name}</code>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
