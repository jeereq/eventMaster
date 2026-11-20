/**
 * Règles d’application des murs et sols.
 *
 * Certains réglages (ambiance, texture murale, type de sol) sont bien enregistrés
 * mais ne se voient pas dans la salle : murs masqués, salle sous tente, plan importé
 * qui recouvre le sol, zones posées par-dessus… Ce module dit, pour un plan donné,
 * ce qui ne s’appliquera pas (ou pas entièrement) et pourquoi, pour l’afficher dans
 * l’éditeur au lieu de laisser l’utilisateur croire à un bug.
 *
 * Module pur (imports de types uniquement) : testable avec `node --test`.
 */

import type { RoomLayoutBlueprint } from './roomLayoutUtils.ts';

export type SurfaceTarget = 'walls' | 'floor';

/**
 * - `hidden`  : le réglage est enregistré mais ne se voit pas du tout.
 * - `partial` : il s’applique en partie, ou remplace quelque chose.
 * - `kept`    : un élément garde sa propre matière, quoi qu’on choisisse.
 */
export type SurfaceRuleTone = 'hidden' | 'partial' | 'kept';

export type SurfaceRuleAction = 'showWalls' | 'removeFloorImage' | 'clearFloorTint';

export type SurfaceRule = {
  id: string;
  target: SurfaceTarget;
  tone: SurfaceRuleTone;
  title: string;
  detail: string;
  action?: { id: SurfaceRuleAction; label: string };
};

type RuleInput = Pick<RoomLayoutBlueprint, 'roomType' | 'metadata' | 'walls' | 'furniture' | 'fixtures'>;

const TENT_ROOFS = new Set(['tentSwag', 'pagoda', 'clearTent']);

/** Même règle que `isTentVenue` (roomLayoutUtils) : côtés en toile dans la vue 3D. */
function isTent(bp: RuleInput): boolean {
  if (bp.roomType === 'TENT') return true;
  return bp.metadata?.tentVenue === true && TENT_ROOFS.has(String(bp.metadata?.roofStyle ?? ''));
}

function wallsHidden(bp: RuleInput): boolean {
  return bp.metadata?.showWalls === false;
}

/** Les segments n’ont pas tous la même texture ou la même couleur. */
function hasPerWallFinish(bp: RuleInput): boolean {
  const walls = bp.walls ?? [];
  if (walls.length < 2) return false;
  const first = walls[0]!;
  return walls.some((w) => w.texture !== first.texture || (w.color ?? '') !== (first.color ?? ''));
}

/** Zones avec une matière, tapis et moquettes posés sur le sol. */
function floorOverlayCount(bp: RuleInput): number {
  const zones = (bp.furniture ?? []).filter(
    (item) => item.kind === 'zone' && (Boolean(item.material) || item.zoneKind === 'dance' || item.zoneKind === 'carpet'),
  ).length;
  const carpets = (bp.fixtures ?? []).filter((f) => f.kind === 'carpet').length;
  return zones + carpets;
}

function hasOutdoorGround(bp: RuleInput): boolean {
  const s = bp.metadata?.outdoorSurroundings;
  return Boolean(s) && s !== 'none';
}

function plural(n: number, one: string, many: string): string {
  return n > 1 ? many : one;
}

/** Règles murs : ce qui ne se voit pas, ou pas entièrement, sur les murs. */
export function collectWallRules(bp: RuleInput): SurfaceRule[] {
  const rules: SurfaceRule[] = [];
  if (wallsHidden(bp)) {
    rules.push({
      id: 'walls-hidden',
      target: 'walls',
      tone: 'hidden',
      title: 'Murs masqués',
      detail: 'Texture, peinture et moulures restent enregistrées, mais rien ne se voit tant que les murs sont masqués (espace ouvert).',
      action: { id: 'showWalls', label: 'Afficher les murs' },
    });
  } else if (isTent(bp)) {
    rules.push({
      id: 'walls-tent',
      target: 'walls',
      tone: 'partial',
      title: 'Salle sous tente',
      detail: 'Les côtés sont en toile : la texture murale ne s’affiche pas, seule la couleur des murs teinte la toile.',
    });
  }
  if (hasPerWallFinish(bp)) {
    rules.push({
      id: 'walls-per-segment',
      target: 'walls',
      tone: 'partial',
      title: 'Murs réglés un par un',
      detail: 'Une ambiance, une texture ou une peinture « tous les murs » remplace les réglages faits sur chaque mur.',
    });
  }
  return rules;
}

