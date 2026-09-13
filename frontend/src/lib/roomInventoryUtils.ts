import type {
  ChairStyle,
  ChairType,
  RoomFixtureKind,
  RoomLayoutBlueprint,
  SeatMaterial,
  TableShape,
} from '@/lib/roomLayoutUtils';
import {
  chairStyleLabels,
  chairTypeLabels,
  seatMaterialLabels,
  tableShapeLabels,
} from '@/lib/roomLayoutUtils';

export interface InventoryItem {
  id: string;
  category: 'Mobilier & Tables' | 'Assises & Chaises' | 'Scène & Audiovisuel' | 'Décoration & Luminaires' | 'Zones & Allées';
  name: string;
  count: number;
  specs?: string;
  notes?: string;
}

export interface RoomInventoryReport {
  totalCapacity: number;
  tableSeats: number;
  rowSeats: number;
  individualSeats: number;
  totalAreaM2: number;
  ratioM2PerSeat: number;
  items: InventoryItem[];
  itemsByCategory: Record<string, InventoryItem[]>;
  textSummary: string;
  csvContent: string;
}

const FIXTURE_LABELS: Partial<Record<RoomFixtureKind, string>> = {
  stage: 'Scène principale',
  podium: 'Podium / Pupitre orateur',
  aisle: 'Allée centrale d’honneur',
  corridor: 'Couloir de passage',
  entrance: 'Sas d’accueil & Entrée',
  door: 'Porte d’accès',
  chandelier: 'Lustre suspendu',
  pillar: 'Pilier architectural',
  column: 'Colonne décorative',
  flower: 'Composition florale sur pied',
  carpet: 'Tapis de réception',
  buffet: 'Buffet traiteur garni',
  stairs: 'Escalier monumental',
  balcony: 'Balcon / Mezzanine',
  arch: 'Arche florale monumentale',
  partition: 'Cloison mobile acoustique',
  decal: 'Marquage au sol décoratif',
  pedestal: 'Piédestal d’exposition',
  stringLight: 'Guirlande lumineuse guinguette',
  fountain: 'Fontaine décorative',
  gazebo: 'Kiosque / Tonnelle',
  djBooth: 'Régie DJ & Sonorisation',
  screen: 'Écran géant de projection',
  instrument: 'Instrument de concert scénique',
  bar: 'Comptoir de bar événementiel',
  orderCounter: 'Comptoir de commande traiteur',
  pickupCounter: 'Comptoir de retrait des plats',
  pizzaOven: 'Four à pizza événementiel',
  kitchenLine: 'Ligne chaude traiteur',
  displayCase: 'Vitrine réfrigérée d’exposition',
  stylingStation: 'Coiffeuse / Poste maquillage',
  washBasin: 'Point d’eau / Lavabo autonome',
  condimentStation: 'Buffet assaisonnements',
  loungeSofa: 'Canapé lounge grand confort',
  car: 'Véhicule d’honneur / Exposition',
  parasol: 'Grand parasol de terrasse',
};

