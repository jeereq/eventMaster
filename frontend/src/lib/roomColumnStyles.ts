/**
 * Colonnes et poteaux architecturaux : options de personnalisation
 * (fût, matière, base, chapiteau, hauteur) et styles prêts à l’emploi.
 *
 * Fichier sans dépendance pour rester testable avec `node --test`.
 */

export type ColumnShape = 'round' | 'square' | 'fluted' | 'octagonal' | 'tapered';
export type ColumnMaterial = 'stone' | 'marble' | 'travertine' | 'concrete' | 'plaster' | 'wood' | 'metal' | 'painted';
export type ColumnCapital = 'classic' | 'none' | 'tiered' | 'ornate';
export type ColumnBase = 'classic' | 'none' | 'plinth';

export const columnShapeLabels: Record<ColumnShape, string> = {
  round: 'Ronde',
  square: 'Carrée',
  fluted: 'Cannelée',
  octagonal: 'Octogonale',
  tapered: 'Galbée',
};

export const columnMaterialLabels: Record<ColumnMaterial, string> = {
  stone: 'Pierre',
  marble: 'Marbre',
  travertine: 'Travertin',
  concrete: 'Béton brut',
  plaster: 'Enduit lisse',
  wood: 'Bois',
  metal: 'Métal',
  painted: 'Peinte',
};

export const columnCapitalLabels: Record<ColumnCapital, string> = {
  classic: 'Simple',
  none: 'Aucun',
  tiered: 'Double',
  ornate: 'Orné',
};

export const columnBaseLabels: Record<ColumnBase, string> = {
  classic: 'Simple',
  none: 'Aucune',
  plinth: 'Socle',
};

/** Hauteur par défaut d’une colonne posée (m), historique de l’éditeur. */
export const DEFAULT_COLUMN_HEIGHT_M = 2.6;
export const MIN_COLUMN_HEIGHT_M = 0.8;
export const MAX_COLUMN_HEIGHT_M = 12;

export type ColumnStyleFields = {
  columnShape?: ColumnShape;
  columnMaterial?: ColumnMaterial;
  columnCapital?: ColumnCapital;
  columnBase?: ColumnBase;
  columnHeightM?: number;
  columnToCeiling?: boolean;
  columnTrimColor?: string;
  color?: string;
};

/** Matières dont la couleur est portée par la texture : la couleur choisie ne fait que la teinter. */
export function isTexturedColumnMaterial(material: ColumnMaterial | undefined): boolean {
  return material !== 'painted' && material !== 'metal';
}

/**
 * Hauteur réelle d’une colonne : plafond si « jusqu’au plafond », sinon la hauteur
 * choisie bornée, sinon la hauteur historique (2,6 m).
 */
export function resolveColumnHeightM(fields: Pick<ColumnStyleFields, 'columnHeightM' | 'columnToCeiling'>, ceilingM?: number): number {
  if (fields.columnToCeiling && typeof ceilingM === 'number' && Number.isFinite(ceilingM) && ceilingM > 0) {
    return Math.max(MIN_COLUMN_HEIGHT_M, Math.min(MAX_COLUMN_HEIGHT_M, ceilingM));
  }
  const h = fields.columnHeightM;
  if (typeof h === 'number' && Number.isFinite(h)) {
    return Math.max(MIN_COLUMN_HEIGHT_M, Math.min(MAX_COLUMN_HEIGHT_M, h));
  }
  return DEFAULT_COLUMN_HEIGHT_M;
}

/**
 * La couleur s’applique-t-elle au rendu 3D ? Les anciennes colonnes (sans matière choisie)
 * gardent leur pierre d’origine ; dès qu’une matière est choisie, la couleur teinte la colonne.
 */
export function columnColorApplies(fields: Pick<ColumnStyleFields, 'columnMaterial' | 'color'>): boolean {
  return Boolean(fields.color) && Boolean(fields.columnMaterial);
}

export type ColumnStylePreset = {
  id: string;
  label: string;
  description: string;
  fields: Required<Pick<ColumnStyleFields, 'columnShape' | 'columnMaterial' | 'columnCapital' | 'columnBase' | 'color'>>
    & Pick<ColumnStyleFields, 'columnTrimColor'>;
};

export const COLUMN_STYLE_PRESETS: ColumnStylePreset[] = [
  {
    id: 'antique-marble',
    label: 'Antique marbre',
    description: 'Fût cannelé, chapiteau orné, socle.',
    fields: { columnShape: 'fluted', columnMaterial: 'marble', columnCapital: 'ornate', columnBase: 'plinth', color: '#f5f5f4' },
  },
  {
    id: 'gala-gold',
    label: 'Gala doré',
    description: 'Marbre blanc et bagues dorées.',
    fields: { columnShape: 'round', columnMaterial: 'marble', columnCapital: 'tiered', columnBase: 'classic', color: '#fafaf9', columnTrimColor: '#c9a227' },
  },
  {
    id: 'industrial-concrete',
    label: 'Industriel',
    description: 'Poteau carré en béton, sans moulure.',
    fields: { columnShape: 'square', columnMaterial: 'concrete', columnCapital: 'none', columnBase: 'none', color: '#d6d3d1' },
  },
  {
    id: 'modern-black',
    label: 'Moderne noir',
    description: 'Fût rond en métal noir mat.',
    fields: { columnShape: 'round', columnMaterial: 'metal', columnCapital: 'none', columnBase: 'none', color: '#1c1917' },
  },
  {
    id: 'rustic-wood',
    label: 'Poutre bois',
    description: 'Poteau carré en bois, socle pierre.',
    fields: { columnShape: 'square', columnMaterial: 'wood', columnCapital: 'classic', columnBase: 'plinth', color: '#e7d3b0', columnTrimColor: '#a8a29e' },
  },
  {
    id: 'riad-plaster',
    label: 'Riad',
    description: 'Fût octogonal enduit, double moulure.',
    fields: { columnShape: 'octagonal', columnMaterial: 'plaster', columnCapital: 'tiered', columnBase: 'classic', color: '#f3e8d8' },
  },
];

/** Style actif si tous les champs du preset correspondent à la colonne. */
export function matchColumnStylePreset(fields: ColumnStyleFields): ColumnStylePreset | undefined {
  return COLUMN_STYLE_PRESETS.find((preset) => {
    const p = preset.fields;
    return (fields.columnShape ?? 'round') === p.columnShape
      && fields.columnMaterial === p.columnMaterial
      && (fields.columnCapital ?? 'classic') === p.columnCapital
      && (fields.columnBase ?? 'classic') === p.columnBase
      && (fields.color ?? '').toLowerCase() === p.color.toLowerCase()
      && (fields.columnTrimColor ?? '').toLowerCase() === (p.columnTrimColor ?? '').toLowerCase();
  });
}

/** Champs à appliquer pour un style ; efface la teinte des moulures si le style n’en a pas. */
export function columnPresetPatch(preset: ColumnStylePreset): ColumnStyleFields {
  return { ...preset.fields, columnTrimColor: preset.fields.columnTrimColor };
}
