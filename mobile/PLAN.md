# EventMaster Mobile — Plan d'actions

Application React Native + Expo consommant l'API REST existante (`backend/`).  
Complète le frontend web (`frontend/`) sans dupliquer la logique métier côté serveur.

---

## Objectifs produit

| Persona | Usage mobile prioritaire |
|---------|--------------------------|
| **Organisateur** (owner, manager) | Consulter événements, invités, RSVP, stats ; notifications |
| **Protocole** | Scan QR, confirmation de présence, recherche invité (jour J) |
| **Invité** | RSVP, badge QR, plan de table, fil d'actualité |
| **Commercial org.** | Parrainage, commissions (lecture seule) |

---

## Architecture cible

```
mobile/
├── app/                    # Expo Router (navigation fichier)
│   ├── (auth)/             # login, register, forgot-password
│   ├── (guest)/            # portail RSVP invité (deep link /rsvp/:id)
│   ├── (app)/              # dashboard authentifié
│   │   ├── events/
│   │   ├── protocol/       # scan caméra natif
│   │   └── analytics/
│   └── _layout.tsx
├── src/
│   ├── lib/api.ts          # client HTTP + JWT (SecureStore)
│   ├── context/            # AuthContext, EventContext
│   ├── hooks/              # useEvents, useGuests, useProtocolScan
│   ├── components/         # UI réutilisable
│   ├── types/              # types partagés (alignés backend)
│   └── config/             # env, constantes, couleurs
├── assets/
├── app.json
└── .env.example
```

**Stack recommandée**

| Couche | Choix |
|--------|--------|
| Navigation | Expo Router v4 |
| Auth token | `expo-secure-store` |
| HTTP | `fetch` natif (comme le web) |
| Scan QR | `expo-camera` + `expo-barcode-scanner` |
| Formulaires | React Hook Form + Zod |
| État serveur | TanStack Query (React Query) |
| Notifications push | Expo Notifications (phase 4) |

---

## Phases d'implémentation

### Phase 0 — Fondations (Semaine 1) ✅

- [x] Initialiser le projet Expo TypeScript (`mobile/`)
- [x] Configurer `app.json` (nom EventMaster, scheme deep link `eventmaster://`)
- [x] Ajouter Expo Router + structure `app/`
- [x] Client API (`src/lib/api.ts`) avec `EXPO_PUBLIC_API_URL`
- [x] Stockage sécurisé du JWT (`expo-secure-store`)
- [x] Écran splash + écran d'accueil minimal
- [x] Documenter le démarrage dans `README.md`

**Livrable** : app qui démarre, appelle `GET /api/auth/profile` après login.

---

### Phase 1 — Authentification (Semaine 2) ✅

- [x] Écrans : Login, Register, OTP, Mot de passe oublié
- [x] `AuthContext` (login, logout, refresh profile, rôles RBAC)
- [x] Redirection selon rôle (organisateur vs protocole vs commercial)
- [ ] Acceptation CGU / confidentialité (`/auth/legal-status`) — phase ultérieure
- [x] Gestion erreurs réseau (backend hors ligne)

**API utilisées**

- `POST /auth/login`
- `POST /auth/register`
- `POST /auth/verify-otp`
- `GET /auth/profile`

---

### Phase 2 — Invité & RSVP (Semaine 3) ✅

Priorité : parcours invité sans compte (deeplink depuis e-mail / WhatsApp).

- [x] Route `app/rsvp/[guestId]` (Expo Router)
- [x] Affichage invitation + détails événement
- [x] Formulaire RSVP (accept / decline + champs custom)
- [x] Badge QR de confirmation de présence
- [x] Plan de table + voisins
- [x] Infos invités (tenue, recommandations)
- [x] Téléchargement PDF invitation
- [x] Deep link `eventmaster://rsvp/:guestId`
- [x] Liste des autres invitations du même invité

**API utilisées**

- `GET /rsvp/:guestId`
- `PUT /rsvp/:guestId`
- `GET /rsvp/:guestId/invitations`

---

### Phase 3 — Organisateur (Semaines 4–5) ✅

- [x] Liste événements (`GET /events`)
- [x] Détail événement + parcours guidé (`eventWorkflow.ts`)
- [x] Liste invités + filtres RSVP
- [x] Consultation invitations (lecture)
- [x] Statistiques RSVP (agrégation locale)
- [x] Notifications in-app (`GET /notifications`)
- [x] Navigation par onglets (Accueil, Événements, Alertes)

**Hors scope mobile v1** (rester sur le web)

- Éditeur visuel de modèles
- Concepteur de salle 2D / plan de table drag-and-drop
- Facturation / changement de forfait

---

### Phase 4 — Protocole jour J (Semaine 6) ✅

Fonctionnalité clé différenciante sur mobile.

