/**
 * Guide interactif de l’éditeur de salle, adapté au forfait de chacun.
 *
 * Chaque étape montre une zone de l’éditeur (attribut `data-tour`) et explique ce qu’on y fait.
 * Les fonctions incluses dans le forfait sont présentées normalement ; celles qui ne le sont pas
 * restent dans le guide, marquées du forfait qui les débloque, pour que chacun sache ce que son
 * abonnement permet et ce qu’il gagnerait à passer au niveau supérieur.
 */

import { roomEditorCapabilities, type RoomEditorCapabilities, type RoomEditorLevel } from './roomEditorAccess.ts';
import { describeEditorUpsell, type EditorNeed } from './roomEditorUpsell.ts';

/** Action proposée par le bouton « Essayer » d’une étape. */
export type EditorTourAction = 'openQuickAdd' | 'addTable' | 'toggle3d' | 'openTemplates' | 'openShortcuts' | 'openStudio';

export type EditorTourStepDef = {
  id: string;
  /** Valeur de l’attribut `data-tour` de la zone à montrer ; absent : carte centrée. */
  target?: string;
  title: string;
  body: string;
  /** Fonction réservée à un forfait : l’étape est alors marquée verrouillée. */
  need?: EditorNeed;
  /** Libellé de la fonction dans le message de déblocage. */
  needLabel?: string;
  action?: { kind: EditorTourAction; label: string };
};

export type EditorTourStep = EditorTourStepDef & {
  locked: boolean;
  /** Forfait qui débloque l’étape (si verrouillée). */
  planLabel: string | null;
  lockMessage: string | null;
};

