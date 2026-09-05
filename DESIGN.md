---
name: EventMaster
description: Atelier de célébration — invitations, salles 3D et protocole, en CDF.
colors:
  primary: "#059669"
  primary-hover: "#047857"
  primary-solid: "#047857"
  primary-solid-hover: "#065f46"
  primary-foreground: "#ffffff"
  brand-accent: "#10b981"
  festive-accent: "#d97706"
  festive-on-stage: "#fbbf24"
  background: "#f6f7f8"
  foreground: "#1e1f21"
  surface: "#ffffff"
  surface-muted: "#ededee"
  surface-warm: "#f3f5f2"
  border: "#e8e8e9"
  border-subtle: "#f0f0f1"
  muted: "#6d6e6f"
  sidebar: "#f0f1f3"
  stage: "#171614"
  stage-elevated: "#221f1c"
  stage-foreground: "#f7f4ef"
  danger: "#be123c"
typography:
  display:
    fontFamily: "Fraunces, Inter, Georgia, serif"
    fontSize: "clamp(1.5rem, 4vw, 3.25rem)"
    fontWeight: 600
    lineHeight: 1.14
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Fraunces, Inter, Georgia, serif"
    fontSize: "clamp(1.5rem, 3vw, 2.25rem)"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Inter, Helvetica Neue, Helvetica, Arial, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Inter, Helvetica Neue, Helvetica, Arial, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "-0.011em"
  label:
    fontFamily: "Inter, Helvetica Neue, Helvetica, Arial, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "0.02em"
rounded:
  sm: "0.5rem"
  md: "0.75rem"
  lg: "1rem"
  full: "9999px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "20px"
  xl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.primary-solid}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.sm}"
    padding: "8px 14px"
    height: "44px"
    typography: "{typography.title}"
  button-primary-hover:
    backgroundColor: "{colors.primary-solid-hover}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.sm}"
    padding: "8px 14px"
    height: "44px"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.sm}"
    padding: "8px 14px"
    height: "44px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.muted}"
    rounded: "{rounded.sm}"
    padding: "8px 14px"
    height: "44px"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.sm}"
    padding: "20px"
  input:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.sm}"
    padding: "10px 14px"
    height: "44px"
  chip-default:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.full}"
    padding: "2px 8px"
    typography: "{typography.label}"
  chip-primary:
    backgroundColor: "color-mix(in srgb, #059669 10%, transparent)"
    textColor: "{colors.primary}"
    rounded: "{rounded.full}"
    padding: "2px 8px"
    typography: "{typography.label}"
  chip-festive:
    backgroundColor: "color-mix(in srgb, #d97706 14%, transparent)"
    textColor: "{colors.festive-accent}"
    rounded: "{rounded.full}"
    padding: "2px 8px"
    typography: "{typography.label}"
  stage-panel:
    backgroundColor: "{colors.stage}"
    textColor: "{colors.stage-foreground}"
    rounded: "{rounded.sm}"
    padding: "24px"
---

# Design System: EventMaster

## Overview

**Creative North Star: "L'Atelier de Célébration"**

EventMaster se lit comme un atelier de réception : on y compose des invitations, on y dresse des salles en 2D/3D, on y envoie le RSVP WhatsApp et on y scanne le jour J. Le système est prestigieux et chaleureux, jamais froid. L’émeraude mène l’action ; l’ambre Kinshasa réchauffe la fête ; l’ardoise de scène inversée porte les moments de preuve (bandeau 3D, CTA inversé, chrome WebGL).

Un seul système, deux humeurs. **Work** (dashboard, éditeurs, admin) reste scanable, émeraude et neutre. **Celebrate** (landing, RSVP, auth) laisse l’ambre et la scène respirer davantage — mêmes jetons, température plus haute. Le document décrit cette dualité ; il ne crée pas deux marques.

La fête est visible sans basculer dans le SaaS gris stérile. Anti-références confirmées : dashboard clinique sans chaleur, néon événementiel, glassmorphism généralisé, ombres théâtrales sur toute l’UI.

