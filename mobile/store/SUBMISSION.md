# Checklist soumission stores — EventMaster Mobile

## Prérequis comptes (manuel)

- [ ] [Apple Developer Program](https://developer.apple.com/programs/) — 99 USD/an
- [ ] [Google Play Console](https://play.google.com/console) — 25 USD unique
- [ ] Compte [Expo](https://expo.dev) + `eas login`
- [ ] Secret GitHub `EXPO_TOKEN` pour la CI

## Configuration projet

1. Remplacer les URLs placeholder dans `eas.json` :
   - `EXPO_PUBLIC_API_URL` → URL production du backend
   - `EXPO_PUBLIC_WEB_URL` → URL production du frontend (pages `/privacy`, `/terms`)

2. Lier le projet EAS (première fois) :
   ```bash
   cd mobile
   eas init   # si projectId pas encore enregistré sur expo.dev
   ```

3. Credentials iOS / Android :
   ```bash
   eas credentials
   ```

## Build

```bash
# APK de test interne
eas build --profile preview --platform android

# Production (AAB + IPA)
eas build --profile production --platform all
```

Via GitHub Actions : onglet **Actions → Mobile EAS Build → Run workflow**.

Tags `mobile-v1.0.0` déclenchent un build production automatique.

## Soumission

```bash
# Après build production réussi
eas submit --platform ios --profile production
eas submit --platform android --profile production
```

Configurer dans `eas.json` → `submit.production` :
- iOS : `appleId`, `ascAppId`, `appleTeamId`
- Android : clé service account JSON (`store/google-play-service-account.json`, **ne pas committer**)

## Assets stores

| Asset | Emplacement | Statut |
|-------|-------------|--------|
| Icône 1024×1024 | `assets/icon.png` | ✅ |
| Splash | `assets/splash-icon.png` | ✅ |
| Icônes Android adaptive | `assets/android-icon-*.png` | ✅ |
| Captures d'écran | À produire (voir `LISTING.fr.md`) | ⬜ |

## Liens légaux in-app

- Inscription : liens cliquables vers `/terms` et `/privacy`
- Accueil → **À propos & confidentialité** (`/(app)/about`)

## Notes App Review

- Compte démo pour review Apple : `demo@novaevents.cd` / `password123`
- Protocole QR nécessite forfait Business+ (mentionner dans notes si fonctionnalité testée)
- Caméra : usage exclusif scan QR invités