const STEPS: EditorTourStepDef[] = [
  {
    id: 'canvas',
    target: 'canvas',
    title: 'Votre salle, en vrai',
    body: 'Le plan est à l’échelle réelle. Glissez un élément pour le déplacer, cliquez pour le sélectionner. Maj + clic ajoute à la sélection.',
  },
  {
    id: 'view',
    target: 'view-toggle',
    title: 'Plan 2D ou visite 3D',
    body: '2D pour placer au millimètre, 3D pour se rendre compte de l’ambiance. « Déplacer / Regarder » choisit si glisser bouge les objets ou la caméra.',
    action: { kind: 'toggle3d', label: 'Passer en 3D' },
  },
  {
    id: 'quickAdd',
    target: 'quick-add',
    title: 'Ajouter n’importe quoi au clavier',
    body: 'Ctrl+K (ou /) ouvre la recherche : tapez « table », « piano », « bar à vins »… puis Entrée. Seuls les éléments de votre forfait y figurent.',
    action: { kind: 'openQuickAdd', label: 'Ouvrir la recherche' },
  },
  {
    id: 'furniture',
    target: 'tool-furniture',
    title: 'Tables et chaises',
    body: 'Le menu Mobilier pose des tables. Chaque table reçoit automatiquement ses chaises, et les espacements de circulation sont respectés.',
    action: { kind: 'addTable', label: 'Ajouter une table' },
  },
  {
    id: 'rows',
    target: 'tool-furniture',
    title: 'Rangées et amphithéâtres',
    body: 'Pour une conférence ou une cérémonie : rangées de chaises, groupes de rangées et gradins en arc en un clic.',
    need: { feature: 'canAddRows' },
    needLabel: 'Rangées de chaises',
  },
  {
    id: 'resize',
    target: 'canvas',
    title: 'Taille et position au centimètre',
    body: 'Sélectionnez une scène, un bar ou une zone : des poignées apparaissent aux coins et sur les côtés pour l’étirer (Maj garde les proportions). Le panneau de droite donne longueur, largeur et position en mètres, avec des boutons pour centrer.',
  },
  {
    id: 'walls',
    target: 'walls',
    title: 'Portes, fenêtres et décor sur les murs',
    body: 'Ouvrez « Murs, portes & fenêtres » puis choisissez un mur : sa vue de face « Placer sur le mur » s’affiche. Glissez une porte, une fenêtre, une image ou un graffiti, tirez le coin pour la taille, ou tapez les cotes exactes. Flèches du clavier : 5 cm.',
  },
  {
    id: 'wallArt',
    target: 'walls',
    title: 'Graffitis et images, dedans ou dehors',
    body: 'Chaque image ou graffiti se pose côté salle ou côté extérieur (façade). Les graffitis se stylisent : chrome, rétro, tag, throw-up, BD, néon… avec police, dégradé, inclinaison, texte en arc, fond peint et effets (relief, coulures, étincelles).',
  },
  {
    id: 'wallTrim',
    target: 'walls',
    title: 'Moulures, boiseries et pilastres',
    body: 'Dans « Murs, portes & fenêtres », « Moulures et boiseries » habille les murs : cimaise, boiserie basse à panneaux, moulures à la française ou pilastres, pour tous les murs ou un seul, dans la teinte de votre choix. Les pièces contournent portes et fenêtres.',
  },
  {
    id: 'crowd',
    target: 'tool-display',
    title: 'Voir la salle remplie',
    body: 'Dans Affichage, « Invités simulés » assoit des invités sur les chaises et fait danser la piste, en 3D comme sur le plan 2D. Choisissez le taux de remplissage et le thème de la soirée.',
  },
  {
    id: 'openSpace',
    title: 'Espace en plein air',
    body: 'Pour un jardin, une plage ou une cour, passez la salle en plein air : murs, toit, portes et fenêtres disparaissent des options. « Plein air · ajouter des murs » les remet si besoin.',
  },
  {
    id: 'templates',
    target: 'templates',
    title: 'Partir d’un modèle',
    body: 'Banquet, conférence, cocktail, mariage… Un modèle pose tout le plan d’un coup ; vous n’avez plus qu’à l’ajuster.',
    need: { feature: 'canTemplates' },
    needLabel: 'Modèles de salle',
    action: { kind: 'openTemplates', label: 'Voir les modèles' },
  },
  {
    id: 'decor',
    // Le menu « Décor » est rangé sous « Plus » dans la barre d’outils.
    target: 'tool-more',
    title: 'Scène, lustres, bars et décor',
    body: 'Dans « Plus », le menu Décor regroupe scène, podiums, instruments, lustres, bars, allées, fleurs et écrans. Tout le décor se place comme une table et se règle dans le panneau de droite.',
    need: { fixture: 'stage' },
    needLabel: 'Scène et décor',
  },
  {
    id: 'zones',
    target: 'tool-zones',
    title: 'Piste de danse, espace VIP, buffet',
    body: 'Les zones délimitent un espace au sol avec sa propre matière : parquet de danse, marbre VIP, moquette…',
    need: { feature: 'canZones' },
    needLabel: 'Zones',
  },
  {
    id: 'ai',
    target: 'studio-ai',
    title: 'Le Studio IA compose pour vous',
    body: 'Décrivez l’événement ou importez une photo du plan existant : l’IA pose tables, scène et décor, reprend les portes et fenêtres à leur taille réelle et les graffitis vus sur les murs (côté salle ou extérieur). Chaque composition est annulable.',
    need: { feature: 'canPlanFromPhoto' },
    needLabel: 'Studio IA',
    action: { kind: 'openStudio', label: 'Ouvrir le Studio IA' },
  },
  {
    id: 'shortcuts',
    target: 'shortcuts',
    title: 'Dupliquer, copier, coller',
    body: 'Ctrl+D duplique, Ctrl+C / Ctrl+V copie d’un endroit ou d’un étage à l’autre, R pivote, les flèches calent au millimètre. « ? » affiche tous les raccourcis.',
    need: { feature: 'canDuplicate' },
    needLabel: 'Duplication et copier-coller',
    action: { kind: 'openShortcuts', label: 'Voir les raccourcis' },
  },
  {
    id: 'render',
    target: 'tool-view',
    title: 'Rendu vitrine et présentation',
    body: 'Le rendu vitrine ajoute reflets, ombres douces et lumière d’ambiance. Le mode présentation fait tourner la salle toute seule devant vos clients.',
    need: { feature: 'canShowcaseRender' },
    needLabel: 'Rendu vitrine',
  },
  {
    id: 'assistant',
    target: 'assistant',
    title: 'L’assistant vous guide geste par geste',
    body: 'Le bouton « Assistant » : dites ce que vous voulez faire (« ajouter une porte »), il éclaire chaque bouton à toucher, dans l’ordre, et avance dès que c’est fait. « Toutes les actions » liste plus de 200 guides, rangés par thème.',
  },
  {
    id: 'check',
    target: 'verify',
    title: 'Vérifier avant le jour J',
    body: '« Espacements » signale les passages trop étroits et les corrige ; « Matériel » compte tables, chaises et décor à commander.',
  },
];

