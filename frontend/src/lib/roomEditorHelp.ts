/**
 * Assistant de l'éditeur de salle : base de connaissances complète des actions possibles
 * et recherche en langage naturel (français), sans appel réseau ni jeton IA.
 *
 * Chaque fiche décrit une action : où la trouver, les étapes, et le forfait qui la débloque.
 * `answerEditorQuestion` choisit la meilleure fiche pour une question libre ;
 * `editorHelpOverview` donne le descriptif complet, rangé par thème.
 */

import type { RoomEditorCapabilities } from './roomEditorAccess.ts';
import { describeEditorUpsell, type EditorNeed } from './roomEditorUpsell.ts';

export type EditorHelpCategory =
  | 'start'
  | 'view'
  | 'select'
  | 'tables'
  | 'chairs'
  | 'decor'
  | 'zones'
  | 'walls'
  | 'building'
  | 'ambience'
  | 'guests'
  | 'ai'
  | 'check'
  | 'save'
  | 'share';

export const EDITOR_HELP_CATEGORY_LABELS: Record<EditorHelpCategory, string> = {
  start: 'Démarrer',
  view: 'Vues 2D / 3D et caméra',
  select: 'Sélection, déplacement et taille',
  tables: 'Tables',
  chairs: 'Chaises et rangées',
  decor: 'Scène, bars et décor',
  zones: 'Zones et piste de danse',
  walls: 'Murs, portes, fenêtres et décor mural',
  building: 'Bâtiment, étages et extérieur',
  ambience: 'Sols, thèmes et lumière',
  guests: 'Invités et salle remplie',
  ai: 'Studio IA et éléments personnalisés',
  check: 'Vérifier et compter',
  save: 'Annuler, enregistrer et variantes',
  share: 'Partager, exporter et publier',
};

export const EDITOR_HELP_CATEGORY_ORDER: EditorHelpCategory[] = [
  'start', 'view', 'select', 'tables', 'chairs', 'decor', 'zones', 'walls', 'building', 'ambience', 'guests', 'ai', 'check', 'save', 'share',
];

export type EditorHelpTopic = {
  id: string;
  category: EditorHelpCategory;
  title: string;
  /** Mots et expressions qu'un utilisateur emploierait (sans accents ni majuscules nécessaires). */
  keywords: string[];
  answer: string;
  steps?: string[];
  /** Raccourci clavier à rappeler. */
  shortcut?: string;
  /** Zone de l'éditeur à montrer (attribut `data-tour`). */
  target?: string;
  need?: EditorNeed;
  needLabel?: string;
  related?: string[];
};

