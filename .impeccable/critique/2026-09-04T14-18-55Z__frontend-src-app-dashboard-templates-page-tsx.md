---
score: 26
max_score: 40
summary: "Éditeur Nouveau modèle : defaults riches mais charge cognitive élevée (deux centres de style, validation RSVP tardive, sortie sans garde-fou)."
issues: Deux centres de style (thèmes gauche vs Global droite),Validation RSVP reporting uniquement au save,Sortie éditeur sans confirmation malgré brouillon,Portée SuperAdmin / landing enfouie,Panneau propriétés trop profond pour CREATE
timestamp: 2026-09-04T14-18-55Z
slug: frontend-src-app-dashboard-templates-page-tsx
---
# Assessment A — Revue de design (Operate)
**Cible :** éditeur visuel ouvert par « Nouveau modèle » (`editorOpen`, ~L1404–3533 de `frontend/src/app/dashboard/templates/page.tsx`)  
**Mode :** Operate (complétion de tâche — créer un modèle d’invitation)

---

## 1. Verdict design-specificity

**Verdict : ancré produit, avec une coque générique d’éditeur visuel.**

L’interface n’est pas interchangeable avec un éditeur Canva générique : le flux CREATE démarre avec un modèle mariage pré-rempli (noms « Hassan & Ayesha », texture papier, double bordure, bloc RSVP avec champs reporting), des thèmes couleur nommés pour l’événementiel (`Ivoire & or`, `Rose poudré`…), des cadres floraux paramétrables, des variables invité (`{{title}}`, `{{location}}`), et des champs SuperAdmin (portée Global/Privé, vitrine landing). Les libellés de textures référencent des cas réels (« Hassan Raza », « Ananya & Rishabh ») — signature EventMaster.

En revanche, la **structure** reste le triptyque classique boîte à outils / canvas / panneau propriétés, sans parcours guidé « créer une invitation en 3 étapes ». Un utilisateur non initié perçoit surtout un studio graphique dense, pas un assistant événementiel.

---

## 2. Charge cognitive

**Score checklist : 5–6 échecs sur 8 → charge cognitive élevée.**

| Critère | Verdict | Détail |
|---|---|---|
| Focus unique | ❌ | Trois colonnes simultanées ; boîte gauche très longue (import, palette, 9 thèmes, typo, disposition, 7 composants, presets). |
| Chunking (≤4/groupe) | ❌ | Grille « Thèmes couleurs » : 9 cartes visibles ; « Composants » : 7 boutons ; panneau propriétés élément : 10+ contrôles empilés. |
| Regroupement | ✅ | Sections bordées (`Importer ma maquette`, `Thèmes couleurs`, `Paramètres Globaux`…). |
| Hiérarchie visuelle | ⚠️ | Labels uniformes `text-xs uppercase` partout ; peu de distinction primaire/secondaire entre « commencer vite » et « affiner ». |
| Une décision à la fois | ❌ | Styles globaux (droite) + thèmes (gauche) + canvas en parallèle. |
| Choix minimaux (≤4) | ❌ | Voir liste ci-dessous. |
| Mémoire de travail | ⚠️ | Variables invité partiellement rappelées ; clés analytiques RSVP implicites ; lien portée tenant ↔ vitrine landing non explicite. |
| Progressive disclosure | ⚠️ | Bon : panneau floral conditionnel (`frameType === 'floral-arch'`), RSVP externe séparé sous le canvas. Faible : panneau Global expose fond, texture (8), cadre (9), taille, vitrine d’un coup. |

### Points de décision avec >4 options visibles

- **Thèmes couleurs** (gauche) : 9 cartes en grille 2×N  
- **Composants** : 7 types (Texte, Bouton, Image, Séparateur, Courbe, Triangle, RSVP)  
- **Police élément** (panneau droit) : 16 familles dans le `<select>`  
- **Style d’encadrement** (Global) : 9 options  
- **Style de texture** (Global) : 8 options  
- **Styles bouton** : 6 ; **séparateur** : 7 ; **courbe** : 6 ; **image** : 7  
- **Tailles police** : 8 ; **palette luxe** : 9 pastilles ; **fonds recommandés** : 9 pastilles  
- **Import maquette** (modal) : 4 modes — limite acceptable  

**Violations dominantes :** « Wall of Options », « Multi-Task Demand », « Context Switch » (Global ↔ élément ↔ boîte gauche pour la couleur).

---

## 3. Parcours émotionnel

