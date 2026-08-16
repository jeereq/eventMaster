# EventMaster — Document récapitulatif plateforme

> **Version** : juillet 2026  
> **Public** : équipe produit, commerciaux, support et partenaires  
> **Monorepo** : `backend/` · `frontend/` · `mobile/`

📄 **Brochure PDF designée** : [`EventMaster-Plateforme-Fonctionnalites.pdf`](./EventMaster-Plateforme-Fonctionnalites.pdf)  
📄 **Analyse des flux (PDF)** : [`EventMaster-Analyse-Flux.pdf`](./EventMaster-Analyse-Flux.pdf) · [markdown](./ANALYSE-FLUX-PLATEFORME.md)

Pour régénérer les PDF :

```bash
cd backend && npm run generate:platform-pdf
cd backend && npm run generate:flows-pdf
```

---

## 1. Vision produit

EventMaster est une plateforme SaaS **multi-tenant** dédiée à l'organisation d'événements privés et professionnels en République Démocratique du Congo et au-delà. Elle couvre l'intégralité du cycle événementiel :

| Phase | Capacités |
|-------|-----------|
| **Conception** | Salles 2D, modèles d'invitation visuels, consignes invités |
| **Diffusion** | E-mail, WhatsApp, liens RSVP personnalisés |
| **Réponse** | Portail invité web + mobile, formulaires analytiques |
| **Jour J** | Protocole QR (web + app native), check-in, validation siège |
| **Post-événement** | Fil d'actualité, livre d'or, rapports, facturation |

---

## 2. Architecture technique

```
eventmaster/
├── backend/          Node.js + Express + TypeScript + Prisma (PostgreSQL) — port 5001
├── frontend/         Next.js (App Router) + Tailwind CSS — port 3000
└── mobile/           React Native + Expo SDK 57 — port 8081 (dev)
```

| Couche | Technologies clés |
|--------|-------------------|
| Authentification | JWT, OTP e-mail/WhatsApp, RBAC granulaire |
| Notifications | UltraMsg (WhatsApp), SMTP (e-mail), Expo Push (mobile) |
| Stockage fichiers | Cloudinary (PDF invitations, images) |
| Paiements | Stripe + mode simulation développement |
| CI/CD mobile | GitHub Actions + EAS Build |

**Isolation multi-tenant** : chaque organisation (`Tenant`) possède un espace strictement cloisonné. Toutes les requêtes API filtrent par `tenantId`.

---

## 3. Fonctionnalités par module

### 3.1 Backend (`backend/`)

| Domaine | Fonctionnalités |
|---------|-----------------|
| **Auth & équipe** | Inscription org., OTP, rôles (owner, manager, protocole, commercial…) |
| **Événements** | CRUD, quotas, guidelines invités, coordonnées GPS |
| **Invités** | Import CSV, RSVP, préférences, badge QR |
| **Invitations** | Envoi multi-canal, variables dynamiques, templates |
| **Salles & plans** | Éditeur 2D, fixtures, thèmes, placement drag-and-drop |
| **Protocole** | Scan QR, check-in, verify-seat, notes protocole |
| **Livraison placement** | PDF + plan + GPS **après validation invité** (`guestPlacementDeliveryService`) |
| **Commercial** | Parrainage, commissions 20 %, espaces dédiés |
| **Facturation** | Forfaits en BD (`SubscriptionPlan`), demandes d'upgrade, factures PDF |
| **Push mobile** | Modèle `PushDeviceToken`, service Expo Push |

### 3.2 Frontend web (`frontend/`)

| Espace | Contenu |
|--------|---------|
| **Landing page** | Hero, parcours invité, mobile, rôles, modèles, tarifs, FAQ |
| **Dashboard** | Événements, invités, modèles, salles, analytics, facturation |
| **Concepteur visuel** | Éditeur drag-and-drop invitations + OCR maquette (Premium 2+) |
| **Portail RSVP** | Invitation stylisée, formulaire, badge QR, plan de table (post check-in) |
| **Protocole web** | Scan caméra navigateur, confirmation présence |
| **Pages légales** | CGU, confidentialité, contact, FAQ |

### 3.3 Application mobile (`mobile/`)

| Phase | Statut | Livrables |
|-------|--------|-----------|
| **Phase 0–1** Auth | ✅ | Login, register, OTP, SecureStore JWT |
| **Phase 2** RSVP invité | ✅ | Deep link, badge QR, plan table, PDF |
| **Phase 3** Organisateur | ✅ | Événements, invités, stats, notifications in-app |
| **Phase 4** Protocole | ✅ | Scan caméra natif, check-in, verify-seat |
| **Phase 5** Polish | ✅ (partiel) | Push, deep links, thème sombre, EAS config |
| **Phase 6** Stores | ✅ (préparation) | Checklist soumission, listings FR, CI EAS |

**Deep links** :
- `eventmaster://rsvp/:guestId`
- `eventmaster://event/:id`
- `eventmaster://protocol/:eventId`

**Compte seed** : `demo@novaevents.cd` / `password123`

---

## 4. Parcours invité — règle métier clé (2026)

EventMaster distingue **l'invitation RSVP** de la **livraison sensible** (placement, PDF, GPS).

