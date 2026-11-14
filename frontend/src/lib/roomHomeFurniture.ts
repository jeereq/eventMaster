/**
 * Mobilier résidentiel (appartement témoin, suite, loge, chambre d’hôtel…) :
 * un seul type d’élément `homeFurniture`, décliné en styles. Dimensions
 * réelles en mètres ; la face « usage » regarde +Z (vers le bas du plan).
 *
 * Module pur, sans dépendance, pour pouvoir être testé avec `node --test`.
 */

export type HomeFurnitureStyle =
  | 'bed'
  | 'wardrobe'
  | 'tvUnit'
  | 'kitchenIsland'
  | 'kitchenRun'
  | 'bathtub'
  | 'vanity'
  | 'armchair'
  | 'coffeeTable'
  | 'nightstand'
  | 'desk'
  | 'rug';

export type HomeFurnitureGroup = 'bedroom' | 'living' | 'kitchen' | 'bathroom';

export interface HomeFurnitureMeta {
  label: string;
  hint: string;
  group: HomeFurnitureGroup;
  widthM: number;
  depthM: number;
  heightM: number;
  /** Teinte dominante (bois clair par défaut, comme une maquette d’architecte). */
  color: string;
}

export const HOME_FURNITURE_META: Record<HomeFurnitureStyle, HomeFurnitureMeta> = {
  bed: { label: 'Lit double', hint: 'Lit 160 × 200 avec tête de lit capitonnée et linge.', group: 'bedroom', widthM: 1.8, depthM: 2.15, heightM: 1.05, color: '#d8b98c' },
  nightstand: { label: 'Chevet', hint: 'Petit chevet bois avec lampe.', group: 'bedroom', widthM: 0.5, depthM: 0.42, heightM: 0.75, color: '#c9a273' },
  wardrobe: { label: 'Dressing ouvert', hint: 'Penderie bois avec vêtements suspendus et étagères.', group: 'bedroom', widthM: 2.4, depthM: 0.62, heightM: 2.3, color: '#c9a273' },
  desk: { label: 'Bureau', hint: 'Plateau bois, chaise et lampe.', group: 'bedroom', widthM: 1.4, depthM: 0.7, heightM: 0.76, color: '#c9a273' },
  tvUnit: { label: 'Mur TV', hint: 'Meuble bas bois et écran plat mural.', group: 'living', widthM: 2.6, depthM: 0.45, heightM: 1.6, color: '#c9a273' },
  armchair: { label: 'Fauteuil', hint: 'Fauteuil enveloppant en bouclette.', group: 'living', widthM: 0.85, depthM: 0.85, heightM: 0.8, color: '#e8dcc6' },
  coffeeTable: { label: 'Table basse', hint: 'Table basse ronde en bois.', group: 'living', widthM: 1, depthM: 1, heightM: 0.4, color: '#c9a273' },
  rug: { label: 'Tapis', hint: 'Grand tapis tissé sous le salon.', group: 'living', widthM: 2.8, depthM: 2, heightM: 0.02, color: '#e9e0cf' },
  kitchenIsland: { label: 'Îlot de cuisine', hint: 'Îlot plan de travail pierre avec tabourets.', group: 'kitchen', widthM: 2.4, depthM: 1, heightM: 0.92, color: '#d8b98c' },
  kitchenRun: { label: 'Cuisine linéaire', hint: 'Meubles bas et hauts, évier, plaque et four.', group: 'kitchen', widthM: 3.6, depthM: 0.65, heightM: 2.2, color: '#d8b98c' },
  bathtub: { label: 'Baignoire', hint: 'Baignoire îlot ovale.', group: 'bathroom', widthM: 1.7, depthM: 0.8, heightM: 0.6, color: '#f4f1ea' },
  vanity: { label: 'Meuble vasque', hint: 'Plan vasque bois et miroir.', group: 'bathroom', widthM: 1.2, depthM: 0.5, heightM: 1.8, color: '#c9a273' },
};

export const HOME_FURNITURE_ORDER: HomeFurnitureStyle[] = [
  'bed', 'nightstand', 'wardrobe', 'desk',
  'tvUnit', 'armchair', 'coffeeTable', 'rug',
  'kitchenIsland', 'kitchenRun',
  'bathtub', 'vanity',
];

export const HOME_FURNITURE_GROUP_LABELS: Record<HomeFurnitureGroup, string> = {
  bedroom: 'Chambre',
  living: 'Séjour',
  kitchen: 'Cuisine',
  bathroom: 'Salle de bain',
};

export function isHomeFurnitureStyle(value: unknown): value is HomeFurnitureStyle {
  return typeof value === 'string' && value in HOME_FURNITURE_META;
}

/** Empreinte en % du plan pour un style donné (dimensions réelles). */
export function homeFurnitureFootprintPct(style: HomeFurnitureStyle, widthM: number, depthM: number) {
  const meta = HOME_FURNITURE_META[style];
  const clampPct = (v: number) => Math.max(1, Math.min(90, v));
  return {
    w: clampPct((meta.widthM / Math.max(1, widthM)) * 100),
    h: clampPct((meta.depthM / Math.max(1, depthM)) * 100),
  };
}
