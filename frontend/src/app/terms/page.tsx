import Link from 'next/link';
import { LegalPageShell, Section } from '@/components/LegalPageShell';
import LegalSupportEmail from '@/components/LegalSupportEmail';
import TermsMarketplaceRates from '@/components/TermsMarketplaceRates';
import { TERMS_VERSION } from '@/config/legalConfig';

export const metadata = {
  title: 'Conditions d\'utilisation — EventMaster',
  description:
    'Conditions générales d\'utilisation de la plateforme EventMaster, intégrant la billetterie multi-zone, les dons solidaires, les paiements sécurisés, le Studio IA et la modélisation de plans de salle.',
};

export default function TermsPage() {
  return (
    <LegalPageShell
      title="Conditions d'utilisation"
      subtitle="Les présentes conditions régissent l'accès et l'utilisation de la plateforme EventMaster, incluant le Studio IA, la billetterie multi-zone avec présence auto-validée, les dons solidaires, le simulateur de budget, la modélisation de salle 2D/3D et les paiements sécurisés."
      lastUpdated="14 septembre 2026"
      version={TERMS_VERSION}
    >
      <Section title="1. Objet & Présentation de la plateforme">
        <p>
          <strong>EventMaster</strong> est un projet et une plateforme logicielle SaaS multi-tenant éditée par le{' '}
          <strong>Groupe Tekango</strong>, société immatriculée en République Démocratique du Congo, ayant son siège
          social sur le Boulevard du 30 Juin, Gombe, Kinshasa, RDC.
        </p>
        <p>
          Elle est exploitée conformément aux dispositions de l&apos;Ordonnance-loi n° 23/010 du 13 mars 2023 portant
          Code du numérique en République Démocratique du Congo et de la Loi n° 20/017 du 25 novembre 2020 relative aux
          télécommunications et aux technologies de l&apos;information et de la communication.
        </p>
        <p>
          La plateforme propose un ensemble d&apos;outils intégrés dédiés à l&apos;organisation et à la gestion
          d&apos;événements privés et professionnels :
          création d&apos;invitations interactives multilingues avec respect de l&apos;identité et contextualisation IA
          (Français et langues nationales de la RDC : Lingala, Swahili, Kikongo, Tshiluba), routage et confirmations
          RSVP instantanées sur WhatsApp, <strong>Simulateur de budget IA dédié</strong> en Francs Congolais (CDF) et
          Dollars ($), <strong>Studio d&apos;Aménagement IA</strong> avec modélisation 2D zénithale cotée et rendu 3D
          WebGL photoréaliste de salles (matériaux PBR, caméras cinématiques), moteur d&apos;espacement et de
          dégagement physique réel, plans de table avec sélection interactive de place et accessibilité PMR, protocole
          d&apos;accueil et contrôle d&apos;accès le jour J (scan QR ultra-rapide anti-doublon), fil d&apos;actualité
          média, livre d&apos;or en ligne, gestion collaborative d&apos;équipes avec journal d&apos;actions contextuel,
          marketplace de prestataires, de salles et de loueurs de matériel certifiés, module de{' '}
          <strong>dons solidaires et collectes de fonds à montant libre</strong>, ainsi qu&apos;un module complet de{' '}
          <strong>billetterie en ligne sécurisée (Ticketing multi-zones avec présence auto-validée et personnalisation des billets partagés)</strong>{' '}
          et de <strong>paiements multicanaux sécurisés (cartes bancaires et Mobile Money en Francs Congolais — CDF et devises acceptées via FlexPay)</strong>.
        </p>
        <p>
          <strong>Important (Appartenance au Groupe Tekango) :</strong> En tant que service développé par le Groupe
          Tekango, l&apos;utilisateur reconnaît et accepte que les informations de compte puissent être utilisées de
          manière transverse pour faciliter l&apos;accès et les synergies avec les autres plateformes et applications du
          groupe, notamment la plateforme e-commerce Tekango, Poz&apos;tion ou tout autre service actuel ou futur du
          Groupe Tekango.
        </p>
        <p>
          En créant un compte, en réservant une prestation, en souscrivant un abonnement, en utilisant le Studio IA, en
          effectuant un don ou en achetant un billet sur EventMaster, vous acceptez sans réserve l&apos;intégralité des
          présentes conditions d&apos;utilisation (version {TERMS_VERSION} en vigueur).
        </p>
      </Section>

      <Section title="2. Comptes, organisations et rôles d'utilisateurs">
        <p>
          Chaque organisation bénéficie d&apos;un espace logique strictement cloisonné et isolé (multi-tenant). Le{' '}
          <strong>propriétaire</strong> du compte est le principal interlocuteur et responsable vis-à-vis
          d&apos;EventMaster et des tiers pour toute action effectuée sous son espace.
        </p>
        <p>Les comptes se déclinent selon différents profils adaptés aux usages :</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Organisateur</strong> : création d&apos;événements, invitations, plans de salle 2D/3D, billetterie, dons solidaires et contrôle d&apos;accès ;</li>
          <li><strong>Prestataire / Salle / Loueur</strong> : publication de vitrines marketplace (prestations de service, location de salles ou de matériel), gestion des disponibilités et devis ;</li>
          <li><strong>Mixte</strong> : cumul des fonctionnalités d&apos;organisateur d&apos;événements et de professionnel du marketplace ;</li>
          <li><strong>Client / Acheteur / Donateur</strong> : consultation du marketplace, demandes de devis, participation aux collectes solidaires et achat de billets d&apos;événements sans abonnement SaaS organisationnel requis ;</li>
          <li><strong>Commercial / Apporteur d&apos;affaires</strong> : compte habilité à promouvoir la plateforme et à percevoir des commissions d&apos;apporteur selon les règles du réseau commercial en vigueur.</li>
        </ul>
        <p>
          L&apos;organisation peut habiliter des collaborateurs (managers, régisseurs, agents protocole de scan QR,
          équipe commerciale). L&apos;organisation est responsable de l&apos;attribution et de la révocation de ces
          privilèges d&apos;accès, ainsi que de la confidentialité des identifiants associés.
        </p>
      </Section>

      <Section title="3. Billetterie en ligne, Tarification Multi-Zones & Contrôle d'Accès (Ticketing)">
        <p>
          EventMaster met à disposition des organisateurs une infrastructure technique de billetterie électronique
          permettant la commercialisation, la délivrance et le contrôle sécurisé de billets d&apos;événements payants et
          gratuits.
        </p>

        <p>
          <strong>3.1 Configuration des tarifs, zones et quotas.</strong> L&apos;organisateur fixe librement sous sa
          seule responsabilité :
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Le prix unitaire des billets (exprimé en Francs Congolais — FC / CDF ou devise applicable) ;</li>
          <li>
            La méthode de tarification : tarif global unique par événement ou{' '}
            <strong>tarification différenciée par zone tarifaire</strong> (ex. VIP Prestige, Carré d&apos;Or,
            Mezzanine, Standard, Balcon) liée au plan de salle 2D/3D ;
          </li>
          <li>
            L&apos;assignation des tables et sièges aux zones de billetterie, qu&apos;elle soit manuelle via
            l&apos;outil pinceau de zone ou assistée par nos <strong>algorithmes de répartition spatiale</strong>{' '}
            (Devant/Scène en profondeur, Cercles concentriques autour de la table d&apos;honneur, ou Quotas proportionnels
            de capacité) ;
          </li>
          <li>
            Le quota maximal de places disponibles par zone et par événement (jauge globale d&apos;accueil). Une fois
            le quota atteint, la vente est automatiquement suspendue par le système.
          </li>
        </ul>

        <p>
          <strong>3.2 Commande, achat et délivrance des e-billets.</strong>
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            Toute commande de billet devient définitive et confirmée dès la réception de la confirmation de paiement
            émise par le processeur sécurisé FlexPay.
          </li>
          <li>
            Chaque billet payé donne lieu à l&apos;émission automatique d&apos;un{' '}
            <strong>e-billet nominatif doté d&apos;un QR Code cryptographique unique</strong> et infalsifiable.
          </li>
          <li>
            L&apos;acheteur accède instantanément à ses billets depuis son espace (« Mes billets ») et peut les
            télécharger au format PDF ou les présenter sur smartphone.
          </li>
          <li>
            Le billet mentionne l&apos;identité du titulaire, l&apos;intitulé de l&apos;événement, la date, l&apos;heure,
            le lieu, la zone tarifaire, le montant payé ainsi que le siège ou la table assignée le cas échéant.
          </li>
        </ul>

        <p>
          <strong>3.3 Validation automatique de présence & Personnalisation des billets partagés.</strong>
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong>Validation automatique de présence :</strong> Dès validation d&apos;un achat de billet sur un
            événement public ou payant, la présence de l&apos;invité est automatiquement enregistrée et confirmée
            (statut RSVP « ACCEPTED »). L&apos;invité accède directement à son portail d&apos;accueil, à son pass QR et à
            ses consignes d&apos;accès sans nécessiter de validation manuelle supplémentaire.
          </li>
          <li>
            <strong>Personnalisation des billets partagés :</strong> Lorsqu&apos;un acheteur commande plusieurs billets
            pour des tiers ou qu&apos;un lien d&apos;invitation est transmis à un convive, chaque bénéficiaire a la
            faculté de compléter ou mettre à jour ses coordonnées personnelles (prénom, nom, numéro de téléphone
            WhatsApp normalisé E.164) et ses préférences d&apos;accueil (contraintes alimentaires, allergies, requêtes
            particulières) directement depuis son portail invité. Cette mise à jour réactualise immédiatement le badge QR
            nominatif et le registre d&apos;émargement de l&apos;organisateur.
          </li>
          <li>
            <strong>Garantie de l&apos;acheteur :</strong> L&apos;acheteur principal garantit avoir obtenu l&apos;accord
            préalable des tiers pour la communication de leurs données de contact et de placement.
          </li>
        </ul>

        <p>
          <strong>3.4 Contrôle d&apos;accès et validation le jour J (Scan Protocole).</strong>
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            L&apos;accès à l&apos;événement est subordonné à la présentation et à la validation du QR Code officiel par le
            personnel protocole muni de l&apos;outil de scan EventMaster.
          </li>
          <li>
            <strong>Règle du scan unique :</strong> Chaque QR Code ne peut être validé qu&apos;une seule fois pour entrer.
            Toute tentative ultérieure de présentation du même billet (doublon, copie, capture d&apos;écran déjà validée)
            est instantanément signalée comme invalide et rejetée par le système.
          </li>
          <li>
            Le porteur du billet peut être invité par l&apos;organisateur à présenter une pièce d&apos;identité
            officielle attestant de sa concordance avec le nom mentionné sur le billet.
          </li>
        </ul>

        <p>
          <strong>3.5 Reversement des recettes de billetterie (Payouts).</strong>
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            EventMaster encaisse les règlements des acheteurs pour le compte de l&apos;organisateur en qualité de
            mandataire technique d&apos;encaissement.
          </li>
          <li>
            Les recettes nettes (montant brut des ventes après déduction des frais de transaction et commissions de
            billetterie convenues) sont reversées à l&apos;organisation selon le calendrier et le moyen de paiement
            convenu (virement bancaire ou paiement électronique / Mobile Money FlexPay Payout).
          </li>
          <li>
            L&apos;organisateur est seul redevable des éventuelles taxes, droits d&apos;auteurs ou prélèvements fiscaux
            locaux applicables à son événement.
          </li>
        </ul>

        <p>
          <strong>3.6 Annulation d&apos;événement, modifications et politique de remboursement.</strong>
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            L&apos;organisateur est le seul garant de la bonne tenue de l&apos;événement, de sa programmation
            artistique ou professionnelle et de la conformité du lieu.
          </li>
          <li>
            En cas d&apos;annulation, de report de date ou de changement substantiel du programme, la responsabilité du
            remboursement incombe exclusivement à l&apos;organisateur.
          </li>
          <li>
            EventMaster n&apos;étant qu&apos;un intermédiaire technique, la plateforme ne procède au remboursement des
            acheteurs que sur instruction formelle de l&apos;organisateur et sous réserve que les fonds correspondants
            soient disponibles.
          </li>
          <li>
            Le détail (billets, dons solidaires, abonnements, jetons IA, acomptes marketplace, erreurs de paiement)
            figure dans la{' '}
            <Link href="/refund" className="text-primary font-semibold hover:underline">
              politique de remboursement
            </Link>.
          </li>
        </ul>

        <p>
          <strong>3.7 Lutte contre la fraude et interdiction de revente spéculative.</strong>
        </p>
        <p>
          Il est strictement interdit de reproduire, falsifier, revendre à des tarifs supérieurs à la valeur faciale ou
          commercialiser des billets EventMaster sur des canaux non officiels. Tout comportement frauduleux entraîne
          l&apos;invalidation immédiate du billet sans remboursement et d&apos;éventuelles poursuites pénales.
        </p>
      </Section>

      <Section title="4. Dons Solidaires & Collectes de Fonds (Donations)">
        <p>
          EventMaster met à disposition des organisations éligibles une infrastructure technique sécurisée de collecte
          de dons et de contributions solidaires à montant libre (exprimé en Francs Congolais — FC / CDF), permettant
          aux donateurs de soutenir des causes caritatives, cultuelles, familiales, associatives ou professionnelles.
        </p>

        <p>
          <strong>4.1 Qualité d&apos;intermédiaire technique.</strong> EventMaster intervient exclusivement comme
          intermédiaire technique et mandataire d&apos;encaissement pour le compte de l&apos;organisation initiatrice.
          EventMaster n&apos;est ni une banque, ni une fondation, ni un organisme de bienfaisance, et n&apos;exerce aucun
          contrôle sur l&apos;opportunité ou la gestion financière interne des fonds récoltés par l&apos;organisateur.
        </p>

        <p>
          <strong>4.2 Responsabilité et engagements de l&apos;organisation bénéficiaire.</strong> L&apos;organisation
          organisatrice garantit expressément :
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            Qu&apos;elle est légalement constituée et habilitée à recevoir des dons ou contributions publiques au regard
            des lois et règlements applicables en République Démocratique du Congo ;
          </li>
          <li>
            Que l&apos;intitulé de la cause, la description de l&apos;appel aux dons et l&apos;objectif financier affichés
            sur EventMaster sont rigoureusement exacts, sincères et véridiques ;
          </li>
          <li>
            Qu&apos;elle affectera la totalité des sommes nettes perçues à la réalisation exclusive de la cause annoncée,
            à l&apos;exclusion de tout usage détourné ou illicite ;
          </li>
          <li>
            Qu&apos;elle fait son affaire personnelle de toute déclaration fiscale ou légale requise au titre des
            libéralités reçues.
          </li>
        </ul>

        <p>
          <strong>4.3 Modalités de contribution et absence de reçu fiscal par la plateforme.</strong>
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            Le donateur détermine librement le montant de son don dans la limite des montants minimaux et plafonds
            autorisés par le système de paiement FlexPay.
          </li>
          <li>
            Le donateur peut choisir d&apos;effectuer sa contribution de manière nominative ou confidentielle
            (anonymat public vis-à-vis des autres visiteurs, tout en restant tracé dans les livres d&apos;audit de
            l&apos;organisateur et de la plateforme à des fins comptables et de conformité).
          </li>
          <li>
            Selon les paramètres choisis par l&apos;organisateur, un don peut donner droit à l&apos;attribution
            automatique d&apos;un pass invité d&apos;accès à l&apos;événement.
          </li>
          <li>
            <strong>Reçus fiscaux :</strong> EventMaster émet une confirmation technique de paiement mais ne délivre
            aucun reçu fiscal ouvrant droit à déduction d&apos;impôt. L&apos;établissement d&apos;une attestation fiscale
            relève de la seule responsabilité de l&apos;organisation bénéficiaire.
          </li>
        </ul>

        <p>
          <strong>4.4 Irrévocabilité du don consenti librement.</strong> Conformément aux règles applicables aux
          libéralités, tout don solidaire confirmé et réglé via FlexPay est réputé définitif, immédiat et irrévocable.
          Il n&apos;ouvre droit à aucun remboursement de la part d&apos;EventMaster, sous réserve des seules corrections
          d&apos;incidents techniques avérés (ex. double débit bancaire ou Mobile Money).
        </p>

        <p>
          <strong>4.5 Lutte contre le blanchiment et le financement du terrorisme (LCB-FT).</strong> Toute collecte
          présentant des indices de fraude, d&apos;escroquerie, de financement d&apos;activités illicites ou de
          blanchiment de capitaux sera immédiatement suspendue, les fonds gelés et un signalement transmis aux
          autorités judiciaires et financières compétentes en RDC.
        </p>
      </Section>

      <Section title="5. Paiements, Abonnements SaaS & Jetons d'Intelligence Artificielle (AI Tokens)">
        <p>
          Les règlements relatifs aux abonnements de la plateforme, aux recharges de jetons d&apos;intelligence
          artificielle, aux dons solidaires et aux achats de billets sont traités de manière sécurisée.
        </p>

        <p>
          <strong>5.1 Moyens de paiement acceptés (FlexPay).</strong> La plateforme s&apos;appuie sur le prestataire
          de services de paiement agréé <strong>FlexPay</strong> et prend en charge :
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Les cartes bancaires internationales et locales (Visa, Mastercard) ;</li>
          <li>Les solutions de paiement mobile (Mobile Money : M-Pesa Vodacom, Orange Money, Airtel Money, Afrimoney) ;</li>
          <li>Les règlements par virement bancaire ou validation manuelle pour les forfaits Entreprise / grands comptes.</li>
        </ul>

        <p>
          <strong>5.2 Sécurité bancaire & absence de stockage de données sensibles.</strong>
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>EventMaster n&apos;enregistre, ne stocke et ne traite à aucun moment les numéros complets de cartes de crédit, cryptogrammes (CVV) ou codes PIN secrets Mobile Money.</li>
          <li>Les transactions sont chiffrées de bout en bout et opérées sur l&apos;infrastructure certifiée et sécurisée de FlexPay conformément aux normes PCI-DSS.</li>
          <li>Chaque opération fait l&apos;objet d&apos;une confirmation horodatée, d&apos;un numéro de transaction unique et d&apos;un reçu électronique téléchargeable.</li>
        </ul>

        <p>
          <strong>5.3 Forfaits SaaS, renouvellement et facturation.</strong>
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Essentials (Gratuit)</strong> : découverte pour organisateurs et essai marketplace (1 salle / 1 prestation) ;</li>
          <li><strong>Particulier (B2C)</strong> : 4 paliers (50, 100, 200 ou plus de 200 invités illimités), facturés par trimestre (90 jours) ;</li>
          <li><strong>Business, Business Premium & Enterprise</strong> : forfaits professionnels pour agences et organisateurs réguliers avec support multi-comptes et fonctionnalités avancées ;</li>
          <li><strong>Forfaits Marketplace (Salle, Prestataire, Loueur de matériel, Mixte)</strong> : publication et mise en avant des services professionnels.</li>
        </ul>
        <p>
          Les tarifs sont indiqués en Francs Congolais (FC / CDF) ou devise applicable. Les abonnements annuels peuvent bénéficier d&apos;une réduction tarifaire (notamment 10% de remise sur l&apos;engagement 12 mois).
        </p>
        <TermsMarketplaceRates />

        <p className="mt-4">
          <strong>5.4 Système de Jetons IA (AI Tokens), Simulateur de Budget & Grand Livre de Consommation.</strong>
        </p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>
            <strong>Simulateur de budget IA dédié (/simulateur) :</strong> Les utilisateurs ont accès à une interface spécialisée de simulation budgétaire proposant des scénarios clés en main (Mariage, Anniversaire, Gala d&apos;Entreprise) et des estimations chiffrées en Francs Congolais (CDF) et Dollars ($) au taux officiel du jour. Des simulations gratuites de bienvenue sont offertes, puis des recharges peuvent être acquises via Mobile Money ou Carte bancaire.
          </li>
          <li>
            <strong>Utilisation des jetons d&apos;aménagement :</strong> L&apos;accès aux fonctionnalités d&apos;intelligence artificielle avancées (composition automatique de plan depuis un brief, analyse de photos ou croquis d&apos;aménagement via vision artificielle, reformulation d&apos;invitations en langues nationales) requiert des jetons d&apos;intelligence artificielle (ex. 10 jetons par génération de plan).
          </li>
          <li>
            <strong>Attribution et recharges :</strong> Des jetons de bienvenue ou des quotas périodiques peuvent être alloués selon les forfaits souscrits. L&apos;organisateur peut acquérir des packs de recharge supplémentaires en Francs Congolais (CDF) par Mobile Money ou carte bancaire via FlexPay.
          </li>
          <li>
            <strong>Consommation définitive :</strong> Tout appel à l&apos;API de traitement d&apos;intelligence artificielle lancé par l&apos;utilisateur décrémente automatiquement le solde du grand livre (ledger). Une fois le traitement exécuté par les modèles d&apos;IA, les jetons et crédits consommés ne sont pas remboursables.
          </li>
          <li>
            <strong>Durée de validité :</strong> Les jetons acquis demeurent valables tant que le compte de l&apos;organisation reste actif, sans date de péremption arbitraire.
          </li>
        </ul>
      </Section>

      <Section title="6. Studio IA, Plans 2D/3D, Escaliers, Scènes & Normes Physiques d'Espacement">
        <p>
          EventMaster fournit des outils de modélisation spatiale interactifs assistés par intelligence artificielle (Google Gemini) pour faciliter l&apos;agencement de réceptions, salles de fête, restaurants, salons et espaces d&apos;accueil, combinant plans 2D cotés et visualisations 3D WebGL photoréalistes (matériaux PBR, caméras cinématiques, zones tarifaires).
        </p>

        <p>
          <strong>6.1 Droits et garanties sur les visuels et plans importés.</strong>
        </p>
        <p>
          L&apos;organisateur certifie être propriétaire ou détenir l&apos;intégralité des droits, titres et autorisations nécessaires pour importer des photographies, croquis manuels ou plans d&apos;architectes dans le Studio IA. L&apos;utilisateur s&apos;interdit d&apos;importer des images portant atteinte aux droits de tiers, à la vie privée ou contenant des éléments illicites.
        </p>

        <p>
          <strong>6.2 Moteur de dégagement physique, accessibilité PMR & règles de circulation.</strong>
        </p>
        <p>
          L&apos;éditeur intègre un moteur de relaxation physique (<code>enforceRealLayoutClearances</code>) appliquant des normes ergonomiques de référence :
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Espacement minimal entre tables de 1,40 m (recul de chaise de 0,45 m de chaque côté + couloir de service de 0,50 m) ;</li>
          <li>Espacement minimal de 0,70 m entre centres de chaises avec interdiction absolue de superposition de coordonnées ;</li>
          <li>Zone tampon de sécurité de 1,40 m à 1,50 m vierge de tout obstacle devant les portes, sorties d&apos;évacuation et estrades scéniques ;</li>
          <li>Bande de circulation périphérique de 0,90 m le long des cloisons et murs ;</li>
          <li>Dégagement ergonomique de 0,90 m à 1,20 m devant les comptoirs de commande (POS), lignes de cuisine et comptoirs de retrait ;</li>
          <li>
            <strong>Accessibilité PMR (Personnes à Mobilité Réduite) :</strong> Préservation recommandée d&apos;allées principales de circulation d&apos;au moins 1,40 m à 1,50 m pour le passage et la giration des fauteuils roulants (types de chaises dédiés <code>WHEELCHAIR</code>), et aménagement d&apos;accès directs de plain-pied sans obstacle ;</li>
          <li>
            <strong>Escaliers et franchissements de niveaux :</strong> Les modules de modélisation d&apos;escaliers (droits, quart-tournants et colimaçon/hélicoïdaux) constituent des figurations schématiques d&apos;aide à la scénographie. Ils ne certifient ni le giron, ni l&apos;échappée de tête, ni la résistance des garde-corps aux normes du bâtiment ;</li>
          <li>
            <strong>Estrades, scènes et podiums surélevés :</strong> Le placement de mobilier sur des plateformes surélevées est proposé à titre d&apos;assistance visuelle. La capacité portante (charge d&apos;exploitation au m²), la stabilité mécanique de l&apos;estrade et les rambardes de protection antichute relèvent de la seule responsabilité de l&apos;organisateur et du fournisseur de l&apos;estrade.
          </li>
        </ul>

        <p>
          <strong>6.3 Clause de non-responsabilité architecturale et sécurité ERP.</strong>
        </p>
        <p>
          <strong>Avertissement essentiel :</strong> Les fonctionnalités de modélisation 2D/3D, de vue zénithale et d&apos;optimisation des espacements constituent un <strong>outil d&apos;assistance visuelle et d&apos;aide à la décision</strong>. Elles ne sauraient en aucun cas se substituer à une étude architecturale certifiée, à un diagnostic de bureau de contrôle agréé ou aux prescriptions des commissions de sécurité relatives aux Établissements Recevant du Public (ERP). L&apos;organisateur et l&apos;exploitant de la salle demeurent seuls juridiquement responsables de la conformité du plan réel exécuté le jour J au regard des règlements locaux de sécurité incendie, des issues de secours et de l&apos;accessibilité des personnes à mobilité réduite (PMR).
        </p>

        <p>
          <strong>6.4 Traçabilité collaborative & Journal d&apos;actions (`RoomActionContext`).</strong>
        </p>
        <p>
          Pour garantir la fiabilité du travail en équipe et prévenir les litiges internes, la plateforme conserve un journal contextuel des modifications apportées aux plans de salle (identifiant et rôle de l&apos;auteur, horodatage, action effectuée, variation du nombre de sièges, source manuelle ou IA).
        </p>
      </Section>

      <Section title="7. Invitations Multilingues, Langues Nationales Congolaises & Canal WhatsApp">
        <p>
          EventMaster met à disposition des modèles d&apos;invitation et un studio de génération assisté par IA prenant en charge le Français ainsi que les quatre langues nationales de la République Démocratique du Congo : <strong>Lingala, Swahili, Kikongo et Tshiluba</strong>.
        </p>
        <p>
          <strong>7.1 Utilisation éthique, source de contexte & respect des visages (Google Gemini).</strong>
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Choix de la source de contexte :</strong> L&apos;utilisateur peut choisir d&apos;appliquer le profil contextuel de son organisation ou son historique de recherche récent pour personnaliser les propositions graphiques et textuelles générées.</li>
          <li><strong>Restitution honnête des visages :</strong> Conformément aux principes éthiques et aux directives techniques de Google Gemini, notre moteur applique un ancrage d&apos;identité strict assurant une représentation fidèle et honnête des personnes fournies en référence, sans embellissement artificiel trompeur, déformation ou retouche dégradante.</li>
          <li>L&apos;organisateur est seul responsable de l&apos;exactitude des informations rédigées et de la bienséance des textes et images d&apos;invitation partagés.</li>
        </ul>
        <p>
          <strong>7.2 Acheminement WhatsApp & Consentement préalable (Opt-in).</strong>
        </p>
        <p>
          L&apos;organisateur s&apos;engage formellement à ne transmettre d&apos;invitations ou de notifications par WhatsApp qu&apos;à des personnes ayant préalablement consenti à être contactées dans le cadre de l&apos;événement concerné. L&apos;utilisation des outils EventMaster à des fins de prospection massive non sollicitée (spam) est strictement prohibée et entraîne la suspension immédiate du compte.
        </p>
      </Section>

      <Section title="8. Marketplace de Lieux, Prestataires & Locations de Matériel">
        <p>
          Le marketplace EventMaster met en relation des organisateurs avec des gestionnaires de salles, des prestataires de services événementiels (traiteurs, DJ, photographes, sécurité) et des <strong>loueurs de matériel et mobilier</strong> (tentes, chapiteaux, mobilier, sonorisation, éclairage, véhicules).
        </p>
        <p>
          <strong>8.1 Contrat direct entre les parties :</strong> EventMaster agit comme plateforme de mise en relation technique. Le contrat de prestation ou de location est conclu directement entre l&apos;organisateur et le professionnel. EventMaster n&apos;est ni locataire, ni sous-locataire, ni garant des obligations réciproques des parties.
        </p>
        <p>
          <strong>8.2 Spécificités de la location de matériel et mobilier :</strong> La mise à disposition de matériel, l&apos;état des lieux contradictoire de départ et de retour, ainsi que la constitution d&apos;un éventuel dépôt de garantie (caution) s&apos;effectuent directement entre les parties hors de la plateforme. EventMaster n&apos;est pas dépositaire du matériel loué et décline toute responsabilité en cas de casse, de retard de livraison, de vol, de non-conformité ou de dégradation du matériel.
        </p>
      </Section>

      <Section title="9. Données des participants, invités et responsabilité des organisations">
        <p>
          <strong>9.1 Responsabilité de traitement.</strong> L&apos;organisation agit en qualité de <strong>responsable de traitement</strong> pour les données de ses membres,
          de ses listes d&apos;invités, des participants à ses événements, des donateurs et des acheteurs de billets. L&apos;organisation s&apos;engage à respecter les lois relatives à la protection
          des données personnelles (notamment le Code du numérique de la RDC) et à disposer des consentements requis avant d&apos;émettre des communications (e-mail, WhatsApp).
        </p>
        <p>
          <strong>9.2 Rôle d&apos;EventMaster.</strong> EventMaster agit en qualité de <strong>sous-traitant technique</strong>, traitant ces données uniquement
          sur instruction documentée de l&apos;organisation pour assurer l&apos;exécution des services (émission de billets, enregistrement des dons, envoi d&apos;invitations, plan de table, protocole de scan).
          EventMaster ne commercialise ni ne cède les listes d&apos;invités, données de donateurs ou données de billetterie à des régies publicitaires tierces.
        </p>
      </Section>

      <Section title="10. Mesures de sécurité et intégrité du service">
        <p>
          EventMaster déploie des normes de sécurité rigoureuses pour protéger la plateforme :
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Chiffrement systématique de toutes les communications via HTTPS / TLS (256 bits) ;</li>
          <li>Mots de passe stockés sous forme hautement sécurisée (hachage bcrypt avec sel) ;</li>
          <li>Authentification double facteur / vérification d&apos;identité par code OTP (e-mail ou WhatsApp) ;</li>
          <li>Isolation multi-tenant étanche garantissant la confidentialité absolue entre organisations ;</li>
          <li>Traçabilité et journalisation des transactions financières et des opérations d&apos;administration sensible ;</li>
          <li>Génération cryptographique des QR Codes de billetterie et des pass donateurs prévenant toute duplication ou contrefaçon.</li>
        </ul>
      </Section>

      <Section title="11. Utilisation acceptable & Règles de conduite">
        <p>Il est expressément interdit d&apos;utiliser EventMaster pour :</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Diffuser des communications non sollicitées, intrusives ou constituant du spam (par e-mail ou WhatsApp) ;</li>
          <li>Organiser des événements frauduleux, fictifs, trompeurs ou contraires à l&apos;ordre public et aux lois en vigueur ;</li>
          <li>Lancer des collectes de dons fictives ou détourner des contributions solidaires de leur objet annoncé ;</li>
          <li>Commercialiser des billets sans disposer de l&apos;autorisation légale ou des droits sur l&apos;événement concerné ;</li>
          <li>Importer des visuels, photos de salle ou plans en violation du droit d&apos;auteur ou du droit à l&apos;image ;</li>
          <li>Tenter de porter atteinte à la sécurité, à la disponibilité ou à l&apos;infrastructure technique d&apos;EventMaster ;</li>
          <li>Contourner les limitations techniques ou quotas attachés au forfait souscrit.</li>
        </ul>
      </Section>

      <Section title="12. Propriété intellectuelle">
        <p>
          La plateforme EventMaster, son ergonomie, son code source, sa marque, ses algorithmes d&apos;aménagement et de répartition des zones, ses modules 2D/3D et ses outils de billetterie et de collecte demeurent la propriété
          exclusive d&apos;EventMaster (Groupe Tekango). Les visuels, descriptifs, médias et marques publiés par les organisateurs ou prestataires restent
          la propriété de leurs auteurs respectifs, qui concèdent à EventMaster une licence technique d&apos;hébergement et d&apos;affichage strictement limitée à la délivrance du service.
        </p>
      </Section>

      <Section title="13. Responsabilité et limitation de garantie">
        <p>
          EventMaster fournit une infrastructure logicielle hautement disponible mais ne garantit pas une absence totale d&apos;interruptions indépendantes de sa volonté (pannes de réseau Internet, perturbations des opérateurs mobiles pour le Mobile Money, interruptions des API d&apos;intelligence artificielle tierces, cas de force majeure).
        </p>
        <p>
          EventMaster ne saurait être tenu responsable des litiges survenant entre un acheteur de billet / donateur et un organisateur (qualité de la prestation événementielle, retards, annulations, différends de placement, utilisation effective des dons), ni des transactions commerciales de location de matériel intervenant directement hors de la plateforme.
        </p>
      </Section>

      <Section title="14. Résiliation et export des données">
        <p>
          L&apos;utilisateur peut cesser l&apos;utilisation des services à tout moment. En cas de manquement grave aux présentes conditions ou de fraude avérée à la billetterie ou aux collectes de dons, EventMaster se réserve le droit de suspendre ou résilier l&apos;accès au compte sans préavis.
        </p>
        <p>
          À la clôture d&apos;un compte, l&apos;organisation peut solliciter l&apos;export de ses historiques d&apos;événements et de collectes, sous réserve des délais légaux de conservation fiscale et comptable imposés par la loi pour les transactions financières.
        </p>
      </Section>

      <Section title="15. Droit applicable & Règlement des litiges">
        <p>
          Les présentes conditions d&apos;utilisation sont régies et interprétées conformément au droit de la{' '}
          <strong>République Démocratique du Congo</strong>, notamment l&apos;Ordonnance-loi n° 23/010 du 13 mars 2023
          portant Code du numérique.
        </p>
        <p>
          Tout différend relatif à la validité, l&apos;interprétation ou l&apos;exécution des présentes fera l&apos;objet
          d&apos;une tentative de règlement amiable préalable. À défaut d&apos;accord amiable dans un délai de trente (30)
          jours à compter de la notification du litige, le différend sera soumis à la compétence exclusive des tribunaux
          de Kinshasa (Gombe).
        </p>
      </Section>

      <Section title="16. Modifications des conditions d'utilisation">
        <p>
          EventMaster se réserve le droit d&apos;adapter et de faire évoluer les présentes conditions d&apos;utilisation
          afin de refléter de nouvelles fonctionnalités ou des évolutions réglementaires. Toute modification majeure fera
          l&apos;objet d&apos;une information préalable et d&apos;une confirmation d&apos;acceptation lors de la connexion
          (version {TERMS_VERSION} en vigueur).
        </p>
      </Section>

      <Section title="17. Assistance et contact">
        <p>
          Pour toute question relative aux présentes conditions ou à l&apos;utilisation des modules de paiement, Studio
          IA, dons et billetterie, vous pouvez contacter notre équipe juridique et support :{' '}
          <LegalSupportEmail className="text-primary dark:text-primary hover:underline" /> ou via notre{' '}
          <a href="/contact" className="text-primary dark:text-primary hover:underline">
            formulaire de contact
          </a>.
        </p>
      </Section>
    </LegalPageShell>
  );
}
