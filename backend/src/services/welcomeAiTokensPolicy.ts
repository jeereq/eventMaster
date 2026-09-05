export const WELCOME_TOKEN_VALUE_B2C_FC = 10_000;
export const WELCOME_TOKEN_VALUE_B2B_FC = 20_000;
export const WELCOME_TOKEN_VALUE_ENTERPRISE_FC = 50_000;
export const WELCOME_TOKENS_CATALOG_FAMILY = 10;
export const WELCOME_TOKENS_PROTOCOL = 4;

export type WelcomeAudience = 'B2C' | 'B2B' | 'ENTERPRISE';
export type WelcomeOfferKey = 'none' | 'protocol' | 'catalog' | 'b2c' | 'b2b' | 'enterprise' | 'manager';
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

export type WelcomeOffer = {
  key: WelcomeOfferKey;
  tokens: number;
  valueFc: number;
  shareWithOrg: boolean;
  fixedTokens: boolean;
  moment: WelcomeGrantMoment;
  enabled: boolean;
};

export const WELCOME_GRANT_KEYS: WelcomeGrantKey[] = [
  'b2c',
  'b2b',
  'enterprise',
  'catalog',
  'protocol',
  'manager',
];

const PERSONAL_PLAN_KEYS = new Set(['PERSONAL_50', 'PERSONAL_100', 'PERSONAL_200', 'PERSONAL_PLUS']);
const ENTERPRISE_PLAN_KEYS = new Set(['ENTERPRISE_1', 'ENTERPRISE_2', 'ENTERPRISE_3']);
const CATALOG_PLAN_KEYS = new Set(['VENUE', 'SERVICE', 'CATALOG']);
const B2B_ORG_PLAN_KEYS = new Set(['STANDARD', 'PREMIUM_1', 'PREMIUM_2']);

const MOMENTS_BY_KEY: Record<WelcomeGrantKey, WelcomeGrantMoment[]> = {
  b2c: ['signup', 'plan_activation', 'never'],
  b2b: ['signup', 'plan_activation', 'never'],
  enterprise: ['signup', 'plan_activation', 'never'],
  catalog: ['signup', 'plan_activation', 'never'],
  protocol: ['team_create', 'never'],
  manager: ['never', 'team_create'],
};

export const DEFAULT_WELCOME_GRANT_RULES: WelcomeGrantRules = {
  b2c: { enabled: true, amount: WELCOME_TOKEN_VALUE_B2C_FC, unit: 'fc', moment: 'signup' },
  b2b: { enabled: true, amount: WELCOME_TOKEN_VALUE_B2B_FC, unit: 'fc', moment: 'signup' },
  enterprise: {
    enabled: true,
    amount: WELCOME_TOKEN_VALUE_ENTERPRISE_FC,
    unit: 'fc',
    moment: 'plan_activation',
  },
  catalog: { enabled: true, amount: WELCOME_TOKENS_CATALOG_FAMILY, unit: 'tokens', moment: 'signup' },
  protocol: { enabled: true, amount: WELCOME_TOKENS_PROTOCOL, unit: 'tokens', moment: 'team_create' },
  manager: { enabled: false, amount: 0, unit: 'tokens', moment: 'never' },
};

function normalize(value?: string | null): string {
  return String(value || '').trim().toUpperCase();
}

function clampAmount(value: unknown): number {
  const parsed = Math.round(Number(value));
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.min(100_000_000, parsed);
}

function sanitizeRule(key: WelcomeGrantKey, raw: unknown): WelcomeGrantRule {
  const fallback = DEFAULT_WELCOME_GRANT_RULES[key];
  const row = raw && typeof raw === 'object' ? (raw as Partial<WelcomeGrantRule>) : {};
  const unit: WelcomeGrantUnit = row.unit === 'fc' ? 'fc' : row.unit === 'tokens' ? 'tokens' : fallback.unit;
  const allowed = MOMENTS_BY_KEY[key];
  const moment = allowed.includes(row.moment as WelcomeGrantMoment)
    ? (row.moment as WelcomeGrantMoment)
    : fallback.moment;
  return {
    enabled: row.enabled !== false && moment !== 'never',
    amount: clampAmount(row.amount ?? fallback.amount),
    unit,
    moment,
  };
}

export function sanitizeWelcomeGrantRules(raw?: unknown): WelcomeGrantRules {
  const source = raw && typeof raw === 'object' ? (raw as Partial<Record<WelcomeGrantKey, unknown>>) : {};
  return {
    b2c: sanitizeRule('b2c', source.b2c),
    b2b: sanitizeRule('b2b', source.b2b),
    enterprise: sanitizeRule('enterprise', source.enterprise),
    catalog: sanitizeRule('catalog', source.catalog),
    protocol: sanitizeRule('protocol', source.protocol),
    manager: sanitizeRule('manager', source.manager),
  };
}

