import Link from 'next/link';
import { LegalPageShell, Section } from '@/components/LegalPageShell';
import LegalSupportEmail from '@/components/LegalSupportEmail';
import {
  collectionCommissionRangeLabel,
  REFUND_VERSION,
  TICKETING_RETENTION_PERCENT,
  DONATIONS_RETENTION_PERCENT,
} from '@/config/legalConfig';

export const metadata = {
  title: 'Politique de remboursement — EventMaster',
  description:
    'Politique de remboursement EventMaster : billets d’événements, dons solidaires, abonnements, jetons IA, acomptes et locations marketplace, et erreurs de paiement FlexPay.',
};

export default function RefundPage() {
  return (
    <LegalPageShell
      title="Politique de remboursement"
      subtitle="Règles applicables aux billets, dons solidaires, abonnements, jetons d’intelligence artificielle, acomptes et cautions marketplace, et erreurs de paiement."
      lastUpdated="16 septembre 2026"
      version={REFUND_VERSION}
    >
      <Section title="1. Objet">
        <p>
          La présente politique précise les cas dans lesquels un paiement effectué via EventMaster (Groupe Tekango)
          peut être remboursé, et ceux qui ne le sont pas. Elle complète les{' '}
          <Link href="/terms" className="text-primary font-semibold hover:underline">
            conditions d’utilisation
          </Link>{' '}
          (articles 3.5, 3.6, 4.6 et 5).
        </p>
        <p>
          EventMaster est un intermédiaire technique. Les fonds de billetterie et de dons solidaires sont encaissés
          pour le compte de l’organisateur. En plus de l’abonnement SaaS, EventMaster applique un taux de retenue contractuel
          de <strong>{TICKETING_RETENTION_PERCENT} %</strong> sur la billetterie et de <strong>{DONATIONS_RETENTION_PERCENT} %</strong> sur les dons solidaires
          (dans la fourchette statutaire de {collectionCommissionRangeLabel()}) déduit préalablement au reversement.
          Cette retenue plateforme couvre les coûts techniques d&apos;émission, d&apos;authentification QR cryptographique et de sécurisation financière : elle n&apos;est pas remboursable une fois la prestation technique réalisée. Les acomptes
          et cautions du marketplace relèvent de l’accord direct entre l’organisateur et le professionnel
          (salle, métier de service ou Matériel &amp; Équipements).
        </p>
      </Section>

      <Section title="2. Billets d’événements">
        <p>
          L’organisateur est le seul garant de la tenue de l’événement, de sa programmation et du traitement des
          demandes d’annulation émanant des acheteurs.
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            En cas d’annulation, de report ou de changement substantiel du programme, le remboursement incombe à
            l’organisateur.
          </li>
          <li>
            EventMaster ne reverse un remboursement à l’acheteur que sur instruction formelle de l’organisateur, et
            seulement si les fonds correspondants sont encore disponibles (avant ou après reversement/payout, selon le
            cas). La commission plateforme déjà prélevée sur la collecte n’est pas restituée, sauf erreur de facturation
            avérée.
          </li>
          <li>
            Tout billet acheté valide automatiquement la présence de son porteur. La personnalisation d&apos;un billet
            partagé (modification du nom, prénom ou coordonnées par le bénéficiaire) n&apos;altère pas les conditions de
            vente initiales ni le droit au remboursement, qui demeure placé sous l&apos;autorité exclusive de l&apos;organisateur.
          </li>
          <li>
            Un billet déjà scanné à l’entrée (règle du scan unique) n’est pas remboursable, sauf instruction contraire
            écrite de l’organisateur.
          </li>
          <li>
            Un billet falsifié, dupliqué, revendu hors canal officiel ou utilisé de manière frauduleuse est invalidé
            sans remboursement.
          </li>
        </ul>
      </Section>

      <Section title="3. Dons Solidaires & Collectes de Fonds">
        <p>
          Les versements effectués au titre des collectes solidaires ou appels aux dons constituent des libéralités
          volontaires et libres destinées à soutenir la cause présentée par l&apos;organisateur.
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong>Caractère irrévocable :</strong> Conformément aux règles applicables aux dons, tout versement
            solidaire confirmé est réputé définitif et irrévocable. EventMaster ne procède à aucun remboursement unilatéral
            sur les dons collectés.
          </li>
          <li>
            <strong>Gestion des litiges sur la cause :</strong> EventMaster n&apos;étant qu&apos;un prestataire technique
            d&apos;encaissement pour le compte de l&apos;organisation, tout différend relatif à l&apos;affectation des
            fonds ou à la sincérité de la cause doit être porté directement auprès de l&apos;organisation bénéficiaire.
          </li>
          <li>
            <strong>Erreurs techniques :</strong> Seule une anomalie technique avérée (double débit bancaire ou Mobile
            Money FlexPay) fera l&apos;objet d&apos;une régularisation par notre support technique sur justificatif.
          </li>
        </ul>
      </Section>

      <Section title="4. Abonnements et forfaits SaaS">
        <p>
          L’abonnement donne accès à l’espace d’organisation ou au profil utilisateur pour la période souscrite (mensuelle, trimestrielle ou
          annuelle, selon le forfait).
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            Vous pouvez cesser le renouvellement à tout moment : l’accès reste actif jusqu’à la fin de la période déjà
            payée.
          </li>
          <li>
            Les périodes entamées ne donnent pas lieu à un remboursement au prorata, sauf erreur de facturation avérée
            ou double paiement.
          </li>
          <li>
            Un forfait souscrit par erreur (mauvais palier, mauvais compte) peut être examiné par le support s’il n’a
            pas encore été utilisé de manière substantielle.
          </li>
          <li>
            <strong>Accès gracieux (« complimentary ») et ajustements administratifs :</strong> Les périodes de gratuité, remises exceptionnelles
            ou extensions accordées à titre gracieux par l&apos;administration Super Admin ne possèdent aucune valeur monétaire rachetable
            et ne peuvent en aucun cas donner lieu à une demande d&apos;indemnisation ou de remboursement financier.
          </li>
        </ul>
      </Section>

      <Section title="5. Jetons d’intelligence artificielle & Simulations de budget">
        <p>
          Les simulations du simulateur de budget IA (/simulateur) et les requêtes du Studio d’aménagement (plans 2D/3D,
          vision artificielle sur photos de salle, composition d’invitations) sont décomptées au fur et à mesure de leur
          exécution.
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Les crédits et jetons consommés par un traitement d&apos;intelligence artificielle exécuté ne sont pas remboursables.</li>
          <li>
            Un pack de recharge débité deux fois, ou un paiement confirmé sans crédit de jetons ou de simulations, est
            corrigé après vérification du reçu FlexPay.
          </li>
        </ul>
      </Section>

      <Section title="6. Acomptes, devis marketplace & locations de matériel">
        <p>
          Les acomptes versés pour une salle, une prestation de service ou une location de matériel/mobilier sont convenus
          entre l’organisateur et le professionnel. EventMaster n’est pas partie à ce contrat commercial.
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            Les conditions d’annulation (délai, retenue, report) figurent sur la fiche, le devis ou l’échange écrit entre
            les parties.
          </li>
          <li>
            <strong>Dépôts de garantie et cautions de location :</strong> Les éventuelles cautions exigées pour du
            Matériel &amp; Équipements (tentes, sonorisation, mobilier, véhicules…) sont convenues et réglées
            directement hors plateforme. EventMaster n&apos;encaisse pas ces cautions et n&apos;intervient pas dans
            leur restitution ou encaissement en cas de dégradation.
          </li>
          <li>
            EventMaster peut, sur demande conjointe et si les fonds d&apos;un acompte transitent encore par la plateforme,
            faciliter un reversement. À défaut, le litige se règle entre les parties.
          </li>
        </ul>
      </Section>

      <Section title="7. Erreurs de paiement">
        <p>
          Les paiements sont traités par FlexPay (cartes Visa / Mastercard et Mobile Money : M-Pesa, Orange Money,
          Airtel Money, Afrimoney). EventMaster ne stocke aucun numéro complet de carte ni code secret.
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Double débit, montant erroné ou paiement abouti sans contrepartie visible : contactez le support avec le numéro de transaction.</li>
          <li>Le délai de retour des fonds dépend du prestataire FlexPay et, le cas échéant, de votre opérateur Mobile Money ou banque.</li>
        </ul>
      </Section>

      <Section title="8. Comment demander un remboursement">
        <p>
          Adressez votre demande via le{' '}
          <Link href="/contact?reason=refund" className="text-primary font-semibold hover:underline">
            formulaire de contact
          </Link>
          {' '}(raison « Remboursement ») ou écrivez à{' '}
          <LegalSupportEmail className="text-primary font-semibold hover:underline" /> en indiquant : e-mail du
          compte, date, montant, numéro de transaction FlexPay, et s’il s’agit d’un billet, d’un don, d’un abonnement, de jetons
          IA ou d’un acompte.
        </p>
        <p>
          Pour un billet, contactez d’abord l’organisateur de l’événement : c’est lui qui décide et, le cas échéant,
          nous transmet l’instruction de remboursement.
        </p>
      </Section>
    </LegalPageShell>
  );
}
