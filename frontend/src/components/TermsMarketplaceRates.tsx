'use client';

import { usePlatformSite } from '@/context/PlatformSiteContext';
import { commercialPercent, commissionPercent, depositPercent } from '@/lib/platformRates';

export default function TermsMarketplaceRates() {
  const { site } = usePlatformSite();
  const deposit = depositPercent(site);
  const commission = commissionPercent(site);
  const commercial = commercialPercent(site);

  return (
    <>
      <p>
        <strong>Marketplace, réservations &amp; locations.</strong> Les organisations éligibles peuvent publier des
        salles, des prestations de services ou du <strong>matériel événementiel en location</strong> (tentes, mobilier,
        sonorisation, éclairage, véhicules) sur le marketplace. Les réservations de dates suivent le parcours : demande,
        acceptation, acompte de {deposit} % versé directement au professionnel <strong>hors plateforme</strong>, puis
        confirmation (blocage de la date). EventMaster n&apos;encaisse pas cet acompte, ni les éventuelles cautions de
        matériel, et n&apos;est pas partie au contrat direct entre organisateur et professionnel.
      </p>
      <p>
        Une commission marketplace de <strong>{commission} %</strong> (due par le vendeur ou le loueur) s&apos;applique
        aux réservations confirmées, au taux en vigueur au moment de l&apos;acceptation. Elle est distincte de
        l&apos;abonnement SaaS et du réseau commercial.
      </p>
      <p>
        <strong>Réseau commercial &amp; apporteurs d&apos;affaires.</strong> Selon le forfait (notamment Business
        Enterprise), un réseau commercial peut être activé avec des commissions de <strong>{commercial} %</strong> sur
        la facturation d&apos;abonnement des organisations parrainées, selon les règles et conditions affichées dans
        l&apos;espace commercial.
      </p>
    </>
  );
}
