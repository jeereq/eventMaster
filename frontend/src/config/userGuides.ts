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
      'Modérer le catalogue : salles, prestataires, locations ; dépublier / republier avec motif',
      'Suivre packs, favoris, GMV salles / prestataires / locations et commissions {commissionPercent} %',
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
          '1. Ouvrez Catalogue.\n2. Filtrez salles, prestataires ou locations. Dépublier exige un motif (journalisé) ; Republier remet la fiche en vitrine.\n3. Les compteurs GMV distinguent salles, prestataires et locations ; favoris et packs mesurent l’usage de « Préparer un événement ».\n4. Onglet Commissions {commissionPercent} % : marquez payée après versement hors plateforme, ou exportez le CSV.',
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
          '1. Effectuez le virement hors plateforme (Mobile Money / banque) ou lancez un Pay Out FlexPay.\n2. Ouvrez Versements SaaS (ou Analyses → File versements).\n3. Filtrez la période, ouvrez le dossier dû.\n4. Joignez une preuve (URL ou photo de reçu) et un motif (≥ 8 caractères), ou confirmez le versement FlexPay.\n5. Marquez versée — le commercial plateforme est notifié, l’action est journalisée.',
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
      'En tant que propriétaire, vous pilotez l’organisation : équipe, salles 2D/3D (étages, escaliers selon forfait), événements, modèles, catalogue acheteur (Explorer), devis / réservations, offres vendeur (Mes offres), facturation et factures.',
    canDo: [
      'Gérer l\'équipe (managers, protocoles)',
      'Créer des salles multi-étages (Duplex, Villa…) et peaufiner le plan 3D selon le niveau d’éditeur du forfait',
      'Créer des événements privés ou publics (billets), tâches d’équipe et mode Protocole',
      'Explorer le catalogue acheteur (comme un client) : salles, prestataires, locations',
      'Suivre séparément les demandes de devis et les réservations',
      'Publier vos offres vendeur (Mes offres) : prestations / locations ; salles via Salles',
      'Accéder à la facturation, au forfait et aux factures',
      'Personnaliser modèles d’invitation et messages invités',
    ],
    cannotDo: [
      'Voir les données d\'autres organisations',
      'Modifier les forfaits plateforme ou valider des abonnements d\'autres tenants',
    ],
    navLinks: [
      { label: 'Tableau de bord', href: '/dashboard' },
      { label: 'Événements', href: '/dashboard/events' },
      { label: 'Protocole', href: '/dashboard/protocol' },
      { label: 'Statistiques', href: '/dashboard/analytics' },
      { label: 'Modèles', href: '/dashboard/templates' },
      { label: 'Facturation & plan', href: '/dashboard/billing' },
      { label: 'Versements commerciaux', href: '/dashboard/billing/payouts' },
      { label: 'Factures', href: '/dashboard/invoices' },
      { label: 'Salles', href: '/dashboard/rooms' },
      { label: 'Explorer', href: '/dashboard/catalogue' },
      { label: 'Demandes de devis', href: '/dashboard/bookings?tab=quotes' },
      { label: 'Réservations', href: '/dashboard/bookings?tab=bookings' },
      { label: 'Mes offres', href: '/dashboard/marketplace' },
      { label: 'Équipe', href: '/dashboard/team' },
      { label: 'Guide', href: '/dashboard/guide' },
      { label: 'Mon compte', href: '/dashboard/profile' },
    ],
    workflows: [
      {
        id: 'whats-new',
        title: 'Nouveautés à connaître',
        content:
          '1. Marketplace séparé : Explorer = catalogue acheteur (comme le client) ; Mes offres = publication vendeur.\n2. Devis et Réservations sont deux entrées de menu distinctes (même page, onglets synchronisés avec l’URL).\n3. Événements : sous-onglets Liste | Tâches ; en mode Protocole, Accueil | Tâches sur un événement.\n4. Salles : modèles d’étages (Duplex…), escaliers / balcons dès Premium — détail dans « Éditeur de salles selon le forfait » et la FAQ.',
        links: [
          { label: 'Explorer', href: '/dashboard/catalogue' },
          { label: 'FAQ éditeur', href: '/faq' },
          { label: 'Facturation', href: '/dashboard/billing' },
        ],
      },
      {
        id: 'event-lifecycle',
        title: 'Parcours complet d\'un événement',
        content:
          '1. Créez l\'événement (titre, date, lieu, salle).\n2. Onglet Préparation : retenez une salle / prestataires via Explorer, puis envoyez un devis.\n3. Infos invités : dress code, avantages, notes (visibles au RSVP).\n4. Invités → invitation RSVP → plan de table.\n5. Onglet Tâches : checklist d’équipe (assignez le protocole).\n6. Feed : annonces ; livre d’or.\n7. Jour J : Protocole (scan QR) + onglet Tâches pour la checklist accueil.\n8. Statistiques RSVP / check-in.',
        links: [
          { label: 'Événements', href: '/dashboard/events' },
          { label: 'Explorer', href: '/dashboard/catalogue' },
          { label: 'Statistiques', href: '/dashboard/analytics' },
        ],
      },
      {
        id: 'create-event',
        title: 'Créer un événement complet',
        content:
          '1. Événements → Créer.\n2. Privé (liste d’invités) ou Public (fiche marketplace + billets éventuels).\n3. Galerie, GPS, salle (importe le plan), formulaire RSVP.\n4. Infos invités puis invitations.\n5. Suivez : invités → plan de table → tâches → protocole.',
        links: [{ label: 'Événements', href: '/dashboard/events' }],
      },
      {
        id: 'browse-and-quote',
        title: 'Explorer le catalogue et suivre devis / réservations',
        content:
          '1. Menu Explorer : même expérience que le client (filtres, carte, favoris, packs budget).\n2. Depuis une fiche, envoyez un devis ou une demande de date (lié à un événement si besoin).\n3. Menu Demandes de devis : réponses et conversion.\n4. Menu Réservations : acceptation, acompte hors plateforme, confirmation de date.',
        links: [
          { label: 'Explorer', href: '/dashboard/catalogue' },
          { label: 'Demandes de devis', href: '/dashboard/bookings?tab=quotes' },
          { label: 'Réservations', href: '/dashboard/bookings?tab=bookings' },
        ],
      },
      {
        id: 'manage-team',
        title: 'Inviter un membre d\'équipe',
        content:
          '1. Ouvrez Équipe.\n2. Rôle : Manager, Protocole ou Commercial org.\n3. E-mail + mot de passe temporaire.\n4. Le protocole voit Tableau de bord, Protocole (événements + tâches), Explorer, devis et réservations.',
        links: [{ label: 'Équipe', href: '/dashboard/team' }],
      },
      {
        id: 'upgrade-plan',
        title: 'Changer de forfait',
        content:
          '1. Facturation & plan.\n2. Comparez quotas et niveau d’éditeur de salles (Essentiel → Complet).\n3. Période de base ou annuel (−10 %).\n4. Demande + preuve si requis ; suivi dans Factures.',
        links: [{ label: 'Facturation & plan', href: '/dashboard/billing' }],
      },
      {
        id: 'org-payouts',
        title: 'Verser les commissions de vos commerciaux',
        content:
          '1. Virement hors plateforme vers le commercial.\n2. Versements commerciaux → dossier dû.\n3. Preuve + motif (≥ 8 caractères) → Marquer versée.',
        links: [
          { label: 'Versements commerciaux', href: '/dashboard/billing/payouts' },
          { label: 'Équipe', href: '/dashboard/team' },
        ],
      },
      {
        id: 'marketplace-desk',
        title: 'Publier une offre (Mes offres)',
        content:
          '1. Menu Mes offres (vendeur) — distinct d’Explorer.\n2. Prestations : prestataire ou location ; photos, tarif, ville ; publiez. Salle : Salles → plan → publier.\n3. Demandes reçues → contacter / convertir en réservation.\n4. Réservations vendeur : accepter → acompte hors plateforme → confirmer.',
        links: [{ label: 'Mes offres', href: '/dashboard/marketplace' }],
      },
      {
        id: 'room-editor-plans',
        title: 'Éditeur de salles selon le forfait',
        content:
          'Niveau d’éditeur (Facturation) :\n1. Essentiel — tables simples.\n2. Business — rangées, entrées, allées, couloirs.\n3. Premium — thèmes, scène, buffet, zones, escaliers, balcons.\n4. Complet — + périmètre, tapis, thèmes / images perso.\n5. Duplex / Empiler : structure ; escalier / balcon = Premium+.\n6. FAQ publique : question dédiée à l’éditeur.',
        links: [
          { label: 'Facturation', href: '/dashboard/billing' },
          { label: 'Salles', href: '/dashboard/rooms' },
          { label: 'FAQ', href: '/faq' },
        ],
      },
      {
        id: 'room-stairs',
        title: 'Escaliers entre étages',
        content:
          'Premium ou Complet requis.\n1. Au moins 2 étages (Duplex / Villa ou + Étage).\n2. Étage de départ → Escalier vers… → arrivée.\n3. Panneau Définition : style (Droit / Ouvert / Compact), orientation, recalibrer.\n4. Empiler pour vérifier en 3D. Guide in-app dans l’éditeur.',
        links: [
          { label: 'Salles', href: '/dashboard/rooms' },
          { label: 'Facturation', href: '/dashboard/billing' },
        ],
      },
    ],
    tips: [
      'Explorer ≠ Mes offres : l’un cherche, l’autre publie.',
      'Devis et Réservations sont séparés dans le menu pour un suivi plus clair.',
      'Assignez le protocole et des tâches avant le jour J (Événements → Tâches).',
      'Éditeur : Essentiel → tables ; Business → allées ; Premium → escaliers / balcons ; Complet → perso.',
      'Commission marketplace ({commissionPercent} %) = vendeur, hors abonnement SaaS.',
      'Annuel = 12 mois (ou 4 trimestres Particulier) avec −10 %.',
      'Versements SaaS plateforme : hors organisation (admin EventMaster).',
    ],
  },
  {
    id: 'org_manager',
    title: 'Guide Manager organisation',
    badge: 'Organisation',
    summary:
      'Vous pilotez le quotidien : équipe, salles 2D/3D, événements, Explorer (catalogue acheteur), devis / réservations, Mes offres. La facturation reste au propriétaire.',
    canDo: [
      'Gérer l\'équipe et les rôles',
      'Créer salles (étages, plan 3D selon forfait) et événements (privés / publics)',
      'Explorer le catalogue et suivre devis / réservations séparément',
      'Publier des offres vendeur (Mes offres) et traiter les demandes reçues',
      'Assigner des tâches et préparer le mode Protocole',
      'Consulter les factures (sans changer de forfait)',
    ],
    cannotDo: [
      'Accéder à la facturation ni changer de forfait',
      'Supprimer l\'organisation ou transférer la propriété',
      'Voir les autres organisations',
    ],
    navLinks: [
      { label: 'Tableau de bord', href: '/dashboard' },
      { label: 'Événements', href: '/dashboard/events' },
      { label: 'Protocole', href: '/dashboard/protocol' },
      { label: 'Statistiques', href: '/dashboard/analytics' },
      { label: 'Modèles', href: '/dashboard/templates' },
      { label: 'Factures', href: '/dashboard/invoices' },
      { label: 'Salles', href: '/dashboard/rooms' },
      { label: 'Explorer', href: '/dashboard/catalogue' },
      { label: 'Demandes de devis', href: '/dashboard/bookings?tab=quotes' },
      { label: 'Réservations', href: '/dashboard/bookings?tab=bookings' },
      { label: 'Mes offres', href: '/dashboard/marketplace' },
      { label: 'Équipe', href: '/dashboard/team' },
      { label: 'Guide', href: '/dashboard/guide' },
      { label: 'Mon compte', href: '/dashboard/profile' },
    ],
    workflows: [
      {
        id: 'whats-new',
        title: 'Nouveautés à connaître',
        content:
          '1. Explorer = catalogue acheteur ; Mes offres = publication vendeur.\n2. Menus Demandes de devis et Réservations séparés.\n3. Événements → Liste | Tâches ; Protocole → Accueil | Tâches.\n4. Salles multi-étages / escaliers selon le forfait (voir Facturation chez le propriétaire).',
        links: [
          { label: 'Explorer', href: '/dashboard/catalogue' },
          { label: 'Événements', href: '/dashboard/events' },
        ],
      },
      {
        id: 'event-lifecycle',
        title: 'Parcours complet d\'un événement',
        content:
          '1. Créez l\'événement.\n2. Préparation : retenez des fiches via Explorer, devis liés.\n3. Invités → invitation RSVP → plan de table.\n4. Tâches d’équipe (assignez le protocole).\n5. Jour J : Protocole + checklist Tâches.',
        links: [
          { label: 'Événements', href: '/dashboard/events' },
          { label: 'Explorer', href: '/dashboard/catalogue' },
        ],
      },
      {
        id: 'setup-room',
        title: 'Configurer une salle 2D / 3D',
        content:
          '1. Salles → Créer.\n2. Structure & plan : Plein pied, Duplex, Villa…\n3. Tables / chaises ; Premium+ pour escaliers et balcons.\n4. Associez à un événement pour le placement.',
        links: [{ label: 'Salles', href: '/dashboard/rooms' }],
      },
      {
        id: 'room-editor-plans',
        title: 'Éditeur de salles selon le forfait',
        content:
          '1. Essentiel — tables.\n2. Business — allées / entrées.\n3. Premium — thèmes, escaliers, balcons.\n4. Complet — + perso.\n5. Le propriétaire monte de niveau dans Facturation.',
        links: [
          { label: 'Salles', href: '/dashboard/rooms' },
          { label: 'FAQ', href: '/faq' },
        ],
      },
      {
        id: 'room-stairs',
        title: 'Escaliers entre étages',
        content:
          'Premium+.\n1. 2 étages minimum.\n2. Escalier vers… → arrivée.\n3. Style / orientation / recalibrer.\n4. Empiler en 3D.',
        links: [{ label: 'Salles', href: '/dashboard/rooms' }],
      },
      {
        id: 'browse-and-quote',
        title: 'Explorer et suivre devis / réservations',
        content:
          '1. Explorer : cherchez salles et prestataires.\n2. Envoyez un devis depuis une fiche.\n3. Demandes de devis → suivi.\n4. Réservations → acompte hors plateforme → confirmation.',
        links: [
          { label: 'Explorer', href: '/dashboard/catalogue' },
          { label: 'Demandes de devis', href: '/dashboard/bookings?tab=quotes' },
          { label: 'Réservations', href: '/dashboard/bookings?tab=bookings' },
        ],
      },
      {
        id: 'invite-guests',
        title: 'Inviter et placer des invités',
        content:
          '1. Invités : ajouter / importer.\n2. Invitations : message + envoi RSVP.\n3. Plan de table ; PDF au « oui ».\n4. Protocole le jour J.',
        links: [{ label: 'Événements', href: '/dashboard/events' }],
      },
      {
        id: 'marketplace-desk',
        title: 'Gérer Mes offres (vendeur)',
        content:
          '1. Mes offres — pas Explorer.\n2. Publiez prestation / location ; salles via Salles.\n3. Traitez devis reçus et réservations (accepter → acompte → confirmer).',
        links: [{ label: 'Mes offres', href: '/dashboard/marketplace' }],
      },
    ],
    tips: [
      'Explorer pour acheter / retenir ; Mes offres pour vendre.',
      'Déléguez le protocole et des tâches avant le jour J.',
      'Escaliers / balcons = Premium+ (forfait de l’organisation).',
      'Commission vendeur ({commissionPercent} %) distincte de l’abonnement.',
    ],
  },
  {
    id: 'org_protocol',
    title: 'Guide Protocole organisation',
    badge: 'Organisation',
    summary:
      'Tableau de bord du jour J, desk Protocole (scan QR + tâches), Explorer / devis / réservations pour le contexte marketplace — sans créer d’événements ni gérer la facturation.',
    canDo: [
      'Tableau de bord : stats du jour, prochaines accueils, tâches assignées',
      'Desk Protocole : liste des événements à accueillir + sous-onglet Tâches',
      'Sur un événement : Accueil (scan QR) | Tâches (checklist)',
      'Explorer le catalogue (comme le client)',
      'Consulter Demandes de devis et Réservations',
      'Statistiques d’accueil (check-in, tâches)',
    ],
    cannotDo: [
      'Créer des événements ou des salles',
      'Gérer l\'équipe ou la facturation',
      'Modifier les modèles d\'invitation globaux',
      'Publier des offres vendeur (Mes offres)',
    ],
    navLinks: [
      { label: 'Tableau de bord', href: '/dashboard' },
      { label: 'Protocole', href: '/dashboard/protocol' },
      { label: 'Tâches', href: '/dashboard/protocol?view=tasks' },
      { label: 'Explorer', href: '/dashboard/catalogue' },
      { label: 'Demandes de devis', href: '/dashboard/bookings?tab=quotes' },
      { label: 'Réservations', href: '/dashboard/bookings?tab=bookings' },
      { label: 'Statistiques', href: '/dashboard/analytics' },
      { label: 'Guide', href: '/dashboard/guide' },
    ],
    workflows: [
      {
        id: 'whats-new',
        title: 'Parcours protocole',
        content:
          '1. Tableau de bord : vue du jour (accueils, check-in, mes tâches).\n2. Menu Protocole : sous-onglets Événements | Tâches.\n3. Sur un événement : Accueil (scan) | Tâches (checklist).\n4. Explorer + Devis + Réservations pour le contexte marketplace.',
        links: [
          { label: 'Tableau de bord', href: '/dashboard' },
          { label: 'Protocole', href: '/dashboard/protocol' },
          { label: 'Explorer', href: '/dashboard/catalogue' },
        ],
      },
      {
        id: 'protocol-scan',
        title: 'Accueillir un invité (scan QR)',
        content:
          '1. Ouvrez Protocole → choisissez l’événement → Accueil.\n2. Autorisez la caméra (ou recherchez par nom).\n3. RSVP confirmé requis.\n4. Confirmez la présence puis le siège si prévu.',
        links: [{ label: 'Ouvrir Protocole', href: '/dashboard/protocol' }],
      },
      {
        id: 'protocol-tasks',
        title: 'Checklist tâches du jour',
        content:
          '1. Protocole → Tâches : vos tâches assignées sur tous les événements.\n2. Ou événement → Tâches : filtre Jour J / À moi.\n3. Démarrer ou Faite.\n4. Retour Accueil pour scanner.',
        links: [
          { label: 'Tâches', href: '/dashboard/protocol?view=tasks' },
          { label: 'Protocole', href: '/dashboard/protocol' },
        ],
      },
      {
        id: 'protocol-marketplace',
        title: 'Consulter devis et réservations',
        content:
          '1. Explorer : fiches salles / prestas liées à l’événement.\n2. Demandes de devis : statut des demandes.\n3. Réservations : dates bloquées / acomptes (info pour l’accueil).',
        links: [
          { label: 'Explorer', href: '/dashboard/catalogue' },
          { label: 'Demandes de devis', href: '/dashboard/bookings?tab=quotes' },
          { label: 'Réservations', href: '/dashboard/bookings?tab=bookings' },
        ],
      },
      {
        id: 'check-guest-list',
        title: 'Vérifier la file d’accueil',
        content:
          '1. Protocole → ouvrez l’événement → Accueil.\n2. Filtrez file / déjà entrés / tous.\n3. Recherchez un nom ou un VIP.',
        links: [{ label: 'Protocole', href: '/dashboard/protocol' }],
      },
    ],
    tips: [
      'Commencez par le Tableau de bord, puis ouvrez Protocole pour le scan.',
      'Testez le scan web avant le jour J.',
      'Les tâches sont dans Protocole → Tâches, pas dans un menu séparé.',
      'Explorer vous aide à connaître les prestataires sur place.',
      'Pas d’app native pour l’instant : tout se fait dans le navigateur.',
    ],
  },
  {
    id: 'org_commercial',
    title: 'Guide Commercial organisation (obsolète)',
    badge: 'Organisation',
    summary:
      'Le réseau commercial interne aux organisations n’est plus proposé. Les commissions de parrainage sont gérées par les commerciaux plateforme EventMaster.',
    canDo: [
      'Consulter éventuellement un historique si votre compte existait déjà',
    ],
    cannotDo: [
      'Créer de nouveaux commerciaux organisation',
      'Accéder aux versements commerciaux org. (fonctionnalité retirée)',
      'Créer des événements ou gérer des invités',
    ],
    navLinks: [{ label: 'Tableau de bord', href: '/dashboard' }],
    workflows: [
      {
        id: 'share-referral',
        title: 'Parrainage',
        content:
          'Le parrainage d’organisations se fait désormais via les commerciaux plateforme EventMaster, pas via un rôle commercial dans votre équipe.',
        links: [{ label: 'Tableau de bord', href: '/dashboard' }],
      },
    ],
    tips: [
      'Contactez le support si vous aviez un historique de commissions org. à clarifier.',
    ],
  },
  {
    id: 'staff_scope',
    title: 'Guide Manager / Protocole salle ou événement',
    badge: 'Périmètre restreint',
    summary:
      'Vous êtes assigné à des salles ou événements précis. Manager = gestion locale ; Protocole = accueil + tâches. Les menus Explorer / devis / réservations peuvent être visibles selon l’organisation.',
    canDo: [
      'Manager : invités, infos pratiques, feed sur votre périmètre',
      'Protocole : scan QR, check-in, tâches dans Événements',
      'Consulter plan de salle et statistiques de vos événements',
    ],
    cannotDo: [
      'Créer de nouveaux événements ou salles (sauf manager org.)',
      'Gérer l\'équipe ou la facturation',
      'Voir les événements hors affectation',
    ],
    navLinks: [
      { label: 'Événements', href: '/dashboard/events' },
      { label: 'Protocole', href: '/dashboard/protocol' },
      { label: 'Tâches', href: '/dashboard/protocol?view=tasks' },
      { label: 'Statistiques', href: '/dashboard/analytics' },
      { label: 'Guide', href: '/dashboard/guide' },
    ],
    workflows: [
      {
        id: 'find-assignment',
        title: 'Identifier votre périmètre',
        content:
          '1. Protocole : vos événements assignés (liste + tâches).\n2. Accueil pour le scan QR.\n3. Tâches pour la checklist.\n4. Demandez une affectation au manager org. si la liste est vide.',
        links: [{ label: 'Protocole', href: '/dashboard/protocol' }],
      },
      {
        id: 'staff-day-of',
        title: 'Jour J — protocole',
        content:
          '1. Ouvrez Protocole → événement → Accueil.\n2. Scannez ou recherchez l’invité.\n3. Confirmez présence / siège.\n4. Cochez vos tâches dans l’onglet Tâches.',
        links: [
          { label: 'Protocole', href: '/dashboard/protocol' },
          { label: 'Tâches', href: '/dashboard/protocol?view=tasks' },
        ],
      },
    ],
    tips: [
      'Rôle = affectation salle/événement.',
      'Tâches = sous-onglet Protocole.',
      'Scan dans le navigateur uniquement pour l’instant.',
    ],
  },
  {
    id: 'client',
    title: 'Guide Client marketplace',
    badge: 'Client',
    summary:
      'Vous cherchez une salle, un prestataire ou un événement public. Menu : Marketplace (Explorer), Agenda, billets, Demandes de devis et Réservations (séparés). Pour organiser ou publier, changez le type de compte dans Mon compte.',
    canDo: [
      'Explorer salles, prestataires, locations et événements (filtres, carte, grille / liste)',
      'Agenda : s’inscrire ou acheter un billet',
      'Favoris, packs budget, partage d’URL',
      'Suivre Demandes de devis et Réservations dans deux menus distincts',
      'Mes billets + badge QR',
      'Passer organisateur / prestataire depuis Mon compte',
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
      { label: 'Demandes de devis', href: '/dashboard/bookings?tab=quotes' },
      { label: 'Réservations', href: '/dashboard/bookings?tab=bookings' },
      { label: 'Guide utilisateur', href: '/dashboard/guide' },
      { label: 'Mon compte', href: '/dashboard/profile' },
    ],
    workflows: [
      {
        id: 'whats-new-client',
        title: 'Nouveautés menu',
        content:
          '1. Demandes de devis et Réservations sont deux entrées séparées (plus un seul « Devis & réservations »).\n2. Marketplace = Explorer / Favoris / Préparer / Packs.\n3. Agenda = événements publics uniquement.',
        links: [
          { label: 'Demandes de devis', href: '/dashboard/bookings?tab=quotes' },
          { label: 'Réservations', href: '/dashboard/bookings?tab=bookings' },
        ],
      },
      {
        id: 'explore-favorites',
        title: 'Explorer et enregistrer des favoris',
        content:
          '1. Ouvrez Marketplace.\n2. Onglet Explorer : filtrez par mot-clé, ville, commune, type (salles / prestataires / locations / événements), prestataire ou location (habits, véhicules, matériel), prix, places.\n3. Passez en grille, liste, carte ou Focus (plein écran). Les pastilles indiquent Salle, Presta, Loc. ou Évén.\n4. Cliquez sur le cœur d’une salle, d’un prestataire ou d’une location.\n5. Onglet Favoris : filtrez salles / prestataires / locations et changez la vue.\n6. Bouton Partager : copie l’URL actuelle, avec vos filtres.',
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
          'À quoi ça sert : vous donnez un budget max et ce dont vous avez besoin. EventMaster propose 3 packs (économique, équilibré, confort) qui tiennent dans l’enveloppe — salle et prestataires déjà combinés. Rien n’est réservé : vous comparez, puis contactez.\n\nCas d’usage — Marie, mariage à Kinshasa, 100 invités, 1 500 000 FC :\n1. Onglet Préparer un événement.\n2. (Facultatif) ouvrez « Exemple — mariage à Kinshasa » et cliquez Appliquer cet exemple.\n3. Budget max = 1 500 000 FC. Marge 5 % = 75 000 FC de réserve ; la recherche porte sur 1 425 000 FC. Les pourcentages (salle 38 %, traiteur 28 %…) s’affichent aussi en francs.\n4. Ville Kinshasa, 100 invités, date. Salle obligatoire. Prestataires : un clic = obligatoire → si ça rentre → exclu.\n5. Lancez la recherche, comparez les 3 packs (chaque barre montre le montant exact). Élargissez un poste manquant ou figez une ligne puis relancez.\n6. Sauvegardez le brief et/ou le pack dans Mes packs, puis envoyez un devis depuis une fiche.',
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
          '1. Ouvrez une fiche (Explorer, Favoris, Agenda ou pack).\n2. Envoyez un devis ou une demande de date.\n3. Suivez dans Demandes de devis.\n4. Après acceptation, versez l’acompte ({depositPercent} %) hors EventMaster.\n5. Suivez dans Réservations.',
        links: [
          { label: 'Marketplace', href: '/dashboard/catalogue' },
          { label: 'Demandes de devis', href: '/dashboard/bookings?tab=quotes' },
          { label: 'Réservations', href: '/dashboard/bookings?tab=bookings' },
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
      'Devis et Réservations = deux menus pour y voir plus clair.',
      'Compte client : pas de licence SaaS.',
      'Marge du brief = montant (ex. 5 % de 1 500 000 FC).',
      'Les 3 packs évitent de recycler la même salle si le catalogue le permet.',
      'Agenda du menu = marketplace client événements.',
      'Commission vendeur ({commissionPercent} %) : vous ne la payez pas en client.',
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