**Key Characteristics:**
- Fraunces pour les titres de célébration ; Inter pour l’interface et les chiffres.
- Surfaces plates au repos ; matière réservée à la scène, au 3D et aux CTA inversés.
- Cibles tactiles 44px, glanceability en 2 secondes, ton prestigieux et direct.
- Jetons CSS (`--primary`, `--festive-accent`, `--stage`) : jamais d’hex de chrome dans le produit.

## Colors

Palette émeraude d’action + ambre de fête + neutres papier, avec une scène ardoise pour les moments inversés.

### Primary
- **Émeraude de banquet**: action, liens, focus, boutons pleins (`primary-solid` pour les fonds AA). Le hover assombrit ; le dark mode éclaircit `--primary` mais garde `--primary-solid` pour le texte blanc.
- **Émeraude vive** (`brand-accent`): halo, pastille, dégradé de preuve — pas le fond d’un bouton de texte blanc.

### Secondary
- **Ambre Kinshasa**: humeur Celebrate, prestataires, confetti discret, chips de fête. Sur scène, l’ambre passe en **or de rampe** (`festive-on-stage`).

### Tertiary
- **Ardoise de scène**: bandeaux inversés, chrome 3D, CTA de preuve. Texte ivoire (`stage-foreground`). La scène élevée (`stage-elevated`) sert les plateaux internes, pas toute la page.

### Neutral
- **Papier de travail** (`background`): fond d’app, jamais blanc cru plein écran.
- **Encre graphite** (`foreground`): texte principal.
- **Porcelaine** (`surface`) et **lin muted** (`surface-muted`): cartes et champs.
- **Papier tiède** (`surface-warm`): hero landing, pas le dashboard.
- **Filet** (`border` / `border-subtle`): séparation plate.
- **Légende** (`muted`): labels, hints, meta.
- **Colonne** (`sidebar`): rail de navigation.

### Named Rules
**The Dual Accent Rule.** L’émeraude mène l’action. L’ambre mène la fête. Jamais les deux à parts égales sur le même bloc : un accent conduit, l’autre orne.

**The Two Moods Rule.** Work et Celebrate partagent les mêmes jetons. Celebrate réchauffe l’ambre et la scène ; Work reste émeraude et neutre. Ne pas inventer une troisième palette.

## Typography

**Display Font:** Fraunces (with Inter, Georgia)
**Body Font:** Inter (with Helvetica Neue, Arial)
**Label/Mono Font:** Inter pour les labels ; Geist Mono pour le code / IDs

**Character:** Fraunces porte le festif (titres de landing, invitations, hero). Inter porte l’outil : lisibilité, tabular nums (CDF, places, jetons), labels d’éditeur.

### Hierarchy
- **Display** (600, clamp 1.5rem–3.25rem, line-height 1.14): hero et titres de célébration (`.em-landing-heading`, `.font-display`).
- **Headline** (600, clamp 1.5rem–2.25rem): sections landing et en-têtes de page.
- **Title** (600, 1rem / `text-base`): titres de cartes, actions primaires.
- **Body** (400, 1rem à la racine 15px, line-height 1.5): lecture produit. Champs mobile à 16px pour éviter le zoom iOS.
- **Label** (600, 0.75rem / `text-xs`): labels de champs, chips, meta. Pas en dessous de 12px pour le texte utile.

### Named Rules
**The Fraunces Occasion Rule.** Fraunces n’habille que l’occasion (hero, invitation, titre de fête). L’éditeur, les tableaux et les formulaires restent en Inter.

## Layout

Conteneur unique (`.page-container` / `.app-container`) : 91.666% de largeur, max 1440px ; mobile 100% + 12px de gouttière. Rythme 8 / 12 / 16 / 20 / 24. Densité compacte optionnelle sur le dashboard (`data-density="compact"`).

Mobile d’abord : barre publique et dock dashboard partagent `--em-site-bottom-nav` (safe-area comprise). Cibles tactiles ≥ 44px. Le plan 2D et le chrome 3D restent des surfaces de travail, pas des grilles marketing.

## Elevation & Depth

L’UI produit est plate : bordure 1px et anneau `--shadow-soft` (`0 0 0 1px rgba(0, 0, 0, 0.04)`). La profondeur matérielle est réservée à la **scène** (bandeaux `.em-stage`, viewer 3D, CTA inversés) et, à la marge, aux cartes HUD landing (léger lift au hover). Les matériaux 3D (bois, velours, or) ne se tokenisent pas : ils restent dans le renderer.

