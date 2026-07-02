import { LegalPageShell, Section } from '@/components/LegalPageShell';

export const metadata = {
  title: 'Politique de confidentialité — EventMaster',
  description: 'Politique de confidentialité et protection des données EventMaster.',
};

export default function PrivacyPage() {
  return (
    <LegalPageShell
      title="Politique de confidentialité"
      subtitle="Comment EventMaster collecte, utilise et protège vos données personnelles."
    >
      <Section title="1. Responsable du traitement">
        <p>
          EventMaster traite les données pour le compte des organisations utilisatrices (organisateurs d&apos;événements).
          Pour les données relatives au compte plateforme et au support, le contact est :{' '}
          <a href="mailto:mingandajeereq@gmail.com" className="text-indigo-600 dark:text-indigo-400 hover:underline">
            mingandajeereq@gmail.com
          </a>.
        </p>
      </Section>

      <Section title="2. Données collectées">
        <p>Nous pouvons traiter les catégories de données suivantes :</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Identité et contact : nom, prénom, e-mail, numéro de téléphone (WhatsApp) ;</li>
          <li>Données d&apos;événement : titre, date, lieu, préférences RSVP, messages livre d&apos;or, médias partagés ;</li>
          <li>Données techniques : journaux de connexion, adresse IP, type de navigateur ;</li>
          <li>Données de facturation et d&apos;abonnement pour les organisations.</li>
        </ul>
      </Section>

      <Section title="3. Finalités du traitement">
        <ul className="list-disc pl-5 space-y-1">
          <li>Création et gestion des comptes organisateurs ;</li>
          <li>Envoi d&apos;invitations, rappels et confirmations (e-mail, SMS, WhatsApp) ;</li>
          <li>Gestion des réponses RSVP et des plans de table ;</li>
          <li>Support client et amélioration du service ;</li>
          <li>Sécurité, prévention des abus et respect des obligations légales.</li>
        </ul>
      </Section>

      <Section title="4. Base légale">
        <p>
          Les traitements reposent sur l&apos;exécution du contrat (utilisation de la plateforme), le consentement
          (lorsque requis, par exemple pour certaines communications invitées), et l&apos;intérêt légitime
          (sécurité, amélioration du service).
        </p>
      </Section>

      <Section title="5. Cloisonnement multi-tenant">
        <p>
          Chaque organisation dispose d&apos;un espace de données logiquement isolé. Les organisateurs ne peuvent accéder
          qu&apos;aux événements et invités de leur propre organisation. L&apos;accès Super Admin est strictement réservé
          à l&apos;administration technique de la plateforme.
        </p>
      </Section>

      <Section title="6. Sous-traitants et transferts">
        <p>
          Des prestataires tiers peuvent intervenir pour l&apos;envoi d&apos;e-mails (SendGrid), de SMS/WhatsApp (Twilio, UltraMsg)
          ou l&apos;hébergement. Ces prestataires sont sélectionnés pour leur conformité et ne traitent les données que
          sur instruction d&apos;EventMaster ou de l&apos;organisateur.
        </p>
      </Section>

      <Section title="7. Durée de conservation">
        <p>
          Les données sont conservées pendant la durée d&apos;utilisation du service, puis archivées ou supprimées
          conformément aux obligations légales et aux demandes de l&apos;organisateur. Les organisations peuvent
          demander la suppression de leurs données en contactant le support.
        </p>
      </Section>

      <Section title="8. Vos droits">
        <p>
          Conformément à la réglementation applicable (RGPD le cas échéant), vous disposez d&apos;un droit d&apos;accès,
          de rectification, d&apos;effacement, de limitation, d&apos;opposition et de portabilité. Les invités peuvent
          exercer leurs droits auprès de l&apos;organisateur de l&apos;événement concerné ou via notre formulaire de contact.
        </p>
      </Section>

      <Section title="9. Cookies et traceurs">
        <p>
          EventMaster utilise des cookies essentiels au fonctionnement (session, authentification) et, le cas échéant,
          des traceurs analytiques anonymisés. Vous pouvez configurer votre navigateur pour limiter les cookies non essentiels.
        </p>
      </Section>

      <Section title="10. Modifications">
        <p>
          Cette politique peut être mise à jour. La date de dernière révision est indiquée en haut de page.
          L&apos;utilisation continue du service vaut acceptation de la version en vigueur.
        </p>
      </Section>
    </LegalPageShell>
  );
}