| Phase | Ressenti | Mécanisme UI |
|---|---|---|
| **Entrée (pic positif)** | Satisfaction immédiate | Default riche (~9 éléments + RSVP `outside`) — pas de canvas vide anxiogène. |
| **Exploration (vallée)** | Surcharge | Scroll long boîte gauche + panneau Global ; duplication thème couleur (gauche) vs fond/cadre (droite). |
| **Personnalisation RSVP (vallée)** | Incertitude | Texte d’aide utile (L2924–2926) mais éditeur de champs dense ; alerte reporting seulement à la sauvegarde. |
| **Aperçu (pic)** | Confiance | Toggle « Aperçu invité » + rendu cadres/floraux soignés sur le canvas. |
| **Sauvegarde (enjeu)** | Anxiété si échec | Validation nom OK ; **RSVP reporting validé tardivement** (L1191–1199) ; pas de récap pré-save. |
| **Fin (peak-end)** | Neutre | Fermeture éditeur + retour liste ; succès hors éditeur ; brouillon local en bandeau ambre (L1497–1514) = rappel d’inachevé plutôt que réassurance. |

**Réassurance high-stakes insuffisante :** pas de garde-fou à la sortie (L295–303 `closeEditor` sans confirmation), pas de preview « tel que l’invité le verra » plein écran avant save.

---

## 4. Heuristiques Nielsen (0–4)

| # | Heuristique | Score | Justification |
|---|---|---|---|
| 1 | Visibilité du statut | **3** | Spinner save, erreurs rose, meta canvas (dimensions/mode), brouillon horodaté — mais pas d’indicateur « modifications non sauvegardées » persistant dans l’en-tête. |
| 2 | Correspondance système/réel | **4** | Vocabulaire mariage/RSVP, français, variables invité, portée Global/Privé alignés métier. |
| 3 | Contrôle et liberté | **2** | Retour arrière sans alerte ; `confirm()` natif seulement à la suppression d’élément ; pas d’annuler/rétablir. |
| 4 | Cohérence | **3** | Patterns dashboard respectés ; mais « Paramètres Globaux » (bouton bas-gauche L1833 vs panneau droit L3037) et couleurs gérées à deux endroits. |
| 5 | Prévention des erreurs | **2** | Validation RSVP et nom au save uniquement ; sélecteur tenant sans conséquences expliquées. |
| 6 | Reconnaissance vs mémorisation | **2** | Variables partiellement affichées (L2581–2583) ; clés analytiques RSVP et effets « Portée » à mémoriser. |
| 7 | Flexibilité et efficacité | **3** | Preset titre+date+CTA, import maquette/OCR, thèmes one-click, mode libre — bon pour power users. |
| 8 | Esthétique et minimalisme | **2** | Densité typographique (9–11px), panneaux longs, redondance typo globale vs par-élément. |
| 9 | Récupération d’erreurs | **2** | Messages d’erreur clairs mais localisation du problème RSVP difficile ; brouillon local sans restauration proposée à l’ouverture. |
| 10 | Aide et documentation | **3** | Encart « Conseil de Design » (L3347–3354), hints RSVP placement, badge Premium OCR — pas de tour guidé CREATE. |

**Total : 26/40** — utilisable pour utilisateurs avancés, fatiguant pour la création ponctuelle.

---

## 5. Forces (2–3)

1. **Default « prêt à publier »** — `handleCreateTemplateClick` (L337–363) charge une invitation complète (textes, séparateurs, date en colonnes, RSVP reporting + placement `outside`) plutôt qu’un canvas vide ; réduit la page blanche.

2. **Ancrage domaine événementiel** — thèmes `invitationColorThemes`, presets RSVP (`createDefaultReportingRsvpFields`), toggle aperçu invité avec substitution (`Amina Kabongo`, Kinshasa), choix inline/outside RSVP avec justification mobile (L2892–2895).

3. **Chemin accéléré mockup** — import image + modal 4 modes (L712–810), palette active cliquable, actions « Appliquer accent aux titres / fond » — bon germane load pour reproduire une maquette existante.

---

## 6. Problèmes prioritaires (3–5)

### [P1] Architecture informationnelle : deux « centres de style »
**Quoi :** thèmes couleur + typo à gauche ; fond/texture/cadre/floral à droite (Global).  
**Impact :** l’utilisateur ne sait pas où commencer ni quel changement prime.  
**Fix :** un seul panneau « Style global » (ou onglets Style / Contenu / RSVP) ; masquer la boîte gauche aux defaults jusqu’à « Ajouter un élément ».

