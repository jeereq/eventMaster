import { LegalPageShell, Section } from '@/components/LegalPageShell';
import LegalSupportEmail from '@/components/LegalSupportEmail';
import TermsMarketplaceRates from '@/components/TermsMarketplaceRates';
import { TERMS_VERSION } from '@/config/legalConfig';

export const metadata = {
  title: 'Conditions d\'utilisation — EventMaster',
  description: 'Conditions générales d\'utilisation de la plateforme EventMaster, intégrant la billetterie et les paiements sécurisés.',
};

export default function TermsPage() {
  return (
    <LegalPageShell
      title="Conditions d'utilisation"
      subtitle="Les présentes conditions régissent l'accès et l'utilisation de la plateforme EventMaster, incluant les services de billetterie et de paiement en ligne."
      lastUpdated="28 août 2026"
      version={TERMS_VERSION}
    >
      <Section title="1. Objet & Présentation de la plateforme">
        <p>
          <strong>EventMaster</strong> est un projet et une plateforme logicielle SaaS multi-tenant éditée par le <strong>Groupe Tekango</strong>. 
          Elle propose un ensemble d&apos;outils intégrés dédiés à l&apos;organisation et à la gestion d&apos;événements privés et professionnels :
          création d&apos;invitations interactives, gestion des confirmations RSVP, agencement 2D et visualisation 3D de salles,
          plans de table, protocole d&apos;accueil (scan QR et vérification des présences), fil d&apos;actualité média, livre d&apos;or en ligne,
          gestion d&apos;équipes et de rôles, marketplace de prestataires et de salles, ainsi qu&apos;un module complet de <strong>billetterie en ligne sécurisée (Ticketing)</strong>
          et de <strong>paiements multicanaux (cartes bancaires et Mobile Money)</strong>.
        </p>
        <p>
          <strong>Important (Appartenance au Groupe Tekango) :</strong> En tant que service développé par le Groupe Tekango, l&apos;utilisateur reconnaît et accepte
          que les informations de compte puissent être utilisées de manière transverse pour faciliter l&apos;accès et les synergies avec les autres plateformes
          et applications du groupe, notamment la plateforme e-commerce Tekango, Poz&apos;tion ou tout autre service actuel ou futur du Groupe Tekango.
        </p>
        <p>
          En créant un compte, en réservant une prestation, en souscrivant un abonnement ou en achetant un billet sur EventMaster,
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
          <li><strong>Organisateur</strong> : création d&apos;événements, invitations, plans de salle, billetterie et contrôle d&apos;accès ;</li>
          <li><strong>Prestataire / Salle</strong> : publication de vitrines marketplace, gestion des disponibilités et devis ;</li>
          <li><strong>Mixte</strong> : cumul des fonctionnalités d&apos;organisateur d&apos;événements et de prestataire marketplace ;</li>
          <li><strong>Client / Acheteur</strong> : consultation du marketplace, demandes de devis et achat de billets d&apos;événements sans abonnement SaaS organisationnel requis.</li>
        </ul>
        <p>
          L&apos;organisation peut habiliter des collaborateurs (managers, régisseurs, agents protocole de scan QR, équipe commerciale).
          L&apos;organisation est responsable de l&apos;attribution et de la révocation de ces privilèges d&apos;accès, ainsi que de la confidentialité des identifiants associés.
        </p>
      </Section>

      <Section title="3. Billetterie en ligne, Vente de Billets & Contrôle d'Accès (Ticketing)">
        <p>
          EventMaster met à disposition des organisateurs une infrastructure technique de billetterie électronique permettant la commercialisation,
          la délivrance et le contrôle sécurisé de billets d&apos;événements.
        </p>
        
        <p>
          <strong>3.1 Configuration des tarifs et quotas par l&apos;organisateur.</strong> L&apos;organisateur fixe librement sous sa seule responsabilité :
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Le prix unitaire des billets (exprimé en Francs Congolais — FC) ;</li>
          <li>La méthode de tarification : tarif global unique par événement ou tarification différenciée par zone / par siège selon le plan de salle 2D/3D configuré ;</li>
          <li>Le quota maximal de places disponibles (capacité d&apos;accueil). Une fois le quota atteint, la vente est automatiquement suspendue par le système.</li>
        </ul>

        <p>
          <strong>3.2 Commande, achat et délivrance des e-billets.</strong>
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Toute commande de billet devient définitive et confirmée dès la réception de la confirmation de paiement émise par le processeur sécurisé FlexPay.</li>
          <li>Chaque billet payé donne lieu à l&apos;émission automatique d&apos;un <strong>e-billet nominatif doté d&apos;un QR Code cryptographique unique</strong> et infalsifiable.</li>
          <li>L&apos;acheteur accède instantanément à ses billets depuis son espace (« Mes billets ») et peut les télécharger au format PDF ou les présenter sur smartphone.</li>
          <li>Le billet mentionne l&apos;identité du titulaire, l&apos;intitulé de l&apos;événement, la date, l&apos;heure, le lieu, le tarif payé ainsi que le siège ou la table assignée le cas échéant.</li>
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

      <Section title="4. Paiements, Abonnements SaaS & Sécurité des Transactions (FlexPay)">
        <p>
          Les règlements relatifs aux abonnements de la plateforme, aux options événementielles et aux achats de billets sont traités de manière sécurisée.
        </p>
        
        <p>
          <strong>4.1 Moyens de paiement acceptés.</strong> La plateforme s&apos;appuie sur le prestataire de services de paiement agréé <strong>FlexPay</strong> et prend en charge :
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Les cartes bancaires internationales et locales (Visa, Mastercard) ;</li>
          <li>Les solutions de paiement mobile (Mobile Money : M-Pesa Vodacom, Orange Money, Airtel Money) ;</li>
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
          <li><strong>Business, Business Premium & Enterprise</strong> : forfaits professionnels pour agences et organisateurs réguliers ;</li>
          <li><strong>Forfaits Marketplace (Salle, Prestataire, Mixte)</strong> : publication et mise en avant des services professionnels.</li>
        </ul>
        <p>
          Les tarifs sont indiqués en Francs Congolais (FC) ou devise applicable. Les abonnements annuels peuvent bénéficier d&apos;une réduction tarifaire (notamment 10% de remise sur l&apos;engagement 12 mois).
        </p>
        <TermsMarketplaceRates />
      </Section>

      <Section title="5. Données des participants, invités et responsabilité des organisations">
        <p>
          <strong>5.1 Responsabilité de traitement.</strong> L&apos;organisation agit en qualité de <strong>responsable de traitement</strong> pour les données de ses membres,
          de ses listes d&apos;invités, des participants à ses événements et des acheteurs de billets. L&apos;organisation s&apos;engage à respecter les lois relatives à la protection
          des données personnelles et à disposer des consentements requis avant d&apos;émettre des communications (e-mail, WhatsApp).
        </p>
        <p>
          <strong>5.2 Rôle d&apos;EventMaster.</strong> EventMaster agit en qualité de <strong>sous-traitant technique</strong>, traitant ces données uniquement
          sur instruction documentée de l&apos;organisation pour assurer l&apos;exécution des services (émission de billets, envoi d&apos;invitations, plan de table, protocole de scan).
          EventMaster ne commercialise ni ne cède les listes d&apos;invités ou données de billetterie à des régies publicitaires tierces.
        </p>
      </Section>

      <Section title="6. Mesures de sécurité et intégrité du service">
        <p>
          EventMaster déploie des normes de sécurité rigoureuses pour protéger la plateforme :
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Chiffrement systématique de toutes les communications via HTTPS / TLS ;</li>
          <li>Mots de passe stockés sous forme hautement sécurisée (hachage bcrypt) ;</li>
          <li>Authentification double facteur / vérification d&apos;identité par code OTP (e-mail ou WhatsApp) ;</li>
          <li>Isolation multi-tenant étanche garantissant la confidentialité absolue entre organisations ;</li>
          <li>Traçabilité et journalisation des transactions financières et des opérations d&apos;administration sensible ;</li>
          <li>Contrôle strict des QR Codes pour prévenir toute duplication ou accès illégitime.</li>
        </ul>
      </Section>

      <Section title="7. Utilisation acceptable & Règles de conduite">
        <p>Il est expressément interdit d&apos;utiliser EventMaster pour :</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Diffuser des communications non sollicitées, intrusives ou constituant du spam (par e-mail ou WhatsApp) ;</li>
          <li>Organiser des événements frauduleux, fictifs, trompeurs ou contraires à l&apos;ordre public et aux lois en vigueur ;</li>
          <li>Commercialiser des billets sans disposer de l&apos;autorisation légale ou des droits sur l&apos;événement concerné ;</li>
          <li>Tenter de porter atteinte à la sécurité, à la disponibilité ou à l&apos;infrastructure technique d&apos;EventMaster ;</li>
          <li>Contourner les limitations techniques ou quotas attachés au forfait souscrit.</li>
        </ul>
      </Section>

      <Section title="8. Propriété intellectuelle">
        <p>
          La plateforme EventMaster, son ergonomie, son code source, sa marque, ses modules 2D/3D et ses outils de billetterie demeurent la propriété
          exclusive d&apos;EventMaster (Groupe Tekango). Les visuels, descriptifs, médias et marques publiés par les organisateurs ou prestataires restent
          la propriété de leurs auteurs respectifs, qui concèdent à EventMaster une licence technique d&apos;hébergement et d&apos;affichage strictement limitée à la délivrance du service.
        </p>
      </Section>

      <Section title="9. Responsabilité et limitation de garantie">
        <p>
          EventMaster fournit une infrastructure logicielle hautement disponible mais ne garantit pas une absence totale d&apos;interruptions indépendantes de sa volonté (pannes de réseau Internet, perturbations des opérateurs mobiles pour le Mobile Money, cas de force majeure).
        </p>
        <p>
          EventMaster ne saurait être tenu responsable des litiges survenant entre un acheteur de billet et un organisateur (qualité de la prestation événementielle, retards, annulations, différends de placement), ni des transactions commerciales intervenant directement hors de la plateforme.
        </p>
      </Section>

      <Section title="10. Résiliation et export des données">
        <p>
          L&apos;utilisateur peut cesser l&apos;utilisation des services à tout moment. En cas de manquement grave aux présentes conditions ou de fraude avérée à la billetterie, EventMaster se réserve le droit de suspendre ou résilier l&apos;accès au compte sans préavis.
        </p>
        <p>
          À la clôture d&apos;un compte, l&apos;organisation peut solliciter l&apos;export de ses historiques d&apos;événements, sous réserve des délais légaux de conservation fiscale et comptable imposés par la loi pour les transactions financières.
        </p>
      </Section>

      <Section title="11. Modifications des conditions d'utilisation">
        <p>
          EventMaster se réserve le droit d&apos;adapter et de faire évoluer les présentes conditions d&apos;utilisation afin de refléter de nouvelles fonctionnalités ou des évolutions réglementaires. Toute modification majeure fera l&apos;objet d&apos;une information préalable et d&apos;une confirmation d&apos;acceptation lors de la connexion.
        </p>
      </Section>

      <Section title="12. Assistance et contact">
        <p>
          Pour toute question relative aux présentes conditions ou à l&apos;utilisation des modules de paiement et de billetterie, vous pouvez contacter notre équipe juridique et support :{' '}
          <LegalSupportEmail className="text-primary dark:text-primary hover:underline" /> ou via notre{' '}
          <a href="/contact" className="text-primary dark:text-primary hover:underline">
            formulaire de contact
          </a>.
        </p>
      </Section>
    </LegalPageShell>
  );
}
