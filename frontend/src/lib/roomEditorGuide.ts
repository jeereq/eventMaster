/**
 * Guides pas à pas de l'éditeur de salle : la liste complète des actions possibles, chacune
 * découpée en gestes précis (« ouvrez ce menu », « cliquez ce bouton », « choisissez dans cette liste »).
 *
 * Chaque étape désigne l'élément réel de l'interface à éclairer, par un repère texte :
 * - `tour:nom`   → attribut `data-tour="nom"` ;
 * - `btn:Texte`  → bouton (ou lien, onglet, case) dont le texte, l'aria-label ou le title commence par « Texte » ;
 * - `field:Nom`  → champ (liste, case, curseur, saisie) dont l'étiquette, l'aria-label ou le placeholder commence par « Nom » ;
 * - `label:Nom`  → n'importe quel élément dont l'aria-label ou le title commence par « Nom » ;
 * - `css:sélecteur`.
 * `A >> B` cherche B à l'intérieur de A. Le moteur (composant `EditorGuideRunner`) attend que
 * l'élément apparaisse, montre d'abord le menu à ouvrir s'il est caché, et passe à l'étape suivante
 * dès que le geste demandé est fait.
 *
 * Tout est local : recherche en langage naturel (français) sans appel réseau ni jeton IA.
 */

import type { RoomEditorCapabilities } from './roomEditorAccess.ts';
import { describeEditorUpsell, type EditorNeed } from './roomEditorUpsell.ts';
import { HOME_FURNITURE_GROUP_LABELS, HOME_FURNITURE_META, HOME_FURNITURE_ORDER } from './roomHomeFurniture.ts';
import { LANDSCAPE_GROUP_LABELS, LANDSCAPE_STYLE_META, LANDSCAPE_STYLE_ORDER } from './roomOutdoorUtils.ts';

export type EditorGuideCategory =
  | 'start'
  | 'view'
  | 'select'
  | 'tables'
  | 'chairs'
  | 'decor'
  | 'hospitality'
  | 'home'
  | 'zones'
  | 'walls'
  | 'building'
  | 'outdoor'
  | 'ambience'
  | 'guests'
  | 'ai'
  | 'check'
  | 'save'
  | 'share';

export const EDITOR_GUIDE_CATEGORY_LABELS: Record<EditorGuideCategory, string> = {
  start: 'Démarrer',
  view: 'Vues 2D / 3D et caméra',
  select: 'Sélectionner, déplacer, redimensionner',
  tables: 'Tables',
  chairs: 'Chaises, rangées et gradins',
  decor: 'Scène, bars, écrans et décor',
  hospitality: 'Restaurant et boutique',
  home: 'Mobilier de maison',
  zones: 'Zones et piste de danse',
  walls: 'Murs, portes, fenêtres et décor mural',
  building: 'Bâtiment, étages et dimensions',
  outdoor: 'Extérieur et jardin',
  ambience: 'Thèmes, sols, plafond et lumière',
  guests: 'Invités et salle remplie',
  ai: 'Studio IA et éléments personnalisés',
  check: 'Vérifier et compter',
  save: 'Annuler, enregistrer et modèles',
  share: 'Exporter, publier et partager',
};

export const EDITOR_GUIDE_CATEGORY_ORDER: EditorGuideCategory[] = [
  'start', 'view', 'select', 'tables', 'chairs', 'decor', 'hospitality', 'home', 'zones', 'walls', 'building', 'outdoor', 'ambience', 'guests', 'ai', 'check', 'save', 'share',
];

/** Onglet du bas d'écran (téléphone) où se trouve l'élément. */
export type GuidePane = 'plan' | 'tools' | 'edit';

export const GUIDE_PANE_LABELS: Record<GuidePane, string> = { plan: 'Plan', tools: 'Ajouter', edit: 'Régler' };

/**
 * Sélection attendue avant de continuer : `none` = rien de sélectionné, `any` = au moins un élément,
 * `many` = au moins deux, sinon un type d'élément (`fixture:door` = une porte posée au sol).
 */
export type GuideSelect = 'none' | 'any' | 'many' | 'table' | 'row' | 'zone' | 'chair' | 'wall' | 'fixture' | `fixture:${string}`;

export type GuideDone = 'click' | 'change' | 'next' | 'key' | 'select';

export type GuideStep = {
  /** Consigne affichée, à l'impératif : quoi faire, où, et ce qui va se passer. */
  say: string;
  /** Élément à éclairer (le premier repère trouvé l'emporte). */
  target?: string | string[];
  /** Menus à ouvrir avant que la cible n'apparaisse, du plus extérieur au plus intérieur. */
  via?: string[];
  /** Onglet du bas (téléphone) qui contient la cible. */
  pane?: GuidePane;
  /** Geste qui termine l'étape ; par défaut : clic sur la cible, sinon bouton « Suivant ». */
  done?: GuideDone;
  /** Raccourci clavier qui termine l'étape (« Mod » = Ctrl, ou Cmd sur Mac). */
  key?: string;
  select?: GuideSelect;
  /** La cible ouvre un menu ou une section : étape sautée si elle est déjà ouverte. */
  open?: boolean;
  /** Aide quand la cible n'est pas affichée. */
  hint?: string;
};

export type EditorGuideAction = {
  id: string;
  category: EditorGuideCategory;
  title: string;
  /** Mots et expressions qu'un utilisateur emploierait (accents et majuscules indifférents). */
  keywords: string[];
  steps: GuideStep[];
  /** Ce que l'on obtient, affiché à la fin du guide. */
  result: string;
  shortcut?: string;
  need?: EditorNeed;
  needLabel?: string;
  related?: string[];
};

/** Mode de fin d'une étape, valeur par défaut comprise. */
export function guideStepDone(step: GuideStep): GuideDone {
  if (step.done) return step.done;
  if (step.select) return 'select';
  if (step.key && !step.target) return 'key';
  return step.target ? 'click' : 'next';
}

export function guideStepTargets(step: GuideStep): string[] {
  if (!step.target) return [];
  return Array.isArray(step.target) ? step.target : [step.target];
}

// ─────────────────────────────────────────────────────────────────────────────
// Briques de guide
// ─────────────────────────────────────────────────────────────────────────────

type ToolGroup = 'furniture' | 'hospitality' | 'home' | 'zones' | 'building' | 'scene' | 'outdoor' | 'custom' | 'display' | 'view' | 'light';

const GROUP_LABEL: Record<ToolGroup, string> = {
  furniture: 'Mobilier',
  hospitality: 'Resto & Shop',
  home: 'Maison',
  zones: 'Zones',
  building: 'Bâtiment',
  scene: 'Décor',
  outdoor: 'Extérieur',
  custom: 'Importer',
  display: 'Affichage',
  view: 'Rendu',
  light: 'Lumière',
};

/**
 * Menus du groupe « Ajouter » rangés sous le bouton « Plus » de la barre d'outils
 * (`data-tour="tool-more"`) : l'éditeur ne montre que les cinq premiers.
 */
export const EDITOR_TOOLBAR_MORE_GROUPS = ['scene', 'outdoor', 'custom'] as const;

function inMore(group: ToolGroup): boolean {
  return (EDITOR_TOOLBAR_MORE_GROUPS as readonly string[]).includes(group);
}

/** Ouvre un menu de la barre d'outils. */
function openMenu(group: ToolGroup): GuideStep {
  const more = inMore(group);
  return {
    say: more
      ? `Ouvrez « Plus », puis le menu « ${GROUP_LABEL[group]} » de la barre d’outils, en haut de l’éditeur.`
      : `Ouvrez le menu « ${GROUP_LABEL[group]} » de la barre d’outils, en haut de l’éditeur.`,
    target: `tour:tool-${group}`,
    ...(more ? { via: ['tour:tool-more'] } : {}),
    pane: 'tools',
    open: true,
  };
}

/** Élément à l'intérieur d'un menu de la barre d'outils. */
function inMenu(group: ToolGroup, locator: string, say: string, done?: GuideDone): GuideStep {
  const via = inMore(group) ? ['tour:tool-more', `tour:tool-${group}`] : [`tour:tool-${group}`];
  return { say, target: `css:#editor-tool-group-${group} >> ${locator}`, via, pane: 'tools', done };
}

/** Ouvre un menu puis clique un de ses boutons. */
function menu(group: ToolGroup, button: string, say: string): GuideStep[] {
  return [openMenu(group), inMenu(group, `btn:${button}`, say)];
}

const SELECT_WORDS: Record<string, string> = {
  any: 'un élément (table, chaise, décor…)',
  many: 'au moins deux éléments : cliquez le premier, puis Maj+clic sur les autres',
  table: 'une table',
  row: 'une rangée de chaises',
  zone: 'une zone (piste, VIP, buffet…)',
  chair: 'une chaise seule',
  wall: 'un mur',
  fixture: 'un élément de décor (scène, bar, fleurs…)',
};

/** Fait sélectionner un élément du plan avant de continuer. */
function pick(kind: GuideSelect, what?: string): GuideStep {
  if (kind === 'none') {
    return {
      say: 'Appuyez sur Échap (ou cliquez dans le vide) pour tout désélectionner : le panneau de droite affiche alors les réglages de la salle.',
      select: 'none',
      target: 'tour:canvas',
      pane: 'plan',
    };
  }
  const label = what ?? SELECT_WORDS[kind] ?? 'l’élément voulu';
  return {
    say: `Cliquez ${label.startsWith('au moins') ? label : `sur ${label}`} dans le plan. Astuce : la liste « Éléments du plan » du panneau de droite permet aussi de le choisir.`,
    select: kind,
    target: 'tour:canvas',
    pane: 'plan',
    hint: `S’il n’y en a pas encore sur le plan, ajoutez-en d’abord.`,
  };
}

/** Élément du panneau de réglages (à droite sur ordinateur, onglet « Régler » sur téléphone). */
function side(locator: string | string[], say: string, done: GuideDone = 'change', via?: string): GuideStep {
  const list = Array.isArray(locator) ? locator : [locator];
  return { say, target: list.map((l) => `tour:sidebar >> ${l}`), pane: 'edit', done, via: via ? [`tour:sidebar >> ${via}`] : undefined };
}

const ALIGN_BOX = 'btn:Aligner, ranger & grouper';
const BATCH_BOX = 'btn:Style, échelle & rotation par lot';

/** Bouton de la barre d'actions qui apparaît sur le plan quand un élément est sélectionné. */
function hud(label: string, say: string, done?: GuideDone): GuideStep {
  return { say, target: `tour:selection-bar >> btn:${label}`, pane: 'plan', done };
}

const ACCORDIONS = {
  ambience: ['acc-ambience', 'Environnement & Thèmes'],
  building: ['acc-building', 'Étages & vues'],
  arrange: ['acc-arrange', 'Agencement automatique'],
  walls: ['walls', 'Murs, portes & fenêtres'],
  config: ['acc-config', 'Configuration Globale'],
} as const;

/** Ouvre une section des réglages de la salle (rien ne doit être sélectionné). */
function section(id: keyof typeof ACCORDIONS): GuideStep[] {
  const [tour, label] = ACCORDIONS[id];
  const hint = id === 'walls' ? 'La salle est en plein air : murs et toit sont masqués. Recliquez « Espace ouvert » dans le menu « Zones » pour les retrouver.' : undefined;
  return [pick('none'), { say: `Dans le panneau de droite, ouvrez la section « ${label} ».`, target: `tour:${tour}`, pane: 'edit', open: true, hint }];
}

function info(say: string, target?: string | string[], pane?: GuidePane): GuideStep {
  return { say, target, pane, done: 'next' };
}

function key(combo: string, say: string, target?: string): GuideStep {
  return { say, key: combo, target, done: 'key', pane: target === 'tour:canvas' ? 'plan' : undefined };
}

const QUICK = 'tour:quick-create';

// ─────────────────────────────────────────────────────────────────────────────
// Catalogue
// ─────────────────────────────────────────────────────────────────────────────

const A: EditorGuideAction[] = [];
const add = (...actions: EditorGuideAction[]) => A.push(...actions);

// ───────── Démarrer ─────────
add(
  {
    id: 'tour',
    category: 'start',
    title: 'Faire la visite guidée de l’éditeur',
    keywords: ['visite', 'guide', 'tutoriel', 'decouvrir', 'premiere fois', 'debutant', 'apprendre'],
    steps: [{ say: 'Cliquez « Guide » : la visite présente chaque zone de l’éditeur en deux minutes.', target: ['tour:tour'], pane: 'tools' }],
    result: 'La visite démarre. Vous pouvez la quitter à tout moment avec Échap.',
  },
  {
    id: 'templates',
    category: 'start',
    title: 'Partir d’un modèle de salle',
    keywords: ['modele', 'template', 'gabarit', 'banquet', 'conference', 'cocktail', 'pret a l emploi', 'demarrer vite'],
    need: { feature: 'canTemplates' },
    needLabel: 'Modèles de salle',
    steps: [
      { say: 'Cliquez « Modèles » en haut de l’éditeur (sur téléphone : « Modèles de salle » dans l’onglet « Ajouter »).', target: ['tour:templates', 'css:#editor-templates > summary', 'btn:Un modèle'], pane: 'tools', open: true },
      info('Choisissez une catégorie (mariage, conférence, cocktail…) dans la rangée d’onglets, puis cliquez un modèle : le plan est remplacé, et Ctrl+Z revient en arrière.', 'css:#editor-templates', 'tools'),
    ],
    result: 'Le modèle est posé dans votre salle, prêt à être ajusté.',
    related: ['template-save', 'undo'],
  },
  {
    id: 'quick-add',
    category: 'start',
    title: 'Rechercher n’importe quel élément à ajouter',
    keywords: ['rechercher', 'trouver', 'ctrl k', 'palette', 'commande', 'ajouter rapidement', 'chercher un element'],
    shortcut: 'Ctrl+K ou /',
    steps: [
      { say: 'Cliquez « Ajouter… » (ou appuyez sur Ctrl+K).', target: 'tour:quick-add', pane: 'tools' },
      { say: 'Tapez ce que vous cherchez : « bar », « piano », « porte », « palmier »…', target: 'field:Rechercher', done: 'next' },
      info('Cliquez le résultat voulu (ou Entrée) : l’élément est posé au centre du plan.', 'field:Rechercher'),
    ],
    result: 'L’élément est ajouté au centre du plan et sélectionné.',
  },
  {
    id: 'shortcuts',
    category: 'start',
    title: 'Voir tous les raccourcis clavier',
    keywords: ['raccourci', 'clavier', 'touche', 'shortcut', 'ctrl'],
    shortcut: '?',
    steps: [
      { say: 'Cliquez l’icône clavier « Raccourcis clavier » (ou appuyez sur ?).', target: 'tour:shortcuts', pane: 'tools' },
      info('La fenêtre liste chaque raccourci : annuler, dupliquer, grouper, pivoter, déplacer au clavier…'),
    ],
    result: 'Fermez la fenêtre avec Échap.',
  },
  {
    id: 'mobile',
    category: 'start',
    title: 'Utiliser l’éditeur sur téléphone',
    keywords: ['telephone', 'mobile', 'smartphone', 'tablette', 'onglet', 'petit ecran'],
    steps: [
      { say: 'Touchez « Ajouter » en bas de l’écran : barre d’outils, modèles et menus d’ajout.', target: 'tour:pane-tools', hint: 'Ces onglets n’existent que sur petit écran : sur ordinateur, tout est affiché à la fois.' },
      { say: 'Touchez « Régler » : réglages de l’élément sélectionné, ou de la salle si rien n’est sélectionné.', target: 'tour:pane-edit', hint: 'Sur ordinateur, ces réglages sont dans le panneau de droite.' },
      { say: 'Touchez « Plan » pour revenir au plan : glissez pour tourner, pincez pour zoomer.', target: 'tour:pane-plan', hint: 'Sur ordinateur, le plan reste toujours affiché au centre.' },
    ],
    result: 'Vous savez passer du plan aux outils et aux réglages.',
  },
);

