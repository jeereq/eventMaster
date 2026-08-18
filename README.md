# EventMaster SaaS — Plateforme multi-tenant d’événements et de marketplace

EventMaster est une plateforme SaaS multi-tenant pour organiser un événement **et** trouver salle / prestataires en RDC. Chaque organisation a son espace isolé. Le cycle couvre invitations et RSVP, plan de table 2D, protocole QR le jour J, marketplace (favoris, packs budget, réservations de dates) et facturation par forfait. L’application mobile native est en construction : RSVP, protocole et tableau de bord fonctionnent déjà dans le navigateur, y compris sur téléphone.

---

## 1. Architecture Globale

L'application est découpée en **trois entités distinctes** :

- **Backend (backend/)** :
  - Serveur Node.js + Express développé entièrement en TypeScript.
  - Persistance Prisma / PostgreSQL (événements, salles, marketplace, packs, favoris).
  - Authentification JWT + OTP (e-mail / WhatsApp), rôles RBAC par organisation.
  - Forfaits et quotas en base ; demandes d’abonnement / factures PDF ; Stripe (dont mode simulation en dev).
  - Marketplace : fiches salles/prestas, devis, réservations de dates, commission vendeur 8 %.

- **Frontend (frontend/)** :
  - Next.js (App Router), Tailwind CSS, Lucide React.
  - Landing, catalogue public, dashboard organisateur / prestataire / client, portail RSVP, protocole web.
  - Contexte d’auth et d’organisation (multi-tenant).

- **Mobile (mobile/)** :
  - React Native + Expo (TypeScript), même API REST.
  - En construction / pas encore déployée sur les stores. Feuille de route : `mobile/PLAN.md`.

### Documentation

| Document | Description |
|----------|-------------|
| [`docs/ANALYSE-FLUX-PLATEFORME.md`](docs/ANALYSE-FLUX-PLATEFORME.md) | Analyse détaillée des flux métier implémentés |
| [`docs/EventMaster-Analyse-Flux.pdf`](docs/EventMaster-Analyse-Flux.pdf) | Version PDF designée (7 pages) |
| [`docs/PLATEFORME_RECAPITULATIF.md`](docs/PLATEFORME_RECAPITULATIF.md) | Récapitulatif plateforme |
| [`docs/EventMaster-Plateforme-Fonctionnalites.pdf`](docs/EventMaster-Plateforme-Fonctionnalites.pdf) | Brochure fonctionnalités (8 pages) |

Génération PDF : `cd backend && npm run generate:flows-pdf` ou `npm run generate:platform-pdf`

---

## 2. Structure du Code

```
eventmaster/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma        # Schéma de base de données relationnel
│   │   └── migrations/          # Migrations SQL de la base
│   ├── src/
│   │   ├── controllers/         # Auth, Events, Guests, Templates, Billing, RSVP, Marketplace
│   │   ├── middleware/          # JWT, RBAC, licence
│   │   ├── routes/              # Endpoints REST
│   │   ├── services/            # Packs événement, commissions, notifications, PDF
│   │   ├── db.ts
│   │   └── index.ts
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── src/
│   │   ├── app/                 # Pages (Next.js App Router)
│   │   │   ├── dashboard/       # Org, prestataire (desk), client (catalogue, résas)
│   │   │   ├── marketplace/     # Catalogue public
│   │   │   ├── login/
│   │   │   ├── register/
│   │   │   └── rsvp/[guestId]/  # Portail RSVP public
│   │   ├── components/          # Landing, catalogue, desk marketplace, UI
│   │   ├── config/              # Guides, FAQ, tarifs landing
│   │   ├── context/
│   │   └── lib/
│   ├── package.json
│   └── tsconfig.json
│
└── mobile/
    ├── App.tsx                  # Point d'entrée Expo
    ├── src/
    │   ├── config/              # Variables d'environnement
    │   └── lib/                 # Client API (JWT + SecureStore)
    ├── PLAN.md                  # Feuille de route mobile (phases 0–6)
    ├── app.json                 # Configuration Expo
    └── package.json
```

