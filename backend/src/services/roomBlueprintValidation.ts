/**
 * Validation côté serveur d'un plan de salle envoyé par l'éditeur, avant
 * enregistrement. On vérifie la structure minimale et des bornes de taille :
 * le contenu (thèmes, matériaux…) reste libre, mais un plan illisible ou
 * démesuré ne doit jamais être écrit en base.
 */
import { isBlueprintShape, isBlueprintTooLarge } from './venueLayoutInput.ts';

/** Bornes larges : bien au-delà des plus grandes salles réelles. */
export const MAX_CANVAS_SIDE_M = 1000;
export const MAX_FURNITURE_ITEMS = 5000;
export const MAX_FIXTURE_ITEMS = 2000;
export const MAX_WALL_ITEMS = 2000;
export const MAX_SEATS_PER_ITEM = 1000;

const FURNITURE_KINDS = new Set(['table', 'row', 'chair', 'zone']);

export type RoomBlueprintValidation =
  | { ok: true }
  | { ok: false; status: 400 | 413; error: string; detail?: string };

const isObject = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v);
const isFiniteNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const optionalFinite = (v: unknown) => v === undefined || v === null || isFiniteNumber(v);

const invalid = (detail: string): RoomBlueprintValidation => ({
  ok: false,
  status: 400,
  error: 'Plan de salle invalide.',
  detail,
});

function checkFurniture(items: unknown[]): string | null {
  if (items.length > MAX_FURNITURE_ITEMS) return `Trop d'éléments de mobilier (max ${MAX_FURNITURE_ITEMS}).`;
  const ids = new Set<string>();
  for (let i = 0; i < items.length; i += 1) {
    const item = items[i];
    if (!isObject(item)) return `Mobilier n°${i + 1} : élément illisible.`;
    if (typeof item.id !== 'string' || !item.id) return `Mobilier n°${i + 1} : identifiant manquant.`;
    if (ids.has(item.id)) return `Mobilier « ${item.id} » en double.`;
    ids.add(item.id);
    if (typeof item.kind !== 'string' || !FURNITURE_KINDS.has(item.kind)) {
      return `Mobilier « ${item.id} » : type inconnu.`;
    }
    if (!isFiniteNumber(item.x) || !isFiniteNumber(item.y)) return `Mobilier « ${item.id} » : position invalide.`;
    if (!optionalFinite(item.rotation)) return `Mobilier « ${item.id} » : rotation invalide.`;
    if (item.kind === 'table') {
      const c = item.capacity;
      if (!isFiniteNumber(c) || c < 0 || c > MAX_SEATS_PER_ITEM) return `Table « ${item.id} » : capacité invalide.`;
    }
    if (item.kind === 'row') {
      const c = item.seatCount;
      if (!isFiniteNumber(c) || c < 0 || c > MAX_SEATS_PER_ITEM) return `Rangée « ${item.id} » : nombre de sièges invalide.`;
    }
    if (item.kind === 'zone') {
      if (!isFiniteNumber(item.w) || !isFiniteNumber(item.h) || item.w < 0 || item.h < 0) {
        return `Zone « ${item.id} » : dimensions invalides.`;
      }
    }
  }
  return null;
}

function checkFixtures(items: unknown[]): string | null {
  if (items.length > MAX_FIXTURE_ITEMS) return `Trop d'éléments de décor (max ${MAX_FIXTURE_ITEMS}).`;
  for (let i = 0; i < items.length; i += 1) {
    const f = items[i];
    if (!isObject(f)) return `Décor n°${i + 1} : élément illisible.`;
    if (typeof f.kind !== 'string' || !f.kind) return `Décor n°${i + 1} : type manquant.`;
    for (const key of ['x', 'y', 'w', 'h'] as const) {
      if (!isFiniteNumber(f[key])) return `Décor n°${i + 1} : ${key} invalide.`;
    }
  }
  return null;
}

function checkWalls(items: unknown[]): string | null {
  if (items.length > MAX_WALL_ITEMS) return `Trop de murs (max ${MAX_WALL_ITEMS}).`;
  for (let i = 0; i < items.length; i += 1) {
    const w = items[i];
    if (!isObject(w) || !isObject(w.start) || !isObject(w.end)) return `Mur n°${i + 1} : extrémités manquantes.`;
    if (![w.start.x, w.start.y, w.end.x, w.end.y].every(isFiniteNumber)) return `Mur n°${i + 1} : coordonnées invalides.`;
    if (w.openings !== undefined && !Array.isArray(w.openings)) return `Mur n°${i + 1} : ouvertures illisibles.`;
  }
  return null;
}

/** Contrôle un plan reçu du client. `null` / `undefined` sont acceptés (pas de plan). */
export function validateRoomBlueprint(value: unknown): RoomBlueprintValidation {
  if (value === null || value === undefined) return { ok: true };
  if (isBlueprintTooLarge(value)) {
    return { ok: false, status: 413, error: 'Le plan est trop volumineux pour être enregistré.' };
  }
  if (!isBlueprintShape(value)) return invalid('Dimensions de la salle ou liste du mobilier manquantes.');
  const canvas = value.canvas as { widthM: number; heightM: number };
  if (canvas.widthM > MAX_CANVAS_SIDE_M || canvas.heightM > MAX_CANVAS_SIDE_M) {
    return invalid(`La salle dépasse ${MAX_CANVAS_SIDE_M} m de côté.`);
  }
  const furnitureError = checkFurniture(value.furniture as unknown[]);
  if (furnitureError) return invalid(furnitureError);
  if (value.fixtures !== undefined) {
    if (!Array.isArray(value.fixtures)) return invalid('Liste du décor illisible.');
    const fixtureError = checkFixtures(value.fixtures);
    if (fixtureError) return invalid(fixtureError);
  }
  if (value.walls !== undefined && value.walls !== null) {
    if (!Array.isArray(value.walls)) return invalid('Liste des murs illisible.');
    const wallError = checkWalls(value.walls);
    if (wallError) return invalid(wallError);
  }
  if (value.metadata !== undefined && !isObject(value.metadata)) return invalid('Métadonnées illisibles.');
  return { ok: true };
}

/**
 * Date de dernière modification attendue par le client (contrôle de version
 * optimiste). Renvoie `undefined` quand le client n'en envoie pas, `null` si
 * la valeur est illisible.
 */
export function parseExpectedUpdatedAt(raw: unknown): Date | null | undefined {
  if (raw === undefined || raw === null || raw === '') return undefined;
  if (typeof raw !== 'string' && typeof raw !== 'number') return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}
