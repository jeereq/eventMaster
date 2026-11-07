import { prisma } from '../db';
import { sanitizeLayoutBlueprint } from '../utils/publicVenue';
import { computeLayoutStats } from './venueLayoutStats';
import { MAIN_LAYOUT_ID, MAIN_LAYOUT_NAME } from './venueLayoutInput';

export interface PublicLayoutSummary {
  id: string;
  name: string;
  capacityMax: number | null;
  areaM2: number | null;
  thumbnailUrl: string | null;
}

/** Disposition principale d'abord, puis les dispositions publiques dans l'ordre choisi par le propriétaire. */
export async function listPublicLayouts(roomId: string, mainBlueprint: unknown): Promise<PublicLayoutSummary[]> {
  const saved = await prisma.venueLayout.findMany({
    where: { roomId, isPublic: true },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    select: { id: true, name: true, capacityMax: true, areaM2: true, thumbnailUrl: true },
  });
  const mainStats = computeLayoutStats(mainBlueprint);
  return [
    {
      id: MAIN_LAYOUT_ID,
      name: MAIN_LAYOUT_NAME,
      capacityMax: mainStats.capacityMax || null,
      areaM2: mainStats.areaM2,
      thumbnailUrl: null,
    },
    ...saved,
  ];
}

/** Plan nettoyé d'une disposition publique, ou `null` si elle n'existe pas ou n'est pas publique. */
export async function findPublicLayoutBlueprint(
  room: { id: string; layoutBlueprint: unknown },
  layoutId: string,
): Promise<unknown | null> {
  if (layoutId === MAIN_LAYOUT_ID) return sanitizeLayoutBlueprint(room.layoutBlueprint);
  const layout = await prisma.venueLayout.findFirst({
    where: { id: layoutId, roomId: room.id, isPublic: true },
    select: { blueprint: true },
  });
  return layout ? sanitizeLayoutBlueprint(layout.blueprint) : null;
}
