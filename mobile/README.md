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

Puis scanner le QR code avec Expo Go, ou appuyer sur `i` (iOS) / `a` (Android).

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
| `npm run web` | Version web Expo (debug) |

## Structure

```
mobile/
├── app/                     # Expo Router
│   ├── (auth)/              # login, register, verify-otp, forgot-password
│   ├── (app)/
│   │   ├── (tabs)/          # Accueil, Événements, Alertes
│   │   └── events/[id]      # détail événement
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
