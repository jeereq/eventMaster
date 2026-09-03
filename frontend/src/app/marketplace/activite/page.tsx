import { redirect } from 'next/navigation';

/** Ancienne URL marketplace → espace Activité dédié. */
export default function MarketplaceActiviteRedirect() {
  redirect('/activite');
}