export const EDITOR_HELP_TOPICS: EditorHelpTopic[] = [
  // ───────── Démarrer ─────────
  {
    id: 'overview',
    category: 'start',
    title: 'Ce que permet l’éditeur',
    keywords: ['que faire', 'que puis je faire', 'possible', 'fonctionnalites', 'tout', 'liste', 'descriptif', 'aide', 'commencer', 'presentation'],
    answer: 'L’éditeur dessine votre salle à l’échelle réelle, en plan 2D et en visite 3D. Vous y placez tables, chaises, scène, bars et décor, vous réglez murs, sols et lumière, puis vous vérifiez les passages, comptez le matériel et partagez le plan.',
    steps: [
      'Partez d’un modèle, d’une photo (Studio IA) ou d’une salle vide.',
      'Ajoutez le mobilier depuis la barre d’outils ou avec Ctrl+K.',
      'Réglez chaque élément dans le panneau de droite après l’avoir sélectionné.',
      'Passez en 3D pour juger l’ambiance, puis vérifiez espacements et matériel.',
    ],
    related: ['templates', 'quick-add', 'view-2d-3d', 'tour'],
  },
  {
    id: 'tour',
    category: 'start',
    title: 'Visite guidée',
    keywords: ['guide', 'visite guidee', 'tutoriel', 'tuto', 'apprendre', 'didacticiel', 'decouvrir'],
    answer: 'Le bouton « Guide » de la barre du haut lance une visite pas à pas de l’éditeur, adaptée à votre forfait : chaque étape montre la zone concernée et propose de l’essayer.',
    related: ['overview', 'shortcuts'],
  },
  {
    id: 'templates',
    category: 'start',
    title: 'Partir d’un modèle de salle',
    keywords: ['modele', 'template', 'banquet', 'conference', 'cocktail', 'mariage', 'gala', 'plan type', 'preconfigure'],
    answer: 'Le bouton « Modèles » pose un plan complet (banquet, conférence, cocktail, mariage, gala…) que vous ajustez ensuite. Vous pouvez aussi enregistrer votre plan comme modèle réutilisable.',
    steps: ['Cliquez sur « Modèles » en haut de l’éditeur.', 'Choisissez une catégorie puis un modèle.', 'Ajustez nombre de tables et capacité dans le panneau.'],
    target: 'templates',
    need: { feature: 'canTemplates' },
    needLabel: 'Modèles de salle',
    related: ['ai-studio', 'variants'],
  },
  {
    id: 'quick-add',
    category: 'start',
    title: 'Rechercher et ajouter un élément',
    keywords: ['ajouter', 'rechercher', 'chercher', 'trouver', 'inserer', 'poser', 'ctrl k', 'palette', 'recherche rapide'],
    answer: 'Ctrl+K (ou la touche /) ouvre la recherche : tapez « table », « piano », « bar à vins », « lustre »… puis Entrée. L’élément est posé au centre de la vue. Seuls les éléments de votre forfait y apparaissent.',
    shortcut: 'Ctrl+K ou /',
    target: 'quick-add',
    related: ['add-table', 'decor-stage'],
  },
  {
    id: 'shortcuts',
    category: 'start',
    title: 'Raccourcis clavier',
    keywords: ['raccourci', 'clavier', 'touche', 'hotkey', 'combinaison'],
    answer: 'Les raccourcis principaux : Ctrl+Z / Ctrl+Y (annuler, rétablir), Ctrl+D (dupliquer), Ctrl+C / X / V (copier, couper, coller), Ctrl+A (tout sélectionner), Ctrl+G (grouper), Suppr (supprimer), R / Maj+R (pivoter de 90°), flèches (déplacer, Maj ×2,5, Alt fin), Échap (désélectionner), Ctrl+2 / Ctrl+3 (2D / 3D), Ctrl+L (caméra libre), Ctrl+K (ajouter), ? (aide).',
    shortcut: '?',
    target: 'shortcuts',
    related: ['undo', 'duplicate', 'move-precise'],
  },
  {
    id: 'mobile',
    category: 'start',
    title: 'Utiliser l’éditeur sur téléphone',
    keywords: ['mobile', 'telephone', 'smartphone', 'tablette', 'tactile', 'doigt'],
    answer: 'Sur téléphone, trois onglets en bas organisent l’éditeur : « Plan » pour voir et déplacer, « Ajouter » pour les modèles et outils, « Régler » pour les propriétés de la sélection. Pincez pour zoomer, glissez pour déplacer.',
    related: ['select', 'view-2d-3d'],
  },

  // ───────── Vues ─────────
  {
    id: 'view-2d-3d',
    category: 'view',
    title: 'Passer du plan 2D à la vue 3D',
    keywords: ['2d', '3d', 'vue', 'plan', 'basculer', 'changer de vue', 'perspective', 'zenithal'],
    answer: 'Le sélecteur « 2D / 3D » au-dessus du plan bascule entre le plan à l’échelle (pour placer au centimètre) et la visite 3D (pour l’ambiance). Ctrl+2 et Ctrl+3 font la même chose.',
    shortcut: 'Ctrl+2 / Ctrl+3',
    target: 'view-toggle',
    related: ['camera', 'render-quality'],
  },
  {
    id: 'camera',
    category: 'view',
    title: 'Tourner, zoomer et recentrer la caméra',
    keywords: ['camera', 'tourner la vue', 'orbiter', 'zoom', 'zoomer', 'recentrer', 'regarder', 'deplacer la vue', 'pivoter la vue'],
    answer: 'En 3D, « Déplacer / Regarder » choisit si glisser bouge les objets ou la caméra. Molette ou pincement pour zoomer, « Recentrer » pour revenir sur la salle. Ctrl+L libère ou bloque la caméra. Les vues prêtes (Vue d’ensemble, Scène, Table VIP, Entrée) cadrent en un clic.',
    shortcut: 'Ctrl+L',
    related: ['view-2d-3d', 'walkthrough'],
  },
  {
    id: 'walkthrough',
    category: 'view',
    title: 'Visite à pied et présentation',
    keywords: ['visite', 'marcher', 'entrer', 'promenade', 'presentation', 'orbit', 'tour automatique', 'client', 'demo'],
    answer: '« Visiter » vous fait entrer par la porte et parcourir la salle en 3D. Le mode présentation fait tourner la salle toute seule, sans étiquettes, pour la montrer à un client. « Découverte » choisit la perspective par laquelle vos visiteurs arrivent sur la salle.',
    need: { feature: 'canShowcaseRender' },
    needLabel: 'Mode présentation',
    related: ['render-quality', 'export-image'],
  },
  {
    id: 'render-quality',
    category: 'view',
    title: 'Qualité de rendu 3D',
    keywords: ['qualite', 'rendu', 'vitrine', 'realiste', 'ombres', 'reflets', 'lent', 'performance', 'fluide'],
    answer: 'Le menu « Rendu » règle la qualité : standard pour travailler vite (et sur mobile), vitrine pour les reflets, ombres douces et lumière d’ambiance. Si la 3D rame, revenez en qualité standard.',
    need: { feature: 'canShowcaseRender' },
    needLabel: 'Rendu vitrine',
    related: ['lighting', 'walkthrough'],
  },

  // ───────── Sélection ─────────
  {
    id: 'select',
    category: 'select',
    title: 'Sélectionner un ou plusieurs éléments',
    keywords: ['selectionner', 'selection', 'choisir', 'cliquer', 'plusieurs', 'multiple', 'tout selectionner', 'inverser'],
    answer: 'Cliquez sur un élément pour le sélectionner ; Maj+clic ou Ctrl+clic en ajoute d’autres. Ctrl+A sélectionne tout, « Inverser la sélection » prend le reste, Échap désélectionne. Les filtres (Tables, Rangées, Zones, Chaises, Murs…) aident à cibler.',
    shortcut: 'Maj+clic · Ctrl+A · Échap',
    target: 'canvas',
    related: ['move-precise', 'align', 'group'],
  },
  {
    id: 'move-precise',
    category: 'select',
    title: 'Déplacer un élément au centimètre',
    keywords: ['deplacer', 'bouger', 'positionner', 'position', 'placer', 'fleches', 'precis', 'centimetre', 'coordonnees', 'centrer'],
    answer: 'Glissez l’élément sur le plan, ou utilisez les flèches du clavier (Maj ×2,5, Alt pour un pas fin). Le panneau de droite donne la position exacte en mètres et des boutons pour centrer dans la pièce.',
    shortcut: 'Flèches · Maj · Alt',
    related: ['resize', 'align', 'snap'],
  },
  {
    id: 'resize',
    category: 'select',
    title: 'Changer la taille (longueur, largeur)',
    keywords: ['taille', 'redimensionner', 'agrandir', 'reduire', 'longueur', 'largeur', 'dimension', 'etirer', 'poignee', 'diametre'],
    answer: 'Sélectionnez une scène, un bar, une zone ou une table : des poignées apparaissent aux coins et sur les côtés pour l’étirer (Maj garde les proportions). Le panneau de droite permet de taper longueur, largeur ou diamètre exacts en mètres.',
    target: 'canvas',
    related: ['move-precise', 'table-size'],
  },
  {
    id: 'rotate',
    category: 'select',
    title: 'Pivoter et orienter',
    keywords: ['pivoter', 'tourner', 'rotation', 'orienter', 'orientation', 'angle', 'degre', 'face a la scene'],
    answer: 'R pivote de 90° (Maj+R dans l’autre sens). Le menu « Rotation & orientation » offre des pas de 15°, un curseur au degré près et « Orienter vers le centre de la salle ».',
    shortcut: 'R / Maj+R',
    need: { feature: 'canRotate' },
    needLabel: 'Rotation libre',
    related: ['move-precise', 'align'],
  },
  {
    id: 'align',
    category: 'select',
    title: 'Aligner et répartir',
    keywords: ['aligner', 'alignement', 'repartir', 'distribuer', 'espacer regulierement', 'meme ligne'],
    answer: 'Sélectionnez plusieurs éléments puis « Aligner » : à gauche, au centre, à droite, en haut, en bas, ou répartis à intervalles égaux.',
    need: { feature: 'canAlign' },
    needLabel: 'Alignement',
    related: ['select', 'group'],
  },
  {
    id: 'group',
    category: 'select',
    title: 'Grouper, teinter et déplacer un lot',
    keywords: ['grouper', 'groupe', 'degrouper', 'lot', 'ensemble', 'teinter', 'couleur du lot'],
    answer: 'Ctrl+G groupe la sélection (Ctrl+Maj+G dégroupe) : le lot se déplace et pivote d’un bloc. « Teinter le lot » change la couleur de tous les éléments sélectionnés.',
    shortcut: 'Ctrl+G / Ctrl+Maj+G',
    related: ['select', 'duplicate'],
  },
  {
    id: 'duplicate',
    category: 'select',
    title: 'Dupliquer, copier et coller',
    keywords: ['dupliquer', 'copier', 'coller', 'couper', 'cloner', 'repeter', 'meme element'],
    answer: 'Ctrl+D duplique la sélection à côté. Ctrl+C / Ctrl+X puis Ctrl+V copie ou déplace des éléments, y compris d’un étage à l’autre.',
    shortcut: 'Ctrl+D · Ctrl+C · Ctrl+V',
    need: { feature: 'canDuplicate' },
    needLabel: 'Duplication et copier-coller',
    related: ['group', 'delete'],
  },
  {
    id: 'delete',
    category: 'select',
    title: 'Supprimer un élément',
    keywords: ['supprimer', 'effacer', 'enlever', 'retirer', 'jeter', 'poubelle', 'suppression'],
    answer: 'Sélectionnez puis appuyez sur Suppr (ou Retour arrière), ou utilisez le bouton corbeille de la barre de sélection. Ctrl+Z annule si besoin.',
    shortcut: 'Suppr',
    related: ['undo', 'select'],
  },
  {
    id: 'lock',
    category: 'select',
    title: 'Verrouiller un élément',
    keywords: ['verrouiller', 'bloquer', 'cadenas', 'figer', 'proteger', 'empecher de bouger'],
    answer: 'Le cadenas du panneau de droite fige un élément : il ne bouge plus par erreur quand vous glissez autour. Cliquez à nouveau pour le libérer.',
    need: { feature: 'canLock' },
    needLabel: 'Verrouillage',
    related: ['select'],
  },
  {
    id: 'snap',
    category: 'select',
    title: 'Grille et aimantation',
    keywords: ['grille', 'aimant', 'aimantation', 'magnetisme', 'snap', 'caler'],
    answer: 'La grille aimantée cale les éléments sur un pas régulier pour des rangées bien droites. Désactivez-la pour un placement libre.',
    need: { feature: 'canSnapGrid' },
    needLabel: 'Grille aimantée',
    related: ['move-precise', 'align'],
  },

  // ───────── Tables ─────────
  {
    id: 'add-table',
    category: 'tables',
    title: 'Ajouter des tables',
    keywords: ['ajouter une table', 'table', 'tables', 'mobilier', 'nouvelle table', 'poser une table'],
    answer: 'Le menu « Mobilier » pose une table ; chacune reçoit automatiquement ses chaises en respectant les dégagements. Les capacités « Places au total » et « Places / table » génèrent tout le plan d’un coup.',
    target: 'tool-furniture',
    related: ['table-shape', 'table-size', 'arc-tables'],
  },
  {
    id: 'table-shape',
    category: 'tables',
    title: 'Forme et nombre de places d’une table',
    keywords: ['forme', 'ronde', 'rectangulaire', 'carree', 'ovale', 'mange debout', 'cocktail', 'places', 'couverts', 'capacite', 'nombre de chaises'],
    answer: 'Sélectionnez la table : choisissez sa forme (ronde, rectangulaire, carrée, ovale, mange-debout, arc) et son nombre de places. La disposition des chaises (tout autour, d’un seul côté, face à la scène) se règle juste en dessous.',
    related: ['table-size', 'chair-style'],
  },
  {
    id: 'table-size',
    category: 'tables',
    title: 'Dimensions et angles d’une table',
    keywords: ['diametre', 'dimension table', 'longueur table', 'largeur table', 'arrondi', 'angle', 'plateau'],
    answer: 'Dans le panneau de la table : diamètre (ronde), longueur et largeur (rectangle, ovale) en mètres, et arrondi des angles. Les poignées sur le plan font la même chose à la souris.',
    related: ['resize', 'table-finish'],
  },
  {
    id: 'table-finish',
    category: 'tables',
    title: 'Nappe, plateau et piètement',
    keywords: ['nappe', 'linge', 'lin', 'bois', 'marbre', 'verre', 'laque', 'noyer', 'plateau', 'pied', 'pietement', 'couleur de table', 'teinte'],
    answer: 'Le panneau de la table choisit la surface (nappe en lin drapée, bois, noyer, marbre, verre, laque blanche…), sa teinte, le piètement (quatre pieds, central, tréteaux, épingles, croisillon) et sa couleur. Une photo de nappe ou de plateau peut aussi être importée.',
    related: ['table-dressing', 'custom-images'],
  },
  {
    id: 'table-dressing',
    category: 'tables',
    title: 'Dresser les tables (couverts, centres de table)',
    keywords: ['dresser', 'couverts', 'assiettes', 'verres', 'serviettes', 'centre de table', 'bouquet', 'art de la table', 'vaisselle'],
    answer: '« Dresser les tables » pose assiettes, verres à pied, serviettes et centres de table sur toutes les tables de banquet. Chaque table peut ensuite garder ou retirer son centre de table et ses couverts.',
    related: ['table-finish'],
  },
  {
    id: 'arc-tables',
    category: 'tables',
    title: 'Tables en arc et en cercle',
    keywords: ['arc', 'cercle', 'demi cercle', 'serpentine', 'couronne', 'tables en arc', 'anneau'],
    answer: 'Le bouton « Arc » pose six tables en arc autour d’un centre ; réglez rayon, nombre de segments et ouverture pour former un cercle complet, un demi-cercle ou une serpentine.',
    related: ['add-table', 'amphitheater'],
  },
  {
    id: 'pmr-table',
    category: 'tables',
    title: 'Table accessible PMR',
    keywords: ['pmr', 'fauteuil roulant', 'handicap', 'accessible', 'accessibilite'],
    answer: 'Cochez « Table accessible PMR » dans le panneau d’une table : une place est libérée avec le dégagement adapté à un fauteuil roulant. « Normes PMR » affiche les allées et gabarits sur le plan.',
    related: ['spacing', 'circulation'],
  },
  {
    id: 'auto-assign',
    category: 'tables',
    title: 'Numéroter et placer les invités',
    keywords: ['numeroter', 'numero', 'nom de table', 'placement', 'plan de table', 'assigner', 'invites a table'],
    answer: 'Chaque table porte un nom ou un numéro modifiable. Le placement automatique répartit les invités par table selon la capacité.',
    need: { feature: 'canAutoAssign' },
    needLabel: 'Placement automatique',
    related: ['guest-photos'],
  },

  // ───────── Chaises ─────────
  {
    id: 'chair-style',
    category: 'chairs',
    title: 'Style et matière des chaises',
    keywords: ['chaise', 'chaises', 'style de chaise', 'chiavari', 'louis', 'medaillon', 'napoleon', 'tiffany', 'crossback', 'windsor', 'bistrot', 'fauteuil', 'velours', 'cuir', 'tissu', 'assise'],
    answer: 'Sélectionnez une table ou une chaise : choisissez le type (banquet, fauteuil, pliante, tabouret…), le style (chiavari, Louis médaillon, Napoléon, Tiffany, crossback, Windsor, bistrot, scandinave, ghost…) et la matière de l’assise (velours, cuir, lin, bouclette…). Une photo de chaise peut aussi être importée.',
    related: ['free-chair', 'custom-images'],
  },
  {
    id: 'free-chair',
    category: 'chairs',
    title: 'Ajouter une chaise ou un fauteuil seul',
    keywords: ['chaise seule', 'fauteuil seul', 'ajouter une chaise', 'canape', 'pouf', 'banquette'],
    answer: 'Le menu « Mobilier » propose aussi des chaises et fauteuils indépendants, des canapés et des poufs, à placer librement autour d’un salon ou d’un bar.',
    related: ['chair-style'],
  },
  {
    id: 'rows',
    category: 'chairs',
    title: 'Rangées de chaises (conférence, cérémonie)',
    keywords: ['rangee', 'rangees', 'rang', 'conference', 'ceremonie', 'theatre', 'allee centrale', 'gradin', 'siege'],
    answer: 'Le menu « Mobilier » pose une rangée de chaises ; réglez le nombre de sièges, le libellé et l’élévation. « Groupes de chaises » crée plusieurs blocs avec allées en une fois.',
    target: 'tool-furniture',
    need: { feature: 'canAddRows' },
    needLabel: 'Rangées de chaises',
    related: ['amphitheater'],
  },
  {
    id: 'amphitheater',
    category: 'chairs',
    title: 'Amphithéâtre et gradins en arc',
    keywords: ['amphitheatre', 'gradins', 'arc de chaises', 'hemicycle', 'auditorium'],
    answer: 'Le générateur d’amphithéâtre dispose des rangées en arc, montées en gradins, face à la scène, avec allées.',
    need: { feature: 'canAddRows' },
    needLabel: 'Gradins',
    related: ['rows'],
  },

  // ───────── Décor ─────────
  {
    id: 'decor-stage',
    category: 'decor',
    title: 'Scène, podium et estrade',
    keywords: ['scene', 'podium', 'estrade', 'orateur', 'passerelle', 'pupitre', 'habillage de scene', 'rideau de scene'],
    answer: 'Le menu « Décor » pose une scène ; son panneau règle taille, hauteur, escaliers, habillage (rideau, guirlande lumineuse, fleurs…) et le type (orateur, couple, passerelle, estrade de groupe).',
    target: 'tool-scene',
    need: { fixture: 'stage' },
    needLabel: 'Scène et décor',
    related: ['instruments', 'led-show'],
  },
  {
    id: 'instruments',
    category: 'decor',
    title: 'Instruments et sono',
    keywords: ['piano', 'batterie', 'micro', 'guitare', 'dj', 'sono', 'enceinte', 'orchestre', 'musique'],
    answer: 'Le menu « Décor » propose piano, batterie, micros et platine DJ, posables sur un podium.',
    related: ['decor-stage'],
  },
  {
    id: 'bar',
    category: 'decor',
    title: 'Bar, buffet et comptoirs',
    keywords: ['bar', 'buffet', 'comptoir', 'cocktail', 'vin', 'champagne', 'biere', 'traiteur', 'restaurant', 'four a pizza', 'caisse'],
    answer: '« Bar » pose un bar à cocktails, vins, champagne ou bières dont on règle plateau, tabourets et métal. « Buffet + couverts » pose une table de buffet garnie. Le menu « Resto & Shop » ajoute comptoirs, four à pizza, banquettes et parasols.',
    related: ['decor-stage'],
  },
  {
    id: 'lighting-fixtures',
    category: 'decor',
    title: 'Lustres, guirlandes et éclairage décoratif',
    keywords: ['lustre', 'cristal', 'suspension', 'guirlande', 'edison', 'appliques', 'bougie', 'lampion', 'lanterne'],
    answer: 'Le menu « Décor » pose lustres en cristal, halos dorés, suspensions et guirlandes Edison sur poteaux. Leur hauteur et leur intensité se règlent dans le panneau.',
    related: ['lighting'],
  },
  {
    id: 'flowers',
    category: 'decor',
    title: 'Fleurs, arches et allées',
    keywords: ['fleurs', 'arche', 'allee', 'tapis rouge', 'petales', 'colonne', 'vegetal', 'bouquet', 'haie', 'motif au sol'],
    answer: 'Le menu « Décor » pose arches florales, colonnes fleuries, cloisons végétalisées, motifs au sol et allées (tapis rouge, miroir blanc, lin et pétales).',
    related: ['decor-stage'],
  },
  {
    id: 'screens',
    category: 'decor',
    title: 'Écrans, télévisions et ordinateurs',
    keywords: ['ecran', 'television', 'tele', 'projecteur', 'moniteur', 'ordinateur', 'portable', 'video'],
    answer: 'Le menu « Décor » pose un écran géant, une télévision murale, un moniteur de régie, un portable ou un ordinateur fixe ; leur orientation se règle dans le panneau.',
    related: ['sightlines'],
  },
  {
    id: 'led-show',
    category: 'decor',
    title: 'Show lumière et murs LED',
    keywords: ['led', 'show', 'jeux de lumiere', 'mur led', 'lasers', 'spectacle'],
    answer: 'Les murs LED et jeux de lumière de scène s’animent en 3D ; leur programme se choisit dans le panneau de l’élément.',
    related: ['decor-stage', 'lighting'],
  },

  // ───────── Zones ─────────
  {
    id: 'zones',
    category: 'zones',
    title: 'Zones : piste, VIP, buffet, moquette',
    keywords: ['zone', 'piste', 'vip', 'espace', 'moquette', 'tapis', 'delimiter', 'surface'],
    answer: 'Le menu « Zones » délimite un espace au sol avec sa propre matière : piste de danse, espace VIP, zone buffet, moquette, emplacements numérotés… Étirez-la avec ses poignées.',
    target: 'tool-zones',
    need: { feature: 'canZones' },
    needLabel: 'Zones',
    related: ['dance-floor'],
  },
  {
    id: 'dance-floor',
    category: 'zones',
    title: 'Piste de danse',
    keywords: ['piste de danse', 'danse', 'dancefloor', 'boule a facettes', 'monogramme', 'initiales'],
    answer: 'Sélectionnez une piste : choisissez son style (blanc brillant, LED, damier, bois…), ajoutez un monogramme (initiales des mariés) et une boule à facettes.',
    related: ['zones', 'crowd'],
  },

  // ───────── Murs ─────────
  {
    id: 'walls',
    category: 'walls',
    title: 'Murs : hauteur, épaisseur, matière',
    keywords: ['mur', 'murs', 'paroi', 'hauteur', 'epaisseur', 'texture', 'brique', 'beton', 'enduit', 'papier peint', 'pierre', 'couleur des murs'],
    answer: 'Ouvrez « Murs, portes & fenêtres » : réglez hauteur, épaisseur et matière de tous les murs (enduit, brique, béton, pierre, papier peint, lambris…) ou d’un seul après l’avoir choisi. « Contour → 4 murs » les recrée depuis le contour de la salle.',
    target: 'walls',
    related: ['wall-trim', 'openings'],
  },
  {
    id: 'wall-trim',
    category: 'walls',
    title: 'Moulures, boiseries et pilastres',
    keywords: ['moulure', 'moulures', 'boiserie', 'lambris', 'cimaise', 'pilastre', 'colonne murale', 'corniche', 'plinthe', 'haussmannien', 'decor mural classique'],
    answer: 'Dans « Murs, portes & fenêtres », « Moulures et boiseries » habille les murs : plinthe et corniche, cimaise, boiserie basse à panneaux, moulures à la française ou pilastres. Choisissez le style pour tous les murs ou un seul, et sa teinte. Les pièces contournent automatiquement portes et fenêtres.',
    target: 'walls',
    related: ['walls'],
  },
  {
    id: 'openings',
    category: 'walls',
    title: 'Portes et fenêtres',
    keywords: ['porte', 'portes', 'fenetre', 'fenetres', 'ouverture', 'baie', 'portail', 'entree', 'sortie de secours', 'rideaux'],
    answer: 'Choisissez un mur : la vue « Placer sur le mur » s’affiche. Ajoutez une porte ou une fenêtre, glissez-la, tirez son coin pour la taille ou tapez les cotes. Style (double, coulissante, arche, portail…), matière, couleur, rideaux et paillasson se règlent juste en dessous.',
    target: 'walls',
    related: ['wall-art', 'walls'],
  },
  {
    id: 'wall-art',
    category: 'walls',
    title: 'Images et graffitis sur les murs',
    keywords: ['graffiti', 'graffitis', 'image', 'affiche', 'logo', 'photo au mur', 'tag', 'fresque', 'street art', 'tableau'],
    answer: 'Dans la vue de face d’un mur, ajoutez une image (photo, affiche, logo) ou un graffiti. Chacun se pose côté salle ou côté extérieur. Le graffiti se stylise : style (chrome, rétro, tag, néon, BD…), police, dégradé, inclinaison, texte en arc, fond peint et effets.',
    target: 'walls',
    related: ['openings'],
  },

  // ───────── Bâtiment ─────────
  {
    id: 'outline',
    category: 'building',
    title: 'Forme et dimensions de la salle',
    keywords: ['contour', 'forme de la salle', 'dimensions de la salle', 'surface', 'metres carres', 'taille de la salle', 'en l'],
    answer: 'Le contour de la salle (rectangle, L, forme libre) et ses dimensions en mètres se règlent dans « Thèmes, murs & sols ». Les murs peuvent ensuite être régénérés depuis ce contour.',
    need: { feature: 'canChangeOutline' },
    needLabel: 'Forme de la salle',
    related: ['walls'],
  },
  {
    id: 'stories',
    category: 'building',
    title: 'Étages, escaliers et mezzanine',
    keywords: ['etage', 'etages', 'niveau', 'escalier', 'mezzanine', 'balcon', 'ascenseur'],
    answer: '« Ajouter un étage » crée un niveau au-dessus ; l’escalier relie les étages et la mezzanine laisse un vide sur le niveau inférieur. Copier-coller fonctionne d’un étage à l’autre.',
    related: ['duplicate', 'roof'],
  },
  {
    id: 'roof',
    category: 'building',
    title: 'Toit et plafond',
    keywords: ['toit', 'plafond', 'toiture', 'charpente', 'verriere', 'tente', 'chapiteau'],
    answer: 'Le style de toit (plat, deux pans, verrière, tente…) et sa couleur se choisissent dans « Thèmes, murs & sols ». En 3D, la vue maquette coupe murs et toit pour voir l’intérieur.',
    related: ['open-space'],
  },
  {
    id: 'open-space',
    category: 'building',
    title: 'Espace en plein air',
    keywords: ['plein air', 'exterieur', 'jardin', 'plage', 'cour', 'sans murs', 'masquer les murs', 'terrasse'],
    answer: 'Passez la salle en plein air pour un jardin, une plage ou une cour : murs, toit, portes et fenêtres disparaissent. « Plein air · ajouter des murs » les remet.',
    related: ['surroundings'],
  },
  {
    id: 'surroundings',
    category: 'building',
    title: 'Abords extérieurs, terrain et ciel',
    keywords: ['abords', 'terrain', 'vegetation', 'arbres', 'pelouse', 'ciel', 'soleil', 'brouillard', 'paysage', 'parking'],
    answer: 'Le menu « Extérieur » règle les abords de la salle en 3D : terrain, végétation, arbres, soleil, ciel et brouillard.',
    need: { feature: 'canFixtures' },
    needLabel: 'Abords extérieurs',
    related: ['lighting', 'open-space'],
  },
  {
    id: 'corridor',
    category: 'building',
    title: 'Couloirs, périmètres et cloisons',
    keywords: ['couloir', 'perimetre', 'cloison', 'barriere', 'cordon', 'potelet', 'separation'],
    answer: 'Le menu « Bâtiment » ajoute couloirs de circulation, cloisons et périmètres de sécurité (potelets et cordons).',
    related: ['circulation'],
  },

  // ───────── Ambiance ─────────
  {
    id: 'floor',
    category: 'ambience',
    title: 'Sol et revêtement',
    keywords: ['sol', 'parquet', 'carrelage', 'marbre', 'beton', 'moquette sol', 'chevron', 'terrazzo', 'revetement', 'texture de sol'],
    answer: 'Dans « Thèmes, murs & sols », choisissez le sol : parquets (chevron, Versailles, lames), marbres, pierre, terrazzo, béton ciré, moquettes, et pour l’extérieur pelouse, pavés, gravier… Vous pouvez aussi importer la photo de votre propre sol et régler la taille du motif.',
    related: ['themes', 'zones'],
  },
  {
    id: 'themes',
    category: 'ambience',
    title: 'Thèmes et ambiances prêtes',
    keywords: ['theme', 'ambiance', 'style', 'deco', 'couleur', 'palette', 'boheme', 'royal', 'industriel', 'champetre'],
    answer: '« Thèmes, murs & sols » applique une ambiance complète (sol, murs, lumière, couleurs) en un clic. Vous pouvez enregistrer votre propre ambiance, la partager avec l’équipe ou l’importer depuis la bibliothèque.',
    need: { feature: 'canThemes' },
    needLabel: 'Thèmes',
    related: ['floor', 'lighting'],
  },
  {
    id: 'lighting',
    category: 'ambience',
    title: 'Lumière : midi, crépuscule, nuit',
    keywords: ['lumiere', 'eclairage', 'nuit', 'crepuscule', 'jour', 'midi', 'soleil', 'ambiance lumineuse', 'sombre', 'clair'],
    answer: 'Le menu « Lumière » choisit l’éclairage scénique : midi (ombres franches), crépuscule (ciel orangé) ou nuit (ciel étoilé et LED). Le réglage fin donne hauteur et orientation du soleil, température, luminosité et brouillard.',
    related: ['render-quality', 'lighting-fixtures'],
  },

  // ───────── Invités ─────────
  {
    id: 'crowd',
    category: 'guests',
    title: 'Voir la salle remplie d’invités',
    keywords: ['salle remplie', 'invites simules', 'foule', 'monde', 'occupee', 'remplissage', 'personnes', 'gens', 'avatars', 'danseurs'],
    answer: 'Dans « Affichage », « Invités simulés » assoit des invités sur les chaises et fait danser la piste, en 3D comme sur le plan 2D. Réglez le taux de remplissage, la piste animée et le thème des tenues (chic, cocktail, blanc, traditionnel…).',
    related: ['guest-photos', 'dance-floor'],
  },
  {
    id: 'guest-photos',
    category: 'guests',
    title: 'Avatars à partir des photos des invités',
    keywords: ['photo des invites', 'portrait', 'avatar', 'visage', 'ressemblance', 'invites reels'],
    answer: '« Portraits des invités » crée des avatars 3D à partir de photos : ils prennent place dans la salle simulée.',
    related: ['crowd'],
  },

  // ───────── IA ─────────
  {
    id: 'ai-studio',
    category: 'ai',
    title: 'Studio IA : composer le plan',
    keywords: ['ia', 'intelligence artificielle', 'studio ia', 'generer', 'composer', 'automatique', 'decrire', 'prompt', 'photo du plan', 'importer un plan', 'scanner'],
    answer: 'Le Studio IA compose le plan pour vous : décrivez l’événement, ou importez une photo du plan ou de la salle existante. L’IA pose tables, scène et décor, reprend portes et fenêtres à leur taille réelle et les graffitis vus sur les murs. Chaque composition consomme des jetons et reste annulable (Ctrl+Z).',
    target: 'studio-ai',
    need: { feature: 'canPlanFromPhoto' },
    needLabel: 'Studio IA',
    related: ['templates', 'custom-element'],
  },
  {
    id: 'custom-element',
    category: 'ai',
    title: 'Créer un élément 3D depuis une photo',
    keywords: ['element personnalise', 'objet perso', 'photo objet', 'png', 'detoure', 'video', 'importer un objet', 'creer un objet'],
    answer: 'Le menu « Importer » crée un élément 3D à partir d’une photo (objet sur fond uni), d’un PNG détouré ou d’une vidéo. Il se place et se redimensionne comme le reste.',
    need: { feature: 'canCustomImages' },
    needLabel: 'Éléments personnalisés',
    related: ['custom-images'],
  },
  {
    id: 'custom-images',
    category: 'ai',
    title: 'Importer vos photos de chaises, tables et sols',
    keywords: ['importer photo', 'ma chaise', 'ma nappe', 'mon sol', 'image perso', 'texture perso', 'photo de chaise'],
    answer: 'Dans le panneau d’une chaise, d’une table ou du sol, « Importer une image » applique votre photo comme matière, avec recadrage.',
    need: { feature: 'canCustomImages' },
    needLabel: 'Images personnalisées',
    related: ['custom-element', 'table-finish'],
  },

  // ───────── Vérifier ─────────
  {
    id: 'spacing',
    category: 'check',
    title: 'Espacements et dégagements',
    keywords: ['espacement', 'degagement', 'distance', 'trop serre', 'passage', 'optimiser', 'espacer', 'ecart'],
    answer: '« Espacements » (Ctrl+Alt+O) mesure les passages entre tables, signale ceux qui sont trop étroits et peut les corriger automatiquement selon un gabarit (standard, bistrot…).',
    shortcut: 'Ctrl+Alt+O',
    target: 'verify',
    related: ['circulation', 'bom'],
  },
  {
    id: 'circulation',
    category: 'check',
    title: 'Allées, sécurité incendie et PMR',
    keywords: ['circulation', 'allee', 'securite', 'incendie', 'evacuation', 'issue de secours', 'pmr', 'normes', 'conforme'],
    answer: '« Circulation » affiche les allées et gabarits de sécurité incendie et PMR : vert = conforme, orange ou rouge = trop étroit. « Normes PMR » montre les repères d’accessibilité.',
    target: 'verify',
    related: ['spacing', 'pmr-table'],
  },
  {
    id: 'sightlines',
    category: 'check',
    title: 'Visibilité vers la scène',
    keywords: ['visibilite', 'voir la scene', 'ligne de vue', 'obstrue', 'cache', 'ecran geant'],
    answer: '« Visibilité » trace la ligne de vue de chaque table vers la scène ou l’écran : vert = dégagée, rouge = obstruée.',
    target: 'verify',
    related: ['decor-stage', 'screens'],
  },
  {
    id: 'bom',
    category: 'check',
    title: 'Matériel à commander (nomenclature)',
    keywords: ['materiel', 'inventaire', 'nomenclature', 'bom', 'combien', 'compter', 'quantite', 'liste du materiel', 'commande'],
    answer: '« Matériel » compte tables, chaises, nappes, décor et équipements du plan : la liste à commander ou à préparer.',
    target: 'verify',
    related: ['budget'],
  },
  {
    id: 'budget',
    category: 'check',
    title: 'Estimer le budget',
    keywords: ['budget', 'prix', 'cout', 'devis', 'estimation', 'tarif', 'combien ca coute'],
    answer: '« Estimer mon budget » propose plusieurs formules chiffrées à partir du plan (mobilier, décor, capacité).',
    related: ['bom'],
  },

  // ───────── Enregistrer ─────────
  {
    id: 'undo',
    category: 'save',
    title: 'Annuler et rétablir',
    keywords: ['annuler', 'retablir', 'revenir en arriere', 'erreur', 'ctrl z', 'historique', 'defaire'],
    answer: 'Ctrl+Z annule la dernière action, Ctrl+Y la rétablit ; les flèches en haut de l’éditeur font de même. Le journal des actions retrace chaque modification.',
    shortcut: 'Ctrl+Z / Ctrl+Y',
    related: ['variants'],
  },
  {
    id: 'variants',
    category: 'save',
    title: 'Variantes et modèles enregistrés',
    keywords: ['enregistrer', 'sauvegarder', 'variante', 'version', 'plusieurs plans', 'comparer', 'mon modele', 'dupliquer le plan'],
    answer: 'Le plan est enregistré avec votre salle. « Plans de salle » garde plusieurs variantes (cocktail, dîner, cérémonie) pour basculer de l’une à l’autre, et « Enregistrer comme modèle » le rend réutilisable.',
    related: ['templates', 'undo'],
  },

  // ───────── Partager ─────────
  {
    id: 'export-image',
    category: 'share',
    title: 'Exporter une image ou imprimer',
    keywords: ['exporter', 'capture', 'image', 'png', 'imprimer', 'pdf', 'telecharger', 'screenshot'],
    answer: '« Capture » exporte une image PNG haute définition de la vue 3D ; le plan 2D s’imprime depuis le portail invités.',
    related: ['share', 'walkthrough'],
  },
  {
    id: 'share',
    category: 'share',
    title: 'Partager le plan',
    keywords: ['partager', 'lien', 'envoyer', 'client', 'equipe', 'collaborer', 'integrer', 'embed', 'site web'],
    answer: 'Copiez le lien de partage pour montrer le plan à un client ou à l’équipe ; le code d’intégration affiche la visite 3D sur votre site.',
    related: ['publish', 'export-image'],
  },
  {
    id: 'publish',
    category: 'share',
    title: 'Publier la salle sur la vitrine',
    keywords: ['publier', 'vitrine', 'marketplace', 'annonce', 'visiteurs', 'plans 3d', 'catalogue public'],
    answer: 'Publiez la salle pour qu’elle apparaisse dans la vitrine publique : les visiteurs la parcourent en 2D et en 3D et peuvent la voir remplie d’invités.',
    related: ['share', 'crowd'],
  },
];

