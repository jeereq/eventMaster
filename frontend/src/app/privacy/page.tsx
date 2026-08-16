import { LegalPageShell, Section } from '@/components/LegalPageShell';
import LegalSupportEmail from '@/components/LegalSupportEmail';

export const metadata = {
  title: 'Politique de confidentialité — EventMaster',
  description: 'Politique de confidentialité et protection des données EventMaster.',
};

export default function PrivacyPage() {
  return (
    <LegalPageShell
      title="Politique de confidentialité"
      subtitle="Comment EventMaster collecte, utilise et protège les données personnelles."
      lastUpdated="3 juillet 2026"
    >
      <Section title="1. Responsables de traitement">
        <p>
          <strong>Données de compte plateforme</strong> (inscription organisateur, Super Admin, personnel EventMaster,
          commerciaux plateforme) : EventMaster agit en qualité de responsable de traitement pour la gestion du compte,
          de la facturation plateforme, du support et de la sécurité.
        </p>
        <p>
          <strong>Données des événements, invités et membres d&apos;organisation</strong> : l&apos;organisation
          utilisatrice (organisateur) est responsable de traitement. EventMaster traite ces données en qualité de
          <strong> sous-traitant</strong>, uniquement pour fournir le service demandé par l&apos;organisation.
        </p>
        <p>
          Contact :{' '}
          <LegalSupportEmail className="text-indigo-600 dark:text-indigo-400 hover:underline" />.
          Les invités et membres doivent en priorité s&apos;adresser à l&apos;organisateur de l&apos;événement pour
          exercer leurs droits sur leurs données événementielles.
        </p>
      </Section>

      <Section title="2. Données collectées">
        <p>Selon votre rôle et l&apos;usage du service, nous pouvons traiter :</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Comptes utilisateurs</strong> : nom, e-mail, téléphone (WhatsApp), mot de passe (hashé), rôle, organisation ;</li>
          <li><strong>Invités</strong> : identité, e-mail, téléphone, catégorie, RSVP, préférences alimentaires ou personnalisées, photos, messages livre d&apos;or ;</li>
          <li><strong>Événements</strong> : titre, date, lieu, coordonnées GPS le cas échéant, plans de table, contenus du fil d&apos;actualité ;</li>
          <li><strong>Facturation</strong> : forfait, historique d&apos;abonnement, factures, demandes d&apos;activation ;</li>
          <li><strong>Technique &amp; sécurité</strong> : journaux de connexion, adresse IP, user-agent, horodatage des acceptations légales ;</li>
          <li><strong>Parrainage commercial</strong> (le cas échéant) : code parrain, commissions, organisations référencées.</li>
        </ul>
      </Section>

      <Section title="3. Finalités du traitement">
        <ul className="list-disc pl-5 space-y-1">
          <li>Création et gestion des comptes et des organisations ;</li>
          <li>Envoi d&apos;invitations, rappels RSVP et notifications (e-mail et WhatsApp) sur instruction de l&apos;organisateur ;</li>
          <li>Protocole : scan QR, confirmation de présence, vérification de placement ;</li>
          <li>Gestion des abonnements, quotas, factures et demandes de support ;</li>
          <li>Sécurité, prévention des abus, sauvegardes et continuité du service ;</li>
          <li>Respect des obligations légales et comptables.</li>
        </ul>
      </Section>

      <Section title="4. Base légale">
        <p>
          Les traitements reposent sur l&apos;exécution du contrat (utilisation de la plateforme), le consentement
          (acceptation des présentes politiques, communications invitées lorsque requis), et l&apos;intérêt légitime
          (sécurité, amélioration du service, lutte contre la fraude).
        </p>
        <p>
          L&apos;organisation garantit disposer d&apos;une base légale pour toute donnée invitée qu&apos;elle importe ou
          pour laquelle elle déclenche une communication via EventMaster.
        </p>
      </Section>

      <Section title="5. Cloisonnement multi-tenant et accès">
        <p>
          Chaque organisation dispose d&apos;un espace de données logiquement isolé. Les utilisateurs organisation
          n&apos;accèdent qu&apos;aux ressources autorisées par leur rôle (propriétaire, manager, protocole, staff
          événement/salle, commercial organisation selon forfait).
        </p>
        <p>
          L&apos;accès administration plateforme (Super Admin, commerciaux EventMaster) est limité aux missions
          de support, facturation, validation d&apos;abonnements et maintenance, avec traçabilité des actions sensibles.
        </p>
      </Section>

      <Section title="6. Mesures de sécurité EventMaster">
        <p>
          EventMaster met en œuvre des mesures proportionnées au risque, incluant notamment :
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>hébergement sur infrastructure sécurisée avec chiffrement des communications (HTTPS) ;</li>
          <li>stockage des mots de passe sous forme hachée (bcrypt) ;</li>
          <li>authentification renforcée par OTP (e-mail ou WhatsApp) ;</li>
          <li>permissions granulaires par rôle et par périmètre (organisation, salle, événement) ;</li>
          <li>isolation stricte des données entre tenants ;</li>
          <li>contrôle des accès au personnel plateforme autorisé ;</li>
          <li>sauvegardes et procédures de restauration raisonnables ;</li>
          <li>revue périodique des sous-traitants critiques.</li>
        </ul>
        <p>
          Les organisations restent responsables de la sécurité de leurs propres postes de travail, de la gestion
          des identifiants de leurs membres et de la licéité des données qu&apos;elles introduisent dans le système.
        </p>
      </Section>

      <Section title="7. Sous-traitants">
        <p>
          Des prestataires tiers interviennent pour l&apos;hébergement (base de données, serveurs), l&apos;envoi
          d&apos;e-mails (SendGrid), de WhatsApp (UltraMsg) ou le paiement le cas échéant. Ils ne
          traitent les données que sur instruction d&apos;EventMaster ou de l&apos;organisateur, dans le cadre
          contractuel du service, et sont sélectionnés pour leur fiabilité et leurs garanties de confidentialité.
        </p>
      </Section>

      <Section title="8. Durée de conservation">
        <p>
          Les données sont conservées pendant la durée du contrat et de l&apos;usage du service, puis supprimées
          ou anonymisées dans un délai raisonnable après résiliation, sauf obligation légale (factures, comptabilité,
          logs de sécurité). L&apos;organisateur peut demander la suppression de son espace organisationnel via le support.
        </p>
        <p>
          Les acceptations des conditions et de la présente politique sont conservées avec horodatage et version
          acceptée, conformément aux exigences de preuve.
        </p>
      </Section>

      <Section title="9. Vos droits">
        <p>
          Conformément au RGPD et à la législation applicable, vous disposez des droits d&apos;accès, de rectification,
          d&apos;effacement, de limitation, d&apos;opposition et de portabilité.
        </p>
        <p>
          Pour les données liées à un événement, adressez-vous en priorité à l&apos;organisateur. EventMaster
          assistera l&apos;organisateur dans la mesure de ses obligations de sous-traitant. Pour les données
          de compte plateforme, contactez-nous à l&apos;adresse indiquée ci-dessus.
        </p>
      </Section>

      <Section title="10. Cookies et traceurs">
        <p>
          EventMaster utilise des cookies essentiels (session, authentification) et, le cas échéant, des traceurs
          analytiques anonymisés. Vous pouvez configurer votre navigateur pour limiter les cookies non essentiels.
        </p>
      </Section>

      <Section title="11. Modifications">
        <p>
          Cette politique peut être mise à jour. Une nouvelle acceptation pourra être sollicitée en cas de changement
          substantiel. La date et la version en vigueur sont indiquées en haut de page et enregistrées lors de votre acceptation.
        </p>
      </Section>
    </LegalPageShell>
  );
}