export function computeRoomInventory(blueprint: RoomLayoutBlueprint): RoomInventoryReport {
  const widthM = blueprint.canvas?.widthM ?? 20;
  const heightM = blueprint.canvas?.heightM ?? 16;
  const totalAreaM2 = Math.round(widthM * heightM * 10) / 10;

  let tableSeats = 0;
  let rowSeats = 0;
  let individualSeats = 0;

  // 1. Tables
  const tableCounts = new Map<string, { count: number; name: string; specs: string; coveredCount: number; centerpieceCount: number }>();
  for (const item of blueprint.furniture) {
    if (item.kind === 'table') {
      tableSeats += item.capacity;
      const shapeLabel = tableShapeLabels[item.shape as TableShape] || item.shape;
      const key = `${item.shape}_${item.capacity}`;
      const existing = tableCounts.get(key) ?? {
        count: 0,
        name: `Table ${shapeLabel} (${item.capacity} places)`,
        specs: `Capacité : ${item.capacity} pers. · Finition : ${item.tableSurface || 'standard'}`,
        coveredCount: 0,
        centerpieceCount: 0,
      };
      existing.count += 1;
      if (item.hasCouverts) existing.coveredCount += 1;
      if (item.hasCenterpiece) existing.centerpieceCount += 1;
      tableCounts.set(key, existing);
    } else if (item.kind === 'row') {
      rowSeats += item.seatCount;
    } else if (item.kind === 'chair') {
      individualSeats += 1;
    }
  }

  // 2. Chaises (comptage complet : autour des tables + rangées + isolées)
  const chairCounts = new Map<string, { count: number; name: string; specs: string }>();
  for (const item of blueprint.furniture) {
    if (item.kind === 'table') {
      const typeLabel = chairTypeLabels[item.chairType as ChairType] || item.chairType || 'Standard';
      const styleLabel = item.chairStyle ? (chairStyleLabels[item.chairStyle as ChairStyle] || item.chairStyle) : '';
      const fabricLabel = item.seatMaterial ? (seatMaterialLabels[item.seatMaterial as SeatMaterial] || item.seatMaterial) : '';
      const key = `${item.chairType}_${item.chairStyle || ''}_${item.seatMaterial || ''}`;
      const fullLabel = [typeLabel, styleLabel].filter(Boolean).join(' ');
      const specs = [fabricLabel ? `Tissu/Matière : ${fabricLabel}` : null, `Disposition : banquet/table`].filter(Boolean).join(' · ');

      const existing = chairCounts.get(key) ?? {
        count: 0,
        name: `Chaise ${fullLabel}`,
        specs,
      };
      existing.count += item.capacity;
      chairCounts.set(key, existing);
    } else if (item.kind === 'row') {
      const typeLabel = chairTypeLabels[item.chairType as ChairType] || item.chairType || 'THEATER';
      const key = `row_${item.chairType}`;
      const existing = chairCounts.get(key) ?? {
        count: 0,
        name: `Siège de rangée (${typeLabel})`,
        specs: `Disposition : rangée amphithéâtre / conférence`,
      };
      existing.count += item.seatCount;
      chairCounts.set(key, existing);
    } else if (item.kind === 'chair') {
      const typeLabel = chairTypeLabels[item.chairType as ChairType] || item.chairType || 'Standard';
      const styleLabel = item.chairStyle ? (chairStyleLabels[item.chairStyle as ChairStyle] || item.chairStyle) : '';
      const fabricLabel = item.seatMaterial ? (seatMaterialLabels[item.seatMaterial as SeatMaterial] || item.seatMaterial) : '';
      const key = `ind_${item.chairType}_${item.chairStyle || ''}_${item.seatMaterial || ''}`;
      const fullLabel = [typeLabel, styleLabel].filter(Boolean).join(' ');
      const specs = [fabricLabel ? `Tissu : ${fabricLabel}` : null, 'Siège individuel autonome'].filter(Boolean).join(' · ');

      const existing = chairCounts.get(key) ?? {
        count: 0,
        name: `Chaise individuelle ${fullLabel}`,
        specs,
      };
      existing.count += 1;
      chairCounts.set(key, existing);
    }
  }

  // 3. Fixtures (Scénographie, technique, décorations)
  const fixtureCounts = new Map<string, { count: number; name: string; category: InventoryItem['category']; specs: string; notes?: string }>();
  for (const f of blueprint.fixtures) {
    const rawKind = f.kind as RoomFixtureKind;
    const baseName = FIXTURE_LABELS[rawKind] || f.label || rawKind;
    const isStage = rawKind === 'stage' || rawKind === 'podium' || rawKind === 'screen' || rawKind === 'djBooth' || rawKind === 'instrument';
    const isAisleOrZone = rawKind === 'aisle' || rawKind === 'corridor' || rawKind === 'carpet';
    const category: InventoryItem['category'] = isStage
      ? 'Scène & Audiovisuel'
      : isAisleOrZone
        ? 'Zones & Allées'
        : 'Décoration & Luminaires';

    const widthMtr = Math.round(((f.w * widthM) / 100) * 10) / 10;
    const depthMtr = Math.round(((f.h * heightM) / 100) * 10) / 10;
    const areaM2 = Math.round(widthMtr * depthMtr * 10) / 10;

    let specs = `${widthMtr}m × ${depthMtr}m (${areaM2} m²)`;
    if (f.heightM && f.heightM > 0) {
      specs += ` · Hauteur : ${f.heightM}m`;
    }

    const key = `${rawKind}_${f.label || ''}`;
    const existing = fixtureCounts.get(key) ?? {
      count: 0,
      name: f.label || baseName,
      category,
      specs,
      notes: undefined,
    };
    existing.count += 1;
    fixtureCounts.set(key, existing);
  }

  // 4. Zones au sol
  const zoneCounts = new Map<string, { count: number; name: string; specs: string }>();
  for (const item of blueprint.furniture) {
    if (item.kind === 'zone') {
      const zWidth = Math.round(((item.w * widthM) / 100) * 10) / 10;
      const zHeight = Math.round(((item.h * heightM) / 100) * 10) / 10;
      const zArea = Math.round(zWidth * zHeight * 10) / 10;
      const zoneName = item.label || `Zone ${item.zoneKind || 'dédiée'}`;
      const specs = `${zWidth}m × ${zHeight}m (${zArea} m²) · Matière : ${item.material || 'standard'}`;
      const key = `${item.zoneKind}_${item.material || ''}`;
      const existing = zoneCounts.get(key) ?? {
        count: 0,
        name: zoneName,
        specs,
      };
      existing.count += 1;
      zoneCounts.set(key, existing);
    }
  }

  // Compiler les éléments d'inventaire
  const items: InventoryItem[] = [];

  tableCounts.forEach((val, key) => {
    const notesParts: string[] = [];
    if (val.coveredCount > 0) notesParts.push(`${val.coveredCount} avec couverts complets`);
    if (val.centerpieceCount > 0) notesParts.push(`${val.centerpieceCount} avec centre de table`);
    items.push({
      id: `table_${key}`,
      category: 'Mobilier & Tables',
      name: val.name,
      count: val.count,
      specs: val.specs,
      notes: notesParts.join(' · ') || undefined,
    });
  });

  chairCounts.forEach((val, key) => {
    items.push({
      id: `chair_${key}`,
      category: 'Assises & Chaises',
      name: val.name,
      count: val.count,
      specs: val.specs,
    });
  });

  fixtureCounts.forEach((val, key) => {
    items.push({
      id: `fixture_${key}`,
      category: val.category,
      name: val.name,
      count: val.count,
      specs: val.specs,
      notes: val.notes,
    });
  });

  zoneCounts.forEach((val, key) => {
    items.push({
      id: `zone_${key}`,
      category: 'Zones & Allées',
      name: val.name,
      count: val.count,
      specs: val.specs,
    });
  });

  const totalCapacity = tableSeats + rowSeats + individualSeats;
  const ratioM2PerSeat = totalCapacity > 0 ? Math.round((totalAreaM2 / totalCapacity) * 100) / 100 : 0;

  const itemsByCategory: Record<string, InventoryItem[]> = {};
  for (const item of items) {
    if (!itemsByCategory[item.category]) {
      itemsByCategory[item.category] = [];
    }
    itemsByCategory[item.category].push(item);
  }

  // Fiche récapitulative texte clair (pour email ou traiteur)
  const lines: string[] = [
    `=== RÉCAPITULATIF DE SALLE & NOMENCLATURE DU MATÉRIEL ===`,
    `Dimensions de la salle : ${widthM}m × ${heightM}m (${totalAreaM2} m²)`,
    `Capacité totale assise : ${totalCapacity} personnes`,
    `Ratio de surface : ${ratioM2PerSeat > 0 ? `${ratioM2PerSeat} m² / invité` : 'Non applicable'}`,
    ``,
  ];

  for (const [category, catItems] of Object.entries(itemsByCategory)) {
    lines.push(`--- ${category.toUpperCase()} ---`);
    for (const item of catItems) {
      lines.push(`• ${item.count}x ${item.name}${item.specs ? ` [${item.specs}]` : ''}${item.notes ? ` (${item.notes})` : ''}`);
    }
    lines.push(``);
  }

  lines.push(`Généré avec EventMaster - Studio Scénographique`);
  const textSummary = lines.join('\n');

  // Génération du contenu CSV
  const csvRows: string[][] = [
    ['Catégorie', 'Désignation', 'Quantité', 'Dimensions & Spécifications', 'Notes & Détails'],
  ];

  for (const item of items) {
    csvRows.push([
      `"${item.category}"`,
      `"${item.name}"`,
      String(item.count),
      `"${item.specs || ''}"`,
      `"${item.notes || ''}"`,
    ]);
  }

  const csvContent = csvRows.map((row) => row.join(';')).join('\r\n');

  return {
    totalCapacity,
    tableSeats,
    rowSeats,
    individualSeats,
    totalAreaM2,
    ratioM2PerSeat,
    items,
    itemsByCategory,
    textSummary,
    csvContent,
  };
}
