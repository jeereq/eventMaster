---
target: éditeur d’invitations
total_score: 22
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 2
timestamp: 2026-09-17T11-54-06Z
slug: frontend-src-app-dashboard-templates-page-tsx
---
# Critique — éditeur d’invitations EventMaster

**Cible :** `frontend/src/app/dashboard/templates/page.tsx` (+ duplication, identité, compose IA)
**Mode :** Operate
**Méthode :** dual-agent

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Brouillon / RSVP / jetons existent ; aperçu invité ne dit pas quelles données sont substituées |
| 2 | Match System / Real World | 2 | « Carton » vs Flash, Pro 2K, A/B, Quiet Luxury, merge tags |
| 3 | User Control and Freedom | 3 | Annuler / historique OK ; mises en page photo remplacent tout sans confirmation |
| 4 | Consistency and Standards | 2 | Créer avec l’IA / Composer / Éditeur manuel ; Aperçu vs Invité |
| 5 | Error Prevention | 2 | Identité au blur ; dummy enregistrable (corrigé à la création) |
| 6 | Recognition Rather Than Recall | 2 | Fond/format : cliquer à côté d’un texte puis Apparence |
| 7 | Flexibility and Efficiency | 3 | Undo, historique IA ; pas de Cmd+S ni Générer clavier |
| 8 | Aesthetic and Minimalist Design | 1 | Mur d’outils studio : 11 styles, 7 layouts, 13 thèmes, 16 polices |
| 9 | Error Recovery | 2 | 402 jetons clair ; sinon « Impossible de générer… » |
| 10 | Help and Documentation | 2 | Guide « Compris » ; aide IA masquée sur mobile |
| **Total** | | **22/40** | **Acceptable** |

## Design Specificity Verdict

**LLM :** Partiellement EventMaster (carton, hôtes, RSVP, Afro-Chic), largement interchangeable dès que le studio s’ouvre.

**Deterministic scan :** detect.mjs exit 0, 0 finding sur page.tsx + InvitationDuplicateModal + InvitationIdentityFields.

**Visual overlays :** non injectés. Page about:blank, Turbopack FATAL sur /dashboard/templates.

## Cognitive load

7/8 échecs (seul Grouping passe). Décisions >4 : 3 CTA liste, 11 styles, 7 layouts, 13 thèmes, 16 polices.

## Priority Issues

- [P0] Premier geste n’est pas « un beau carton à mon nom »
- [P1] Identité fragile (plusieurs surfaces)
- [P1] Modale IA trop chargée (partiellement allégée cette session)
- [P2] Apparence de la carte cachée
- [P2] Fin = forfait, pas WhatsApp

## What's Working

InvitationIdentityFields, duplication personnalisée, dock mobile + RSVP + aperçu invité.

## Persona red flags

Jordan / Grace : 3 portes, jargon studio, pas d’envoi WhatsApp.
Casey : actions haut d’écran, modale quasi plein écran.
Alex : pas de Cmd+S ni duplication de masse.
