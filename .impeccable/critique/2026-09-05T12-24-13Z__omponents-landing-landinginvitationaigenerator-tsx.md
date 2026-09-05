---
target: Studio IA (LandingInvitationAiGenerator)
total_score: 22
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 3
timestamp: 2026-09-05T12-24-13Z
slug: omponents-landing-landinginvitationaigenerator-tsx
---
Method: dual-agent

Target: frontend/src/components/landing/LandingInvitationAiGenerator.tsx
Mode: Operate on Persuade landing

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Loader + aria-busy ; stepper cosmétique ; pas de confirmation de débit |
| 2 | Match System / Real World | 2 | Cover / 35 mm / Déroulé vs faire-part, Dot, WhatsApp |
| 3 | User Control and Freedom | 2 | Pas d’Annuler pendant le loader ; resetResult ne reset pas |
| 4 | Consistency and Standards | 2 | 3 agrandir + 2 télécharger ; tabs = même poids que Générer |
| 5 | Error Prevention | 2 | Undo à chaque frappe ; pas de confirm jetons ; image/* trop large |
| 6 | Recognition Rather Than Recall | 2 | Brief/upload cachés hors onglet Formulaire ; Cover à apprendre |
| 7 | Flexibility and Efficiency | 2 | Undo inutilisable ; Générer seulement depuis Formulaire |
| 8 | Aesthetic and Minimalist Design | 2 | Chrome dashboard sur landing ; carte noyée |
| 9 | Error Recovery | 3 | Messages FR actionnables ; clipboard silencieux |
| 10 | Help and Documentation | 2 | Meilleur help (modèles) caché ; tip clone vers dropzone absente |
| **Total** | | **22/40** | **Acceptable** |

## Design Specificity Verdict

Partiellement EventMaster. Le job (brief FR + photos → carte 9:16, fidélité visages, jetons) est authored. Le chrome (onglets, Cover, 35 mm, journal) est interchangeable. WhatsApp / CDF / FlexPay absents du générateur. Détecteur CLI : 0 findings. Overlay navigateur : non injecté.

## Overall Impression

Outil de composition réel, mais un dashboard a mangé la landing. Plus grande opportunité : un seul chemin brief → Générer → carte.

## What's Working

1. Job visible : 9:16, fidélité yeux/sourire/joues, dropzone.
2. Repli + hash #generateur-ia : l’atelier ne crie pas fermé.
3. Prix sur le CTA et erreurs HTTP actionnables.

## Cognitive load

Élevée — 6/8 échecs (single focus, chunking, hierarchy, one thing, choices, working memory, progressive disclosure). Grouping OK.

## Priority Issues

**[P1] L’atelier dashboard a mangé la tâche** — Jordan choisit 3 onglets avant d’écrire. Fix : brief + Générer + carte ; le reste après génération.

**[P1] Créer et cloner sont un seul contrôle** — Dropzone dual-job ; tip clone vers un autre onglet. Fix : deux intents explicites.

**[P1] High-stakes sans sortie ni réassurance** — Visages + jetons + overlay sans Annuler. Fix : confirm 1 ligne + Annuler.

**[P2] Voix et type hors marque** — Pas de Fraunces ; 35 mm / Cover / Déroulé. Fix : font-display + langage invitation.

**[P2] Le pic (la carte) est enterré** — 3 agrandir + 2 télécharger. Fix : une primaire, une secondaire.

## Persona Red Flags

Jordan : deux produits dans le titre ; prompt / 35 mm ; register pour finir.
Casey : aperçu sous le fold ; Générer hors thumb ; loader sans Passer.
Sam : role=button + Button ; Download sans aria-label mobile ; loader sans trap.

## Minor Observations

Badge historique = history.length seulement. Undo à chaque frappe. Reset menteur. Empty state → simulateur budget. Frames emoji dans la preview.

## Questions to Consider

Si le succès tient en une phrase, pourquoi le premier contrôle est un studio à trois onglets ?
Pourquoi le payoff n’est pas « cette carte part sur WhatsApp » ?
Créer et cloner sont-ils deux portes ?
