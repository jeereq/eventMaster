# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

1. **Particuliers & Familles (B2C)** : Organisent des mariages, anniversaires, fêtes privées. Recherchent la simplicité absolue, l'élégance des faire-part, le partage instantané sur WhatsApp et un placement de table visuel sans jargon.
2. **Professionnels & Agences Événementielles (B2B)** : Conçoivent des conférences, concerts, galas et festivals. Ont besoin d'une billetterie multi-zones (VIP, Standard), d'un suivi des recettes en direct, d'une gestion d'équipe et d'un contrôle d'accès au scan QR le jour J.
3. **Propriétaires de Salles & Prestataires (Marketplace)** : Traiteurs, décorateurs, photographes, DJ et gestionnaires de salles. Recherchent de la visibilité qualifiée avec vitrines 3D interactives, demandes de devis et gestion de planning.
4. **Invités & Acheteurs de Billets (Mobile End-Users)** : Répondent aux invitations RSVP ou achètent des billets en ligne via Mobile Money (M-Pesa, Orange, Airtel, Afrimoney) ou Carte bancaire (Visa/Mastercard), avec accès immédiat à leur Pass QR.

## Product Purpose

EventMaster est la plateforme événementielle tout-en-un conçue pour unifier et simplifier la chaîne événementielle de A à Z :
- Création et modélisation de salles en 2D/3D (tables, allées, lustres, scènes).
- Distribution des invitations et collecte des confirmations RSVP en temps réel (WhatsApp, SMS, Email).
- Billetterie en ligne sécurisée avec tarification dynamique par zone et paiement en Franc Congolais (CDF).
- Contrôle d'accès et accueil protocolaire fluide le jour J sans application native à installer.

## Positioning

La seule solution tout-en-un alliant la puissance de la modélisation spatiale 3D et du plan de table avec une intégration native et sans couture des usages locaux en Afrique centrale (WhatsApp comme canal n°1 et paiements directs Mobile Money via FlexPay).

## Operating Context

- **Environnement d'exécution** : 100% Web et Responsive (navigateurs mobiles et desktop, PWA).
- **Réseau & Mobilité** : Conçu pour fonctionner sur des connexions mobiles parfois instables (3G/4G) le jour J lors du scan à l'entrée.
- **Monnaie & Paiements** : Franc Congolais (CDF), intégration directe FlexPay (Mobile Money et cartes Visa/Mastercard).

## Capabilities and Constraints

- **Éditeur de Salle 2D / 3D WebGL** : Placement de tables rondes, rectangulaires, amphithéâtres, portes, allées, lustres et ambiances lumineuses.
- **Canal WhatsApp & RSVP** : Invitations personnalisées avec liens sécurisés uniques, choix de repas et restriction d'accès.
- **Desk Protocole Jour J** : Scanner de QR code rapide intégré dans le navigateur avec alertes sonores et haptiques.
- **Limites de référence FlexPay** : Références marchandes de paiement strictement plafonnées à 25 caractères.
- **Quotas d'abonnements** : Gestion granulaire des accès selon les forfaits B2C, B2B et Marketplace.

## Brand Commitments

- **Nom** : EventMaster.
- **Ton & Voix** : Prestigieux, moderne, chaleureux, rassurant et direct (priorité à l'action et aux visuels plutôt qu'aux longs textes).
- **Typographie** : Fraunces (titres élégants / festifs) & Inter (lisibilité et interface produit).

## Evidence on Hand

- Modélisation 2D/3D interactive fonctionnelle dans `frontend/src/components/RoomLayoutEditor.tsx` et `RoomWebGLViewer.tsx`.
- Intégration de paiement FlexPay opérationnelle dans `backend/src/services/flexPayCardService.ts`.
- Portail invité immersif dans `frontend/src/app/rsvp/[guestId]/page.tsx`.

## Product Principles

1. **Glanceability (Compréhension en 2 secondes)** : Réduire les textes superflus au profit d'actions claires, d'icônes et de cartes d'objectifs.
2. **Zéro friction mobile** : Pas d'application à télécharger pour les invités ou agents d'accueil ; tout fonctionne immédiatement dans le navigateur.
3. **Continuité de bout en bout** : De la conception de la salle jusqu'au scan de l'invité à sa table le jour J, aucune rupture d'outil tiers.
4. **Ancrage local irréprochable** : Gestion native des formats de téléphone (+243), des devises (CDF) et des canaux de prédilection (WhatsApp, Mobile Money).
