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
      lastUpdated="3 juillet 2026"
    >
      <Section title="1. Objet">
        <p>
          EventMaster est une solution SaaS multi-tenant destinée à la gestion d&apos;événements privés et professionnels :
          invitations et RSVP, plans de table 2D, protocole (scan QR, confirmation de présence), fil d&apos;actualité, livre d&apos;or,
          modèles de messages, gestion d&apos;équipe et facturation par abonnement.
        </p>
        <p>
          En créant un compte, en vous connectant ou en utilisant nos services, vous acceptez sans réserve les présentes
          conditions d&apos;utilisation (version en vigueur au moment de votre acceptation).
        </p>
      </Section>

      <Section title="2. Comptes, organisations et rôles">
        <p>
          Chaque organisation dispose d&apos;un espace logique isolé (multi-tenant). Le <strong>propriétaire</strong> de
          l&apos;organisation (gérant du compte) est le principal responsable vis-à-vis d&apos;EventMaster et des tiers
          pour l&apos;activité réalisée sous son espace.
        </p>
        <p>
          L&apos;organisation peut désigner des <strong>managers</strong>, des membres <strong>protocole</strong>, des
          managers de salle ou d&apos;événement, et — selon le forfait — des <strong>commerciaux organisation</strong>.
          Le propriétaire et les managers autorisés sont responsables de l&apos;octroi, de la révocation et du suivi de ces accès.
        </p>
        <p>
          Vous vous engagez à fournir des informations exactes lors de l&apos;inscription, à maintenir la confidentialité
          de vos identifiants et à ne pas partager vos accès avec des personnes non autorisées.
        </p>
      </Section>

      <Section title="3. Données des utilisateurs et des invités — responsabilité des organisations">
        <p>
          <strong>3.1 Rôle des organisations.</strong> Sauf mention contraire dans la politique de confidentialité,
          l&apos;organisation utilisatrice agit en qualité de <strong>responsable de traitement</strong> au sens de la
          réglementation applicable pour les données personnelles qu&apos;elle collecte, saisit, importe ou fait traiter
          via EventMaster, notamment :
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>les données de ses membres (utilisateurs organisation : managers, protocole, etc.) ;</li>
          <li>les données de ses invités (identité, contact, RSVP, préférences, photos, messages, localisation d&apos;événement) ;</li>
          <li>les contenus diffusés (invitations, modèles, publications, médias).</li>
        </ul>
        <p>
          L&apos;organisation est seule responsable de :
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>disposer d&apos;une base légale valable et, le cas échéant, du consentement requis avant toute collecte ou communication ;</li>
          <li>informer les personnes concernées (invités et membres) de manière claire et loyale ;</li>
          <li>ne collecter que les données adéquates, pertinentes et limitées à ce qui est nécessaire à l&apos;événement ;</li>
          <li>répondre aux demandes d&apos;exercice des droits (accès, rectification, effacement, etc.) dans les délais légaux ;</li>
          <li>assurer la licéité, l&apos;exactitude et la mise à jour des listes d&apos;invités et des contenus publiés ;</li>
          <li>la conformité des envois (e-mail et WhatsApp) qu&apos;elle déclenche via la plateforme.</li>
        </ul>
        <p>
          <strong>3.2 Rôle d&apos;EventMaster.</strong> EventMaster agit en qualité de <strong>sous-traitant</strong> pour
          le compte de l&apos;organisation, uniquement sur instruction documentée (paramétrage, utilisation des
          fonctionnalités, demandes de support), afin d&apos;héberger, structurer, transmettre et sécuriser les données
          dans le cadre du service souscrit.
        </p>
        <p>
          EventMaster n&apos;exploite pas les données invitées ou organisationnelles à des fins publicitaires propres et
          n&apos;en cède pas le contenu à des tiers, hors sous-traitants techniques strictement nécessaires au service
          (voir politique de confidentialité).
        </p>
        <p>
          <strong>3.3 Violations et incidents.</strong> En cas de violation de données imputable à l&apos;organisation
          (fuite due à un partage d&apos;identifiants, liste importée sans droit, message illicite, etc.), la responsabilité
          incombe à l&apos;organisation. EventMaster cooperera raisonnablement avec l&apos;organisation pour limiter
          l&apos;impact et, le cas échéant, notifier les autorités conformément à la loi lorsque EventMaster en est légalement tenu.
        </p>
      </Section>

      <Section title="4. Mesures de sécurité et confidentialité — EventMaster">
        <p>
          EventMaster met en œuvre des mesures techniques et organisationnelles appropriées pour protéger les données
          hébergées sur la plateforme, notamment :
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Isolation multi-tenant</strong> : cloisonnement logique strict entre organisations ;</li>
          <li><strong>Authentification</strong> : mots de passe hashés, vérification d&apos;identité (e-mail ou WhatsApp OTP) ;</li>
          <li><strong>Contrôle d&apos;accès</strong> : rôles granulaires (propriétaire, manager, protocole, staff événement/salle) ;</li>
          <li><strong>Chiffrement en transit</strong> : communications via HTTPS/TLS ;</li>
          <li><strong>Journalisation</strong> : traces techniques limitées pour la sécurité, le support et la prévention des abus ;</li>
          <li><strong>Acceptation légale</strong> : enregistrement horodaté des acceptations des conditions et de la politique de confidentialité ;</li>
          <li><strong>Prestataires</strong> : sélection de sous-traitants (hébergement, e-mail, messagerie) soumis à des obligations contractuelles de confidentialité ;</li>
          <li><strong>Accès administration plateforme</strong> : réservé au personnel autorisé (Super Admin, commerciaux plateforme dans le périmètre de leurs missions) et tracé.</li>
        </ul>
        <p>
          Aucune mesure de sécurité n&apos;étant infaillible, EventMaster s&apos;engage à maintenir un niveau de protection
          adapté aux risques et à corriger sans délai raisonnable les vulnérabilités critiques portées à sa connaissance.
          Les organisations doivent également appliquer le principe du moindre privilège et sensibiliser leurs équipes.
        </p>
      </Section>

      <Section title="5. Utilisation acceptable">
        <p>Il est interdit d&apos;utiliser EventMaster pour :</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Envoyer des communications non sollicitées ou abusives (spam) ;</li>
          <li>Traiter des données sensibles sans base légale explicite et mesures renforcées, sauf accord écrit préalable d&apos;EventMaster ;</li>
          <li>Porter atteinte à la sécurité, à la disponibilité ou à l&apos;intégrité de la plateforme ;</li>
          <li>Diffuser des contenus illicites, diffamatoires, discriminatoires ou contraires à l&apos;ordre public ;</li>
          <li>Contourner les quotas, licences ou restrictions du forfait souscrit.</li>
        </ul>
      </Section>

      <Section title="6. Abonnements, forfaits et facturation">
        <p>
          Les formules (Essentials / Gratuit, Business, Business Premium 1 &amp; 2, Business Enterprise 1 à 3) définissent
          des quotas (événements, invités, modèles, salles, managers) et des fonctionnalités (protocole QR, modèles
          personnalisés, réseau commercial, etc.). Les limites applicables sont celles du forfait actif au moment de l&apos;usage.
        </p>
        <p>
          Les demandes d&apos;activation, de changement ou de renouvellement d&apos;abonnement peuvent être soumises à
          validation par EventMaster. Des factures peuvent être émises et transmises aux contacts de facturation de
          l&apos;organisation (propriétaire et managers autorisés).
        </p>
        <p>
          EventMaster se réserve le droit de modifier les tarifs et caractéristiques des plans avec un préavis raisonnable
          pour les abonnements actifs. La facturation annuelle peut bénéficier d&apos;une réduction selon les conditions
          affichées sur la plateforme.
        </p>
      </Section>

      <Section title="7. Propriété intellectuelle">
        <p>
          La plateforme, son code, sa marque, ses interfaces et sa documentation restent la propriété d&apos;EventMaster.
          Les contenus créés par les utilisateurs (événements, modèles, messages, médias) restent la propriété de
          l&apos;organisation ou de leurs auteurs ; vous accordez à EventMaster une licence non exclusive, mondiale et
          limitée à la durée du contrat, strictement nécessaire à l&apos;hébergement, à la transmission et à l&apos;exécution du service.
        </p>
      </Section>

      <Section title="8. Responsabilité">
        <p>
          EventMaster est fourni « en l&apos;état ». Nous visons une haute disponibilité sans garantie d&apos;absence
          d&apos;interruption. La responsabilité d&apos;EventMaster est limitée aux dommages directs prouvés résultant
          d&apos;une faute prouvée d&apos;EventMaster dans l&apos;exécution de ses obligations de sous-traitant ou
          d&apos;hébergeur, dans la limite autorisée par la loi applicable.
        </p>
        <p>
          EventMaster ne saurait être tenu responsable des contenus, listes d&apos;invités, communications ou décisions
          prises par les organisations ou leurs invités, ni des conséquences d&apos;un usage non conforme du service par
          l&apos;organisation ou ses utilisateurs.
        </p>
      </Section>

      <Section title="9. Résiliation et export">
        <p>
          Vous pouvez cesser d&apos;utiliser le service à tout moment. EventMaster peut suspendre ou résilier un compte
          en cas de violation des présentes conditions, de non-paiement, d&apos;usage abusif ou pour des raisons de sécurité.
        </p>
        <p>
          À la fin du contrat, l&apos;organisation peut demander l&apos;export ou la suppression de ses données dans un
          délai raisonnable, sous réserve des obligations légales de conservation d&apos;EventMaster (facturation, logs de sécurité).
        </p>
      </Section>

      <Section title="10. Modifications des conditions">
        <p>
          EventMaster peut mettre à jour les présentes conditions. En cas de modification substantielle, une nouvelle
          acceptation pourra être demandée lors de la connexion. La version acceptée est enregistrée avec horodatage.
          L&apos;utilisation continue du service après information vaut acceptation lorsque la loi le permet.
        </p>
      </Section>

      <Section title="11. Contact">
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