// ───────── Vues ─────────
add(
  {
    id: 'view-2d',
    category: 'view',
    title: 'Passer en plan 2D (vue du dessus)',
    keywords: ['2d', 'plan', 'vue du dessus', 'a plat', 'plan masse'],
    shortcut: 'V',
    steps: [{ say: 'Cliquez l’icône grille « Afficher le plan 2D » en haut du plan (sur téléphone : « 2D » au-dessus du plan).', target: 'tour:view-toggle >> btn:Afficher le plan 2D', pane: 'plan', open: true }],
    result: 'Le plan s’affiche vu du dessus, avec l’échelle et la boussole.',
    related: ['view-3d', 'perspective'],
  },
  {
    id: 'view-3d',
    category: 'view',
    title: 'Passer en vue 3D',
    keywords: ['3d', 'perspective', 'relief', 'vue 3d', 'immersif'],
    shortcut: 'V',
    steps: [{ say: 'Cliquez l’icône cube « Afficher la perspective 3D » en haut du plan (sur téléphone : « 3D » au-dessus du plan).', target: 'tour:view-toggle >> btn:Afficher la perspective 3D', pane: 'plan', open: true }],
    result: 'La salle s’affiche en relief. Glissez pour tourner, molette pour zoomer.',
    related: ['orbit', 'view-2d'],
  },
  {
    id: 'orbit',
    category: 'view',
    title: 'Tourner autour de la salle et zoomer',
    keywords: ['tourner', 'camera', 'orbite', 'zoom', 'zoomer', 'rotation vue', 'angle de vue'],
    shortcut: 'L',
    steps: [
      { say: 'Cliquez l’icône « Tourner la vue » (sur téléphone : « Regarder ») : glisser sur le plan fera tourner la caméra.', target: 'tour:view-toggle >> btn:Tourner la vue', pane: 'plan', open: true },
      info('Glissez sur le plan pour tourner. Molette (ou pincement à deux doigts) pour zoomer, clic droit glissé pour décaler.', 'tour:canvas', 'plan'),
    ],
    result: 'Repassez en « Déplacer les objets » (touche L) pour bouger le mobilier.',
    related: ['move-mode', 'recenter'],
  },
  {
    id: 'move-mode',
    category: 'view',
    title: 'Glisser pour déplacer les objets (mode placement)',
    keywords: ['mode placement', 'deplacer les objets', 'verrouiller la camera', 'glisser objet', 'le plan tourne'],
    shortcut: 'L',
    steps: [{ say: 'Cliquez l’icône « Déplacer les objets » (sur téléphone : « Déplacer ») : glisser un élément le déplace, la caméra ne tourne plus.', target: 'tour:view-toggle >> btn:Déplacer les objets', pane: 'plan', open: true }],
    result: 'Glisser déplace désormais le mobilier.',
    related: ['move-drag', 'orbit'],
  },
  {
    id: 'recenter',
    category: 'view',
    title: 'Recentrer la caméra',
    keywords: ['recentrer', 'perdu', 'reinitialiser la vue', 'revenir au centre', 'camera'],
    shortcut: 'C',
    steps: [{ say: 'Cliquez l’icône cible « Recentrer la vue » en haut du plan.', target: ['tour:view-toggle >> btn:Recentrer la vue', 'btn:Recentrer la caméra'], pane: 'plan' }],
    result: 'La caméra revient sur l’ensemble de la salle.',
  },
  {
    id: 'perspective',
    category: 'view',
    title: 'Doser la perspective 3D (de 0 à 100 %)',
    keywords: ['perspective', 'inclinaison', 'pourcentage', 'curseur 3d', 'degre de 3d'],
    steps: [
      ...section('arrange'),
      side('field:Perspective 3D', 'Glissez le curseur « Perspective 3D » : 0 = vue du dessus, 100 = vue 3D immersive.'),
    ],
    result: 'La vue prend l’inclinaison choisie.',
  },
  {
    id: 'expand',
    category: 'view',
    title: 'Agrandir l’éditeur en plein écran',
    keywords: ['plein ecran', 'agrandir', 'fullscreen', 'plus grand', 'reduire'],
    steps: [{ say: 'Cliquez l’icône « Agrandir l’éditeur » en haut à droite. Le même bouton le réduit.', target: ['btn:Agrandir l’éditeur', 'btn:Réduire l’éditeur'], hint: 'Ici, l’éditeur occupe déjà toute la page.' }],
    result: 'L’éditeur occupe tout l’écran.',
  },
  {
    id: 'walkthrough',
    category: 'view',
    title: 'Visiter la salle à pied',
    keywords: ['visite', 'a pied', 'marcher', 'faire le tour', 'promenade', 'premiere personne', 'entrer'],
    steps: menu('display', 'Faire le tour', 'Cliquez « Faire le tour » : la caméra entre par la porte et parcourt la salle.'),
    result: 'La visite se joue ; Échap ou un clic l’arrête.',
    related: ['presentation'],
  },
  {
    id: 'presentation',
    category: 'view',
    title: 'Mode présentation (rotation automatique, sans étiquettes)',
    keywords: ['presentation', 'client', 'demo', 'montrer', 'tourne tout seul', 'sans etiquettes'],
    need: { feature: 'canShowcaseRender' },
    needLabel: 'Mode présentation',
    steps: menu('view', 'Présentation', 'Cliquez « Présentation » : la caméra tourne seule et les étiquettes disparaissent. Recliquez pour arrêter.'),
    result: 'La salle tourne lentement, prête à être montrée.',
  },
  {
    id: 'render-quality',
    category: 'view',
    title: 'Choisir la qualité du rendu 3D',
    keywords: ['qualite', 'rendu', 'hd', 'lent', 'rapide', 'performance', 'ombres', 'beau'],
    need: { feature: 'canShowcaseRender' },
    needLabel: 'Rendu vitrine',
    steps: [openMenu('view'), inMenu('view', 'field:Qualité', 'Choisissez la qualité dans la liste : « Brouillon » pour un ordinateur lent, la plus haute pour les captures.', 'change')],
    result: 'Le rendu 3D change aussitôt.',
  },
  {
    id: 'discovery',
    category: 'view',
    title: 'Choisir la vue d’arrivée des visiteurs',
    keywords: ['decouverte', 'arrivee', 'vue d accueil', 'premiere vue', 'perspective d arrivee', 'visiteurs'],
    steps: [
      openMenu('view'),
      inMenu('view', 'field:Découverte', 'Dans « Découverte », choisissez par quelle perspective les visiteurs découvrent la salle.', 'change'),
      inMenu('view', 'btn:Revoir l’arrivée', 'Cliquez « Revoir l’arrivée » pour la rejouer telle qu’ils la verront.'),
    ],
    result: 'Les visiteurs arriveront sur la salle par cette perspective.',
  },
  {
    id: 'toggle-roof',
    category: 'view',
    title: 'Masquer ou afficher le toit',
    keywords: ['toit', 'plafond', 'masquer le toit', 'voir dedans', 'cacher'],
    steps: menu('display', 'Toit', 'Cliquez « Toit » : il se masque (ou réapparaît). Rien n’est supprimé.'),
    result: 'Le toit est masqué ou réaffiché.',
    related: ['roof-style'],
  },
  {
    id: 'toggle-walls',
    category: 'view',
    title: 'Masquer ou afficher les murs',
    keywords: ['masquer les murs', 'cacher les murs', 'voir a travers', 'murs invisibles'],
    steps: menu('display', 'Murs', 'Cliquez « Murs » : ils se masquent pour placer le mobilier, sans être supprimés. Recliquez pour les réafficher.'),
    result: 'Les murs sont masqués ou réaffichés.',
  },
);

