/**
 * Catégories du sélecteur de modèles de l’éditeur de salle.
 * Un modèle peut appartenir à plusieurs catégories (ex. cocktail : banquets et
 * restaurants). Les règles se basent sur l’identifiant du modèle.
 *
 * Module pur, testé avec `node --test`.
 */

export type TemplateCategory = 'all' | 'banquet' | 'restaurant' | 'conference' | 'empty' | 'residence';

export const TEMPLATE_CATEGORIES: { id: TemplateCategory; label: string }[] = [
  { id: 'all', label: 'Tous' },
  { id: 'banquet', label: 'Banquets & Fêtes' },
  { id: 'restaurant', label: 'Restaurants & Cafés' },
  { id: 'conference', label: 'Conférences' },
  { id: 'residence', label: 'Résidences' },
  { id: 'empty', label: 'Salles & Formes' },
];

const RESTAURANT_KEYS = [
  'restaurant', 'cafe', 'bistrot', 'salon', 'cocktail', 'communal', 'fast-casual',
  'pizzeria', 'container', 'lounge', 'patio', 'coffee', 'loft',
];
const CONFERENCE_KEYS = ['conference', 'amphi', 'board', 'class', 'theater', 'chair'];
const EMPTY_KEYS = ['empty', 'tent'];
const RESIDENCE_KEYS = ['appartement', 'residen', 'maison', 'villa'];
/** Ce qui exclut un modèle des banquets (cocktail et communal y restent). */
const NOT_BANQUET_KEYS = [
  ...RESTAURANT_KEYS.filter((k) => k !== 'cocktail' && k !== 'communal'),
  'conference', 'amphi', 'board', 'class', 'theater',
  ...EMPTY_KEYS,
  ...RESIDENCE_KEYS,
];

const hasAny = (id: string, keys: readonly string[]) => keys.some((k) => id.includes(k));

export function templateMatchesCategory(templateId: string, category: TemplateCategory): boolean {
  const id = templateId.toLowerCase();
  switch (category) {
    case 'all':
      return true;
    case 'restaurant':
      return hasAny(id, RESTAURANT_KEYS);
    case 'conference':
      return hasAny(id, CONFERENCE_KEYS);
    case 'empty':
      return hasAny(id, EMPTY_KEYS);
    case 'residence':
      return hasAny(id, RESIDENCE_KEYS);
    case 'banquet':
      return !hasAny(id, NOT_BANQUET_KEYS);
  }
}
