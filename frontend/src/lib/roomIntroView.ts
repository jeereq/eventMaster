/**
 * Découverte du plan : la perspective par laquelle on arrive sur la salle en 3D
 * (à l'ouverture de l'éditeur, de l'aperçu public, du choix des places…).
 */

export type RoomIntroView = 'arc' | 'top' | 'dollhouse' | 'entrance' | 'stage' | 'vip' | 'audience' | 'none';

/** Perspectives qui se terminent sur un point de vue précis (travelling vers un préréglage caméra). */
export type RoomIntroPresetView = Extract<RoomIntroView, 'entrance' | 'stage' | 'vip' | 'audience'>;

export const ROOM_INTRO_VIEWS: { id: RoomIntroView; label: string; hint: string }[] = [
  { id: 'arc', label: 'Survol de la salle', hint: 'La caméra tourne autour de la salle puis se pose sur la vue d’ensemble.' },
  { id: 'top', label: 'Vue de dessus', hint: 'Arrivée à la verticale, comme un plan : idéal pour lire le placement.' },
  { id: 'dollhouse', label: 'Maquette 3/4', hint: 'Plongée de biais sur la salle, murs et décor bien visibles.' },
  { id: 'entrance', label: 'Depuis l’entrée', hint: 'À hauteur d’yeux, comme un invité qui passe la porte.' },
  { id: 'stage', label: 'Face à la scène', hint: 'Travelling vers la scène (ou l’estrade, le DJ) s’il y en a une.' },
  { id: 'vip', label: 'Table d’honneur', hint: 'Travelling vers la table d’honneur ou l’espace VIP.' },
  {
    id: 'audience',
    label: 'Depuis les gradins',
    hint: 'Amphithéâtre, cinéma : la caméra descend se poser en haut des gradins, face à l’écran ou à la scène.',
  },
  { id: 'none', label: 'Sans animation', hint: 'La salle s’affiche directement, sans mouvement de caméra.' },
];

const VALID = new Set<RoomIntroView>(ROOM_INTRO_VIEWS.map((v) => v.id));

/**
 * Valeur enregistrée sur le plan → perspective sûre. Sans choix, « survol » ; une salle en gradins
 * passe `'audience'` en repli pour arriver directement à la place du public.
 */
export function resolveIntroView(value: unknown, fallback: RoomIntroView = 'arc'): RoomIntroView {
  return typeof value === 'string' && VALID.has(value as RoomIntroView) ? (value as RoomIntroView) : fallback;
}

/** Perspectives proposées dans l'éditeur : « Depuis les gradins » seulement pour une salle en gradins. */
export function introViewsFor(tiered: boolean, current?: RoomIntroView): typeof ROOM_INTRO_VIEWS {
  return ROOM_INTRO_VIEWS.filter((v) => v.id !== 'audience' || tiered || current === 'audience');
}

export function introViewLabel(view: RoomIntroView): string {
  return ROOM_INTRO_VIEWS.find((v) => v.id === view)?.label ?? 'Survol de la salle';
}

export function isPresetIntroView(view: RoomIntroView): view is RoomIntroPresetView {
  return view === 'entrance' || view === 'stage' || view === 'vip' || view === 'audience';
}

/**
 * Recul de la caméra pour voir toute la salle à la verticale, quel que soit le format
 * de l'écran (paysage sur ordinateur, portrait sur téléphone).
 */
export function topDownIntroDistance(room: { widthM: number; depthM: number; fovDeg: number; aspect: number }): number {
  const halfTan = Math.tan((room.fovDeg * Math.PI) / 360);
  const aspect = room.aspect > 0 ? room.aspect : 1.6;
  const margin = 1.1;
  return Math.max(
    (room.depthM / 2) * margin / halfTan,
    (room.widthM / 2) * margin / (halfTan * aspect),
    6,
  );
}
