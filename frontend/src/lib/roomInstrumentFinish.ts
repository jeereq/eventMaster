/**
 * Finitions proposées pour les instruments : la teinte s’applique au corps
 * (laque d’un piano, fûts d’une batterie, bois d’un violon, cuivre d’un saxophone).
 *
 * Module pur, testé avec `node --test`.
 */

import type { InstrumentStyle } from './roomLayoutUtils.ts';

export interface InstrumentFinishPreset {
  id: string;
  label: string;
  color: string;
}

const KEYS: InstrumentFinishPreset[] = [
  { id: 'black', label: 'Noir laqué', color: '#0b0b0c' },
  { id: 'white', label: 'Blanc laqué', color: '#f4f2ec' },
  { id: 'mahogany', label: 'Acajou', color: '#5a2a1c' },
  { id: 'walnut', label: 'Noyer', color: '#6b4a32' },
  { id: 'red', label: 'Rouge', color: '#8b1e1e' },
];
const DRUMS: InstrumentFinishPreset[] = [
  { id: 'red', label: 'Rouge', color: '#7f1d1d' },
  { id: 'black', label: 'Noir', color: '#111111' },
  { id: 'pearl', label: 'Blanc perle', color: '#ece8df' },
  { id: 'blue', label: 'Bleu nuit', color: '#1e3a8a' },
  { id: 'green', label: 'Vert sapin', color: '#14532d' },
  { id: 'natural', label: 'Bois naturel', color: '#b07a45' },
];
const WOOD: InstrumentFinishPreset[] = [
  { id: 'natural', label: 'Bois naturel', color: '#c89b5b' },
  { id: 'sunburst', label: 'Ambré foncé', color: '#8a4b22' },
  { id: 'mahogany', label: 'Acajou', color: '#5a2a1c' },
  { id: 'black', label: 'Noir', color: '#111111' },
  { id: 'white', label: 'Blanc', color: '#f4f2ec' },
  { id: 'red', label: 'Rouge', color: '#8b1e1e' },
];
const BRASS: InstrumentFinishPreset[] = [
  { id: 'brass', label: 'Laiton', color: '#c9a227' },
  { id: 'silver', label: 'Argenté', color: '#d4d4d8' },
  { id: 'copper', label: 'Cuivre', color: '#b87333' },
  { id: 'black', label: 'Noir', color: '#1f1f1f' },
];
const GEAR: InstrumentFinishPreset[] = [
  { id: 'black', label: 'Noir', color: '#18181b' },
  { id: 'white', label: 'Blanc', color: '#f4f2ec' },
  { id: 'grey', label: 'Gris', color: '#52525b' },
];

/** Finitions adaptées au type d’instrument (aucune pour le pied de micro). */
export function instrumentFinishPresets(style: InstrumentStyle): InstrumentFinishPreset[] {
  switch (style) {
    case 'piano':
    case 'upright':
    case 'keyboard':
      return KEYS;
    case 'drums':
      return DRUMS;
    case 'guitar':
    case 'bass':
    case 'violin':
    case 'cello':
    case 'doubleBass':
    case 'harp':
    case 'conga':
    case 'cajon':
      return WOOD;
    case 'sax':
    case 'trumpet':
      return BRASS;
    case 'micStand':
      return [];
    default:
      return GEAR;
  }
}