### Shadow Vocabulary
- **Filet** (`box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.04)`): cartes, docks, toggles au repos.
- **HUD landing** (`0 8px 30px -8px rgba(0, 0, 0, 0.06)`, hover `translateY(-2px)`): cartes persona / preuve sur Celebrate uniquement.
- **Scène**: pas d’ombre de carte — le fond ardoise + halos émeraude/ambre font la matière.

### Named Rules
**The Stage Material Rule.** La matière (halos, ardoise, or de rampe) appartient à la scène et au 3D. Le reste de l’app reste plat et tonal.

## Shapes

Coins doux Asana : 0.5rem (≈8px) pour cartes, boutons et champs. 0.75rem / 1rem pour zones de dépôt et pastilles larges. Pills en `9999px` (chips, tokens, HUD). Filet 1px `border` ; pas de contour 2px sauf focus-visible (2px primary, offset 2px).

## Components

Confiants et directs : CTA plein, labels courts, l’action se lit en deux secondes.

### Buttons
- **Shape:** coins 0.5rem, hauteur 44px, `active:scale(0.98)` sauf `prefers-reduced-motion`.
- **Primary:** fond `primary-solid`, texte blanc. Hover `primary-solid-hover`. Jamais `--primary` clair en dark pour un bouton à texte blanc.
- **Secondary:** surface + filet `border`. Hover `card-hover`.
- **Ghost:** transparent, texte muted, hover `surface-muted`.
- **Danger / Success:** rose-700 / émeraude-800 — états, pas identité.
- **Focus:** anneau 2px primary, offset sur `background`.

### Chips
- **Default:** muted + texte encre, pill.
- **Primary:** émeraude 10% + texte primary + filet primary/20.
- **Festive:** ambre 14% + texte Ambre Kinshasa — humeur Celebrate et métiers marketplace, pas le dashboard Work par défaut.

### Cards / Containers
- **Corner Style:** 0.5rem.
- **Background:** `surface` ; hero landing `surface-warm`.
- **Shadow Strategy:** filet plat ; HUD Celebrate seulement pour le lift.
- **Border:** 1px `border` ; hover `border-subtle` ou primary mix sur HUD.
- **Internal Padding:** 16 / 20 / 24.

### Inputs / Fields
- **Style:** fond `surface-muted`, filet `border`, 0.5rem, 44px.
- **Focus:** bord primary + anneau primary/25.
- **Error:** filet rose, message `text-xs` rose.
- **Mobile:** 16px de corps pour bloquer le zoom Safari.

### Navigation
Rail `sidebar`, item actif en surface + filet. Mobile : barre basse sticky, même hauteur que le dock listing. Focus visible primary. Pas d’action cachée derrière du hover seul.

### Stage panel (signature)
Bandeau `.em-stage` : fond ardoise, halos émeraude + ambre, texte ivoire. Sert la preuve (salle 3D, CTA inversé), pas les formulaires.

## Do's and Don'ts

### Do:
- **Do** conduire chaque bloc par un seul accent (émeraude *ou* ambre).
- **Do** utiliser `--primary-solid` pour tout fond de bouton / pastille à texte blanc.
- **Do** garder Fraunces pour l’occasion et Inter pour l’outil.
- **Do** viser 44px et `text-xs` (12px) minimum sur le texte utile.
- **Do** tokeniser le chrome (`bg-foreground`, `bg-stage`) ; laisser les matériaux 3D en hex locaux.

### Don't:
- **Don't** habiller le dashboard Work comme une landing Celebrate (ambre partout, scènes inversées en fond de page).
- **Don't** poser des ombres théâtrales ou du `will-change` permanent sur les items de plan.
- **Don't** descendre sous 12px pour un label d’éditeur, ni remplacer un `<button>` par un `div role="button"`.
- **Don't** inventer une troisième palette (or marketing, slate Tailwind, hex de chrome).
- **Don't** réutiliser `--primary` clair comme fond de texte blanc en dark mode.