- [x] Sélection événement du jour (depuis liste / détail événement)
- [x] Scanner QR natif (`expo-camera` + `CameraView`)
- [x] Appel `POST /events/:eventId/protocol/scan` + `check-in` + `verify-seat`
- [x] Recherche manuelle invité (URL RSVP ou ID)
- [x] Affichage placement (table, siège)
- [x] Feedback visuel succès / erreur (`Alert`)
- [x] Accès protocole-only (redirection directe vers écran protocole)
- [ ] Mode hors-ligne partiel (cache liste invités — optionnel)

**Fichiers**

- `app/(app)/protocol/[eventId].tsx`
- `src/components/protocol/QrScanner.tsx`
- `src/lib/protocolApi.ts`
- `src/types/protocol.ts`

**API utilisées**

- `GET /events/:eventId/protocol/guests`
- `POST /events/:eventId/protocol/scan`
- `POST /events/:eventId/guests/:guestId/check-in`
- `POST /events/:eventId/guests/:guestId/verify-seat`
- `POST /events/:eventId/guests/:guestId/protocol-notes`
- `GET /billing/plan-features` (vérification forfait `protocolQr`)

---

### Phase 5 — Notifications & polish (Semaine 7) ✅ (partiel)

- [x] Push notifications (Expo Notifications + token enregistré backend)
- [x] Deep links : `eventmaster://rsvp/:guestId`, `eventmaster://event/:id`, `eventmaster://protocol/:eventId`
- [x] Thème sombre (suit le réglage système iOS/Android)
- [x] Config EAS builds (`eas.json` — profils development / preview / production)
- [ ] Tests E2E (Detox ou Maestro)
- [ ] Builds EAS exécutés (Android APK/AAB, iOS TestFlight)

**Fichiers**

- `src/lib/pushNotifications.ts`, `src/lib/deepLinks.ts`, `src/components/AppBootstrap.tsx`
- `src/theme/ThemeContext.tsx`, `app/event/[id].tsx`
- `backend`: `PushDeviceToken`, `expoPushService.ts`, routes `/notifications/push-token`

**Backend (migration requise)**

```bash
cd backend && npx prisma migrate deploy
# Optionnel : EXPO_ACCESS_TOKEN pour l'API Expo Push en production
```

---

### Phase 6 — Publication stores (Semaine 8+)

- [ ] Comptes Apple Developer + Google Play Console
- [ ] Icônes, splash, captures d'écran stores
- [ ] Politique de confidentialité (lien vers `/privacy`)
- [ ] Soumission App Store / Play Store
- [ ] CI/CD GitHub Actions (`eas build`)

---

## Alignement avec le monorepo

```
eventmaster/
├── backend/     → API REST (port 5001) — inchangé
├── frontend/    → Next.js (port 3000) — inchangé
└── mobile/      → Expo (port 8081) — nouveau
```

**Variables d'environnement mobile**

```env
EXPO_PUBLIC_API_URL=http://localhost:5001/api
# Simulateur iOS : http://localhost:5001/api
# Émulateur Android : http://10.0.2.2:5001/api
# Appareil physique : http://<IP_LAN>:5001/api
```

**CORS backend** : vérifier que `backend/src/index.ts` autorise les requêtes depuis l'app mobile (Origin absent ou `*` en dev).

---

## Partage de code (optionnel, phase ultérieure)

| Élément | Stratégie |
|---------|-----------|
| Types TypeScript | Copier `frontend/src/lib/eventWorkflow.ts`, types RSVP → `mobile/src/types/` ou package `@eventmaster/shared` |
| Logique métier pure | Extraire dans `packages/shared/` (npm workspaces) |
| UI | Séparée (React Native ≠ React DOM) |

---

## Risques & mitigations

| Risque | Mitigation |
|--------|------------|
| Plan de table complexe sur petit écran | Lecture seule mobile ; édition sur web |
| Puppeteer PDF côté serveur | OK — mobile consomme l'URL Cloudinary |
| Permissions caméra refusées | Fallback saisie manuelle ID invité |
| Backend localhost sur appareil réel | Documenter IP LAN + `expo start --tunnel` |

---

## Prochaines actions immédiates

1. Installer Expo Router et Secure Store :
   ```bash
   cd mobile
   npx expo install expo-router expo-secure-store expo-linking expo-constants react-native-safe-area-context react-native-screens
   ```
2. Migrer `App.tsx` vers `app/_layout.tsx`
3. Implémenter `src/lib/api.ts` + écran login
4. Tester login avec compte seed : `demo@novaevents.cd` / `password123`
5. Mettre à jour le README racine du monorepo

---

## Critères de succès v1

- [ ] Invité : RSVP complet depuis un lien deep link
- [ ] Protocole : scan QR + confirmation de présence en < 3 s
- [ ] Organisateur : voir liste événements + invités + stats RSVP
- [ ] Build Android installable (APK interne via EAS)
