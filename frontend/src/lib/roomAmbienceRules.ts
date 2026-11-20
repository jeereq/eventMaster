/**
 * Règles d’application des ambiances : ce qui, dans la salle actuelle, empêche une
 * partie de l’ambiance (murs, sol, éclairage, mobilier) d’être visible.
 *
 * Affichées dans le panneau « Ambiances complètes » et dans l’aperçu avant application,
 * pour que l’utilisateur comprenne pourquoi un élément « ne s’applique pas ».
 */
import {
  isBlueprintWallsVisible,
  isTentVenue,
  resolveBlueprintWalls,
  type AmbienceApplyScope,
  type RoomLayoutBlueprint,
} from './roomLayoutUtils.ts';

export type AmbienceRuleScope = keyof AmbienceApplyScope;

export type AmbienceRule = {
  id: string;
  scope: AmbienceRuleScope;
  /** `blocked` : la partie ne se verra pas ; `info` : elle s’applique avec une limite. */
  level: 'blocked' | 'info';
  text: string;
  /** Réglage à changer pour lever la limite, quand il existe. */
  fix?: string;
};

const SURFACE_FIXTURES = new Set(['carpet', 'aisle', 'corridor', 'decal']);
const SEATING = new Set(['table', 'row', 'chair']);

function plural(n: number, one: string, many: string): string {
  return `${n} ${n > 1 ? many : one}`;
}

/**
 * Règles qui concernent la salle telle qu’elle est, pour les parties cochées de l’ambiance.
 * Sans `scope`, toutes les parties sont considérées.
 */
export function describeAmbienceRules(
  blueprint: RoomLayoutBlueprint,
  scope: Partial<AmbienceApplyScope> = { walls: true, floor: true, theme: true, furniture: true, lighting: true },
): AmbienceRule[] {
  const rules: AmbienceRule[] = [];
  const meta = blueprint.metadata ?? ({} as RoomLayoutBlueprint['metadata']);
  const fixtures = blueprint.fixtures ?? [];

  if (scope.walls) {
    if (!isBlueprintWallsVisible(meta)) {
      rules.push({
        id: 'walls-hidden',
        scope: 'walls',
        level: 'blocked',
        text: 'Murs masqués (espace ouvert) : la matière et la peinture des murs sont enregistrées mais restent invisibles.',
        fix: 'Cochez « Afficher les murs » pour les voir.',
      });
    } else if (isTentVenue(blueprint)) {
      rules.push({
        id: 'walls-tent',
        scope: 'walls',
        level: 'blocked',
        text: 'Tente : les parois restent en toile, la matière et la peinture murales ne s’y appliquent pas.',
      });
    } else {
      const walls = resolveBlueprintWalls(blueprint);
      const artCount = walls.reduce((n, w) => n + (w.art?.length ?? 0), 0);
      if (artCount > 0) {
        rules.push({
          id: 'walls-art',
          scope: 'walls',
          level: 'info',
          text: `${plural(artCount, 'image ou graffiti posé', 'images ou graffitis posés')} sur les murs ${artCount > 1 ? 'restent' : 'reste'} par-dessus la nouvelle matière.`,
        });
      }
      const textures = new Set(walls.map((w) => `${w.texture}|${w.color ?? ''}`));
      if (textures.size > 1) {
        rules.push({
          id: 'walls-mixed',
          scope: 'walls',
          level: 'info',
          text: 'Les matières choisies mur par mur seront remplacées : l’ambiance habille tous les murs de la même façon.',
        });
      }
    }
  }

  if (scope.floor) {
    if (meta.floorImageUrl) {
      rules.push({
        id: 'floor-image',
        scope: 'floor',
        level: 'info',
        text: meta.floorImageFit === 'cover'
          ? 'Le plan importé affiché au sol sera retiré au profit du sol de l’ambiance.'
          : 'La photo de sol importée sera remplacée par le sol de l’ambiance.',
        fix: 'Décochez « Sol » dans l’aperçu pour la garder.',
      });
    }
    const covering = fixtures.filter((f) => SURFACE_FIXTURES.has(f.kind)).length;
    const lawns = fixtures.filter((f) => f.kind === 'landscape').length;
    if (covering > 0) {
      rules.push({
        id: 'floor-covered',
        scope: 'floor',
        level: 'info',
        text: `${plural(covering, 'tapis, allée ou motif', 'tapis, allées ou motifs')} au sol ${covering > 1 ? 'restent visibles' : 'reste visible'} par-dessus le nouveau sol.`,
      });
    }
    if (meta.outdoorSurroundings && meta.outdoorSurroundings !== 'none') {
      rules.push({
        id: 'floor-outdoor',
        scope: 'floor',
        level: 'info',
        text: 'Plein air : l’ambiance change le sol du plan, pas le terrain autour (jardin, plage…).',
      });
    } else if (lawns > 0) {
      rules.push({
        id: 'floor-landscape',
        scope: 'floor',
        level: 'info',
        text: `${plural(lawns, 'élément de paysage', 'éléments de paysage')} (pelouse, massif, piscine…) ${lawns > 1 ? 'gardent' : 'garde'} leur propre surface.`,
      });
    }
  }

  if (scope.lighting) {
    const placed = fixtures.filter((f) => f.kind === 'chandelier').length;
    if (placed > 0) {
      rules.push({
        id: 'lighting-placed-chandeliers',
        scope: 'lighting',
        level: 'blocked',
        text: `${plural(placed, 'lustre posé', 'lustres posés')} à la main : les lustres automatiques de l’ambiance ne s’affichent pas.`,
        fix: 'Supprimez les lustres posés pour voir ceux de l’ambiance.',
      });
    }
  }

  if (scope.furniture) {
    const seating = (blueprint.furniture ?? []).filter((f) => SEATING.has(f.kind)).length;
    if (seating === 0) {
      rules.push({
        id: 'furniture-empty',
        scope: 'furniture',
        level: 'info',
        text: 'Aucune table ni chaise : seules la couleur et la surface des prochaines tables changeront.',
      });
    }
  }

  return rules;
}
