import { LegalPageShell, Section } from '@/components/LegalPageShell';
import LegalSupportEmail from '@/components/LegalSupportEmail';
import { PRIVACY_VERSION } from '@/config/legalConfig';

export const metadata = {
  title: 'Politique de confidentialité — EventMaster',
  description: 'Politique de confidentialité et protection des données personnelles d\'EventMaster, incluant le Studio IA, la billetterie multi-zone et les paiements sécurisés.',
};

export default function PrivacyPage() {
  return (
    <LegalPageShell
      title="Politique de confidentialité"
      subtitle="Comment EventMaster collecte, utilise, protège et traite vos données personnelles, incluant le Studio IA, la billetterie multi-zone et les paiements sécurisés."
      lastUpdated="7 septembre 2026"
      version={PRIVACY_VERSION}
    >
      <Section title="1. Responsables de traitement et Appartenance au Groupe Tekango">
        <p>
          <strong>Appartenance au Groupe Tekango :</strong> EventMaster est un projet et une plateforme développée et exploitée par le <strong>Groupe Tekango</strong>. 
          Les données de compte et d&apos;inscription peuvent être traitées de manière transverse au sein de l&apos;écosystème Tekango (notamment la plateforme 
          e-commerce Tekango, Poz&apos;tion, ou tout autre service du groupe) pour assurer la continuité de service, l&apos;authentification unifiée et des synergies d&apos;usages.
        </p>
        <p>
          <strong>Données de compte plateforme &amp; transactions SaaS</strong> (inscription organisateur, prestataire, acheteur de billets, facturation SaaS, gestion des jetons IA, sécurité globale) : 
          EventMaster (Groupe Tekango) agit en qualité de <strong>responsable de traitement</strong> pour la gestion des comptes, du support, de la conformité légale et des paiements.
        </p>
        <p>
          <strong>Données des événements, invités et acheteurs de billets</strong> : L&apos;organisation utilisatrice (organisateur d&apos;événements ou professionnel du marketplace) 
          agit en qualité de <strong>responsable de traitement</strong>. EventMaster intervient en qualité de <strong>sous-traitant technique</strong>, traitant ces données uniquement 
          pour exécuter les services sollicités (émission des e-billets multi-zones, contrôle d&apos;accès QR, routage des invitations WhatsApp/e-mail, plans de salle 2D/3D).
        </p>
        <p>
          Contact DPO / Support légal :{' '}
          <LegalSupportEmail className="text-primary dark:text-primary hover:underline" />.
        </p>
      </Section>

      <Section title="2. Données personnelles collectées">
        <p>Selon votre utilisation d&apos;EventMaster, nous sommes amenés à collecter et traiter les catégories de données suivantes :</p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>
            <strong>Comptes utilisateurs &amp; Profils :</strong> Nom, prénom, adresse e-mail, numéro de téléphone WhatsApp (indicatif international + numéro), mot de passe chiffré (hachage bcrypt avec sel), rôle d&apos;accès (propriétaire, manager, protocole, commercial), nom d&apos;organisation ou raison sociale, adresse professionnelle.
          </li>
          <li>
            <strong>Billetterie &amp; Commandes de billets multi-zones :</strong> Nom et prénom de l&apos;acheteur, adresse e-mail de délivrance du billet, numéro de téléphone, intitulé de l&apos;événement, quantité de billets, zone tarifaire choisie (VIP, Carré d&apos;Or, Standard, etc.), tarif payé en Francs Congolais (CDF), siège ou table attribué le cas échéant, référence unique de commande et QR Code d&apos;accès cryptographique unique.
          </li>
          <li>
            <strong>Paiements &amp; Transactions financières (FlexPay) :</strong> Horodatage de l&apos;opération, montant et devise (Francs Congolais — FC / USD), statut du paiement (validé, en attente, refusé), mode de règlement utilisé (Carte bancaire Visa/Mastercard ou Mobile Money : M-Pesa, Orange Money, Airtel Money, Afrimoney), numéro de téléphone de facturation mobile, numéro de transaction et référence de commande FlexPay. 
            <br />
            <em className="text-muted text-xs">Note importante : EventMaster ne collecte, ne visualise et ne conserve aucun numéro complet de carte bancaire, ni code secret PIN Mobile Money. Ces données sensibles sont traitées directement par notre processeur de paiement certifié FlexPay conforme aux normes PCI-DSS.</em>
          </li>
          <li>
            <strong>Studio IA &amp; Données de modélisation spatiale :</strong> Photographies de salles de réception, croquis, plans d&apos;architectes ou documents 2D téléversés par l&apos;utilisateur pour analyse par vision artificielle. 
            <br />
            <em className="text-muted text-xs">Garantie stricte : Les photos importées sont traitées exclusivement pour déduire la géométrie de la salle et la disposition du mobilier (tables, chaises, allées, portes, scènes). EventMaster n&apos;effectue aucune identification biométrique ni reconnaissance faciale sur les personnes pouvant figurer fortuitement sur ces clichés.</em>
          </li>
          <li>
            <strong>Invitations multilingues &amp; Modèles d&apos;IA :</strong> Briefs textuels de célébration, textes rédigés ou reformulés par les modèles d&apos;intelligence artificielle (en Français ou dans les langues nationales congolaises : Lingala, Swahili, Kikongo, Tshiluba), variables d&apos;invitation personnalisées et choix de tonalité.
          </li>
          <li>
            <strong>Grand livre de consommation des jetons IA :</strong> Historique horodaté des requêtes de génération (nature de l&apos;action : composition de plan, vision de photo, reformulation d&apos;invitation), nombre de jetons débités ou crédités, solde restant attaché à l&apos;organisation.
          </li>
          <li>
            <strong>Traçabilité des plans de salle (`RoomActionContext`) :</strong> Identifiant de l&apos;utilisateur ayant modifié le plan, rôle au sein de l&apos;équipe, horodatage précis, nature de l&apos;action (ajout, déplacement, suppression de tables, modification des zones tarifaires, optimisation des espacements), source de l&apos;action (manuelle, raccourci, Studio IA, modèle) et delta de places assises.
          </li>
          <li>
            <strong>Contrôle d&apos;accès &amp; Scan le jour J (Protocole) :</strong> Horodatage précis du scan d&apos;entrée, statut de validation du billet (présence confirmée, scan unique enregistré, tentative de doublon détectée), identifiant de l&apos;agent protocole ou du dispositif de scan ayant validé l&apos;accès.
          </li>
          <li>
            <strong>Invités &amp; Confirmations RSVP :</strong> Nom, prénom, numéro de téléphone WhatsApp, adresse e-mail, catégorie d&apos;invité, statut de réponse RSVP (accepté, décliné), préférences alimentaires ou personnalisées, messages déposés sur le livre d&apos;or et photos partagées dans le fil d&apos;actualité.
          </li>
          <li>
            <strong>Marketplace &amp; Prestations :</strong> Fiches de salles ou de services (descriptifs, tarifs indicatifs, photos et vidéos hébergées via Cloudinary, géolocalisation et calendrier de disponibilité).
          </li>
          <li>
            <strong>Données techniques et de journalisation :</strong> Adresse IP, identifiant d&apos;appareil, type de navigateur (user-agent), horodatage des connexions et traces d&apos;acceptation légale des conditions (CGU et politique de confidentialité).
          </li>
        </ul>
      </Section>

      <Section title="3. Finalités du traitement des données">
        <p>Les données collectées sont utilisées pour les finalités explicites suivantes :</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Création et gestion des comptes :</strong> authentification sécurisée par code OTP (e-mail ou WhatsApp), gestion des privilèges d&apos;équipe et administration multi-tenant ;</li>
          <li><strong>Modélisation spatiale assistée par IA :</strong> analyse visuelle des photos de salle et génération assistée de plans de salle 2D zénithaux et 3D WebGL via des modèles d&apos;intelligence artificielle (Google Gemini) ;</li>
          <li><strong>Création d&apos;invitations multilingues :</strong> rédaction, reformulation et adaptation culturelle des messages d&apos;invitation en Français et dans les 4 langues nationales de la RDC (Lingala, Swahili, Kikongo, Tshiluba) ;</li>
          <li><strong>Gestion de la billetterie électronique multi-zones :</strong> répartition des tables et sièges par zone tarifaire, calcul prévisionnel des recettes, génération instantanée des e-billets avec QR Codes infalsifiables et téléchargement PDF ;</li>
          <li><strong>Traitement des paiements et reversements :</strong> validation des règlements via FlexPay (Cartes &amp; Mobile Money en CDF/USD), recharges de jetons IA, émission des reçus/factures et reversement des recettes nettes de billetterie aux organisateurs (payouts) ;</li>
          <li><strong>Sécurité du contrôle d&apos;accès le jour J :</strong> vérification instantanée de la validité du billet, traçabilité des accès, placement des invités et blocage des tentatives de double scan frauduleux ;</li>
          <li><strong>Acheminement des communications d&apos;événements :</strong> envoi d&apos;invitations interactives, relances de confirmation RSVP et notifications de service (sur instruction expresse de l&apos;organisateur) ;</li>
          <li><strong>Traçabilité collaborative d&apos;équipe :</strong> journalisation contextuelle des actions sur les plans pour prévenir les conflits de versioning et garantir l&apos;intégrité des agencements ;</li>
          <li><strong>Synergies du Groupe Tekango :</strong> fluidité d&apos;accès et interopérabilité entre les différents services de l&apos;écosystème Tekango ;</li>
          <li><strong>Respect des obligations réglementaires :</strong> conservation des justificatifs comptables, facturation légale et lutte contre la fraude financière.</li>
        </ul>
      </Section>

      <Section title="4. Base légale des traitements">
        <p>Nos traitements de données personnelles s&apos;appuient sur les bases légales suivantes :</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Exécution d&apos;un contrat ou de mesures précontractuelles :</strong> fourniture du service SaaS, traitement des achats de billets, analyse IA des plans à la demande de l&apos;utilisateur, exécution des forfaits d&apos;abonnement et gestion des réservations marketplace ;</li>
          <li><strong>Respect d&apos;obligations légales et fiscales :</strong> émission des pièces comptables, facturation, conservation des traces de transactions financières et fiscales relatives à la billetterie ;</li>
          <li><strong>Consentement :</strong> acceptation de la présente politique, souscription aux communications WhatsApp/e-mail, téléversement de photographies et autorisation de géolocalisation sur l&apos;appareil ;</li>
          <li><strong>Intérêt légitime :</strong> sécurité des infrastructures, prévention de la fraude aux billets (anti-doublon QR Code), journalisation d&apos;intégrité collaborative et amélioration continue des fonctionnalités.</li>
        </ul>
      </Section>

      <Section title="5. Cloisonnement multi-tenant &amp; Confidentialité des accès">
        <p>
          EventMaster repose sur une architecture multi-tenant étanche : chaque organisation bénéficie d&apos;une isolation logique totale de ses données. Les collaborateurs d&apos;une organisation n&apos;ont accès qu&apos;aux périmètres définis par leurs rôles respectifs (propriétaire, manager d&apos;événement, staff protocole limité au scan QR).
        </p>
        <p>
          Les équipes techniques d&apos;EventMaster (Super Admin) n&apos;accèdent aux données d&apos;une organisation que pour des motifs impérieux d&apos;assistance technique, de sécurité opérationnelle ou de validation de conformité des abonnements.
        </p>
      </Section>

      <Section title="6. Mesures de sécurité et intégrité technique">
        <p>
          EventMaster met en œuvre des mesures techniques et organisationnelles renforcées :
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Chiffrement systématique des flux de données en transit via TLS / HTTPS (chiffrement 256 bits) ;</li>
          <li>Stockage sécurisé des mots de passe avec algorithmes de hachage robuste (bcrypt avec sel) ;</li>
          <li>Vérification d&apos;identité par mot de passe à usage unique (OTP) acheminé par e-mail ou WhatsApp ;</li>
          <li>Génération cryptographique des identifiants et clés de validation des QR Codes de billetterie ;</li>
          <li>Moteur de calcul géométrique et d&apos;espacement s&apos;exécutant de manière sécurisée sans fuite de données vers des régies tierces ;</li>
          <li>Surveillance continue, traçabilité des opérations de paiement et sauvegardes régulières des bases de données.</li>
        </ul>
      </Section>

      <Section title="7. Sous-traitants &amp; Partenaires technologiques">
        <p>
          Pour délivrer ses services, EventMaster fait appel à des prestataires technologiques de premier ordre, soumis à des engagements stricts de confidentialité et de conformité :
        </p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>
            <strong>Google Cloud / Google Gemini API :</strong> Fournisseur d&apos;infrastructure d&apos;intelligence artificielle pour l&apos;analyse de vision des photos de salle et la reformulation d&apos;invitations en langues nationales congolaises. 
            <br />
            <em className="text-muted text-xs">Engagement de confidentialité : Dans le cadre de nos accords d&apos;API professionnelle, les requêtes textuelles et les images téléversées par nos utilisateurs ne sont pas utilisées pour entraîner les modèles publics de Google.</em>
          </li>
          <li>
            <strong>FlexPay :</strong> Prestataire de services de paiement agréé (RDC) pour le traitement sécurisé des paiements par Cartes Bancaires (Visa, Mastercard) et Mobile Money (M-Pesa, Orange Money, Airtel Money, Afrimoney), l&apos;achat de jetons IA et l&apos;exécution des reversements de billetterie aux organisateurs (payouts) ;
          </li>
          <li>
            <strong>Cloudinary :</strong> Hébergement et distribution sécurisée des médias (images de modèles, visuels d&apos;événements, photographies de plans et photos de fiches marketplace) ;
          </li>
          <li>
            <strong>SendGrid :</strong> Acheminement sécurisé des e-mails transactionnels (codes de vérification OTP, confirmations de commande, reçus de billetterie et e-billets PDF) ;
          </li>
          <li>
            <strong>UltraMsg :</strong> Acheminement sécurisé des messages, faire-part interactifs, confirmations RSVP et codes OTP par WhatsApp ;
          </li>
          <li>
            <strong>Fournisseurs d&apos;hébergement Cloud :</strong> Serveurs d&apos;application et bases de données managées conformes aux standards de sécurité internationaux.
          </li>
        </ul>
      </Section>

      <Section title="8. Durée de conservation des données">
        <p>
          Les données personnelles sont conservées pendant toute la durée active du compte et de l&apos;utilisation des services, puis purgées selon les règles suivantes :
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Photos de salle et images importées pour analyse IA :</strong> conservées dans l&apos;espace privé de l&apos;organisation pour l&apos;historique du plan jusqu&apos;à suppression volontaire par l&apos;organisateur ou clôture du compte ;</li>
          <li><strong>Données d&apos;événements passés et confirmations d&apos;invités :</strong> conservées dans l&apos;espace de l&apos;organisateur jusqu&apos;à suppression volontaire par ce dernier ou clôture de l&apos;espace ;</li>
          <li><strong>Billets et historiques de transactions financières :</strong> conservés pendant les délais légaux et comptables obligatoires (de 5 à 10 ans selon la réglementation fiscale et commerciale en vigueur) ;</li>
          <li><strong>Grand livre de consommation des jetons IA et journaux d&apos;actions (`RoomActionContext`) :</strong> conservés pour la durée d&apos;activité du compte organisationnel afin de garantir la traçabilité des soldes et des modifications ;</li>
          <li><strong>Journaux techniques de connexion et d&apos;acceptation légale :</strong> conservés pendant une durée maximale de 12 mois à des fins de sécurité et de preuve d&apos;acceptation des conditions.</li>
        </ul>
      </Section>

      <Section title="9. Vos droits et modalités d'exercice">
        <p>
          Conformément à la réglementation sur la protection des données personnelles, vous disposez des droits suivants :
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Droit d&apos;accès et d&apos;information :</strong> obtenir la confirmation et une copie des données vous concernant ;</li>
          <li><strong>Droit de rectification :</strong> mettre à jour vos coordonnées ou corriger toute donnée inexacte ;</li>
          <li><strong>Droit à l&apos;effacement (« droit à l&apos;oubli ») :</strong> demander la suppression de votre compte et de vos données personnelles, sous réserve des exigences légales de conservation comptable ;</li>
          <li><strong>Droit à la limitation et à l&apos;opposition :</strong> vous opposer à certains traitements non essentiels ;</li>
          <li><strong>Droit à la portabilité :</strong> récupérer vos données dans un format structuré et lisible par machine.</li>
        </ul>
        <p>
          Pour toute demande relative aux données d&apos;un événement spécifique ou d&apos;un billet, vous pouvez contacter directement l&apos;organisateur de l&apos;événement ou notre délégué à la protection des données via{' '}
          <LegalSupportEmail className="text-primary dark:text-primary hover:underline" />.
        </p>
      </Section>

      <Section title="10. Cookies et technologies de traçage">
        <p>
          EventMaster utilise exclusivement des cookies strictement nécessaires au fonctionnement technique de la plateforme (maintien de session active, sécurité d&apos;authentification, mémorisation des préférences de navigation). Nous n&apos;utilisons aucun cookie de ciblage publicitaire tiers non sollicité.
        </p>
      </Section>

      <Section title="11. Mises à jour de la politique de confidentialité">
        <p>
          Cette politique de confidentialité peut être mise à jour pour accompagner le déploiement de nouvelles fonctionnalités ou des évolutions réglementaires. La date de dernière mise à jour et le numéro de version ({PRIVACY_VERSION}) sont toujours clairement indiqués en tête de document.
        </p>
      </Section>
    </LegalPageShell>
  );
}