function noneOffer(): WelcomeOffer {
  return {
    key: 'none',
    tokens: 0,
    valueFc: 0,
    shareWithOrg: false,
    fixedTokens: true,
    moment: 'never',
    enabled: false,
  };
}

function offerFromRule(key: WelcomeGrantKey, rule: WelcomeGrantRule): WelcomeOffer {
  if (!rule.enabled || rule.moment === 'never' || rule.amount <= 0) return noneOffer();
  const shareWithOrg = key !== 'protocol' && key !== 'manager';
  const fixedTokens = rule.unit === 'tokens';
  return {
    key,
    tokens: fixedTokens ? rule.amount : 0,
    valueFc: fixedTokens ? 0 : rule.amount,
    shareWithOrg,
    fixedTokens,
    moment: rule.moment,
    enabled: true,
  };
}

export function classifyWelcomeOfferKey(input: {
  accountKind?: string | null;
  intent?: string | null;
  planKey?: string | null;
  orgRole?: string | null;
}): WelcomeOfferKey {
  const orgRole = normalize(input.orgRole);
  if (orgRole === 'MANAGER') return 'manager';
  if (orgRole === 'PROTOCOL') return 'protocol';

  const kind = normalize(input.accountKind);
  const planKey = normalize(input.planKey);
  const intent = String(input.intent || '').trim().toLowerCase();

  if (kind === 'CLIENT' || kind === 'VENDOR' || kind === 'BOTH' || CATALOG_PLAN_KEYS.has(planKey)) {
    return 'catalog';
  }
  if (ENTERPRISE_PLAN_KEYS.has(planKey)) return 'enterprise';
  if (PERSONAL_PLAN_KEYS.has(planKey) || intent === 'personal' || intent === 'seeker') return 'b2c';
  if (intent === 'pro' || B2B_ORG_PLAN_KEYS.has(planKey)) return 'b2b';
  return 'b2c';
}

function resolveOfferForMoment(
  key: WelcomeOfferKey,
  rules: WelcomeGrantRules,
  moment: WelcomeGrantMoment,
): WelcomeOffer {
  if (key === 'none') return noneOffer();

  if (key === 'enterprise' && moment === 'signup' && rules.enterprise.moment !== 'signup') {
    if (rules.b2b.enabled && rules.b2b.moment === 'signup') {
      return offerFromRule('b2b', rules.b2b);
    }
    return noneOffer();
  }

  const rule = rules[key];
  if (!rule || rule.moment !== moment) return noneOffer();
  return offerFromRule(key, rule);
}

export function resolveWelcomeOffer(
  input: {
    accountKind?: string | null;
    intent?: string | null;
    planKey?: string | null;
    orgRole?: string | null;
  },
  options?: { rules?: unknown; moment?: WelcomeGrantMoment },
): WelcomeOffer {
  const rules = sanitizeWelcomeGrantRules(options?.rules);
  const key = classifyWelcomeOfferKey(input);
  if (options?.moment) return resolveOfferForMoment(key, rules, options.moment);
  if (key === 'none') return noneOffer();
  return offerFromRule(key, rules[key]);
}

export function resolveWelcomeAudience(input: {
  accountKind?: string | null;
  intent?: string | null;
  planKey?: string | null;
  orgRole?: string | null;
}): WelcomeAudience {
  const key = classifyWelcomeOfferKey(input);
  if (key === 'enterprise') return 'ENTERPRISE';
  if (key === 'b2b') return 'B2B';
  return 'B2C';
}

export function isEnterprisePlanKey(planKey?: string | null): boolean {
  return ENTERPRISE_PLAN_KEYS.has(normalize(planKey));
}

export function welcomeTokenValueFc(audience: WelcomeAudience, rules?: unknown): number {
  const sanitized = sanitizeWelcomeGrantRules(rules);
  if (audience === 'ENTERPRISE') {
    return sanitized.enterprise.unit === 'fc' ? sanitized.enterprise.amount : WELCOME_TOKEN_VALUE_ENTERPRISE_FC;
  }
  if (audience === 'B2B') {
    return sanitized.b2b.unit === 'fc' ? sanitized.b2b.amount : WELCOME_TOKEN_VALUE_B2B_FC;
  }
  return sanitized.b2c.unit === 'fc' ? sanitized.b2c.amount : WELCOME_TOKEN_VALUE_B2C_FC;
}