// ───────── Sélection, déplacement, taille ─────────
add(
  {
    id: 'select-one',
    category: 'select',
    title: 'Sélectionner un élément',
    keywords: ['selectionner', 'choisir', 'cliquer sur', 'selection', 'reglages d un element'],
    steps: [
      pick('any'),
      info('Ses réglages s’affichent dans le panneau de droite (onglet « Régler » sur téléphone), et une barre d’actions apparaît sur le plan.', 'tour:sidebar', 'edit'),
    ],
    result: 'L’élément est sélectionné.',
  },
  {
    id: 'select-many',
    category: 'select',
    title: 'Sélectionner plusieurs éléments',
    keywords: ['plusieurs', 'multi selection', 'maj clic', 'shift', 'lot', 'groupe d elements'],
    steps: [pick('many'), info('Le panneau de droite propose alors les actions par lot : aligner, teinter, mettre à l’échelle, grouper.', 'tour:sidebar', 'edit')],
    result: 'Tous les éléments touchés sont sélectionnés ensemble.',
    related: ['align', 'batch-color', 'batch-scale', 'group'],
  },
  {
    id: 'select-all',
    category: 'select',
    title: 'Tout sélectionner',
    keywords: ['tout selectionner', 'ctrl a', 'tous les elements', 'toute la salle'],
    shortcut: 'Ctrl+A',
    steps: [key('Mod+A', 'Cliquez une fois sur le plan, puis appuyez sur Ctrl+A (Cmd+A sur Mac).', 'tour:canvas')],
    result: 'Tous les éléments du plan sont sélectionnés.',
  },
  {
    id: 'select-type',
    category: 'select',
    title: 'Sélectionner toutes les tables, chaises ou écrans',
    keywords: ['toutes les tables', 'toutes les chaises', 'tous les ecrans', 'par type', 'filtre selection'],
    steps: [
      pick('many'),
      side('btn:Toutes les tables', 'Cliquez « Toutes les tables » (ou « Toutes les chaises », « Tous les écrans ») pour élargir la sélection à tout ce type.', 'click'),
    ],
    result: 'Tous les éléments de ce type sont sélectionnés.',
  },
  {
    id: 'select-invert',
    category: 'select',
    title: 'Inverser la sélection',
    keywords: ['inverser', 'tout sauf', 'contraire'],
    steps: [pick('many'), side('btn:Inverser', 'Cliquez « Inverser » : ce qui était sélectionné ne l’est plus, et inversement.', 'click')],
    result: 'La sélection est inversée.',
  },
  {
    id: 'find-element',
    category: 'select',
    title: 'Retrouver un élément dans la liste',
    keywords: ['liste', 'elements du plan', 'retrouver', 'chercher', 'inventaire', 'introuvable', 'cache sous'],
    steps: [
      { say: 'Ouvrez « Éléments du plan » en haut du panneau de droite.', target: 'tour:inventory', pane: 'edit', open: true },
      side('field:Rechercher un élément', 'Tapez un nom (« Table 4 », « Bar »…) ou filtrez par type avec les pastilles.', 'next'),
      info('Cliquez une ligne de la liste : l’élément est sélectionné sur le plan (Maj+clic pour en ajouter).', 'tour:inventory', 'edit'),
    ],
    result: 'L’élément est sélectionné, même s’il est caché sous un autre.',
  },
  {
    id: 'deselect',
    category: 'select',
    title: 'Tout désélectionner',
    keywords: ['deselectionner', 'echap', 'annuler la selection', 'plus rien'],
    shortcut: 'Échap',
    steps: [pick('any'), hud('Désélectionner', 'Cliquez la croix « Désélectionner » de la barre d’actions (ou Échap).')],
    result: 'Plus rien n’est sélectionné.',
  },
  {
    id: 'move-drag',
    category: 'select',
    title: 'Déplacer un élément à la souris',
    keywords: ['deplacer', 'bouger', 'glisser', 'deposer', 'drag', 'changer de place'],
    steps: [
      { say: 'Cliquez « Déplacer les objets » (sur téléphone : « Déplacer ») pour que le glisser bouge le mobilier, et non la caméra.', target: 'tour:view-toggle >> btn:Déplacer les objets', pane: 'plan', open: true },
      info('Glissez l’élément sur le plan : il s’aimante aux voisins et aux murs. Relâchez pour le poser.', 'tour:canvas', 'plan'),
    ],
    result: 'L’élément est à sa nouvelle place (Ctrl+Z pour revenir).',
    related: ['move-precise', 'move-keys'],
  },
  {
    id: 'move-precise',
    category: 'select',
    title: 'Placer un élément au centimètre',
    keywords: ['position exacte', 'coordonnees', 'centimetre', 'precis', 'distance du mur', 'depuis la gauche', 'centrer'],
    steps: [
      pick('fixture'),
      side('field:Depuis la gauche', 'Tapez la distance depuis le mur de gauche, en mètres, puis Entrée.', 'next'),
      side('field:Depuis le haut', 'Tapez la distance depuis le mur du haut, en mètres, puis Entrée.', 'next'),
      side('btn:Centrer ↔', 'Ou cliquez « Centrer ↔ » (et « Centrer ↕ ») pour le centrer dans la salle, puis « Suivant ».', 'next'),
    ],
    result: 'L’élément est placé à la position exacte.',
  },
  {
    id: 'move-keys',
    category: 'select',
    title: 'Déplacer au clavier (flèches)',
    keywords: ['fleches', 'clavier', 'pas a pas', 'nudge', 'decaler un peu'],
    shortcut: 'Flèches (Maj = ×2,5, Alt = fin)',
    steps: [pick('any'), key('ArrowRight', 'Appuyez sur une flèche du clavier : l’élément avance d’un pas. Maj+flèche va plus loin, Alt+flèche plus finement.')],
    result: 'L’élément s’est décalé.',
  },
  {
    id: 'resize',
    category: 'select',
    title: 'Changer la taille d’un élément',
    keywords: ['taille', 'redimensionner', 'agrandir', 'retrecir', 'longueur', 'largeur', 'dimensions', 'poignees'],
    steps: [
      pick('fixture'),
      side('field:Longueur', 'Tapez la nouvelle longueur en mètres, puis Entrée.', 'next'),
      side('field:Largeur', 'Tapez la nouvelle largeur en mètres, puis Entrée.', 'next'),
      info('Sur le plan, vous pouvez aussi tirer les poignées aux coins de l’élément sélectionné.', 'tour:canvas', 'plan'),
    ],
    result: 'L’élément a ses nouvelles dimensions.',
    related: ['batch-scale', 'table-size'],
  },
  {
    id: 'batch-scale',
    category: 'select',
    title: 'Agrandir ou réduire plusieurs éléments d’un coup',
    keywords: ['echelle', 'mettre a l echelle', 'taille du lot', 'tout agrandir', 'tout reduire', 'pourcentage'],
    steps: [pick('many'), side(['btn:+10%', 'btn:-10%'], 'Dans « Échelle par lot », cliquez « +10% » (ou « -10% ») : tous les éléments sélectionnés grandissent ou rapetissent ensemble. Recliquez autant que nécessaire.', 'click', BATCH_BOX)],
    result: 'Le lot a changé de taille.',
  },
  {
    id: 'rotate',
    category: 'select',
    title: 'Pivoter un élément',
    keywords: ['pivoter', 'tourner un element', 'rotation', 'orientation', 'angle', '90 degres', 'sens'],
    shortcut: 'R / Maj+R',
    need: { feature: 'canRotate' },
    needLabel: 'Rotation',
    steps: [
      pick('any'),
      hud('Rotation et orientation', 'Cliquez l’icône « Rotation et orientation » de la barre d’actions.'),
      { say: 'Choisissez −90°, −15°, +15° ou +90° (touche R = +15°, Maj+R = −15°).', target: ['btn:Pivoter +90°', 'label:Pivoter +90°'], via: ['tour:selection-bar >> btn:Rotation et orientation'], pane: 'plan' },
    ],
    result: 'L’élément a pivoté.',
    related: ['face-center'],
  },
  {
    id: 'face-center',
    category: 'select',
    title: 'Orienter vers la scène ou le centre',
    keywords: ['face a la scene', 'face au centre', 'orienter vers', 'regarder la scene', 'tourner vers'],
    need: { feature: 'canRotate' },
    needLabel: 'Rotation',
    steps: [
      pick('any'),
      hud('Rotation et orientation', 'Cliquez l’icône « Rotation et orientation ».'),
      { say: 'Cliquez « Face à la scène » (ou « Face au centre »).', target: ['btn:Face à la scène', 'btn:Face au centre'], via: ['tour:selection-bar >> btn:Rotation et orientation'], pane: 'plan' },
    ],
    result: 'L’élément regarde la scène (ou le centre).',
  },
  {
    id: 'align',
    category: 'select',
    title: 'Aligner et répartir plusieurs éléments',
    keywords: ['aligner', 'alignement', 'repartir', 'espacer regulierement', 'meme ligne', 'ranger'],
    need: { feature: 'canAlign' },
    needLabel: 'Alignement',
    steps: [
      pick('many'),
      hud('Aligner la sélection', 'Cliquez l’icône « Aligner la sélection » de la barre d’actions.'),
      info('Choisissez l’alignement (gauche, centre, haut…) ou la répartition régulière.', 'tour:selection-bar', 'plan'),
    ],
    result: 'Les éléments sont alignés.',
  },
  {
    id: 'grid-arrange',
    category: 'select',
    title: 'Ranger une sélection en grille',
    keywords: ['grille', 'ranger', 'organiser', 'ordonner', 'aligner en grille', 'separer'],
    steps: [
      pick('many'),
      side('btn:En grille', 'Dans « Aligner, ranger & grouper », cliquez « En grille » : la sélection est rangée en lignes et colonnes régulières.', 'click', ALIGN_BOX),
      side('btn:Optimiser les espacements', 'Si du mobilier reste trop serré, cliquez « Optimiser les espacements » pour le séparer.', 'next', ALIGN_BOX),
    ],
    result: 'La sélection est rangée.',
  },
  {
    id: 'batch-color',
    category: 'select',
    title: 'Teinter plusieurs éléments d’un coup',
    keywords: ['teinter', 'couleur du lot', 'tout en blanc', 'meme couleur', 'peindre'],
    steps: [
      pick('many'),
      hud('Teinter la sélection', 'Cliquez l’icône palette « Teinter la sélection ».'),
      info('Cliquez une couleur de la palette : toute la sélection prend cette teinte.', 'tour:selection-bar', 'plan'),
    ],
    result: 'La sélection est teintée.',
  },
  {
    id: 'group',
    category: 'select',
    title: 'Grouper ou dégrouper des éléments',
    keywords: ['grouper', 'degrouper', 'groupe', 'lier', 'ensemble', 'ctrl g'],
    shortcut: 'Ctrl+G / Ctrl+Maj+G',
    steps: [
      pick('many'),
      side('btn:Grouper', 'Cliquez « Grouper » (ou Ctrl+G) : les éléments bougeront ensemble. Ctrl+Maj+G les dégroupe.', 'click', ALIGN_BOX),
    ],
    result: 'Les éléments forment un groupe.',
  },
  {
    id: 'move-group',
    category: 'select',
    title: 'Déplacer un lot pas à pas',
    keywords: ['deplacer le groupe', 'deplacer le lot', 'decaler tout'],
    steps: [pick('many'), side('btn:Déplacer le groupe vers la droite', 'Utilisez les flèches de « Déplacer le groupe » : tout le lot se décale ensemble.', 'click', BATCH_BOX)],
    result: 'Le lot s’est déplacé.',
  },
  {
    id: 'duplicate',
    category: 'select',
    title: 'Dupliquer un élément',
    keywords: ['dupliquer', 'copier', 'cloner', 'un autre pareil', 'ctrl d', 'repeter'],
    shortcut: 'Ctrl+D',
    need: { feature: 'canDuplicate' },
    needLabel: 'Duplication',
    steps: [pick('any'), hud('Dupliquer la sélection', 'Cliquez l’icône « Dupliquer la sélection » (ou Ctrl+D).')],
    result: 'Une copie est posée à côté de l’original.',
    related: ['copy-paste'],
  },
  {
    id: 'copy-paste',
    category: 'select',
    title: 'Copier, couper et coller',
    keywords: ['copier coller', 'couper', 'coller', 'ctrl c', 'ctrl v', 'ctrl x'],
    shortcut: 'Ctrl+C / Ctrl+X / Ctrl+V',
    need: { feature: 'canDuplicate' },
    needLabel: 'Duplication',
    steps: [pick('any'), key('Mod+C', 'Appuyez sur Ctrl+C pour copier (Ctrl+X pour couper).'), key('Mod+V', 'Appuyez sur Ctrl+V : la copie est collée sur le plan.')],
    result: 'L’élément est collé.',
  },
  {
    id: 'delete',
    category: 'select',
    title: 'Supprimer un élément',
    keywords: ['supprimer', 'effacer', 'enlever', 'retirer', 'poubelle', 'del', 'suppr'],
    shortcut: 'Suppr',
    steps: [pick('any'), hud('Supprimer la sélection', 'Cliquez l’icône corbeille « Supprimer la sélection » (ou touche Suppr).')],
    result: 'L’élément est supprimé (Ctrl+Z pour le récupérer).',
  },
  {
    id: 'lock',
    category: 'select',
    title: 'Verrouiller un élément',
    keywords: ['verrouiller', 'bloquer', 'figer', 'cadenas', 'ne plus bouger', 'deverrouiller', 'ctrl l'],
    shortcut: 'Ctrl+L',
    need: { feature: 'canLock' },
    needLabel: 'Verrouillage',
    steps: [pick('table'), side('btn:Verrouiller', 'Cliquez « Verrouiller » : la table ne bougera plus, même avec l’agencement automatique. Le même bouton la déverrouille.', 'click')],
    result: 'L’élément est verrouillé.',
  },
  {
    id: 'rename',
    category: 'select',
    title: 'Renommer un élément',
    keywords: ['renommer', 'nom', 'libelle', 'etiquette', 'numero de table', 'titre'],
    steps: [pick('fixture'), side('field:Libellé', 'Tapez le nouveau nom dans « Libellé » : il s’affiche sur le plan.', 'next')],
    result: 'Le nouveau nom apparaît sur le plan et dans la liste.',
    related: ['table-name'],
  },
);

// ───────── Tables ─────────
add(
  {
    id: 'add-table',
    category: 'tables',
    title: 'Ajouter une table',
    keywords: ['ajouter une table', 'nouvelle table', 'table ronde', 'poser une table'],
    steps: menu('furniture', 'Table', 'Cliquez « Table » : une table ronde garnie de chaises est posée au centre.'),
    result: 'La table est posée et sélectionnée ; réglez-la à droite.',
    related: ['table-shape', 'table-size', 'auto-arrange'],
  },
  {
    id: 'add-arc-ring',
    category: 'tables',
    title: 'Ajouter un anneau de tables en arc',
    keywords: ['arc', 'anneau', 'cercle de tables', 'tables en arc', 'demi lune', 'courbe'],
    need: { shape: 'arc' },
    needLabel: 'Tables en arc',
    steps: menu('furniture', 'Anneau d’arcs', 'Cliquez « Anneau d’arcs » : six tables en arc s’ajoutent autour d’un centre.'),
    result: 'L’anneau de tables est posé.',
  },
  {
    id: 'table-name',
    category: 'tables',
    title: 'Nommer ou numéroter une table',
    keywords: ['nom de table', 'numero de table', 'table d honneur', 'nommer une table'],
    steps: [pick('table'), side('field:Nom de la table', 'Tapez le nom ou le numéro de la table (« Table d’honneur », « 12 »…).', 'next')],
    result: 'La table porte son nom sur le plan.',
  },
  {
    id: 'table-shape',
    category: 'tables',
    title: 'Changer la forme d’une table',
    keywords: ['forme', 'ronde', 'rectangulaire', 'carree', 'ovale', 'banquet', 'cocktail', 'mange debout', 'serpentine'],
    steps: [pick('table'), side('field:Forme de la table', 'Choisissez la forme dans la liste « Forme » : ronde, rectangulaire, carrée, ovale, en arc…')],
    result: 'La table change de forme, chaises replacées.',
  },
  {
    id: 'table-capacity',
    category: 'tables',
    title: 'Changer le nombre de places d’une table',
    keywords: ['places', 'nombre de chaises', 'capacite', 'couverts', 'combien de personnes', 'convives par table'],
    steps: [pick('table'), side('field:Nombre de places', 'Tapez le nombre de places (1 à 40) : les chaises se répartissent seules.', 'next')],
    result: 'La table a le nombre de places voulu.',
  },
  {
    id: 'chair-layout',
    category: 'tables',
    title: 'Disposer les chaises autour d’une table',
    keywords: ['disposition des chaises', 'un seul cote', 'face a face', 'chaises d un cote', 'tout autour'],
    steps: [pick('table'), { ...side('label:Disposition des chaises', 'Dans « Disposition des chaises », cliquez la disposition voulue (tout autour, un seul côté, face à face…).', 'click'), hint: 'La disposition des chaises se règle sur les tables longues (rectangulaires, ovales, en arc…). Changez d’abord la forme de la table.' }],
    result: 'Les chaises sont replacées.',
  },
  {
    id: 'table-size',
    category: 'tables',
    title: 'Changer les dimensions d’une table',
    keywords: ['diametre', 'longueur de table', 'largeur de table', 'taille de la table', 'plus grande table', 'elargir le plateau'],
    steps: [
      pick('table'),
      side(['field:Diamètre de la table', 'field:Longueur de la table'], 'Tapez le diamètre (table ronde) ou la longueur (table rectangulaire), en mètres.', 'next'),
      side(['field:Ajuster le diamètre', 'field:Élargir le plateau'], 'Ou glissez le curseur pour ajuster le plateau à l’œil.'),
    ],
    result: 'La table a ses nouvelles dimensions.',
  },
  {
    id: 'table-corners',
    category: 'tables',
    title: 'Arrondir les angles d’une table',
    keywords: ['angles arrondis', 'coins', 'arrondi', 'rayon d angle'],
    steps: [pick('table', 'une table rectangulaire ou carrée'), side('field:Arrondi des angles', 'Tapez le rayon d’arrondi des coins, en mètres.', 'next')],
    result: 'Les coins sont arrondis.',
  },
  {
    id: 'table-color',
    category: 'tables',
    title: 'Changer la couleur d’une table',
    keywords: ['couleur de table', 'nappe', 'teinte de table', 'couleur nappe'],
    steps: [pick('table'), side('field:Couleur de cette table', 'Cliquez le carré « Couleur de cette table » et choisissez la teinte.')],
    result: 'La table prend la nouvelle couleur.',
    related: ['tables-color-all'],
  },
  {
    id: 'table-finish',
    category: 'tables',
    title: 'Plateau, finition et piètement',
    keywords: ['plateau', 'finition', 'bois', 'marbre', 'pietement', 'pieds de table', 'matiere de table'],
    steps: [
      pick('table'),
      side('text:Plateau / finition', 'Sous « Plateau / finition », cliquez la finition voulue (nappe, bois, marbre, verre…), puis « Suivant ».', 'next'),
      { ...side('field:Piètement', 'Choisissez le piètement (pieds droits, tulipe, croisillon…).'), hint: 'Le piètement se règle sur les tables sans nappe longue (bois, marbre…).' },
    ],
    result: 'La table a sa nouvelle finition.',
  },
  {
    id: 'table-setting',
    category: 'tables',
    title: 'Centre de table et vaisselle',
    keywords: ['centre de table', 'vaisselle', 'couverts', 'assiettes', 'verres', 'service', 'bouquet'],
    steps: [
      pick('table'),
      side('field:Centre de table', 'Cochez « Centre de table (vase & bouquet) » si la case est vide, puis cliquez « Suivant ».', 'next'),
      { ...side('field:Style de centre', 'Choisissez le style de centre (bouquet, bougies, candélabre…).'), hint: 'Cochez d’abord « Centre de table (vase & bouquet) » : la liste des styles apparaît dessous.' },
      side('field:Afficher assiettes', 'Cochez « Afficher assiettes & couverts » si la case est vide, puis cliquez « Suivant ».', 'next'),
      { ...side('field:Style de service', 'Choisissez le service : porcelaine classique, or & liseré ou festif.'), hint: 'Cochez d’abord « Afficher assiettes & couverts » : la liste des services apparaît dessous.' },
    ],
    result: 'La table est dressée à votre goût.',
  },
  {
    id: 'table-chairs',
    category: 'tables',
    title: 'Choisir les chaises d’une table',
    keywords: ['chaises de la table', 'type de chaise', 'chiavari', 'napoleon', 'louis', 'style de chaise', 'matiere chaise'],
    steps: [
      pick('table'),
      side('text:Type de chaise', 'Sous « Type de chaise », cliquez le modèle voulu (Chiavari, Napoléon, Louis, banquet…), puis « Suivant ».', 'next'),
      side('text:Matériau', 'Sous « Matériau », cliquez la matière (velours, bois, métal doré, transparent…), puis « Suivant ».', 'next'),
    ],
    result: 'Les chaises de la table sont changées.',
  },
  {
    id: 'table-pmr',
    category: 'tables',
    title: 'Rendre une table accessible PMR',
    keywords: ['pmr', 'fauteuil roulant', 'handicap', 'accessible', 'mobilite reduite'],
    steps: [pick('table'), side('field:Table accessible PMR', 'Cochez « Table accessible PMR » : une place sans chaise et un dégagement adapté sont réservés.')],
    result: 'La table est marquée accessible.',
    related: ['pmr-overlay'],
  },
  {
    id: 'table-apply-all',
    category: 'tables',
    title: 'Appliquer un réglage à toutes les tables',
    keywords: ['toutes les tables', 'appliquer a toutes', 'meme reglage partout', 'uniformiser'],
    steps: [pick('table'), info('Descendez jusqu’à « Appliquer à toutes les tables » et cliquez le réglage à recopier (forme, chaises, finition…).', 'tour:sidebar', 'edit')],
    result: 'Toutes les tables reprennent ce réglage.',
  },
  {
    id: 'dress-tables',
    category: 'tables',
    title: 'Dresser toutes les tables (vaisselle d’apparat)',
    keywords: ['dresser', 'dressage', 'vaisselle d apparat', 'tables dressees', 'mise en place'],
    steps: menu('furniture', 'Dresser tables', 'Cliquez « Dresser tables » : assiettes, verres à pied, serviettes et centres apparaissent sur toutes les tables.'),
    result: 'Les tables sont dressées (recliquez pour revenir au dressage simple).',
  },
  {
    id: 'auto-arrange',
    category: 'tables',
    title: 'Répartir automatiquement les tables',
    keywords: ['agencement automatique', 'repartir', 'disposer automatiquement', 'banquet', 'en u', 'grille', 'cercle', 'espacement'],
    steps: [
      ...section('arrange'),
      side('btn:Confort', 'Choisissez la densité : « Serré », « Confort » ou « Aéré ».', 'click'),
      side('btn:Banquet', 'Cliquez une disposition : « Grille », « Banquet », « En U » ou « Cercle ». Les tables verrouillées ne bougent pas.', 'click'),
    ],
    result: 'Les tables sont réparties dans la salle, en évitant la scène.',
  },
  {
    id: 'tables-color-all',
    category: 'tables',
    title: 'Changer la couleur de toutes les tables',
    keywords: ['couleur des tables', 'toutes les nappes', 'couleur globale des tables'],
    steps: [
      ...section('config'),
      side('field:Couleur des tables', 'Dans « Couleur des tables », cliquez le carré de couleur et choisissez la teinte.'),
      side('btn:Appliquer à toutes les tables', 'Cliquez « Appliquer à toutes les tables ».', 'click'),
    ],
    result: 'Toutes les tables prennent la couleur.',
  },
  {
    id: 'table-image',
    category: 'tables',
    title: 'Mettre votre photo de nappe ou de plateau',
    keywords: ['photo de nappe', 'image de table', 'texture table', 'ma nappe', 'importer nappe'],
    need: { feature: 'canCustomImages' },
    needLabel: 'Images personnalisées',
    steps: [pick('table'), side('field:Image de table', 'Dans « Image de table (nappage, bois…) », cliquez « Choisir une image » et sélectionnez votre photo.')],
    result: 'La table est habillée de votre image.',
  },
);

