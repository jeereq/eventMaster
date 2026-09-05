export type WelcomeGrantKey = 'b2c' | 'b2b' | 'enterprise' | 'catalog' | 'protocol' | 'manager';
export type WelcomeGrantUnit = 'fc' | 'tokens';
export type WelcomeGrantMoment = 'signup' | 'plan_activation' | 'team_create' | 'never';

export type WelcomeGrantRule = {
  enabled: boolean;
  amount: number;
  unit: WelcomeGrantUnit;
  moment: WelcomeGrantMoment;
};

export type WelcomeGrantRules = Record<WelcomeGrantKey, WelcomeGrantRule>;

export const WELCOME_GRANT_KEYS: WelcomeGrantKey[] = [
  'b2c',
  'b2b',
  'enterprise',
  'catalog',
  'protocol',
  'manager',
];

export const WELCOME_GRANT_LABELS: Record<WelcomeGrantKey, string> = {
  b2c: 'Organisateur particulier',
  b2b: 'Organisation pro',
  enterprise: 'Forfait entreprise',
  catalog: 'Client / salle / presta / mixte',
  protocol: 'Agent protocole',
  manager: 'Manager',
};

export const DEFAULT_WELCOME_AI_GRANTS: WelcomeGrantRules = {
  b2c: { enabled: true, amount: 10_000, unit: 'fc', moment: 'signup' },
  b2b: { enabled: true, amount: 20_000, unit: 'fc', moment: 'signup' },
  enterprise: { enabled: true, amount: 50_000, unit: 'fc', moment: 'plan_activation' },
  catalog: { enabled: true, amount: 10, unit: 'tokens', moment: 'signup' },
  protocol: { enabled: true, amount: 4, unit: 'tokens', moment: 'team_create' },
  manager: { enabled: false, amount: 0, unit: 'tokens', moment: 'never' },
};

export const WELCOME_MOMENTS_BY_KEY: Record<WelcomeGrantKey, WelcomeGrantMoment[]> = {
  b2c: ['signup', 'plan_activation', 'never'],
  b2b: ['signup', 'plan_activation', 'never'],
  enterprise: ['signup', 'plan_activation', 'never'],
  catalog: ['signup', 'plan_activation', 'never'],
  protocol: ['team_create', 'never'],
  manager: ['never', 'team_create'],
};

export const WELCOME_MOMENT_LABELS: Record<WelcomeGrantMoment, string> = {
  signup: 'À l’inscription',
  plan_activation: 'À l’activation du forfait payant',
  team_create: 'À la création du membre',
  never: 'Jamais',
};

export function sanitizeWelcomeAiGrants(raw?: unknown): WelcomeGrantRules {
  const source = raw && typeof raw === 'object' ? (raw as Partial<Record<WelcomeGrantKey, Partial<WelcomeGrantRule>>>) : {};
  const next = { ...DEFAULT_WELCOME_AI_GRANTS };
  for (const key of WELCOME_GRANT_KEYS) {
    const row = source[key];
    const fallback = DEFAULT_WELCOME_AI_GRANTS[key];
    const allowed = WELCOME_MOMENTS_BY_KEY[key];
    const moment = allowed.includes(row?.moment as WelcomeGrantMoment)
      ? (row?.moment as WelcomeGrantMoment)
      : fallback.moment;
    const amount = Math.max(0, Math.round(Number(row?.amount ?? fallback.amount)) || 0);
    next[key] = {
      enabled: row?.enabled !== false && moment !== 'never',
      amount,
      unit: row?.unit === 'fc' || row?.unit === 'tokens' ? row.unit : fallback.unit,
      moment,
    };
  }
  return next;
}

export function formatWelcomeGrantAmount(
  rule: WelcomeGrantRule,
  formatFc: (value: number) => string,
): string {
  if (!rule.enabled || rule.moment === 'never' || rule.amount <= 0) return 'aucune offre';
  if (rule.unit === 'fc') return `${formatFc(rule.amount)} de jetons IA`;
  return `${rule.amount} jeton${rule.amount > 1 ? 's' : ''} IA`;
}
