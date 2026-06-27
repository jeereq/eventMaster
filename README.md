# EventMaster SaaS - Plateforme SaaS Multi-tenant de Gestion d'Événements Privés

EventMaster est une solution logicielle complète en modèle SaaS (Software as a Service) Multi-tenant, conçue pour l'organisation et la gestion d'événements privés. Elle garantit un cloisonnement strict des données entre organisations, propose un éditeur visuel de templates interactif et permet aux invités de répondre via un portail RSVP public personnalisé.

---

## 1. Architecture Globale

L'application est découpée en deux entités distinctes :

- **Backend (backend/)** :
  - Serveur Node.js + Express développé entièrement en TypeScript.
  - Gestion de la persistance via Prisma ORM connecté à une base de données relationnelle PostgreSQL.
  - Authentification sécurisée par jetons JWT (JSON Web Tokens) avec gestion des rôles (RBAC).
  - Gestion des abonnements et quotas via Stripe (incluant un mode simulation "Mock" idéal pour le développement).

- **Frontend (frontend/)** :
  - Application moderne basée sur le framework Next.js (React) avec l'App Router.
  - Interface soignée réalisée à l'aide de Tailwind CSS et de la bibliothèque d'icônes Lucide React.
  - Gestion d'état unifiée pour l'authentification et le contexte d'organisation (Multi-tenant).

---

## 2. Structure du Code

```
eventmaster/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma        # Schéma de base de données relationnel
│   │   └── migrations/          # Migrations SQL de la base
│   ├── src/
│   │   ├── controllers/         # Logique métier (Auth, Events, Guests, Templates, Billing, RSVP)
│   │   ├── middleware/          # Protection d'API (Authentification JWT et RBAC)
│   │   ├── routes/              # Déclaration des endpoints REST
│   │   ├── db.ts                # Instanciation globale du client Prisma
│   │   └── index.ts             # Fichier principal d'initialisation d'Express
│   ├── package.json
│   └── tsconfig.json
│
└── frontend/
    ├── src/
    │   ├── app/                 # Pages (Next.js App Router)
    │   │   ├── dashboard/       # Interface privée d'administration
    │   │   ├── login/           # Formulaire de connexion
    │   │   ├── register/        # Formulaire de création de compte SaaS (Tenant automatique)
    │   │   └── rsvp/[guestId]/  # Portail RSVP public personnalisé d'un invité
    │   ├── context/             # Contexte d'authentification et d'organisation
    │   └── lib/                 # Service d'appel API d'envoi et d'authentification
    ├── package.json
    └── tsconfig.json
```

---

## 3. Isolation Multi-tenant & Sécurité

1. **Création d'Organisation (Tenant)** :
   Lorsqu'un utilisateur s'enregistre, le backend crée de manière atomique (transaction Prisma) une entité Tenant avec le nom de son organisation, ainsi qu'un utilisateur avec le rôle USER associé à ce tenantId.

2. **Middleware d'Authentification (requireAuth)** :
   Le middleware extrait le jeton JWT envoyé dans les en-têtes HTTP de chaque requête. Ce jeton contient l'ID utilisateur, son rôle et son tenantId associé. Ces informations sont injectées dans la requête (req.user).

3. **Filtrage des Données** :
   Chaque requête vers la base de données (Événements, Invités, Modèles, Invitations) filtre systématiquement les opérations en ajoutant une contrainte where: { tenantId }. Aucune organisation ne peut lire ou écrire des données d'un autre tenant.

---

## 4. Fonctionnalités Core Implémentées