const TOPIC_BY_ID = new Map(EDITOR_HELP_TOPICS.map((t) => [t.id, t]));

export function editorHelpTopic(id: string): EditorHelpTopic | undefined {
  return TOPIC_BY_ID.get(id);
}

/** Mots vides français ignorés par la recherche. */
const STOPWORDS = new Set([
  'a', 'au', 'aux', 'avec', 'ce', 'ces', 'comment', 'dans', 'de', 'des', 'du', 'elle', 'en', 'est', 'et', 'il', 'je', 'la', 'le', 'les', 'leur',
  'ma', 'mais', 'me', 'mes', 'moi', 'mon', 'ne', 'on', 'ou', 'par', 'pas', 'pour', 'qu', 'que', 'qui', 'sa', 'se', 'ses', 'son', 'sur', 'ta', 'te',
  'tes', 'ton', 'tu', 'un', 'une', 'vos', 'votre', 'vous', 'y', 'faire', 'fait', 'peux', 'peut', 'puis', 'veux', 'voudrais', 'faut', 'il faut',
  'est ce', 'quoi', 'ou', 'bien', 'svp', 'stp', 'merci', 'bonjour', 'salut', 'l', 'd', 'j', 'c', 's', 'n', 'm', 't',
]);

/** Synonymes courants ramenés au terme employé dans les fiches. */
const SYNONYMS: Record<string, string> = {
  effacer: 'supprimer', enlever: 'supprimer', retirer: 'supprimer', virer: 'supprimer',
  bouger: 'deplacer', glisser: 'deplacer', decaler: 'deplacer',
  agrandir: 'taille', retrecir: 'taille', redimensionner: 'taille', grandeur: 'taille',
  tourner: 'pivoter', rotation: 'pivoter',
  copier: 'dupliquer', cloner: 'dupliquer',
  sauvegarder: 'enregistrer', sauver: 'enregistrer',
  fenetre: 'fenetre', fenetres: 'fenetre', portes: 'porte',
  chaises: 'chaise', tables: 'table', murs: 'mur', graffitis: 'graffiti', images: 'image', zones: 'zone',
  invite: 'invites', invitee: 'invites', invitees: 'invites', convives: 'invites',
  lumieres: 'lumiere', eclairer: 'lumiere',
  boiseries: 'boiserie', moulure: 'moulures', pilastres: 'pilastre',
  ia: 'ia', ai: 'ia', intelligence: 'ia',
};