/** Règles sol : ce qui recouvre le sol choisi ou garde sa propre matière. */
export function collectFloorRules(bp: RuleInput): SurfaceRule[] {
  const rules: SurfaceRule[] = [];
  const meta = bp.metadata ?? ({} as RuleInput['metadata']);
  if (meta.floorImageUrl) {
    const plan = meta.floorImageFit !== 'tile';
    rules.push(plan
      ? {
          id: 'floor-plan-image',
          target: 'floor',
          tone: 'hidden',
          title: 'Plan importé sur le sol',
          detail: 'L’image couvre tout le sol : le type de sol et la teinte ne se voient pas. Choisir un sol ou appliquer une ambiance retire le plan.',
          action: { id: 'removeFloorImage', label: 'Retirer le plan' },
        }
      : {
          id: 'floor-image-texture',
          target: 'floor',
          tone: 'partial',
          title: 'Texture de sol importée',
          detail: 'Elle remplace le sol du catalogue. Choisir un sol ou appliquer une ambiance la retire.',
          action: { id: 'removeFloorImage', label: 'Retirer la texture' },
        });
  }
  if (meta.floorColor && meta.floorColor.toLowerCase() !== '#ffffff') {
    rules.push({
      id: 'floor-tint',
      target: 'floor',
      tone: 'partial',
      title: 'Teinte appliquée au sol',
      detail: 'Elle se mélange à chaque sol choisi : un parquet clair peut paraître foncé. Une ambiance pose sa propre teinte.',
      action: { id: 'clearFloorTint', label: 'Retirer la teinte' },
    });
  }
  const overlays = floorOverlayCount(bp);
  if (overlays > 0) {
    rules.push({
      id: 'floor-overlays',
      target: 'floor',
      tone: 'kept',
      title: `${overlays} ${plural(overlays, 'zone posée', 'zones posées')} sur le sol`,
      detail: 'Pistes de danse, tapis et zones gardent leur propre matière par-dessus le sol de la salle.',
    });
  }
  if (hasOutdoorGround(bp)) {
    rules.push({
      id: 'floor-outdoor',
      target: 'floor',
      tone: 'kept',
      title: 'Terrain des abords',
      detail: 'Le sol et les ambiances ne changent que l’intérieur de la salle. Le terrain autour se règle dans « Environnement sur mesure ».',
    });
  }
  return rules;
}

export function collectSurfaceRules(bp: RuleInput): SurfaceRule[] {
  return [...collectWallRules(bp), ...collectFloorRules(bp)];
}

/** Applique l’action proposée par une règle (bouton dans la notice). */
export function applySurfaceRuleAction<T extends RuleInput>(
  bp: T,
  action: SurfaceRuleAction,
): { blueprint: T; message: string } {
  const metadata = { ...bp.metadata };
  let message = '';
  if (action === 'showWalls') {
    metadata.showWalls = true;
    message = 'Murs affichés';
  } else if (action === 'removeFloorImage') {
    const wasPlan = metadata.floorImageFit !== 'tile';
    metadata.floorImageUrl = undefined;
    metadata.floorImageFit = undefined;
    if (metadata.floorType === 'custom') metadata.floorType = 'parquet';
    message = wasPlan ? 'Plan retiré du sol' : 'Texture de sol retirée';
  } else {
    metadata.floorColor = undefined;
    message = 'Teinte du sol retirée';
  }
  return { blueprint: { ...bp, metadata }, message };
}