---

## 3. Isolation Multi-tenant & Sécurité

1. **Création d'Organisation (Tenant)** :
   Lorsqu'un utilisateur s'enregistre, le backend crée de manière atomique (transaction Prisma) une entité Tenant avec le nom de son organisation, ainsi qu'un utilisateur avec le rôle USER associé à ce tenantId.

2. **Middleware d'Authentification (requireAuth)** :
   Le middleware extrait le jeton JWT envoyé dans les en-têtes HTTP de chaque requête. Ce jeton contient l'ID utilisateur, son rôle et son tenantId associé. Ces informations sont injectées dans la requête (req.user).

3. **Filtrage des Données** :
   Les requêtes métier (événements, invités, salles, offres marketplace) filtrent par `tenantId`. Un compte **client** n’a pas de licence SaaS : il explore le catalogue, enregistre des favoris et prépare des packs, sans créer d’événements.

---

## 4. Fonctionnalités Core Implémentées

- **Types de compte** : organisateur, prestataire / salles, les deux, ou **client marketplace** (sans abo SaaS).
- **Dashboard** : quotas selon le forfait (Essentials, Particulier, Business / Premium / Enterprise, Salle, Prestataire, Salle & presta).
- **Événements & invités** : CRUD, import CSV, catégories, plan de table 2D, protocole QR (scan dans le navigateur).
- **Invitations & RSVP** : concepteur visuel, e-mail / WhatsApp, portail public, badge QR. PDF / plan / GPS partent **dès acceptation RSVP** (si place assignée, Premium 1+), pas à l’envoi de l’invitation.
- **Marketplace** :
  - Catalogue public et hub client (`/dashboard/catalogue`) : explorer, **favoris** (grille / liste), **préparer un événement** (budget min. 50 000 FC → 3 packs distincts éco / équilibré / confort), packs sauvegardés.
  - Desk prestataire (`/dashboard/marketplace`) : prestations (pagination, vues grille / liste), **demandes** (contact, conversion), **réservations** (Demande → Acceptée → Acompte hors plateforme 30 % → Confirmée). Commission vendeur **8 %**, distincte de l’abonnement.
- **Facturation** : demandes de forfait, factures PDF, Stripe + simulation en développement.

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

### Étape 4 : Configuration du Mobile (optionnel)
1. Naviguez dans le dossier mobile :
   ```bash
   cd ../mobile
   ```
2. Copiez les variables d'environnement :
   ```bash
   cp .env.example .env
   ```
3. Lancez Expo :
   ```bash
   npm start
   ```
4. Consultez `mobile/PLAN.md` pour la feuille de route complète (auth, RSVP, protocole QR).

---

## 6. Processus de Test Recommandé

1. **Création d’un compte** : http://localhost:3000/register — organisateur, prestataire, ou client (je cherche une salle / un presta).
2. **Organisateur** : tableau de bord Essentials (gratuit) → quotas visibles → Facturation pour un forfait payant (simulation possible en local).
3. **Événement** : Événements → créer → invités (saisie ou CSV) → Modèles → invitation → diffusion. Le lien RSVP ne contient pas encore PDF/GPS.
4. **RSVP** : ouvrir un lien généré, confirmer, vérifier que le badge QR apparaît ; avec place assignée (Premium+), PDF / plan / GPS partent à l’acceptation.
5. **Client marketplace** : Marketplace du dashboard → Explorer / Favoris / Préparer un événement (budget + type) → sauvegarder un pack → Mes réservations.
6. **Prestataire** : Marketplace → Prestations (grille ou liste) → publier → Demandes (contacter / convertir) → Réservations (accepter → marquer l’acompte 30 % hors plateforme → confirmer).
7. **Jour J** : mode Protocole, scan QR dans le navigateur.
