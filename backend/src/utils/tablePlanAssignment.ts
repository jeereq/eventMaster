export type GuestAssignment = {
  tableId: string;
  tableName: string;
  seatIndex: number;
};

type TablePlanShape = {
  tables?: Array<{
    id: string;
    name?: string;
    seats?: Record<string, string | null>;
  }>;
};

function parseTablePlan(tablePlan: unknown): TablePlanShape | null {
  if (!tablePlan || typeof tablePlan !== 'object') return null;
  return tablePlan as TablePlanShape;
}

/** Extrait les assignations invité → table/siège depuis un plan de table. */
export function extractGuestAssignments(tablePlan: unknown): Map<string, GuestAssignment> {
  const plan = parseTablePlan(tablePlan);
  const map = new Map<string, GuestAssignment>();
  if (!plan?.tables) return map;

  for (const table of plan.tables) {
    const seats = table.seats || {};
    for (const [seatKey, guestId] of Object.entries(seats)) {
      if (!guestId) continue;
      map.set(guestId, {
        tableId: table.id,
        tableName: table.name || `Table ${table.id.slice(0, 6)}`,
        seatIndex: parseInt(seatKey, 10),
      });
    }
  }
  return map;
}

/** Invités nouvellement assignés ou déplacés (table ou siège modifié). */
export function findAssignmentChanges(oldPlan: unknown, newPlan: unknown): string[] {
  const oldMap = extractGuestAssignments(oldPlan);
  const newMap = extractGuestAssignments(newPlan);
  const toNotify: string[] = [];

  for (const [guestId, newAssign] of newMap) {
    const oldAssign = oldMap.get(guestId);
    if (
      !oldAssign
      || oldAssign.tableId !== newAssign.tableId
      || oldAssign.seatIndex !== newAssign.seatIndex
    ) {
      toNotify.push(guestId);
    }
  }

  return toNotify;
}

/** IDs des autres invités à la même table. */
export function getTableMateGuestIds(tablePlan: unknown, guestId: string): string[] {
  const plan = parseTablePlan(tablePlan);
  if (!plan?.tables) return [];

  for (const table of plan.tables) {
    const seats = table.seats || {};
    const guestIds = Object.values(seats).filter((id): id is string => Boolean(id));
    if (guestIds.includes(guestId)) {
      return guestIds.filter((id) => id !== guestId);
    }
  }
  return [];
}
