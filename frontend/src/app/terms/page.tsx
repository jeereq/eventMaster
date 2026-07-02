import { LegalPageShell, Section } from '@/components/LegalPageShell';

export const metadata = {
  title: 'Conditions d\'utilisation — EventMaster',
  description: 'Conditions générales d\'utilisation de la plateforme EventMaster.',
};

export default function TermsPage() {
  return (
    <LegalPageShell
      title="Conditions d'utilisation"
      subtitle="Les présentes conditions régissent l'accès et l'utilisation de la plateforme EventMaster."
    >
      <Section title="1. Objet">
        <p>
          EventMaster est une solution SaaS multi-tenant destinée à la gestion d&apos;événements privés et professionnels :
          invitations, suivi RSVP, plans de table, fil d&apos;actualité et livre d&apos;or numérique.
        </p>
        <p>
          En créant un compte ou en utilisant nos services, vous acceptez sans réserve les présentes conditions d&apos;utilisation.
        </p>
      </Section>

      <Section title="2. Comptes et organisations">
        <p>
          Chaque organisation dispose d&apos;un espace logique isolé. L&apos;administrateur de l&apos;organisation est responsable
          de la gestion des accès, des données invitées et du respect des lois applicables en matière de protection des données.
        </p>
        <p>
          Vous vous engagez à fournir des informations exactes lors de l&apos;inscription et à maintenir la confidentialité de vos identifiants.
        </p>
      </Section>

      <Section title="3. Utilisation acceptable">
        <p>Il est interdit d&apos;utiliser EventMaster pour :</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Envoyer des communications non sollicitées ou abusives (spam) ;</li>
          <li>Collecter ou traiter des données personnelles sans base légale ou consentement approprié ;</li>
          <li>Porter atteinte à la sécurité, à la disponibilité ou à l&apos;intégrité de la plateforme ;</li>
          <li>Diffuser des contenus illicites, diffamatoires ou contraires à l&apos;ordre public.</li>
        </ul>
      </Section>

      <Section title="4. Abonnements et facturation">
        <p>
          Les formules d&apos;abonnement (Gratuit, Standard, Premium, Entreprise) définissent des quotas
          (événements, invités, modèles). Les demandes d&apos;activation ou de renouvellement peuvent être soumises à validation
          par l&apos;administrateur de la plateforme.
        </p>
        <p>
          EventMaster se réserve le droit de modifier les tarifs et les caractéristiques des plans, avec un préavis raisonnable
          pour les abonnements actifs.
        </p>
      </Section>

      <Section title="5. Propriété intellectuelle">
        <p>
          La plateforme, son code, sa marque et ses interfaces restent la propriété d&apos;EventMaster. Les contenus créés par
          les utilisateurs (événements, modèles, messages) restent leur propriété ; vous nous accordez une licence limitée
          nécessaire à l&apos;hébergement et à la transmission de ces contenus.
        </p>
      </Section>

      <Section title="6. Responsabilité">
        <p>
          EventMaster est fourni « en l&apos;état ». Nous nous efforçons d&apos;assurer une haute disponibilité, sans garantie
          d&apos;absence d&apos;interruption. Notre responsabilité est limitée aux dommages directs prouvés, dans la limite
          autorisée par la loi applicable.
        </p>
      </Section>

      <Section title="7. Résiliation">
        <p>
          Vous pouvez cesser d&apos;utiliser le service à tout moment. EventMaster peut suspendre ou résilier un compte en cas
          de violation des présentes conditions ou pour des raisons de sécurité.
        </p>
      </Section>

      <Section title="8. Contact">
        <p>
          Pour toute question relative à ces conditions :{' '}
          <a href="mailto:mingandajeereq@gmail.com" className="text-indigo-600 dark:text-indigo-400 hover:underline">
            mingandajeereq@gmail.com
          </a>{' '}
          ou via notre{' '}
          <a href="/contact" className="text-indigo-600 dark:text-indigo-400 hover:underline">
            formulaire de contact
          </a>.
        </p>
      </Section>
    </LegalPageShell>
  );
}