// ───────── Chaises & rangées ─────────
add(
  {
    id: 'add-chair',
    category: 'chairs',
    title: 'Ajouter une chaise ou un fauteuil seul',
    keywords: ['chaise seule', 'fauteuil', 'ajouter une chaise', 'siege', 'une chaise'],
    steps: menu('furniture', 'Fauteuil', 'Cliquez « Fauteuil » : un siège libre est posé au centre.'),
    result: 'La chaise est posée ; glissez-la où vous voulez.',
    related: ['chair-settings'],
  },
  {
    id: 'chair-settings',
    category: 'chairs',
    title: 'Régler une chaise seule',
    keywords: ['type de chaise', 'orientation chaise', 'style chaise', 'matiere chaise'],
    steps: [
      pick('chair'),
      side('text:Type', 'Sous « Type », cliquez le type de siège voulu, puis « Suivant ».', 'next'),
      side('field:Style', 'Choisissez son style dans la liste.'),
      side('text:Matériau', 'Sous « Matériau », cliquez la matière, puis « Suivant ».', 'next'),
      side('text:Orientation de la chaise', 'Dans « Orientation de la chaise », cliquez une direction de la boussole ou « Face à la scène », puis « Suivant ».', 'next'),
    ],
    result: 'La chaise est réglée.',
  },
  {
    id: 'chair-image',
    category: 'chairs',
    title: 'Mettre votre photo de chaise',
    keywords: ['photo de chaise', 'image de chaise', 'ma chaise', 'housse'],
    need: { feature: 'canCustomImages' },
    needLabel: 'Images personnalisées',
    steps: [pick('table'), side('field:Image de chaise', 'Dans « Image de chaise (optionnel) », cliquez « Choisir une image » et sélectionnez votre photo.')],
    result: 'Les chaises sont habillées de votre image.',
  },
  {
    id: 'add-row',
    category: 'chairs',
    title: 'Ajouter une rangée de chaises',
    keywords: ['rangee', 'rang', 'conference', 'ceremonie', 'theatre', 'chaises alignees', 'ligne de chaises'],
    need: { feature: 'canAddRows' },
    needLabel: 'Rangées de chaises',
    steps: menu('furniture', 'Rangée', 'Cliquez « Rangée » : une rangée de chaises est posée.'),
    result: 'La rangée est posée et sélectionnée.',
    related: ['row-settings', 'chair-groups'],
  },
  {
    id: 'row-settings',
    category: 'chairs',
    title: 'Régler une rangée (sièges, nom, siège)',
    keywords: ['nombre de sieges', 'nom de rang', 'type de siege', 'rangee'],
    steps: [
      pick('row'),
      side('field:Nombre de sièges', 'Tapez le nombre de sièges de la rangée.', 'next'),
      side('field:Nom de rang', 'Donnez un nom de rang (A, B, C…).', 'next'),
      side('text:Type de siège', 'Sous « Type de siège », cliquez le siège voulu, puis « Suivant ».', 'next'),
    ],
    result: 'La rangée est réglée.',
  },
  {
    id: 'row-curve',
    category: 'chairs',
    title: 'Courber une rangée et ajouter une allée',
    keywords: ['courbe', 'courbure', 'arc de chaises', 'allee centrale', 'passage au milieu'],
    steps: [
      pick('row'),
      info('Réglez « Courbure de rangée » pour arrondir la rangée autour de la scène.', 'tour:sidebar', 'edit'),
      side('field:Allée centrale', 'Cochez « Allée centrale de passage » pour ouvrir un passage au milieu.'),
    ],
    result: 'La rangée est courbée, avec son allée.',
  },
  {
    id: 'row-tier',
    category: 'chairs',
    title: 'Surélever une rangée (gradin)',
    keywords: ['gradin', 'elevation', 'surelever', 'estrade de chaises', 'hauteur rangee'],
    steps: [pick('row'), side('field:Élévation gradin', 'Tapez la hauteur du gradin en mètres.', 'next')],
    result: 'La rangée est surélevée.',
  },
  {
    id: 'row-numbers',
    category: 'chairs',
    title: 'Numéroter les sièges',
    keywords: ['numeros', 'numeroter', 'siege numerote', 'placement numerote', 'billetterie'],
    steps: [pick('row'), side('field:Numéros de siège', 'Cochez « Numéros de siège » : chaque siège affiche son numéro.')],
    result: 'Les sièges sont numérotés.',
  },
  {
    id: 'amphitheater',
    category: 'chairs',
    title: 'Créer un amphithéâtre en gradins',
    keywords: ['amphitheatre', 'gradins', 'arc', 'auditorium', 'theatre', 'etages de chaises'],
    need: { feature: 'canAddRows' },
    needLabel: 'Rangées de chaises',
    steps: [
      ...menu('furniture', 'Amphithéâtre…', 'Cliquez « Amphithéâtre… » : le générateur s’ouvre sous la barre d’outils.'),
      info('Réglez l’arc, le nombre de gradins, les sièges par rang, le type de siège et l’allée centrale.', QUICK, 'tools'),
      { say: 'Cliquez « Générer l’amphithéâtre ».', target: `${QUICK} >> btn:Générer l’amphithéâtre`, pane: 'tools' },
    ],
    result: 'Les gradins en arc sont posés face à la scène.',
  },
  {
    id: 'chair-groups',
    category: 'chairs',
    title: 'Créer plusieurs blocs de chaises d’un coup',
    keywords: ['groupes de chaises', 'blocs', 'plusieurs rangees', 'ceremonie', 'parterre'],
    need: { feature: 'canAddRows' },
    needLabel: 'Rangées de chaises',
    steps: [
      ...menu('furniture', 'Groupes chaises', 'Cliquez « Groupes chaises ».'),
      info('Réglez le nombre de groupes, de rangées par groupe et de sièges par rangée.', QUICK, 'tools'),
      { say: 'Cliquez « Créer les groupes ».', target: `${QUICK} >> btn:Créer les groupes`, pane: 'tools' },
    ],
    result: 'Les blocs de chaises sont posés.',
  },
);

// ───────── Décor ─────────
function decorAdd(id: string, title: string, button: string, say: string, keywords: string[], result: string, extra: Partial<EditorGuideAction> = {}, settings: GuideStep[] = []): EditorGuideAction {
  return {
    id,
    category: 'decor',
    title,
    keywords,
    steps: [...menu('scene', button, say), ...settings],
    result,
    ...extra,
  };
}

function decorPanel(id: string, title: string, button: string, keywords: string[], result: string, extra: Partial<EditorGuideAction> = {}, settings: GuideStep[] = [], group: ToolGroup = 'scene'): EditorGuideAction {
  return {
    id,
    category: group === 'scene' ? 'decor' : group === 'building' ? 'building' : 'decor',
    title,
    keywords,
    steps: [
      ...menu(group, button, `Cliquez « ${button} » : le choix des modèles s’ouvre sous la barre d’outils.`),
      info('Cliquez le modèle voulu : il est posé au centre du plan.', QUICK, 'tools'),
      ...settings,
    ],
    result,
    ...extra,
  };
}

add(
  decorAdd('stage', 'Ajouter une scène', 'Scène', 'Cliquez « Scène » : une scène est posée.', ['scene', 'estrade', 'podium', 'concert', 'spectacle'], 'La scène est posée.', { need: { fixture: 'stage' }, needLabel: 'Scène' }, [
    pick('fixture:stage', 'la scène'),
    side('field:Forme de scène', 'Choisissez sa forme (rectangulaire, avancée, ronde…).'),
    side('field:Toit de scène', 'Choisissez un toit de scène, ou « Aucun ».'),
    side('label:Habillage de scène', 'Cliquez un habillage (rideau, LED, drapé…).', 'click'),
  ]),
  decorPanel('podium', 'Ajouter un podium ou une estrade', 'Podiums…', ['podium', 'estrade', 'orateur', 'pupitre', 'passerelle', 'couple'], 'Le podium est posé ; réglez hauteur et marches à droite.', {}, [
    pick('fixture:podium', 'le podium'),
    side('field:Hauteur podium', 'Tapez la hauteur du podium en mètres.', 'next'),
  ]),
  decorPanel('instruments', 'Ajouter des instruments (piano, batterie, micros)', 'Instruments…', ['instrument', 'piano', 'batterie', 'micro', 'guitare', 'orchestre', 'musique', 'sono'], 'L’instrument est posé ; glissez-le sur un podium pour le surélever.'),
  decorPanel('bars', 'Ajouter un bar', 'Bars…', ['bar', 'comptoir', 'cocktail', 'vin', 'champagne', 'biere', 'boissons'], 'Le bar est posé ; réglez son type et son habillage à droite.', {}, [
    pick('fixture:bar', 'le bar'),
    side('field:Type de bar', 'Choisissez le type de bar.'),
  ]),
  decorPanel('chandeliers', 'Ajouter un lustre', 'Lustres…', ['lustre', 'suspension', 'cristal', 'plafonnier', 'eclairage plafond'], 'Le lustre est posé ; réglez son ambiance lumineuse à droite.', {}, [
    pick('fixture:chandelier', 'le lustre'),
    side('field:Ambiance lumineuse', 'Choisissez l’ambiance lumineuse (or, bougie, blanc pur…).'),
  ]),
  decorPanel('aisles', 'Ajouter une allée ou un tapis', 'Allées VIP…', ['allee', 'tapis rouge', 'tapis', 'chemin', 'ceremonie', 'petales', 'entree des maries'], 'L’allée est posée ; personnalisez couleur, ganse, pétales et lanternes à droite.', {}, [
    pick('fixture:aisle', 'l’allée'),
    side('field:Thème de tapis', 'Choisissez le thème du tapis.'),
  ]),
  decorAdd('buffet', 'Ajouter un buffet avec couverts', 'Buffet + couverts', 'Cliquez « Buffet + couverts ».', ['buffet', 'traiteur', 'self service', 'nourriture', 'repas'], 'Le buffet est posé ; choisissez linéaire, en L ou îlot à droite.', { need: { fixture: 'buffet' }, needLabel: 'Buffet' }, [
    pick('fixture:buffet', 'le buffet'),
    side('field:Style buffet', 'Choisissez sa forme : linéaire, en L ou îlot central.'),
  ]),
  decorAdd('flowers', 'Ajouter des fleurs', 'Fleurs', 'Cliquez « Fleurs ».', ['fleurs', 'bouquet', 'composition florale', 'plantes', 'roses'], 'La composition florale est posée.', {}, [
    pick('fixture:flower', 'les fleurs'),
    side('field:Type de fleurs', 'Choisissez le type de fleurs, puis leur couleur juste dessous.'),
  ]),
  decorAdd('arch', 'Ajouter une arche florale', 'Arche', 'Cliquez « Arche ».', ['arche', 'ceremonie laique', 'autel', 'fond de salle'], 'L’arche est posée.'),
  decorAdd('partition', 'Ajouter une cloison basse', 'Cloison', 'Cliquez « Cloison ».', ['cloison', 'separation', 'paravent', 'mur vegetal', 'delimiter'], 'La cloison est posée.'),
  decorAdd('pedestal', 'Ajouter un piédestal fleuri', 'Piédestal', 'Cliquez « Piédestal ».', ['piedestal', 'colonne fleurie', 'socle'], 'Le piédestal est posé.', {}, [
    pick('fixture:pedestal', 'le piédestal'),
    side('field:Style', 'Choisissez colonne blanche ou or.'),
  ]),
  decorAdd('decal', 'Ajouter un motif au sol', 'Motif sol', 'Cliquez « Motif sol ».', ['motif', 'sticker sol', 'roses au sol', 'papillons', 'monogramme sol'], 'Le motif est posé.', {}, [
    pick('fixture:decal', 'le motif'),
    side('field:Motif', 'Choisissez roses, papillons, chemin, ou « Image » pour importer le vôtre.'),
  ]),
  decorAdd('string-lights', 'Ajouter des guirlandes lumineuses', 'Guirlandes', 'Cliquez « Guirlandes ».', ['guirlande', 'guinguette', 'ampoules', 'lumieres suspendues', 'fairy lights'], 'Les guirlandes sont tendues au-dessus du plan.', { need: { fixture: 'stringLight' }, needLabel: 'Guirlandes' }),
  decorAdd('dj', 'Ajouter une régie DJ', 'Régie DJ', 'Cliquez « Régie DJ ».', ['dj', 'regie', 'platines', 'sono', 'animation'], 'La régie DJ est posée.'),
  decorAdd('led-wall', 'Ajouter un mur LED', 'Mur LED', 'Cliquez « Mur LED ».', ['mur led', 'ecran geant', 'led', 'video', 'projection'], 'Le mur LED est posé.'),
  decorAdd('wall-tv', 'Ajouter une TV murale', 'TV Murale', 'Cliquez « TV Murale ».', ['tv', 'television', 'ecran mural', 'moniteur'], 'La télévision est posée.', {}, [
    pick('fixture:screen', 'l’écran'),
    side('field:Type d’appareil', 'Changez le type d’appareil ou le format si besoin.'),
  ]),
  decorAdd('table-monitor', 'Ajouter un écran de table', 'Écran Table', 'Cliquez « Écran Table ».', ['ecran de table', 'moniteur de table', 'regie', 'retour'], 'L’écran est posé ; glissez-le sur une table.'),
  decorAdd('laptop', 'Ajouter un ordinateur portable', 'PC Portable', 'Cliquez « PC Portable ».', ['ordinateur portable', 'laptop', 'pc portable'], 'L’ordinateur est posé ; glissez-le sur une table.'),
  decorAdd('desktop-pc', 'Ajouter un ordinateur fixe', 'PC Fixe', 'Cliquez « PC Fixe ».', ['ordinateur fixe', 'pc fixe', 'tout en un', 'poste de travail'], 'L’ordinateur est posé ; glissez-le sur une table.'),
  {
    id: 'led-show',
    category: 'decor',
    title: 'Programmer un show lumière LED',
    keywords: ['show lumiere', 'led', 'animation lumineuse', 'boite de nuit', 'jeux de lumiere'],
    steps: [...section('ambience'), info('Descendez jusqu’au réglage du show LED : choisissez le programme, les couleurs et la vitesse.', 'tour:sidebar', 'edit')],
    result: 'Le show lumière s’anime en 3D.',
  },
  {
    id: 'fixture-image',
    category: 'decor',
    title: 'Habiller un décor avec votre image',
    keywords: ['image personnalisee', 'photo sur la scene', 'logo sur', 'habiller', 'texture decor'],
    need: { feature: 'canCustomImages' },
    needLabel: 'Images personnalisées',
    steps: [pick('fixture', 'la scène, une colonne, une allée ou un buffet'), info('En bas du panneau, dans « Image personnalisée », importez votre image.', 'tour:sidebar', 'edit')],
    result: 'Le décor est habillé de votre image.',
  },
);