/** Étapes du guide pour un forfait donné (toutes, les verrouillées marquées). */
export function buildEditorTour(caps: RoomEditorCapabilities): EditorTourStep[] {
  return STEPS.map((step) => {
    const locked = step.need ? !satisfiesNeed(caps, step.need) : false;
    if (!locked || !step.need) return { ...step, locked: false, planLabel: null, lockMessage: null };
    const upsell = describeEditorUpsell(step.needLabel ?? step.title, step.need, caps.level);
    return { ...step, locked: true, planLabel: upsell.planLabel, lockMessage: upsell.message };
  });
}

function satisfiesNeed(caps: RoomEditorCapabilities, need: EditorNeed): boolean {
  if ('feature' in need) return caps[need.feature];
  if ('fixture' in need) return caps.fixtureKinds.includes(need.fixture);
  return caps.tableShapes.includes(need.shape);
}

/** Résumé du forfait affiché à l’ouverture du guide. */
/** Événement écouté par l’éditeur ouvert pour lancer sa visite ; `?guide=1` couvre celui qui s’ouvrira ensuite. */
export const START_EDITOR_TOUR_EVENT = 'em-start-editor-tour';

export function editorTourSummary(caps: RoomEditorCapabilities): { title: string; included: string[]; nextPlan: string | null } {
  const included = [
    `Jusqu’à ${caps.maxTables} tables`,
    caps.canAddRows ? `${caps.maxRows} rangées de chaises` : null,
    caps.canTemplates ? 'Modèles de salle' : null,
    caps.canFixtures && caps.fixtureKinds.includes('stage') ? 'Scène, bars, lustres et décor' : caps.canFixtures ? 'Portes et allées' : null,
    caps.canZones ? 'Zones (piste, VIP, buffet)' : null,
    caps.canPlanFromPhoto ? 'Studio IA (plan depuis une photo)' : null,
    caps.canShowcaseRender ? 'Rendu vitrine et présentation' : null,
    caps.canCustomImages ? 'Images et thèmes personnalisés' : null,
  ].filter((v): v is string => Boolean(v));
  const next = nextLevelLabel(caps.level);
  return { title: `Forfait ${caps.label}`, included, nextPlan: next };
}

const ORDER: RoomEditorLevel[] = ['basic', 'standard', 'advanced', 'complete'];

function nextLevelLabel(level: RoomEditorLevel): string | null {
  const i = ORDER.indexOf(level);
  return i >= 0 && i < ORDER.length - 1 ? roomEditorCapabilities(ORDER[i + 1], true).label : null;
}

/** Clé de stockage local : le guide n’est proposé d’office qu’une fois par navigateur. */
// v3 : nouvelles étapes (moulures des murs, assistant) ; le guide est reproposé une fois.
export const EDITOR_TOUR_SEEN_KEY = 'em-editor-tour-seen-v3';