- **Dashboard Global** : Suivi en temps réel des quotas (nombre d'événements, total d'invités, modèles d'invitations créés) selon le plan actif (FREE, PREMIUM, ENTERPRISE).
- **Gestion d'Événements** : Création, modification et suppression d'événements (Titre, description, date, lieu).
- **Gestion des Invités** :
  - Ajout unitaire d'un invité (Nom, Prénom, Email, Catégorie).
  - Importation groupée rapide en collant des lignes au format CSV : Prénom, Nom, Email, Catégorie.
- **Modèles d'Invitations (Drag and Drop Editor)** :
  - Un designer visuel permet de concevoir une invitation en ajoutant des composants (Titre, texte, bouton RSVP, champs de saisie de préférences).
  - Sérialisation automatique du canevas au format JSON pour être persisté dans la base PostgreSQL.
- **Diffusion et RSVP** :
  - Outil de génération d'envois personnalisés remplaçant les variables dynamiques (firstName, lastName, rsvpLink).
  - Simulation de diffusion qui génère des liens d'invitations individuels sécurisés pour chaque invité.
  - **Portail RSVP Public** : L'invité clique sur son lien, accède à l'invitation stylisée et peut confirmer ou décliner sa présence, choisir son menu (végétarien, halal, etc.) et lister ses allergies alimentaires en temps réel.
- **Modèle Économique & Stripe** :
  - Intégration de Stripe pour la souscription d'abonnements récurrents et la facturation.
  - En mode de développement local, un système de simulation ("Mock Upgrade") permet d'augmenter/diminuer instantanément le niveau d'abonnement en un clic depuis le dashboard pour tester la levée des quotas en temps réel.

---

## 5. Guide de Démarrage en Développement

### Étape 1 : Prérequis
- Node.js (version 18 ou supérieure recommandée)
- Un serveur PostgreSQL actif ou disponible via une URL de connexion externe

### Étape 2 : Configuration du Backend
1. Naviguez dans le dossier backend :
   ```bash
   cd backend
   ```
2. Créez un fichier .env à la racine de backend/ et configurez vos variables (le fichier est déjà initialisé avec des valeurs de démo) :
   ```env
   DATABASE_URL="postgresql://utilisateur:mot_de_passe@localhost:5432/nom_de_bdd?schema=public"
   JWT_SECRET="cle_secrete_super_robuste_pour_signature_jwt"
   PORT=5001
   STRIPE_SECRET_KEY="votre_cle_stripe_test"
   STRIPE_WEBHOOK_SECRET="votre_secret_webhook_stripe"
   ```
3. Appliquez les migrations Prisma de votre schéma à la base PostgreSQL :
   ```bash
   npx prisma db push
   ```
4. Lancez le serveur de développement :
   ```bash
   npm run dev
   ```
   Le serveur démarrera sur http://localhost:5001.

### Étape 3 : Configuration du Frontend
1. Naviguez dans le dossier frontend :
   ```bash
   cd ../frontend
   ```
2. Lancez le serveur Next.js en développement :
   ```bash
   npm run dev
   ```
   L'application démarrera sur http://localhost:3000.

---

## 6. Processus de Test Recommandé

1. **Création d'un Tenant** : Accédez à http://localhost:3000/register et créez une organisation (ex. "Agence Prestige").
2. **Dashboard initial** : Vous êtes redirigé vers le tableau de bord avec le plan gratuit (FREE). Vous constatez vos quotas restreints (max 3 événements, max 50 invités).
3. **Mise à niveau** : Accédez à l'onglet "Facturation & Plan" et cliquez sur "Activer le Plan Premium". Le système simule l'autorisation de paiement et déverrouille instantanément vos limites.
4. **Création d'événement** : Allez dans "Événements" et créez votre premier événement privé.
5. **Ajout d'invités** : Cliquez sur "Gérer les invités" de l'événement. Ajoutez des invités manuellement ou copiez-collez du texte CSV pour les importer en bloc.
6. **Designer de Template** : Allez dans "Modèles", cliquez sur "Nouveau modèle", concevez votre carte d'invitation avec les boutons RSVP à l'aide de l'éditeur interactif, puis sauvegardez.
7. **Création d'Invitation** : Retournez sur votre Événement, ongle "Invitations & Diffusion". Créez une invitation, sélectionnez votre modèle créé et saisissez le corps du message.
8. **Envoi & RSVP** : Cliquez sur "Simuler la Diffusion". Un pop-up s'ouvre avec l'ensemble des liens d'invitations individuels générés pour vos invités. Cliquez sur l'un d'eux pour ouvrir le portail RSVP public. Confirmez la présence de l'invité et saisissez ses préférences. De retour sur votre tableau de bord d'événement, les statistiques se mettent à jour instantanément (Confirmés, Déclinés, En attente) !