// ───────── Resto & Shop ─────────
function hospitalityAdd(id: string, title: string, button: string, keywords: string[]): EditorGuideAction {
  return {
    id,
    category: 'hospitality',
    title,
    keywords,
    steps: menu('hospitality', button, `Cliquez « ${button} ».`),
    result: 'L’élément est posé au centre du plan.',
  };
}
add(
  {
    id: 'hospitality-catalog',
    category: 'hospitality',
    title: 'Ouvrir tout le catalogue restaurant, commerce et beauté',
    keywords: ['restaurant', 'commerce', 'boutique', 'beaute', 'salon', 'comptoir', 'banquette', 'resto'],
    steps: [...menu('hospitality', 'Resto & Shop…', 'Cliquez « Resto & Shop… » : le catalogue complet s’ouvre.'), info('Cliquez l’élément voulu.', QUICK, 'tools')],
    result: 'L’élément est posé.',
  },
  hospitalityAdd('pos', 'Ajouter une caisse (POS)', 'Caisse POS', ['caisse', 'pos', 'comptoir de commande', 'terminal']),
  hospitalityAdd('pickup', 'Ajouter un comptoir de retrait', 'Retrait', ['retrait', 'click and collect', 'comptoir de retrait', 'commandes']),
  hospitalityAdd('pizza-oven', 'Ajouter un four à pizza', 'Four pizza', ['four', 'pizza', 'feu de bois', 'pizzeria']),
  hospitalityAdd('booth', 'Ajouter une cabine banquette', 'Cabine Booth', ['booth', 'banquette', 'cabine', 'diner']),
  hospitalityAdd('parasol-table', 'Ajouter une table avec parasol', 'Table Parasol', ['table parasol', 'terrasse', 'ombre']),
  hospitalityAdd('lounge', 'Ajouter un canapé lounge', 'Canapé Lounge', ['canape', 'lounge', 'sofa', 'coin salon']),
);

// ───────── Maison (généré depuis le catalogue des meubles) ─────────
for (const style of HOME_FURNITURE_ORDER) {
  const meta = HOME_FURNITURE_META[style];
  add({
    id: `home-${style}`,
    category: 'home',
    title: `Ajouter : ${meta.label} (${HOME_FURNITURE_GROUP_LABELS[meta.group].toLowerCase()})`,
    keywords: [meta.label, HOME_FURNITURE_GROUP_LABELS[meta.group], 'maison', 'appartement', 'meuble'],
    steps: [
      openMenu('home'),
      inMenu('home', `btn:${meta.label}`, `Dans « ${HOME_FURNITURE_GROUP_LABELS[meta.group]} », cliquez « ${meta.label} ». ${meta.hint}`),
    ],
    result: `${meta.label} est posé au centre du plan.`,
  });
}

// ───────── Zones ─────────
function zoneAdd(id: string, title: string, button: string, keywords: string[], result: string, extraSteps: GuideStep[] = []): EditorGuideAction {
  return {
    id,
    category: 'zones',
    title,
    keywords,
    need: { feature: 'canZones' },
    needLabel: 'Zones',
    steps: [...menu('zones', button, `Cliquez « ${button} ».`), ...extraSteps],
    result,
  };
}
add(
  zoneAdd('dance-floor', 'Ajouter une piste de danse', 'Piste', ['piste', 'danse', 'dancefloor', 'piste de danse'], 'La piste est posée.', [
    pick('zone', 'la piste'),
    side('label:Style de piste', 'Dans « Habillage de la piste », cliquez un style (damier, LED, bois…).', 'click'),
  ]),
  {
    id: 'dance-floor-fx',
    category: 'zones',
    title: 'Animer la piste : dalles, monogramme, boule à facettes',
    keywords: ['animation des dalles', 'monogramme', 'initiales', 'boule a facettes', 'disco', 'piste lumineuse', 'piste de danse'],
    need: { feature: 'canZones' },
    needLabel: 'Zones',
    steps: [
      pick('zone', 'la piste de danse'),
      side('btn:Dalles LED animées', 'Dans « Habillage de la piste », cliquez « Dalles LED animées ».', 'click'),
      { ...side('field:Animation des dalles', 'Choisissez l’animation des dalles (arc-en-ciel, vague, damier, onde).'), hint: 'Cliquez d’abord « Dalles LED animées » à l’étape précédente : la liste des animations apparaît dessous.' },
      side('field:Monogramme au centre', 'Tapez vos initiales dans « Monogramme au centre » (ex. « A & J »), puis « Suivant ».', 'next'),
      side('field:Boule à facettes', 'Cochez « Boule à facettes au-dessus ».'),
    ],
    result: 'La piste s’anime.',
  },
  zoneAdd('vip', 'Ajouter un espace VIP', 'VIP', ['vip', 'carre vip', 'espace reserve', 'loge'], 'L’espace VIP est posé.'),
  zoneAdd('buffet-zone', 'Ajouter une zone buffet', 'Zone buffet', ['zone buffet', 'espace buffet', 'zone repas'], 'La zone buffet est posée.'),
  zoneAdd('carpet', 'Ajouter une moquette', 'Moquette', ['moquette', 'tapis de sol', 'revetement'], 'La moquette est posée.'),
  zoneAdd('plot', 'Délimiter un emplacement au sol', 'Emplacement', ['emplacement', 'lot', 'stand', 'parcelle', 'marquage au sol'], 'L’emplacement est tracé.', [
    pick('zone', 'l’emplacement'),
    side('label:Bordure de l’emplacement', 'Choisissez la bordure (ligne, pointillés, ruban…).', 'click'),
  ]),
  {
    id: 'plots-grid',
    category: 'zones',
    title: 'Créer une grille d’emplacements numérotés',
    keywords: ['grille', 'emplacements numerotes', 'stands', 'marche', 'exposants', 'salon', 'a1 a2'],
    need: { feature: 'canZones' },
    needLabel: 'Zones',
    steps: [...menu('zones', 'Emplacements…', 'Cliquez « Emplacements… ».'), info('Réglez rangées, colonnes, taille et allées, puis validez.', QUICK, 'tools')],
    result: 'Les emplacements A1, A2… sont tracés avec leurs allées.',
  },
  {
    id: 'zone-settings',
    category: 'zones',
    title: 'Changer le type, le sol et la teinte d’une zone',
    keywords: ['type de zone', 'materiau zone', 'teinte zone', 'sol de la zone'],
    steps: [
      pick('zone'),
      side('field:Type de zone', 'Dans la liste « Type de zone », choisissez le type (piste, VIP, buffet, moquette…).'),
      side('text:Matériau / sol', 'Sous « Matériau / sol », cliquez le revêtement voulu, puis « Suivant ».', 'next'),
      side('field:Teinte de la zone', 'Cliquez le carré « Teinte » et choisissez la couleur de la zone.'),
    ],
    result: 'La zone est réglée.',
  },
  {
    id: 'open-space',
    category: 'zones',
    title: 'Passer en espace ouvert (plein air)',
    keywords: ['plein air', 'espace ouvert', 'sans murs', 'exterieur', 'jardin', 'terrasse'],
    steps: menu('zones', 'Espace ouvert', 'Cliquez « Espace ouvert » : murs et toit sont masqués (rien n’est supprimé). Recliquez pour les retrouver.'),
    result: 'La salle devient un espace en plein air.',
  },
);

// ───────── Murs ─────────
const wallPick = [...section('walls'), pick('wall', 'un mur (le mode édition des murs est actif)')];
add(
  {
    id: 'walls-all',
    category: 'walls',
    title: 'Régler tous les murs (hauteur, épaisseur, matière)',
    keywords: ['murs', 'hauteur des murs', 'epaisseur', 'matiere des murs', 'texture murale', 'brique', 'beton', 'pierre'],
    steps: [
      ...section('walls'),
      side('field:Hauteur', 'Tapez la hauteur des murs en mètres.', 'next'),
      side('field:Épaisseur', 'Tapez leur épaisseur en mètres.', 'next'),
      side('field:Texture', 'Choisissez la texture (enduit, brique, pierre, béton…).'),
    ],
    result: 'Tous les murs sont mis à jour.',
  },
  {
    id: 'wall-trim',
    category: 'walls',
    title: 'Ajouter moulures, boiseries ou pilastres aux murs',
    keywords: ['moulures', 'boiserie', 'cimaise', 'pilastre', 'lambris', 'haussmannien', 'corniche', 'plinthe', 'moulures sur les murs', 'tous les murs'],
    steps: [
      ...section('walls'),
      side('field:Moulures et boiseries', 'Choisissez le style pour tous les murs : cimaise, boiserie basse, moulures à la française, pilastres ou mur nu.'),
      side('label:Teinte des moulures de tous les murs', 'Choisissez la teinte des moulures.', 'change'),
    ],
    result: 'Les murs sont habillés de leurs moulures.',
    related: ['wall-trim-one'],
  },
  {
    id: 'wall-select',
    category: 'walls',
    title: 'Sélectionner un mur',
    keywords: ['selectionner un mur', 'cliquer un mur', 'un seul mur', 'mur precis'],
    steps: [...wallPick, info('Le panneau « Mur sélectionné » s’affiche : réglez ce mur seul.', 'tour:sidebar', 'edit')],
    result: 'Le mur est sélectionné.',
  },
  {
    id: 'wall-one',
    category: 'walls',
    title: 'Régler un seul mur (hauteur, matière, teinte)',
    keywords: ['ce mur', 'un mur different', 'mur d accent', 'couleur d un mur', 'mur en brique'],
    steps: [
      ...wallPick,
      side('field:Matériau', 'Choisissez la matière de ce mur.'),
      side('field:Teinte', 'Choisissez sa teinte.'),
    ],
    result: 'Le mur est personnalisé.',
  },
  {
    id: 'wall-trim-one',
    category: 'walls',
    title: 'Moulures sur un seul mur',
    keywords: ['moulures de ce mur', 'boiserie sur un mur', 'mur decore'],
    steps: [...wallPick, side('field:Moulures de ce mur', 'Choisissez le style de moulures de ce mur seulement.')],
    result: 'Ce mur a ses propres moulures.',
  },
  {
    id: 'add-door',
    category: 'walls',
    title: 'Percer une porte dans un mur',
    keywords: ['porte', 'ajouter une porte', 'entree', 'ouverture', 'percer'],
    steps: [
      ...wallPick,
      side('btn:+ Porte', 'Cliquez « + Porte » : une porte est percée au milieu du mur.', 'click'),
      side('tour:opening-last >> field:Style', 'Dans la nouvelle carte « Porte » (la dernière de la liste), choisissez son style ; réglez ensuite largeur et hauteur.'),
      info('Dans la vue de face du mur, glissez la porte à sa place ou utilisez « Placer sur le mur ».', 'tour:sidebar', 'edit'),
    ],
    result: 'La porte est percée dans le mur.',
    related: ['add-window', 'doors-fixture'],
  },
  {
    id: 'add-window',
    category: 'walls',
    title: 'Ajouter une fenêtre',
    keywords: ['fenetre', 'baie', 'vitre', 'ajouter une fenetre', 'lumiere naturelle'],
    steps: [
      ...wallPick,
      side('btn:+ Fenêtre', 'Cliquez « + Fenêtre » : une fenêtre est ajoutée au mur.', 'click'),
      side('tour:opening-last >> field:Style', 'Dans la nouvelle carte « Fenêtre » (la dernière de la liste), choisissez son style ; réglez ensuite largeur, hauteur et couleur du cadre.'),
    ],
    result: 'La fenêtre est posée.',
  },
  {
    id: 'opening-place',
    category: 'walls',
    title: 'Placer une porte ou une fenêtre au centimètre',
    keywords: ['position fenetre', 'allege', 'seuil', 'centrer la fenetre', 'vue de face'],
    steps: [
      ...wallPick,
      info('Dans « Vue de face du mur », touchez la porte ou la fenêtre à régler : ses réglages s’ouvrent dessous.', 'tour:sidebar', 'edit'),
      info('Tapez sa distance depuis le début du mur, ou cliquez « Centrer sur le mur ».', 'tour:sidebar', 'edit'),
      info('Pour une fenêtre, réglez la hauteur du bas (allège) ; pour une porte, le seuil reste au sol.', 'tour:sidebar', 'edit'),
    ],
    result: 'L’ouverture est placée précisément.',
  },
  {
    id: 'opening-delete',
    category: 'walls',
    title: 'Supprimer une porte ou une fenêtre',
    keywords: ['supprimer la porte', 'supprimer la fenetre', 'boucher', 'retirer ouverture'],
    steps: [...wallPick, side(['btn:Supprimer cette porte', 'btn:Supprimer cette fenêtre'], 'Cliquez la corbeille à côté de l’ouverture à retirer.', 'click')],
    result: 'L’ouverture est supprimée.',
  },
  {
    id: 'wall-image',
    category: 'walls',
    title: 'Accrocher une image ou une affiche au mur',
    keywords: ['image au mur', 'affiche', 'tableau', 'logo', 'photo murale', 'poster'],
    need: { feature: 'canCustomImages' },
    needLabel: 'Images sur les murs',
    steps: [
      ...wallPick,
      side('btn:Image', 'Dans « Images et graffitis », cliquez « Image » et choisissez votre fichier.', 'click'),
      side('label:Face du mur', 'Choisissez la face : côté salle ou côté extérieur.', 'click'),
    ],
    result: 'L’image est accrochée ; réglez sa position et sa taille.',
  },
  {
    id: 'graffiti',
    category: 'walls',
    title: 'Écrire un graffiti sur un mur',
    keywords: ['graffiti', 'tag', 'street art', 'lettrage', 'texte sur le mur', 'fresque'],
    steps: [
      ...wallPick,
      side('btn:Graffiti', 'Cliquez « Graffiti » : un lettrage est ajouté.', 'click'),
      side('field:Texte', 'Tapez votre texte.', 'next'),
      info('Choisissez police, style, couleurs, effets et fond, puis la face (intérieure ou extérieure).', 'tour:sidebar', 'edit'),
    ],
    result: 'Le graffiti est peint sur le mur.',
  },
  {
    id: 'wall-art-remove',
    category: 'walls',
    title: 'Retirer une image ou un graffiti',
    keywords: ['retirer l image', 'supprimer graffiti', 'enlever affiche'],
    steps: [...wallPick, side('btn:Retirer', 'Cliquez la croix « Retirer » à côté du décor à enlever.', 'click')],
    result: 'Le décor mural est retiré.',
  },
  {
    id: 'walls-edit-mode',
    category: 'walls',
    title: 'Activer le mode édition des murs',
    keywords: ['mode edition murs', 'cliquer les murs', 'selection des murs impossible'],
    steps: [...section('walls'), side('field:Mode édition murs', 'Cochez « Mode édition murs » : un clic sur un mur le sélectionne.')],
    result: 'Les murs se sélectionnent au clic.',
  },
);

