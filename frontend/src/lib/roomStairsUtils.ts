import type { RoomLayoutBlueprint } from '@/lib/roomLayoutUtils';

/** Orientation de la course sur le plan (0 = vers le haut du canvas). */
export type StairDirection = 0 | 90 | 180 | 270;

/** Style visuel / géométrie de l’escalier. */
export type StairStyle = 'straight' | 'open' | 'compact';

export const stairDirectionLabels: Record<StairDirection, string> = {
  0: 'Haut',
  90: 'Droite',
  180: 'Bas',
  270: 'Gauche',
};

export const STAIR_DIRECTION_ORDER: StairDirection[] = [0, 90, 180, 270];

export const stairStyleLabels: Record<StairStyle, string> = {
  straight: 'Droit classique',
  open: 'Ouvert (loft)',
  compact: 'Compact',
};

export const stairStyleHints: Record<StairStyle, string> = {
  straight: 'Marches pleines, limons, garde-corps',
  open: 'Contremarches ouvertes, plus aérien',
  compact: 'Course plus courte, marches plus hautes',
};

export type StairFixture = RoomLayoutBlueprint['fixtures'][number] & { kind: 'stairs' };

/** Métriques calculées pour un escalier entre deux niveaux. */
export type StairMetrics = {
  riseM: number;
  runM: number;
  widthM: number;
  steps: number;
  wPct: number;
  hPct: number;
  inclineDeg: number;
};

export type StairDefinition = {
  fixtureId: string;
  fromStoryId: string;
  toStoryId: string | null;
  fromLabel: string;
  toLabel: string | null;
  direction: StairDirection;
  style: StairStyle;
  metrics: StairMetrics | null;
  linked: boolean;
  label: string;
};

type StoryLike = { id: string; label: string; elevationM: number };

const IDEAL_RISER_M = 0.175;
const IDEAL_TREAD_M = 0.28;
const COMPACT_RISER_M = 0.19;
const COMPACT_TREAD_M = 0.24;

function storiesOf(blueprint: RoomLayoutBlueprint): StoryLike[] {
  const list = blueprint.metadata.stories;
  if (Array.isArray(list) && list.length > 0) return list;
  return [{ id: 'story-rdc', label: 'RDC', elevationM: 0 }];
}

function activeStoryIdOf(blueprint: RoomLayoutBlueprint): string {
  const stories = storiesOf(blueprint);
  const active = blueprint.metadata.activeStoryId;
  if (active && stories.some((s) => s.id === active)) return active;
  return stories[0]!.id;
}

function elevOf(blueprint: RoomLayoutBlueprint, storyId: string): number {
  return storiesOf(blueprint).find((s) => s.id === storyId)?.elevationM ?? 0;
}

export function resolveStairDirection(value?: number | null): StairDirection {
  if (value === 90 || value === 180 || value === 270) return value;
  return 0;
}

export function resolveStairStyle(value?: string | null): StairStyle {
  if (value === 'open' || value === 'compact') return value;
  return 'straight';
}

/** Calcule hauteur, course, largeur et marches selon le style. */
export function computeStairMetrics(opts: {
  riseM: number;
  canvasWidthM: number;
  canvasDepthM: number;
  style?: StairStyle;
}): StairMetrics {
  const style = opts.style ?? 'straight';
  const riseM = Math.max(0.8, opts.riseM);
  const canvasW = Math.max(5, opts.canvasWidthM);
  const canvasD = Math.max(5, opts.canvasDepthM);
  const riser = style === 'compact' ? COMPACT_RISER_M : IDEAL_RISER_M;
  const tread = style === 'compact' ? COMPACT_TREAD_M : IDEAL_TREAD_M;
  const maxRunRatio = style === 'compact' ? 0.42 : 0.55;
  const steps = Math.max(6, Math.min(22, Math.round(riseM / riser)));
  const runM = Math.min(canvasD * maxRunRatio, Math.max(2.0, steps * tread));
  const widthM = Math.min(2.2, Math.max(1.05, canvasW * (style === 'compact' ? 0.09 : 0.1)));
  const hPct = Math.max(12, Math.min(55, (runM / canvasD) * 100));
  const wPct = Math.max(6, Math.min(28, (widthM / canvasW) * 100));
  const inclineDeg = (Math.atan2(riseM, runM) * 180) / Math.PI;
  return { riseM, runM, widthM, steps, wPct, hPct, inclineDeg };
}

export function stairFromStoryId(
  fixture: Pick<StairFixture, 'storyId'>,
  blueprint: RoomLayoutBlueprint,
): string {
  return fixture.storyId ?? activeStoryIdOf(blueprint);
}

