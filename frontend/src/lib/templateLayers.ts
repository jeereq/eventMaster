/**
 * Ordre de superposition (calques) des éléments en placement libre.
 * Le plan effectif d’un élément est `zIndex ?? position + 1` (même règle que les rendus).
 */
export type LayerAction = 'front' | 'forward' | 'backward' | 'back';

interface Layered {
  id: string;
  zIndex?: number;
}

export function effectiveZ(el: Layered, index: number): number {
  return typeof el.zIndex === 'number' && Number.isFinite(el.zIndex) ? el.zIndex : index + 1;
}

/** Éléments triés du plus bas au plus haut plan (ordre stable). */
export function layerOrder<T extends Layered>(elements: T[]): T[] {
  return elements
    .map((el, index) => ({ el, index, z: effectiveZ(el, index) }))
    .sort((a, b) => a.z - b.z || a.index - b.index)
    .map((item) => item.el);
}

/**
 * Déplace un élément dans la pile et renumérote les plans de 1 à n,
 * sans changer l’ordre des éléments dans la liste (ni leur ordre en mode « l’un sous l’autre »).
 */
export function reorderLayer<T extends Layered>(elements: T[], id: string, action: LayerAction): T[] {
  const stack = layerOrder(elements);
  const from = stack.findIndex((el) => el.id === id);
  if (from < 0) return elements;
  let to = from;
  if (action === 'front') to = stack.length - 1;
  else if (action === 'back') to = 0;
  else if (action === 'forward') to = Math.min(stack.length - 1, from + 1);
  else if (action === 'backward') to = Math.max(0, from - 1);
  const next = stack.slice();
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  const zById = new Map(next.map((el, i) => [el.id, i + 1]));
  const changed = elements.some((el, index) => effectiveZ(el, index) !== zById.get(el.id));
  if (!changed) return elements;
  return elements.map((el) => ({ ...el, zIndex: zById.get(el.id) }));
}

/** Position (1 = tout derrière) et nombre total de plans, pour l’affichage. */
export function layerPosition(elements: Layered[], id: string): { position: number; total: number } {
  const stack = layerOrder(elements);
  return { position: stack.findIndex((el) => el.id === id) + 1, total: stack.length };
}

/** Plan à donner à un nouvel élément pour qu’il arrive au premier plan. */
export function nextTopZ(elements: Layered[]): number {
  return elements.reduce((max, el, index) => Math.max(max, effectiveZ(el, index)), 0) + 1;
}
