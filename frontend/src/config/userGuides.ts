export type UserGuideId =
  | 'super_admin'
  | 'commercial_platform'
  | 'owner'
  | 'vendor'
  | 'org_manager'
  | 'org_protocol'
  | 'org_commercial'
  | 'staff_scope'
  | 'client'
  | 'guest';

export interface UserGuideNavLink {
  label: string;
  href: string;
}

export interface UserGuideSection {
  id: string;
  title: string;
  content: string;
  links?: UserGuideNavLink[];
}

export interface UserGuide {
  id: UserGuideId;
  title: string;
  badge: string;
  summary: string;
  canDo: string[];
  cannotDo: string[];
  navLinks: UserGuideNavLink[];
  workflows: UserGuideSection[];
  tips: string[];
}

/** Seul le guide invité reste documenté (page publique /guide/invite). */
export const USER_GUIDES: UserGuide[] = [
  {
    id: 'guest',
    title: 'Guide Invité',
    badge: 'Espace invité',
    summary:
      'Vous ouvrez votre invitation via un lien reçu par e-mail, WhatsApp ou après l’achat d’un billet. Aucun compte {platformName} n’est obligatoire.',
    canDo: [
      'Confirmer ou décliner votre présence (Répondez s’il vous plaît)',
      'Voir toutes vos invitations regroupées (même e-mail ou téléphone)',
      'Consulter date, lieu, consignes du jour J et itinéraire',
      'Afficher votre badge QR pour l’accueil',
      'Recevoir votre placement (plan, voisins, PDF) une fois le Répondez s’il vous plaît accepté',
      'Participer au fil d’actualité et au livre d’or si l’organisateur les a ouverts',
      'Installer l’espace invité sur l’écran d’accueil (PWA)',
    ],
    cannotDo: [
      'Modifier la liste d’invités ou créer des événements',
      'Accéder au tableau de bord organisateur',
      'Voir le plan de table / l’itinéraire avant d’avoir accepté l’invitation',
      'Voir les informations d’autres invités (hors voisins de table une fois placé)',
    ],
    navLinks: [],
    workflows: [
      {
        id: 'confirm-rsvp',
        title: 'Confirmer votre présence',
        content:
          '1. Ouvrez le lien reçu (invitation ou billet).\n2. Acceptez les conditions si demandé — le thème de l’organisateur s’applique ensuite.\n3. Consultez l’invitation : date, lieu, tenue, notes pratiques.\n4. Choisissez Accepter ou Décliner et remplissez les champs demandés (menu, accompagnant…).\n5. Après un « oui », le badge QR et l’itinéraire sont disponibles. Le plan de table et le PDF suivent dès qu’une place vous est assignée.',
      },
      {
        id: 'all-invites',
        title: 'Retrouver toutes vos invitations',
        content:
          '1. Dans l’en-tête, touchez Mes invitations.\n2. Vous voyez les événements à venir et passés liés à votre e-mail ou téléphone.\n3. Un événement terminé reste consultable, mais le Répondez s’il vous plaît ne se modifie plus.\n4. Partagez ce lien uniquement avec vous-même : il est personnel.',
      },
      {
        id: 'view-seating',
        title: 'Badge, placement et itinéraire',
        content:
          '1. Onglet Badge : QR à présenter à l’accueil (plein écran possible) et lien Imprimer l’invitation.\n2. Onglet Ma table : votre table, vos voisins et le plan de salle dès que l’organisateur vous a assis ; PDF téléchargeable.\n3. Onglet Itinéraire : carte et consignes d’accès si l’organisateur a renseigné le lieu.\n4. Un PDF peut aussi partir par e-mail ou WhatsApp une fois la place assignée.',
      },
      {
        id: 'event-feed',
        title: 'Fil d’actualité et livre d’or',
        content:
          '1. Après un Répondez s’il vous plaît accepté, ouvrez Actualités pour les photos et annonces de l’organisateur.\n2. Livre d’or : laissez un message et des photos — l’organisateur les voit dans son fil.\n3. Le jour J, le fil reste le canal des annonces en direct.',
      },
      {
        id: 'tickets',
        title: 'Billet marketplace',
        content:
          '1. Si vous avez acheté un billet public, la page de succès contient le lien vers votre espace invité.\n2. Ouvrez ce lien pour le badge QR, comme pour une invitation privée.\n3. Connecté, vos billets restent aussi dans Mes billets du compte.',
        links: [{ label: 'Mes billets', href: '/dashboard/tickets' }],
      },
      {
        id: 'event-day',
        title: 'Le jour de l’événement',
        content:
          '1. Présentez votre QR (portail, page d’impression ou message de confirmation).\n2. Le protocole scanne le code dans le navigateur (téléphone ou tablette).\n3. Consultez Actualités pour les annonces en direct.\n4. Sur mobile, installez {platformName} sur l’écran d’accueil pour rouvrir plus vite.',
      },
    ],
    tips: [
      'Conservez le lien Répondez s’il vous plaît — il est unique et personnel.',
      'Le PDF part une fois la place assignée. L’itinéraire est disponible dès la confirmation Répondez s’il vous plaît.',
      'Si le lien ne s’ouvre pas, contactez l’organisateur.',
      'Le thème (couleurs, nom) suit l’organisation qui vous invite, pas seulement le site public.',
    ],
  },
];

export function getUserGuide(id: UserGuideId): UserGuide | undefined {
  return USER_GUIDES.find((g) => g.id === id);
}