// ───────── Bâtiment ─────────
add(
  {
    id: 'add-story',
    category: 'building',
    title: 'Ajouter un étage',
    keywords: ['etage', 'niveau', 'mezzanine', 'duplex', 'premier etage', 'batiment'],
    steps: menu('building', 'Étage', 'Cliquez « Étage » : un nouvel étage est créé au-dessus.'),
    result: 'L’étage est ajouté.',
    related: ['stack-stories', 'stairs'],
  },
  {
    id: 'stack-stories',
    category: 'building',
    title: 'Voir les étages empilés ou un seul étage',
    keywords: ['empiler', 'vue empilee', 'tous les etages', 'coupe', 'un seul etage'],
    steps: [...section('building'), side('btn:Empiler les étages', 'Cliquez « Empiler les étages » (ou « Éditer un étage » pour revenir à un seul).', 'click')],
    result: 'Les niveaux s’affichent empilés en 3D.',
  },
  {
    id: 'stairs',
    category: 'building',
    title: 'Ajouter un escalier vers un autre étage',
    keywords: ['escalier', 'marches', 'monter', 'acces etage'],
    steps: [
      ...menu('building', 'Escalier vers…', 'Cliquez « Escalier vers… ».'),
      { ...info('Choisissez l’étage d’arrivée : l’escalier est posé, réglable à droite (style, orientation, marches).', QUICK, 'tools'), hint: 'Il faut au moins deux étages : ajoutez d’abord un étage (guide « Ajouter un étage »).' },
    ],
    result: 'L’escalier relie les deux étages.',
  },
  decorPanel('balcony', 'Ajouter un balcon', 'Balcons…', ['balcon', 'coursive', 'mezzanine', 'garde corps'], 'Le balcon est posé sur l’étage actif.', {}, [], 'building'),
  {
    id: 'doors-fixture',
    category: 'building',
    title: 'Poser une porte ou un portail d’entrée',
    keywords: ['portail', 'porte d entree', 'grande porte', 'double battant', 'paillasson'],
    steps: [
      ...menu('building', 'Portes…', 'Cliquez « Portes… » : le choix des modèles s’ouvre.'),
      info('Cliquez le modèle voulu.', QUICK, 'tools'),
      pick('fixture:door', 'la porte'),
      side('field:Sens battant', 'Choisissez le sens d’ouverture (double, gauche, droite, coulissant, cintré).'),
    ],
    result: 'La porte est posée ; réglez couleurs, poignées et paillasson à droite.',
  },
  {
    id: 'column',
    category: 'building',
    title: 'Ajouter une colonne ou un poteau',
    keywords: ['colonne', 'poteau', 'pilier', 'obstacle'],
    steps: [
      ...menu('building', 'Colonne', 'Cliquez « Colonne ».'),
      pick('fixture', 'la colonne'),
      side('field:Forme colonne', 'Choisissez ronde, carrée ou cannelée.'),
    ],
    result: 'La colonne est posée ; les flèches « Position » la déplacent.',
  },
  {
    id: 'corridor',
    category: 'building',
    title: 'Ajouter un couloir',
    keywords: ['couloir', 'circulation', 'passage', 'corridor', 'hall'],
    steps: [
      ...menu('building', 'Couloir', 'Cliquez « Couloir ».'),
      pick('fixture', 'le couloir'),
      side('field:Murs de chaque côté', 'Cochez « Murs de chaque côté » et, si vous voulez, « Appliques murales ».'),
    ],
    result: 'Le couloir est tracé.',
  },
  {
    id: 'perimeter',
    category: 'building',
    title: 'Tracer un périmètre',
    keywords: ['perimetre', 'limite', 'contour', 'barriere', 'enceinte'],
    need: { fixture: 'perimeter' },
    needLabel: 'Périmètre',
    steps: menu('building', 'Périmètre', 'Cliquez « Périmètre ».'),
    result: 'Le périmètre est tracé.',
  },
  {
    id: 'room-size',
    category: 'building',
    title: 'Changer les dimensions de la salle',
    keywords: ['dimensions', 'taille de la salle', 'surface', 'largeur salle', 'longueur salle', 'metres carres', 'agrandir la salle'],
    steps: [
      ...section('config'),
      side('field:Largeur (m)', 'Tapez la largeur de la salle en mètres.', 'next'),
      side('field:Longueur (m)', 'Tapez sa longueur en mètres.', 'next'),
    ],
    result: 'La salle a ses nouvelles dimensions.',
  },
  {
    id: 'room-shape',
    category: 'building',
    title: 'Changer la forme de la salle (L, U, ronde…)',
    keywords: ['forme de la salle', 'en l', 'en u', 'salle ronde', 'contour', 'plan de la salle'],
    need: { feature: 'canChangeOutline' },
    needLabel: 'Forme de salle',
    steps: [...section('config'), info('Dans « Forme de la salle », cliquez la forme voulue.', 'tour:sidebar', 'edit')],
    result: 'Les murs suivent la nouvelle forme.',
  },
  {
    id: 'foundation',
    category: 'building',
    title: 'Régler la hauteur de la fondation',
    keywords: ['fondation', 'socle', 'surelever le batiment', 'soubassement'],
    steps: [...section('building'), info('Dans « Fondation », tapez la hauteur en mètres.', 'tour:sidebar', 'edit')],
    result: 'Le bâtiment repose sur sa fondation.',
  },
  {
    id: 'floor-photo',
    category: 'building',
    title: 'Poser une photo de plan au sol pour décalquer',
    keywords: ['decalquer', 'plan papier', 'photo du plan', 'repere photo', 'calque', 'image au sol'],
    steps: menu('building', 'Repère photo', 'Cliquez « Repère photo (sol) » et choisissez l’image de votre plan : elle s’affiche au sol pour poser le mobilier dessus.'),
    result: 'Le plan sert de calque au sol.',
    related: ['read-plan-ai'],
  },
  {
    id: 'read-plan-ai',
    category: 'building',
    title: 'Faire lire le plan au sol par l’IA',
    keywords: ['lire le plan', 'ia', 'reconnaitre', 'automatique', 'scanner le plan'],
    need: { feature: 'canPlanFromPhoto' },
    needLabel: 'Plan depuis une photo',
    steps: menu('building', 'Lire avec l’IA', 'Cliquez « Lire avec l’IA » : le mobilier visible sur le plan au sol est posé automatiquement (jetons IA).'),
    result: 'Le mobilier reconnu est posé ; vérifiez les positions.',
  },
);

// ───────── Extérieur ─────────
add(
  {
    id: 'surroundings',
    category: 'outdoor',
    title: 'Choisir les abords de la salle (jardin, plage, ville…)',
    keywords: ['abords', 'environnement', 'autour', 'jardin', 'plage', 'ville', 'montagne', 'paysage', 'terrain'],
    need: { feature: 'canFixtures' },
    needLabel: 'Abords extérieurs',
    steps: [openMenu('outdoor'), inMenu('outdoor', 'field:Abords', 'Choisissez les abords dans la liste : le décor autour de la salle change en 3D.', 'change')],
    result: 'La salle est entourée du décor choisi.',
  },
  {
    id: 'environment-custom',
    category: 'outdoor',
    title: 'Régler terrain, ciel, soleil et brouillard',
    keywords: ['ciel', 'soleil', 'brouillard', 'terrain', 'vegetation', 'environnement sur mesure', 'meteo'],
    need: { feature: 'canFixtures' },
    needLabel: 'Abords extérieurs',
    steps: [...menu('outdoor', 'Environnement sur mesure', 'Cliquez « Environnement sur mesure ».'), info('Réglez terrain, végétation, soleil, ciel et brouillard dans le panneau qui s’ouvre.', QUICK, 'tools')],
    result: 'L’environnement est personnalisé.',
  },
  {
    id: 'fountain',
    category: 'outdoor',
    title: 'Ajouter une fontaine',
    keywords: ['fontaine', 'jet d eau', 'bassin'],
    need: { fixture: 'fountain' },
    needLabel: 'Fontaine',
    steps: menu('outdoor', 'Fontaine', 'Cliquez « Fontaine ».'),
    result: 'La fontaine est posée.',
  },
  {
    id: 'gazebo',
    category: 'outdoor',
    title: 'Ajouter une gloriette',
    keywords: ['gloriette', 'kiosque', 'pergola', 'tonnelle'],
    need: { fixture: 'gazebo' },
    needLabel: 'Gloriette',
    steps: menu('outdoor', 'Gloriette', 'Cliquez « Gloriette ».'),
    result: 'La gloriette est posée.',
  },
  {
    id: 'parasol',
    category: 'outdoor',
    title: 'Ajouter un parasol',
    keywords: ['parasol', 'ombre', 'terrasse', 'soleil'],
    need: { fixture: 'parasol' },
    needLabel: 'Parasol',
    steps: menu('outdoor', 'Parasol', 'Cliquez « Parasol ».'),
    result: 'Le parasol est posé.',
  },
);
for (const style of LANDSCAPE_STYLE_ORDER) {
  const meta = LANDSCAPE_STYLE_META[style];
  add({
    id: `landscape-${style}`,
    category: 'outdoor',
    title: `Ajouter : ${meta.label}`,
    keywords: [meta.label, LANDSCAPE_GROUP_LABELS[meta.group], 'exterieur', 'jardin', 'paysage'],
    need: { fixture: 'landscape' },
    needLabel: 'Paysage extérieur',
    steps: [openMenu('outdoor'), inMenu('outdoor', `btn:${meta.label}`, `Dans « ${LANDSCAPE_GROUP_LABELS[meta.group]} », cliquez « ${meta.label} ». ${meta.hint}`)],
    result: `${meta.label} est posé ; réglez-le dans le panneau de droite.`,
  });
}

