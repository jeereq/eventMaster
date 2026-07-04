# EventMaster Mobile

Application mobile **React Native + Expo** pour EventMaster.  
Consomme l'API REST du dossier `backend/` — même authentification JWT que le frontend web.

## Prérequis

- Node.js 18+
- Backend EventMaster démarré (`cd backend && npm run dev` → port **5001**)
- [Expo Go](https://expo.dev/go) sur téléphone **ou** simulateur iOS / émulateur Android

## Installation

```bash
cd mobile
npm install
cp .env.example .env
# Ajuster EXPO_PUBLIC_API_URL selon votre environnement (voir ci-dessous)
npm start
```

Puis scanner le QR code avec Expo Go, appuyer sur `w` (web), `i` (iOS) ou `a` (Android).

### Tester dans le navigateur

```bash
npm run web
```

Ouvre **http://localhost:8081** (ou le port indiqué). Le backend doit tourner sur le port 5001.

> **Limites web** : pas de scan caméra ni de push notifications — le protocole QR fonctionne en saisie manuelle uniquement.

## Configuration API

| Environnement | `EXPO_PUBLIC_API_URL` |
|---------------|-------------------------|
| Simulateur iOS | `http://localhost:5001/api` |
| Émulateur Android | `http://10.0.2.2:5001/api` |
| Appareil physique (même Wi‑Fi) | `http://<IP_DE_VOTRE_MAC>:5001/api` |
| Production | `https://votre-backend.com/api` |

## Scripts

| Commande | Description |
|----------|-------------|
| `npm start` | Dev server Expo |
| `npm run android` | Lancer sur Android |
| `npm run ios` | Lancer sur iOS |
| `npm run web` | Version web Expo (navigateur, port 8081) |

## Deep links

| Lien | Destination |
|------|-------------|
| `eventmaster://rsvp/:guestId` | Portail RSVP invité |
| `eventmaster://event/:id` | Détail événement (auth requise) |
| `eventmaster://protocol/:eventId` | Protocole jour J (auth requise) |

## Notifications push

Sur appareil physique (pas simulateur), l'app enregistre automatiquement un token Expo auprès du backend après connexion.

```bash
# Backend — appliquer la migration push tokens
cd ../backend && npx prisma migrate deploy
```

Variable optionnelle backend : `EXPO_ACCESS_TOKEN` pour l'API Expo Push en production.

## Builds EAS

```bash
npm install -g eas-cli
eas login
eas build --profile preview --platform android
```

## Publication stores

Voir `store/SUBMISSION.md` pour la checklist complète et `store/LISTING.fr.md` pour les textes App Store / Play Store.

```bash
eas build --profile preview --platform android   # APK test
eas build --profile production --platform all      # stores
```

CI : workflow **Mobile EAS Build** (secret GitHub `EXPO_TOKEN` requis).

## Structure

```
mobile/
├── app/                     # Expo Router
│   ├── (auth)/              # login, register, verify-otp, forgot-password
│   ├── (app)/
│   │   ├── (tabs)/          # Accueil, Événements, Alertes
│   │   ├── events/[id]      # détail événement
│   │   └── protocol/[eventId]  # protocole jour J
│   ├── event/[id]           # deep link eventmaster://event/:id
│   ├── rsvp/[guestId]       # portail RSVP invité (public)
│   └── _layout.tsx
├── src/
│   ├── context/AuthContext.tsx
│   ├── components/ui/       # Button, Input, Screen, Alert
│   ├── config/env.ts
│   └── lib/api.ts
├── PLAN.md
└── app.json
```

## Compte de test

Utilisez les comptes seed du backend :

- Organisateur : `demo@novaevents.cd` / `password123`
- Super admin : `superadmin@eventmaster.cd` / `password123`