### [P1] Validation RSVP reporting tardive au save
**Quoi :** `validateRsvpFieldsForReporting` bloque à L1191–1199 sans guidage préalable dans l’éditeur de champs.  
**Impact :** frustration peak-end ; travail perçu « perdu ».  
**Fix :** statut RSVP dans l’en-tête (« Formulaire OK / 1 champ à corriger ») + scroll auto vers le champ fautif.

### [P1] Sortie sans garde-fou malgré brouillon local
**Quoi :** `closeEditor()` (L295) ferme sans dialog ; bandeau brouillon ambre ≠ blocage.  
**Impact :** perte de confiance sur une tâche à enjeu (modèle réutilisé sur N événements).  
**Fix :** modal « Enregistrer / Quitter sans enregistrer / Annuler » si delta depuis dernière save.

### [P2] Double modèle mental SuperAdmin non unifié
**Quoi :** « Portée » dans l’en-tête (L1443–1458) ; « Vitrine landing » seulement dans Global si Global + SuperAdmin (L3045–3087) ; texte console séparé sur la liste, pas dans l’éditeur CREATE.  
**Impact :** templates globaux mal catégorisés ou non exposés landing.  
**Fix :** bandeau contextuel SuperAdmin en haut de l’éditeur CREATE regroupant portée + vitrine + conséquences (« visible sur landing + catalogue »).

### [P2] Panneau propriétés élément : profondeur excessive pour la tâche CREATE
**Quoi :** 16 polices, 9 pastilles luxe, largeur/alignement/taille dupliquent le thème global ; courbe/triangle peu utiles au premier modèle.  
**Impact :** paralysie du choix ; temps de création >> attente « 15 min pour un modèle org ».  
**Fix :** mode « Essentiel » (texte, couleur, taille, alignement) vs « Avancé » ; composants décoratifs en sous-menu.

---

## 7. Persona red flags

### SuperAdmin (templates globaux + landing)
- Portée tenant en `<select>` 11px dans le sous-titre — facile à rater ; conséquences catalogue/landing absentes inline.
- Toggle vitrine enfoui dans Global (nécessite désélection élément) — workflow inverse de l’intention « publier au catalogue ».
- Risque de créer un template privé en croyant qu’il alimente la landing.

### Utilisateur org (organisateur, non designer)
- Default complexe (9 blocs) : ne sait pas quoi renommer en premier (nom modèle générique L337 vs contenu « Hassan & Ayesha »).
- Mode « Libre » + poignée largeur % (L2262–2277) : courbe d’apprentissage type outil pro.
- Jargon « clé analytique », « Reporting » (L2908–2912) sans lien visible avec les exports qu’il utilisera plus tard.
- OCR Premium gated (L1535–1536) — frustration si maquette papier = workflow principal.

### Utilisateur org occasionnel (1er modèle)
- Pas de parcours « Renommer → Remplacer textes → Sauver » ; tout est visible d’un coup.
- Message canvas vide (L2174–2177) contradictoire avec le default riche (ne s’affiche qu’après suppression manuelle).

---

## 8. Observations mineures

- Placeholder texte « Double-cliquez pour modifier » (L448) alors que la sélection se fait au **clic** (L2196).
- Icône `Columns` pour le composant « Bouton » (L1735) — sémantique floue.
- Contrôles déplacer/haut-bas : icônes blanches sur `bg-surface-muted` (L2218) — contraste faible.
- « Appliquer aux textes » typo (L1676) : action destructive potentielle sans preview/undo.
- Variables invité listées partiellement (`firstName`, `location` L2582) — `{{date}}`, `{{rsvpLink}}` absents du hint.
- Nom modèle éditable inline sans label visible — découverte par hover seulement.

---

## 9. Questions provocantes pour le PO

1. **Qui est le créateur cible du premier modèle — wedding planner ou graphiste ?** Si c’est l’organisateur, un wizard en 4 écrans (Identité → Style → Contenu → RSVP → Publier) bat-il un éditeur triptyque permanent ?

2. **Le bloc RSVP configurable dans le modèle est-il le bon niveau d’abstraction ?** Les champs reporting sont-ils un différentiateur template ou une config événement — et faut-il simplifier le CREATE à « style RSVP » + champs verrouillés par défaut ?

3. **Faut-il scinder CREATE SuperAdmin et CREATE org en deux surfaces distinctes** (catalogue/vitrine vs modèle interne) plutôt qu’un éditeur unique avec conditionnels `{SUPER_ADMIN && …}` — pour réduire la charge cognitive par persona ?

---

*Assessment A uniquement — revue source, sans détecteur ni inspection navigateur.*

---

## Assessment B (détecteur)

Exit 0, 0 findings. Navigateur : non disponible dans la session.
