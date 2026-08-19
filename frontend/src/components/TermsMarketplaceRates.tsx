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
        <strong>6.1 Marketplace et réservations.</strong> Les organisations éligibles peuvent publier des salles ou
        prestations sur le marketplace. Les réservations de dates suivent le parcours : demande, acceptation,
        acompte de {deposit} % versé directement au professionnel <strong>hors plateforme</strong>, puis confirmation
        (blocage de la date). EventMaster n&apos;encaisse pas cet acompte et n&apos;est pas partie au contrat de
        prestation entre organisateur et professionnel.
      </p>
      <p>
        Une commission marketplace de <strong>{commission} %</strong> (due par le vendeur) s&apos;applique aux
        réservations confirmées, au taux en vigueur au moment de l&apos;acceptation. Elle est distincte de
        l&apos;abonnement SaaS et du réseau commercial.
      </p>
      <p>
        <strong>6.2 Réseau commercial.</strong> Selon le forfait (notamment Business Enterprise 2 et 3), un réseau
        commercial peut être activé avec des commissions de <strong>{commercial} %</strong> sur la facturation
        d&apos;abonnement des organisations parrainées, selon les règles affichées dans l&apos;espace commercial.
      </p>
    </>
  );
}