// ───────── Ambiance ─────────
add(
  {
    id: 'theme',
    category: 'ambience',
    title: 'Appliquer un thème complet',
    keywords: ['theme', 'ambiance', 'style', 'deco complete', 'mariage', 'industriel', 'boheme', 'preset'],
    need: { feature: 'canThemes' },
    needLabel: 'Thèmes',
    steps: [
      ...section('ambience'),
      side('field:Rechercher une ambiance', 'Tapez un style (« mariage », « industriel »…) pour filtrer les ambiances.', 'next'),
      info('Cliquez une ambiance : murs, sol, chaises et lumière changent ensemble (Ctrl+Z pour revenir).', 'tour:sidebar', 'edit'),
    ],
    result: 'La salle prend l’ambiance choisie.',
  },
  {
    id: 'theme-save',
    category: 'ambience',
    title: 'Enregistrer votre propre ambiance',
    keywords: ['enregistrer ambiance', 'mon theme', 'theme perso', 'sauver le style', 'bibliotheque'],
    need: { feature: 'canCustomTheme' },
    needLabel: 'Ambiances personnalisées',
    steps: [
      ...section('ambience'),
      side('field:Nom de l’ambiance', 'Tapez le nom de votre ambiance (ex. « Mariage champêtre »).', 'next'),
      side('btn:Capturer la salle', 'Cliquez « Capturer la salle » : murs, sol, chaises et lumière actuels sont enregistrés sous ce nom.', 'click'),
      info('Elle apparaît dans « perso. » : vous pouvez la partager, la publier pour l’équipe ou la réimporter dans une autre salle.', 'tour:sidebar', 'edit'),
    ],
    result: 'Votre ambiance est enregistrée.',
  },
  {
    id: 'floor',
    category: 'ambience',
    title: 'Changer le sol',
    keywords: ['sol', 'parquet', 'marbre', 'carrelage', 'beton', 'travertin', 'revetement', 'moquette sol', 'chevrons'],
    need: { feature: 'canThemes' },
    needLabel: 'Sols',
    steps: [
      ...section('ambience'),
      side('field:Rechercher un sol', 'Tapez une matière (bois, marbre, travertin…) puis cliquez le sol voulu.', 'next'),
      side('tour:floor-tint', 'Sous « Teinte / couleur du sol », cliquez une pastille de couleur pour teinter le sol (ou la dernière case pour une couleur libre).', 'click'),
    ],
    result: 'Le sol est changé.',
  },
  {
    id: 'wall-paint',
    category: 'ambience',
    title: 'Peindre tous les murs',
    keywords: ['peinture', 'couleur des murs', 'peindre', 'teinte murale'],
    need: { feature: 'canThemes' },
    needLabel: 'Murs',
    steps: [
      ...section('ambience'),
      { ...side('tour:wall-paint', 'Sous « Peinture murs (globale) », cliquez une pastille : tous les murs prennent cette couleur (la dernière case ouvre une couleur libre).', 'click'), hint: 'La salle est en plein air : il n’y a pas de murs à peindre. Recliquez « Espace ouvert » dans le menu « Zones » pour les retrouver.' },
    ],
    result: 'Les murs sont repeints.',
  },
  {
    id: 'floor-texture',
    category: 'ambience',
    title: 'Mettre votre image comme sol',
    keywords: ['texture de sol', 'image au sol', 'mon sol', 'carrelage perso'],
    need: { feature: 'canCustomImages' },
    needLabel: 'Images personnalisées',
    steps: [...section('ambience'), info('Descendez à « Texture de sol » et importez votre image ; réglez la taille d’une répétition.', 'tour:sidebar', 'edit')],
    result: 'Votre image recouvre le sol.',
  },
  {
    id: 'roof-style',
    category: 'ambience',
    title: 'Choisir le toit et le plafond',
    keywords: ['toit', 'plafond', 'charpente', 'verriere', 'chapiteau', 'style de toit'],
    need: { feature: 'canThemes' },
    needLabel: 'Toit',
    steps: [
      ...section('ambience'),
      { ...side('field:Afficher le toit / plafond', 'Descendez à « Toit, murs & éclairage » : la case « Afficher le toit / plafond » doit être cochée (cochez-la si besoin, puis cliquez « Suivant »).', 'next'), hint: 'La salle est en plein air : elle n’a pas de toit. Recliquez « Espace ouvert » dans le menu « Zones » pour retrouver murs et toit.' },
      { ...side('label:Style de toit', 'Cliquez un style de toit (plat, deux pans, verrière, chapiteau…).', 'click'), hint: 'Cochez d’abord « Afficher le toit / plafond » à l’étape précédente : les styles de toit apparaissent alors.' },
      info('Juste dessous, choisissez la matière et la teinte du toit.', 'tour:sidebar', 'edit'),
    ],
    result: 'Le toit change de style.',
  },
  {
    id: 'ceiling-chandeliers',
    category: 'ambience',
    title: 'Allumer les lustres du plafond',
    keywords: ['lustres au plafond', 'lustres', 'eclairage plafond'],
    need: { feature: 'canThemes' },
    needLabel: 'Lustres',
    steps: [...section('ambience'), side('field:Lustres au plafond', 'Cochez « Lustres au plafond », puis choisissez leur type et leur nombre.')],
    result: 'Les lustres sont allumés.',
  },
  {
    id: 'decor-extras',
    category: 'ambience',
    title: 'Uplights, rideaux et plantes d’angle',
    keywords: ['uplights', 'rideaux', 'plantes', 'eclairage mural', 'voilages'],
    need: { feature: 'canThemes' },
    needLabel: 'Décor',
    steps: [
      ...section('ambience'),
      side('btn:Autre décor', 'Ouvrez « Autre décor (uplights, rideaux…) ».', 'click'),
      side('field:Uplights muraux', 'Cochez « Uplights muraux », « Rideaux » ou « Plantes d’angle ».'),
    ],
    result: 'Le décor d’ambiance est ajouté.',
  },
  {
    id: 'light-preset',
    category: 'ambience',
    title: 'Choisir l’éclairage (midi, crépuscule, nuit)',
    keywords: ['lumiere', 'eclairage', 'nuit', 'jour', 'crepuscule', 'midi', 'soiree', 'ambiance lumineuse'],
    steps: [
      openMenu('light'),
      inMenu('light', 'btn:Crépuscule', 'Cliquez « Midi », « Crépuscule » ou « Nuit LED ». La liste « Éclairage scénique » propose d’autres ambiances.'),
    ],
    result: 'La lumière de la scène 3D change.',
  },
  {
    id: 'light-fine',
    category: 'ambience',
    title: 'Régler le soleil et la luminosité finement',
    keywords: ['soleil', 'orientation du soleil', 'temperature', 'luminosite', 'reglages fins', 'ombres'],
    steps: [
      ...menu('light', 'Réglages fins', 'Cliquez « Réglages fins ».'),
      info('Réglez hauteur et orientation du soleil, température, luminosité, voile et brouillard.'),
    ],
    result: 'L’éclairage est réglé au plus juste.',
  },
);

// ───────── Invités ─────────
add(
  {
    id: 'guests-sim',
    category: 'guests',
    title: 'Voir la salle remplie d’invités',
    keywords: ['invites', 'remplie', 'foule', 'monde', 'personnes', 'convives', 'simuler', 'avatars'],
    steps: menu('display', 'Invités simulés', 'Cliquez « Invités simulés » : des invités s’assoient aux places.'),
    result: 'La salle est peuplée d’invités.',
    related: ['guests-fill', 'guests-dance'],
  },
  {
    id: 'guests-fill',
    category: 'guests',
    title: 'Régler le taux de remplissage',
    keywords: ['remplissage', 'taux d occupation', 'moitie pleine', 'pourcentage invites'],
    steps: [openMenu('display'), inMenu('display', 'field:Remplissage', 'Choisissez la part des places occupées.', 'change')],
    result: 'Le nombre d’invités suit le remplissage.',
  },
  {
    id: 'guests-dress',
    category: 'guests',
    title: 'Choisir la tenue des invités',
    keywords: ['tenue', 'dress code', 'habits', 'costume', 'robe', 'tenue de soiree', 'decontracte'],
    steps: [openMenu('display'), info('Dans le menu « Affichage », choisissez le code vestimentaire des invités (soirée, cocktail, décontracté…).', 'css:#editor-tool-group-display', 'tools')],
    result: 'Les invités portent la tenue choisie.',
  },
  {
    id: 'guests-dance',
    category: 'guests',
    title: 'Faire danser les invités',
    keywords: ['danse', 'danser', 'piste animee', 'fete'],
    steps: menu('display', 'Danse', 'Cliquez « Danse » : des invités rejoignent la piste.'),
    result: 'Les invités dansent sur la piste.',
  },
  {
    id: 'guests-photos',
    category: 'guests',
    title: 'Avatars à partir des photos des invités',
    keywords: ['photos des invites', 'visages', 'portrait', 'avatar photo', 'reconnaitre les invites'],
    steps: menu('display', 'Invités avec photo', 'Cliquez « Invités avec photo » : les invités ayant une photo apparaissent avec leur visage.'),
    result: 'Les avatars reprennent les photos des invités.',
  },
);

// ───────── IA ─────────
add(
  {
    id: 'ai-studio',
    category: 'ai',
    title: 'Composer le plan avec le Studio IA',
    keywords: ['studio ia', 'ia', 'intelligence artificielle', 'generer', 'composer', 'automatique', 'decrire'],
    need: { feature: 'canPlanFromPhoto' },
    needLabel: 'Studio IA',
    steps: [
      { say: 'Cliquez « Studio IA » (ou « Composer avec l’IA » dans le panneau de droite).', target: ['tour:studio-ai', 'btn:Composer avec l’IA'] },
      info('Décrivez l’événement (« mariage de 120 personnes, piste au centre ») ou ajoutez une photo, puis lancez la composition.'),
    ],
    result: 'L’IA pose tables, scène et décor ; ajustez ensuite à la main.',
  },
  {
    id: 'plan-from-photo',
    category: 'ai',
    title: 'Reproduire une salle depuis une photo',
    keywords: ['depuis une photo', 'photo de la salle', 'reproduire', 'copier une salle', 'image de la salle'],
    need: { feature: 'canPlanFromPhoto' },
    needLabel: 'Plan depuis une photo',
    steps: [
      pick('none'),
      side('btn:Depuis une photo', 'Dans « Créer le plan », cliquez « Depuis une photo ».', 'click'),
      side('field:Contexte', 'Facultatif : précisez le contexte (« mariage, 80 convives »).', 'next'),
      side(['btn:Choisir une photo', 'btn:Relire la dernière photo'], 'Cliquez « Choisir une photo de la salle » et sélectionnez l’image.', 'click'),
    ],
    result: 'L’IA relève le mobilier visible et le pose ; vérifiez les positions.',
  },
  {
    id: 'start-manual',
    category: 'ai',
    title: 'Construire le plan à la main',
    keywords: ['a la main', 'manuel', 'sans ia', 'moi meme', 'partir de zero'],
    steps: [pick('none'), side('btn:À la main', 'Dans « Créer le plan », cliquez « À la main » : le menu Mobilier s’ouvre.', 'click')],
    result: 'Ajoutez vos éléments un par un.',
  },
  {
    id: 'custom-element',
    category: 'ai',
    title: 'Créer un élément 3D depuis une photo ou une vidéo',
    keywords: ['element personnalise', 'objet 3d', 'photo detouree', 'png', 'video', 'mon objet', 'importer un objet'],
    need: { feature: 'canCustomImages' },
    needLabel: 'Éléments personnalisés',
    steps: [
      ...menu('custom', 'Depuis une image ou vidéo', 'Cliquez « Depuis une image ou vidéo ».'),
      info('Importez la photo (idéalement un PNG détouré) ou la vidéo, donnez un nom et la taille réelle, puis validez.'),
    ],
    result: 'L’élément est posé et rangé dans « Mes éléments ».',
  },
  {
    id: 'my-elements',
    category: 'ai',
    title: 'Réutiliser mes éléments personnalisés',
    keywords: ['mes elements', 'bibliotheque', 'reutiliser', 'objets importes'],
    need: { feature: 'canCustomImages' },
    needLabel: 'Éléments personnalisés',
    steps: [...menu('custom', 'Mes éléments', 'Cliquez « Mes éléments ».'), info('Cliquez l’élément à poser.', QUICK, 'tools')],
    result: 'L’élément est posé.',
  },
);

// ───────── Vérifier ─────────
add(
  {
    id: 'spacing',
    category: 'check',
    title: 'Vérifier les espacements et dégagements',
    keywords: ['espacement', 'degagement', 'passage', 'trop serre', 'distance', 'circulation', 'verifier'],
    shortcut: 'Ctrl+Alt+O',
    steps: [
      { say: 'Cliquez « Espacements ».', target: 'tour:verify', pane: 'tools' },
      info('La fenêtre liste les passages trop étroits et propose de les corriger automatiquement.'),
    ],
    result: 'Les espacements sont vérifiés.',
  },
  {
    id: 'circulation',
    category: 'check',
    title: 'Afficher les allées et la sécurité incendie',
    keywords: ['allees', 'securite', 'incendie', 'evacuation', 'sortie de secours', 'heatmap'],
    steps: menu('display', 'Allées & Sécurité', 'Cliquez « Allées & Sécurité » : vert = conforme, orange ou rouge = trop étroit.'),
    result: 'La carte des allées est affichée.',
  },
  {
    id: 'sightlines',
    category: 'check',
    title: 'Vérifier la visibilité vers la scène',
    keywords: ['visibilite', 'voir la scene', 'lignes de vue', 'obstrue', 'ecran geant'],
    steps: menu('display', 'Visibilité scène', 'Cliquez « Visibilité scène » : vert = dégagé, rouge = obstrué.'),
    result: 'Les lignes de visibilité sont affichées.',
  },
  {
    id: 'pmr-overlay',
    category: 'check',
    title: 'Afficher les repères PMR',
    keywords: ['pmr', 'accessibilite', 'fauteuil roulant', 'normes', 'handicap'],
    steps: menu('display', 'Normes PMR', 'Cliquez « Normes PMR » : les repères d’accessibilité et les allées s’affichent.'),
    result: 'Les repères PMR sont visibles.',
  },
  {
    id: 'bom',
    category: 'check',
    title: 'Compter le matériel à commander',
    keywords: ['materiel', 'nomenclature', 'inventaire', 'combien', 'commander', 'liste du materiel', 'csv', 'bom'],
    steps: [
      { say: 'Cliquez « Matériel » : la nomenclature complète s’ouvre.', target: 'btn:Matériel', pane: 'tools' },
      info('Copiez la fiche récapitulative ou exportez-la en CSV avec les boutons de la fenêtre.'),
    ],
    result: 'Vous avez la liste exacte des tables, chaises et décors.',
  },
  {
    id: 'regenerate',
    category: 'check',
    title: 'Régénérer le plan',
    keywords: ['regenerer', 'recommencer', 'plan par defaut', 'repartir'],
    steps: [{ say: 'Cliquez « Régénérer » : le plan est recréé depuis les paramètres de la salle (Ctrl+Z pour revenir).', target: 'btn:Régénérer', pane: 'tools', hint: 'Le bouton « Régénérer » apparaît quand l’éditeur est ouvert depuis la fiche d’une salle (Salles → Modifier → Plan).' }],
    result: 'Le plan est régénéré.',
  },
  {
    id: 'action-log',
    category: 'check',
    title: 'Consulter le journal des actions',
    keywords: ['journal', 'historique', 'qu ai je fait', 'dernieres actions'],
    steps: [pick('any'), info('Descendez en bas du panneau de droite : « Journal des actions » liste chaque modification.', 'tour:sidebar', 'edit')],
    result: 'Vous voyez l’historique de vos modifications.',
  },
);

