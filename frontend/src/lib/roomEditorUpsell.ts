import type { RoomFixtureKind, TableShape } from './roomLayoutUtils.ts';
import {
  roomEditorCapabilities,
  type RoomEditorCapabilities,
  type RoomEditorLevel,
} from './roomEditorAccess.ts';

/** Fonction de l'éditeur réservée à un forfait : l'interface l'affiche désactivée plutôt que de la masquer. */
export type EditorNeed =
  | { feature: BooleanCapabilityKey }
  | { fixture: RoomFixtureKind }
  | { shape: TableShape };

export type BooleanCapabilityKey = {
  [K in keyof RoomEditorCapabilities]: RoomEditorCapabilities[K] extends boolean ? K : never;
}[keyof RoomEditorCapabilities];

const LEVELS: RoomEditorLevel[] = ['basic', 'standard', 'advanced', 'complete'];

function satisfies(caps: RoomEditorCapabilities, need: EditorNeed): boolean {
  if ('feature' in need) return caps[need.feature];
  if ('fixture' in need) return caps.fixtureKinds.includes(need.fixture);
  return caps.tableShapes.includes(need.shape);
}

/** Premier niveau d'éditeur (toutes options du forfait activées) qui offre la fonction. */
export function minimumEditorLevel(need: EditorNeed): RoomEditorLevel | null {
  return LEVELS.find((level) => satisfies(roomEditorCapabilities(level, true), need)) ?? null;
}

export interface EditorUpsell {
  /** Forfait à choisir, par exemple « Premium » ; `null` si c'est une option du forfait actuel. */
  planLabel: string | null;
  message: string;
}

export function describeEditorUpsell(
  label: string,
  need: EditorNeed,
  currentLevel: RoomEditorLevel,
): EditorUpsell {
  const minimum = minimumEditorLevel(need);
  const currentIndex = LEVELS.indexOf(currentLevel);
  const minimumIndex = minimum ? LEVELS.indexOf(minimum) : -1;

  if (minimum && minimumIndex > currentIndex) {
    const planLabel = roomEditorCapabilities(minimum, true).label;
    return {
      planLabel,
      message: `« ${label} » est inclus à partir du forfait ${planLabel}.`,
    };
  }
  return {
    planLabel: null,
    message: `« ${label} » nécessite l’option thèmes et décors, absente de votre forfait actuel.`,
  };
}

/** Texte visible d'un nœud React, pour nommer une fonction verrouillée sans le répéter à la main. */
export function textOfNode(node: unknown): string {
  if (typeof node === 'string') return node;
  if (typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textOfNode).join('');
  if (node && typeof node === 'object' && 'props' in node) {
    const props = (node as { props?: { children?: unknown } }).props;
    return textOfNode(props?.children);
  }
  return '';
}

const FEATURE_LABELS: Partial<Record<BooleanCapabilityKey, string>> = {
  canAddRows: 'Rangées',
  canDuplicate: 'Duplication',
  canLock: 'Verrouillage',
  canChangeOutline: 'Forme de la salle',
  canThemes: 'Thèmes',
  canFixtures: 'Scène et décor',
  canCustomImages: 'Images personnalisées',
  canPlanFromPhoto: 'Plan depuis une photo',
  canCustomTheme: 'Thèmes personnalisés',
  canZones: 'Zones',
  canSnapGrid: 'Grille magnétique',
  canRotate: 'Rotation',
  canTemplates: 'Modèles de plan',
  canAutoAssign: 'Placement automatique',
  canAlign: 'Alignement',
  canShowcaseRender: 'Rendu showcase',
};

/** Nom de repli quand le contrôle verrouillé n'a ni texte ni libellé d'accessibilité. */
export function defaultEditorNeedLabel(need: EditorNeed): string {
  if ('feature' in need) return FEATURE_LABELS[need.feature] ?? 'Cette fonction';
  if ('fixture' in need) return 'Élément de décor';
  return 'Forme de table';
}
