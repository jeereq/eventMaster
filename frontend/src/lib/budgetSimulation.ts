export const BUDGET_SIMULATION_SCOPES = ['complete', 'drinks', 'rentals', 'services'] as const;

export type BudgetSimulationScope = (typeof BUDGET_SIMULATION_SCOPES)[number];

export function parseBudgetSimulationScope(value: unknown): BudgetSimulationScope {
  if (value === 'drinks' || value === 'rentals' || value === 'services') return value;
  return 'complete';
}

export const BUDGET_SCOPE_OPTIONS: Array<{
  id: BudgetSimulationScope;
  label: string;
  hint: string;
}> = [
  {
    id: 'complete',
    label: 'Simulation complète',
    hint: 'Salle, métiers, locations et boissons, réglés selon votre besoin.',
  },
  {
    id: 'drinks',
    label: 'Boissons',
    hint: 'Quantités selon les invités, au conditionnement le moins cher.',
  },
  {
    id: 'rentals',
    label: 'Locations',
    hint: 'Chaises, tentes, sono, véhicules et le reste du matériel.',
  },
  {
    id: 'services',
    label: 'Services',
    hint: 'Traiteur, photo, DJ et les autres métiers.',
  },
];