```
┌─────────────────┐    ┌──────────────┐    ┌─────────────────┐    ┌──────────────────────┐
│ 1. Invitation   │───▶│ 2. RSVP      │───▶│ 3. Check-in     │───▶│ 4. Livraison auto.   │
│ Lien RSVP seul  │    │ Badge QR     │    │ Scan protocole  │    │ PDF + plan + GPS WA  │
│ (Email / WA)    │    │ Portail web  │    │ Web ou mobile   │    │ Email / WhatsApp     │
└─────────────────┘    └──────────────┘    └─────────────────┘    └──────────────────────┘
```

| Moment | PDF | Plan de table | GPS WhatsApp | Carte web RSVP |
|--------|-----|---------------|--------------|----------------|
| Envoi invitation | ❌ | ❌ | ❌ | ❌ (texte lieu seul) |
| Rappel RSVP | ❌ | ❌ | ❌ | ❌ |
| Après check-in / verify-seat | ✅ | ✅ | ✅ | ✅ |

**Services impliqués** :
- `guestPlacementDeliveryService.ts` — orchestration post-validation
- `guestSeatNotificationService.ts` — envoi WA/e-mail + PDF + location
- `guestPlacementAccess.ts` — `canGuestAccessPlacement()` (checkedInAt || seatVerified)

---

## 5. Forfaits & tarification

| Forfait | Prix mensuel | Événements | Invités | Points clés |
|---------|-------------|------------|---------|-------------|
| **Essentials** (FREE) | 0 FC | 3 | 50 | RSVP, portail, 2 modèles |
| **Business** (STANDARD) | 30 000 FC | 8 | 150 | Protocole QR, 3 salles, app mobile |
| **Premium 1** | 55 000 FC | 12 | 500 | Modèles custom, RSVP analytique, notifications placement |
| **Premium 2** | 85 000 FC | 20 | 1 000 | OCR, verify-seat, livraison différée PDF+GPS |
| **Enterprise 1** | 350 000 FC | 40 | 3 500 | Rapports, export, support prioritaire |
| **Enterprise 2** | 525 000 FC | 70 | 5 000 | Réseau commercial 20 % |
| **Enterprise 3** | 700 000 FC | Illimité | Illimité | Multi-agences, SLA 24/7 |

- Facturation **annuelle** : −10 % sur le prix mensuel affiché
- Tarifs synchronisés avec l'API publique `/public/plans` sur la landing page

---

## 6. Rôles & permissions

| Rôle | Périmètre | Créer événement/salle |
|------|-----------|----------------------|
| Propriétaire / Manager org. | Toute l'organisation | Oui |
| Protocole org. | Invités (tous événements) | Non |
| Manager salle | Événements de la salle | Non |
| Protocole événement | Invités de l'événement | Non |
| Commercial | Organisations parrainées | N/A |

---

## 7. Mises à jour landing page (juillet 2026)

### Contenu ajouté / modifié

1. **Hero** — mention app mobile, livraison placement intelligente
2. **Section Parcours invité** (`#parcours`) — 4 étapes visuelles + bandeau livraison auto
3. **Section Mobile** (`#mobile`) — iOS/Android, protocole, push, deep links
4. **Piliers plateforme** — 7 piliers dont « Application mobile native »
5. **Tableau comparatif** — lignes Mobile (app, scan QR, push) + livraison différée
6. **FAQ** — 2 nouvelles entrées (app mobile, timing PDF/GPS)
7. **Footer** — fonctionnalités mises à jour

### Fichiers modifiés

| Fichier | Rôle |
|---------|------|
| `frontend/src/app/page.tsx` | Page d'accueil |
| `frontend/src/config/siteContent.ts` | FAQ, footer |
| `frontend/src/config/landingPricing.ts` | Tarifs, piliers, comparaison |
| `frontend/src/components/landing/LandingWorkflowSection.tsx` | Parcours invité |
| `frontend/src/components/landing/LandingMobileSection.tsx` | Vitrine mobile |
| `frontend/src/components/landing/LandingRolesSection.tsx` | Grille piliers |

---

## 8. Contact & support

| Canal | Détail |
|-------|--------|
| E-mail | mingandajeereq@gmail.com |
| Téléphone / WhatsApp | +243 817 125 577 |
| Adresse | Boulevard du 30 Juin, Gombe, Kinshasa, RDC |
| Horaires | Lun–Sam, 8h–20h (heure de Kinshasa) |

---

## 9. Prochaines étapes recommandées

| Priorité | Action |
|----------|--------|
| 🔴 Haute | Soumission App Store / Play Store (builds EAS production) |
| 🟡 Moyenne | Tests E2E mobile (Detox ou Maestro) |
| 🟡 Moyenne | Acceptation CGU mobile (`/auth/legal-status`) |
| 🟢 Basse | Package `@eventmaster/shared` pour types communs web/mobile |
| 🟢 Basse | Mode hors-ligne partiel protocole (cache invités) |

---

## 10. Démarrage rapide développement

```bash
# Backend
cd backend && npm install && npm run dev          # → :5001

# Frontend
cd frontend && npm install && npm run dev         # → :3000

# Mobile
cd mobile && npm install && cp .env.example .env && npm start
```

**URLs** :
- Landing : http://localhost:3000
- Dashboard : http://localhost:3000/dashboard
- API health : http://localhost:5001/api/health

---

*Document généré automatiquement à partir de l'état du monorepo EventMaster — juillet 2026.*
