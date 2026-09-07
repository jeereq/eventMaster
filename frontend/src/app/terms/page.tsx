import { LegalPageShell, Section } from '@/components/LegalPageShell';
import LegalSupportEmail from '@/components/LegalSupportEmail';
import TermsMarketplaceRates from '@/components/TermsMarketplaceRates';
import { TERMS_VERSION } from '@/config/legalConfig';

export const metadata = {
  title: 'Conditions d\'utilisation — EventMaster',
  description: 'Conditions générales d\'utilisation de la plateforme EventMaster, intégrant la billetterie multi-zone, les paiements sécurisés, le Studio IA et la modélisation de plans de salle.',
};

export default function TermsPage() {
  return (
    <LegalPageShell
      title="Conditions d'utilisation"
      subtitle="Les présentes conditions régissent l'accès et l'utilisation de la plateforme EventMaster, incluant le Studio IA, la billetterie multi-zone, la modélisation de salle 2D/3D et les paiements sécurisés."
      lastUpdated="7 septembre 2026"
      version={TERMS_VERSION}
    >
      <Section title="1. Objet & Présentation de la plateforme">
        <p>
          <strong>EventMaster</strong> est un projet et une plateforme logicielle SaaS multi-tenant éditée par le <strong>Groupe Tekango</strong>. 
          Elle propose un ensemble d&apos;outils intégrés dédiés à l&apos;organisation et à la gestion d&apos;événements privés et professionnels :
          création d&apos;invitations interactives multilingues (Français et langues nationales de la RDC : Lingala, Swahili, Kikongo, Tshiluba), 
          routage et confirmations RSVP instantanées sur WhatsApp, <strong>Studio d&apos;Aménagement IA</strong> avec modélisation 2D zénithale et 3D WebGL de salles, 
          moteur d&apos;espacement et de dégagement physique réel, plans de table, protocole d&apos;accueil et contrôle d&apos;accès le jour J (scan QR ultra-rapide anti-doublon), 
          fil d&apos;actualité média, livre d&apos;or en ligne, gestion collaborative d&apos;équipes avec journal d&apos;actions contextuel, 
          marketplace de prestataires et de salles, ainsi qu&apos;un module complet de <strong>billetterie en ligne sécurisée (Ticketing multi-zones)</strong> 
          et de <strong>paiements multicanaux sécurisés (cartes bancaires et Mobile Money en Francs Congolais — CDF et devises acceptées)</strong>.
        </p>
        <p>
          <strong>Important (Appartenance au Groupe Tekango) :</strong> En tant que service développé par le Groupe Tekango, l&apos;utilisateur reconnaît et accepte
          que les informations de compte puissent être utilisées de manière transverse pour faciliter l&apos;accès et les synergies avec les autres plateformes
          et applications du groupe, notamment la plateforme e-commerce Tekango, Poz&apos;tion ou tout autre service actuel ou futur du Groupe Tekango.
        </p>
        <p>
          En créant un compte, en réservant une prestation, en souscrivant un abonnement, en utilisant le Studio IA ou en achetant un billet sur EventMaster,
          vous acceptez sans réserve l&apos;intégralité des présentes conditions d&apos;utilisation (version {TERMS_VERSION} en vigueur).
        </p>
      </Section>

      <Section title="2. Comptes, organisations et rôles d'utilisateurs">
        <p>
          Chaque organisation bénéficie d&apos;un espace logique strictement cloisonné et isolé (multi-tenant). Le <strong>propriétaire</strong> du
          compte est le principal interlocuteur et responsable vis-à-vis d&apos;EventMaster et des tiers pour toute action effectuée sous son espace.
        </p>
        <p>
          Les comptes se déclinent selon différents profils adaptés aux usages :
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Organisateur</strong> : création d&apos;événements, invitations, plans de salle 2D/3D, billetterie et contrôle d&apos;accès ;</li>
          <li><strong>Prestataire / Salle</strong> : publication de vitrines marketplace, gestion des disponibilités et devis ;</li>
          <li><strong>Mixte</strong> : cumul des fonctionnalités d&apos;organisateur d&apos;événements et de prestataire marketplace ;</li>
          <li><strong>Client / Acheteur</strong> : consultation du marketplace, demandes de devis et achat de billets d&apos;événements sans abonnement SaaS organisationnel requis.</li>
        </ul>
        <p>
          L&apos;organisation peut habiliter des collaborateurs (managers, régisseurs, agents protocole de scan QR, équipe commerciale).
          L&apos;organisation est responsable de l&apos;attribution et de la révocation de ces privilèges d&apos;accès, ainsi que de la confidentialité des identifiants associés.
        </p>
      </Section>

      <Section title="3. Billetterie en ligne, Tarification Multi-Zones & Contrôle d'Accès (Ticketing)">
        <p>
          EventMaster met à disposition des organisateurs une infrastructure technique de billetterie électronique permettant la commercialisation,
          la délivrance et le contrôle sécurisé de billets d&apos;événements payants et gratuits.
        </p>
        
        <p>
          <strong>3.1 Configuration des tarifs, zones et quotas.</strong> L&apos;organisateur fixe librement sous sa seule responsabilité :
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Le prix unitaire des billets (exprimé en Francs Congolais — FC / CDF) ;</li>
          <li>
            La méthode de tarification : tarif global unique par événement ou <strong>tarification différenciée par zone tarifaire</strong> (ex. VIP Prestige, Carré d&apos;Or, Mezzanine, Standard, Balcon) liée au plan de salle 2D/3D ;
          </li>
          <li>
            L&apos;assignation des tables et sièges aux zones de billetterie, qu&apos;elle soit manuelle via l&apos;outil pinceau de zone ou assistée par nos <strong>algorithmes de répartition spatiale</strong> (Devant/Scène en profondeur, Cercles concentriques autour de la table d&apos;honneur, ou Quotas proportionnels de capacité) ;
          </li>
          <li>Le quota maximal de places disponibles par zone et par événement (jauge globale d&apos;accueil). Une fois le quota atteint, la vente est automatiquement suspendue par le système.</li>
        </ul>

        <p>
          <strong>3.2 Commande, achat et délivrance des e-billets.</strong>
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Toute commande de billet devient définitive et confirmée dès la réception de la confirmation de paiement émise par le processeur sécurisé FlexPay.</li>
          <li>Chaque billet payé donne lieu à l&apos;émission automatique d&apos;un <strong>e-billet nominatif doté d&apos;un QR Code cryptographique unique</strong> et infalsifiable.</li>
          <li>L&apos;acheteur accède instantanément à ses billets depuis son espace (« Mes billets ») et peut les télécharger au format PDF ou les présenter sur smartphone.</li>
          <li>Le billet mentionne l&apos;identité du titulaire, l&apos;intitulé de l&apos;événement, la date, l&apos;heure, le lieu, la zone tarifaire, le montant payé ainsi que le siège ou la table assignée le cas échéant.</li>
        </ul>

        <p>
          <strong>3.3 Contrôle d&apos;accès et validation le jour J (Scan Protocole).</strong>
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>L&apos;accès à l&apos;événement est subordonné à la présentation et à la validation du QR Code officiel par le personnel protocole muni de l&apos;outil de scan EventMaster.</li>
          <li><strong>Règle du scan unique :</strong> Chaque QR Code ne peut être validé qu&apos;une seule fois pour entrer. Toute tentative ultérieure de présentation du même billet (doublon, copie, capture d&apos;écran déjà validée) est instantanément signalée comme invalide et rejetée par le système.</li>
          <li>Le porteur du billet peut être invité par l&apos;organisateur à présenter une pièce d&apos;identité officielle attestant de sa concordance avec le nom mentionné sur le billet.</li>
        </ul>

        <p>
          <strong>3.4 Reversement des recettes de billetterie (Payouts).</strong>
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>EventMaster encaisse les règlements des acheteurs pour le compte de l&apos;organisateur en qualité de mandataire technique d&apos;encaissement.</li>
          <li>Les recettes nettes (montant brut des ventes après déduction des frais de transaction et commissions de billetterie convenues) sont reversées à l&apos;organisation selon le calendrier et le moyen de paiement convenu (virement bancaire ou paiement électronique / Mobile Money FlexPay Payout).</li>
          <li>L&apos;organisateur est seul redevable des éventuelles taxes, droits d&apos;auteurs ou prélèvements fiscaux locaux applicables à son événement.</li>
        </ul>

        <p>
          <strong>3.5 Annulation d&apos;événement, modifications et politique de remboursement.</strong>
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>L&apos;organisateur est le seul garant de la bonne tenue de l&apos;événement, de sa programmation artistique ou professionnelle et de la conformité du lieu.</li>
          <li>En cas d&apos;annulation, de report de date ou de changement substantiel du programme, la responsabilité du remboursement incombe exclusivement à l&apos;organisateur.</li>
          <li>EventMaster n&apos;étant qu&apos;un intermédiaire technique, la plateforme ne procède au remboursement des acheteurs que sur instruction formelle de l&apos;organisateur et sous réserve que les fonds correspondants soient disponibles.</li>
        </ul>

        <p>
          <strong>3.6 Lutte contre la fraude et interdiction de revente spéculative.</strong>
        </p>
        <p>
          Il est strictement interdit de reproduire, falsifier, revendre à des tarifs supérieurs à la valeur faciale ou commercialiser des billets EventMaster sur des canaux non officiels. Tout comportement frauduleux entraîne l&apos;invalidation immédiate du billet sans remboursement et d&apos;éventuelles poursuites.
        </p>
      </Section>

      <Section title="4. Paiements, Abonnements SaaS & Jetons d'Intelligence Artificielle (AI Tokens)">
        <p>
          Les règlements relatifs aux abonnements de la plateforme, aux recharges de jetons d&apos;intelligence artificielle et aux achats de billets sont traités de manière sécurisée.
        </p>
        
        <p>
          <strong>4.1 Moyens de paiement acceptés (FlexPay).</strong> La plateforme s&apos;appuie sur le prestataire de services de paiement agréé <strong>FlexPay</strong> et prend en charge :
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Les cartes bancaires internationales et locales (Visa, Mastercard) ;</li>
          <li>Les solutions de paiement mobile (Mobile Money : M-Pesa Vodacom, Orange Money, Airtel Money, Afrimoney) ;</li>
          <li>Les règlements par virement bancaire ou validation manuelle pour les forfaits Entreprise / grands comptes.</li>
        </ul>

        <p>
          <strong>4.2 Sécurité bancaire & absence de stockage de données sensibles.</strong>
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>EventMaster n&apos;enregistre, ne stocke et ne traite à aucun moment les numéros complets de cartes de crédit, cryptogrammes (CVV) ou codes PIN secrets Mobile Money.</li>
          <li>Les transactions sont chiffrées de bout en bout et opérées sur l&apos;infrastructure certifiée et sécurisée de FlexPay conformément aux normes PCI-DSS.</li>
          <li>Chaque opération fait l&apos;objet d&apos;une confirmation horodatée, d&apos;un numéro de transaction unique et d&apos;un reçu électronique téléchargeable.</li>
        </ul>

        <p>
          <strong>4.3 Forfaits SaaS, renouvellement et facturation.</strong>
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Essentials (Gratuit)</strong> : découverte pour organisateurs et essai marketplace (1 salle / 1 prestation) ;</li>
          <li><strong>Particulier (B2C)</strong> : 4 paliers (50, 100, 200 ou plus de 200 invités illimités), facturés par trimestre (90 jours) ;</li>
          <li><strong>Business, Business Premium & Enterprise</strong> : forfaits professionnels pour agences et organisateurs réguliers avec support multi-comptes et fonctionnalités avancées ;</li>
          <li><strong>Forfaits Marketplace (Salle, Prestataire, Mixte)</strong> : publication et mise en avant des services professionnels.</li>
        </ul>
        <p>
          Les tarifs sont indiqués en Francs Congolais (FC / CDF) ou devise applicable. Les abonnements annuels peuvent bénéficier d&apos;une réduction tarifaire (notamment 10% de remise sur l&apos;engagement 12 mois).
        </p>
        <TermsMarketplaceRates />

        <p className="mt-4">
          <strong>4.4 Système de Jetons IA (AI Tokens) & Grand Livre de Consommation.</strong>
        </p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>
            <strong>Utilisation des jetons :</strong> L&apos;accès aux fonctionnalités d&apos;intelligence artificielle avancées (composition automatique de plan depuis un brief, analyse de photos ou croquis d&apos;aménagement via vision artificielle, reformulation d&apos;invitations en langues nationales) requiert des jetons d&apos;intelligence artificielle (ex. 10 jetons par génération de plan).
          </li>
          <li>
            <strong>Attribution et recharges :</strong> Des jetons de bienvenue ou des quotas périodiques peuvent être alloués selon les forfaits souscrits. L&apos;organisateur peut acquérir des packs de recharge supplémentaires en Francs Congolais (CDF) par Mobile Money ou carte bancaire via FlexPay.
          </li>
          <li>
            <strong>Consommation définitive :</strong> Tout appel à l&apos;API de traitement d&apos;intelligence artificielle lancé par l&apos;utilisateur décrémente automatiquement le solde du grand livre (ledger). Une fois le traitement exécuté par les modèles d&apos;IA, les jetons consommés ne sont pas remboursables.
          </li>
          <li>
            <strong>Durée de validité :</strong> Les jetons acquis demeurent valables tant que le compte de l&apos;organisation reste actif, sans date de péremption arbitraire.
          </li>
        </ul>
      </Section>

      <Section title="5. Studio IA, Plans 2D/3D & Normes Physiques d'Espacement">
        <p>
          EventMaster fournit des outils de modélisation spatiale interactifs assistés par intelligence artificielle (Google Gemini) pour faciliter l&apos;agencement de réceptions, salles de fête, restaurants et espaces d&apos;accueil.
        </p>
        
        <p>
          <strong>5.1 Droits et garanties sur les visuels et plans importés.</strong>
        </p>
        <p>
          L&apos;organisateur certifie être propriétaire ou détenir l&apos;intégralité des droits, titres et autorisations nécessaires pour importer des photographies, croquis manuels ou plans d&apos;architectes dans le Studio IA. L&apos;utilisateur s&apos;interdit d&apos;importer des images portant atteinte aux droits de tiers, à la vie privée ou contenant des éléments illicites.
        </p>

        <p>
          <strong>5.2 Moteur de dégagement physique et règles de circulation.</strong>
        </p>
        <p>
          L&apos;éditeur intègre un moteur de relaxation physique (<code>enforceRealLayoutClearances</code>) appliquant des normes ergonomiques de référence :
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Espacement minimal entre tables de 1,40 m (recul de chaise de 0,45 m de chaque côté + couloir de service de 0,50 m) ;</li>
          <li>Espacement minimal de 0,70 m entre centres de chaises avec interdiction absolue de superposition de coordonnées ;</li>
          <li>Zone tampon de sécurité de 1,40 m à 1,50 m vierge de tout obstacle devant les portes, sorties d&apos;évacuation et estrades scéniques ;</li>
          <li>Bande de circulation périphérique de 0,90 m le long des cloisons et murs ;</li>
          <li>Dégagement ergonomique de 0,90 m à 1,20 m devant les comptoirs de commande (POS), lignes de cuisine et comptoirs de retrait.</li>
        </ul>

        <p>
          <strong>5.3 Clause de non-responsabilité architecturale et sécurité ERP.</strong>
        </p>
        <p>
          <strong>Avertissement essentiel :</strong> Les fonctionnalités de modélisation 2D/3D, de vue zénithale et d&apos;optimisation des espacements constituent un <strong>outil d&apos;assistance visuelle et d&apos;aide à la décision</strong>. Elles ne sauraient en aucun cas se substituer à une étude architecturale certifiée, à un diagnostic de bureau de contrôle agréé ou aux prescriptions des commissions de sécurité relatives aux Établissements Recevant du Public (ERP). L&apos;organisateur et l&apos;exploitant de la salle demeurent seuls juridiquement responsables de la conformité du plan réel exécuté le jour J au regard des règlements locaux de sécurité incendie, des issues de secours et de l&apos;accessibilité des personnes à mobilité réduite (PMR).
        </p>

        <p>
          <strong>5.4 Traçabilité collaborative & Journal d&apos;actions (`RoomActionContext`).</strong>
        </p>
        <p>
          Pour garantir la fiabilité du travail en équipe et prévenir les litiges internes, la plateforme conserve un journal contextuel des modifications apportées aux plans de salle (identifiant et rôle de l&apos;auteur, horodatage, action effectuée, variation du nombre de sièges, source manuelle ou IA).
        </p>
      </Section>

      <Section title="6. Invitations Multilingues, Langues Nationales Congolaises & Canal WhatsApp">
        <p>
          EventMaster met à disposition des modèles d&apos;invitation et un studio de génération assisté par IA prenant en charge le Français ainsi que les quatre langues nationales de la République Démocratique du Congo : <strong>Lingala, Swahili, Kikongo et Tshiluba</strong>.
        </p>
        <p>
          <strong>6.1 Utilisation éthique et protection de l&apos;identité.</strong>
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Le système intègre des garde-fous stricts empêchant l&apos;altération trompeuse ou dégradante des visages et l&apos;usurpation d&apos;identité des participants.</li>
          <li>L&apos;organisateur est seul responsable de l&apos;exactitude des informations rédigées et de la bienséance des textes d&apos;invitation partagés.</li>
        </ul>
        <p>
          <strong>6.2 Acheminement WhatsApp & Consentement préalable (Opt-in).</strong>
        </p>
        <p>
          L&apos;organisateur s&apos;engage formellement à ne transmettre d&apos;invitations ou de notifications par WhatsApp qu&apos;à des personnes ayant préalablement consenti à être contactées dans le cadre de l&apos;événement concerné. L&apos;utilisation des outils EventMaster à des fins de prospection massive non sollicitée (spam) est strictement prohibée et entraîne la suspension immédiate du compte.
        </p>
      </Section>

      <Section title="7. Données des participants, invités et responsabilité des organisations">
        <p>
          <strong>7.1 Responsabilité de traitement.</strong> L&apos;organisation agit en qualité de <strong>responsable de traitement</strong> pour les données de ses membres,
          de ses listes d&apos;invités, des participants à ses événements et des acheteurs de billets. L&apos;organisation s&apos;engage à respecter les lois relatives à la protection
          des données personnelles et à disposer des consentements requis avant d&apos;émettre des communications (e-mail, WhatsApp).
        </p>
        <p>
          <strong>7.2 Rôle d&apos;EventMaster.</strong> EventMaster agit en qualité de <strong>sous-traitant technique</strong>, traitant ces données uniquement
          sur instruction documentée de l&apos;organisation pour assurer l&apos;exécution des services (émission de billets, envoi d&apos;invitations, plan de table, protocole de scan).
          EventMaster ne commercialise ni ne cède les listes d&apos;invités ou données de billetterie à des régies publicitaires tierces.
        </p>
      </Section>

      <Section title="8. Mesures de sécurité et intégrité du service">
        <p>
          EventMaster déploie des normes de sécurité rigoureuses pour protéger la plateforme :
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Chiffrement systématique de toutes les communications via HTTPS / TLS (256 bits) ;</li>
          <li>Mots de passe stockés sous forme hautement sécurisée (hachage bcrypt avec sel) ;</li>
          <li>Authentification double facteur / vérification d&apos;identité par code OTP (e-mail ou WhatsApp) ;</li>
          <li>Isolation multi-tenant étanche garantissant la confidentialité absolue entre organisations ;</li>
          <li>Traçabilité et journalisation des transactions financières et des opérations d&apos;administration sensible ;</li>
          <li>Génération cryptographique des QR Codes de billetterie prévenant toute duplication ou contrefaçon.</li>
        </ul>
      </Section>

      <Section title="9. Utilisation acceptable & Règles de conduite">
        <p>Il est expressément interdit d&apos;utiliser EventMaster pour :</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Diffuser des communications non sollicitées, intrusives ou constituant du spam (par e-mail ou WhatsApp) ;</li>
          <li>Organiser des événements frauduleux, fictifs, trompeurs ou contraires à l&apos;ordre public et aux lois en vigueur ;</li>
          <li>Commercialiser des billets sans disposer de l&apos;autorisation légale ou des droits sur l&apos;événement concerné ;</li>
          <li>Importer des visuels, photos de salle ou plans en violation du droit d&apos;auteur ou du droit à l&apos;image ;</li>
          <li>Tenter de porter atteinte à la sécurité, à la disponibilité ou à l&apos;infrastructure technique d&apos;EventMaster ;</li>
          <li>Contourner les limitations techniques ou quotas attachés au forfait souscrit.</li>
        </ul>
      </Section>

      <Section title="10. Propriété intellectuelle">
        <p>
          La plateforme EventMaster, son ergonomie, son code source, sa marque, ses algorithmes d&apos;aménagement et de répartition des zones, ses modules 2D/3D et ses outils de billetterie demeurent la propriété
          exclusive d&apos;EventMaster (Groupe Tekango). Les visuels, descriptifs, médias et marques publiés par les organisateurs ou prestataires restent
          la propriété de leurs auteurs respectifs, qui concèdent à EventMaster une licence technique d&apos;hébergement et d&apos;affichage strictement limitée à la délivrance du service.
        </p>
      </Section>

      <Section title="11. Responsabilité et limitation de garantie">
        <p>
          EventMaster fournit une infrastructure logicielle hautement disponible mais ne garantit pas une absence totale d&apos;interruptions indépendantes de sa volonté (pannes de réseau Internet, perturbations des opérateurs mobiles pour le Mobile Money, interruptions des API d&apos;intelligence artificielle tierces, cas de force majeure).
        </p>
        <p>
          EventMaster ne saurait être tenu responsable des litiges survenant entre un acheteur de billet et un organisateur (qualité de la prestation événementielle, retards, annulations, différends de placement), ni des transactions commerciales intervenant directement hors de la plateforme.
        </p>
      </Section>

      <Section title="12. Résiliation et export des données">
        <p>
          L&apos;utilisateur peut cesser l&apos;utilisation des services à tout moment. En cas de manquement grave aux présentes conditions ou de fraude avérée à la billetterie, EventMaster se réserve le droit de suspendre ou résilier l&apos;accès au compte sans préavis.
        </p>
        <p>
          À la clôture d&apos;un compte, l&apos;organisation peut solliciter l&apos;export de ses historiques d&apos;événements, sous réserve des délais légaux de conservation fiscale et comptable imposés par la loi pour les transactions financières.
        </p>
      </Section>

      <Section title="13. Modifications des conditions d'utilisation">
        <p>
          EventMaster se réserve le droit d&apos;adapter et de faire évoluer les présentes conditions d&apos;utilisation afin de refléter de nouvelles fonctionnalités ou des évolutions réglementaires. Toute modification majeure fera l&apos;objet d&apos;une information préalable et d&apos;une confirmation d&apos;acceptation lors de la connexion.
        </p>
      </Section>

      <Section title="14. Assistance et contact">
        <p>
          Pour toute question relative aux présentes conditions ou à l&apos;utilisation des modules de paiement, Studio IA et billetterie, vous pouvez contacter notre équipe juridique et support :{' '}
          <LegalSupportEmail className="text-primary dark:text-primary hover:underline" /> ou via notre{' '}
          <a href="/contact" className="text-primary dark:text-primary hover:underline">
            formulaire de contact
          </a>.
        </p>
      </Section>
    </LegalPageShell>
  );
}