export function normalizeHelpText(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’']/g, ' ')
    .replace(/[^a-z0-9+/ ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function stem(word: string): string {
  // Racine grossière : pluriels, terminaisons verbales fréquentes, e final.
  return word.replace(/(ements|ement|ations|ation|eurs|eur|ees|ee|es|s|er|ez)$/, '').replace(/e$/, '');
}

/** Verbes et noms passe-partout : ils comptent peu, l'objet de la question décide. */
const GENERIC = new Set(['ajout', 'mettr', 'chang', 'voir', 'modifi', 'utilis', 'cre', 'regl', 'avoir', 'sall', 'plan', 'element', 'nouvel', 'nouveau', 'fair', 'veux', 'aim', 'choisir', 'pos']);

export function helpTokens(s: string): string[] {
  return normalizeHelpText(s)
    .split(' ')
    .filter((w) => w.length > 1 && !STOPWORDS.has(w))
    .map((w) => SYNONYMS[w] ?? w);
}

type Indexed = { topic: EditorHelpTopic; title: string; keywords: string[]; body: string };

const INDEX: Indexed[] = EDITOR_HELP_TOPICS.map((topic) => ({
  topic,
  title: normalizeHelpText(topic.title),
  keywords: topic.keywords.map(normalizeHelpText),
  body: normalizeHelpText([topic.answer, ...(topic.steps ?? []), topic.shortcut ?? ''].join(' ')),
}));

function scoreTopic(entry: Indexed, tokens: string[], phrase: string): number {
  let score = 0;
  // Expression entière reconnue : très fort signal.
  for (const k of entry.keywords) {
    if (k.includes(' ') && phrase.includes(k)) score += 8;
  }
  const titleWords = new Set(entry.title.split(' ').map(stem));
  const keyWords = new Set(entry.keywords.flatMap((k) => k.split(' ')).map(stem));
  const bodyWords = new Set(entry.body.split(' ').map(stem));
  for (const tok of tokens) {
    const s = stem(tok);
    if (s.length < 2) continue;
    const weak = GENERIC.has(s);
    if (keyWords.has(s)) score += weak ? 1 : 4;
    if (titleWords.has(s)) score += weak ? 1 : 3;
    else if (bodyWords.has(s)) score += 1;
  }
  return score;
}

export type EditorHelpMatch = { topic: EditorHelpTopic; score: number };

/** Fiches classées par pertinence pour une question libre. */
export function searchEditorHelp(query: string, limit = 5): EditorHelpMatch[] {
  const phrase = normalizeHelpText(query);
  const tokens = helpTokens(query);
  if (!tokens.length && !phrase) return [];
  return INDEX.map((entry) => ({ topic: entry.topic, score: scoreTopic(entry, tokens, ` ${phrase} `) }))
    .filter((m) => m.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/** Questions qui demandent la liste complète plutôt qu'une action précise. */
const OVERVIEW_PATTERNS = [
  /\b(tout|toutes|tous)\b.*\b(action|fonction|possibilite|faire|option)/,
  /\bque (puis|peut|peux|peut on|est ce que je peux)\b.*\bfaire\b/,
  /\b(liste|descriptif|description|sommaire|menu|recapitulatif|resume)\b/,
  /\bquelles? (sont les )?(actions|fonctions|fonctionnalites|possibilites|options)\b/,
  /^(aide|help|\?)$/,
];

export function isOverviewQuestion(query: string): boolean {
  const q = normalizeHelpText(query);
  return OVERVIEW_PATTERNS.some((re) => re.test(q));
}

export type EditorHelpAnswer =
  | { kind: 'overview' }
  | { kind: 'topic'; topic: EditorHelpTopic; related: EditorHelpTopic[] }
  | { kind: 'unknown'; suggestions: EditorHelpTopic[] };

/** Réponse de l'assistant à une question libre. */
export function answerEditorQuestion(query: string): EditorHelpAnswer {
  if (isOverviewQuestion(query)) return { kind: 'overview' };
  const matches = searchEditorHelp(query, 6);
  const best = matches[0];
  if (!best || best.score < 3) {
    const fallback = ['overview', 'quick-add', 'add-table', 'walls', 'ai-studio', 'crowd']
      .map((id) => TOPIC_BY_ID.get(id))
      .filter((t): t is EditorHelpTopic => Boolean(t));
    return { kind: 'unknown', suggestions: matches.length ? matches.map((m) => m.topic) : fallback };
  }
  const relatedIds = new Set(best.topic.related ?? []);
  const related = [
    ...(best.topic.related ?? []).map((id) => TOPIC_BY_ID.get(id)).filter((t): t is EditorHelpTopic => Boolean(t)),
    ...matches.slice(1).map((m) => m.topic).filter((t) => !relatedIds.has(t.id)),
  ].slice(0, 4);
  return { kind: 'topic', topic: best.topic, related };
}

export type EditorHelpSection = { category: EditorHelpCategory; label: string; topics: EditorHelpTopic[] };

/** Descriptif complet de l'éditeur, rangé par thème. */
export function editorHelpOverview(): EditorHelpSection[] {
  return EDITOR_HELP_CATEGORY_ORDER.map((category) => ({
    category,
    label: EDITOR_HELP_CATEGORY_LABELS[category],
    topics: EDITOR_HELP_TOPICS.filter((t) => t.category === category),
  })).filter((s) => s.topics.length > 0);
}

/** Forfait requis pour une fiche (null si incluse dans le forfait courant). */
export function editorHelpLock(topic: EditorHelpTopic, caps: RoomEditorCapabilities | null | undefined): { planLabel: string | null; message: string } | null {
  if (!topic.need || !caps) return null;
  const need = topic.need;
  const ok = 'feature' in need ? caps[need.feature] : 'fixture' in need ? caps.fixtureKinds.includes(need.fixture) : caps.tableShapes.includes(need.shape);
  if (ok) return null;
  const upsell = describeEditorUpsell(topic.needLabel ?? topic.title, need, caps.level);
  return { planLabel: upsell.planLabel, message: upsell.message };
}

/** Questions proposées à l'ouverture de l'assistant. */
export const EDITOR_HELP_SUGGESTIONS = [
  'Que puis-je faire dans l’éditeur ?',
  'Comment ajouter une porte ?',
  'Comment changer la taille d’une table ?',
  'Comment voir la salle remplie ?',
  'Comment mettre des moulures sur les murs ?',
  'Comment vérifier les passages ?',
];
