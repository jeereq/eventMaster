export type UserGuideId =
  | 'super_admin'
  | 'commercial_platform'
  | 'owner'
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

export const USER_GUIDES: UserGuide[] = [
  {
    id: 'super_admin',
    title: 'Guide Super Administrateur',
    badge: 'Plateforme',
    summary:
      'Vous pilotez EventMaster : organisations et licences, marketplace, vitrine, facturation, audit et impersonation support.',
    canDo: [
      'Traiter la file du jour : demandes d’abonnement, licences J-7, factures ouvertes',
      'Créer et modifier les organisations, forfaits et durées (trimestre 90 j, mois, annuel 365 j −10 %)',
      'Ouvrir l’espace d’une organisation (impersonation support, bandeau visible)',
      'Modérer le catalogue : salles, métiers, locations ; dépublier / republier avec motif',
      'Suivre packs, favoris, GMV salles / métiers / locations et commissions {commissionPercent} %',
      'Publier des modèles globaux sur la landing, éditer les messages invités',
      'Consulter les analyses SaaS, le funnel RSVP / PDF / scan, le journal d’audit et les réglages',
      'Verser les commissions des commerciaux plateforme hors EventMaster (preuve + motif), via Versements SaaS',
      'Ajuster commission marketplace, acompte et taux commerciaux (Réglages)',
    ],
    cannotDo: [
      'Organiser un événement comme un membre interne sans passer par l’impersonation',
      'Modifier les données privées d’une org hors session support (vous supervisez)',
    ],
    navLinks: [
      { label: 'Accueil', href: '/dashboard?tab=overview' },
      { label: 'Organisations', href: '/dashboard?tab=tenants' },
      { label: 'Événements', href: '/dashboard/admin/events' },
      { label: 'Invités', href: '/dashboard/admin/guests' },
      { label: 'Catalogue', href: '/dashboard/admin/catalogue' },
      { label: 'Demandes abonnement', href: '/dashboard?tab=subscription-requests' },
      { label: 'Forfaits', href: '/dashboard?tab=subscription-plans' },
      { label: 'Versements SaaS', href: '/dashboard/admin/payouts' },
      { label: 'Journal d’audit', href: '/dashboard/audit' },
      { label: 'Analyses', href: '/dashboard?tab=analytics&section=overview' },
      { label: 'Concepteur visuel', href: '/dashboard/templates' },
    ],
    workflows: [
      {
        id: 'approve-subscription',
        title: 'Valider une demande d\'abonnement',
        content:
          '1. Ouvrez Demandes abonnement.\n2. Vérifiez le forfait et la durée : trimestre 90 j (Particulier) ou mois (Business / marketplace), annuel 365 j facturé 12 mois ou 4 trimestres avec −10 %.\n3. Vérifiez la preuve de paiement hors plateforme.\n4. Approuvez — la licence s’active et une facture est générée au statut Payée.\n5. Pour une facture déjà émise « Envoyée » (renouvellement, ancien dossier) : Factures → détail → Marquer payée (motif ≥ 8 caractères).',
        links: [{ label: 'Demandes abonnement', href: '/dashboard?tab=subscription-requests' }],
      },
      {
        id: 'license-duration',
        title: 'Prolonger une licence (période de base ou annuel)',
        content:
          '1. Organisations → Modifier.\n2. Activez Facturation.\n3. Choisissez Trimestre/Mois ou Annuel (365 j, −10 % y compris Particulier).\n4. Cochez Prolonger la licence, puis Enregistrer.',
        links: [{ label: 'Organisations', href: '/dashboard?tab=tenants' }],
      },
      {
        id: 'impersonate-org',
        title: 'Ouvrir l’espace d’une organisation',
        content:
          '1. Dans Organisations ou Catalogue, cliquez sur Ouvrir l’espace.\n2. Un bandeau « session support » s’affiche.\n3. Vous voyez le workspace comme le gérant — sans mot de passe client.\n4. Quittez la session depuis le bandeau. L’action est journalisée dans l’audit.',
        links: [
          { label: 'Organisations', href: '/dashboard?tab=tenants' },
          { label: 'Journal d’audit', href: '/dashboard/audit' },
        ],
      },
      {
        id: 'moderate-catalog',
        title: 'Modérer le marketplace et les commissions {commissionPercent} %',
        content:
          '1. Ouvrez Catalogue.\n2. Filtrez salles, métiers ou locations. Dépublier exige un motif (journalisé) ; Republier remet la fiche en vitrine.\n3. Les compteurs GMV distinguent salles, métiers et locations ; favoris et packs mesurent l’usage de « Préparer un événement ».\n4. Onglet Commissions {commissionPercent} % : marquez payée après versement hors plateforme, ou exportez le CSV.',
        links: [{ label: 'Catalogue', href: '/dashboard/admin/catalogue' }],
      },
      {
        id: 'publish-landing-template',
        title: 'Publier un modèle sur la landing page',
        content:
          '1. Créez ou modifiez un modèle Global (Public) dans le Concepteur visuel.\n2. Dans Paramètres globaux, section Vitrine landing : activez « Afficher sur la landing page », choisissez la catégorie et la description.\n3. Sauvegardez — le modèle apparaît sur la page d\'accueil via l\'API publique.',
        links: [
          { label: 'Modèles globaux', href: '/dashboard?tab=templates' },
          { label: 'Concepteur visuel', href: '/dashboard/templates' },
        ],
      },
      {
        id: 'review-analytics',
        title: 'Consulter les statistiques plateforme',
        content:
          '1. Ouvrez Analyses & stats.\n2. Vue d’ensemble : licences, événements publics, GMV billets et marketplace (agrégats, sans tout charger).\n3. Événements / Invités : pages dédiées paginées (public / privé / billets, PDF livré / manquant, check-in).\n4. Exportez le rapport revenus SaaS en CSV ou PDF. Les commissions marketplace {commissionPercent} % restent dans Catalogue.',
        links: [{ label: 'Analyses & stats', href: '/dashboard?tab=analytics&section=overview' }],
      },
      {
        id: 'saas-payouts',
        title: 'Verser une commission commerciale SaaS',
        content:
          '1. Effectuez le virement hors plateforme (Mobile Money / banque).\n2. Ouvrez Versements SaaS (ou Analyses → File versements).\n3. Filtrez la période, ouvrez le dossier dû.\n4. Joignez une preuve (URL ou photo de reçu) et un motif (≥ 8 caractères).\n5. Marquez versée — le commercial est notifié, l’action est journalisée. Les commerciaux org. sont payés par l’organisation parrainante, pas ici.',
        links: [
          { label: 'Versements SaaS', href: '/dashboard/admin/payouts' },
          { label: 'Analyses revenus', href: '/dashboard?tab=analytics&section=revenus' },
        ],
      },
    ],
    tips: [
      'Filtrez les organisations par type : Client (sans licence), Organisateur, Salle / presta, Mixte.',
      'Sur Invités (/dashboard/admin/guests), le filtre « PDF non livré » cible les RSVP acceptés sans seatingInvitationPdfUrl. L’export CSV porte sur 100 résultats filtrés.',
      'Un motif de dépublication apparaît dans le journal d’audit (CATALOG_UNPUBLISH).',
      'Les modèles d\'organisation ne doivent jamais avoir showOnLanding — seuls les modèles globaux sont publics.',
      'Vérifiez les licences expirées sur l’Accueil avant d’approuver un renouvellement.',
      'Les taux marketplace et commerciaux se règlent dans Réglages (pas dans le code). Les réservations déjà confirmées gardent leur taux d’origine.',
      'EventMaster ne verse que les commerciaux plateforme. Distinct du {commissionPercent} % marketplace (Catalogue).',
      'Accueil : pastille Versements du mois précédent ; alerte J+3 si encore dû après la fenêtre de notification.',
      'Le mode maintenance bloque tout le monde sauf le Super Admin.',
    ],
  },
  {
    id: 'commercial_platform',
    title: 'Guide Commercial plateforme',
    badge: 'Plateforme',
    summary:
      'Vous accompagnez les organisations parrainées, suivez les demandes d\'abonnement et consultez vos commissions sur les factures validées.',
    canDo: [
      'Consulter les organisations que vous avez parrainées',
      'Traiter les demandes d\'abonnement (approbation selon vos droits)',
      'Consulter les factures plateforme et vos commissions (dû / versé + preuve)',
      'Recevoir des notifications in-app lors d\'approbations et de versements',
    ],
    cannotDo: [
      'Modifier les forfaits ou la configuration globale de la plateforme',
      'Accéder aux événements ou invités des organisations parrainées',
      'Créer des modèles globaux ou gérer tous les utilisateurs',
    ],
    navLinks: [
      { label: 'Organisations', href: '/dashboard?tab=tenants' },
      { label: 'Demandes abonnement', href: '/dashboard?tab=subscription-requests' },
      { label: 'Factures', href: '/dashboard?tab=invoices' },
      { label: 'Parrainage & commissions', href: '/dashboard/commercial' },
    ],
    workflows: [
      {
        id: 'follow-requests',
        title: 'Suivre une demande d\'abonnement',
        content:
          '1. Ouvrez Demandes abonnement.\n2. Identifiez la demande liée à votre parrainage.\n3. Vérifiez le statut (en attente, approuvé, rejeté).\n4. Une notification vous alerte lorsque le super admin valide une souscription.',
        links: [{ label: 'Demandes abonnement', href: '/dashboard?tab=subscription-requests' }],
      },
      {
        id: 'check-commissions',
        title: 'Consulter vos commissions',
        content:
          '1. Accédez à Parrainage & commissions pour la vue dédiée.\n2. Consultez aussi l\'onglet Factures pour le détail des montants et périodes.\n3. Les commissions sont calculées sur les factures validées (premier paiement / renouvellement selon votre taux).\n4. EventMaster verse hors plateforme ; une preuve apparaît sur la ligne une fois que le Super Admin a marqué le versement.',
        links: [
          { label: 'Parrainage & commissions', href: '/dashboard/commercial' },
          { label: 'Factures', href: '/dashboard?tab=invoices' },
        ],
      },
    ],
    tips: [
      'La cloche de notification en haut du menu signale les nouvelles approbations.',
      'Communiquez le code de parrainage aux organisations avant leur inscription.',
      'En cas de rejet d’abonnement, contactez le super admin avec la preuve de paiement corrigée.',
      'Le versement de vos commissions SaaS est hors plateforme (Mobile Money / banque). La preuve est jointe par le Super Admin.',
    ],
  },
  {
    id: 'owner',
    title: 'Guide Propriétaire d\'organisation',
    badge: 'Organisation',
    summary:
      'En tant que propriétaire (créateur de l\'organisation), vous disposez de tous les droits : équipe, salles, événements, modèles, marketplace, facturation et factures.',
    canDo: [
      'Gérer l\'équipe (managers, protocoles, commerciaux org.)',
      'Créer et configurer les salles 2D',
      'Créer des événements privés (liste d\'invités) ou publics avec inscription / billets en ligne',
      'Renseigner dress code, avantages et notes pratiques pour les invités',
      'Publier sur le fil d’actualité, répondre aux commentaires et consulter le livre d’or',
      'Accéder à la facturation, au forfait, aux factures et aux versements des commerciaux org.',
      'Personnaliser les modèles d\'invitation et messages invités',
      'Publier des salles (plan 2D) et des prestations : métiers ou locations (habits, véhicules, matériel)',
    ],
    cannotDo: [
      'Voir les données d\'autres organisations',
      'Modifier les forfaits plateforme ou valider des abonnements d\'autres tenants',
    ],
    navLinks: [
      { label: 'Tableau de bord', href: '/dashboard' },
      { label: 'Événements', href: '/dashboard/events' },
      { label: 'Statistiques', href: '/dashboard/analytics' },
      { label: 'Modèles', href: '/dashboard/templates' },
      { label: 'Facturation & plan', href: '/dashboard/billing' },
      { label: 'Versements commerciaux', href: '/dashboard/billing/payouts' },
      { label: 'Factures', href: '/dashboard/invoices' },
      { label: 'Salles', href: '/dashboard/rooms' },
      { label: 'Marketplace', href: '/dashboard/marketplace' },
      { label: 'Équipe', href: '/dashboard/team' },
      { label: 'Mon compte', href: '/dashboard/profile' },
    ],
    workflows: [
      {
        id: 'event-lifecycle',
        title: 'Parcours complet d\'un événement',
        content:
          '1. Créez l\'événement (titre, date, lieu, salle).\n2. Onglet Infos invités : dress code, avantages (parking, cadeaux, extras), horaires et notes — visibles sur le RSVP.\n3. Ajoutez ou importez vos invités.\n4. Configurez un modèle visuel et une invitation (e-mail / WhatsApp).\n5. Diffusez l\'invitation : les invités reçoivent le lien RSVP.\n6. Les invités confirment ou déclinent via leur lien personnel — dès acceptation, PDF / plan / GPS partent (si place assignée et forfait Premium+).\n7. Organisez le plan de table 2D et assignez les places — les invités déjà confirmés reçoivent alors le placement complet.\n8. Onglet Feed : publiez photos et annonces ; les invités like et commentent ; le livre d’or collecte leurs messages.\n9. Le jour J, utilisez le mode Protocole (scan QR) pour confirmer la présence à l\'entrée.\n10. Consultez les statistiques RSVP et participation.',
        links: [
          { label: 'Événements', href: '/dashboard/events' },
          { label: 'Statistiques', href: '/dashboard/analytics' },
        ],
      },
      {
        id: 'create-event',
        title: 'Créer un événement complet',
        content:
          '1. Allez dans Événements → Créer.\n2. Choisissez Privé (liste d’invités) ou Public (fiche sur le marketplace : grille, liste et carte).\n3. Ajoutez une galerie (photos / vidéos) : elle sert de couverture marketplace et de fiche publique.\n4. Pour un public payant, activez les billets en ligne et le prix en FC.\n5. Renseignez titre, date, lieu et GPS ; associez une salle (importe le plan 2D) et un modèle de formulaire RSVP si besoin.\n6. Dans Infos invités : dress code, avantages (parking, cadeaux, extras) et notes — visibles sur le RSVP.\n7. Sur le fil d’actualité, publiez une annonce ; les invités like et commentent. Sur un événement public, cochez « publier aussi sur la fiche marketplace ».\n8. Suivez le parcours : invités (ou acheteurs de billets) → invitation RSVP → plan de table → protocole.',
        links: [{ label: 'Événements', href: '/dashboard/events' }],
      },
      {
        id: 'manage-team',
        title: 'Inviter un membre d\'équipe',
        content:
          '1. Ouvrez Équipe dans le menu.\n2. Choisissez le rôle : Manager, Protocole ou Commercial org.\n3. Renseignez e-mail et mot de passe temporaire.\n4. Le membre reçoit ses accès selon son rôle.',
        links: [{ label: 'Équipe', href: '/dashboard/team' }],
      },
      {
        id: 'upgrade-plan',
        title: 'Changer de forfait',
        content:
          '1. Ouvrez Facturation & plan.\n2. Comparez les quotas. Choisissez la période de base (mois, ou trimestre 90 j pour un forfait Particulier) ou l’annuel (12 mois ou 4 trimestres d’un coup, −10 %).\n3. Soumettez une demande de changement avec preuve de paiement si requis.\n4. Suivez le statut dans Factures après validation.',
        links: [{ label: 'Facturation & plan', href: '/dashboard/billing' }],
      },
      {
        id: 'org-payouts',
        title: 'Verser les commissions de vos commerciaux',
        content:
          '1. Effectuez le virement hors plateforme (Mobile Money / banque) vers le commercial org.\n2. Ouvrez Versements commerciaux (Facturation) ou le lien depuis Équipe.\n3. Filtrez la période, ouvrez le dossier dû.\n4. Joignez une preuve (URL ou photo) et un motif (≥ 8 caractères).\n5. Marquez versée — le commercial est notifié. EventMaster ne paie pas ces commissions.',
        links: [
          { label: 'Versements commerciaux', href: '/dashboard/billing/payouts' },
          { label: 'Équipe', href: '/dashboard/team' },
        ],
      },
      {
        id: 'marketplace-desk',
        title: 'Publier une prestation et traiter les demandes',
        content:
          '1. Ouvrez Marketplace dans le menu.\n2. Onglet Prestations : créez une fiche métier (traiteur, photo, DJ…) ou location (habits homme / femme / enfant, voiture, moto, matériel) avec photos, tarif, ville, rayon ; passez en grille ou liste, puis publiez. Pour une salle : Salles → plan 2D → publier la fiche.\n3. Onglet Demandes : marquez un devis comme contacté, ou convertissez-le en réservation s’il a une date.\n4. Onglet Réservations : acceptez, marquez l’acompte reçu (versé hors plateforme), puis confirmez pour bloquer la date.\n5. Sur une fiche publique, le bouton Partager envoie le lien marketplace (pas l’URL interne du desk).',
        links: [{ label: 'Marketplace', href: '/dashboard/marketplace' }],
      },
    ],
    tips: [
      'Les quotas (événements, invités, modèles) sont visibles sur le tableau de bord.',
      'Les couleurs de l’organisation (Profil) s’appliquent à toute l’équipe ; l’accent personnel du header ne concerne que cet appareil.',
      'Assignez des protocoles org. pour le scan QR web (navigateur) sur tous les événements.',
      'Configurez les salles avant de créer des événements avec plan de table.',
      'La commission marketplace ({commissionPercent} %) est due par le vendeur, distincte de l’abonnement SaaS.',
      'Le paiement annuel facture 12 mois (ou 4 trimestres Particulier) d’un coup, avec −10 % sur ce total. Le cycle est mémorisé : le rappel J-7 et la facture de renouvellement auto reprennent l’annuel.',
      'Les commissions de vos commerciaux org. se versent hors plateforme (Facturation → Versements), avec preuve.',
    ],
  },
  {
    id: 'org_manager',
    title: 'Guide Manager organisation',
    badge: 'Organisation',
    summary:
      'Vous pilotez l\'organisation au quotidien : équipe, salles, événements, modèles et marketplace. La facturation reste réservée au propriétaire.',
    canDo: [
      'Gérer l\'équipe et les rôles organisationnels',
      'Créer salles et événements (privés ou publics, billets en ligne)',
      'Renseigner dress code, avantages et notes pratiques pour les invités',
      'Publier sur le fil d’actualité et suivre le livre d’or',
      'Gérer invités, invitations et modèles',
      'Consulter les factures (sans modifier le forfait)',
      'Publier des salles et des prestations (métiers ou locations) et traiter devis / réservations',
    ],
    cannotDo: [
      'Accéder à la facturation ni changer de forfait',
      'Supprimer l\'organisation ou transférer la propriété',
      'Voir les autres organisations',
    ],
    navLinks: [
      { label: 'Tableau de bord', href: '/dashboard' },
      { label: 'Événements', href: '/dashboard/events' },
      { label: 'Statistiques', href: '/dashboard/analytics' },
      { label: 'Modèles', href: '/dashboard/templates' },
      { label: 'Factures', href: '/dashboard/invoices' },
      { label: 'Salles', href: '/dashboard/rooms' },
      { label: 'Marketplace', href: '/dashboard/marketplace' },
      { label: 'Équipe', href: '/dashboard/team' },
      { label: 'Mon compte', href: '/dashboard/profile' },
    ],
    workflows: [
      {
        id: 'event-lifecycle',
        title: 'Parcours complet d\'un événement',
        content:
          '1. Créez l\'événement (titre, date, lieu suffisent).\n2. Ajoutez les invités — e-mail ou WhatsApp, un contact suffit.\n3. Rédigez et envoyez l\'invitation (lien RSVP seulement, pas de PDF).\n4. Suivez les réponses. Vous pouvez placer dès maintenant ; le PDF part au « oui » si une place est assignée (Premium+).\n5. Jour J : mode Protocole pour l\'accueil (scan QR).',
        links: [
          { label: 'Événements', href: '/dashboard/events' },
          { label: 'Statistiques', href: '/dashboard/analytics' },
        ],
      },
      {
        id: 'setup-room',
        title: 'Configurer une salle 2D',
        content:
          '1. Ouvrez Salles dans le menu → Créer.\n2. Choisissez le type (banquet, conférence…).\n3. Placez tables, chaises et éléments décoratifs.\n4. Associez la salle à un événement pour le placement invités.',
        links: [{ label: 'Salles', href: '/dashboard/rooms' }],
      },
      {
        id: 'invite-guests',
        title: 'Inviter et placer des invités',
        content:
          '1. Onglet Invités : ajoutez ou importez la liste (e-mail ou WhatsApp).\n2. Onglet Invitations : rédigez le message, vérifiez l’aperçu, envoyez le lien RSVP.\n3. Plan de table : vous pouvez placer dès maintenant ; le PDF part quand la personne dit oui.\n4. Jour J : Protocole pour le scan QR.',
        links: [{ label: 'Événements', href: '/dashboard/events' }],
      },
      {
        id: 'marketplace-desk',
        title: 'Gérer prestations, devis et réservations',
        content:
          '1. Ouvrez Marketplace.\n2. Onglet Prestations pour les métiers, onglet Locations pour habits, voitures, motos ou matériel. Publiez ou mettez à jour vos fiches (vue grille ou liste).\n3. Traitez les demandes de devis (contacter, convertir en réservation).\n4. Dans Réservations, suivez l’étape suivante affichée sur chaque carte : accepter, acompte, confirmer.\n5. Partagez le lien public d’une fiche depuis la fiche marketplace, pas depuis l’URL interne.',
        links: [{ label: 'Marketplace', href: '/dashboard/marketplace' }],
      },
    ],
    tips: [
      'Respectez le quota de managers org. selon votre forfait.',
      'Déléguez le protocole aux membres Protocole pour le jour J.',
      'Utilisez les modèles globaux comme base dans le concepteur visuel.',
      'La commission marketplace ({commissionPercent} %) est due par le vendeur, distincte de l’abonnement SaaS.',
    ],
  },
  {
    id: 'org_protocol',
    title: 'Guide Protocole organisation',
    badge: 'Organisation',
    summary:
      'Vous gérez l\'accueil et le contrôle des invités sur tous les événements de l\'organisation : scan QR dans le navigateur et confirmation de présence à l\'entrée.',
    canDo: [
      'Accéder au mode Protocole sur tous les événements',
      'Scanner les QR codes invités avec la caméra du navigateur (téléphone ou tablette)',
      'Consulter et mettre à jour le statut RSVP des invités',
      'Confirmer la présence le jour J et valider le siège',
    ],
    cannotDo: [
      'Créer des événements ou des salles',
      'Gérer l\'équipe ou la facturation',
      'Modifier les modèles d\'invitation globaux',
    ],
    navLinks: [
      { label: 'Événements', href: '/dashboard/events' },
      { label: 'Mode Protocole', href: '/dashboard/events?mode=protocol' },
    ],
    workflows: [
      {
        id: 'protocol-scan',
        title: 'Accueillir un invité (scan QR)',
        content:
          '1. Ouvrez Mode Protocole ou sélectionnez un événement.\n2. Dans le navigateur, autorisez la caméra pour scanner le QR de l\'invité (ou recherchez par nom). L’app native n’est pas encore déployée.\n3. Vérifiez que le RSVP est « Confirmé » — sinon orientez l\'invité vers son lien.\n4. Confirmez la présence pour valider l\'entrée, puis le siège si prévu.',
        links: [{ label: 'Mode Protocole', href: '/dashboard/events?mode=protocol' }],
      },
      {
        id: 'check-guest-list',
        title: 'Vérifier la liste des invités',
        content:
          '1. Depuis Événements, ouvrez l\'événement du jour.\n2. Filtrez par statut RSVP (accepté, en attente, décliné).\n3. Recherchez par nom ou catégorie VIP.',
        links: [{ label: 'Événements', href: '/dashboard/events' }],
      },
    ],
    tips: [
      'Testez le scan dans le navigateur en conditions réelles avant l\'événement (lumière, connexion).',
      'Assurez une connexion stable pour la synchronisation en direct.',
      'Les invités sans QR peuvent être recherchés manuellement dans la liste.',
      'L’application iOS/Android n’est pas encore disponible : le scan se fait sur le web.',
    ],
  },
  {
    id: 'org_commercial',
    title: 'Guide Commercial organisation',
    badge: 'Organisation',
    summary:
      'Vous développez le réseau commercial de votre organisation en parrainant de nouvelles organisations et en suivant vos commissions internes.',
    canDo: [
      'Consulter votre code de parrainage et statistiques',
      'Suivre les organisations parrainées via votre espace dédié',
      'Recevoir des commissions sur les souscriptions validées (dû / versé + preuve)',
    ],
    cannotDo: [
      'Créer des événements ou gérer des invités',
      'Modifier l\'équipe ou les salles',
      'Accéder à la facturation de l\'organisation',
    ],
    navLinks: [{ label: 'Réseau commercial', href: '/dashboard/org-commercial' }],
    workflows: [
      {
        id: 'share-referral',
        title: 'Parrainer une nouvelle organisation',
        content:
          '1. Ouvrez Réseau commercial.\n2. Copiez votre code ou lien de parrainage.\n3. Transmettez-le lors de l\'inscription de la nouvelle organisation.\n4. Suivez l\'avancement des demandes d\'abonnement parrainées.',
        links: [{ label: 'Réseau commercial', href: '/dashboard/org-commercial' }],
      },
    ],
    tips: [
      'Le code doit être saisi à l\'inscription pour lier le parrainage.',
      'Les commissions dépendent du taux configuré par le propriétaire.',
      'Le versement est fait par votre organisation, hors plateforme. Une preuve apparaît une fois que le propriétaire a marqué le dossier.',
      'Contactez le manager org. en cas de litige sur une commission.',
    ],
  },
  {
    id: 'staff_scope',
    title: 'Guide Manager / Protocole salle ou événement',
    badge: 'Périmètre restreint',
    summary:
      'Vous êtes assigné à une ou plusieurs salles ou événements précis. Vos droits dépendent de votre affectation : Manager (gestion) ou Protocole (accueil).',
    canDo: [
      'Manager événement : gérer invités, infos pratiques (dress code) et fil d’actualité sur vos événements/salles assignés',
      'Protocole événement : scan QR dans le navigateur et suivi invités sur vos événements assignés',
      'Consulter le plan de salle des événements de votre périmètre',
    ],
    cannotDo: [
      'Créer de nouveaux événements ou salles (sauf si promoteur manager org.)',
      'Gérer l\'équipe ou accéder à la facturation',
      'Voir les événements hors de votre affectation',
    ],
    navLinks: [
      { label: 'Événements', href: '/dashboard/events' },
      { label: 'Protocole', href: '/dashboard/events?mode=protocol' },
    ],
    workflows: [
      {
        id: 'find-assignment',
        title: 'Identifier votre périmètre',
        content:
          '1. Ouvrez Événements — seuls ceux qui vous sont assignés apparaissent.\n2. Si vous êtes protocole, utilisez le lien Protocole pour le scan.\n3. Contactez votre manager org. pour élargir vos affectations.',
        links: [{ label: 'Événements', href: '/dashboard/events' }],
      },
      {
        id: 'staff-day-of',
        title: 'Jour J — protocole sur un événement assigné',
        content:
          '1. Sélectionnez l\'événement dans votre liste.\n2. Passez en mode Protocole.\n3. Scannez les QR dans le navigateur (caméra web) ou recherchez les invités.\n4. Signalez les no-shows au manager de l\'événement.',
        links: [{ label: 'Mode Protocole', href: '/dashboard/events?mode=protocol' }],
      },
    ],
    tips: [
      'Votre rôle exact (manager vs protocole) est défini par l\'affectation salle/événement.',
      'Sans événement visible, demandez une assignation à votre responsable.',
      'Le scan QR se fait dans le navigateur ; l’app native n’est pas encore déployée.',
      'Le tableau de bord global peut être limité — concentrez-vous sur Événements.',
    ],
  },
  {
    id: 'client',
    title: 'Guide Client marketplace',
    badge: 'Client',
    summary:
      'Vous cherchez une salle, un prestataire (métier ou location) ou un événement public, sans créer d’événements. Marketplace (Explorer, Favoris, Préparer, Mes packs), Agenda, billets et réservations sont dans le tableau de bord. Pour organiser une fête ou publier vos offres, changez le type de compte dans Mon compte.',
    canDo: [
      'Explorer salles, prestataires (métiers et locations : habits, voitures, motos, matériel) et événements (filtres ville, type, prix, carte Focus, grille ou liste)',
      'Ouvrir l’Agenda : événements publics du marketplace, pour s’inscrire ou acheter un billet',
      'Mettre des fiches salles / prestataires / locations en favoris',
      'Préparer un événement avec un brief budget simple (enveloppe, marge en FC, métiers) et obtenir 3 packs',
      'Sauvegarder un brief ou un pack, ou composer un pack depuis les favoris',
      'Partager une recherche (URL avec filtres) ou le lien public d’une fiche',
      'Demander un devis ou une date, puis suivre les réservations',
      'Retrouver vos billets, les filtrer, passer en grille ou liste, et ouvrir le badge QR',
      'Passer organisateur ou prestataire depuis Mon compte',
    ],
    cannotDo: [
      'Créer des événements, invitations ou plans de table',
      'Publier une salle ou une prestation',
      'Souscrire un abonnement SaaS tant que le compte reste client',
    ],
    navLinks: [
      { label: 'Marketplace', href: '/dashboard/catalogue' },
      { label: 'Agenda', href: '/dashboard/catalogue?kind=event' },
      { label: 'Mes billets', href: '/dashboard/tickets' },
      { label: 'Mes réservations', href: '/dashboard/bookings' },
      { label: 'Guide utilisateur', href: '/dashboard/guide' },
      { label: 'Mon compte', href: '/dashboard/profile' },
    ],
    workflows: [
      {
        id: 'explore-favorites',
        title: 'Explorer et enregistrer des favoris',
        content:
          '1. Ouvrez Marketplace.\n2. Onglet Explorer : filtrez par mot-clé, ville, commune, type (salles / prestataires / locations / événements), métier ou location (habits, véhicules, matériel), prix, places.\n3. Passez en grille, liste, carte ou Focus (plein écran). Les pastilles indiquent Salle, Presta, Loc. ou Évén.\n4. Cliquez sur le cœur d’une salle, d’un prestataire ou d’une location.\n5. Onglet Favoris : filtrez salles / prestataires / locations et changez la vue.\n6. Bouton Partager : copie l’URL actuelle, avec vos filtres.',
        links: [{ label: 'Marketplace', href: '/dashboard/catalogue' }],
      },
      {
        id: 'share-search',
        title: 'Partager une recherche ou une fiche',
        content:
          '1. Dans Explorer, le bouton Partager copie l’adresse de la page : le destinataire retrouve les mêmes filtres (ville, type, carte…).\n2. Sur une fiche salle, prestataire ou événement, Partager envoie le lien public marketplace — pas une URL interne du tableau de bord.\n3. Aucun compte n’est obligatoire pour ouvrir le lien ; devis, favoris et billets demandent une connexion ou un passage invité.',
        links: [{ label: 'Marketplace', href: '/dashboard/catalogue' }],
      },
      {
        id: 'prepare-event',
        title: 'Préparer un événement avec un brief budget',
        content:
          'À quoi ça sert : vous donnez un budget max et ce dont vous avez besoin. EventMaster propose 3 packs (économique, équilibré, confort) qui tiennent dans l’enveloppe — salle et prestataires déjà combinés. Rien n’est réservé : vous comparez, puis contactez.\n\nCas d’usage — Marie, mariage à Kinshasa, 100 invités, 1 500 000 FC :\n1. Onglet Préparer un événement.\n2. (Facultatif) ouvrez « Exemple — mariage à Kinshasa » et cliquez Appliquer cet exemple.\n3. Budget max = 1 500 000 FC. Marge 5 % = 75 000 FC de réserve ; la recherche porte sur 1 425 000 FC. Les pourcentages (salle 38 %, traiteur 28 %…) s’affichent aussi en francs.\n4. Ville Kinshasa, 100 invités, date. Salle obligatoire. Métiers : un clic = obligatoire → si ça rentre → exclu.\n5. Lancez la recherche, comparez les 3 packs (chaque barre montre le montant exact). Élargissez un poste manquant ou figez une ligne puis relancez.\n6. Sauvegardez le brief et/ou le pack dans Mes packs, puis envoyez un devis depuis une fiche.',
        links: [{ label: 'Préparer un événement', href: '/dashboard/catalogue?hub=plan' }],
      },
      {
        id: 'browse-agenda',
        title: 'Parcourir l’agenda et s’inscrire',
        content:
          '1. Ouvrez Agenda (ou Marketplace filtré sur Événements).\n2. Filtrez par date, ville, entrée payante / libre.\n3. Ouvrez une fiche, inscrivez-vous ou achetez un billet (compte ou invité).\n4. Le billet apparaît dans Mes billets si vous êtes connecté ou si l’e-mail correspond.',
        links: [
          { label: 'Agenda', href: '/dashboard/catalogue?kind=event' },
          { label: 'Mes billets', href: '/dashboard/tickets' },
        ],
      },
      {
        id: 'book-venue',
        title: 'Réserver une salle ou un prestataire',
        content:
          '1. Ouvrez une fiche depuis Explorer, Favoris, l’Agenda ou un pack.\n2. Envoyez un devis ou une demande de date.\n3. Versez l’acompte ({depositPercent} %) directement au professionnel, hors EventMaster, après acceptation.\n4. Suivez le statut dans Mes réservations (filtres par statut, type et dates).',
        links: [
          { label: 'Marketplace', href: '/dashboard/catalogue' },
          { label: 'Mes réservations', href: '/dashboard/bookings' },
        ],
      },
      {
        id: 'my-tickets',
        title: 'Retrouver, filtrer et afficher un billet',
        content:
          '1. Les commandes liées à votre compte ou à votre e-mail apparaissent dans Mes billets.\n2. Filtrez par mot-clé, à venir / passés, payant / entrée libre, et lieu.\n3. Passez en grille ou liste (nombre de colonnes mémorisé).\n4. Ouvrez Badge QR pour le portail RSVP, ou Fiche pour l’événement.\n5. Le bouton Agenda ouvre les événements du marketplace client — pas le site public.',
        links: [
          { label: 'Mes billets', href: '/dashboard/tickets' },
          { label: 'Agenda', href: '/dashboard/catalogue?kind=event' },
        ],
      },
      {
        id: 'upgrade-account',
        title: 'Passer organisateur ou prestataire',
        content:
          '1. Ouvrez Mon compte.\n2. Changez le type de compte (organisateur, prestataire / salles, ou les deux).\n3. L’espace SaaS s’ouvre : événements ou publication marketplace.\n4. Choisissez ensuite un forfait adapté dans Facturation.',
        links: [{ label: 'Mon compte', href: '/dashboard/profile' }],
      },
    ],
    tips: [
      'Le compte client n’exige pas de licence SaaS.',
      'La marge du brief est un montant : 5 % de 1 500 000 FC = 75 000 FC mis de côté.',
      'Les trois packs d’une recherche évitent de proposer la même salle si le catalogue le permet.',
      'Enregistrez un brief pour relancer la même recherche ; figez une salle puis relancez pour recalculer uniquement les prestataires.',
      'L’Agenda du menu ouvre le marketplace client (événements), pas /marketplace/evenements.',
      'Partagez une recherche pour envoyer exactement les mêmes filtres ; sur une fiche, le lien public suffit.',
      'La commission vendeur ({commissionPercent} %) est distincte de l’abonnement EventMaster ; vous ne la payez pas en tant que client.',
    ],
  },
  {
    id: 'guest',
    title: 'Guide Invité',
    badge: 'Portail RSVP',
    summary:
      'Vous accédez à votre invitation personnelle via un lien reçu par e-mail ou WhatsApp. Aucun compte EventMaster n\'est requis.',
    canDo: [
      'Confirmer ou décliner votre présence (RSVP)',
      'Consulter les détails de l\'événement (date, lieu, description)',
      'Afficher votre badge QR pour l\'accueil',
      'Recevoir votre placement (PDF, plan, GPS) dès confirmation RSVP',
      'Participer au fil d\'actualité et au livre d\'or si activés',
    ],
    cannotDo: [
      'Modifier la liste d\'invités ou créer des événements',
      'Accéder au dashboard organisateur',
      'Voir le plan de table / GPS avant d\'avoir accepté l\'invitation',
      'Voir les informations d\'autres invités (hors voisins de table une fois placé)',
    ],
    navLinks: [],
    workflows: [
      {
        id: 'confirm-rsvp',
        title: 'Confirmer votre présence',
        content:
          '1. Ouvrez le lien reçu dans votre invitation.\n2. Acceptez les conditions d\'utilisation si demandé.\n3. Consultez les détails : date, lieu, dress code, avantages et notes pratiques.\n4. Choisissez Accepter ou Décliner et remplissez les champs demandés (menu, plus-one…).',
      },
      {
        id: 'view-seating',
        title: 'Consulter votre placement',
        content:
          '1. Après avoir accepté l\'invitation, votre badge QR et votre placement (si déjà assigné) sont disponibles.\n2. Vous recevez aussi le PDF et le GPS par e-mail ou WhatsApp (selon le forfait).\n3. Présentez le QR à l\'accueil le jour J pour valider votre entrée.',
      },
      {
        id: 'event-feed',
        title: 'Participer au fil et au livre d\'or',
        content:
          '1. Après avoir accepté l\'invitation, ouvrez l\'onglet Actualités.\n2. Consultez les photos et annonces de l\'organisateur, aimez et commentez.\n3. Onglet Livre d\'or : laissez un message et des photos — l\'organisateur les voit dans son fil.\n4. Le jour J, le fil reste le canal des annonces en direct.',
      },
      {
        id: 'event-day',
        title: 'Le jour de l\'événement',
        content:
          '1. Présentez votre QR code (portail ou message de confirmation) à l\'accueil.\n2. Le protocole scanne votre code dans le navigateur (téléphone ou tablette — pas d’app native pour l’instant).\n3. Consultez le fil d\'actualité pour les annonces en direct.',
      },
    ],
    tips: [
      'Conservez le lien RSVP — il est unique et personnel.',
      'Le PDF et la localisation GPS partent dès votre RSVP positif, dès que votre place est assignée.',
      'Si le lien ne fonctionne pas, contactez directement l\'organisateur.',
    ],
  },
];

/** Fix typo in org_commercial - I had a typo with canDo */
export function getUserGuide(id: UserGuideId): UserGuide | undefined {
  return USER_GUIDES.find((g) => g.id === id);
}

export function getAllUserGuideIds(): UserGuideId[] {
  return USER_GUIDES.map((g) => g.id);
}

export const DASHBOARD_GUIDE_IDS: UserGuideId[] = USER_GUIDES.filter((g) => g.id !== 'guest').map(
  (g) => g.id,
);