// ───────── Enregistrer ─────────
add(
  {
    id: 'undo',
    category: 'save',
    title: 'Annuler la dernière action',
    keywords: ['annuler', 'retour arriere', 'erreur', 'ctrl z', 'defaire', 'oups'],
    shortcut: 'Ctrl+Z',
    steps: [{ say: 'Cliquez la flèche « Annuler » en haut de l’éditeur (ou Ctrl+Z). Elle est grisée tant qu’il n’y a rien à annuler.', target: 'btn:Annuler', done: 'next' }],
    result: 'La dernière action est annulée.',
    related: ['redo'],
  },
  {
    id: 'redo',
    category: 'save',
    title: 'Rétablir une action annulée',
    keywords: ['retablir', 'refaire', 'ctrl y', 'redo'],
    shortcut: 'Ctrl+Y',
    steps: [{ say: 'Cliquez la flèche « Rétablir » (ou Ctrl+Y). Elle est grisée tant qu’aucune action n’a été annulée.', target: 'btn:Rétablir', done: 'next' }],
    result: 'L’action est rétablie.',
  },
  {
    id: 'save',
    category: 'save',
    title: 'Enregistrer le plan',
    keywords: ['enregistrer', 'sauvegarder', 'sauver', 'garder'],
    steps: [{ say: 'Chaque action est enregistrée automatiquement. Pour forcer l’enregistrement, cliquez « Enregistrer » en bas de la fenêtre.', target: 'btn:Enregistrer', hint: 'Ici, le plan s’enregistre automatiquement : aucun bouton n’est nécessaire.' }],
    result: 'Le plan est enregistré avec la salle.',
  },
  {
    id: 'template-save',
    category: 'save',
    title: 'Enregistrer le plan comme modèle',
    keywords: ['enregistrer comme modele', 'mes modeles', 'reutiliser le plan', 'sauver comme modele'],
    need: { feature: 'canTemplates' },
    needLabel: 'Modèles',
    steps: [
      { say: 'Cliquez « Modèles » (sur téléphone : « Modèles de salle » dans l’onglet « Ajouter »).', target: ['tour:templates', 'css:#editor-templates > summary'], pane: 'tools', open: true },
      { say: 'Dans « Mes modèles », tapez un nom de modèle.', target: 'css:#editor-templates >> field:Nom du modèle', pane: 'tools', done: 'next' },
      { say: 'Cliquez « Enregistrer le plan ».', target: 'css:#editor-templates >> btn:Enregistrer le plan', pane: 'tools' },
    ],
    result: 'Le modèle est réutilisable dans toutes vos salles.',
  },
  {
    id: 'variants',
    category: 'save',
    title: 'Garder plusieurs dispositions de la salle',
    keywords: ['variante', 'disposition', 'plusieurs plans', 'version', 'cocktail et diner', 'comparer'],
    steps: [{ say: 'Ouvrez l’onglet « Dispositions » en haut de la fenêtre de la salle : enregistrez ce plan, chargez-en un autre.', target: 'css:#edit-tab-layouts', hint: 'Les dispositions se gèrent depuis la fiche de la salle (Salles → Modifier).' }],
    result: 'Chaque disposition est gardée et visible par vos visiteurs.',
  },
);

// ───────── Partager ─────────
add(
  {
    id: 'export-png',
    category: 'share',
    title: 'Exporter une image HD',
    keywords: ['exporter', 'image', 'png', 'capture', 'photo', 'telecharger', 'screenshot'],
    steps: menu('view', 'Export PNG', 'Cliquez « Export PNG » : une capture haute définition de la vue est téléchargée.'),
    result: 'L’image est téléchargée.',
  },
  {
    id: 'bom-export',
    category: 'share',
    title: 'Exporter la liste du matériel (CSV)',
    keywords: ['csv', 'excel', 'exporter le materiel', 'tableur'],
    steps: [{ say: 'Cliquez « Matériel ».', target: 'btn:Matériel', pane: 'tools' }, info('Cliquez le bouton d’export CSV de la fenêtre.')],
    result: 'Le fichier CSV est téléchargé.',
  },
  {
    id: 'publish',
    category: 'share',
    title: 'Publier la salle sur le catalogue',
    keywords: ['publier', 'catalogue', 'vitrine', 'marketplace', 'annonce', 'en ligne'],
    steps: [
      { say: 'Ouvrez l’onglet « Publication » en haut de la fenêtre de la salle.', target: 'css:#edit-tab-publication', hint: 'La publication se fait depuis la fiche de la salle (Salles → Modifier).' },
      { say: 'Complétez la fiche puis cliquez « Publier sur le catalogue ».', target: 'btn:Publier sur le catalogue', hint: 'Ce bouton se trouve dans l’onglet « Publication » de la fiche de la salle.' },
    ],
    result: 'La salle apparaît dans le catalogue public, en 2D et en 3D.',
  },
  {
    id: 'share-theme',
    category: 'share',
    title: 'Partager une ambiance par lien',
    keywords: ['partager', 'lien', 'envoyer', 'equipe', 'copier le lien'],
    need: { feature: 'canCustomTheme' },
    needLabel: 'Ambiances personnalisées',
    steps: [
      ...section('ambience'),
      { ...side('btn:Copier le lien de partage', 'Dans vos ambiances « perso. », cliquez l’icône « Copier le lien de partage » de l’ambiance voulue.', 'click'), hint: 'Vous n’avez pas encore d’ambiance perso. : suivez d’abord le guide « Enregistrer votre propre ambiance ».' },
    ],
    result: 'Le lien est copié : collez-le dans un message.',
  },
);

export const EDITOR_GUIDE_ACTIONS: EditorGuideAction[] = A;

const ACTION_BY_ID = new Map(EDITOR_GUIDE_ACTIONS.map((a) => [a.id, a]));

export function editorGuideAction(id: string): EditorGuideAction | undefined {
  return ACTION_BY_ID.get(id);
}

// ─────────────────────────────────────────────────────────────────────────────
// Recherche en langage naturel
// ─────────────────────────────────────────────────────────────────────────────

const STOPWORDS = new Set([
  'a', 'au', 'aux', 'avec', 'ce', 'ces', 'comment', 'dans', 'de', 'des', 'du', 'elle', 'en', 'est', 'et', 'il', 'je', 'la', 'le', 'les', 'leur',
  'ma', 'mais', 'me', 'mes', 'moi', 'mon', 'ne', 'on', 'ou', 'par', 'pas', 'pour', 'qu', 'que', 'qui', 'sa', 'se', 'ses', 'son', 'sur', 'ta', 'te',
  'tes', 'ton', 'tu', 'un', 'une', 'vos', 'votre', 'vous', 'y', 'faire', 'fait', 'peux', 'peut', 'puis', 'veux', 'voudrais', 'faut',
  'quoi', 'bien', 'svp', 'stp', 'merci', 'bonjour', 'salut', 'l', 'd', 'j', 'c', 's', 'n', 'm', 't',
]);

const SYNONYMS: Record<string, string> = {
  effacer: 'supprimer', enlever: 'supprimer', virer: 'supprimer',
  bouger: 'deplacer', decaler: 'deplacer',
  redimensionner: 'taille', grandeur: 'taille', agrandir: 'taille', retrecir: 'taille',
  rotation: 'pivoter',
  cloner: 'dupliquer',
  sauvegarder: 'enregistrer', sauver: 'enregistrer',
  fenetres: 'fenetre', portes: 'porte',
  chaises: 'chaise', tables: 'table', murs: 'mur', graffitis: 'graffiti', images: 'image', zones: 'zone',
  invite: 'invites', invitee: 'invites', invitees: 'invites', convives: 'invites',
  lumieres: 'lumiere', eclairer: 'lumiere',
  boiseries: 'boiserie', moulure: 'moulures', pilastres: 'pilastre',
  ai: 'ia', intelligence: 'ia',
};

export function normalizeGuideText(s: string): string {
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
  return word.replace(/(ements|ement|ations|ation|eurs|eur|ees|ee|es|s|er|ez)$/, '').replace(/e$/, '');
}

/** Verbes et noms passe-partout : ils comptent peu, l'objet de la question décide. */
const GENERIC = new Set(['ajout', 'mettr', 'chang', 'voir', 'modifi', 'utilis', 'cre', 'regl', 'avoir', 'sall', 'plan', 'element', 'nouvel', 'nouveau', 'fair', 'veux', 'aim', 'choisir', 'pos']);

export function guideTokens(s: string): string[] {
  return normalizeGuideText(s)
    .split(' ')
    .filter((w) => w.length > 1 && !STOPWORDS.has(w))
    .map((w) => SYNONYMS[w] ?? w);
}

type Indexed = { action: EditorGuideAction; title: string; keywords: string[]; body: string };

const INDEX: Indexed[] = EDITOR_GUIDE_ACTIONS.map((action) => ({
  action,
  title: normalizeGuideText(action.title),
  keywords: action.keywords.map(normalizeGuideText),
  body: normalizeGuideText([...action.steps.map((s) => s.say), action.result, action.shortcut ?? ''].join(' ')),
}));

function scoreAction(entry: Indexed, tokens: string[], phrase: string): number {
  let score = 0;
  for (const k of entry.keywords) {
    if (k.includes(' ') && phrase.includes(` ${k} `)) score += 8;
  }
  if (phrase.trim() === entry.title) score += 20;
  const titleWords = new Set(entry.title.split(' ').map(stem));
  const keyWords = new Set(entry.keywords.flatMap((k) => k.split(' ')).map(stem));
  const bodyWords = new Set(entry.body.split(' ').map(stem));
  for (const tok of tokens) {
    const s = stem(tok);
    if (s.length < 2) continue;
    const weak = GENERIC.has(s);
    if (keyWords.has(s)) score += weak ? 1 : 4;
    if (titleWords.has(s)) score += weak ? 1 : 3;
    else if (bodyWords.has(s)) score += 0.5;
  }
  return score;
}

export type EditorGuideMatch = { action: EditorGuideAction; score: number };

/** Actions classées par pertinence pour une question libre. */
export function searchEditorGuide(query: string, limit = 6): EditorGuideMatch[] {
  const phrase = normalizeGuideText(query);
  const tokens = guideTokens(query);
  if (!tokens.length && !phrase) return [];
  return INDEX.map((entry) => ({ action: entry.action, score: scoreAction(entry, tokens, ` ${phrase} `) }))
    .filter((m) => m.score >= 1)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

const OVERVIEW_PATTERNS = [
  /\b(tout|toutes|tous)\b.*\b(action|fonction|possibilite|faire|option)/,
  /\bque (puis|peut|peux|peut on|est ce que je peux)\b.*\bfaire\b/,
  /\b(liste|descriptif|description|sommaire|menu|recapitulatif|resume)\b/,
  /\bquelles? (sont les )?(actions|fonctions|fonctionnalites|possibilites|options)\b/,
  /^(aide|help|\?)$/,
];

export function isOverviewQuestion(query: string): boolean {
  const q = normalizeGuideText(query);
  return OVERVIEW_PATTERNS.some((re) => re.test(q));
}

export type EditorGuideAnswer =
  | { kind: 'overview' }
  | { kind: 'match'; best: EditorGuideAction; others: EditorGuideAction[]; /** Assez net pour lancer le guide sans demander. */ confident: boolean }
  | { kind: 'unknown'; suggestions: EditorGuideAction[] };

const FALLBACK_IDS = ['quick-add', 'add-table', 'add-door', 'theme', 'guests-sim', 'spacing'];

/** Réponse de l'assistant : le guide le plus pertinent, et quelques autres. */
export function answerEditorGuide(query: string): EditorGuideAnswer {
  if (isOverviewQuestion(query)) return { kind: 'overview' };
  const matches = searchEditorGuide(query, 6);
  const best = matches[0];
  if (!best || best.score < 3) {
    const fallback = FALLBACK_IDS.map((id) => ACTION_BY_ID.get(id)).filter((a): a is EditorGuideAction => Boolean(a));
    return { kind: 'unknown', suggestions: matches.length ? matches.map((m) => m.action) : fallback };
  }
  const related = (best.action.related ?? []).map((id) => ACTION_BY_ID.get(id)).filter((a): a is EditorGuideAction => Boolean(a));
  const seen = new Set([best.action.id, ...related.map((a) => a.id)]);
  const others = [...related, ...matches.slice(1).map((m) => m.action).filter((a) => !seen.has(a.id))].slice(0, 4);
  const second = matches[1]?.score ?? 0;
  const confident = best.score >= 7 && best.score >= second + 4;
  return { kind: 'match', best: best.action, others, confident };
}

export type EditorGuideSection = { category: EditorGuideCategory; label: string; actions: EditorGuideAction[] };

/** Liste exhaustive des actions, rangée par thème (filtrée par `query` si fourni). */
export function editorGuideCatalog(query = ''): EditorGuideSection[] {
  const q = normalizeGuideText(query);
  const keep = (a: EditorGuideAction) => !q || normalizeGuideText(`${a.title} ${a.keywords.join(' ')}`).includes(q);
  return EDITOR_GUIDE_CATEGORY_ORDER.map((category) => ({
    category,
    label: EDITOR_GUIDE_CATEGORY_LABELS[category],
    actions: EDITOR_GUIDE_ACTIONS.filter((a) => a.category === category && keep(a)),
  })).filter((s) => s.actions.length > 0);
}

/** Forfait requis pour une action (null si incluse dans le forfait courant). */
export function editorGuideLock(action: EditorGuideAction, caps: RoomEditorCapabilities | null | undefined): { planLabel: string | null; message: string } | null {
  if (!action.need || !caps) return null;
  const need = action.need;
  const ok = 'feature' in need ? caps[need.feature] : 'fixture' in need ? caps.fixtureKinds.includes(need.fixture) : caps.tableShapes.includes(need.shape);
  if (ok) return null;
  const upsell = describeEditorUpsell(action.needLabel ?? action.title, need, caps.level);
  return { planLabel: upsell.planLabel, message: upsell.message };
}

/** La sélection courante (« table », « fixture:door »…) satisfait-elle l'étape ? */
export function guideSelectionMatches(want: GuideSelect, selection: readonly string[]): boolean {
  if (want === 'none') return selection.length === 0;
  if (want === 'any') return selection.length > 0;
  if (want === 'many') return selection.length > 1;
  if (want === 'fixture') return selection.some((s) => s === 'fixture' || s.startsWith('fixture:'));
  const alias = FIXTURE_ALIASES[want];
  return selection.some((s) => s === want || (alias ? alias.includes(s) : false));
}

/** Variantes d'un même type d'élément (une porte peut être un grand portail…). */
const FIXTURE_ALIASES: Record<string, string[]> = {
  'fixture:door': ['fixture:entrance'],
  'fixture:aisle': ['fixture:carpet'],
  'fixture:podium': ['fixture:stage'],
  'fixture:stage': ['fixture:podium'],
};

/** Questions proposées à l'ouverture de l'assistant. */
export const EDITOR_GUIDE_SUGGESTIONS = [
  'Ajouter une porte',
  'Changer la taille d’une table',
  'Voir la salle remplie',
  'Mettre des moulures sur les murs',
  'Changer le sol',
  'Vérifier les passages',
];