export function resolveStairDefinition(
  blueprint: RoomLayoutBlueprint,
  fixture: StairFixture,
): StairDefinition {
  const stories = storiesOf(blueprint);
  const fromStoryId = stairFromStoryId(fixture, blueprint);
  const toStoryId = fixture.connectsToStoryId ?? null;
  const from = stories.find((s) => s.id === fromStoryId);
  const to = toStoryId ? stories.find((s) => s.id === toStoryId) : undefined;
  const style = resolveStairStyle(fixture.stairStyle);
  const direction = resolveStairDirection(fixture.stairDirection);

  let metrics: StairMetrics | null = null;
  if (to) {
    const riseFromStories = Math.abs(elevOf(blueprint, to.id) - elevOf(blueprint, fromStoryId));
    metrics = computeStairMetrics({
      riseM: fixture.heightM && fixture.heightM > 0.4 ? fixture.heightM : riseFromStories,
      canvasWidthM: blueprint.canvas.widthM,
      canvasDepthM: blueprint.canvas.heightM,
      style,
    });
  }

  return {
    fixtureId: fixture.id,
    fromStoryId,
    toStoryId,
    fromLabel: from?.label ?? 'RDC',
    toLabel: to?.label ?? null,
    direction,
    style,
    metrics,
    linked: Boolean(toStoryId && to),
    label: fixture.label ?? 'Escalier',
  };
}

export function listStairs(blueprint: RoomLayoutBlueprint): StairDefinition[] {
  return blueprint.fixtures
    .filter((f): f is StairFixture => f.kind === 'stairs')
    .map((f) => resolveStairDefinition(blueprint, f));
}

export function otherStoriesForStairs(
  blueprint: RoomLayoutBlueprint,
  fromStoryId?: string,
): StoryLike[] {
  const from = fromStoryId ?? activeStoryIdOf(blueprint);
  return storiesOf(blueprint).filter((s) => s.id !== from);
}

/** Texte court pour le panneau (ex. « RDC → 1ᵉ étage · 3,2 m · 18 marches »). */
export function formatStairSummary(def: StairDefinition): string {
  if (!def.linked || !def.toLabel || !def.metrics) {
    return `${def.fromLabel} → ? (choisir l’arrivée)`;
  }
  return `${def.fromLabel} → ${def.toLabel} · ${def.metrics.riseM.toFixed(1)} m · ${def.metrics.steps} marches · ${Math.round(def.metrics.inclineDeg)}°`;
}

/** Contenu du guide utilisateur (escaliers uniquement). */
export type StairsGuideSection = {
  id: string;
  title: string;
  steps: string[];
};

export const STAIRS_USER_GUIDE: {
  title: string;
  intro: string;
  sections: StairsGuideSection[];
  tips: string[];
} = {
  title: 'Guide — Escaliers entre étages',
  intro:
    'Un escalier relie deux niveaux du bâtiment. Le système calcule automatiquement la hauteur, le nombre de marches et la longueur de course pour rejoindre l’étage d’arrivée.\n\nAbonnement : escaliers et balcons exigent le niveau d’éditeur Premium ou Complet (Business Premium, Enterprise, forfaits Salle…). Essentiel = tables seules ; Business = entrées / allées / couloirs uniquement. Voir Facturation et la FAQ « éditeur de salles ».',
  sections: [
    {
      id: 'prereq',
      title: 'Avant de commencer',
      steps: [
        'Vérifiez votre forfait : Facturation doit afficher éditeur Premium ou Complet (thèmes / fixtures activés). Sinon, passez à Business Premium ou équivalent.',
        'Créez au moins deux étages (modèle Duplex / Villa, ou bouton + Étage).',
        'Sélectionnez l’étage de départ dans la barre « Étage » (ex. RDC).',
        'Activez « Empiler » pour vérifier le résultat en 3D.',
      ],
    },
    {
      id: 'create',
      title: 'Créer un escalier',
      steps: [
        'Cliquez sur « Escalier vers… » dans la barre d’outils, ou ouvrez Étages & vues.',
        'Choisissez l’étage d’arrivée (ex. 1ᵉ étage).',
        'L’escalier est placé sur l’étage de départ, déjà relié, avec hauteur et course calculées.',
        'Déplacez-le sur le plan (coin, hall, contre un mur).',
      ],
    },
    {
      id: 'define',
      title: 'Définir / ajuster',
      steps: [
        'Sélectionnez l’escalier : panneau « Définition ».',
        'Départ = étage où il est posé · Arrivée = étage relié.',
        'Orientation : Haut / Droite / Bas / Gauche (sens de la montée sur le plan).',
        'Style : Droit, Ouvert (loft) ou Compact (course plus courte).',
        '« Recalibrer » met à jour hauteur, marches et emprise si vous avez changé les étages.',
      ],
    },
    {
      id: 'check',
      title: 'Vérifier',
      steps: [
        'Passez en vue empilée : l’escalier doit monter du plancher bas jusqu’au palier haut.',
        'Le libellé affiche « Escalier → [étage] ».',
        'Un modèle Duplex / Triplex / Villa crée déjà les escaliers entre niveaux.',
      ],
    },
  ],
  tips: [
    'Placez l’escalier près d’un couloir ou d’une entrée pour une circulation naturelle.',
    'Sur un Triplex, un escalier relie RDC→1er et un autre 1er→2e (un par liaison).',
    'Si l’arrivée est trop raide, choisissez le style Droit (pas Compact) puis recalibrez.',
    'Supprimer un étage retire aussi les escaliers qui y étaient liés.',
    'Sur Business (standard), les escaliers ne sont pas proposés : passez en Premium pour les débloquer.',
  ],
};
