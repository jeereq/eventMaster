export type TablePlanPdfRow = {
  name: string;
  isGuestTable: boolean;
  occupiedCount: number;
  capacity: number;
};

export function extractTablePlanSummaryForPdf(
  tablePlan: unknown,
  guestId: string,
): { tables: TablePlanPdfRow[]; guestTableId: string | null } | null {
  if (!tablePlan || typeof tablePlan !== 'object') return null;
  const plan = tablePlan as { tables?: Array<{ id: string; name?: string; capacity?: number; seats?: Record<string, string | null> }> };
  if (!Array.isArray(plan.tables) || plan.tables.length === 0) return null;

  let guestTableId: string | null = null;
  const tables: TablePlanPdfRow[] = plan.tables.map((table) => {
    const seats = table.seats || {};
    const occupiedCount = Object.values(seats).filter(Boolean).length;
    const isGuestTable = Object.values(seats).includes(guestId);
    if (isGuestTable) guestTableId = table.id;
    return {
      name: table.name || `Table ${table.id.slice(0, 6)}`,
      isGuestTable,
      occupiedCount,
      capacity: table.capacity ?? occupiedCount,
    };
  });

  return { tables, guestTableId };
}
